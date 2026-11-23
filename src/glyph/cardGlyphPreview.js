import {loadGlyph} from './loadGlyph.js';
import {decorateSticker} from './sticker.js';
import './cardGlyphPreview.css';
const ns='http://www.w3.org/2000/svg';
// Replace only visual previews; uploaded SVG contours remain untouched.
export function decorateCardImages(root){
 const images=[...root.querySelectorAll('.library-pattern img,.diy-library-pattern img,.mode-one-pattern-card img,.diy-vowel-kana img')];
 return Promise.all(images.map(async image=>{
  if(image.dataset.stickerLoading)return;image.dataset.stickerLoading='true';image.style.visibility='hidden';
  try{
   const glyph=await loadGlyph(image.currentSrc||image.src);if(!image.isConnected)return;
   const svg=document.createElementNS(ns,'svg');svg.classList.add('card-glyph-preview');svg.setAttribute('role','img');svg.setAttribute('aria-label',image.alt||'字形');
   const [x,y,w,h]=glyph.viewBox.trim().split(/[ ,]+/).map(Number),pad=Math.max(w,h)*.12;svg.setAttribute('viewBox',[x-pad,y-pad,w+pad*2,h+pad*2].join(' '));svg.setAttribute('preserveAspectRatio','xMidYMid meet');
   for(const shape of glyph.shapes){const p=document.createElementNS(ns,'path');p.setAttribute('d',shape.d);if(shape.fillRule)p.setAttribute('fill-rule',shape.fillRule);if(shape.clipRule)p.setAttribute('clip-rule',shape.clipRule);svg.append(p);}
   const card=image.closest('.library-pattern,.diy-library-pattern,.mode-one-pattern-card');const color=image.dataset.glyphColor||card?.style.backgroundColor||card?.style.background||'#ffe08b';
   decorateSticker(svg);svg.style.setProperty('--sticker-color',color);image.replaceWith(svg);
  }catch(error){if(image.isConnected){image.style.visibility='';image.title='字形を読み込めませんでした：'+error.message;}}
 }));
}
