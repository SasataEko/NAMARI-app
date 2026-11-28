import {participantId} from './participantIdentity.js';
import {APP_VERSION,studyMetadata} from './researchState.js';
import {queueAndSend} from './cloudCollection.js';
const KEY='kotoba-study-events-v1';
export function readStudyEvents(){return JSON.parse(localStorage.getItem(KEY)||'[]');}
export async function saveStudyEvent(event,{waitForSync=false}={}){
  const record={schemaType:'study_event',schemaVersion:1,id:crypto.randomUUID(),participantId:participantId(),studyMode:'test',gameMode:'overall',chapter:'experience',submitted_at:new Date().toISOString(),app_version:APP_VERSION,...studyMetadata(event.studyMode||'test',event.gameMode||'overall',event.chapter||'experience'),...structuredClone(event)};
  if(!['test','research'].includes(record.studyMode))throw Error('INVALID_MODE');
  const rows=readStudyEvents();const prior=rows.findIndex(r=>r.id===record.id);if(prior>=0)rows[prior]=record;else rows.push(record);localStorage.setItem(KEY,JSON.stringify(rows));
  if(record.local_only){record.sync={status:'local'};return record;}
  record.sync={status:'pending'};const sending=queueAndSend(record,{id:'study-event'}).then(sync=>{record.sync=sync;return record;}).catch(e=>{record.sync={status:'pending',error:e.message};return record;});
  if(waitForSync)await sending;return record;
}
