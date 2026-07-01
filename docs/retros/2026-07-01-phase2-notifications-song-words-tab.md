# Retro — 2026-07-01 — Phase 2: Notifications + Song Words Tab

## What we built / fixed
- **Step 1** (prev session): Removed debug `console.log` spam from `useLyricSync.js`
- **Step 2** (prev session): Added TTS pronunciation button (🔊) to `WordDetailModal` via `expo-speech`
- **Step 3** (prev session): Built `usePushNotifications` hook, registered Expo push tokens to Firestore, wired into `AppNavigator`
- **Step 4–5**: Added `scheduledStreakReminder` (daily 20:00 Jerusalem) and `scheduledWeeklySummary` (Sundays 20:00) Cloud Functions using `firebase-functions/v2/scheduler` + Expo Push API
- **Song Words Tab**: Two-tab toggle on NowPlayingScreen — קריוקי / מילים בשיר. Scans full lyrics at load time, shows all psychometric words sorted by unit (1–10). Filter chips: הכל / קל 1–4 / בינוני 5–7 / קשה 8–10. Tap opens WordDetailModal.

## What broke and why
- Deploy showed no changes on psycholyrics.web.app — likely browser cache or built from wrong branch. Hard refresh (Ctrl+Shift+R) or incognito should fix it.

## Decisions made
- Spotify API user limit (5 users, 250K MAU for extension) — decided to wait for Spotify review rather than implement Last.fm or bring-your-own-key workarounds
- Audio fingerprinting ruled out — doesn't work with headphones (most of the target audience)
- Apple Music ruled out as substitute — requires paid subscription, Spotify free tier is the target market
- Song words tab scans ALL lyrics upfront (not line-by-line) so full word list is ready immediately
- No HIGH/MEDIUM/LOW badges in word list — replaced with unit number (יחידה N) for difficulty clarity

## What to pick up next session
- Verify song words tab renders correctly on web (fix cache issue first)
- Step 6: Crash reporting (Sentry recommended — Crashlytics needs custom dev client)
- Write a retro at session end

## Files changed
- `backend/index.js` — added `onSchedule` import, `Timestamp`, two scheduled functions
- `frontend/src/hooks/usePushNotifications.js` — new
- `frontend/src/navigation/AppNavigator.js` — added `usePushNotifications()` call
- `frontend/src/screens/NowPlayingScreen.js` — tab bar + all-song word scan
- `frontend/src/components/SongWordsList.js` — new
- `frontend/package.json` — added `expo-speech`
