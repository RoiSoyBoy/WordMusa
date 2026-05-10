import { psychometricWordMap } from './psychometricWords';

export function scanLineForWords(line) {
  if (!line) return [];

  const tokens = [];
  let lastIndex = 0;
  const regex = /\b([a-zA-Z']+)\b/g;
  let match;

  while ((match = regex.exec(line)) !== null) {
    const word = match[0];
    const startIndex = match.index;

    if (startIndex > lastIndex) {
      tokens.push({ text: line.substring(lastIndex, startIndex), isMatch: false });
    }

    const clean = word.toLowerCase().replace(/[^a-z]/g, '');
    const wordData = psychometricWordMap.get(clean);

    if (wordData) {
      tokens.push({ text: word, isMatch: true, wordData });
    } else {
      tokens.push({ text: word, isMatch: false });
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < line.length) {
    tokens.push({ text: line.substring(lastIndex), isMatch: false });
  }

  return tokens;
}
