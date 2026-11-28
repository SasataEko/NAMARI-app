import {showModeTwoSurveyIfDue} from './surveyUI.js';
import {rememberComparison,surveySession} from './data/surveySession.js';
import {mode2SurveyDue} from './data/surveyConfig.js';
import {openArtworkExport} from './artworkExport.js';
import {mountModeTwoResultJourney} from './modeTwoJourney.js';
import {journeyVersion} from './data/modeTwoJourneyModel.js';
import {mountModeThree} from './modeThree.js';
import {toVisualPreview,visualStatistics} from './data/modeTwoVisual.js';
import {getExplorationAggregate} from './data/explorationStore.js';
import {answerPreviewAggregate} from './data/answerPreview.js';
import {retryPending} from './data/cloudCollection.js';
import './modeTwoMake.css';
const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
export async function mountModeTwoResult(root,{record,level,studyMode,onAgain,onNext,nextLevel,onLevelList,alive,aggregate}){
 const cleanups=[];let disposed=false,exportDispose=null;
 const live=()=>!disposed&&root.isConnected&&alive();
 const dispose=()=>{disposed=true;exportDispose?.();cleanups.forEach(fn=>fn?.());};
 root.innerHTML='<section class="explore-results mode2-make-results"><header class="mode2-result-heading"><h1>あなたの聞こえ方</h1><div data-result-actions></div></header><p data-sync role="status"></p><button class="text-action" data-retry hidden>保存を確認・再送</button><section class="mode2-answer-block"><div class="mode2-answer-title"><h2>あなたの答え</h2><button class="result-png-button" data-personal-export aria-label="自分の画像を保存" disabled>画像を保存</button></div><div data-personal-preview></div></section><section class="mode2-answer-block mode2-average-block"><div class="mode2-answer-title"><h2>みんなの平均</h2><button class="result-png-button" data-average-export aria-label="みんなの平均を画像で保存" disabled>画像を保存</button></div><div data-average-preview></div><p data-average-note></p></section><section class="mode2-common-block"><h2>よくある聞こえ方 · TOP 3</h2><div class="mode2-common-list" data-common></div><p data-common-note></p></section></section>';
 const actions=root.querySelector('[data-result-actions]'),again=el('button','outline-button','もう一度つくる'),next=el('button','judge-button',nextLevel?'次のことばへ →':'ことばの一覧へ');again.onclick=onAgain;next.onclick=async()=>{next.disabled=true;try{await showModeTwoSurveyIfDue(studyMode);if(live()){nextLevel?onNext?.(studyMode):onLevelList?.();}}finally{next.disabled=false;}};actions.append(again,next);
 const questionnaire=el('button','outline-button','体験後アンケートに回答する');questionnaire.hidden=true;questionnaire.onclick=async()=>{await showModeTwoSurveyIfDue(studyMode);questionnaire.hidden=!mode2SurveyDue(surveySession(studyMode));};actions.append(questionnaire);
 let viewObserver=null;cleanups.push(()=>viewObserver?.disconnect());
 const rememberView=group=>{if(record.skipped||record.sync?.status==='fixture')return;rememberComparison(studyMode,level.id,{otherAnswersAvailable:group.example?false:typeof group.otherAnswersAvailable==='boolean'?group.otherAnswersAvailable:null,source:group.source||'example'});questionnaire.hidden=!mode2SurveyDue(surveySession(studyMode));};
 const watchComparison=group=>{viewObserver?.disconnect();viewObserver=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)&&live()){rememberView(currentGroup||group);viewObserver.disconnect();}},{threshold:0.15});viewObserver.observe(root.querySelector('[data-average-preview]'));};
 const personalSave=root.querySelector('[data-personal-export]'),averageSave=root.querySelector('[data-average-export]');let currentGroup=null;
 const exportAnswer=(artwork,referenceElement,title,fileSuffix)=>{exportDispose?.();exportDispose=openArtworkExport({level,artwork,referenceElement,title,fileSuffix});};
 personalSave.onclick=()=>exportAnswer(record,root.querySelector('[data-personal-preview]'),'あなたの聞こえ方','自分');
 averageSave.onclick=()=>{if(currentGroup)exportAnswer(currentGroup,root.querySelector('[data-average-preview]'),currentGroup.example?'みんなの平均（表示例）':'みんなの平均',currentGroup.example?'みんなの平均-表示例':'みんなの平均');};
 const sync=root.querySelector('[data-sync]'),retry=root.querySelector('[data-retry]');
 function syncText(){sync.textContent=record.sync?.status==='fixture'?'表示検証用の架空データ（保存・送信しません）':record.sync?.status==='synced'?'保存しました。':record.sync?.status==='pending'?'端末に保存済み・クラウドへの保存は未確認です。 '+(record.sync.error||''):'この端末に保存しました。';retry.hidden=record.sync?.status!=='pending';}
 syncText();retry.onclick=async()=>{retry.disabled=true;try{record.sync=await retryPending(record,level);if(live())syncText();}catch(error){if(live())sync.textContent=error.message;}finally{if(live())retry.disabled=false;}};
 async function preview(host,data){const disposePreview=await mountModeThree(host,{level,preview:toVisualPreview(data,level)});if(!live())disposePreview?.();else cleanups.push(disposePreview);}
 await preview(root.querySelector('[data-personal-preview]'),record);if(!live())return dispose;personalSave.disabled=false;
 async function show(group){
  if(!live())return;averageSave.disabled=true;const area=root.querySelector('[data-average-preview]');area.modeThreeSession?.dispose();await preview(area,group);if(!live())return;currentGroup=group;averageSave.disabled=false;watchComparison(group);
  root.querySelector('.mode2-average-block h2').textContent=group.example?'みんなの平均（表示例）':'みんなの平均';
  root.querySelector('[data-average-note]').textContent=group.example?'表示例：あなたの回答（他の参加者の統計ではありません）':group.count+'件の回答の平均 · '+(group.visualStatsVersion===1?'重音の記録 '+group.emphasisCount+'件':'重音はまだ集計できません');
  const common=root.querySelector('[data-common]');common.querySelectorAll('.mode-three').forEach(node=>node.modeThreeSession?.dispose());common.replaceChildren();
  const examples=group.commonExamples||[];
  for(const [i,item] of examples.slice(0,3).entries()){
   const card=el('article','mode2-common-example'),label=el('b','',String(i+1)+' · '+item.count+'件 ('+(item.share*100).toFixed(0)+'%)'),art=el('div','mode2-common-art');const saveExample=el('button','result-png-button','PNG');saveExample.setAttribute('aria-label','よくある聞こえ方'+(i+1)+'を画像で保存');saveExample.disabled=true;saveExample.onclick=()=>exportAnswer(item.answer,art,'よくある聞こえ方 '+(i+1),'よくある聞こえ方-'+(i+1));card.append(label,art,saveExample);common.append(card);await preview(art,item.answer);if(!live())return;saveExample.disabled=false;
  }
  root.querySelector('[data-common-note]').textContent=group.example?'実際の回答が集まると、よくある組み合わせを最大3つ表示します。':group.visualStatsVersion!==1?'重音・TOP 3 の集計には Apps Script の更新が必要です。':!examples.length?'表示できる回答例はまだありません。':'';
 }
 const example={...answerPreviewAggregate(record,level),...visualStatistics([record],level.characters.length),example:true,commonExamples:[],glyphAngles:record.glyphAngles,backgroundAngles:record.backgroundAngles};
 await show(aggregate||example);if(!live())return dispose;if(record.tutorial_version===journeyVersion&&record.tutorial_status==='completed'&&level.word==='かりきゅらむ'){
  const key='namari-mode2-result-guide:'+journeyVersion+':'+(record.participantId||record.profileId||'local');let seen=false;try{seen=localStorage.getItem(key)==='1';}catch{}
  if(!seen)cleanups.push(mountModeTwoResultJourney(root,()=>{try{localStorage.setItem(key,'1');}catch{}}));
 }if(aggregate)return dispose;
 getExplorationAggregate(level,{studyMode}).then(group=>{if(live()&&!group.suppressed&&group.count>0)show(group);}).catch(error=>{if(live())root.querySelector('[data-average-note]').textContent+=' · 集計を取得できませんでした。';});
 return dispose;
}
