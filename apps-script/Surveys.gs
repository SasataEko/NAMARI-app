function setupSurveyExtension(){return setupSurveyExtension_();}
// Additive only: run setupSurveyExtension once, then deploy a new Web App version.
var SURVEY_HEADERS_=['response_id','participant_id','session_id','mode','survey_type','chapter','question_id','question_version','answer_value','free_text','completed_level_count','timestamp','dataset_type','response_status','comparison_viewed','other_answers_available','app_version','consent_version','consented_at','payload_json','submission_id'];
var SURVEY_QUESTIONS_={vowelChallenge:['m1_chapter_vowel'],accent:['m1_chapter_accent'],mora:['m1_chapter_mora'],mode1:['m1_notice','m1_location','m1_understand'],mode2:['m2_express','m2_diversity','m2_notice']};
function setupSurveyExtension_(){var ss=spreadsheet_(),s=ss.getSheetByName('SurveyResponses');if(!s){s=ss.insertSheet('SurveyResponses');s.appendRow(SURVEY_HEADERS_);s.setFrozenRows(1);}else if(JSON.stringify(s.getDataRange().getValues()[0])!==JSON.stringify(SURVEY_HEADERS_))throw new Error('SURVEY_HEADER_MISMATCH');}
function validateSurvey_(p){
 var ids=SURVEY_QUESTIONS_[p.survey_type==='chapter'?p.chapter:p.gameMode];
 if(!['mode1','mode2'].includes(p.gameMode)||!['chapter','overall'].includes(p.survey_type)||(p.survey_type==='chapter'&&(p.gameMode!=='mode1'||!['vowelChallenge','accent','mora'].includes(p.chapter)))||(p.survey_type==='overall'&&p.chapter!=='not_applicable')||!/^[a-zA-Z0-9-]{16,80}$/.test(p.session_id||'')||p.scope_id!==p.session_id||p.question_version!=='2026-11-28-v1'||!ids||!Array.isArray(p.answers)||p.answers.length!==ids.length||!Number.isInteger(p.completed_level_count)||p.completed_level_count<0||typeof p.free_text!=='string'||p.free_text.length>2000)throw new Error('INVALID_SURVEY');
 if(p.gameMode==='mode2'&&(p.comparison_viewed!==true||![true,false,null].includes(p.other_answers_available)))throw new Error('INVALID_COMPARISON');
 if(p.full_comparison_viewed!==undefined&&p.full_comparison_viewed!==null&&typeof p.full_comparison_viewed!=='boolean')throw new Error('INVALID_COMPARISON');
 p.answers.forEach(function(a,i){if(a.question_id!==ids[i]||(p.response_status==='answered'?!(a.answer_value==='cannot_judge'||Number.isInteger(a.answer_value)&&a.answer_value>=1&&a.answer_value<=5):a.answer_value!=='unanswered'))throw new Error('INVALID_SURVEY_ANSWER');});
}
function saveSurveyRows_(p){
 // Called inside the existing identity/consent-checked script lock. Stable scope prevents double counting even under a new retry ID.
 var existing=rows_('SurveyResponses').filter(function(r){return r[1]===p.participantId&&r[2]===p.session_id&&r[3]===p.gameMode&&r[4]===p.survey_type&&r[5]===p.chapter&&r[7]===p.question_version&&r[12]===p.studyMode;});
 p.answers.forEach(function(a){if(existing.some(function(r){return r[6]===a.question_id;}))return;
 sheet_('SurveyResponses').appendRow([p.id+'-'+a.question_id,p.participantId,p.session_id,p.gameMode,p.survey_type,p.chapter,a.question_id,p.question_version,a.answer_value,p.free_text,p.completed_level_count,p.submitted_at,p.studyMode,p.response_status,p.comparison_viewed,p.other_answers_available,p.app_version,p.consent_version,p.consented_at,JSON.stringify(p),p.id].map(researchSafe_));});
}

