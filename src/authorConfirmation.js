
import './studyUI.css';
export function confirmQuestionDeletion(word){
 return new Promise(resolve=>{
  const previous=document.activeElement,dialog=document.createElement('dialog');dialog.className='study-dialog';dialog.setAttribute('aria-label','問題の削除');
  dialog.innerHTML='<h2>問題を削除しますか？</h2><p data-word></p><p>問題一覧から外します。あとで復元できます。回答データと素材ファイルは削除されません。</p><div class="study-actions"><button type="button" class="outline-button" data-cancel>キャンセル</button><button type="button" class="judge-button" data-confirm>削除する</button></div>';
  dialog.querySelector('[data-word]').textContent='「'+word+'」';let done=false;
  const finish=confirmed=>{if(done)return;done=true;dialog.close();dialog.remove();if(previous?.isConnected)previous.focus({preventScroll:true});resolve(confirmed);};
  dialog.querySelector('[data-cancel]').onclick=()=>finish(false);dialog.querySelector('[data-confirm]').onclick=()=>finish(true);
  dialog.oncancel=e=>{e.preventDefault();finish(false);};document.body.append(dialog);dialog.showModal();dialog.querySelector('[data-cancel]').focus();
 });
}
