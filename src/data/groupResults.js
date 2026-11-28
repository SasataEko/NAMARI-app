// One eligible completed expression per anonymous participant. Raw submissions stay append-only.
export const groupPolicy='latest_completed_participant_v2';
export function participantExpressions(rows){
 const latest=new Map();
 for(const row of rows){if(row.skipped||row.completed===false||row.completionStatus==='incomplete')continue;const prior=latest.get(row.participantId);if(!prior||String(row.createdAt||'')>=String(prior.createdAt||''))latest.set(row.participantId,row);}
 return [...latest.values()];
}
export function markedColor(value){const t=Math.max(0,Math.min(1,Number(value)||0));return 'rgb('+[26,27,29].map((c,i)=>Math.round(c+([229,35,91][i]-c)*t)).join(',')+')';}
export function kanaStatistics(group,index){const total=group?.count||0;const marked=group?.noticedCounts?.[index]??Math.round((group?.noticedRates?.[index]||0)*total);return {total,marked,rate:total?marked/total:null,unspecified:group?.unspecifiedCounts?.[index]??Math.round((group?.unspecifiedRates?.[index]||0)*total),patterns:Object.entries(group?.featureRates?.[index]||{}).map(([id,rate])=>({id,count:group?.patternCounts?.[index]?.[id]??Math.round(rate*total),rate})).filter(p=>p.count>0)};}
