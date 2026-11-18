from pathlib import Path
import json,re
p=Path(__file__).resolve().parents[1]
html=(p/'index.html').read_text(encoding='utf8')
js=(p/'camera5.js').read_text(encoding='utf8')
for file in ['app.js','rail3d.mjs','road3d.mjs','landmarks3d.mjs','i18n.js','settings.js','hotkeys.js','camera5.js','data/road3a.json','data/line1_core_routes.json','data/water.geojson','data/green.geojson','data/trees.geojson']:
 assert (p/file).exists(),file
for element in ['openCamera5','cameraHud5','cameraDock5']:
 assert f'id="{element}"' in html,element
for el in ['camera5Mode','camera5CarSelect','camera5NextCar','camera5Distance','camera5Orbit','camera5Tour','camera5Save','camera5Shot','camera5Full','camera5Cinema']:
 assert f'id=\\"{el}\\"' in js or f'id="{el}"' in js,el
for key in ['train','car','trainfront','carfront']:
 assert f'value=\\"{key}\\"' in js or f'value="{key}"' in js,key
routes=json.loads((p/'data/road3a.json').read_text(encoding='utf8'))['routes']
rail=json.loads((p/'data/line1_core_routes.json').read_text(encoding='utf8'))['routes']
assert len(routes)>=60 and len(rail)==2
print('PASS: Phase 5 UI contracts, inherited sources,',len(routes),'car routes,',len(rail),'rail directions')
