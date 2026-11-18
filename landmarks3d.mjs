import * as THREE from 'three';
const ANCHOR=[114.235,30.582],E=111319.4908*Math.cos(ANCHOR[1]*Math.PI/180),N=111319.4908;
const xy=(p)=>[(p[0]-ANCHOR[0])*E,(p[1]-ANCHOR[1])*N];
let map,scene,renderer,camera,landmarks,roofs,trees,ready=false,allBuildings=null,quality='medium';
const mat=(c,metal=.1)=>new THREE.MeshStandardMaterial({color:c,metalness:metal,roughness:.55,side:THREE.DoubleSide});
const glass=mat(0x5a9ba9,.45),silver=mat(0xd0e4e6,.3),dark=mat(0x294f62,.3),concrete=mat(0xd7d7cc),green=mat(0x4d9b71);
function mesh(group,geo,material,x=0,y=0,z=0){const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);group.add(m);return m}
function cylinder(group,top,bottom,height,z,material,segments=20){return mesh(group,new THREE.CylinderGeometry(top,bottom,height,segments),material,0,0,z)}
function makeCenter(l){const g=new THREE.Group(),p=xy([l.lon,l.lat]);g.position.set(...p,0); // tapered glass skyscraper, schematic not CAD
 mesh(g,new THREE.CylinderGeometry(16,24,398,20,1),glass,0,0,199).rotation.x=Math.PI/2; // cylinders default along Y; rotate into Z
 // Correct cylinder position: geometry centered on local Z after rotation.
 const tower=g.children[0];tower.rotation.x=Math.PI/2;
 // segmented vertical mullions
 for(let i=0;i<20;i++){const a=i*Math.PI*2/20;const x=19*Math.cos(a),y=19*Math.sin(a);mesh(g,new THREE.BoxGeometry(.35,.35,386),silver,x,y,201)}
 mesh(g,new THREE.CylinderGeometry(17,17,23,20),dark,0,0,410).rotation.x=Math.PI/2;
 mesh(g,new THREE.CylinderGeometry(13,13,9,20),silver,0,0,428).rotation.x=Math.PI/2;
 mesh(g,new THREE.CylinderGeometry(25,25,9,20),concrete,0,0,4.5).rotation.x=Math.PI/2;
 landmarks.add(g)
}
function makeTower(l){const g=new THREE.Group(),p=xy([l.lon,l.lat]);g.position.set(...p,0);
 mesh(g,new THREE.CylinderGeometry(2.7,7.5,165,24),concrete,0,0,82.5).rotation.x=Math.PI/2;
 for(let i=0;i<4;i++){const z=142+i*6;mesh(g,new THREE.CylinderGeometry(13,12,3,32),i%2?silver:dark,0,0,z).rotation.x=Math.PI/2}
 mesh(g,new THREE.SphereGeometry(12,24,12),silver,0,0,169);mesh(g,new THREE.CylinderGeometry(1.5,2.3,42,16),dark,0,0,198).rotation.x=Math.PI/2;
 for(let i=0;i<8;i++)mesh(g,new THREE.BoxGeometry(.4,.4,8),silver,Math.cos(i*Math.PI/4)*8,Math.sin(i*Math.PI/4)*8,171);
 landmarks.add(g)
}
function roofFromFeature(f){const p=f.properties||{},g=f.geometry;if(!g||!['Polygon','MultiPolygon'].includes(g.type))return;const ring=g.type==='Polygon'?g.coordinates[0]:g.coordinates[0][0];if(!ring||ring.length<4)return;const h=Number(p.render_height_m)||12;if(h<7||h>220)return;
 const points=ring.slice(0,-1).map(xy);const cx=points.reduce((a,p)=>a+p[0],0)/points.length,cy=points.reduce((a,p)=>a+p[1],0)/points.length;
 let r=0;for(const pt of points)r=Math.max(r,Math.hypot(pt[0]-cx,pt[1]-cy));if(r>45||r<2)return;
 // Simple flat roof cap or schematic gable, without changing the original OSM footprint extrusion.
 const shape=new THREE.Shape();points.forEach((p,i)=>i?shape.lineTo(p[0]-cx,p[1]-cy):shape.moveTo(p[0]-cx,p[1]-cy));shape.closePath();const geo=new THREE.ShapeGeometry(shape);mesh(roofs,geo,mat(p.roof_shape==='gabled'?0x8e6c66:0x94aab8),cx,cy,h+.12);
 if(quality==='low')return;
 // Thin floor-band strips on a small, capped set of buildings, LOD via group visibility.
 const floors=Math.min(18,Math.floor(h/3.5));if(floors<3)return;
 const band=mat(0x657d8e);for(let level=1;level<floors;level+=quality==='high'?2:4){const z=level*h/floors;for(let i=0;i<Math.min(points.length,12);i++){const a=points[i],b=points[(i+1)%points.length],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);if(len<3||len>70)continue;const line=mesh(roofs,new THREE.BoxGeometry(len,.16,.16),band,(a[0]+b[0])/2,(a[1]+b[1])/2,z);line.rotation.z=Math.atan2(dy,dx)}}
}
function buildRoofs(features){while(roofs.children.length){const m=roofs.children.pop();m.traverse(o=>{if(o.isMesh)o.geometry.dispose()})}let used=0;for(const f of features){if(['way/99463468','way/450740194'].includes(f.properties?.id))continue;if(used>=(quality==='high'?120:quality==='medium'?55:18))break;const p=f.properties||{};if(Number(p.render_height_m)<12)continue;roofFromFeature(f);used++}}
function buildTrees(features){trees.clear();const trunk=mat(0x8b775b),leaf=mat(0x5d9e74);const count=Math.min(features.length,quality==='low'?120:quality==='high'?650:360);for(let i=0;i<count;i++){const c=features[i]?.geometry?.coordinates;if(!c)continue;const p=xy(c),g=new THREE.Group();g.position.set(p[0],p[1],0);mesh(g,new THREE.CylinderGeometry(.25,.38,3.2,5),trunk,0,0,1.6).rotation.x=Math.PI/2;mesh(g,new THREE.IcosahedronGeometry(2.5,quality==='high'?1:0),leaf,0,0,4.2);trees.add(g)}}
async function load(){const [land,build,tree]=await Promise.all(['landmarks_4bc.json','buildings_core.geojson','trees.geojson'].map(n=>fetch('data/'+n).then(r=>r.json())));allBuildings=build.features;const mc=maplibregl.MercatorCoordinate.fromLngLat(ANCHOR,0),scale=mc.meterInMercatorCoordinateUnits();const custom={id:'urban-landmarks-three',type:'custom',renderingMode:'3d',onAdd(m,gl){scene=new THREE.Scene();camera=new THREE.Camera();renderer=new THREE.WebGLRenderer({canvas:m.getCanvas(),context:gl,antialias:true});renderer.autoClear=false;renderer.outputColorSpace=THREE.SRGBColorSpace;scene.add(new THREE.HemisphereLight(0xffffff,0x688499,1.7));const sun=new THREE.DirectionalLight(0xffffff,2.2);sun.position.set(100,150,350);scene.add(sun);landmarks=new THREE.Group();roofs=new THREE.Group();trees=new THREE.Group();scene.add(landmarks,roofs,trees);for(const l of land.landmarks)l.id==='wuhan-center'?makeCenter(l):makeTower(l);buildRoofs(allBuildings);buildTrees(tree.features);ready=true;sync()},render(gl,matrix){camera.projectionMatrix=new THREE.Matrix4().fromArray(matrix).multiply(new THREE.Matrix4().makeTranslation(mc.x,mc.y,mc.z)).multiply(new THREE.Matrix4().makeScale(scale,-scale,scale));renderer.resetState();renderer.render(scene,camera)}};map.addLayer(custom);map.on('zoom',sync)}
function sync(){if(!ready)return;landmarks.visible=document.getElementById('landmark3d')?.checked??true;roofs.visible=(document.getElementById('roofDetails')?.checked??true)&&map.getZoom()>15.3;trees.visible=(document.getElementById('treeLayer')?.checked??true)&&map.getZoom()>15.2;map.triggerRepaint()}
function start(){map=window.urbanMap;if(!map){setTimeout(start,150);return}const wait=()=>{if(!map.isStyleLoaded()){setTimeout(wait,150);return}load().catch(e=>console.warn('Landmark 3D:',e))};wait();for(const id of ['landmark3d','roofDetails','treeLayer'])document.getElementById(id)?.addEventListener('change',sync);window.addEventListener('urban-settings-change',e=>{if(e.detail.key==='quality'){quality=e.detail.value;if(ready){buildRoofs(allBuildings);fetch('data/trees.geojson').then(r=>r.json()).then(d=>{buildTrees(d.features);sync()})}}});window.addEventListener('urban-visual-change',()=>{if(!ready)return;const night=window.urbanSettings?.values.night;scene.children.filter(x=>x.isLight).forEach(x=>x.intensity=night?.65:1.8);map.triggerRepaint()})}
start();
