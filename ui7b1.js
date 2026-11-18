'use strict';
(()=>{
 const $=id=>document.getElementById(id);
 const tr=(zh,en)=>window.urbanI18n?.language==='en'?en:zh;
 function init(){
  const aside=document.querySelector('aside');const hint=$('tabHint');
  if(aside){const folds=Array.from(aside.querySelectorAll('.sidebar-fold'));let saved={};try{saved=JSON.parse(localStorage.getItem('wuhan7b1-folds')||'{}')}catch{}
   for(const d of folds){if(Object.hasOwn(saved,d.dataset.fold))d.open=!!saved[d.dataset.fold];d.addEventListener('toggle',()=>{saved[d.dataset.fold]=d.open;try{localStorage.setItem('wuhan7b1-folds',JSON.stringify(saved))}catch{}})}
  }
  // Native pointer tooltip; does not capture pointer or keyboard focus.
  let current=null;
  const locate=(x,y)=>{if(!hint)return;const width=Math.min(340,window.innerWidth-24);hint.style.maxWidth=width+'px';hint.style.left=Math.max(12,Math.min(window.innerWidth-width-12,x+14))+'px';hint.style.top=Math.max(12,Math.min(window.innerHeight-95,y+18))+'px'};
  const show=e=>{const t=e.target.closest?.('[data-tip-zh]');if(!t)return;current=t;hint.textContent=tr(t.dataset.tipZh,t.dataset.tipEn);hint.hidden=false;locate(e.clientX,e.clientY)};
  document.addEventListener('pointerover',show);
  document.addEventListener('pointermove',e=>{if(current&&current.contains(e.target))locate(e.clientX,e.clientY)});
  document.addEventListener('pointerout',e=>{if(current&&(!e.relatedTarget||!current.contains(e.relatedTarget))){hint.hidden=true;current=null}});
  document.addEventListener('focusin',e=>{const t=e.target.closest?.('[data-tip-zh]');if(t){current=t;hint.textContent=tr(t.dataset.tipZh,t.dataset.tipEn);hint.hidden=false;const b=t.getBoundingClientRect();locate(b.left,b.bottom)}});
  document.addEventListener('focusout',()=>{hint.hidden=true;current=null});
  window.addEventListener('urban-language-change',()=>{if(current)hint.textContent=tr(current.dataset.tipZh,current.dataset.tipEn)});
  // Controls retain focus after clicking range sliders. Only text inputs disable hotkeys.
  const status=$('hotkeyStatus');const editing=()=>{const a=document.activeElement;return a&&(a.isContentEditable||a.tagName==='TEXTAREA'||a.tagName==='SELECT'||a.tagName==='INPUT'&&!['range','checkbox','radio','button','color'].includes(a.type))};
  function refresh(){if(!status)return;const enabled=window.urbanSettings?.values.hotkeys!==false;status.textContent=tr(enabled?'⌨ 快捷键已开启 · WASD平移 · Q/E旋转 · R/F俯仰 · Z/X缩放':'⌨ 快捷键已关闭，请在设置中开启',enabled?'⌨ Hotkeys enabled · WASD pan · Q/E rotate · R/F pitch · Z/X zoom':'⌨ Hotkeys disabled; enable in Settings');if(enabled&&editing())status.textContent+=' · '+tr('输入控件聚焦中','Input focused')}
  window.addEventListener('urban-settings-change',e=>{if(e.detail.key==='hotkeys')refresh()});window.addEventListener('urban-language-change',refresh);document.addEventListener('focusin',refresh);document.addEventListener('focusout',refresh);refresh();
  const map=()=>window.urbanMap;
  fetch('data/bridge_audit7b1.json').then(r=>r.json()).then(a=>{window.urbanBridgeAudit7b1.report=a;const el=$('v7bBridgeReport');if(el)el.textContent=tr(`${a.bridge_edges}条高架有向边已识别，背景路线明确排除了高架。`,`${a.bridge_edges} bridge arcs identified; background routes excluded bridges.`)}).catch(console.warn);
  fetch('data/bridge_audit7b1.geojson').then(r=>r.json()).then(geo=>{const attach=()=>{const m=map();if(!m||!m.isStyleLoaded()){setTimeout(attach,350);return}if(!m.getSource('bridge-audit7b1'))m.addSource('bridge-audit7b1',{type:'geojson',data:geo});if(!m.getLayer('bridge-audit7b1'))m.addLayer({id:'bridge-audit7b1',type:'line',source:'bridge-audit7b1',paint:{'line-color':'#ffdf68','line-width':3.2,'line-opacity':.85,'line-dasharray':[2,1.4]},layout:{visibility:window.urbanBridgeAudit7b1.enabled?'visible':'none'}})};attach()}).catch(console.warn);
 }
 window.urbanBridgeAudit7b1={enabled:false,report:null,setEnabled(v){this.enabled=!!v;const m=window.urbanMap;if(m?.getLayer('bridge-audit7b1'))m.setLayoutProperty('bridge-audit7b1','visibility',v?'visible':'none')}};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
