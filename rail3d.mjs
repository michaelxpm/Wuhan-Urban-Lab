import * as THREE from 'three';
const $=id=>document.getElementById(id);
const ANCHOR=[114.235,30.582], TRACK_HEIGHT=8.0;
const R=6378137,latRad=ANCHOR[1]*Math.PI/180, eastScale=111319.4908*Math.cos(latRad),northScale=111319.4908;
const local=p=>[(p[0]-ANCHOR[0])*eastScale,(p[1]-ANCHOR[1])*northScale];
let map,custom,scene,renderer,camera,routeData=null,route=null,trainGroup,trackGroup,bridgeGroup,platformGroup;
let cars=[],clock=0,s=0,v=0,nextStop=1,dwellRemaining=0,state='READY',playing=false,follow=false,lastFrame=0,simAccum=0;
const PLATFORM_LENGTH=140,TRAIN_LENGTH=114;
const MAX_SPEED=80/3.6,ACCEL=.85,BRAKE=1,DT=.1,DWELL=30,CAR_LENGTH=19,CAR_COUNT=6;
const mat=(color,metalness=.05)=>new THREE.MeshStandardMaterial({color,roughness:.65,metalness});
const railMat=mat(0x52677a,.45),deckMat=mat(0x81909d),pillarMat=mat(0x9ca6ac),white=mat(0xe8f1f5),blue=mat(0x188eac),windowMat=mat(0x2b5369),lamp=mat(0xffe8a3),platformMat=mat(0xd7c9a8);
function box(parent,l,w,h,x,y,z,material){let o=new THREE.Mesh(new THREE.BoxGeometry(l,w,h),material);o.position.set(x,y,z);parent.add(o);return o}
function segment(parent,a,b,width,height,z,material){const A=local(a),B=local(b),dx=B[0]-A[0],dy=B[1]-A[1],len=Math.hypot(dx,dy);if(len<.05)return;const mesh=box(parent,len,width,height,(A[0]+B[0])/2,(A[1]+B[1])/2,z,material);mesh.rotation.z=Math.atan2(dy,dx)}
function distancePosition(d){if(!route)return {p:[0,0],heading:0};const ds=route.distances_m,coords=route.coords,clamped=Math.max(0,Math.min(route.length_m,d));let lo=0,hi=ds.length-1;while(lo+1<hi){const m=(lo+hi)>>1;if(ds[m]<clamped)lo=m;else hi=m}const span=Math.max(1e-9,ds[hi]-ds[lo]),f=Math.max(0,Math.min(1,(clamped-ds[lo])/span));const a=coords[lo],b=coords[hi];const p=[a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f];const A=local(a),B=local(b);return {p,heading:Math.atan2(B[1]-A[1],B[0]-A[0])}}
function drawStatic(){if(!scene||!route)return;for(const group of [trackGroup,bridgeGroup,platformGroup])group.clear();const coords=route.coords,ds=route.distances_m;
 for(let i=1;i<coords.length;i++){
  const a=coords[i-1],b=coords[i];segment(bridgeGroup,a,b,6.2,.65,TRACK_HEIGHT-.7,deckMat);segment(trackGroup,a,b,4.0,.15,TRACK_HEIGHT-.22,railMat);
  // Two raised steel rails, offset laterally from centreline.
  const A=local(a),B=local(b),dx=B[0]-A[0],dy=B[1]-A[1],len=Math.hypot(dx,dy);if(len<.05)continue;
  const nx=-dy/len,ny=dx/len;
  for(const side of [-1,1]){const m=box(trackGroup,len,.13,.18,(A[0]+B[0])/2+side*nx*.9,(A[1]+B[1])/2+side*ny*.9,TRACK_HEIGHT-.05,railMat);m.rotation.z=Math.atan2(dy,dx)}
 }
 // Pier spacing along track in real metres, not one pier per OSM vertex.
 for(let d=20;d<route.length_m;d+=55){const q=local(distancePosition(d).p);box(bridgeGroup,2.3,2.3,TRACK_HEIGHT-1.1,q[0],q[1],(TRACK_HEIGHT-1.1)/2,pillarMat)}
 // A stopping point denotes the train's front. Centre the platform 57 m behind it.
 // This is a schematic platform length, not surveyed infrastructure.
 for(const st of route.stops){const platformCenter=Math.max(0,Math.min(route.length_m,st.distance_m-TRAIN_LENGTH/2));
  const {p,heading}=distancePosition(platformCenter),q=local(p);const g=new THREE.Group();
  g.position.set(q[0],q[1],TRACK_HEIGHT+.12);g.rotation.z=heading;platformGroup.add(g);
  for(const side of [-1,1]){box(g,PLATFORM_LENGTH,4.5,.55,0,side*4.1,0,platformMat);
   for(const x of [-56,-28,0,28,56])box(g,.8,.8,3.0,x,side*4.1,1.7,pillarMat)}
  box(g,PLATFORM_LENGTH+2,11,.35,0,0,3.45,blue);
 }
 trackGroup.visible=$('train3d').checked;bridgeGroup.visible=$('viaduct').checked;platformGroup.visible=$('platform3d').checked;
}
function buildCar(){const g=new THREE.Group();box(g,18.2,2.9,2.85,0,0,0,white);box(g,17.8,3.0,.26,0,0,1.56,blue);box(g,18.0,3.0,.28,0,0,-1.5,blue);for(const side of [-1,1])for(let i=0;i<7;i++){box(g,1.55,.08,.72,-6.9+i*2.2,side*1.49,.47,windowMat)}for(const x of [-8.5,8.5]){box(g,.08,1.8,.85,x,0,.5,windowMat)}box(g,.2,2,.25,9.2,0,-.65,lamp);return g}
function updateCars(){if(!route)return;for(let i=0;i<CAR_COUNT;i++){const center=Math.max(0,s-(i+.5)*CAR_LENGTH),obj=cars[i];const q=distancePosition(center),p=local(q.p);obj.position.set(p[0],p[1],TRACK_HEIGHT+1.6);obj.rotation.z=q.heading;obj.visible=s>=i*CAR_LENGTH || state==='READY'&&i===0}}
function reset(){route=routeData.routes.find(r=>r.id===$('routeDirection').value);if(!route)return;s=0;v=0;clock=0;nextStop=1;dwellRemaining=0;state='READY';playing=false;lastFrame=0;simAccum=0;$('trainPlay').textContent='▶ 运行';drawStatic();updateCars();updatePanel();map?.triggerRepaint()}
function step(dt){clock+=dt;if(state==='FINISHED')return;if(state==='DWELL'){dwellRemaining=Math.max(0,dwellRemaining-dt);if(dwellRemaining<=0){nextStop++;state=nextStop>=route.stops.length?'FINISHED':'ACCELERATING'}return}const target=route.stops[nextStop];if(!target){state='FINISHED';return}const remaining=Math.max(0,target.distance_m-s),safe=Math.sqrt(2*BRAKE*Math.max(0,remaining-.15)),desired=Math.min(MAX_SPEED,safe),a=desired<v-1e-6?-BRAKE:desired>v+1e-6?ACCEL:0,nv=Math.max(0,Math.min(MAX_SPEED,v+a*dt)),travel=Math.min(remaining,(v+nv)*dt/2);s+=travel;v=nv;state=a<0?'BRAKING':a>0?'ACCELERATING':'CRUISING';if(target.distance_m-s<=.25&&v<=.8){s=target.distance_m;v=0;dwellRemaining=DWELL;state='DWELL'}}
function advance(seconds){let steps=Math.min(10000,Math.round(seconds/DT));for(let i=0;i<steps;i++)step(DT);updateCars();updatePanel();map?.triggerRepaint()}
function updatePanel(){if(!route)return;const tr=(zh,en)=>window.urbanI18n?.language==='en'?en:zh;const next=route.stops[nextStop],remaining=next?Math.max(0,next.distance_m-s):0;$('trainPanel').innerHTML=`<strong>${state}</strong><br>${tr('运行时间','Elapsed time')}：${Math.floor(clock/60)}m ${Math.floor(clock%60)}s<br>${tr('速度','Speed')}：${(v*3.6).toFixed(1)} km/h<br>${tr('里程','Distance')}：${(s/1000).toFixed(2)} / ${(route.length_m/1000).toFixed(2)} km<br>${tr('下一站','Next stop')}：${next?.name||tr('终点','Terminus')}<br>${tr('距下一站','To next stop')}：${remaining.toFixed(0)} m<br>${tr('停站剩余','Dwell remaining')}：${dwellRemaining.toFixed(1)} s`}
function setVisibility(){if(trackGroup)trackGroup.visible=$('train3d').checked;if(trainGroup)trainGroup.visible=$('train3d').checked;if(bridgeGroup)bridgeGroup.visible=$('viaduct').checked;if(platformGroup)platformGroup.visible=$('platform3d').checked;map?.triggerRepaint()}
function add3dLayer(){const mc=maplibregl.MercatorCoordinate.fromLngLat(ANCHOR,0),unit=mc.meterInMercatorCoordinateUnits();custom={id:'rail-three-layer',type:'custom',renderingMode:'3d',onAdd(m,gl){scene=new THREE.Scene();camera=new THREE.Camera();renderer=new THREE.WebGLRenderer({canvas:m.getCanvas(),context:gl,antialias:true});renderer.autoClear=false;renderer.outputColorSpace=THREE.SRGBColorSpace;scene.add(new THREE.HemisphereLight(0xffffff,0x536f8c,2.1));const sun=new THREE.DirectionalLight(0xffffff,2.3);sun.position.set(100,100,220);scene.add(sun);trackGroup=new THREE.Group();bridgeGroup=new THREE.Group();platformGroup=new THREE.Group();trainGroup=new THREE.Group();scene.add(bridgeGroup,trackGroup,platformGroup,trainGroup);cars=Array.from({length:CAR_COUNT},()=>{const g=buildCar();trainGroup.add(g);return g});drawStatic();updateCars()},render(gl,matrix){const base=new THREE.Matrix4().makeTranslation(mc.x,mc.y,mc.z);const scale=new THREE.Matrix4().makeScale(unit,-unit,unit);const projection=new THREE.Matrix4().fromArray(matrix);camera.projectionMatrix=projection.multiply(base).multiply(scale);renderer.resetState();renderer.render(scene,camera);mTrigger();}};map.addLayer(custom)}
// Repaint only when motion or the map changes; the map itself triggers rendering on interaction.
function mTrigger(){}
function frame(now){if(playing){if(lastFrame===0)lastFrame=now;const delta=Math.min(.15,(now-lastFrame)/1000);lastFrame=now;simAccum+=delta*Number($('trainSpeed').value);let loops=0;while(simAccum>=DT&&loops<70){step(DT);simAccum-=DT;loops++}updateCars();updatePanel();if(follow&&route&&!window.urbanCamera5?.active){const pos=distancePosition(s).p;map.easeTo({center:pos,duration:0})}map.triggerRepaint();if(state==='FINISHED'){playing=false;$('trainPlay').textContent='▶ 运行'}}requestAnimationFrame(frame)}
function start(){map=window.urbanMap;if(!map){setTimeout(start,100);return}fetch('data/line1_core_routes.json').then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()}).then(data=>{routeData=data;const ready=()=>{if(!map.isStyleLoaded()){setTimeout(ready,150);return}add3dLayer();reset();requestAnimationFrame(frame);$('trainPanel').insertAdjacentHTML('beforeend','<div class="note">3D场景已加载</div>')};ready()}).catch(e=>{$('trainPanel').textContent='3D数据加载失败：'+e.message;console.error(e)});
 $('routeDirection').onchange=reset;$('trainReset').onclick=reset;$('trainPlay').onclick=()=>{if(state==='FINISHED')reset();playing=!playing;if(playing)window.urbanAudio?.beep();lastFrame=0;$('trainPlay').textContent=playing?'Ⅱ 暂停':'▶ 运行'};$('trainStep').onclick=()=>{playing=false;$('trainPlay').textContent='▶ 运行';advance(10)};for(const id of ['train3d','viaduct','platform3d'])$(id).onchange=setVisibility;$('focusRail').onclick=()=>map.fitBounds([[114.19,30.56],[114.28,30.61]],{pitch:55,bearing:-22,padding:65,duration:750});$('followTrain').onclick=()=>{follow=!follow;$('followTrain').textContent=window.urbanI18n?.language==='en'?('Follow train: '+(follow?'On':'Off')):('跟随列车：'+(follow?'开':'关'))};
}
window.urbanRail={get telemetry(){if(!route)return null;const q=distancePosition(s);return {lng:q.p[0],lat:q.p[1],heading:q.heading,speedKmh:v*3.6,km:s/1000,nextStation:route.stops[nextStop]?.name||'终点',state,playing,routeId:route.id}},get follow(){return follow},setFollow(value){follow=Boolean(value);$('followTrain').textContent=window.urbanI18n?.language==='en'?('Follow train: '+(follow?'On':'Off')):('跟随列车：'+(follow?'开':'关'))}};
window.addEventListener('urban-exit-follow',()=>window.urbanRail.setFollow(false));
start();

window.addEventListener('urban-language-change',()=>{updatePanel();$('followTrain').textContent=window.urbanI18n?.language==='en'?('Follow train: '+(follow?'On':'Off')):('跟随列车：'+(follow?'开':'关'));$('trainPlay').textContent=window.urbanI18n?.language==='en'?(playing?'Ⅱ Pause':'▶ Run'):(playing?'Ⅱ 暂停':'▶ 运行')});
