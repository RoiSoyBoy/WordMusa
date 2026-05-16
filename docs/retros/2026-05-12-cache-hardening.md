# Retro — 2026-05-12 — Cache Logic Verification and Hardening

## What we built / fixed
- `lyricsFetch` — added Firestore read/write to `lyrics_cache/{trackname_artistname}` (global, shared across users)
- `translateWord` — added Firestore read/write to `word_translations/{sanitizedWord}` (global, shared across users)
- `translateLyrics` — added `data: [DONE]\n\n` on cache hit path; added `model` field to cache write; added optimistic double-check before write to prevent concurrent request waste

## What broke and why
- Nothing broken — all changes were additive

## Decisions made
- All three caches (`lyrics_cache`, `translations`, `word_translations`) are global (not per-user) — first user to play a song pays the LRCLIB/OpenAI cost, every subsequent user is served from Firestore
- Cache writes are fire-and-forget (non-blocking for client) except the translation double-check which needs to be awaited post-stream
- 404s from LRCLIB are not cached — a song without lyrics today might have them tomorrow

## What to pick up next session
- Step 4: UI Polish
- Add `word_translations` security rule to `firestore.rules` (read: authenticated, write: false)
- Add `word_translations` schema to CLAUDE.md Firestore data model section

## Files changed
- `backend/index.js`
