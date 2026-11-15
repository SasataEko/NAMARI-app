import test from 'node:test';
import assert from 'node:assert/strict';
import { queueAndSend,readOutbox,retryAllPending } from '../src/data/cloudCollection.js';
const store=new Map();globalThis.localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};globalThis.window={};
const nativeSetTimeout=globalThis.setTimeout;globalThis.setTimeout=(fn,ms,...args)=>{const timer=nativeSetTimeout(fn,ms,...args);if(ms===30000)timer.unref();return timer;};
let reject=false;const posted=[],paths=[];globalThis.document={createElement:()=>({remove(){}}),head:{append(script){const url=new URL(script.src);queueMicrotask(()=>window[url.searchParams.get('callback')](reject?{ok:true,received:false,rejected:true}:{ok:true,received:true}));}}};
globalThis.fetch=async(url,options={})=>{if(options.method==='POST'){posted.push(JSON.parse(options.body));assert.equal(options.mode,'no-cors');assert.equal(options.headers['Content-Type'],'text/plain;charset=UTF-8');return {type:'opaque'};}paths.push(url);return {ok:true,json:async()=>url.includes('collection.json')?{enabled:true,endpoint:'https://script.google.com/macros/s/TEST-DEPLOYMENT/exec',timeoutMs:5000}:[{levelId:'kusuri',recordingId:'kusuri-recording-v1',levelVersion:'test-version'}]};};
test('Mode1 chooses its own manifest and submit action; a rejected receipt stays pending and retry keeps the same ID',async()=>{
 const p={id:crypto.randomUUID(),gameMode:'mode1',levelId:'kusuri',recordingId:'kusuri-recording-v1'};reject=true;await assert.rejects(queueAndSend(p,{id:'kusuri'}));assert.equal(readOutbox().length,1);assert.equal(posted[0].action,'submit_mode1');assert.ok(paths.some(p=>p.endsWith('mode-one-manifest.json')));reject=false;assert.equal(await retryAllPending(),1);assert.equal(readOutbox().length,0);assert.equal(posted[0].response.id,posted[1].response.id);assert.equal(posted[1].action,'submit_mode1');
 const mode2={id:crypto.randomUUID(),gameMode:'mode2',levelId:'kusuri',recordingId:'kusuri-recording-v1'};await queueAndSend(mode2,{id:'kusuri'});assert.equal(posted.at(-1).action,'submit');assert.ok(paths.some(p=>p.endsWith('study-manifest.json')));
});
