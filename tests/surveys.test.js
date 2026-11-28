import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {allChaptersFinished,chapterFinished,mode2SurveyDue,questionsFor,ratingChoices,ratingChoicesFor,surveyConfig} from '../src/data/surveyConfig.js';
import {surveySession,updateSurveySession,rememberModeOneCompletion,rememberComparison,surveyDraft,saveSurveyDraft} from '../src/data/surveySession.js';
globalThis.crypto??=crypto.webcrypto;
const data=new Map();globalThis.localStorage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};globalThis.location={search:'?qa-local'};
test('all six chapter orders trigger overall only after all three; incomplete chapters never qualify',()=>{
 const chapters=['vowelChallenge','accent','mora'];for(const a of chapters)for(const b of chapters.filter(c=>c!==a)){const c=chapters.find(v=>v!==a&&v!==b),done={};done[a]=true;assert.equal(allChaptersFinished(done),false);done[b]=true;assert.equal(allChaptersFinished(done),false);done[c]=true;assert.equal(allChaptersFinished(done),true);}
 assert.equal(chapterFinished(['a','b'],{a:true}),false);assert.equal(chapterFinished([],{a:true}),false);assert.equal(chapterFinished(['a','b'],{a:true,b:true}),true);
});
test('Mode2 counts distinct viewed results; replay, threshold, and once-per-session rules',()=>{
 data.clear();rememberComparison('test','a');rememberComparison('test','a');rememberComparison('test','b');assert.equal(mode2SurveyDue(surveySession('test')),false);rememberComparison('test','c',{otherAnswersAvailable:false});assert.equal(mode2SurveyDue(surveySession('test')),true);
 updateSurveySession('test',s=>{s.surveys['mode2:overall']={done:true};});assert.equal(mode2SurveyDue(surveySession('test')),false);assert.equal(surveyConfig.mode2RequiredLevels,3);
});
test('stable drafts survive refresh; mode1/mode2, test/research and QA are isolated',()=>{
 data.clear();const a=surveyDraft('test',null,'mode1'),b=surveyDraft('test',null,'mode2');assert.notEqual(a.id,b.id);a.answers.m1_notice=4;saveSurveyDraft('test',null,a,'mode1');assert.equal(surveyDraft('test',null,'mode1').answers.m1_notice,4);assert.equal(surveyDraft('test',null,'mode1').id,a.id);assert.equal(surveyDraft('test',null,'mode2').id,b.id);assert.notEqual(surveySession('test').id,surveySession('research').id);const qa=surveySession('test').id;globalThis.location.search='';assert.notEqual(surveySession('test').id,qa);globalThis.location.search='?qa-local';
});
test('only completed or revealed reference answers count, and numeric neutral differs from cannot judge',()=>{
 data.clear();rememberModeOneCompletion({studyMode:'test',levelId:'a',chapter:'mora',completed:false});assert.equal(Object.keys(surveySession('test').completed).length,0);rememberModeOneCompletion({studyMode:'test',levelId:'a',chapter:'mora',answerRevealed:true});assert.equal(surveySession('test').completed.a.answer_revealed,true);assert.equal(ratingChoices.length,6);assert.deepEqual(ratingChoicesFor('mode1').map(([v])=>v),[1,2,3,4,5]);assert.equal(ratingChoicesFor('mode2').length,6);assert.notEqual(ratingChoices[2][0],ratingChoices[5][0]);assert.equal(questionsFor('mode1','mora').length,1);assert.equal(questionsFor('mode1').length,3);assert.equal(questionsFor('mode2').length,3);
});


import fs from 'node:fs';
import vm from 'node:vm';
test('actual Mode1 continuation waits for every level and presents chapter then overall before going home',async()=>{
 const source=fs.readFileSync('src/main.js','utf8'),body=source.slice(source.indexOf('async function advanceModeOne(){'),source.indexOf('function appendModeOneNext'));
 const completed={a:{chapter:'vowelChallenge'},b:{chapter:'vowelChallenge'}},state={completed,chapters:{}},calls=[];
 const context=vm.createContext({challengeChapter:'vowelChallenge',modeOneStudyMode:'test',modeOneCurrentId:'b',chapterItems:()=>[{id:'tutorial-kusuri',tutorial:true},{id:'a'},{id:'b'}],surveySession:()=>state,updateSurveySession:(_,fn)=>fn(state),chapterFinished,showSurvey:async o=>calls.push('chapter:'+o.chapter),showModeOneOverallIfDue:async()=>{if(allChaptersFinished(state.chapters))calls.push('overall');},nextModeOneChapter:c=>({vowelChallenge:'accent',accent:'mora'})[c],nextChapterItem:()=>null,openChapterItem:async()=>calls.push('next'),navigate:s=>calls.push(s)});vm.runInContext(body,context);
 await context.advanceModeOne();assert.deepEqual(calls,['chapter:vowelChallenge','next']);assert.equal(state.chapters.vowelChallenge,true);
 calls.length=0;state.chapters.accent=true;state.chapters.mora=true;context.challengeChapter='vowelChallenge';await context.advanceModeOne();assert.deepEqual(calls,['chapter:vowelChallenge','overall','home']);
 calls.length=0;delete completed.a;await context.advanceModeOne();assert.deepEqual(calls,['chapterLevels']);
});
test('failed cloud receipt preserves one stable raw answer and retry keeps the same submission id',async()=>{
 const source=fs.readFileSync('src/data/studyEvents.js','utf8').split(String.fromCharCode(10)).filter(line=>!line.startsWith('import ')).join(String.fromCharCode(10)).replaceAll('export ','');let calls=0;const storage=new Map();
 const context=vm.createContext({crypto:crypto.webcrypto,structuredClone,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},participantId:()=>crypto.randomUUID(),APP_VERSION:'test',studyMetadata:()=>({}),queueAndSend:async record=>{calls++;if(calls===1)throw Error('offline');return {status:'synced'};}});vm.runInContext(source,context);
 const record={id:crypto.randomUUID(),studyMode:'test',event_type:'survey',gameMode:'mode1',answers:[{question_id:'m1_notice',answer_value:4}]};const failed=await context.saveStudyEvent(record,{waitForSync:true});assert.equal(failed.sync.status,'pending');const retried=await context.saveStudyEvent(record,{waitForSync:true});assert.equal(retried.sync.status,'synced');assert.equal(context.readStudyEvents().length,1);assert.equal(context.readStudyEvents()[0].answers[0].answer_value,4);
});

test('survey continuation never waits for receipt and Skip is removed',()=>{const s=fs.readFileSync('src/surveyUI.js','utf8');assert.ok(s.includes('actions.append(submit,proceed)'));assert.ok(s.includes('b.disabled=b!==proceed'));assert.ok(s.includes('b.disabled=b!==submit&&b!==proceed'));assert.equal(s.includes("element('button','スキップ')"),false);assert.ok(s.includes('saved.deferred=true'));});
