import pathlib,json,zipfile,collections
p=pathlib.Path(__file__).resolve().parents[1];d=p/'data'
for n,minimum in [('water',50),('green',300),('trees',690)]:
 a=json.loads((d/(n+'.geojson')).read_text());assert len(a['features'])>=minimum
print('ENV OK')
land=json.loads((d/'landmarks_4bc.json').read_text())['landmarks'];assert len(land)==2 and all(110<x['lon']<120 and 25<x['lat']<35 for x in land)
print('LANDMARKS OK',[(x['name_en'],x['height_m']) for x in land])
road=json.loads((d/'road3a.json').read_text());assert len(road['routes'])>=80
for r in road['routes']:
 assert len(r['coords'])==len(r['distances']) and r['distances'][0]==0
 assert all(b>a for a,b in zip(r['distances'],r['distances'][1:]))
print('ROADS OK',len(road['routes']),'routes')
assert len(json.loads((d/'road_directions.geojson').read_text())['features'])>50
print('DIRECTION AUDIT OK')
