# Retro — 2026-07-26 — Lyric Sync Timing + Drift-Lock Fix

## What we built / fixed
- Traced the two reported NowPlayingScreen bugs to `useLyricSync.js`'s position-interpolation loop (the 200ms `setInterval` that estimates playback position between Spotify polls)
- **Early highlight (~0.5s):** added a fixed `SYNC_LEAD_COMPENSATION_MS` (500ms) subtracted from the interpolated position before comparing against LRC timestamps — LRCLIB-sourced timestamps commonly mark a line slightly before the vocal starts
- **Locks onto a wrong line (the bigger bug):** `elapsed = Date.now() - lastPollTimeRef.current` had no upper bound. A missed poll (network hiccup) or the app being backgrounded (OS throttles JS timers) let elapsed grow unbounded, racing the estimated position far past reality — `getActiveLyricIndex` would then lock onto a much-later (sometimes the very last) line until the next successful poll corrected it. Explains why it was intermittent: only surfaces on a poll hiccup or backgrounding, not every playback. Fixed with `MAX_EXTRAPOLATION_MS` (3s) capping how far a single missed poll can drift the estimate.

## What broke and why
- Nothing broke — verified with a standalone node simulation against the real `lrcParser.js` (`getActiveLyricIndex`), confirming: normal ticking unaffected, a 45s poll gap that used to jump ~10 lines ahead now drifts by <1 line, and the lead compensation delays switching by exactly 500ms.

## Decisions made
- Kept the fix to a single function/file (`useLyricSync.js`, ~17 lines) rather than touching the scroll-lock (`userScrollingRef`) logic in `NowPlayingScreen.js` — that code path (manual-scroll pause/resume) looked correct on read-through; the bug was upstream in what `activeIndex` itself was being set to.
- Chose a flat 500ms compensation constant rather than per-song calibration — matches the user's own measurement and keeps the fix simple.

## What to pick up next session
- Verify on a real device: background the app mid-song for 10-20s, foreground it, confirm the highlight no longer jumps far ahead
- If 500ms lead compensation feels off for some songs once tested live, consider making it configurable instead of a hardcoded constant

## Files changed
- `frontend/src/hooks/useLyricSync.js` — sync-loop interpolation cap + lead compensation
