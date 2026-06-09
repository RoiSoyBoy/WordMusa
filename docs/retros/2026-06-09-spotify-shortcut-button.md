# Retro — 2026-06-09 — Spotify Shortcut Button

## What we built / fixed
- Added "Open Spotify" button to NowPlayingScreen header (top-right)
- Button opens `spotify://` on native, `https://open.spotify.com` on web
- Playing dot repurposed as a pulsing badge on the button corner (position: absolute)

## What broke and why
- **Attempt 1 (Animated.Value + ternary):** wrapping the icon in `Animated.View` with `opacity: isPlaying ? pulseAnim : 0.35` mixes Animated.Value with a plain number — React Native Web gets confused and renders nothing
- **Attempt 2 (ion-icon logo-spotify):** `logo-spotify` was removed from ionicons v7 CDN; `ion-icon` silently renders nothing for unknown names
- **Attempt 3 (CDN downgrade to v5.5.4):** logo-spotify SVG still didn't render — CDN-based SVG fetch for brand logo icons is unreliable even in v5

## Decisions made
- Platform-split rendering: web gets a `Text` label, native gets `Icon` — no CDN dependency for the button visual
- Ionicons CDN in `inject-fonts.js` pinned to v5.5.4 (matches `@expo/vector-icons` font), idempotency guard updated to match
- Final design: solid Spotify green pill, white "Open Spotify" text, logo icon on native only

## What to pick up next session
- Remove Eruda and `errorMsg` debug instrumentation (carried over from 2026-05-28)
- Verify `recordWordEncounter` writes to Firestore in production
- Commit `backend/database.rules.json` (still untracked)

## Files changed
- `frontend/src/screens/NowPlayingScreen.js` — Spotify button, dot badge, Platform-split icon/text
- `frontend/scripts/inject-fonts.js` — ionicons CDN v7 → v5.5.4, idempotency guard updated
