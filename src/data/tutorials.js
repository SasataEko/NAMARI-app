import {linkPitch} from './linkedPitch.js';
// Guided lessons are intentionally separate from research trials.
export const tutorials = [
  {id:'tutorial-kusuri',chapter:'vowelChallenge',word:'くすり',reading:['く','す','り'],audio:'assets/kusuri-audio.mp3',recordingId:'kusuri-recording-v1',mode:'diyVowel',targetIndexes:[0],patternChoices:['ku-custom',null,null],tutorial:true},
  {id:'tutorial-karada',chapter:'accent',word:'からだ',reading:['か','ら','だ'],audio:'assets/audio/tutorial-karada.wav',recordingId:'tutorial-karada-recording-v1',mode:'diyAccent',pattern:['high','low','low'],tutorial:true},
  {id:'tutorial-ranpu',chapter:'mora',word:'らんぷ',reading:['ら','ん','ぷ'],audio:'assets/audio/tutorial-ranpu.wav',recordingId:'tutorial-ranpu-recording-v1',mode:'diyMora',beats:[1,1,2],blanks:[false,false],tutorial:true},
];
export function rhythmAnswer(question){const n=question.reading.length;return {scoring:'rhythm',characters:question.reading.map(text=>({text})),beats:question.beats||Array.from({length:n},(_,i)=>question.longAfter?.[i]?2:1),blanks:question.blanks||Array.from({length:Math.max(0,n-1)},(_,i)=>Boolean(question.blankAfter?.[i]))};}
export function tutorialDefinition(question,library){
  if(question.mode==='diyMora')return rhythmAnswer(question);
  const characters=question.reading.map(text=>({text}));
  if(question.mode==='diyAccent')return {scoring:'pattern',characters,pitch:linkPitch(question.reading,question.pattern)};
  return {scoring:'selection',characters,targets:question.targetIndexes,patternChoices:question.reading.map((text,i)=>question.targetIndexes.includes(i)?question.patternChoices[i]:null)};
}
