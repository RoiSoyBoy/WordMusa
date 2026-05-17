# Retro — 2026-05-17 — Passive Lyrics + Focus Words System

## What we built / fixed
- Removed all auto-highlighting — lyrics now flow clean; no algorithm decides what user learns
- Post-song bottom sheet (`SongWordsSheet.js`): top 5 hardest psychometric words from the song, user taps [+] to add to focus list
- Focus words (flagged in Firestore) highlighted green in future songs — user controls what they see
- Dictionary redesigned: full ~2,800 B1+ word list with 10 difficulty levels (1=hardest, 10=easiest), two tabs ("כל המילים" / "הפוקוס שלי"), horizontal level filter pills
- Replaced Settings tab with Review/quiz screen (Tinder-style swipe: right = ידעתי, left = עוד לא)
- ReviewScreen: card flip on tap, swipe-off animation, score screen at end, `actionsRef` pattern for stale-closure safety
- Fixed duplicate key React errors — `words.json` had many duplicate entries; deduplicated at source in `psychometricWords.js`

## What broke and why
- `learnedWordSet` left in NowPlayingScreen destructuring after auto-scan removal — unused variable warning; removed
- `TIER_RANK` was defined inside `useEffect` — needed at module level for both effects; moved up
- `useNativeDriver: true` incompatible with `Animated.event` in PanResponder — switched to `useNativeDriver: false` throughout ReviewScreen
- DictionaryScreen used `useWordTracking` initially — would have double-triggered streak updates; replaced with inline Firestore subscription

## Decisions made
- `flagged: true` field reused for focus words — no new Firestore collection needed
- `songWordsRef` is a ref (not state) to accumulate words across lines without triggering re-renders
- Level 1-10 computed by dividing tier-sorted list into 10 equal buckets — Level 1 = rarest LOW words, Level 10 = most common HIGH words
- `actionsRef` pattern for PanResponder to avoid stale closures (created once via useRef)
- `psychometricWordList` moved to `psychometricWords.js` as shared export — avoids duplication between Dictionary and Review screens

## What to pick up next session
- Verify on device: bottom sheet appears on song change, [+] adds word, focus words highlight green in next song
- Verify Review screen: swipe gestures work, score screen shows, "שחק שוב" resets correctly
- Consider: empty state in Review when user hasn't added any focus words yet needs UX polish

## Files changed
- NEW: `frontend/src/components/SongWordsSheet.js`, `frontend/src/screens/ReviewScreen.js`
- MOD: `frontend/src/utils/psychometricWords.js` (added `psychometricWordList`, deduplication)
- MOD: `frontend/src/hooks/useWordTracking.js` (added `flaggedWordSet` subscription)
- MOD: `frontend/src/screens/NowPlayingScreen.js` (passive mode, focus word highlights, sheet trigger)
- MOD: `frontend/src/screens/DictionaryScreen.js` (full redesign — 10-level filter, two tabs)
- MOD: `frontend/src/navigation/AppNavigator.js` (Settings tab → Review tab)
