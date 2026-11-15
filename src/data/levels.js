// 关卡配置按字保存素材和点击判定；后续可以继续追加题目。
const asset = (name) => `${import.meta.env?.BASE_URL || '/NAMARI-app/'}assets/${name}`;

export const levels = [
  {
    id: 'kusuri',
    recordingId: 'kusuri-recording-v1',
    word: 'くすり',
    defaultAccent: ['low', 'high', 'high'],
    instruction: '発音の特徴がある文字を選んでください。',
    audio: asset('kusuri-audio.mp3'),
    characters: [
      { id: 'ku', text: 'く', normal: asset('normal/ku.svg'), custom: asset('namari/pattern-U/ku-NM.svg'), isTarget: true },
      { id: 'su', text: 'す', normal: asset('normal/su.svg'), isTarget: false },
      { id: 'ri', text: 'り', normal: asset('normal/ri.svg'), isTarget: false },
    ],
  },
];
