# Retro — 2026-07-26 — Vocab Song Recommendations Tab

## What we built / fixed
- New `recommendedSongs` Cloud Function: resolves 20 curated `{trackName, artistName}` pairs to Spotify track IDs via Search API, counts distinct psychometric words per song (reusing `lyrics_cache`), caches combined result in new `recommended_songs/{cacheKey}` collection shared across all users
- Extended `spotifyControl`'s `'play'` action to accept an optional `track_uri` body, so it can start a specific track (not just resume)
- New `RecommendationsScreen.js` + 5th bottom-nav tab ("המלצות") — cards with album art, word-count pill (same style as NowPlayingScreen's), Play button
- Play tries in-app remote play first, falls back to Spotify deep-link (works for free-tier/no-active-device)
- Added `recommended_songs` Firestore rule (read-authenticated, write-backend-only)

## What broke and why
- Nothing broke. `SpotifyIcon` import in `NowPlayingScreen.js` is pre-existing dead code (file doesn't exist) — not touched, out of scope.

## Decisions made
- Curated 20 songs stored as `{trackName, artistName}` only — Spotify IDs resolved live and cached, never hardcoded/guessed
- Word count = distinct psychometric words matched in plain lyrics (identical metric to the existing NowPlaying pill)
- Caching is shared (not per-user) by design — first request per song warms it for everyone

## What to pick up next session
- Verify emulator run end-to-end with real Spotify secrets (this session only verified with the emulator's function loading + 401 auth gating, no `.secret.local` available)
- Confirm on-device Play behavior once Spotify auth is wired up locally
- Decide if a one-off warm-cache script is wanted, or natural first-load is enough

## Files changed
- `backend/index.js` — `recommendedSongs` function, `countPsychometricWords` helper, `spotifyControl` `track_uri` support
- `backend/recommendedSongs.json` — new, curated song list
- `backend/firestore.rules` — `recommended_songs` rule
- `frontend/src/screens/RecommendationsScreen.js` — new
- `frontend/src/navigation/AppNavigator.js` — 5th tab wired in
