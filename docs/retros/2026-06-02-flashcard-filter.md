# Retro — 2026-06-02 — Flashcard Filter Feature

## What we built / fixed
- Added persistent "words learnt" filter to ReviewScreen
- Swipe-right on any card adds the word to `FLASHCARD_WORDS_LEARNT` (AsyncStorage), cumulative across all sessions
- Filter pill in header toggles between "כל המילים" and "מילים שאני עדיין לא יודע"
- Filter preference persists via `FLASHCARD_FILTER_ON` (AsyncStorage)
- 🎉 empty state when filter is ON and all focus words have been marked known, with "כל המילים" reset button
- Loading state now waits for AsyncStorage before starting session (prevents wrong filter flash)

## What broke and why
- Nothing — single-file change, tested on device before deploy

## Decisions made
- `wordsLearnt` is cumulative (not per-session reset) — once you know a word, it stays out of the filtered queue until you manually switch to "כל המילים"
- Stored in AsyncStorage (not Firestore) — local device preference, no backend needed
- Words saved incrementally on each swipe-right so progress survives mid-session exit

## What to pick up next session
- Remove Eruda and `errorMsg` debug instrumentation from codebase (carried over from 2026-05-28)
- Verify `recordWordEncounter` is writing to Firestore in production
- Commit `backend/database.rules.json` if it's intentional (currently untracked)

## Files changed
- `frontend/src/screens/ReviewScreen.js` — filter logic, AsyncStorage integration, new empty state, filter pill UI
- `backend/firebase.json` — database rules reference added (unrelated, pre-existing change)
