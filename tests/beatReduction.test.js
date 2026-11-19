
import test from 'node:test';import assert from 'node:assert/strict';
import {decreaseBeat,undoDecrease,restoreBeat,beatVisual,toggleBeatSelection,removeSelectedBeat,appendReductionControls} from '../src/rhythmReduction.js';
import {scoreModeOne} from '../src/data/modeOneStats.js';
import {rhythmAnswer} from '../src/data/tutorials.js';
test('a beat reduces 2→1→0 and undo restores each prior duration without changing indices',()=>{
 const beats=[1,2,1],state={index:1,history:[]};assert.equal(decreaseBeat(beats,1,state),true);assert.deepEqual(beats,[1,1,1]);decreaseBeat(beats,1,state);assert.deepEqual(beats,[1,0,1]);assert.equal(beats.length,3);assert.equal(decreaseBeat(beats,1,state),false);undoDecrease(beats,state);assert.deepEqual(beats,[1,1,1]);undoDecrease(beats,state);assert.deepEqual(beats,[1,2,1]);assert.equal(undoDecrease(beats,state),false);assert.equal(decreaseBeat(beats,-1,state),false);
});
test('a saved omitted beat can be restored even without an in-memory undo history',()=>{const beats=[0,1,0],state={history:[]};assert.equal(restoreBeat(beats,0,state),true);assert.deepEqual(beats,[1,1,0]);assert.equal(restoreBeat(beats,1,state),false);});
test('group layout keeps omission share separate when omission and extension cancel in the mean',()=>{assert.deepEqual(beatVisual(1,.5),{survival:.5,extension:.5});assert.deepEqual(beatVisual(0),{survival:0,extension:0});assert.deepEqual(beatVisual(2),{survival:1,extension:1});});
test('Mode1 and DIY preserve a zero-beat reference and require its exact rhythm',()=>{const definition=rhythmAnswer({reading:['き','っ','ぷ'],beats:[1,0,1],blanks:[false,false]});assert.deepEqual(definition.beats,[1,0,1]);assert.equal(scoreModeOne([{kind:'rhythm',beats:[1,1,1],blanks:[false,false]}],definition).completed,false);assert.equal(scoreModeOne([{kind:'rhythm',beats:[1,0,1],blanks:[false,false]}],definition).completed,true);});

test('clicking a kana toggles selection without changing timing; repeated deletions undo last first',()=>{
 const beats=[1,1,2],state={index:null,history:[],hasDeleted:false};toggleBeatSelection(beats,1,state);assert.equal(state.index,1);assert.deepEqual(beats,[1,1,2]);toggleBeatSelection(beats,1,state);assert.equal(state.index,null);assert.equal(removeSelectedBeat(beats,state),false);
 toggleBeatSelection(beats,0,state);removeSelectedBeat(beats,state);toggleBeatSelection(beats,1,state);removeSelectedBeat(beats,state);assert.deepEqual(beats,[0,0,2]);assert.equal(toggleBeatSelection(beats,0,state),false);undoDecrease(beats,state);assert.deepEqual(beats,[0,1,2]);undoDecrease(beats,state);assert.deepEqual(beats,[1,1,2]);assert.equal(state.hasDeleted,true);
 toggleBeatSelection(beats,2,state);removeSelectedBeat(beats,state);assert.deepEqual(beats,[1,1,1]);undoDecrease(beats,state);assert.deepEqual(beats,[1,1,2]);
});
test('delete control appears only for a selection; undo stays visible after restoring everything',()=>{
 class Element{constructor(tag){this.tagName=tag;this.children=[];this.dataset={};this.attrs={};}setAttribute(k,v){this.attrs[k]=v;}append(e){this.children.push(e);}}
 const original=globalThis.document;globalThis.document={createElement:tag=>new Element(tag)};
 try{const beats=[1,1],state={index:null,history:[],hasDeleted:false};let bar;
 const draw=()=>{const host=new Element('div');bar=appendReductionControls(host,{tokens:['き','っ'],beats,state,onChange:draw});};
 draw();assert.equal(bar.hidden,true);toggleBeatSelection(beats,1,state);draw();assert.equal(bar.children[0].textContent,'この拍を削除');bar.children[0].onclick();assert.deepEqual(beats,[1,0]);assert.equal(bar.children.length,1);assert.equal(bar.children[0].textContent,'拍を戻す');bar.children[0].onclick();assert.deepEqual(beats,[1,1]);assert.equal(bar.hidden,false);assert.equal(bar.children[0].disabled,true);
 }finally{globalThis.document=original;}
});
