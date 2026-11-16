import {mountReferenceAudio} from './audioComparison.js';
import { createTutorialGuide } from './tutorialGuide.js';
import { createModeOneSession } from './data/modeOneStats.js';
import { rhythmAnswer, tutorialDefinition } from './data/tutorials.js';
import { mountBeatEditor } from './beatEditor.js';
import './exploration.css';
export async function mountModeOneLesson(root,{question,library,profileId,studyMode,onNext,nextLabel,onCorrect,onComplete}){
  const rhythm=question.mode==='diyMora',guided=Boolean(question.tutorial),n=question.reading.length;
  let active=true,heard=!guided,solved=false,beatEditor;
  const definition=rhythm?rhythmAnswer(question):tutorialDefinition(question,library);
  const session=createModeOneSession({...question,scoringDefinition:definition},{profileId,studyMode:guided?'test':studyMode});
  const pitch=Array(n).fill(null),beats=Array(n).fill(1),blanks=Array(Math.max(0,n-1)).fill(false);
  root.innerHTML='<section class="lesson-card"><p class="eyebrow">'+(guided?'チュートリアル · 練習データ':'MODE 1 · モーラ篇')+'</p><h1></h1><p class="lesson-cue" role="status"></p><audio controls preload="metadata" aria-label="問題の録音"></audio><p class="explore-headphone-note">※イヤホン推奨します</p><div class="lesson-answer"></div><button class="judge-button" data-judge>この答えで判定する</button><p data-feedback role="status"></p><button class="judge-button" data-next hidden></button><p data-sync role="status"></p><button class="text-action" data-retry hidden>未送信の記録を再送</button></section>';
  root.querySelector('h1').textContent=question.word;
  const guide=guided?createTutorialGuide():null;
  const audio=root.querySelector('audio');audio.src=question.audio;session.attachAudio(audio);mountReferenceAudio(audio,question.referenceAudio,()=>session.referencePlayed());
  const cue=root.querySelector('.lesson-cue'),judge=root.querySelector('[data-judge]'),next=root.querySelector('[data-next]'),answer=root.querySelector('.lesson-answer'),feedback=root.querySelector('[data-feedback]'),retry=root.querySelector('[data-retry]');
  next.textContent=nextLabel;next.onclick=()=>{if(solved)onNext();};retry.onclick=()=>session.retry();session.setListener(s=>{if(active&&root.isConnected){root.querySelector('[data-sync]').textContent=s.text;retry.hidden=s.status!=='pending';}});
  function update(){
    cue.textContent=solved?'できたね！次へ進んでみよう。':!heard?'① まずは録音を最後まで聞いてみよう。':guided?(rhythm?'② 「ぷ」を「→ 2拍」で長くしてみよう。空白拍は加えずに判定してね。':'② 「か」を高く、「ら」「だ」を低くしよう（H・L・L）。選べたら判定してね。'):'文字を2拍にのばしたり、文字の間に「ッ」を加えて、聞こえたリズムをつくろう。';
    next.hidden=!solved;next.disabled=!solved;
    judge.disabled=solved||!heard||(!rhythm&&pitch.some(p=>!p));
    answer.querySelectorAll('button').forEach(b=>b.disabled=!heard||solved);
    if(!guide)return;
    if(solved){guide.set(next,{highlight:[answer,judge,next,feedback],showNote:false,text:'上手にできたね！ここから次へ進もう。',step:'STEP 3 / 次へ進む'});return;}
    if(!heard){guide.set(audio,{text:'ここを押して、録音を最後まで聞いてみよう。',step:'STEP 1 / 録音を聞く'});return;}
    if(rhythm){
      const extra=blanks.findIndex((v,i)=>v!==definition.blanks[i]);
      if(extra>=0){guide.set(answer.querySelectorAll('.explore-gap button')[extra],{highlight:[answer,judge],showNote:false,text:'この空白拍を元に戻してみよう。',step:'STEP 2 / 拍をつくる'});return;}
      const index=beats.findIndex((v,i)=>v!==definition.beats[i]);
      if(index>=0){guide.set(answer.querySelectorAll('.explore-beat-toggle')[index],{highlight:[answer,judge],showNote:false,text:'ここを押して、「'+question.reading[index]+'」を'+definition.beats[index]+'拍にしてみよう。',step:'STEP 2 / 拍をつくる'});return;}
    }else{
      const index=pitch.findIndex((v,i)=>v!==definition.pitch[i]);
      if(index>=0){guide.set(answer.querySelectorAll('.pitch-column')[index].querySelectorAll('button')[definition.pitch[index]==='high'?0:1],{highlight:[answer,judge],showNote:false,text:'「'+question.reading[index]+'」を'+(definition.pitch[index]==='high'?'高く':'低く')+'してみよう。',step:'STEP 2 / 高低を選ぶ'});return;}
    }
    guide.set(judge,{highlight:[answer,judge],showNote:false,text:'できたら、ここを押して答えを確かめよう。',step:'STEP 2 / 答えを確かめる'});
  }
  function drawPitch(){
    answer.innerHTML='<div class="pitch-builder"><div class="pitch-row-labels"><span>高</span><span>低</span></div><div class="pitch-columns"></div></div>';
    const columns=answer.querySelector('.pitch-columns');columns.style.gridTemplateColumns='repeat('+n+',1fr)';
    let d='';pitch.forEach((p,i)=>{if(p)d+=(i&&pitch[i-1]?'L':'M')+(50+i*100)+' '+(p==='high'?19:57)+' ';});
    columns.innerHTML='<svg class="pitch-path" viewBox="0 0 '+n*100+' 76" preserveAspectRatio="none" aria-hidden="true"><path class="pitch-guide" d="M50 19 H'+(n*100-50)+' M50 57 H'+(n*100-50)+'"/><path class="pitch-line-path" d="'+d+'"/></svg>';
    question.reading.forEach((text,i)=>{const col=document.createElement('div');col.className='pitch-column';['high','low'].forEach(p=>{const b=document.createElement('button');b.className='pitch-choice '+(pitch[i]===p?'selected':'');b.setAttribute('aria-label',text+'を'+(p==='high'?'高':'低')+'くする');b.setAttribute('aria-pressed',String(pitch[i]===p));b.textContent='●';b.onclick=()=>{session.markVisualization();pitch[i]=p;feedback.textContent='';drawPitch();update();};col.append(b);});const label=document.createElement('b');label.textContent=text;col.append(label);columns.append(col);});
  }
  audio.addEventListener('play',()=>{if(!heard){cue.textContent='録音を聞いてみよう。聞き終わったら操作できます。';guide?.set(audio,{text:'聞き終わるまで、そのまま聞いてみよう。',step:'STEP 1 / 録音を聞く',point:false});}});
  audio.addEventListener('pause',()=>{if(!heard)update();});
  audio.addEventListener('ended',()=>{if(!active)return;heard=true;beatEditor?.setDisabled(false);update();});
  if(rhythm){answer.classList.add('explore-scroll');try{beatEditor=await mountBeatEditor(answer,{library,reading:question.reading,beats,blanks,disabled:!heard,onChange:()=>{session.markVisualization();feedback.textContent='';update();}});}catch(e){if(active){feedback.textContent='字形を読み込めません：'+e.message;judge.hidden=true;}return ()=>{active=false;guide?.dispose();session.leave();};}}
  else drawPitch();
  if(!root.isConnected){guide?.dispose();session.leave();return ()=>{};}update();
  judge.onclick=()=>{
    if(judge.disabled)return;
    const result=session.answer(rhythm?{kind:'rhythm',beats:[...beats],blanks:[...blanks]}:{kind:'answer',pitch:[...pitch]});
    if(result.completed){solved=true;feedback.textContent=guided?'すごい！上手にできました。'+(rhythm?'「ぷ」が2拍になったね。':'「からだ」のH・L・Lをつくれたね。'):'正解です。聞こえた拍を再現できました。';next.hidden=false;beatEditor?.setDisabled(true);onCorrect?.();onComplete?.(question.id);}
    else feedback.textContent=guided?(rhythm?'もう少し！「ぷ」だけを2拍にしてみよう。':'もう少し！高・低・低の順に選んでみよう。'):'拍の構成が異なります。録音をもう一度聞いてみよう。';
    update();
  };
  return ()=>{active=false;guide?.dispose();beatEditor?.dispose?.();session.leave();};
}
