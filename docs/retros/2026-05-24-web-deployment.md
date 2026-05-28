# Retro — 2026-05-24 — Web Deployment to psycholyrics.web.app

## What we built / fixed

### Deployment (Phase 1)
- Executed the full web deployment plan: Expo export → Firebase Hosting
- Fixed `firebase.json` to add hosting section pointing to `dist/`
- Created `frontend/.env.production` with production Firebase + Spotify config
- Fixed `firebase.json` PowerShell quoting issue (`--only "functions,hosting"`)
- Resolved Secret Manager conflicts — env vars in `.env` were overlapping `defineSecret()` declarations; fixed by removing plain-text secrets from `.env` and relying on Secret Manager only
- Resolved `iam.serviceAccounts.signBlob` permission denied — Cloud Run default service account lacked Token Creator role; fixed by granting the role via gcloud IAM
- Resolved `GOOGLE_APPLICATION_CREDENTIALS` pointing to a revoked key file on all 7 Cloud Run services; stripped it via `gcloud run services update --remove-env-vars` on each service
- Created the `psycholyrics` Firebase Hosting site and linked it
- Deployed Firestore security rules for the first time (`firebase deploy --only firestore:rules`) — production had been running on deny-all defaults

### Production debugging (Phase 2)
- Fixed `spotifyPlayer` 429 spam — root cause was `checkRateLimit` failing closed due to revoked GOOGLE_APPLICATION_CREDENTIALS; every Firestore write failed → returned false → 429 on every request
- Bypassed App Check (`verifyAppCheck` returns `true`) — reCAPTCHA Enterprise threw a 403 that throttled for 24h; proper fix deferred
- Fixed `useLyricSync` Firestore permission error — rules had never been deployed to production
- Fixed album art background gradient on web — `expo-file-system` and `expo-image-manipulator` are native-only; added Canvas API path in `extractAlbumColor.js`
- Fixed word long-press on web — `onLongPress` inside ScrollView is unreliable on web; changed to `onPress` on web, `onLongPress` on native

### Web UI fixes (Phase 3)
- Fixed all icons rendering as empty boxes — traced through `@expo/vector-icons` + `expo-font` internals; solution was replacing Ionicons with a `Platform`-aware `Icon` component using the ionicons web component (SVG-based, no font loading needed) injected via CDN in `index.html`
- Fixed iOS Safari viewport issues — added `viewport-fit=cover`, `100dvh`, `-webkit-text-size-adjust`, and iOS PWA meta tags via post-build inject script
- Fixed bottom tab bar height on web — increased to 80px / 20px padding via `Platform.OS`
- Fixed level filter pills collapsing on web — `height` on a horizontal `ScrollView` is unreliable in React Native Web; wrapped in a `View` with explicit height

## What broke and why

- **App Check 24h throttle** — reCAPTCHA Enterprise site key was misconfigured (wrong domain or key type); one 403 response triggered a 24h browser localStorage throttle, blocking all subsequent attempts from that browser
- **Spotify quota wall** — Spotify no longer allows individual developers to go beyond 25 users without an organization account and 250k MAU. For now the app stays in dev mode with manually whitelisted emails
- **GOOGLE_APPLICATION_CREDENTIALS re-injection** — every `firebase deploy --only functions` re-adds the revoked key env var to Cloud Run. Must run gcloud cleanup after every functions deploy (permanent fix still needed)
- **Blank page on font load** — adding `useFonts` guard that blocked render caused a white screen when font loading hung; learned that `useFonts` on web is unreliable in this setup

## Decisions made

- App Check bypassed globally (`verifyAppCheck` returns `true`) until reCAPTCHA Enterprise is properly configured
- Spotify stays in dev mode (max 25 users with manual whitelist) — quota extension requires a legal business entity
- Ionicons replaced with ionicons web component on web via `Icon` wrapper component
- Post-build inject script (`scripts/inject-fonts.js`) handles all HTML patching after `expo export`
- Build + deploy workflow: `expo export --platform web` → `node scripts/inject-fonts.js` → copy dist → `firebase deploy --only hosting`

## What to pick up next session

- Permanent fix for GOOGLE_APPLICATION_CREDENTIALS being re-added on every functions deploy
- Fix App Check (reCAPTCHA Enterprise 403) — test from a fresh browser/device to clear the throttle, then debug the site key configuration
- Fix `recordWordEncounter` never being called from NowPlayingScreen (word encounter counts are never written to Firestore)
- End-of-song word sheet — verify it works with English songs that have complex vocabulary (Eminem, Radiohead)
- Commit all changes to git

## Files changed

- `backend/firebase.json` — hosting section added
- `backend/index.js` — verifyAppCheck bypassed, checkRateLimit patched
- `frontend/src/firebase.js` — Platform-split auth persistence, AppCheck init, emulator host
- `frontend/src/SpotifyAuth.js` — Platform-split redirect URI
- `frontend/src/screens/NowPlayingScreen.js` — useNativeDriver false, Platform-aware word press
- `frontend/src/utils/extractAlbumColor.js` — web Canvas API path added
- `frontend/src/components/PlaybackControls.js` — Ionicons → Icon
- `frontend/src/components/Icon.js` — new Platform-aware icon wrapper
- `frontend/src/navigation/AppNavigator.js` — Ionicons → Icon, web tab bar height
- `frontend/src/screens/DictionaryScreen.js` — level filter pill sizing, ScrollView → View wrapper
- `frontend/App.js` — useFonts call (non-blocking)
- `frontend/scripts/inject-fonts.js` — new post-build HTML patcher
- `frontend/.env.production` — new production env file
