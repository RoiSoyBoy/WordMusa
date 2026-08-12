# LyricLearn — Claude Code Project Context

> Read this file at the start of every session. It contains everything needed to work on this project without asking for background.

---

## What This App Does

LyricLearn is a mobile companion app for Israeli students preparing for the Psychometric Entrance Test (PET). It displays real-time Hebrew-translated lyrics of songs playing on Spotify, with psychometric vocabulary words highlighted inline. Learning happens passively — the user keeps using Spotify normally and opens LyricLearn alongside it.

**Core loop:** Spotify plays → LRCLIB fetches synced lyrics → gpt-4o-mini translates to Hebrew → lyrics display in sync with the music → psychometric words highlighted in green → word card explains the word → Firestore logs the encounter.

---

## Project Structure

```
C:\DEV\LyricLearn\
├── backend\                        # Firebase Cloud Functions (Node.js 20)
│   ├── index.js                    # All Cloud Functions
│   ├── .env                        # Local env vars (LF line endings, no quotes)
│   ├── .secret.local               # Local secret overrides for emulator
│   ├── firebase.json               # Emulator config
│   ├── firestore.rules             # Firestore security rules
│   ├── words.json                  # 1,200 psychometric vocabulary words
│   └── package.json
└── frontend\                       # React Native + Expo
    ├── src\
    │   ├── screens\
    │   │   ├── NowPlayingScreen.js  # Main screen — synced lyrics
    │   │   ├── DictionaryScreen.js  # Personal word bank
    │   │   └── ProgressScreen.js   # Streak, stats, history
    │   ├── components\
    │   │   ├── PlaybackControls.js  # Spotify controls (play/pause/skip/seek)
    │   │   ├── WordCard.js          # Persistent psychometric word card
    │   │   └── WordDetailModal.js   # Full word detail bottom sheet
    │   ├── hooks\
    │   │   ├── useLyricSync.js      # Lyrics + translation + sync loop
    │   │   └── useWordTracking.js   # Firestore word history writes
    │   ├── utils\
    │   │   ├── lrcParser.js         # Parses LRC format to timed array
    │   │   └── psychometricWords.js # Word Set and Map from words.json
    │   ├── data\
    │   │   └── words.json           # Copy of backend/words.json (bundled)
    │   ├── styles\
    │   │   └── theme.js             # Design tokens
    │   ├── navigation\
    │   │   └── AppNavigator.js      # Bottom tab navigator
    │   └── firebase.js             # Firebase initialization
    ├── .env                        # Frontend env vars (EXPO_PUBLIC_ prefix)
    └── package.json
```

---

## Backend — Cloud Functions

### Critical import pattern (firebase-admin v13)

```javascript
// CORRECT — FieldValue moved in v10+
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const db = getFirestore();

// WRONG — do not use
const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue; // undefined in v13
```

### Initialization block — always use this exact pattern

```javascript
if (process.env.FUNCTIONS_EMULATOR === 'true') {
  process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
  process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
  admin.initializeApp({ projectId: 'wordmusa' });
} else {
  admin.initializeApp();
}
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const db = getFirestore();
```

### Never do this

```javascript
require('dotenv').config(); // BANNED — Firebase v2 loads .env automatically, this causes double-parse crash
```

### Cloud Functions — full list

| Function | Method | Auth required | Rate limit | Purpose |
|---|---|---|---|---|
| `spotifyAuth` | POST | No (pre-auth) | — | Exchange Spotify OAuth code for Firebase custom token |
| `spotifyPlayer` | GET | Yes | 120/min | Get current Spotify playback state |
| `spotifyControl` | POST | Yes | 60/min | Play/pause/next/previous/seek |
| `lyricsFetch` | GET | Yes | 60/min | Fetch synced lyrics from LRCLIB (with Firestore cache) |
| `translateLyrics` | POST | Yes | 20/min | Translate lyrics via gpt-4o-mini (SSE streaming, Firestore cache) |
| `tracksMissing` | POST | Yes | 20/min | Log tracks not found in LRCLIB |

### Every authenticated endpoint must follow this pattern

```javascript
if (!(await verifyAppCheck(req, res))) return;
const user = await verifyAuth(req, res);
if (!user) return;
const allowed = await checkRateLimit(user.uid, 'endpoint_name', MAX);
if (!allowed) return res.status(429).send('Too Many Requests');
```

### Secrets — always access like this

```javascript
const clientId = process.env.SPOTIFY_CLIENT_ID || spotifyClientId.value();
```

`process.env.*` works in the emulator (from `.env`). `.value()` works in production (from Secret Manager).

### .env rules — CRITICAL

- **No quotes** around any value — Firebase v2 parser crashes on quoted values
- **LF line endings only** — CRLF (Windows default) crashes the parser
- If editing on Windows, always run after saving:
  ```powershell
  (Get-Content .env -Raw).Replace("`r`n", "`n") | Set-Content .env -NoNewline
  ```
- Verify with: `Format-Hex .env | Select-String "0D"` — must return nothing

---

## Frontend — React Native + Expo

### Firebase initialization (`src/firebase.js`)

```javascript
import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage)
});
export const db = getFirestore(app);

if (__DEV__) {
  connectAuthEmulator(auth, 'http://MACHINE_LOCAL_IP:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, 'MACHINE_LOCAL_IP', 8080);
}
```

**Important:** Use the machine's actual LAN IP (e.g. `192.168.1.x`), NOT `127.0.0.1`. Physical devices and Android emulators cannot reach `127.0.0.1` on the dev machine.

### Frontend .env

```
EXPO_PUBLIC_SPOTIFY_CLIENT_ID=8f141a9dbf044c6a850a4ea36335320d
EXPO_PUBLIC_SPOTIFY_AUTH_URL=http://MACHINE_IP:5001/wordmusa/us-central1/spotifyAuth
EXPO_PUBLIC_BACKEND_URL=http://MACHINE_IP:5001/wordmusa/us-central1
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=wordmusa
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
```

After any `.env` change, restart Expo with `--clear` to bust the cache:
```bash
npx expo start --clear
```

### Auth token pattern — every backend call

```javascript
const token = await auth.currentUser.getIdToken();
const res = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/functionName`, {
  headers: { Authorization: `Bearer ${token}` }
});
```

---

## Firestore Data Model

### `users/{uid}`
```
spotifyAccessToken: string
spotifyRefreshToken: string
spotifyTokenExpiresAt: number (ms timestamp)
streakCount: number
streakLastUpdated: string (YYYY-MM-DD, Asia/Jerusalem timezone)
totalWordsEncountered: number
totalWordsLearned: number
totalSongs: number
isPremium: boolean
createdAt: timestamp
```

### `users/{uid}/wordHistory/{wordId}`
```
word: string
encounterCount: number
firstEncounteredAt: timestamp
lastEncounteredAt: timestamp
tappedAt: timestamp | null
learnedAt: timestamp | null  (set when encounterCount >= 3 AND tappedAt exists)
songContexts: array (max 5) of { trackName, artistName, lyricLine }
```

### `users/{uid}/streakLog/{date}`
```
active: boolean  (always true; doc existence = day was active)
```
Doc ID is `YYYY-MM-DD` (Asia/Jerusalem). Written by `updateStreak()` in `useWordTracking.js` on every app open, independent of streak counter logic. Powers the Progress screen's streak calendar — no doc means that day had no activity.

### `translations/{spotifyTrackId}`
```
translated_lyrics: string[]  (Hebrew translations, one per lyric line)
updated_at: timestamp
model: string  (gpt-4o-mini-4-5-20251001')
```

### `lyrics_cache/{cacheKey}`
```
lyrics: { synced: string | null, plain: string | null }
track_name: string
artist_name: string
cached_at: timestamp
```
Cache key format: `trackname_artistname` (lowercase, spaces → underscores)

### `rate_limits/{uid_endpoint_minute}`
```
count: number
timestamp: timestamp
```

### `missing_tracks/{autoId}`
```
track_id: string
track_name: string
reported_by: string (uid)
reported_at: timestamp
```

### `word_translations/{word}`
```
translation: string  (Hebrew translation of the English word)
source: string       (e.g. 'gpt-4o-mini')
created_at: timestamp
```
Written by backend Admin SDK only. Frontend reads via `/translateWord` endpoint.

---

## Key Algorithms

### LRC Parsing (`src/utils/lrcParser.js`)

LRC format: `[mm:ss.xx] lyric text`

```javascript
export function parseLRC(lrcString) {
  // Returns [{ time_ms: number, text: string }] sorted ascending
}

export function getActiveLyricIndex(lines, position_ms) {
  // Returns index of last line whose time_ms <= position_ms
  // Returns -1 if before first line
}
```

### Lyric Sync Loop (in `useLyricSync.js`)

- Runs every 200ms via `setInterval`
- Reads `position_ms` from a ref (updated by Spotify polling) — never from state, to avoid stale closures
- Calls `getActiveLyricIndex(lines, positionRef.current)`
- Only calls `setActiveIndex` when index actually changes

### Spotify Polling (in `NowPlayingScreen.js`)

- Runs every 1000ms via `setInterval`
- On track ID change: triggers new lyrics load, cancels previous `AbortController`
- Position delta detection: if `position_ms` didn't advance ~1000ms → paused
- Loop detection: if `position_ms` drops to <3000ms while track ID unchanged AND previous position was within 5000ms of `duration_ms` → song looped, reset to line 0 without reloading

### Translation Cache (in `translateLyrics` backend)

Two SSE response shapes — frontend must handle both:
1. **Cache hit:** `data: {"translated_lyrics": ["line1", "line2", ...]}\n\n` then `data: [DONE]\n\n`
2. **Cache miss (streaming):** multiple `data: {"text": "partial..."}\n\n` events then `data: [DONE]\n\n`

After streaming completes, backend parses `fullText` as JSON and writes to `translations/{track_id}`. If `JSON.parse` fails, logs error and skips cache write — does not crash.

### Word "Learned" Definition

A word is marked learned when:
1. `encounterCount >= 3` (seen in lyrics across 3+ sessions)
2. `tappedAt` is set (user tapped the word card at least once)

Both conditions must be true. Check after every `recordWordEncounter` and `recordWordTap` call.

### Streak Logic

```javascript
const today = new Intl.DateTimeFormat('he-IL', {
  timeZone: 'Asia/Jerusalem',
  year: 'numeric', month: '2-digit', day: '2-digit'
}).format(new Date()); // → 'DD/MM/YYYY'

if (today !== lastUpdated) {
  const daysDiff = /* calculate days between today and lastUpdated */;
  if (daysDiff === 1) streakCount++;
  else streakCount = 1; // reset on gap
  streakLastUpdated = today;
}
```

---

## Design System (`src/styles/theme.js`)

```javascript
export const theme = {
  colors: {
    bg: '#0A0A0F',           // screen background
    surface: '#13131A',      // card background
    surface2: '#1C1C28',     // nested card / input background
    accent: '#7C6AF7',       // primary purple — active states, highlights
    accentPink: '#F76A8A',   // secondary — streak, badges
    accentGreen: '#6AF7C8',  // psychometric word highlights
    text: '#F0EEFF',         // primary text
    muted: '#7A7A9A',        // secondary text, timestamps
    highlight: 'rgba(124,106,247,0.15)',   // active lyric line bg
    highlightBorder: 'rgba(124,106,247,0.3)',
    spotify: '#1DB954',      // Spotify green
  },
  radii: { sm: 8, md: 14, lg: 20, xl: 28 },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 },
};
```

### UI Rules

- All screens: `backgroundColor: theme.colors.bg` — no white backgrounds
- Hebrew text: always `textAlign: 'right'`
- English content text: always `textAlign: 'left'`
- Frequency badges: pill shape, `borderRadius: 20`, 11px font, uppercase
  - HIGH → red `rgba(247,106,138,0.2)` border + text `#F76A8A`
  - MEDIUM → yellow `rgba(255,200,50,0.2)` border + text `#FFC832`
  - LOW → green `rgba(106,247,200,0.2)` border + text `#6AF7C8`
- Active lyric line: `backgroundColor: theme.colors.highlight`, border `theme.colors.highlightBorder`
- All touchables: `activeOpacity: 0.7`
- Cards: `backgroundColor: theme.colors.surface2`, `borderRadius: theme.radii.lg`, border `rgba(255,255,255,0.06)`

---

## External APIs

### Spotify Web API
- Auth: OAuth 2.0, scopes: `user-read-playback-state user-read-currently-playing`
- Player endpoint: `GET /v1/me/player` — returns track info + `position_ms` + `shuffle_state`
- Control endpoints: `PUT /v1/me/player/play`, `PUT /v1/me/player/pause`, `POST /v1/me/player/next`, `POST /v1/me/player/previous`, `PUT /v1/me/player/seek?position_ms=N`
- All return 204 No Content on success
- Token refresh: handled server-side in `getValidSpotifyAccessToken()`

### LRCLIB (lyrics)
- Base URL: `https://lrclib.net/api/get`
- Params: `track_name`, `artist_name`, `duration` (seconds)
- No API key required
- Must include `User-Agent: LyricLearn/1.0` header
- Returns `{ syncedLyrics, plainLyrics, duration }` or 404
- `syncedLyrics` may be null on 200 — always check

 - Model: `gpt-4o-mini`
- Endpoint: `POST https://api.openai.com/v1/chat/completions`
- Headers:
  - `Authorization: Bearer <OPENAI_API_KEY>`
  - `Content-Type: application/json`
- Used with `stream: true`
- System prompt: translate JSON array of English lyrics to Hebrew, return JSON array only
- User content: `JSON.stringify(sanitizedLyricsArray)`
- Lyric lines are always passed as data, never interpolated into system prompt (prevents prompt injection)
---

## Emulator Setup

### Start emulators (from `backend/` directory)

```bash
firebase emulators:start
```

Emulator ports:
- Functions: `0.0.0.0:5001`
- Firestore: `0.0.0.0:8080`
- Auth: `0.0.0.0:9099`
- UI: `http://127.0.0.1:4000`

### Known issues and fixes

**"Failed to load environment variables from .env"**
→ Check for CRLF line endings: `Format-Hex .env | Select-String "0D"` must return nothing
→ Check for quoted values: no `KEY="value"` allowed
→ Check `.secret.local` too — same error appears for both files

**"functions.config() has been removed"**
→ firebase-functions v7 bug — downgrade: `npm install firebase-functions@6.3.2`

**"Cannot read properties of undefined (reading 'serverTimestamp')"**
→ Wrong import — use `const { getFirestore, FieldValue } = require('firebase-admin/firestore')`

**"auth/configuration-not-found" on frontend**
→ `connectAuthEmulator` missing or called after auth operation

**"Network request failed" on physical device**
→ Using `127.0.0.1` — replace with actual LAN IP in all frontend env vars and `firebase.js`

---

## Security Rules Summary

```
users/{uid}/** — read/write: own uid only
translations/{id} — read: authenticated; write: false (backend Admin SDK only)
lyrics_cache/{id} — read: authenticated; write: false (frontend create allowed on cache miss)
psychometric_words/{id} — read: authenticated; write: false
word_translations/{id} — read: authenticated; write: false (backend Admin SDK only)
rate_limits/{id} — read/write: false
missing_tracks/{id} — read: false; write: authenticated
```

---

## Monetization (for context)

- **Free tier:** Full lyrics sync + translation, up to 5 psychometric highlights per song, basic streak
- **Premium (NIS 99/year):** Unlimited highlights, full word cards, spaced repetition, offline mode
- RevenueCat for in-app purchases (Phase 3)
- Cost per premium user: ~$0.30/month (dominated by Musixmatch — now replaced with free LRCLIB, so ~$0.10/month)
- Gross margin target: ~85%

---

## Roadmap

| Phase | Status | Scope |
|---|---|---|
| Phase 1 — MVP | ✅ Working | Spotify auth, LRCLIB lyrics, Claude translation, sync loop, Now Playing UI |
| Phase 2 — Full App | 🔨 In Progress | Playback controls, word highlighting, word cards, dictionary, progress screen, bottom nav |
| Phase 3 — Monetization | ⏳ Planned | RevenueCat paywall, offline mode, Apple Music via MusicKit |
| Phase 4 — Growth | ⏳ Planned | Social sharing, streak sharing, referral program, quiz mode |

---

## Common Commands

```bash
# Start backend emulators
cd backend && firebase emulators:start

# Start frontend
cd frontend && npx expo start --clear

# Fix CRLF on Windows (run from backend/)
(Get-Content .env -Raw).Replace("`r`n", "`n") | Set-Content .env -NoNewline
(Get-Content .secret.local -Raw).Replace("`r`n", "`n") | Set-Content .secret.local -NoNewline

# Check firebase-functions version
Get-Content node_modules\firebase-functions\package.json | Select-String '"version"' | Select-Object -First 1

# Check for CRLF
Format-Hex .env | Select-String "0D"

# Test a function directly
node -e "fetch('http://127.0.0.1:5001/wordmusa/us-central1/FUNCTION_NAME', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({}) }).then(r => r.text().then(t => console.log(r.status, t))).catch(console.error)"
```

---

## What NOT to Change Without Asking

- The Firebase initialization block and `FieldValue` import pattern in `index.js`
- The `verifyAuth`, `verifyAppCheck`, `checkRateLimit` helper functions
- `firebase.js` frontend initialization (especially emulator connection logic)
- Emulator ports in `firebase.json`
- The `.env` CRLF fix — never introduce CRLF
- The `getValidSpotifyAccessToken` function (complex token refresh logic with concurrency handling)

---

## Hard Rules

These are non-negotiable. Apply them to every task, every session.

### Verification before completion
- **Never say "done", "fixed", or "working" without actually verifying.**
- Backend change → run `firebase emulators:start` and confirm the function loads with no errors in the log
- Frontend change → run `npx expo start --clear` and confirm no red screen on device/simulator
- Firestore rule change → test the affected rule in the Firebase Emulator UI at `http://127.0.0.1:4000/firestore`
- Show the actual output, not a description of what the output should be

### Scope discipline
- Max ~50 lines changed per fix for bug fixes — if a fix requires more, break it into steps and confirm after each
- One concern per commit — don't fix a bug and refactor in the same change
- If a task touches more than 3 files, pause and confirm the plan before writing any code

### Protected files — never touch without explicit approval
- `backend/index.js` → `spotifyAuth` function
- `backend/index.js` → `getValidSpotifyAccessToken` function
- `backend/index.js` → `verifyAuth`, `verifyAppCheck`, `checkRateLimit` helpers
- `frontend/src/firebase.js` → entire file
- `backend/firebase.json` → emulator ports
- Any `.env` or `.secret.local` file — only edit if the task explicitly requires it

### Windows .env safety
- After editing any `.env` or `.secret.local` file on Windows, always run:
  ```powershell
  (Get-Content .env -Raw).Replace("`r`n", "`n") | Set-Content .env -NoNewline
  ```
- Verify with `Format-Hex .env | Select-String "0D"` — must return nothing
- Never add quotes around values. Never.

### Emulator crash protocol
- Before attempting any fix for an emulator crash, always run:
  ```powershell
  Get-Content firebase-debug.log | Select-Object -Last 50
  ```
- Read the actual error. Do not guess from the terminal output alone — the debug log always has more detail.

### Dependency changes
- Never change `firebase-functions` version — currently pinned to v6.x to avoid the v7 `functions.config()` bug
- Never add `require('dotenv').config()` to `index.js` — Firebase v2 loads `.env` automatically
- Before installing any new npm package, check if it's already available in the existing dependencies

---

## Session Start Checklist

At the start of every new Claude Code session, do these in order:

1. **Read the latest retro** — check `docs/retros/` for the most recent file and read it for continuity
2. **Read this CLAUDE.md** — confirm you have the full project context
3. **Confirm what's working** — ask the developer what was last verified as working before starting new work
4. **Check the knowledge graph** — if `graphify-out/graph.json` exists, and the task touches cross-cutting or unfamiliar code (not a simple one-file fix), query it (`/graphify query "..."`) for architecture, community structure, and cross-file relationships before grepping from scratch. Skip this for small, well-scoped changes — it's not needed there. Treat the graph as a snapshot: verify anything it surfaces against the actual current file before acting on it, and re-run `/graphify --update` if the codebase has changed significantly since the last build.
5. **Scope the task** — identify exactly which files need to change before writing any code
6. **Check emulators are running** — if the task involves backend work, confirm `firebase emulators:start` is running and all functions loaded cleanly

---

## Session End / Retro

After every non-trivial session, generate a retro and save it to `docs/retros/YYYY-MM-DD-topic.md`.

Retro format:
```markdown
# Retro — YYYY-MM-DD — [topic]

## What we built / fixed
- ...

## What broke and why
- ...

## Decisions made
- ...

## What to pick up next session
- ...

## Files changed
- ...
```

Keep retros short — 20 lines max. The goal is continuity, not documentation.

After saving the retro, if `graphify-out/graph.json` exists, run `/graphify --update` so the new retro and any changed/added files get absorbed into the knowledge graph. This uses graphify's incremental extraction (only new/changed files, not a full rebuild). Skip this for trivial sessions that didn't warrant a retro in the first place.

---

## Agent skills

### Issue tracker

Issues live as local markdown files under `.scratch/<feature>/` in this repo (no GitHub Issues integration). See `docs/agents/issue-tracker.md`.

### Triage labels

Default canonical strings used — `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Multi-context layout — `CONTEXT-MAP.md` at root points to `frontend/CONTEXT.md` and `backend/CONTEXT.md`; ADRs live under `frontend/docs/adr/` and `backend/docs/adr/` for context-scoped decisions, and `docs/adr/` for system-wide ones. See `docs/agents/domain.md`.