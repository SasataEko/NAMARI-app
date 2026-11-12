let configPromise;
const base=()=>import.meta.env?.BASE_URL || '/NAMARI-app/';
const QUEUE='kotoba-cloud-outbox-v1';
export const readOutbox=()=>JSON.parse(localStorage.getItem(QUEUE)||'[]');
function writeOutbox(rows){localStorage.setItem(QUEUE,JSON.stringify(rows));}
export async function collectionConfig(){
 if(!configPromise)configPromise=fetch(`${base()}content/collection.json`,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('収集設定を読み込めません');return r.json();}).catch(e=>{configPromise=null;throw e;});
 const c=await configPromise;if(c.enabled&&!validEndpoint(c.endpoint))throw new Error('Apps Scriptの /exec URLを確認してください');return c;
}
export function validEndpoint(url){return /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url)||(import.meta.env?.DEV&&/^http:\/\/127\.0\.0\.1:\d+\/exec$/.test(url));}
function credential(){let key=localStorage.getItem('kotoba-cloud-participant-key-v1');if(!key){key=crypto.randomUUID()+crypto.randomUUID();localStorage.setItem('kotoba-cloud-participant-key-v1',key);}return key;}
export function jsonp(endpoint,params,timeoutMs=12000){
 return new Promise((resolve,reject)=>{
 const callback='namari_'+crypto.randomUUID().replaceAll('-',''),script=document.createElement('script');
 const url=new URL(endpoint);Object.entries({...params,callback,_ts:Date.now()}).forEach(([k,v])=>url.searchParams.set(k,String(v)));
 let done=false;const finish=(error,value)=>{if(done)return;done=true;clearTimeout(timer);script.remove();window[callback]=()=>{};setTimeout(()=>delete window[callback],30000);error?reject(error):resolve(value);};
 const timer=setTimeout(()=>finish(new Error('Google Sheetsの応答がありません。接続と公開設定を確認して再送してください。')),timeoutMs);
 window[callback]=value=>finish(null,value);script.onerror=()=>finish(new Error('Google Sheetsに接続できません。'));script.referrerPolicy='no-referrer';script.src=url.href;document.head.append(script);
 });
}
export async function attachLevelVersion(record,level){
 const list=await fetch(`${base()}content/study-manifest.json`,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('関卡バージョン未生成です');return r.json();});
 const entry=list.find(l=>l.levelId===level.id&&l.recordingId===record.recordingId);
 if(!entry)throw new Error('新しい関卡はmanifestを生成してから公開してください');return {...record,levelVersion:entry.levelVersion};
}
export async function sendPending(id){
 const config=await collectionConfig();if(!config.enabled)return {status:'local'};
 const item=readOutbox().find(r=>r.id===id);if(!item)return {status:'synced'};
 const controller=new AbortController(),postTimer=setTimeout(()=>controller.abort(),12000);
 // A simple text/plain POST avoids a preflight. Opaque fetch success is NOT an acknowledgement.
 try{await fetch(config.endpoint,{method:'POST',mode:'no-cors',credentials:'omit',headers:{'Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify({action:'submit',participantKey:credential(),response:item}),signal:controller.signal});}catch{}finally{clearTimeout(postTimer);}
 const deadline=Date.now()+Math.min(45000,Math.max(5000,config.timeoutMs||30000));
 let lastError;
 while(Date.now()<deadline){
   try{const receipt=await jsonp(config.endpoint,{action:'receipt',submissionId:id},Math.min(10000,Math.max(500,deadline-Date.now())));
   if(receipt.rejected)throw Object.assign(new Error('回答を受け付けられませんでした。関卡バージョン・サーバー設定を管理者に確認してください。'),{rejected:true});
   if(receipt.ok&&receipt.received){writeOutbox(readOutbox().filter(r=>r.id!==id));return {status:'synced'};}
   }catch(e){lastError=e;if(e.rejected)throw e;}
   await new Promise(resolve=>setTimeout(resolve,1000));
 }
 throw lastError||new Error('保存の確認がまだ取れていません。回答は端末に保管され、再送できます。');
}
export async function queueAndSend(record,level){
 let config;try{config=await collectionConfig();}catch(e){const queue=readOutbox();if(!queue.some(r=>r.id===record.id)){queue.push({...record,levelVersion:null});writeOutbox(queue);}throw e;}if(!config.enabled)return {status:'local'};
 let versioned;
 try{versioned=await attachLevelVersion(record,level);}catch(e){versioned={...record,levelVersion:null};}
 const queue=readOutbox();if(!queue.some(r=>r.id===record.id)){queue.push(versioned);writeOutbox(queue);}
 if(!versioned.levelVersion)throw new Error('回答は端末に保管済みです。管理者が関卡バージョンを設定した後に再送してください。');
 return sendPending(record.id);
}
export async function retryPending(record,level){
 const queue=readOutbox();let index=queue.findIndex(r=>r.id===record.id);if(index<0){queue.push({...record,levelVersion:null});index=queue.length-1;}
 if(index>=0&&!queue[index].levelVersion){queue[index]=await attachLevelVersion(queue[index],level);writeOutbox(queue);}
 return sendPending(record.id);
}
export async function cloudAggregate(level,options){
 const config=await collectionConfig();const request=await attachLevelVersion({recordingId:level.recordingId||`${level.id}-recording-v1`},level);
 const result=await jsonp(config.endpoint,{action:'stats',levelId:level.id,recordingId:request.recordingId,levelVersion:request.levelVersion,studyMode:options.studyMode||'test'},config.timeoutMs||30000);
 if(!result.ok)throw new Error('集団データを取得できませんでした');return result.aggregate;
}

export async function retryAllPending(){
 const rows=[...readOutbox()];let synced=0;
 for(const row of rows){const result=await retryPending(row,{id:row.levelId,recordingId:row.recordingId});if(result.status==='synced')synced++;}
 return synced;
}
