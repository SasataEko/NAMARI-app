import test from 'node:test';
import assert from 'node:assert/strict';
import {createEditHistory} from '../src/editHistory.js';
import {initialArtwork,artworkNodes,setArtworkPitch,deleteArtworkBeat} from '../src/data/modeThreeModel.js';
test('undo restores exact independent snapshots across patterns, pitch, beats and blank insertion',()=>{
 let state=initialArtwork(),focus='base:0';const original=structuredClone(state),edits=createEditHistory({capture:()=>({state,focus}),restore:s=>{state=s.state;focus=s.focus;}});
 edits.checkpoint();state.patterns[0]='a-pattern';
 edits.checkpoint();setArtworkPitch(state,artworkNodes(state)[0],'high');
 edits.checkpoint();state.beats[0]=2;
 edits.checkpoint();state.blanks[0]=true;
 edits.checkpoint();deleteArtworkBeat(state,artworkNodes(state).find(n=>n.kind==='blank'),{history:[]});focus=null;
 assert.equal(artworkNodes(state).length,7);assert.ok(edits.undo());assert.equal(artworkNodes(state).length,8);assert.equal(focus,'base:0');
 assert.ok(edits.undo());assert.equal(state.blanks[0],false);assert.equal(state.beats[0],2);
 assert.ok(edits.undo());assert.equal(state.beats[0],1);assert.equal(state.pitch[0],'high');
 assert.ok(edits.undo());assert.equal(state.pitch[0],'low');assert.equal(state.patterns[0],'a-pattern');
 assert.ok(edits.undo());assert.deepEqual(state,original);assert.equal(edits.canUndo,false);assert.equal(edits.undo(),false);
});
test('Mode2 mark cancellation can be undone with both noticed and Pattern intact',()=>{
 let state={noticed:[true],pattern:['p'],features:['p'],intensity:[1],beats:[1],blanks:[],pitch:['low']},selected=0;
 const edits=createEditHistory({capture:()=>({state,selected}),restore:s=>{state=s.state;selected=s.selected;}});
 edits.checkpoint();state.noticed[0]=false;state.pattern[0]=null;state.features[0]=null;state.intensity[0]=0;selected=null;
 edits.undo();assert.equal(state.noticed[0],true);assert.equal(state.pattern[0],'p');assert.equal(state.intensity[0],1);assert.equal(selected,0);
});
test('undo branches remain isolated and old mutable arrays cannot corrupt prior snapshots',()=>{
 let state={v:[0]},edits=createEditHistory({limit:2,capture:()=>state,restore:s=>{state=s;}});
 edits.checkpoint();state.v[0]=1;edits.checkpoint();state.v[0]=2;edits.checkpoint();state.v[0]=3;
 edits.undo();assert.deepEqual(state.v,[2]);edits.checkpoint();state.v.push(99);edits.undo();assert.deepEqual(state.v,[2]);edits.undo();assert.deepEqual(state.v,[1]);assert.equal(edits.undo(),false);
});
