import {syncSticker} from './sticker.js';
import {interpolateAll, splitPathString} from 'flubber';

const contourCache=new Map(),morphCache=new Map();
const area=p=>p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-b[0]*a[1];},0)/2;
const inside=(p,ring)=>{let yes=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;};
function contours(d){
 if(contourCache.has(d))return contourCache.get(d);
 const rings=splitPathString(d).map((path,index)=>{const points=interpolateAll([path],[path],{string:false,maxSegmentLength:3})[0](.5),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),box=[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)];return {index,path,points,area:Math.abs(area(points)),box,center:[(box[0]+box[2])/2,(box[1]+box[3])/2],parent:null,depth:0};});
 for(const ring of rings){const parents=rings.filter(other=>other.area>ring.area&&ring.points.filter((_,i)=>i%Math.max(1,Math.floor(ring.points.length/20))===0).every(p=>inside(p,other.points)));ring.parent=parents.sort((a,b)=>a.area-b.area)[0]||null;}
 for(const ring of rings){let parent=ring.parent;while(parent){ring.depth++;parent=parent.parent;}}
 if(contourCache.size>400)contourCache.clear();contourCache.set(d,rings);return rings;
}
// Minimum-cost one-to-one assignment, with explicit births/deaths for extra contours.
function assign(cost){
 const n=cost.length,u=Array(n+1).fill(0),v=[...u],p=[...u],way=[...u];
 for(let i=1;i<=n;i++){p[0]=i;let j0=0;const min=Array(n+1).fill(Infinity),used=Array(n+1).fill(false);do{used[j0]=true;const i0=p[j0];let delta=Infinity,j1=0;for(let j=1;j<=n;j++)if(!used[j]){const cur=cost[i0-1][j-1]-u[i0]-v[j];if(cur<min[j]){min[j]=cur;way[j]=j0;}if(min[j]<delta){delta=min[j];j1=j;}}for(let j=0;j<=n;j++)if(used[j]){u[p[j]]+=delta;v[j]-=delta;}else min[j]-=delta;j0=j1;}while(p[j0]);do{const j1=way[j0];p[j0]=p[j1];j0=j1;}while(j0);}
 const result=Array(n);for(let j=1;j<=n;j++)result[p[j]-1]=j-1;return result;
}
function correspondence(a,b,forced){
 if(forced){if(a.length!==forced.length||b.length!==forced.length||new Set(forced).size!==b.length||forced.some(i=>!Number.isInteger(i)||i<0||i>=b.length))throw Error('筆画対応の輪郭数・順序を確認してください。');return forced.map((j,i)=>[a[i],b[j]]);}
 const all=[...a,...b],extent=Math.max(1,...all.map(r=>r.box[2]))-Math.min(0,...all.map(r=>r.box[0])),height=Math.max(1,...all.map(r=>r.box[3]))-Math.min(0,...all.map(r=>r.box[1])),scale=Math.max(1,extent*extent+height*height),total=Math.max(1,...all.map(r=>r.area));
 const pairs=[];
 for(const parity of [0,1]){const left=a.filter(r=>r.depth%2===parity),right=b.filter(r=>r.depth%2===parity),n=left.length+right.length;if(!n)continue;
  const death=r=>.3+2*Math.sqrt(r.area/total);
  const cost=Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>{const x=left[i],y=right[j];if(!x&&!y)return 0;if(!x)return death(y);if(!y)return death(x);return 8*((x.center[0]-y.center[0])**2+(x.center[1]-y.center[1])**2)/scale+.24*Math.log(Math.max(.001,x.area)/Math.max(.001,y.area))**2+.3*((x.box[2]-x.box[0]-(y.box[2]-y.box[0]))**2+(x.box[3]-x.box[1]-(y.box[3]-y.box[1]))**2)/scale;}));
  const match=assign(cost),used=new Set();left.forEach((x,i)=>{const j=match[i];pairs.push([x,right[j]||null]);if(j<right.length)used.add(j);});right.forEach((y,j)=>{if(!used.has(j))pairs.push([null,y]);});
 }
 return pairs;
}
function nearest(point,rings){let best=null,distance=Infinity;for(const ring of rings.filter(r=>r.depth%2===0))for(const p of ring.points){const d=(p[0]-point[0])**2+(p[1]-point[1])**2;if(d<distance){distance=d;best=p;}}return best||point;}
function componentMorph(source,target,forced){
 if(source===target)return {at:()=>source,pairs:[]};
 const a=contours(source),b=contours(target),pairs=correspondence(a,b,forced),functions=pairs.map(([x,y])=>{
  const ring=x||y,sign=ring.depth%2?-1:1;
  // Disconnected extra strokes join the nearest ink boundary; holes close in place.
  const anchor=x&&y?null:ring.depth%2?ring.center:nearest(ring.center,x?b:a);
  const tiny=anchor&&ring.points.map(p=>[anchor[0]+(p[0]-ring.center[0])*.00001,anchor[1]+(p[1]-ring.center[1])*.00001]);
  const f=interpolateAll([x?x.points:tiny],[y?y.points:tiny],{string:false,maxSegmentLength:3})[0];
  return t=>{let points=f(t);if(Math.sign(area(points))!==sign)points=[...points].reverse();return 'M'+points.map(p=>p[0]+','+p[1]).join('L')+'Z';};
 });
 return {at:t=>t<=0?source:t>=1?target:functions.map(fn=>fn(t)).join(' '),pairs:pairs.map(([x,y])=>({from:x?.index??null,to:y?.index??null,hole:(x||y).depth%2===1}))};
}
/** Match every disconnected contour, retaining holes and exact authored endpoints. */
export function createMorph(from,to,{strokeMap}={}){
 if(from.length!==to.length)throw Error(`pathの数が異なります（通常字形 ${from.length}、変形後 ${to.length}）。同じ数・順序の輪郭を用意してください。`);
 const key=JSON.stringify([from,to,strokeMap]);if(morphCache.has(key))return morphCache.get(key);
 try{
  if(strokeMap&&strokeMap.length!==from.length)throw Error('筆画対応のpath数が一致しません。');
  const components=from.map((d,i)=>componentMorph(d,to[i],strokeMap?.[i])),interpolation=components.map(c=>c.at);
  interpolation.from=[...from];interpolation.to=[...to];interpolation.correspondence=components.map(c=>c.pairs);
  if(interpolation.some(f=>!f(.5).includes('M')))throw Error('変形途中のSVGパスを生成できませんでした。');
  if(morphCache.size>200)morphCache.clear();morphCache.set(key,interpolation);return interpolation;
 }catch(cause){throw Error(`パスを補間できません：${cause.message||cause}。閉じた輪郭・パスデータ・穴の構造を確認してください。`);}
}
export function setMorphIntensity(paths,interpolation,intensity){
 const amount=Math.max(0,Math.min(1,Number(intensity)||0)),shapes=amount===0?interpolation.from:amount===1?interpolation.to:interpolation.map(fn=>fn(amount));
 shapes.forEach((shape,index)=>paths[index]?.setAttribute('d',shape));syncSticker(paths[0]?.closest?.('svg'));
}
export function animateMorph(paths,from,to,duration=1000,onDone=()=>{},options={}){
 const interpolation=createMorph(from,to,options),start=performance.now();let frame;const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
 const tick=now=>{const progress=Math.min(1,(now-start)/duration);setMorphIntensity(paths,interpolation,ease(progress));if(progress<1)frame=requestAnimationFrame(tick);else onDone();};frame=requestAnimationFrame(tick);return ()=>cancelAnimationFrame(frame);
}
