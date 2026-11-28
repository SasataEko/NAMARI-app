import {mountModeThree} from './modeThree.js';
import {mountModeTwoResult} from './modeTwoResult.js';
import {modeTwoInteractionVersion} from './data/modeTwoVisual.js';
import './modeTwoMake.css';
import {decorateSticker,syncSticker,decorateBeatMarker} from './glyph/sticker.js';
import {createEditHistory} from './editHistory.js';
import {mountBeatChoices} from './beatChoices.js';
import {appendReductionControls,beatVisual,toggleBeatSelection} from './rhythmReduction.js';
import {linkedMora,linkPitch} from './data/linkedPitch.js';
import {wordRows,wrapWordUnits,fitWordStage,observeWordStage} from './wordLayout.js';
import {isSymbolSwitch,paintWholeGlyph,animateWholeGlyphSwitch,symbolDistribution} from './glyph/symbolSwitch.js';
import {ensureParticipation,chapterRating} from './studyUI.js';
import {studyMetadata,tutorialMetadata,markTutorial,MODE_TWO_TUTORIAL_VERSION} from './data/researchState.js';
import {createComparisonMetrics,mountReferenceAudio} from './audioComparison.js';
import { createTutorialGuide } from './tutorialGuide.js';
import { answerPreviewAggregate } from './data/answerPreview.js';
import { retryPending, collectionConfig, readOutbox, retryAllPending } from './data/cloudCollection.js';
import { loadGlyph } from './glyph/loadGlyph.js';
import { createMorph, setMorphIntensity } from './glyph/morph.js';
import { featuresFor } from './data/explorationFeatures.js';
import { saveExploration, getExplorationAggregate, defaultAccent, pitchValue, participantId } from './data/explorationStore.js';
import { studyConfig } from './data/studyConfig.js';
import './exploration.css';

const ns = 'http://www.w3.org/2000/svg';
const labels = { segment: '母音/子音', pitch: 'アクセント', duration: '拍' };
const ease = t => t * t * (3 - 2 * t);
function restoreResultToolbar(root){
  const bar=root.closest('main')?.querySelector('.play-return-bar');if(!bar)return;const back=bar.querySelector('.title-return');if(back){back.innerHTML=back.dataset.originalHtml||back.innerHTML;back.removeAttribute('aria-label');back.removeAttribute('title');bar.before(back);}bar.remove();
}
export function mountExploration(root, { level, profileId, studyMode = studyConfig.defaultMode, nextLevel = null, onNext, onLevelList,onSkipTutorial }) {
  restoreResultToolbar(root);root.classList.add('mode-two-lab');
  if(level.tutorial||level.visualExperiment)studyMode='test';
  if(!['test','research'].includes(studyMode))studyMode='test';
  const anonymousId=participantId(), startedAt=new Date().toISOString(), started=performance.now();
  const comparison=createComparisonMetrics();
  const audioMetrics={audioPlayed:false,audioCompleted:false,audioPlayCount:0,listenedMs:0};
  let lastAudioTime=null;
  const accountAudio=()=>{const audio=root.querySelector('audio');if(!audio)return;if(lastAudioTime!==null){const delta=audio.currentTime-lastAudioTime;if(delta>0&&delta<1)audioMetrics.listenedMs+=delta*1000;}lastAudioTime=audio.currentTime;};
  const n = level.characters.length;
  level={...level,defaultAccent:defaultAccent(level)};
  const state = { noticed:Array(n).fill(false), pattern:Array(n).fill(null), markingReason:Array(n).fill(null), answerStatus:'explored', features: Array(n).fill(null), intensity: Array(n).fill(0), pitch: defaultAccent(level), beats: Array(n).fill(1), blanks: Array(Math.max(0,n-1)).fill(false), touched: {segment:false,pitch:false,duration:false} };
  const reduction={index:null,history:[],hasDeleted:false};
  const edits=createEditHistory({capture:()=>({state,reduction,selected,mode}),restore:s=>{Object.assign(state,s.state);Object.assign(reduction,s.reduction);selected=s.selected;mode=s.mode;renderEditor();}});
  function remember(){edits.checkpoint();const undo=root.querySelector('[data-undo]');if(undo)undo.disabled=false;}
  let tutorialTour=null,resultGuide=null,artworkState=null,resultDispose=null;
  const acceptArtwork=art=>{if(artworkState)comparison.markVisual();artworkState=art;state.noticed=art.noticed.map((v,i)=>Boolean(v||art.patterns[i]));state.pattern=[...art.patterns];state.features=[...art.patterns];state.intensity=art.patterns.map(Boolean).map(Number);state.pitch=[...art.pitch];state.beats=[...art.beats];state.blanks=[...art.blanks];state.emphasis=[...art.emphasis];state.glyphAngles={...art.glyphAngles};state.backgroundAngles={...art.backgroundAngles};state.interactionVersion=modeTwoInteractionVersion;};
  let toneSequence = 0;
  let mode = 'segment', selected = null, ready = false, busy = false, glyphs;
  const animations = new WeakMap();
  const stageObservers=new Set();
  const clearStageObservers=()=>{stageObservers.forEach(o=>o.disconnect());stageObservers.clear();};
  root.explorationSession?.dispose?.();
  const session = {dispose(){editor?.modeThreeSession?.dispose();resultDispose?.();clearStageObservers();tutorialTour?.dispose();resultGuide?.dispose();}}; root.explorationSession = session;
  const alive = () => root.isConnected && root.explorationSession === session;
  function svgFor(i) {
    const svg = document.createElementNS(ns,'svg'); svg.setAttribute('viewBox',glyphs[i].normal.viewBox);svg.setAttribute('role','img');svg.setAttribute('aria-label',level.characters[i].text);
    if(glyphs[i].normal.text){const text=document.createElementNS(ns,'text');text.textContent=glyphs[i].normal.text;text.setAttribute('x','85.04');text.setAttribute('y','85.04');text.setAttribute('text-anchor','middle');text.setAttribute('dominant-baseline','central');text.setAttribute('font-size','100');text.setAttribute('fill','currentColor');svg.append(text);}
    for(const shape of glyphs[i].normal.shapes) {const p=document.createElementNS(ns,'path');p.setAttribute('d',shape.d);p.setAttribute('fill',shape.fill);if(shape.fillRule)p.setAttribute('fill-rule',shape.fillRule);svg.append(p);}
    return decorateSticker(svg,i);
  }
  function paint(svg,i,feature,intensity,animate=false) {
    if(glyphs[i].normal.text){fitGlyph(svg,i);return;}
    const previous=animations.get(svg);
    if(previous){cancelAnimationFrame(previous.frame);previous.cancel?.();}svg.style.opacity='1';
    const variant=glyphs[i].variants.find(v=>v.id===feature);
    if(isSymbolSwitch(variant)){
      const from=svg.dataset.symbolFeature===feature?glyphs[i].normal:{viewBox:svg.dataset.glyphViewBox||glyphs[i].normal.viewBox,shapes:[...svg.querySelectorAll(':scope > path')].map(p=>({d:p.getAttribute('d'),fillRule:p.getAttribute('fill-rule')||''}))};
      svg.dataset.symbolFeature=feature;svg.dataset.symbolSwitch='true';
      const apply=()=>{paintWholeGlyph(svg,intensity?variant.custom:glyphs[i].normal);fitGlyph(svg,i);};
      if(animate&&intensity){const token={};animations.set(svg,token);token.cancel=animateWholeGlyphSwitch(svg,from,variant.custom,{onFrame:()=>fitGlyph(svg,i),onDone:()=>animations.delete(svg)});}else{apply();animations.delete(svg);}return;
    }
    if(svg.dataset.symbolSwitch==='true')paintWholeGlyph(svg,glyphs[i].normal);
    svg.dataset.symbolSwitch='false';svg.dataset.symbolFeature='';svg.dataset.glyphViewBox=glyphs[i].normal.viewBox;
    const morph=glyphs[i].variants.find(v=>v.id===feature)?.morph;
    const target=morph?intensity:0;
    const apply=value=>{
      if(morph)setMorphIntensity([...svg.querySelectorAll(':scope > path')],morph,value);
      else [...svg.querySelectorAll(':scope > path')].forEach((path,j)=>path.setAttribute('d',glyphs[i].normal.shapes[j].d));
      syncSticker(svg);svg.dataset.amount=String(value);fitGlyph(svg,i);
    };
    svg.dataset.feature=feature||'';
    // Unmark/unclear restores the original immediately. Each explicit Pattern
    // preview restarts from the original, including reselecting the same card.
    if(!animate||!morph||target===0){apply(target);animations.delete(svg);return;}
    apply(0);
    const start=performance.now(),token={frame:0};animations.set(svg,token);
    const tick=now=>{
      if(!svg.isConnected)return;
      const t=Math.min(1,(now-start)/900);apply(target*ease(t));
      if(t<1)token.frame=requestAnimationFrame(tick);else animations.delete(svg);
    };
    token.frame=requestAnimationFrame(tick);
  }
  function paintAverage(svg,i,rates) {
    if(glyphs[i].normal.text)return;
    const morphVariants=glyphs[i].variants.filter(v=>!isSymbolSwitch(v));
    let current=glyphs[i].normal.shapes.map(s=>s.d),weight=Math.max(0,1-morphVariants.reduce((sum,v)=>sum+(rates[v.id]||0),0));
    for(const variant of morphVariants){const rate=rates[variant.id]||0;if(!rate)continue;const total=weight+rate;current=weight===0?variant.morph.to:createMorph(current,variant.morph.to).map(f=>f(rate/total));weight=total;}
    [...svg.querySelectorAll(':scope > path')].forEach((path,j)=>path.setAttribute('d',current[j]));
    syncSticker(svg);svg.setAttribute('aria-label',`${level.characters[i].text} 変形選択率 ${Math.round(Object.values(rates).reduce((a,b)=>a+b,0)*100)}%`);
  }
  function fitGlyph(svg,i) {
    if(!svg.isConnected)return;
    const ink=svg.getBBox();
    if(!ink.width)return;
    const [,y,,height]=(svg.dataset.glyphViewBox||glyphs[i].normal.viewBox).trim().split(/[ ,]+/).map(Number);
    const width=ink.width*80/height+80*Math.max(0,Number(svg.dataset.beats)-1);
    // Remove SVG canvas side bearings, then keep the same 16px ink-to-ink gap.
    svg.setAttribute('viewBox',`${ink.x} ${y} ${ink.width} ${height}`);
    svg.setAttribute('preserveAspectRatio',Number(svg.dataset.beats)>1?'none':'xMidYMid meet');
    svg.style.width=`${width}px`;svg.style.transform='none';svg.dataset.inkRatio=String(ink.width/height);
    svg.closest('.explore-unit').style.width=`${width+16}px`;
    const stage=svg.closest('.explore-stage');if(stage){fitWordStage(stage);if(stage.toneData)toneLayer(stage,stage.toneData);}
  }
  function accentBuilder(data) {
    const box=document.createElement('div');box.className='explore-tone-controls';
    for(const indices of wordRows(level.characters.map(c=>c.text))){const row=document.createElement('div');row.className='tone-control-row';row.style.gridTemplateColumns='repeat('+indices.length+',minmax(0,1fr))';box.append(row);indices.forEach(i=>{const c=level.characters[i];
      const col=document.createElement('div');col.className='explore-tone-control accent-dot-column';
      const name=document.createElement('b');name.textContent=c.text;col.append(name);
      ['high','low'].forEach(p=>{
        const button=document.createElement('button');button.className='accent-dot';button.dataset.pitch=p;
        button.setAttribute('aria-label',c.text+'を'+(p==='high'?'高':'低')+'くする');
        button.setAttribute('aria-pressed',String(data.pitch[i]===p));button.disabled=linkedMora(level.characters.map(c=>c.text),i);if(button.disabled)button.title='前の拍と連動';
        button.onclick=()=>{if(state.pitch[i]===p)return;remember();comparison.markVisual();state.pitch[i]=p;state.pitch=linkPitch(level.characters.map(c=>c.text),state.pitch);state.touched.pitch=true;renderEditor();tutorialTour?.notify('pitch');};col.append(button);
      });row.append(col);
    });}return box;
  }
  function toneLayer(stage,data) {
    const layer=stage.querySelector('.explore-tone-layer');if(!layer)return;
    const bounds=stage.getBoundingClientRect();
    const pitchStep=Math.min(36,(parseFloat(stage.style.getPropertyValue('--word-size'))||80)*.45);
    const points=[...stage.querySelectorAll('.explore-kana')].map((kana,i)=>{
      const rect=kana.getBoundingClientRect();
      // With binary high/low answers, distance from the default equals the
      // aggregate share of answers that chose the other pitch. Marking is independent.
      const rate=Math.max(0,Math.min(1,Math.abs(pitchValue(data.pitch[i])-pitchValue(level.defaultAccent[i]))));
      const blue=[128,190,219],yellow=[245,196,0];
      return {visible:rect.width>0&&data.beats[i]>0,opacity:beatVisual(data.beats[i],data.omissionRates?.[i]).survival,row:kana.closest('.word-row')?.dataset.wordRow,x:rect.left-bounds.left+rect.width/2,y:rect.top-bounds.top+rect.height/2+pitchStep/2-pitchStep*pitchValue(data.pitch[i]),color:'rgb('+blue.map((v,j)=>Math.round(v+(yellow[j]-v)*rate)).join(',')+')'};
    }).filter(p=>p.visible);
    layer.setAttribute('viewBox','0 0 '+bounds.width+' '+bounds.height);
    const prefix=layer.dataset.toneId,wordSize=parseFloat(stage.style.getPropertyValue('--word-size'))||80;
    layer.style.setProperty('--tone-stroke',Math.max(1.5,wordSize/20)+'px');
    const defs=points.slice(1).map((p,i)=>'<linearGradient id="'+prefix+'-'+i+'" gradientUnits="userSpaceOnUse" x1="'+points[i].x+'" y1="'+points[i].y+'" x2="'+p.x+'" y2="'+p.y+'"><stop stop-color="'+points[i].color+'"/><stop offset="1" stop-color="'+p.color+'"/></linearGradient>').join('');
    const lines=points.slice(1).map((p,i)=>p.row!==points[i].row?'':'<line x1="'+points[i].x+'" y1="'+points[i].y+'" x2="'+p.x+'" y2="'+p.y+'" stroke="url(#'+prefix+'-'+i+')"/>').join('');
    layer.innerHTML='<defs>'+defs+'</defs>'+lines+points.map(p=>'<circle cx="'+p.x+'" cy="'+p.y+'" r="'+Math.min(15.33,wordSize*15.33/80)+'" fill="'+p.color+'" opacity="'+p.opacity+'"/>').join('');
  }
  function makeStage(data,editing=false) {
    const stage=document.createElement('div');stage.className='explore-stage';stage.dataset.tool=editing?mode:'result';stage.dataset.patternCards=String(editing&&mode==='segment'&&selected!==null);if(root.querySelector('.explore-results'))stage.dataset.resultRows=String(wordRows(level.characters.map(c=>c.text)).length*2);
    level.characters.forEach((c,i)=>{
      const unit=document.createElement('div');unit.className=`explore-unit ${data.beats[i]===2?'is-two-beats':''}`;unit.style.width=`${data.beats[i]*90}px`;unit.hidden=data.beats[i]===0;unit.style.opacity=String(beatVisual(data.beats[i],data.omissionRates?.[i]).survival);
      const kana=document.createElement(editing?'button':'div');kana.className='explore-kana';kana.classList.toggle('marked',editing&&mode==='segment'&&selected===i);kana.classList.toggle('has-answer',data.features[i]!==null);kana.style.transform='none';
      const svg=svgFor(i);svg.style.width='80px';svg.style.height='80px';svg.setAttribute('preserveAspectRatio','xMidYMid meet');svg.dataset.beats=String(data.beats[i]);svg.dataset.omissionRate=String(data.omissionRates?.[i]??(data.beats[i]===0?1:0));kana.append(svg);paint(svg,i,data.features[i],data.features[i]&&data.features[i]!=='none'?1:0);if(data.featureRates)paintAverage(svg,i,data.featureRates[i]);
      const noticedRate=data.noticedRates?data.noticedRates[i]:(data.noticed?.[i]?1:0);
      const rate=data.noticedRates?Math.max(0,Math.min(1,noticedRate)):0;
      // Color uses all noticed answers; shape continues to use featureRates only.
      const base=[35,24,21],red=[229,35,91];
      kana.style.color=`rgb(${base.map((v,j)=>Math.round(v+(red[j]-v)*rate)).join(', ')})`;
      kana.dataset.noticedRate=String(rate);
      decorateSticker(svg,i,{aggregate:Boolean(data.noticedRates)});
      svg.setAttribute('aria-label',`${c.text} ・マーク ${Math.round(noticedRate*100)}%${data.featureRates?` ・Pattern ${Math.round(Object.values(data.featureRates[i]).reduce((a,b)=>a+b,0)*100)}%`:''}`);
      if(editing){kana.dataset.kana=i;kana.setAttribute('aria-label',`${c.text}を${selected===i?'選択解除':'選ぶ'}`);kana.setAttribute('aria-pressed',String(state.noticed[i]));kana.onclick=()=>{if(mode==='duration'){if(reduction.kind==='blank')reduction.index=null;reduction.kind='base';if(toggleBeatSelection(state.beats,i,reduction))renderEditor();return;}if(mode!=='segment')return;remember();if(selected===i){state.noticed[i]=false;state.pattern[i]=null;state.markingReason[i]=null;state.features[i]=null;state.intensity[i]=0;selected=null;}else{comparison.markVisual();selected=i;state.noticed[i]=true;state.markingReason[i]||='noticed_only';state.answerStatus='explored';}state.touched.segment=state.noticed.some(Boolean);renderEditor();tutorialTour?.notify('kana');};}
      if(editing&&mode==='duration'){kana.classList.toggle('beat-selected',reduction.index===i&&reduction.kind!=='blank');kana.setAttribute('aria-pressed',String(reduction.index===i&&reduction.kind!=='blank'));kana.setAttribute('aria-label',(i+1)+'拍目の「'+c.text+'」を'+(reduction.index===i?'選択解除':'選ぶ'));}
      unit.append(kana);
      stage.append(unit);
      if(i<n-1){const gap=document.createElement('div');gap.className=`explore-gap ${data.blanks[i]?'has-blank':''}`;gap.hidden=data.beats[i]===0&&!data.blanks[i];
        if(data.blanks[i]){gap.style.width=`${data.aggregation==='mean'?80:80*Number(data.blanks[i])}px`;const blank=document.createElement(editing&&mode==='duration'?'button':'div');blank.className='explore-blank-cell';blank.setAttribute('role',editing&&mode==='duration'?'button':'img');blank.setAttribute('aria-label',`追加拍 ${Number(data.blanks[i]).toFixed(2)}拍`);blank.innerHTML='<span aria-hidden="true">ッ</span>';if(data.aggregation==='mean')blank.querySelector('span').dataset.blankRate=String(Number(data.blanks[i]));if(editing&&mode==='duration'){blank.type='button';blank.setAttribute('aria-label',c.text+'の後の「ッ」を選ぶ');blank.classList.toggle('beat-selected',reduction.kind==='blank'&&reduction.index===i);blank.onclick=()=>{reduction.index=reduction.kind==='blank'&&reduction.index===i?null:i;reduction.kind='blank';renderEditor();};}decorateBeatMarker(blank.querySelector('span'),i);gap.append(blank);}
        stage.append(gap);}
     });
    // Measure the completed row offscreen in this task, before it can be painted.
    // Rebuilding for a selection must never expose the provisional 90px cells.
    const measure=document.createElement('div');
    measure.setAttribute('aria-hidden','true');
    measure.style.cssText='position:fixed;left:-100000px;top:0;visibility:hidden;pointer-events:none;';
    wrapWordUnits(stage,level.characters.map(c=>c.text));
    const host=root.querySelector('[data-word],[data-personal],[data-group]')||root;measure.style.width=Math.max(1,host.clientWidth)+'px';
    document.body.append(measure);measure.append(stage);
    try{
      stage.querySelectorAll('.explore-kana svg').forEach((svg,i)=>fitGlyph(svg,i));
      const layer=document.createElementNS(ns,'svg');layer.classList.add('explore-tone-layer');layer.dataset.toneId='explore-tone-'+(++toneSequence);layer.setAttribute('aria-hidden','true');stage.prepend(layer);
      stage.toneData=data;toneLayer(stage,data);
    }
    finally{stage.remove();measure.remove();}
    queueMicrotask(()=>{
      if(!alive()||!stage.isConnected)return;
      toneLayer(stage,data);
      const observer=observeWordStage(stage,()=>{if(alive())toneLayer(stage,data);});
      stageObservers.add(observer);stage.wordLayoutObserver=observer;
    });
    if(!editing){const rates=data.omissionRates||data.beats.map(b=>b===0?1:0);const entries=rates.map((rate,i)=>rate>0?(i+1)+'：'+level.characters[i].text+' '+Math.round(rate*100)+'%':null).filter(Boolean);if(entries.length){const note=document.createElement('p');note.className='beat-omission-note';note.textContent=data.aggregation==='mean'?'拍を減らした割合 · '+entries.join(' ／ '):'減らした拍 · '+entries.map(t=>t.replace(' 100%','')).join(' ／ ');stage.append(note);}}
    return stage;
  }
  // Keep audio outside the editing area so changing tools never interrupts playback.
  root.innerHTML=`<section class="explore-card"><p class="eyebrow">REALTIME EXPLORATION / 01</p><h1>これ、訛ってる？</h1>${level.visualExperiment?'<p class="visual-experiment-note">音声なしの字形実験です。正式研究データには含めません。</p>':`<audio controls preload="metadata" src="${level.audio}" aria-label="研究録音"></audio><p class="explore-listen-copy">発音を聞いてみよう</p><p class="explore-headphone-note">※イヤホン推奨します</p>`}<div class="explore-study-mode"><label>データモード <select aria-label="データモード"><option value="test">お試し</option><option value="research">研究参加</option></select></label><small data-mode-hint></small></div><p data-pending-queue></p><button class="text-action" data-retry-all hidden>未送信の回答を再送</button><div data-editor></div><p data-status role="status">字形を読み込んでいます…</p></section>`;
  const editor=root.querySelector('[data-editor]'), status=root.querySelector('[data-status]');
  const modeSelect=root.querySelector('.explore-study-mode select');modeSelect.value=studyMode;if(level.tutorial||level.visualExperiment)modeSelect.disabled=true;
  const modeHint=root.querySelector('[data-mode-hint]');modeHint.textContent=studyMode==='research'?'研究参加の回答として記録します。お試しとは分けて集計します。':'お試しデータのみ。研究集計には含めません。';
  modeHint.title=modeHint.textContent;modeHint.textContent=studyMode==='research'?'研究データとして保存':'研究集計には含めません';
  if(level.visualExperiment)modeHint.textContent='表示実験・端末保存のみ';
  collectionConfig().then(c=>{if(alive()&&(c.localProject||level.tutorial))modeHint.textContent=level.tutorial?'チュートリアルの練習回答です。この端末だけに保存し、正式研究には含めません。':'編集中のプロジェクトです。回答は端末に保存し、クラウドには送信しません。';}).catch(()=>{});
  modeSelect.onchange=async()=>{const intended=modeSelect.value;if(intended==='research'&&!await ensureParticipation('research')){modeSelect.value=studyMode;return;}localStorage.setItem('kotoba-last-study-mode',intended);mountExploration(root,{level,profileId,studyMode:intended,nextLevel,onNext,onLevelList});};
  const pendingCount=level.visualExperiment?0:readOutbox().length,pending=root.querySelector('[data-pending-queue]'),retryAll=root.querySelector('[data-retry-all]');
  pending.textContent=pendingCount?`${pendingCount}件の回答が端末で送信待ちです。`:'';retryAll.hidden=!pendingCount;
  if(pendingCount){const details=document.createElement('details');details.className='sync-queue';const summary=document.createElement('summary');summary.textContent='未送信の回答 '+pendingCount+'件';pending.before(details);details.append(summary,pending,retryAll);}
  retryAll.onclick=async()=>{retryAll.disabled=true;pending.textContent='送信を確認しています…';try{const n=await retryAllPending();pending.textContent=`${n}件の保存を確認しました。`;retryAll.hidden=!readOutbox().length;}catch(e){pending.textContent=e.message;}finally{retryAll.disabled=false;}};
  const audio=root.querySelector('audio');let referenceAudio=null;if(audio){referenceAudio=mountReferenceAudio(audio,level.referenceAudio,()=>comparison.referencePlayed());
  audio.addEventListener('play',()=>{audioMetrics.audioPlayed=true;audioMetrics.audioPlayCount++;comparison.learnerPlayed();lastAudioTime=audio.currentTime;tutorialTour?.playing();});
  audio.addEventListener('timeupdate',accountAudio);audio.addEventListener('pause',()=>{accountAudio();lastAudioTime=null;});
  audio.addEventListener('ended',()=>{accountAudio();audioMetrics.audioCompleted=true;lastAudioTime=null;tutorialTour?.notify('listened');});
  audio.addEventListener('seeking',()=>{lastAudioTime=null;});audio.addEventListener('seeked',()=>{lastAudioTime=audio.currentTime;});}


  function hasChanges(){
    return Boolean(state.emphasis?.length)||state.noticed.some(Boolean)||state.pattern.some(Boolean)||state.pitch.some((p,i)=>p!==level.defaultAccent[i])||state.beats.some(b=>b!==1)||state.blanks.some(Boolean);
  }
  function updateSubmitLabel(){const button=editor.querySelector('[data-submit]');if(button)button.textContent=hasChanges()?'こう聞こえます':'特に訛ってないよ';}
  function renderEditor(){
    if(!ready)return;clearStageObservers();
    mountModeThree(editor,{level,guided:level.word==='かりきゅらむ',onGuideState:status=>{markTutorial('mode2','exploration',status);Object.assign(state,{tutorial_version:MODE_TWO_TUTORIAL_VERSION,tutorial_completed:status==='completed'?true:status==='skipped'?false:null,tutorial_status:status});},initialState:artworkState,audioElement:audio,referenceAudioElement:referenceAudio,controlsElement:modeSelect.closest('.explore-study-mode'),onChange:acceptArtwork,onSubmit:async(art,skipped=false)=>{acceptArtwork(art);await submit(skipped);}});return;

    editor.innerHTML=`<div data-mode2-workarea><button class="edit-undo" data-undo ${edits.canUndo?'':'disabled'}>↶ 元に戻す</button><div class="explore-tools" role="group" aria-label="操作を選ぶ">${Object.entries(labels).map(([key,label])=>`<button data-mode="${key}" aria-pressed="${key===mode}">${label}</button>`).join('')}</div><p>${{segment:selected!==null?'同じ文字を押すと選択を取り消せます。':'気になる文字を選んでカードを試そう。同じ文字をもう一度押すと、回答を取り消せます。',pitch:'文字の上・下の点を選んで、音の流れを描こう。',duration:'文字を選んで、拍を増やしたり減らしたりできます。'}[mode]}</p><div class="explore-scroll" data-word></div><div data-features></div></div><div class="explore-actions"><button class="judge-button" data-submit>${hasChanges()?'こう聞こえます':'特に訛ってないよ'}</button><button class="outline-button" data-skip>スキップ</button></div>`;
    editor.querySelector('[data-word]').append(makeStage(state,true));if(mode==='duration')durationChoices(editor.querySelector('[data-word]'));
    editor.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;renderEditor();tutorialTour?.notify('mode:'+mode);});
    editor.querySelector('[data-undo]').onclick=()=>{if(edits.undo())status.textContent='ひとつ前に戻しました。';};
    editor.querySelector('[data-submit]').onclick=()=>submit(false);editor.querySelector('[data-skip]').onclick=()=>submit(true);
    if(mode==='pitch')editor.querySelector('[data-word]').after(accentBuilder(state,true));
    if(mode==='segment'&&selected!==null)renderCards();
    tutorialTour?.refresh();
  }
  function durationChoices(host){
    const i=reduction.index,valid=Number.isInteger(i),blank=reduction.kind==='blank';
    const box=mountBeatChoices(host,{text:valid?(blank?'ッ':level.characters[i].text):null,
      canLong:valid&&!blank&&state.beats[i]===1,canBlank:valid&&!blank&&i<state.blanks.length&&!state.blanks[i],
      onLong:()=>{remember();state.beats[i]=2;state.touched.duration=true;comparison.markVisual();renderEditor();tutorialTour?.notify('stretch');},
      onBlank:()=>{remember();state.blanks[i]=true;state.touched.duration=true;comparison.markVisual();renderEditor();tutorialTour?.notify('gap');},
      onDelete:()=>{remember();if(blank)state.blanks[i]=false;else state.beats[i]=Math.max(0,state.beats[i]-1);reduction.index=null;state.touched.duration=true;comparison.markVisual();renderEditor();}});
    if(valid){box.querySelector('[data-beat-choice=long]').dataset.stretchIndex=String(i);box.querySelector('[data-beat-choice=blank]').dataset.gapIndex=String(i);}
  }
  function renderCards(){
    const i=selected,c=level.characters[i],variants=glyphs[i].variants,panel=editor.querySelector('[data-features]');
    panel.innerHTML=`<section class="explore-features"><h2>「${c.text}」の聴こえ方</h2><p>${variants.length?'カードを選ぶと、字形の変化をプレビューします。':'この文字のパターンは未登録です。マークだけで記録できます。'}</p><p class="explore-cancel-hint">同じ文字をもう一度押すと、選択と回答を取り消せます。</p><div class="explore-feature-list"></div></section>`;
    const list=panel.querySelector('.explore-feature-list');
    const help=document.createElement('button');help.type='button';help.className='feature-help';help.textContent='説明';help.setAttribute('aria-label','発音パターンの説明を読む');help.onclick=()=>{
      const dialog=document.createElement('dialog');dialog.className='feature-info-dialog';const heading=document.createElement('h2');heading.textContent='「'+c.text+'」の聴こえ方';dialog.append(heading);
      for(const item of [...variants,{title:'違いは感じるけれど、うまく言えない',description:'マークだけを残し、字形は変えません。'}]){const title=document.createElement('h3'),text=document.createElement('p');title.textContent=item.title;text.textContent=item.description;dialog.append(title,text);}
      const close=document.createElement('button');close.textContent='閉じる';close.className='outline-button';const dismiss=()=>{dialog.close();dialog.remove();if(help.isConnected)help.focus({preventScroll:true});};close.onclick=dismiss;dialog.addEventListener('cancel',e=>{e.preventDefault();dismiss();});dialog.append(close);document.body.append(dialog);dialog.showModal();
    };panel.querySelector('.explore-features').append(help);

    [...variants,{id:'unclear',title:'違いは感じるけれど、うまく言えない',description:'マークだけを残し、字形は変えません。'}].forEach(v=>{
      const b=document.createElement('button');b.className='explore-feature';b.setAttribute('aria-pressed',String(state.pattern[i]===v.id||(v.id==='unclear'&&state.markingReason[i]==='unclear')));const title=document.createElement('b'),desc=document.createElement('small');title.textContent=v.title;desc.textContent=v.description;b.append(title,desc);b.onclick=()=>{remember();comparison.markVisual();state.noticed[i]=true;state.pattern[i]=v.id==='unclear'?null:v.id;state.features[i]=state.pattern[i];state.markingReason[i]=v.id==='unclear'?'unclear':'pattern';state.intensity[i]=state.pattern[i]?1:0;state.touched.segment=true;state.answerStatus='explored';const svg=editor.querySelector(`[data-kana="${i}"] svg`);paint(svg,i,v.id,state.intensity[i],true);updateSubmitLabel();renderCards();tutorialTour?.notify('pattern');};list.append(b);
    });

  }
  async function submit(skipped){
    if(busy||!ready)return;tutorialTour?.dispose();state.answerStatus=hasChanges()?'explored':'no_difference';accountAudio();busy=true;delete status.dataset.idle;status.textContent='回答を保存・送信しています…';editor.querySelectorAll('button,input').forEach(b=>b.disabled=true);
    try{const record={visualExperiment:!!level.visualExperiment,...studyMetadata(studyMode,'mode2','exploration'),...comparison.snapshot(audioMetrics.audioPlayCount),id:crypto.randomUUID(),schemaVersion:3,gameMode:'mode2',completed:!skipped,accuracy:null,errorCount:null,levelId:level.id,profileId,participantId:anonymousId,studyMode,startedAt,responseDurationMs:Math.round(performance.now()-started),...audioMetrics,createdAt:new Date().toISOString(),skipped,...structuredClone(state)};const saved=await saveExploration(record,level);if(alive())renderResult(saved);}catch{busy=false;status.textContent='保存できませんでした。もう一度お試しください。';renderEditor();}
  }
  function openWordPreview(data,title,trigger){
    const dialog=document.createElement('dialog');dialog.className='word-preview-dialog';const heading=document.createElement('h2');heading.textContent=title;const stage=makeStage(data);delete stage.dataset.resultRows;stage.dataset.enlarged='true';const close=document.createElement('button');close.className='outline-button';close.textContent='閉じる';
    const dismiss=()=>{const observer=stage.wordLayoutObserver;observer?.disconnect();if(observer)stageObservers.delete(observer);dialog.close();dialog.remove();if(trigger.isConnected)trigger.focus({preventScroll:true});};close.onclick=dismiss;dialog.addEventListener('cancel',e=>{e.preventDefault();dismiss();});dialog.append(heading,stage,close);document.body.append(dialog);dialog.showModal();fitWordStage(stage);toneLayer(stage,data);
  }
  async function renderResult(record){
    restoreResultToolbar(root);clearStageObservers();resultGuide?.dispose();editor.modeThreeSession?.dispose();
    resultDispose=await mountModeTwoResult(root,{record,level,studyMode,nextLevel,onNext,onLevelList,alive,onAgain:()=>mountExploration(root,{level,profileId,studyMode,nextLevel,onNext,onLevelList})});return;

    root.innerHTML=`<section class="explore-results" data-sync-mode="${record.sync?.status||'pending'}"><p class="eyebrow">YOUR PREVIEW</p><h1>あなたの聞こえ方</h1><p role="status">${level.visualExperiment?'表示実験を端末に保存しました（研究対象外）。':record.skipped?'スキップを保存しました。下書きのプレビューです。':'このブラウザーに保存しました。再回答しても正式集計の人数は増えません。'}</p><p data-cloud-status role="status"></p><button class="outline-button" data-cloud-retry hidden>保存を確認・再送</button><section data-personal-region><h2>あなたの答え</h2><button class="word-zoom" data-zoom-personal>拡大</button><p data-personal-tour hidden>この図形は、あなたがつくった聞こえ方です。</p><div class="explore-scroll" data-personal></div></section><section class="explore-group"><h2>みんなの答えと見比べる</h2><button class="word-zoom" data-zoom-group>拡大</button><p data-group-tour hidden>ここでは参加者の回答の平均を表示します。正解ではありません。表示例の場合は、あなたの回答を使っています。</p><p class="explore-simulation">${studyMode==='research'?'正式テスト':'お試し'} · このブラウザーの他の参加者のローカル集計（クラウド未接続）</p><div class="explore-scroll" data-group></div><p data-group-note>読み込み中…</p></section><div class="explore-actions"><button class="judge-button" data-next>${nextLevel?`次のことばへ：${nextLevel.word} →`:'ことばの一覧へ戻る'}</button><button class="outline-button" data-again>もう一度つくる</button></div></section>`;
    const next=root.querySelector('[data-next]');next.hidden=!(nextLevel&&onNext)&&!onLevelList;next.onclick=async()=>{if(nextLevel&&onNext)onNext(studyMode);else{if(!level.tutorial&&!level.visualExperiment)await chapterRating({gameMode:'mode2',chapter:'exploration',studyMode});onLevelList?.();}};
    const cloudStatus=root.querySelector('[data-cloud-status]'),retry=root.querySelector('[data-cloud-retry]');
    cloudStatus.textContent=record.sync?.status==='synced'?'Google Sheetsへの保存を確認しました。':record.sync?.status==='pending'?`端末には保存済み・Google Sheetsへの保存未確認。${record.sync.error}`:'ローカル保存モード';
    retry.hidden=record.sync?.status!=='pending';retry.onclick=async()=>{retry.disabled=true;cloudStatus.textContent='保存を確認・再送しています…';try{record.sync=await retryPending(record,level);if(alive())renderResult(record);}catch(e){cloudStatus.textContent=e.message;retry.disabled=false;}};
    const config=await collectionConfig().catch(()=>({enabled:false}));if(!alive())return;
    root.querySelector('.explore-simulation').textContent=config.localProject?'編集中のプロジェクト · このブラウザーに保存（クラウド送信なし）':config.enabled?`${studyMode==='research'?'正式研究':'お試し'} · Google Sheets集計（同じ録音・問題バージョン）`:`${studyMode==='research'?'正式研究':'お試し'} · このブラウザーの他の参加者のローカル集計`;
    root.querySelector('[data-personal]').append(makeStage(record));root.querySelector('[data-zoom-personal]').onclick=e=>openWordPreview(record,'あなたの答え（拡大）',e.currentTarget);root.querySelector('[data-again]').onclick=()=>mountExploration(root,{level,profileId,studyMode,nextLevel,onNext,onLevelList});
    const main=root.closest('main'),back=main?.querySelector(':scope > .title-return'),actions=root.querySelector('.explore-actions');
    if(back&&actions){const bar=document.createElement('div');bar.className='play-return-bar';back.dataset.originalHtml=back.innerHTML;back.setAttribute('aria-label',back.textContent.trim());back.title=back.textContent.trim();back.textContent='← ホームへ';back.before(bar);bar.append(back,actions);const nextButton=actions.querySelector('[data-next]'),again=actions.querySelector('[data-again]');if(nextButton){nextButton.setAttribute('aria-label',nextButton.textContent);nextButton.title=nextButton.textContent;nextButton.textContent=nextLevel?'次へ →':'一覧へ';}if(again){again.setAttribute('aria-label',again.textContent);again.textContent='やり直す';}}
window.scrollTo({top:0,behavior:'smooth'});
    const groupArea=root.querySelector('[data-group]'),groupNote=root.querySelector('[data-group-note]'),simulation=root.querySelector('.explore-simulation');
    let refreshResultGuide=null;
    function displayGroup(group){groupArea.replaceChildren(makeStage(group));root.querySelector('[data-zoom-group]').onclick=e=>openWordPreview(group,group.example?'みんなの答え（表示例・拡大）':'みんなの答え（拡大）',e.currentTarget);
      level.characters.forEach((c,i)=>{if(!glyphs[i].variants.some(isSymbolSwitch))return;
        const panel=document.createElement('section');panel.className='symbol-distribution';panel.dataset.directionIndex=String(i);const heading=document.createElement('h3');heading.textContent='「'+c.text+'」変化の方向と選択率';panel.append(heading);
        const note=document.createElement('p');note.textContent='上の文字に記号の割合は重ねません。変化の方向ごとに比率を示します。';panel.append(note);
        for(const choice of symbolDistribution(c.text,glyphs[i].variants,group.featureRates[i])){const row=document.createElement('div');row.className='symbol-distribution-row';const preview=svgFor(i);paintWholeGlyph(preview,choice.variant?.custom||glyphs[i].normal);preview.setAttribute('viewBox',(choice.variant?.custom||glyphs[i].normal).viewBox);preview.setAttribute('aria-label',choice.label+'の字形');const label=document.createElement('span');label.textContent=choice.label;const percent=document.createElement('b');percent.textContent=(choice.rate*100).toFixed(1)+'%';row.append(preview,label,percent);panel.append(row);}groupArea.append(panel);
      });
      const panels=[...groupArea.querySelectorAll('.symbol-distribution')];if(panels.length>1){const selector=document.createElement('select');selector.className='direction-selector';selector.setAttribute('aria-label','方向別の選択率を見る文字');for(const p of panels){const option=document.createElement('option');option.value=p.dataset.directionIndex;option.textContent='「'+level.characters[Number(option.value)].text+'」の方向別データ';selector.append(option);}const first=panels.find(p=>group.noticedRates?.[Number(p.dataset.directionIndex)]>0)||panels[0];selector.value=first.dataset.directionIndex;const show=()=>panels.forEach(p=>p.hidden=p.dataset.directionIndex!==selector.value);selector.onchange=show;show();panels[0].before(selector);}
      groupNote.textContent=group.example?'自分の回答を使った表示例です。ほかの参加者の統計としては数えません。':level.visualExperiment?'この端末の'+group.count+'件の実験回答（研究対象外）':group.count+'件の回答の平均（自分の回答を含む）。同じデータモード・録音・問題バージョンの回答だけを集計します。';simulation.textContent=group.example?'表示例 · あなたの回答':level.tutorial?'練習データ · このブラウザーの平均':level.visualExperiment?'表示実験 · このブラウザーだけの集計':group.source==='google-sheets'?(studyMode==='research'?'正式研究':'お試し')+' · Google Sheets集計':(studyMode==='research'?'正式研究':'お試し')+' · このブラウザーの平均';refreshResultGuide?.();}
    displayGroup(answerPreviewAggregate(record,level));
    if(level.tutorial){
      resultGuide=createTutorialGuide();const personal=root.querySelector('[data-personal-region]'),group=root.querySelector('.explore-group'),personalNote=root.querySelector('[data-personal-tour]'),groupTour=root.querySelector('[data-group-tour]');
      let step=0,finished=false;
      const originalDispose=resultGuide.dispose.bind(resultGuide);
      const showStep=()=>{
        personalNote.hidden=step!==0;groupTour.hidden=step!==1;
        const region=step===0?personal:group;
        const glyph=region.querySelector('.explore-kana svg')||region.querySelector('.explore-kana');
        resultGuide.set(glyph,{highlight:[region],showNote:false,scrollTarget:region,scrollBlock:'start'});
      };
      const advance=event=>{
        if(finished)return;
        if(event.type==='keydown'&&!['Enter',' ','Escape'].includes(event.key))return;
        // The click belongs to this explanation, never to a button behind it.
        event.preventDefault();event.stopImmediatePropagation();
        if(event.key==='Escape'||++step>=2){resultGuide.dispose();return;}
        showStep();
      };
      resultGuide.dispose=()=>{
        if(finished)return;finished=true;personalNote.hidden=true;groupTour.hidden=true;
        document.removeEventListener('click',advance,true);document.removeEventListener('keydown',advance,true);
        refreshResultGuide=null;originalDispose();
      };
      refreshResultGuide=()=>{if(!finished&&step===1)showStep();};
      document.addEventListener('click',advance,true);document.addEventListener('keydown',advance,true);
      showStep();

    }
    try{const group=await getExplorationAggregate(level,{studyMode});if(!alive())return;if(!group.suppressed&&group.count>0)displayGroup(group);}
    catch(error){if(alive())groupNote.textContent+=' '+(error.message.includes('Apps Script')?error.message:'クラウドの比較データは現在読み込めません。');}

  }
  Promise.all(level.characters.map(async c=>{const normal=c.normal?await loadGlyph(c.normal):{text:c.text,viewBox:'0 0 170.08 170.08',shapes:[]};const variants=await Promise.all(featuresFor(c).map(async v=>{const custom=await loadGlyph(v.svg);if(isSymbolSwitch(v))return {...v,custom};return {...v,morph:createMorph(normal.shapes.map(s=>s.d),custom.shapes.map(s=>s.d))};}));return {normal,variants};})).then(data=>{if(!alive())return;glyphs=data;ready=true;status.dataset.idle='true';status.textContent='どの操作も任意です。何も選ばず送信・スキップもできます。';renderEditor();}).catch(e=>{if(alive())status.textContent=`字形を読み込めませんでした：${e.message}`;});
}
