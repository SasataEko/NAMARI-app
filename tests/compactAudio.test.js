import test from 'node:test';
import assert from 'node:assert/strict';
import {mountCompactAudio} from '../src/compactAudio.js';
import {fitArtworkRow} from '../src/data/modeThreeModel.js';

class Element extends EventTarget{
 constructor(tag){super();this.tag=tag;this.children=[];this.dataset={};this.attributes={};}
 setAttribute(k,v){this.attributes[k]=String(v);}getAttribute(k){return this.attributes[k];}
 append(...nodes){for(const node of nodes){node.remove();node.parent=this;this.children.push(node);}}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);this.parent=null;}
 closest(selector){for(let n=this;n;n=n.parent)if(n.className===selector.slice(1))return n;return null;}
 querySelectorAll(tag){return this.children.flatMap(n=>[...(n.tag===tag?[n]:[]),...n.querySelectorAll(tag)]);}
}
class Audio extends Element{
 constructor(){super('audio');this.paused=true;this.ended=false;this.controls=true;this.hidden=false;}
 async play(){if(this.reject)throw Error('audio unavailable');this.paused=false;this.ended=false;this.dispatchEvent(new Event('play'));}
 pause(){if(!this.paused){this.paused=true;this.dispatchEvent(new Event('pause'));}}
}

test('compact buttons reuse tracked audio, keep learner/reference distinct, and survive remounting',async()=>{
 const previous=globalThis.document;globalThis.document={createElement:tag=>new Element(tag)};
 try{
  const host=new Element('main'),canvas=new Element('section'),strip=new Element('div');strip.className='audio-comparison-strip';host.append(strip,canvas);
  const learner=new Audio(),reference=new Audio();strip.append(learner,reference);let learnerPlays=0,referencePlays=0;
  learner.addEventListener('play',()=>learnerPlays++);reference.addEventListener('play',()=>referencePlays++);
  const dispose=mountCompactAudio(canvas,learner,reference),rail=canvas.children[0],play=rail.children[0].children[0],compare=rail.children[1].children[0];
  assert.deepEqual(canvas.querySelectorAll('audio'),[learner,reference]);assert.equal(learner.controls,false);assert.equal(learner.hidden,true);assert.equal(strip.parent,null);
  await play.onclick();assert.equal(learnerPlays,1);assert.equal(play.getAttribute('aria-pressed'),'true');
  await compare.onclick();assert.equal(learner.paused,true);assert.equal(referencePlays,1);assert.equal(play.getAttribute('aria-pressed'),'false');
  await compare.onclick();assert.equal(reference.paused,true);assert.equal(referencePlays,1);
  await play.onclick();dispose();assert.equal(learner.paused,true);assert.equal(rail.parent,null);
  const disposeAgain=mountCompactAudio(canvas,learner,reference);assert.deepEqual(canvas.querySelectorAll('audio'),[learner,reference]);
  await canvas.children[0].children[1].children[0].onclick();assert.equal(referencePlays,2);disposeAgain();
 }finally{globalThis.document=previous;}
});

test('unavailable recording remains retryable and does not report playback success',async()=>{
 const previous=globalThis.document;globalThis.document={createElement:tag=>new Element(tag)};
 try{const canvas=new Element('section'),audio=new Audio();audio.reject=true;const dispose=mountCompactAudio(canvas,audio),button=canvas.children[0].children[0].children[0];
  await button.onclick();assert.match(button.getAttribute('aria-label'),/再生できません/);assert.equal(button.getAttribute('aria-pressed'),'false');
  audio.reject=false;await button.onclick();assert.equal(button.getAttribute('aria-pressed'),'true');dispose();
 }finally{globalThis.document=previous;}
});

test('larger Mode2 layout still respects width and height when patterns enlarge and beats are added',()=>{
 for(const width of [230,280,320,360,600])for(const height of [90,160,260])for(const factors of [[1,1,1,1,1,1],[1.45,1,1.45,1],[1,1,1,1,1,1,1,1]]){
  const aspects=factors.map(()=>.65),l=fitArtworkRow(width,height,factors,aspects,{maxBase:160,fill:.96});
  assert.ok(l.widths.reduce((a,b)=>a+b,0)+l.gaps.reduce((a,b)=>a+b,0)<=width*.96+1e-8);assert.ok(Math.max(...l.sizes)<=height+1e-8);
 }
 const small=fitArtworkRow(350,240,[1,1,1],[.65,.65,.65]),large=fitArtworkRow(350,240,[1,1,1],[.65,.65,.65],{maxBase:160,fill:.96});assert.ok(large.base>small.base);
});
