import test from 'node:test';
import assert from 'node:assert/strict';
import { libraryGlyph, libraryCards, resolveModeOne, nextChapterItem, recordUnclearFeedback, hasUnclearFeedback } from '../src/data/patternLibrary.js';
import { playableLevels } from '../src/data/projectLibrary.js';
const library={groups:[{id:'round',title:'丸い発音',color:'#ffe08b',description:'説明'}],glyphs:[{kana:'く',normal:'uploads/glyphs/new-normal.svg',patterns:[{id:'round-ku',title:'丸いく',svg:'uploads/glyphs/new-ku.svg',groupId:'round'},{id:'other-ku',title:'別のく',svg:'uploads/glyphs/other-ku.svg',groupId:'round'}]},{kana:'す',normal:'assets/normal/su.svg',patterns:[]}],levels:[]};
test('Mode1 and Mode2 use the current library SVG and pattern IDs, including kana lookup',()=>{
 const q=resolveModeOne(library,{id:'kusuri',reading:['ク','ス'],targetIndexes:[0]});const mode2=playableLevels(library).find(l=>l.id==='kusuri');
 assert.equal(libraryGlyph(library,'ク').kana,'く');assert.equal(q.characters[0].pattern.id,mode2.characters[0].features[0].id);assert.ok(mode2.characters[0].normal.endsWith(q.characters[0].normal));assert.ok(mode2.characters[0].features[0].svg.endsWith(q.characters[0].pattern.svg));
 assert.equal(libraryCards(library)[0].group.color,'#ffe08b');assert.equal(libraryCards(library).length,2);
});
test('explicit pattern selection is retained; removed patterns and old SVG blobs cannot override the catalogue',()=>{
 const q={reading:['く','す'],targetIndexes:[0],patternChoices:['other-ku'],glyphAssets:[{customBlob:'old'}]};assert.equal(resolveModeOne(library,q).characters[0].pattern.id,'other-ku');
 const changed=structuredClone(library);changed.glyphs[0].patterns=[];const resolved=resolveModeOne(changed,q);assert.equal(resolved.characters[0].pattern,undefined);assert.equal(resolved.characters[1].pattern,null);assert.equal(resolved.characters[0].normal,'uploads/glyphs/new-normal.svg');
 assert.equal(playableLevels(changed)[0].characters[0].features.length,0);assert.equal(playableLevels({...changed,glyphs:[]})[0].characters[0].custom,undefined);
});
test('chapter progression advances in order and finishes at the last level without wrapping',()=>{
 const items=[{id:'builtin',word:'くすり'},{id:'diy',word:'あくび'}];assert.equal(nextChapterItem(items,'builtin').id,'diy');assert.equal(nextChapterItem(items,'diy'),null);assert.equal(nextChapterItem(items,'unknown'),null);
});
test('unclear feedback is recorded once per profile and level and survives reopening',()=>{
 const values=new Map(),storage={getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)};
 assert.equal(recordUnclearFeedback(storage,'ja','level-a',[{patternId:'round-ku'}]),true);assert.equal(recordUnclearFeedback(storage,'ja','level-a',[]),false);assert.equal(hasUnclearFeedback(storage,'ja','level-a'),true);assert.equal(hasUnclearFeedback(storage,'zh','level-a'),false);assert.equal(recordUnclearFeedback(storage,'ja','level-b',[]),true);
 const rows=JSON.parse([...values.values()][0]);assert.equal(rows.length,2);assert.equal(rows[0].patterns[0].patternId,'round-ku');
});

// The server whitelist must describe the same patterns the browser actually presents.
import fs from 'node:fs/promises';
test('generated study manifests match current playable pattern choices for every kana',async()=>{
 const actual=JSON.parse(await fs.readFile(new URL('../public/content/library.json',import.meta.url),'utf8'));const manifest=JSON.parse(await fs.readFile(new URL('../public/content/study-manifest.json',import.meta.url),'utf8'));
 for(const level of playableLevels(actual)){const entry=manifest.find(row=>row.levelId===level.id);assert.ok(entry,level.word);assert.deepEqual(entry.characters.map(c=>c.patterns),level.characters.map(c=>c.features.map(p=>p.id)),level.word);}
});
