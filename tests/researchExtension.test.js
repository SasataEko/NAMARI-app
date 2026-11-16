import test from 'node:test';
import assert from 'node:assert/strict';
import {researchReady,storeConsent,consentState,markTutorial,tutorialMetadata,APP_VERSION} from '../src/data/researchState.js';
import {createComparisonMetrics} from '../src/audioComparison.js';
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};
test('research readiness is fail-closed until both review and required protocol fields are present',()=>{
 const p={research_enabled:true,approved:true,consent_version:'reviewed-v1',approved_by:'researcher and supervisor',approved_at:'2026-11-16T00:00:00Z',researcher:'r',supervisor:'s',institution:'i',contact:'contact',retention:'reviewed retention',sections:Array(5).fill({})};
 assert.equal(researchReady(p),true);for(const patch of [{approved:false},{research_enabled:false},{consent_version:'draft-v1'},{contact:null},{approved_at:null}])assert.equal(researchReady({...p,...patch}),false);
});
test('test consent cannot overwrite research consent, and withdrawal is kept explicit',()=>{
 memory.clear();storeConsent('test',{status:'consented',synced:true,consent_version:'draft-v1'});assert.equal(consentState('research'),null);
 storeConsent('research',{status:'withdrawn',synced:false});assert.equal(consentState('research').status,'withdrawn');assert.equal(consentState('test').status,'consented');
});
test('tutorial not-started, skipped and completed have distinct values, scoped by mode and chapter',()=>{
 memory.clear();assert.equal(tutorialMetadata('mode2','exploration').tutorial_completed,null);markTutorial('mode2','exploration','skipped');assert.equal(tutorialMetadata('mode2','exploration').tutorial_completed,false);
 markTutorial('mode2','exploration','completed');assert.equal(tutorialMetadata('mode2','exploration').tutorial_completed,true);assert.equal(tutorialMetadata('mode1','mora').tutorial_completed,null);assert.ok(APP_VERSION);
});
test('comparison counts reuse primary play count and separate pre/post first visual operation',()=>{
 const m=createComparisonMetrics();m.referencePlayed();assert.equal(m.snapshot(0).reference_comparison_used,false);m.learnerPlayed();m.markVisual();m.referencePlayed();m.learnerPlayed();const p=m.snapshot(2);
 assert.equal(p.reference_comparison_used,true);assert.equal(p.reference_audio_play_count,2);assert.equal(p.learner_audio_play_count,2);assert.equal(p.learner_before_visual_count,1);assert.equal(p.learner_after_visual_count,1);assert.equal(p.reference_before_visual_count,1);assert.equal(p.reference_after_visual_count,1);
});
