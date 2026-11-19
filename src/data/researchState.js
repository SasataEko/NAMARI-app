import {participantId} from './participantIdentity.js';
export const APP_VERSION='2026.11.19-tutorial-sequence-v1';
export const TUTORIAL_VERSION='2026.11.19-guided-skippable-v5';
let protocol=null;
const base=()=>import.meta.env?.BASE_URL||'/NAMARI-app/';
function read(key,fallback){try{return JSON.parse(localStorage.getItem(key)||'null')??fallback;}catch{return fallback;}}
export async function loadResearchProtocol(){if(!protocol){const r=await fetch(base()+'content/research-protocol.json',{cache:'no-store'});if(!r.ok)throw Error('研究説明を読み込めませんでした。');protocol=await r.json();}return protocol;}
export function researchReady(p){return !!(p?.research_enabled&&p.approved&&p.consent_version&&!p.consent_version.startsWith('draft')&&p.approved_by&&Number.isFinite(Date.parse(p.approved_at))&&p.researcher&&p.supervisor&&p.institution&&p.contact&&p.retention&&p.sections?.length>=5);}
export const consentState=mode=>read('kotoba-consent-'+mode+'-v1',null);
export function storeConsent(mode,value){localStorage.setItem('kotoba-consent-'+mode+'-v1',JSON.stringify({...value,participant_id:participantId()}));}
export function activeConsent(mode,p=protocol){const c=consentState(mode);return !!(c&&c.participant_id===participantId()&&c.status==='consented'&&c.synced&&c.consent_version===p?.consent_version&&(mode==='test'||researchReady(p)));}
export function markTutorial(gameMode,chapter,status){
  const key='kotoba-tutorial-status-v1',rows=read(key,[]);
  rows.push({participant_id:participantId(),game_mode:gameMode,chapter,status,tutorial_version:TUTORIAL_VERSION,at:new Date().toISOString()});localStorage.setItem(key,JSON.stringify(rows));
}
export function tutorialMetadata(gameMode,chapter){
  const rows=read('kotoba-tutorial-status-v1',[]).filter(r=>r.participant_id===participantId()&&r.game_mode===gameMode&&r.chapter===chapter&&r.tutorial_version===TUTORIAL_VERSION),last=rows.at(-1);
  const completed=rows.some(r=>r.status==='completed');return {tutorial_version:TUTORIAL_VERSION,tutorial_completed:completed?true:last?.status==='skipped'?false:null,tutorial_status:completed?'completed':last?.status||'not_started'};
}
export function studyMetadata(mode,gameMode,chapter){const c=consentState(mode);return {app_version:APP_VERSION,consent_version:c?.status==='consented'?c.consent_version:null,consented_at:c?.status==='consented'?c.consented_at:null,...tutorialMetadata(gameMode,chapter)};}
export async function assertResearchUpload(record){
  if(record.studyMode!=='research')return;
  if(record.schemaType==='study_event'&&record.event_type==='withdrawal')return;
  const p=await loadResearchProtocol();if(!researchReady(p))throw Error('研究説明は確認待ちです。正式研究データは送信しません。');
  if(record.schemaType==='study_event'&&record.event_type==='consent'){
    if(record.consent_version===p.consent_version&&record.response_status==='answered'&&record.consent_given===true)return;
  }
  const c=consentState('research');
  if(!activeConsent('research',p)||record.consent_version!==c.consent_version||record.consented_at!==c.consented_at)throw Error('この記録には有効な研究同意がありません。過去の記録を後から正式データに変換することはできません。');
}
