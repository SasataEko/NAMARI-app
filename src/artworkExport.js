import {mountModeThree} from './modeThree.js';
import {assetUrl} from './data/projectLibrary.js';
import {toVisualPreview} from './data/modeTwoVisual.js';
import {artworkNodes} from './data/modeThreeModel.js';
import {wordRows} from './wordLayout.js';
import './artworkExport.css';
const ns='http://www.w3.org/2000/svg';
const svg=(name,attrs={})=>{const e=document.createElementNS(ns,name);for(const[k,v]of Object.entries(attrs))e.setAttribute(k,String(v));return e;};
const dataUrl=blob=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(blob);});
function clonePaint(source){
 const clone=source.cloneNode(true),original=[source,...source.querySelectorAll('*')],copies=[clone,...clone.querySelectorAll('*')];
 original.forEach((node,i)=>{const style=getComputedStyle(node);for(const key of ['fill','stroke','stroke-width','stroke-linejoin','stroke-linecap','fill-rule','clip-rule','opacity','vector-effect','font-family','font-size','font-weight','text-anchor','dominant-baseline','paint-order']){
  const value=style.getPropertyValue(key).replace(/url\(["']?[^)"']*#([^)'" ]+)["']?\)/g,'url(#$1)');if(value)copies[i].style.setProperty(key,value);
 }});clone.style.transform='none';clone.style.overflow='visible';return clone;
}
// Export vector layers, not a page screenshot. No UI, paper background or selection badges.
export async function rasterizeArtwork(host){
 await document.fonts.ready;
 const canvas=host.querySelector('.m3-canvas');if(!canvas||!canvas.querySelector('.m3-kana'))throw Error('画像にする文字がないよ。');
 const bounds=canvas.getBoundingClientRect(),drawing=svg('svg',{xmlns:ns,width:bounds.width,height:bounds.height});drawing.style.overflow='visible';
 const tones=canvas.querySelector('.m3-tones');if(tones){const layer=clonePaint(tones);layer.setAttribute('x','0');layer.setAttribute('y','0');layer.setAttribute('width',bounds.width);layer.setAttribute('height',bounds.height);drawing.append(layer);}
 for(const button of canvas.querySelectorAll('.m3-kana')){
  const source=button.querySelector('svg');if(!source)continue;const b=button.getBoundingClientRect(),glyph=clonePaint(source),x=b.left-bounds.left,y=b.top-bounds.top;
  glyph.setAttribute('x',x);glyph.setAttribute('y',y);glyph.setAttribute('width',b.width);glyph.setAttribute('height',b.height);
  const group=svg('g',{transform:'rotate('+(Number(source.dataset.rotation)||0)+' '+(x+b.width/2)+' '+(y+b.height/2)+')'});group.append(glyph);drawing.append(group);
 }
 if(drawing.querySelector('text')){
  const response=await fetch(assetUrl('assets/fonts/GothicA1-Black.ttf'));if(!response.ok)throw Error('画像用のフォントを読み込めなかったよ。');
  const font=await dataUrl(await response.blob()),style=svg('style');style.textContent='@font-face{font-family:"Gothic A1";src:url("'+font+'") format("truetype");font-weight:900}';drawing.prepend(style);
 }
 drawing.style.cssText='position:fixed;left:-100000px;top:0;overflow:visible;visibility:hidden';document.body.append(drawing);
 let box;try{box=drawing.getBBox();}finally{drawing.remove();}const padding=24,width=Math.ceil(box.width+padding*2),height=Math.ceil(box.height+padding*2);
 if(!width||!height||width>8192||height>8192)throw Error('画像が大きすぎるよ。文字数を減らしてみてね。');
 drawing.setAttribute('viewBox',[box.x-padding,box.y-padding,width,height].join(' '));drawing.setAttribute('width',width);drawing.setAttribute('height',height);drawing.removeAttribute('style');
 const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(drawing)],{type:'image/svg+xml;charset=utf-8'}));
 try{
  const image=new Image();image.src=url;await image.decode();const output=document.createElement('canvas');output.width=width*2;output.height=height*2;const context=output.getContext('2d');if(!context)throw Error('画像を作れなかったよ。');context.drawImage(image,0,0,output.width,output.height);
  const blob=await new Promise(resolve=>output.toBlob(resolve,'image/png'));if(!blob)throw Error('PNGを作れなかったよ。');return blob;
 }finally{URL.revokeObjectURL(url);}
}
export function openArtworkExport({level,artwork,referenceElement,title='字形の画像',fileSuffix=''}){
 const dialog=document.createElement('dialog');dialog.className='artwork-export';dialog.innerHTML='<header><h2>字形の画像</h2><button class="outline-button" data-close aria-label="画像のプレビューを閉じる">×</button></header><label class="artwork-export-option"><input type="checkbox" data-nowrap> 改行せずに1行にする</label><div class="artwork-export-image"><img alt="ダウンロードする字形のプレビュー"></div><p role="status">画像をつくっているよ…</p><button class="judge-button" data-download disabled>PNGをダウンロード</button>';
 dialog.querySelector('h2').textContent=title;document.body.append(dialog);dialog.showModal();let disposed=false,token=0,imageUrl=null,blob=null,renderHost=null;
 const image=dialog.querySelector('img'),status=dialog.querySelector('[role=status]'),download=dialog.querySelector('[data-download]'),nowrap=dialog.querySelector('[data-nowrap]');
 const referenceCanvas=referenceElement?.querySelector('.m3-canvas'),referenceBox=referenceCanvas?.getBoundingClientRect(),displayBase=Number(referenceElement?.querySelector('.m3-kana')?.dataset.baseSize)||90;
 const snapshot=structuredClone(artwork),answer={...snapshot,pattern:snapshot.pattern||snapshot.patterns};
 function dispose(){if(disposed)return;disposed=true;token++;renderHost?.modeThreeSession?.dispose();renderHost?.remove();if(imageUrl)URL.revokeObjectURL(imageUrl);dialog.close();dialog.remove();}
 dialog.querySelector('[data-close]').onclick=dispose;dialog.addEventListener('cancel',e=>{e.preventDefault();dispose();});
 async function refresh(){
  const ticket=++token;download.disabled=true;blob=null;status.hidden=false;status.textContent='画像をつくっているよ…';image.hidden=true;
  renderHost?.modeThreeSession?.dispose();renderHost?.remove();
  const nodes=artworkNodes({...snapshot,morae:level.characters.map(c=>c.text)}),rows=nowrap.checked?1:wordRows(nodes.map(n=>n.text)).length;
  const host=document.createElement('div');host.className='artwork-export-render';host.style.cssText='position:fixed;left:-100000px;top:0;visibility:hidden;pointer-events:none';host.style.width=(nowrap.checked?Math.min(4096,Math.max(referenceBox?.width||600,nodes.length*displayBase*2+64)):(referenceBox?.width||600))+'px';host.style.height=Math.max(80,referenceBox?.height||rows*200)+'px';document.body.append(host);renderHost=host;
  try{
   if(!nowrap.checked&&referenceElement?.querySelector('.m3-canvas')){
    const result=await rasterizeArtwork(referenceElement);if(disposed||ticket!==token)return;
    if(imageUrl)URL.revokeObjectURL(imageUrl);blob=result;imageUrl=URL.createObjectURL(result);image.src=imageUrl;await image.decode();if(disposed||ticket!==token)return;image.style.width=(image.naturalWidth/2)+'px';image.hidden=false;download.disabled=false;status.hidden=true;return;
   }
   if(disposed||ticket!==token)return;
   await mountModeThree(host,{level,preview:toVisualPreview(answer,level),singleRow:nowrap.checked,displayBase});
   await new Promise(requestAnimationFrame);if(disposed||ticket!==token)return;
   const result=await rasterizeArtwork(host);if(disposed||ticket!==token)return;
   if(imageUrl)URL.revokeObjectURL(imageUrl);blob=result;imageUrl=URL.createObjectURL(result);image.src=imageUrl;await image.decode();if(disposed||ticket!==token)return;image.style.width=(image.naturalWidth/2)+'px';image.hidden=false;download.disabled=false;status.hidden=true;
  }catch(error){if(!disposed&&ticket===token){status.hidden=false;status.textContent=error.message||'画像を作れなかったよ。もう一度試してね。';}}
  finally{host.modeThreeSession?.dispose();host.remove();if(renderHost===host)renderHost=null;}
 }
 nowrap.onchange=refresh;download.onclick=()=>{if(!blob)return;const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='NAMARI-'+level.word+(fileSuffix?'-'+fileSuffix:'')+(nowrap.checked?'-1行':'')+'.png';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);};refresh();return dispose;
}
