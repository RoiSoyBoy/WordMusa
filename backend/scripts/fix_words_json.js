/**
 * Updates backend/words.json:
 * 1. Adds `unit` field (1-10) to every word that exists in the PDF dictionary
 * 2. Fixes hebrewShort for 238 entries where a unit number was stored there by mistake
 * 3. Applies 4 manual fixes for words not in the PDF
 */

const fs = require('fs');
const path = require('path');

const wordsPath = path.join(__dirname, '..', 'words.json');
const pdfPath = path.join(__dirname, 'pdf_words.json');

const words = JSON.parse(fs.readFileSync(wordsPath, 'utf8'));
const pdf = JSON.parse(fs.readFileSync(pdfPath, 'utf8'));

// Manual hebrewShort fixes for words not in PDF
const manualFixes = {
  'at': 'ב, ל, אצל',
  'provided that': 'בתנאי ש',
  'result in': 'להוביל ל, לגרום ל',
};

let fixedShort = 0;
let addedUnit = 0;
let skippedUnit = 0;

const updated = words.map(entry => {
  const key = entry.word.toLowerCase();
  const pdfEntry = pdf[key];
  const result = { ...entry };

  // 1. Add unit field if PDF has this word
  if (pdfEntry) {
    result.unit = pdfEntry.unit;
    addedUnit++;
  } else {
    skippedUnit++;
  }

  // 2. Fix hebrewShort if it's a number (was a misplaced unit number)
  if (/^\d+$/.test((entry.hebrewShort || '').trim())) {
    if (pdfEntry) {
      result.hebrewShort = pdfEntry.hebrew;
      fixedShort++;
    } else if (manualFixes[key]) {
      result.hebrewShort = manualFixes[key];
      fixedShort++;
    } else {
      // Fallback: extract first clause from hebrewFull
      const firstClause = (entry.hebrewFull || '')
        .split(/[;,]|או|ו-/)[0]
        .trim()
        .substring(0, 30);
      result.hebrewShort = firstClause || entry.hebrewShort;
      fixedShort++;
      console.log('FALLBACK:', entry.word, '->', result.hebrewShort);
    }
  }

  return result;
});

fs.writeFileSync(wordsPath, JSON.stringify(updated, null, 2), 'utf8');

console.log(`Done.`);
console.log(`  hebrewShort fixed: ${fixedShort}`);
console.log(`  unit field added: ${addedUnit}`);
console.log(`  words without PDF unit: ${skippedUnit}`);
console.log(`  Total words: ${updated.length}`);

// Verify: show sample of fixed entries
console.log('\nSample fixed entries:');
updated.filter(x => ['admirable','adorn','adolescence','admit','cope','impact','mood'].includes(x.word))
  .forEach(x => console.log(`  ${x.word.padEnd(15)} unit:${String(x.unit||'?').padEnd(3)} hebrewShort: ${x.hebrewShort}`));
