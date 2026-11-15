const descriptions={
  mode1:{title:'決まった答えを、見つけよう。',text:'Mode1には、あらかじめ正解として設定された選択肢があります。録音を聞き、文字・アクセント・拍の特徴を見つけてみよう。まずは各篇のチュートリアルから試せます。'},
  mode2:{title:'聞こえたかたちを、自由につくろう。',text:'Mode2には正解がありません。訛りについて自分が感じたことを、字形・アクセント・拍で自由に表現できます。送信すると、あなたの図形とみんなの平均を見比べられます。何も変えずに送っても大丈夫です。'},
};
export function showModeIntro(mode,{force=false}={}){
  const key='kotoba-mode-intro-v1-'+mode;let seen=false;try{seen=localStorage.getItem(key)==='seen';}catch{}
  if((seen&&!force)||document.querySelector('.mode-intro-overlay'))return;
  const previous=document.activeElement,content=descriptions[mode];if(!content)return;
  const overlay=document.createElement('div');overlay.className='dialog-backdrop mode-intro-overlay';
  overlay.innerHTML='<section class="mode-intro-card" role="dialog" aria-modal="true" aria-labelledby="mode-intro-title"><p class="eyebrow">'+(mode==='mode1'?'MODE 1':'MODE 2')+'</p><h2 id="mode-intro-title"></h2><p data-intro-copy></p><button class="judge-button">わかった、はじめる</button></section>';
  overlay.querySelector('h2').textContent=content.title;overlay.querySelector('[data-intro-copy]').textContent=content.text;
  const close=()=>{try{localStorage.setItem(key,'seen');}catch{}overlay.remove();if(previous?.isConnected)previous.focus({preventScroll:true});};
  const button=overlay.querySelector('button');button.onclick=close;overlay.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();close();}else if(e.key==='Tab'){e.preventDefault();button.focus();}};
  document.body.append(overlay);button.focus({preventScroll:true});
}
