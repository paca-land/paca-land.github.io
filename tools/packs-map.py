# Keeps index.html's import map in step with js/packs/: one line per pack file
# (and its .zh.js), after the core modules, all on the current ?v=. With --bump,
# every ?v=N in index.html goes up by one first (do that for any change to the
# site's own files: GitHub's CDN caches for hours).
import os
import re
import sys

os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
html = open('index.html', encoding='utf-8').read()
if '--bump' in sys.argv:
    html = re.sub(r'\?v=(\d+)', lambda m: f'?v={int(m.group(1)) + 1}', html)
v = re.search(r'\./js/main\.js\?v=(\d+)|js/main\.js\?v=(\d+)', html)
v = v.group(1) or v.group(2)

# Drop the old pack lines, then write them afresh after the last core module.
html = re.sub(r'^ *"\./js/packs/[^"]+": "[^"]+",?\n', '', html, flags=re.M)
files = sorted(f for f in os.listdir('js/packs') if f.endswith('.js'))
lines = [f'        "./js/packs/{f}": "./js/packs/{f}?v={v}"' for f in files]
core = list(re.finditer(r'^ *"\./js/[\w.]+\.js": "\./js/[\w.]+\.js\?v=\d+",?$', html, re.M))
last = core[-1]
entry = last.group(0).rstrip(',')
html = html[:last.start()] + entry + ',\n' + ',\n'.join(lines) + html[last.end():]
open('index.html', 'w', encoding='utf-8').write(html)
print('v', v, 'packs', len(files))
