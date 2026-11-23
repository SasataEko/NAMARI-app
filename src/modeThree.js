import {createModeTwoMakeGuide} from './modeTwoMakeGuide.js';
import {mountCompactAudio} from './compactAudio.js';
import {centerBeatMarker} from './glyph/beatMarker.js';
import {featuresFor} from './data/explorationFeatures.js';
import {previewArtwork,averageGlyphPaths,averageEmphasisVisual} from './data/modeTwoVisual.js';
import {accentBackgroundAssets,emphasisBackground,createRotationPicker,backgroundTransform,nextGlyphAngle,accentBackgroundColor,accentBackgroundScale} from './glyph/accentBackground.js';
import './modeThreeAccent.css';
import {createEditHistory} from './editHistory.js';
import {mountBeatChoices} from './beatChoices.js';
import {readLibrary,assetUrl} from './data/projectLibrary.js';
import {modeThreeLevel,modeThreeCharacters,initialArtwork,restoreArtwork,glyphSizeFactor,fitArtworkRow,paddedViewBox,modeThreeStorageKey,artworkNodes,setArtworkPitch,deleteArtworkBeat,undoArtworkBeat,toggleArtworkEmphasis} from './data/modeThreeModel.js';
import {wordRows} from './wordLayout.js';
import {loadGlyph} from './glyph/loadGlyph.js';
import {createMorph} from './glyph/morph.js';
import {isSymbolSwitch,symbolSwitchFrame} from './glyph/symbolSwitch.js';
import './modeThree.css';
const ns='http://www.w3.org/2000/svg',palette=['#fb557c','#ffb52e','#507aff','#ab65e8','#00a99a','#f16a35'];
let toneId=0;
const make=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;};
function svgNode(tag,attrs={}){const e=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))e.setAttribute(k,v);return e;}
function outline(svg,shapes){
 svg.replaceChildren();for(const name of ['m3-outline','m3-white','m3-fill']){const g=svgNode('g',{'class':name,'aria-hidden':'true'});if(svg.dataset.smallKana==='true')g.setAttribute('transform','translate(21.26 34.016) scale(.75)');for(const shape of shapes){const p=svgNode('path',{d:shape.d});if(shape.fillRule)p.setAttribute('fill-rule',shape.fillRule);if(shape.clipRule)p.setAttribute('clip-rule',shape.clipRule);g.append(p);}svg.append(g);}
}
function applyPaths(svg,paths){for(const g of svg.children)[...g.children].forEach((p,j)=>p.setAttribute('d',paths[j]));}
function glyphSvg(glyph,text){const svg=svgNode('svg',{viewBox:paddedViewBox(glyph.viewBox),role:'img','aria-label':text,preserveAspectRatio:'xMidYMid meet'});if(text==='っ')svg.dataset.smallKana='true';outline(svg,glyph.shapes);return svg;}
function markerSvg(text){const svg=svgNode('svg',{viewBox:'30 -12 110 194',role:'img','aria-label':text});for(const name of ['m3-outline','m3-white','m3-fill']){const g=svgNode('g',{'class':name}),t=svgNode('text',{x:85,y:88,'text-anchor':'middle','dominant-baseline':'central','font-family':'Gothic A1','font-size':text==='ッ'?72:90,'font-weight':900});t.textContent=text;g.append(t);svg.append(g);}return centerBeatMarker(svg,85,85);}
// Reserve ink space across exact, unmodified contours, including Morph frames.
function measureGlyph(data,text){
 const svg=glyphSvg(data.normal,text);svg.style.cssText='position:fixed;left:-10000px;top:0;width:200px;height:200px;visibility:hidden;overflow:visible';document.body.append(svg);
 const [,y,,h]=data.normal.viewBox.split(/[ ,]+/).map(Number);let left=Infinity,right=-Infinity,top=y,bottom=y+h,normalBounds;
 const sample=()=>{const b=svg.getBBox();left=Math.min(left,b.x);right=Math.max(right,b.x+b.width);top=Math.min(top,b.y);bottom=Math.max(bottom,b.y+b.height);};
 try{sample();normalBounds=[left,right,top,bottom];for(const v of data.variants){if(v.error)continue;if(v.morph){for(const amount of [.25,.5,.75,1]){applyPaths(svg,amount===1?v.morph.to:v.morph.map(fn=>fn(amount)));sample();}}else{outline(svg,v.glyph.shapes);sample();}outline(svg,data.normal.shapes);}}finally{svg.remove();}
 const box=[left-7,top-16,right-left+14,bottom-top+32];const [nl,nr,nt,nb]=normalBounds,normalBox=[nl-7,nt-16,nr-nl+14,nb-nt+32];return {box:box.join(' '),aspect:box[2]/box[3],normal:{box:normalBox.join(' '),aspect:normalBox[2]/normalBox[3]}};
}
export async function mountModeThree(root,options={}){
 const sourceUrl=p=>/^(https?:|blob:|data:|\/)/.test(p)?p:assetUrl(p);
 const editingLevel=options.level||modeThreeLevel,isModeTwo=Boolean(options.level),readOnly=Boolean(options.preview),preview=options.preview;
 root.modeThreeSession?.dispose();let disposed=false,observer=null,selectedKey=options.tutorial?null:'base:0',tab='patterns',saveTimer=null,layoutFrame=0,disposeAudio=null,tutorialGuide=null;
 const animations=new Map(),stop=svg=>{cancelAnimationFrame(animations.get(svg));animations.delete(svg);};
 const session={dispose(){disposed=true;tutorialGuide?.dispose();disposeAudio?.();observer?.disconnect();animations.forEach(cancelAnimationFrame);animations.clear();clearTimeout(saveTimer);cancelAnimationFrame(layoutFrame);}};root.modeThreeSession=session;
 const alive=()=>!disposed&&root.isConnected&&root.modeThreeSession===session;
 root.className='mode-three';root.dataset.style='sticker';root.dataset.tutorial=String(Boolean(options.tutorial));root.textContent='字形を準備しています…';
 try{
  const library=await readLibrary(),characters=isModeTwo?editingLevel.characters.map(c=>({...c,patterns:featuresFor(c)})):modeThreeCharacters(library);
  const glyphs=await Promise.all(characters.map(async c=>{if(!c.normal)throw Error(c.text+'の通常字形がありません。');const normal=await loadGlyph(sourceUrl(c.normal)),variants=[];for(const pattern of c.patterns){try{const glyph=await loadGlyph(sourceUrl(pattern.svg));variants.push({...pattern,glyph,morph:isSymbolSwitch(pattern)?null:createMorph(normal.shapes.map(p=>p.d),glyph.shapes.map(p=>p.d))});}catch(error){variants.push({...pattern,error:error.message});}}return {normal,variants};}));
  if(!alive())return;
  const backgrounds=await Promise.all(accentBackgroundAssets.map(p=>loadGlyph(assetUrl(p))));if(!alive())return;const rotationFor=createRotationPicker();
  const metrics=glyphs.map((g,i)=>measureGlyph(g,characters[i].text));
  let saved=options.initialState||null;if(!isModeTwo)try{saved=JSON.parse(localStorage.getItem(modeThreeStorageKey));}catch{}
  let state=restoreArtwork(saved,characters,editingLevel);state.patterns=state.patterns.map((id,i)=>glyphs[i].variants.some(v=>v.id===id&&!v.error)?id:null);
  if(readOnly)state=previewArtwork(preview,editingLevel);
  const changed=()=>{options.onChange?.(structuredClone(state));};
  const hasPattern=i=>readOnly?Object.values(preview.featureRates?.[i]||{}).some(v=>v>0):Boolean(state.patterns[i]);
  const factor=i=>readOnly?1+.45*Math.min(1,Object.values(preview.featureRates?.[i]||{}).reduce((a,b)=>a+b,0)):glyphSizeFactor(!!state.patterns[i]);
  const history={history:[],hasDeleted:state.beats.includes(0)};
  const edits=createEditHistory({capture:()=>({state,selectedKey,tab,reduction:history}),restore:s=>{state=s.state;selectedKey=s.selectedKey;tab=s.tab;Object.assign(history,s.reduction);originalSvgs.forEach((_,i)=>paint(i));refresh();}});
  root.replaceChildren();
  const bar=make('header','m3-bar'),heading=make('div','m3-heading');heading.append(make('span','m3-badge',isModeTwo?'MODE 2':'MODE 3 · LAB'),make('h1','',isModeTwo?'これ、どう聞こえる？':'ことばをつくる'));
  const save=make('button','m3-save',isModeTwo?'こう聞こえる':'作品を保存');save.type='button';const undo=make('button','edit-undo','↶ 元に戻す');undo.type='button';undo.classList.add('m3-icon-undo');undo.textContent='';undo.setAttribute('aria-label','ひとつ前に戻す');undo.title='ひとつ前に戻す';const undoImage=make('img');undoImage.src=assetUrl('assets/ui/undo.png');undoImage.alt='';undo.append(undoImage);undo.disabled=true;undo.onclick=()=>{if(edits.undo()){status.textContent='ひとつ前に戻しました。';tutorialGuide?.notify('undo');}};bar.append(heading,undo,save);if(isModeTwo&&options.controlsElement)bar.insertBefore(options.controlsElement,undo);
  function remember(){edits.checkpoint();undo.disabled=false;}
  const canvas=make('section','m3-canvas');canvas.setAttribute('aria-label',editingLevel.word+(readOnly?'の回答図形':'の字形編集'));
  const tones=svgNode('svg',{'class':'m3-tones','aria-hidden':'true'}),stage=make('div','m3-stage');const accentHint=make('aside','m3-accent-overlay');accentHint.setAttribute('role','note');canvas.append(tones,stage,make('p','m3-caption',isModeTwo?'': 'あばくらっと · 表示実験'));
  const editor=make('section','m3-editor'),tabs=make('div','m3-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','編集カテゴリー');
  const panel=make('div','m3-panel');panel.id='m3-panel';panel.setAttribute('role','tabpanel');
  const status=make('p','m3-status');status.setAttribute('role','status');status.textContent='文字を選んで、音のかたちをつくろう。';
  const foot=make('div','m3-foot'),reset=make('button','m3-reset','はじめのかたちへ');reset.type='button';foot.append(reset,make('small','',isModeTwo?'': 'この端末だけに保存'));
  editor.append(tabs,accentHint,panel,status,foot);root.append(bar,canvas,editor);if(isModeTwo&&!readOnly&&options.audioElement){const questionCopy=make('p','m3-listen-question','これ、どう聞こえる？');canvas.before(questionCopy);disposeAudio=mountCompactAudio(canvas,options.audioElement,options.referenceAudioElement);}if(isModeTwo&&!readOnly){const skip=make('button','m3-reset','スキップ');skip.type='button';skip.onclick=()=>options.onSubmit?.(structuredClone(state),true);foot.append(skip);}if(readOnly){bar.remove();editor.remove();root.dataset.preview='true';}
  const originalSvgs=glyphs.map((g,i)=>{const svg=glyphSvg(g.normal,characters[i].text);svg.setAttribute('viewBox',metrics[i].box);return svg;});
  let nodes=[],buttons=new Map();const tonePrefix='m3-tone-'+(++toneId);
  function paint(i,animate=false){
   const svg=originalSvgs[i],data=glyphs[i],variant=data.variants.find(v=>v.id===state.patterns[i]&&!v.error);stop(svg);svg.style.opacity='1';svg.dataset.morphProgress=animate&&variant?'0':'1';
   svg.setAttribute('viewBox',(hasPattern(i)?metrics[i]:metrics[i].normal).box);const normal=()=>outline(svg,data.normal.shapes);if(readOnly){outline(svg,averageGlyphPaths(data,preview.featureRates?.[i]||{},createMorph).map((d,j)=>({d,fillRule:data.normal.shapes[j]?.fillRule})));return;}if(!variant){normal();return;}
   // Explicit player previews are allowed even when system ambient motion is reduced.
   if(isSymbolSwitch(variant)){const target=()=>outline(svg,variant.glyph.shapes);if(!animate){target();return;}normal();let lastTarget=false;const start=performance.now(),tick=now=>{if(!alive())return;const t=Math.min(1,(now-start)/480),frame=symbolSwitchFrame(t);svg.dataset.morphProgress=String(t);if(frame.target!==lastTarget){target();lastTarget=frame.target;}svg.style.opacity=String(frame.opacity);if(t<1)animations.set(svg,requestAnimationFrame(tick));else{svg.style.opacity='1';animations.delete(svg);}};animations.set(svg,requestAnimationFrame(tick));return;}
   normal();if(!animate){applyPaths(svg,variant.morph.to);return;}
   const start=performance.now(),tick=now=>{if(!alive())return;const t=Math.min(1,(now-start)/950),amount=t*t*(3-2*t);svg.dataset.morphProgress=String(t);applyPaths(svg,t===1?variant.morph.to:variant.morph.map(fn=>fn(amount)));if(t<1)animations.set(svg,requestAnimationFrame(tick));else animations.delete(svg);};animations.set(svg,requestAnimationFrame(tick));
  }
  function drawTones(){
   if(!alive())return;const bounds=canvas.getBoundingClientRect();tones.replaceChildren();tones.setAttribute('viewBox','0 0 '+bounds.width+' '+bounds.height);
   const defs=svgNode('defs'),lines=svgNode('g'),circles=svgNode('g');tones.append(defs,lines,circles);
   const points=nodes.map(node=>{const b=buttons.get(node.key),r=b.getBoundingClientRect(),base=Number(b.dataset.baseSize);return {...node,row:b.parentElement.dataset.row,x:r.left-bounds.left+r.width/2,y:r.top-bounds.top+r.height/2+(.21-.42*(typeof node.pitch==='number'?node.pitch:node.pitch==='high'?1:0))*base,r:base*.19,color:readOnly?averageEmphasisVisual(node,preview).color:accentBackgroundColor(node),stroke:Math.max(1,base*.018)};});
   points.forEach((p,i)=>{const prev=points[i-1];if(prev&&prev.row===p.row){const gradient=svgNode('linearGradient',{id:tonePrefix+'-'+i,gradientUnits:'userSpaceOnUse',x1:prev.x,y1:prev.y,x2:p.x,y2:p.y});gradient.append(svgNode('stop',{'stop-color':prev.color}),svgNode('stop',{offset:1,'stop-color':p.color}));defs.append(gradient);lines.append(svgNode('line',{x1:prev.x,y1:prev.y,x2:p.x,y2:p.y,stroke:'url(#'+tonePrefix+'-'+i+')','stroke-width':Math.max(2,p.stroke*2),'stroke-linecap':'round'}));}const group=svgNode('g',{'data-node':p.key,'data-pitch':p.pitch,'data-linked':String(p.linked)});const type=readOnly?averageEmphasisVisual(p,preview).type:emphasisBackground(p.emphasisRank),background=backgrounds[type-1],angle=state.backgroundAngles[p.key]??(state.backgroundAngles[p.key]=(readOnly?0:rotationFor(p.key))),diameter=p.r*2*(readOnly?averageEmphasisVisual(p,preview).scale:accentBackgroundScale(type));
    if(readOnly){const a=preview.emphasisRates?.[p.key];group.setAttribute('aria-label','重音① '+Math.round((a?.first||0)*100)+'%・重音② '+Math.round((a?.second||0)*100)+'%');}
    group.dataset.background=String(type);group.dataset.rotation=String(angle);
    const shape=svgNode('g',{transform:backgroundTransform(background.viewBox,p.x,p.y,diameter,angle),fill:p.color});
    for(const contour of background.shapes){const path=svgNode('path',{d:contour.d});if(contour.fillRule)path.setAttribute('fill-rule',contour.fillRule);shape.append(path);}group.append(shape);circles.append(group);});
  }
  function fit(){
   if(!alive())return;const rows=[...stage.children];if(!nodes.length){tones.replaceChildren();return;}
   const lists=rows.map(row=>[...row.children].map(b=>nodes.find(n=>n.key===b.dataset.key)));
   const maxima=lists.map(list=>Math.max(...list.map(n=>n.kind==='base'?factor(n.index):1))),total=maxima.reduce((a,b)=>a+b,0),heightBudget=Math.max(20,canvas.clientHeight-(readOnly?16:isModeTwo?28:54)-16*(rows.length-1));
   const layouts=rows.map((row,r)=>{const list=lists[r],aspects=list.map(n=>n.kind==='base'?(hasPattern(n.index)?metrics[n.index].aspect:metrics[n.index].normal.aspect):110/194),factors=list.map(n=>n.kind==='base'?factor(n.index):1);return {row,aspects,factors,layout:fitArtworkRow(Math.max(1,stage.clientWidth-6),heightBudget*maxima[r]/total,factors,aspects,isModeTwo&&!readOnly?{maxBase:160,fill:.96}:{})};});
   const base=Math.min(...layouts.map(l=>l.layout.base));
   for(const {row,aspects,factors,layout}of layouts){row.style.gap=layout.gap+'px';[...row.children].forEach((b,j)=>{const rate=readOnly?Math.max(b.dataset.key.startsWith('base:')?0:.18,listRate(b.dataset.key)):1;b.style.width=base*factors[j]*aspects[j]*rate+'px';b.style.marginInlineEnd=(j<layout.gapRatios.length?base*layout.gapRatios[j]:0)+'px';b.style.height=base*factors[j]+'px';b.dataset.baseSize=String(base);});}drawTones();
  }
  function listRate(key){return nodes.find(n=>n.key===key)?.rate??1;}
  function rerollNode(key){
    const previous=state.glyphAngles[key]||0;state.glyphAngles[key]=nextGlyphAngle(previous);
    const old=state.backgroundAngles[key]??rotationFor(key);let angle=rotationFor(key,true);
    if(Math.min(Math.abs(angle-old),360-Math.abs(angle-old))<20)angle=(old+53+Math.random()*220)%360;
    state.backgroundAngles[key]=angle;
    const [kind,index]=key.split(':'),svg=kind==='base'?originalSvgs[Number(index)]:buttons.get(key)?.querySelector('svg');
    if(svg){svg.style.transform='rotate('+state.glyphAngles[key]+'deg)';svg.dataset.rotation=String(state.glyphAngles[key]);}
  }
  function chooseEmphasis(key){
    const node=nodes.find(n=>n.key===key);if(!node)return;
    if(!node.emphasisRank&&state.emphasis.length>=2){status.textContent='重音は2つまで。選んだ文字をもう一度押すと外せます。';return;}
    remember();rerollNode(key);if(toggleArtworkEmphasis(state,key)){selectedKey=key;refresh();const rank=nodes.find(n=>n.key===key)?.emphasisRank;status.textContent=rank===1?'① 最も強く聞こえる拍':rank===2?'② 次に強く聞こえる拍':'重音の選択を外しました。';tutorialGuide?.notify('emphasis');}
  }
  function select(key){if(readOnly)return;if(tab==='pitch'){chooseEmphasis(key);return;}remember();rerollNode(key);selectedKey=selectedKey===key?null:key;if(isModeTwo&&key.startsWith('base:'))state.noticed[Number(key.split(':')[1])]=Boolean(state.patterns[Number(key.split(':')[1])])||selectedKey===key;renderControls();fit();changed();tutorialGuide?.notify(selectedKey?'kana':'selection');}
  function renderWord(){
   nodes=artworkNodes(state);root.dataset.wrapped=String(nodes.length>6);if(selectedKey&&!nodes.some(n=>n.key===selectedKey))selectedKey=null;
   // Reparent existing SVGs so a tool change never interrupts Morph.
   stage.replaceChildren();buttons=new Map();if(!nodes.length){stage.append(make('small','m3-empty',''+(readOnly?'すべての拍が減らされています。':'「拍を戻す」で文字を戻せます。')+''));tones.replaceChildren();return;}
   for(const [r,indices]of wordRows(nodes.map(n=>n.text)).entries()){const row=make('div','m3-word-row');row.dataset.row=String(r);stage.append(row);for(const j of indices){const node=nodes[j],b=make('button','m3-kana');b.type='button';if(readOnly){b.tabIndex=-1;b.disabled=true;}b.dataset.key=node.key;b.style.setProperty('--glyph-color',palette[node.index%palette.length]);b.setAttribute('aria-label',node.kind==='base'?(node.index+1)+'文字目「'+node.text+'」を選ぶ':characters[node.index].text+'の後の「'+node.text+'」を選ぶ');b.append(node.kind==='base'?originalSvgs[node.index]:markerSvg(node.text));const displayed=b.querySelector('svg');displayed.style.transform='rotate('+(state.glyphAngles[node.key]||0)+'deg)';displayed.dataset.rotation=String(state.glyphAngles[node.key]||0);row.append(b);buttons.set(node.key,b);b.onclick=()=>select(node.key);if(node.emphasisRank&&!readOnly){const badge=make('span','m3-emphasis-badge',String(node.emphasisRank));badge.setAttribute('aria-hidden','true');b.append(badge);}b.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const index=e.key==='Home'?0:e.key==='End'?nodes.length-1:(j+(e.key==='ArrowLeft'?-1:1)+nodes.length)%nodes.length;selectedKey=nodes[index].key;renderControls();fit();buttons.get(selectedKey).focus();tutorialGuide?.notify('kana');};}}
   fit();
  }
  function refresh(){renderWord();if(!readOnly)renderControls();fit();undo.disabled=!edits.canUndo;changed();}
  function choice(label,pressed,action){const b=make('button','m3-choice');b.type='button';b.setAttribute('aria-pressed',String(pressed));b.setAttribute('aria-label',label);b.onclick=action;return b;}
  function renderControls(){
   root.dataset.tool=tab;accentHint.textContent='強く聞こえる音があれば、文字をタップして重音を追加できます（'+state.emphasis.length+'/2）';buttons.forEach((b,key)=>{b.setAttribute('aria-pressed',String(key===selectedKey));const n=nodes.find(n=>n.key===key);b.dataset.edited=String(n?.kind==='base'&&!!state.patterns[n.index]);});tabs.replaceChildren();
   const categories=[['patterns','母音子音'],['pitch','アクセント'],['duration','拍']];
   for(const [id,label]of categories){const b=make('button','',label);b.type='button';b.id='m3-tab-'+id;b.setAttribute('role','tab');b.setAttribute('aria-controls','m3-panel');b.setAttribute('aria-selected',String(tab===id));b.tabIndex=tab===id?0:-1;b.onclick=()=>{tab=id;renderControls();fit();root.querySelector('#m3-tab-'+id).focus();tutorialGuide?.notify('tab:'+tab);};b.onkeydown=e=>{if(!['ArrowRight','ArrowLeft','Home','End'].includes(e.key))return;e.preventDefault();const ids=categories.map(c=>c[0]);tab=e.key==='Home'?ids[0]:e.key==='End'?ids[2]:ids[(ids.indexOf(tab)+(e.key==='ArrowLeft'?2:1))%3];renderControls();fit();root.querySelector('#m3-tab-'+tab).focus();tutorialGuide?.notify('tab:'+tab);};tabs.append(b);}
   panel.setAttribute('aria-labelledby','m3-tab-'+tab);panel.replaceChildren();const selected=nodes.find(n=>n.key===selectedKey);
   if(tab==='patterns'){
    if(!selected){panel.append(make('p','m3-empty','文字を選んでください。'));return;}panel.append(make('div','m3-panel-label','「'+selected.text+'」のかたち'));if(selected.kind!=='base'){panel.append(make('p','m3-empty','追加した拍です。音の高さは前の拍と連動します。'));return;}
    const i=selected.index,options=make('div','m3-options');const add=(id,label,glyph,error)=>{const b=choice(label,state.patterns[i]===id,()=>{remember();state.patterns[i]=id;if(isModeTwo)state.noticed[i]=Boolean(id);rerollNode('base:'+i);paint(i,true);renderControls();fit();changed();status.textContent=id?'かたちを変えました。':'もとのかたちに戻しました。';tutorialGuide?.notify(id?'pattern':'selection');});b.dataset.patternId=id||'';b.style.setProperty('--glyph-color',palette[i%palette.length]);if(glyph)b.append(glyphSvg(glyph,label));b.append(make('span','',label));if(error){b.disabled=true;b.title=error;}options.append(b);};add(null,'もとのかたち',glyphs[i].normal);glyphs[i].variants.forEach(v=>add(v.id,v.title,v.glyph,v.error));panel.append(options);if(!glyphs[i].variants.length)panel.append(make('small','m3-empty','この文字のパターンは準備中です。'));
   }else if(tab==='pitch'){
    const box=make('div','m3-pitch-grid');box.setAttribute('aria-label','各拍の高さと重音');
    for(const indices of wordRows(nodes.map(n=>n.text))){const row=make('div','m3-control-row');row.style.gridTemplateColumns='repeat('+indices.length+',minmax(0,1fr))';for(const j of indices){const node=nodes[j],col=make('div','m3-control-column accent-dot-column');const emphasis=make('button','m3-emphasis-kana',node.text);emphasis.type='button';emphasis.setAttribute('aria-label',(j+1)+'拍目「'+node.text+'」の重音を'+(node.emphasisRank?'解除':'選択'));emphasis.setAttribute('aria-pressed',String(!!node.emphasisRank));emphasis.disabled=!node.emphasisRank&&state.emphasis.length>=2;emphasis.onclick=()=>chooseEmphasis(node.key);if(node.emphasisRank){const badge=make('span','m3-emphasis-number',String(node.emphasisRank));badge.setAttribute('aria-hidden','true');emphasis.append(badge);}col.append(emphasis);for(const [value,label]of [['high','高'],['low','低']]){const b=make('button','accent-dot');b.type='button';b.dataset.pitch=value;b.setAttribute('aria-label',(j+1)+'拍目「'+node.text+'」を'+label+'くする');b.setAttribute('aria-pressed',String(node.pitch===value));b.disabled=node.linked;if(node.linked)b.title='前の拍と連動';b.onclick=()=>{remember();rerollNode(node.key);if(setArtworkPitch(state,node,value)){refresh();status.textContent='音の高さを変えました。';tutorialGuide?.notify('pitch');}};col.append(b);}if(node.linked)col.append(make('small','','連動'));row.append(col);}box.append(row);}panel.append(box);
   }else{
    mountBeatChoices(panel,{text:selected?.text,canLong:!!selected&&selected.kind==='base'&&state.beats[selected.index]===1,canBlank:!!selected&&selected.kind==='base'&&selected.index<state.blanks.length&&!state.blanks[selected.index],
      onLong:()=>{remember();state.beats[selected.index]=2;rerollNode(selected.key);rerollNode('long:'+selected.index);refresh();status.textContent='「ー」を追加しました。';tutorialGuide?.notify('beat');},
      onBlank:()=>{remember();state.blanks[selected.index]=true;rerollNode(selected.key);rerollNode('blank:'+selected.index);refresh();status.textContent='「ッ」を追加しました。';tutorialGuide?.notify('beat');},
      onDelete:()=>{remember();if(deleteArtworkBeat(state,selected,history)){history.hasDeleted=true;selectedKey=null;refresh();status.textContent='拍を減らしました。';tutorialGuide?.notify('beat');}}});
   }
  }
  save.onclick=async()=>{if(isModeTwo){save.disabled=true;save.textContent='保存中…';try{await options.onSubmit?.(structuredClone(state));}catch(error){save.disabled=false;save.textContent='こう聞こえる';status.textContent=error.message;}return;}try{localStorage.setItem(modeThreeStorageKey,JSON.stringify({...state,word:modeThreeLevel.word,savedAt:new Date().toISOString()}));status.textContent='作品をこの端末に保存しました。';save.textContent='保存しました ✓';clearTimeout(saveTimer);saveTimer=setTimeout(()=>{if(alive())save.textContent='作品を保存';},1800);}catch{status.textContent='保存できませんでした。端末の空き容量を確認してください。';}};
  reset.onclick=()=>{remember();state=initialArtwork(editingLevel);selectedKey='base:0';history.history=[];history.hasDeleted=false;originalSvgs.forEach((_,i)=>paint(i));refresh();status.textContent='はじめのかたちに戻しました。';tutorialGuide?.refresh();};
  observer=new ResizeObserver(()=>{cancelAnimationFrame(layoutFrame);layoutFrame=requestAnimationFrame(fit);});observer.observe(canvas);observer.observe(stage);
  originalSvgs.forEach((_,i)=>paint(i));refresh();
  if(isModeTwo&&!readOnly&&options.tutorial)tutorialGuide=createModeTwoMakeGuide({root,canvas,editor,bar,getTab:()=>tab,getSelected:()=>selectedKey});
 }catch(error){if(!alive())return;root.replaceChildren();const p=make('p','m3-error','字形を読み込めませんでした：'+error.message),retry=make('button','m3-save','もう一度読み込む');retry.onclick=()=>mountModeThree(root,options);root.append(p,retry);}
 return ()=>session.dispose();
}
