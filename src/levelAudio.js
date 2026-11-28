import './levelAudio.css';
// One acknowledgement for each game mode, independent of participant answers.
export function startLevelAudio(audio,{mode,alive=()=>audio.isConnected,onBlocked,onStarted,onError}={}){
 let disposed=false,notice=null,fallback=null;
 const live=()=>!disposed&&alive()&&audio.isConnected;
 const play=async()=>{if(!live())return;try{await audio.play();if(live()){fallback?.remove();onStarted?.();}}catch(error){if(!live())return;if(onBlocked)onBlocked(play,error);else{fallback?.remove();fallback=document.createElement('button');fallback.className='outline-button audio-start-fallback';fallback.textContent='タップして録音を再生';fallback.onclick=play;audio.after(fallback);}}};
 const failed=()=>{if(live())onError?.(play);};audio.addEventListener('error',failed);
 (async()=>{
  let seen=false;try{seen=localStorage.getItem('namari-sound-notice-'+mode)==='1';}catch{}
  if(!seen&&live())await new Promise(resolve=>{
   notice=document.createElement('dialog');notice.className='sound-notice';notice.innerHTML='<h2>音声を使って遊びます</h2><p>周りの方の迷惑にならないよう、音量やイヤホンをご確認ください。</p><button class="judge-button">音声を再生してはじめる</button>';
   notice.addEventListener('cancel',e=>e.preventDefault());notice.querySelector('button').onclick=()=>{try{localStorage.setItem('namari-sound-notice-'+mode,'1');}catch{}notice.close();notice.remove();notice=null;resolve();play();};document.body.append(notice);notice.showModal();
  });else await play();
 })();
 return ()=>{disposed=true;notice?.remove();fallback?.remove();audio.removeEventListener('error',failed);audio.pause();};
}
