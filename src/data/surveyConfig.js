// Freeze this version and threshold for a research batch. A changed questionnaire needs a new version.
export const surveyConfig={version:'2026-11-28-v1',mode2RequiredLevels:3,sessionHours:12};
export const chapterQuestions={
 vowelChallenge:{id:'m1_chapter_vowel',text:'文字の形の変化は、母音や子音の発音の違いを理解するうえで役に立った。'},
 accent:{id:'m1_chapter_accent',text:'文字の上下の位置の変化は、発音の音の高低を理解するうえで役に立った。'},
 mora:{id:'m1_chapter_mora',text:'文字の横幅や間隔の変化は、発音のリズムを理解するうえで役に立った。'}
};
export const overallQuestions={
 mode1:[
 {id:'m1_notice',text:'文字の形の変化を見ることで、音声だけを聞いたときには気づかなかった発音の違いに気づくことができた。'},
 {id:'m1_location',text:'文字の視覚化によって、発音のどの部分に違いがあるのかが分かりやすくなった。'},
 {id:'m1_understand',text:'文字の視覚化によって、発音がどのように異なるのかが分かりやすくなった。'}],
 mode2:[
 {id:'m2_express',text:'文字の形を変えることで、自分が聞き取った発音の印象を表現することができた。'},
 {id:'m2_diversity',text:'他の人の表現を見ることで、自分とは異なる発音の捉え方に気づくことができた。'},
 {id:'m2_notice',text:'今回の体験を通して、これまで意識していなかった発音の特徴に気づくことができた。'}]
};
export const ratingChoices=[[1,'全くそう思わない'],[2,'あまりそう思わない'],[3,'どちらともいえない'],[4,'ややそう思う'],[5,'非常にそう思う'],['cannot_judge','判断できない']];
export const ratingChoicesFor=mode=>mode==='mode1'?ratingChoices.filter(([value])=>typeof value==='number'):ratingChoices;
export const freeTextPrompts={mode1:'分かりやすかった点、分かりにくかった点、気づいたことなどがあれば、ご自由にお書きください。',mode2:'体験を通して気づいたこと、感じたこと、表現しにくかったことなどがあれば、ご自由にお書きください。'};
export const questionsFor=(mode,chapter)=>chapter?[chapterQuestions[chapter]||chapterQuestions.vowelChallenge]:overallQuestions[mode];
export const surveyKey=(mode,chapter)=>mode+':'+(chapter||'overall');
export function chapterFinished(requiredIds,completed){return requiredIds.length>0&&requiredIds.every(id=>completed[id]);}
export function allChaptersFinished(chapters){return ['vowelChallenge','accent','mora'].every(c=>chapters[c]);}
export function mode2SurveyDue(state,threshold=surveyConfig.mode2RequiredLevels){return Object.keys(state.mode2Views||{}).length>=threshold&&!state.surveys?.['mode2:overall']?.done;}

