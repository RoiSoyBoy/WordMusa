# Retro — 2026-06-09 — Lyric tap feedback + flashcard song context

## What we built
- Lyric lines now flash a purple overlay on press — user knows the seek registered
- Flashcard front shows the source song name (♪ Track) below the English word

## Decisions made
- Used Pressable's render-function children `{({ pressed }) => ...}` rather than Animated — zero overhead, instant on/off, exactly matches "appears only on touch" requirement
- `absoluteFillObject` overlay with `borderRadius: 8` — follows the line's own bounding box, feels like a selection rect
- Song context uses last `songContexts` entry (most recent encounter); graceful no-op if array is empty

## What to pick up next session
- Remove debug `[LL]` console logs from `useLyricSync.js`
- Rotate the GitHub PAT in `backend/.env` to Secret Manager
- Verify `recordWordEncounter` writes in production
