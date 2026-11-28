// Point from the bubble side toward a whole region, never a first kana by accident.
export function placeJourneyArrow({target,note,width,height,size=36}){
 const cx=note.left+note.width/2,cy=note.top+note.height/2;
 const options=[
  {x:Math.max(target.left,Math.min(target.right-size,cx-size/2)),y:target.top-size-6,angle:90,dx:0,dy:6},
  {x:Math.max(target.left,Math.min(target.right-size,cx-size/2)),y:target.bottom+6,angle:-90,dx:0,dy:-6},
  {x:target.left-size-6,y:Math.max(target.top,Math.min(target.bottom-size,cy-size/2)),angle:0,dx:6,dy:0},
  {x:target.right+6,y:Math.max(target.top,Math.min(target.bottom-size,cy-size/2)),angle:180,dx:-6,dy:0}
 ];
 for(const p of [...options]){
  if(p.dx===0)for(const x of [note.left-size-6,note.right+6])options.push({...p,x:Math.max(target.left,Math.min(target.right-size,x))});
  else for(const y of [note.top-size-6,note.bottom+6])options.push({...p,y:Math.max(target.top,Math.min(target.bottom-size,y))});
 }
 const preferred=cy<target.top?90:cy>target.bottom?-90:cx<target.left?0:cx>target.right?180:null;
 const score=p=>{const overlap=Math.max(0,Math.min(p.x+size,note.right)-Math.max(p.x,note.left))*Math.max(0,Math.min(p.y+size,note.bottom)-Math.max(p.y,note.top));return overlap*100+(preferred!==null&&p.angle!==preferred?Math.max(width,height):0)+Math.hypot(p.x+size/2-cx,p.y+size/2-cy);};
 const available=options.filter(p=>p.x>=4&&p.y>=4&&p.x+size<=width-4&&p.y+size<=height-4);
 return (available.length?available:options).sort((a,b)=>score(a)-score(b))[0];
}
