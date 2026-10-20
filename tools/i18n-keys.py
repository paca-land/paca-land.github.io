# Every English key the page can look up, from the code: t('...') literals plus
# the data that's translated when shown. With --check, lists keys zh.js lacks
# (and zh.js keys nothing uses). Content packs (js/packs/*.js) are checked
# against their own .zh.js, each on its own.
import json
import os
import re
import sys

# The repo root is the folder above tools/, wherever it's checked out.
os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
read = lambda p: open(p, encoding='utf-8').read()
keys = []


def add(k):
    if k and k not in keys:
        keys.append(k)


for f in ['js/tales.js', 'js/stories.js', 'js/voyage.js', 'js/lexicon.js', 'js/main.js', 'js/journal.js', 'js/rarity.js', 'js/mazeball.js']:
    for m in re.finditer(r"\bt\('((?:[^'\\]|\\.)*)'", read(f)):
        add(m.group(1).replace("\\'", "'"))

lex = read('js/lexicon.js')
for m in re.finditer(r"^  \['(\w+)', '([^']*)', '([^']*)'", lex, re.M):
    add(m.group(2)); add(m.group(3))
rules = lex[lex.index('export const RULES'):lex.index('for (const rule')]
for m in re.finditer(r"(?:name|line|hint): '([^']*)'", rules):
    add(m.group(1))
secrets = lex[lex.index('export const SECRETS'):lex.index('for (const secret')]
for m in re.finditer(r"line: '([^']*)'", secrets):
    add(m.group(1))

for m in re.finditer(r"^    label: '([^']*)'", read('js/world.js'), re.M):
    add(m.group(1))
for m in re.finditer(r"label: '([^']*)'", read('js/sky.js')):
    add(m.group(1))
main = read('js/main.js')
for m in re.finditer(r"\{ label: '(\w+)', ratio", main):
    add(m.group(1))

journal = read('js/journal.js')
for m in re.finditer(r"^  \['([\w ]+)', \[", journal, re.M):
    add(m.group(1))
for m in re.finditer(r"^    \['[\w:]+', '[^']+', (?:'([^']*)'|\"([^\"]*)\"), '([^']*)'\]", journal, re.M):
    add(m.group(1) or m.group(2)); add(m.group(3))
for m in re.finditer(r"^  \['[\w-]+', '[^']+', '([^']*)', '([^']*)'", journal, re.M):
    add(m.group(1)); add(m.group(2))
for tier in ['common', 'uncommon', 'rare', 'epic', 'legendary']:
    add(tier)

rarity = read('js/rarity.js')
for name in ['PLURAL', 'LANDMARK_NAMES', 'WATER_NAMES']:
    body = re.search(name + r" = \{(.*?)\};", rarity).group(1).strip()
    for m in re.finditer(r"(?:'([^']*)'|\"([^\"]*)\")(?=\s*(?:,|$))", body):
        add(m.group(1) or m.group(2))
for k in ['lands', 'a hot-air balloon', 'no balloon', 'cabin', 'castle', 'windmill', 'lighthouse', 'village', 'campsite', 'ruins', 'shrine']:
    add(k)

voyage = read('js/voyage.js')
for m in re.finditer(r"return \['([^']*)', ", voyage):
    add(m.group(1))

html = read('index.html')
for m in re.finditer(r"<(\w+)[^>]*data-i18n[^>]*>([^<]*)<", html):
    add(m.group(2).strip())
for m in re.finditer(r'(?:placeholder|title|aria-label)="([^"]*)"', html):
    add(m.group(1).replace('&amp;', '&'))



def pack_keys(src):
    # A pack's t('...') literals, plus its island label and journal names (translated when shown).
    found = []
    for m in re.finditer(r"\bt\('((?:[^'\\]|\\.)*)'", src):
        found.append(m.group(1).replace("\\'", "'"))
    for m in re.finditer(r"^      label: '([^']*)',", src, re.M):
        found.append(m.group(1))
    for m in re.finditer(r"journal: \['[^']+', '([^']*)', '([^']*)'\]", src):
        found.extend(m.groups())
    return list(dict.fromkeys(found))


def zh_map(src):
    return json.loads('{' + ','.join(m.group(1) for m in re.finditer(r"^\s*(\"(?:[^\"\\]|\\.)*\":\s*\"(?:[^\"\\]|\\.)*\")", src, re.M)) + '}')


if '--check' in sys.argv:
    # Every pack's Chinese must be wired into packs/zh.js (and every pack into index.js), or the page never sees it.
    wired = read('js/packs/zh.js')
    listed = read('js/packs/index.js')
    for f in sorted(os.listdir('js/packs')):
        if f.endswith('.zh.js') and f"'./{f}'" not in wired:
            print('NOT IN packs/zh.js', f)
        elif f.endswith('.js') and not f.endswith('.zh.js') and f not in ('index.js', 'zh.js') and f"'./{f}'" not in listed:
            print('NOT IN packs/index.js', f)
    # The packs first, each against its own Chinese.
    for f in sorted(os.listdir('js/packs')):
        if not f.endswith('.js') or f.endswith('.zh.js') or f in ('index.js', 'zh.js'):
            continue
        want = pack_keys(read('js/packs/' + f))
        zf = 'js/packs/' + f[:-3] + '.zh.js'
        got = zh_map(read(zf)) if os.path.exists(zf) else {}
        lack = [k for k in want if k not in got]
        extra = [k for k in got if k not in want]
        if lack or extra:
            print('pack', f[:-3], 'missing', len(lack), 'unused', len(extra))
        for k in lack:
            print('  MISSING', k)
        for k in extra:
            print('  UNUSED', k)
        for k, v in got.items():
            if sorted(re.findall(r'\{\w+\}', k)) != sorted(re.findall(r'\{\w+\}', v)):
                print('  PLACEHOLDERS', k, '->', v)
    zh = read('js/zh.js')
    have = set(json.loads('[' + ','.join(m.group(1) for m in re.finditer(r"^\s*(\"(?:[^\"\\]|\\.)*\"):", zh, re.M)) + ']'))
    lack = [k for k in keys if k not in have]
    extra = [k for k in have if k not in keys]
    print('keys', len(keys), 'missing', len(lack), 'unused', len(extra))
    for k in lack:
        print('MISSING', k)
    zhmap = json.loads('{' + ','.join(m.group(1) for m in re.finditer(r"^\s*(\"(?:[^\"\\]|\\.)*\":\s*\"(?:[^\"\\]|\\.)*\")", zh, re.M)) + '}')
    for k, v in zhmap.items():
        if sorted(re.findall(r'\{\w+\}', k)) != sorted(re.findall(r'\{\w+\}', v)):
            print('PLACEHOLDERS', k, '->', v)
    for k in extra:
        print('UNUSED', k)
else:
    json.dump(keys, open(sys.argv[1], 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    print(len(keys))
