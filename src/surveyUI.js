import {questionsFor,ratingChoicesFor,freeTextPrompts,surveyConfig,allChaptersFinished,mode2SurveyDue} from './data/surveyConfig.js';
import {surveySession,surveyDraft,saveSurveyDraft} from './data/surveySession.js';
import {saveStudyEvent} from './data/studyEvents.js';
import './studyUI.css';
export const localSurveyPreview=()=>Boolean(import.meta.env.DEV&&new URLSearchParams(location.search).has('qa-local'));
const element=(tag,text)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
let active=null;
export async function showSurvey({gameMode='mode1',chapter=null,studyMode='test',localPreview=localSurveyPreview(),continueLabel}={}){
 if(active)return active;
 const sessionMode=localPreview&&!localSurveyPreview()?'preview:'+studyMode:studyMode;
 const saved=surveyDraft(sessionMode,chapter,gameMode);
 if(saved.done)return saved;
 const persist=()=>saveSurveyDraft(sessionMode,chapter,saved,gameMode);
 const questions=questionsFor(gameMode,chapter),choicesForMode=ratingChoicesFor(gameMode),circles=gameMode==='mode1',d=element('dialog');d.className='study-dialog survey-dialog'+(circles?' survey-mode-one':'');
 const form=element('div');d.append(form);form.append(element('h2',chapter?'この篇の感想':'体験後アンケート'));
 if(!chapter)form.append(element('p','今回の体験について、最も当てはまるものを選んでください。'));
 const fieldsets=[];
 questions.forEach((q,i)=>{const field=element('fieldset');field.append(element('legend',(!chapter?'Q'+(i+1)+'. ':'')+q.text));const choices=element('div');choices.className='survey-choices'+(circles?' survey-circles':'');field.append(choices);
 choicesForMode.forEach(([value,label])=>{const line=element('label'),radio=element('input');radio.type='radio';radio.name=q.id;radio.value=String(value);radio.setAttribute('aria-label',typeof value==='number'?value+'：'+label:label);line.title=typeof value==='number'?value+'：'+label:label;radio.checked=saved.answers[q.id]===value;radio.onchange=()=>{saved.answers[q.id]=value;persist();refresh();};line.append(radio,element('span',circles?String(value):typeof value==='number'?value+'：'+label:label));choices.append(line);});if(circles){const ends=element('div');ends.className='survey-scale-ends';ends.append(element('span','全くそう思わない'),element('span','非常にそう思う'));field.append(ends);}form.append(field);fieldsets.push(field);});
 if(!chapter){const label=element('label','自由記述（任意）'),area=element('textarea');area.maxLength=2000;area.rows=3;area.value=saved.freeText;area.placeholder=freeTextPrompts[gameMode];area.setAttribute('aria-label',freeTextPrompts[gameMode]);area.oninput=()=>{saved.freeText=area.value;persist();};label.append(element('span',freeTextPrompts[gameMode]),area);form.append(label);}
 const status=element('p');status.setAttribute('role','status');form.append(status);const actions=element('div');actions.className='study-actions';form.append(actions);
 const nextText=continueLabel||(gameMode==='mode1'&&chapter==='vowelChallenge'?'アクセント篇に挑戦する':gameMode==='mode1'&&chapter==='accent'?'モーラ篇に挑戦する':'次へ');
 const proceed=element('button',nextText);proceed.type='button';proceed.className='outline-button survey-continue';
 const submit=element('button','回答する');submit.className='outline-button survey-submit';submit.type='button';
 let busy=false,resolve;active=new Promise(r=>resolve=r);const result=active;
 const refresh=()=>{submit.disabled=busy||questions.some(q=>!choicesForMode.some(([value])=>value===saved.answers[q.id]));};
 const finish=()=>{if(!saved.done){saved.deferred=true;persist();}d.close();d.remove();active=null;resolve(saved);};
 async function send(skipped=false){if(busy)return;busy=true;refresh();actions.querySelectorAll('button').forEach(b=>b.disabled=b!==proceed);fieldsets.forEach(f=>f.disabled=true);const textArea=d.querySelector('textarea');if(textArea)textArea.disabled=true;status.textContent='保存しています…';
 try{if(!saved.payload){const current=surveySession(sessionMode),views=Object.values(current.mode2Views);saved.payload={id:saved.id,submitted_at:new Date().toISOString(),event_type:'survey',studyMode,gameMode,chapter:chapter||'not_applicable',scope_id:current.id,session_id:current.id,question_version:surveyConfig.version,survey_type:chapter?'chapter':'overall',response_status:skipped?'skipped':'answered',answers:questions.map(q=>({question_id:q.id,answer_value:skipped?'unanswered':saved.answers[q.id]})),free_text:skipped?'':saved.freeText,completed_level_count:gameMode==='mode1'?Object.keys(current.completed).filter(id=>!id.startsWith('tutorial-')&&(!chapter||current.completed[id].chapter===chapter)).length:Object.keys(current.mode2Views).length,comparison_viewed:gameMode==='mode2'?views.some(v=>v.viewed):null,other_answers_available:gameMode==='mode2'?(views.some(v=>v.otherAnswersAvailable===true)?true:views.every(v=>v.otherAnswersAvailable===false)?false:null):null,comparison_views:gameMode==='mode2'?current.mode2Views:null,local_only:localPreview};persist();}
 const record=await saveStudyEvent(saved.payload,{waitForSync:true});if(!['synced','local'].includes(record.sync?.status))throw Error(record.sync?.error||'保存を確認できませんでした。');
 saved.done=true;saved.sync=record.sync;persist();status.textContent='回答ありがとう！';actions.replaceChildren();const next=element('button',nextText);next.className='outline-button';next.onclick=finish;actions.append(next);
 }catch(e){status.textContent='送信を確認できませんでした。回答は端末に保存されています。再送するか、そのまま次へ進めます。';busy=false;actions.querySelectorAll('button').forEach(b=>b.disabled=b!==submit&&b!==proceed);refresh();}}

 proceed.onclick=()=>{if(!busy&&!saved.done&&questions.every(q=>choicesForMode.some(([value])=>value===saved.answers[q.id])))void send();finish();};submit.onclick=()=>send();actions.append(submit,proceed);if(saved.payload){fieldsets.forEach(f=>f.disabled=true);const textArea=d.querySelector('textarea');if(textArea)textArea.disabled=true;actions.querySelectorAll('button').forEach(b=>{if(b!==submit&&b!==proceed)b.disabled=true;});status.textContent='送信待ちの回答があります。「回答する」で再送できます。';}refresh();d.addEventListener('cancel',e=>e.preventDefault());document.body.append(d);d.showModal();return result;
}
export async function showModeOneOverallIfDue(studyMode,options={}){if(allChaptersFinished(surveySession(studyMode).chapters))await showSurvey({gameMode:'mode1',studyMode,...options});}
export async function showModeTwoSurveyIfDue(studyMode,options={}){if(mode2SurveyDue(surveySession(studyMode)))await showSurvey({gameMode:'mode2',studyMode,...options});}

