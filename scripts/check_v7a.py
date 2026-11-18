import json,collections,pathlib,heapq,random
p=pathlib.Path(__file__).resolve().parents[1];d=json.loads((p/'data/routing7a.json').read_text());n=d['nodes'];edges=d['edges'];stops=d['stops'];assert len(n)>5000 and len(edges)>10000 and len(stops)>300
adj=[[] for _ in n]
for i,e in enumerate(edges):
 u,v,dist,speed,name,cls,coords=e;assert 0<=u<len(n) and 0<=v<len(n) and dist>0 and len(coords)>=2;adj[u].append((v,dist))
for s in stops:assert 0<=s['node']<len(n) and s['snap_distance_m']<=170
random.seed(4);samples=random.sample(range(len(stops)),40)
def reachable(a,b):
 q=[(0,a)];seen=set()
 while q:
  cost,u=heapq.heappop(q)
  if u==b:return True
  if u in seen:continue
  seen.add(u)
  for v,dist in adj[u]:
   if v not in seen:heapq.heappush(q,(cost+dist,v))
 return False
success=sum(reachable(stops[i]['node'],stops[j]['node']) for i,j in zip(samples[::2],samples[1::2]));print('ROUTING',len(n),'nodes',len(edges),'arcs',len(stops),'stops',success,'of 20 sampled station pairs reachable');assert success>=12
print('DATA QUALITY PASS')
