import './glyph/sticker.css';
import {decorateGameLabels} from './glyph/sticker.js';
import {installPitchConnections} from './pitchConnections.js';
import {showCorrectDialog} from './correctDialog.js';
import {mountModeThree} from './modeThree.js';
import {publishDiyQuestions} from './data/publishDiy.js';
import {applyTestReset} from './data/testReset.js';
import {linkedMora,linkPitch} from './data/linkedPitch.js';
import {confirmQuestionDeletion} from './authorConfirmation.js';
import {ensureParticipation,chapterRating,experienceFeedback,withdrawParticipation} from './studyUI.js';
import {participantId} from './data/participantIdentity.js';
import { showModeIntro } from './modeIntro.js';
import { orderedModeTwoLevels } from './data/modeTwoTutorial.js';
import { mountBeatEditor } from './beatEditor.js';
import { tutorials } from './data/tutorials.js';
import { mountModeOneLesson } from './modeOneLesson.js';
import { createModeOneSession } from './data/modeOneStats.js';
import { mountCollectionCheck } from './collectionCheck.js';
import { mountLibrary, mountAuthor } from './libraryStudio.js';
import { readLibrary, playableLevels, assetUrl } from './data/projectLibrary.js';
import { mountExploration } from './exploration.js';
import './style.css';
import './viewport.css';
import './pitchDots.css';
import './interactionRefinements.css';
import {installViewportLayout} from './viewportLayout.js';
import { levels } from './data/levels.js';
import { libraryCards, libraryGlyph, nextChapterItem } from './data/patternLibrary.js';
import { mountModeOne } from './modeOne.js';
import { listDiyQuestions, saveDiyQuestion, deleteDiyQuestion, restoreDiyQuestion, reviseDiyQuestion } from './data/diyStore.js';



import { loadProfiles, loadSettings, profiles, saveProfile, saveSettings } from './data/profileStore.js';

const app = document.querySelector('#app');
try{applyTestReset(localStorage);}catch(error){console.warn('お試し記録のリセットを完了できませんでした。',error.message);}
installViewportLayout(app);
installPitchConnections(app);
const level = levels[0];
let sharedLibrary=null;
let activeTutorial=null;
let disposeModeOne=null;
let modeOneCurrentId=null;
let legacyModeOneStats=null,legacyModeOneScreen=null;
let modeOneStudyMode=localStorage.getItem('kotoba-mode1-study-mode')==='research'?'research':'test';
let moraFinished=false;
let diyPatternChoices=[];
const currentCards=()=>libraryCards(sharedLibrary);
async function refreshLibrary(){sharedLibrary=await readLibrary();return sharedLibrary;}


let profileRecords = loadProfiles();
let activeProfileId = localStorage.getItem('kotoba-active-profile');
let activeProfile = profiles.find(({ id }) => id === activeProfileId) || null;
let profileData = activeProfile ? readProfile(activeProfile.id) : null;
let settings = loadSettings();
let screen = activeProfile ? 'home' : 'profiles';


let pitchPattern = Array(5).fill(null);
let answerChecked = false;
let isAnimating = false;

let cancelAnimation = null;
let feedbackAudioContext = null;
let diyQuestions = [];
let diyEditingQuestion=null;
let diyDeletedQuestions=[];


let diyAudioFile = null;
let diyAudioUrl = null;

let diyBuilderMorae = [];
let diyBuilderPattern = [];
let diyPlaybackUrl = null;
let activeDiyQuestion = null;
let diyPlayerPattern = [];
let diyPlayerFeedback = '';
let moraStates = Array(5).fill('off');
let moraMenuIndex = null;
let moraHoldTimer = null;
let moraHoldTriggered = false;
let diyMode = 'accent';

let diyLongAfter = [];
let diyBeatValues=[];
let diyBlankAfter = [];
let diyPlayerTargetIndex = null;
let diyTargetIndexes = [];
let diyPlayerLongAfter = [];
let diyPlayerBlankAfter = [];
let challengeChapter = 'vowelChallenge';
let customPlayReturnScreen = 'diy';
let activeCustomLevel = null;
let customLevelSolved = new Set();

function newProfileData() {
  return { accentSubmissions: [], collectedCards: [], morphComplete: false };
}

function readProfile(profileId) {
  return profileRecords[profileId] || newProfileData();
}

function persistProfile() {
  if (!activeProfile) return;
  profileRecords[activeProfile.id] = profileData;
  saveProfile(activeProfile.id, profileData);
}

function collectedCount() {
  return currentCards().filter(c=>profileData?.collectedCards?.includes(c.id)).length;
}

function profileRecordCount(data = profileData) {
  return (data?.accentSubmissions?.length || 0) + (data?.morphComplete ? 1 : 0);
}

function scrollTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }

function render() {
  const pages = {
    tutorial: renderTutorial,
    profiles: renderProfiles,
    home: renderHome,
    exploration: renderExploration,
    modeThree: renderModeThree,
    developer: renderDeveloper,
    challenges: renderChallengeSelect,
    chapterLevels: renderChapterLevels,
    vowelChallenge: renderMorphGame,
    accent: renderAccentChallenge,
    mora: renderMoraChallenge,
    collection: renderCollection,
    settings: renderSettings,
    diy: renderDiyHome,
    diyVowel: renderDiyVowelEditor,
    diyAccent: renderDiyAccentEditor,
    diyMora: renderDiyMoraEditor,
    diyPlay: renderDiyPlayer,
    customVowel: renderCustomVowelChallenge,
    diyRecording: renderDiyRecording,
  };
  (pages[screen] || renderHome)();
}

function profileHeader() {
  return `<header class="app-header"><button class="brand-button" data-action="home"><span class="brand-mark">訛</span><span><b>化ける言語</b><small>PHONETIC TYPO PLAY</small></span></button><div class="header-actions"><span class="streak-pill">✦　${profileRecordCount()} 記録</span><button class="profile-chip" data-action="profiles" aria-label="学習プロフィールを切り替える"><span>${activeProfile?.initial || '？'}</span>${activeProfile?.name || 'プロフィール'}</button></div></header>`;
}

function titleReturn() {
  return '<button class="title-return" data-action="home"><span aria-hidden="true">←</span> タイトルへ戻る</button>';
}

function bottomNav(active) {
  const items = [
    ['collection', '▣', '図鑑'],
    ['diy', '✳', 'DIYモード'],
    ['settings', '☷', '設定'],
  ];
  return `<nav class="bottom-nav" aria-label="メインメニュー">${items.map(([id, icon, label]) => `<button class="nav-item ${active === id ? 'active' : ''}" data-nav="${id}"><span class="nav-icon">${icon}</span><span>${label}</span></button>`).join('')}</nav>`;
}

function bindNav(active) {
  app.querySelectorAll('[data-end-experience]').forEach(button=>button.onclick=async()=>{const mode=localStorage.getItem('kotoba-last-study-mode')==='research'?'research':'test';if(mode==='research'&&!await ensureParticipation('research'))return;await experienceFeedback(mode);});
  app.querySelectorAll('[data-nav]').forEach((button) => button.addEventListener('click', () => navigate(button.dataset.nav)));
  app.querySelectorAll('[data-action="home"]').forEach((button) => button.addEventListener('click', () => navigate('home')));
  app.querySelectorAll('[data-action="profiles"]').forEach((button) => button.addEventListener('click', () => navigate('profiles')));
  app.querySelectorAll('[data-back]').forEach((button) => button.addEventListener('click', () => navigate(button.dataset.back)));
}

function navigate(next) {
  app.querySelector('[data-mode-three]')?.modeThreeSession?.dispose?.();
  if(legacyModeOneStats&&next!==legacyModeOneScreen){legacyModeOneStats.leave();legacyModeOneStats=null;legacyModeOneScreen=null;}
  app.querySelector('[data-exploration]')?.explorationSession?.dispose?.();
  disposeModeOne?.();disposeModeOne=null;
  if (isAnimating && next !== 'vowelChallenge') stopAnimation();
  screen = next;

  if (next === 'accent') { pitchPattern = Array(5).fill(null); answerChecked = false; }
  render();
  scrollTop();
  if(next==='challenges')showModeIntro('mode1');
  if(next==='exploration')showModeIntro('mode2');
}

function renderProfiles() {
  app.innerHTML = `<main class="page-shell profile-page"><div class="profile-top"><span class="brand-mark">訛</span><span class="serif-label">Learning Profile / SLOT</span></div><section class="profile-intro"><p class="eyebrow">SAVE DATA SELECTION</p><h1>学習プロフィールを<br>選んでください</h1><p>選んだプロフィールごとに、学習状況と図鑑の記録を保存します。<br>チャレンジ内容はどちらも同じです。</p></section><div class="profile-options">${profiles.map((profile) => {
    const data = readProfile(profile.id);
    const done = profileRecordCount(data);
    const chosen = profile.id === activeProfileId;
    return `<button class="profile-option ${chosen ? 'selected' : ''}" data-select-profile="${profile.id}"><span class="profile-initial">${profile.initial}</span><span class="profile-option-check">${chosen ? '✓' : '↗'}</span><b>${profile.name}</b><small>${profile.slot}</small><span class="profile-progress-label">${done ? `${done} RECORD${done > 1 ? 'S' : ''}` : 'NEW PROFILE'}<span>図鑑 ${currentCards().filter(c=>data.collectedCards?.includes(c.id)).length}/${currentCards().length}</span></span><span class="progress-track"><i style="width:${Math.min(done * 18, 100)}%"></i></span></button>`;
  }).join('')}</div><p class="profile-note">いつでも右上のプロフィールボタンから切り替えられます。</p></main>`;
  app.querySelectorAll('[data-select-profile]').forEach((button) => button.addEventListener('click', () => {
    activeProfileId = button.dataset.selectProfile;
    activeProfile = profiles.find(({ id }) => id === activeProfileId);
    profileData = readProfile(activeProfileId);
    localStorage.setItem('kotoba-active-profile', activeProfileId);
    profileRecords[activeProfileId] ||= profileData;
    persistProfile();
    screen = 'home';
    render();
    scrollTop();
  }));
}

function renderHome() {
  app.innerHTML = `<main class="page-shell">${profileHeader()}<section class="cover-intro"><p class="cover-eyebrow">PHONETIC TYPO PLAY</p><h1>化ける言語</h1><p>発音のちがいを、かたちでみつける。</p></section><section class="floating-cover" aria-label="訛をテーマにしたゲームカバー"><span class="float-card float-card-yellow">高<br>低</span><span class="float-card float-card-blue">あ</span><span class="float-card float-card-pink">声</span><span class="float-card float-card-white">A</span><span class="cover-kanji">訛</span><span class="cover-spark spark-one">✳</span><span class="cover-spark spark-two">·</span></section><div class="home-mode-stack"><button class="home-mode-button home-mode-one" data-action="challenge"><span>Mode1：　訛りを見つける</span><span aria-hidden="true">↗</span></button><button class="home-mode-button home-mode-two" data-nav="exploration"><span>Mode2：　みんなと聞き比べる</span><span aria-hidden="true">↗</span></button><button class="home-mode-button home-mode-three" data-nav="modeThree"><span>Mode3：　ことばをつくる</span><span aria-hidden="true">↗</span></button><button class="home-mode-button home-mode-developer" data-nav="developer"><span>開発者モード</span><span aria-hidden="true">↗</span></button></div><button class="text-action" data-end-experience>体験を終えて感想を書く（任意）</button><section class="archive-section"><div class="section-heading"><div><p class="eyebrow">COLLECTION & MODE</p><h2>アーカイブ & モード</h2></div></div><div class="archive-circles"><button class="archive-circle circle-blue" data-nav="collection"><i>▣</i><b>図鑑</b><small>五十音・パターン</small></button><button class="archive-circle circle-lavender" data-nav="diy"><i>✳</i><b>DIYモード</b><small>字形をつくる</small></button><button class="archive-circle circle-neutral" data-nav="settings"><i>⚙</i><b>設定</b><small>音・振動</small></button></div></section>${bottomNav('')}</main>`;
  bindNav('');
  app.querySelector('[data-action="challenge"]').addEventListener('click', () => navigate('challenges'));
}

function renderModeThree() {
  app.innerHTML=`<main class="page-shell mode-three-page">${profileHeader()}<div data-mode-three></div>${bottomNav('')}</main>`;
  bindNav('');mountModeThree(app.querySelector('[data-mode-three]'));
}

function renderDeveloper() {
  app.innerHTML=`<main class="page-shell">${profileHeader()}${titleReturn()}<div data-studio></div>${bottomNav('')}</main>`;
  bindNav('');mountAuthor(app.querySelector('[data-studio]'));
}
async function renderExploration() {
  app.querySelector('[data-exploration]')?.explorationSession?.dispose?.();
  app.innerHTML=`<main class="page-shell">${profileHeader()}${titleReturn()}<div data-exploration></div>${bottomNav('')}</main>`;
  bindNav('');const root=app.querySelector('[data-exploration]');root.textContent='問題を読み込み中…';
  try{const library=await readLibrary();if(!root.isConnected)return;
    const available=playableLevels(library).filter(l=>!l.tutorial).sort((a,b)=>Number(b.word==='かりきゅらむ')-Number(a.word==='かりきゅらむ'));
    root.innerHTML='<section class="library-intro"><h1>聴くことばを選ぼう</h1><p class="mode-explanation">このモードでは、訛りについて感じたことを自由に表現し、みんなの選択と見比べられます。正解はありません。</p><button class="text-action" data-mode-info>モードの説明をもう一度見る</button></section><div class="mode2-level-grid"></div>';
    const feedbackButton=document.createElement('button');feedbackButton.className='text-action';feedbackButton.textContent='体験を終えて感想を書く（任意）';feedbackButton.onclick=async()=>{const mode=localStorage.getItem('kotoba-last-study-mode')==='research'?'research':'test';if(mode==='research'&&!await ensureParticipation('research'))return;await experienceFeedback(mode);};root.append(feedbackButton);
    root.querySelector('[data-mode-info]').onclick=()=>showModeIntro('mode2',{force:true});
    const play=async(index,studyMode='test')=>{if(studyMode==='research'&&!await ensureParticipation('research'))return;localStorage.setItem('kotoba-last-study-mode',studyMode);root.explorationSession?.dispose?.();mountExploration(root,{level:available[index],profileId:activeProfileId,studyMode,nextLevel:available[index+1],onNext:mode=>play(index+1,mode),onSkipTutorial:()=>available[index+1]?play(index+1,studyMode):renderExploration(),onLevelList:renderExploration});};
    available.forEach((l,index)=>{const button=document.createElement('button');button.className='mode2-level-tile';const number=document.createElement('span'),word=document.createElement('b');number.textContent=String(index+1).padStart(2,'0');word.textContent=l.word;word.title=l.word;button.setAttribute('aria-label',number.textContent+' '+l.word+(l.visualExperiment?'（音声なし・表示実験）':''));button.append(number,word);if(l.tutorial){const note=document.createElement('small');note.textContent='チュートリアル';button.append(note);}if(l.visualExperiment){const note=document.createElement('small');note.textContent='音声なし・実験';button.append(note);}button.onclick=()=>play(index);root.querySelector('.mode2-level-grid').append(button);});
  }catch(e){root.textContent=e.message;}
}

function renderChallengeSelect() {
  const categories = [
    ['vowelChallenge', 'あ', '母音＆子音篇', '文字の音と形を見つけよう', 'チュートリアル　くすり'],
    ['accent', '高低', 'アクセント篇', '音の高低を組み立てよう', 'チュートリアル　からだ'],
    ['mora', '拍', 'モーラ篇', 'ことばのリズムに注目しよう', 'チュートリアル　らんぷ'],
  ];
  app.innerHTML = `<main class="page-shell challenge-select-page">${profileHeader()}<section class="category-intro"><button class="back-circle" data-back="home" aria-label="ホームへ戻る">←</button><div><p class="eyebrow">CHOOSE A CHALLENGE</p><h1>どの篇に挑戦しますか？</h1><p>このモードでは、各問題にあらかじめ正解が設定されています。まずはチュートリアルで操作を試してみよう。</p><button class="text-action" data-mode1-info>モードの説明をもう一度見る</button></div></section><div class="challenge-categories">${categories.map(([route, icon, title, description, lesson]) => `<button class="challenge-category category-${route}" data-open-challenge="${route}"><span class="category-icon">${icon}</span><span class="category-copy"><small>CHALLENGE</small><b>${title}</b><span>${description}</span><em>${lesson}</em></span><span class="category-arrow">↗</span></button>`).join('')}</div>${bottomNav('')}</main>`;
  bindNav('');
  app.querySelector('[data-mode1-info]').onclick=()=>showModeIntro('mode1',{force:true});
  app.querySelectorAll('[data-open-challenge]').forEach((button) => button.addEventListener('click', () => {
    challengeChapter = button.dataset.openChallenge;
    navigate('chapterLevels');
  }));
}

const chapterTitles = {
  vowelChallenge: ['母音＆子音篇', 'vowel'],
  accent: ['アクセント篇', 'accent'],
  mora: ['モーラ篇', 'mora'],
};

function chapterItems(chapter=challengeChapter){
 const tutorial=tutorials.find(q=>q.chapter===chapter);
 const built=[{id:tutorial.id,word:tutorial.word,summary:'チュートリアル · 録音を聞いて操作を練習',tutorial}];
 return [...built,...[...(sharedLibrary?.modeOneLevels||[]).filter(q=>!diyQuestions.some(local=>local.id===q.id)&&!diyDeletedQuestions.some(local=>local.id===q.id)),...diyQuestions].filter(q=>q.chapter===chapter||(!q.chapter&&q.mode===({vowelChallenge:'diyVowel',accent:'diyAccent',mora:'diyMora'}[chapter]))).map(question=>({id:question.id,word:question.word,summary:'DIYで作成した問題',question}))];
}
async function openChapterItem(item){
 if(!item.tutorial&&modeOneStudyMode==='research'&&!await ensureParticipation('research'))return;
 if(!item.tutorial)localStorage.setItem('kotoba-last-study-mode',modeOneStudyMode);
 if(legacyModeOneStats){legacyModeOneStats.leave();legacyModeOneStats=null;}
 modeOneCurrentId=item.id;
 if(item.tutorial){activeTutorial=item.tutorial;navigate('tutorial');return;}
 if(item.route){moraFinished=false;if(item.route==='accent'||item.route==='mora')startLegacyModeOne({id:item.id,chapter:item.route==='mora'?'mora':'accent',word:item.word,reading:['カ','リ','キュ','ラ','ム']},item.route);navigate(item.route);return;}
 activeCustomLevel=item.question;activeDiyQuestion=item.question;customPlayReturnScreen='chapterLevels';
 if(diyPlaybackUrl)URL.revokeObjectURL(diyPlaybackUrl);diyPlaybackUrl=item.question.audioBlob?URL.createObjectURL(item.question.audioBlob):assetUrl(item.question.audio);
 if(item.question.mode==='diyVowel'){navigate('customVowel');return;}
 diyPlayerPattern=Array(item.question.reading.length).fill(null);diyPlayerLongAfter=Array(item.question.reading.length).fill(false);diyPlayerBlankAfter=Array(item.question.reading.length).fill(false);diyPlayerFeedback='';startLegacyModeOne(item.question,'diyPlay');navigate('diyPlay');
}
function startLegacyModeOne(question,route){
 if(question.mode==='diyAccent')question={...question,pattern:linkPitch(question.reading,question.pattern)};
 if(question.mode==='diyMora')return;
 const scoringDefinition=question.pattern?.length?{scoring:'pattern',characters:question.reading.map(text=>({text})),pitch:question.pattern,...(question.mode==='diyMora'?{longAfter:question.longAfter,blankAfter:question.blankAfter}:{})}:{scoring:'none',characters:question.reading.map(text=>({text}))};
 legacyModeOneScreen=route;legacyModeOneStats=createModeOneSession({...question,scoringDefinition},{profileId:activeProfileId,studyMode:modeOneStudyMode});
}
function attachLegacyModeOneStatus(){if(!legacyModeOneStats)return;const area=document.createElement('section');area.className='mode-one-sync';const label=document.createElement('small');label.textContent='Mode1 · '+(modeOneStudyMode==='research'?'研究参加':'お試し');const note=document.createElement('p');note.setAttribute('role','status');const retry=document.createElement('button');retry.className='text-action';retry.hidden=true;retry.textContent='未送信の記録を再送';retry.onclick=()=>legacyModeOneStats?.retry();area.append(label,note,retry);app.querySelector('main').append(area);legacyModeOneStats.setListener(s=>{if(area.isConnected){note.textContent=s.text;retry.hidden=s.status!=='pending';}});}

async function advanceModeOne(){const next=nextChapterItem(chapterItems(),modeOneCurrentId);if(next)openChapterItem(next);else{await chapterRating({gameMode:'mode1',chapter:challengeChapter,studyMode:modeOneStudyMode});navigate('home');}}
function appendModeOneNext(enabled){
 attachLegacyModeOneStatus();
 if(screen==='diyPlay'&&customPlayReturnScreen!=='chapterLevels')return;
 const next=nextChapterItem(chapterItems(),modeOneCurrentId);const area=document.createElement('div');area.className='mode-one-next';const button=document.createElement('button');button.className='judge-button';button.disabled=!enabled;button.textContent=next?'次の問題へ：'+next.word+' →':'おめでとう、全問クリア！';button.onclick=advanceModeOne;area.append(button);app.querySelector('main').append(area);
}
async function renderChapterLevels(){
 const [title]=chapterTitles[challengeChapter]||chapterTitles.vowelChallenge;
 app.innerHTML=`<main class="page-shell challenge-select-page">${profileHeader()}<section class="category-intro"><button class="back-circle" data-back="challenges" aria-label="篇の選択へ戻る">←</button><div><p class="eyebrow">MODE 1</p><h1>${title}</h1><p>挑戦する問題を選んでください。</p><label>データモード <select data-mode1-study><option value="test">お試し</option><option value="research">研究参加</option></select></label></div></section><div class="chapter-level-list" data-chapter-list>読み込み中…</div>${bottomNav('')}</main>`;
 bindNav('');const modeSelect=app.querySelector('[data-mode1-study]');modeSelect.value=modeOneStudyMode;modeSelect.onchange=async()=>{if(modeSelect.value==='research'&&!await ensureParticipation('research')){modeSelect.value=modeOneStudyMode;return;}modeOneStudyMode=modeSelect.value;localStorage.setItem('kotoba-mode1-study-mode',modeOneStudyMode);};const list=app.querySelector('[data-chapter-list]');
 try{[diyQuestions,diyDeletedQuestions]=await Promise.all([listDiyQuestions(),listDiyQuestions({deleted:true})]);await refreshLibrary();if(!list.isConnected)return;const items=chapterItems();list.innerHTML=items.map((item,i)=>`<button class="diy-saved-question chapter-level-card" data-level-index="${i}"><span class="diy-saved-glyph">${String(i+1).padStart(2,'0')}</span><span><b>${escapeHtml(item.word)}</b><small>${escapeHtml(item.summary)}</small></span><i>挑戦 ↗</i></button>`).join('');list.querySelectorAll('[data-level-index]').forEach(b=>b.onclick=()=>openChapterItem(items[Number(b.dataset.levelIndex)]));}catch{list.textContent='問題を読み込めませんでした。もう一度開いてください。';}
}

const accentMorae = ['か', 'り', 'きゅ', 'ら', 'む'];

function pitchPath() {
  let path = '';
  pitchPattern.forEach((pitch, index) => {
    if (!pitch) return;
    const x = 50 + index * 100;
    const y = pitch === 'high' ? 19 : 111;
    path += `${path && pitchPattern[index - 1] ? 'L' : 'M'}${x} ${y} `;
  });
  return path.trim();
}

function renderAccentChallenge() {
  modeOneCurrentId||='builtin-accent';
  const picked = pitchPattern.filter(Boolean).length;
  const patternLabel = pitchPattern.map((pitch) => pitch === 'high' ? '高' : pitch === 'low' ? '低' : '・').join('　');
  app.innerHTML = `<main class="page-shell challenge-page">${profileHeader()}<div class="challenge-title-row"><button class="back-circle" data-back="challenges" aria-label="チャレンジ選択へ戻る">←</button><div><p class="eyebrow">ACCENT CHALLENGE / 01</p><h1>アクセントを組み立てる</h1></div></div><div class="challenge-kicker"><span>WORD</span><b>「かりきゅらむ」</b></div><section class="mission-card"><span class="mission-icon">♧</span><div><p class="blue-label">アクセント・チャレンジ</p><h2>サンプルを聴いて、<br>一拍ずつ高さを選んでください</h2></div></section><section class="pitch-card accent-builder-card"><button class="audio-pill sample-pending" disabled>◖))　サンプル音声（準備中）</button><p class="audio-caption">録音素材を受け取り次第、ここから再生できます</p><div class="pitch-builder"><div class="pitch-row-labels"><span>高</span><span>低</span></div><div class="pitch-columns"><svg class="pitch-path" viewBox="0 0 500 130" preserveAspectRatio="none" aria-hidden="true"><path class="pitch-guide" d="M50 19 H450 M50 111 H450"/><path class="pitch-line-path" d="${pitchPath()}"/></svg>${accentMorae.map((mora, index) => `<div class="pitch-column"><button class="pitch-choice pitch-high ${pitchPattern[index] === 'high' ? 'selected' : ''}" data-mora="${index}" data-pitch="high" aria-label="${mora}を高くする">●</button><button class="pitch-choice pitch-low ${pitchPattern[index] === 'low' ? 'selected' : ''}" data-mora="${index}" data-pitch="low" aria-label="${mora}を低くする">●</button><b>${mora}</b><small>第${index + 1}拍</small></div>`).join('')}</div></div><p class="pitch-note">タップして高低を設定　${picked} / ${accentMorae.length} 拍</p><div class="pattern-readout" aria-live="polite">${patternLabel}</div></section>${answerChecked ? '<p class="answer-feedback recorded" role="status">回答を記録しました。正解データを受け取り次第、判定結果を表示します。</p>' : ''}<button class="judge-button" data-action="judge" ${(picked !== accentMorae.length || answerChecked) ? 'disabled' : ''}>このアクセントで判定する　 ✓</button><p class="judge-hint">選んだ高低パターンをプロフィールに保存します。</p>${bottomNav('')}</main>`;
  bindNav('');
  appendModeOneNext(answerChecked);
  app.querySelectorAll('[data-mora]').forEach((button) => button.addEventListener('click', () => {
    pitchPattern[Number(button.dataset.mora)] = button.dataset.pitch;
    answerChecked = false;
    renderAccentChallenge();
  }));
  app.querySelector('[data-action="judge"]').addEventListener('click', () => {
    if (pitchPattern.some((pitch) => !pitch)) return;
    profileData.accentSubmissions ||= [];
    profileData.accentSubmissions.push({ word: 'かりきゅらむ', pattern: [...pitchPattern], createdAt: new Date().toISOString() });
    persistProfile();
    legacyModeOneStats?.answer({kind:'answer',pitch:[...pitchPattern]});legacyModeOneStats?.complete();
    answerChecked = true;
    if (settings.sfx) playCorrectFeedback();
    renderAccentChallenge();
  });
}

function unlockCards(ids) {
  profileData.collectedCards ||= [];
  ids.forEach((id) => { if (!profileData.collectedCards.includes(id)) profileData.collectedCards.push(id); });
}

function renderCollection() {
  app.innerHTML=`<main class="page-shell">${profileHeader()}${titleReturn()}<button class="text-action" data-nav="developer">図鑑を編集 ↗</button><div data-library></div>${bottomNav('collection')}</main>`;
  bindNav('collection');mountLibrary(app.querySelector('[data-library]'));
}
function renderSettings() {
  app.innerHTML = `<main class="page-shell settings-page">${profileHeader()}${titleReturn()}<section class="page-heading"><p class="eyebrow">PREFERENCES</p><h1>設定</h1><p>プレイ中の音と振動を調整できます。</p></section><section class="settings-panel"><div class="settings-row"><span class="setting-symbol symbol-blue">⌁</span><div><b>振動フィードバック</b><small>間違えた位置を選んだときに軽く振動します</small></div><button class="toggle ${settings.vibration ? 'on' : ''}" role="switch" aria-checked="${settings.vibration}" data-setting="vibration" aria-label="振動フィードバック"><i></i></button></div><div class="settings-row"><span class="setting-symbol symbol-coral">♫</span><div><b>効果音</b><small>正解・不正解の操作音を再生します</small></div><button class="toggle ${settings.sfx ? 'on' : ''}" role="switch" aria-checked="${settings.sfx}" data-setting="sfx" aria-label="効果音"><i></i></button></div><div class="settings-row setting-static"><span class="setting-symbol">◖))</span><div><b>問題の音声</b><small>聞き分け問題の音声はいつでも再生できます</small></div><span class="always-on">ON</span></div></section><section class="settings-profile"><div><p class="eyebrow">CURRENT LEARNING SLOT</p><h2>学習プロフィール</h2><p>進捗はプロフィールごとに別々に保存されます。</p></div><button class="profile-switch" data-action="profiles">${activeProfile.initial}　${activeProfile.name}　↗</button></section><p class="settings-footnote">設定はこの端末に保存されます（端末間の同期なし）。</p>${bottomNav('settings')}</main>`;
  const researchPanel=document.createElement('section');researchPanel.className='study-settings';researchPanel.innerHTML='<h2>研究参加</h2><p>正式参加は確認済みの研究説明への同意後に開始します。</p><p data-anonymous-id></p><button class="outline-button" data-research-info>研究説明と参加設定</button><button class="text-action" data-research-test>説明フローを試す（test）</button><button class="text-action" data-study-forms>評価と感想を試す（test・端末のみ）</button><button class="text-action" data-research-withdraw>研究参加を中止</button>';app.querySelector('main').append(researchPanel);researchPanel.querySelector('[data-anonymous-id]').textContent='匿名ID：'+participantId();researchPanel.querySelector('[data-research-info]').onclick=()=>ensureParticipation('research');researchPanel.querySelector('[data-research-test]').onclick=()=>ensureParticipation('test',{preview:true});researchPanel.querySelector('[data-study-forms]').onclick=async()=>{await chapterRating({gameMode:'mode1',chapter:'preview',studyMode:'test',localPreview:true});await experienceFeedback('test',{localPreview:true});};researchPanel.querySelector('[data-research-withdraw]').onclick=()=>withdrawParticipation();
  bindNav('settings');
  app.querySelectorAll('[data-setting]').forEach((button) => button.addEventListener('click', () => {
    const key = button.dataset.setting;
    settings[key] = !settings[key];
    saveSettings(settings);
    renderSettings();
  }));
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast-message';
  toast.textContent = message;
  document.body.append(toast);
  window.setTimeout(() => toast.remove(), 2200);
}

function splitMorae(text) {
  // 小假名は直前の仮名にまとめ、促音・撥音・長音符はそれぞれ一拍に数えます。
  const smallKana = new Set(Array.from('ゃゅょぁぃぅぇぉゎゕゖャュョァィゥェォヮヵヶ'));
  const normalized = Array.from(String(text || '').normalize('NFKC'))
    .map((char) => char >= 'ァ' && char <= 'ヶ' ? String.fromCharCode(char.charCodeAt(0) - 0x60) : char)
    .filter((char) => !/[\s・･·,、]/.test(char));
  const morae = [];
  normalized.forEach((char) => {
    if (smallKana.has(char) && morae.length) morae[morae.length - 1] += char;
    else morae.push(char);
  });
  return morae.slice(0, 16);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function resetDiyDraft() {
  diyEditingQuestion=null;
  diyAudioFile = null;
  if (diyAudioUrl) URL.revokeObjectURL(diyAudioUrl);
  diyAudioUrl = null;
  diyBuilderMorae = [];
  diyBuilderPattern = [];
  diyTargetIndexes = [];
  diyPatternChoices=[];
  diyLongAfter = [];diyBeatValues=[];
  diyBlankAfter = [];
}

function renderDiyHome() {
  const categories = [
    ['diyVowel', 'あ', '母音＆子音篇', '変形する文字と音の特徴を設定'],
    ['diyAccent', '高低', 'アクセント篇', '読みと高低パターンを設定'],
    ['diyMora', '拍', 'モーラ篇', '長音と空白拍を含むリズムを設定'],
    ['diyRecording', '♫', '私の発音を聞いてもらう', 'ことばと録音を準備する（共有機能は準備中）'],
  ];
  app.innerHTML = `<main class="page-shell diy-page">${profileHeader()}${titleReturn()}<section class="page-heading"><p class="eyebrow">DIY MODE / TEACHING TOOL</p><h1>DIYモード</h1><p>作りたい問題の篇を選んでください。</p><small class="diy-local-note">作成した問題はこのブラウザーに保存され、チャレンジ一覧にも追加されます。</small></section><div class="challenge-categories diy-categories">${categories.map(([route, icon, title, description]) => `<button class="challenge-category diy-category" data-open-diy="${route}"><span class="category-icon">${icon}</span><span class="category-copy"><small>DIY / CREATE</small><b>${title}</b><span>${description}</span></span><span class="category-arrow">↗</span></button>`).join('')}</div><section class="diy-saved-section"><div class="section-heading"><div><p class="eyebrow">MY QUESTIONS</p><h2>作成した問題</h2></div></div><div id="diy-saved-list" class="diy-saved-list">読み込み中…</div></section>${bottomNav('diy')}</main>`;
  bindNav('diy');
  app.querySelectorAll('[data-open-diy]').forEach((button) => button.addEventListener('click', () => {
    resetDiyDraft();
    diyMode = button.dataset.openDiy;
    navigate(diyMode);
  }));
  renderDiyQuestionList();
  Promise.all([listDiyQuestions(),listDiyQuestions({deleted:true})]).then(([items,deleted]) => { diyQuestions = items; diyDeletedQuestions=deleted; renderDiyQuestionList(); }).catch((error) => {
    const list = app.querySelector('#diy-saved-list');
    if (list) list.textContent = `保存データを読み込めません：${error.message}`;
  });
}

async function renderDiyVowelEditor(){
 diyMode='diyVowel';app.innerHTML='<main class="page-shell"><p>図鑑を読み込んでいます…</p></main>';
 try{await refreshLibrary();if(screen!=='diyVowel')return;renderDiyEditorShell('母音＆子音篇','図鑑から、文字ごとの発音パターンを選んで正解を設定します。','<div class="diy-editor-heading"><b>図鑑の字形と発音パターン</b><small>正解にする文字は複数選べます。各文字のパターンを指定してください。</small></div><div id="diy-target-morae" class="diy-glyph-assets"></div><p class="diy-material-note">字形・パターン・説明は現在の図鑑と共通です。図鑑を更新すると、作成済み問題にも反映されます。</p>','diy-vowel');renderDiyVowelOptions();}catch{app.innerHTML='<main class="page-shell"><p>図鑑を読み込めませんでした。</p><button data-nav="diy">DIYに戻る</button></main>';bindNav('diy');}
}

function renderDiyRecording(){
 app.innerHTML=`<main class="page-shell diy-page">${profileHeader()}<button class="title-return" data-back="diy">← DIYに戻る</button><section class="page-heading"><p class="eyebrow">DIY</p><h1>私の発音を聞いてもらう</h1><p>自分で読んだことばや短いフレーズを準備できます。</p></section><section class="diy-form"><label>ことば・フレーズ<input class="design-input" maxlength="120" placeholder="例：おはようございます" data-recording-text></label><label class="audio-upload">自分の録音を選ぶ<input type="file" accept="audio/*" data-recording-file></label><audio controls hidden data-recording-preview></audio><button class="judge-button" disabled>みんなに聞いてもらう（準備中）</button><p role="status">共有・投稿機能はまだ利用できません。ここで選んだ録音は試聴のみで、送信・保存されません。</p></section>${bottomNav('diy')}</main>`;
 bindNav('diy');let previewUrl;app.querySelector('[data-recording-file]').onchange=e=>{if(previewUrl)URL.revokeObjectURL(previewUrl);const file=e.target.files[0],audio=app.querySelector('[data-recording-preview]');audio.hidden=!file;if(file){previewUrl=URL.createObjectURL(file);audio.src=previewUrl;}};
}

function renderDiyAccentEditor() {
  diyMode = 'diyAccent';
  renderDiyEditorShell('アクセント篇', '各拍の高低を設定します。「っ」「ー」は前の拍と自動で連動します。', '', 'diy-accent');
}

function renderDiyMoraEditor() {
  diyMode = 'diyMora';
  renderDiyEditorShell('モーラ篇', '文字を2拍にのばす・空白拍を加える・拍を減らす操作で正解を設定します。', '<p class="diy-material-note">「→ 2拍」で文字を横にのばし、「＋」で文字の間に「ッ」を加えます。</p>', 'diy-mora');
}

function renderDiyEditorShell(title, description, extra = '', editorClass = '') {
  app.innerHTML = `<main class="page-shell diy-page ${editorClass}">${profileHeader()}<div class="challenge-title-row"><button class="back-circle" data-back="diy" aria-label="DIYの篇選択へ戻る">←</button><div><p class="eyebrow">${diyEditingQuestion?'DIY MODE / EDIT':'DIY MODE / CREATE'}</p><h1>${title}</h1></div></div><p class="diy-description">${description}</p><section class="diy-form"><label>表示する単語<input id="diy-word" class="design-input" type="text" maxlength="40" placeholder="例：かりきゅらむ"></label><label>読み（文字をそのまま入力）<input id="diy-reading" class="design-input" type="text" maxlength="80" placeholder="例：かりきゅらむ"></label><p id="diy-mora-preview" class="diy-mora-preview">読みを入力すると、拍を自動で区切ります。</p>${extra}<label class="audio-upload">録音ファイルを読み込む<input id="diy-audio-file" type="file" accept="audio/*"><span id="diy-audio-name">音声ファイルを選択</span></label><audio id="diy-audio-preview" class="diy-audio-preview" controls hidden></audio>${['diyAccent', 'diyMora'].includes(diyMode) ? `<div class="diy-editor-heading"><b>${diyMode==='diyMora'?'拍の正解':'アクセントパターン'}</b><small>${diyMode==='diyMora'?'2拍と空白拍を設定してください':'各拍の高低を選んでください'}</small></div><div id="diy-pitch-editor" class="diy-pitch-editor"><p class="diy-empty-hint">読みを入力すると拍が自動表示されます。</p></div>` : ''}<button id="diy-save" class="judge-button" disabled>問題を保存する</button><p id="diy-error" class="diy-message" role="status"></p></section>${bottomNav('diy')}</main>`;
  bindNav('diy');
  const wordInput = app.querySelector('#diy-word');
  const readingInput = app.querySelector('#diy-reading');
  wordInput.addEventListener('input', updateDiySaveButton);
  readingInput.addEventListener('input', () => {
    const nextMorae = splitMorae(readingInput.value);
    const changed = nextMorae.join('|') !== diyBuilderMorae.join('|');
    diyBuilderMorae = nextMorae;
    if (changed) {
      diyBuilderPattern = Array(diyBuilderMorae.length).fill(null);
      diyLongAfter = Array(diyBuilderMorae.length).fill(false);diyBeatValues=Array(diyBuilderMorae.length).fill(1);
      diyBlankAfter = Array(diyBuilderMorae.length).fill(false);
      diyTargetIndexes = [];
      diyPatternChoices=[];
    }
    app.querySelector('#diy-mora-preview').textContent = diyBuilderMorae.length ? `自動分割：${diyBuilderMorae.join('・')}（${diyBuilderMorae.length}拍）` : '読みを入力すると、拍を自動で区切ります。';
    renderDiyPitchEditor();
    renderDiyVowelOptions();
  });
  app.querySelector('#diy-audio-file').addEventListener('change', (event) => {
    const replacement=event.target.files?.[0];
    if(!replacement)return;
    diyAudioFile = replacement;
    if (diyAudioUrl) URL.revokeObjectURL(diyAudioUrl);
    diyAudioUrl = diyAudioFile ? URL.createObjectURL(diyAudioFile) : null;
    app.querySelector('#diy-audio-name').textContent = diyAudioFile?.name || '音声ファイルを選択';
    const preview = app.querySelector('#diy-audio-preview');
    preview.hidden = !diyAudioUrl;
    if (diyAudioUrl) preview.src = diyAudioUrl;
    updateDiySaveButton();
  });
  let savingDiy=false;
  app.querySelector('#diy-save').addEventListener('click', async () => {
    if(savingDiy)return;
    const word = wordInput.value.trim();
    const modeValid = diyMode !== 'diyVowel' || diyVowelValid();
    if (!word || !diyAudioFile || !diyBuilderMorae.length || !modeValid || (diyMode === 'diyAccent' && diyBuilderPattern.some((pitch) => !pitch))) return;
    const chapter = { diyVowel: 'vowelChallenge', diyAccent: 'accent', diyMora: 'mora' }[diyMode];
    const question = reviseDiyQuestion(diyEditingQuestion, { id: crypto.randomUUID(), mode: diyMode, chapter, word, reading: [...diyBuilderMorae], pattern: [...diyBuilderPattern], targetIndexes: [...diyTargetIndexes], targetIndex: diyTargetIndexes[0] ?? null, patternChoices:[...diyPatternChoices], librarySource:'shared', glyphAssets: [], longAfter: [...diyLongAfter], blankAfter: [...diyBlankAfter], ...(diyMode==='diyMora'?{beats:[...diyBeatValues],blanks:diyBlankAfter.slice(0,-1)}:{}), audioBlob: diyAudioFile, audioName: diyAudioFile.name || diyEditingQuestion?.audioName || '録音', createdAt: new Date().toISOString() });
    savingDiy=true;app.querySelector('#diy-save').disabled=true;
    try {
      await saveDiyQuestion(question);
      diyQuestions = [question,...diyQuestions.filter(q=>q.id!==question.id)];

      resetDiyDraft();
      navigate('diy');
    } catch (error) {
      const message = app.querySelector('#diy-error');
      if (message) message.textContent = `保存できませんでした：${error.message}`;
    } finally {savingDiy=false;updateDiySaveButton();}
  });
  if(diyEditingQuestion){
    wordInput.value=diyEditingQuestion.word;
    readingInput.value=diyBuilderMorae.join('');
    app.querySelector('#diy-mora-preview').textContent='自動分割：'+diyBuilderMorae.join('・')+'（'+diyBuilderMorae.length+'拍）';
    app.querySelector('#diy-audio-name').textContent=diyEditingQuestion.audioName||'保存済みの録音';
    const preview=app.querySelector('#diy-audio-preview');preview.hidden=!diyAudioUrl;if(diyAudioUrl)preview.src=diyAudioUrl;
    app.querySelector('#diy-save').textContent='変更を保存する';
    const cancel=document.createElement('button');cancel.type='button';cancel.className='text-action';cancel.textContent='編集をキャンセル';cancel.onclick=()=>{resetDiyDraft();navigate('diy');};
    app.querySelector('#diy-save').after(cancel);
  }
  renderDiyPitchEditor();
  updateDiySaveButton();
}

function diyVowelValid(){return diyTargetIndexes.length>0&&diyTargetIndexes.every(i=>{const g=libraryGlyph(sharedLibrary,diyBuilderMorae[i]);return g?.normal&&g.patterns.some(p=>p.id===diyPatternChoices[i]);});}
function renderDiyVowelOptions(){
 const grid=app.querySelector('#diy-target-morae');if(!grid)return;
 grid.innerHTML=diyBuilderMorae.length?diyBuilderMorae.map((mora,i)=>{const glyph=libraryGlyph(sharedLibrary,mora),patterns=glyph?.patterns||[],selected=diyTargetIndexes.includes(i);if(!diyPatternChoices[i]&&patterns.length)diyPatternChoices[i]=patterns[0].id;const p=patterns.find(p=>p.id===diyPatternChoices[i]);const group=sharedLibrary.groups.find(g=>g.id===p?.groupId);return `<article class="diy-glyph-asset ${selected?'target':''}"><button type="button" class="diy-mora-select ${selected?'selected':''}" data-target-mora="${i}" aria-pressed="${selected}" ${!glyph?.normal||!patterns.length?'disabled':''}>${escapeHtml(mora)}<small>${selected?'正解に設定':'正解にする'}</small></button>${patterns.length?`<label>図鑑の発音パターン<select class="design-input" data-pattern-choice="${i}">${patterns.map(p=>`<option value="${escapeHtml(p.id)}" ${p.id===diyPatternChoices[i]?'selected':''}>${escapeHtml(p.title)}</option>`).join('')}</select></label>${p?`<div class="diy-library-pattern" style="background:${/^#[0-9a-f]{6}$/i.test(group?.color)?group.color:'#ffe08b'}"><img src="${escapeHtml(assetUrl(p.svg))}" alt="${escapeHtml(mora)}の変形字形"><b>${escapeHtml(p.title)}</b></div>`:''}`:'<p>図鑑に発音パターンがありません。開発者モードで追加できます。</p>'}</article>`;}).join(''):'<p class="diy-empty-hint">先に読みを入力してください。</p>';
 grid.querySelectorAll('[data-target-mora]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.targetMora);diyTargetIndexes=diyTargetIndexes.includes(i)?diyTargetIndexes.filter(v=>v!==i):[...diyTargetIndexes,i].sort((a,b)=>a-b);renderDiyVowelOptions();updateDiySaveButton();});grid.querySelectorAll('[data-pattern-choice]').forEach(select=>select.onchange=()=>{diyPatternChoices[Number(select.dataset.patternChoice)]=select.value;renderDiyVowelOptions();updateDiySaveButton();});
 updateDiySaveButton();
}

function renderDiyPitchEditor() {
  if(diyMode==='diyAccent')diyBuilderPattern=linkPitch(diyBuilderMorae,diyBuilderPattern);
  const editor = app.querySelector('#diy-pitch-editor');
  if (!editor) { updateDiySaveButton(); return; }
  if (!diyBuilderMorae.length) {
    editor.innerHTML = '<p class="diy-empty-hint">読みを入力すると拍が自動表示されます。</p>';
    updateDiySaveButton();
    return;
  }
  if(diyMode==='diyMora'){
    const beats=diyBeatValues.length===diyBuilderMorae.length?[...diyBeatValues]:diyLongAfter.map(v=>v?2:1),blanks=diyBlankAfter.slice(0,-1);
    editor.classList.add('explore-scroll');
    const draw=async()=>{try{const library=sharedLibrary||await refreshLibrary();if(!editor.isConnected)return;await mountBeatEditor(editor,{library,reading:diyBuilderMorae,beats,blanks,onChange:()=>{diyBeatValues=[...beats];diyLongAfter=beats.map(v=>v===2);diyBlankAfter=[...blanks,false];updateDiySaveButton();}});}catch(e){if(editor.isConnected)editor.textContent=e.message;}};
    draw();updateDiySaveButton();return;
  }
  editor.innerHTML = diyBuilderMorae.map((mora, index) => `<div class="diy-pitch-row"><b>${escapeHtml(mora)}</b><button class="diy-pitch-option accent-dot ${diyBuilderPattern[index] === 'high' ? 'selected' : ''}" data-builder-index="${index}" data-builder-pitch="high" ${linkedMora(diyBuilderMorae,index)?'disabled title="前の拍と連動"':''} aria-label="${escapeHtml(mora)}を高くする" aria-pressed="${diyBuilderPattern[index] === 'high'}"></button><button class="diy-pitch-option accent-dot ${diyBuilderPattern[index] === 'low' ? 'selected' : ''}" data-builder-index="${index}" data-builder-pitch="low" ${linkedMora(diyBuilderMorae,index)?'disabled title="前の拍と連動"':''} aria-label="${escapeHtml(mora)}を低くする" aria-pressed="${diyBuilderPattern[index] === 'low'}"></button>${diyMode === 'diyMora' && index < diyBuilderMorae.length - 1 ? `<button class="mora-config-option ${diyLongAfter[index] ? 'enabled' : ''}" data-long-after="${index}">長音</button>` : ''}${diyMode === 'diyMora' ? `<button class="mora-config-option ${diyBlankAfter[index] ? 'enabled' : ''}" data-blank-after="${index}">空白拍</button>` : ''}</div>`).join('');
  editor.querySelectorAll('[data-builder-index]').forEach((button) => button.addEventListener('click', () => {
    diyBuilderPattern[Number(button.dataset.builderIndex)] = button.dataset.builderPitch;
    renderDiyPitchEditor();
  }));
  editor.querySelectorAll('[data-long-after]').forEach((button) => button.addEventListener('click', () => {
    const index = Number(button.dataset.longAfter);
    diyLongAfter[index] = !diyLongAfter[index];
    if (diyLongAfter[index]) {
      diyLongAfter[index + 1] = false;
      if (index > 0) diyLongAfter[index - 1] = false;
    }
    renderDiyPitchEditor();
  }));
  editor.querySelectorAll('[data-blank-after]').forEach((button) => button.addEventListener('click', () => {
    const index = Number(button.dataset.blankAfter);
    diyBlankAfter[index] = !diyBlankAfter[index];
    renderDiyPitchEditor();
  }));
  updateDiySaveButton();
}

function updateDiySaveButton() {
  const button = app.querySelector('#diy-save');
  if (!button) return;
  const word = app.querySelector('#diy-word')?.value.trim();
  const modeValid = diyMode !== 'diyVowel' || diyVowelValid();
  const patternValid = diyMode !== 'diyAccent' || (diyBuilderPattern.length === diyBuilderMorae.length && diyBuilderPattern.every(Boolean));
  button.disabled = !word || !diyAudioFile || !diyBuilderMorae.length || !modeValid || !patternValid;
}

function editDiyQuestion(question){
  if(!question)return;resetDiyDraft();diyEditingQuestion=question;diyMode=question.mode;
  diyBuilderMorae=[...question.reading];diyBuilderPattern=[...(question.pattern||[])];
  diyTargetIndexes=[...(question.targetIndexes||[question.targetIndex].filter(Number.isInteger))];
  diyPatternChoices=[...(question.patternChoices||[])];
  diyBeatValues=question.beats?[...question.beats]:question.reading.map((_,i)=>question.longAfter?.[i]?2:1);
  diyLongAfter=question.reading.map((_,i)=>question.beats?question.beats[i]===2:Boolean(question.longAfter?.[i]));
  diyBlankAfter=question.reading.map((_,i)=>Boolean((question.blanks||question.blankAfter)?.[i]));
  diyAudioFile=question.audioBlob;diyAudioUrl=diyAudioFile?URL.createObjectURL(diyAudioFile):null;
  navigate(diyMode);
}

function renderDiyQuestionList() {
  const list = app.querySelector('#diy-saved-list');
  if (!list) return;
  list.innerHTML = diyQuestions.length ? diyQuestions.map((question) => `<article class="question-management-row"><button class="diy-saved-question" data-diy-question="${escapeHtml(question.id)}"><span class="diy-saved-glyph">${escapeHtml(question.word)}</span><span><b>${(question.reading || []).map(escapeHtml).join('・')}</b><small>${escapeHtml(question.audioName || '音声つき問題')}</small></span><i>再生 ↗</i></button><div class="question-management-actions"><button class="outline-button" data-diy-edit="${escapeHtml(question.id)}" aria-label="${escapeHtml(question.word)}を編集">編集</button><button class="text-action" data-diy-delete="${escapeHtml(question.id)}" aria-label="${escapeHtml(question.word)}を削除">削除</button></div></article>`).join('') : '<p class="diy-empty-hint">まだ問題がありません。作成タブから追加できます。</p>';
  if(diyQuestions.length||diyDeletedQuestions.length){
    const tools=document.createElement('div');tools.className='question-management-actions';const publish=document.createElement('button');publish.type='button';publish.className='outline-button';publish.textContent='プロジェクトへ保存（全DIY問題）';const message=document.createElement('p');message.setAttribute('role','status');tools.append(publish,message);list.prepend(tools);
    publish.onclick=async()=>{publish.disabled=true;message.textContent='録音と正解をプロジェクトへ保存しています…';try{const [questions,deleted]=await Promise.all([listDiyQuestions(),listDiyQuestions({deleted:true})]);const result=await publishDiyQuestions(questions,deleted);sharedLibrary=result.library;message.textContent=result.count+'問をプロジェクトへ保存しました。公開前に最新のLevels.gsを生成してください。';}catch(e){message.textContent='保存できませんでした：'+e.message;}finally{publish.disabled=false;}};
  }
  if(diyDeletedQuestions.length)list.insertAdjacentHTML('beforeend','<details class="deleted-questions"><summary>削除した問題（復元できます）</summary>'+diyDeletedQuestions.map(q=>'<div class="question-management-actions"><span>'+escapeHtml(q.word)+'</span><button class="outline-button" data-diy-restore="'+escapeHtml(q.id)+'">復元</button></div>').join('')+'</details>');
  const refresh=async()=>{[diyQuestions,diyDeletedQuestions]=await Promise.all([listDiyQuestions(),listDiyQuestions({deleted:true})]);renderDiyQuestionList();};
  const failed=e=>{const message=document.createElement('p');message.setAttribute('role','status');message.textContent='保存できませんでした：'+e.message;list.append(message);};
  list.querySelectorAll('[data-diy-edit]').forEach(b=>b.onclick=()=>editDiyQuestion(diyQuestions.find(q=>q.id===b.dataset.diyEdit)));
  list.querySelectorAll('[data-diy-delete]').forEach(b=>b.onclick=async()=>{const q=diyQuestions.find(q=>q.id===b.dataset.diyDelete);if(!q||!await confirmQuestionDeletion(q.word))return;b.disabled=true;try{await deleteDiyQuestion(q.id);await refresh();}catch(e){b.disabled=false;failed(e);}});
  list.querySelectorAll('[data-diy-restore]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await restoreDiyQuestion(b.dataset.diyRestore);await refresh();}catch(e){b.disabled=false;failed(e);}});
  list.querySelectorAll('[data-diy-question]').forEach((button) => button.addEventListener('click', () => {
    activeDiyQuestion = diyQuestions.find((question) => question.id === button.dataset.diyQuestion);
    if (!activeDiyQuestion) return;
    customPlayReturnScreen = 'diy';
    if (activeDiyQuestion.mode === 'diyVowel') {
      activeCustomLevel = activeDiyQuestion;
      if (diyPlaybackUrl) URL.revokeObjectURL(diyPlaybackUrl);
      diyPlaybackUrl = activeDiyQuestion.audioBlob ? URL.createObjectURL(activeDiyQuestion.audioBlob) : null;
      navigate('customVowel');
      return;
    }
    if (diyPlaybackUrl) URL.revokeObjectURL(diyPlaybackUrl);
    diyPlaybackUrl = URL.createObjectURL(activeDiyQuestion.audioBlob);
    diyPlayerPattern = Array(activeDiyQuestion.reading.length).fill(null);
    diyPlayerTargetIndex = null;
    diyPlayerLongAfter = Array(activeDiyQuestion.reading.length).fill(false);
    diyPlayerBlankAfter = Array(activeDiyQuestion.reading.length).fill(false);
    diyPlayerFeedback = '';
    startLegacyModeOne(activeDiyQuestion,'diyPlay');navigate('diyPlay');
  }));
}

async function renderCustomVowelChallenge(){
 if(!activeCustomLevel){navigate(customPlayReturnScreen);return;}
 await renderModeOneQuestion({...activeCustomLevel,audio:diyPlaybackUrl},customPlayReturnScreen);
}

function renderDiyPlayer() {
  if (!activeDiyQuestion) { navigate('diy'); return; }
  const question = activeDiyQuestion;
  const openSuccess=()=>{const next=nextChapterItem(chapterItems(),modeOneCurrentId);showCorrectDialog(app.querySelector('main'),{label:customPlayReturnScreen==='chapterLevels'?(next?'次の問題へ：'+next.word+' →':'ホームへ'):'問題一覧へ',onNext:customPlayReturnScreen==='chapterLevels'?advanceModeOne:()=>navigate('diy')});};
  if(question.mode==='diyMora'){renderRhythmQuestion(question,diyPlaybackUrl,customPlayReturnScreen);return;}
  if(question.mode==='diyAccent')diyPlayerPattern=linkPitch(question.reading,diyPlayerPattern);
  const isVowelQuestion = question.mode === 'diyVowel';
  const isMoraQuestion = question.mode === 'diyMora';
  const picked = isVowelQuestion ? diyPlayerTargetIndex !== null : diyPlayerPattern.filter(Boolean).length === question.reading.length;
  const responseArea = isVowelQuestion
    ? `<p>録音を聴いて、変形する拍を選んでください。</p><div class="diy-play-morae">${question.reading.map((mora, index) => `<button class="diy-play-mora diy-target-choice ${diyPlayerTargetIndex === index ? 'selected' : ''}" data-play-target="${index}"><b>${escapeHtml(mora)}</b><small>第${index + 1}拍</small></button>`).join('')}</div>`
    : `<p>${isMoraQuestion ? '拍ごとの高低、長音、空白拍を設定してください。' : '録音を聴いて、各拍の高低を選んでください。'}</p><div class="diy-play-morae">${question.reading.map((mora, index) => `<div class="diy-play-mora"><b>${escapeHtml(mora)}</b><button class="diy-pitch-option accent-dot ${diyPlayerPattern[index] === 'high' ? 'selected' : ''}" data-play-index="${index}" data-play-pitch="high" ${linkedMora(question.reading,index)?'disabled title="前の拍と連動"':''} aria-label="${escapeHtml(mora)}を高くする" aria-pressed="${diyPlayerPattern[index] === 'high'}"></button><button class="diy-pitch-option accent-dot ${diyPlayerPattern[index] === 'low' ? 'selected' : ''}" data-play-index="${index}" data-play-pitch="low" ${linkedMora(question.reading,index)?'disabled title="前の拍と連動"':''} aria-label="${escapeHtml(mora)}を低くする" aria-pressed="${diyPlayerPattern[index] === 'low'}"></button>${isMoraQuestion && index < question.reading.length - 1 ? `<button class="mora-config-option ${diyPlayerLongAfter[index] ? 'enabled' : ''}" data-play-long="${index}">長音</button>` : ''}${isMoraQuestion ? `<button class="mora-config-option ${diyPlayerBlankAfter[index] ? 'enabled' : ''}" data-play-blank="${index}">空白拍</button>` : ''}</div>`).join('')}</div>`;
  const backTarget = customPlayReturnScreen === 'chapterLevels' ? 'chapterLevels' : 'diy';
  app.innerHTML = `<main class="page-shell diy-page ${isMoraQuestion ? 'diy-mora' : ''}">${profileHeader()}<div class="challenge-title-row"><button class="back-circle" data-back="${backTarget}" aria-label="問題一覧へ戻る">←</button><div><p class="eyebrow">${customPlayReturnScreen === 'chapterLevels' ? 'CHALLENGE / DIY LEVEL' : 'DIY QUESTION / PLAY'}</p><h1>${escapeHtml(question.word)}</h1></div></div><section class="diy-play-card">${responseArea}<audio class="diy-audio-playback" controls src="${diyPlaybackUrl || ''}"></audio></section>${diyPlayerFeedback&&!diyPlayerFeedback.startsWith('正解') ? `<p class="answer-feedback recorded" role="status">${diyPlayerFeedback}</p>` : ''}<button class="judge-button" data-check-diy ${!picked ? 'disabled' : ''}>${diyPlayerFeedback.startsWith('正解')?'正解を見る':'回答を判定する'}</button>${bottomNav(backTarget === 'diy' ? 'diy' : '')}</main>`;
  bindNav(backTarget === 'diy' ? 'diy' : '');
  decorateGameLabels(app,sharedLibrary);
  legacyModeOneStats?.attachAudio(app.querySelector('audio'));
  if(question.mode==='diyAccent')attachLegacyModeOneStatus();else appendModeOneNext(diyPlayerFeedback.startsWith('正解'));
  app.querySelectorAll('[data-play-target]').forEach((button) => button.addEventListener('click', () => {
    diyPlayerTargetIndex = Number(button.dataset.playTarget);
    diyPlayerFeedback = '';
    renderDiyPlayer();
  }));
  app.querySelectorAll('[data-play-index]').forEach((button) => button.addEventListener('click', () => {
    diyPlayerPattern[Number(button.dataset.playIndex)] = button.dataset.playPitch;
    diyPlayerFeedback = '';
    renderDiyPlayer();
  }));
  app.querySelectorAll('[data-play-long]').forEach((button) => button.addEventListener('click', () => {
    diyPlayerLongAfter[Number(button.dataset.playLong)] = !diyPlayerLongAfter[Number(button.dataset.playLong)];
    diyPlayerFeedback = '';
    renderDiyPlayer();
  }));
  app.querySelectorAll('[data-play-blank]').forEach((button) => button.addEventListener('click', () => {
    diyPlayerBlankAfter[Number(button.dataset.playBlank)] = !diyPlayerBlankAfter[Number(button.dataset.playBlank)];
    diyPlayerFeedback = '';
    renderDiyPlayer();
  }));
  app.querySelector('[data-check-diy]').addEventListener('click', () => {
    if(diyPlayerFeedback.startsWith('正解')){openSuccess();return;}
    if (isVowelQuestion) {
      if (diyPlayerTargetIndex === null) return;
      diyPlayerFeedback = diyPlayerTargetIndex === question.targetIndex ? '正解です。変形する拍が一致しました。' : '場所が異なります。録音をもう一度聴いてみましょう。';
      renderDiyPlayer();
      return;
    }
    if (diyPlayerPattern.some((pitch) => !pitch)) return;
    const correctPitch = diyPlayerPattern.every((pitch, index) => pitch === linkPitch(question.reading,question.pattern)[index]);
    const correctMora = !isMoraQuestion || (diyPlayerLongAfter.every((value, index) => value === Boolean(question.longAfter?.[index])) && diyPlayerBlankAfter.every((value, index) => value === Boolean(question.blankAfter?.[index])));
    const correct = correctPitch && correctMora;
    legacyModeOneStats?.answer({kind:'answer',pitch:[...diyPlayerPattern],longAfter:[...diyPlayerLongAfter],blankAfter:[...diyPlayerBlankAfter]});
    diyPlayerFeedback = correct ? (isMoraQuestion ? '正解です。モーラの構成が一致しました。' : '正解です。アクセントパターンが一致しました。') : 'パターンが異なります。録音をもう一度聴いてみましょう。';
    renderDiyPlayer();
    if(correct){if(settings.sfx)playCorrectFeedback();openSuccess();}
  });
}

function tutorialContinuation(){
 const next=nextChapterItem(chapterItems(),modeOneCurrentId);
 if(next)return {label:'次の問題へ：'+next.word+' →',go:()=>openChapterItem(next)};
 return {label:'この篇のチュートリアル完了！篇の選択へ →',go:()=>navigate('challenges')};
}
async function renderTutorial(){
 if(!activeTutorial){navigate('chapterLevels');return;}
 const question={...activeTutorial,audio:assetUrl(activeTutorial.audio)};
 if(question.mode==='diyVowel'){await renderModeOneQuestion(question,'chapterLevels');return;}
 await renderRhythmQuestion(question,question.audio,'chapterLevels');
}
async function renderRhythmQuestion(question,audio,backTarget){
 if(!question.tutorial&&modeOneStudyMode==='research'&&!await ensureParticipation('research'))return;
 app.innerHTML=`<main class="page-shell"><div data-lesson-header>${profileHeader()}</div><button class="title-return" data-back="${backTarget}">← 問題一覧へ戻る</button><div data-lesson-root></div>${bottomNav('')}</main>`;bindNav('');
 const root=app.querySelector('[data-lesson-root]');
 try{const library=await refreshLibrary();if(!root.isConnected)return;const next=nextChapterItem(chapterItems(),modeOneCurrentId),continuation=question.tutorial?tutorialContinuation():{label:next?'次の問題へ：'+next.word+' →':'おめでとう、全問クリア！ホームへ',go:backTarget==='chapterLevels'?advanceModeOne:()=>navigate('diy')};
 const dispose=await mountModeOneLesson(root,{question:{...question,audio},library,profileId:activeProfileId,studyMode:modeOneStudyMode,onNext:continuation.go,onSkipTutorial:()=>tutorialContinuation().go(),nextLabel:continuation.label,onCorrect:()=>{if(settings.sfx)playCorrectFeedback();}});
 if(root.isConnected)disposeModeOne=dispose;else dispose?.();
 }catch(e){if(root.isConnected)root.textContent='問題を読み込めません：'+e.message;}
}
function renderMoraChallenge(){activeTutorial=tutorials.find(q=>q.chapter==='mora');renderTutorial();}

async function renderMorphGame(){
 modeOneCurrentId||='builtin-kusuri';await renderModeOneQuestion({id:'builtin-kusuri',statsLevelId:level.id,recordingId:level.recordingId,word:level.word,reading:level.characters.map(c=>c.text),targetIndexes:level.characters.flatMap((c,i)=>c.isTarget?[i]:[]),audio:level.audio},'chapterLevels');
}
async function renderModeOneQuestion(question,backTarget){
 if(!question.tutorial&&modeOneStudyMode==='research'&&!await ensureParticipation('research'))return;
 app.innerHTML=`<main class="page-shell morph-page">${profileHeader()}<section class="morph-heading"><button class="back-circle" data-back="${backTarget}" aria-label="問題一覧へ戻る">←</button><div><p class="eyebrow">MODE 1 / 母音＆子音篇</p><h1>発音の特徴を見つけよう</h1></div></section><p class="mode-one-study-label">${question.tutorial?'チュートリアル · 練習データ':'Mode1 · '+(modeOneStudyMode==='research'?'研究参加':'お試し')}</p><div data-mode-one>図鑑を読み込んでいます…</div>${bottomNav(backTarget==='diy'?'diy':'')}</main>`;bindNav(backTarget==='diy'?'diy':'');const target=app.querySelector('[data-mode-one]');
 try{const library=await refreshLibrary();if(!target.isConnected)return;const next=backTarget==='chapterLevels'?nextChapterItem(chapterItems(),modeOneCurrentId):null;disposeModeOne=mountModeOne(target,{library,question,profileId:activeProfileId,studyMode:modeOneStudyMode,onSkipTutorial:()=>tutorialContinuation().go(),nextWord:next?.word,nextLabel:question.tutorial?tutorialContinuation().label:null,onNext:question.tutorial?tutorialContinuation().go:backTarget==='chapterLevels'?advanceModeOne:()=>navigate('home'),onSolved:patternId=>{profileData.morphComplete=true;unlockCards([patternId]);persistProfile();},onCorrect:()=>{if(settings.sfx)playCorrectFeedback();},onWrong:()=>{if(settings.vibration&&navigator.vibrate)navigator.vibrate(65);if(settings.sfx)playWrongFeedback();}});}catch{if(target.isConnected)target.textContent='図鑑を読み込めませんでした。もう一度開いてください。';}
}

function playCorrectFeedback() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    feedbackAudioContext ||= new AudioContextClass();
    const context = feedbackAudioContext;
    if (context.state === 'suspended') context.resume();
    const start = context.currentTime;
    [560, 760].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const at = start + index * 0.095;
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, at);
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.linearRampToValueAtTime(0.035, at + 0.014);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.13);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(at);
      oscillator.stop(at + 0.14);
    });
  } catch (error) { console.warn('[correct-feedback] 音效无法播放：', error); }
}

function playWrongFeedback() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    feedbackAudioContext ||= new AudioContextClass();
    const context = feedbackAudioContext;
    if (context.state === 'suspended') context.resume();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime;
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(78, start);
    gain.gain.setValueAtTime(0.0001, start);
    for (const offset of [0, 0.105]) {
      gain.gain.setValueAtTime(0.0001, start + offset);
      gain.gain.linearRampToValueAtTime(0.055, start + offset + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.075);
    }
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.19);
  } catch (error) { console.warn('[wrong-feedback] 音效无法播放：', error); }
}

function stopAnimation(){disposeModeOne?.();disposeModeOne=null;if(cancelAnimation)cancelAnimation();cancelAnimation=null;isAnimating=false;}

if(new URLSearchParams(location.search).has('collection-check'))mountCollectionCheck(app);else refreshLibrary().catch(()=>{}).finally(render);
