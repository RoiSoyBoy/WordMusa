# Retro — 2026-06-17 — Home Screen Widget (design + code, no build)

## What we built
- Full widget feature implementation: word-of-the-day + manual pin
- `widgetWordSelector.js` — deterministic daily word (djb2 seed on uid+date), falls back to easy-tier words if none learned
- `widgetBridge.js` — safe cross-platform bridge to iOS App Group UserDefaults / Android SharedPreferences; no-op on web
- `withAndroidWidget.js` — Expo config plugin generating `WordWidget.kt`, layout XML, widget info XML, background drawable
- `withIOSWidget.js` — Expo config plugin generating SwiftUI widget (TimelineProvider + View), App Group entitlement, Xcode extension target wiring
- `useWordTracking.js` — daily update effect fires when `learnedWordSet` changes; skips if pinned or already written today
- `WordDetailModal.js` — "📌 הצמד לווידג'ט" button for psychometric words; shows "מוצמד ✓" after tap
- `DictionaryScreen.js` — reads pinned word on mount; shows 📌 inline on the pinned word row
- `app.json` — added `ios.bundleIdentifier` + plugins array
- `eas.json` — EAS Build profiles (development / preview / production)

## What broke and why
- Nothing tested — no native build exists yet. The web version at psycholyrics.web.app is unaffected (bridge is a web no-op).

## Decisions made
- Widget update logic lives in `useWordTracking.js`, not `App.js` — avoids duplicating the Firestore learnedWordSet subscription
- djb2 hash for daily word selection — same word all day for same user, no extra storage needed
- `react-native-shared-group-preferences` chosen for the bridge — supports New Architecture (v3+), wraps both iOS App Groups and Android SharedPreferences

## What to pick up next session (before first build)
1. `cd frontend && npm install react-native-shared-group-preferences`
2. Apple Developer Portal: create App Group `group.com.roisoyboy.psycholyrics`, enable on both main + widget App IDs
3. `npx expo prebuild --clean` — verify `ios/LyricLearnWidget/` is generated and Xcode target appears
4. `eas build --profile preview --platform android` first (no Apple Portal needed), then iOS
5. Test: add widget from home screen picker, open app, verify word appears; test pin flow

## Files changed
- `frontend/src/utils/widgetWordSelector.js` — new
- `frontend/src/utils/widgetBridge.js` — new
- `frontend/plugins/withAndroidWidget.js` — new
- `frontend/plugins/withIOSWidget.js` — new
- `frontend/src/hooks/useWordTracking.js` — +14 lines (widget update effect + imports)
- `frontend/src/components/WordDetailModal.js` — +35 lines (pin button + styles)
- `frontend/src/screens/DictionaryScreen.js` — +12 lines (pinned indicator)
- `frontend/app.json` — bundleIdentifier + plugins
- `eas.json` — new (project root)
