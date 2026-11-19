
import test from 'node:test';
import assert from 'node:assert/strict';
import {reviseDiyQuestion} from '../src/data/diyStore.js';
import {archiveLevel,restoreLevel} from '../src/data/levelManagement.js';
import {resolveModeOne} from '../src/data/patternLibrary.js';
import {scoreModeOne} from '../src/data/modeOneStats.js';

test('editing an existing DIY question preserves identity/audio and adds independent correct targets',()=>{
 const audio=new Blob(['audio']);
 const old={id:'question',word:'くすり',reading:['く','す','り'],targetIndexes:[0],patternChoices:['ku'],audioBlob:audio,audioName:'original.wav',createdAt:'2026-01-01'};
 const updated=reviseDiyQuestion(old,{...old,id:'ignored-new-id',targetIndexes:[0,1],patternChoices:['ku','su'],createdAt:'ignored-date'});
 assert.equal(updated.id,old.id);assert.equal(updated.createdAt,old.createdAt);assert.equal(updated.recordingId,'question-recording-v1');assert.equal(updated.audioBlob,audio);
 assert.deepEqual(old.targetIndexes,[0]);assert.deepEqual(updated.history[0].targetIndexes,[0]);assert.deepEqual(updated.targetIndexes,[0,1]);
 const library={groups:[],glyphs:[{kana:'く',patterns:[{id:'ku'}]},{kana:'す',patterns:[{id:'su'}]}]};
 const resolved=resolveModeOne(library,updated);assert.deepEqual(resolved.targets,[0,1]);assert.equal(resolved.characters[1].pattern.id,'su');
 assert.equal(scoreModeOne([{kind:'kana',index:0}],{scoring:'selection',targets:resolved.targets}).completed,false);
 assert.equal(scoreModeOne([{kind:'kana',index:0},{kind:'kana',index:1}],{scoring:'selection',targets:resolved.targets}).completed,true);
 const again=reviseDiyQuestion(updated,{...updated,word:'改訂'});assert.equal(again.history.length,2);assert.equal(again.history[1].history,undefined);assert.equal(again.revision,2);
});
test('replacing a DIY recording changes recording identity but retains the original in history',()=>{
 const old={id:'q',recordingId:'recording',audioBlob:new Blob(['old']),createdAt:'date'};
 const updated=reviseDiyQuestion(old,{...old,audioBlob:new Blob(['new'])});
 assert.notEqual(updated.recordingId,'recording');assert.equal(updated.history[0].recordingId,'recording');assert.equal(updated.history[0].audioBlob,old.audioBlob);
});
test('author deletion and restoration are reversible without changing IDs or other catalogue data',()=>{
 const original={revision:4,levels:[{id:'a',audio:'assets/a.wav',recordingId:'r',defaultAccent:['high']},{id:'b'}],glyphs:[{kana:'く'}]};
 const archived=archiveLevel(original,'a');assert.deepEqual(original.levels.map(l=>l.id),['a','b']);assert.deepEqual(archived.levels.map(l=>l.id),['b']);assert.ok(archived.archivedLevels[0].deletedAt);
 const restored=restoreLevel(archived,'a');assert.deepEqual(restored.levels.find(l=>l.id==='a'),original.levels[0]);assert.equal(restored.archivedLevels.length,0);assert.equal(restored.glyphs,original.glyphs);assert.equal(restored.revision,4);
 assert.throws(()=>archiveLevel(original,'missing'));assert.throws(()=>restoreLevel({...archived,levels:original.levels},'a'));
});
