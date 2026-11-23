import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs/promises';

test('DIY selects a kana before showing pattern cards, preserves multiple targets, and clears one independently',async()=>{
 const source=await fs.readFile('src/main.js','utf8'),a=source.indexOf('function renderDiyVowelOptions(){'),b=source.indexOf('\nfunction renderDiyPitchEditor()',a),fn=source.slice(a,b);
 class Area{set innerHTML(html){this.html=html;this.buttons=[...html.matchAll(/data-diy-pattern="(\d+)"/g)].map(m=>({dataset:{diyPattern:m[1]}}));this.clear=html.includes('data-clear-diy-target')?{}:null;}querySelectorAll(){return this.buttons;}querySelector(){return this.clear;}}
 const candidates=new Area(),grid={set innerHTML(html){this.html=html;this.buttons=[...html.matchAll(/data-diy-kana="(\d+)"/g)].map(m=>({dataset:{diyKana:m[1]}}));},querySelector:s=>s==='[data-diy-candidates]'?candidates:{},querySelectorAll(){return this.buttons;}};
 const glyphs={か:{normal:'ka.svg',patterns:[{id:'ka-1',title:'A',svg:'ka1.svg',groupId:'a'},{id:'ka-2',title:'B',svg:'ka2.svg',groupId:'a'}]},な:{normal:'na.svg',patterns:[{id:'na-1',title:'RN',svg:'na1.svg',groupId:'a'}]}};
 const context=vm.createContext({app:{querySelector:()=>grid},diyBuilderMorae:['か','な'],diyVowelSelectedIndex:null,diyTargetIndexes:[],diyPatternChoices:[],sharedLibrary:{groups:[{id:'a',color:'#ffb52e'}]},libraryGlyph:(_lib,k)=>glyphs[k],assetUrl:x=>x,escapeHtml:x=>String(x||''),stickerPalette:['#fb557c','#507aff'],wrapStaticWord(){},decorateCardImages(){},updateDiySaveButton(){}});
 new vm.Script(fn+'\nrenderDiyVowelOptions()').runInContext(context);
 assert.equal(context.diyTargetIndexes.length,0);assert.equal(context.diyPatternChoices.length,0);assert.equal(candidates.buttons.length,0);
 grid.buttons[0].onclick();assert.equal(candidates.buttons.length,2);assert.equal(context.diyTargetIndexes.length,0);
 candidates.buttons[1].onclick();assert.deepEqual([...context.diyTargetIndexes],[0]);assert.equal(context.diyPatternChoices[0],'ka-2');
 grid.buttons[1].onclick();candidates.buttons[0].onclick();assert.deepEqual([...context.diyTargetIndexes],[0,1]);
 candidates.clear.onclick();assert.deepEqual([...context.diyTargetIndexes],[0]);assert.equal(context.diyPatternChoices[1],null);assert.equal(context.diyPatternChoices[0],'ka-2');
 grid.buttons[0].onclick();candidates.buttons[0].onclick();assert.equal(context.diyPatternChoices[0],'ka-1');assert.deepEqual([...context.diyTargetIndexes],[0]);
});

test('shared card previews reuse untouched SVG paths and the card colour with sticker layers',async()=>{
 const source=(await fs.readFile('src/glyph/cardGlyphPreview.js','utf8')).replace(/^import .*;\r?\n/gm,'').replace('export function','function');
 class Node{constructor(){this.children=[];this.attrs={};this.style={setProperty:(k,v)=>this.attrs[k]=v};this.classList={add:()=>{}};}setAttribute(k,v){this.attrs[k]=v;}append(n){this.children.push(n);}}
 const paths=[{d:'M0 0 L80 0 L80 80 Z',fillRule:'evenodd'}],card={style:{backgroundColor:'rgb(255, 181, 46)'}},image={dataset:{},style:{},src:'ka.svg',alt:'か',isConnected:true,closest:()=>card,replaceWith(svg){this.svg=svg;}};
 const context=vm.createContext({document:{createElementNS:()=>new Node()},loadGlyph:async()=>({viewBox:'0 0 100 100',shapes:paths}),decorateSticker:svg=>svg.sticker=true,root:{querySelectorAll:()=>[image]}});
 await new vm.Script(source+'\ndecorateCardImages(root)').runInContext(context);
 assert.equal(image.svg.sticker,true);assert.equal(image.svg.attrs['--sticker-color'],card.style.backgroundColor);assert.equal(image.svg.children[0].attrs.d,paths[0].d);assert.equal(image.svg.children[0].attrs['fill-rule'],'evenodd');assert.equal(image.svg.attrs.viewBox,'-12 -12 124 124');
});
