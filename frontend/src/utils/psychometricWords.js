import wordsData from '../../assets/words.json';
import basicWordsData from '../../assets/basic_words.json';

export const psychometricWordSet = new Set(
  wordsData.map(w => w?.word?.toLowerCase()).filter(Boolean)
);

export const psychometricWordMap = new Map(
  wordsData
    .filter(w => w?.word)
    .map(w => [w.word.toLowerCase(), w])
);

// CEFR A1+A2 exclusion set — words Israeli students already know
export const basicWordSet = new Set(basicWordsData);
