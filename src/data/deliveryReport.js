const LEDGER='kotoba-delivery-ledger-v1';
const read=(storage,key,fallback)=>{try{return JSON.parse(storage.getItem(key)||'null')??fallback;}catch{return fallback;}};
export function rememberDelivery(record,status,error=null,storage=globalThis.localStorage){
 if(!record?.id||!storage)return;try{const rows=read(storage,LEDGER,{});rows[record.id]={status,error,at:new Date().toISOString(),gameMode:record.gameMode,studyMode:record.studyMode};storage.setItem(LEDGER,JSON.stringify(rows));globalThis.dispatchEvent?.(new Event('namari-delivery-change'));}catch{}
}
export function deliveryEntries(storage=globalThis.localStorage){
 const queue=read(storage,'kotoba-cloud-outbox-v1',[]),ledger=read(storage,LEDGER,{}),pending=new Set(queue.map(r=>r.id));
 const rows=[...read(storage,'kotoba-mode1-responses-v1',[]).map(r=>({...r,gameMode:r.gameMode||'mode1'})),...read(storage,'kotoba-exploration-raw-v3',[]).map(r=>({...r,gameMode:r.gameMode||'mode2'})),...queue.filter(r=>r.schemaType!=='study_event')];
 const latest=new Map();
 rows.forEach((r,index)=>{if(!['mode1','mode2'].includes(r.gameMode)||!r.id)return;const key=r.gameMode+':'+(r.studyMode||'test')+':'+(r.participantId||'')+':'+(r.gameMode==='mode1'?(r.attemptId||r.id):r.id),existing=latest.get(key);if(!existing||String(r.createdAt||'')>String(existing.record.createdAt||'')||r.id===existing.record.id||!r.createdAt)latest.set(key,{record:r,index});});
 return [...latest.values()].map(({record})=>{const receipt=ledger[record.id];const local=record.visualExperiment||record.local_only||record.diagnostic||record.levelId?.startsWith('tutorial-');const status=local?'local':receipt?.status==='synced'?'synced':pending.has(record.id)?'pending':receipt?.status||record.sync?.status||'unknown';return {record,status:['synced','pending','local'].includes(status)?status:'unknown',error:receipt?.error||record.sync?.error||null};});
}
export function deliverySummary(storage=globalThis.localStorage){
 const entries=deliveryEntries(storage);return ['mode1','mode2'].flatMap(gameMode=>['test','research'].map(studyMode=>{const rows=entries.filter(e=>e.record.gameMode===gameMode&&(e.record.studyMode||'test')===studyMode);return {gameMode,studyMode,total:rows.length,synced:rows.filter(e=>e.status==='synced').length,pending:rows.filter(e=>e.status==='pending').length,local:rows.filter(e=>e.status==='local').length,unknown:rows.filter(e=>e.status==='unknown').length};}));
}
