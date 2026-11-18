// Deterministic, schematic single-path car following and signal approach.
// No claim of actual Wuhan traffic signals or lane-level conflict resolution.
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function signalState(time,group,cycle=70,green=42){return ((time+group*13)%cycle)<green?'green':'red'}
export function desiredSpeed({speed,cruise,frontGap=Infinity,frontSpeed=0,signalDistance=Infinity,red=false,headway=1.4,minimumGap=5}){
 let target=cruise;
 if(Number.isFinite(frontGap)){
  // IDM-inspired safety envelope: conservative target speed for short gaps.
  const safe=Math.max(0,frontGap-minimumGap);
  const approach=Math.max(0,speed-frontSpeed);
  const desired=minimumGap+Math.max(0,speed*headway+speed*approach/(2*Math.sqrt(1.3*2.1)));
  if(frontGap<desired+18)target=Math.min(target,Math.max(0,frontSpeed+(safe-desired+minimumGap)*.45));
 }
 if(red&&Number.isFinite(signalDistance))target=Math.min(target,Math.sqrt(Math.max(0,2*2.1*Math.max(0,signalDistance-2))));
 return clamp(target,0,cruise);
}
export function nextCars(vehicles){
 const groups=new Map(),next=new Map();
 for(const v of vehicles){if(v.finished||v.respawn>0)continue;const id=String(v.route.id);if(!groups.has(id))groups.set(id,[]);groups.get(id).push(v)}
 for(const group of groups.values()){group.sort((a,b)=>a.s-b.s);for(let i=0;i<group.length-1;i++)next.set(group[i],group[i+1])}
 return next;
}
export function summarize(vehicles){const active=vehicles.filter(v=>!v.finished&&v.respawn<=0);const moving=active.filter(v=>v.speed>.5);const stopped=active.length-moving.length;const mean=active.length?active.reduce((s,v)=>s+v.speed*3.6,0)/active.length:0;return {active:active.length,moving:moving.length,stopped,meanKmh:mean,buses:active.filter(v=>v.bus).length}}
