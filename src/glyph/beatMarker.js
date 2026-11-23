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
