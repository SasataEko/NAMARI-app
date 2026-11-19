
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
