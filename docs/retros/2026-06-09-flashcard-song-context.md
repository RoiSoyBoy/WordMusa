# Retro — 2026-06-09 — Flashcard Song Context

## What we built / fixed
- Flashcard front now shows the song name the word was saved from (♪ Song Name)
- `songContexts` array already existed in Firestore wordHistory — no schema changes needed
- Uses the last entry in `songContexts` (most recent encounter) as the display song
- Graceful fallback: words without `songContexts` show nothing (no crash, no empty label)

## Decisions made
- Show last `songContexts` entry (most recent song) rather than first — more relevant to user's recent memory
- Song name on card front only (not back) — it's an association cue, not a definition detail
- Small, muted, 65% opacity — context, not content

## What to pick up next session
- Remove debug `[LL]` console logs from `useLyricSync.js` once performance is confirmed stable
- Rotate the GitHub PAT in `backend/.env` (plaintext, should be in Secret Manager)
- Verify `recordWordEncounter` writing to Firestore in production

## Files changed
- `frontend/src/screens/ReviewScreen.js` — songContexts extraction + card front render + style
