import {showModeTwoSurveyIfDue} from './surveyUI.js';
import {rememberComparison,rememberFullComparison,surveySession} from './data/surveySession.js';
import {saveStudyEvent} from './data/studyEvents.js';
import {mode2SurveyDue} from './data/surveyConfig.js';
import {openArtworkExport} from './artworkExport.js';
import {mountModeTwoResultJourney} from './modeTwoJourney.js';
import {journeyVersion} from './data/modeTwoJourneyModel.js';
import {mountModeThree} from './modeThree.js';
import {toVisualPreview} from './data/modeTwoVisual.js';
import {kanaStatistics} from './data/groupResults.js';
import {featuresFor} from './data/explorationFeatures.js';
import {getExplorationAggregate} from './data/explorationStore.js';
import {retryPending,attachLevelVersion} from './data/cloudCollection.js';
import './modeTwoMake.css';
import './modeTwoResults.css';
const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
export async function mountModeTwoResult(root,{record,level,studyMode,onAgain,onNext,nextLevel,onLevelList,alive,aggregate}){
 let disposed=false,exportDispose=null,currentGroup=null,viewObserver=null,modal=null,groupDispose=null;
 const cleanups=[];const live=()=>!disposed&&root.isConnected&&alive();
 const dispose=()=>{disposed=true;exportDispose?.();groupDispose?.();viewObserver?.disconnect();modal?.close();cleanups.forEach(fn=>fn?.());};
 root.innerHTML='<section class="explore-results mode2-make-results mode2-group-results"><section class="mode2-answer-block mode2-average-block"><div class="mode2-answer-title"><h1>みんなの聞こえ方</h1><span data-respondents></span><button class="result-png-button" data-average-export disabled>画像を保存</button></div><div data-average-preview role="status">集計中…</div><p class="mode2-group-context" data-context></p></section><section class="mode2-answer-block mode2-personal-block"><div class="mode2-answer-title"><h2>あなたの聞こえ方</h2><button class="result-png-button" data-personal-export disabled>画像を保存</button></div><div data-personal-preview></div></section><button class="outline-button mode2-compare-button" data-compare disabled>あなたとみんなの表現を比較する</button><div class="mode2-result-actions" data-result-actions></div><p class="mode2-rate-explanation">表示されている割合は、発音の違いを感じた回答者の比率です。発音の正誤や違いの大きさを示すものではありません。</p></section>';
 const area=root.querySelector('[data-average-preview]'),personal=root.querySelector('[data-personal-preview]'),actions=root.querySelector('[data-result-actions]'),personalSave=root.querySelector('[data-personal-export]'),averageSave=root.querySelector('[data-average-export]'),compare=root.querySelector('[data-compare]');
 const again=el('button','outline-button','もう一度つくる'),next=el('button','judge-button',nextLevel?'次のことばへ →':'ことばの一覧へ');again.onclick=onAgain;next.onclick=async()=>{next.disabled=true;try{await showModeTwoSurveyIfDue(studyMode);if(live())nextLevel?onNext?.(studyMode):onLevelList?.();}finally{next.disabled=false;}};actions.append(again,next);
 const questionnaire=el('button','outline-button','体験後アンケート');questionnaire.hidden=true;questionnaire.onclick=async()=>{await showModeTwoSurveyIfDue(studyMode);questionnaire.hidden=!mode2SurveyDue(surveySession(studyMode));};actions.append(questionnaire);
 function rememberView(){if(!currentGroup?.count||record.skipped||record.sync?.status==='fixture')return;rememberComparison(studyMode,level.id,{otherAnswersAvailable:currentGroup.otherAnswersAvailable??null,source:currentGroup.source||'local'});questionnaire.hidden=!mode2SurveyDue(surveySession(studyMode));}
 async function preview(host,data,options={}){const cleanup=await mountModeThree(host,{level,preview:toVisualPreview(data,level),...options});if(!live())cleanup?.();return cleanup;}
 function exportAnswer(data,host,title,suffix){exportDispose?.();exportDispose=openArtworkExport({level,artwork:data,referenceElement:host,title,fileSuffix:suffix});}
 personalSave.onclick=()=>exportAnswer(record,personal,'あなたの聞こえ方','自分');averageSave.onclick=()=>currentGroup&&exportAnswer(currentGroup,area,'みんなの聞こえ方','みんな');
 cleanups.push(await preview(personal,record,{displayBase:120}));if(!live())return dispose;personalSave.disabled=false;
 function dialog(title){modal?.close();const d=el('dialog','mode2-comparison-dialog'),head=el('header'),h=el('h2','',title),close=el('button','outline-button','閉じる');close.onclick=()=>d.close();head.append(h,close);d.append(head);document.body.append(d);d.addEventListener('close',()=>{d.querySelectorAll('.mode-three').forEach(n=>n.modeThreeSession?.dispose());d.remove();if(modal===d)modal=null;},{once:true});d.addEventListener('click',e=>{if(e.target===d)d.close();});d.showModal();modal=d;return d;}
 async function detail(index){
  if(!currentGroup?.count)return;const stats=kanaStatistics(currentGroup,index),d=dialog('「'+level.characters[index].text+'」の聞こえ方');
  const label=el('p','','違いを感じた人の割合'),value=el('strong','mode2-detail-rate',Math.round(stats.rate*100)+'%');label.append(value);d.append(label,el('p','',stats.marked+'人 / '+stats.total+'人'));
  d.append(el('h3','','選ばれた表現'),el('p','mode2-detail-denominator','割合は回答者 '+stats.total+'人をもとに表示'));
  const variants=featuresFor(level.characters[index]);let previewHost=null;
  for(const p of stats.patterns){const f=variants.find(f=>f.id===p.id),b=el('button','mode2-pattern-stat');b.append(el('span','',f?.label||f?.title||f?.name||p.id),el('b','',p.count+'人 · '+Math.round(p.rate*100)+'%'));b.onclick=async()=>{previewHost?.modeThreeSession?.dispose();if(!previewHost){previewHost=el('div','mode2-detail-art');d.append(previewHost);}const featureRates=currentGroup.featureRates.map((rates,i)=>i===index?{[p.id]:p.rate}:rates);await preview(previewHost,{...currentGroup,featureRates},{displayBase:105});};d.append(b);}
  d.append(el('p','mode2-unspecified','形は選ばずにマーク：'+stats.unspecified+'人'+(stats.total?' · '+Math.round(stats.unspecified/stats.total*100)+'%':'')));
  if(!stats.patterns.length)d.append(el('p','','選ばれた形はまだありません。'));
 }
 async function rememberFull(){
  const s=surveySession(studyMode);rememberFullComparison(studyMode,level.id);
  if(record.sync?.status==='fixture')return;
  const key='mode2-full-comparison:'+s.id+':'+record.id;let id;try{id=localStorage.getItem(key);if(id)return;id=crypto.randomUUID();localStorage.setItem(key,id);}catch{id=crypto.randomUUID();}
  try{const versioned=await attachLevelVersion({recordingId:record.recordingId},level);await saveStudyEvent({id,event_type:'comparison_view',studyMode,gameMode:'mode2',chapter:'exploration',response_status:'answered',session_id:s.id,levelId:level.id,recordingId:versioned.recordingId,levelVersion:versioned.levelVersion,full_comparison_viewed:true,other_answers_available:!!currentGroup.otherAnswersAvailable,valid_participant_count:currentGroup.count,aggregation_policy:currentGroup.aggregationPolicy,local_only:Boolean(import.meta.env.DEV&&new URLSearchParams(location.search).has('qa-local'))});}catch{try{localStorage.removeItem(key);}catch{}}
 }
 compare.onclick=async()=>{
  if(!currentGroup?.count)return;rememberView();void rememberFull();const d=dialog('聞こえ方を見比べる');
  for(const [title,data]of [['みんなの聞こえ方',currentGroup],['あなたの聞こえ方',record]]){const block=el('section','mode2-compare-art'),host=el('div');block.append(el('h3','',title),host);d.append(block);await preview(host,data,{displayBase:100});if(!d.isConnected)return;}
  const examples=currentGroup.expressionExamples||currentGroup.commonExamples||[];if(!examples.length)return;
  const block=el('section','mode2-all-expressions'),label=el('h3','','それぞれの聞こえ方'),art=el('div','mode2-expression-art'),navigation=el('nav'),back=el('button','outline-button','←'),forward=el('button','outline-button','→'),page=el('span');back.setAttribute('aria-label','前の表現');forward.setAttribute('aria-label','次の表現');navigation.append(back,page,forward);block.append(label,art,navigation);d.append(block);let index=0,rendering=false;
  async function draw(){if(rendering)return;rendering=true;back.disabled=forward.disabled=true;art.modeThreeSession?.dispose();const item=examples[index];page.textContent=(index+1)+' / '+examples.length+' · '+item.count+'人';await preview(art,item.answer,{displayBase:105});back.disabled=index===0;forward.disabled=index===examples.length-1;rendering=false;}
  back.onclick=()=>{if(index>0){index--;void draw();}};forward.onclick=()=>{if(index<examples.length-1){index++;void draw();}};await draw();
 };
 async function show(group){
  if(!live())return;groupDispose?.();currentGroup=null;area.replaceChildren();averageSave.disabled=compare.disabled=true;
  const count=Number(group.count)||0;root.querySelector('[data-respondents]').textContent=count?'回答者数 '+count+'人':'未集計';
  if(!count){area.textContent='まだ回答が集まっていません';root.querySelector('[data-context]').textContent='';return;}
  currentGroup={...group,markedColoring:true};groupDispose=await preview(area,currentGroup,{displayBase:220,resultStatistics:true,onKanaClick:detail});if(!live())return;
  root.querySelector('[data-context]').textContent=group.includesViewer?(group.otherAnswersAvailable?'あなたの回答を含む':'あなたの回答を含む · ほかの回答はまだありません'):'あなたの回答はまだ集計に含まれていません';
  // A fully omitted kana still has an accessible statistics entry.
  const omitted=level.characters.map((c,i)=>({c,i})).filter(({i})=>group.beats[i]===0);if(omitted.length){const list=el('div','mode2-omitted-stats');for(const {c,i}of omitted){const b=el('button','text-action',c.text+' '+Math.round(group.noticedRates[i]*100)+'%');b.onclick=()=>detail(i);list.append(b);}area.append(list);}
  averageSave.disabled=compare.disabled=false;viewObserver?.disconnect();viewObserver=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)&&live()){rememberView();viewObserver.disconnect();}},{threshold:.15});viewObserver.observe(area);
 }
 async function load(){try{await show(aggregate||await getExplorationAggregate(level,{studyMode}));}catch{if(live()){area.textContent='集計を読み込めませんでした';const b=el('button','outline-button','もう一度読み込む');b.onclick=()=>{b.disabled=true;void load();};area.append(b);root.querySelector('[data-respondents]').textContent='未取得';}}}
 await load();if(!live())return dispose;
 if(record.sync?.status==='pending'){const b=el('button','outline-button','保存を確認・再送');b.onclick=async()=>{b.disabled=true;try{record.sync=await retryPending(record,level);if(live()){b.remove();await load();}}catch{b.disabled=false;}};actions.append(b);}
 if(currentGroup&&record.tutorial_version===journeyVersion&&record.tutorial_status==='completed'&&level.word==='かりきゅらむ'){
  const key='namari-mode2-result-guide:group-v2:'+journeyVersion+':'+(record.participantId||'local');let seen=false;try{seen=localStorage.getItem(key)==='1';}catch{}if(!seen)cleanups.push(mountModeTwoResultJourney(root,()=>{try{localStorage.setItem(key,'1');}catch{}}));
 }
 return dispose;
}
