import {createModeTwoGuideOverlay} from './modeTwoGuideOverlay.js';
import {markTutorial} from './data/researchState.js';
import {nextModeTwoGuideStep} from './data/modeTwoGuideSteps.js';

// Receive completed editor actions, not clicks on nodes that may be replaced.
export function createModeTwoMakeGuide({root,canvas,editor,bar,getTab,getSelected}){
 const overlay=createModeTwoGuideOverlay();let step='listen',disposed=false;
 const tab=id=>root.querySelector('#m3-tab-'+id),kana=()=>root.querySelector('.m3-kana[data-key^="base:"]');
 const freeCopy='ここからは自由に編集して、完成したら提出しよう！';
 function end(status){if(disposed)return;step='free';markTutorial('mode2','exploration',status);overlay.finish(freeCopy);}
 function refresh(){
  if(disposed||!root.isConnected||step==='free')return;
  if(step==='kana'&&getSelected()){step='shape-tab';}
  let target,copy,optional=false;
  if(step==='listen'){target=root.querySelector('.m3-audio-button');copy='まず、音声を聞いてみよう。';}
  else if(step==='kana'){target=kana();copy='気になる文字を、ひとつタップ。';}
  else if(step==='shape-tab'){target=tab('patterns');copy='「母音子音」を開こう。';}
  else if(step==='pattern'){
   if(getTab()!=='patterns'){target=tab('patterns');copy='「母音子音」を開こう。';}
   else if(!getSelected()){target=kana();copy='変えたい文字を、ひとつ選ぼう。';}
   else{target=root.querySelector('.m3-choice[data-pattern-id]:not([data-pattern-id=""]):not(:disabled)');copy='カードで、口音のかたちを選ぼう。';if(!target){target=kana();copy='この文字の候補は準備中。別の文字を選ぼう。';optional=true;}}
  }
  else if(step==='pitch-tab'){target=tab('pitch');copy='次は「アクセント」。';}
  else if(step==='pitch'){target=getTab()==='pitch'?root.querySelector('.accent-dot[aria-pressed="false"]:not(:disabled)'):tab('pitch');copy='上・下の点で、音の高さを変えよう。';}
  else if(step==='emphasis'){target=getTab()==='pitch'?kana():tab('pitch');copy='強く聞こえたら文字をタップ。重音は2つまで（任意）。';optional=true;}
  else if(step==='beat-tab'){target=tab('duration');copy='次は「拍」。';}
  else if(step==='beat'){
   if(getTab()!=='duration'){target=tab('duration');copy='「拍」を開こう。';}
   else{target=root.querySelector('[data-beat-choice="long"]:not(:disabled)')||root.querySelector('[data-beat-choice="blank"]:not(:disabled)')||root.querySelector('[data-beat-choice="delete"]:not(:disabled)');copy='「ー」「ッ」で1拍追加。短くしたい拍は「−1拍」。';if(!target){target=kana();copy='長さを変えたい文字を選ぼう。';}}
  }
  else if(step==='undo'){target=root.querySelector('.m3-icon-undo');copy='最後に、ひとつ前へ戻してみよう。';}
  overlay.show(target,{copy,highlight:step==='listen'?[canvas]:[canvas,editor,...(step==='undo'?[bar]:[])],optional,onNext:()=>notify('next'),onClose:()=>end('skipped')});
 }
 function notify(event){if(disposed||step==='free')return;step=nextModeTwoGuideStep(step,event);if(step==='free'){end('completed');return;}refresh();}
 const audio=root.querySelector('audio'),listened=()=>notify('listened');audio?.addEventListener('ended',listened);
 const watch=new MutationObserver(()=>{if(!root.isConnected)dispose();});watch.observe(document.body,{childList:true,subtree:true});
 function dispose(){if(disposed)return;disposed=true;watch.disconnect();audio?.removeEventListener('ended',listened);overlay.dispose();}
 markTutorial('mode2','exploration','started');refresh();return {notify,refresh,dispose};
}
