# Retro — 2026-05-18 — Spotify UI Session 2 (Now Playing + Controls)

## What we built / fixed
- Renamed app "frontend" → "PsychoLyrics" in app.json (slug, scheme updated too)
- `userInterfaceStyle` → "dark", splash `backgroundColor` → `#121212`
- NowPlayingScreen header: compact track row (52px square album art, bold white track name, muted artist, pulsing green dot replaces Spotify badge)
- Lyrics: removed card borders/backgrounds from active line — Spotify style is pure text with opacity-based dimming. Active line uses larger font (20px bold white), inactive lines are dim rgba(255,255,255,0.35)
- Hebrew translations dimmed to rgba(255,255,255,0.25), active line gets rgba(255,255,255,0.7)
- PlaybackControls: white `#FFFFFF` 64px circle play button with black icon (Spotify signature), `#535353` progress track + white fill, Ionicons icons for prev/next (play-skip-back, play-skip-forward)
- Removed LinearGradient from progress bar (now plain white fill on dark track)

## What broke and why
- Nothing broke — logic untouched, pure style changes

## Decisions made
- Progress fill is `#FFFFFF` white (authentic Spotify mobile) not `#1DB954` green
- Active lyric font bumps from 18→20px instead of adding a background box — cleaner Spotify feel
- Removed LinearGradient dependency from PlaybackControls (no longer needed)
- Play button `marginLeft: 3` on play icon — Ionicons play triangle is optically off-center, nudge fixes it

## What to pick up next session (Session 3)
- `WordCard.js` — Spotify dark surface card, green accent
- `WordDetailModal.js` — Spotify bottom sheet (#282828, white handle)
- `SongWordsSheet.js` — Spotify bottom sheet styling

## Files changed
- MOD: `frontend/app.json`
- MOD: `frontend/src/screens/NowPlayingScreen.js`
- MOD: `frontend/src/components/PlaybackControls.js`
