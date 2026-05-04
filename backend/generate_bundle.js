const fs = require('fs');
const path = require('path');

function generateClientBundle() {
  const wordsPath = path.join(__dirname, 'words.json');
  const rawData = fs.readFileSync(wordsPath, 'utf8');
  const words = JSON.parse(rawData);

  console.log(`Loaded ${words.length} words from JSON.`);

  const clientBundlePath = path.join(__dirname, '..', 'frontend', 'assets', 'psychometric_words_bundle.json');
  
  const dir = path.dirname(clientBundlePath);
  if (!fs.existsSync(dir)){
      fs.mkdirSync(dir, { recursive: true });
  }

  const clientData = words.map(wordObj => ({
    word: wordObj.word.toLowerCase(),
    hebrewShort: wordObj.hebrewShort,
    frequencyTier: wordObj.frequencyTier
  }));

  fs.writeFileSync(clientBundlePath, JSON.stringify(clientData, null, 2), 'utf8');
  console.log(`Wrote client bundle to ${clientBundlePath} with ${clientData.length} entries.`);
}

generateClientBundle();
