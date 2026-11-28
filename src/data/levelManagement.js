
// Only the authoring catalogue changes. Submitted responses and audio files remain intact.
export function archiveLevel(library,id){
 const level=library.levels.find(l=>l.id===id);if(!level)throw new Error('問題が見つかりません。');
 return {...library,levels:library.levels.filter(l=>l.id!==id),archivedLevels:[...(library.archivedLevels||[]).filter(l=>l.id!==id),{...level,deletedAt:new Date().toISOString()}]};
}
export function restoreLevel(library,id){
 const level=(library.archivedLevels||[]).find(l=>l.id===id);if(!level)throw new Error('問題が見つかりません。');
 if(library.levels.some(l=>l.id===id))throw new Error('同じIDの問題がすでにあります。');
 const {deletedAt,...restored}=level;
 return {...library,levels:[...library.levels,restored],archivedLevels:library.archivedLevels.filter(l=>l.id!==id)};
}

export function archiveModeOneLevel(library,question){
 if(!question?.id||question.tutorial)throw Error('通常の問題を選んでください。');
 const {audioBlob,history,...snapshot}=question;
 return {...library,modeOneLevels:(library.modeOneLevels||[]).filter(q=>q.id!==question.id),archivedModeOneLevels:[...(library.archivedModeOneLevels||[]).filter(q=>q.id!==question.id),{...snapshot,localOnly:!(library.modeOneLevels||[]).some(q=>q.id===question.id),deletedAt:new Date().toISOString()}]};
}
export function restoreModeOneLevel(library,id){
 const record=(library.archivedModeOneLevels||[]).find(q=>q.id===id);if(!record)throw Error('削除した問題が見つかりません。');
 if((library.modeOneLevels||[]).some(q=>q.id===id))throw Error('同じIDの問題がすでにあります。');
 const {deletedAt,localOnly,...question}=record;
 return {...library,modeOneLevels:localOnly?(library.modeOneLevels||[]):[...(library.modeOneLevels||[]),question],archivedModeOneLevels:library.archivedModeOneLevels.filter(q=>q.id!==id)};
}
