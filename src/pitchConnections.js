const ns='http://www.w3.org/2000/svg';
export function installPitchConnections(app){
 let frame=0;const observed=new Set();
 const schedule=()=>{if(!frame)frame=requestAnimationFrame(draw);};
 const resize=new ResizeObserver(schedule);
 function draw(){
  frame=0;for(const row of observed)if(!row.isConnected){resize.unobserve(row);observed.delete(row);}
  const rows=app.querySelectorAll('.tone-control-row,.m3-control-row,.diy-play-morae .word-row,.diy-pitch-editor:has([data-builder-pitch])');
  for(const row of rows){
   const columns=[...row.children].filter(c=>c.querySelector('.accent-dot'));if(!columns.length)continue;
   if(!observed.has(row)){observed.add(row);resize.observe(row);}
   const bounds=row.getBoundingClientRect();if(!bounds.width)continue;
   const points=columns.map(c=>['high','low'].map(value=>{const b=c.querySelector('[data-pitch="'+value+'"],[data-play-pitch="'+value+'"],[data-builder-pitch="'+value+'"]'),r=b.getBoundingClientRect();return {x:r.left-bounds.left+r.width/2,y:r.top-bounds.top+r.height/2,selected:b.getAttribute('aria-pressed')==='true'||b.classList.contains('selected')};}));
   const signature=JSON.stringify([bounds.width,bounds.height,points]);let svg=row.querySelector(':scope>.pitch-choice-links');if(svg?.dataset.signature===signature)continue;
   if(!svg){svg=document.createElementNS(ns,'svg');svg.classList.add('pitch-choice-links');svg.setAttribute('aria-hidden','true');row.prepend(svg);}
   svg.dataset.signature=signature;svg.setAttribute('viewBox','0 0 '+bounds.width+' '+bounds.height);svg.replaceChildren();
   for(const side of [0,1]){const line=document.createElementNS(ns,'line');line.setAttribute('x1',points[0][side].x);line.setAttribute('y1',points[0][side].y);line.setAttribute('x2',points.at(-1)[side].x);line.setAttribute('y2',points.at(-1)[side].y);line.setAttribute('class','pitch-choice-guide');svg.append(line);}
   let d='',connected=false;for(const pair of points){const p=pair.find(p=>p.selected);if(!p){connected=false;continue;}d+=(connected?' L':' M')+p.x+' '+p.y;connected=true;}
   const path=document.createElementNS(ns,'path');path.setAttribute('d',d);path.setAttribute('class','pitch-choice-connection');svg.append(path);
  }
 }
 const observer=new MutationObserver(schedule);observer.observe(app,{childList:true,subtree:true,attributes:true,attributeFilter:['aria-pressed','class']});window.addEventListener('resize',schedule);schedule();
}
