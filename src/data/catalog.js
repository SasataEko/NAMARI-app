// 图鉴卡片的数据与显示内容分开，后续可在这里继续添加发音特征。
export const catalogCards = [
  { id: 'vowel-open', number: '01', category: 'vowel', label: '開口母音', glyph: 'あ', cue: '口腔を大きく開く', feature: '第1フォルマント', color: 'yellow', unlocked: true },
  { id: 'vowel-rounded', number: '02', category: 'vowel', label: '円唇母音', glyph: 'う', cue: '唇を丸める', feature: '低周波共振', color: 'yellow', unlocked: true },
  { id: 'consonant-burst', number: '03', category: 'consonant', label: '軟口蓋破裂', glyph: 'か', cue: '息を瞬間的に出す', feature: '無声閉鎖音', color: 'blue', unlocked: true },
  { id: 'consonant-friction', number: '04', category: 'consonant', label: '歯茎摩擦', glyph: 'さ', cue: '息を細く抜く', feature: '高帯域ノイズ', color: 'neutral', unlocked: false },
  { id: 'accent-fall', number: '08', category: 'accent', label: '下降型', glyph: '高 ↘ 低', cue: '一拍目の後に下降', feature: 'ピッチ下降', color: 'coral', unlocked: true },
  { id: 'accent-rise', number: '09', category: 'accent', label: '上昇型', glyph: '低 ↗ 高', cue: '後半にかけて上昇', feature: 'ピッチ上昇', color: 'pink', unlocked: true },
  { id: 'accent-morph', number: '10', category: 'accent', label: '語尾変形', glyph: 'く → く', cue: 'くすりの字形変形', feature: '音と輪郭の変化', color: 'coral', unlocked: false },
  { id: 'nasal', number: '13', category: 'consonant', label: '鼻濁音', glyph: '？', cue: '鼻へ抜ける音', feature: '未収集', color: 'locked', unlocked: false },
  { id: 'devoicing', number: '14', category: 'vowel', label: '促音つなぎ', glyph: '？', cue: '無声化する音', feature: '未収集', color: 'locked', unlocked: false },
];
