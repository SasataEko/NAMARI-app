import { connectDirectory, disconnectDirectory, directoryConnected, directoryName } from './data/directoryProject.js';
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
 root.innerHTML=`<section class="library-intro"><p class="eyebrow">SOUND PATTERN LIBRARY</p><h1>訛りのかたち図鑑</h1><div class="library-tabs"><button data-view="kana" aria-pressed="${mode==='kana'}">五十音から探す</button><button data-view="pattern" aria-pressed="${mode==='pattern'}">発音パターンから探す</button></div></section>${mode==='kana'?grid():`<div class="pattern-folders">${library.groups.map(g=>`<button data-group-pick="${esc(g.id)}" aria-pressed="${g.id===groupId}">▱ ${esc(g.title)} <small>${items.filter(x=>x.pattern.groupId===g.id).length} 字形</small></button>`).join('')||'<p>発音パターンを開発者モードで追加できます。</p>'}</div>`}<h2>${esc(mode==='kana'?selected:library.groups.find(g=>g.id===groupId)?.title||'発音パターン')}</h2><div class="library-card-grid">${cards(library,items.filter(x=>mode==='kana'?x.glyph.kana===selected:x.pattern.groupId===groupId))||'<p>この文字のパターンはまだ登録されていません。</p>'}</div>`;
 root.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{mode=b.dataset.view;render();});root.querySelectorAll('[data-kana-pick]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.kanaPick===selected));b.onclick=()=>{selected=b.dataset.kanaPick;render();};});root.querySelectorAll('[data-group-pick]').forEach(b=>b.onclick=()=>{groupId=b.dataset.groupPick;render();});
 };render();}catch(e){root.textContent=e.message;}
}
export async function mountAuthor(root){
 root.innerHTML='<p>プロジェクトを読み込んでいます…</p>';
 try{
 const status=await fetch('/__author/status').then(r=>r.ok?r.json():null).catch(()=>null);
 if(!status?.enabled&&!directoryConnected()){
 root.innerHTML='<section class="library-intro"><h1>開発者モード</h1><p>プロジェクトフォルダーを開くと、SVG・録音・問題を編集してパソコンに保存できます。サーバーの起動は不要です。</p><button class="explore-entry explore-entry-gray" data-connect>プロジェクトフォルダーを開く　↗</button><p>package.json と public が入っているフォルダーを選んでください。編集内容を公開するには、保存後にGitHubへ反映してください。</p><p data-connect-status role="status"></p></section>';
 const button=root.querySelector('[data-connect]');button.disabled=!globalThis.showDirectoryPicker;
 if(button.disabled)root.querySelector('[data-connect-status]').textContent='パソコンのChromeまたはEdgeで開いてください。';
 button.onclick=async()=>{button.disabled=true;try{await connectDirectory();if(root.isConnected)mountAuthor(root);}catch(e){root.querySelector('[data-connect-status]').textContent=e.name==='AbortError'?'フォルダーの選択をキャンセルしました。':e.name==='NotAllowedError'?'フォルダーへのアクセスを許可してください。':e.name==='NotFoundError'?'プロジェクトのフォルダーを選んでください。設定や素材が見つかりません。':e.message;}finally{if(button.isConnected)button.disabled=false;}};return;
 }
 let library=await readLibrary(),kana='く',tab='glyph',editingLevel=null;
 let drafts;try{drafts=JSON.parse(localStorage.getItem('kotoba-author-drafts')||'{}');}catch{drafts={};}
 const remember=(key,data)=>{drafts[key]=structuredClone(data);localStorage.setItem('kotoba-author-drafts',JSON.stringify(drafts));};
 const forget=key=>{delete drafts[key];localStorage.setItem('kotoba-author-drafts',JSON.stringify(drafts));};
 if(!root.isConnected)return;
 const render=()=>{
 root.innerHTML=`<section class="library-intro"><p class="eyebrow">プロジェクト編集</p><h1>開発者モード</h1><p>SVGと録音を追加し、問題と図鑑を編集できます。保存すると、ひとつ前の設定をバックアップします。</p>${directoryConnected()?`<p>保存先：${esc(directoryName())} · 編集中はクラウドに回答を送信しません。</p>`:''}<p>プロジェクトの版：${library.revision} <span data-save-status role="status"></span></p><div class="library-tabs"><button data-editor-tab="glyph">字形と図鑑</button><button data-editor-tab="level">新モードの問題</button><button data-editor-tab="group">発音パターンのグループ</button></div></section>${directoryConnected()?'<button class="text-action" data-disconnect>フォルダーを閉じる</button>':''}<div data-editor-body></div>`;
 const close=root.querySelector('[data-disconnect]');if(close)close.onclick=()=>{disconnectDirectory();mountAuthor(root);};
 root.querySelectorAll('[data-editor-tab]').forEach(b=>{b.setAttribute('aria-pressed',String(tab===b.dataset.editorTab));b.onclick=()=>{tab=b.dataset.editorTab;render();};});
 if(tab==='glyph')glyphEditor();if(tab==='level')levelEditor();if(tab==='group')groupEditor();
 };
 const message=t=>{const el=root.querySelector('[data-save-status]');if(el)el.textContent=t;};
 async function commit(){library=await writeLibrary(library);message(`保存しました · 版 ${library.revision}`);}
 async function uploading(input,apply){const file=input.files[0];if(!file)return;root.querySelectorAll('button').forEach(b=>b.disabled=true);try{message('素材を保存しています…');const p=await uploadAsset(file);if(file.name.toLowerCase().endsWith('.svg'))await loadGlyph(assetUrl(p));apply(p);message('素材を保存しました。設定を保存すると反映されます。');}catch(e){message(e.message);}finally{root.querySelectorAll('button').forEach(b=>b.disabled=false);}}
 function glyphEditor(){
 const glyph=structuredClone(drafts['glyph:'+kana]||library.glyphs.find(g=>g.kana===kana)||{kana,normal:null,patterns:[]});
 const body=root.querySelector('[data-editor-body]');body.innerHTML=`${grid()}<label>その他の文字・拗音（例：きゅ）<input data-other-kana maxlength="8"><button data-open-kana>編集</button></label><form class="author-form" data-glyph-form><h2>「${esc(kana)}」を編集</h2><label>通常字形 SVG<input type="file" accept=".svg" data-normal></label><div class="author-preview" data-normal-preview>${image(glyph.normal,kana+' 通常字形')}</div><div data-pattern-rows></div><button type="button" data-add-pattern>＋ 発音パターンを追加</button><button class="primary-cta compact" type="submit">文字とすべてのパターンを保存</button><p>SVGは同じviewBoxと、同じ数・順序の閉じた輪郭pathで用意してください。文字・変換・外部参照は使えません。保存前に各組み合わせを確認します。</p></form>`;
 body.querySelectorAll('[data-kana-pick]').forEach(b=>{b.setAttribute('aria-pressed',String(kana===b.dataset.kanaPick));b.onclick=()=>{kana=b.dataset.kanaPick;render();};});
 body.querySelector('[data-open-kana]').onclick=()=>{const value=body.querySelector('[data-other-kana]').value.trim();if(value){kana=value;render();}};
 body.querySelector('[data-normal]').onchange=e=>uploading(e.target,p=>{glyph.normal=p;remember('glyph:'+kana,glyph);body.querySelector('[data-normal-preview]').innerHTML=image(p,kana);});
 const patternRows=()=>{const area=body.querySelector('[data-pattern-rows]');area.innerHTML=glyph.patterns.map((p,i)=>`<fieldset data-pattern-index="${i}"><legend>Pattern ${i+1}</legend><label>名称<input data-field="title" value="${esc(p.title)}" required></label><label>短い説明<input data-field="description" value="${esc(p.description)}"></label><label>所属グループ<select data-field="groupId" required><option value="">選んでください</option>${library.groups.map(g=>`<option value="${esc(g.id)}" ${p.groupId===g.id?'selected':''}>${esc(g.title)}</option>`).join('')}</select></label><label>変形後のSVG<input type="file" accept=".svg" data-pattern-file></label><div class="author-preview" data-pattern-preview>${image(p.svg,kana+' '+p.title)}</div><button type="button" data-remove-pattern>この文字からパターンを外す</button></fieldset>`).join('');area.querySelectorAll('fieldset').forEach(set=>{const index=Number(set.dataset.patternIndex);set.querySelectorAll('[data-field]').forEach(input=>input.oninput=()=>{glyph.patterns[index][input.dataset.field]=input.value;remember('glyph:'+kana,glyph);});set.querySelector('[data-pattern-file]').onchange=e=>uploading(e.target,p=>{glyph.patterns[index].svg=p;remember('glyph:'+kana,glyph);set.querySelector('[data-pattern-preview]').innerHTML=image(p,kana);});set.querySelector('[data-remove-pattern]').onclick=()=>{glyph.patterns.splice(index,1);remember('glyph:'+kana,glyph);patternRows();};});};patternRows();
 body.querySelector('[data-add-pattern]').onclick=()=>{glyph.patterns.push({id:uid(),title:'',description:'',groupId:library.groups[0]?.id||'',svg:null});remember('glyph:'+kana,glyph);patternRows();};
 body.querySelector('form').onsubmit=async e=>{e.preventDefault();try{
 if(!glyph.normal)throw new Error('通常字形のSVGを追加してください。');const normal=await loadGlyph(assetUrl(glyph.normal));
 for(const p of glyph.patterns){if(!p.svg||!p.title.trim()||!p.groupId)throw new Error('各パターンの名前・グループ・SVGを入力してください。');const custom=await loadGlyph(assetUrl(p.svg));if(normal.viewBox!==custom.viewBox)throw new Error('通常字形と変形後のSVGのviewBoxをそろえてください。');createMorph(normal.shapes.map(s=>s.d),custom.shapes.map(s=>s.d));}
 const index=library.glyphs.findIndex(g=>g.kana===kana);if(index>=0)library.glyphs[index]=glyph;else library.glyphs.push(glyph);await commit();forget('glyph:'+kana);
 }catch(e){message(e.message);}};
 }
 function groupEditor(){
 const body=root.querySelector('[data-editor-body]');body.innerHTML=`<form class="author-form"><h2>発音パターンのグループ</h2><p>同じ発音の特徴をもつ文字をまとめられます。例えば「う・く・す」の丸い発音を同じグループに登録できます。字形の保存時に所属グループを選んでください。</p><div data-groups></div><button type="button" data-add-group>＋ グループを追加</button><button class="primary-cta compact">グループを保存</button></form>`;
 const draft=structuredClone(library.groups);const draw=()=>{body.querySelector('[data-groups]').innerHTML=draft.map((g,i)=>`<fieldset data-group-index="${i}"><label>名称<input data-group-title value="${esc(g.title)}" required></label><label>説明<input data-group-description value="${esc(g.description)}"></label><label>カードの色<input type="color" data-group-color value="${esc(g.color)}"></label></fieldset>`).join('');body.querySelectorAll('[data-group-index]').forEach(row=>{const g=draft[Number(row.dataset.groupIndex)];row.querySelector('[data-group-title]').oninput=e=>g.title=e.target.value;row.querySelector('[data-group-description]').oninput=e=>g.description=e.target.value;row.querySelector('[data-group-color]').oninput=e=>g.color=e.target.value;});};draw();body.querySelector('[data-add-group]').onclick=()=>{draft.push({id:uid(),title:'',description:'',color:'#ffe08b'});draw();};body.querySelector('form').onsubmit=async e=>{e.preventDefault();try{library.groups=draft;await commit();}catch(e){message(e.message);}};
 }
 function levelEditor(){
 const draftKey='level:'+(editingLevel||'new');const draft=structuredClone(drafts[draftKey]||library.levels.find(l=>l.id===editingLevel)||{id:uid(),word:'',morae:[],audio:null,recordingId:uid(),defaultAccent:[]});
 const body=root.querySelector('[data-editor-body]');body.innerHTML=`<div class="author-levels"><button data-new-level>＋ 問題を追加</button>${library.levels.map(l=>`<button data-edit-level="${esc(l.id)}">${esc(l.word)}</button>`).join('')}</div><form class="author-form"><h2>録音と問題</h2><label>表示することば<input data-word value="${esc(draft.word)}" required></label><label>拍ごとのかな（・で区切る。「きゅ」は1拍）<input data-morae value="${esc(draft.morae.join('・'))}" placeholder="く・す・り" required></label><label>録音<input type="file" accept="audio/*" data-audio-file></label><audio controls data-audio-preview ${draft.audio?`src="${esc(assetUrl(draft.audio))}"`:''}></audio><div data-accent></div><button class="primary-cta compact">問題を保存</button>${editingLevel?'<button type="button" data-remove-level>問題の一覧から外す（過去の設定はバックアップに保存）</button>':''}<p>字形とパターンは図鑑から読み込みます。通常SVGのない文字は標準フォントで表示します。録音を変更すると録音IDも変わり、集計を分けます。</p></form>`;
 body.querySelector('[data-word]').oninput=e=>{draft.word=e.target.value;remember(draftKey,draft);};
 if(editingLevel)body.querySelector('[data-remove-level]').onclick=async()=>{try{library.levels=library.levels.filter(l=>l.id!==editingLevel);await commit();forget(draftKey);editingLevel=null;render();}catch(e){message(e.message);}};
 body.querySelector('[data-new-level]').onclick=()=>{editingLevel=null;render();};body.querySelectorAll('[data-edit-level]').forEach(b=>b.onclick=()=>{editingLevel=b.dataset.editLevel;render();});
 const drawAccent=()=>{body.querySelector('[data-accent]').innerHTML=draft.morae.map((m,i)=>`<label>${esc(m)}<select data-accent-index="${i}"><option value="low" ${draft.defaultAccent[i]==='low'?'selected':''}>低 L</option><option value="high" ${draft.defaultAccent[i]==='high'?'selected':''}>高 H</option></select></label>`).join('');body.querySelectorAll('[data-accent-index]').forEach(s=>s.onchange=()=>{draft.defaultAccent[Number(s.dataset.accentIndex)]=s.value;remember(draftKey,draft);});};drawAccent();
 body.querySelector('[data-morae]').oninput=e=>{draft.morae=e.target.value.split('・').map(s=>s.trim()).filter(Boolean);draft.defaultAccent=draft.morae.map((_,i)=>draft.defaultAccent[i]||'low');remember(draftKey,draft);drawAccent();};
 body.querySelector('[data-audio-file]').onchange=e=>uploading(e.target,p=>{draft.audio=p;draft.recordingId=uid();remember(draftKey,draft);body.querySelector('audio').src=assetUrl(p);});
 body.querySelector('form').onsubmit=async e=>{e.preventDefault();try{draft.word=body.querySelector('[data-word]').value.trim();if(!draft.word||!draft.audio||!draft.morae.length)throw new Error('録音と拍ごとのかなを入力してください。');if(draft.morae.length>30)throw new Error('1問につき30拍以内にしてください。');const index=library.levels.findIndex(l=>l.id===draft.id);if(index>=0)library.levels[index]=draft;else library.levels.push(draft);await commit();forget(draftKey);editingLevel=draft.id;render();message(`已問題を保存 · 版本 ${library.revision}`);}catch(e){message(e.message);}};
 }
 render();
 }catch(e){root.textContent=e.message;}
}
