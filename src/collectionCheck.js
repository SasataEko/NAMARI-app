import {collectionConfig,queueAndSend,cloudAggregate,readOutbox,retryAllPending} from './data/cloudCollection.js';
import {participantId} from './data/explorationStore.js';
export function mountCollectionCheck(root){
 root.innerHTML='<main class="page-shell"><section class="explore-card"><h1>Google Sheets 接続チェック</h1><p>接続テストでは診断用のお試し回答のみ送信し、研究集計には含めません。</p><button class="outline-button" data-check>送信・受領確認・集計をテスト</button><button class="text-action" data-resend>未送信の回答を再送</button><pre data-report style="white-space:pre-wrap"></pre><a href="./">ゲームに戻る</a></section></main>';
 const report=root.querySelector('[data-report]');
 root.querySelector('[data-check]').onclick=async()=>{
 const button=root.querySelector('[data-check]');button.disabled=true;
 try{const c=await collectionConfig();if(!c.enabled)throw new Error('public/content/collection.jsonで収集を有効にし、公開済みのexec URLを設定してください。');
 const list=await fetch(`${import.meta.env.BASE_URL}content/study-manifest.json`,{cache:'no-store'}).then(r=>r.json()),l=list[0];
 report.textContent='1. 回答を送信し、受領の確認を待っています…';
 const record={id:crypto.randomUUID(),schemaVersion:3,participantId:participantId(),studyMode:'test',levelId:l.levelId,recordingId:l.recordingId,createdAt:new Date().toISOString(),noticed:l.characters.map(()=>false),pattern:l.characters.map(()=>null),pitch:l.defaultAccent,beats:l.characters.map(()=>1),blanks:l.characters.slice(1).map(()=>false),skipped:false,answerStatus:'no_difference',audioPlayed:false,listenedMs:0,responseDurationMs:0,diagnostic:true};
 const saved=await queueAndSend(record,{id:l.levelId,recordingId:l.recordingId});
 report.textContent=`1. 受領確認：${saved.status}\n2. 最新集計を取得しています…`;
 const g=await cloudAggregate({id:l.levelId,recordingId:l.recordingId},{studyMode:'test'});
 report.textContent=`成功：送信 → 受領確認 → 最新集計。\n取得元：${g.source}\n集計人数：${g.count}\n少人数のため非表示：${!!g.suppressed}\n未送信：${readOutbox().length}\nRaw/Auditで診断記録を確認できます。集計には含まれません。`;
 }catch(e){report.textContent=`失敗：${e.message}\n未送信の記録：${readOutbox().length}。接続が戻ったら再送できます。`;}finally{button.disabled=false;}
 };
 root.querySelector('[data-resend]').onclick=async()=>{try{report.textContent=`已确认${await retryAllPending()}条；剩余${readOutbox().length}条`;}catch(e){report.textContent=e.message;}};
}
