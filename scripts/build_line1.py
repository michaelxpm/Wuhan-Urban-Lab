from pathlib import Path
import zipfile,json,math,heapq,collections
from shapely.geometry import LineString,Point
from shapely.strtree import STRtree
from pyproj import Transformer
root=Path(__file__).resolve().parents[1]
z=zipfile.ZipFile('/mnt/data/RailLab_output.zip')
tracks=json.loads(z.read('output/rail_tracks.geojson'))['features']
stops=json.loads(z.read('output/rail_stops.geojson'))['features']
rels=json.loads(z.read('output/rail_routes.json'))
trans=Transformer.from_crs('EPSG:4326','EPSG:32650',always_xy=True)
def proj(p):return trans.transform(p[0],p[1])
def hav(a,b):
 lat=(a[1]+b[1])*math.pi/360
 return math.hypot((a[0]-b[0])*111195*math.cos(lat),(a[1]-b[1])*111195)
vertices={};coords=[];edges=[];lines=[]
def node(p):
 k=(round(p[0],7),round(p[1],7))
 if k not in vertices:vertices[k]=len(coords);coords.append(list(k))
 return vertices[k]
for f in tracks:
 if f['properties'].get('railway')!='subway' or f['geometry']['type']!='LineString':continue
 pts=f['geometry']['coordinates']
 for a,b in zip(pts,pts[1:]):
  u,v=node(a),node(b)
  if u!=v:
   length=hav(a,b)
   if length>.01:
    edges.append((u,v,length));lines.append(LineString([proj(a),proj(b)]))
tree=STRtree(lines)
stopmap={f['properties']['osm_id']:f for f in stops if f['geometry']['type']=='Point'}
selected=['崇仁路','硚口路','太平洋','宗关','汉西一路']
results=[]
for rid in (444615,8309086):
 rel=next(r for r in rels if r['osm_relation_id']==rid)
 ordered=[stopmap[m['ref']] for m in rel['members'] if m['type']=='n' and m['ref'] in stopmap and stopmap[m['ref']]['properties'].get('name') in selected]
 if len(ordered)!=len(selected):raise RuntimeError('missing stations')
 sn=[];splits=collections.defaultdict(list)
 for f in ordered:
  p=f['geometry']['coordinates'];P=Point(proj(p));j=int(tree.nearest(P));line=lines[j];t=line.project(P,normalized=True);dist=P.distance(line)
  if dist>50:raise RuntimeError(f'stop {f["properties"]["name"]} off rail {dist} m')
  u,v,l=edges[j]
  if t<1e-8:idx=u
  elif t>1-1e-8:idx=v
  else:idx=len(coords);coords.append([float(p[0]),float(p[1])]);splits[j].append((t,idx))
  sn.append({'name':f['properties']['name'],'osm_id':f['properties']['osm_id'],'node':idx,'snap_m':round(dist,2)})
 adj=[[] for _ in coords]
 for j,(u,v,l) in enumerate(edges):
  arr=[(0,u)]+sorted(splits[j])+[(1,v)]
  for (t1,a),(t2,b) in zip(arr,arr[1:]):
   w=l*(t2-t1)
   if w>0:adj[a].append((b,w));adj[b].append((a,w))
 def shortest(start,end):
  q=[(0,start)];d={start:0};prev={}
  while q:
   length,u=heapq.heappop(q)
   if length!=d[u]:continue
   if u==end:break
   for v,w in adj[u]:
    nd=length+w
    if nd<d.get(v,1e100):d[v]=nd;prev[v]=u;heapq.heappush(q,(nd,v))
  if end not in d:raise RuntimeError('disconnected segment')
  path=[end]
  while path[-1]!=start:path.append(prev[path[-1]])
  return list(reversed(path))
 route=[];stop_indices=[0]
 for i in range(len(sn)-1):
  p=shortest(sn[i]['node'],sn[i+1]['node'])
  if not route:route=p
  else:
   if route[-1]!=p[0]:raise RuntimeError('path join failed')
   route+=p[1:]
  stop_indices.append(len(route)-1)
 pts=[coords[i] for i in route];distances=[0]
 for a,b in zip(pts,pts[1:]):distances.append(distances[-1]+hav(a,b))
 results.append({'id':str(rid),'name':'武汉地铁1号线','source':'OSM geometric route; operational direction and switches unverified','coords':pts,'distances_m':[round(v,3) for v in distances],'stops':[{'name':s['name'],'osm_id':s['osm_id'],'distance_m':round(distances[idx],3),'snap_m':s['snap_m']} for s,idx in zip(sn,stop_indices)],'length_m':round(distances[-1],3),'verified_geometry_only':True})
 print(rid,[s['name'] for s in sn],len(pts),round(distances[-1]),'m')
(root/'data'/'line1_core_routes.json').write_text(json.dumps({'routes':results,'height_m':8.0,'height_source':'simulation assumption, NOT surveyed elevation','train_parameters':'simulation assumptions'},ensure_ascii=False,separators=(',',':')))
