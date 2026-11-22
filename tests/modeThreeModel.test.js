import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {modeThreeLevel,modeThreeCharacters,initialArtwork,restoreArtwork,glyphSizeFactor,fitArtworkRow,paddedViewBox,artworkNodes,setArtworkPitch,deleteArtworkBeat,undoArtworkBeat} from '../src/data/modeThreeModel.js';
const library=JSON.parse(await fs.readFile(new URL('../public/content/library.json',import.meta.url),'utf8'));
test('Mode3 keeps catalogue assets and hiragana in an isolated local experiment',async()=>{
 assert.equal(modeThreeLevel.word,'あばくらっと');assert.equal(modeThreeLevel.audio,null);assert.equal(modeThreeLevel.studyMode,'test');
 const characters=modeThreeCharacters(library);assert.equal(characters.length,6);
 for(const c of characters){assert.ok(c.normal,c.text);await fs.access(new URL('../public/'+c.normal,import.meta.url));for(const p of c.patterns)await fs.access(new URL('../public/'+p.svg,import.meta.url));}
 assert.equal(characters[4].normal,'assets/normal/xtsu-outlined.svg');assert.equal(characters[4].patterns.length,0);assert.deepEqual(characters[1].patterns.map(p=>p.targetKana).sort(),['は','ぱ']);
});
test('saved works preserve all edits and migrate former styles to the fixed sticker display',()=>{
 const chars=modeThreeCharacters(library),state=initialArtwork();state.patterns[2]=chars[2].patterns[0].id;state.beats[1]=2;state.blanks[0]=true;state.pitch[0]='high';assert.deepEqual(restoreArtwork(state,chars),state);
 const old=restoreArtwork({gameMode:'mode3',levelId:state.levelId,patterns:state.patterns,style:'overprint',size:'contrast'},chars);assert.equal(old.style,'sticker');assert.ok(!('size' in old));assert.deepEqual(old.patterns,state.patterns);assert.deepEqual(old.beats,Array(6).fill(1));
 const bad=restoreArtwork({...state,patterns:['unrelated'],pitch:['wrong'],beats:[9],blanks:[3]},chars);assert.deepEqual(bad.patterns,Array(6).fill(null));assert.equal(bad.beats[0],1);assert.equal(bad.pitch[0],'low');assert.equal(bad.blanks[0],false);assert.ok(!('accuracy' in state));
});
test('long marks and added small-tsu are separate beat and accent nodes linked to preceding pitch',()=>{
 const s=initialArtwork();s.beats[0]=2;s.blanks[0]=true;let n=artworkNodes(s);assert.equal(n.length,8);assert.deepEqual(n.slice(0,4).map(n=>n.text),['あ','ー','ッ','ば']);
 assert.ok(n[1].linked&&n[2].linked);assert.equal(n[1].pitch,'low');assert.equal(n[2].pitch,'low');
 assert.ok(setArtworkPitch(s,n[0],'high'));n=artworkNodes(s);assert.deepEqual(n.slice(0,3).map(n=>n.pitch),['high','high','high']);assert.ok(n.slice(0,3).every(n=>n.pitch!==n.defaultPitch));assert.equal(setArtworkPitch(s,n[1],'low'),false);
 const ra=n.find(n=>n.text==='ら');setArtworkPitch(s,ra,'low');assert.equal(artworkNodes(s).find(n=>n.text==='っ').pitch,'low');
 s.beats[3]=0;setArtworkPitch(s,artworkNodes(s).find(n=>n.text==='く'),'low');assert.equal(artworkNodes(s).find(n=>n.text==='っ').pitch,'low');
 s.beats.fill(0);s.beats[4]=1;s.blanks.fill(false);n=artworkNodes(s);assert.equal(n[0].linked,false);assert.ok(setArtworkPitch(s,n[0],'high'));assert.equal(artworkNodes(s)[0].pitch,'high');
});
test('beat deletion and LIFO undo keep source patterns, inserted nodes and count consistent',()=>{
 const s=initialArtwork(),h={history:[]};s.beats[0]=2;s.blanks[0]=true;s.patterns[0]='keep-me';
 assert.ok(deleteArtworkBeat(s,artworkNodes(s).find(n=>n.kind==='long'),h));assert.equal(s.beats[0],1);
 assert.ok(deleteArtworkBeat(s,artworkNodes(s).find(n=>n.kind==='blank'),h));assert.equal(s.blanks[0],false);
 assert.ok(deleteArtworkBeat(s,artworkNodes(s)[0],h));assert.equal(s.beats[0],0);assert.equal(artworkNodes(s).length,5);
 assert.ok(undoArtworkBeat(s,h));assert.equal(s.beats[0],1);assert.equal(s.blanks[0],false);assert.ok(undoArtworkBeat(s,h));assert.equal(s.blanks[0],true);assert.ok(undoArtworkBeat(s,h));assert.equal(s.beats[0],2);assert.equal(s.patterns[0],'keep-me');assert.equal(artworkNodes(s).length,8);assert.equal(undoArtworkBeat(s,h),false);
 const omitted=restoreArtwork({...s,beats:Array(6).fill(0),blanks:Array(5).fill(false)},modeThreeCharacters(library));assert.equal(artworkNodes(omitted).length,0);assert.ok(undoArtworkBeat(omitted,{history:[]}));assert.equal(artworkNodes(omitted).length,1);
});
test('only a glyph with a chosen Pattern enlarges while tight ink widths fit every responsive row',()=>{
 assert.equal(glyphSizeFactor(false),1);assert.equal(glyphSizeFactor(true),1.45);assert.equal(paddedViewBox('0 0 100 100'),'-16 -16 132 132');
 for(const width of [252,296,342,366,600,1024,1160])for(const height of [38,88,150,300])for(const count of [3,4,5,6])for(const selected of [-1,0,2]){
  const factors=Array.from({length:count},(_,i)=>glyphSizeFactor(i===selected)),aspects=factors.map((_,i)=>i===2?.5:.8),layout=fitArtworkRow(width,height,factors,aspects);
  assert.ok(layout.widths.reduce((a,b)=>a+b,0)+layout.gap*(count-1)<=width+1e-8);assert.ok(Math.max(...layout.sizes)<=height+1e-8);assert.ok(layout.sizes.every(s=>s>0));assert.ok(layout.gap<=5);
 }
});
