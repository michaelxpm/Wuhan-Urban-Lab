import * as THREE from 'three';
import {smoothRoute,pose,curvature} from './road_smoothing.mjs';
import {desiredSpeed,nextCars,signalState,summarize} from './traffic7b_core.mjs';
const $=id=>document.getElementById(id);
const ANCHOR=[114.235,30.582], EAST=111319.4908*Math.cos(ANCHOR[1]*Math.PI/180),NORTH=111319.4908;
const local=p=>[(p[0]-ANCHOR[0])*EAST,(p[1]-ANCHOR[1])*NORTH];
const colors=[0xe5bd6e,0x62c5d8,0xd57f84,0x95bbd8,0xb4d9a6,0xe5a5c5,0x70b6a0,0xe0aa73];
let map,scene,renderer,camera,roadMesh,carGroup,vehicles=[],data=null,simTime=0,lastFrame=0,accum=0,playing=true,ready=false;
let selectedCar=-1,followMode='off',followLast=0,selectedHighlight=null;
const STEP=.1;
const traffic=()=>window.urbanTraffic7b?.state||{following:true,signals:false,cycle:70,green:42,headway:1.4};
let backgroundCount=18;let recoveryCount=0;
const tr=(zh,en)=>window.urbanI18n?.language==='en'?en:zh;
function at(route,s){return pose(route,s)}
function bend(route,s){return curvature(route,s,9)}
function buildRoadGeometry(roads){const verts=[],cols=[],palette={motorway:0x8e9aa6,trunk:0x8294a1,primary:0x98a7b4,secondary:0x9fadb7,tertiary:0xa8b5bc,residential:0xb5c0c5,unclassified:0xb6bfc4,living_street:0xc0c9cd,service:0xc4cbd0,other:0xb5bfc6};for(const r of roads){const color=new THREE.Color(palette[r.class]||0xb6bfc4),pts=r.coords;for(let i=1;i<pts.length;i++){const a=local(pts[i-1]),b=local(pts[i]),dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);if(length<.1)continue;const w=Math.min(10,Math.max(2,r.width_m*1.1))*.5,nx=-dy/length*w,ny=dx/length*w,z=.18,A=[a[0]+nx,a[1]+ny,z],B=[a[0]-nx,a[1]-ny,z],C=[b[0]+nx,b[1]+ny,z],D=[b[0]-nx,b[1]-ny,z];for(const p of [A,B,C,C,B,D]){verts.push(...p);cols.push(color.r,color.g,color.b)}}}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));g.computeVertexNormals();return g}
const material=(color,metalness=.05)=>new THREE.MeshStandardMaterial({color,roughness:.62,metalness,side:THREE.DoubleSide});
function cuboid(parent,x,y,z,w,l,h,mat){const o=new THREE.Mesh(new THREE.BoxGeometry(w,l,h),mat);o.position.set(x,y,z);parent.add(o);return o}
function createCar(color,bus=false){const g=new THREE.Group(),body=material(color,.16),roof=material(0xe4edf1),glass=material(0x254b64,.1),wheel=material(0x25313d),light=material(0xffe9a4),length=bus?10:4.4,width=bus?2.5:1.85;
 cuboid(g,0,0,1.2,length,width,bus?2.5:1.15,body);cuboid(g,0,0,bus?2.58:1.93,length*.8,width*.9,.2,roof);
 for(const side of [-1,1]){cuboid(g,.1,side*width*.51,bus?1.95:1.52,length*.65,.05,.48,glass);for(const x of [-length*.32,length*.32]){const w=new THREE.Mesh(new THREE.CylinderGeometry(.36,.36,.16,10),wheel);w.rotation.x=Math.PI/2;w.position.set(x,side*(width*.5+.08),.47);g.add(w)}}
 cuboid(g,length*.5+.03,0,1.2,.09,width*.7,.25,light);return g}
function speedProfile(route,cruise){const pts=[],step=12;for(let s=0;s<=route.length_m+step;s+=step){const pos=Math.min(s,route.length_m);const turn=Math.max(bend(route,Math.max(0,pos-14)),bend(route,pos),bend(route,Math.min(route.length_m,pos+14)));const curveSpeed=turn>.65?4.8:turn>.38?6.5:turn>.20?8.2:cruise;pts.push(Math.min(cruise,curveSpeed))}return pts}
function disposeVehicle(v){carGroup?.remove(v.model);v.model.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose()}})}
function populate(){if(!carGroup||!data)return;
 // Preserve 7A planned navigation cars and buses when changing background traffic.
 const retained=vehicles.filter(v=>v.external);for(const v of vehicles)if(!v.external)disposeVehicle(v);
 vehicles=retained.slice();const count=Math.max(1,Math.min(100,backgroundCount)),pool=data.routes;
 if(!pool.length){$('roadStatus').textContent=tr('无可用连通路径','No connected routes');return}
 for(let i=0;i<count;i++){
  const raw=pool[(i*7+3)%pool.length],route=smoothRoute(raw);route.distances_raw_length=raw.length_m;const bus=i%9===0,cruise=(bus?8:10)+(i%7)*1.35,model=createCar(colors[i%colors.length],bus);carGroup.add(model);
  const stops=bus?[route.length_m*.25,route.length_m*.55,route.length_m*.8]:[];
  const initial=(i*83)%Math.max(1,route.length_m-200);
  vehicles.push({id:i+1,route,s:initial,speed:cruise*.75,cruise,model,bus,respawn:0,finished:false,dwell:0,stops,stopIndex:stops.filter(x=>x<=initial).length,profile:speedProfile(route,cruise),stopReason:"moving",stuckFor:0,finishedFor:0});
 }
 if(selectedCar>=vehicles.length)selectedCar=0;updateCars();updateStatus();updateFollowUI();
}
// External user-planned routes reuse the existing 3D vehicle renderer and fixed-step motion.
let customVehicles=[];
function addPlannedVehicle(spec){if(!ready||!carGroup)throw Error('3D traffic renderer not ready');const pts=spec.coords;if(!pts||pts.length<2)throw Error('Route geometry missing');
 const route=smoothRoute({id:'planned-'+Date.now()+'-'+customVehicles.length,coords:pts,distances:[],length_m:0,junctions_m:[]});
 if(route.length_m<5)throw Error('Route too short');const bus=spec.kind==='bus',model=createCar(bus?0xe7b95e:0x5ad5bd,bus);carGroup.add(model);
 const stops=(spec.stops||[]).map(x=>{let best=0,d=Infinity;for(let i=0;i<route.coords.length;i++){const p=route.coords[i],a=(p[0]-x[0])*96000,b=(p[1]-x[1])*111200,dd=a*a+b*b;if(dd<d){d=dd;best=i}}return route.distances[best]}).filter(x=>x>5&&x<route.length_m-5).sort((a,b)=>a-b);
 const cruise=bus?9:12,initial=Math.max(0,Math.min(route.length_m-1,Number(spec.startDistance)||0)),v={id:'P'+(customVehicles.length+1),route,s:initial,speed:0,cruise,model,bus,respawn:0,finished:false,dwell:0,stops,stopIndex:stops.filter(x=>x<=initial).length,profile:speedProfile(route,cruise),external:true,stopReason:"moving",stuckFor:0,finishedFor:0};
 customVehicles.push(v);vehicles.push(v);updateCars();updateStatus();return v.id}
function clearPlannedVehicles(){for(const v of customVehicles){carGroup?.remove(v.model);v.model.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose()}})}vehicles=vehicles.filter(v=>!v.external);customVehicles=[];updateCars();updateStatus()}
function updateCars(){for(const v of vehicles){if(v.respawn>0){v.model.visible=false;continue}const q=at(v.route,v.s);v.model.visible=true;v.model.position.set(q.xy[0],q.xy[1],0);v.model.rotation.z=q.heading}}
function updateStatus(){if(!$('roadStatus'))return;const buses=vehicles.filter(v=>v.bus).length;const paused=vehicles.filter(v=>v.dwell>0).length;$('roadStatus').textContent=tr(`${vehicles.length} 辆车（公交 ${buses}）· ${paused} 辆停站 · ${(simTime/60).toFixed(1)} 模拟分钟`,`${vehicles.length} vehicles (${buses} buses) · ${paused} dwelling · ${(simTime/60).toFixed(1)} sim min`)}
function visibleAt(lonlat){if(!map)return false;const bounds=map.getBounds();return bounds.contains(lonlat)}
function advance(dt){
 simTime+=dt;const cfg=traffic(),following=cfg.following&&$('carFollowing')?.checked!==false,signals=cfg.signals;
 const front=following?nextCars(vehicles):new Map();
 // Phase 7B: deterministic route-level following, not a complete lane simulator.
 for(const v of vehicles){
  if(v.finished){v.finishedFor=(v.finishedFor||0)+dt;v.stopReason='destination';if(v.finishedFor>5&&!v.external){v.finished=false;v.respawn=2;v.finishedFor=0}continue}
  if(v.respawn>0){v.stopReason='respawn';v.respawn-=dt;if(v.respawn<=0){v.s=0;v.speed=0;v.stopIndex=0;v.stuckFor=0;v.stopReason='moving'}continue}
  if(v.dwell>0){v.stopReason='bus_stop';v.stuckFor=0;v.dwell=Math.max(0,v.dwell-dt);v.speed=0;continue}
  const look=Math.min(v.route.length_m,v.s+Math.max(15,v.speed*2.8));const index=Math.min(v.profile.length-1,Math.floor(look/12));
  let target=v.profile[index];
  const ahead=front.get(v);const gap=ahead?ahead.s-v.s-(ahead.bus?10:4.4):Infinity;
  // Synthetic signal locations come from candidate path junctions; actual OSM signals are not inferred.
  let nextJ=Infinity,red=false;
  if(signals&&v.route.junctions_m?.length){
   const scale=v.route.length_m/(v.route.distances_raw_length||v.route.length_m);
   for(const j of v.route.junctions_m){const rem=j*scale-v.s;if(rem>=0&&rem<Math.max(55,v.speed*3)){nextJ=rem;break}}
   if(Number.isFinite(nextJ)){
    const id=typeof v.route.id==='number'?v.route.id:17;
    red=signalState(simTime,Math.abs(id)%23,cfg.cycle,Math.min(cfg.green,cfg.cycle-5))==='red';
   }
  }
  target=Math.min(target,desiredSpeed({speed:v.speed,cruise:v.cruise,frontGap:gap,frontSpeed:ahead?.speed||0,signalDistance:nextJ,red,headway:cfg.headway}));
  if(v.bus&&v.stopIndex<v.stops.length){const rem=v.stops[v.stopIndex]-v.s;if(rem>=0&&rem<Math.max(35,v.speed*v.speed/3+8))target=Math.min(target,Math.sqrt(Math.max(0,2*1.7*rem)))}
  const accel=target<v.speed?-2.1:1.25;v.speed=Math.max(0,Math.min(v.cruise,v.speed+accel*dt));const oldS=v.s;
  let nextS=Math.min(v.route.length_m,v.s+v.speed*dt);
  if(ahead)nextS=Math.min(nextS,ahead.s-(ahead.bus?10:4.4)-4.5);
  if(red&&Number.isFinite(nextJ))nextS=Math.min(nextS,v.s+Math.max(0,nextJ-2));
  v.s=Math.max(oldS,nextS);if(v.s===oldS&&v.speed>0)v.speed=0;
  const blockedByCar=!!ahead&&ahead.s-v.s-(ahead.bus?10:4.4)<Math.max(7,v.speed*cfg.headway+7);
  v.stopReason=v.speed<.55?(red&&Number.isFinite(nextJ)?'red_signal':blockedByCar?'following':'slow_or_queued'):'moving';
  v.stuckFor=v.stopReason==='following'||v.stopReason==='slow_or_queued'?(v.stuckFor||0)+dt:0;
  // Only background traffic may be recycled. Never jump through a red light or a lead car.
  if(!v.external&&v.stuckFor>45){v.respawn=2;v.model.visible=false;v.stuckFor=0;v.stopReason='recovery';recoveryCount++;continue}
  if(v.bus&&v.stopIndex<v.stops.length&&oldS<=v.stops[v.stopIndex]&&v.s>=v.stops[v.stopIndex]){v.s=v.stops[v.stopIndex];v.speed=0;v.dwell=18;v.stopReason='bus_stop';v.stopIndex++}
  if(v.s>=v.route.length_m-.01){v.s=v.route.length_m;v.speed=0;v.finished=true;v.stopReason='destination';v.finishedFor=0}
 }
 updateCars();
}
function animate(now){if(!lastFrame)lastFrame=now;const delta=Math.min(.16,(now-lastFrame)/1000);lastFrame=now;if(playing&&ready){accum+=delta*Number($('carSpeed').value);let n=0;while(accum>=STEP&&n<80){advance(STEP);accum-=STEP;n++}map?.triggerRepaint()}if(followMode!=='off'&&ready&&!window.urbanCamera5?.active)updateFollowCamera(now);if(Math.floor(now/500)!==Math.floor((now-delta*1000)/500))updateStatus();requestAnimationFrame(animate)}
function init(){map=window.urbanMap;if(!map){setTimeout(init,150);return}fetch('data/road3a.json').then(r=>{if(!r.ok)throw Error('road3a.json HTTP '+r.status);return r.json()}).then(d=>{data=d;const wait=()=>{if(!map.isStyleLoaded()){setTimeout(wait,120);return}const anchor=maplibregl.MercatorCoordinate.fromLngLat(ANCHOR,0),unit=anchor.meterInMercatorCoordinateUnits();const custom={id:'road-three-layer',type:'custom',renderingMode:'3d',onAdd(m,gl){scene=new THREE.Scene();camera=new THREE.Camera();renderer=new THREE.WebGLRenderer({canvas:m.getCanvas(),context:gl,antialias:true});renderer.autoClear=false;renderer.outputColorSpace=THREE.SRGBColorSpace;scene.add(new THREE.HemisphereLight(0xffffff,0x697b91,2));const sun=new THREE.DirectionalLight(0xffffff,2);sun.position.set(150,150,200);scene.add(sun);roadMesh=new THREE.Mesh(buildRoadGeometry(data.roads),new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95,side:THREE.DoubleSide}));scene.add(roadMesh);carGroup=new THREE.Group();scene.add(carGroup);populate();ready=true;},render(gl,matrix){const projection=new THREE.Matrix4().fromArray(matrix);camera.projectionMatrix=projection.multiply(new THREE.Matrix4().makeTranslation(anchor.x,anchor.y,anchor.z)).multiply(new THREE.Matrix4().makeScale(unit,-unit,unit));renderer.resetState();renderer.render(scene,camera)}};map.addLayer(custom);requestAnimationFrame(animate);$('roadStatus').textContent=tr('3D道路与车辆已就绪','3D roads and vehicles ready')};wait()}).catch(e=>{console.error(e);$('roadStatus').textContent=tr('道路加载失败：','Road loading failed: ')+e.message});$('carCount').max='100';$('carCount').oninput=()=>{$('carCountValue').textContent=$('carCount').value;backgroundCount=Number($('carCount').value);if(window.urbanTraffic7b)window.urbanTraffic7b.state.count=backgroundCount;populate()};$('carReset').onclick=()=>{simTime=0;populate()};$('carPlay').onclick=()=>{playing=!playing;if(playing)window.urbanAudio?.beep();$('carPlay').textContent=playing?tr('Ⅱ 暂停汽车','Ⅱ Pause cars'):tr('▶ 运行汽车','▶ Run cars')};$('carRoads').onchange=()=>{if(roadMesh)roadMesh.visible=$('carRoads').checked;map.triggerRepaint()};$('carVehicles').onchange=()=>{if(carGroup)carGroup.visible=$('carVehicles').checked;map.triggerRepaint()};$('carFocus').onclick=()=>map.fitBounds([[114.207,30.563],[114.271,30.608]],{pitch:55,bearing:-22,padding:65,duration:750});$('carSignals')?.addEventListener('change',e=>{if(window.urbanTraffic7b)window.urbanTraffic7b.state.signals=e.target.checked});$('carFollowing')?.addEventListener('change',e=>{if(window.urbanTraffic7b)window.urbanTraffic7b.state.following=e.target.checked});window.addEventListener('urban-language-change',()=>{updateStatus();$('carPlay').textContent=playing?tr('Ⅱ 暂停汽车','Ⅱ Pause cars'):tr('▶ 运行汽车','▶ Run cars')})}
function updateFollowUI(){const selected=vehicles[selectedCar];const label=$('carFollowStatus');if(label)label.textContent=selected?tr(`选中车辆 #${selected.id} · ${selected.bus?'公交':'汽车'} · ${followMode==='off'?'自由视角':followMode==='overhead'?'俯视跟随':'斜后跟随'}`,`Selected #${selected.id} · ${selected.bus?'Bus':'Car'} · ${followMode==='off'?'Free camera':followMode==='overhead'?'Overhead follow':'Chase follow'}`):tr('尚未选择车辆','No vehicle selected');if($('carFollowMode'))$('carFollowMode').value=followMode}
function selectVehicle(i){if(i<0||i>=vehicles.length)return;selectedCar=i;updateFollowUI();map?.triggerRepaint()}
function updateFollowCamera(now){if(now-followLast<60||!map||map.dragPan?.isActive?.())return;followLast=now;const v=vehicles[selectedCar];if(!v||v.respawn>0||!v.model.visible)return;const p=at(v.route,v.s),center=p.geo;const headingDeg=p.heading*180/Math.PI;let bearing=map.getBearing();if(followMode==='chase'){const target=90-headingDeg;const delta=((target-bearing+540)%360)-180;bearing+=delta*.08}const targetPitch=followMode==='chase'?64:53;map.jumpTo({center,bearing,pitch:map.getPitch()+(targetPitch-map.getPitch())*.06});}
function setFollowMode(mode){if(mode!=='off')window.urbanRail?.setFollow(false);followMode=['off','overhead','chase'].includes(mode)?mode:'off';if(followMode!=='off'&&selectedCar<0&&vehicles.length)selectedCar=0;updateFollowUI()}
window.urbanRoad={addPlannedVehicle,clearPlannedVehicles,setBackgroundCount(n){backgroundCount=Math.max(1,Math.min(100,Number(n)||18));$('carCount').value=backgroundCount;$('carCountValue').textContent=backgroundCount;populate();},resetBackground(){simTime=0;populate()},get metrics(){return {...summarize(vehicles),recoveries:recoveryCount,stops:vehicles.reduce((acc,v)=>{const k=v.stopReason||'unknown';acc[k]=(acc[k]||0)+1;return acc},{})}},get selectedDiagnostics(){const v=vehicles[selectedCar];return v?{id:v.id,reason:v.stopReason||'unknown',stoppedFor:Number((v.stuckFor||0).toFixed(1)),routeId:v.route.id,speedKmh:Number((v.speed*3.6).toFixed(1)),external:!!v.external}:null},get telemetry(){const car=vehicles[selectedCar];if(!car)return null;const p=at(car.route,car.s);return {lng:p.geo[0],lat:p.geo[1],heading:p.heading,speedKmh:car.speed*3.6,km:car.s/1000,bus:car.bus,id:car.id,finished:car.finished||car.respawn>0}},get vehicles(){return vehicles},get selectedCar(){return selectedCar},selectVehicle,setFollowMode,get followMode(){return followMode},get ready(){return ready}};
window.addEventListener('urban-exit-follow',()=>setFollowMode('off'));
function initFollow(){const selector=$('carSelect'),mode=$('carFollowMode');if(!selector||!mode)return;selector.onchange=()=>selectVehicle(Number(selector.value));mode.onchange=()=>setFollowMode(mode.value);$('carFollowNext').onclick=()=>{if(vehicles.length)selectVehicle((selectedCar+1)%vehicles.length)};map.on('click',e=>{if(!ready)return;let best=-1,dist=22;for(let i=0;i<vehicles.length;i++){const v=vehicles[i];if(!v.model.visible)continue;const q=at(v.route,v.s),screen=map.project(q.geo),d=Math.hypot(screen.x-e.point.x,screen.y-e.point.y);if(d<dist){best=i;dist=d}}if(best>=0)selectVehicle(best)});}
const oldPopulate=populate;
populate=function(){oldPopulate();const sel=$('carSelect');if(sel){sel.innerHTML=vehicles.map((v,i)=>`<option value="${i}">#${v.id} · ${v.bus?tr('公交','Bus'):tr('汽车','Car')}</option>`).join('');if(selectedCar<0&&vehicles.length)selectedCar=0;sel.value=String(selectedCar)}updateFollowUI()};
const oldInit=init;
init=function(){oldInit();const wait=()=>{if(!window.urbanMap){setTimeout(wait,150);return}map=window.urbanMap;initFollow()};wait()};
init();
