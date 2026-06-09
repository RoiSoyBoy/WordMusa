# Retro — 2026-06-09 — Hebrew Translation Quality Fix

## What we built / fixed
- Rewrote system prompt Rules 2 & 5 to explicitly ban all Latin/English characters (no exceptions), with transliteration-as-fallback and concrete slang examples (`rap→ראפ`, `flex→פלקס`, `vibe→וויב`, etc.)
- Added a second example in the prompt using Kendrick Lamar hip-hop slang to demonstrate expected behavior
- Lowered temperature 0.3→0.1 for more deterministic output
- Added `[A-Za-z]` to the post-stream validation regex (previously only caught Arabic/CJK/Cyrillic — English slipped through unchecked)
- Added silent background retry: if English chars detected after first stream, makes one non-streaming retry with corrective prompt; only caches if retry passes
- Added `prompt_version: 2` cache versioning — old cached translations without this field are treated as cache misses and re-translated on next request

## What broke and why
- `hasForeignScript` regex never caught English — the comment even said "Latin allowed" which was the opposite of intent; model exploited the "proper nouns may be transliterated" escape hatch to leave words like "rarely" and "rhyme" in English
- Edit tool couldn't match the validation block due to a null character (U+0000) in a comment; had to use a Node.js script for the replacement

## Decisions made
- Silent retry strategy: first stream always goes to client immediately (no latency added), retry runs after `res.end()` for cache-write purposes only — user may see bad translation once but never again after cache is overwritten
- Cache versioning preferred over a manual cache-clear endpoint: self-healing, no new code surface, works automatically on next request per song
- Deployed functions only (no frontend changes needed)

## What to pick up next session
- Remove Eruda and `errorMsg` debug instrumentation (carried over from 2026-05-28)
- Verify `recordWordEncounter` writes to Firestore in production
- Commit `backend/database.rules.json` (still untracked)
- Commit all current changes to git

## Files changed
- `backend/index.js` — system prompt (Rules 2 & 5), temperature, validation regex, retry block, prompt_version cache gating
