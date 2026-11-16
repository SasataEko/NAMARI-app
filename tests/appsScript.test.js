import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
function server(){
 let lockHeld=false;
 const sheets=new Map(),props=new Map([['SPREADSHEET_ID','test'],['MIN_AGGREGATE_COUNT','3'],['RESEARCH_ENABLED','true'],['RESEARCH_PROTOCOL_APPROVED','true'],['RESEARCH_CONSENT_VERSION','test-approved-v1'],['RESEARCH_APPROVED_AT','2026-11-16T00:00:00Z']]),cache=new Map();
 const sheet=()=>({data:[],getLastRow(){return this.data.length;},clearContents(){this.data=[];},appendRow(r){this.data.push([...r]);},setFrozenRows(){},getRange(at,col,n,m){return {setValues:rows=>{this.data[at-1]=[...rows[0]];},setFontWeight(){}};},getDataRange(){return {getValues:()=>this.data.map(r=>[...r])};}});
 const ss={getSheetByName:n=>sheets.get(n),insertSheet:n=>{const s=sheet();sheets.set(n,s);return s;}};
 const context=vm.createContext({console,MODE1_MANIFEST:JSON.parse(fs.readFileSync('apps-script/mode-one-levels.json','utf8')),LEVEL_MANIFEST:JSON.parse(fs.readFileSync('apps-script/levels.json','utf8')),PropertiesService:{getScriptProperties:()=>({getProperty:k=>props.get(k),setProperty:(k,v)=>props.set(k,v)})},SpreadsheetApp:{openById:()=>ss,flush(){}},Utilities:{getUuid:()=>crypto.randomUUID(),computeHmacSha256Signature:(v,k)=>[...crypto.createHmac('sha256',k).update(v).digest()]},LockService:{getScriptLock:()=>({waitLock(){if(lockHeld)throw new Error('NESTED_SCRIPT_LOCK');lockHeld=true;},releaseLock(){lockHeld=false;}})},CacheService:{getScriptCache:()=>({get:k=>cache.get(k),put:(k,v)=>cache.set(k,v)})},ContentService:{MimeType:{JSON:'json',JAVASCRIPT:'js'},createTextOutput:text=>({text,setMimeType(){return this;}})}});
 vm.runInContext(fs.readFileSync('apps-script/Code.gs','utf8').replace(/^\uFEFF/,''),context);vm.runInContext(fs.readFileSync('apps-script/Mode1.gs','utf8'),context);context.setup_();vm.runInContext(fs.readFileSync('apps-script/Research.gs','utf8'),context);context.setupResearchExtension_();return {c:context,sheets};
}
function record(c,id=crypto.randomUUID(),mode='research'){
 const l=c.LEVEL_MANIFEST[0];return withConsent(c,{id:crypto.randomUUID(),participantId:id,studyMode:mode,levelId:l.levelId,levelVersion:l.levelVersion,recordingId:l.recordingId,createdAt:new Date().toISOString(),noticed:l.characters.map((_,i)=>i===0),pattern:l.characters.map((ch,i)=>i===0?(ch.patterns[0]||null):null),pitch:l.defaultAccent,beats:l.characters.map((_,i)=>i===0?2:1),blanks:l.characters.slice(1).map(()=>false),audioPlayed:true,listenedMs:1000,responseDurationMs:5000,skipped:false,answerStatus:'explored'});
}
test('Apps Script upserts one Raw row, preserves Audit, rejects a stolen participant ID and retries idempotently',()=>{
 const {c,sheets}=server(),p=record(c),key=crypto.randomUUID();c.save_({response:p,participantKey:key});c.save_({response:p,participantKey:key});assert.equal(sheets.get('Raw').data.length,2);assert.equal(sheets.get('Audit').data.length,2);
 const updated={...p,id:crypto.randomUUID(),noticed:p.noticed.map(()=>false),pattern:p.pattern.map(()=>null)};c.save_({response:updated,participantKey:key});assert.equal(sheets.get('Raw').data.length,2);assert.equal(sheets.get('Audit').data.length,3);assert.throws(()=>c.save_({response:{...updated,id:crypto.randomUUID()},participantKey:crypto.randomUUID()}),/IDENTITY_MISMATCH/);
});
test('Mode2 aggregate is version/mode isolated; one participant is visible and owner deletion updates means',()=>{
 const {c,sheets}=server();let query;
 for(let i=0;i<4;i++){const p=record(c);query=p;c.save_({response:p,participantKey:crypto.randomUUID()});}
 assert.equal(c.stats_(query).count,4);assert.equal(c.stats_(query).beats[0],2);sheets.get('Raw').data.splice(1,1);assert.equal(c.stats_(query).count,3);sheets.get('Raw').data.splice(1,1);assert.equal(c.stats_(query).count,2);assert.equal(Boolean(c.stats_(query).suppressed),false);sheets.get('Raw').data.splice(1,1);assert.equal(c.stats_(query).count,1);assert.equal(Boolean(c.stats_(query).suppressed),false);sheets.get('Raw').data.splice(1,1);assert.equal(c.stats_(query).suppressed,true);
 assert.equal(c.stats_({...query,studyMode:'test'}).count,0);assert.throws(()=>c.stats_({...query,levelVersion:'wrong'}),/UNKNOWN_LEVEL_VERSION/);
});
test('only aggregate and opaque receipt are public; malformed callback and raw read/delete are refused',()=>{
 const {c}=server();const callback='namari_0123456789abcdef';assert.equal(c.doGet({parameter:{action:'raw',callback}}).text,callback+'({"ok":false,"error":"INVALID_ACTION"});');assert.equal(c.doGet({parameter:{action:'stats',callback:'alert(1)'}}).text,'Invalid callback');
 const p=record(c),result=c.doPost({postData:{contents:JSON.stringify({action:'submit',response:p,participantKey:crypto.randomUUID()})}});assert.ok(result.text.includes('true'));
 const receipt=c.doGet({parameter:{action:'receipt',submissionId:p.id,callback}}).text;assert.ok(receipt.includes('"received":true'));assert.ok(!receipt.includes(p.participantId));
});
test('diagnostics and missing audio are retained but excluded, and client rules are not trusted',()=>{
 const {c,sheets}=server();const p=record(c);p.diagnostic=true;p.quality_flag=[];c.save_({response:p,participantKey:crypto.randomUUID()});assert.equal(c.stats_(p).count,0);assert.ok(sheets.get('Raw').data[1][14].includes('diagnostic'));
});

function mode1Record(c,participant=crypto.randomUUID(),studyMode='research'){const l=c.MODE1_MANIFEST[0];return withConsent(c,{id:crypto.randomUUID(),attemptId:crypto.randomUUID(),participantId:participant,studyMode,gameMode:'mode1',levelId:l.levelId,recordingId:l.recordingId,levelVersion:l.levelVersion,mode1Definition:l.definition,startedAt:new Date(Date.now()-6000).toISOString(),createdAt:new Date().toISOString(),events:[{kind:'kana',index:1,atMs:4000},{kind:'kana',index:0,atMs:5000}],audioPlayed:true,listenedMs:1000,responseDurationMs:5000,totalDurationMs:6000,completed:true,completionStatus:'completed',feedbackUnclear:null,feedbackClickedAt:null,feedbackSource:null});}

test('Mode1 computes errors and accuracy from server definitions, and completion never invents unclear feedback',()=>{
 const {c,sheets}=server(),p=mode1Record(c);p.accuracy=999;p.errorCount=0;c.saveMode1_({response:p,participantKey:crypto.randomUUID()});const saved=JSON.parse(sheets.get('Mode1Raw').data[1][19]);assert.equal(saved.gameMode,'mode1');assert.equal(saved.correctCount,1);assert.equal(saved.errorCount,1);assert.equal(saved.attemptCount,2);assert.equal(saved.accuracy,.5);assert.equal(saved.firstAttemptCorrect,false);assert.equal(saved.feedbackUnclear,null);assert.equal(saved.feedbackSource,null);assert.equal(sheets.get('Raw').data.length,1);assert.equal(sheets.get('Mode1Summary').data[1][4],1);
});

test('explicit feedback updates the same participant row, retries are idempotent and a stolen identity is refused',()=>{
 const {c,sheets}=server(),p=mode1Record(c),key=crypto.randomUUID();c.saveMode1_({response:p,participantKey:key});const feedback={...p,id:crypto.randomUUID(),createdAt:new Date(Date.parse(p.createdAt)+2).toISOString(),feedbackUnclear:true,feedbackClickedAt:p.createdAt,feedbackSource:'feedback_button'};c.saveMode1_({response:feedback,participantKey:key});c.saveMode1_({response:feedback,participantKey:key});assert.equal(sheets.get('Mode1Raw').data.length,2);assert.equal(sheets.get('Mode1Audit').data.length,3);assert.equal(JSON.parse(sheets.get('Mode1Raw').data[1][19]).feedbackUnclear,true);assert.throws(()=>c.saveMode1_({response:{...feedback,id:crypto.randomUUID()},participantKey:crypto.randomUUID()}),/IDENTITY_MISMATCH/);assert.throws(()=>c.saveMode1_({response:{...p,id:crypto.randomUUID(),feedbackUnclear:true},participantKey:key}),/INVALID_FEEDBACK/);
});

test('Mode1 and Mode2, test and research remain isolated; owner deletion recalculates Mode1 summaries',()=>{
 const {c,sheets}=server();let q;for(let i=0;i<4;i++){const p=mode1Record(c);q=p;c.saveMode1_({response:p,participantKey:crypto.randomUUID()});}c.saveMode1_({response:mode1Record(c,crypto.randomUUID(),'test'),participantKey:crypto.randomUUID()});const mode2=record(c);c.save_({response:mode2,participantKey:crypto.randomUUID()});assert.equal(c.mode1Stats_(q).count,4);assert.equal(c.mode1Stats_(q).accuracy,.5);assert.equal(c.mode1Stats_({...q,studyMode:'test'}).count,1);assert.equal(c.stats_(mode2).count,1);assert.equal(sheets.get('Mode2Summary').data[1][4],1);sheets.get('Mode1Raw').data.splice(1,1);assert.equal(c.mode1Stats_(q).count,3);assert.equal(sheets.get('Mode1Summary').data.find(r=>r[0]==='research')[4],3);sheets.get('Mode1Raw').data.splice(1,1);assert.equal(c.mode1Stats_(q).suppressed,true);
});

test('Mode1 accepts unregistered DIY raw data with an exclusion flag and leaves unscored accuracy empty',()=>{
 const {c,sheets}=server(),p=mode1Record(c);p.levelId=crypto.randomUUID();p.recordingId=crypto.randomUUID();p.levelVersion='local-0123456789abcdef';c.saveMode1_({response:p,participantKey:crypto.randomUUID()});assert.ok(sheets.get('Mode1Raw').data[1][18].includes('unverified_definition'));assert.equal(c.mode1Aggregate_(p,false).count,0);const l=c.MODE1_MANIFEST[1],unscored={...mode1Record(c),levelId:l.levelId,recordingId:l.recordingId,levelVersion:l.levelVersion,mode1Definition:l.definition,events:[{kind:'finish',atMs:5000}]};c.saveMode1_({response:unscored,participantKey:crypto.randomUUID()});const saved=JSON.parse(sheets.get('Mode1Raw').data[2][19]);assert.equal(saved.completed,true);assert.equal(saved.accuracy,null);assert.equal(saved.errorCount,null);
});

test('Mode1 endpoint returns opaque receipts and suppressed aggregates without exposing raw records',()=>{
 const {c}=server(),p=mode1Record(c),callback='namari_0123456789abcdef';const posted=c.doPost({postData:{contents:JSON.stringify({action:'submit_mode1',response:p,participantKey:crypto.randomUUID()})}});assert.equal(posted.text,'{"ok":true}');assert.ok(c.doGet({parameter:{action:'receipt',submissionId:p.id,callback}}).text.includes('"received":true'));const stats=c.doGet({parameter:{...p,action:'stats_mode1',callback}}).text;assert.ok(stats.includes('"gameMode":"mode1"'));assert.ok(stats.includes('"suppressed":true'));assert.ok(!stats.includes(p.participantId));assert.ok(!stats.includes('events'));assert.ok(c.doGet({parameter:{action:'mode1raw',callback}}).text.includes('INVALID_ACTION'));
});

test('tutorial definitions match the requested answers; Sheets validates rhythm arrays and recomputes retries',()=>{
 const {c,sheets}=server();
 const accent=c.MODE1_MANIFEST.find(l=>l.levelId==='tutorial-karada');assert.deepEqual(Array.from(accent.definition.pitch),['high','low','low']);
 const vowel=c.MODE1_MANIFEST.find(l=>l.levelId==='tutorial-kusuri');assert.deepEqual(Array.from(vowel.definition.targets),[0]);
 const level=c.MODE1_MANIFEST.find(l=>l.levelId==='tutorial-ranpu'),p={...mode1Record(c),studyMode:'test',levelId:level.levelId,levelVersion:level.levelVersion,recordingId:level.recordingId,mode1Definition:level.definition,chapter:'mora',events:[{kind:'rhythm',beats:[1,1,1],blanks:[false,false],atMs:2000},{kind:'rhythm',beats:[1,1,2],blanks:[false,false],atMs:5000}]};
 c.saveMode1_({response:p,participantKey:crypto.randomUUID()});const saved=JSON.parse(sheets.get('Mode1Raw').data[1][19]);assert.equal(saved.completed,true);assert.equal(saved.accuracy,.5);assert.equal(saved.errorCount,1);assert.equal(saved.definitionVerified,true);assert.equal(saved.studyMode,'test');assert.equal(saved.feedbackUnclear,null);
 assert.throws(()=>c.mode1Validate_({...p,events:[{kind:'rhythm',beats:[1,1,3],blanks:[false,false],atMs:2000}]},level.definition),/INVALID_EVENTS/);
 assert.throws(()=>c.mode1Validate_({...p,events:[{kind:'rhythm',beats:[1,1,2],blanks:[false],atMs:2000}]},level.definition),/INVALID_EVENTS/);
});

function withConsent(c,p){
 if(p.studyMode!=='research')return p;
 const at=new Date(Date.now()-60000).toISOString();p.consent_version='test-approved-v1';p.consented_at=at;p.app_version='test-app';p.startedAt||=new Date(Date.now()-6000).toISOString();
 const state={participant_id:p.participantId,study_mode:'research',consent_version:p.consent_version,consented_at:at,consent_status:'consented'};
 const participants=c.spreadsheet_().getSheetByName('Participants');if(!participants.data.some(r=>r[0]===p.participantId&&r[1]==='research'))participants.appendRow([p.participantId,'research',p.consent_version,at,'consented','','','','',at,p.app_version,JSON.stringify(state)]);return p;
}
function studyEvent(type,patch={}){return {schemaType:'study_event',schemaVersion:1,id:crypto.randomUUID(),participantId:crypto.randomUUID(),studyMode:'test',gameMode:'overall',chapter:'experience',event_type:type,response_status:'answered',submitted_at:new Date().toISOString(),app_version:'test-app',scope_id:crypto.randomUUID(),...patch};}
test('research gates reject unapproved and missing consent without adding any raw trial',()=>{
 const {c,sheets}=server(),p=record(c);c.PropertiesService.getScriptProperties().setProperty('RESEARCH_ENABLED','false');assert.throws(()=>c.save_({response:p,participantKey:crypto.randomUUID()}),/RESEARCH_NOT_APPROVED/);assert.equal(sheets.get('Raw').data.length,1);
 c.PropertiesService.getScriptProperties().setProperty('RESEARCH_ENABLED','true');assert.throws(()=>c.save_({response:{...p,consented_at:null},participantKey:crypto.randomUUID()}),/CONSENT_REQUIRED/);
 const old={...p,startedAt:new Date(Date.parse(p.consented_at)-1).toISOString()};assert.throws(()=>c.save_({response:old,participantKey:crypto.randomUUID()}),/CONSENT_REQUIRED/);
});
test('new sheets are additive and rating revisions preserve unanswered, skipped and answered audit entries',()=>{
 const {c,sheets}=server(),headers=JSON.stringify(sheets.get('Mode1Raw').data[0]),key=crypto.randomUUID();
 let p=studyEvent('chapter_rating',{gameMode:'mode1',chapter:'vowelChallenge',response_status:'unanswered',visual_helpfulness:null});c.saveStudyEvent_({response:p,participantKey:key});
 p={...p,id:crypto.randomUUID(),response_status:'skipped',submitted_at:new Date(Date.parse(p.submitted_at)+1).toISOString()};c.saveStudyEvent_({response:p,participantKey:key});
 p={...p,id:crypto.randomUUID(),response_status:'answered',visual_helpfulness:4,submitted_at:new Date(Date.parse(p.submitted_at)+1).toISOString()};c.saveStudyEvent_({response:p,participantKey:key});c.saveStudyEvent_({response:p,participantKey:key});
 assert.equal(sheets.get('ResearchAudit').data.length,4);assert.equal(sheets.get('ChapterRatings').data.length,2);assert.equal(sheets.get('ChapterRatings').data[1][5],4);assert.equal(JSON.stringify(sheets.get('Mode1Raw').data[0]),headers);assert.equal(sheets.get('Raw').data.length,1);
 assert.throws(()=>c.saveStudyEvent_({response:{...p,id:crypto.randomUUID(),visual_helpfulness:6},participantKey:key}),/INVALID_RATING/);
});
test('test consent cannot authorize research; withdrawal blocks further uploads and excludes without deleting raw',()=>{
 const {c,sheets}=server(),id=crypto.randomUUID(),key=crypto.randomUUID(),at=new Date(Date.now()-2000).toISOString();
 const consent=studyEvent('consent',{participantId:id,gameMode:'participation',chapter:'participant',consent_given:true,consent_version:'test-approved-v1',consented_at:at});c.saveStudyEvent_({response:consent,participantKey:key});
 assert.throws(()=>c.requireResearchConsent_({studyMode:'research',participantId:id,consent_version:'test-approved-v1',consented_at:at,app_version:'test-app',startedAt:at}),/CONSENT_REQUIRED/);
 c.saveStudyEvent_({response:{...consent,id:crypto.randomUUID(),studyMode:'research'},participantKey:key});
 const p=record(c,id);p.consented_at=at;p.startedAt=at;c.save_({response:p,participantKey:key});assert.equal(c.stats_(p).count,1);
 c.saveStudyEvent_({response:studyEvent('withdrawal',{studyMode:'research',participantId:id,gameMode:'participation',chapter:'participant'}),participantKey:key});assert.throws(()=>c.save_({response:{...p,id:crypto.randomUUID()},participantKey:key}),/CONSENT_REQUIRED/);assert.equal(sheets.get('Raw').data.length,2);assert.equal(c.stats_(p).count,0);
});
test('optional background accepts not-applicable, feedback is formula-safe, and no public raw endpoint is added',()=>{
 const {c,sheets}=server(),p=studyEvent('background',{gameMode:'participation',chapter:'participant',language_background:'japanese_native',japanese_learning_experience:'not_applicable'}),key=crypto.randomUUID();c.saveStudyEvent_({response:p,participantKey:key});assert.equal(sheets.get('Participants').data[1][7],'not_applicable');
 const f=studyEvent('experience_feedback',{feedback_text:'=IMPORTXML("private")'});c.saveStudyEvent_({response:f,participantKey:crypto.randomUUID()});assert.ok(sheets.get('ExperienceFeedback').data[1][3].startsWith("'="));assert.equal(JSON.parse(sheets.get('ResearchAudit').data.at(-1)[9]).feedback_text,f.feedback_text);
 const callback='namari_0123456789abcdef';assert.ok(c.doGet({parameter:{action:'receipt',submissionId:f.id,callback}}).text.includes('"received":true'));assert.ok(c.doGet({parameter:{action:'participants',callback}}).text.includes('INVALID_ACTION'));
});
test('per-target analysis preserves all click order and timings without inflating solved-target accuracy',()=>{
 const {c}=server(),p={events:[{kind:'kana',index:1,atMs:100},{kind:'kana',index:0,atMs:200},{kind:'kana',index:0,atMs:300},{kind:'kana',index:2,atMs:400}]},d={targets:[0,2]};const clicks=c.targetClickAnalysis_(p,d);
 assert.equal(clicks.length,4);assert.equal(clicks[1].first_identification,true);assert.equal(clicks[1].errors_preceding,1);assert.equal(clicks[2].review,true);assert.equal(clicks[3].click_order,4);assert.equal(clicks[3].relative_ms,400);
});
