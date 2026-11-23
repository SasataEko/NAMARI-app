import {createTutorialGuide} from './tutorialGuide.js';
export function createModeTwoGuideOverlay(){
 const guide=createTutorialGuide(),panel=document.createElement('aside');panel.className='m2-guide-floating';panel.setAttribute('aria-label','操作ガイド');
 const text=document.createElement('p');text.setAttribute('role','status');text.setAttribute('aria-live','polite');
 const actions=document.createElement('div'),next=document.createElement('button'),close=document.createElement('button');next.type=close.type='button';next.textContent='試さず進む';close.textContent='ガイドを終了';actions.append(next,close);panel.append(text,actions);document.body.append(panel);
 return {show(target,{copy,highlight=[],optional=false,onNext,onClose}={}){panel.hidden=false;text.textContent=copy;next.hidden=!optional;next.onclick=onNext;close.textContent='ガイドを終了';close.onclick=onClose;if(target)guide.set(target,{highlight,showNote:false});else guide.hide();},
  finish(copy,onClose){guide.hide();panel.hidden=false;text.textContent=copy;next.hidden=true;close.textContent='OK';close.onclick=()=>{panel.hidden=true;onClose?.();};},
  dispose(){guide.dispose();panel.remove();}};
}
