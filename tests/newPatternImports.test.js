
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const {interpolateAll}=createRequire(import.meta.url)('flubber');
const library=JSON.parse(await fs.readFile(new URL('../public/content/library.json',import.meta.url),'utf8'));
const load=async path=>{const text=await fs.readFile(new URL('../public/'+path,import.meta.url),'utf8');return {text,box:text.match(/viewBox="([^"]+)"/)[1],paths:[...text.matchAll(/<path\b[^>]*?\bd="([^"]+)"[^>]*>/g)].map(m=>m[1])};};
test('all supplied A and RN glyphs have independent kana associations and working morphs',async()=>{
 for(const [folder,kana]of [['pattern-A',[...'あかさたなはまやらわ']],['pattern-RN',[...'らりるれろなにぬねの']]]){
  const group=library.groups.find(g=>g.folderName===folder);assert.ok(group);
  for(const text of kana){const glyph=library.glyphs.find(g=>g.kana===text);const patterns=glyph.patterns.filter(p=>p.groupId===group.id);assert.equal(patterns.length,1,text);const p=patterns[0];
   const normal=await load(glyph.normal),custom=await load(p.svg),original=await load(p.sourceSvg);assert.equal(normal.box,custom.box,text);assert.equal(normal.paths.length,custom.paths.length,text);
   // Derived copies only concatenate source subpaths, retaining every original contour verbatim.
   assert.equal(custom.paths.join(' '),original.paths.join(' '),text);
   for(const fn of interpolateAll(normal.paths,custom.paths,{maxSegmentLength:3}))assert.ok(fn(.5).startsWith('M'),text);
  }
 }
 const ra=library.glyphs.find(g=>g.kana==='ら'),na=library.glyphs.find(g=>g.kana==='な'),rn=library.groups.find(g=>g.folderName==='pattern-RN');assert.notEqual(ra.patterns.find(p=>p.groupId===rn.id).id,na.patterns.find(p=>p.groupId===rn.id).id);
});
test('small tsu uses its own newly supplied normal SVG',async()=>{const g=library.glyphs.find(g=>g.kana==='っ');assert.equal(g.normal,'assets/normal/xtsu-outlined.svg');assert.ok((await load(g.normal)).paths.length);assert.notEqual(g.normal,library.glyphs.find(g=>g.kana==='つ').normal);});
