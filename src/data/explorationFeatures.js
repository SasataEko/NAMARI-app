// Each character accepts 1–3 prepared SVG variants. Do not invent phonetic labels for unreviewed assets.
export function featuresFor(character) {
  return character.features || (character.custom ? [{
    id: `${character.id}-custom`, title: '用意された変化 01',
    description: '輪郭の変化を見て、録音の聴こえ方に近いか確かめてください。',
    svg: character.custom,
  }] : []);
}
