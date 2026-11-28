import test from 'node:test';import assert from 'node:assert/strict';import {archiveModeOneLevel,restoreModeOneLevel} from '../src/data/levelManagement.js';import {mergeModeOneQuestions} from '../src/data/authorQuestions.js';
test('Mode1 archive hides project and newer browser copies, restores the same identity and leaves responses/assets intact',()=>{
 const q={id:'q',word:'いちぶ',mode:'diyVowel',reading:['い','ち','ぶ'],audio:'assets/a.wav',recordingId:'r',targetIndexes:[1,2],patternChoices:[null,'chi','bu']},library={modeOneLevels:[q],levels:[{id:'other'}],glyphs:[{kana:'ぶ'}],audit:[{id:'answer'}]};
 const deleted=archiveModeOneLevel(library,q);assert.equal(library.modeOneLevels.length,1);assert.equal(deleted.modeOneLevels.length,0);assert.equal(mergeModeOneQuestions(deleted,[{...q,updatedAt:'2099'}]).length,0);assert.equal(deleted.audit,library.audit);assert.equal(deleted.glyphs,library.glyphs);assert.equal(deleted.levels,library.levels);assert.ok(deleted.archivedModeOneLevels[0].deletedAt);
 const restored=restoreModeOneLevel(JSON.parse(JSON.stringify(deleted)),q.id);assert.deepEqual(restored.modeOneLevels[0],q);assert.equal(restored.archivedModeOneLevels.length,0);assert.equal(mergeModeOneQuestions(restored).length,1);
});
test('browser-only Mode1 archive does not serialize audio blobs or turn a local recording into a broken project level',()=>{
 const q={id:'local',word:'テスト',audioBlob:new Blob(['sound']),history:[{audioBlob:new Blob(['old'])}],reading:['て','す','と']},library={modeOneLevels:[]};const archived=archiveModeOneLevel(library,q),record=archived.archivedModeOneLevels[0];assert.equal(record.audioBlob,undefined);assert.equal(record.history,undefined);assert.equal(record.localOnly,true);const restored=restoreModeOneLevel(archived,'local');assert.equal(restored.modeOneLevels.length,0);assert.equal(mergeModeOneQuestions(restored,[q])[0],q);
});
test('tutorials cannot accidentally be archived, and missing or conflicting restores are rejected',()=>{
 assert.throws(()=>archiveModeOneLevel({},{id:'tutorial',tutorial:true}));assert.throws(()=>restoreModeOneLevel({},'missing'));assert.throws(()=>restoreModeOneLevel({modeOneLevels:[{id:'q'}],archivedModeOneLevels:[{id:'q'}]},'q'));
});
