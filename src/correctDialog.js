export function showCorrectDialog(owner,{label='次の問題へ',onNext}){
 owner.querySelector('.correct-dialog')?.remove();
 const dialog=document.createElement('dialog');dialog.className='correct-dialog';dialog.setAttribute('aria-labelledby','correct-dialog-title');
 const title=document.createElement('h2');title.id='correct-dialog-title';title.textContent='正解';
 const button=document.createElement('button');button.type='button';button.className='correct-next';button.textContent=label;button.onclick=()=>{dialog.close();dialog.remove();onNext?.();};
 dialog.append(title,button);dialog.addEventListener('cancel',e=>e.preventDefault());owner.append(dialog);dialog.showModal();button.focus();
}
