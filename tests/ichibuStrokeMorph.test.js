import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import flubber from 'flubber';import {ichibuMorphOptions} from '../src/glyph/ichibuStrokeMap.js';const {splitPathString,interpolateAll}=flubber;const context=vm.createContext({splitPathString,interpolateAll,syncSticker(){}});const source=fs.readFileSync('src/glyph/morph.js','utf8').replace(/^import .*$/gm,'').replace(/^export /gm,'');new vm.Script(source+'\nthis.createMorph=createMorph;').runInContext(context);const {createMorph}=context;
const path=p=>[...fs.readFileSync('public/'+p,'utf8').matchAll(/<path\b[^>]*\bd="([^"]+)"/g)].map(m=>m[1]),from=path('assets/normal/bu.svg'),to=path('assets/namari/pattern-U/bu-NM-morph.svg'),options=ichibuMorphOptions({word:'いちぶ'},{text:'ぶ',pattern:{id:'pattern-u-bu'}});
test('Ichibu preserves all six disconnected contours through every sampled frame and exact authored endpoints',()=>{
 const morph=createMorph(from,to,options);assert.equal(morph.length,1);assert.equal(morph[0](0),from[0]);assert.equal(morph[0](1),to[0]);
 for(const t of [.001,.1,.25,.5,.75,.9,.999])assert.equal(splitPathString(morph[0](t)).length,6);
 assert.deepEqual([...morph.from],from);assert.deepEqual([...morph.to],to);assert.deepEqual(options.strokeMap,[[2,0,3,4,1,5]]);
});
test('pilot is limited to the requested Mode1 word and variant; inconsistent mappings are rejected',()=>{
 assert.deepEqual(ichibuMorphOptions({word:'ほか'},{text:'ぶ',pattern:{id:'pattern-u-bu'}}),{});
 assert.deepEqual(ichibuMorphOptions({word:'いちぶ'},{text:'ぶ',pattern:{id:'seidaku-bu-to-pu'}}),{});
 assert.throws(()=>createMorph(from,to,{strokeMap:[[0,1,2,3,4,4]]}),/輪郭数/);
 assert.throws(()=>createMorph(from,[splitPathString(to[0])[0]],options),/輪郭数/);
});
