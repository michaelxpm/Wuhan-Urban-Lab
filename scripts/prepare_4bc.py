import json,zipfile,collections,pathlib,math
from shapely.geometry import shape,box,mapping
from shapely.validation import make_valid
P=pathlib.Path(__file__).resolve().parents[1];D=P/'data'
with zipfile.ZipFile('/mnt/data/wuhan_environment_data.zip') as z:
 counts={}
 for name in ['water','green','trees']:
  features=json.loads(z.read(name+'.geojson'))['features'];valid=[];fixed=0;dropped=0
  for f in features:
   try:
    g=shape(f['geometry']);
    if not g.is_valid:g=make_valid(g);fixed+=1
    if g.is_empty:dropped+=1;continue
    if g.geom_type not in ('Polygon','MultiPolygon') and name!='trees':dropped+=1;continue
    f['geometry']=mapping(g);valid.append(f)
   except Exception:dropped+=1
  (D/(name+'.geojson')).write_text(json.dumps({'type':'FeatureCollection','features':valid},ensure_ascii=False,separators=(',',':')))
  counts[name]={'total':len(features),'retained':len(valid),'fixed':fixed,'dropped':dropped}
# Build a direction audit directly from the network: each edge is a directed arc.
with zipfile.ZipFile('/mnt/data/wuhan_road_lab_v2_GPT.zip') as z:network=json.loads(z.read('wuhan_road_lab_v2_GPT/data/network.json'))
edge_set={(e[0],e[1]) for e in network['edges']}
count=collections.Counter();sample=[]
for e in network['edges']:
 if '京汉' in str(e[4]):
  count['arcs']+=1
  if (e[1],e[0]) in edge_set:count['reverse_arc_present']+=1
  else:count['reverse_arc_absent']+=1
  if len(sample)<15:sample.append({'u':e[0],'v':e[1],'name':e[4],'oneway':e[6],'reverse_exists':(e[1],e[0]) in edge_set})
(D/'road_direction_audit.json').write_text(json.dumps({'source':'Road Lab directed network.json','jinghan':dict(count),'samples':sample,'caution':'Graph arcs are directed; explicit turn restrictions are not included. Presence of a reverse arc may represent a parallel physical road or legal opposite direction depending on geometry.','environment':counts},ensure_ascii=False,indent=2))
# Landmarks from OSM object pages, NOT GCJ02 Amap coordinates.
(D/'landmarks_4bc.json').write_text(json.dumps({'landmarks':[
 {'id':'wuhan-center','name_zh':'武汉中心大厦','name_en':'Wuhan Center','lon':114.23967,'lat':30.59664,'height_m':438,'height_source':'Wuhan Jianghan government and OSM','osm_id':'way/450740194','source_url':'https://mapcarta.com/W450740194','geometry':'stylized'},
 {'id':'guishan-tower','name_zh':'龟山电视塔','name_en':'Guishan TV Tower','lon':114.27508,'lat':30.55802,'height_m':221.2,'height_source':'Wuhan municipal government; structure height excludes hill elevation','osm_id':'way/99463468','source_url':'https://mapcarta.com/W99463468','geometry':'stylized'}]},ensure_ascii=False,indent=2))
# Direction markers on Jinghan Boulevard from directed graph geometry. Avoid false claims about full turn restrictions.
arrows=[]
for e in network['edges']:
 if '京汉' not in str(e[4]) or not e[7] or len(e[7])<2:continue
 c=e[7];mid=len(c)//2
 p=c[mid];a=c[max(0,mid-1)];b=c[min(len(c)-1,mid+1)]
 if not (114.18<float(p[1])<114.30 and 30.54<float(p[0])<30.62):continue
 angle=math.degrees(math.atan2((b[1]-a[1])*math.cos(math.radians(p[0])),b[0]-a[0]))
 arrows.append({'type':'Feature','geometry':{'type':'Point','coordinates':[p[1],p[0]]},'properties':{'name':e[4],'oneway':e[6],'bearing':angle,'u':e[0],'v':e[1]}})
(D/'road_directions.geojson').write_text(json.dumps({'type':'FeatureCollection','features':arrows},ensure_ascii=False,separators=(',',':')))
print('ENV',counts,'JINGHAN',dict(count),'direction arrows',len(arrows))
