import {initialArtwork} from './modeThreeModel.js';
export const modeTwoInteractionVersion='mode2-make-v1';
const rate=v=>Math.max(0,Math.min(1,Number(v)||0));
export function validVisualMetadata(record,level){
 if(record.interactionVersion===undefined)return true;
 if(record.interactionVersion!==modeTwoInteractionVersion||!Array.isArray(record.emphasis)||record.emphasis.length>2||new Set(record.emphasis).size!==record.emphasis.length)return false;
 const n=level.characters.length,keys=[];for(let i=0;i<n;i++){if(record.beats[i]>0){keys.push('base:'+i);if(record.beats[i]===2)keys.push('long:'+i);}if(record.blanks[i])keys.push('blank:'+i);}
 if(record.emphasis.some(key=>!keys.includes(key)))return false;
 return ['glyphAngles','backgroundAngles'].every(field=>{const map=record[field]||{};return typeof map==='object'&&!Array.isArray(map)&&Object.keys(map).length<=n*3&&Object.entries(map).every(([key,v])=>/^(base|long|blank):\d+$/.test(key)&&Number(key.split(':')[1])<n&&Number.isFinite(v)&&(field==='glyphAngles'?v>=-10&&v<=10:v>=0&&v<360));});
}
export function previewArtwork(data,level){
 const state=initialArtwork(level);
 Object.assign(state,{patterns:[...(data.patterns||data.pattern||state.patterns)],pitch:[...(data.pitch||state.pitch)],beats:[...(data.beats||state.beats)],blanks:[...(data.blanks||state.blanks)],emphasis:[...(data.emphasis||[])],glyphAngles:{...(data.glyphAngles||{})},backgroundAngles:{...(data.backgroundAngles||{})},longRates:data.longRates||data.beats.map(b=>Number(b===2)),omissionRates:data.omissionRates||data.beats.map(b=>Number(b===0))});
 return state;
}
export function averageGlyphPaths(data,rates,interpolate){
 const symbols=data.variants.filter(v=>v.renderMode==='symbol-switch'&&!v.error);
 const winner=symbols.reduce((best,v)=>rate(rates[v.id])>best.rate?{glyph:v.glyph,rate:rate(rates[v.id])}:best,{glyph:data.normal,rate:Math.max(0,1-symbols.reduce((sum,v)=>sum+rate(rates[v.id]),0))});
 if(winner.glyph!==data.normal)return winner.glyph.shapes.map(p=>p.d);
 const variants=data.variants.filter(v=>v.morph&&!v.error);let current=data.normal.shapes.map(p=>p.d),weight=Math.max(0,1-variants.reduce((sum,v)=>sum+rate(rates[v.id]),0));
 for(const variant of variants){const amount=rate(rates[variant.id]);if(!amount)continue;const total=weight+amount;current=weight===0?variant.morph.to:interpolate(current,variant.morph.to).map(fn=>fn(amount/total));weight=total;}
 return current;
}
export function averageEmphasisVisual(node,data){
 const selected=data.emphasisRates?.[node.key]||{},first=rate(selected.first),second=Math.min(1-first,rate(selected.second)),probability=first+second;
 const pitch=typeof node.pitch==='number'?node.pitch:node.pitch==='high'?1:0,defaultPitch=node.defaultPitch==='high'?1:0,deviation=Math.abs(pitch-defaultPitch),blue=[128,190,219],yellow=[245,196,0],red=[209,52,25];
 const color='rgb('+blue.map((v,i)=>Math.round((v+(yellow[i]-v)*deviation)*(1-probability)+red[i]*probability)).join(',')+')';
 return {first,second,probability,type:first?3:second?2:1,scale:.65+(3.1-.65)*first+(1.85-.65)*second,color};
}
export function toVisualPreview(answer,level){
 return {...answer,featureRates:answer.featureRates||level.characters.map((c,i)=>Object.fromEntries((c.features||[]).map(f=>[f.id,answer.pattern?.[i]===f.id?1:0]))),longRates:answer.longRates||answer.beats.map(b=>Number(b===2)),omissionRates:answer.omissionRates||answer.beats.map(b=>Number(b===0)),emphasisRates:answer.emphasisRates||Object.fromEntries((answer.emphasis||[]).map((key,i)=>[key,{first:Number(i===0),second:Number(i===1)}]))};
}
export function visualAnswerKey(answer){return JSON.stringify([answer.pattern,answer.pitch,answer.beats,answer.blanks,answer.emphasis||[]]);}
// Only eligible rows may be passed here. No identifiers or event metadata leave this projection.
export function visualStatistics(rows,n){
 const count=rows.length,covered=rows.filter(r=>r.interactionVersion===modeTwoInteractionVersion&&Array.isArray(r.emphasis)),emphasisRates={},answers=new Map();
 for(const row of covered)if(!row.skipped)row.emphasis.slice(0,2).forEach((key,i)=>{const item=emphasisRates[key]||{first:0,second:0};item[i?'second':'first']+=1/covered.length;emphasisRates[key]=item;});
 for(const row of rows){if(row.skipped)continue;const key=visualAnswerKey(row),entry=answers.get(key)||{count:0,answer:{pattern:[...row.pattern],pitch:[...row.pitch],beats:[...row.beats],blanks:[...row.blanks],emphasis:[...(row.emphasis||[])]}};entry.count++;answers.set(key,entry);}
 return {visualStatsVersion:1,emphasisCount:covered.length,emphasisRates,longRates:Array.from({length:n},(_,i)=>count?rows.reduce((s,r)=>s+Number(!r.skipped&&r.beats[i]===2),0)/count:0),commonExamples:[...answers.entries()].sort((a,b)=>b[1].count-a[1].count||(a[0]<b[0]?-1:a[0]>b[0]?1:0)).slice(0,3).map(([,entry])=>({...entry,share:count?entry.count/count:0}))};
}
