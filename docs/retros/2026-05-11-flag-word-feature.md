# Retro — 2026-05-11 — Flag Unknown Word Feature

## What we built / fixed
- Long-press any word in lyrics → opens WordDetailModal with lyric context for that specific line
- Non-psychometric words: modal fetches Hebrew translation via new `translateWord` backend function, shows it below the word title
- "הוסף למילון" button in modal for non-psychometric words — flags the word + stores translation at write time
- `DictionaryScreen` — new "מסומן" filter tab shows flagged words; subtitle shows `flagContext.wordTranslation` (same layout as psychometric `hebrewShort`)
- Tapping a flagged word in DictionaryScreen opens WordDetailModal with lyric context

## What broke and why
- **Wrong lyric context in modal**: `handleWordLongPress` captured `activeLyricContext` (always the current playing line) instead of the line the word belonged to. Fixed by passing the `line` object into `renderHighlightedLine` → `handleWordLongPress`.
- **Translation not saved to Firestore**: `saveWordTranslation` called `updateDoc` at fetch time, but the doc didn't exist yet (user hadn't tapped "הוסף למילון"). Fixed by removing `saveWordTranslation` entirely and passing `wordTranslation` as a 4th arg to `recordWordFlag`, which writes it into `flagContext.wordTranslation` at doc-creation time.

## Decisions made
- `recordWordFlag` stores `wordTranslation` inline in `flagContext` — no separate Firestore write, no timing issue
- Translation fetch in modal is fire-and-forget; result stored only when user explicitly flags the word
- Cache logic (to avoid repeat OpenAI calls for same word) deferred to a later session — `flagContext.wordTranslation` already persists the result for flagged words
- `translateWord` backend: non-streaming, max 30 tokens, rate-limited 30/min; sanitizes input to alpha chars only

## Lyric sync freeze — root cause + fix
The Spotify sync froze whenever the translation started streaming. Three-stage investigation:

1. **First attempt**: sync interval depended on `[lines]` — every SSE chunk called `setLines`, killing and restarting the 200ms interval. Fixed by switching to `[hasLines]` (boolean) so the interval only starts/stops when lines go from empty to populated. Interval now reads from `linesRef` (kept in sync via a separate effect).

2. **Still freezing**: the per-token progressive update block ran `fullText.matchAll(...)` + `setLines(prevLines.map(...))` on every GPT token (~300×). This saturated the React Native JS thread, starving the sync interval and Spotify poll. Fixed by removing all mid-stream `setLines` calls — translations only applied once at `readyState === 4`.

3. **30-second delay**: removing progressive updates meant translations appeared all at once after the full stream. Fixed with a count-based gate: regex + `setLines` only fires when a `"` quote appears in the new chunk AND the extracted line count increases. Result: ~60 `setLines` calls instead of ~300, translations appear line by line as GPT finishes each one, sync stays smooth.

## What to pick up next session
- Cache logic for `translateWord`: on fetch, check `flagContext.wordTranslation` first before calling OpenAI
- Step 3: Cache Logic Verification and Hardening
- Step 4: UI Polish

## Files changed
- `backend/index.js` — new `translateWord` Cloud Function
- `frontend/src/screens/NowPlayingScreen.js` — long-press handler, `renderHighlightedLine` now line-aware
- `frontend/src/screens/DictionaryScreen.js` — "מסומן" filter, flagged word rendering
- `frontend/src/components/WordDetailModal.js` — translation fetch + display, "הוסף למילון" button
- `frontend/src/hooks/useWordTracking.js` — `recordWordFlag` accepts `wordTranslation`, removed `saveWordTranslation`
- `frontend/src/hooks/useLyricSync.js` — sync interval decoupled from `lines` state; progressive streaming fixed with count-based gate
