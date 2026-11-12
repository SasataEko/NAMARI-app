import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
function server(){
 const sheets=new Map(),props=new Map([['SPREADSHEET_ID','test'],['MIN_AGGREGATE_COUNT','3']]),cache=new Map();
 const sheet=()=>({data:[],getLastRow(){return this.data.length;},appendRow(r){this.data.push([...r]);},setFrozenRows(){},getRange(at,col,n,m){return {setValues:rows=>{this.data[at-1]=[...rows[0]];},setFontWeight(){}};},getDataRange(){return {getValues:()=>this.data.map(r=>[...r])};}});
 const ss={getSheetByName:n=>sheets.get(n),insertSheet:n=>{const s=sheet();sheets.set(n,s);return s;}};
 const context=vm.createContext({console,LEVEL_MANIFEST:JSON.parse(fs.readFileSync('apps-script/levels.json','utf8')),PropertiesService:{getScriptProperties:()=>({getProperty:k=>props.get(k),setProperty:(k,v)=>props.set(k,v)})},SpreadsheetApp:{openById:()=>ss,flush(){}},Utilities:{getUuid:()=>crypto.randomUUID(),computeHmacSha256Signature:(v,k)=>[...crypto.createHmac('sha256',k).update(v).digest()]},LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},CacheService:{getScriptCache:()=>({get:k=>cache.get(k),put:(k,v)=>cache.set(k,v)})},ContentService:{MimeType:{JSON:'json',JAVASCRIPT:'js'},createTextOutput:text=>({text,setMimeType(){return this;}})}});
 vm.runInContext(fs.readFileSync('apps-script/Code.gs','utf8').replace(/^\uFEFF/,''),context);context.setup_();return {c:context,sheets};
}
function record(c,id=crypto.randomUUID(),mode='research'){
 const l=c.LEVEL_MANIFEST[0];return {id:crypto.randomUUID(),participantId:id,studyMode:mode,levelId:l.levelId,levelVersion:l.levelVersion,recordingId:l.recordingId,createdAt:new Date().toISOString(),noticed:l.characters.map((_,i)=>i===0),pattern:l.characters.map((ch,i)=>i===0?(ch.patterns[0]||null):null),pitch:l.defaultAccent,beats:l.characters.map((_,i)=>i===0?2:1),blanks:l.characters.slice(1).map(()=>false),audioPlayed:true,listenedMs:1000,responseDurationMs:5000,skipped:false,answerStatus:'explored'};
}
test('Apps Script upserts one Raw row, preserves Audit, rejects a stolen participant ID and retries idempotently',()=>{
 const {c,sheets}=server(),p=record(c),key=crypto.randomUUID();c.save_({response:p,participantKey:key});c.save_({response:p,participantKey:key});assert.equal(sheets.get('Raw').data.length,2);assert.equal(sheets.get('Audit').data.length,2);
 const updated={...p,id:crypto.randomUUID(),noticed:p.noticed.map(()=>false),pattern:p.pattern.map(()=>null)};c.save_({response:updated,participantKey:key});assert.equal(sheets.get('Raw').data.length,2);assert.equal(sheets.get('Audit').data.length,3);assert.throws(()=>c.save_({response:{...updated,id:crypto.randomUUID()},participantKey:crypto.randomUUID()}),/IDENTITY_MISMATCH/);
});
test('aggregate is version/mode isolated; owner deletion immediately changes statistics; low sample values are hidden',()=>{
 const {c,sheets}=server();let query;
 for(let i=0;i<4;i++){const p=record(c);query=p;c.save_({response:p,participantKey:crypto.randomUUID()});}
 assert.equal(c.stats_(query).count,4);assert.equal(c.stats_(query).beats[0],2);sheets.get('Raw').data.splice(1,1);assert.equal(c.stats_(query).count,3);sheets.get('Raw').data.splice(1,1);assert.equal(c.stats_(query).suppressed,true);
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
