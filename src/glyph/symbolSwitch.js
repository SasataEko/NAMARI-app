import {decorateSticker} from './sticker.js';
const ns='http://www.w3.org/2000/svg';
export const isSymbolSwitch=variant=>variant?.renderMode==='symbol-switch';
// One visible glyph at a time. At the handoff both opacities are zero.
export function symbolSwitchFrame(progress){const t=Math.max(0,Math.min(1,progress));return t<.5?{target:false,opacity:1-2*t}:{target:true,opacity:2*t-1};}
export function paintWholeGlyph(svg,glyph){
  svg.replaceChildren();svg.dataset.glyphViewBox=glyph.viewBox;svg.setAttribute('viewBox',glyph.viewBox);
  for(const shape of glyph.shapes){const path=document.createElementNS(ns,'path');path.setAttribute('d',shape.d);path.setAttribute('fill','currentColor');if(shape.fillRule)path.setAttribute('fill-rule',shape.fillRule);svg.append(path);}
  if(svg.dataset.stickerIndex!==undefined)decorateSticker(svg,Number(svg.dataset.stickerIndex),{aggregate:svg.dataset.stickerAggregate==='true'});
}
export function animateWholeGlyphSwitch(svg,from,to,{onFrame=()=>{},onDone=()=>{},duration=480}={}){
  let frame=0,cancelled=false,lastTarget=null;const start=performance.now();
  const apply=t=>{const state=symbolSwitchFrame(t);if(lastTarget!==state.target){paintWholeGlyph(svg,state.target?to:from);lastTarget=state.target;}svg.style.opacity=String(state.opacity);onFrame();};
  if(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches){paintWholeGlyph(svg,to);svg.style.opacity='1';onFrame();onDone();return ()=>{};}
  apply(0);const tick=now=>{if(cancelled||!svg.isConnected)return;const t=Math.min(1,(now-start)/duration);apply(t);if(t<1)frame=requestAnimationFrame(tick);else{svg.style.opacity='1';onDone();}};frame=requestAnimationFrame(tick);
  return ()=>{cancelled=true;cancelAnimationFrame(frame);svg.style.opacity='1';};
}
export function symbolDistribution(source,variants,rates){
  const choices=variants.filter(isSymbolSwitch).map(v=>({id:v.id,label:source+' → '+v.targetKana,rate:Math.max(0,Math.min(1,Number(rates[v.id])||0)),variant:v}));
  return [{id:null,label:source+'のまま（マークのみを含む）',rate:Math.max(0,1-choices.reduce((n,v)=>n+v.rate,0)),variant:null},...choices];
}
