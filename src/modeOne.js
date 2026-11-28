import {mountCompactAudio} from './compactAudio.js';
import {mountModeOneJourney} from './modeOneJourney.js';
import {showCorrectDialog} from './correctDialog.js';
import {ichibuMorphOptions} from './glyph/ichibuStrokeMap.js';
import {startLevelAudio} from './levelAudio.js';
import {decorateCardImages} from './glyph/cardGlyphPreview.js';
import {mountAnswerReveal} from './modeOneReveal.js';
import {decorateSticker} from './glyph/sticker.js';
import {mountTutorialSkip} from './tutorialSkip.js';
import {wrapStaticWord} from './wordLayout.js';

import {mountReferenceAudio} from './audioComparison.js';
import { createTutorialGuide } from './tutorialGuide.js';
import { loadGlyph } from './glyph/loadGlyph.js';
import { animateMorph, createMorph } from './glyph/morph.js';
import { assetUrl } from './data/projectLibrary.js';
import { resolveModeOne } from './data/patternLibrary.js';
import { createModeOneSession } from './data/modeOneStats.js';
export function mountModeOne(root,{library,question,profileId,studyMode,onSolved,onCorrect,onWrong,onNext,nextWord,nextLabel,onSkipTutorial}){
 const q=resolveModeOne(library,question),solved=new Set(),glyphs=[];let active=true,busy=true,revealed=false,cancel,lastIndex=null,overlay,heard=!q.tutorial;
 const alive=()=>active&&root.isConnected;let disposeAutoplay=null,journey=null,disposeCompact=null,closeTutorialCard=null;
 const session=createModeOneSession({...q,statsLevelId:question.statsLevelId,recordingId:question.recordingId},{profileId,studyMode:q.tutorial?'test':studyMode});
 root.innerHTML='<section class="morph-stage"><div class="morph-label"><span>MODE 1</span><span>音声を聞いて、気になる文字を選ぼう</span></div><div class="mode-one-found-count" data-found-count role="status" aria-label="見つけた正解の数"></div><div class="character-row mode-one-characters"></div><p data-status class="status" role="status">字形を読み込んでいます…</p></section><div class="audio-control mode-one-audio"><audio controls preload="metadata" aria-label="問題の録音"></audio></div><div class="mode-one-result" hidden><div class="morph-controls"><button class="outline-button" data-card>カードをもう一度見る</button></div></div><div class="mode-one-next"><button class="judge-button" data-next disabled></button></div>';
 if(!q.tutorial)root.querySelector('.morph-label').remove();
 root.querySelector('[data-found-count]').textContent='0 / '+q.targets.length;
 if(q.tutorial){const cue=document.createElement('aside');cue.className='lesson-cue';cue.setAttribute('role','status');cue.dataset.tutorialCue='';cue.textContent='① まずは録音を最後まで聞いてみよう。';cue.hidden=true;root.prepend(cue);}
 root.querySelector('audio').src=q.audio||'';session.attachAudio(root.querySelector('audio'));const reference=mountReferenceAudio(root.querySelector('audio'),q.referenceAudio,()=>session.referencePlayed());disposeCompact=mountCompactAudio(root.querySelector('.morph-stage'),root.querySelector('audio'),reference);root.querySelector('.mode-one-audio').hidden=true;

 const guide=null;
 const pointAudio=playing=>guide?.set(root.querySelector('audio'),{highlight:[root.querySelector('[data-tutorial-cue]'),root.querySelector('audio')],showNote:false,text:playing?'聞き終わるまで、そのまま聞いてみよう。':'ここを押して、録音を聞いてみよう。',step:'STEP 1 / 録音を聞く',point:!playing});
 pointAudio(false);
 root.querySelector('audio').addEventListener('play',()=>{if(!heard)pointAudio(true);});
 root.querySelector('audio').addEventListener('pause',()=>{if(!heard)pointAudio(false);});
 const sync=document.createElement('p');sync.setAttribute('role','status');sync.dataset.mode1Sync='';root.append(sync);const retry=document.createElement('button');retry.className='text-action';retry.textContent='未送信の記録を再送';retry.hidden=true;root.append(retry);retry.onclick=()=>session.retry();session.setListener(s=>{if(alive()){sync.textContent=s.text;retry.hidden=s.status!=='pending';}});
 const status=root.querySelector('[data-status]'),next=root.querySelector('[data-next]'),result=root.querySelector('.mode-one-result');
 next.textContent=nextLabel||(nextWord?'次の問題へ：'+nextWord+' →':'おめでとう、全問クリア！');next.onclick=()=>onNext();next.hidden=true;if(q.tutorial)status.hidden=true;
 function showSuccess(){if(!alive()||revealed||!q.targets.length||!q.targets.every(i=>solved.has(i)))return;guide?.hide();showCorrectDialog(root,{label:next.textContent,onNext,onQuestion:()=>session.feedback(q.targets.map(i=>({kana:q.characters[i].text,patternId:q.characters[i].pattern.id}))),questionSent:session.feedbackSent});}

 function update(){root.querySelector('[data-found-count]').textContent=solved.size+' / '+q.targets.length;const complete=q.targets.length>0&&q.targets.every(i=>solved.has(i));result.hidden=!solved.size&&!revealed;next.disabled=!complete&&!revealed;next.hidden=!revealed;reveal.update();if(complete&&!revealed&&q.tutorial)root.querySelector('[data-tutorial-cue]').textContent='③ できたね！次の問題へ進もう。';}
 function showCard(i){if(!alive())return;const {text,pattern,group}=q.characters[i];if(!pattern)return;guide?.hide();overlay?.remove();const previous=document.activeElement;overlay=document.createElement('div');overlay.className='dialog-backdrop mode-one-card-overlay';overlay.innerHTML='<section class="mode-one-pattern-card" role="dialog" aria-modal="true" aria-label="発音パターンのカード"><button class="dialog-close" aria-label="カードを閉じる">×</button><img alt=""><b></b><h2></h2><p></p><small>どこかをタップして閉じる</small></section>';const card=overlay.firstElementChild;if(q.tutorial)card.querySelector('small').hidden=true;card.style.background=/^#[0-9a-f]{6}$/i.test(group?.color)?group.color:'#ffe08b';card.querySelector('img').src=assetUrl(pattern.svg);card.querySelector('img').alt=text+'の変形字形';card.querySelector('b').textContent=group?.title||'発音パターン';card.querySelector('h2').textContent=pattern.title;card.querySelector('p').textContent=pattern.description||group?.description||'';const currentOverlay=overlay;let closing=false;
 // Mount before starting the animation. Focusing a transformed, detached card
 // can skip its visible entrance or scroll to its offscreen start position.
 root.append(overlay);decorateCardImages(card);card.style.transform='translateY(120vh) scale(.92)';
 const entrance=card.animate([
   {transform:'translateY(120vh) scale(.92) rotate(-2deg)',offset:0,easing:'cubic-bezier(.14,.72,.22,1)'},
   {transform:'translateY(-64px) scale(1.025) rotate(0deg)',offset:.56,easing:'cubic-bezier(.45,0,.8,.4)'},
   {transform:'translateY(22px) scale(.99)',offset:.76,easing:'cubic-bezier(.15,.6,.3,1)'},
   {transform:'translateY(-9px) scale(1.005)',offset:.90,easing:'ease-in-out'},
   {transform:'translateY(0) scale(1)',offset:1}
 ],{duration:1150,easing:'linear',fill:'both'});
 entrance.pause();
 requestAnimationFrame(()=>requestAnimationFrame(()=>{if(alive()&&!closing&&overlay===currentOverlay)entrance.play();}));
 currentOverlay.animate([{backgroundColor:'rgba(25,25,25,0)'},{backgroundColor:'rgba(25,25,25,.62)'}],{duration:450,fill:'both'});
 entrance.finished.then(()=>{if(alive()&&!closing&&overlay===currentOverlay){card.classList.add('is-settled');journey?.notify('cardReady');}}).catch(()=>{});
 const close=e=>{e?.preventDefault();e?.stopPropagation();if(closing)return;closing=true;session.tracker.cardClosed();session.checkpoint();card.classList.remove('is-settled');entrance.cancel();
 const exit=card.animate([{transform:'translateY(0)'},{transform:'translateY(-12px)',offset:.2},{transform:'translateY(110vh)'}],{duration:420,easing:'cubic-bezier(.4,0,.8,.4)',fill:'both'});
 currentOverlay.animate([{backgroundColor:'rgba(25,25,25,.62)'},{backgroundColor:'rgba(25,25,25,0)'}],{duration:420,fill:'both'});
 exit.finished.then(()=>{currentOverlay.remove();if(overlay===currentOverlay)overlay=null;if(previous?.isConnected)previous.focus({preventScroll:true});showSuccess();journey?.notify('correctReady');}).catch(()=>currentOverlay.remove());};if(q.tutorial)closeTutorialCard=()=>close();overlay.onclick=close;overlay.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();close();}if(e.key==='Tab'){e.preventDefault();card.querySelector('button').focus();}};session.tracker.cardViewed();card.querySelector('button').focus({preventScroll:true});}
 root.querySelector('[data-card]').onclick=()=>showCard(lastIndex);
 const row=root.querySelector('.character-row');const buttons=q.characters.map((c,i)=>{const b=document.createElement('button');b.className='character-button';b.dataset.kanaIndex=String(i);b.disabled=true;b.setAttribute('aria-label',c.text+'を選ぶ');const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.classList.add('character-svg');svg.setAttribute('role','img');svg.setAttribute('aria-label',c.text);b.append(svg);row.append(b);b.onclick=()=>pick(i,b,svg);return b;});wrapStaticWord(row,q.characters.map(c=>c.text));
 function paths(svg,glyph){svg.setAttribute('viewBox',glyph.viewBox);svg.replaceChildren(...glyph.shapes.map(shape=>{const p=document.createElementNS('http://www.w3.org/2000/svg','path');p.setAttribute('d',shape.d);p.setAttribute('fill',shape.fill);for(const key of ['fillRule','clipRule','opacity'])if(shape[key])p.setAttribute(key.replace(/[A-Z]/g,c=>'-'+c.toLowerCase()),shape[key]);return p;}));}
 function pick(i,button,svg){if(busy||!heard||!alive())return;if(revealed){if(q.targets.includes(i)){lastIndex=i;showCard(i);}return;}if(solved.has(i)){session.answer({kind:'kana',index:i,review:true});lastIndex=i;showCard(i);return;}if(!q.targets.includes(i)){session.answer({kind:'kana',index:i});reveal.update();onWrong?.();button.classList.add('is-wrong');status.textContent='ほかの文字みたい。もう一度聞いてみよう。';setTimeout(()=>button.classList.remove('is-wrong'),720);return;}const g=glyphs[i];if(!g?.custom)return;journey?.notify('kana:'+i);busy=true;reveal.update();session.markVisualization();guide?.set(button,{highlight:[root.querySelector('[data-tutorial-cue]'),root.querySelector('.morph-stage')],showNote:false,text:'字形が変わるところを見てみよう。',step:'STEP 2 / 文字を選ぶ',point:false});buttons.forEach(b=>b.disabled=true);status.textContent='「'+q.characters[i].text+'」の輪郭が変化しています…';const animationDone=()=>{if(!alive())return;cancel=null;solved.add(i);session.answer({kind:'kana',index:i});lastIndex=i;busy=false;buttons.forEach(b=>b.disabled=false);button.classList.add('is-correct');status.textContent='';update();onCorrect?.();onSolved?.(q.characters[i].pattern.id);showCard(i);};cancel=animateMorph([...svg.querySelectorAll(':scope > path')],g.normal.shapes.map(s=>s.d),g.custom.shapes.map(s=>s.d),1000,animationDone,ichibuMorphOptions(q,q.characters[i]));}
 const reveal=mountAnswerReveal(root,{session,isBlocked:()=>busy,before:root.querySelector('.mode-one-next'),onReveal:()=>{
  revealed=true;guide?.hide();lastIndex=q.targets[0];session.markVisualization();
  q.targets.forEach(i=>{const svg=buttons[i].querySelector('svg');paths(svg,glyphs[i].custom);decorateSticker(svg,i);buttons[i].dataset.answerRevealed='true';});
  buttons.forEach((b,i)=>b.disabled=!q.targets.includes(i));root.querySelector('[data-card]').textContent='発音パターンを見る';next.textContent=nextWord?'次の問題へ：'+nextWord+' →':nextLabel||'ホームへ';update();
 }});
 Promise.all(q.characters.map(async(c,i)=>{const normal=c.normal?await loadGlyph(assetUrl(c.normal)):{viewBox:'0 0 170.08 170.08',shapes:[]};let custom=null;if(q.targets.includes(i)){if(!c.pattern||!c.normal)throw new Error('「'+c.text+'」の対応する図鑑パターンがありません。DIYで正解設定を確認してください。');custom=await loadGlyph(assetUrl(c.pattern.svg));if(normal.viewBox!==custom.viewBox)throw new Error('通常字形と変形字形のviewBoxをそろえてください。');createMorph(normal.shapes.map(s=>s.d),custom.shapes.map(s=>s.d),ichibuMorphOptions(q,c));}glyphs[i]={normal,custom};if(!alive())return;const svg=buttons[i].querySelector('svg');if(normal.shapes.length){paths(svg,normal);decorateSticker(svg,i);}else{svg.remove();const text=document.createElement('span');text.className='mode-one-text';text.textContent=c.text;buttons[i].append(text);}})).then(()=>{if(!alive())return;if(!q.targets.length)throw new Error('この問題の正解位置はまだ設定されていません。');busy=false;buttons.forEach(b=>b.disabled=!heard);disposeAutoplay=startLevelAudio(root.querySelector('audio'),{mode:'mode1',alive,onBlocked:()=>journey?.blocked()});status.textContent=q.tutorial?'録音を聞き終わったら、「'+q.characters[q.targets[0]].text+'」を選んでみよう。':'';}).catch(e=>{if(alive()){status.hidden=false;status.textContent='素材を読み込めません：'+e.message;}});
 root.querySelector('audio').addEventListener('ended',()=>{if(!alive()||!q.tutorial)return;heard=true;if(!busy)buttons.forEach(b=>b.disabled=false);root.querySelector('[data-tutorial-cue]').textContent='② 今度は「'+q.characters[q.targets[0]].text+'」を選んでみよう。字形が変わり、発音のカードが出てくるよ。';status.textContent='「'+q.characters[q.targets[0]].text+'」をタップしてみよう。';guide?.set(buttons[q.targets[0]],{highlight:[root.querySelector('[data-tutorial-cue]'),root.querySelector('.morph-stage')],showNote:false,text:'ここを押して、「'+q.characters[q.targets[0]].text+'」を選んでみよう。',step:'STEP 2 / 文字を選ぶ'});});
 if(q.tutorial)journey=mountModeOneJourney(root,{question:q,audio:root.querySelector('audio'),onCloseCard:()=>closeTutorialCard?.(),onSkip:()=>{session.skipTutorial();onSkipTutorial?.();}});
 return ()=>{journey?.dispose();active=false;disposeCompact?.();disposeAutoplay?.();guide?.dispose();cancel?.();overlay?.remove();session.leave();};
}
