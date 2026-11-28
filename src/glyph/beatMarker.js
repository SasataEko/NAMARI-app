import {beatMarkerPaths} from './beatMarkerPaths.js';
// Center actual font ink rather than relying on a font-specific SVG baseline.
// Apply one translation to every sticker layer, leaving stroke widths unchanged.
export function centerBeatMarker(svg,x,y){
 const center=()=>{
  if(!svg.isConnected)return;
  const texts=[...svg.querySelectorAll('text')];if(!texts.length)return;
  texts.forEach(t=>t.removeAttribute('transform'));
  const box=texts.at(-1).getBBox();if(!box.width||!box.height)return;
  const dx=x-box.x-box.width/2,dy=y-box.y-box.height/2+(texts.at(-1).textContent==='ー'?svg.viewBox.baseVal.height*.05:0);
  texts.forEach(t=>t.setAttribute('transform','translate('+dx+' '+dy+')'));
 };
 requestAnimationFrame(center);
 document.fonts?.load('900 80px "Gothic A1"','ーッ').then(()=>requestAnimationFrame(center)).catch(()=>{});
 return svg;
}

// Every marker uses the same SVG path renderer and fixed pixel stroke as kana.
export function beatMarkerPath(text,{x,y,fontSize,drop=0}){
 const data=beatMarkerPaths[text];if(!data)throw Error('Unsupported beat marker');const [bx,by,w,h]=data.bounds,scale=fontSize/data.units;
 const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',data.d);path.setAttribute('transform','translate('+(x-(bx+w/2)*scale)+' '+(y+drop-(by+h/2)*scale)+') scale('+scale+')');return path;
}
