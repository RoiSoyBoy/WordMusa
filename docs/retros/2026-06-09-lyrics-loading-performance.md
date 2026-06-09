# Retro — 2026-06-09 — Lyrics Loading Performance

## What we built / fixed
- Removed `GOOGLE_APPLICATION_CREDENTIALS` from `backend/.env` — was leaking into Cloud Run, breaking all Firestore operations in production
- Fixed `checkRateLimit` returning `false` on Firestore error (was blocking all requests with 429 when Firestore had issues) → now returns `true` (fail open)
- Added 15s timeout to LRCLIB fetch on both frontend and backend
- Frontend no longer retries LRCLIB via backend on timeout — only falls back to backend on CORS/network errors (Safari path)
- Added 3s timeout to Firestore lyrics_cache check to prevent it blocking the lyrics pipeline
- Fixed `null.exists()` crash when Firestore race timed out (changed to `?.exists()`)
- Added 2s cap on translation cache Firestore read to start SSE stream sooner
- Cleaned words.json: removed 1 corrupted entry + 117 duplicates (3,983 → 3,866 words)
- Reset scroll state on track change to fix auto-scroll lag on new song

## What broke and why
- `GOOGLE_APPLICATION_CREDENTIALS` in `.env` was there for local dev but Firebase v2 auto-loads `.env` in production too — all Firestore operations in Cloud Run were failing silently
- `checkRateLimit` fail-closed behavior turned every Firestore hiccup into a 429, masking the real credential error
- Double-calling LRCLIB (frontend 5s + backend 7s) compounded the wait instead of reducing it

## Decisions made
- Fail open on rate limit errors — rate limiting is best-effort protection, not correctness
- Don't retry LRCLIB through the backend on timeout — same slow API, wastes another 15s
- 15s LRCLIB timeout is the practical ceiling; songs that don't respond in 15s show "no lyrics"

## What to pick up next session
- Remove debug `[LL]` console logs from `useLyricSync.js` once performance is confirmed stable
- Rotate the GitHub PAT found in `backend/.env` (plaintext secret, should be in Secret Manager)
- Verify `recordWordEncounter` writing to Firestore in production

## Files changed
- `backend/.env` — removed GOOGLE_APPLICATION_CREDENTIALS
- `backend/index.js` — checkRateLimit fail open, 15s LRCLIB timeout
- `frontend/src/hooks/useLyricSync.js` — timeouts, no backend retry on LRCLIB timeout, null safety
- `backend/words.json` + `frontend/assets/words.json` — deduplication/cleanup
- `frontend/src/screens/NowPlayingScreen.js` — scroll reset on track change
