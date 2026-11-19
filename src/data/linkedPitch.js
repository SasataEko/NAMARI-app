
// Author-selected rule: explicit small-tsu and long mark follow the preceding mora.
export const linkedMora=(tokens,index)=>index>0&&['っ','ッ','ー'].includes(tokens[index]);
export function linkPitch(tokens,values){
 const result=tokens.map((_,i)=>values?.[i]??null);
 for(let i=1;i<tokens.length;i++)if(linkedMora(tokens,i))result[i]=result[i-1];
 return result;
}
