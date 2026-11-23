import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs/promises';
import {developerModeVisible} from '../src/data/localAuthoringVisibility.js';
test('developer UI is visible in local environments and absent in public production',()=>{
 for(const host of ['localhost','127.0.0.1','[::1]','::1'])assert.equal(developerModeVisible(host,false),true);
 for(const host of ['sasataeko.github.io','example.com',''])assert.equal(developerModeVisible(host,false),false);
 assert.equal(developerModeVisible('192.168.1.20',true),true);
});
test('real home renderer retains Mode2 and prominent feedback, removes Mode3 and hides public authoring',async()=>{
 const source=await fs.readFile('src/main.js','utf8'),start=source.indexOf('function renderHome() {'),end=source.indexOf('\nfunction renderDeveloper()',start),renderer=source.slice(start,end);
 assert.ok(start>=0&&end>start);assert.ok(!source.includes('renderModeThree'));
 for(const local of [false,true]){
  const app={innerHTML:'',querySelector:()=>({addEventListener(){}})};
  const context=vm.createContext({app,profileHeader:()=>'',bottomNav:()=>'',bindNav(){},navigate(){},developerModeVisible:()=>local});
  new vm.Script(renderer+'\nrenderHome()').runInContext(context);
  assert.ok(app.innerHTML.includes('data-nav="exploration"'));assert.ok(app.innerHTML.includes('home-feedback-button'));assert.ok(app.innerHTML.includes('感想を聞かせてください'));
  assert.ok(!app.innerHTML.includes('data-nav="modeThree"'));assert.equal(app.innerHTML.includes('data-nav="developer"'),local);
 }
 const developer=source.slice(source.indexOf('function renderDeveloper() {'),source.indexOf('\nasync function renderExploration()'));
 let returnedHome=false;const context=vm.createContext({screen:'developer',renderHome:()=>{returnedHome=true;},developerModeVisible:()=>false});
 new vm.Script(developer+'\nrenderDeveloper()').runInContext(context);assert.equal(context.screen,'home');assert.equal(returnedHome,true);
});
