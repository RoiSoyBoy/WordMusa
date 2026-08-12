export const ACHIEVEMENT_CATEGORIES = [
  { key: 'streak', label: 'רצף ימים', icon: '🔥', statField: 'streakCount', tiers: [3, 7, 14, 30, 60, 100] },
  { key: 'learned', label: 'מילים נלמדו', icon: '📘', statField: 'totalWordsLearned', tiers: [10, 25, 50, 100, 250, 500] },
  { key: 'encountered', label: 'מילים נתקלו', icon: '👁️', statField: 'totalWordsEncountered', tiers: [25, 50, 100, 250, 500, 1000] },
  { key: 'songs', label: 'שירים הושמעו', icon: '🎵', statField: 'totalSongs', tiers: [5, 10, 25, 50, 100, 200] },
];

export function getAchievements(stats) {
  return ACHIEVEMENT_CATEGORIES.map(cat => {
    const value = stats?.[cat.statField] || 0;
    const earnedTiers = cat.tiers.filter(t => value >= t);
    const nextTierIdx = cat.tiers.findIndex(t => value < t);
    const nextTier = nextTierIdx === -1 ? null : cat.tiers[nextTierIdx];
    const prevTier = nextTierIdx <= 0 ? 0 : cat.tiers[nextTierIdx - 1];
    const progress = nextTier ? Math.min(1, (value - prevTier) / (nextTier - prevTier)) : 1;
    return { ...cat, value, earnedTiers, nextTier, progress };
  });
}
