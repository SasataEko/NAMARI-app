import { mountCollectionCheck } from './collectionCheck.js';
import { mountLibrary, mountAuthor } from './libraryStudio.js';
import { readLibrary, playableLevels } from './data/projectLibrary.js';
import { mountExploration } from './exploration.js';
import './style.css';
import { levels } from './data/levels.js';
import { catalogCards } from './data/catalog.js';
import { listDiyQuestions, saveDiyQuestion } from './data/diyStore.js';
import { loadGlyph } from './glyph/loadGlyph.js';
import { animateMorph, createMorph, setMorphIntensity } from './glyph/morph.js';
import { getCharacterStatistics, mockStatistics } from './data/mockStatistics.js';
import { loadProfiles, loadSettings, profiles, saveProfile, saveSettings } from './data/profileStore.js';

const app = document.querySelector('#app');
const level = levels[0];
const normalGlyphs = new Map();
const customGlyphs = new Map();
const morphInterpolations = new Map();
let profileRecords = loadProfiles();
let activeProfileId = localStorage.getItem('kotoba-active-profile');
let activeProfile = profiles.find(({ id }) => id === activeProfileId) || null;
let profileData = activeProfile ? readProfile(activeProfile.id) : null;
let settings = loadSettings();
let screen = activeProfile ? 'home' : 'profiles';
let selectedFilter = 'all';
let selectedCardId = null;
let pitchPattern = Array(5).fill(null);
let answerChecked = false;
let isAnimating = false;
let currentForm = 'normal';
let cancelAnimation = null;
let feedbackAudioContext = null;
let diyQuestions = [];
let diyQuestionsLoaded = false;
let diyQuestionsLoading = false;
let diyAudioFile = null;
let diyAudioUrl = null;
let diyGlyphAssets = [];
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
let diyFeatureCardId = null;
let diyLongAfter = [];
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
  return { accentSubmissions: [], collectedCards: ['vowel-open', 'vowel-rounded', 'consonant-burst', 'accent-fall', 'accent-rise'], morphComplete: false };
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
  return (profileData?.collectedCards || []).length;
}

function profileRecordCount(data = profileData) {
  return (data?.accentSubmissions?.length || 0) + (data?.morphComplete ? 1 : 0);
}

function scrollTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }

function render() {
  const pages = {
    profiles: renderProfiles,
    home: renderHome,
    exploration: renderExploration,
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
  app.querySelectorAll('[data-nav]').forEach((button) => button.addEventListener('click', () => navigate(button.dataset.nav)));
  app.querySelectorAll('[data-action="home"]').forEach((button) => button.addEventListener('click', () => navigate('home')));
  app.querySelectorAll('[data-action="profiles"]').forEach((button) => button.addEventListener('click', () => navigate('profiles')));
  app.querySelectorAll('[data-back]').forEach((button) => button.addEventListener('click', () => navigate(button.dataset.back)));
}

function navigate(next) {
  if (isAnimating && next !== 'vowelChallenge') stopAnimation();
  screen = next;
  selectedCardId = null;
  if (next === 'accent') { pitchPattern = Array(5).fill(null); answerChecked = false; }
  render();
  scrollTop();
}

function renderProfiles() {
  app.innerHTML = `<main class="page-shell profile-page"><div class="profile-top"><span class="brand-mark">訛</span><span class="serif-label">Learning Profile / SLOT</span></div><section class="profile-intro"><p class="eyebrow">SAVE DATA SELECTION</p><h1>学習プロフィールを<br>選んでください</h1><p>選んだプロフィールごとに、学習状況と図鑑の記録を保存します。<br>チャレンジ内容はどちらも同じです。</p></section><div class="profile-options">${profiles.map((profile) => {
    const data = readProfile(profile.id);
    const done = profileRecordCount(data);
    const chosen = profile.id === activeProfileId;
    return `<button class="profile-option ${chosen ? 'selected' : ''}" data-select-profile="${profile.id}"><span class="profile-initial">${profile.initial}</span><span class="profile-option-check">${chosen ? '✓' : '↗'}</span><b>${profile.name}</b><small>${profile.slot}</small><span class="profile-progress-label">${done ? `${done} RECORD${done > 1 ? 'S' : ''}` : 'NEW PROFILE'}<span>図鑑 ${data.collectedCards?.length || 5}/${catalogCards.length}</span></span><span class="progress-track"><i style="width:${Math.min(done * 18, 100)}%"></i></span></button>`;
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
  app.innerHTML = `<main class="page-shell">${profileHeader()}<section class="cover-intro"><p class="cover-eyebrow">PHONETIC TYPO PLAY</p><h1>化ける言語</h1><p>発音のちがいを、かたちでみつける。</p></section><section class="floating-cover" aria-label="訛をテーマにしたゲームカバー"><span class="float-card float-card-yellow">高<br>低</span><span class="float-card float-card-blue">あ</span><span class="float-card float-card-pink">声</span><span class="float-card float-card-white">A</span><span class="cover-kanji">訛</span><span class="cover-spark spark-one">✳</span><span class="cover-spark spark-two">·</span></section><button class="primary-cta challenge-cta" data-action="challenge"><span>チャレンジする！</span><span aria-hidden="true">→</span></button><button class="explore-entry" data-nav="exploration">挑战新模式 · 新モードに挑戦　↗</button>${import.meta.env.DEV ? '<button class="explore-entry" data-nav="developer">开发者模式 · 项目素材与关卡　↗</button>' : ''}<section class="archive-section"><div class="section-heading"><div><p class="eyebrow">COLLECTION & MODE</p><h2>アーカイブ & モード</h2></div></div><div class="archive-circles"><button class="archive-circle circle-blue" data-nav="collection"><i>▣</i><b>図鑑</b><small>五十音・パターン</small></button><button class="archive-circle circle-lavender" data-nav="diy"><i>✳</i><b>DIYモード</b><small>字形をつくる</small></button><button class="archive-circle circle-neutral" data-nav="settings"><i>⚙</i><b>設定</b><small>音・振動</small></button></div></section>${bottomNav('')}</main>`;
  bindNav('');
  app.querySelector('[data-action="challenge"]').addEventListener('click', () => navigate('challenges'));
}

function renderDeveloper() {
  app.innerHTML=`<main class="page-shell">${profileHeader()}${titleReturn()}<div data-studio></div>${bottomNav('')}</main>`;
  bindNav('');mountAuthor(app.querySelector('[data-studio]'));
}
async function renderExploration() {
  app.innerHTML = `<main class="page-shell">${profileHeader()}${titleReturn()}<div data-exploration></div>${bottomNav('')}</main>`;
  bindNav('');const root=app.querySelector('[data-exploration]');root.textContent='関卡を読み込み中…';
  try{const library=await readLibrary();if(!root.isConnected)return;const available=playableLevels(library);
    root.innerHTML='<section class="library-intro"><h1>聴くことばを選ぼう</h1><p>同じ録音から、自分の聴こえ方を描こう。</p></section><div class="author-levels"></div>';
    available.forEach(l=>{const b=document.createElement('button');b.textContent=l.word;b.onclick=()=>{if(isAnimating)stopAnimation();mountExploration(root,{level:l,profileId:activeProfileId});};root.querySelector('.author-levels').append(b);});
  }catch(e){root.textContent=e.message;}
}

function renderChallengeSelect() {
  const categories = [
    ['vowelChallenge', 'あ', '母音＆子音篇', '文字の音と形を見つけよう', '01　くすり'],
    ['accent', '高低', 'アクセント篇', '音の高低を組み立てよう', '01　カリキュラム'],
    ['mora', '拍', 'モーラ篇', 'ことばのリズムに注目しよう', '01　カリキュラム'],
  ];
  app.innerHTML = `<main class="page-shell challenge-select-page">${profileHeader()}<section class="category-intro"><button class="back-circle" data-back="home" aria-label="ホームへ戻る">←</button><div><p class="eyebrow">CHOOSE A CHALLENGE</p><h1>どの篇に挑戦しますか？</h1><p>気になるテーマを選んでください。</p></div></section><div class="challenge-categories">${categories.map(([route, icon, title, description, lesson]) => `<button class="challenge-category category-${route}" data-open-challenge="${route}"><span class="category-icon">${icon}</span><span class="category-copy"><small>CHALLENGE</small><b>${title}</b><span>${description}</span><em>${lesson}</em></span><span class="category-arrow">↗</span></button>`).join('')}</div>${bottomNav('')}</main>`;
  bindNav('');
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

function renderChapterLevels() {
  const [title] = chapterTitles[challengeChapter] || chapterTitles.vowelChallenge;
  const builtIns = {
    vowelChallenge: [['builtin-kusuri', 'くすり', 'SVG字形変形チャレンジ', 'vowelChallenge']],
    accent: [['builtin-accent', 'カリキュラム', 'アクセント高低を組み立てる', 'accent']],
    mora: [['builtin-mora', 'カリキュラム', 'モーラを組み立てる', 'mora']],
  }[challengeChapter] || [];
  const diyItems = diyQuestions.filter((question) => question.chapter === challengeChapter || (!question.chapter && question.mode === ({ vowelChallenge: 'diyVowel', accent: 'diyAccent', mora: 'diyMora' }[challengeChapter])));
  const itemMarkup = [...builtIns.map(([id, word, summary, route]) => ({ id, word, summary, route })), ...diyItems.map((question) => ({ id: question.id, word: question.word, summary: `DIY作成 · ${question.audioName || '音声つき'}`, question }))]
    .map((item, index) => `<button class="diy-saved-question chapter-level-card" data-level-id="${escapeHtml(item.id)}" data-level-route="${escapeHtml(item.route || '')}"><span class="diy-saved-glyph">${String(index + 1).padStart(2, '0')}</span><span><b>${escapeHtml(item.word)}</b><small>${escapeHtml(item.summary)}</small></span><i>挑戦 ↗</i></button>`).join('');
  app.innerHTML = `<main class="page-shell challenge-select-page">${profileHeader()}<section class="category-intro"><button class="back-circle" data-back="challenges" aria-label="篇の選択へ戻る">←</button><div><p class="eyebrow">${title} / LEVELS</p><h1>挑戦する問題を選ぶ</h1><p>このブラウザーで作成した DIY 問題もここに追加されます。</p></div></section><div class="chapter-level-list">${itemMarkup || '<p class="diy-empty-hint">この篇にはまだ問題がありません。</p>'}</div>${bottomNav('')}</main>`;
  bindNav('');
  app.querySelectorAll('[data-level-id]').forEach((button) => button.addEventListener('click', () => {
    const route = button.dataset.levelRoute;
    if (route) { navigate(route); return; }
    activeCustomLevel = diyItems.find((question) => question.id === button.dataset.levelId);
    if (!activeCustomLevel) return;
    customPlayReturnScreen = 'chapterLevels';
    if (activeCustomLevel.mode === 'diyVowel') navigate('customVowel');
    else {
      activeDiyQuestion = activeCustomLevel;
      if (diyPlaybackUrl) URL.revokeObjectURL(diyPlaybackUrl);
      diyPlaybackUrl = activeCustomLevel.audioBlob ? URL.createObjectURL(activeCustomLevel.audioBlob) : null;
      diyPlayerPattern = Array(activeCustomLevel.reading.length).fill(null);
      diyPlayerTargetIndex = null;
      diyPlayerLongAfter = Array(activeCustomLevel.reading.length).fill(false);
      diyPlayerBlankAfter = Array(activeCustomLevel.reading.length).fill(false);
      diyPlayerFeedback = '';
      navigate('diyPlay');
    }
  }));
  if (!diyQuestionsLoaded && !diyQuestionsLoading) {
    diyQuestionsLoading = true;
    listDiyQuestions().then((items) => {
      diyQuestions = items;
      diyQuestionsLoaded = true;
      diyQuestionsLoading = false;
      if (screen === 'chapterLevels') renderChapterLevels();
    }).catch((error) => { diyQuestionsLoading = false; console.error('[chapter-levels] 自制关卡读取失败：', error); });
  }
}

const accentMorae = ['カ', 'リ', 'キュ', 'ラ', 'ム'];

function pitchPath() {
  let path = '';
  pitchPattern.forEach((pitch, index) => {
    if (!pitch) return;
    const x = 50 + index * 100;
    const y = pitch === 'high' ? 19 : 57;
    path += `${path && pitchPattern[index - 1] ? 'L' : 'M'}${x} ${y} `;
  });
  return path.trim();
}

function renderAccentChallenge() {
  const picked = pitchPattern.filter(Boolean).length;
  const patternLabel = pitchPattern.map((pitch) => pitch === 'high' ? '高' : pitch === 'low' ? '低' : '・').join('　');
  app.innerHTML = `<main class="page-shell challenge-page">${profileHeader()}<div class="challenge-title-row"><button class="back-circle" data-back="challenges" aria-label="チャレンジ選択へ戻る">←</button><div><p class="eyebrow">ACCENT CHALLENGE / 01</p><h1>アクセントを組み立てる</h1></div></div><div class="challenge-kicker"><span>WORD</span><b>「カリキュラム」</b></div><section class="mission-card"><span class="mission-icon">♧</span><div><p class="blue-label">アクセント・チャレンジ</p><h2>サンプルを聴いて、<br>一拍ずつ高さを選んでください</h2></div></section><section class="pitch-card accent-builder-card"><button class="audio-pill sample-pending" disabled>◖))　サンプル音声（準備中）</button><p class="audio-caption">録音素材を受け取り次第、ここから再生できます</p><div class="pitch-builder"><div class="pitch-row-labels"><span>高</span><span>低</span></div><div class="pitch-columns"><svg class="pitch-path" viewBox="0 0 500 76" preserveAspectRatio="none" aria-hidden="true"><path class="pitch-guide" d="M50 19 H450 M50 57 H450"/><path class="pitch-line-path" d="${pitchPath()}"/></svg>${accentMorae.map((mora, index) => `<div class="pitch-column"><button class="pitch-choice pitch-high ${pitchPattern[index] === 'high' ? 'selected' : ''}" data-mora="${index}" data-pitch="high" aria-label="${mora}を高くする">●</button><button class="pitch-choice pitch-low ${pitchPattern[index] === 'low' ? 'selected' : ''}" data-mora="${index}" data-pitch="low" aria-label="${mora}を低くする">●</button><b>${mora}</b><small>第${index + 1}拍</small></div>`).join('')}</div></div><p class="pitch-note">タップして高低を設定　${picked} / ${accentMorae.length} 拍</p><div class="pattern-readout" aria-live="polite">${patternLabel}</div></section>${answerChecked ? '<p class="answer-feedback recorded" role="status">回答を記録しました。正解データを受け取り次第、判定結果を表示します。</p>' : ''}<button class="judge-button" data-action="judge" ${(picked !== accentMorae.length || answerChecked) ? 'disabled' : ''}>このアクセントで判定する　 ✓</button><p class="judge-hint">選んだ高低パターンをプロフィールに保存します。</p>${bottomNav('')}</main>`;
  bindNav('');
  app.querySelectorAll('[data-mora]').forEach((button) => button.addEventListener('click', () => {
    pitchPattern[Number(button.dataset.mora)] = button.dataset.pitch;
    answerChecked = false;
    renderAccentChallenge();
  }));
  app.querySelector('[data-action="judge"]').addEventListener('click', () => {
    if (pitchPattern.some((pitch) => !pitch)) return;
    profileData.accentSubmissions ||= [];
    profileData.accentSubmissions.push({ word: 'カリキュラム', pattern: [...pitchPattern], createdAt: new Date().toISOString() });
    persistProfile();
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
  app.innerHTML=`<main class="page-shell">${profileHeader()}${titleReturn()}${import.meta.env.DEV?'<button class="text-action" data-nav="developer">図鑑を編集 ↗</button>':''}<div data-library></div>${bottomNav('collection')}</main>`;
  bindNav('collection');mountLibrary(app.querySelector('[data-library]'));
}
function renderLegacyCollection() {
  const filters = [['all', '全て'], ['vowel', '母音'], ['consonant', '子音'], ['accent', 'アクセント']];
  const cards = catalogCards.filter((card) => selectedFilter === 'all' || card.category === selectedFilter);
  const unlocked = card => profileData.collectedCards?.includes(card.id);
  app.innerHTML = `<main class="page-shell collection-page">${profileHeader()}${titleReturn()}<section class="collection-overview"><p class="eyebrow">●　音声標本・目録</p><div class="collection-heading"><h1>音声変形図鑑</h1><span>${profileData.accentSubmissions?.length || 0} 回答記録</span></div><div class="collection-progress"><i style="width:${Math.round(collectedCount() / catalogCards.length * 100)}%"></i></div><div class="collection-meta"><span>${collectedCount()} / ${catalogCards.length} 収集</span><b>(${Math.round(collectedCount() / catalogCards.length * 100)}%)</b></div><div class="filter-row">${filters.map(([id, label]) => `<button class="filter-chip ${selectedFilter === id ? 'selected' : ''}" data-filter="${id}"><i class="dot dot-${id}"></i>${label}</button>`).join('')}<span class="filter-icon">☷</span></div></section><section class="card-grid">${cards.map((card) => `<button class="sound-card card-${card.color} ${unlocked(card) ? '' : 'card-locked'}" data-card="${card.id}"><span class="card-number">#${card.number}</span><span class="card-label">${card.label}</span><b class="card-glyph">${unlocked(card) ? card.glyph : '？'}</b><small>${unlocked(card) ? card.cue : `チャレンジで解放`}</small><span class="card-feature">${unlocked(card) ? `⌁　${card.feature}` : '⌑　未収集'}</span><i class="card-arrow">${unlocked(card) ? '→' : '⌑'}</i></button>`).join('')}</section>${selectedCardId ? renderCardDialog(selectedCardId) : ''}${bottomNav('collection')}</main>`;
  bindNav('collection');
  app.querySelectorAll('[data-filter]').forEach((button) => button.addEventListener('click', () => { selectedFilter = button.dataset.filter; selectedCardId = null; renderCollection(); }));
  app.querySelectorAll('[data-card]').forEach((button) => button.addEventListener('click', () => { selectedCardId = button.dataset.card; renderCollection(); }));
  app.querySelector('[data-card-dialog]')?.addEventListener('click', (event) => event.stopPropagation());
  app.querySelectorAll('[data-close-card]').forEach((button) => button.addEventListener('click', () => { selectedCardId = null; renderCollection(); }));
}

function renderCardDialog(id) {
  const card = catalogCards.find((item) => item.id === id);
  const isUnlocked = profileData.collectedCards?.includes(id);
  return `<div class="dialog-backdrop" data-close-card><section class="card-dialog card-${card.color}" data-card-dialog role="dialog" aria-modal="true" aria-label="${card.label}"><button class="dialog-close" data-close-card aria-label="閉じる">×</button><span class="card-number">#${card.number}</span><b class="dialog-glyph">${isUnlocked ? card.glyph : '？'}</b><h2>${isUnlocked ? card.label : '未収集のカード'}</h2><p>${isUnlocked ? `${card.cue}。音声の特徴は「${card.feature}」です。` : 'チャレンジやDIYモードでカードを集めましょう。'}</p><button class="dark-button" data-close-card>閉じる</button></section></div>`;
}

function renderSettings() {
  app.innerHTML = `<main class="page-shell settings-page">${profileHeader()}${titleReturn()}<section class="page-heading"><p class="eyebrow">PREFERENCES</p><h1>設定</h1><p>プレイ中の音と振動を調整できます。</p></section><section class="settings-panel"><div class="settings-row"><span class="setting-symbol symbol-blue">⌁</span><div><b>振動フィードバック</b><small>間違えた位置を選んだときに軽く振動します</small></div><button class="toggle ${settings.vibration ? 'on' : ''}" role="switch" aria-checked="${settings.vibration}" data-setting="vibration" aria-label="振動フィードバック"><i></i></button></div><div class="settings-row"><span class="setting-symbol symbol-coral">♫</span><div><b>効果音</b><small>正解・不正解の操作音を再生します</small></div><button class="toggle ${settings.sfx ? 'on' : ''}" role="switch" aria-checked="${settings.sfx}" data-setting="sfx" aria-label="効果音"><i></i></button></div><div class="settings-row setting-static"><span class="setting-symbol">◖))</span><div><b>問題の音声</b><small>聞き分け問題の音声はいつでも再生できます</small></div><span class="always-on">ON</span></div></section><section class="settings-profile"><div><p class="eyebrow">CURRENT LEARNING SLOT</p><h2>学習プロフィール</h2><p>進捗はプロフィールごとに別々に保存されます。</p></div><button class="profile-switch" data-action="profiles">${activeProfile.initial}　${activeProfile.name}　↗</button></section><p class="settings-footnote">設定はこのブラウザに保存されます。別の端末とは同期されません。</p>${bottomNav('settings')}</main>`;
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
    .map((char) => char >= 'ぁ' && char <= 'ゖ' ? String.fromCharCode(char.charCodeAt(0) + 0x60) : char)
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
  diyAudioFile = null;
  if (diyAudioUrl) URL.revokeObjectURL(diyAudioUrl);
  diyAudioUrl = null;
  diyGlyphAssets = [];
  diyBuilderMorae = [];
  diyBuilderPattern = [];
  diyTargetIndexes = [];
  diyFeatureCardId = null;
  diyLongAfter = [];
  diyBlankAfter = [];
}

function renderDiyHome() {
  const categories = [
    ['diyVowel', 'あ', '母音＆子音篇', '変形する文字と音の特徴を設定'],
    ['diyAccent', '高低', 'アクセント篇', '読みと高低パターンを設定'],
    ['diyMora', '拍', 'モーラ篇', '長音と空白拍を含むリズムを設定'],
  ];
  app.innerHTML = `<main class="page-shell diy-page">${profileHeader()}${titleReturn()}<section class="page-heading"><p class="eyebrow">DIY MODE / TEACHING TOOL</p><h1>DIYモード</h1><p>作りたい問題の篇を選んでください。</p><small class="diy-local-note">作成した問題はこのブラウザーに保存され、チャレンジ一覧にも追加されます。</small></section><div class="challenge-categories diy-categories">${categories.map(([route, icon, title, description]) => `<button class="challenge-category diy-category" data-open-diy="${route}"><span class="category-icon">${icon}</span><span class="category-copy"><small>DIY / CREATE</small><b>${title}</b><span>${description}</span></span><span class="category-arrow">↗</span></button>`).join('')}</div><section class="diy-saved-section"><div class="section-heading"><div><p class="eyebrow">MY QUESTIONS</p><h2>作成した問題</h2></div></div><div id="diy-saved-list" class="diy-saved-list">読み込み中…</div></section>${bottomNav('diy')}</main>`;
  bindNav('diy');
  app.querySelectorAll('[data-open-diy]').forEach((button) => button.addEventListener('click', () => {
    resetDiyDraft();
    diyMode = button.dataset.openDiy;
    navigate(diyMode);
  }));
  renderDiyQuestionList();
  listDiyQuestions().then((items) => { diyQuestions = items; diyQuestionsLoaded = true; renderDiyQuestionList(); }).catch((error) => {
    const list = app.querySelector('#diy-saved-list');
    if (list) list.textContent = `保存データを読み込めません：${error.message}`;
  });
}

function renderDiyVowelEditor() {
  diyMode = 'diyVowel';
  const featureCards = catalogCards.filter((card) => ['vowel', 'consonant'].includes(card.category) && profileData.collectedCards?.includes(card.id));
  renderDiyEditorShell('母音＆子音篇', '単語と読みを入力し、拍ごとに SVG を登録します。正解にする拍は複数選べます。', `<div class="diy-editor-heading"><b>拍ごとの SVG と正解設定</b><small>全ての拍に通常 SVG、正解の拍には変形後 SVG も登録</small></div><div id="diy-target-morae" class="diy-glyph-assets"><p class="diy-empty-hint">先に読みに対応する文字を入力してください。</p></div><div class="diy-editor-heading"><b>図鑑カード（任意）</b><small>問題の音声特徴をメモ</small></div><div id="diy-feature-cards" class="diy-feature-grid">${featureCards.map((card) => `<button class="diy-feature-choice card-${card.color}" data-feature-card="${card.id}"><b>${card.glyph}</b><span>${card.label}</span></button>`).join('') || '<p class="diy-empty-hint">選択できる図鑑カードはありません。</p>'}</div><p class="diy-material-note">通常 SVG は全ての拍に必要です。正解に選んだ拍には対応する変形後 SVG も必要で、各ペアは同じ viewBox と同じ数/順序の path が必要です。</p>`, 'diy-vowel');
  renderDiyVowelOptions(featureCards);
}

function renderDiyAccentEditor() {
  diyMode = 'diyAccent';
  renderDiyEditorShell('アクセント篇', '単語の読みに含まれる拍を自動で分け、各拍の高低を設定します。', '', 'diy-accent');
}

function renderDiyMoraEditor() {
  diyMode = 'diyMora';
  renderDiyEditorShell('モーラ篇', '拍を自動分割し、隣り合う拍の長音リンクと追加の空白拍を設定します。', '<p class="diy-material-note">「長音」ボタンでこの拍と次の拍を連結。「空白拍」ボタンでこの拍の後に休符を追加します。</p>', 'diy-mora');
}

function renderDiyEditorShell(title, description, extra = '', editorClass = '') {
  app.innerHTML = `<main class="page-shell diy-page ${editorClass}">${profileHeader()}<div class="challenge-title-row"><button class="back-circle" data-back="diy" aria-label="DIYの篇選択へ戻る">←</button><div><p class="eyebrow">DIY MODE / CREATE</p><h1>${title}</h1></div></div><p class="diy-description">${description}</p><section class="diy-form"><label>表示する単語<input id="diy-word" class="design-input" type="text" maxlength="40" placeholder="例：カリキュラム"></label><label>読み（文字をそのまま入力）<input id="diy-reading" class="design-input" type="text" maxlength="80" placeholder="例：カリキュラム"></label><p id="diy-mora-preview" class="diy-mora-preview">読みを入力すると、拍を自動で区切ります。</p>${extra}<label class="audio-upload">録音ファイルを読み込む<input id="diy-audio-file" type="file" accept="audio/*"><span id="diy-audio-name">音声ファイルを選択</span></label><audio id="diy-audio-preview" class="diy-audio-preview" controls hidden></audio>${['diyAccent', 'diyMora'].includes(diyMode) ? `<div class="diy-editor-heading"><b>アクセントパターン</b><small>各拍の高低を選んでください</small></div><div id="diy-pitch-editor" class="diy-pitch-editor"><p class="diy-empty-hint">読みを入力すると拍が自動表示されます。</p></div>` : ''}<button id="diy-save" class="judge-button" disabled>問題を保存する</button><p id="diy-error" class="diy-message" role="status"></p></section>${bottomNav('diy')}</main>`;
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
      diyLongAfter = Array(diyBuilderMorae.length).fill(false);
      diyBlankAfter = Array(diyBuilderMorae.length).fill(false);
      diyTargetIndexes = [];
      diyGlyphAssets = Array.from({ length: diyBuilderMorae.length }, () => ({ normal: null, custom: null, valid: false, revision: 0 }));
    }
    app.querySelector('#diy-mora-preview').textContent = diyBuilderMorae.length ? `自動分割：${diyBuilderMorae.join('・')}（${diyBuilderMorae.length}拍）` : '読みを入力すると、拍を自動で区切ります。';
    renderDiyPitchEditor();
    renderDiyVowelOptions();
  });
  app.querySelector('#diy-audio-file').addEventListener('change', (event) => {
    diyAudioFile = event.target.files?.[0] || null;
    if (diyAudioUrl) URL.revokeObjectURL(diyAudioUrl);
    diyAudioUrl = diyAudioFile ? URL.createObjectURL(diyAudioFile) : null;
    app.querySelector('#diy-audio-name').textContent = diyAudioFile?.name || '音声ファイルを選択';
    const preview = app.querySelector('#diy-audio-preview');
    preview.hidden = !diyAudioUrl;
    if (diyAudioUrl) preview.src = diyAudioUrl;
    updateDiySaveButton();
  });
  app.querySelector('#diy-target-morae')?.addEventListener('change', async (event) => {
    const input = event.target.closest('[data-glyph-file]');
    if (!input) return;
    const index = Number(input.dataset.glyphIndex);
    const kind = input.dataset.glyphFile;
    const file = input.files?.[0] || null;
    diyGlyphAssets[index] ||= { normal: null, custom: null, valid: false, revision: 0 };
    const asset = diyGlyphAssets[index];
    asset[kind] = file;
    const revision = ++asset.revision;
    const error = app.querySelector('#diy-error');
    try {
      if (asset.normal && asset.custom) {
        await validateSvgPair(asset.normal, asset.custom);
        if (asset.revision === revision) asset.valid = true;
      } else if (kind === 'normal' && file) {
        await validateSingleSvg(file);
        if (asset.revision === revision) asset.valid = false;
      } else {
        if (asset.revision === revision) asset.valid = false;
      }
      if (asset.revision !== revision) return;
      if (error) error.textContent = asset.valid ? `第${index + 1}拍の SVG ペアを確認しました。` : '';
    } catch (cause) {
      if (asset.revision !== revision) return;
      asset.valid = false;
      console.error('[diy-svg]', cause);
      if (error) error.textContent = `${kind === 'normal' ? '通常' : '変形後'} SVG（第${index + 1}拍）：${cause.message}`;
    }
    renderDiyVowelOptions();
    updateDiySaveButton();
  });
  app.querySelector('#diy-save').addEventListener('click', async () => {
    const word = wordInput.value.trim();
    const modeValid = diyMode !== 'diyVowel' || (diyTargetIndexes.length > 0 && diyGlyphAssets.length === diyBuilderMorae.length && diyGlyphAssets.every((asset, index) => asset?.normal && (!diyTargetIndexes.includes(index) || (asset.custom && asset.valid))));
    if (!word || !diyAudioFile || !diyBuilderMorae.length || !modeValid || (diyMode !== 'diyVowel' && diyBuilderPattern.some((pitch) => !pitch))) return;
    const chapter = { diyVowel: 'vowelChallenge', diyAccent: 'accent', diyMora: 'mora' }[diyMode];
    const question = { id: crypto.randomUUID(), mode: diyMode, chapter, word, reading: [...diyBuilderMorae], pattern: [...diyBuilderPattern], targetIndexes: [...diyTargetIndexes], targetIndex: diyTargetIndexes[0] ?? null, featureCardId: diyFeatureCardId, glyphAssets: diyMode === 'diyVowel' ? diyGlyphAssets.map((asset) => ({ normalBlob: asset.normal, customBlob: asset.custom })) : [], longAfter: [...diyLongAfter], blankAfter: [...diyBlankAfter], audioBlob: diyAudioFile, audioName: diyAudioFile.name, createdAt: new Date().toISOString() };
    try {
      await saveDiyQuestion(question);
      diyQuestions.unshift(question);
      diyQuestionsLoaded = true;
      resetDiyDraft();
      navigate('diy');
    } catch (error) {
      const message = app.querySelector('#diy-error');
      if (message) message.textContent = `保存できませんでした：${error.message}`;
    }
  });
  renderDiyPitchEditor();
  updateDiySaveButton();
}

function renderDiyVowelOptions(featureCards) {
  const targetGrid = app.querySelector('#diy-target-morae');
  if (targetGrid) {
    targetGrid.innerHTML = diyBuilderMorae.length ? diyBuilderMorae.map((mora, index) => {
      const asset = diyGlyphAssets[index] || {};
      const selected = diyTargetIndexes.includes(index);
      return `<article class="diy-glyph-asset ${selected ? 'target' : ''}"><button type="button" class="diy-mora-select ${selected ? 'selected' : ''}" data-target-mora="${index}">${escapeHtml(mora)}<small>${selected ? '正解' : `第${index + 1}拍`}</small></button><label class="audio-upload">通常 SVG<input data-glyph-file="normal" data-glyph-index="${index}" type="file" accept="image/svg+xml,.svg"><span>${escapeHtml(asset.normal?.name || '通常 SVG を選択')}</span></label><label class="audio-upload">変形後 SVG${selected ? '' : '（正解拍を選ぶと使用）'}<input data-glyph-file="custom" data-glyph-index="${index}" type="file" accept="image/svg+xml,.svg"><span>${escapeHtml(asset.custom?.name || '変形後 SVG を選択')}</span></label><small class="glyph-pair-status">${asset.normal && (!selected || (asset.custom && asset.valid)) ? 'SVG OK' : selected && asset.custom && !asset.valid ? 'SVGペアを再確認' : 'SVG未設定'}</small></article>`;
    }).join('') : '<p class="diy-empty-hint">先に読みに対応する文字を入力してください。</p>';
    targetGrid.querySelectorAll('[data-target-mora]').forEach((button) => button.addEventListener('click', () => {
      const index = Number(button.dataset.targetMora);
      diyTargetIndexes = diyTargetIndexes.includes(index) ? diyTargetIndexes.filter((item) => item !== index) : [...diyTargetIndexes, index].sort((a, b) => a - b);
      renderDiyVowelOptions(featureCards);
      updateDiySaveButton();
    }));
  }
  const cardGrid = app.querySelector('#diy-feature-cards');
  if (cardGrid && featureCards) {
    cardGrid.querySelectorAll('[data-feature-card]').forEach((button) => button.classList.toggle('selected', button.dataset.featureCard === diyFeatureCardId));
    cardGrid.querySelectorAll('[data-feature-card]').forEach((button) => button.onclick = () => {
      diyFeatureCardId = button.dataset.featureCard;
      renderDiyVowelOptions(featureCards);
      updateDiySaveButton();
    });
  }
}

async function validateSvgPair(normalFile, customFile) {
  // 上传后立即加载两份 SVG，检查 viewBox、轮廓数量及 Flubber 是否可建立插值器。
  for (const file of [normalFile, customFile]) {
    if (!file.name.toLowerCase().endsWith('.svg')) throw new Error(`「${file.name}」不是 .svg 文件。`);
  }
  const normalUrl = URL.createObjectURL(normalFile);
  const customUrl = URL.createObjectURL(customFile);
  try {
    const normal = await loadGlyph(normalUrl);
    const custom = await loadGlyph(customUrl);
    assertCompatiblePair(normal, custom, 'アップロードした字形');
    createMorph(normal.shapes.map((shape) => shape.d), custom.shapes.map((shape) => shape.d));
    return true;
  } finally {
    URL.revokeObjectURL(normalUrl);
    URL.revokeObjectURL(customUrl);
  }
}

async function validateSingleSvg(file) {
  if (!file.name.toLowerCase().endsWith('.svg')) throw new Error(`「${file.name}」不是 .svg 文件。`);
  const url = URL.createObjectURL(file);
  try { return await loadGlyph(url); }
  finally { URL.revokeObjectURL(url); }
}

function renderDiyPitchEditor() {
  const editor = app.querySelector('#diy-pitch-editor');
  if (!editor) { updateDiySaveButton(); return; }
  if (!diyBuilderMorae.length) {
    editor.innerHTML = '<p class="diy-empty-hint">読みを入力すると拍が自動表示されます。</p>';
    updateDiySaveButton();
    return;
  }
  editor.innerHTML = diyBuilderMorae.map((mora, index) => `<div class="diy-pitch-row"><b>${escapeHtml(mora)}</b><button class="diy-pitch-option ${diyBuilderPattern[index] === 'high' ? 'selected' : ''}" data-builder-index="${index}" data-builder-pitch="high">高</button><button class="diy-pitch-option ${diyBuilderPattern[index] === 'low' ? 'selected' : ''}" data-builder-index="${index}" data-builder-pitch="low">低</button>${diyMode === 'diyMora' && index < diyBuilderMorae.length - 1 ? `<button class="mora-config-option ${diyLongAfter[index] ? 'enabled' : ''}" data-long-after="${index}">長音</button>` : ''}${diyMode === 'diyMora' ? `<button class="mora-config-option ${diyBlankAfter[index] ? 'enabled' : ''}" data-blank-after="${index}">空白拍</button>` : ''}</div>`).join('');
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
  const modeValid = diyMode !== 'diyVowel' || (diyTargetIndexes.length > 0 && diyGlyphAssets.length === diyBuilderMorae.length && diyGlyphAssets.every((asset, index) => asset?.normal && (!diyTargetIndexes.includes(index) || (asset.custom && asset.valid))));
  const patternValid = diyMode === 'diyVowel' || (diyBuilderPattern.length === diyBuilderMorae.length && diyBuilderPattern.every(Boolean));
  button.disabled = !word || !diyAudioFile || !diyBuilderMorae.length || !modeValid || !patternValid;
}

function renderDiyQuestionList() {
  const list = app.querySelector('#diy-saved-list');
  if (!list) return;
  list.innerHTML = diyQuestions.length ? diyQuestions.map((question) => `<button class="diy-saved-question" data-diy-question="${escapeHtml(question.id)}"><span class="diy-saved-glyph">${escapeHtml(question.word)}</span><span><b>${(question.reading || []).map(escapeHtml).join('・')}</b><small>${escapeHtml(question.audioName || '音声つき問題')}</small></span><i>再生 ↗</i></button>`).join('') : '<p class="diy-empty-hint">まだ問題がありません。上のフォームから作成できます。</p>';
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
    navigate('diyPlay');
  }));
}

function renderCustomVowelChallenge() {
  const question = activeCustomLevel;
  if (!question) { navigate(customPlayReturnScreen); return; }
  customLevelSolved = new Set();
  app.innerHTML = `<main class="page-shell morph-page custom-morph-page">${profileHeader()}<section class="morph-heading"><button class="back-circle" data-back="${customPlayReturnScreen}" aria-label="問題一覧へ戻る">←</button><div><p class="eyebrow">母音＆子音篇 / DIY</p><h1>「${escapeHtml(question.word)}」の字形変形</h1><p>発音の特徴があると思う拍を選んでください。</p></div></section><section class="morph-stage"><div class="morph-label"><span>WORD / ${escapeHtml(question.word)}</span><span>SELECT A SOUND</span></div><div class="character-row custom-character-row">${question.reading.map((mora, index) => `<button class="character-button custom-character-button" data-custom-index="${index}" aria-label="${escapeHtml(mora)}を選ぶ"><svg class="character-svg custom-character-svg" role="img" aria-label="${escapeHtml(mora)}"></svg><span class="character-name">${escapeHtml(mora)}</span></button>`).join('')}</div><p class="status" id="custom-status" aria-live="polite">文字をクリックしてみよう</p></section><div class="audio-control"><button class="audio-pill" id="custom-audio-play">▶　単語の音声を聞く</button><audio id="custom-word-audio" preload="metadata" src="${diyPlaybackUrl || ''}"></audio></div><div class="morph-controls"><button class="outline-button" id="custom-reset">元の形に戻す</button><button class="text-action" id="custom-again">もう一度 ↻</button></div><p class="error" id="custom-error" role="alert" hidden></p><p class="morph-footnote">アップロードされた SVG path を直接補間します / 1000ms</p>${bottomNav(customPlayReturnScreen === 'diy' ? 'diy' : '')}</main>`;
  bindNav(customPlayReturnScreen === 'diy' ? 'diy' : '');
  let normalGlyphsForLevel = [];
  let customGlyphsForLevel = [];
  const correctIndexes = question.targetIndexes || [question.targetIndex];
  let busy = false;
  let solved = new Set();
  const buttons = [...app.querySelectorAll('[data-custom-index]')];
  const status = app.querySelector('#custom-status');
  const setBusyState = (value) => { busy = value; buttons.forEach((button) => { button.disabled = value; }); };
  const reset = () => {
    if (busy) return;
    solved = new Set();
    customLevelSolved = solved;
    buttons.forEach((button) => {
      button.classList.remove('is-wrong', 'is-correct');
      const index = Number(button.dataset.customIndex);
      const svg = button.querySelector('svg');
      const normal = normalGlyphsForLevel[index];
      if (normal && svg) svg.replaceChildren(...normal.shapes.map(({ d, fill }) => createPath(d, fill)));
    });
    status.textContent = '文字をクリックしてみよう';
  };
  (async () => {
    try {
      const assets = question.glyphAssets || [];
      normalGlyphsForLevel = await Promise.all(question.reading.map(async (mora, index) => {
        const asset = assets[index];
        if (!asset?.normalBlob) throw new Error(`「${mora}」の通常字形 SVG がありません（第${index + 1}拍）。`);
        const url = URL.createObjectURL(asset.normalBlob);
        try { return await loadGlyph(url); } finally { URL.revokeObjectURL(url); }
      }));
      customGlyphsForLevel = await Promise.all(question.reading.map(async (mora, index) => {
        if (!correctIndexes.includes(index)) return null;
        const asset = assets[index];
        if (!asset?.customBlob) throw new Error(`「${mora}」の変形後 SVG がありません（第${index + 1}拍）。`);
        const normal = normalGlyphsForLevel[index];
        const url = URL.createObjectURL(asset.customBlob);
        try {
          const custom = await loadGlyph(url);
          assertCompatiblePair(normal, custom, mora);
          createMorph(normal.shapes.map((shape) => shape.d), custom.shapes.map((shape) => shape.d));
          return custom;
        } finally { URL.revokeObjectURL(url); }
      }));
      buttons.forEach((button, index) => {
        const normal = normalGlyphsForLevel[index];
        const svg = button.querySelector('svg');
        svg.setAttribute('viewBox', normal.viewBox);
        svg.replaceChildren(...normal.shapes.map(({ d, fill }) => createPath(d, fill)));
      });
    } catch (error) {
      console.error('[custom-glyph-morph]', error);
      app.querySelector('#custom-error').hidden = false;
      app.querySelector('#custom-error').textContent = `SVG素材を読み込めません：${error.message}`;
      buttons.forEach((button) => { button.disabled = true; });
    }
  })();
  buttons.forEach((button) => button.addEventListener('click', () => {
    if (busy || !normalGlyphsForLevel.length) return;
    const index = Number(button.dataset.customIndex);
    if (correctIndexes.includes(index)) {
      if (solved.has(index)) return;
      const normal = normalGlyphsForLevel[index];
      const custom = customGlyphsForLevel[index];
      if (!custom) return;
      const svg = button.querySelector('svg');
      const paths = [...svg.querySelectorAll('path')];
      try {
        setBusyState(true);
        status.textContent = `「${question.reading[index]}」の輪郭が変化しています…`;
        // 只有用户设定的正确位置会执行真实 SVG 路径变形。
        animateMorph(paths, normal.shapes.map((shape) => shape.d), custom.shapes.map((shape) => shape.d), 1000, () => {
          solved.add(index);
          customLevelSolved = solved;
          button.classList.add('is-correct');
          setBusyState(false);
          status.textContent = correctIndexes.every((target) => solved.has(target)) ? '正解です。すべての特徴を見つけました。' : '正解です。ほかの特徴も探してみよう。';
          if (settings.sfx) playCorrectFeedback();
        });
      } catch (error) {
        setBusyState(false);
        console.error('[custom-glyph-morph]', error);
        const box = app.querySelector('#custom-error');
        box.hidden = false;
        box.textContent = `字形を変形できません：${error.message}`;
      }
    } else {
      if (settings.vibration && navigator.vibrate) navigator.vibrate(65);
      if (settings.sfx) playWrongFeedback();
      button.classList.remove('is-wrong');
      void button.offsetWidth;
      button.classList.add('is-wrong');
      status.textContent = 'ちがう文字です。もう一度選んでください。';
      window.setTimeout(() => button.classList.remove('is-wrong'), 720);
    }
  }));
  app.querySelector('#custom-reset').addEventListener('click', reset);
  app.querySelector('#custom-again').addEventListener('click', reset);
  app.querySelector('#custom-audio-play').addEventListener('click', () => {
    const audio = app.querySelector('#custom-word-audio');
    audio.play().catch((error) => { console.warn('[custom-audio]', error); status.textContent = '音声を再生できませんでした。録音ファイルを確認してください。'; });
  });
}

function renderDiyPlayer() {
  if (!activeDiyQuestion) { navigate('diy'); return; }
  const question = activeDiyQuestion;
  const isVowelQuestion = question.mode === 'diyVowel';
  const isMoraQuestion = question.mode === 'diyMora';
  const picked = isVowelQuestion ? diyPlayerTargetIndex !== null : diyPlayerPattern.filter(Boolean).length === question.reading.length;
  const responseArea = isVowelQuestion
    ? `<p>録音を聴いて、変形する拍を選んでください。</p><div class="diy-play-morae">${question.reading.map((mora, index) => `<button class="diy-play-mora diy-target-choice ${diyPlayerTargetIndex === index ? 'selected' : ''}" data-play-target="${index}"><b>${escapeHtml(mora)}</b><small>第${index + 1}拍</small></button>`).join('')}</div>`
    : `<p>${isMoraQuestion ? '拍ごとの高低、長音、空白拍を設定してください。' : '録音を聴いて、各拍の高低を選んでください。'}</p><div class="diy-play-morae">${question.reading.map((mora, index) => `<div class="diy-play-mora"><b>${escapeHtml(mora)}</b><button class="diy-pitch-option ${diyPlayerPattern[index] === 'high' ? 'selected' : ''}" data-play-index="${index}" data-play-pitch="high">高</button><button class="diy-pitch-option ${diyPlayerPattern[index] === 'low' ? 'selected' : ''}" data-play-index="${index}" data-play-pitch="low">低</button>${isMoraQuestion && index < question.reading.length - 1 ? `<button class="mora-config-option ${diyPlayerLongAfter[index] ? 'enabled' : ''}" data-play-long="${index}">長音</button>` : ''}${isMoraQuestion ? `<button class="mora-config-option ${diyPlayerBlankAfter[index] ? 'enabled' : ''}" data-play-blank="${index}">空白拍</button>` : ''}</div>`).join('')}</div>`;
  const backTarget = customPlayReturnScreen === 'chapterLevels' ? 'chapterLevels' : 'diy';
  app.innerHTML = `<main class="page-shell diy-page ${isMoraQuestion ? 'diy-mora' : ''}">${profileHeader()}<div class="challenge-title-row"><button class="back-circle" data-back="${backTarget}" aria-label="問題一覧へ戻る">←</button><div><p class="eyebrow">${customPlayReturnScreen === 'chapterLevels' ? 'CHALLENGE / DIY LEVEL' : 'DIY QUESTION / PLAY'}</p><h1>${escapeHtml(question.word)}</h1></div></div><section class="diy-play-card">${responseArea}<audio class="diy-audio-playback" controls src="${diyPlaybackUrl || ''}"></audio></section>${diyPlayerFeedback ? `<p class="answer-feedback recorded" role="status">${diyPlayerFeedback}</p>` : ''}<button class="judge-button" data-check-diy ${!picked ? 'disabled' : ''}>回答を判定する</button>${bottomNav(backTarget === 'diy' ? 'diy' : '')}</main>`;
  bindNav(backTarget === 'diy' ? 'diy' : '');
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
    if (isVowelQuestion) {
      if (diyPlayerTargetIndex === null) return;
      diyPlayerFeedback = diyPlayerTargetIndex === question.targetIndex ? '正解です。変形する拍が一致しました。' : '場所が異なります。録音をもう一度聴いてみましょう。';
      renderDiyPlayer();
      return;
    }
    if (diyPlayerPattern.some((pitch) => !pitch)) return;
    const correctPitch = diyPlayerPattern.every((pitch, index) => pitch === question.pattern[index]);
    const correctMora = !isMoraQuestion || (diyPlayerLongAfter.every((value, index) => value === Boolean(question.longAfter?.[index])) && diyPlayerBlankAfter.every((value, index) => value === Boolean(question.blankAfter?.[index])));
    const correct = correctPitch && correctMora;
    diyPlayerFeedback = correct ? (isMoraQuestion ? '正解です。モーラの構成が一致しました。' : '正解です。アクセントパターンが一致しました。') : 'パターンが異なります。録音をもう一度聴いてみましょう。';
    renderDiyPlayer();
  });
}

const moraLesson = ['カ', 'リ', 'キュ', 'ラ', 'ム'];

function clearMoraState(index) {
  if (moraStates[index] === 'long-start' && index + 1 < moraStates.length) moraStates[index + 1] = 'off';
  if (moraStates[index] === 'long-end' && index > 0) moraStates[index - 1] = 'off';
  moraStates[index] = 'off';
}

function renderMoraChallenge() {
  app.innerHTML = `<main class="page-shell mora-page">${profileHeader()}<section class="mora-heading"><button class="back-circle" data-back="challenges" aria-label="チャレンジ選択へ戻る">←</button><div><p class="eyebrow">MORA CHALLENGE / 01</p><h1>モーラを組み立てる</h1></div></section><p class="mora-instruction">一拍をタップして選択。長押しで半拍または長音を設定します。</p><section class="mora-word-card"><div class="mora-unit-list">${moraLesson.map((mora, index) => `<div class="mora-unit ${moraStates[index].startsWith('long') ? 'is-linked' : ''}"><button class="mora-dot ${moraStates[index]}" data-mora-unit="${index}" aria-label="${mora} ${moraStates[index]}">${moraStates[index] === 'half' ? '½' : moraStates[index].startsWith('long') ? '↔' : ''}</button><b>${mora}</b>${moraStates[index] === 'long-start' ? '<span class="mora-link-line"></span>' : ''}</div>`).join('')}</div><p class="mora-readout">${moraStates.map((state) => ({ off: '・', beat: '●', half: '½', 'long-start': '長', 'long-end': '音' })[state]).join('　')}</p>${moraMenuIndex !== null ? `<div class="mora-longpress-menu"><b>${moraLesson[moraMenuIndex]} の設定</b><button data-mora-choice="half">半拍にする</button><button data-mora-choice="long" ${moraMenuIndex === moraLesson.length - 1 ? 'disabled' : ''}>次の拍とつないで長音にする</button><button data-mora-choice="close">キャンセル</button></div>` : ''}</section><p class="mora-state-note">灰色の丸をタップすると一拍になります。もう一度タップすると解除します。</p>${bottomNav('')}</main>`;
  bindNav('');
  app.querySelectorAll('[data-mora-unit]').forEach((button) => {
    const index = Number(button.dataset.moraUnit);
    button.addEventListener('pointerdown', () => {
      moraHoldTriggered = false;
      moraHoldTimer = window.setTimeout(() => { moraHoldTriggered = true; moraMenuIndex = index; renderMoraChallenge(); }, 520);
    });
    button.addEventListener('pointerup', () => window.clearTimeout(moraHoldTimer));
    button.addEventListener('pointerleave', () => window.clearTimeout(moraHoldTimer));
    button.addEventListener('click', () => {
      if (moraHoldTriggered) { moraHoldTriggered = false; return; }
      moraMenuIndex = null;
      if (moraStates[index] === 'off') moraStates[index] = 'beat'; else clearMoraState(index);
      renderMoraChallenge();
    });
  });
  app.querySelectorAll('[data-mora-choice]').forEach((button) => button.addEventListener('click', () => {
    const index = moraMenuIndex;
    const choice = button.dataset.moraChoice;
    moraMenuIndex = null;
    if (choice === 'half') { clearMoraState(index); moraStates[index] = 'half'; }
    if (choice === 'long' && index < moraLesson.length - 1) { clearMoraState(index); clearMoraState(index + 1); moraStates[index] = 'long-start'; moraStates[index + 1] = 'long-end'; }
    renderMoraChallenge();
  }));
}

function renderMorphGame() {
  const characterButtons = level.characters.map(({ id, text }) => `
    <button class="character-button" data-character="${id}" aria-label="${text} を選ぶ">
      <svg class="character-svg" viewBox="0 0 170.08 170.08" role="img" aria-label="${text}"></svg>
      <span class="character-name">${text}</span>
    </button>`).join('');
  const statistics = getCharacterStatistics(level.characters);
  const testRows = level.characters.map((character) => {
    const stats = statistics[character.text];
    const hasPattern = Boolean(character.custom);
    return `<div class="intensity-test-row ${hasPattern ? '' : 'missing-pattern'}"><div class="intensity-test-glyph"><svg class="intensity-preview-svg" data-preview-glyph="${character.id}" viewBox="0 0 170.08 170.08" role="img" aria-label="${character.text} の変形テスト"></svg><b>${character.text}</b></div><label class="intensity-slider-label" for="intensity-${character.id}"><span>${character.text}　${stats.selectedCount} / ${stats.totalPlayers}人</span><output data-intensity-output="${character.id}">${Math.round(stats.intensity * 100)}%</output><input id="intensity-${character.id}" data-intensity-slider="${character.id}" type="range" min="0" max="100" step="1" value="${Math.round(stats.intensity * 100)}" ${hasPattern ? '' : 'disabled'} aria-label="${character.text} の変形度"></label>${hasPattern ? '' : '<small class="intensity-missing-note">この文字の変形 SVG は未登録</small>'}</div>`;
  }).join('');
  app.innerHTML = `<main class="page-shell morph-page">${profileHeader()}<section class="morph-heading"><button class="back-circle" data-action="back-home">←</button><div><p class="eyebrow">母音＆子音篇　/　01</p><h1>「${level.word}」の字形変形</h1><p>発音の特徴がある文字を選んでください。</p></div></section><section class="morph-stage"><div class="morph-label"><span>WORD / ${level.word}</span><span>SELECT A SOUND</span></div><div class="character-row">${characterButtons}</div><p class="status" id="status" aria-live="polite">「く」をクリックしてみよう</p></section><details class="intensity-test"><summary>開発テスト　/　集団選択率の変形プレビュー</summary><p class="intensity-test-description">仮データ：${mockStatistics.totalPlayers}人。各字の選択率を変形度にそのまま反映します。複数選択できるため合計は100%を超える場合があります。</p><div class="intensity-test-list">${testRows}</div></details><div class="morph-controls"><button class="primary-cta compact" id="play">変形を再生　↗</button><button class="outline-button" id="reset">元の形に戻す</button><button class="text-action" id="again">もう一度 ↻</button></div><div class="audio-control"><button class="audio-pill" id="audio-play">▶　単語の音声を聞く</button><span>くすり</span><audio id="word-audio" preload="metadata" src="${level.audio}"></audio></div><p class="error" id="error" role="alert" hidden></p><p class="morph-footnote">SVG path interpolation / 1000ms</p>${bottomNav('diy')}</main>`;
  bindNav('diy');
  app.querySelector('[data-action="back-home"]').addEventListener('click', () => navigate('challenges'));
  app.querySelectorAll('.character-button').forEach((button) => button.addEventListener('click', () => handleCharacterClick(button.dataset.character)));
  app.querySelector('#play').addEventListener('click', playTargetMorph);
  app.querySelector('#again').addEventListener('click', () => { resetGlyphs(); playTargetMorph(); });
  app.querySelector('#reset').addEventListener('click', resetGlyphs);
  app.querySelector('#audio-play').addEventListener('click', playAudio);
  setupGlyphs();
}

async function setupGlyphs() {
  try {
    // 每个字符独立加载 SVG，再验证目标字形配对，避免缺失素材静默失败。
    await Promise.all(level.characters.map(async (character) => {
      const normal = await loadGlyph(character.normal);
      normalGlyphs.set(character.id, normal);
      if (character.custom) {
        const custom = await loadGlyph(character.custom);
        assertCompatiblePair(normal, custom, character.text);
        customGlyphs.set(character.id, custom);
        morphInterpolations.set(character.id, createMorph(normal.shapes.map((shape) => shape.d), custom.shapes.map((shape) => shape.d)));
      }
      const svg = app.querySelector(`[data-character="${character.id}"] .character-svg`);
      if (!svg) return;
      svg.setAttribute('viewBox', normal.viewBox);
      svg.replaceChildren(...normal.shapes.map((shape) => createPath(shape.d, shape.fill, shape)));
      const preview = app.querySelector(`[data-preview-glyph="${character.id}"]`);
      if (preview) {
        preview.setAttribute('viewBox', normal.viewBox);
        preview.replaceChildren(...normal.shapes.map((shape) => createPath(shape.d, shape.fill, shape)));
      }
    }));
    setupIntensityTest(getCharacterStatistics(level.characters));
  } catch (error) { showError(error); }
}

function createPath(d, fill, shape = {}) {
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', d);
  path.setAttribute('fill', fill);
  for (const attribute of ['fillRule', 'clipRule', 'opacity']) {
    if (shape[attribute]) path.setAttribute(attribute.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`), shape[attribute]);
  }
  return path;
}

function setupIntensityTest(statistics) {
  app.querySelectorAll('[data-intensity-slider]').forEach((slider) => {
    const character = level.characters.find(({ id }) => id === slider.dataset.intensitySlider);
    if (!character?.custom) return;
    const glyph = app.querySelector(`[data-preview-glyph="${character.id}"]`);
    const paths = [...glyph.querySelectorAll('path')];
    const interpolation = morphInterpolations.get(character.id);
    if (!interpolation) return;
    const update = () => {
      const intensity = Number(slider.value) / 100;
      setMorphIntensity(paths, interpolation, intensity);
      app.querySelector(`[data-intensity-output="${character.id}"]`).value = `${slider.value}%`;
      app.querySelector(`[data-intensity-output="${character.id}"]`).textContent = `${slider.value}%`;
    };
    slider.addEventListener('input', update);
    // 初始值来自模拟选择率，用户仍可拖动至任意强度。
    slider.value = String(Math.round(statistics[character.text].intensity * 100));
    update();
  });
}

function assertCompatiblePair(normal, custom, label) {
  const a = normal.viewBox.trim().split(/[ ,]+/).map(Number);
  const b = custom.viewBox.trim().split(/[ ,]+/).map(Number);
  if (a.some((value, index) => Math.abs(value - b[index]) > 0.001)) throw new Error(`「${label}」の普通字形と変形字形で viewBox が一致しません。`);
  if (normal.shapes.length !== custom.shapes.length) throw new Error(`「${label}」の path 数が一致しません（普通 ${normal.shapes.length} 個、変形後 ${custom.shapes.length} 個）。`);
}

function showError(error) {
  console.error('[glyph-morph]', error);
  const box = app.querySelector('#error');
  if (box) { box.hidden = false; box.textContent = `${error.message} 詳しくは開発者コンソールを確認してください。`; }
}

function setBusy(busy) {
  isAnimating = busy;
  app.querySelectorAll('.character-button, #play, #reset, #again').forEach((button) => { button.disabled = busy; });
}

function handleCharacterClick(characterId) {
  if (isAnimating) return;
  const character = level.characters.find((item) => item.id === characterId);
  const button = app.querySelector(`[data-character="${characterId}"]`);
  if (character?.isTarget) {
    if (currentForm === 'custom') resetGlyphs();
    playTargetMorph();
  } else {
    if (settings.vibration && navigator.vibrate) navigator.vibrate(65);
    if (settings.sfx) playWrongFeedback();
    button.classList.remove('is-wrong');
    void button.offsetWidth;
    button.classList.add('is-wrong');
    app.querySelector('#status').textContent = 'ちがう文字です。もう一度選んでください。';
    window.setTimeout(() => button.classList.remove('is-wrong'), 720);
  }
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

function playTargetMorph() {
  if (isAnimating) return;
  const normal = normalGlyphs.get('ku');
  const custom = customGlyphs.get('ku');
  if (!normal || !custom) return;
  const svg = app.querySelector('[data-character="ku"] .character-svg');
  const paths = [...svg.querySelectorAll('path')];
  app.querySelector('#error').hidden = true;
  try {
    setBusy(true);
    app.querySelector('#status').textContent = '「く」の輪郭が変化しています…';
    cancelAnimation = animateMorph(paths, normal.shapes.map((shape) => shape.d), custom.shapes.map((shape) => shape.d), 1000, () => {
      currentForm = 'custom';
      setBusy(false);
      cancelAnimation = null;
      app.querySelector('#status').textContent = '「く」が変形しました。';
      if (settings.sfx) playCorrectFeedback();
      profileData.morphComplete = true;
      unlockCards(['accent-morph']);
      persistProfile();
    });
  } catch (error) { setBusy(false); showError(error); }
}

function resetGlyphs() {
  if (!normalGlyphs.size) return;
  stopAnimation();
  for (const character of level.characters) {
    const normal = normalGlyphs.get(character.id);
    const svg = app.querySelector(`[data-character="${character.id}"] .character-svg`);
    if (normal && svg) svg.replaceChildren(...normal.shapes.map(({ d, fill }) => createPath(d, fill)));
  }
  currentForm = 'normal';
  const status = app.querySelector('#status');
  if (status) status.textContent = '「く」をクリックしてみよう';
  const error = app.querySelector('#error');
  if (error) error.hidden = true;
}

function stopAnimation() {
  if (cancelAnimation) cancelAnimation();
  cancelAnimation = null;
  setBusy(false);
}

async function playAudio() {
  const audio = app.querySelector('#word-audio');
  try { audio.currentTime = 0; await audio.play(); }
  catch (error) { showError(new Error(`音声を再生できませんでした：${error.message}`)); }
}

if(new URLSearchParams(location.search).has('collection-check'))mountCollectionCheck(app);else render();
