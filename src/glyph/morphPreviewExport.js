const encoder=new TextEncoder();
const crcTable=Uint32Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
export function crc32(bytes){let c=0xffffffff;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
// UTF-8, stored ZIP: PNGs are already compressed. No dependency or upload.
export function zipFiles(files){
 const chunks=[],directory=[];let offset=0;
 for(const file of files){const name=encoder.encode(file.name),bytes=file.bytes,crc=crc32(bytes),header=new Uint8Array(30+name.length),v=new DataView(header.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint32(14,crc,true);v.setUint32(18,bytes.length,true);v.setUint32(22,bytes.length,true);v.setUint16(26,name.length,true);header.set(name,30);chunks.push(header,bytes);
  const central=new Uint8Array(46+name.length),c=new DataView(central.buffer);c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x800,true);c.setUint32(16,crc,true);c.setUint32(20,bytes.length,true);c.setUint32(24,bytes.length,true);c.setUint16(28,name.length,true);c.setUint32(42,offset,true);central.set(name,46);directory.push(central);offset+=header.length+bytes.length;
 }
 const size=directory.reduce((s,b)=>s+b.length,0),end=new Uint8Array(22),v=new DataView(end.buffer);v.setUint32(0,0x06054b50,true);v.setUint16(8,files.length,true);v.setUint16(10,files.length,true);v.setUint32(12,size,true);v.setUint32(16,offset,true);return new Blob([...chunks,...directory,end],{type:'application/zip'});
}
export const morphExportSteps=[0,.25,.5,.75,1];
const exportBoxes=new WeakMap();
function exportBox(entry){if(exportBoxes.has(entry))return exportBoxes.get(entry);const original=entry.a.viewBox.split(/[ ,]+/).map(Number);let x=original[0],y=original[1],right=x+original[2],bottom=y+original[3];const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.style.cssText='position:fixed;left:-10000px;visibility:hidden;overflow:visible';document.body.append(svg);try{for(const t of morphExportSteps){svg.replaceChildren();for(const f of entry.m){const p=document.createElementNS(svg.namespaceURI,'path');p.setAttribute('d',f(t));svg.append(p);}const b=svg.getBBox();x=Math.min(x,b.x);y=Math.min(y,b.y);right=Math.max(right,b.x+b.width);bottom=Math.max(bottom,b.y+b.height);}}finally{svg.remove();}const result=[x-20,y-20,right-x+40,bottom-y+40];exportBoxes.set(entry,result);return result;}
export async function rasterizeMorphFrame(entry,t,size=512){
 const view=exportBox(entry),paths=entry.m.map(f=>f(t)),escape=s=>s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
 const layers=[['#282332',7.75],['#fff',5.17],['none',0]].map(([stroke,width])=>'<g>'+paths.map((d,i)=>'<path d="'+escape(d)+'" fill="#fb557c" stroke="'+stroke+'" stroke-width="'+(width*Math.max(view[2],view[3])/128)+'" stroke-linejoin="round" stroke-linecap="round"'+(entry.a.shapes[i]?.fillRule?' fill-rule="'+escape(entry.a.shapes[i].fillRule)+'"':'')+'/>').join('')+'</g>').join('');
 // Render at a fixed 128px design size, then scale the complete sticker uniformly.
 const source='<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="'+view.join(' ')+'">'+layers+'</svg>',url=URL.createObjectURL(new Blob([source],{type:'image/svg+xml'}));
 try{const image=new Image();image.src=url;await image.decode();const canvas=document.createElement('canvas');canvas.width=canvas.height=size;canvas.getContext('2d').drawImage(image,0,0,size,size);return canvas;}finally{URL.revokeObjectURL(url);}
}
const png=canvas=>new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('PNGを作れませんでした。')),'image/png'));
export async function exportMorphSequence(entries,{progress=()=>{},cancelled=()=>false}={}){
 const files=[],metadata={createdAt:new Date().toISOString(),steps:morphExportSteps,frameSize:512,designSize:128,outlinePx:7.75,whiteOutlinePx:5.17,entries:[]};let done=0;
 for(const entry of entries){if(cancelled())throw Error('キャンセルしました。');if(entry.error)continue;const folder=entry.g.kana+'/'+entry.p.id,strip=document.createElement('canvas');strip.width=512*5;strip.height=552;const context=strip.getContext('2d');
  for(const [i,t]of morphExportSteps.entries()){if(cancelled())throw Error('キャンセルしました。');const canvas=await rasterizeMorphFrame(entry,t);files.push({name:folder+'/'+String(t*100).padStart(3,'0')+'.png',bytes:new Uint8Array(await(await png(canvas)).arrayBuffer())});context.drawImage(canvas,i*512,0);context.fillStyle='#282332';context.font='24px sans-serif';context.textAlign='center';context.fillText(t*100+'%',i*512+256,538);await new Promise(requestAnimationFrame);}
  files.push({name:folder+'/sequence.png',bytes:new Uint8Array(await(await png(strip)).arrayBuffer())});metadata.entries.push({kana:entry.g.kana,pattern:entry.p.id,normal:entry.g.normal,target:entry.p.svg});progress(++done,entries.length);
 }
 files.push({name:'manifest.json',bytes:encoder.encode(JSON.stringify(metadata,null,2))});return zipFiles(files);
}
