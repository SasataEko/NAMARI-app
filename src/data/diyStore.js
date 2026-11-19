import { hiragana } from './patternLibrary.js';
const DATABASE = 'kotoba-diy-questions';
const STORE = 'questions';

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// 题目、录音和 SVG Blob 保存在本机 IndexedDB，不会上传到服务器。
export async function saveDiyQuestion(question) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, 'readwrite');
    transaction.objectStore(STORE).put(question);
    transaction.oncomplete = () => { db.close(); resolve(question); };
    transaction.onerror = () => { db.close(); reject(transaction.error); };
  });
}

export async function listDiyQuestions({ deleted = false } = {}) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
    request.onsuccess = () => { db.close(); resolve(request.result.filter(q=>Boolean(q.deletedAt)===deleted).map(q=>({...q,word:hiragana(q.word),reading:q.reading.map(hiragana)})).sort((a, b) => b.createdAt.localeCompare(a.createdAt))); };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}

// Soft deletion keeps the question and recording recoverable; research records are untouched.
async function changeQuestion(id,change){
 const db=await openDatabase();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,'readwrite'),store=tx.objectStore(STORE);let result,error;
  const request=store.get(id);
  request.onsuccess=()=>{try{if(!request.result)throw new Error('問題が見つかりません。');result=change(request.result);store.put(result);}catch(e){error=e;tx.abort();}};
  tx.oncomplete=()=>{db.close();resolve(result);};
  tx.onabort=tx.onerror=()=>{db.close();reject(error||tx.error||new Error('保存できませんでした。'));};
 });
}
export const deleteDiyQuestion=id=>changeQuestion(id,q=>({...q,deletedAt:new Date().toISOString()}));
export const restoreDiyQuestion=id=>changeQuestion(id,q=>({...q,deletedAt:null}));
export function reviseDiyQuestion(previous,values){
 const {history,...snapshot}=previous||{};
 return {...snapshot,...values,id:previous?.id||values.id,createdAt:previous?.createdAt||values.createdAt,
  recordingId:previous&&previous.audioBlob===values.audioBlob?(previous.recordingId||previous.id+'-recording-v1'):crypto.randomUUID(),
  revision:(previous?.revision||0)+1,updatedAt:new Date().toISOString(),deletedAt:null,
  history:previous?[...(history||[]),snapshot]:[]};
}
