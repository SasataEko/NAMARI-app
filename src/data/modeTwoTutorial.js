import {playableLevels} from './projectLibrary.js';
import { hiragana } from './patternLibrary.js';
export function modeTwoTutorialSource(library){
  const source=library.levels.find(l=>hiragana(l.word)==='かりきゅらむ');
  return source?{...source,id:'tutorial-mode2-curriculum',sourceLevelId:source.id,word:'かりきゅらむ',morae:source.morae.map(hiragana),tutorial:true,recordingId:'tutorial-mode2-curriculum-recording-v1'}:null;
}

// Preserve historical tutorial definitions for stored data; the UI uses ordinary levels.
export function orderedModeTwoLevels(library){
 return playableLevels(library).filter(l=>!l.tutorial).sort((a,b)=>Number(b.word==='かりきゅらむ')-Number(a.word==='かりきゅらむ')||Number(b.word==='くすり')-Number(a.word==='くすり'));
}
