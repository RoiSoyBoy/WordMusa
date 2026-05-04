export function scanLineForWords(line, dictionary) {
  if (!line) return [];
  
  // Regex to split by word boundaries, keeping punctuation as separate tokens.
  // We use \b to match word boundaries.
  const regex = /(\b[\w']+\b)/g;
  
  const tokens = [];
  let lastIndex = 0;
  
  let match;
  while ((match = regex.exec(line)) !== null) {
    const word = match[0];
    const startIndex = match.index;
    
    // Add text before the word
    if (startIndex > lastIndex) {
      tokens.push({
        text: line.substring(lastIndex, startIndex),
        isMatch: false,
      });
    }
    
    const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
    if (Object.hasOwn(dictionary, cleanWord)) {
      tokens.push({
        text: word,
        isMatch: true,
        wordData: dictionary[cleanWord]
      });    } else {
      tokens.push({
        text: word,
        isMatch: false,
      });
    }
    
    lastIndex = regex.lastIndex;
  }
  
  // Add remaining text
  if (lastIndex < line.length) {
    tokens.push({
      text: line.substring(lastIndex),
      isMatch: false,
    });
  }
  
  return tokens;
}
