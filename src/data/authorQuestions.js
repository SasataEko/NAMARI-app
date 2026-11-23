import {tutorials} from './tutorials.js';
import {levels} from './levels.js';
import {projectModeOneDefinition} from './projectModeOne.js';
export function mergeModeOneQuestions(library,locals=[],deleted=[]){
 const hidden=new Set(deleted.map(q=>q.id)),map=new Map((library.modeOneLevels||[]).map(q=>[q.id,q]));
 for(const q of locals){const saved=map.get(q.id);if(!saved||String(q.updatedAt||q.createdAt||'')>String(saved.updatedAt||saved.createdAt||''))map.set(q.id,q);}
 return [...map.values()].filter(q=>!hidden.has(q.id));
}
export function modeOneAuthorQuestions(library,locals=[]){
 const all=mergeModeOneQuestions(library,locals),tutorialIds=new Set(tutorials.map(q=>q.id));
 return [...tutorials.map(q=>({...q,...all.find(x=>x.id===q.id),tutorial:true})),...all.filter(q=>!tutorialIds.has(q.id))];
}
export function modeTwoAuthorQuestions(library){
 const ids=new Set(library.levels.map(l=>l.id));
 return [...levels.filter(l=>!ids.has(l.id)).map(l=>({id:l.id,word:l.word,morae:l.characters.map(c=>c.text),audio:l.audio.replace(/^\/NAMARI-app\//,''),recordingId:l.recordingId,defaultAccent:[...l.defaultAccent]})),...library.levels];
}
export function upsertModeOneQuestion(library,draft){
 if(!draft.word?.trim()||!draft.reading?.length||draft.reading.length>30||!draft.audio)throw Error('ことば・読み・録音を確認してください。');
 projectModeOneDefinition(library,draft);
 const keys=['id','word','reading','mode','chapter','pattern','targetIndexes','patternChoices','beats','blanks','audio','audioHash','audioName','recordingId','referenceAudio','referenceRecordingId','createdAt','tutorial'];
 const question=Object.fromEntries(keys.filter(k=>draft[k]!==undefined).map(k=>[k,structuredClone(draft[k])]));question.updatedAt=new Date().toISOString();question.createdAt||=question.updatedAt;question.source='project-author';
 return {...library,modeOneLevels:[...(library.modeOneLevels||[]).filter(q=>q.id!==question.id),question]};
}
