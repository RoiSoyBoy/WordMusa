# Retro — 2026-06-09 — Optimistic Playback Controls

## What we built / fixed
- Added optimistic UI to play/pause button in `PlaybackControls.js`
- Button icon flips instantly on press (no waiting for API round-trip)
- Progress bar freezes immediately on optimistic pause via `lastPollRef.current.isPlaying`
- Optimistic state reverts automatically when Spotify confirms new state (poll-based) or on API error

## What broke and why
- Nothing — single-file change, no regressions

## Decisions made
- Two separate effects: one for position sync (dep: `position_ms`) and one to clear optimistic state (dep: `is_playing`) — splitting them avoids breaking interpolation while still clearing optimistic cleanly
- Rejected direct Spotify API calls from frontend and `minInstances: 1` — not needed once optimistic UI made the UX feel responsive (~1s actual pause is acceptable)

## What to pick up next session
- Remove Eruda and `errorMsg` debug instrumentation (carried over from 2026-05-28)
- Verify `recordWordEncounter` writes to Firestore in production
- Commit `backend/database.rules.json` (still untracked)

## Files changed
- `frontend/src/components/PlaybackControls.js` — optimistic play/pause state, split useEffect deps
