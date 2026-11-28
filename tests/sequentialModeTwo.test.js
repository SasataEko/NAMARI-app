import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs/promises';
import {createModeTwoSequence} from '../src/data/sequentialModeTwo.js';
import {deliverySummary,deliveryEntries,rememberDelivery} from '../src/data/deliveryReport.js';
test('real next and previous handlers keep edits and submit only after the three ordered categories',async()=>{
 const source=await fs.readFile('src/modeThree.js','utf8'),start=source.indexOf('  save.onclick=async()=>{'),end=source.indexOf('\n  reset.onclick=',start),submit=source.slice(start,end);
 const backStart=source.indexOf('previous.onclick=()=>{'),backEnd=source.indexOf(';const actions=',backStart)+1,back=source.slice(backStart,backEnd);
 const records=[],sequence=createModeTwoSequence(),state={pitch:['high','low'],patterns:[null,null],beats:[1,1],blanks:[false],emphasis:['base:0']};
 const context=vm.createContext({journey:null,sequence,state,tab:'pitch',save:{},previous:{},status:{},structuredClone,options:{onSubmit:async answer=>records.push(answer)},renderControls(){},fit(){}});
 new vm.Script(submit+'\n'+back).runInContext(context);
 assert.equal(sequence.current.title,'アクセント');assert.equal(sequence.current.next,'母音・子音の判断へ');
 await context.save.onclick();assert.equal(context.tab,'patterns');assert.equal(records.length,0);state.patterns[0]='ka-round';
 context.previous.onclick();assert.equal(context.tab,'pitch');assert.equal(state.patterns[0],'ka-round');assert.deepEqual(state.pitch,['high','low']);
 await context.save.onclick();await context.save.onclick();assert.equal(context.tab,'duration');assert.equal(sequence.current.next,'こう聞こえた');assert.equal(records.length,0);
 state.beats[0]=2;state.blanks[0]=true;context.previous.onclick();assert.equal(context.tab,'patterns');assert.equal(state.beats[0],2);
 await context.save.onclick();await context.save.onclick();assert.equal(records.length,1);assert.equal(records[0].patterns[0],'ka-round');assert.equal(records[0].beats[0],2);assert.deepEqual(records[0].emphasis,['base:0']);
 assert.ok(!source.includes('createModeTwoMakeGuide'));assert.ok(!source.includes("setAttribute('role','tablist')"));
});
test('delivery report separates modes and study modes, deduplicates Mode1 revisions and never guesses a receipt',()=>{
 const memory=new Map(),storage={getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v)};
 const rows=[{id:'old',attemptId:'try-1',gameMode:'mode1',studyMode:'test',createdAt:'2026-11-26T00:00:00Z'},{id:'latest',attemptId:'try-1',gameMode:'mode1',studyMode:'test',createdAt:'2026-11-26T00:01:00Z'},{id:'research',gameMode:'mode1',studyMode:'research'},{id:'tutorial',gameMode:'mode1',studyMode:'test',levelId:'tutorial-mora'}];
 storage.setItem('kotoba-mode1-responses-v1',JSON.stringify(rows));storage.setItem('kotoba-exploration-raw-v3',JSON.stringify([{id:'m2',studyMode:'test'},{id:'m2r',gameMode:'mode2',studyMode:'research'}]));storage.setItem('kotoba-cloud-outbox-v1',JSON.stringify([rows[1],{id:'event',schemaType:'study_event',gameMode:'overall'}]));
 rememberDelivery(rows[0],'synced',null,storage);rememberDelivery({id:'m2'},'synced',null,storage);
 let summary=deliverySummary(storage);assert.deepEqual(summary[0],{gameMode:'mode1',studyMode:'test',total:2,synced:0,pending:1,local:1,unknown:0});assert.equal(summary[1].unknown,1);assert.equal(summary[2].synced,1);assert.equal(summary[3].unknown,1);
 rememberDelivery(rows[1],'synced',null,storage);summary=deliverySummary(storage);assert.equal(summary[0].synced,1);assert.equal(summary[0].pending,0);assert.equal(deliveryEntries(storage).length,5);
 assert.equal(JSON.parse(storage.getItem('kotoba-mode1-responses-v1')).length,4);
});
test('profile screen offers a return only after a valid profile exists and first navigation stays gated',async()=>{
 const source=await fs.readFile('src/main.js','utf8'),a=source.indexOf('function renderProfiles() {'),b=source.indexOf('\nfunction renderHome()',a),render=source.slice(a,b);
 const profiles=[{id:'zh',initial:'中',name:'中国語話者',slot:'A'},{id:'ja',initial:'日',name:'日本語話者',slot:'B'}];
 for(const active of [null,profiles[0]]){const app={innerHTML:'',querySelector:()=>null,querySelectorAll:()=>[]};const context=vm.createContext({app,activeProfile:active,activeProfileId:active?.id,profiles,readProfile:()=>({}),profileRecordCount:()=>0,currentCards:()=>[]});new vm.Script(render+'\nrenderProfiles()').runInContext(context);assert.equal(app.innerHTML.includes('data-back="home"'),Boolean(active));}
 const nav=source.slice(source.indexOf('function navigate(next) {'),source.indexOf('\nfunction renderProfiles() {'));
 const context=vm.createContext({activeProfile:null,app:{querySelector:()=>null},legacyModeOneStats:null,disposeModeOne:null,disposeLegacyAutoplay:null,disposeLegacyCompact:null,isAnimating:false,render(){},scrollTop(){},showModeIntro(){}});new vm.Script(nav+'\nnavigate("home")').runInContext(context);assert.equal(context.screen,'profiles');context.activeProfile=profiles[0];new vm.Script('navigate("home")').runInContext(context);assert.equal(context.screen,'home');
});

test('Settings report tab shows its own panel without the research or basic sections',async()=>{
 const source=await fs.readFile('src/viewportLayout.js','utf8'),line=source.split('\n').find(s=>s.includes("['音とプロフィール','研究参加','送信レポート'].forEach"));assert.ok(line);
 const basic={hidden:false},research={hidden:true},report={hidden:true},tabs={children:[],append(b){this.children.push(b);}},context=vm.createContext({basic,research,report,tabs,document:{createElement:()=>({setAttribute(){}})}});
 new vm.Script(line).runInContext(context);assert.equal(tabs.children.length,3);
 tabs.children[2].onclick();assert.equal(report.hidden,false);assert.equal(research.hidden,true);assert.equal(basic.hidden,true);
 tabs.children[1].onclick();assert.equal(report.hidden,true);assert.equal(research.hidden,false);
 tabs.children[0].onclick();assert.equal(report.hidden,true);assert.equal(basic.hidden,false);
});
