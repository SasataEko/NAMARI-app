import { libraryGlyph, hiragana } from './patternLibrary.js';
import { directoryConnected, directoryAsset, directoryLibrary, directorySave, directoryUpload } from './directoryProject.js';
import { levels } from './levels.js';
export const assetUrl=p=>p?(directoryAsset(p)||`${(import.meta.env?.BASE_URL||'/NAMARI-app/')}${p}`):null;
export async function readLibrary(){if(directoryConnected())return directoryLibrary();const r=await fetch(`${(import.meta.env?.BASE_URL||'/NAMARI-app/')}content/library.json`,{cache:'no-store'});if(!r.ok)throw new Error('素材ライブラリーを読み込めませんでした。');return r.json();}
export async function writeLibrary(data){if(directoryConnected())return directorySave(data);const r=await fetch('/__author/save',{method:'POST',headers:{'Content-Type':'application/json','X-Local-Authoring':'1'},body:JSON.stringify(data)});const result=await r.json();if(!r.ok)throw new Error(result.error);return result;}
export async function uploadAsset(file){if(directoryConnected())return directoryUpload(file);const r=await fetch(`/__author/upload?name=${encodeURIComponent(file.name)}`,{method:'POST',headers:{'X-Local-Authoring':'1'},body:file});const result=await r.json();if(!r.ok)throw new Error(result.error);return result.path;}
export function playableLevels(library){
 const custom=library.levels.map(l=>({...l,word:hiragana(l.word),morae:l.morae.map(hiragana),audio:assetUrl(l.audio),characters:l.morae.map((text,i)=>{const glyph=libraryGlyph(library,text);return {id:`${l.id}-${i}`,text:hiragana(text),normal:assetUrl(glyph?.normal),features:(glyph?.patterns||[]).map(p=>({...p,svg:assetUrl(p.svg)}))};})}));
 const builtin=levels.map(l=>({...l,characters:l.characters.map(c=>{const g=libraryGlyph(library,c.text);return {...c,normal:assetUrl(g?.normal),custom:undefined,features:(g?.patterns||[]).map(p=>({...p,svg:assetUrl(p.svg)}))};})}));
 return [...builtin,...custom];
}
