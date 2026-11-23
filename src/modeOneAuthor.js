import {modeOneAuthorQuestions} from './data/authorQuestions.js';
import {libraryGlyph} from './data/patternLibrary.js';
import {assetUrl} from './data/projectLibrary.js';
import {linkPitch,linkedMora} from './data/linkedPitch.js';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const chapterFor={diyVowel:'vowelChallenge',diyAccent:'accent',diyMora:'mora'},titleFor={diyVowel:'母音子音',diyAccent:'アクセント',diyMora:'拍'};
export function mountModeOneAuthor(root,{library,locals=[],onSave,onUpload,onError,initialId=null}){
 const catalogue=modeOneAuthorQuestions(library,locals);let draft=structuredClone(catalogue.find(q=>q.id===initialId)||catalogue.find(q=>!q.tutorial)||catalogue[0]),blobUrl;
 const initialise=()=>{const n=draft.reading.length;draft.targetIndexes=(draft.targetIndexes||[draft.targetIndex].filter(Number.isInteger)).filter(i=>i<n);draft.patternChoices=Array.from({length:n},(_,i)=>draft.patternChoices?.[i]||null);draft.pattern=linkPitch(draft.reading,Array.from({length:n},(_,i)=>draft.pattern?.[i]||'low'));draft.beats=Array.from({length:n},(_,i)=>draft.beats?.[i]??(draft.longAfter?.[i]?2:1));draft.blanks=Array.from({length:Math.max(0,n-1)},(_,i)=>Boolean((draft.blanks||draft.blankAfter)?.[i]));};
 const render=()=>{
 initialise();if(blobUrl){URL.revokeObjectURL(blobUrl);blobUrl=null;}if(!draft.audio&&draft.audioBlob)blobUrl=URL.createObjectURL(draft.audioBlob);
 root.innerHTML='<div class="author-levels"><button type="button" data-new-one>＋ Mode1の問題を追加</button>'+catalogue.map(q=>'<button type="button" data-edit-one="'+esc(q.id)+'" aria-pressed="'+(q.id===draft.id)+'">'+esc(q.word)+' · '+titleFor[q.mode]+(q.tutorial?' · チュートリアル':'')+'</button>').join('')+'</div><form class="author-form"><h2>Mode1の問題を編集</h2><label>ことば<input data-one-word value="'+esc(draft.word)+'" required></label><label>篇<select data-one-mode '+(draft.tutorial?'disabled':'')+'>'+Object.entries(titleFor).map(([mode,title])=>'<option value="'+mode+'" '+(draft.mode===mode?'selected':'')+'>'+title+'</option>').join('')+'</select></label><label>拍ごとのかな（・区切り）<input data-one-reading value="'+esc(draft.reading.join('・'))+'" required></label><label>録音を変更<input type="file" accept="audio/*" data-one-audio></label><audio controls data-one-preview '+((draft.audio||blobUrl)?'src="'+esc(draft.audio?assetUrl(draft.audio):blobUrl)+'"':'')+'></audio><label>参照音声（任意）<input type="file" accept="audio/*" data-one-reference></label><audio controls data-one-reference-preview '+(draft.referenceAudio?'src="'+esc(assetUrl(draft.referenceAudio))+'"':'')+'></audio><button type="button" data-clear-one-reference>参照音声を外す</button><div data-one-answer></div><button class="primary-cta compact" type="submit">変更を保存</button><button type="button" data-cancel-one>編集を取り消す</button><p>正解・読み・録音を変更しても問題IDは保ち、公開時の問題バージョンで集計を分けます。</p></form>';
 root.querySelectorAll('[data-edit-one]').forEach(b=>b.onclick=()=>{draft=structuredClone(catalogue.find(q=>q.id===b.dataset.editOne));render();});
 root.querySelector('[data-new-one]').onclick=()=>{draft={id:crypto.randomUUID(),recordingId:crypto.randomUUID(),word:'',reading:[],mode:'diyVowel',chapter:'vowelChallenge'};render();};
 root.querySelector('[data-one-word]').oninput=e=>draft.word=e.target.value;
 root.querySelector('[data-one-reading]').oninput=e=>{draft.reading=e.target.value.split('・').map(k=>k.trim()).filter(Boolean);initialise();drawAnswer();};
 root.querySelector('[data-one-mode]').onchange=e=>{draft.mode=e.target.value;draft.chapter=chapterFor[draft.mode];drawAnswer();};
 root.querySelector('[data-one-audio]').onchange=e=>onUpload(e.target,path=>{draft.audio=path;draft.recordingId=crypto.randomUUID();draft.audioName=e.target.files[0].name;draft.audioHash=null;delete draft.audioBlob;root.querySelector('[data-one-preview]').src=assetUrl(path);});
 root.querySelector('[data-one-reference]').onchange=e=>onUpload(e.target,path=>{draft.referenceAudio=path;draft.referenceRecordingId=crypto.randomUUID();root.querySelector('[data-one-reference-preview]').src=assetUrl(path);});
 root.querySelector('[data-clear-one-reference]').onclick=()=>{draft.referenceAudio=null;draft.referenceRecordingId=null;root.querySelector('[data-one-reference-preview]').removeAttribute('src');};
 root.querySelector('[data-cancel-one]').onclick=()=>{draft=structuredClone(catalogue.find(q=>q.id===draft.id)||catalogue[0]);render();};
 root.querySelector('form').onsubmit=async e=>{e.preventDefault();try{draft.word=draft.word.trim();draft.chapter=chapterFor[draft.mode];await onSave(structuredClone(draft));}catch(error){onError(error.message);}};
 drawAnswer();
 };
 function drawAnswer(){
 const answer=root.querySelector('[data-one-answer]');answer.replaceChildren();
 const heading=document.createElement('h3');heading.textContent=draft.mode==='diyVowel'?'正解の文字とパターン（複数選択可）':draft.mode==='diyAccent'?'参照する高低':'参照する拍';answer.append(heading);
 draft.reading.forEach((text,i)=>{
  const row=document.createElement('fieldset'),label=document.createElement('legend');label.textContent=(i+1)+'：'+text;row.append(label);
  if(draft.mode==='diyVowel'){
   const check=document.createElement('input');check.type='checkbox';check.checked=draft.targetIndexes.includes(i);check.setAttribute('aria-label',text+'を正解にする');const select=document.createElement('select');select.setAttribute('aria-label',text+'の参照パターン');const patterns=libraryGlyph(library,text)?.patterns||[];
   for(const p of patterns){const option=document.createElement('option');option.value=p.id;option.textContent=p.title;select.append(option);}select.value=draft.patternChoices[i]||patterns[0]?.id||'';select.disabled=!check.checked;
   check.onchange=()=>{draft.targetIndexes=check.checked?[...new Set([...draft.targetIndexes,i])]:draft.targetIndexes.filter(k=>k!==i);draft.patternChoices[i]=check.checked?select.value:null;select.disabled=!check.checked;};select.onchange=()=>draft.patternChoices[i]=select.value;row.append(check,select);if(!patterns.length){check.disabled=true;row.append(document.createTextNode('図鑑にパターンを登録してください。'));}
  }else if(draft.mode==='diyAccent'){
   const select=document.createElement('select');select.setAttribute('aria-label',text+'の参照する高さ');for(const [value,title]of [['high','高 H'],['low','低 L']]){const option=document.createElement('option');option.value=value;option.textContent=title;select.append(option);}select.value=draft.pattern[i];select.disabled=linkedMora(draft.reading,i);select.onchange=()=>{draft.pattern[i]=select.value;draft.pattern=linkPitch(draft.reading,draft.pattern);drawAnswer();};row.append(select);if(select.disabled)row.append(document.createTextNode('前の拍と連動'));
  }else{
   const select=document.createElement('select');select.setAttribute('aria-label',text+'の参照する拍数');for(const n of [0,1,2]){const option=document.createElement('option');option.value=n;option.textContent=n+'拍'+(n===0?'（減らす）':n===2?'（ー）':'');select.append(option);}select.value=draft.beats[i];select.onchange=()=>draft.beats[i]=Number(select.value);row.append(select);
   if(i<draft.reading.length-1){const label=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.checked=draft.blanks[i];check.onchange=()=>draft.blanks[i]=check.checked;label.append(check,document.createTextNode('後に「ッ」を入れる'));row.append(label);}
  }answer.append(row);
 });
 }
 render();return ()=>{if(blobUrl)URL.revokeObjectURL(blobUrl);};
}
