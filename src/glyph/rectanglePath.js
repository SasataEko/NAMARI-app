// Outline sharp rectangles without changing the source SVG or its version hash.
export function rectanglePath(attributes) {
  const number=(key,fallback=0)=>Number(attributes[key]??fallback);
  const x=number('x'),y=number('y'),w=number('width'),h=number('height');
  if (![x,y,w,h].every(Number.isFinite)||w<=0||h<=0||number('rx')||number('ry')) throw Error('未対応の矩形です。');
  const transform=attributes.transform||'';
  const operations=[...transform.matchAll(/(translate|rotate)\s*\(([^)]*)\)/g)];
  if (transform.replace(/(translate|rotate)\s*\([^)]*\)/g,'').trim()) throw Error('未対応の矩形変換です。');
  const steps=operations.map(([,kind,args])=>{
    const values=(args.match(/[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/gi)||[]).map(Number);
    if(args.replace(/[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/gi,'').replace(/[\s,]/g,'')||!values.every(Number.isFinite)||!(kind==='translate'?[1,2]:[1,3]).includes(values.length)) throw Error('矩形変換が不正です。');
    return {kind,values};
  }).reverse();
  const points=[[x,y],[x+w,y],[x+w,y+h],[x,y+h]].map(([px,py])=>{
    for(const {kind,values:v} of steps){
      if(kind==='translate'){px+=v[0];py+=v[1]||0;}
      else {const a=v[0]*Math.PI/180,cx=v[1]||0,cy=v[2]||0,dx=px-cx,dy=py-cy;px=cx+dx*Math.cos(a)-dy*Math.sin(a);py=cy+dx*Math.sin(a)+dy*Math.cos(a);}
    }
    return px+','+py;
  });
  return 'M'+points.join(' L')+' Z';
}
