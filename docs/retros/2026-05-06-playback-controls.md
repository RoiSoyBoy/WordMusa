# Retro — 2026-05-06 — Playback Controls (Step 1)

## What we built / fixed
- Added `spotifyControl` Cloud Function to `backend/index.js` (POST, rate-limited 60/min)
  - Supports: play, pause, next, previous, seek
  - Returns 200 JSON on success, 204 from Spotify treated as success
- Created `frontend/src/components/PlaybackControls.js`
  - Progress bar with seek-on-tap
  - Smooth interpolation between 1-second polls (200ms ticks)
  - Play/pause toggle, previous/next buttons with loading dimming
  - mm:ss time labels
- Wired `PlaybackControls` into `NowPlayingScreen.js` — always visible while track is loaded

## What broke and why
- Nothing broken this session — all changes were additive

## Decisions made
- `PlaybackControls` receives `currentTrack` + `onPollNow` as props (simplest coupling, avoids Zustand dependency)
- Progress interpolates locally using `lastPollRef` rather than a second store subscription
- Backend uses `spotifyClientId`/`spotifyClientSecret` secrets already defined at top of `index.js`

## What to pick up next session
- Step 2: Complete App Features per PRD (word highlighting, dictionary, progress screen, bottom nav)
- Verify emulator runs cleanly with new `spotifyControl` function loaded

## Files changed
- `backend/index.js` — added `exports.spotifyControl`
- `frontend/src/components/PlaybackControls.js` — new file
- `frontend/src/screens/NowPlayingScreen.js` — import + render PlaybackControls
