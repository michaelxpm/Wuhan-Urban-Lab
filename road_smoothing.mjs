// Local-metre quadratic corner rounding. Never adds road-network links.
export const ANCHOR=[114.235,30.582];
const east=111319.4908*Math.cos(ANCHOR[1]*Math.PI/180),north=111319.4908;
export const local=p=>[(p[0]-ANCHOR[0])*east,(p[1]-ANCHOR[1])*north];
export const geo=p=>[p[0]/east+ANCHOR[0],p[1]/north+ANCHOR[1]];
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const interpolate=(a,b,t)=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
export function smoothRoute(route){
 const src=route.coords.map(local),result=[];let corners=0;
 const push=p=>{if(!result.length||dist(result[result.length-1],p)>.03)result.push(p)};
 if(!src.length)return {...route,coords:[],distances:[],length_m:0};
 push(src[0]);
 for(let i=1;i<src.length-1;i++){
  const a=src[i-1],b=src[i],c=src[i+1],len1=dist(a,b),len2=dist(b,c);
  if(len1<.4||len2<.4){push(b);continue}
  const u=[(b[0]-a[0])/len1,(b[1]-a[1])/len1],v=[(c[0]-b[0])/len2,(c[1]-b[1])/len2];
  const angle=Math.acos(Math.max(-1,Math.min(1,u[0]*v[0]+u[1]*v[1])));
  // Tight U-turns, ambiguous junctions, and small kinks are deliberately unchanged.
  if(angle<Math.PI/10||angle>Math.PI*.80){push(b);continue}
  const cut=Math.min(9,len1*.24,len2*.24);
  if(cut<.7){push(b);continue}
  const enter=[b[0]-u[0]*cut,b[1]-u[1]*cut],exit=[b[0]+v[0]*cut,b[1]+v[1]*cut];
  push(enter);
  const steps=Math.max(4,Math.ceil(angle*7));
  for(let j=1;j<=steps;j++){const t=j/steps,k=1-t;push([k*k*enter[0]+2*k*t*b[0]+t*t*exit[0],k*k*enter[1]+2*k*t*b[1]+t*t*exit[1]])}
  corners++;
 }
 if(src.length>1)push(src[src.length-1]);
 const ds=[0];for(let i=1;i<result.length;i++)ds.push(ds.at(-1)+dist(result[i-1],result[i]));
 return {...route,coords:result.map(geo),distances:ds,length_m:ds.at(-1),smooth_corners:corners};
}
export function pose(route,s){
 const ds=route.distances,pts=route.coords,d=Math.max(0,Math.min(s,route.length_m));
 if(!ds?.length||!pts?.length)return {xy:[0,0],heading:0,geo:[0,0]};
 let lo=0,hi=ds.length-1;
 while(lo+1<hi){let mid=(lo+hi)>>1;if(ds[mid]<d)lo=mid;else hi=mid}
 const f=Math.max(0,Math.min(1,(d-ds[lo])/Math.max(1e-8,ds[hi]-ds[lo])));
 const a=local(pts[lo]),b=local(pts[hi]),p=interpolate(a,b,f);
 return {xy:p,heading:Math.atan2(b[1]-a[1],b[0]-a[0]),geo:geo(p)};
}
export function curvature(route,s,span=8){const a=pose(route,Math.max(0,s-span)).heading,b=pose(route,Math.min(route.length_m,s+span)).heading;return Math.abs(Math.atan2(Math.sin(b-a),Math.cos(b-a)))}
