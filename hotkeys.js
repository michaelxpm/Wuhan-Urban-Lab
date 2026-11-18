'use strict';
// Free camera navigation: W/S forward/back, A/D strafe, Q/E bearing,
// R/F pitch, Z/X zoom, T train follow, G vehicle follow, Esc exit follow.
(()=>{
 const held=new Set();const keys=new Set(['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','KeyR','KeyF','KeyZ','KeyX','KeyT','KeyG','Space','Escape']);let last=0;
 const editing=()=>{const el=document.activeElement;if(!el)return false;if(el.isContentEditable||el.tagName==='TEXTAREA'||el.tagName==='SELECT')return true;return el.tagName==='INPUT'&&!['range','checkbox','radio','button','submit','color','file'].includes((el.type||'text').toLowerCase())};
 const exitFollow=()=>{if(window.urbanCamera5?.active||(window.urbanRoad&&window.urbanRoad.followMode!=='off')||window.urbanRail?.follow)window.dispatchEvent(new Event('urban-exit-follow')); const t=document.getElementById('followTrain');if(t&&window.urbanRail?.follow)window.urbanRail.setFollow(false)};
 window.addEventListener('keydown',e=>{
  if(!keys.has(e.code)||editing()||e.ctrlKey||e.altKey||e.metaKey||window.urbanSettings?.values.hotkeys===false)return;
  e.preventDefault();
  if(!e.repeat){
   if(e.code==='KeyT'){window.urbanRoad?.setFollowMode('off');document.getElementById('followTrain')?.click();return}
   if(e.code==='KeyG'){const road=window.urbanRoad;if(road)road.setFollowMode(road.followMode==='off'?'chase':'off');return}
   if(e.code==='Escape'){exitFollow();held.clear();return}
   if(e.code==='Space'){document.getElementById('trainPlay')?.click();return}
  }
  held.add(e.code);
 });
 document.getElementById('map')?.addEventListener('pointerdown',()=>{const el=document.activeElement;if(el&&['INPUT','TEXTAREA','SELECT'].includes(el.tagName))el.blur()});window.addEventListener('keyup',e=>held.delete(e.code));window.addEventListener('blur',()=>held.clear());
 function loop(now){const map=window.urbanMap,dt=Math.min(.05,Math.max(0,(now-last)/1000||0));last=now;
  if(map&&held.size&&!editing()&&window.urbanSettings?.values.hotkeys!==false){
   const lateral=Number(held.has('KeyD'))-Number(held.has('KeyA'));
   const forward=Number(held.has('KeyW'))-Number(held.has('KeyS'));
   const bearing=Number(held.has('KeyQ'))-Number(held.has('KeyE'));
   const pitch=Number(held.has('KeyF'))-Number(held.has('KeyR'));
   const zoom=Number(held.has('KeyZ'))-Number(held.has('KeyX'));
   if(lateral||forward){exitFollow();const angle=map.getBearing()*Math.PI/180;
    // North at bearing 0. W moves toward screen top, D toward screen right.
    const east=(lateral*Math.cos(angle)+forward*Math.sin(angle));
    const north=(forward*Math.cos(angle)-lateral*Math.sin(angle));
    const speed=180*(window.urbanSettings?.values.move||1)*Math.pow(2,15-map.getZoom());const ll=map.getCenter();
    const metres=speed*dt;map.setCenter([ll.lng+east*metres/(111319*Math.cos(ll.lat*Math.PI/180)),ll.lat+north*metres/111319]);
   }
   if(bearing){exitFollow();map.setBearing(map.getBearing()+bearing*58*dt*(window.urbanSettings?.values.rotate||1))}
   if(pitch){exitFollow();map.setPitch(Math.min(70,Math.max(0,map.getPitch()+pitch*42*dt*(window.urbanSettings?.values.pitch||1))))}
   if(zoom){exitFollow();map.setZoom(Math.min(19,Math.max(8,map.getZoom()+zoom*1.4*dt*(window.urbanSettings?.values.zoom||1))))}
  }
  requestAnimationFrame(loop);
 }
 requestAnimationFrame(loop);
 window.addEventListener('urban-settings-change',e=>{if(e.detail.key==='hotkeys'&&!e.detail.value)held.clear()});
})();
