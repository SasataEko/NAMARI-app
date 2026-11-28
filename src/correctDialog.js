export function showCorrectDialog(owner,{label='次の問題へ',onNext,onQuestion,questionSent=false}){
 owner.querySelector('.correct-dialog')?.remove();
 const dialog=document.createElement('dialog');dialog.className='correct-dialog';dialog.setAttribute('aria-labelledby','correct-dialog-title');
 const title=document.createElement('h2');title.id='correct-dialog-title';title.textContent='正解';
 const button=document.createElement('button');button.type='button';button.className='correct-next';button.textContent=label;button.onclick=()=>{dialog.close();dialog.remove();onNext?.();};
 dialog.append(title,button);
 if(onQuestion){const question=document.createElement('button');question.type='button';question.className='correct-question';const icon=document.createElement('span');icon.className='correct-question-icon';icon.setAttribute('aria-hidden','true');icon.textContent='?';const text=document.createElement('span');text.textContent=questionSent?'送信しました':'この答えに疑問がある';question.disabled=questionSent;question.append(icon,text);question.onclick=()=>{if(question.disabled)return;if(onQuestion()!==false){question.disabled=true;text.textContent='送信しました';}};dialog.append(question);}
 dialog.addEventListener('cancel',e=>e.preventDefault());owner.append(dialog);dialog.showModal();button.focus();return dialog;
}
