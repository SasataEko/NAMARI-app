import { loadGlyph } from './glyph/loadGlyph.js';
import { libraryGlyph } from './data/patternLibrary.js';
import { assetUrl } from './data/projectLibrary.js';
// Same ink spacing and integer beats as Mode2, without an accent task.
export async function mountBeatEditor(root,{library,reading,beats,blanks,disabled=false,onChange}){
  let active=true;
  root.innerHTML='<p role="status">字形を読み込んでいます…</p>';
  const glyphs=await Promise.all(reading.map(async text=>{const glyph=libraryGlyph(library,text);return glyph?.normal?loadGlyph(assetUrl(glyph.normal)):null;}));
  if(!root.isConnected)return ()=>{active=false;};
  function render(){
    if(!active)return;root.replaceChildren();const row=document.createElement('div');row.className='explore-stage lesson-beat-stage';
    reading.forEach((text,i)=>{
      const unit=document.createElement('div');unit.className='explore-unit';
      const kana=document.createElement('div');kana.className='explore-kana';kana.setAttribute('aria-label',text+' '+beats[i]+'拍');
      const glyph=glyphs[i];let width=80;
      if(glyph){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox',glyph.viewBox);svg.setAttribute('role','img');svg.setAttribute('aria-label',text);glyph.shapes.forEach(shape=>{const p=document.createElementNS(svg.namespaceURI,'path');p.setAttribute('d',shape.d);p.setAttribute('fill','#000');if(shape.fillRule)p.setAttribute('fill-rule',shape.fillRule);svg.append(p);});kana.append(svg);row.append(unit);unit.append(kana);root.append(row);const box=svg.getBBox();const [,y,,h]=glyph.viewBox.split(/[ ,]+/).map(Number);if(box.width){svg.setAttribute('viewBox',box.x+' '+y+' '+box.width+' '+h);width=box.width*80/h;}width+=80*(beats[i]-1);svg.style.width=width+'px';svg.style.height='80px';svg.setAttribute('preserveAspectRatio',beats[i]>1?'none':'xMidYMid meet');}
      else{const label=document.createElement('span');label.className='lesson-kana-text';label.textContent=text;label.style.transform='scaleX('+beats[i]+')';kana.append(label);width=80*beats[i];unit.append(kana);}
      unit.style.width=(width+16)+'px';const button=document.createElement('button');button.className='explore-beat-toggle';button.textContent=beats[i]===2?'→ 1拍':'→ 2拍';button.disabled=disabled;button.setAttribute('aria-label',text+'を'+(beats[i]===2?1:2)+'拍にする');button.onclick=()=>{beats[i]=beats[i]===2?1:2;render();onChange?.();};unit.append(button);row.append(unit);
      if(i<reading.length-1){const gap=document.createElement('div');gap.className='explore-gap'+(blanks[i]?' has-blank':'');if(blanks[i]){const blank=document.createElement('div');blank.className='explore-blank-cell';blank.innerHTML='<span>ッ</span>';gap.append(blank);}const add=document.createElement('button');add.textContent=blanks[i]?'−':'＋';add.disabled=disabled;add.setAttribute('aria-label',text+'の後の空白拍を'+(blanks[i]?'削除':'追加'));add.onclick=()=>{blanks[i]=!blanks[i];render();onChange?.();};gap.append(add);row.append(gap);}
    });root.append(row);
  }
  render();return {setDisabled(value){disabled=value;render();},dispose(){active=false;}};
}
