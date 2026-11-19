
import {resolveModeOne} from './patternLibrary.js';
import {tutorialDefinition} from './tutorials.js';
export function projectModeOneDefinition(library,question){
 if(question.mode==='diyVowel'){
  const q=resolveModeOne(library,question);if(!q.targets.length||q.targets.some(i=>!q.characters[i]?.normal||!q.characters[i]?.pattern))throw Error('正解の文字と図鑑パターンを確認してください：'+question.word);
  return {scoring:'selection',characters:q.reading.map(text=>({text})),targets:q.targets,patternChoices:q.characters.map(c=>c.pattern?.id||null)};
 }
 if(!['diyAccent','diyMora'].includes(question.mode))throw Error('問題の種類を確認してください。');
 const d=tutorialDefinition(question,library),n=question.reading.length;
 if(question.mode==='diyAccent'&&(d.pitch.length!==n||d.pitch.some(p=>!['high','low'].includes(p))))throw Error('高低の正解を確認してください：'+question.word);
 if(question.mode==='diyMora'&&(d.beats.length!==n||d.beats.some(b=>![0,1,2].includes(b))||d.blanks.length!==n-1))throw Error('拍の正解を確認してください：'+question.word);
 return d;
}
export function projectModeOneSnapshot(q,audio,audioHash){
 return {id:q.id,mode:q.mode,chapter:q.chapter||({diyVowel:'vowelChallenge',diyAccent:'accent',diyMora:'mora'}[q.mode]),word:q.word,reading:[...q.reading],pattern:[...(q.pattern||[])],targetIndexes:[...(q.targetIndexes||[q.targetIndex].filter(Number.isInteger))],patternChoices:[...(q.patternChoices||[])],beats:q.beats?[...q.beats]:q.reading.map((_,i)=>q.longAfter?.[i]?2:1),blanks:q.blanks?[...q.blanks]:q.reading.slice(1).map((_,i)=>Boolean(q.blankAfter?.[i])),audio,audioHash,audioName:q.audioName,recordingId:q.recordingId||q.id+'-recording-v1',createdAt:q.createdAt,updatedAt:q.updatedAt||q.createdAt,source:'diy-project'};
}
