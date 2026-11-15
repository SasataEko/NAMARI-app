import { hiragana } from './patternLibrary.js';
export function modeTwoTutorialSource(library){
  const source=library.levels.find(l=>hiragana(l.word)==='かりきゅらむ');
  return source?{...source,id:'tutorial-mode2-curriculum',word:'かりきゅらむ',morae:source.morae.map(hiragana),tutorial:true,recordingId:'tutorial-mode2-curriculum-recording-v1'}:null;
}
