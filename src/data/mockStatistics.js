// 仅用于开发和视觉验证。将来可由 Supabase 查询结果替换此对象。
export const mockStatistics = {
  totalPlayers: 100,
  characters: {
    'く': 93,
    'す': 13,
    'り': 5,
  },
};

/** 线性映射：选择率直接作为 0～1 的字形插值强度。 */
export function selectionRateToIntensity(selectedCount, totalPlayers) {
  if (!Number.isFinite(totalPlayers) || totalPlayers <= 0) return 0;
  return Math.max(0, Math.min(1, selectedCount / totalPlayers));
}

/** 每个假名独立计算选择率和强度；可多选，因此各字计数之和可大于玩家总数。 */
export function getCharacterStatistics(characters, statistics = mockStatistics) {
  return Object.fromEntries(characters.map(({ text }) => {
    const selectedCount = Math.max(0, Number(statistics.characters[text]) || 0);
    return [text, {
      selectedCount,
      totalPlayers: statistics.totalPlayers,
      selectionRate: selectionRateToIntensity(selectedCount, statistics.totalPlayers),
      intensity: selectionRateToIntensity(selectedCount, statistics.totalPlayers),
    }];
  }));
}
