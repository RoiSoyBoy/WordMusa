const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
process.env.GCLOUD_PROJECT = 'demo-lyriclearn';

// Initialize Firebase Admin with dummy credentials for the emulator
// For emulator, we can just use applicationDefault if FIRESTORE_EMULATOR_HOST is set,
// but to avoid credential issues we can pass an empty credential if we mock it,
// actually wait, let's just use a properly formatted dummy RSA key.

const crypto = require('crypto');
const { privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

admin.initializeApp({ 
  projectId: 'demo-lyriclearn',
  credential: admin.credential.cert({
    projectId: 'demo-lyriclearn',
    clientEmail: 'demo@demo.com',
    privateKey: privateKey
  })
});
const db = admin.firestore();

async function seedWords() {
  const wordsPath = path.join(__dirname, 'words.json');
  const rawData = fs.readFileSync(wordsPath, 'utf8');
  const words = JSON.parse(rawData);

  console.log(`Loaded ${words.length} words from JSON.`);

  // 1. Populate Firestore using batching
  const collectionRef = db.collection('psychometric_words');
  let batch = db.batch();
  let operationCount = 0;
  let batchCount = 0;

  for (const wordObj of words) {
    // Schema mapping per PRD (Assuming existing JSON keys match)
   for (const wordObj of words) {
     if (!wordObj.word || typeof wordObj.word !== 'string') {
       console.warn('Skipping invalid word entry:', wordObj);
       continue;
     }
     // Schema mapping per PRD (Assuming existing JSON keys match)
     const normalizedWord = wordObj.word.toLowerCase();
     // Firestore doc IDs cannot contain '/'
     const docId = normalizedWord.replace(/\//g, '_');
     const docRef = collectionRef.doc(docId);    
    batch.set(docRef, {
      word: normalizedWord,
      partOfSpeech: wordObj.partOfSpeech,
      hebrewShort: wordObj.hebrewShort,
      hebrewFull: wordObj.hebrewFull,
      ipa: wordObj.ipa,
      frequencyTier: wordObj.frequencyTier,
      synonyms: wordObj.synonyms || [],
      exampleSentence: wordObj.exampleSentence
    });
  }
    operationCount++;

    // Firestore batch limit is 500
    if (operationCount >= 450) {
      await batch.commit();
      console.log(`Committed batch ${++batchCount}`);
      batch = db.batch();
      operationCount = 0;
    }
  }

  if (operationCount > 0) {
    await batch.commit();
    console.log(`Committed final batch ${++batchCount}`);
  }
  console.log('Firestore population complete.');

  // 2. Generate local client JSON bundle
  const clientBundlePath = path.join(__dirname, '..', 'frontend', 'assets', 'psychometric_words_bundle.json');
  
  // Ensure directory exists
  const dir = path.dirname(clientBundlePath);
  if (!fs.existsSync(dir)){
      fs.mkdirSync(dir, { recursive: true });
  }

  const clientData = words
    .filter(wordObj => wordObj.word && typeof wordObj.word === 'string')
    .map(wordObj => ({
    word: wordObj.word.toLowerCase(),
    hebrewShort: wordObj.hebrewShort,
    frequencyTier: wordObj.frequencyTier
  }));
  fs.writeFileSync(clientBundlePath, JSON.stringify(clientData, null, 2), 'utf8');
  console.log(`Wrote client bundle to ${clientBundlePath} with ${clientData.length} entries.`);
}

seedWords().then(() => {
  console.log('Done.');
  process.exit(0);
}).catch(err => {
  console.error('Error seeding words:', err);
  process.exit(1);
});
