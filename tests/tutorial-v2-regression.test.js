import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs/promises';
import {nextModeTwoGuideStep} from '../src/data/modeTwoGuideSteps.js';
class Observer{observe(){}disconnect(){}}
const stripped=source=>source.replace(/^import .*;\r?\n/gm,'');
test('real glyph selection advances to the shape tab once; redraws target the new controls',async()=>{
 const source=stripped(await fs.readFile('src/modeTwoMakeGuide.js','utf8')).replace('export function','function');
 const audio=new EventTarget(),canvas={},editor={},bar={},targets={};
 const kana={},shape={},pitchTab={},duration={},pattern={},high={},long={},undo={};
 Object.assign(targets,{'audio':audio,'.m3-audio-button':{},'.m3-kana[data-key^="base:"]':kana,'#m3-tab-patterns':shape,'#m3-tab-pitch':pitchTab,'#m3-tab-duration':duration,'.m3-choice[data-pattern-id]:not([data-pattern-id=""]):not(:disabled)':pattern,'.accent-dot[aria-pressed="false"]:not(:disabled)':high,'[data-beat-choice="long"]:not(:disabled)':long,'.m3-icon-undo':undo});
 const root={isConnected:true,querySelector:selector=>targets[selector]},overlay={show(target,options){this.target=target;this.options=options;},finish(copy){this.finished=copy;},dispose(){this.disposed=true;}},marks=[];
 const context=vm.createContext({createModeTwoGuideOverlay:()=>overlay,markTutorial:(...args)=>marks.push(args),nextModeTwoGuideStep,MutationObserver:Observer,document:{body:{}},root,canvas,editor,bar,tab:'patterns',selectedKey:null,readOnly:false,isModeTwo:true,state:{noticed:[false],patterns:[null]},remember(){},rerollNode(){},renderControls(){},fit(){},changed(){}});
 new vm.Script(source+'\ntutorialGuide=createModeTwoMakeGuide({root,canvas,editor,bar,getTab:()=>tab,getSelected:()=>selectedKey});').runInContext(context);
 assert.equal(overlay.target,targets['.m3-audio-button']);assert.equal(overlay.options.highlight.length,1);assert.equal(overlay.options.highlight[0],canvas);
 audio.dispatchEvent(new Event('ended'));assert.equal(overlay.target,kana);
 const editorSource=await fs.readFile('src/modeThree.js','utf8');const select=editorSource.slice(editorSource.indexOf('  function select(key)'),editorSource.indexOf('\n  function renderWord()'));
 new vm.Script(select+'\nselect("base:0")').runInContext(context);
 assert.equal(context.selectedKey,'base:0');assert.equal(overlay.target,shape);context.tutorialGuide.notify('kana');assert.equal(overlay.target,shape);
 context.tutorialGuide.notify('tab:patterns');assert.equal(overlay.target,pattern);
 context.tutorialGuide.notify('pattern');assert.equal(overlay.target,pitchTab);
 context.tab='pitch';context.tutorialGuide.notify('tab:pitch');assert.equal(overlay.target,high);
 context.tutorialGuide.notify('pitch');assert.equal(overlay.target,kana);assert.equal(overlay.options.optional,true);
 overlay.options.onNext();assert.equal(overlay.target,duration);
 context.tab='duration';context.tutorialGuide.notify('tab:duration');assert.equal(overlay.target,long);
 context.tutorialGuide.notify('beat');assert.equal(overlay.target,undo);context.tutorialGuide.notify('undo');
 assert.match(overlay.finished,/自由に編集.*提出/);assert.equal(marks.at(-1)[2],'completed');context.tutorialGuide.dispose();assert.equal(overlay.disposed,true);
});
test('first submitted result explains personal then average and closes by clicking anywhere',async()=>{
 const source=stripped(await fs.readFile('src/modeTwoResultGuide.js','utf8')).replace('export function','function');
 const document=new EventTarget();document.body={};const memory=new Map(),personal={closest:()=>({})},average={closest:()=>({})},heading={textContent:'みんなの平均（表示例）'},root={isConnected:true,querySelector:s=>s==='[data-personal-preview]'?personal:s==='[data-average-preview]'?average:heading};
 let mounts=0;const overlay={show(target,options){this.target=target;this.options=options;},dispose(){this.disposed=true;}};
 const context=vm.createContext({document,MutationObserver:Observer,createModeTwoGuideOverlay:()=>{mounts++;return overlay;},participantId:()=> 'anonymous-test',MODE_TWO_TUTORIAL_VERSION:'guide-v2',localStorage:{getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)},root});
 new vm.Script(source+'\ncleanup=mountModeTwoResultGuide(root,{skipped:false});').runInContext(context);
 assert.equal(overlay.target,personal);assert.match(overlay.options.copy,/上.*あなた/);
 document.dispatchEvent(new Event('click',{cancelable:true}));assert.equal(overlay.target,average);assert.match(overlay.options.copy,/表示例/);
 document.dispatchEvent(new Event('click',{cancelable:true}));assert.equal(overlay.disposed,true);assert.equal(memory.size,1);
 new vm.Script('mountModeTwoResultGuide(root,{skipped:false})').runInContext(context);assert.equal(mounts,1);
});
