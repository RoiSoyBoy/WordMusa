# Retro — 2026-05-18 — Spotify UI Session 1 (Foundation)

## What we built / fixed
- Rewrote `theme.js` with full Spotify color system: bg `#121212`, surface `#181818`, surface2 `#282828`, accent `#1DB954` (Spotify green replaces purple), text `#FFFFFF`, muted `#B3B3B3`
- Reduced border radii to match Spotify's flatter aesthetic (sm:4 md:8 lg:12 xl:16)
- Kept `accentPink` `#F76A8A` (streak) and `accentGreen` `#6AF7C8` (word highlights — teal stays distinct from Spotify green)
- Rewrote `AppNavigator.js`: black `#000000` tab bar, Spotify green active tint, gray `#6A6A6A` inactive, Ionicons vector icons (musical-notes, library, bar-chart, albums)
- Installed `@expo/vector-icons` (first-party Expo package, was not in node_modules)

## What broke and why
- `@expo/vector-icons` was not bundled — needed explicit install despite being a standard Expo package

## Decisions made
- `accentGreen` stays teal (#6AF7C8) — using Spotify green for word highlights would clash with UI accent elements
- Tab bar height 62px with paddingBottom 10 for comfortable touch targets on modern phones
- Inactive tab color `#6A6A6A` (darker than `#B3B3B3`) — Spotify app uses a very dim inactive state

## What to pick up next session (Session 2)
- `NowPlayingScreen.js` — large square album art, Spotify typography header, Spotify lyrics style
- `PlaybackControls.js` — white circle play button, thin #535353 progress track, green fill

## Files changed
- MOD: `frontend/src/styles/theme.js`
- MOD: `frontend/src/navigation/AppNavigator.js`
- NEW dep: `@expo/vector-icons`
