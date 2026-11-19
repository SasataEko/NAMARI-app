
import test from 'node:test';import assert from 'node:assert/strict';
import {projectModeOneDefinition,projectModeOneSnapshot} from '../src/data/projectModeOne.js';
import {publishDiyQuestions} from '../src/data/publishDiy.js';
const library={revision:1,groups:[],glyphs:[{kana:'く',normal:'assets/normal/ku.svg',patterns:[{id:'round-ku'}]},{kana:'す',normal:'assets/normal/su.svg',patterns:[{id:'round-su'}]}],levels:[]};
test('published Mode1 keeps multiple target positions and resolves their exact shared patterns',()=>{
 const q={id:'question',mode:'diyVowel',word:'くす',reading:['く','す'],targetIndexes:[0,1],patternChoices:['round-ku','round-su']};const d=projectModeOneDefinition(library,q);assert.deepEqual(d.targets,[0,1]);assert.deepEqual(d.patternChoices,['round-ku','round-su']);assert.throws(()=>projectModeOneDefinition(library,{...q,patternChoices:['missing','round-su']}));
});
test('published Mode1 snapshots exclude browser history/blobs and preserve recording identity and zero beats',()=>{
 const q={id:'rhythm-q',mode:'diyMora',word:'くす',reading:['く','す'],beats:[1,0],blanks:[false],audioBlob:new Blob(['private-local-audio']),history:[{word:'old'}]};const out=projectModeOneSnapshot(q,'uploads/audio/example.wav','hash');assert.equal(out.recordingId,'rhythm-q-recording-v1');assert.equal(out.audioBlob,undefined);assert.equal(out.history,undefined);assert.deepEqual(projectModeOneDefinition(library,out).beats,[1,0]);
});
test('publishing persists audio and settings; repeating publication reuses audio and upserts the same level',async()=>{
 let current=structuredClone(library),uploads=0,saves=0;const previousFetch=globalThis.fetch;
 globalThis.fetch=async(url,options)=>{if(url==='/__author/status')return Response.json({enabled:true});if(String(url).endsWith('content/library.json'))return Response.json(current);if(String(url).startsWith('/__author/upload')){uploads++;return Response.json({path:'uploads/audio/q.wav'});}if(url==='/__author/save'){current=JSON.parse(options.body);current.revision++;saves++;return Response.json(current);}throw Error('Unexpected URL '+url);};
 try{const q={id:'q',mode:'diyAccent',word:'くす',reading:['く','す'],pattern:['low','high'],audioBlob:new Blob(['audio']),audioName:'q.wav'};await publishDiyQuestions([q]);assert.equal(uploads,1);assert.equal(current.modeOneLevels.length,1);assert.equal(current.modeOneLevels[0].audio,'uploads/audio/q.wav');await publishDiyQuestions([{...q,word:'改訂'}]);assert.equal(uploads,1);assert.equal(saves,2);assert.equal(current.modeOneLevels.length,1);assert.equal(current.modeOneLevels[0].word,'改訂');await publishDiyQuestions([],[q]);assert.equal(current.modeOneLevels.length,0);
 }finally{globalThis.fetch=previousFetch;}
});
