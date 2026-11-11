import { featuresFor } from './explorationFeatures.js';
export function defaultAccent(level){
  if(!Array.isArray(level.defaultAccent)||level.defaultAccent.length!==level.characters.length||level.defaultAccent.some(p=>!['low','high'].includes(p)))throw new Error('標準アクセントを設定してください。');
  return [...level.defaultAccent];
}
export const pitchValue=p=>typeof p==='number'?p:p==='high'?1:0;
export async function saveExploration(record){const key='kotoba-exploration-v2',rows=JSON.parse(localStorage.getItem(key)||'[]');if(!Array.isArray(rows))throw new Error('Invalid records');rows.push(record);localStorage.setItem(key,JSON.stringify(rows));}
export function aggregateExplorations(records,level){
 const defaults=defaultAccent(level),rows=records.filter(r=>r.schemaVersion===2&&r.levelId===level.id),count=rows.length;
 const result={count,features:[],intensity:[],featureRates:[],pitch:[],beats:[],blanks:[],aggregation:'mean'};
 const mean=(values,fallback)=>count?values.reduce((a,b)=>a+b,0)/count:fallback;
 level.characters.forEach((c,i)=>{
 const rates=Object.fromEntries(featuresFor(c).map(v=>[v.id,mean(rows.map(r=>!r.skipped&&r.features?.[i]===v.id?1:0),0)]));result.featureRates.push(rates);result.features.push(null);result.intensity.push(Object.values(rates).reduce((a,b)=>a+b,0));
 result.pitch.push(mean(rows.map(r=>pitchValue(r.skipped||r.pitch?.[i]==null?defaults[i]:r.pitch[i])),pitchValue(defaults[i])));
 result.beats.push(mean(rows.map(r=>r.skipped?1:(r.beats?.[i]===2?2:1)),1));
 if(i<level.characters.length-1)result.blanks.push(mean(rows.map(r=>!r.skipped&&r.blanks?.[i]?1:0),0));
 });return result;
}
export async function getExplorationAggregate(level){
 const defaults=defaultAccent(level),n=level.characters.length;
 // Synthetic submissions only: 30% elongation, 20% inserted beat, 60% feature.
 const rows=Array.from({length:10},(_,k)=>({schemaVersion:2,levelId:level.id,skipped:k===9,
 features:level.characters.map((c,i)=>i===0&&k<6?(featuresFor(c)[0]?.id||null):null),intensity:Array(n).fill(1),pitch:defaults.map((p,i)=>i===2&&k<4?'low':p),beats:Array.from({length:n},(_,i)=>i===0&&k<3?2:1),blanks:Array.from({length:n-1},(_,i)=>i===0&&k<2),touched:{segment:true,pitch:true,duration:true}}));
 return {...aggregateExplorations(rows,level),source:'simulation'};
}
