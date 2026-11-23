import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createModeOneTracker,scoreModeOne} from '../src/data/modeOneStats.js';
import {modeOneAuthorQuestions,modeTwoAuthorQuestions,mergeModeOneQuestions,upsertModeOneQuestion} from '../src/data/authorQuestions.js';
import {playableLevels} from '../src/data/projectLibrary.js';
const definition={scoring:'selection',targets:[0,2],characters:['く','す','り'].map(text=>({text}))};
test('reveal unlock requires three consecutive errors, not three spread across correct identifications',()=>{
 const t=createModeOneTracker(definition);assert.equal(t.revealAnswer(),false);
 t.answer({kind:'kana',index:1});t.answer({kind:'kana',index:1});t.answer({kind:'kana',index:0});t.answer({kind:'kana',index:1});
 assert.equal(t.capture().errorCount,3);assert.equal(t.capture().answerRevealAvailable,false);assert.equal(t.revealAnswer(),false);
 t.answer({kind:'kana',index:1});t.answer({kind:'kana',index:1});assert.equal(t.capture().answerRevealAvailable,true);
});
test('revealing is terminal, retains real errors and partial correct targets, and never produces completion',()=>{
 let time=0;const t=createModeOneTracker(definition,()=>time);
 t.answer({kind:'kana',index:0});for(let i=0;i<3;i++){time+=100;t.answer({kind:'kana',index:1});}
 time=500;assert.equal(t.revealAnswer(),true);const r=t.capture();assert.equal(r.gaveUp,true);assert.equal(r.completionStatus,'gave_up');assert.equal(r.completed,false);assert.equal(r.attemptCount,4);assert.equal(r.errorCount,3);assert.equal(r.correctCount,1);assert.equal(r.accuracy,.25);
 assert.equal(t.revealAnswer(),false);t.answer({kind:'kana',index:2});assert.equal(t.capture().events.length,5);time=1000;assert.equal(t.abandon().completionStatus,'gave_up');assert.equal(t.capture().responseDurationMs,500);
 t.cardViewed();t.cardClosed();assert.equal(t.capture().feedbackUnclear,null);assert.equal(t.capture().gaveUpAt,r.gaveUpAt);
});
test('all three score types unlock the same reveal rule; completed answers cannot give up',()=>{
 const pitch={scoring:'pattern',pitch:['high','low']},rhythm={scoring:'rhythm',beats:[1,2],blanks:[false]};
 for(const [d,e] of [[pitch,{kind:'answer',pitch:['low','low']}],[rhythm,{kind:'rhythm',beats:[1,1],blanks:[false]}]]){const t=createModeOneTracker(d);for(let i=0;i<3;i++)t.answer(e);assert.equal(t.revealAnswer(),true);assert.equal(t.capture().completed,false);}
 const t=createModeOneTracker(definition);for(let i=0;i<3;i++)t.answer({kind:'kana',index:1});t.answer({kind:'kana',index:0});t.answer({kind:'kana',index:2});assert.equal(t.revealAnswer(),false);assert.equal(t.capture().completed,true);
});
test('catalogue edits preserve question and recording identities, support multiple targets, and prefer newer saves',async()=>{
 const library=JSON.parse(await fs.readFile('public/content/library.json','utf8')),q=modeOneAuthorQuestions(library).find(q=>q.mode==='diyVowel'&&q.reading.every(k=>library.glyphs.some(g=>g.kana===k&&g.patterns.length)));
 const draft={...q,targetIndexes:[0,1],patternChoices:q.reading.map(k=>library.glyphs.find(g=>g.kana===k).patterns[0].id)};
 const saved=upsertModeOneQuestion(library,draft),edited=saved.modeOneLevels.find(l=>l.id===q.id);assert.deepEqual(edited.targetIndexes,[0,1]);assert.equal(edited.recordingId,q.recordingId);assert.equal(saved.levels,library.levels);assert.equal(library.modeOneLevels.some(l=>l===edited),false);
 const chosen=mergeModeOneQuestions(saved,[{...draft,updatedAt:'2000-01-01T00:00:00Z'}]);assert.equal(chosen.find(l=>l.id===q.id),edited);
 assert.throws(()=>upsertModeOneQuestion(library,{...draft,targetIndexes:[]}),/正解/);
});
test('builtin Mode2 can be edited under the original ID without duplicate playable entries',async()=>{
 const library=JSON.parse(await fs.readFile('public/content/library.json','utf8')),builtin=modeTwoAuthorQuestions(library).find(l=>l.id==='kusuri');assert.ok(builtin.audio.startsWith('assets/'));
 const next={...library,levels:[{...builtin,word:'くすり編集'},...library.levels.filter(l=>l.id!=='kusuri')]};const playable=playableLevels(next).filter(l=>l.id==='kusuri');assert.equal(playable.length,1);assert.equal(playable[0].word,'くすり編集');assert.equal(playable[0].recordingId,builtin.recordingId);
});
