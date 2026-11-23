import test from 'node:test';
import assert from 'node:assert/strict';
import {modeTwoGuideSteps,nextModeTwoGuideStep} from '../src/data/modeTwoGuideSteps.js';
import {markTutorial,tutorialMetadata,TUTORIAL_VERSION,MODE_TWO_TUTORIAL_VERSION} from '../src/data/researchState.js';

test('Mode2 guide follows actual editor actions and ends before submission',()=>{
 let step='listen';const events=['listened','kana','tab:patterns','pattern','tab:pitch','pitch','emphasis','tab:duration','beat','undo'];
 for(const [index,event]of events.entries()){step=nextModeTwoGuideStep(step,event);assert.equal(step,modeTwoGuideSteps[index+1]);}
 assert.equal(step,'free');assert.equal(nextModeTwoGuideStep(step,'submit'),'free');assert.equal(nextModeTwoGuideStep(step,'kana'),'free');
});
test('unrelated clicks do not advance; optional emphasis may be explained without selecting it',()=>{
 for(const [step,wrong]of [['listen','pattern'],['kana','tab:pitch'],['pattern','kana'],['pitch','emphasis'],['beat','kana']])assert.equal(nextModeTwoGuideStep(step,wrong),step);
 assert.equal(nextModeTwoGuideStep('emphasis','next'),'beat-tab');assert.equal(nextModeTwoGuideStep('beat','next'),'beat');assert.equal(nextModeTwoGuideStep('listen','next'),'listen');
});
test('new Mode2 guide version distinguishes completed/skipped and preserves Mode1 tutorial history',()=>{
 const old=globalThis.localStorage,values=new Map();globalThis.localStorage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
 try{
  markTutorial('mode1','accent','completed');markTutorial('mode2','exploration','started');
  assert.equal(tutorialMetadata('mode1','accent').tutorial_version,TUTORIAL_VERSION);assert.equal(tutorialMetadata('mode1','accent').tutorial_completed,true);
  assert.equal(tutorialMetadata('mode2','exploration').tutorial_version,MODE_TWO_TUTORIAL_VERSION);assert.equal(tutorialMetadata('mode2','exploration').tutorial_completed,null);
  markTutorial('mode2','exploration','skipped');assert.equal(tutorialMetadata('mode2','exploration').tutorial_completed,false);
  markTutorial('mode2','exploration','completed');assert.equal(tutorialMetadata('mode2','exploration').tutorial_completed,true);
  assert.equal(tutorialMetadata('mode1','accent').tutorial_completed,true);
 }finally{globalThis.localStorage=old;}
});
