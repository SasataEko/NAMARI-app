import test from 'node:test';
import assert from 'node:assert/strict';
import { createModeOneTracker,scoreModeOne } from '../src/data/modeOneStats.js';
const selection={scoring:'selection',targets:[0,2],characters:[{text:'く'},{text:'す'},{text:'り'}]};
test('closing or reviewing cards never sets feedback; explicit feedback is opt-in once per attempt',()=>{const tracker=createModeOneTracker(selection);tracker.cardViewed();tracker.cardClosed();tracker.cardViewed();tracker.cardClosed();assert.equal(tracker.capture().feedbackUnclear,null);assert.equal(tracker.capture().feedbackSource,null);assert.equal(tracker.requestUnclear([{patternId:'ku'}]),true);assert.equal(tracker.requestUnclear([]),false);assert.equal(tracker.capture().feedbackUnclear,true);assert.equal(tracker.capture().feedbackSource,'feedback_button');assert.equal(createModeOneTracker(selection).capture().feedbackUnclear,null);});
test('wrong attempts count; revisiting solved targets does not inflate accuracy',()=>{let time=0;const tracker=createModeOneTracker(selection,()=>time);time=100;tracker.answer({kind:'kana',index:1});time=200;tracker.answer({kind:'kana',index:0});time=300;tracker.answer({kind:'kana',index:0});assert.equal(tracker.capture().completed,false);time=400;tracker.answer({kind:'kana',index:2});time=900;const s=tracker.capture();assert.equal(s.completed,true);assert.equal(s.correctCount,2);assert.equal(s.errorCount,1);assert.equal(s.attemptCount,3);assert.equal(s.accuracy,2/3);assert.equal(s.firstAttemptCorrect,false);assert.equal(s.responseDurationMs,400);assert.equal(s.totalDurationMs,900);});
test('pattern answers count whole submissions and missing standards keep correctness null',()=>{const definition={scoring:'pattern',pitch:['low','high']};assert.equal(scoreModeOne([{kind:'answer',pitch:['high','high']},{kind:'answer',pitch:['low','high']}],definition).accuracy,.5);const unscored=scoreModeOne([{kind:'answer',pitch:['high']},{kind:'finish'}],{scoring:'none'});assert.equal(unscored.completed,true);assert.equal(unscored.errorCount,null);assert.equal(unscored.accuracy,null);assert.equal(unscored.attemptCount,1);});
test('abandoned trials remain incomplete and are not converted to misunderstanding feedback',()=>{const tracker=createModeOneTracker(selection);tracker.answer({kind:'kana',index:1});const s=tracker.abandon();assert.equal(s.completionStatus,'abandoned');assert.equal(s.completed,false);assert.equal(s.feedbackUnclear,null);});

test('rhythm answers score lengths and blanks independently from accent, and a retry keeps errors',()=>{
 const definition={scoring:'rhythm',characters:['ら','ん','ぷ'].map(text=>({text})),beats:[1,1,2],blanks:[false,false]};
 const tracker=createModeOneTracker(definition);
 tracker.answer({kind:'rhythm',beats:[1,1,1],blanks:[false,false]});
 tracker.answer({kind:'rhythm',beats:[1,1,2],blanks:[true,false]});
 let result=tracker.capture();assert.equal(result.completed,false);assert.equal(result.errorCount,2);
 result=tracker.answer({kind:'rhythm',beats:[1,1,2],blanks:[false,false]});
 assert.equal(result.completed,true);assert.equal(result.errorCount,2);assert.equal(result.correctCount,1);assert.equal(result.accuracy,1/3);assert.equal(result.feedbackUnclear,null);
});
