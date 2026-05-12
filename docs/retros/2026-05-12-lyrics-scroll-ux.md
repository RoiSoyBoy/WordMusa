# Retro — 2026-05-12 — Lyrics Screen UX & Scroll Overhaul

## What we built / fixed
- Bigger fonts: English lyrics 15→19px (lineHeight 26), Hebrew 13→15px (lineHeight 21)
- Tap any lyric line → Spotify seeks to that timestamp (fire-and-forget fetch, polls immediately after)
- Spotify-style manual scroll: auto-scroll pauses when user drags, resumes only when user scrolls back near the playing segment (~250px threshold), waits 2s then re-centers
- Fixed post-load flicker: re-centers once when translations first arrive, with 150ms delay for layout to settle

## What broke and why
- **`TouchableOpacity` blocked scroll + tap**: nested `Text.onLongPress` handlers inside `TouchableOpacity` inside `ScrollView` caused touch responder conflict on Android. Fixed by switching to `Pressable` + `keyboardShouldPersistTaps="handled"`.
- **Translation took 40s**: `onLayout` on every `Pressable` fired on each streaming `setLines` update — 50 lines × 60 stream chunks = 3000 layout callbacks queuing on the JS thread. Fixed by replacing `onLayout` with lazy `measureLayout` (only called when auto-scroll fires).
- **Scroll flicker on load**: first `scrollToActive` measured English-only line heights; translations then shifted all positions down, leaving scroll ~2s out of sync until next `activeIndex` change. Fixed with `hasTranslations` effect that re-centers once after translations land.
- **Stale Metro cache**: after removing `lineHeightRef`, bundler served old compiled code. Required `npx expo start --clear`.
- **Immediate snap-back caused flicker**: `handleScrollEnd` was calling `resumeAutoScroll()` directly while momentum scroll was still running. Fixed by always using a timer (never immediate).

## Decisions made
- `measureLayout` over `onLayout`: lazy measurement is more accurate (reflects current heights including translations) and eliminates the streaming overhead
- Proximity threshold 250px (~2-3 lines): close enough to feel natural, wide enough not to be annoying
- Auto-scroll does NOT resume if user scrolled far away — they stay where they are until they scroll back near the playing line

## What to pick up next session
- Step 3: Cache Logic Verification and Hardening
- Step 4: UI Polish
- LRCLIB censors some lyrics (noted, no action needed for now)

## Files changed
- `frontend/src/screens/NowPlayingScreen.js`
