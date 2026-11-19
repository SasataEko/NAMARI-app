import {digest,canonicalAsset} from './registry-integrity.mjs';
import {projectModeOneDefinition} from '../src/data/projectModeOne.js';
import {linkPitch} from '../src/data/linkedPitch.js';
import { modeTwoTutorialSource } from '../src/data/modeTwoTutorial.js';
import { tutorials, tutorialDefinition } from '../src/data/tutorials.js';
import { libraryGlyph } from '../src/data/patternLibrary.js';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
const library=JSON.parse((await fs.readFile('public/content/library.json','utf8')).replace(/^\uFEFF/,''));
const { levels }=await import('../src/data/levels.js');
const mode2Tutorial=modeTwoTutorialSource(library);
const definitions=[...levels,...library.levels,...(mode2Tutorial?[mode2Tutorial]:[])];
const manifests=await Promise.all(definitions.map(async l=>{
 const chars=l.characters?l.characters.map(c=>c.text):l.morae;
 const descriptor={levelId:l.id,recordingId:l.recordingId||`${l.id}-recording-v1`,defaultAccent:linkPitch(chars,l.defaultAccent),characters:chars.map(k=>({text:k,patterns:(libraryGlyph(library,k)?.patterns||[]).map(p=>p.id)})),qualityCheck:l.qualityCheck||null};
 const assets=[l.audio,l.referenceAudio,...chars.flatMap(k=>{const g=libraryGlyph(library,k);return g?[g.normal,...g.patterns.map(p=>p.svg)]:[];})].filter(Boolean);
 const assetHashes=await Promise.all(assets.map(async p=>createHash('sha256').update(await fs.readFile('public/'+p.replace(/^\/NAMARI-app\//,''))).digest('hex')));
 descriptor.levelVersion=createHash('sha256').update(JSON.stringify(descriptor)+JSON.stringify(chars.map(k=>libraryGlyph(library,k)||null))+JSON.stringify(assetHashes)).digest('hex').slice(0,16);return descriptor;
}));
await fs.writeFile('public/content/study-manifest.json',JSON.stringify(manifests,null,2)+'\n');
await fs.writeFile('apps-script/levels.json',JSON.stringify(manifests,null,2)+'\n');
const mode1=levels.map(l=>{const base=manifests.find(m=>m.levelId===l.id);const definition={scoring:'selection',targets:l.characters.flatMap((c,i)=>c.isTarget?[i]:[]),characters:l.characters.map(c=>({text:c.text})),patternChoices:l.characters.map(c=>c.isTarget?(libraryGlyph(library,c.text)?.patterns[0]?.id||null):null)};return {levelId:l.id,recordingId:base.recordingId,levelVersion:createHash('sha256').update('mode1'+base.levelVersion+JSON.stringify(definition)).digest('hex').slice(0,16),definition};});
for(const id of ['builtin-accent','builtin-mora'])mode1.push({levelId:id,recordingId:id+'-recording-v1',levelVersion:'unscored-v1',definition:{scoring:'none',characters:['か','り','きゅ','ら','む'].map(text=>({text}))}});
for(const question of tutorials){
 const definition=tutorialDefinition(question,library);
 const assets=[question.audio,...question.reading.flatMap(k=>{const g=libraryGlyph(library,k);return g?[g.normal,...(question.mode==='diyVowel'?g.patterns.filter(p=>question.patternChoices.includes(p.id)).map(p=>p.svg):[])]:[];})].filter(Boolean);
 const hashes=await Promise.all(assets.map(async p=>createHash('sha256').update(await fs.readFile('public/'+p)).digest('hex')));
 mode1.push({levelId:question.id,recordingId:question.recordingId,levelVersion:createHash('sha256').update(JSON.stringify(definition)+hashes.join('')).digest('hex').slice(0,16),definition});
}
for(const question of library.modeOneLevels||[]){
 const definition=projectModeOneDefinition(library,question);
 const assets=[question.audio,...question.reading.flatMap((k,i)=>{const g=libraryGlyph(library,k);return g?[g.normal,...(question.mode==='diyVowel'?g.patterns.filter(p=>definition.patternChoices.includes(p.id)).map(p=>p.svg):[])]:[];})].filter(Boolean);
 const hashes=await Promise.all(assets.map(async p=>createHash('sha256').update(await fs.readFile('public/'+p)).digest('hex')));
 mode1.push({levelId:question.id,recordingId:question.recordingId||question.id+'-recording-v1',levelVersion:createHash('sha256').update(JSON.stringify(definition)+hashes.join('')).digest('hex').slice(0,16),definition});
}
await fs.writeFile('public/content/mode-one-manifest.json',JSON.stringify(mode1,null,2)+'\n');
await fs.writeFile('apps-script/mode-one-levels.json',JSON.stringify(mode1,null,2)+'\n');
await fs.writeFile('apps-script/Levels.gs','var LEVEL_MANIFEST = '+JSON.stringify(manifests,null,2)+';\nvar MODE1_MANIFEST = '+JSON.stringify(mode1,null,2)+';\n');
console.log('Generated server/client study manifests:',manifests.length,'levels');

// CI verifies these semantic hashes but publishes the exact owner-deployed registry.
const trackedAssets=[...new Set([...library.glyphs.flatMap(g=>[g.normal,...g.patterns.map(p=>p.svg)]),...definitions.flatMap(l=>[l.audio,l.referenceAudio]),...tutorials.map(q=>q.audio),...(library.modeOneLevels||[]).flatMap(q=>[q.audio,q.referenceAudio])].filter(Boolean).map(p=>p.replace(/^\/NAMARI-app\//,'')))].sort();
const integrityAssets=Object.fromEntries(await Promise.all(trackedAssets.map(async p=>[p,digest(canonicalAsset(p,await fs.readFile('public/'+p)))])));
await fs.writeFile('public/content/registry-integrity.json',JSON.stringify({registries:{'public/content/study-manifest.json':digest(JSON.stringify(manifests)),'public/content/mode-one-manifest.json':digest(JSON.stringify(mode1))},assets:integrityAssets},null,2)+'\n');
