import wordsData from '../../assets/words.json';
import basicWordsData from '../../assets/basic_words.json';

// Deduplicate by lowercase word key — keep first occurrence
const deduped = (() => {
  const seen = new Set();
  return wordsData.filter(w => {
    if (!w?.word) return false;
    const key = w.word.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
})();

export const psychometricWordSet = new Set(
  deduped.map(w => w.word.toLowerCase())
);

export const psychometricWordMap = new Map(
  deduped.map(w => [w.word.toLowerCase(), w])
);

// CEFR A1+A2 exclusion set — words Israeli students already know
export const basicWordSet = new Set(basicWordsData);

// All valid English psychometric words, each with a `level` 1-10.
// Level 1 = hardest/rarest (LOW tier), Level 10 = most common (HIGH tier).
// Sorted by level then A-Z within each level.
export const psychometricWordList = (() => {
  const TIER_RANK = { LOW: 0, MEDIUM: 1, HIGH: 2 };
  const arr = deduped
    .filter(w => /^[a-zA-Z'-]+$/.test(w.word))
    .map(w => ({ ...w }));
  arr.sort((a, b) => {
    const td = TIER_RANK[a.frequencyTier] - TIER_RANK[b.frequencyTier];
    return td !== 0 ? td : a.word.localeCompare(b.word);
  });
  const total = arr.length;
  arr.forEach((w, i) => { w.level = Math.min(10, Math.floor((i / total) * 10) + 1); });
  arr.sort((a, b) => a.level !== b.level ? a.level - b.level : a.word.localeCompare(b.word));
  return arr;
})();
