# The working notes (notes/*.md) live in the public repo only as data/*.bin: each one
# compressed and encrypted with a passphrase kept outside the repo, its name hidden
# inside it, so the repo neither reads as text nor says what the files are.
#
#   python tools/notes.py open    data/*.bin → notes/*.md, after a fresh checkout or a pull
#   python tools/notes.py seal    notes/*.md → data/*.bin, after editing (then commit data/)
#   python tools/notes.py check   which notes differ from their sealed copies
#
# The passphrase comes from --key=…, or PACA_NOTES_KEY, or .git/info/notes-key (a --key
# is saved there; .git/info is never part of the repo). Only Python's standard library:
# PBKDF2-HMAC-SHA256 stretches the passphrase, HMAC-SHA256 makes the keystream and a tag
# that catches a wrong key or a damaged file.
#
# `open` won't overwrite a note that's newer than its sealed copy and different from it
# (you'd lose edits): seal it first, or pass --force. Both commands also keep git
# ignoring notes/ and .claude/ through .git/info/exclude (local, never committed), and
# make sure .claude/CLAUDE.md exists to load notes/guide.md into a Claude session.
import glob
import hashlib
import hmac
import os
import sys
import zlib

os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ROUNDS = 600_000
KEY_FILE = os.path.join('.git', 'info', 'notes-key')
IGNORE = ['notes/', '.claude/']
LOADER = '.claude/CLAUDE.md'
LOADER_TEXT = """@../notes/guide.md

If nothing loaded above, run python tools/notes.py open (it needs the passphrase: ask the owner), then read notes/guide.md before changing anything.
"""


def read(path):
    with open(path, encoding='utf-8', newline='') as f:
        return f.read()


def write(path, text):
    with open(path, 'w', encoding='utf-8', newline='') as f:
        f.write(text)


def keep_local():
    exclude = os.path.join('.git', 'info', 'exclude')
    if os.path.isdir('.git'):
        os.makedirs(os.path.dirname(exclude), exist_ok=True)
        have = read(exclude).splitlines() if os.path.exists(exclude) else []
        missing = [line for line in IGNORE if line not in have]
        if missing:
            with open(exclude, 'a', encoding='utf-8') as f:
                f.write(('\n' if have and have[-1] else '') + '\n'.join(missing) + '\n')
    if not os.path.exists(LOADER):
        os.makedirs(os.path.dirname(LOADER), exist_ok=True)
        write(LOADER, LOADER_TEXT)


def passphrase():
    for arg in sys.argv[2:]:
        if arg.startswith('--key='):
            key = arg[len('--key='):]
            if os.path.isdir('.git'):
                write(KEY_FILE, key)
            return key
    if os.environ.get('PACA_NOTES_KEY'):
        return os.environ['PACA_NOTES_KEY']
    if os.path.exists(KEY_FILE):
        return read(KEY_FILE).strip()
    sys.exit('No passphrase: run with --key=… once (it is kept in .git/info/notes-key), or set PACA_NOTES_KEY.')


_master = None


def master():
    global _master
    if _master is None:
        _master = hashlib.pbkdf2_hmac('sha256', passphrase().encode('utf-8'), b'paca.land notes', ROUNDS)
    return _master


def mac(key, data):
    return hmac.new(key, data, 'sha256').digest()


def keystream(key, n):
    out = bytearray()
    counter = 0
    while len(out) < n:
        out += mac(key, counter.to_bytes(8, 'big'))
        counter += 1
    return bytes(out[:n])


def xor(data, stream):
    return (int.from_bytes(data, 'big') ^ int.from_bytes(stream, 'big')).to_bytes(len(data), 'big')


def blob_path(name):
    return os.path.join('data', mac(master(), b'name:' + name.encode('utf-8')).hex()[:12] + '.bin')


def lock(name, text):
    nonce = os.urandom(16)
    plain = zlib.compress(f'{name}\n{text}'.encode('utf-8'), 9)
    body = xor(plain, keystream(mac(master(), b'enc' + nonce), len(plain)))
    return nonce + mac(mac(master(), b'mac' + nonce), body) + body


def unlock(blob):
    nonce, tag, body = blob[:16], blob[16:48], blob[48:]
    if not hmac.compare_digest(tag, mac(mac(master(), b'mac' + nonce), body)):
        return None
    name, text = zlib.decompress(xor(body, keystream(mac(master(), b'enc' + nonce), len(body)))).decode('utf-8').split('\n', 1)
    return name, text


def sealed():
    """{note name: (blob path, text)} for every blob this passphrase opens."""
    out = {}
    for path in sorted(glob.glob('data/*.bin')):
        with open(path, 'rb') as f:
            got = unlock(f.read())
        if got:
            out[got[0]] = (path, got[1])
    return out


def seal():
    os.makedirs('data', exist_ok=True)
    have = sealed()
    notes = {os.path.basename(p): read(p) for p in sorted(glob.glob('notes/*.md'))}
    for name, text in notes.items():
        if have.get(name, (None, None))[1] == text:
            continue
        with open(blob_path(name), 'wb') as f:
            f.write(lock(name, text))
        print('sealed', name)
    # A note that's gone (renamed or deleted) takes its sealed copy with it.
    for name, (path, _) in have.items():
        if name not in notes:
            os.remove(path)
            print('removed', name)


def open_notes(force=False):
    have = sealed()
    if glob.glob('data/*.bin') and not have:
        sys.exit('The passphrase opens none of data/*.bin: is it the right one?')
    os.makedirs('notes', exist_ok=True)
    for name, (path, text) in have.items():
        plain = os.path.join('notes', name)
        if os.path.exists(plain):
            if read(plain) == text:
                continue
            if not force and os.path.getmtime(plain) > os.path.getmtime(path):
                print('kept', plain, '(newer than its sealed copy and different: seal it, or open --force)')
                continue
        write(plain, text)
        print('opened', plain)


def check():
    have = sealed()
    stale = 0
    for plain in sorted(glob.glob('notes/*.md')):
        name = os.path.basename(plain)
        if have.get(name, (None, None))[1] != read(plain):
            print('unsealed changes:', plain)
            stale += 1
    for name in have:
        if not os.path.exists(os.path.join('notes', name)):
            print('not opened:', name)
    if not stale:
        print('all notes sealed')
    return stale


if __name__ == '__main__':
    command = sys.argv[1] if len(sys.argv) > 1 else 'check'
    keep_local()
    if command == 'seal':
        seal()
    elif command == 'open':
        open_notes(force='--force' in sys.argv)
    elif command == 'check':
        sys.exit(1 if check() else 0)
    else:
        sys.exit('usage: python tools/notes.py open|seal|check [--key=…] [--force]')
