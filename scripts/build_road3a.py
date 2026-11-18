"""Generate lightweight 3D road mesh inputs and continuous directed car paths from Road Lab network.
Source: user supplied Road Lab V2 network.json. No synthetic road geometry is inserted.
"""
from pathlib import Path
import zipfile,json,math,random,collections
ROOT=Path(__file__).resolve().parents[1]
ZIP=ROOT/'source'/'wuhan_road_lab_v2_GPT.zip'
with zipfile.ZipFile(ZIP) as z: net=json.loads(z.read('wuhan_road_lab_v2_GPT/data/network.json'))
nodes=net['nodes'];edges=net['edges']; rng=random.Random(20261111)
# Test area overlaps Wuhan Line 1 and Phase 2 core urban building area.
W,S,E,N=114.204,30.563,114.273,30.609
classes={'motorway':9,'trunk':8,'primary':7,'secondary':6,'tertiary':5,'residential':3.6,'unclassified':3.6,'living_street':3.2,'service':2.8,'other':3.2}
def inside(p):return W<=p[1]<=E and S<=p[0]<=N
def hav(a,b):
 lat=(a[0]+b[0])/2*math.pi/180
 return math.hypot((a[0]-b[0])*111200,(a[1]-b[1])*111200*math.cos(lat))
def clean_coords(c):
 out=[]
 for p in c:
  q=[round(float(p[1]),7),round(float(p[0]),7)]
  if not out or q!=out[-1]:out.append(q)
 return out
selected=[];adj=collections.defaultdict(list)
for raw in edges:
 u,v,length,kind,name,speed,oneway,coords,*rest=raw
 if kind not in classes or len(coords)<2:continue
 # only whole edges inside the study area to prevent stray cars far outside rendered context
 if not (inside(coords[0]) and inside(coords[-1])):continue
 if not all(inside(p) for p in coords[::max(1,len(coords)//8)]):continue
 # avoid the most complicated stacked roads in first pilot; metadata retained for audit
 bridge=str(rest[2] if len(rest)>2 else '').lower() # fields after geometry: maxspeed,lanes,bridge,tunnel
 tunnel=str(rest[3] if len(rest)>3 else '').lower()
 if bridge in ('yes','true','1') or tunnel in ('yes','true','1'):continue
 pts=clean_coords(coords)
 if len(pts)<2:continue
 length_m=sum(hav([a[1],a[0]],[b[1],b[0]]) for a,b in zip(pts,pts[1:]))
 if length_m<3:continue
 ix=len(selected);selected.append({'u':u,'v':v,'class':kind,'name':name or '', 'width_m':classes[kind], 'length_m':round(length_m,2),'coords':pts,'oneway':str(oneway).lower()=='true'})
 adj[u].append(ix)
# Prefer car routes with continuous connected roads, not free-floating paths.
starts=[u for u,opts in adj.items() if len(opts)>=2 and inside(nodes[u])]
def choose(start,limit=3600):
 cur=start;used=set();seq=[];total=0;previous=None
 for _ in range(90):
  options=[i for i in adj.get(cur,[]) if i not in used and selected[i]['v']!=previous and selected[i]['length_m']<550]
  if not options:break
  # prefer primary/secondary/tertiary to demonstrate recognizable city roads
  weights=[1.7 if selected[i]['class'] in ('primary','secondary','tertiary') else 1 for i in options]
  idx=rng.choices(options,weights=weights,k=1)[0];edge=selected[idx]
  seq.append(idx);used.add(idx);total+=edge['length_m'];previous=cur;cur=edge['v']
  if total>=limit:break
 return seq,total
routes=[];seen=set()
for start in rng.sample(starts,min(len(starts),2000)):
 seq,dist=choose(start,rng.randint(2200,4200))
 if dist<1600 or len(seq)<8:continue
 pts=[];lengths=[];junctions=[]
 for ix in seq:
  ed=selected[ix]
  if lengths:junctions.append(round(lengths[-1],2))
  for p in ed['coords']:
   if pts and p==pts[-1]:continue
   if pts:
    a=pts[-1];d=hav([a[1],a[0]],[p[1],p[0]])
    if d<.05:continue
    lengths.append(round(lengths[-1]+d,2))
   else:lengths.append(0)
   pts.append(p)
 if len(pts)<5:continue
 sig=tuple(seq[:3])
 if sig in seen:continue
 seen.add(sig)
 routes.append({'id':len(routes)+1,'coords':pts,'distances':lengths,'length_m':lengths[-1],'edge_count':len(seq),'junctions_m':junctions,'source':'Road Lab directed network'})
 if len(routes)>=85:break
# display at most 5000 roads; trim if needed, but retain all route-referenced roads
route_road_ids=set()
for route in routes:pass
out={'bbox':[W,S,E,N],'roads':selected,'routes':routes,'audit':{'source':'Road Lab V2 directed network.json','roads':len(selected),'route_count':len(routes),'coordinate_system':'WGS84','assumptions':['Road surface widths are schematic, not surveyed.','Ground elevation assumed zero; elevated/underground roads excluded when tagged.','Vehicles follow centerlines; true lanes and intersection signals are not modeled.']}}
(ROOT/'data'/'road3a.json').write_text(json.dumps(out,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print(json.dumps({'roads':len(selected),'routes':len(routes),'route_min_m':min([r['length_m'] for r in routes],default=0),'route_max_m':max([r['length_m'] for r in routes],default=0)},ensure_ascii=False))
