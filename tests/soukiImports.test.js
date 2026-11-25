import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {createRequire} from 'node:module';
const {interpolateAll}=createRequire(import.meta.url)('flubber');
const library=JSON.parse(await fs.readFile('public/content/library.json','utf8'));
const read=async file=>{const text=await fs.readFile('public/'+file,'utf8');return {text,box:text.match(/viewBox="([^"]+)"/)[1],paths:[...text.matchAll(/<path\b[^>]*?\bd="([^"]+)"[^>]*>/g)].map(m=>m[1])};};
test('every supplied aspiration SVG has one kana association and a compatible, unchanged visible outline',async()=>{
 const group=library.groups.find(g=>g.folderName==='pattern-souki'),folder='assets/namari/pattern-souki/';
 const files=(await fs.readdir('public/'+folder)).filter(name=>name.endsWith('.svg')&&!name.endsWith('-morph.svg'));
 const patterns=library.glyphs.flatMap(g=>g.patterns.filter(p=>p.groupId===group.id).map(p=>({glyph:g,pattern:p})));
 assert.equal(patterns.length,files.length);
 for(const name of files){
  const entries=patterns.filter(({pattern})=>pattern.sourceSvg===folder+name);assert.equal(entries.length,1,name);
  const {glyph,pattern}=entries[0],normal=await read(glyph.normal),source=await read(pattern.sourceSvg),custom=await read(pattern.svg);
  assert.equal(normal.box,custom.box,name);assert.equal(normal.paths.length,custom.paths.length,name);
  const visible=name==='pu-NM2.svg'?source.paths.slice(1):source.paths;assert.equal(custom.paths.join(' '),visible.join(' '),name);
  for(const fn of interpolateAll(normal.paths,custom.paths,{maxSegmentLength:3}))for(const t of [.25,.5,.75]){const d=fn(t);assert.ok(d.startsWith('M'),name);assert.ok(!/NaN|Infinity/.test(d),name);}
 }
 for(const kana of [...'だぱぷぺぽ'])assert.equal(patterns.filter(({glyph})=>glyph.kana===kana).length,1,kana);
 const sa=patterns.find(({glyph})=>glyph.kana==='さ');assert.ok(sa.pattern.sourceSvg.endsWith('/sa-MM2.svg'));
 const pu=patterns.find(({glyph})=>glyph.kana==='ぷ');assert.match((await read(pu.pattern.sourceSvg)).text,/fill: none/);assert.equal((await read(pu.pattern.sourceSvg)).paths.length,3);
});
test('ku uses the same U-column description as the other kana',()=>{
 const ku=library.glyphs.find(g=>g.kana==='く').patterns.find(p=>p.groupId==='existing-ku');
 for(const g of library.glyphs)for(const p of g.patterns.filter(p=>p.groupId==='existing-ku'))assert.equal(p.description,ku.description,g.kana);
});
