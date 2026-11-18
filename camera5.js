'use strict';
// Phase 5: map-based cinematic camera. No invented cockpit geometry or physics.
(()=>{
const $=id=>document.getElementById(id);
const map=()=>window.urbanMap;
const tr=(zh,en)=>window.urbanI18n?.language==='en'?en:zh;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const shortAngle=(a,b)=>((b-a+540)%360)-180;
const presets={aerial:{zoom:14.3,pitch:55,bearing:-22},top:{zoom:15,pitch:0,bearing:0},low:{zoom:17.1,pitch:68,bearing:-22},side:{zoom:16.4,pitch:63,bearing:90}};
const locations=[{zh:'武汉中心大厦',en:'Wuhan Center',center:[114.23967,30.59664],zoom:16.2,pitch:63,bearing:-25},{zh:'龟山电视塔',en:'Guishan TV Tower',center:[114.27508,30.55802],zoom:15.9,pitch:62,bearing:32},{zh:'硚口路—太平洋',en:'Qiaokou Road–Taipingyang',center:[114.225,30.585],zoom:15.5,pitch:59,bearing:-30},{zh:'宗关',en:'Zongguan',center:[114.217,30.594],zoom:15.7,pitch:60,bearing:25}];
let mode='free',target='train',tour=false,tourStep=0,tourNext=0,last=0,lastHud=0,cinema=false,active=false;
let lastTarget=null,followingLngLat=null;
const getViews=()=>{try{return JSON.parse(localStorage.getItem('wuhan5-views')||'[]')}catch{return []}};
const storeViews=v=>{try{localStorage.setItem('wuhan5-views',JSON.stringify(v))}catch{}};
function setStatus(message){const el=$('camera5Status');if(el)el.textContent=message}
function exitLegacy(){window.urbanRail?.setFollow(false);window.urbanRoad?.setFollowMode('off')}
function resetSmooth(){lastTarget=null;followingLngLat=null}
function setMode(m){if(!['free','train','car','trainfront','carfront'].includes(m))m='free';mode=m;active=m!=='free';tour=false;exitLegacy();resetSmooth();if($('camera5Mode'))$('camera5Mode').value=m;syncDock();setStatus(tr('视角模式已更新','Camera mode updated'))}
function goView(v,duration=1250){const m=map();if(!m)return;setMode('free');m.easeTo({...v,duration,essential:true});}
function selectedTelemetry(){return mode.startsWith('train')?window.urbanRail?.telemetry:window.urbanRoad?.telemetry}
function follow(now){const m=map(),t=selectedTelemetry();if(!m||!t||mode==='free'||t.finished)return;
 const delta=Math.min(.1,Math.max(.008,(now-last)/1000||.016)),smooth=clamp(1-Math.exp(-delta*3.4),.025,.35);
 const desired=[t.lng,t.lat];if(!followingLngLat)followingLngLat=desired.slice();else followingLngLat=followingLngLat.map((x,i)=>x+(desired[i]-x)*smooth);
 const deg=t.heading*180/Math.PI,headingBearing=90-deg;
 const isFront=mode.endsWith('front'),isTrain=mode.startsWith('train');
 const side=Number($('camera5Orbit')?.value||0),offset=Number($('camera5Distance')?.value||0);
 const targetBearing=headingBearing+side,oldBearing=m.getBearing();
 const bearing=oldBearing+shortAngle(oldBearing,targetBearing)*smooth;
 const targetPitch=isFront?68:isTrain?58:60;
 const pitch=m.getPitch()+(targetPitch-m.getPitch())*smooth;
 const desiredZoom=clamp((isFront?18:isTrain?16.9:17.1)-offset/100,12.5,18.5);
 const zoom=m.getZoom()+(desiredZoom-m.getZoom())*smooth;
 // MapLibre shared map camera: a near-front low-angle map view, not a real eye-height cockpit.
 m.jumpTo({center:followingLngLat,bearing,pitch,zoom});
}
function hud(){const panel=$('cameraHud5'),m=map();if(!panel||!m)return;
 const t=selectedTelemetry();const show=$('camera5HudToggle')?.checked!==false;
 panel.hidden=!show||mode==='free'||!t;if(panel.hidden)return;
 const train=mode.startsWith('train');
 const label=train?tr('地铁1号线','Metro Line 1'):`${t.bus?tr('公交','Bus'):tr('汽车','Car')} #${t.id}`;
 panel.innerHTML=`<div class="hud-eyebrow">${train?'RAIL CAM':'ROAD CAM'} · LIVE SIMULATION</div><div class="hud-main">${label}</div><div class="hud-grid"><div><small>${tr('速度','Speed')}</small><strong>${t.speedKmh.toFixed(1)} <small>km/h</small></strong></div><div><small>${tr('里程','Distance')}</small><strong>${t.km.toFixed(2)} <small>km</small></strong></div></div>${train?`<div class="hud-next">${tr('下一站','Next stop')} · ${t.nextStation}</div>`:''}`;
}
function syncDock(){const el=$('cameraDock5');if(!el)return;el.hidden=!active&&!tour;el.innerHTML=`<span>${tour?tr('城市巡游中','City tour'):mode==='train'?tr('列车跟随','Train follow'):mode==='car'?tr('汽车跟随','Car follow'):mode==='trainfront'?tr('列车前向','Train forward'):tr('汽车前向','Car forward')}</span><button id="camera5DockExit">✕ ${tr('退出','Exit')}</button>`;$('camera5DockExit').onclick=()=>{stopTour();setMode('free')}}
function update(now){const m=map();if(m){if(tour&&now>=tourNext){const loc=locations[tourStep%locations.length];tourStep++;m.easeTo({center:loc.center,zoom:loc.zoom,pitch:loc.pitch,bearing:loc.bearing,duration:4200,essential:true});tourNext=now+7600;setStatus(`${tr('巡游','Tour')}: ${tr(loc.zh,loc.en)}`)}if(active)follow(now);if(now-lastHud>240){hud();lastHud=now}}last=now;requestAnimationFrame(update)}
function stopTour(){tour=false;syncDock();if(map())map().stop()}
function startTour(){setMode('free');tour=true;tourStep=0;tourNext=0;syncDock();closePanel()}
function applyPreset(name){const m=map();if(!m||!presets[name])return;const c=m.getCenter();goView({...presets[name],center:[c.lng,c.lat]})}
function saveView(){const m=map();if(!m)return;const views=getViews(),c=m.getCenter();const title=prompt(tr('为此视角命名','Name this view'),tr('我的视角','My view'));if(title===null)return;const name=title.trim().slice(0,48);if(!name)return;if(views.length>=12){setStatus(tr('最多保存12个视角','Maximum 12 saved views'));return}views.push({name,center:[c.lng,c.lat],zoom:m.getZoom(),pitch:m.getPitch(),bearing:m.getBearing()});storeViews(views);renderSaved()}
function renderSaved(){const el=$('camera5Saved');if(!el)return;el.replaceChildren();const views=getViews();if(!views.length){el.textContent=tr('还没有收藏视角','No saved views');return}views.forEach((v,i)=>{const row=document.createElement('div');row.className='saved-view5';const go=document.createElement('button');go.textContent=v.name;go.onclick=()=>{goView(v);closePanel()};const del=document.createElement('button');del.textContent='✕';del.title=tr('删除','Delete');del.onclick=()=>{views.splice(i,1);storeViews(views);renderSaved()};row.append(go,del);el.append(row)})}
function screenshot(){const m=map();if(!m)return;try{m.triggerRepaint();const canvas=m.getCanvas();const url=canvas.toDataURL('image/png');if(url.length<150)throw Error('Canvas is empty');const a=document.createElement('a');a.href=url;a.download='Wuhan-3D-Urban-Lab-'+Date.now()+'.png';document.body.appendChild(a);a.click();a.remove();setStatus(tr('已请求保存PNG截图','PNG screenshot requested'))}catch(e){console.warn(e);setStatus(tr('截图不可用：浏览器或地图瓦片限制','Screenshot unavailable: browser or map tile restrictions'))}}
function fullscreen(){const root=$('map')?.parentElement;if(!root)return;if(document.fullscreenElement)document.exitFullscreen?.();else root.requestFullscreen?.().catch(()=>setStatus(tr('无法进入全屏','Fullscreen unavailable')))}
function closePanel(){$('camera5Panel').hidden=true}
function openPanel(){const p=$('camera5Panel');p.hidden=false;renderSaved();refreshCarSelect();$('camera5Mode').value=mode;hud()}
function refreshCarSelect(){const el=$('camera5CarSelect'),road=window.urbanRoad;if(!el||!road)return;const selected=road.selectedCar;el.replaceChildren(...road.vehicles.map((v,i)=>{const o=document.createElement('option');o.value=String(i);o.textContent=`#${v.id} · ${v.bus?tr('公交','Bus'):tr('汽车','Car')}`;return o}));if(selected>=0)el.value=String(selected)}
function init(){const root=$('map')?.parentElement;if(!root)return;const panel=document.createElement('div');panel.id='camera5Panel';panel.className='camera5-panel';panel.hidden=true;root.appendChild(panel);
 panel.innerHTML=`<div class="camera5-head"><div><small>WUHAN · IMMERSIVE STUDIO</small><h2 data-zh="沉浸式相机" data-en="Immersive Camera">沉浸式相机</h2></div><button id="camera5Close" aria-label="Close">✕</button></div><div class="camera5-scroll">
 <label data-zh="相机模式" data-en="Camera Mode">相机模式</label><select id="camera5Mode"><option value="free" data-zh="自由相机" data-en="Free Camera">自由相机</option><option value="train" data-zh="列车外部跟随" data-en="Train Chase">列车外部跟随</option><option value="car" data-zh="汽车外部跟随" data-en="Car Chase">汽车外部跟随</option><option value="trainfront" data-zh="列车前向（近似）" data-en="Train Forward (Approx.)">列车前向（近似）</option><option value="carfront" data-zh="汽车前向（近似）" data-en="Car Forward (Approx.)">汽车前向（近似）</option></select>
 <div class="camera5-group"><div class="camera5-sub" data-zh="跟随目标" data-en="Follow Target">跟随目标</div><label data-zh="汽车 / 公交编号" data-en="Car / Bus Number">汽车 / 公交编号</label><select id="camera5CarSelect"><option value="0">#1</option></select><button id="camera5NextCar" data-zh="下一辆车" data-en="Next Vehicle">下一辆车</button></div><div class="camera5-group"><div class="camera5-sub" data-zh="相机参数" data-en="Camera Controls">相机参数</div><label><span data-zh="跟随远近" data-en="Follow Distance">跟随远近</span><input id="camera5Distance" type="range" min="-40" max="180" value="0"></label><label><span data-zh="绕行角度" data-en="Orbit Angle">绕行角度</span><input id="camera5Orbit" type="range" min="-100" max="100" value="0"></label><label class="check"><input type="checkbox" id="camera5HudToggle" checked><span data-zh="显示交通HUD" data-en="Show Traffic HUD">显示交通HUD</span></label></div>
 <div class="camera5-group"><div class="camera5-sub" data-zh="视角预设" data-en="Camera Presets">视角预设</div><div class="camera5-buttons"><button data-preset="aerial" data-zh="斜视" data-en="Aerial">斜视</button><button data-preset="top" data-zh="俯视" data-en="Top-down">俯视</button><button data-preset="low" data-zh="低角度" data-en="Low Angle">低角度</button><button data-preset="side" data-zh="侧视" data-en="Side">侧视</button></div></div>
 <div class="camera5-group"><div class="camera5-sub" data-zh="武汉城市巡游" data-en="Wuhan City Tour">武汉城市巡游</div><select id="camera5Place"></select><div class="camera5-buttons"><button id="camera5Go" data-zh="前往地标" data-en="Go to Place">前往地标</button><button id="camera5Tour" data-zh="▶ 自动巡游" data-en="▶ Auto Tour">▶ 自动巡游</button><button id="camera5StopTour" data-zh="停止巡游" data-en="Stop Tour">停止巡游</button></div></div>
 <div class="camera5-group"><div class="camera5-sub" data-zh="摄影与收藏" data-en="Photography & Saved Views">摄影与收藏</div><div class="camera5-buttons"><button id="camera5Save" data-zh="收藏视角" data-en="Save View">收藏视角</button><button id="camera5Shot" data-zh="保存PNG" data-en="Save PNG">保存PNG</button><button id="camera5Full" data-zh="全屏" data-en="Fullscreen">全屏</button><button id="camera5Cinema" data-zh="隐藏侧栏" data-en="Hide Sidebar">隐藏侧栏</button></div><div id="camera5Saved"></div></div>
 <div class="camera5-note" data-zh="低角度前向模式是基于MapLibre地图相机的近似视角，不是驾驶室内真实第一人称。录制视频与手动驾驶未包含在本版。" data-en="Low-angle forward modes approximate a forward view using the MapLibre map camera, not a true cockpit. Video recording and manual driving are not included.">低角度前向模式是基于MapLibre地图相机的近似视角，不是驾驶室内真实第一人称。录制视频与手动驾驶未包含在本版。</div><div id="camera5Status" role="status"></div></div>`;
 $('camera5Place').replaceChildren(...locations.map((loc,i)=>{const o=document.createElement('option');o.value=String(i);o.textContent=tr(loc.zh,loc.en);return o}));
 $('openCamera5').onclick=openPanel;$('camera5Close').onclick=closePanel;
 $('camera5Mode').onchange=e=>{setMode(e.target.value);if(mode!=='free')closePanel()};$('camera5CarSelect').onchange=e=>window.urbanRoad?.selectVehicle(Number(e.target.value));$('camera5NextCar').onclick=()=>{const r=window.urbanRoad;if(!r?.vehicles.length)return;r.selectVehicle((r.selectedCar+1)%r.vehicles.length);refreshCarSelect()};
 panel.querySelectorAll('[data-preset]').forEach(b=>b.onclick=()=>applyPreset(b.dataset.preset));
 $('camera5Go').onclick=()=>{const loc=locations[Number($('camera5Place').value)];goView(loc);closePanel()};
 $('camera5Tour').onclick=startTour;$('camera5StopTour').onclick=()=>{stopTour();setStatus(tr('巡游已停止','Tour stopped'))};
 $('camera5Save').onclick=saveView;$('camera5Shot').onclick=screenshot;$('camera5Full').onclick=fullscreen;
 $('camera5Cinema').onclick=()=>{cinema=!cinema;document.body.classList.toggle('cinema5',cinema);closePanel();setStatus(tr('按C恢复界面','Press C to restore interface'))};
 window.addEventListener('keydown',e=>{if(e.code==='KeyC'&&!e.repeat&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)){cinema=!cinema;document.body.classList.toggle('cinema5',cinema)}if(e.code==='Escape'){closePanel();stopTour();setMode('free')}});
 window.addEventListener('urban-language-change',()=>{const en=window.urbanI18n?.language==='en';panel.querySelectorAll('[data-zh]').forEach(el=>{el.textContent=el.dataset[en?'en':'zh']});$('camera5Place').querySelectorAll('option').forEach((o,i)=>o.textContent=tr(locations[i].zh,locations[i].en));$('openCamera5').textContent=tr('◉ 沉浸视角','◉ Camera Studio');syncDock();hud();renderSaved();refreshCarSelect()});
 window.addEventListener('urban-exit-follow',()=>{if(active)setMode('free')});
 document.addEventListener('pointerdown',e=>{if(tour&&e.target.closest('#map')){stopTour();setMode('free')}},{passive:true});
 requestAnimationFrame(update);
}
window.urbanCamera5={get active(){return active},get mode(){return mode},setMode,stopTour};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
