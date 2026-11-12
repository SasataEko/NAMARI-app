// Execute this project as its owner. Keep the bound spreadsheet PRIVATE.
var RAW_HEADERS_=['submission_id','received_at','participant_id','study_mode','recording_id','level_id','level_version','noticed_json','pattern_json','pitch_json','beats_json','blanks_json','audio_played','response_ms','quality_flag_json','payload_json'];
var RULES_={version:'2026-11-11-v1',minResponseMs:1500,maxResponseMs:3600000,minListenedMs:500,excludeFlags:['invalid_response','audio_not_played','too_fast','insufficient_listening','control_trial','diagnostic'],includeSkipped:true,includeUncertain:true};
function spreadsheet_(){var id=PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');if(!id)throw new Error('OWNER_SETUP_REQUIRED');return SpreadsheetApp.openById(id);}
function sheet_(name){var s=spreadsheet_().getSheetByName(name);if(!s)throw new Error('OWNER_SETUP_REQUIRED');return s;}
function setup_(){
 var props=PropertiesService.getScriptProperties();if(!props.getProperty('SERVER_PEPPER'))props.setProperty('SERVER_PEPPER',Utilities.getUuid()+Utilities.getUuid());
 var ss=spreadsheet_();['Raw','Audit'].forEach(function(name){var s=ss.getSheetByName(name)||ss.insertSheet(name);if(!s.getLastRow()){s.appendRow(RAW_HEADERS_);s.setFrozenRows(1);s.getRange(1,1,1,RAW_HEADERS_.length).setFontWeight('bold');}});
 var ids=ss.getSheetByName('_Identities')||ss.insertSheet('_Identities');if(!ids.getLastRow())ids.appendRow(['participant_id','key_hash']);
 // Do not change sharing here: confirm General access = Restricted in Google Sheets.
}
function rows_(name){var data=sheet_(name).getDataRange().getValues();return data.slice(1).filter(function(r){return r[0];});}
function hex_(bytes){return bytes.map(function(b){return ('0'+((b+256)%256).toString(16)).slice(-2);}).join('');}
function hash_(value){return hex_(Utilities.computeHmacSha256Signature(value,PropertiesService.getScriptProperties().getProperty('SERVER_PEPPER')));}
function definition_(q){var list=typeof LEVEL_MANIFEST==='undefined'?[]:LEVEL_MANIFEST;var found=list.filter(function(l){return l.levelId===q.levelId&&l.recordingId===q.recordingId&&l.levelVersion===q.levelVersion;})[0];if(!found)throw new Error('UNKNOWN_LEVEL_VERSION');return found;}
function validate_(p,l){
 var n=l.characters.length;function array(v,len,predicate){return Array.isArray(v)&&v.length===len&&v.every(predicate);}
 if(!/^[a-zA-Z0-9-]{16,80}$/.test(p.id)||!/^[a-zA-Z0-9-]{16,80}$/.test(p.participantId)||!['test','research'].includes(p.studyMode))throw new Error('INVALID_RESPONSE');
 if(!array(p.noticed,n,function(v){return typeof v==='boolean';})||!array(p.pattern,n,function(v,i){return v===null||(p.noticed[i]&&l.characters[i].patterns.includes(v));})||!array(p.pitch,n,function(v){return v==='high'||v==='low';})||!array(p.beats,n,function(v){return v===1||v===2;})||!array(p.blanks,Math.max(0,n-1),function(v){return typeof v==='boolean';}))throw new Error('INVALID_RESPONSE');
 if(typeof p.createdAt!=='string'||!/^\d{4}-\d{2}-\d{2}T/.test(p.createdAt)||!Number.isFinite(Date.parse(p.createdAt)))throw new Error('INVALID_TIME');
 if(typeof p.audioPlayed!=='boolean'||!Number.isFinite(p.responseDurationMs)||p.responseDurationMs<0||!Number.isFinite(p.listenedMs)||p.listenedMs<0||!['explored','no_difference','uncertain'].includes(p.answerStatus)||typeof p.skipped!=='boolean')throw new Error('INVALID_RESPONSE');
}
function flags_(p,l){var f=[];if(p.diagnostic)f.push('diagnostic');if(!p.audioPlayed)f.push('audio_not_played');if(p.responseDurationMs<RULES_.minResponseMs)f.push('too_fast');if(p.responseDurationMs>RULES_.maxResponseMs)f.push('long_response');if(p.listenedMs<RULES_.minListenedMs)f.push('insufficient_listening');if(l.qualityCheck)f.push('control_trial');return f;}
function save_(request){
 var p=request.response,l=definition_(p);validate_(p,l);if(typeof request.participantKey!=='string'||!/^[a-zA-Z0-9-]{32,150}$/.test(request.participantKey))throw new Error('INVALID_KEY');
 var lock=LockService.getScriptLock();lock.waitLock(20000);try{
 var identities=rows_('_Identities'),identity=identities.filter(function(r){return r[0]===p.participantId;})[0],hashed=hash_(request.participantKey);
 if(identity&&identity[1]!==hashed)throw new Error('IDENTITY_MISMATCH');
 if(!identity)sheet_('_Identities').appendRow([p.participantId,hashed]);
 // Request IDs are idempotent, including retries after an ambiguous network timeout.
 if(rows_('Audit').some(function(r){return r[0]===p.id;}))return;
 p.quality_flag=flags_(p,l);p.qualityRulesVersion=RULES_.version;p.qualityRulesSnapshot=RULES_;
 // Store only explicit study data. Never persist the participant credential or client-supplied formulas.
 var saved={diagnostic:!!p.diagnostic,id:p.id,schemaVersion:3,participantId:p.participantId,studyMode:p.studyMode,recordingId:p.recordingId,levelId:p.levelId,levelVersion:p.levelVersion,noticed:p.noticed,pattern:p.pattern,pitch:p.pitch,beats:p.beats,blanks:p.blanks,skipped:p.skipped,answerStatus:p.answerStatus,audioPlayed:p.audioPlayed,audioCompleted:!!p.audioCompleted,audioPlayCount:Number(p.audioPlayCount)||0,listenedMs:p.listenedMs,responseDurationMs:p.responseDurationMs,createdAt:p.createdAt,quality_flag:p.quality_flag,qualityRulesVersion:RULES_.version};
 var row=[p.id,new Date().toISOString(),p.participantId,p.studyMode,p.recordingId,p.levelId,p.levelVersion,JSON.stringify(p.noticed),JSON.stringify(p.pattern),JSON.stringify(p.pitch),JSON.stringify(p.beats),JSON.stringify(p.blanks),p.audioPlayed,p.responseDurationMs,JSON.stringify(p.quality_flag),JSON.stringify(saved)];
 var raw=sheet_('Raw'),data=raw.getDataRange().getValues(),at=-1;
 for(var i=1;i<data.length;i++){var r=data[i];if(r[2]===p.participantId&&r[3]===p.studyMode&&r[4]===p.recordingId&&r[5]===p.levelId&&r[6]===p.levelVersion){at=i+1;break;}}
 if(at>0){var prior=JSON.parse(data[at-1][15]);if(String(p.createdAt)>=String(prior.createdAt))raw.getRange(at,1,1,row.length).setValues([row]);}else raw.appendRow(row);
 sheet_('Audit').appendRow(row);SpreadsheetApp.flush();
 }finally{lock.releaseLock();}
}
function stats_(q){
 var l=definition_(q);if(!['test','research'].includes(q.studyMode))throw new Error('INVALID_MODE');
 var latest={};rows_('Raw').forEach(function(r){if(r[3]!==q.studyMode||r[4]!==l.recordingId||r[5]!==l.levelId||r[6]!==l.levelVersion)return;try{var p=JSON.parse(r[15]);p.noticed=JSON.parse(r[7]);p.pattern=JSON.parse(r[8]);p.pitch=JSON.parse(r[9]);p.beats=JSON.parse(r[10]);p.blanks=JSON.parse(r[11]);p.audioPlayed=r[12]===true;p.responseDurationMs=Number(r[13]);validate_(p,l);latest[p.participantId]=p;}catch(e){}});
 var values=Object.keys(latest).map(function(k){return latest[k];}).filter(function(p){return p.qualityRulesVersion===RULES_.version&&!flags_(p,l).some(function(f){return RULES_.excludeFlags.includes(f);})&&(RULES_.includeSkipped||!p.skipped)&&(RULES_.includeUncertain||p.answerStatus!=='uncertain');});
 var count=values.length,minCount=Number(PropertiesService.getScriptProperties().getProperty('MIN_AGGREGATE_COUNT')||3);
 if(count<Math.max(3,minCount))return {count:count,suppressed:true,source:'google-sheets',aggregation:'mean'};
 var g={count:count,source:'google-sheets',aggregation:'mean',features:[],pattern:[],noticed:[],noticedRates:[],unspecifiedRates:[],intensity:[],featureRates:[],pitch:[],beats:[],blanks:[]};
 var avg=function(fn){return values.reduce(function(sum,p){return sum+fn(p);},0)/count;};
 l.characters.forEach(function(c,i){var rates={};c.patterns.forEach(function(id){rates[id]=avg(function(p){return !p.skipped&&p.pattern[i]===id?1:0;});});g.features.push(null);g.pattern.push(null);g.featureRates.push(rates);g.intensity.push(Object.keys(rates).reduce(function(sum,k){return sum+rates[k];},0));var noticed=avg(function(p){return !p.skipped&&p.noticed[i]?1:0;});g.noticed.push(noticed>0);g.noticedRates.push(noticed);g.unspecifiedRates.push(avg(function(p){return !p.skipped&&p.noticed[i]&&p.pattern[i]===null?1:0;}));g.pitch.push(avg(function(p){return (p.skipped?l.defaultAccent[i]:p.pitch[i])==='high'?1:0;}));g.beats.push(avg(function(p){return p.skipped?1:p.beats[i];}));if(i<l.characters.length-1)g.blanks.push(avg(function(p){return !p.skipped&&p.blanks[i]?1:0;}));});return g;
}
function doPost(e){
 var request;try{if(!e.postData||e.postData.contents.length>24000)throw new Error('INVALID_REQUEST');request=JSON.parse(e.postData.contents);if(request.action!=='submit')throw new Error('INVALID_ACTION');save_(request);return ContentService.createTextOutput('{"ok":true}').setMimeType(ContentService.MimeType.JSON);}catch(error){
 if(request&&request.response&&/^[a-zA-Z0-9-]{16,80}$/.test(request.response.id))CacheService.getScriptCache().put('reject:'+request.response.id,'SUBMISSION_REJECTED',120);
 return ContentService.createTextOutput('{"ok":false}').setMimeType(ContentService.MimeType.JSON);
 }
}
function doGet(e){
 var q=e.parameter||{},callback=q.callback;
 if(!/^namari_[a-f0-9]{16,64}$/.test(callback||''))return ContentService.createTextOutput('Invalid callback');
 var data;try{
 if(q.action==='stats')data={ok:true,aggregate:stats_(q)};
 else if(q.action==='receipt'&&/^[a-zA-Z0-9-]{16,80}$/.test(q.submissionId||'')){var received=rows_('Audit').some(function(r){return r[0]===q.submissionId;});data={ok:true,received:received,rejected:!received&&!!CacheService.getScriptCache().get('reject:'+q.submissionId)};}
 else data={ok:false,error:'INVALID_ACTION'};
 }catch(error){data={ok:false,error:'REQUEST_FAILED'};}
 // No endpoint exposes rows, participant IDs, credentials, update-by-row or delete.
 var json=JSON.stringify(data).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
 return ContentService.createTextOutput(callback+'('+json+');').setMimeType(ContentService.MimeType.JAVASCRIPT);
}
