import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createRotationPicker,nextGlyphAngle,accentBackgroundColor,accentBackgroundScale} from '../src/glyph/accentBackground.js';
import {initialArtwork,restoreArtwork,modeThreeCharacters} from '../src/data/modeThreeModel.js';
import {createEditHistory} from '../src/editHistory.js';
test('explicit background rerolls change the angle while ordinary redraws keep the latest angle',()=>{
 const picker=createRotationPicker(()=>.1),first=picker('base:0'),next=picker('base:0',true);assert.notEqual(first,next);assert.equal(picker('base:0'),next);assert.ok(next>=0&&next<360);
});
test('glyph rotations never accumulate beyond ten degrees and repeated clicks produce visible changes',()=>{
 for(const previous of [-10,-7,-1,0,1,7,10])for(const value of [0,.1,.49,.5,.9,.999999]){const next=nextGlyphAngle(previous,()=>value);assert.ok(next>=-10&&next<=10);assert.ok(Math.abs(next-previous)>=2);}
 let angle=0;for(let i=0;i<1000;i++){angle=nextGlyphAngle(angle,()=>.5);assert.ok(Math.abs(angle)<=10);}
});
test('red is reserved for either chosen emphasis and the ordinary pitch palette stays blue/yellow',()=>{
 for(const rank of [1,2])assert.equal(accentBackgroundColor({emphasisRank:rank,pitch:'high',defaultPitch:'high'}),'#d13419');
 assert.equal(accentBackgroundColor({emphasisRank:null,pitch:'low',defaultPitch:'low'}),'#80bedb');assert.equal(accentBackgroundColor({emphasisRank:null,pitch:'low',defaultPitch:'high'}),'#f5c400');
 assert.ok(accentBackgroundScale(3)>2.5);assert.ok(accentBackgroundScale(2)>accentBackgroundScale(1));
});
test('saved rotation maps are validated, and undo restores exact former artwork orientations',async()=>{
 const library=JSON.parse(await fs.readFile(new URL('../public/content/library.json',import.meta.url),'utf8')),characters=modeThreeCharacters(library);
 let state=initialArtwork();state.glyphAngles={'base:0':500,'missing':4,'base:2':Infinity};state.backgroundAngles={'base:0':-45,'base:1':721};
 state=restoreArtwork(state,characters);assert.deepEqual(state.glyphAngles,{'base:0':10});assert.deepEqual(state.backgroundAngles,{'base:0':315,'base:1':1});
 const edits=createEditHistory({capture:()=>state,restore:s=>{state=s;}});edits.checkpoint();state.glyphAngles['base:0']=-8;state.backgroundAngles['base:0']=40;edits.undo();assert.equal(state.glyphAngles['base:0'],10);assert.equal(state.backgroundAngles['base:0'],315);
 const legacy=initialArtwork();delete legacy.glyphAngles;delete legacy.backgroundAngles;assert.deepEqual(restoreArtwork(legacy,characters).glyphAngles,{});
});
