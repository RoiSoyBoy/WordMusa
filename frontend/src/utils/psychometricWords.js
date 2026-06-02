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
// Level = unit number from the Campus dictionary (1 = easiest, 10 = hardest).
// Words not in the Campus dictionary fall back to frequencyTier estimate.
// Sorted by level then A-Z within each level.
export const psychometricWordList = (() => {
  const TIER_FALLBACK = { HIGH: 3, MEDIUM: 6, LOW: 9 };
  const arr = deduped
    .filter(w => /^[a-zA-Z'-]+$/.test(w.word))
    .map(w => ({
      ...w,
      level: w.unit != null ? w.unit : (TIER_FALLBACK[w.frequencyTier] ?? 5),
    }));
  arr.sort((a, b) => a.level !== b.level ? a.level - b.level : a.word.localeCompare(b.word));
  return arr;
})();
