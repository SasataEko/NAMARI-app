export function createEditHistory({capture,restore,limit=100}){
 const stack=[];
 return {checkpoint(){stack.push(structuredClone(capture()));if(stack.length>limit)stack.shift();},get canUndo(){return stack.length>0;},undo(){if(!stack.length)return false;restore(structuredClone(stack.pop()));return true;}};
}
