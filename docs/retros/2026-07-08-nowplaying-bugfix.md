# Retro — 2026-07-08 — NowPlayingScreen bug fixes

## What we built / fixed
- Grilling session surfaced 4 bugs in NowPlayingScreen / useLyricSync
- Sorted end-of-song sheet HIGH→LOW (was backwards — surfacing least-important words)
- Auto-scroll now always resumes 2s after user lifts finger (was stuck if scrolled >250px from active line)
- Added quick guard in `setCurrentTrack` to skip re-render when nothing display-relevant changed (was re-rendering all lyrics 1×/sec)
- Dropped plain lyrics fake-timestamp path — shows "no synced lyrics" instead of misleading sync
- Set up Matt Pocock agent skills config (docs/agents/, CONTEXT-MAP.md, ## Agent skills in CLAUDE.md)

## What broke and why
- Nothing broke

## Decisions made
- Plain lyrics with fake 3s timestamps are worse than no lyrics — removed entirely
- Auto-scroll resume: always resume on scroll-end, no distance heuristic
- Multi-context domain layout: frontend/ and backend/ each get their own CONTEXT.md + docs/adr/
- Local markdown (.scratch/) as issue tracker, not GitHub Issues

## What to pick up next session
- CONTEXT.md files for frontend/ and backend/ don't exist yet — /domain-modeling creates them lazily

## Files changed
- `frontend/src/screens/NowPlayingScreen.js`
- `frontend/src/hooks/useLyricSync.js`
- `CLAUDE.md` (added ## Agent skills section)
- `CONTEXT-MAP.md` (new)
- `docs/agents/issue-tracker.md`, `triage-labels.md`, `domain.md` (new)
