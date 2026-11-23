import {beatVisual} from './rhythmReduction.js';
// Break only between mora cards: small kana remain attached to their parent.
export function wordRows(tokens) {
  const size=t=>Array.from(String(t).normalize('NFC')).length,total=tokens.reduce((sum,t)=>sum+size(t),0);
  if(!tokens.length)return [];
  if(total<=6)return [tokens.map((_,i)=>i)];
  // Balance around four to five visible kana, avoiding a third row of just one or two.
  const rows=[];let row=[],count=0,remaining=total,rowsLeft=Math.ceil(total/5);
  tokens.forEach((token,i)=>{if(rowsLeft>1&&count>=Math.ceil(remaining/rowsLeft)){rows.push(row);remaining-=count;rowsLeft--;row=[];count=0;}row.push(i);count+=size(token);});
  if(row.length)rows.push(row);return rows;
}

export function wrapWordUnits(stage,tokens) {
  const children=[...stage.children],units=children.filter(e=>e.classList.contains('explore-unit')||e.classList.contains('character-button'));
  if(units.length!==tokens.length)return;
  const rows=wordRows(tokens.map((t,i)=>units[i].hidden?'':t));stage.classList.add('responsive-word');
  rows.forEach((indices,r)=>{const row=document.createElement('div');row.className='word-row';row.dataset.wordRow=String(r);
    indices.forEach(i=>{const unit=units[i],gap=unit.nextElementSibling?.classList.contains('explore-gap')?unit.nextElementSibling:null;row.append(unit);if(gap)row.append(gap);});stage.append(row);
  });
}

// Fit glyphs, not the whole UI: buttons and text keep their normal CSS sizing.
export function fitWordStage(stage) {
  if(!stage.isConnected)return;
  const rows=[...stage.querySelectorAll(':scope > .word-row')];if(!rows.length)return;
  const available=Math.max(1,stage.clientWidth-12),spacing=8;
  const cost=row=>[...row.children].reduce((sum,e)=>{
    if(e.hidden)return sum;
    if(e.classList.contains('explore-gap'))return sum+(e.dataset.beatCount!==undefined?Number(e.dataset.beatCount):(e.classList.contains('has-blank')?1:0));
    const svg=e.querySelector('.explore-kana svg'),label=e.querySelector('.lesson-kana-text');const visual=beatVisual(Number(svg?.dataset.beats??e.dataset.beats??1),Number(svg?.dataset.omissionRate??(e.hidden?1:0)));return sum+(Number(svg?.dataset.inkRatio)||.85*(label?[...label.textContent].length:1))*visual.survival+visual.extension;
  },0);
  const hasCards=stage.dataset.patternCards==='true'||!!stage.closest('.explore-card')?.querySelector('.explore-features');
  const compactControls=hasCards||(rows.length>1&&['pitch','duration'].includes(stage.dataset.tool));
  const rowLimit=window.innerHeight<740?(compactControls?((window.innerHeight<650?[0,40,28,22]:[0,48,32,24])[Math.min(rows.length,3)]):Math.min(80,120/rows.length)):Math.min(80,150/rows.length);
  const result=stage.closest('.explore-results'),totalResultRows=result?.querySelectorAll('.word-row').length||Number(stage.dataset.resultRows)||1;
  const resultLimit=(result||stage.dataset.resultRows)?Math.min(64,(window.innerHeight<600?88:window.innerHeight<740?128:160)/totalResultRows):80;
  const maxSize=stage.dataset.enlarged==='true'?Math.max(16,Math.min(80,(window.innerHeight-200)/rows.length-16)):Math.min(80,Math.max(40,window.innerHeight*.105),rowLimit,resultLimit);
  const size=Math.max(8,Math.min(maxSize,...rows.map(row=>(available-[...row.querySelectorAll('.explore-unit')].filter(e=>!e.hidden).length*spacing)/Math.max(.1,cost(row)))));
  stage.style.setProperty('--word-size',size+'px');
  rows.forEach(row=>[...row.children].forEach(e=>{
    if(e.hidden){e.style.width='0px';return;}
    if(e.classList.contains('explore-gap')){e.style.width=(e.dataset.beatCount!==undefined?size*Number(e.dataset.beatCount):(e.classList.contains('has-blank')?size:0))+'px';if(e.dataset.beatCount!==undefined){e.querySelectorAll('.lesson-beat-mark').forEach(mark=>{mark.style.width=size+'px';mark.querySelector('span').style.fontSize=size*.9+'px';});return;}const mark=e.querySelector('.explore-blank-cell>span');if(mark)mark.style.fontSize=Math.max(8,(14+16*Number(mark.dataset.blankRate??1))*size/80)+'px';return;}
    const svg=e.querySelector('.explore-kana svg');if(!svg){const label=e.querySelector('.lesson-kana-text');if(label){label.style.fontSize=(size*.9)+'px';label.style.lineHeight=(size+12)+'px';e.style.width=((.85*[...label.textContent].length+Math.max(0,Number(e.dataset.beats||1)-1))*size+spacing)+'px';}return;}
    const visual=beatVisual(Number(svg.dataset.beats??1),Number(svg.dataset.omissionRate??0));const width=((Number(svg.dataset.inkRatio)||.85)*visual.survival+visual.extension)*size;
    svg.style.width=width+'px';svg.style.height=size+'px';e.style.width=(width+spacing)+'px';
  }));
}

export function observeWordStage(stage,onLayout=()=>{}) {
  let frame=0;const schedule=()=>{if(frame)return;frame=requestAnimationFrame(()=>{frame=0;if(stage.isConnected){fitWordStage(stage);onLayout();}});};
  const observer=new ResizeObserver(schedule);observer.observe(stage);schedule();
  return {disconnect(){observer.disconnect();cancelAnimationFrame(frame);}};
}

export function wrapStaticWord(stage,tokens) {
  wrapWordUnits(stage,tokens);stage.classList.add('static-word');
  [...stage.querySelectorAll('.word-row')].forEach(row=>row.style.setProperty('--row-count',row.children.length));
}
