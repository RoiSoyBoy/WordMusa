# Retro — 2026-05-20 — Onboarding Redesign + App Rename

## What we built / fixed
- Redesigned `SpotifyAuth.js` into a full dark-themed auth screen: purple glow blob, app logo, tagline, feature pills, Spotify-green pill button — no more white default UI
- Stripped `OnboardingFlow.js` down to a single wrapper around `SpotifyAuth` (removed carousel, notifications step, preview screen)
- Created `WelcomeTourModal.js`: post-auth bottom-sheet modal with 3 animated slides, spring icon bounce, cubic slide transitions, progress dots, and "אל תציג שוב" persisted to AsyncStorage
- Updated `App.js` to gate the modal on `hasSeenTour` AsyncStorage key — shown once after first login
- Renamed app from LyricLearn → PsychoLyrics in all user-visible strings and `app.json`

## What broke and why
- `auth/already-initialized` Firebase error appeared after changes — likely a hot-reload artifact from Expo reloading `firebase.js` twice; not a code change issue
- `No safe area value available` crash: `SpotifyAuth.js` used `useSafeAreaInsets()` but the onboarding branch in `App.js` rendered outside `<SafeAreaProvider>` — fixed by wrapping the onboarding return with `SafeAreaProvider`

## Decisions made
- Used built-in `Animated` API only (no Lottie) — zero new dependencies, indistinguishable result for this use case
- `User-Agent: LyricLearn/1.0` in `useLyricSync.js` left unchanged — it's an HTTP identifier sent to LRCLIB, not user-visible, changing it could affect API compatibility

## What to pick up next session
- Verify `auth/already-initialized` doesn't persist on a cold start (not just hot reload)
- Consider adding a "replay tour" option in the Progress or Settings screen

## Files changed
- `frontend/src/SpotifyAuth.js`
- `frontend/src/components/OnboardingFlow.js`
- `frontend/src/components/WelcomeTourModal.js` (new)
- `frontend/App.js`
- `frontend/src/screens/NowPlayingScreen.js`
