import {decorateSticker,decorateBeatMarker} from './glyph/sticker.js';
import {mountBeatChoices} from './beatChoices.js';
import {toggleBeatSelection,removeSelectedBeat,undoDecrease} from './rhythmReduction.js';
import {wrapWordUnits,observeWordStage} from './wordLayout.js';
import { loadGlyph } from './glyph/loadGlyph.js';
import { libraryGlyph } from './data/patternLibrary.js';
import { assetUrl } from './data/projectLibrary.js';
// Same ink spacing and integer beats as Mode2, without an accent task.
export async function mountBeatEditor(root,{library,reading,beats,blanks,disabled=false,onChange,onSelect}){
  let active=true,wordObserver=null;const reduction={index:null,history:[],hasDeleted:false};
  root.innerHTML='<p role="status">字形を読み込んでいます…</p>';
  const glyphs=await Promise.all(reading.map(async text=>{const glyph=libraryGlyph(library,text);return glyph?.normal?loadGlyph(assetUrl(glyph.normal)):null;}));
  if(!root.isConnected)return ()=>{active=false;};
  function render(){
    if(!active)return;wordObserver?.disconnect();root.replaceChildren();const row=document.createElement('div');row.className='explore-stage lesson-beat-stage';
    reading.forEach((text,i)=>{
      const unit=document.createElement('div');unit.className='explore-unit';unit.dataset.beats=String(beats[i]);unit.hidden=beats[i]===0;
      const kana=document.createElement('button');kana.type='button';kana.disabled=disabled;kana.className='explore-kana';kana.classList.toggle('beat-selected',reduction.index===i&&reduction.kind!=='blank');kana.setAttribute('aria-pressed',String(reduction.index===i));kana.setAttribute('aria-label',(i+1)+'拍目の「'+text+'」を'+(reduction.index===i?'選択解除':'選ぶ'));kana.dataset.beatKana=String(i);kana.onclick=()=>{if(reduction.kind==='blank')reduction.index=null;reduction.kind='base';if(toggleBeatSelection(beats,i,reduction)){render();onSelect?.();}};
      const glyph=glyphs[i];let width=80;
      if(glyph){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox',glyph.viewBox);svg.setAttribute('role','img');svg.setAttribute('aria-label',text);glyph.shapes.forEach(shape=>{const p=document.createElementNS(svg.namespaceURI,'path');p.setAttribute('d',shape.d);p.setAttribute('fill','#000');if(shape.fillRule)p.setAttribute('fill-rule',shape.fillRule);svg.append(p);});kana.append(svg);row.append(unit);unit.append(kana);root.append(row);const box=svg.getBBox();const [,y,,h]=glyph.viewBox.split(/[ ,]+/).map(Number);if(box.width){svg.setAttribute('viewBox',box.x+' '+y+' '+box.width+' '+h);width=box.width*80/h;}width+=80*(beats[i]-1);svg.style.width=width+'px';svg.style.height='80px';svg.dataset.inkRatio=String(box.width/h);svg.dataset.beats=String(beats[i]);svg.setAttribute('preserveAspectRatio',beats[i]>1?'none':'xMidYMid meet');decorateSticker(svg,i);}
      else{const label=document.createElement('span');label.className='lesson-kana-text';label.textContent=text;label.style.transform='scaleX('+beats[i]+')';kana.append(label);width=80*beats[i];unit.append(kana);}
      unit.style.width=(width+16)+'px';row.append(unit);
      if(i<reading.length-1){const gap=document.createElement('div');gap.className='explore-gap'+(blanks[i]?' has-blank':'');gap.hidden=beats[i]===0&&!blanks[i];if(blanks[i]){const blank=document.createElement('button');blank.type='button';blank.disabled=disabled;blank.className='explore-blank-cell';blank.dataset.blankIndex=String(i);blank.setAttribute('aria-label',text+'の後の「ッ」を選ぶ');blank.classList.toggle('beat-selected',reduction.kind==='blank'&&reduction.index===i);blank.innerHTML='<span>ッ</span>';blank.onclick=()=>{reduction.index=reduction.kind==='blank'&&reduction.index===i?null:i;reduction.kind='blank';render();onSelect?.();};decorateBeatMarker(blank.querySelector('span'),i);gap.append(blank);}row.append(gap);}
    });root.append(row);wrapWordUnits(row,reading);wordObserver=observeWordStage(row);const i=reduction.index,selected=Number.isInteger(i),blank=reduction.kind==='blank';
    const choices=mountBeatChoices(root,{text:selected?(blank?'ッ':reading[i]):null,canLong:selected&&!blank&&beats[i]===1&&!disabled,canBlank:selected&&!blank&&i<blanks.length&&!blanks[i]&&!disabled,
      onLong:()=>{beats[i]=2;render();onChange?.();},onBlank:()=>{blanks[i]=true;render();onChange?.();},
      onDelete:()=>{if(blank){reduction.history.push({blank:true,index:i});blanks[i]=false;reduction.index=null;}else removeSelectedBeat(beats,reduction);reduction.hasDeleted=true;render();onChange?.();}});
    if(selected){choices.querySelector('[data-beat-choice=long]').dataset.stretchIndex=String(i);choices.querySelector('[data-beat-choice=blank]').dataset.gapIndex=String(i);if(blank)choices.querySelector('[data-beat-choice=delete]').dataset.deleteBlankIndex=String(i);}
    if(reduction.hasDeleted||beats.includes(0)){const bar=document.createElement('div');bar.className='beat-reduction-controls';const undo=document.createElement('button');undo.type='button';undo.className='outline-button';undo.textContent='拍を戻す';undo.dataset.unavailable=String(!reduction.history.length&&!beats.includes(0));undo.disabled=disabled||undo.dataset.unavailable==='true';undo.onclick=()=>{const last=reduction.history.at(-1);if(last?.blank){reduction.history.pop();blanks[last.index]=true;}else if(!undoDecrease(beats,reduction)){const index=beats.lastIndexOf(0);if(index>=0)beats[index]=1;}reduction.index=null;render();onChange?.();};bar.append(undo);root.append(bar);}
    if(disabled)root.querySelectorAll('button').forEach(b=>b.disabled=true);
  }
  render();return {setDisabled(value){disabled=value;render();},dispose(){active=false;wordObserver?.disconnect();}};
}
