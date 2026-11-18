from pathlib import Path
from bs4 import BeautifulSoup
import json
p=Path(__file__).resolve().parents[1]
s=BeautifulSoup((p/'index.html').read_text(encoding='utf8'),'html.parser')
ids=[x.get('id') for x in s.select('[id]')]
assert len(ids)==len(set(ids))
for id in ('openTraffic7b','traffic7b','openMobility7a','mobility7a','carCount','carSignals','carFollowing'):
 assert s.select_one('#'+id),id
for f in ('traffic7b.js','traffic7b_core.mjs','road3d.mjs','mobility7a.js','routing7a.worker.js'):
 assert (p/f).is_file()
assert len(json.loads((p/'data/road3a.json').read_text())['routes'])>=80
assert len(json.loads((p/'data/routing7a.json').read_text())['edges'])>10000
print('PASS V7B: DOM, traffic modules, V7A navigation data and routes')
