import { readLibrary,writeLibrary,uploadAsset,assetUrl } from './data/projectLibrary.js';
import { loadGlyph } from './glyph/loadGlyph.js';
import { createMorph } from './glyph/morph.js';
import './library.css';
const rows=['あいうえお','かきくけこ','さしすせそ','たちつてと','なにぬねの','はひふへほ','まみむめも','や ゆ よ','らりるれろ','わ   を','ん    ','がぎぐげご','ざじずぜぞ','だぢづでど','ばびぶべぼ','ぱぴぷぺぽ','ぁぃぅぇぉ','ゃゅょっゎ','ゔー'];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>crypto.randomUUID();
const image=(p,alt)=>p?`<img src="${esc(assetUrl(p))}" alt="${esc(alt)}">`:'';
function grid(){return `<div class="kana-grid">${rows.map(row=>[...row].map(k=>k===' '?'<span></span>':`<button type="button" data-kana-pick="${k}">${k}</button>`).join('')).join('')}</div>`;}
function cards(library,items){return items.map(({glyph,pattern})=>{const group=library.groups.find(g=>g.id===pattern.groupId);return `<article class="library-pattern" style="background:${/^#[0-9a-f]{6}$/i.test(group?.color)?group.color:'#ffe08b'}">${image(pattern.svg,glyph.kana+' '+pattern.title)}<b>${esc(glyph.kana)} · ${esc(pattern.title)}</b><p>${esc(pattern.description)}</p></article>`;}).join('');}
export async function mountLibrary(root){
 root.innerHTML='<p>図鑑を読み込み中…</p>';
 try{const library=await readLibrary();if(!root.isConnected)return;let mode='kana',selected='あ',groupId=library.groups[0]?.id;
 const render=()=>{
 const items=library.glyphs.flatMap(g=>g.patterns.map(p=>({glyph:g,pattern:p})));
 root.innerHTML=`<section class="library-intro"><p class="eyebrow">SOUND PATTERN LIBRARY</p><h1>訛りのかたち図鑑</h1><div class="library-tabs"><button data-view="kana" aria-pressed="${mode==='kana'}">五十音から探す</button><button data-view="pattern" aria-pressed="${mode==='pattern'}">口音パターンから探す</button></div></section>${mode==='kana'?grid():`<div class="pattern-folders">${library.groups.map(g=>`<button data-group-pick="${esc(g.id)}" aria-pressed="${g.id===groupId}">▱ ${esc(g.title)} <small>${items.filter(x=>x.pattern.groupId===g.id).length} 字形</small></button>`).join('')||'<p>口音パターンを開発者モードで追加できます。</p>'}</div>`}<h2>${esc(mode==='kana'?selected:library.groups.find(g=>g.id===groupId)?.title||'口音パターン')}</h2><div class="library-card-grid">${cards(library,items.filter(x=>mode==='kana'?x.glyph.kana===selected:x.pattern.groupId===groupId))||'<p>この文字のパターンはまだ登録されていません。</p>'}</div>`;
 root.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{mode=b.dataset.view;render();});root.querySelectorAll('[data-kana-pick]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.kanaPick===selected));b.onclick=()=>{selected=b.dataset.kanaPick;render();};});root.querySelectorAll('[data-group-pick]').forEach(b=>b.onclick=()=>{groupId=b.dataset.groupPick;render();});
 };render();}catch(e){root.textContent=e.message;}
}
export async function mountAuthor(root){
 root.innerHTML='<p>本地项目编辑器载入中…</p>';
 try{
 const status=await fetch('/__author/status').then(r=>r.ok?r.json():null).catch(()=>null);
 if(!status?.enabled){root.innerHTML='<p>开发者模式只在本机 Vite 开发服务器中可用。线上游戏可读取已保存的关卡与图鉴，但不能写入电脑目录。</p>';return;}
 let library=await readLibrary(),kana='く',tab='glyph',editingLevel=null;
 let drafts;try{drafts=JSON.parse(localStorage.getItem('kotoba-author-drafts')||'{}');}catch{drafts={};}
 const remember=(key,data)=>{drafts[key]=structuredClone(data);localStorage.setItem('kotoba-author-drafts',JSON.stringify(drafts));};
 const forget=key=>{delete drafts[key];localStorage.setItem('kotoba-author-drafts',JSON.stringify(drafts));};
 if(!root.isConnected)return;
 const render=()=>{
 root.innerHTML=`<section class="library-intro"><p class="eyebrow">LOCAL PROJECT STUDIO</p><h1>开发者模式</h1><p>录音与 SVG 上传即保存到项目的 public/uploads。点击保存将配置写入项目，自动保留上一个版本。</p><p>当前项目版本：${library.revision} <span data-save-status role="status"></span></p><div class="library-tabs"><button data-editor-tab="glyph">字形与图鉴</button><button data-editor-tab="level">新模式关卡</button><button data-editor-tab="group">口音模式文件夹</button></div></section><div data-editor-body></div>`;
 root.querySelectorAll('[data-editor-tab]').forEach(b=>{b.setAttribute('aria-pressed',String(tab===b.dataset.editorTab));b.onclick=()=>{tab=b.dataset.editorTab;render();};});
 if(tab==='glyph')glyphEditor();if(tab==='level')levelEditor();if(tab==='group')groupEditor();
 };
 const message=t=>{const el=root.querySelector('[data-save-status]');if(el)el.textContent=t;};
 async function commit(){library=await writeLibrary(library);message(`已保存 · 版本 ${library.revision}`);}
 async function uploading(input,apply){const file=input.files[0];if(!file)return;root.querySelectorAll('button').forEach(b=>b.disabled=true);try{message('正在写入素材文件…');const p=await uploadAsset(file);if(file.name.toLowerCase().endsWith('.svg'))await loadGlyph(assetUrl(p));apply(p);message('素材文件已保存，请保存配置以应用。');}catch(e){message(e.message);}finally{root.querySelectorAll('button').forEach(b=>b.disabled=false);}}
 function glyphEditor(){
 const glyph=structuredClone(drafts['glyph:'+kana]||library.glyphs.find(g=>g.kana===kana)||{kana,normal:null,patterns:[]});
 const body=root.querySelector('[data-editor-body]');body.innerHTML=`${grid()}<label>其他文字／拗音（例如 きゅ）<input data-other-kana maxlength="8"><button data-open-kana>编辑</button></label><form class="author-form" data-glyph-form><h2>编辑「${esc(kana)}」</h2><label>普通字形 SVG<input type="file" accept=".svg" data-normal></label><div class="author-preview" data-normal-preview>${image(glyph.normal,kana+' 普通字形')}</div><div data-pattern-rows></div><button type="button" data-add-pattern>＋ 添加一个口音 Pattern</button><button class="primary-cta compact" type="submit">保存这个字与全部 Pattern</button><p>SVG 需为相同画布、相同顺序及数量的闭合 path，不支持文本、变换或外部引用。保存前会检查所有配对。</p></form>`;
 body.querySelectorAll('[data-kana-pick]').forEach(b=>{b.setAttribute('aria-pressed',String(kana===b.dataset.kanaPick));b.onclick=()=>{kana=b.dataset.kanaPick;render();};});
 body.querySelector('[data-open-kana]').onclick=()=>{const value=body.querySelector('[data-other-kana]').value.trim();if(value){kana=value;render();}};
 body.querySelector('[data-normal]').onchange=e=>uploading(e.target,p=>{glyph.normal=p;remember('glyph:'+kana,glyph);body.querySelector('[data-normal-preview]').innerHTML=image(p,kana);});
 const patternRows=()=>{const area=body.querySelector('[data-pattern-rows]');area.innerHTML=glyph.patterns.map((p,i)=>`<fieldset data-pattern-index="${i}"><legend>Pattern ${i+1}</legend><label>名称<input data-field="title" value="${esc(p.title)}" required></label><label>简短说明<input data-field="description" value="${esc(p.description)}"></label><label>所属模式文件夹<select data-field="groupId" required><option value="">请选择</option>${library.groups.map(g=>`<option value="${esc(g.id)}" ${p.groupId===g.id?'selected':''}>${esc(g.title)}</option>`).join('')}</select></label><label>变形 SVG<input type="file" accept=".svg" data-pattern-file></label><div class="author-preview" data-pattern-preview>${image(p.svg,kana+' '+p.title)}</div><button type="button" data-remove-pattern>从此字移除此 Pattern</button></fieldset>`).join('');area.querySelectorAll('fieldset').forEach(set=>{const index=Number(set.dataset.patternIndex);set.querySelectorAll('[data-field]').forEach(input=>input.oninput=()=>{glyph.patterns[index][input.dataset.field]=input.value;remember('glyph:'+kana,glyph);});set.querySelector('[data-pattern-file]').onchange=e=>uploading(e.target,p=>{glyph.patterns[index].svg=p;remember('glyph:'+kana,glyph);set.querySelector('[data-pattern-preview]').innerHTML=image(p,kana);});set.querySelector('[data-remove-pattern]').onclick=()=>{glyph.patterns.splice(index,1);remember('glyph:'+kana,glyph);patternRows();};});};patternRows();
 body.querySelector('[data-add-pattern]').onclick=()=>{glyph.patterns.push({id:uid(),title:'',description:'',groupId:library.groups[0]?.id||'',svg:null});remember('glyph:'+kana,glyph);patternRows();};
 body.querySelector('form').onsubmit=async e=>{e.preventDefault();try{
 if(!glyph.normal)throw new Error('请先上传普通字形 SVG');const normal=await loadGlyph(assetUrl(glyph.normal));
 for(const p of glyph.patterns){if(!p.svg||!p.title.trim()||!p.groupId)throw new Error('请补全每张卡片的名称、文件夹和SVG');const custom=await loadGlyph(assetUrl(p.svg));if(normal.viewBox!==custom.viewBox)throw new Error('普通与变形SVG的viewBox必须相同');createMorph(normal.shapes.map(s=>s.d),custom.shapes.map(s=>s.d));}
 const index=library.glyphs.findIndex(g=>g.kana===kana);if(index>=0)library.glyphs[index]=glyph;else library.glyphs.push(glyph);await commit();forget('glyph:'+kana);
 }catch(e){message(e.message);}};
 }
 function groupEditor(){
 const body=root.querySelector('[data-editor-body]');body.innerHTML=`<form class="author-form"><h2>口音模式文件夹</h2><p>同一文件夹可收录不同假名，例如将 う・く・す 的“发音偏圆”Pattern归入同组。保存字形时选择所属文件夹。</p><div data-groups></div><button type="button" data-add-group>＋ 添加文件夹</button><button class="primary-cta compact">保存文件夹</button></form>`;
 const draft=structuredClone(library.groups);const draw=()=>{body.querySelector('[data-groups]').innerHTML=draft.map((g,i)=>`<fieldset data-group-index="${i}"><label>名称<input data-group-title value="${esc(g.title)}" required></label><label>说明<input data-group-description value="${esc(g.description)}"></label><label>纯色卡片颜色<input type="color" data-group-color value="${esc(g.color)}"></label></fieldset>`).join('');body.querySelectorAll('[data-group-index]').forEach(row=>{const g=draft[Number(row.dataset.groupIndex)];row.querySelector('[data-group-title]').oninput=e=>g.title=e.target.value;row.querySelector('[data-group-description]').oninput=e=>g.description=e.target.value;row.querySelector('[data-group-color]').oninput=e=>g.color=e.target.value;});};draw();body.querySelector('[data-add-group]').onclick=()=>{draft.push({id:uid(),title:'',description:'',color:'#ffe08b'});draw();};body.querySelector('form').onsubmit=async e=>{e.preventDefault();try{library.groups=draft;await commit();}catch(e){message(e.message);}};
 }
 function levelEditor(){
 const draftKey='level:'+(editingLevel||'new');const draft=structuredClone(drafts[draftKey]||library.levels.find(l=>l.id===editingLevel)||{id:uid(),word:'',morae:[],audio:null,recordingId:uid(),defaultAccent:[]});
 const body=root.querySelector('[data-editor-body]');body.innerHTML=`<div class="author-levels"><button data-new-level>＋ 新关卡</button>${library.levels.map(l=>`<button data-edit-level="${esc(l.id)}">${esc(l.word)}</button>`).join('')}</div><form class="author-form"><h2>录音关卡</h2><label>显示单词<input data-word value="${esc(draft.word)}" required></label><label>按拍分开的假名（用・分隔；きゅ作为一拍）<input data-morae value="${esc(draft.morae.join('・'))}" placeholder="く・す・り" required></label><label>录音<input type="file" accept="audio/*" data-audio-file></label><audio controls data-audio-preview ${draft.audio?`src="${esc(assetUrl(draft.audio))}"`:''}></audio><div data-accent></div><button class="primary-cta compact">保存关卡</button>${editingLevel?'<button type="button" data-remove-level>从关卡列表移除（历史版本可恢复）</button>':''}<p>字形及 Pattern 自动从图鉴读取。没有普通SVG的字以系统文字显示；上传普通SVG后自动使用素材。替换录音将产生新录音ID，统计不混用。</p></form>`;
 body.querySelector('[data-word]').oninput=e=>{draft.word=e.target.value;remember(draftKey,draft);};
 if(editingLevel)body.querySelector('[data-remove-level]').onclick=async()=>{try{library.levels=library.levels.filter(l=>l.id!==editingLevel);await commit();forget(draftKey);editingLevel=null;render();}catch(e){message(e.message);}};
 body.querySelector('[data-new-level]').onclick=()=>{editingLevel=null;render();};body.querySelectorAll('[data-edit-level]').forEach(b=>b.onclick=()=>{editingLevel=b.dataset.editLevel;render();});
 const drawAccent=()=>{body.querySelector('[data-accent]').innerHTML=draft.morae.map((m,i)=>`<label>${esc(m)}<select data-accent-index="${i}"><option value="low" ${draft.defaultAccent[i]==='low'?'selected':''}>低 L</option><option value="high" ${draft.defaultAccent[i]==='high'?'selected':''}>高 H</option></select></label>`).join('');body.querySelectorAll('[data-accent-index]').forEach(s=>s.onchange=()=>{draft.defaultAccent[Number(s.dataset.accentIndex)]=s.value;remember(draftKey,draft);});};drawAccent();
 body.querySelector('[data-morae]').oninput=e=>{draft.morae=e.target.value.split('・').map(s=>s.trim()).filter(Boolean);draft.defaultAccent=draft.morae.map((_,i)=>draft.defaultAccent[i]||'low');remember(draftKey,draft);drawAccent();};
 body.querySelector('[data-audio-file]').onchange=e=>uploading(e.target,p=>{draft.audio=p;draft.recordingId=uid();remember(draftKey,draft);body.querySelector('audio').src=assetUrl(p);});
 body.querySelector('form').onsubmit=async e=>{e.preventDefault();try{draft.word=body.querySelector('[data-word]').value.trim();if(!draft.word||!draft.audio||!draft.morae.length)throw new Error('请上传录音并填写分拍假名');if(draft.morae.length>30)throw new Error('每关最多30拍');const index=library.levels.findIndex(l=>l.id===draft.id);if(index>=0)library.levels[index]=draft;else library.levels.push(draft);await commit();forget(draftKey);editingLevel=draft.id;render();message(`已保存关卡 · 版本 ${library.revision}`);}catch(e){message(e.message);}};
 }
 render();
 }catch(e){root.textContent=e.message;}
}
