import {createModeTwoGuideOverlay} from './modeTwoGuideOverlay.js';
import {participantId} from './data/participantIdentity.js';
import {MODE_TWO_TUTORIAL_VERSION} from './data/researchState.js';
export function mountModeTwoResultGuide(root,record){
 if(record.skipped||record.diagnostic||record.sync?.status==='fixture')return ()=>{};
 const key='namari-mode2-result-guide-'+participantId()+'-'+MODE_TWO_TUTORIAL_VERSION;
 try{if(localStorage.getItem(key))return ()=>{};}catch{}
 const overlay=createModeTwoGuideOverlay();let step=0,disposed=false;
 function show(){
  const region=root.querySelector(step===0?'[data-personal-preview]':'[data-average-preview]');
  const example=root.querySelector('.mode2-average-block h2')?.textContent.includes('表示例');
  const copy=step===0?'上は、あなたがつくった聞こえ方です。':example?'下は、みんなの平均の表示場所です。今はあなたの回答を使った表示例です。':'下は、みんなの回答の平均です。正解ではありません。';
  overlay.show(region,{copy,highlight:[region?.closest('.mode2-answer-block')],onClose:finish});
 }
 function finish(){try{localStorage.setItem(key,'seen');}catch{}dispose();}
 function advance(event){if(disposed)return;if(event.type==='keydown'&&!['Enter',' ','Escape'].includes(event.key))return;event.preventDefault();event.stopImmediatePropagation();if(event.key==='Escape'||++step>=2){finish();return;}show();}
 const watch=new MutationObserver(()=>{if(!root.isConnected)dispose();});watch.observe(document.body,{childList:true,subtree:true});
 function dispose(){if(disposed)return;disposed=true;watch.disconnect();document.removeEventListener('click',advance,true);document.removeEventListener('keydown',advance,true);overlay.dispose();}
 document.addEventListener('click',advance,true);document.addEventListener('keydown',advance,true);show();return dispose;
}
