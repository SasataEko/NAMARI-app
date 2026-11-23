import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs/promises';
import {orderedModeTwoLevels} from '../src/data/modeTwoTutorial.js';

test('actual Mode2 menu click starts the first word with its tutorial flag intact',async()=>{
 const source=await fs.readFile('src/main.js','utf8'),start=source.indexOf('async function renderExploration() {'),end=source.indexOf('\nfunction renderChallengeSelect()',start);
 assert.ok(start>=0&&end>start);const handler=source.slice(start,end);
 const library=JSON.parse(await fs.readFile('public/content/library.json','utf8'));
 const node=()=>({children:[],setAttribute(){},append(...items){this.children.push(...items);}});
 const grid=node(),info=node(),root=node();root.isConnected=true;root.querySelector=selector=>selector==='.mode2-level-grid'?grid:selector==='[data-mode-info]'?info:null;
 const app={querySelector:()=>root},opened=[];
 const context=vm.createContext({app,readLibrary:async()=>library,orderedModeTwoLevels,playableLevels:()=>{throw Error('Menu bypassed the tutorial-aware ordering');},bindNav(){},profileHeader:()=>'',titleReturn:()=>'',bottomNav:()=>'',showModeIntro(){},experienceFeedback(){},localStorage:{setItem(){},getItem(){return null;}},document:{createElement:node},activeProfileId:'test',mountExploration:(target,options)=>opened.push(options),ensureParticipation:async()=>true});
 await new vm.Script(handler+'\nrenderExploration()').runInContext(context);
 assert.ok(grid.children.length>1);await grid.children[0].onclick();
 assert.equal(opened.length,1);assert.equal(opened[0].level.word,'かりきゅらむ');assert.equal(opened[0].level.tutorial,true);assert.equal(opened[0].level.id,'tutorial-mode2-curriculum');assert.equal(opened[0].studyMode,'test');
 assert.equal(opened[0].nextLevel.word,'くすり');
 await opened[0].onNext('test');assert.equal(opened[1].level.word,'くすり');assert.ok(!opened[1].level.tutorial);
});
