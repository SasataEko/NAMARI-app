import { loadGlyph } from './glyph/loadGlyph.js';
import { createMorph, setMorphIntensity } from './glyph/morph.js';
import { featuresFor } from './data/explorationFeatures.js';
import { saveExploration, getExplorationAggregate, defaultAccent, pitchValue } from './data/explorationStore.js';
import './exploration.css';

const ns = 'http://www.w3.org/2000/svg';
const labels = { segment: '母音/子音', pitch: 'アクセント', duration: '拍' };
const ease = t => t * t * (3 - 2 * t);
export function mountExploration(root, { level, profileId }) {
  const n = level.characters.length;
  const state = { features: Array(n).fill(null), intensity: Array(n).fill(0), pitch: defaultAccent(level), beats: Array(n).fill(1), blanks: Array(Math.max(0,n-1)).fill(false), touched: {segment:false,pitch:false,duration:false} };
  let mode = 'segment', selected = null, ready = false, busy = false, glyphs;
  const animations = new WeakMap();
  const session = {}; root.explorationSession = session;
  const alive = () => root.isConnected && root.explorationSession === session;
  function svgFor(i) {
    const svg = document.createElementNS(ns,'svg'); svg.setAttribute('viewBox',glyphs[i].normal.viewBox);svg.setAttribute('role','img');svg.setAttribute('aria-label',level.characters[i].text);
    for(const shape of glyphs[i].normal.shapes) {const p=document.createElementNS(ns,'path');p.setAttribute('d',shape.d);p.setAttribute('fill',shape.fill);if(shape.fillRule)p.setAttribute('fill-rule',shape.fillRule);svg.append(p);}
    return svg;
  }
  function paint(svg,i,feature,intensity,animate=false) {
    const previous=animations.get(svg);if(previous) cancelAnimationFrame(previous.frame);
    const targetMorph=glyphs[i].variants.find(v=>v.id===feature)?.morph;
    const morph=targetMorph || glyphs[i].variants.find(v=>v.id===svg.dataset.feature)?.morph;
    const start=Number(svg.dataset.amount || 0);const target=targetMorph?intensity:0;
    const apply=value=>{if(morph)setMorphIntensity([...svg.children],morph,value);else [...svg.children].forEach((p,j)=>p.setAttribute('d',glyphs[i].normal.shapes[j].d));svg.dataset.amount=String(value);fitGlyph(svg,i);};
    if(!animate || matchMedia('(prefers-reduced-motion: reduce)').matches){apply(target);svg.dataset.feature=feature||'';return;}
    // Animate both selection and strength changes with smooth acceleration/deceleration.
    const from=!targetMorph || svg.dataset.feature===feature?start:0;svg.dataset.feature=feature||'';const time=performance.now();const token={frame:0};animations.set(svg,token);
    const tick=now=>{if(!svg.isConnected)return;const t=Math.min(1,(now-time)/650);apply(from+(target-from)*ease(t));if(t<1)token.frame=requestAnimationFrame(tick);};token.frame=requestAnimationFrame(tick);
  }
  function paintAverage(svg,i,rates) {
    let current=glyphs[i].normal.shapes.map(s=>s.d),weight=Math.max(0,1-Object.values(rates).reduce((a,b)=>a+b,0));
    for(const variant of glyphs[i].variants){const rate=rates[variant.id]||0;if(!rate)continue;const total=weight+rate;current=weight===0?variant.morph.to:createMorph(current,variant.morph.to).map(f=>f(rate/total));weight=total;}
    [...svg.children].forEach((path,j)=>path.setAttribute('d',current[j]));
    svg.setAttribute('aria-label',`${level.characters[i].text} 変形選択率 ${Math.round(Object.values(rates).reduce((a,b)=>a+b,0)*100)}%`);
  }
  function fitGlyph(svg,i) {
    if(!svg.isConnected)return;
    const ink=svg.getBBox();
    if(!ink.width)return;
    const [,y,,height]=glyphs[i].normal.viewBox.trim().split(/[ ,]+/).map(Number);
    const width=ink.width*80/height+80*Math.max(0,Number(svg.dataset.beats)-1);
    // Remove SVG canvas side bearings, then keep the same 20px ink-to-ink gap.
    svg.setAttribute('viewBox',`${ink.x} ${y} ${ink.width} ${height}`);
    svg.setAttribute('preserveAspectRatio',Number(svg.dataset.beats)>1?'none':'xMidYMid meet');
    svg.style.width=`${width}px`;svg.style.transform='none';
    svg.closest('.explore-unit').style.width=`${width+20}px`;
  }
  function accentBuilder(data, editing) {
    const box=document.createElement('div');box.className='pitch-builder explore-accent-builder';
    box.innerHTML='<div class="pitch-row-labels"><span>高</span><span>低</span></div><div class="pitch-columns"></div>';
    const columns=box.querySelector('.pitch-columns');columns.style.gridTemplateColumns=`repeat(${n},1fr)`;
    let d='';data.pitch.forEach((pitch,i)=>{if(pitch===null)return;d+=`${i&&data.pitch[i-1]!==null?'L':'M'}${50+i*100} ${57-38*pitchValue(pitch)} `;});
    columns.innerHTML=`<svg class="pitch-path" viewBox="0 0 ${n*100} 76" preserveAspectRatio="none" aria-hidden="true"><path class="pitch-guide" d="M50 19 H${n*100-50} M50 57 H${n*100-50}"/><path class="pitch-line-path" d="${d}"/></svg>`;
    level.characters.forEach((c,i)=>{const col=document.createElement('div');col.className='pitch-column';
      ['high','low'].forEach(p=>{const control=document.createElement(editing?'button':'span');control.className=`pitch-choice pitch-${p} ${data.pitch[i]===p?'selected':''}`;control.textContent='●';if(editing){control.setAttribute('aria-label',`${c.text}を${p==='high'?'高':'低'}くする`);control.setAttribute('aria-pressed',String(data.pitch[i]===p));control.onclick=()=>{state.pitch[i]=p;state.touched.pitch=true;renderEditor();};}col.append(control);});
      const name=document.createElement('b');name.textContent=c.text;const note=document.createElement('small');note.textContent=`第${i+1}拍`;col.append(name,note);columns.append(col);if(!editing){const point=document.createElement('span');point.className='explore-mean-pitch';point.style.top=`${57-38*pitchValue(data.pitch[i])}px`;point.setAttribute('aria-label',`${c.text} 高音率${Math.round(pitchValue(data.pitch[i])*100)}%`);col.append(point);}
    });return box;
  }
  function beatDots(beats,blank=false) {
    const row=document.createElement('div');row.className='explore-beat-dots';row.setAttribute('role','img');row.setAttribute('aria-label',`${Number(beats.toFixed(2))}拍`);
    const first=document.createElement('i');first.setAttribute('aria-hidden','true');
    first.style.left=`${blank?50:50-25*Math.max(0,beats-1)}%`;if(blank)first.style.opacity=String(beats);row.append(first);
    if(!blank&&beats>1){const second=document.createElement('i');second.style.left='75%';second.style.opacity=String(Math.min(1,beats-1));second.setAttribute('aria-hidden','true');row.append(second);}
    return row;
  }
  function makeStage(data,editing=false) {
    const stage=document.createElement('div');stage.className='explore-stage';
    level.characters.forEach((c,i)=>{
      const unit=document.createElement('div');unit.className=`explore-unit ${data.beats[i]===2?'is-two-beats':''}`;unit.style.width=`${data.beats[i]*90}px`;
      const kana=document.createElement(editing?'button':'div');kana.className='explore-kana';kana.classList.toggle('marked',editing&&mode==='segment'&&selected===i);kana.classList.toggle('has-answer',data.features[i]!==null);kana.style.transform=`translateY(${18-36*pitchValue(data.pitch[i])}px)`;
      const svg=svgFor(i);svg.style.width='80px';svg.style.height='80px';svg.setAttribute('preserveAspectRatio','xMidYMid meet');svg.dataset.beats=String(data.beats[i]);kana.append(svg);paint(svg,i,data.features[i],data.features[i]&&data.features[i]!=='none'?1:0);if(data.featureRates)paintAverage(svg,i,data.featureRates[i]);
      if(editing){kana.dataset.kana=i;kana.setAttribute('aria-label',`${c.text}を${selected===i?'選択解除':'選ぶ'}`);kana.setAttribute('aria-pressed',String(selected===i));kana.onclick=()=>{if(mode!=='segment')return;if(selected===i){state.features[i]=null;state.intensity[i]=0;state.touched.segment=state.features.some(f=>f!==null);selected=null;}else selected=i;renderEditor();};}
      unit.append(kana);
      const dots=beatDots(data.beats[i]);
      dots.classList.toggle('is-selected',editing&&mode==='segment'&&selected===i);
      dots.setAttribute('aria-label',`${c.text} ${Number(data.beats[i].toFixed(2))}拍${data.features[i]==='none'?'・該当なし':data.features[i]?'・回答済み':''}`);
      unit.append(dots);
      if(editing&&mode==='duration') {const toggle=document.createElement('button');toggle.className='explore-beat-toggle';toggle.textContent=data.beats[i]===2?'→ 1拍':'→ 2拍';toggle.setAttribute('aria-label',`${c.text}を${data.beats[i]===2?'1':'2'}拍にする`);toggle.onclick=()=>{state.beats[i]=state.beats[i]===1?2:1;state.touched.duration=true;renderEditor();};unit.append(toggle);}
      stage.append(unit);
      if(i<n-1){const gap=document.createElement('div');gap.className=`explore-gap ${data.blanks[i]?'has-blank':''}`;
        if(data.blanks[i]){gap.style.width=`${80*Number(data.blanks[i])}px`;const blank=document.createElement('div');blank.className='explore-blank-cell';blank.setAttribute('role','img');blank.setAttribute('aria-label',`追加拍 ${Number(data.blanks[i]).toFixed(2)}拍`);blank.innerHTML='<span aria-hidden="true">ッ</span>';gap.append(blank,beatDots(Number(data.blanks[i]),true));}
        if(editing&&mode==='duration'){const button=document.createElement('button');button.textContent=data.blanks[i]?'−':'＋';button.setAttribute('aria-label',`${c.text}の後の空白拍を${data.blanks[i]?'削除':'追加'}`);button.onclick=()=>{state.blanks[i]=!state.blanks[i];state.touched.duration=true;renderEditor();};gap.append(button);}stage.append(gap);}
    });requestAnimationFrame(()=>stage.querySelectorAll('.explore-kana svg').forEach((svg,i)=>fitGlyph(svg,i)));return stage;
  }
  // Keep audio outside the editing area so changing tools never interrupts playback.
  root.innerHTML=`<section class="explore-card"><p class="eyebrow">REALTIME EXPLORATION / 01</p><h1>これ、訛ってる？</h1><audio controls preload="metadata" src="${level.audio}" aria-label="研究録音"></audio><p class="explore-listen-copy">発音を聞いてみよう</p><p class="explore-headphone-note">※イヤホン推奨します</p><div data-editor></div><p data-status role="status">字形を読み込んでいます…</p></section>`;
  const editor=root.querySelector('[data-editor]'), status=root.querySelector('[data-status]');
  function renderEditor(){
    if(!ready)return;
    editor.innerHTML=`<div class="explore-tools" role="group" aria-label="操作を選ぶ">${Object.entries(labels).map(([key,label])=>`<button data-mode="${key}" aria-pressed="${key===mode}">${label}</button>`).join('')}</div><p>${{segment:'気になる文字を選んでカードを試そう。同じ文字をもう一度押すと、回答を取り消せます。',pitch:'各拍の「高」「低」を選んで、音の流れを描こう。',duration:'文字を2拍にのばしたり、文字の間に空白の1拍を加えよう。'}[mode]}</p><div class="explore-scroll" data-word></div><div data-features></div><div class="explore-actions"><button class="judge-button" data-submit>このかたちを送信</button><button class="outline-button" data-skip>スキップ</button></div>`;
    editor.querySelector('[data-word]').append(makeStage(state,true));
    editor.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;renderEditor();});
    editor.querySelector('[data-submit]').onclick=()=>submit(false);editor.querySelector('[data-skip]').onclick=()=>submit(true);
    if(mode==='pitch')editor.querySelector('[data-word]').after(accentBuilder(state,true));
    if(mode==='segment'&&selected!==null)renderCards();
  }
  function renderCards(){
    const i=selected,c=level.characters[i],variants=glyphs[i].variants,panel=editor.querySelector('[data-features]');
    panel.innerHTML=`<section class="explore-features"><h2>「${c.text}」の聴こえ方</h2><p>${variants.length?'カードを選ぶと、字形の変化をプレビューします。':'この文字の特性カードは準備中です。変形素材はまだ登録されていません。'}</p><p class="explore-cancel-hint">同じ文字をもう一度押すと、選択と回答を取り消せます。</p><div class="explore-feature-list"></div></section>`;
    const list=panel.querySelector('.explore-feature-list');
    [...variants,{id:'none',title:'どれも当てはまらない',description:'カードの変化とは違って聴こえる。'}].forEach(v=>{
      const b=document.createElement('button');b.className='explore-feature';b.setAttribute('aria-pressed',String(state.features[i]===v.id));const title=document.createElement('b'),desc=document.createElement('small');title.textContent=v.title;desc.textContent=v.description;b.append(title,desc);b.onclick=()=>{state.features[i]=v.id;state.intensity[i]=v.id==='none'?0:1;state.touched.segment=true;const svg=editor.querySelector(`[data-kana="${i}"] svg`);paint(svg,i,v.id,state.intensity[i],true);const dots=editor.querySelector(`[data-kana="${i}"]`).parentElement.querySelector('.explore-beat-dots');dots.setAttribute('aria-label',`${c.text} ${state.beats[i]}拍・${v.id==='none'?'該当なし':'回答済み'}`);renderCards();};list.append(b);
    });

  }
  async function submit(skipped){
    if(busy||!ready)return;busy=true;editor.querySelectorAll('button,input').forEach(b=>b.disabled=true);
    try{const record={id:crypto.randomUUID(),schemaVersion:2,levelId:level.id,profileId,createdAt:new Date().toISOString(),skipped,...structuredClone(state)};await saveExploration(record);if(alive())renderResult(record);}catch{busy=false;status.textContent='保存できませんでした。もう一度お試しください。';renderEditor();}
  }
  async function renderResult(record){
    root.innerHTML=`<section class="explore-results"><p class="eyebrow">YOUR PREVIEW</p><h1>あなたがつくった、ことばのかたち。</h1><p role="status">${record.skipped?'スキップを保存しました。下書きのプレビューです。':'このブラウザーに保存しました。'}</p><div class="explore-scroll" data-personal></div><section class="explore-group"><h2>みんなの答えと見比べる</h2><p class="explore-simulation">仮データ · 実際の参加者の回答ではありません。</p><div class="explore-scroll" data-group></div><p data-group-note>読み込み中…</p></section><button class="outline-button" data-again>もう一度つくる</button></section>`;
    root.querySelector('[data-personal]').append(makeStage(record));if(record.pitch.some(p=>p!==null))root.querySelector('[data-personal]').after(accentBuilder(record,false));root.querySelector('[data-again]').onclick=()=>mountExploration(root,{level,profileId});window.scrollTo({top:0,behavior:'smooth'});
    try{const group=await getExplorationAggregate(level);if(!alive())return;root.querySelector('[data-group]').append(makeStage(group));if(group.pitch.some(p=>p!==null))root.querySelector('[data-group]').after(accentBuilder(group,false));root.querySelector('[data-group-note]').textContent=`模擬回答 ${group.count}件すべての平均。スキップは標準アクセント・通常の字形と拍として集計。`;}catch{if(alive())root.querySelector('[data-group-note]').textContent='比較データを読み込めませんでした。個人の記録は保存済みです。';}
  }
  Promise.all(level.characters.map(async c=>{const normal=await loadGlyph(c.normal);const variants=await Promise.all(featuresFor(c).slice(0,3).map(async v=>{const custom=await loadGlyph(v.svg);return {...v,morph:createMorph(normal.shapes.map(s=>s.d),custom.shapes.map(s=>s.d))};}));return {normal,variants};})).then(data=>{if(!alive())return;glyphs=data;ready=true;status.textContent='どの操作も任意です。何も選ばず送信・スキップもできます。';renderEditor();}).catch(e=>{if(alive())status.textContent=`字形を読み込めませんでした：${e.message}`;});
}
