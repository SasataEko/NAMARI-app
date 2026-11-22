import test from 'node:test';
import assert from 'node:assert/strict';
import {fitArtworkRow} from '../src/data/modeThreeModel.js';
test('ordinary glyphs overlap gently but enlarged glyphs receive extra space on both sides',()=>{
 const ordinary=fitArtworkRow(600,240,[1,1,1],[.5,.5,.5]);assert.ok(ordinary.gaps.every(g=>g<0));assert.ok(ordinary.gaps.every(g=>g>=-9));
 const changed=fitArtworkRow(600,240,[1,1.45,1,1],[.5,.8,.5,.5]);assert.ok(changed.gaps[0]>0&&changed.gaps[1]>0);assert.ok(changed.gaps[2]<0);
 assert.ok(changed.sizes[1]>changed.sizes[0]);assert.equal(changed.sizes[0],changed.sizes[2]);
});
test('negative spacing stays within the screen without enlarging ordinary text to fill empty width',()=>{
 for(const width of [252,296,342,366,600,1024,1160])for(const height of [38,88,150,300])for(const factors of [[1,1,1,1,1,1],[1.45,1,1.45,1,1,1],[1.45,1.45,1.45,1.45,1.45,1.45]]){
  const l=fitArtworkRow(width,height,factors,[.65,.68,.52,.57,.4,.6]),span=l.widths.reduce((a,b)=>a+b,0)+l.gaps.reduce((a,b)=>a+b,0);
  assert.ok(span<=width*.82+1e-8);assert.ok(Math.max(...l.sizes)<=height+1e-8);assert.ok(l.base<=90);assert.equal(l.gaps.length,5);
 }
 const narrow=fitArtworkRow(600,240,[1,1,1],[.3,.3,.3]),wide=fitArtworkRow(600,240,[1,1,1],[.6,.6,.6]);assert.equal(narrow.base,wide.base);assert.equal(narrow.base,90);
});
