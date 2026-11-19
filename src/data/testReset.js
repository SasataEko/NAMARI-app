
// Explicit owner-requested one-time reset. Never clear storage or remove authoring data.
export const TEST_RESET_ID='owner-test-reset-2026-11-19-v1';
export const TEST_RESET_BEFORE='2026-11-19T03:40:23.564Z';
const marker='kotoba-applied-test-reset-v1';
export function applyTestReset(storage){
 if(storage.getItem(marker)===TEST_RESET_ID)return {alreadyApplied:true,removed:0};
 let removed=0;const counts={};
 for(const key of ['kotoba-exploration-raw-v3','kotoba-mode1-responses-v1','kotoba-study-events-v1','kotoba-cloud-outbox-v1']){
  const text=storage.getItem(key);if(!text)continue;const rows=JSON.parse(text);if(!Array.isArray(rows))throw Error('保存データを確認してください：'+key);
  const keep=rows.filter(r=>{if(r.studyMode!=='test'&&r.study_mode!=='test')return true;const timestamp=r.createdAt||r.submitted_at||r.startedAt;return timestamp&&Number.isFinite(Date.parse(timestamp))&&Date.parse(timestamp)>Date.parse(TEST_RESET_BEFORE);});counts[key]=rows.length-keep.length;removed+=counts[key];storage.setItem(key,JSON.stringify(keep));
 }
 // Repeat the explanatory introduction during the upcoming walkthrough; keep identities and consent.
 storage.removeItem('kotoba-mode-intro-v1-mode1');storage.removeItem('kotoba-mode-intro-v1-mode2');
 storage.setItem('kotoba-last-test-reset-report-v1',JSON.stringify({id:TEST_RESET_ID,removed,counts,at:new Date().toISOString()}));storage.setItem(marker,TEST_RESET_ID);
 return {alreadyApplied:false,removed,counts};
}
