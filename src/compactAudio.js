import {assetUrl} from './data/projectLibrary.js';
// Reuse the original audio nodes so playback metrics and source identity stay intact.
export function mountCompactAudio(canvas,learner,reference=null){
 const strip=learner.closest('.audio-comparison-strip');
 const audios=reference?[learner,reference]:strip?[...strip.querySelectorAll('audio')]:[learner];
 const rail=document.createElement('div');rail.className='m3-audio-rail';rail.setAttribute('role','group');rail.setAttribute('aria-label','音声を再生');
 const cleanups=[];canvas.dataset.hasAudio='true';
 audios.forEach((audio,i)=>{
  const label=audios.length>1?(i===0?'学習者音声':'参照音声'):'録音';
  const item=document.createElement('div'),button=document.createElement('button');item.className='m3-audio-item';button.type='button';button.className='m3-audio-button';
  const icon=document.createElement('img');icon.src=assetUrl('assets/ui/audio-play.png');icon.alt='';button.append(icon);
  let failed=false;const sync=event=>{if(event?.type==='error')failed=true;if(event?.type==='play')failed=false;const playing=!audio.paused&&!audio.ended;button.setAttribute('aria-pressed',String(playing));button.setAttribute('aria-label',label+(playing?'を一時停止':'を再生'));button.title=failed?'音声を再生できませんでした。もう一度押してください。':button.getAttribute('aria-label');if(failed)button.setAttribute('aria-label',label+'を再生できませんでした。もう一度再生');};
  button.onclick=async()=>{if(!audio.paused&&!audio.ended){audio.pause();return;}audios.forEach(other=>{if(other!==audio)other.pause();});try{failed=false;await audio.play();}catch{failed=true;button.setAttribute('aria-label',label+'を再生できませんでした。もう一度再生');button.title='音声を再生できませんでした。もう一度押してください。';}sync();};
  for(const event of ['play','pause','ended','error'])audio.addEventListener(event,sync);
  audio.controls=false;audio.hidden=true;item.append(button,audio);
  if(audios.length>1){const name=document.createElement('small');name.textContent=i===0?'学習者':'参照';item.append(name);}
  rail.append(item);sync();cleanups.push(()=>{audio.pause();for(const event of ['play','pause','ended','error'])audio.removeEventListener(event,sync);});
 });
 canvas.append(rail);strip?.remove();
 return ()=>{cleanups.forEach(fn=>fn());rail.remove();};
}
