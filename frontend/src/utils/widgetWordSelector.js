import { psychometricWordList, psychometricWordMap } from './psychometricWords';

function djb2(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash = hash >>> 0; // keep as unsigned 32-bit int
  }
  return hash;
}

/**
 * Pick a deterministic word for the given user+day combination.
 * Same uid+today always returns the same word — stable across app opens.
 * Prefers learned psychometric words; falls back to easiest tier if none learned.
 */
export function selectWidgetWord(learnedWordSet, uid, today) {
  const seed = djb2(`${uid}${today}`);

  const candidates = [...learnedWordSet].filter(w => psychometricWordMap.has(w));
  if (candidates.length > 0) {
    candidates.sort(); // stable sort so order is consistent across JS engines
    return psychometricWordMap.get(candidates[seed % candidates.length]);
  }

  // Fallback: pick from the lowest-level (easiest) psychometric words
  const easy = psychometricWordList.filter(w => w.level <= 3);
  const pool = easy.length > 0 ? easy : psychometricWordList;
  return pool[seed % pool.length];
}
