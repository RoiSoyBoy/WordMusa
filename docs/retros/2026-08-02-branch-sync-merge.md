# Retro — 2026-08-02 — Branch sync: phone-session work merged to main

## What we built / fixed
- Discovered a phone Claude Code session from 2026-07-31 (`claude/vocab-song-recommendations-hjuy8x`) had 5 commits pushed to GitHub but never merged into `main` and never had a PR opened
- Fast-forward merged that branch into `main` (9770b8b6 → 53c4f1bb) — clean, zero conflicts, no merge commit needed
- Brings in: Song Words recommendations tab (`RecommendationsScreen.js`), backend `recommendedSongs.json` + Spotify/LRCLIB resolution logic in `index.js`, lyric auto-scroll drift-lock fix in `useLyricSync.js`, Firestore rule for `recommended_songs`
- Synced the active session branch to the new `main` tip

## What broke and why
- User (on iPhone, away from PC) couldn't tell if recent phone-session work had "made it to GitHub" — it had, but was stranded on its own branch instead of landing in `main`, since nothing merges phone-session branches automatically and no PR was ever opened for it

## Decisions made
- Merge phone-session branches into `main` before ending the session, rather than leaving them as orphan branches (see new CLAUDE.md rule)
- Did not delete `claude/vocab-song-recommendations-hjuy8x` on origin — left as-is, low priority
- Skipped deploying to psycholyrics.web.app from this session: no firebase CLI/gcloud/credentials and no `frontend/.env.production` in this sandbox; user will deploy from their PC instead

## What to pick up next session
- Deploy the newly-merged recommendations feature to psycholyrics.web.app (from PC, per `docs/retros/2026-05-24-web-deployment.md` workflow)
- Verify `recommended_songs` Firestore rule and new backend endpoint behave correctly in production

## Files changed
- Merge only — see `docs/retros/2026-07-26-vocab-song-recommendations.md` and `docs/retros/2026-07-26-lyric-sync-drift-fix.md` for the original session's file list
- `CLAUDE.md` — added session-end rule to merge/push phone-session work into `main` before ending
