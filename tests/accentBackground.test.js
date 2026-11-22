import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {initialArtwork,artworkNodes,toggleArtworkEmphasis,deleteArtworkBeat,restoreArtwork,modeThreeCharacters} from '../src/data/modeThreeModel.js';
import {createEditHistory} from '../src/editHistory.js';
import {accentBackgroundAssets,emphasisBackground,createRotationPicker,backgroundTransform} from '../src/glyph/accentBackground.js';
test('all three supplied silhouettes load from project assets with original canvas proportions',async()=>{
 const expected=[[219,223.04],[382.13,435.19],[621.45,634.34]];
 for(const [i,asset]of accentBackgroundAssets.entries()){
  const text=await fs.readFile(new URL('../public/'+asset,import.meta.url),'utf8'),box=text.match(/viewBox="([^"]+)"/)[1];
  assert.deepEqual(box.split(' ').map(Number),[0,0,...expected[i]]);assert.equal([...text.matchAll(/<path\b/g)].length,1);
  const transform=backgroundTransform(box,40,60,50,125);assert.ok(transform.startsWith('translate(40 60) rotate(125)'));assert.ok(transform.includes('scale('+50/Math.max(...expected[i])+')'));
 }
});
test('the first emphasis uses shape 3, second shape 2, and a third cannot be silently added',()=>{
 const s=initialArtwork();assert.ok(artworkNodes(s).every(n=>emphasisBackground(n.emphasisRank)===1));
 assert.ok(toggleArtworkEmphasis(s,'base:0'));assert.ok(toggleArtworkEmphasis(s,'base:3'));const before=structuredClone(s);
 assert.equal(toggleArtworkEmphasis(s,'base:2'),false);assert.deepEqual(s,before);
 assert.equal(emphasisBackground(artworkNodes(s)[0].emphasisRank),3);assert.equal(emphasisBackground(artworkNodes(s)[3].emphasisRank),2);
 assert.ok(toggleArtworkEmphasis(s,'base:0'));assert.deepEqual(s.emphasis,['base:3']);assert.equal(artworkNodes(s)[3].emphasisRank,1);assert.ok(toggleArtworkEmphasis(s,'base:2'));assert.deepEqual(s.emphasis,['base:3','base:2']);assert.deepEqual(s.pitch,initialArtwork().pitch);
});
test('deleting an emphasized inserted beat promotes the survivor and general undo restores the ranks',()=>{
 let s=initialArtwork();s.beats[0]=2;toggleArtworkEmphasis(s,'long:0');toggleArtworkEmphasis(s,'base:3');
 const edits=createEditHistory({capture:()=>s,restore:old=>{s=old;}});edits.checkpoint();
 assert.ok(deleteArtworkBeat(s,artworkNodes(s).find(n=>n.kind==='long'),{history:[]}));assert.deepEqual(s.emphasis,['base:3']);assert.equal(artworkNodes(s).find(n=>n.key==='base:3').emphasisRank,1);
 edits.undo();assert.deepEqual(s.emphasis,['long:0','base:3']);assert.equal(artworkNodes(s).find(n=>n.kind==='long').emphasisRank,1);
});
test('saved ranks discard hidden, duplicate and unknown nodes while old works remain neutral',async()=>{
 const library=JSON.parse(await fs.readFile(new URL('../public/content/library.json',import.meta.url),'utf8')),chars=modeThreeCharacters(library),s=initialArtwork();s.beats[0]=0;s.emphasis=['base:0','missing','base:2','base:2','base:3','base:5'];
 const restored=restoreArtwork(s,chars);assert.deepEqual(restored.emphasis,['base:2','base:3']);
 const old={...initialArtwork(),schemaVersion:2};delete old.emphasis;assert.deepEqual(restoreArtwork(old,chars).emphasis,[]);
});
test('background rotations stay cached across edits and redraws, with separated successive angles',()=>{
 const values=[0,.01,.02,.3],picker=createRotationPicker(()=>values.shift()??.7);
 const first=picker('base:0'),second=picker('base:1');assert.equal(picker('base:0'),first);assert.equal(picker('base:1'),second);assert.ok(Math.min(Math.abs(first-second),360-Math.abs(first-second))>=30);
 const blank=picker('blank:0');assert.equal(picker('blank:0'),blank);assert.ok(blank>=0&&blank<360);assert.equal(createRotationPicker(()=>.5)('base:0'),180);
});
