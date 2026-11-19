import {playableLevels} from './projectLibrary.js';
import { hiragana } from './patternLibrary.js';
export function modeTwoTutorialSource(library){
  const source=library.levels.find(l=>hiragana(l.word)==='かりきゅらむ');
  return source?{...source,id:'tutorial-mode2-curriculum',sourceLevelId:source.id,word:'かりきゅらむ',morae:source.morae.map(hiragana),tutorial:true,recordingId:'tutorial-mode2-curriculum-recording-v1'}:null;
}

// The source recording stays editable; only the duplicate playable tile is removed.
export function orderedModeTwoLevels(library){
 const source=modeTwoTutorialSource(library);
 const normal=playableLevels(library).filter(l=>l.id!==source?.sourceLevelId).sort((a,b)=>Number(b.word==='くすり')-Number(a.word==='くすり'));
 const tutorial=source?playableLevels({...library,levels:[source]}).find(l=>l.id===source.id):null;
 return tutorial?[tutorial,...normal]:normal;
}
