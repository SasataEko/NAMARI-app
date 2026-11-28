import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import {initialArtwork,artworkNodes,setArtworkPitch,toggleArtworkEmphasis} from '../src/data/modeThreeModel.js';
import {visualStatistics,averageEmphasisVisual,previewArtwork,toVisualPreview,averageGlyphPaths} from '../src/data/modeTwoVisual.js';
const level={id:'two-word',characters:[{text:'きゃ',features:[{id:'p'}]},{text:'っ',features:[]},{text:'と',features:[]}],defaultAccent:['low','low','high']};
const answer=()=>({pattern:[null,null,null],pitch:['low','low','high'],beats:[1,1,1],blanks:[false,false],emphasis:[],interactionVersion:'mode2-make-v1'});
test('shared artwork supports arbitrary mora counts and links original small-tsu plus added beats',()=>{
 const state=initialArtwork(level);assert.equal(state.patterns.length,3);assert.equal(state.gameMode,'mode2');state.beats[0]=2;state.blanks[1]=true;
 assert.deepEqual(artworkNodes(state).map(n=>n.text),['きゃ','ー','っ','ッ','と']);
 assert.equal(setArtworkPitch(state,artworkNodes(state)[0],'high'),true);assert.deepEqual(artworkNodes(state).map(n=>n.pitch),['high','high','high','high','high']);
 assert.equal(toggleArtworkEmphasis(state,'long:0'),true);assert.equal(toggleArtworkEmphasis(state,'blank:1'),true);assert.equal(toggleArtworkEmphasis(state,'base:2'),false);
 assert.equal(initialArtwork().patterns.length,6);
});
test('emphasis means exclude unrecorded historical fields; examples ignore cosmetic rotation and expose no identity',()=>{
 const a={...answer(),participantId:'secret',emphasis:['base:0'],beats:[2,1,1],glyphAngles:{'base:0':8}},b={...a,glyphAngles:{'base:0':-8}},old={...answer()};delete old.interactionVersion;delete old.emphasis;
 const g=visualStatistics([a,b,old],3);assert.equal(g.emphasisCount,2);assert.equal(g.emphasisRates['base:0'].first,1);assert.equal(g.longRates[0],2/3);assert.equal(g.commonExamples[0].count,2);assert.equal(g.commonExamples.length,2);assert.equal(JSON.stringify(g).includes('secret'),false);assert.equal(g.commonExamples[0].answer.glyphAngles['base:0'],8);
});
test('all-skipped answers do not invent frequent examples or emphasis',()=>{
 const g=visualStatistics([{...answer(),skipped:true}],3);assert.deepEqual(g.commonExamples,[]);assert.deepEqual(g.emphasisRates,{});assert.deepEqual(g.longRates,[0,0,0]);
});
test('mean backgrounds interpolate strength and high/low independently of marked-letter color',()=>{
 const node={key:'base:0',pitch:.5,defaultPitch:'low'};
 const normal=averageEmphasisVisual(node,{}),half=averageEmphasisVisual(node,{emphasisRates:{'base:0':{first:.5,second:0}}}),strong=averageEmphasisVisual(node,{emphasisRates:{'base:0':{first:1,second:0}}});
 assert.equal(normal.scale,.65);assert.equal(half.scale,(.65+3.1)/2);assert.equal(strong.scale,3.1);assert.notEqual(normal.color,half.color);
 const data=toVisualPreview({...answer(),beats:[1.3,1,1],longRates:[.3,0,0],blanks:[.2,0]},level),state=previewArtwork(data,level);assert.deepEqual(artworkNodes(state).map(n=>[n.key,n.rate]),[['base:0',1],['long:0',.3],['blank:0',.2],['base:1',1],['base:2',1]]);
});
test('symbol states remain single visible glyphs and are independent of notice rate',()=>{
 const data={normal:{shapes:[{d:'M0 0L1 0L1 1Z'}]},variants:[{id:'s',renderMode:'symbol-switch',glyph:{shapes:[{d:'M0 0L2 0L2 2Z'}]}}]};
 assert.deepEqual(averageGlyphPaths(data,{s:.6}),data.variants[0].glyph.shapes.map(p=>p.d));assert.deepEqual(averageGlyphPaths(data,{s:.4}),data.normal.shapes.map(p=>p.d));
});
test('Apps Script aggregate agrees with local projection without raw participant metadata',async()=>{
 const context=vm.createContext({});vm.runInContext(await fs.readFile('apps-script/Mode2Visual.gs','utf8'),context);
 const rows=[{...answer(),emphasis:['base:0','long:0'],beats:[2,1,1]},answer()];const remote=JSON.parse(JSON.stringify(context.mode2VisualStats_({},rows,level))),local=visualStatistics(rows,3);
 assert.deepEqual(remote,local);assert.throws(()=>context.validateMode2Visual_({...rows[0],emphasis:['base:99']},level),/INVALID_EMPHASIS/);assert.doesNotThrow(()=>context.validateMode2Visual_(rows[0],level));
});
