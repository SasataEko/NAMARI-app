
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
import {orderedModeTwoLevels} from '../src/data/modeTwoTutorial.js';
import {createModeOneSession} from '../src/data/modeOneStats.js';
import {tutorials,tutorialDefinition} from '../src/data/tutorials.js';
import {tutorialMetadata} from '../src/data/researchState.js';
const memory=new Map();globalThis.localStorage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};globalThis.fetch=async()=>({ok:true,json:async()=>({enabled:false})});
test('Mode2 starts with ordinary curriculum and kusuri, with no guided tutorial tile',async()=>{
 const library=JSON.parse(await fs.readFile('public/content/library.json','utf8')),levels=orderedModeTwoLevels(library),source=library.levels.find(l=>l.word==='かりきゅらむ');
 assert.equal(levels[0].id,source.id);assert.ok(!levels[0].tutorial);assert.equal(levels[0].word,'かりきゅらむ');assert.equal(levels[1].word,'くすり');assert.equal(levels.filter(l=>l.word==='かりきゅらむ').length,1);assert.equal(levels.filter(l=>l.id===source.id).length,1);
 assert.equal(levels.length,library.levels.length+1);assert.equal(source.id,library.levels.find(l=>l.word==='かりきゅらむ').id);
});
test('a catalogue without the tutorial source still exposes its ordinary levels',()=>{const levels=orderedModeTwoLevels({glyphs:[],groups:[],levels:[]});assert.equal(levels[0].word,'くすり');assert.equal(levels.some(l=>l.tutorial),false);});
test('skipping any Mode1 tutorial stays skipped on disposal without marking a correct answer or completion',async()=>{
 memory.clear();for(const q of tutorials){const session=createModeOneSession({...q,scoringDefinition:tutorialDefinition(q,{})},{studyMode:'test'});assert.equal(session.skipTutorial(),true);session.leave();await new Promise(resolve=>setTimeout(resolve,0));const meta=tutorialMetadata('mode1',q.chapter),record=JSON.parse(memory.get('kotoba-mode1-responses-v1')).at(-1);assert.equal(meta.tutorial_status,'skipped');assert.equal(record.tutorial_status,'skipped');assert.equal(record.completed,false);assert.equal(record.attemptCount,0);assert.equal(record.correctCount,0);assert.equal(record.studyMode,'test');}
});
