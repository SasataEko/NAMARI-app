import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import vm from 'node:vm';
import {createJourneyModel} from '../src/data/modeTwoJourneyModel.js';
test('guide waits for actual listening and edits; narration cannot change categories and free stages wait for Next',()=>{
 const m=createJourneyModel();assert.equal(m.phase,'listen');assert.equal(m.advance(),false);assert.equal(m.notify('pitch'),false);assert.equal(m.notify('listened'),true);
 assert.equal(m.phase,'listen');assert.equal(m.step.event,undefined);m.advance();assert.equal(m.phase,'pitchIntro');assert.equal(m.step.centered,true);assert.equal(m.step.text,'アクセントから調整してみよう！');m.advance();assert.equal(m.phase,'pitchAudio');assert.equal(m.step.text,'録音はここで再生できるよ');assert.equal(m.step.point,'.m3-audio-button');m.advance();assert.equal(m.phase,'pitchTry');assert.equal(m.advance(),false);assert.ok(m.step.allow.includes('.edit-undo'));assert.ok(!m.step.allow.includes('.m3-save'));
 m.notify('pitch');assert.equal(m.phase,'pitchSeen');m.advance();m.advance();assert.equal(m.phase,'emphasisTry');assert.deepEqual(m.step.allow,['.m3-kana']);assert.equal(m.step.point,'.m3-canvas');assert.equal(m.step.regionPoint,true);m.notify('emphasis');assert.equal(m.phase,'emphasisSeen');m.advance();assert.equal(m.phase,'emphasisLimit');m.advance();assert.equal(m.phase,'emphasisLower');assert.ok(m.step.highlight.includes('.m3-emphasis-kana'));assert.equal(m.step.point,undefined);assert.ok(m.step.allow.includes('.m3-kana:has(.m3-emphasis-badge)'));assert.equal(m.notify('emphasis'),false);assert.equal(m.phase,'emphasisLower');m.advance();assert.equal(m.phase,'undoIntro');assert.deepEqual(m.step.allow,['.edit-undo']);assert.equal(m.step.point,'.edit-undo');m.advance();assert.equal(m.phase,'pitchReady');assert.equal(m.step.free,undefined);m.advance();assert.equal(m.phase,'pitchFree');assert.equal(m.step.text,undefined);assert.equal(m.advance(),false);assert.equal(m.notify('next:duration'),false);
 m.notify('next:patterns');m.advance();m.notify('select');assert.equal(m.phase,'patternsTry');m.notify('pattern');assert.equal(m.phase,'patternsAnimating');assert.equal(m.advance(),false);m.notify('morphDone');assert.equal(m.phase,'patternsAnimating');m.advance();assert.equal(m.phase,'patternsSeen');m.advance();assert.equal(m.phase,'patternsFree');
 m.notify('next:duration');m.advance();m.notify('select');assert.equal(m.phase,'durationTry');m.notify('beat');assert.equal(m.step.text,'拍が変わったね！');assert.equal(m.step.point,undefined);m.advance();assert.equal(m.phase,'durationSubmit');m.advance();assert.equal(m.phase,'durationFree');assert.equal(m.step.free,true);assert.equal(m.advance(),false);m.skip();assert.equal(m.active,false);
});
test('real event gate blocks unrelated controls, accepts only current practice controls, and uses blank clicks for narration',async()=>{
 const source=await fs.readFile('src/modeTwoJourney.js','utf8'),fn=source.slice(source.indexOf(' function gate(e){'),source.indexOf('\n for(const event of',source.indexOf(' function gate(e){')));
 let current={event:'listened'},advances=0,skips=0;const root={contains:t=>t.inside},layer={contains:t=>t.overlay};
 const c=vm.createContext({dead:false,step:()=>current,root,layer,result:false,onInteract:null,onAdvance:()=>advances++,onSkip:()=>skips++,permitted:t=>(current.allow||[]).some(s=>t.selector===s),document:{}});new vm.Script(fn+'\nthis.gate=gate;').runInContext(c);
 const node=(selector='',inside=true)=>({selector,inside,closest:s=>s==='button,input,select,a,textarea'?(selector==='button'?{}:null):s===selector?{}:null});
 const fire=(t,type='click')=>{const e={type,target:t,preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;}};c.gate(e);return e;};
 assert.equal(fire(node('button')).prevented,true);assert.equal(advances,0);current={text:'intro'};fire(node());assert.equal(advances,1);fire(node('button'));assert.equal(advances,2);fire(node(),'pointerdown');assert.equal(advances,2);
 current={event:'pitch',allow:['.accent-dot','.edit-undo']};assert.equal(fire(node('.accent-dot')).prevented,undefined);assert.equal(fire(node('.m3-kana')).prevented,true);assert.equal(fire(node('.edit-undo')).prevented,undefined);
 current={free:true};assert.equal(fire(node('.m3-save')).prevented,undefined);assert.equal(skips,0);
});
async function audioHarness(){
 const source=(await fs.readFile('src/levelAudio.js','utf8')).replace(/^import .*\n/,'').replace('export function','function');const nodes=[],memory=new Map();
 const document={body:{append:n=>nodes.push(n)},createElement:tag=>({tag,button:{},addEventListener(){},querySelector(){return this.button;},showModal(){this.open=true;},close(){this.open=false;},remove(){this.removed=true;}})};
 const context=vm.createContext({document,localStorage:{getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)}});new vm.Script(source+'\nthis.start=startLevelAudio;').runInContext(context);
 const audio=()=>({isConnected:true,plays:0,paused:true,listeners:{},addEventListener(k,f){this.listeners[k]=f;},removeEventListener(k){delete this.listeners[k];},async play(){this.plays++;if(this.reject)throw Error('blocked');this.paused=false;},pause(){this.paused=true;},after(n){nodes.push(n);}});
 return {start:context.start,nodes,memory,audio};
}
test('audio confirms once per mode, attempts playback on each level and never fabricates a played event',async()=>{
 const h=await audioHarness(),a=h.audio(),stop=h.start(a,{mode:'mode1'});assert.equal(a.plays,0);assert.equal(h.nodes.length,1);h.nodes[0].button.onclick();await new Promise(setImmediate);assert.equal(a.plays,1);stop();assert.equal(a.paused,true);
 const b=h.audio();h.start(b,{mode:'mode1'});await new Promise(setImmediate);assert.equal(b.plays,1);assert.equal(h.nodes.length,1);
 const c=h.audio();const cancel=h.start(c,{mode:'mode2'});assert.equal(c.plays,0);assert.equal(h.nodes.length,2);cancel();h.nodes[1].button.onclick();await new Promise(setImmediate);assert.equal(c.plays,0);
});
test('autoplay refusal offers a retry on the same tracked recording and a later play succeeds',async()=>{
 const h=await audioHarness();h.memory.set('namari-sound-notice-mode2','1');const a=h.audio();a.reject=true;let started=0;const stop=h.start(a,{mode:'mode2',onStarted:()=>started++});await new Promise(setImmediate);assert.equal(started,0);assert.equal(a.plays,1);const retry=h.nodes.at(-1);assert.equal(retry.textContent,'タップして録音を再生');a.reject=false;await retry.onclick();assert.equal(a.plays,2);assert.equal(started,1);assert.equal(retry.removed,true);stop();
});

import {placeJourneyBubble} from '../src/data/journeyBubble.js';
test('compact bubbles use the gap beside controls instead of returning to the page header',()=>{
 const target={left:62,top:471,right:99,bottom:497,width:37,height:26},avoid=[{left:106,top:208,right:535,bottom:368},target,{left:172,top:471,right:209,bottom:497},{left:28,top:628,right:574,bottom:670}];
 const p=placeJourneyBubble({width:600,height:686,target,avoid,noteWidth:270,noteHeight:95});assert.ok(p.top>=368);assert.ok(p.top+95<=471);
 for(const width of [320,390,600,1280]){const b=placeJourneyBubble({width,height:844,target,avoid,noteWidth:270,noteHeight:95});assert.ok(b.left>=12);assert.ok(b.left+b.width<=width-12);assert.ok(b.top>=12&&b.top+95<=832);}
});

import {placeJourneyArrow} from '../src/data/journeyArrow.js';
test('region arrows sit outside the target and the recording introduction no longer points to undo',()=>{
 const m=createJourneyModel();m.notify('listened');m.advance();assert.equal(m.step.centered,true);m.advance();assert.equal(m.step.point,'.m3-audio-button');assert.equal(m.step.points,undefined);m.advance();assert.equal(m.step.point,'.m3-pitch-grid');assert.ok(m.step.highlight.includes('.m3-pitch-grid'));
 const target={left:12,top:200,right:378,bottom:500,width:366,height:300},note={left:60,top:100,right:330,bottom:170,width:270,height:70};
 const p=placeJourneyArrow({target,note,width:390,height:844,size:32});assert.ok(p.y+32<=target.top);assert.equal(p.angle,90);assert.ok(p.dy>0);assert.equal(p.dx,0);
});

test('an arrow stays on the bubble side of a broad module instead of jumping to its far edge',()=>{
 const target={left:28,top:471,right:574,bottom:550,width:546,height:79},note={left:166,top:392,right:436,bottom:466,width:270,height:74};
 const p=placeJourneyArrow({target,note,width:602,height:686,size:36});assert.equal(p.angle,90);assert.ok(p.y+36<=target.top);assert.ok(p.x+36<=note.left||p.x>=note.right);
});
