import wordsData from '../../assets/words.json';

export const psychometricWordSet = new Set(
  wordsData.map(w => w?.word?.toLowerCase()).filter(Boolean)
);

export const psychometricWordMap = new Map(
  wordsData
    .filter(w => w?.word)
    .map(w => [w.word.toLowerCase(), w])
);
