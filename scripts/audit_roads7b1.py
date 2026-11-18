from pathlib import Path
import zipfile,json,collections,math
P=Path(__file__).resolve().parents[1]
with zipfile.ZipFile(P/'source/wuhan_road_lab_v2_GPT.zip') as z:
    net=json.loads(z.read('wuhan_road_lab_v2_GPT/data/network.json'))
base=json.loads((P/'data/road3a.json').read_text())
classes=collections.Counter(); bridges=[];tunnels=[];attrs=collections.Counter()
for raw in net['edges']:
    u,v,length,kind,name,speed,oneway,coords,*rest=raw
    bridge=str(rest[2] if len(rest)>2 else '').lower()
    tunnel=str(rest[3] if len(rest)>3 else '').lower()
    if bridge in ('yes','true','1','viaduct'):
        bridges.append(raw);classes[kind]+=1
    if tunnel in ('yes','true','1'):tunnels.append(raw)
    if len(rest)>2 and rest[2]:attrs['bridge_tagged']+=1
# GeoJSON overlay: actual horizontal geometry, NO guessed height.
features=[]
for raw in bridges:
    coords=raw[7]
    if len(coords)<2:continue
    if not any(114.17<=p[1]<=114.3 and 30.54<=p[0]<=30.625 for p in coords):continue
    features.append({'type':'Feature','geometry':{'type':'LineString','coordinates':[[p[1],p[0]] for p in coords]},'properties':{'name':raw[4],'highway':raw[3],'bridge':'yes','source':'Road Lab OSM'}})
(P/'data/bridge_audit7b1.geojson').write_text(json.dumps({'type':'FeatureCollection','features':features},ensure_ascii=False,separators=(',',':')))
report={'source':'Road Lab V2 directed network.json','total_directed_edges':len(net['edges']),'bridge_edges':len(bridges),'tunnel_edges':len(tunnels),'bridge_edges_near_study_area':len(features),'bridge_classes':dict(classes),'background_roads':len(base['roads']),'background_routes':len(base['routes']),'background_bridge_edges':0,'background_bridge_policy':'Explicitly excluded by scripts/build_road3a.py lines filtering bridge/tunnel=yes','navigation_note':'V7A graph is separate; this audit does not prove its bridge access or elevation.','limitations':['Bridge tag gives no surveyed deck height.','Layer tags and lane/turn restrictions are not fully retained in 3D background routes.','No bridge vehicle height in current road renderer.','7C will implement a separate validated 3D flyover pilot.']}
(P/'data/bridge_audit7b1.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps(report,ensure_ascii=False,indent=2))
