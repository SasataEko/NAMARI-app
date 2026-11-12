import {collectionConfig,queueAndSend,cloudAggregate,readOutbox,retryAllPending} from './data/cloudCollection.js';
import {participantId} from './data/explorationStore.js';
export function mountCollectionCheck(root){
 root.innerHTML='<main class="page-shell"><section class="explore-card"><h1>Google Sheets 接続チェック</h1><p>跨域测试只提交标为 diagnostic 的试玩记录，不进入研究统计。</p><button class="outline-button" data-check>测试跨域提交、回执与汇总</button><button class="text-action" data-resend>重试未发送队列</button><pre data-report style="white-space:pre-wrap"></pre><a href="./">返回游戏</a></section></main>';
 const report=root.querySelector('[data-report]');
 root.querySelector('[data-check]').onclick=async()=>{
 const button=root.querySelector('[data-check]');button.disabled=true;
 try{const c=await collectionConfig();if(!c.enabled)throw new Error('请先在public/content/collection.json启用并填写部署的exec URL');
 const list=await fetch(`${import.meta.env.BASE_URL}content/study-manifest.json`,{cache:'no-store'}).then(r=>r.json()),l=list[0];
 report.textContent='1. 发出普通POST；等待JSONP回执（不是把opaque响应当成功）…';
 const record={id:crypto.randomUUID(),schemaVersion:3,participantId:participantId(),studyMode:'test',levelId:l.levelId,recordingId:l.recordingId,createdAt:new Date().toISOString(),noticed:l.characters.map(()=>false),pattern:l.characters.map(()=>null),pitch:l.defaultAccent,beats:l.characters.map(()=>1),blanks:l.characters.slice(1).map(()=>false),skipped:false,answerStatus:'no_difference',audioPlayed:false,listenedMs:0,responseDurationMs:0,diagnostic:true};
 const saved=await queueAndSend(record,{id:l.levelId,recordingId:l.recordingId});
 report.textContent=`1. 回执确认：${saved.status}\n2. 请求最新汇总…`;
 const g=await cloudAggregate({id:l.levelId,recordingId:l.recordingId},{studyMode:'test'});
 report.textContent=`成功：POST → JSONP回执 → 最新统计。\n来源：${g.source}\n纳入人数：${g.count}\n低样本隐藏：${!!g.suppressed}\n待发队列：${readOutbox().length}\n请在Raw/Audit核对此diagnostic记录；它不会纳入统计。`;
 }catch(e){report.textContent=`失败：${e.message}\n待发送记录：${readOutbox().length}。可恢复网络后重试。`;}finally{button.disabled=false;}
 };
 root.querySelector('[data-resend]').onclick=async()=>{try{report.textContent=`已确认${await retryAllPending()}条；剩余${readOutbox().length}条`;}catch(e){report.textContent=e.message;}};
}
