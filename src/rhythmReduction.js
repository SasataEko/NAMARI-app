
export function decreaseBeat(beats,index,state){
 if(!Number.isInteger(index)||index<0||index>=beats.length||beats[index]<=0)return false;
 const before=beats[index];beats[index]--;state.history.push({index,before});return true;
}
export function undoDecrease(beats,state){const entry=state.history.pop();if(!entry)return false;beats[entry.index]=entry.before;return true;}
export function restoreBeat(beats,index,state){if(beats[index]!==0)return false;const previous=[...state.history].reverse().find(e=>e.index===index);beats[index]=previous?.before||1;state.history=state.history.filter(e=>e.index!==index);return true;}
export function beatVisual(beats,omissionRate=beats===0?1:0){const survival=1-Math.max(0,Math.min(1,omissionRate));return {survival,extension:Math.max(0,beats-survival)};}

export function toggleBeatSelection(beats,index,state){
 if(!Number.isInteger(index)||index<0||index>=beats.length||beats[index]===0)return false;
 state.index=state.index===index?null:index;return true;
}
export function removeSelectedBeat(beats,state){
 const index=state.index;if(!Number.isInteger(index)||index<0||index>=beats.length||beats[index]===0)return false;
 state.history.push({index,before:beats[index]});state.hasDeleted=true;beats[index]--;state.index=null;return true;
}
export function appendReductionControls(host,{tokens,beats,state,disabled=false,onChange}){
 const bar=document.createElement('div');bar.className='beat-reduction-controls';bar.setAttribute('role','group');bar.setAttribute('aria-label','選んだ拍を削除・元に戻す');
 const selected=Number.isInteger(state.index)&&beats[state.index]>0;
 if(selected){const remove=document.createElement('button');remove.type='button';remove.className='outline-button beat-delete';remove.textContent='この拍を削除';remove.setAttribute('aria-label',(state.index+1)+'拍目の「'+tokens[state.index]+'」を削除');remove.disabled=disabled;remove.onclick=()=>{if(removeSelectedBeat(beats,state))onChange();};bar.append(remove);}
 if(state.hasDeleted||state.history.length||beats.includes(0)){
  state.hasDeleted=true;const undo=document.createElement('button');undo.type='button';undo.className='outline-button';undo.textContent='拍を戻す';undo.dataset.unavailable=String(!state.history.length&&!beats.includes(0));undo.disabled=disabled||undo.dataset.unavailable==='true';
  undo.onclick=()=>{state.index=null;if(undoDecrease(beats,state)){onChange();return;}const index=beats.lastIndexOf(0);if(index>=0&&restoreBeat(beats,index,state))onChange();};bar.append(undo);
 }
 bar.hidden=!bar.children.length;host.append(bar);return bar;
}
