import {libraryGlyph} from './patternLibrary.js';
import {decreaseBeat,undoDecrease} from '../rhythmReduction.js';
export const modeThreeLevel=Object.freeze({id:'mode3-abakuratto',word:'あばくらっと',morae:['あ','ば','く','ら','っ','と'],defaultAccent:['low','high','high','high','high','high'],visualExperiment:true,studyMode:'test',audio:null});
export const modeThreeStorageKey='namari-mode3-artwork-v1';
export const modeThreeCharacters=library=>modeThreeLevel.morae.map(text=>{const g=libraryGlyph(library,text);return {text,normal:g?.normal||null,patterns:g?.patterns||[]};});
export function initialArtwork(level=modeThreeLevel){const morae=level.characters?.map(c=>c.text)||level.morae,n=morae.length;return {morae:[...morae],defaultAccent:[...level.defaultAccent],schemaVersion:4,gameMode:level===modeThreeLevel?'mode3':'mode2',levelId:level.id,studyMode:'test',style:'sticker',emphasis:[],glyphAngles:{},backgroundAngles:{},noticed:Array(n).fill(false),patterns:Array(n).fill(null),pitch:[...level.defaultAccent],beats:Array(n).fill(1),blanks:Array(Math.max(0,n-1)).fill(false)};}
export function restoreArtwork(value,characters,level=modeThreeLevel){
 const next=initialArtwork(level);if(!value||value.gameMode!==next.gameMode||value.levelId!==next.levelId)return next;
 next.noticed=characters.map((_,i)=>Boolean(value.noticed?.[i]||(next.gameMode==='mode2'&&value.patterns?.[i])));
 next.patterns=characters.map((c,i)=>c.patterns.some(p=>p.id===value.patterns?.[i])?value.patterns[i]:null);
 next.pitch=next.pitch.map((p,i)=>['low','high'].includes(value.pitch?.[i])?value.pitch[i]:p);
 next.beats=next.beats.map((b,i)=>[0,1,2].includes(value.beats?.[i])?value.beats[i]:b);
 next.blanks=next.blanks.map((b,i)=>typeof value.blanks?.[i]==='boolean'?value.blanks[i]:b);const keys=artworkNodes(next).map(n=>n.key);next.emphasis=normaliseEmphasis(value.emphasis,keys);
 for(const field of ['glyphAngles','backgroundAngles'])next[field]=Object.fromEntries(keys.filter(key=>Number.isFinite(value[field]?.[key])).map(key=>[key,field==='glyphAngles'?Math.max(-10,Math.min(10,value[field][key])):((value[field][key]%360)+360)%360]));return next;
}
export function artworkNodes(state){
 const nodes=[];
 const push=(kind,index,text)=>{
  const previous=nodes.at(-1),linked=kind!=='base'||['っ','ッ','ー'].includes(text);
  const pitch=linked&&previous?previous.pitch:state.pitch[index],defaultPitch=linked&&previous?previous.defaultPitch:(state.defaultAccent||modeThreeLevel.defaultAccent)[index];
  nodes.push({key:kind+':'+index,kind,index,text,linked:linked&&!!previous,pitch,defaultPitch});
 };
 (state.morae||modeThreeLevel.morae).forEach((text,i)=>{if(state.beats[i]>0){push('base',i,text);if(state.beats[i]===2||state.longRates?.[i]>0)push('long',i,'ー');}if(state.blanks[i])push('blank',i,'ッ');});const emphasis=normaliseEmphasis(state.emphasis,nodes.map(n=>n.key));return nodes.map(n=>({...n,rate:n.kind==='base'?1-(state.omissionRates?.[n.index]||0):n.kind==='long'?(state.longRates?.[n.index]??1):Number(state.blanks[n.index]),emphasisRank:emphasis.includes(n.key)?emphasis.indexOf(n.key)+1:null}));
}
export function setArtworkPitch(state,node,value){
 if(node.kind!=='base'||node.linked||!['low','high'].includes(value))return false;
 state.pitch[node.index]=value;for(const n of artworkNodes(state))if(n.kind==='base')state.pitch[n.index]=n.pitch;return true;
}
export function deleteArtworkBeat(state,node,history){
 if(node.kind==='blank'){if(!state.blanks[node.index])return false;history.history.push({blank:true,index:node.index,before:true});state.blanks[node.index]=false;state.emphasis=normaliseEmphasis(state.emphasis,artworkNodes(state).map(n=>n.key));return true;}
 const changed=decreaseBeat(state.beats,node.index,history);if(changed)state.emphasis=normaliseEmphasis(state.emphasis,artworkNodes(state).map(n=>n.key));return changed;
}
export function undoArtworkBeat(state,history){
 const previous=history.history.at(-1);
 if(previous?.blank){history.history.pop();state.blanks[previous.index]=previous.before;return true;}
 if(previous)return undoDecrease(state.beats,history);
 const index=state.beats.lastIndexOf(0);if(index<0)return false;state.beats[index]=1;return true;
}
export const glyphSizeFactor=edited=>edited?1.45:1;
// Ink-based widths tighten the word without changing any beat duration.
export function fitArtworkRow(width,height,factors,aspects=factors.map(()=>1),{maxBase=90,fill=.82}={}){
 // Overlap only ordinary neighbours; an enlarged Pattern gets breathing room.
 const gapRatios=factors.slice(0,-1).map((factor,i)=>Math.max(factor,factors[i+1])>1?Math.max(factor,factors[i+1])*.045:-.10);
 const cost=Math.max(.1,factors.reduce((sum,f,i)=>sum+f*aspects[i],0)+gapRatios.reduce((a,b)=>a+b,0));
 const base=Math.max(1,Math.min(maxBase,width*fill/cost,height/Math.max(...factors)));
 return {gap:0,base,gapRatios,gaps:gapRatios.map(r=>base*r),sizes:factors.map(f=>base*f),widths:factors.map((f,i)=>base*f*aspects[i])};
}
export function paddedViewBox(box,padding=.16){const [x,y,w,h]=box.trim().split(/[ ,]+/).map(Number),p=Math.max(w,h)*padding;return [x-p,y-p,w+2*p,h+2*p].join(' ');}

export function normaliseEmphasis(value,keys){const visible=new Set(keys);return [...new Set(Array.isArray(value)?value:[])].filter(key=>visible.has(key)).slice(0,2);}
export function toggleArtworkEmphasis(state,key){
 const keys=artworkNodes(state).map(n=>n.key);if(!keys.includes(key))return false;
 const current=normaliseEmphasis(state.emphasis,keys);
 if(current.includes(key))state.emphasis=current.filter(k=>k!==key);
 else {if(current.length===2)return false;state.emphasis=[...current,key];}
 return true;
}
