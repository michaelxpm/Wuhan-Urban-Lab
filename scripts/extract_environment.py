"""Offline Wuhan 3D Urban Lab environment extractor.
Run: python extract_environment.py
Requires: pip install osmium
Reads D:\\WuhanGIS\\hubei-261109.osm.pbf; outputs water, green and tree GeoJSON.
"""
import json,osmium,collections,pathlib,zipfile
INPUT=pathlib.Path(r'D:\WuhanGIS\hubei-261109.osm.pbf')
OUT=pathlib.Path(r'D:\WuhanGIS\UrbanEnvironment\output')
BBOX=(114.185,30.545,114.285,30.615)
def bbox_intersects(g):
 pts=[]
 def scan(a):
  if isinstance(a,list):
   if len(a)>=2 and all(isinstance(v,(float,int)) for v in a[:2]):pts.append(a)
   else:
    for v in a:scan(v)
 scan(g.get('coordinates',[]))
 if not pts:return False
 return min(p[0] for p in pts)<=BBOX[2] and max(p[0] for p in pts)>=BBOX[0] and min(p[1] for p in pts)<=BBOX[3] and max(p[1] for p in pts)>=BBOX[1]
def feat(g,p):return {'type':'Feature','geometry':g,'properties':p}
class Handler(osmium.SimpleHandler):
 def __init__(self):
  super().__init__();self.factory=osmium.geom.GeoJSONFactory();self.water=[];self.green=[];self.trees=[];self.stats=collections.Counter();self.errors=[]
 def area(self,a):
  tags={t.k:t.v for t in a.tags};natural=tags.get('natural');land=tags.get('landuse');leisure=tags.get('leisure');water=natural in ('water','wetland','bay') or land in ('reservoir','basin') or tags.get('water') in ('lake','pond','reservoir');green=land in ('grass','forest','meadow','recreation_ground','village_green','orchard') or leisure in ('park','garden','nature_reserve','golf_course') or natural in ('wood','grassland','scrub','heath');
  if not water and not green:return
  try:g=json.loads(self.factory.create_multipolygon(a))
  except Exception as e:self.stats['invalid']+=1;return
  if not bbox_intersects(g):return
  props={'osm_id':int(a.orig_id()),'osm_type':'way' if a.from_way() else 'relation','name':tags.get('name',''),'natural':natural,'landuse':land,'leisure':leisure,'water':tags.get('water')}
  if water:self.water.append(feat(g,props))
  elif green:self.green.append(feat(g,props))
 def node(self,n):
  if n.tags.get('natural')!='tree' or not n.location.valid():return
  x,y=n.location.lon,n.location.lat
  if BBOX[0]<=x<=BBOX[2] and BBOX[1]<=y<=BBOX[3]:self.trees.append(feat({'type':'Point','coordinates':[x,y]},{'osm_id':int(n.id),'name':n.tags.get('name',''),'species':n.tags.get('species','')}))
def main():
 if not INPUT.is_file():raise FileNotFoundError(INPUT)
 OUT.mkdir(parents=True,exist_ok=True);h=Handler();print('Reading OSM PBF (areas + tree nodes)...',flush=True)
 h.apply_file(str(INPUT),locations=True)
 for name,items in [('water',h.water),('green',h.green),('trees',h.trees)]:
  with (OUT/(name+'.geojson')).open('w',encoding='utf8') as f:json.dump({'type':'FeatureCollection','features':items},f,ensure_ascii=False,separators=(',',':'))
  print(name,len(items),flush=True)
 (OUT/'environment_audit.json').write_text(json.dumps({'bbox':BBOX,'water':len(h.water),'green':len(h.green),'trees':len(h.trees),'invalid_geometry':h.stats['invalid'],'coordinate_system':'WGS84','note':'Study rectangle, not administrative Wuhan boundary. Area features crossing bbox are not clipped.'},ensure_ascii=False,indent=2),encoding='utf8')
 with zipfile.ZipFile(OUT/'wuhan_environment_data.zip','w',zipfile.ZIP_DEFLATED,compresslevel=8) as z:
  for name in ('water.geojson','green.geojson','trees.geojson','environment_audit.json'):z.write(OUT/name,arcname=name)
 print('DONE:',OUT/'wuhan_environment_data.zip')
if __name__=='__main__':main()
