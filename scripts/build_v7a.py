import json,zipfile,math,pathlib,collections
from scipy.spatial import cKDTree
P=pathlib.Path(__file__).resolve().parents[1];D=P/'data'
with zipfile.ZipFile('/mnt/data/wuhan_road_lab_v2_GPT.zip') as z: net=json.loads(z.read('wuhan_road_lab_v2_GPT/data/network.json'))
with zipfile.ZipFile('/mnt/data/wuhan_bus_stops_data.zip') as z: stops=json.loads(z.read('wuhan_bus_stops.geojson'))['features'];audit=json.loads(z.read('bus_stop_audit.json'))
# Core routing study area includes the existing 3D vehicle pilot with margins.
W,S,E,N=114.17,30.54,114.30,30.625
old_nodes=net['nodes']; ids=[i for i,(lat,lon) in enumerate(old_nodes) if W<=lon<=E and S<=lat<=N];old_to_new={v:i for i,v in enumerate(ids)}
nodes=[[round(old_nodes[i][1],7),round(old_nodes[i][0],7)] for i in ids]
edges=[];names=set();by_pair=set()
for e in net['edges']:
 u,v,length,kind,name,speed,oneway,coords,*meta=e
 if u not in old_to_new or v not in old_to_new:continue
 if not coords or len(coords)<2:continue
 if kind in ('footway','path','pedestrian','steps','cycleway'):continue
 # Coordinates from Road Lab are [lat,lon], already directional per edge.
 line=[[float(q[1]),float(q[0])] for q in coords]
 if any(not(W-.002<=x<=E+.002 and S-.002<=y<=N+.002) for x,y in line):continue
 if float(length)<=0:continue
 edges.append([old_to_new[u],old_to_new[v],round(float(length),2),round(float(speed) if speed else 30,1),str(name or ''),str(kind),line]);names.add(name)
xy=[(x*math.cos(math.radians(30.58))*111320,y*111320) for x,y in nodes];tree=cKDTree(xy)
selected=[];excluded=collections.Counter();distances=[]
for f in stops:
 p=f['properties'];name=(p.get('name_zh') or '').strip();c=f['geometry']['coordinates'];lon,lat=c
 if not(W<=lon<=E and S<=lat<=N):continue
 if not name:excluded['unnamed']+=1;continue
 category=p.get('classification')
 if category=='platform_candidate':excluded['uncertain_platform']+=1;continue
 dist,idx=tree.query([lon*math.cos(math.radians(30.58))*111320,lat*111320]);dist=float(dist)
 if dist>170:excluded['far_from_road']+=1;continue
 distances.append(dist)
 selected.append({'id':p['id'],'name_zh':name,'name_en':p.get('name_en') or '', 'coord':[lon,lat], 'node':int(idx),'snap_distance_m':round(dist,1),'classification':category,'verification':'unverified_road_snap'})
# Do not conflate platform and stop_position: preserve source IDs and metadata.
(D/'routing7a.json').write_text(json.dumps({'bbox':[W,S,E,N],'nodes':nodes,'edges':edges,'stops':selected,'audit':{'source':'Road Lab V2 directed network + OSM bus stops','node_count':len(nodes),'edge_count':len(edges),'stops_count':len(selected),'snap_p95_m':round(sorted(distances)[int(len(distances)*.95)],1) if distances else None,'excluded':dict(excluded),'note':'Nearest-node snap is approximate. Does not implement turn-restriction relations or guarantee correct boarding side.'}},ensure_ascii=False,separators=(',',':')))
print('nodes',len(nodes),'edges',len(edges),'stops',len(selected),'excluded',dict(excluded),'sizeMB',round((D/'routing7a.json').stat().st_size/1e6,2))
