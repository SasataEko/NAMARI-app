export function mountAnswerReveal(owner,{session,onReveal,before=null,isBlocked=()=>false}){
 const button=document.createElement('button');button.type='button';button.className='outline-button mode-one-reveal';button.textContent='正解を見る';button.hidden=true;
 if(before)before.before(button);else owner.append(button);
 const update=()=>{const state=session.tracker.capture();button.hidden=!state.answerRevealAvailable;button.disabled=state.completed||state.gaveUp||isBlocked();};
 button.onclick=()=>{if(!session.revealAnswer())return;update();onReveal?.();};update();return {button,update};
}
