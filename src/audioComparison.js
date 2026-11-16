import {assetUrl} from './data/projectLibrary.js';
export function createComparisonMetrics(){
  let visual=false,reference=0,learnerBefore=0,learnerAfter=0,referenceBefore=0,referenceAfter=0;
  return {markVisual(){visual=true;},learnerPlayed(){if(visual)learnerAfter++;else learnerBefore++;},referencePlayed(){reference++;if(visual)referenceAfter++;else referenceBefore++;},snapshot(learnerCount){return {reference_audio_play_count:reference,learner_audio_play_count:learnerCount,reference_comparison_used:reference>0&&learnerCount>0,reference_before_visual_count:referenceBefore,reference_after_visual_count:referenceAfter,learner_before_visual_count:learnerBefore,learner_after_visual_count:learnerAfter};}};
}
export function mountReferenceAudio(learner,url,onReferencePlay){
  if(!url)return null;
  const label=document.createElement('p');label.className='audio-role-label';label.textContent='学習者音声';learner.before(label);
  const container=document.createElement('div');container.className='reference-audio';const title=document.createElement('p');title.className='audio-role-label';title.textContent='参照音声';const audio=document.createElement('audio');audio.controls=true;audio.preload='metadata';audio.setAttribute('aria-label','参照音声');audio.src=/^(?:blob:|https?:|\/)/.test(url)?url:assetUrl(url);audio.addEventListener('play',onReferencePlay);container.append(title,audio);learner.after(container);return audio;
}
