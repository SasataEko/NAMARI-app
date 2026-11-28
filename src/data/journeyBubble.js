// Display-only placement: choose a nearby gap while protecting ink and live controls.
export function placeJourneyBubble({width,height,target,avoid=[],noteWidth=260,noteHeight=90,placement=null}){
 const w=Math.min(noteWidth,width-24),h=Math.min(noteHeight,height-24),cx=target.left+target.width/2,cy=target.top+target.height/2;
 if(placement==='above'){
  const left=Math.max(12,Math.min(width-w-12,cx-w/2));
  const content=avoid.filter(b=>b.right>left&&b.left<left+w);
  const safeBottom=Math.min(target.top+10,...content.map(b=>b.top-8));
  return {left,top:Math.max(12,Math.min(height-h-12,safeBottom-h)),width:w};
 }
 const candidates=[[cx-w/2,target.top-h-14],[cx-w/2,target.bottom+14],[target.left-w-14,cy-h/2],[target.right+14,cy-h/2]];
 for(const b of avoid)candidates.push([cx-w/2,b.top-h-6],[cx-w/2,b.bottom+6]);
 candidates.push([12,12],[width-w-12,12],[12,height-h-12],[width-w-12,height-h-12]);
 let best=null;
 for(const [px,py]of candidates){const x=Math.max(12,Math.min(width-w-12,px)),y=Math.max(12,Math.min(height-h-12,py));
  const overlap=avoid.reduce((sum,b)=>sum+Math.max(0,Math.min(x+w,b.right)-Math.max(x,b.left))*Math.max(0,Math.min(y+h,b.bottom)-Math.max(y,b.top)),0);
  const distance=Math.hypot(x+w/2-cx,y+h/2-cy),score=overlap*100+distance;
  if(!best||score<best.score)best={left:x,top:y,width:w,score};
 }return best;
}
