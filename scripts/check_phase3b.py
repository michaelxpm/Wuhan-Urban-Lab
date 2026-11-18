"""Offline sanity checks for Phase 3B geometry and configuration."""
import json,math,pathlib
root=pathlib.Path(__file__).resolve().parents[1]
road=json.loads((root/'data'/'road3a.json').read_text(encoding='utf8'))
rail=json.loads((root/'data'/'line1_core_routes.json').read_text(encoding='utf8'))
assert len(road['routes'])>=60
assert len(road['roads'])>=2000
for r in road['routes']:
 d=r['distances'];p=r['coords'];assert len(p)==len(d) and len(p)>8
 assert d[0]==0 and all(b>a for a,b in zip(d,d[1:])),r['id']
 assert abs(d[-1]-r['length_m'])<.03
 assert r['length_m']>1500
 assert all(0<=j<=r['length_m'] for j in r['junctions_m'])
 assert all(113.8<x<114.8 and 30.2<y<31 for x,y in p)
for r in rail['routes']:
 assert len(r['stops'])>=3
 assert all(r['stops'][i]['distance_m']<=r['stops'][i+1]['distance_m'] for i in range(len(r['stops'])-1))
print('PASS:',len(road['roads']),'roads,',len(road['routes']),'longer car routes,',len(rail['routes']),'rail directions')
print('Car route length min/max:',round(min(r['length_m'] for r in road['routes'])),round(max(r['length_m'] for r in road['routes'])),'m')
