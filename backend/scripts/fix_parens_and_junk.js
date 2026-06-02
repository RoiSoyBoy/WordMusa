/**
 * Fixes two issues in words.json:
 * 1. Corrupted hebrewShort — 18 entries like "8 - ysereh" (junk from PDF column misalign).
 *    Fix: replace with correct Hebrew from pdf_words.json, fall back to hebrewFull excerpt.
 * 2. Flipped parentheses in Hebrew text — RTL reversal swaps ( and ).
 *    Fix: swap ( ↔ ) in hebrewShort and hebrewFull for all entries.
 */

const fs = require('fs');
const path = require('path');

const wordsPath = path.join(__dirname, '..', 'words.json');
const frontendPath = path.join(__dirname, '..', '..', 'frontend', 'assets', 'words.json');
const pdfPath = path.join(__dirname, 'pdf_words.json');

const words = JSON.parse(fs.readFileSync(wordsPath, 'utf8'));
const pdf = JSON.parse(fs.readFileSync(pdfPath, 'utf8'));

function fixParens(str) {
  if (!str) return str;
  return str.split('').map(c => c === '(' ? ')' : c === ')' ? '(' : c).join('');
}

function isCorrupted(s) {
  return s && s.length > 0 && !/[א-ת]/.test(s);
}

let fixedJunk = 0;
let fixedParens = 0;

const updated = words.map(entry => {
  let { hebrewShort, hebrewFull } = entry;
  const key = entry.word.toLowerCase();

  // --- Fix 1: corrupted hebrewShort (no Hebrew characters) ---
  if (isCorrupted(hebrewShort)) {
    const pdfEntry = pdf[key];
    if (pdfEntry) {
      hebrewShort = pdfEntry.hebrew;
    } else {
      // Derive from hebrewFull: take up to the first clause
      hebrewShort = (hebrewFull || '').split(/[;,]| או /)[0].trim().substring(0, 30);
    }
    fixedJunk++;
    console.log(`  FIXED JUNK: ${entry.word.padEnd(20)} -> ${hebrewShort}`);
  }

  // --- Fix 2: flip parentheses in Hebrew fields ---
  const fixedShort = fixParens(hebrewShort);
  const fixedFull = fixParens(hebrewFull);
  if (fixedShort !== hebrewShort || fixedFull !== hebrewFull) fixedParens++;

  return { ...entry, hebrewShort: fixedShort, hebrewFull: fixedFull };
});

fs.writeFileSync(wordsPath, JSON.stringify(updated, null, 2), 'utf8');
fs.writeFileSync(frontendPath, JSON.stringify(updated, null, 2), 'utf8');

console.log(`\nDone.`);
console.log(`  Corrupted hebrewShort fixed: ${fixedJunk}`);
console.log(`  Parentheses fixed: ${fixedParens} entries`);

// Verify parens sample
console.log('\nParens sample after fix:');
updated.filter(x => x.hebrewShort?.includes('(') || x.hebrewShort?.includes(')'))
  .slice(0, 8)
  .forEach(x => console.log(' ', x.word.padEnd(20), '|', x.hebrewShort));
