export const accentBackgroundAssets=[1,2,3].map(n=>'assets/accent/background-'+n+'.svg');
export const emphasisBackground=rank=>rank===1?3:rank===2?2:1;
export function createRotationPicker(random=Math.random){
 const cache=new Map();let last=null;
 return (key,reroll=false)=>{
  if(!reroll&&cache.has(key))return cache.get(key);
  let angle=random()*360;
  if(last!==null&&Math.min(Math.abs(angle-last),360-Math.abs(angle-last))<30)angle=(last+97+random()*166)%360;
  cache.set(key,angle);last=angle;return angle;
 };
}
export function backgroundTransform(viewBox,x,y,diameter,angle){
 const [bx,by,w,h]=viewBox.trim().split(/[ ,]+/).map(Number),scale=diameter/Math.max(w,h);
 return 'translate('+x+' '+y+') rotate('+angle+') scale('+scale+') translate('+(-bx-w/2)+' '+(-by-h/2)+')';
}

export function nextGlyphAngle(previous=0,random=Math.random){let angle=random()*20-10;if(Math.abs(angle-previous)<2)angle=previous>=0?-(4+random()*6):4+random()*6;return angle;}
export const accentBackgroundColor=node=>node.emphasisRank?'#d13419':node.pitch===node.defaultPitch?'#80bedb':'#f5c400';
export const accentBackgroundScale=type=>type===3?3.1:type===2?1.85:.65;
