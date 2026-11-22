import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {rectanglePath} from '../src/glyph/rectanglePath.js';
import {createRequire} from 'node:module';
const {interpolateAll}=createRequire(import.meta.url)('flubber');
const createMorph=(from,to)=>interpolateAll(from,to,{maxSegmentLength:3});
const attrs=text=>Object.fromEntries([...text.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],m[2]]));
test('rectangles retain SVG transform order, pivot and exact corner positions',()=>{
 assert.equal(rectanglePath({x:'1',y:'2',width:'3',height:'4'}),'M1,2 L4,2 L4,6 L1,6 Z');
 const d=rectanglePath({x:'1',y:'0',width:'2',height:'1',transform:'translate(10 20) rotate(90)'});
 const points=d.match(/[-+]?\d+(?:\.\d+)?(?:e[-+]?\d+)?/gi).map(Number);
 [10,21,10,23,9,23,9,21].forEach((v,i)=>assert.ok(Math.abs(points[i]-v)<1e-10));
 assert.throws(()=>rectanglePath({width:2,height:3,transform:'scale(2)'}));
 assert.throws(()=>rectanglePath({width:2,height:3,rx:1}));
});
test('ひなんこうどう loads current authored patterns with valid morph pairs',async()=>{
 const read=p=>fs.readFile(new URL('../public/'+p,import.meta.url),'utf8');
 const library=JSON.parse(await read('content/library.json'));
 const level=library.levels.find(l=>l.word==='ひなんこうどう');assert.ok(level);
 for(const text of level.morae){
   const glyph=library.glyphs.find(g=>g.kana===text);assert.ok(glyph?.normal,text);
   const paths=async p=>{
     const svg=await read(p),ds=[...svg.matchAll(/<path\b[^>]*\bd="([^"]+)"/g)].map(m=>m[1]);
     for(const rect of svg.matchAll(/<rect\b[^>]*>/g))ds[0]+=' '+rectanglePath(attrs(rect[0]));
     return ds;
   };
   const from=await paths(glyph.normal);
   for(const pattern of glyph.patterns){if(pattern.renderMode==='symbol-switch')continue;
     const to=await paths(pattern.svg),morph=createMorph(from,to);
     assert.ok(morph.every(fn=>fn(.5).startsWith('M')),text);
     if(pattern.sourceSvg&&/<rect\b/.test(await read(pattern.sourceSvg)))assert.ok(to[0].includes(' L'),'rectangular stroke must not be omitted');
   }
 }
});
