// 关卡配置按字保存素材和点击判定；后续可以继续追加题目。
export const levels = [
  {
    id: 'kusuri',
    word: 'くすり',
    instruction: '発音の特徴がある文字を選んでください。',
    audio: '/assets/kusuri-audio.mp3',
    characters: [
      { id: 'ku', text: 'く', normal: '/assets/ku-normal.svg', custom: '/assets/ku-accented.svg', isTarget: true },
      { id: 'su', text: 'す', normal: '/assets/su-normal.svg', isTarget: false },
      { id: 'ri', text: 'り', normal: '/assets/ri-normal.svg', isTarget: false },
    ],
  },
];
