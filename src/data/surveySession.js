import {participantId} from './participantIdentity.js';
import {surveyConfig,surveyKey} from './surveyConfig.js';
const KEY='namari-survey-sessions-v1';
const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}');}catch{return {};}};
const lane=mode=>participantId()+':'+mode+':'+(new URLSearchParams(globalThis.location?.search||'').has('qa-local')?'qa':'live');
// Persist across refresh/retry; a new experience starts after 12 hours, never by a page refresh.
export function surveySession(mode='test'){
 const all=read(),key=lane(mode);let state=all[key];
 if(!state||state.version!==surveyConfig.version||Date.now()-state.startedAt>surveyConfig.sessionHours*3600000){state={id:crypto.randomUUID(),version:surveyConfig.version,startedAt:Date.now(),completed:{},chapters:{},mode2Views:{},surveys:{}};all[key]=state;localStorage.setItem(KEY,JSON.stringify(all));}
 return state;
}
export function updateSurveySession(mode,fn){const state=surveySession(mode);fn(state);const all=read();all[lane(mode)]=state;localStorage.setItem(KEY,JSON.stringify(all));return state;}
export function rememberModeOneCompletion(record){if(record.completed||record.answerRevealed)updateSurveySession(record.studyMode,s=>{s.completed[record.levelId]={chapter:record.chapter,answer_revealed:!!record.answerRevealed};});}
export function rememberComparison(mode,levelId,{otherAnswersAvailable=null,source='unknown'}={}){return updateSurveySession(mode,s=>{s.mode2Views[levelId]={viewed:true,otherAnswersAvailable,source,viewedAt:new Date().toISOString()};});}
export function surveyDraft(mode,chapter,gameMode='mode1'){let draft;updateSurveySession(mode,s=>{const key=surveyKey(gameMode,chapter);draft=s.surveys[key]||{id:crypto.randomUUID(),answers:{},freeText:'',done:false};s.surveys[key]=draft;});return draft;}
export function saveSurveyDraft(mode,chapter,draft,gameMode='mode1'){return updateSurveySession(mode,s=>{s.surveys[surveyKey(gameMode,chapter)]=structuredClone(draft);});}

