import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {symbolSwitchFrame,symbolDistribution} from '../src/glyph/symbolSwitch.js';
import {playableLevels} from '../src/data/projectLibrary.js';
import {saveExploration,getExplorationAggregate,readRawResponses} from '../src/data/explorationStore.js';
import {readOutbox,queueAndSend} from '../src/data/cloudCollection.js';
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};
const library=JSON.parse(await fs.readFile('public/content/library.json','utf8'));
test('whole SVG handoff has a blank midpoint and never draws two symbol states',()=>{
 assert.deepEqual(symbolSwitchFrame(0),{target:false,opacity:1});assert.deepEqual(symbolSwitchFrame(.5),{target:true,opacity:0});assert.deepEqual(symbolSwitchFrame(1),{target:true,opacity:1});
 for(let i=0;i<=100;i++){const state=symbolSwitchFrame(i/100);assert.equal(typeof state.target,'boolean');assert.ok(state.opacity>=0&&state.opacity<=1);if(i<50)assert.equal(state.target,false);else assert.equal(state.target,true);}
});
test('direction proportions remain separate and target SVG is an unchanged original',async()=>{
 const be=library.glyphs.find(g=>g.kana==='べ'),pattern=be.patterns.find(p=>p.id==='seidaku-be-to-pe');
 assert.equal(pattern.renderMode,'symbol-switch');assert.equal(pattern.targetKana,'ぺ');
 assert.deepEqual(await fs.readFile('public/'+pattern.svg),await fs.readFile('public/assets/normal/pe.svg'));
 const rows=symbolDistribution('べ',[pattern],{[pattern.id]:.3});assert.equal(rows[0].rate,.7);assert.equal(rows[1].rate,.3);assert.equal(rows[1].label,'べ → ぺ');
 assert.equal(symbolDistribution('べ',[pattern],{})[0].rate,1);
});
test('silent experiments have exact requested text and cannot enter the cloud outbox',async()=>{
 const level=playableLevels(library).find(l=>l.id==='experiment-be-pe'),word=library.levels.find(l=>l.id==='experiment-seidaku-string');
 assert.equal(word.word,'ぱぺびがぎょ');assert.deepEqual(word.morae,['ぱ','ぺ','び','が','ぎょ']);assert.equal(level.audio,null);assert.equal(word.audio,null);
 globalThis.fetch=()=>{throw Error('Experimental answers must never use network');};
 const record={levelId:level.id,id:crypto.randomUUID(),participantId:'experiment-test',studyMode:'test',noticed:[true],pattern:['seidaku-be-to-pe'],features:['seidaku-be-to-pe'],pitch:['low'],beats:[1],blanks:[],audioPlayed:false,listenedMs:0,responseDurationMs:10,answerStatus:'explored',skipped:false,visualExperiment:true};
 const saved=await saveExploration(record,level);assert.equal(saved.sync.status,'local');assert.equal(readOutbox().length,0);assert.equal(readRawResponses().length,1);
 const aggregate=await getExplorationAggregate(level,{studyMode:'test'});assert.equal(aggregate.count,1);assert.equal(aggregate.featureRates[0]['seidaku-be-to-pe'],1);assert.equal(aggregate.source,'local-experiment');
 assert.equal((await queueAndSend(saved,level)).status,'local');assert.equal(readOutbox().length,0);
});

import {seidakuFamilies} from '../src/data/seidakuFamilies.js';
test('every available kana family has all other members as independent directions',async()=>{
 let total=0;const ids=new Set();
 for(const family of seidakuFamilies)for(const source of family){const glyph=library.glyphs.find(g=>g.kana===source),switches=glyph.patterns.filter(p=>p.renderMode==='symbol-switch');assert.deepEqual(switches.map(p=>p.targetKana).sort(),family.filter(k=>k!==source).sort(),source);
  for(const p of switches){assert.equal(ids.has(p.id),false);ids.add(p.id);const target=library.glyphs.find(g=>g.kana===p.targetKana);assert.deepEqual(await fs.readFile('public/'+p.svg),await fs.readFile('public/'+target.normal),source+' → '+p.targetKana);total++;}
 }
 assert.equal(total,96);assert.equal(new Set(seidakuFamilies.flat()).size,72);
 for(const kana of ['く','す','ふ'])assert.ok(library.glyphs.find(g=>g.kana===kana).patterns.some(p=>p.renderMode!=='symbol-switch'),kana+' keeps existing morph');
});
test('three-way family proportions remain independent and never use notice rate as direction rate',()=>{
 const be=library.glyphs.find(g=>g.kana==='べ'),variants=be.patterns.filter(p=>p.renderMode==='symbol-switch'),pe=variants.find(p=>p.targetKana==='ぺ'),he=variants.find(p=>p.targetKana==='へ');
 const rows=symbolDistribution('べ',variants,{[pe.id]:.3,[he.id]:.2});assert.equal(rows[0].rate,.5);assert.equal(rows.find(r=>r.id===pe.id).rate,.3);assert.equal(rows.find(r=>r.id===he.id).rate,.2);
 assert.deepEqual(symbolDistribution('べ',variants,{}).map(r=>r.rate),[1,0,0]);
});
