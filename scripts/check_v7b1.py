from pathlib import Path
from bs4 import BeautifulSoup
import json
p=Path(__file__).resolve().parents[1]
s=BeautifulSoup((p/'index.html').read_text(), 'html.parser')
expected=['选中要素','数据统计','建筑高度显示','地理图层','3D道路与动态汽车 · Phase 7B.1','3D列车与高架铁路']
folds=s.select('aside details.sidebar-fold');assert len(folds)==6,(len(folds),[d.summary.text for d in folds]);assert set(d.summary.text for d in folds)==set(expected)
assert not s.select('aside .intro');assert s.select_one('#tabHint')
for id in ['openTraffic7b','openMobility7a','openCamera5','openSettings','openHelp']:
 assert s.select_one('#'+id).has_attr('data-tip-zh'),id
for id in ['trainPlay','carPlay','carCount','carSelect','heightMode','details','stats','waterLayer']:
 assert s.select_one('#'+id),id
assert 'ui7b1.js' in [x.get('src') for x in s.select('script[src]')]
a=json.loads((p/'data/bridge_audit7b1.json').read_text());assert a['background_bridge_edges']==0 and a['bridge_edges']>0
assert json.loads((p/'data/bridge_audit7b1.geojson').read_text())['features']
r=(p/'road3d.mjs').read_text();assert all(k in r for k in ['stuckFor','stopReason','recoveryCount','selectedDiagnostics'])
h=(p/'hotkeys.js').read_text();assert "['range','checkbox','radio'" in h
print('PASS V7B.1: foldable UI, tooltips, hotkeys, diagnostics, bridge audit, original IDs')
