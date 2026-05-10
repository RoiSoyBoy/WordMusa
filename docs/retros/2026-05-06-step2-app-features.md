# Retro — 2026-05-06 — Step 2: Complete App Features

## What we built / fixed
- 2A: `psychometricWords.js` — exports psychometricWordSet + psychometricWordMap from assets/words.json
- 2A: `NowPlayingScreen.js` — inline green (#6AF7C8) word highlighting via scanLineForWords tokens; word scanning on activeIndex change; activeWords set in store; Firestore encounter recording
- 2B: `WordCard.js` — rewrote to fix Rules of Hooks violation (early return before useState), added Animated.spring slide-up, pill-style frequency badges per design system, removed absolute positioning (lives in layout flow)
- 2C: `WordDetailModal.js` — added frequency badge, Hebrew section titles, synonym chips, handle bar, full dark theme
- 2D: `useWordTracking.js` — Firestore writes for encounterCount, tappedAt, learnedAt, streak, totalSongs
- 2E: `DictionaryScreen.js` — real-time Firestore snapshot, filter tabs (הכל/נלמד/בתהליך/HIGH), search, empty state
- 2F: `ProgressScreen.js` — streak card, 2x2 stats grid, 7-day bar chart (View-only), recent words list
- 2G: `AppNavigator.js` — React Navigation bottom tabs (3 tabs, dark theme)
- `App.js` — replaced manual screen render with AppNavigator; WordDetailModal rendered at root level
- Installed @react-navigation/native, @react-navigation/bottom-tabs (+ screens, safe-area-context already present)

## What broke and why
- Nothing destructive; all prior functionality preserved

## Decisions made
- WordCard is in layout flow (not absolute), sits between lyrics ScrollView and PlaybackControls
- WordDetailModal rendered at App root (outside navigator) so it overlays all 3 tabs
- lyricContext injected into selectedWord object by WordCard to avoid prop drilling to modal
- useWordTracking streak check runs once on mount via useEffect

## What to pick up next session
- Step 3: Cache Logic Verification and Hardening
- Step 4: UI Polish
- Verify Firestore write paths work against emulator
- Test word highlighting with a real song

## Files changed
- `frontend/App.js`
- `frontend/src/navigation/AppNavigator.js` (new)
- `frontend/src/screens/NowPlayingScreen.js`
- `frontend/src/screens/DictionaryScreen.js` (new)
- `frontend/src/screens/ProgressScreen.js` (new)
- `frontend/src/components/WordCard.js`
- `frontend/src/components/WordDetailModal.js`
- `frontend/src/hooks/useWordTracking.js` (new)
- `frontend/src/store/useWordStore.js`
- `frontend/src/utils/psychometricWords.js` (new)
