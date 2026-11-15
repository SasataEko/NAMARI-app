import { featuresFor } from './explorationFeatures.js';
import { pitchValue } from './explorationStore.js';
// A labelled display example only; this does not add or qualify any research row.
export function answerPreviewAggregate(record,level){
  return {count:1,source:'example',example:true,aggregation:'mean',features:level.characters.map(()=>null),pattern:level.characters.map(()=>null),noticed:[...record.noticed],noticedRates:record.noticed.map(Number),unspecifiedRates:record.noticed.map((v,i)=>v&&!record.pattern[i]?1:0),featureRates:level.characters.map((c,i)=>Object.fromEntries(featuresFor(c).map(f=>[f.id,record.pattern[i]===f.id?1:0]))),pitch:record.pitch.map(pitchValue),beats:[...record.beats],blanks:record.blanks.map(Number)};
}
