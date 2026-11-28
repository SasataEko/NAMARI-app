import {placeJourneyArrow} from './data/journeyArrow.js';
import {placeJourneyBubble} from './data/journeyBubble.js';
import {createJourneyModel,journeyVersion} from './data/modeTwoJourneyModel.js';
import {assetUrl} from './data/projectLibrary.js';
import './modeTwoJourney.css';
const ns='http://www.w3.org/2000/svg';
// Capture events instead of cloning controls: the real audio, undo and Morph survive.
export function mountJourneyLayer(root,{step,onAdvance,onSkip,onInteract,result=false}){
 const layer=document.createElement('div');layer.className='m2-journey';const id='m2-mask-'+crypto.randomUUID();
 layer.innerHTML='<svg aria-hidden="true"><defs><mask id="'+id+'"><rect width="100%" height="100%" fill="white"/><g data-holes></g></mask></defs><rect width="100%" height="100%" fill="#191623" fill-opacity=".68" mask="url(#'+id+')"/></svg><div class="m2-journey-arrows" aria-hidden="true"></div><aside class="m2-journey-note" role="status" aria-live="polite"><p></p><button data-listen hidden>タップして録音を再生</button></aside><button class="m2-journey-skip" data-skip>案内をスキップ</button>';
 document.body.append(layer);
 const note=layer.querySelector('aside'),arrows=layer.querySelector('.m2-journey-arrows'),holes=layer.querySelector('[data-holes]');let dead=false,frame=0,retry=null;
 const query=s=>{try{return [...root.querySelectorAll(s)];}catch{return [];}};
 const permitted=t=>{const s=step();return s.free?root.contains(t):(s.allow||[]).some(sel=>t.closest?.(sel)&&root.contains(t.closest(sel)));};
 function gate(e){
  if(dead)return;const s=step(),t=e.target;
  if(t.closest?.('.sound-notice'))return;
  if(t.closest?.('[data-skip]')&&layer.contains(t)){if(e.type==='click'){e.preventDefault();e.stopImmediatePropagation();onSkip?.();}return;}
  if(t.closest?.('[data-listen]')&&layer.contains(t)){if(e.type==='click'){e.preventDefault();e.stopImmediatePropagation();retry?.();}return;}
  if(s.free)return;
  if(e.type==='keydown'&&e.key==='Tab'){
   e.preventDefault();e.stopImmediatePropagation();const items=[...(s.allow||[]).flatMap(query),...layer.querySelectorAll('button:not([hidden])')].filter(n=>!n.disabled&&n.getClientRects().length);if(items.length)items[(items.indexOf(document.activeElement)+(e.shiftKey?-1:1)+items.length)%items.length].focus();return;
  }
  if(permitted(t)){
   if(s.replay&&e.type==='click'){const audio=t.closest?.('.m3-audio-item')?.querySelector('audio');if(audio){audio.pause();try{audio.currentTime=0;}catch{}}}
   if(e.type==='click'&&onInteract)queueMicrotask(()=>{if(!dead)onInteract(t);});
   return;
  }
  e.stopImmediatePropagation();if(e.type!=='pointerdown')e.preventDefault();
  // Narration consumes the click, even over a transparent control hit area.
  // The underlying editor never receives the click that dismisses the bubble.
  if((e.type==='click'||e.type==='keydown'&&['Enter',' '].includes(e.key))&&!s.event)onAdvance?.();
 }
 for(const event of ['click','keydown','pointerdown','touchmove'])document.addEventListener(event,gate,{capture:true,passive:false});
 function draw(){
  frame=0;if(dead)return;if(!root.isConnected){dispose();return;}const s=step();
  const noCards=s.event==='pattern'&&!query('.m3-choice[data-pattern-id]:not([data-pattern-id=""]):not(:disabled)').length;
  const portal=s.portal&&query(s.portal)[0];if(layer.parentElement!==(portal||document.body))(portal||document.body).append(layer);layer.hidden=!!s.free||!!s.hideVisual;if(s.free||s.hideVisual)return;layer.dataset.free='false';note.querySelector('p').textContent=noCards?'この文字の変形はまだ準備中だよ。ほかの文字を選んでみよう。':s.text||'';layer.querySelector('[data-skip]').hidden=result||!!s.finished;
  holes.replaceChildren();const targets=(s.highlight||['.m3-canvas']).flatMap(query);
  for(const target of [...targets,...(s.allow||[]).flatMap(query)]){const b=target.getBoundingClientRect();if(!b.width||!b.height)continue;const rect=document.createElementNS(ns,'rect');for(const[k,v]of Object.entries({x:b.left-4,y:b.top-4,width:b.width+8,height:b.height+8,rx:14,fill:'black'}))rect.setAttribute(k,String(v));holes.append(rect);}
  const selectors=noCards?['.m3-canvas']:(s.points||[s.point]).filter(Boolean);
  const pointed=selectors.map(selector=>query(selector).find(n=>n.getClientRects().length)).filter(Boolean);
  const anchor=pointed[0]||query(s.anchor||'.m3-word-row')[0]||root;
  const currentTargets=new Set([root,...targets,...pointed,anchor]);for(const target of resizeTargets)if(!currentTargets.has(target)){observer.unobserve(target);resizeTargets.delete(target);}for(const target of currentTargets)if(!resizeTargets.has(target)){observer.observe(target);resizeTargets.add(target);}
  note.style.width=Math.min(270,innerWidth-28)+'px';
  const protectedBoxes=query(s.protect||'.m3-word-row,.m3-panel button,.m3-audio-rail,.edit-undo,.m3-sequence-actions').map(e=>e.getBoundingClientRect()).filter(b=>b.width&&b.height);
  if(s.regionPoint)protectedBoxes.push(...pointed.map(e=>e.getBoundingClientRect()));
  const position=placeJourneyBubble({width:innerWidth,height:innerHeight,target:anchor.getBoundingClientRect(),avoid:protectedBoxes,noteWidth:270,noteHeight:note.getBoundingClientRect().height,placement:s.placement});
  if(s.centered){position.left=(innerWidth-position.width)/2;position.top=(innerHeight-note.getBoundingClientRect().height)/2;}
  note.dataset.centered=String(!!s.centered);note.style.left=position.left+'px';note.style.top=position.top+'px';
  const noteHeight=note.getBoundingClientRect().height,noteBox={left:position.left,top:position.top,width:position.width,height:noteHeight,right:position.left+position.width,bottom:position.top+noteHeight};
  arrows.replaceChildren();
  for(const target of pointed){
   const arrow=document.createElement('img');arrow.className='m2-journey-arrow';arrow.alt='';arrow.src=assetUrl('assets/tutorial-arrow.png');
   const p=placeJourneyArrow({target:target.getBoundingClientRect(),note:noteBox,width:innerWidth,height:innerHeight,size:innerWidth<=600?32:36});
   arrow.style.left=p.x+'px';arrow.style.top=p.y+'px';arrow.style.setProperty('--direction',p.angle+'deg');arrow.style.setProperty('--float-x',p.dx+'px');arrow.style.setProperty('--float-y',p.dy+'px');arrows.append(arrow);
  }
 }
 const schedule=()=>{if(!frame&&!dead)frame=requestAnimationFrame(draw);};
 const resizeTargets=new Set([root]);const observer=new ResizeObserver(schedule);observer.observe(root);
 const mutations=new MutationObserver(records=>{if(records.some(record=>!layer.contains(record.target)))schedule();});mutations.observe(root,{subtree:true,childList:true});
 window.addEventListener('resize',schedule);window.addEventListener('scroll',schedule,true);
 function dispose(){if(dead)return;dead=true;cancelAnimationFrame(frame);observer.disconnect();mutations.disconnect();for(const event of ['click','keydown','pointerdown','touchmove'])document.removeEventListener(event,gate,true);window.removeEventListener('resize',schedule);window.removeEventListener('scroll',schedule,true);layer.remove();}
 schedule();return {refresh(){cancelAnimationFrame(frame);frame=0;draw();},dispose,blocked(play,error=false){retry=play;const b=note.querySelector('[data-listen]');b.hidden=false;if(error)b.textContent='音声を再生できません。もう一度再生';schedule();},started(){note.querySelector('[data-listen]').hidden=true;}};
}
export function mountModeTwoJourney(root,{audio,onState}={}){
 const model=createJourneyModel();let disposed=false,completed=false;
 onState?.('started',journeyVersion);
 const update=()=>{if(model.phase==='durationFree'&&!completed){completed=true;onState?.('completed',journeyVersion);}layer.refresh();};
 const layer=mountJourneyLayer(root,{step:()=>model.step,onAdvance:()=>{if(model.advance())update();},onSkip:()=>{onState?.('skipped',journeyVersion);model.skip();dispose();}});
 const ended=()=>notify('listened');audio?.addEventListener('ended',ended);
 function notify(event){if(!disposed&&model.notify(event))update();}
 function dispose(){if(disposed)return;disposed=true;audio?.removeEventListener('ended',ended);layer.dispose();}
 return {notify,dispose,refresh:()=>layer.refresh(),blocked:(play,error)=>layer.blocked(play,error),started:()=>layer.started(),get phase(){return model.phase;}};
}
export function mountModeTwoResultJourney(root,onComplete=()=>{}){
 let index=0;const items=[{text:'上は、きみがつくった聞こえ方だよ。',point:'[data-personal-preview] .m3-word-row',highlight:['.mode2-answer-block:has([data-personal-preview])']},{text:root.querySelector('.mode2-average-block h2')?.textContent.includes('表示例')?'下は、みんなの平均が出るところだよ。今はきみの作品を例として表示しているよ。':'下は、みんなの聞こえ方の平均だよ。',point:'[data-average-preview] .m3-word-row',highlight:['.mode2-average-block']}];
 const layer=mountJourneyLayer(root,{result:true,step:()=>items[index],onAdvance:()=>{if(++index===items.length){onComplete();layer.dispose();}else layer.refresh();}});return ()=>layer.dispose();
}
