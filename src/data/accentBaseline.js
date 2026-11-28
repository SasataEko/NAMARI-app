import {linkPitch,linkedMora} from './linkedPitch.js';
// Normal Tokyo reference shapes are independent of the researcher's recording analysis.
export const accentReferences={
 'からだ':{pitch:'LHH',source:'https://marugoto.jpf.go.jp/assets/docs/download/elementary1_a/MarugotoElementary1ActivitiesVocabularyIndex2_CNT.pdf'},
 'くすり':{pitch:'LHH',source:'https://marugoto.jpf.go.jp/assets/docs/download/elementary1_a/MarugotoElementary1ActivitiesVocabularyIndex2_CNT.pdf'},
 'ぱいろっと':{pitch:'HLLLL',alternatives:['LHHHL'],source:'https://journal.kci.go.kr/JJC/archive/articlePdf?artiId=ART002501066',note:'NHK2016: 1型を初期値、3型も辞書の異形。促音は既存の前拍連動表示に従う。'},
 'きんめだる':{pitch:'LHHLL',source:'https://www.marugoto.org/assets/docs/download/elementary2_c/MarugotoElementary2CompetencesVocabularyIndex_IT.pdf'},
 'とおりみち':{pitch:'LHHLL',source:'https://www.romajidesu.com/vi/dictionary/meaning-of-とおり.html',reviewRequired:true,note:'検索表示の3型に基づく暫定参照。一次アクセント資料で再確認する。'}
};
export function normalAccent(question){
 const tokens=question.reading||[],key=tokens.join('').replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-96));
 const explicit=question.normalAccent||question.defaultAccent;
 if(Array.isArray(explicit)&&explicit.length===tokens.length&&explicit.every(p=>['high','low'].includes(p)))return linkPitch(tokens,explicit);
 const reference=accentReferences[key];
 return linkPitch(tokens,reference&&reference.pitch.length===tokens.length?[...reference.pitch].map(p=>p==='H'?'high':'low'):tokens.map((_,i)=>i?'high':'low'));
}
export const accentColor=(current,normal)=>current===normal?'#80bedb':'#e5235b';
export function accentProgress(reading,normal,target,current){
 const positions=reading.map((_,i)=>i).filter(i=>!linkedMora(reading,i)&&normal[i]!==target[i]);
 return {correct:positions.filter(i=>current[i]===target[i]).length,total:positions.length,positions};
}
export function accentConnections(indices,pitch,normal,id){
 let defs='',lines='';indices.slice(1).forEach((i,j)=>{const prev=indices[j],x1=50+j*100,x2=x1+100,y1=pitch[prev]==='high'?19:111,y2=pitch[i]==='high'?19:111,key=id+'-'+j;
 defs+='<linearGradient id="'+key+'" gradientUnits="userSpaceOnUse" x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'"><stop offset="0%" stop-color="'+accentColor(pitch[prev],normal[prev])+'"/><stop offset="100%" stop-color="'+accentColor(pitch[i],normal[i])+'"/></linearGradient>';
 lines+='<path class="accent-reference-segment" d="M'+x1+' '+y1+' L'+x2+' '+y2+'" stroke="url(#'+key+')"/>';});
 return '<svg class="pitch-path" viewBox="0 0 '+indices.length*100+' 130" preserveAspectRatio="none" aria-hidden="true"><defs>'+defs+'</defs><path class="pitch-guide" d="M50 19 H'+(indices.length*100-50)+' M50 111 H'+(indices.length*100-50)+'"/>'+lines+'</svg>';
}


// Display-only pose. Keep an edited glyph stable across redraws and return upright at its reference pitch.
export function accentGlyphAngles(pitch,normal,previous,angles,random=Math.random){
 return pitch.map((value,i)=>value===normal[i]?0:previous[i]===value&&angles[i]?angles[i]:Math.round((2+random()*8)*(random()<0.5?-1:1)*100)/100);
}