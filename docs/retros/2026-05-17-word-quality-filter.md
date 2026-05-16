# Retro — 2026-05-17 — Word Quality Filter & Vocabulary Expansion

## What we built / fixed
- Expanded psychometric word list from ~449 → 3,983 words via Kempus PDF scraping + GPT-4o-mini enrichment
- Added CEFR A1-A2 exclusion filter (basic_words.json, 2,278 words): "if", "about", "who" never highlighted again
- Smart word selection: hardest words in a lyric line chosen first (LOW tier → MEDIUM → HIGH)
- Replaced confusing HIGH/MEDIUM/ALL tier picker with "words per song" control (1/2/3, default 2)
- Full Settings screen, bottom tab nav (⚙️), useDifficulty hook, per-song word budget

## What broke and why
- `enrich_words.py` initially wrote to wrong path (`frontend/src/data/`) instead of `frontend/assets/`
- Hebrew text extracted from PDF was reversed (pdfplumber visual order); fixed with `text[::-1]`
- 230 bad extraction entries with pattern `"venture - 6 wagon - 9"` — filtered by digit/token count rules
- GPT batches failed with truncated JSON at max_tokens=4096 — raised to 16384 (GPT-4o-mini max)
- `basic_words.json` written with non-ASCII byte (café é = 0xe9) — fixed by filtering to `isascii()` words

## Decisions made
- CEFR A1-A2 as the quality gate (standard linguistic framework, not heuristics like word length)
- `frequencyTier: LOW` = rarest in exam = hardest for student → used as sort key for smart selection
- Kept `useDifficulty` export name to minimize import changes across the app
- scripts/cefrj.csv committed; scripts/ dir included for reproducibility

## What to pick up next session
- Verify on device: no basic words highlighted, rarest words prioritized, Settings cap persists
- Consider: "I already know this" button on WordCard to manually mark words as basic for the user

## Files changed
- NEW: `frontend/assets/basic_words.json`, `scripts/export_basic_words.py`, `scripts/cefrj.csv`
- NEW: `frontend/src/hooks/useDifficulty.js`, `frontend/src/screens/SettingsScreen.js`
- MOD: `frontend/src/utils/psychometricWords.js`, `frontend/src/screens/NowPlayingScreen.js`
- MOD: `frontend/src/navigation/AppNavigator.js`, `backend/words.json`, `frontend/assets/words.json`
