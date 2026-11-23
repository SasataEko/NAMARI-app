import {mountAnswerReveal} from './modeOneReveal.js';
import {decorateGameLabels} from './glyph/sticker.js';
import {showCorrectDialog} from './correctDialog.js';
import {mountTutorialSkip} from './tutorialSkip.js';
import {linkedMora,linkPitch} from './data/linkedPitch.js';
import {wordRows} from './wordLayout.js';
import {mountReferenceAudio} from './audioComparison.js';
import { createTutorialGuide } from './tutorialGuide.js';
import { createModeOneSession } from './data/modeOneStats.js';
import { rhythmAnswer, tutorialDefinition } from './data/tutorials.js';
import { mountBeatEditor } from './beatEditor.js';
import './exploration.css';
export async function mountModeOneLesson(root,{question,library,profileId,studyMode,onNext,nextLabel,onCorrect,onComplete,onSkipTutorial}){
  const rhythm=question.mode==='diyMora',guided=Boolean(question.tutorial),n=question.reading.length;
  let active=true,heard=!guided,solved=false,revealed=false,beatEditor;
  const definition=rhythm?rhythmAnswer(question):tutorialDefinition(question,library);
  const session=createModeOneSession({...question,scoringDefinition:definition},{profileId,studyMode:guided?'test':studyMode});
  const pitch=Array(n).fill(null),beats=Array(n).fill(1),blanks=Array(Math.max(0,n-1)).fill(false);
  root.innerHTML='<section class="lesson-card"><p class="eyebrow">'+(guided?'チュートリアル · 練習データ':'MODE 1 · モーラ篇')+'</p><h1></h1><p class="lesson-cue" role="status"></p><audio controls preload="metadata" aria-label="問題の録音"></audio><p class="explore-headphone-note">※イヤホン推奨します</p><div class="lesson-answer"></div><button class="judge-button" data-judge>この答えで判定する</button><p data-feedback role="status"></p><button class="judge-button" data-next hidden></button><p data-sync role="status"></p><button class="text-action" data-retry hidden>未送信の記録を再送</button></section>';
  root.querySelector('h1').textContent=question.word;
  if(guided)mountTutorialSkip(root.querySelector('.lesson-card'),()=>{if(!active)return;session.skipTutorial();onSkipTutorial?.();});
  const guide=guided?createTutorialGuide():null;
  const audio=root.querySelector('audio');audio.src=question.audio;session.attachAudio(audio);mountReferenceAudio(audio,question.referenceAudio,()=>session.referencePlayed());
  const cue=root.querySelector('.lesson-cue'),judge=root.querySelector('[data-judge]'),next=root.querySelector('[data-next]'),answer=root.querySelector('.lesson-answer'),feedback=root.querySelector('[data-feedback]'),retry=root.querySelector('[data-retry]');
  next.textContent=nextLabel;next.onclick=()=>{if(solved||revealed)onNext();};retry.onclick=()=>session.retry();session.setListener(s=>{if(active&&root.isConnected){root.querySelector('[data-sync]').textContent=s.text;retry.hidden=s.status!=='pending';}});
  const openSuccess=()=>showCorrectDialog(root,{label:nextLabel||'次の問題へ',onNext});
  function update(){
    reveal.update();cue.textContent=solved||revealed?'':!heard?'① まずは録音を最後まで聞いてみよう。':guided?(rhythm?'② 文字を選んで、参照する拍をつくってみよう。':'② 各拍を '+definition.pitch.map(p=>p==='high'?'H':'L').join('・')+' にして、判定してみよう。'):'文字を2拍にのばしたり、文字の間に「ッ」を加えて、聞こえたリズムをつくろう。';
    next.hidden=!revealed;next.disabled=!revealed;judge.hidden=revealed;if(revealed)next.textContent=nextLabel?.startsWith('おめでとう')?'ホームへ':nextLabel;
    judge.disabled=!heard||(!solved&&!rhythm&&pitch.some(p=>!p));judge.textContent=solved?'正解を見る':'この答えで判定する';
    answer.querySelectorAll('button').forEach(b=>b.disabled=!heard||solved||revealed||b.dataset.linked==='true'||b.dataset.unavailable==='true');
    if(!guide)return;
    if(solved||revealed){guide.hide();return;}
    if(!heard){guide.set(audio,{highlight:[cue,audio],showNote:false,text:'ここを押して、録音を最後まで聞いてみよう。',step:'STEP 1 / 録音を聞く'});return;}
    if(rhythm){
      const extra=blanks.findIndex((v,i)=>v!==definition.blanks[i]);
      if(extra>=0){guide.set(blanks[extra]?(answer.querySelector('[data-delete-blank-index="'+extra+'"]')||answer.querySelector('[data-blank-index="'+extra+'"]')):(answer.querySelector('[data-gap-index="'+extra+'"]')||answer.querySelector('[data-beat-kana="'+extra+'"]')),{highlight:[cue,answer,judge],showNote:false,text:blanks[extra]?'この追加拍を元に戻してみよう。':'この文字の後に「ッ」を加えてみよう。',step:'STEP 2 / 拍をつくる'});return;}
      const index=beats.findIndex((v,i)=>v!==definition.beats[i]);
      if(index>=0){guide.set(beats[index]===0?answer.querySelector('.beat-reduction-controls'):((answer.querySelector('[data-beat-kana="'+index+'"].beat-selected')?answer.querySelector('[data-beat-choice="'+(definition.beats[index]===0?'delete':'long')+'"]'):null)||answer.querySelector('[data-beat-kana="'+index+'"]')),{highlight:[cue,answer,judge],showNote:false,text:'ここを押して、「'+question.reading[index]+'」を'+definition.beats[index]+'拍にしてみよう。',step:'STEP 2 / 拍をつくる'});return;}
    }else{
      const index=pitch.findIndex((v,i)=>v!==definition.pitch[i]);
      if(index>=0){guide.set(answer.querySelectorAll('.pitch-column')[index].querySelectorAll('button')[definition.pitch[index]==='high'?0:1],{highlight:[cue,answer,judge],showNote:false,text:'「'+question.reading[index]+'」を'+(definition.pitch[index]==='high'?'高く':'低く')+'してみよう。',step:'STEP 2 / 高低を選ぶ'});return;}
    }
    guide.set(judge,{highlight:[cue,answer,judge],showNote:false,text:'できたら、ここを押して答えを確かめよう。',step:'STEP 2 / 答えを確かめる'});
  }
  function drawPitch(){
    pitch.splice(0,n,...linkPitch(question.reading,pitch));
    answer.replaceChildren();
    for(const indices of wordRows(question.reading)){
      const builder=document.createElement('div');builder.className='pitch-builder';builder.innerHTML='<div class="pitch-row-labels"><span>高</span><span>低</span></div><div class="pitch-columns"></div>';answer.append(builder);
      const columns=builder.querySelector('.pitch-columns');columns.style.gridTemplateColumns='repeat('+indices.length+',minmax(0,1fr))';let d='';
      indices.forEach((i,j)=>{if(pitch[i])d+=(j&&pitch[indices[j-1]]?'L':'M')+(50+j*100)+' '+(pitch[i]==='high'?19:111)+' ';});
      columns.innerHTML='<svg class="pitch-path" viewBox="0 0 '+indices.length*100+' 130" preserveAspectRatio="none" aria-hidden="true"><path class="pitch-guide" d="M50 19 H'+(indices.length*100-50)+' M50 111 H'+(indices.length*100-50)+'"/><path class="pitch-line-path" d="'+d+'"/></svg>';
      indices.forEach(i=>{const text=question.reading[i],col=document.createElement('div');col.className='pitch-column';['high','low'].forEach(p=>{const b=document.createElement('button');b.dataset.linked=String(linkedMora(question.reading,i));if(linkedMora(question.reading,i))b.title='前の拍と連動';b.className='pitch-choice '+(pitch[i]===p?'selected':'');b.setAttribute('aria-label',text+'を'+(p==='high'?'高':'低')+'くする');b.setAttribute('aria-pressed',String(pitch[i]===p));b.textContent='';b.onclick=()=>{session.markVisualization();pitch[i]=p;feedback.textContent='';drawPitch();update();};col.append(b);});const label=document.createElement('b');label.textContent=text;col.append(label);columns.append(col);});
    }
    decorateGameLabels(answer,library);
  }
  const reveal=mountAnswerReveal(root,{session,before:judge,onReveal:async()=>{
   revealed=true;guide?.hide();judge.hidden=true;judge.disabled=true;answer.querySelectorAll('button').forEach(b=>b.disabled=true);session.markVisualization();feedback.textContent='正解を表示しました。';
   if(rhythm){beats.splice(0,n,...definition.beats);blanks.splice(0,blanks.length,...definition.blanks);beatEditor?.dispose();beatEditor=await mountBeatEditor(answer,{library,reading:question.reading,beats,blanks,disabled:true});}
   else{pitch.splice(0,n,...definition.pitch);drawPitch();}update();
  }});
  audio.addEventListener('play',()=>{if(!heard){cue.textContent='録音を聞いてみよう。聞き終わったら操作できます。';guide?.set(audio,{highlight:[cue,audio],showNote:false,text:'聞き終わるまで、そのまま聞いてみよう。',step:'STEP 1 / 録音を聞く',point:false});}});
  audio.addEventListener('pause',()=>{if(!heard)update();});
  audio.addEventListener('ended',()=>{if(!active)return;heard=true;beatEditor?.setDisabled(false);update();});
  if(rhythm){answer.classList.add('explore-scroll');try{beatEditor=await mountBeatEditor(answer,{library,reading:question.reading,beats,blanks,disabled:!heard,onSelect:()=>update(),onChange:()=>{session.markVisualization();feedback.textContent='';update();}});}catch(e){if(active){feedback.textContent='字形を読み込めません：'+e.message;judge.hidden=true;}return ()=>{active=false;guide?.dispose();session.leave();};}}
  else drawPitch();
  if(!root.isConnected){guide?.dispose();session.leave();return ()=>{};}update();
  judge.onclick=()=>{
    if(judge.disabled)return;
    if(solved){openSuccess();return;}
    const result=session.answer(rhythm?{kind:'rhythm',beats:[...beats],blanks:[...blanks]}:{kind:'answer',pitch:[...pitch]});
    if(result.completed){solved=true;feedback.textContent='';beatEditor?.setDisabled(true);onCorrect?.();onComplete?.(question.id);}
    else feedback.textContent=guided?(rhythm?'もう少し！案内を見ながら、拍を調整してみよう。':'もう少し！'+definition.pitch.map(p=>p==='high'?'高':'低').join('・')+'の順に選んでみよう。'):'拍の構成が異なります。録音をもう一度聞いてみよう。';
    update();if(result.completed)openSuccess();
  };
  return ()=>{active=false;guide?.dispose();beatEditor?.dispose?.();session.leave();};
}
