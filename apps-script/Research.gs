// Additive research extension. Run setupResearchExtension_ explicitly as the owner.
// Never changes the columns of Raw, Audit, Mode1Raw, Mode1Audit or the existing summaries.
var RESEARCH_HEADERS_={
 Participants:['participant_id','study_mode','consent_version','consented_at','consent_status','withdrawn_at','language_background','japanese_learning_experience','background_status','updated_at','app_version','payload_json'],
 ChapterRatings:['submission_id','participant_id','study_mode','game_mode','chapter','visual_helpfulness','response_status','submitted_at','app_version','scope_id','consent_version','consented_at'],
 ExperienceFeedback:['submission_id','participant_id','study_mode','feedback_text','response_status','submitted_at','app_version','scope_id','consent_version','consented_at'],
 ResearchAudit:['submission_id','received_at','participant_id','study_mode','event_type','game_mode','chapter','response_status','app_version','payload_json']
};
function setupResearchExtension_(){
 var ss=spreadsheet_();Object.keys(RESEARCH_HEADERS_).forEach(function(name){var s=ss.getSheetByName(name),headers=RESEARCH_HEADERS_[name];if(!s){s=ss.insertSheet(name);s.appendRow(headers);s.setFrozenRows(1);}else if(JSON.stringify(s.getDataRange().getValues()[0])!==JSON.stringify(headers))throw new Error('RESEARCH_HEADER_MISMATCH:'+name);});
}
function researchEnabled_(){var p=PropertiesService.getScriptProperties();return p.getProperty('RESEARCH_ENABLED')==='true'&&p.getProperty('RESEARCH_PROTOCOL_APPROVED')==='true'&&!!p.getProperty('RESEARCH_CONSENT_VERSION')&&!!p.getProperty('RESEARCH_APPROVED_AT');}
function researchParticipant_(id,mode){var row=rows_('Participants').filter(function(r){return r[0]===id&&r[1]===mode;})[0];return row?JSON.parse(row[11]):null;}
function requireResearchConsent_(p){
 if(p.studyMode!=='research')return;
 if(!researchEnabled_())throw new Error('RESEARCH_NOT_APPROVED');
 var version=PropertiesService.getScriptProperties().getProperty('RESEARCH_CONSENT_VERSION'),participant=researchParticipant_(p.participantId,'research');
 if(!participant||participant.consent_status!=='consented'||p.consent_version!==version||participant.consent_version!==version||p.consented_at!==participant.consented_at||!p.app_version||(p.schemaType!=='study_event'&&(!Number.isFinite(Date.parse(p.startedAt))||Date.parse(p.startedAt)<Date.parse(p.consented_at))))throw new Error('CONSENT_REQUIRED');
}
function hasResearchConsent_(p){try{requireResearchConsent_(p);return true;}catch(e){return false;}}
function researchSafe_(v){return typeof v==='string'&&/^[=+@\-\t\r\n]/.test(v)?"'"+v:v===null||v===undefined?'':v;}
function researchUpsert_(name,row,match,timeIndex){var s=sheet_(name),data=s.getDataRange().getValues();for(var i=1;i<data.length;i++)if(match(data[i])){if(!timeIndex||String(row[timeIndex])>=String(data[i][timeIndex]))s.getRange(i+1,1,1,row.length).setValues([row.map(researchSafe_)]);return;}s.appendRow(row.map(researchSafe_));}
function researchValidateEvent_(p){
 if(p.schemaType!=='study_event'||!/^[a-zA-Z0-9-]{16,80}$/.test(p.id||'')||!/^[a-zA-Z0-9-]{16,80}$/.test(p.participantId||'')||!['test','research'].includes(p.studyMode)||!['mode1','mode2','overall','participation'].includes(p.gameMode)||typeof p.chapter!=='string'||p.chapter.length>64||typeof p.app_version!=='string'||p.app_version.length>80||!Number.isFinite(Date.parse(p.submitted_at))||Date.parse(p.submitted_at)>Date.now()+300000||!['answered','skipped','unanswered'].includes(p.response_status))throw new Error('INVALID_STUDY_EVENT');
 if(!['consent','background','chapter_rating','experience_feedback','withdrawal'].includes(p.event_type))throw new Error('INVALID_STUDY_EVENT');
 if(['chapter_rating','experience_feedback'].includes(p.event_type)&&!/^[a-zA-Z0-9-]{16,80}$/.test(p.scope_id||''))throw new Error('INVALID_SCOPE');
 if(p.event_type==='chapter_rating'&&(p.response_status==='answered'?(!Number.isInteger(p.visual_helpfulness)||p.visual_helpfulness<1||p.visual_helpfulness>5):p.visual_helpfulness!==null))throw new Error('INVALID_RATING');
 if(p.event_type==='experience_feedback'&&(p.response_status==='answered'?(typeof p.feedback_text!=='string'||!p.feedback_text.trim()||p.feedback_text.length>2000):p.feedback_text!==null))throw new Error('INVALID_FEEDBACK');
 if(p.event_type==='background'){
  if(![null,'japanese_native','chinese_native','other'].includes(p.language_background)||![null,'not_applicable','none','under_1_year','1_3_years','3_5_years','over_5_years'].includes(p.japanese_learning_experience))throw new Error('INVALID_BACKGROUND');
  if(p.response_status!=='answered'&&(p.language_background!==null||p.japanese_learning_experience!==null))throw new Error('INVALID_BACKGROUND');
 }
 if(p.event_type==='consent'&&(p.consent_given!==true||p.response_status!=='answered'||typeof p.consent_version!=='string'||p.consent_version.length>100||!Number.isFinite(Date.parse(p.consented_at))||Date.parse(p.consented_at)>Date.parse(p.submitted_at)+5000))throw new Error('INVALID_CONSENT');
}
function saveStudyEvent_(request){
 var p=request.response;researchValidateEvent_(p);if(typeof request.participantKey!=='string'||!/^[a-zA-Z0-9-]{32,150}$/.test(request.participantKey))throw new Error('INVALID_KEY');
 if(p.studyMode==='research'&&p.event_type!=='withdrawal'){
  if(p.event_type==='consent'){if(!researchEnabled_()||p.consent_version!==PropertiesService.getScriptProperties().getProperty('RESEARCH_CONSENT_VERSION'))throw new Error('RESEARCH_NOT_APPROVED');}
  else requireResearchConsent_(p);
 }
 var lock=LockService.getScriptLock();lock.waitLock(20000);try{
  if(p.studyMode==='research'&&!['consent','withdrawal'].includes(p.event_type))requireResearchConsent_(p);
  var identity=rows_('_Identities').filter(function(r){return r[0]===p.participantId;})[0],hashed=hash_(request.participantKey);if(identity&&identity[1]!==hashed)throw new Error('IDENTITY_MISMATCH');
  if(!identity)sheet_('_Identities').appendRow([p.participantId,hashed]);
  if(rows_('ResearchAudit').some(function(r){return r[0]===p.id;}))return;
  var clean=JSON.parse(JSON.stringify(p));delete clean.local_only;delete clean.sync;
  if(['consent','background','withdrawal'].includes(p.event_type)){
   var prior=researchParticipant_(p.participantId,p.studyMode)||{},state=Object.assign({},prior,{participant_id:p.participantId,study_mode:p.studyMode,app_version:p.app_version});
   if(p.event_type==='consent'&&String(p.submitted_at)>=String(prior.consent_event_at||prior.withdrawn_at||'')){state.consent_version=p.consent_version;state.consented_at=p.consented_at;state.consent_status='consented';state.withdrawn_at=null;state.consent_event_at=p.submitted_at;}
   if(p.event_type==='withdrawal'&&String(p.submitted_at)>=String(prior.consent_event_at||'')){state.consent_status='withdrawn';state.withdrawn_at=p.submitted_at;state.consent_event_at=p.submitted_at;}
   if(p.event_type==='background'&&String(p.submitted_at)>=String(prior.background_submitted_at||'')){state.language_background=p.language_background;state.japanese_learning_experience=p.japanese_learning_experience;state.background_status=p.response_status;state.background_submitted_at=p.submitted_at;}
   state.updated_at=[p.submitted_at,prior.updated_at||''].sort().pop();
   researchUpsert_('Participants',[state.participant_id,state.study_mode,state.consent_version,state.consented_at,state.consent_status,state.withdrawn_at,state.language_background,state.japanese_learning_experience,state.background_status,state.updated_at,state.app_version,JSON.stringify(state)],function(r){return r[0]===p.participantId&&r[1]===p.studyMode;});
  }else if(p.event_type==='chapter_rating')researchUpsert_('ChapterRatings',[p.id,p.participantId,p.studyMode,p.gameMode,p.chapter,p.visual_helpfulness,p.response_status,p.submitted_at,p.app_version,p.scope_id,p.consent_version,p.consented_at],function(r){return r[1]===p.participantId&&r[2]===p.studyMode&&r[9]===p.scope_id;},7);
  else if(p.event_type==='experience_feedback')researchUpsert_('ExperienceFeedback',[p.id,p.participantId,p.studyMode,p.feedback_text,p.response_status,p.submitted_at,p.app_version,p.scope_id,p.consent_version,p.consented_at],function(r){return r[1]===p.participantId&&r[2]===p.studyMode&&r[7]===p.scope_id;},5);
  sheet_('ResearchAudit').appendRow([p.id,new Date().toISOString(),p.participantId,p.studyMode,p.event_type,p.gameMode,p.chapter,p.response_status,p.app_version,JSON.stringify(clean)].map(researchSafe_));SpreadsheetApp.flush();
 }finally{lock.releaseLock();}
}
function researchTrialExtras_(p){
 var out={};['startedAt','consent_version','consented_at','app_version','tutorial_completed','tutorial_version','tutorial_status','reference_audio_play_count','learner_audio_play_count','reference_comparison_used','reference_before_visual_count','reference_after_visual_count','learner_before_visual_count','learner_after_visual_count'].forEach(function(key){if(p[key]!==undefined)out[key]=p[key];});return out;
}
function targetClickAnalysis_(p,d){
 var rows=[],seen={},errors=0,order=0;var targets=d.targets||[];
 (p.events||[]).forEach(function(e){if(e.kind!=='kana')return;order++;var correct=targets.includes(e.index),review=!!seen[e.index];rows.push({position:e.index,click_order:order,correct:correct,relative_ms:e.atMs,review:review,first_identification:correct&&!review,errors_preceding:errors});if(correct)seen[e.index]=true;else errors++;});return rows;
}
// Owner-only derived views. Existing raw tables are read, never rewritten.
function refreshResearchAnalysis_(){
 var ss=spreadsheet_(),trialHeaders=['submission_id','participant_id','study_mode','game_mode','chapter','recording_id','level_id','level_version','audio_play_count','listened_ms','card_view_count','card_close_count','completion_status','tutorial_completed','tutorial_version','app_version','consent_version','consented_at','consent_verified','quality_flag_json','reference_audio_play_count','learner_audio_play_count','reference_comparison_used'],clickHeaders=['submission_id','participant_id','study_mode','recording_id','level_id','level_version','target_position','click_order','correct','relative_ms','review','first_identification','errors_preceding'];
 var trials=[],clicks=[];['Mode1Raw','Raw'].forEach(function(name){rows_(name).forEach(function(row){try{var p=JSON.parse(row[name==='Mode1Raw'?19:15]),verified=false;try{if(p.studyMode==='research'){requireResearchConsent_(p);verified=true;}}catch(e){}
 trials.push([p.id,p.participantId,p.studyMode,p.gameMode||'mode2',p.chapter||'exploration',p.recordingId,p.levelId,p.levelVersion,p.audioPlayCount,p.listenedMs,p.cardViewCount,p.cardCloseCount,p.completionStatus||(p.skipped?'skipped':p.completed?'completed':'unknown'),p.tutorial_completed,p.tutorial_version,p.app_version,p.consent_version,p.consented_at,verified,JSON.stringify(p.quality_flag||[]),p.reference_audio_play_count,p.learner_audio_play_count,p.reference_comparison_used]);
 if(name==='Mode1Raw')targetClickAnalysis_(p,p.mode1Definition||{}).forEach(function(c){clicks.push([p.id,p.participantId,p.studyMode,p.recordingId,p.levelId,p.levelVersion,c.position,c.click_order,c.correct,c.relative_ms,c.review,c.first_identification,c.errors_preceding]);});
 }catch(e){}});});
 [['TrialAnalysis',trialHeaders,trials],['TargetClickAnalysis',clickHeaders,clicks]].forEach(function(spec){var s=ss.getSheetByName(spec[0]);if(s&&JSON.stringify(s.getDataRange().getValues()[0])!==JSON.stringify(spec[1]))throw new Error('ANALYSIS_HEADER_MISMATCH:'+spec[0]);if(!s)s=ss.insertSheet(spec[0]);s.clearContents();s.appendRow(spec[1]);spec[2].forEach(function(row){s.appendRow(row.map(researchSafe_));});s.setFrozenRows(1);});
}
