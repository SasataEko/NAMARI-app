// Execute this project as its owner. Keep the bound spreadsheet PRIVATE.
var RAW_HEADERS_=['submission_id','received_at','participant_id','study_mode','recording_id','level_id','level_version','noticed_json','pattern_json','pitch_json','beats_json','blanks_json','audio_played','response_ms','quality_flag_json','payload_json','game_mode','completed','accuracy','error_count','attempt_count'];
var RULES_={version:'2026-11-11-v1',minResponseMs:1500,maxResponseMs:3600000,minListenedMs:500,excludeFlags:['invalid_response','audio_not_played','too_fast','insufficient_listening','control_trial','diagnostic'],includeSkipped:true,includeUncertain:true};
function spreadsheet_(){var id=PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');if(!id)throw new Error('OWNER_SETUP_REQUIRED');return SpreadsheetApp.openById(id);}
function sheet_(name){var s=spreadsheet_().getSheetByName(name);if(!s)throw new Error('OWNER_SETUP_REQUIRED');return s;}
// Owner editor entry points have no trailing underscore. Internal compatibility aliases remain private.
function setupSpecs_(){
 var specs={Raw:RAW_HEADERS_,Audit:RAW_HEADERS_,_Identities:['participant_id','key_hash']};
 if(typeof MODE1_HEADERS_!=='undefined'){
  specs.Mode1Raw=MODE1_HEADERS_;specs.Mode1Audit=MODE1_HEADERS_;
  specs.Mode1Summary=['study_mode','recording_id','level_id','level_version','participants','completed','completion_rate','attempts','correct','errors','accuracy','first_attempt_accuracy','unclear_feedback_count','unclear_feedback_rate','updated_at'];
  specs.Mode2Summary=['study_mode','recording_id','level_id','level_version','participants','completed','skipped','completion_rate','accuracy','error_count','updated_at'];
 }
 if(typeof RESEARCH_HEADERS_!=='undefined')Object.keys(RESEARCH_HEADERS_).forEach(function(name){specs[name]=RESEARCH_HEADERS_[name];});
 if(typeof SURVEY_HEADERS_!=='undefined')specs.SurveyResponses=SURVEY_HEADERS_;
 return specs;
}
function validateSetupHeaders_(ss,specs){
 Object.keys(specs).forEach(function(name){var s=ss.getSheetByName(name);if(!s||!s.getLastRow())return;var actual=s.getDataRange().getValues()[0],expected=specs[name];if(JSON.stringify(actual.slice(0,expected.length))!==JSON.stringify(expected))throw new Error('HEADER_MISMATCH:'+name+'; existing cells were not changed');});
}
function setup(){
 var ss=spreadsheet_(),specs=setupSpecs_();validateSetupHeaders_(ss,specs);
 // Preflight every existing header before any sheet/property mutation; never rewrite populated headers.
 var props=PropertiesService.getScriptProperties();if(!props.getProperty('SERVER_PEPPER'))props.setProperty('SERVER_PEPPER',Utilities.getUuid()+Utilities.getUuid());
 Object.keys(specs).forEach(function(name){var s=ss.getSheetByName(name)||ss.insertSheet(name);if(!s.getLastRow()){s.appendRow(specs[name]);s.setFrozenRows(1);}});
 return verifySetup();
}
function verifySetup(){
 var ss=spreadsheet_(),specs=setupSpecs_();validateSetupHeaders_(ss,specs);
 var missing=Object.keys(specs).filter(function(name){var s=ss.getSheetByName(name);return !s||!s.getLastRow();});if(missing.length)throw new Error('SETUP_REQUIRED:'+missing.join(','));
 var report={ok:true,mode1_registry_count:typeof MODE1_MANIFEST==='undefined'?0:MODE1_MANIFEST.length,mode2_registry_count:typeof LEVEL_MANIFEST==='undefined'?0:LEVEL_MANIFEST.length,sheets:Object.keys(specs),research_enabled:typeof researchEnabled_==='function'?researchEnabled_():false};
 console.log(JSON.stringify(report));return report;
}
function setup_(){return setup();}
function rows_(name){var data=sheet_(name).getDataRange().getValues();return data.slice(1).filter(function(r){return r[0];});}
function hex_(bytes){return bytes.map(function(b){return ('0'+((b+256)%256).toString(16)).slice(-2);}).join('');}
function hash_(value){return hex_(Utilities.computeHmacSha256Signature(value,PropertiesService.getScriptProperties().getProperty('SERVER_PEPPER')));}
function definition_(q){var list=typeof LEVEL_MANIFEST==='undefined'?[]:LEVEL_MANIFEST;var found=list.filter(function(l){return l.levelId===q.levelId&&l.recordingId===q.recordingId&&l.levelVersion===q.levelVersion;})[0];if(!found)throw new Error('UNKNOWN_LEVEL_VERSION');return found;}
function validate_(p,l){
 if(typeof validateMode2Visual_==='function')validateMode2Visual_(p,l);
 if(p.gameMode&&p.gameMode!=='mode2')throw new Error('INVALID_GAME_MODE');
 var n=l.characters.length;function array(v,len,predicate){return Array.isArray(v)&&v.length===len&&v.every(predicate);}
 if(!/^[a-zA-Z0-9-]{16,80}$/.test(p.id)||!/^[a-zA-Z0-9-]{16,80}$/.test(p.participantId)||!['test','research'].includes(p.studyMode))throw new Error('INVALID_RESPONSE');
 if(!array(p.noticed,n,function(v){return typeof v==='boolean';})||!array(p.pattern,n,function(v,i){return v===null||(p.noticed[i]&&l.characters[i].patterns.includes(v));})||!array(p.pitch,n,function(v){return v==='high'||v==='low';})||!array(p.beats,n,function(v){return v===0||v===1||v===2;})||!array(p.blanks,Math.max(0,n-1),function(v){return typeof v==='boolean';}))throw new Error('INVALID_RESPONSE');
 if(typeof p.createdAt!=='string'||!/^\d{4}-\d{2}-\d{2}T/.test(p.createdAt)||!Number.isFinite(Date.parse(p.createdAt)))throw new Error('INVALID_TIME');
 if(typeof p.audioPlayed!=='boolean'||!Number.isFinite(p.responseDurationMs)||p.responseDurationMs<0||!Number.isFinite(p.listenedMs)||p.listenedMs<0||!['explored','no_difference','uncertain'].includes(p.answerStatus)||typeof p.skipped!=='boolean')throw new Error('INVALID_RESPONSE');
}
function flags_(p,l){var f=[];if(p.diagnostic)f.push('diagnostic');if(!p.audioPlayed)f.push('audio_not_played');if(p.responseDurationMs<RULES_.minResponseMs)f.push('too_fast');if(p.responseDurationMs>RULES_.maxResponseMs)f.push('long_response');if(p.listenedMs<RULES_.minListenedMs)f.push('insufficient_listening');if(l.qualityCheck)f.push('control_trial');return f;}
function save_(request){
 var p=request.response,l=definition_(p);validate_(p,l);if(typeof request.participantKey!=='string'||!/^[a-zA-Z0-9-]{32,150}$/.test(request.participantKey))throw new Error('INVALID_KEY');
 var lock=LockService.getScriptLock();lock.waitLock(20000);try{
 if(p.studyMode==='research'){if(typeof requireResearchConsent_!=='function')throw new Error('CONSENT_EXTENSION_REQUIRED');requireResearchConsent_(p);}
 var identities=rows_('_Identities'),identity=identities.filter(function(r){return r[0]===p.participantId;})[0],hashed=hash_(request.participantKey);
 if(identity&&identity[1]!==hashed)throw new Error('IDENTITY_MISMATCH');
 if(!identity)sheet_('_Identities').appendRow([p.participantId,hashed]);
 // Request IDs are idempotent, including retries after an ambiguous network timeout.
 if(rows_('Audit').some(function(r){return r[0]===p.id;}))return;
 p.quality_flag=flags_(p,l);p.qualityRulesVersion=RULES_.version;p.qualityRulesSnapshot=RULES_;
 // Store only explicit study data. Never persist the participant credential or client-supplied formulas.
 var saved={gameMode:'mode2',completed:!p.skipped,completionStatus:p.skipped?'skipped':'completed',accuracy:null,errorCount:null,diagnostic:!!p.diagnostic,id:p.id,schemaVersion:3,participantId:p.participantId,studyMode:p.studyMode,recordingId:p.recordingId,levelId:p.levelId,levelVersion:p.levelVersion,noticed:p.noticed,pattern:p.pattern,pitch:p.pitch,beats:p.beats,blanks:p.blanks,skipped:p.skipped,answerStatus:p.answerStatus,audioPlayed:p.audioPlayed,audioCompleted:!!p.audioCompleted,audioPlayCount:Number(p.audioPlayCount)||0,listenedMs:p.listenedMs,responseDurationMs:p.responseDurationMs,createdAt:p.createdAt,quality_flag:p.quality_flag,qualityRulesVersion:RULES_.version};
 if(typeof researchTrialExtras_==='function')Object.assign(saved,researchTrialExtras_(p));
 if(typeof mode2VisualExtras_==='function')Object.assign(saved,mode2VisualExtras_(p,l));
 var row=[p.id,new Date().toISOString(),p.participantId,p.studyMode,p.recordingId,p.levelId,p.levelVersion,JSON.stringify(p.noticed),JSON.stringify(p.pattern),JSON.stringify(p.pitch),JSON.stringify(p.beats),JSON.stringify(p.blanks),p.audioPlayed,p.responseDurationMs,JSON.stringify(p.quality_flag),JSON.stringify(saved),'mode2',!p.skipped,'','',''];
 var raw=sheet_('Raw'),data=raw.getDataRange().getValues(),at=-1;
 for(var i=1;i<data.length;i++){var r=data[i];if(r[0]===p.id){at=i+1;break;}}
 if(at>0){var prior=JSON.parse(data[at-1][15]);if(String(p.createdAt)>=String(prior.createdAt))raw.getRange(at,1,1,row.length).setValues([row]);}else raw.appendRow(row);
 sheet_('Audit').appendRow(row);SpreadsheetApp.flush();if(typeof refreshMode2Summary_==='function')refreshMode2Summary_(true);
 }finally{lock.releaseLock();}
}
function stats_(q){
 if(typeof refreshMode2Summary_==='function')refreshMode2Summary_();
 var l=definition_(q);if(!['test','research'].includes(q.studyMode))throw new Error('INVALID_MODE');
 var latest={};rows_('Raw').forEach(function(r){if(r[3]!==q.studyMode||r[4]!==l.recordingId||r[5]!==l.levelId||r[6]!==l.levelVersion)return;try{var p=JSON.parse(r[15]);p.noticed=JSON.parse(r[7]);p.pattern=JSON.parse(r[8]);p.pitch=JSON.parse(r[9]);p.beats=JSON.parse(r[10]);p.blanks=JSON.parse(r[11]);p.audioPlayed=r[12]===true;p.responseDurationMs=Number(r[13]);validate_(p,l);latest[p.id]=p;}catch(e){}});
 var values=Object.keys(latest).map(function(k){return latest[k];}).filter(function(p){return (p.studyMode!=='research'||(typeof hasResearchConsent_==='function'&&hasResearchConsent_(p)))&&p.qualityRulesVersion===RULES_.version&&!flags_(p,l).some(function(f){return RULES_.excludeFlags.includes(f);})&&(RULES_.includeSkipped||!p.skipped)&&(RULES_.includeUncertain||p.answerStatus!=='uncertain');});
 var count=values.length,participantIds={};values.forEach(function(p){participantIds[p.participantId]=true;});var participantCount=Object.keys(participantIds).length; // Mode2 may show an aggregate from one eligible participant, including self.
 if(count<1)return {count:count,participantCount:participantCount,aggregationPolicy:'all_submissions_v1',suppressed:true,source:'google-sheets',aggregation:'mean'};
 var g={count:count,participantCount:participantCount,aggregationPolicy:'all_submissions_v1',source:'google-sheets',aggregation:'mean',otherAnswersAvailable:values.some(function(p){return p.participantId!==q.viewerId;}),features:[],pattern:[],noticed:[],noticedRates:[],unspecifiedRates:[],intensity:[],featureRates:[],pitch:[],beats:[],omissionRates:[],blanks:[]};
 var avg=function(fn){return values.reduce(function(sum,p){return sum+fn(p);},0)/count;};
 l.characters.forEach(function(c,i){var rates={};c.patterns.forEach(function(id){rates[id]=avg(function(p){return !p.skipped&&p.pattern[i]===id?1:0;});});g.features.push(null);g.pattern.push(null);g.featureRates.push(rates);g.intensity.push(Object.keys(rates).reduce(function(sum,k){return sum+rates[k];},0));var noticed=avg(function(p){return !p.skipped&&p.noticed[i]?1:0;});g.noticed.push(noticed>0);g.noticedRates.push(noticed);g.unspecifiedRates.push(avg(function(p){return !p.skipped&&p.noticed[i]&&p.pattern[i]===null?1:0;}));g.pitch.push(avg(function(p){return (p.skipped?l.defaultAccent[i]:p.pitch[i])==='high'?1:0;}));g.beats.push(avg(function(p){return p.skipped?1:p.beats[i];}));g.omissionRates.push(avg(function(p){return !p.skipped&&p.beats[i]===0?1:0;}));if(i<l.characters.length-1)g.blanks.push(avg(function(p){return !p.skipped&&p.blanks[i]?1:0;}));});return typeof mode2VisualStats_==='function'?mode2VisualStats_(g,values,l):g;
}
function doPost(e){
 var request;try{if(!e.postData||e.postData.contents.length>262144)throw new Error('INVALID_REQUEST');request=JSON.parse(e.postData.contents);if(request.action==='submit_study_event')saveStudyEvent_(request);else if(request.action==='submit_mode1')saveMode1_(request);else if(request.action==='submit'){if(e.postData.contents.length>24000)throw new Error('INVALID_REQUEST');save_(request);}else throw new Error('INVALID_ACTION');return ContentService.createTextOutput('{"ok":true}').setMimeType(ContentService.MimeType.JSON);}catch(error){
 if(request&&request.response&&/^[a-zA-Z0-9-]{16,80}$/.test(request.response.id))CacheService.getScriptCache().put('reject:'+request.response.id,'SUBMISSION_REJECTED',120);
 return ContentService.createTextOutput('{"ok":false}').setMimeType(ContentService.MimeType.JSON);
 }
}
function doGet(e){
 var q=e.parameter||{},callback=q.callback;
 if(!/^namari_[a-f0-9]{16,64}$/.test(callback||''))return ContentService.createTextOutput('Invalid callback');
 var data;try{
 if(q.action==='stats')data={ok:true,aggregate:stats_(q)};
 else if(q.action==='stats_mode1')data={ok:true,aggregate:mode1Stats_(q)};
 else if(q.action==='receipt'&&/^[a-zA-Z0-9-]{16,80}$/.test(q.submissionId||'')){var received=(typeof RESEARCH_HEADERS_!=='undefined'&&spreadsheet_().getSheetByName('ResearchAudit')&&rows_('ResearchAudit').some(function(r){return r[0]===q.submissionId;}))||rows_('Audit').some(function(r){return r[0]===q.submissionId;})||(typeof MODE1_HEADERS_!=='undefined'&&rows_('Mode1Audit').some(function(r){return r[0]===q.submissionId;}));data={ok:true,received:received,rejected:!received&&!!CacheService.getScriptCache().get('reject:'+q.submissionId)};}
 else data={ok:false,error:'INVALID_ACTION'};
 }catch(error){data={ok:false,error:'REQUEST_FAILED'};}
 // No endpoint exposes rows, participant IDs, credentials, update-by-row or delete.
 var json=JSON.stringify(data).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
 return ContentService.createTextOutput(callback+'('+json+');').setMimeType(ContentService.MimeType.JAVASCRIPT);
}

// Owner-only editor action; not exposed by doGet/doPost and does not enable research.
function setupCurrentDataSystem(){setup_();setupResearchExtension_();refreshMode1Summary_();refreshMode2Summary_();}
