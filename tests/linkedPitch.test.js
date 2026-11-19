
import test from 'node:test';import assert from 'node:assert/strict';
import {linkPitch,linkedMora} from '../src/data/linkedPitch.js';
import {tutorialDefinition} from '../src/data/tutorials.js';
test('small tsu and explicit long mark follow the preceding pitch and propagate in a chain',()=>{
 const tokens=['き','っ','ぷ','ー','っ'];assert.deepEqual(linkPitch(tokens,['high','low','low','high','high']),['high','high','low','low','low']);assert.deepEqual(linkPitch(tokens,['low',null,'high',null,null]),['low','low','high','high','high']);
});
test('unanswered linked mora stays unanswered; initial markers and ordinary vowel kana are independent',()=>{
 const source=[null,'high','low'];assert.deepEqual(linkPitch(['き','っ','ぷ'],source),[null,null,'low']);assert.deepEqual(source,[null,'high','low']);assert.equal(linkedMora(['っ'],0),false);assert.deepEqual(linkPitch(['お','う','え','い'],['high','low','high','low']),['high','low','high','low']);assert.deepEqual(linkPitch(['カ','ッ','ー'],['low','high','high']),['low','low','low']);
});
test('Mode1 reference definition uses the same authoring linkage without mutating saved input',()=>{
 const q={mode:'diyAccent',reading:['き','っ','ぷ'],pattern:['high','low','low']};assert.deepEqual(tutorialDefinition(q,{}).pitch,['high','high','low']);assert.deepEqual(q.pattern,['high','low','low']);
});
