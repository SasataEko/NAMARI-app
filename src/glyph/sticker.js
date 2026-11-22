import {loadGlyph} from './loadGlyph.js';
import {libraryGlyph} from '../data/patternLibrary.js';
import {assetUrl} from '../data/projectLibrary.js';
const ns='http://www.w3.org/2000/svg';
export const stickerPalette=['#fb557c','#ffb52e','#507aff','#ab65e8','#00a99a','#f16a35'];
// Keep decoration copies separate from the ordered source contours used by Morph.
export function decorateSticker(svg,index=0,{aggregate=false}={}){
 svg.querySelectorAll('[data-sticker-layer]').forEach(layer=>layer.remove());
 const sources=[...svg.children].filter(e=>['path','text'].includes(e.localName));
 if(!sources.length)return svg;
 svg.classList.add('sticker-glyph');svg.dataset.stickerIndex=String(index);svg.dataset.stickerAggregate=String(aggregate);
 svg.style.setProperty('--sticker-color',stickerPalette[index%stickerPalette.length]);
 for(const source of sources){source.classList.add('sticker-source');}
 for(const [color,width] of [['#282332','7.75px'],['#fff','5.17px']]){
  const group=document.createElementNS(ns,'g');group.dataset.stickerLayer='true';group.setAttribute('aria-hidden','true');group.style.fill=color;group.style.stroke=color;group.style.strokeWidth=width;
  for(const source of sources){const copy=source.cloneNode(true);copy.removeAttribute('id');copy.classList.remove('sticker-source');group.append(copy);}
  svg.insertBefore(group,sources[0]);
 }
 return svg;
}
export function decorateBeatMarker(span,index){
 const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 100 100');svg.setAttribute('aria-hidden','true');
 const text=document.createElementNS(ns,'text');text.textContent=span.textContent;text.setAttribute('x','50');text.setAttribute('y','50');text.setAttribute('text-anchor','middle');text.setAttribute('dominant-baseline','central');text.setAttribute('font-size','80');text.setAttribute('font-weight','900');svg.append(text);decorateSticker(svg,index);span.replaceChildren(svg);
}
export function syncSticker(svg){
 if(!svg?.classList.contains('sticker-glyph'))return;
 const sources=[...svg.children].filter(e=>['path','text'].includes(e.localName));
 svg.querySelectorAll('[data-sticker-layer]').forEach(group=>[...group.children].forEach((copy,i)=>{
  if(sources[i]?.localName==='path')copy.setAttribute('d',sources[i].getAttribute('d'));
 }));
}
export function decorateGameLabels(root,library){
 root.querySelectorAll('.pitch-column>b,.diy-play-mora>b').forEach((label,index)=>{
  if(label.querySelector('svg'))return;const text=label.textContent,glyph=libraryGlyph(library,text);
  if(!glyph?.normal)return;
  loadGlyph(assetUrl(glyph.normal)).then(data=>{
   if(!label.isConnected||label.textContent!==text)return;
   const svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox',data.viewBox);svg.setAttribute('role','img');svg.setAttribute('aria-label',text);
   for(const shape of data.shapes){const p=document.createElementNS(ns,'path');p.setAttribute('d',shape.d);if(shape.fillRule)p.setAttribute('fill-rule',shape.fillRule);svg.append(p);}
   decorateSticker(svg,index);label.classList.add('sticker-label');label.replaceChildren(svg);
  }).catch(()=>{});
 });
}
