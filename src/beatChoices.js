export function mountBeatChoices(host,{text,canLong,canBlank,onLong,onBlank,onDelete}){
 const box=document.createElement('section');box.className='beat-choices';
 if(!text){const hint=document.createElement('p');hint.textContent='文字を選んでください。';box.append(hint);host.append(box);return box;}
 const title=document.createElement('p');title.textContent='「'+text+'」の拍';box.append(title);
 const options=document.createElement('div');options.className='beat-choice-list';
 for(const [symbol,label,enabled,action,id]of [['ー','1拍増やす',canLong,onLong,'long'],['ッ','1拍増やす',canBlank,onBlank,'blank'],['−1拍','この拍を減らす',true,onDelete,'delete']]){
  const b=document.createElement('button');b.type='button';b.className='beat-choice';b.dataset.beatChoice=id;b.disabled=!enabled;b.dataset.unavailable=String(!enabled);b.setAttribute('aria-label',id==='delete'?'「'+text+'」の拍を減らす':'「'+text+'」の後に「'+symbol+'」を追加');
  const glyph=document.createElement('b'),caption=document.createElement('small');glyph.textContent=symbol;caption.textContent=label;b.append(glyph,caption);b.onclick=action;options.append(b);
 }box.append(options);host.append(box);return box;
}
