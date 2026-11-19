
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {canonicalAsset,digest,verifyRegistry} from '../scripts/registry-integrity.mjs';
test('SVG newline style does not change semantic integrity while recording bytes remain exact',()=>{
 assert.equal(digest(canonicalAsset('glyph.svg',Buffer.from('<svg>\r\n</svg>\r\n'))),digest(canonicalAsset('glyph.svg',Buffer.from('<svg>\n</svg>\n'))));
 const audio=Buffer.from([82,73,70,70,13,10,0]);assert.deepEqual(canonicalAsset('clip.wav',audio),audio);assert.notEqual(digest(audio),digest(Buffer.from([82,73,70,70,10,0])));
});
test('CI accepts committed registries across newline styles and rejects an unregistered asset edit',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'namari-registry-'));await fs.mkdir(path.join(root,'public/content'),{recursive:true});await fs.mkdir(path.join(root,'public/assets'),{recursive:true});await fs.mkdir(path.join(root,'apps-script'),{recursive:true});
 const rows=[{levelId:'q',levelVersion:'owner-deployed-version'}],json=JSON.stringify(rows);for(const name of ['public/content/study-manifest.json','public/content/mode-one-manifest.json','apps-script/levels.json','apps-script/mode-one-levels.json'])await fs.writeFile(path.join(root,name),json);
 await fs.writeFile(path.join(root,'public/assets/q.svg'),'<svg>\n<path/>\n</svg>\n');
 const integrity={registries:{'public/content/study-manifest.json':digest(json),'public/content/mode-one-manifest.json':digest(json)},assets:{'assets/q.svg':digest(canonicalAsset('q.svg',Buffer.from('<svg>\r\n<path/>\r\n</svg>\r\n')))}};
 await fs.writeFile(path.join(root,'public/content/registry-integrity.json'),JSON.stringify(integrity));assert.equal((await verifyRegistry(root)).assets,1);
 await fs.writeFile(path.join(root,'public/assets/q.svg'),'<svg><path d="M1 1"/></svg>');await assert.rejects(verifyRegistry(root),/Asset changed/);
 await fs.writeFile(path.join(root,'public/assets/q.svg'),'<svg>\n<path/>\n</svg>\n');await fs.writeFile(path.join(root,'apps-script/levels.json'),'[]');await assert.rejects(verifyRegistry(root),/registry mismatch/);
});
