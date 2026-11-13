import { directoryConnected, directoryAsset, directoryLibrary, directorySave, directoryUpload } from './directoryProject.js';
import { levels } from './levels.js';
export const assetUrl=p=>p?(directoryAsset(p)||`${import.meta.env.BASE_URL}${p}`):null;
export async function readLibrary(){if(directoryConnected())return directoryLibrary();const r=await fetch(`${import.meta.env.BASE_URL}content/library.json`,{cache:'no-store'});if(!r.ok)throw new Error('素材ライブラリーを読み込めませんでした。');return r.json();}
export async function writeLibrary(data){if(directoryConnected())return directorySave(data);const r=await fetch('/__author/save',{method:'POST',headers:{'Content-Type':'application/json','X-Local-Authoring':'1'},body:JSON.stringify(data)});const result=await r.json();if(!r.ok)throw new Error(result.error);return result;}
export async function uploadAsset(file){if(directoryConnected())return directoryUpload(file);const r=await fetch(`/__author/upload?name=${encodeURIComponent(file.name)}`,{method:'POST',headers:{'X-Local-Authoring':'1'},body:file});const result=await r.json();if(!r.ok)throw new Error(result.error);return result.path;}
export function playableLevels(library){
 const custom=library.levels.map(l=>({...l,audio:assetUrl(l.audio),characters:l.morae.map((text,i)=>{const glyph=library.glyphs.find(g=>g.kana===text);return {id:`${l.id}-${i}`,text,normal:assetUrl(glyph?.normal),features:(glyph?.patterns||[]).map(p=>({...p,svg:assetUrl(p.svg)}))};})}));
 const builtin=levels.map(l=>({...l,characters:l.characters.map(c=>{const g=library.glyphs.find(g=>g.kana===c.text);return g?{...c,normal:assetUrl(g.normal),features:g.patterns.map(p=>({...p,svg:assetUrl(p.svg)}))}:c;})}));
 return [...builtin,...custom];
}
