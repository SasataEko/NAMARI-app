import test from 'node:test';import assert from 'node:assert/strict';import {beatMarkerPath} from '../src/glyph/beatMarker.js';import {beatMarkerPaths} from '../src/glyph/beatMarkerPaths.js';
test('Gothic A1 beat marks use identical path contours at every sticker size with geometric centering',()=>{
 const previous=globalThis.document;globalThis.document={createElementNS:()=>({attributes:{},setAttribute(k,v){this.attributes[k]=v;}})};
 try{for(const text of ['ー','ッ']){const small=beatMarkerPath(text,{x:50,y:50,fontSize:64}),large=beatMarkerPath(text,{x:85,y:85,fontSize:90,drop:9.7});assert.equal(small.attributes.d,large.attributes.d);assert.equal(small.attributes.d,beatMarkerPaths[text].d);const nums=large.attributes.transform.match(/-?[\d.]+/g).map(Number),[x,y,scale]=nums,[bx,by,w,h]=beatMarkerPaths[text].bounds;assert.ok(Math.abs(x+(bx+w/2)*scale-85)<1e-8);assert.ok(Math.abs(y+(by+h/2)*scale-94.7)<1e-8);assert.equal(large.attributes['stroke-width'],undefined);}}
 finally{globalThis.document=previous;}
});
