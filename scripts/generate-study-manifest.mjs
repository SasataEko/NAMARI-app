import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
const library=JSON.parse((await fs.readFile('public/content/library.json','utf8')).replace(/^\uFEFF/,''));
const { levels }=await import('../src/data/levels.js');
const definitions=[...levels,...library.levels];
const manifests=await Promise.all(definitions.map(async l=>{
 const chars=l.characters?l.characters.map(c=>c.text):l.morae;
 const descriptor={levelId:l.id,recordingId:l.recordingId||`${l.id}-recording-v1`,defaultAccent:l.defaultAccent,characters:chars.map(k=>({text:k,patterns:(library.glyphs.find(g=>g.kana===k)?.patterns||[]).map(p=>p.id)})),qualityCheck:l.qualityCheck||null};
 const assets=[l.audio,...chars.flatMap(k=>{const g=library.glyphs.find(g=>g.kana===k);return g?[g.normal,...g.patterns.map(p=>p.svg)]:[];})].filter(Boolean);
 const assetHashes=await Promise.all(assets.map(async p=>createHash('sha256').update(await fs.readFile('public/'+p.replace(/^\/NAMARI-app\//,''))).digest('hex')));
 descriptor.levelVersion=createHash('sha256').update(JSON.stringify(descriptor)+JSON.stringify(chars.map(k=>library.glyphs.find(g=>g.kana===k)||null))+JSON.stringify(assetHashes)).digest('hex').slice(0,16);return descriptor;
}));
await fs.writeFile('public/content/study-manifest.json',JSON.stringify(manifests,null,2)+'\n');
await fs.writeFile('apps-script/levels.json',JSON.stringify(manifests,null,2)+'\n');
await fs.writeFile('apps-script/Levels.gs','var LEVEL_MANIFEST = '+JSON.stringify(manifests,null,2)+';\n');
console.log('Generated server/client study manifests:',manifests.length,'levels');
