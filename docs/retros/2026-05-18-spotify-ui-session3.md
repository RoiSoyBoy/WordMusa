# Retro — 2026-05-18 — Spotify UI Session 3 (Sheets & Cards)

## What we built / fixed
- WordCard: `#181818` surface background, kept green left border (Spotify accent), muted Hebrew def text, slimmer padding, smaller dot indicators
- WordDetailModal: `#282828` sheet, circular close button (white bg 10%), `#121212` section blocks, Spotify green "Add to dictionary" pill button (full pill radius 500, black text on green — Spotify pattern), section labels uppercase smaller with tighter letterSpacing
- SongWordsSheet: `#282828` sheet, 12px top radius (flatter than old 28px), thinner handle (36px), Spotify green "Add all" pill button (black text on green), add per-word button uses muted border → fills green on tap, 0.5px row separators instead of 1px

## What broke and why
- Nothing broke — all style-only changes

## Decisions made
- CTA buttons (Add to dictionary, Add all) → Spotify pill pattern: full borderRadius 500, `#1DB954` green fill, `#000000` black text — matches Spotify's primary action style (Follow, Add to playlist, etc.)
- Close button → circular `rgba(255,255,255,0.1)` pill, white X — matches Spotify modal close style
- Section backgrounds in WordDetailModal → `#121212` (deepest Spotify dark) inset on `#282828` sheet — provides depth without borders
- Kept tier badge colors (teal/yellow/pink) — these are content-level signals, not UI chrome

## What to pick up next session (Session 4)
- `DictionaryScreen.js` — Spotify Library feel
- `ProgressScreen.js` — dark cards, green stats
- `ReviewScreen.js` — Spotify card style

## Files changed
- MOD: `frontend/src/components/WordCard.js`
- MOD: `frontend/src/components/WordDetailModal.js`
- MOD: `frontend/src/components/SongWordsSheet.js`
