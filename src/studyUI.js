import {showSurvey} from './surveyUI.js';
import {participantId} from './data/participantIdentity.js';
import {loadResearchProtocol,researchReady,activeConsent,storeConsent,consentState,APP_VERSION} from './data/researchState.js';
import {saveStudyEvent} from './data/studyEvents.js';
import './studyUI.css';
function dialog(title){
  const element=document.createElement('dialog');element.className='study-dialog';
  element.innerHTML='<form method="dialog"><button type="button" class="study-close" aria-label="閉じる">×</button><h2></h2><div class="study-body"></div><p role="status" data-study-status></p><div class="study-actions"></div></form>';
  element.querySelector('h2').textContent=title;document.body.append(element);element.showModal();
  let closed=false;const callbacks=[];
  const close=value=>{if(closed)return;closed=true;element.close();element.remove();callbacks.forEach(fn=>fn(value));};
  element.querySelector('.study-close').onclick=()=>close(null);element.addEventListener('cancel',event=>{event.preventDefault();close(null);});
  return {element,body:element.querySelector('.study-body'),actions:element.querySelector('.study-actions'),status:element.querySelector('[data-study-status]'),close,finished:new Promise(resolve=>callbacks.push(resolve))};
}
function button(parent,text,fn,primary=false){const b=document.createElement('button');b.type='button';b.textContent=text;b.className=primary?'judge-button':'outline-button';b.onclick=fn;parent.append(b);return b;}
function paragraph(parent,text){const p=document.createElement('p');p.textContent=text;parent.append(p);return p;}
export async function ensureParticipation(mode,{preview=false}={}){
  if(mode==='test'&&!preview)return true;
  let p;try{p=await loadResearchProtocol();}catch(e){const d=dialog('研究説明');paragraph(d.body,e.message);button(d.actions,'閉じる',()=>d.close(false));return d.finished;}
  if(activeConsent(mode,p)){if(consentState(mode)?.background_status==null)await backgroundForm(mode,preview);return true;}
  const ready=mode==='test'||researchReady(p),d=dialog(mode==='test'?'研究参加説明のテスト':'研究参加について');
  if(!researchReady(p))paragraph(d.body,'この説明は研究者・指導教授の確認前の草稿です。正式研究は現在受け付けていません。');
  if(mode==='test')paragraph(d.body,'これはtestの動作確認です。チェックしても正式研究への同意にはなりません。');
  for(const section of p.sections||[]){const h=document.createElement('h3');h.textContent=section.title;d.body.append(h);paragraph(d.body,section.text);}
  paragraph(d.body,'保存期間：'+p.retention);paragraph(d.body,'研究者：'+p.researcher+' ／ '+p.institution);paragraph(d.body,'問い合わせ：'+p.contact);paragraph(d.body,'指導：'+p.supervisor+' ／ '+p.supervisor_contact);
  const label=document.createElement('label');label.className='study-consent';const check=document.createElement('input');check.type='checkbox';check.disabled=!ready;label.append(check,document.createTextNode('説明を読み、自由意思で参加に同意します。'));d.body.append(label);
  button(d.actions,'参加せずに戻る',()=>d.close(false));
  const agree=button(d.actions,mode==='test'?'testとして記録する':'同意して参加する',async()=>{
    if(!check.checked||!ready)return;agree.disabled=true;const at=new Date().toISOString();
    const record=await saveStudyEvent({event_type:'consent',studyMode:mode,gameMode:'participation',chapter:'participant',response_status:'answered',consent_given:true,consent_version:p.consent_version,consented_at:at,local_only:preview},{waitForSync:true});
    const synced=mode==='test'||record.sync.status==='synced';
    storeConsent(mode,{status:'consented',synced,consent_version:p.consent_version,consented_at:at,background_status:null});
    if(!synced){d.status.textContent='同意の送信を確認できません。正式データはまだ送信しません。接続を確認して再度お試しください。';agree.disabled=false;return;}
    d.close(true);
  },true);agree.disabled=true;check.onchange=()=>agree.disabled=!ready||!check.checked;
  const accepted=await d.finished;if(accepted)await backgroundForm(mode,preview);return accepted===true;
}
async function backgroundForm(mode,preview){
  const d=dialog('参加者について（任意）');paragraph(d.body,'答えたくない項目や、当てはまらない項目は空欄でかまいません。氏名などは入力しないでください。');
  const select=(label,items)=>{const row=document.createElement('label');row.textContent=label;const field=document.createElement('select');for(const [value,text]of items){const o=document.createElement('option');o.value=value;o.textContent=text;field.append(o);}row.append(field);d.body.append(row);return field;};
  const language=select('母語・言語背景',[['','回答しない'],['japanese_native','日本語母語者'],['chinese_native','中国語母語者'],['other','その他']]);
  const experience=select('日本語学習経験',[['','回答しない'],['not_applicable','該当しない（日本語母語者など）'],['none','学習経験なし'],['under_1_year','1年未満'],['1_3_years','1〜3年'],['3_5_years','3〜5年'],['over_5_years','5年以上']]);
  const scope=crypto.randomUUID();saveStudyEvent({event_type:'background',studyMode:mode,gameMode:'participation',chapter:'participant',response_status:'unanswered',scope_id:scope,language_background:null,japanese_learning_experience:null,local_only:preview});
  const save=async status=>{d.actions.querySelectorAll('button').forEach(b=>b.disabled=true);await saveStudyEvent({event_type:'background',studyMode:mode,gameMode:'participation',chapter:'participant',scope_id:scope,response_status:status,language_background:status==='answered'?language.value||null:null,japanese_learning_experience:status==='answered'?experience.value||null:null,local_only:preview});const c=consentState(mode);if(c)storeConsent(mode,{...c,background_status:status});d.close(true);};
  button(d.actions,'スキップ',()=>save('skipped'));button(d.actions,'保存して進む',()=>save('answered'),true);await d.finished;
}
export async function chapterRating({gameMode='mode1',chapter='vowelChallenge',studyMode='test',localPreview=false}){return showSurvey({gameMode,chapter:chapter==='preview'?'vowelChallenge':chapter,studyMode,localPreview});}
export async function experienceFeedback(studyMode='test',{localPreview=false}={}){
  const scope=crypto.randomUUID(),base={event_type:'experience_feedback',studyMode,gameMode:'overall',chapter:'experience',scope_id:scope,feedback_text:null,local_only:localPreview};saveStudyEvent({...base,response_status:'unanswered'});
  const d=dialog('体験の感想（任意）');const languageNote=paragraph(d.body,'用中文填写也可以哦。');languageNote.className='feedback-language-note';languageNote.lang='zh-CN';paragraph(d.body,'視覚表現によって気づいた発音の特徴や、わかりにくかった点があれば教えてください。');paragraph(d.body,'氏名・連絡先など個人が特定される内容は書かないでください。');
  const text=document.createElement('textarea');text.maxLength=2000;text.rows=5;text.setAttribute('aria-label','体験の感想');d.body.append(text);
  const save=async status=>{d.actions.querySelectorAll('button').forEach(b=>b.disabled=true);const record=await saveStudyEvent({...base,response_status:status,feedback_text:status==='answered'?text.value.trim():null});d.close(record);};
  button(d.actions,'スキップ',()=>save('skipped'));const submit=button(d.actions,'感想を送る',()=>save('answered'),true);submit.disabled=true;text.oninput=()=>submit.disabled=!text.value.trim();return d.finished;
}
export async function withdrawParticipation(){
  const c=consentState('research'),d=dialog('研究参加を中止');paragraph(d.body,'以後の正式データの送信を停止します。既に保存された記録の扱いは研究者に相談してください。');paragraph(d.body,'あなたの匿名ID：'+participantId());
  button(d.actions,'戻る',()=>d.close(false));button(d.actions,'参加を中止する',async()=>{storeConsent('research',{...c,status:'withdrawn',withdrawn_at:new Date().toISOString(),synced:false});const event=await saveStudyEvent({event_type:'withdrawal',studyMode:'research',gameMode:'participation',chapter:'participant',response_status:'answered',consent_version:c?.consent_version||null,consented_at:c?.consented_at||null});d.close(event);},true);return d.finished;
}
