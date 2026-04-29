================================================================================
LYRICLEARN — PRODUCT REQUIREMENTS DOCUMENT
================================================================================
Version:   1.1
Date:      April 2026
Status:    Draft
Platform:  iOS & Android
Tagline:   Learn psychometric English vocabulary through music
================================================================================


────────────────────────────────────────────────────────────────────────────────
1. PRODUCT OVERVIEW
────────────────────────────────────────────────────────────────────────────────

1.1 EXECUTIVE SUMMARY
─────────────────────
LyricLearn is a mobile companion app that helps Israeli students preparing for
the Psychometric Entrance Test (PET) learn English vocabulary in a natural,
engaging way. It does this by displaying real-time synchronized lyrics of songs
they already listen to on Spotify — with Hebrew translations and psychometric
vocabulary words highlighted and explained inline.

The user does not change their listening habits. They open LyricLearn alongside
Spotify, and learning happens automatically as the music plays.


1.2 PROBLEM STATEMENT
─────────────────────
Traditional psychometric vocabulary study is repetitive and demotivating.
Students must memorize hundreds of English words in isolation, disconnected from
any real-world context. The result is low retention, low engagement, and a
feeling that studying for the psychometric is a chore.

At the same time, Israeli students spend 2–4 hours daily listening to
English-language music — a rich, emotionally engaging, naturally contextual
source of vocabulary exposure that goes completely untapped. A student who
listens to 10 songs a day is exposed to hundreds of English words in context,
but has no tool that connects that exposure to learning.


1.3 SOLUTION
────────────
LyricLearn bridges this gap. It connects to the user's Spotify account, detects
what song is currently playing, fetches time-synced lyrics, and renders them in
real time with:

  - Hebrew translation beneath each English line
  - Psychometric vocabulary words highlighted in a distinct color
  - A word card at the bottom of the screen explaining the highlighted word

Learning happens passively. The user does not need to open a flashcard app,
pause the music, or change anything about how they listen. Vocabulary
acquisition is woven into an activity they were already doing.


1.4 VISION STATEMENT
────────────────────
"Make every song a vocabulary lesson — without the student even noticing
they're studying."


1.5 BACKGROUND & CONTEXT
─────────────────────────
The Israeli Psychometric Entrance Test has a dedicated English vocabulary
section that is widely considered one of the hardest sections to improve
quickly. Most prep courses and apps address it through traditional flashcard
drills (e.g., Kidum, Yael). These work for motivated students but have high
dropout rates.

Music-based language learning is well-supported by research. Contextual
exposure — hearing a word used naturally in a sentence — produces stronger
retention than isolated memorization. LyricLearn is designed to harness this
mechanism at zero additional time cost to the user.


────────────────────────────────────────────────────────────────────────────────
2. TARGET USERS
────────────────────────────────────────────────────────────────────────────────

2.1 PRIMARY USER
────────────────
Israeli students aged 16–26 preparing for the Psychometric Entrance Test who:
  - Listen to English-language music daily (Spotify primary platform)
  - Find traditional vocabulary drills boring or hard to maintain
  - Have a smartphone (iOS or Android)
  - Are motivated to improve their English score but struggle with consistency


2.2 PRIMARY USER PERSONA
────────────────────────
Name:           Roi, 20
Background:     studying for the Psychometric Test in 3 months.
                Aiming for a score that will get him into a computer science
                program.
Music habits:   Listens to Spotify 2–3 hours per day — on the bus, at the gym,
                while cooking. Mostly English-language pop, hip-hop, and
                alternative.
Current study:  Uses Kidum's word list but finds it hard to stay consistent.
                Has tried flashcard apps but abandons them after a few days.
Pain point:     "I know I should be learning these words but it's just so
                boring. I can't sit and stare at a list."
Goal:           Learn enough psychometric vocabulary to meaningfully improve his
                score, without dedicating extra time to it.
Device:         iPhone 14 (primary), Android tablet at home.
Key insight:    Roi will not change his listening behavior. The product must
                come to him, not the other way around.


2.3 SECONDARY USERS
───────────────────
  - High school students (ages 16–18) preparing for the Bagrut English exam
  - General English learners in Israel who want passive vocabulary improvement
  - Anyone curious about understanding English song lyrics more deeply
  - Teachers who want to recommend a supplementary tool to students


────────────────────────────────────────────────────────────────────────────────
3. GOALS & SUCCESS METRICS
────────────────────────────────────────────────────────────────────────────────

3.1 BUSINESS GOALS
──────────────────
  - Acquire 10,000 monthly active users within 6 months of public launch
  - Achieve 30%+ Day-7 retention rate (industry benchmark for education apps)
  - Reach 4.2+ average rating on App Store and Google Play
  - Achieve profitability at 2,000 premium subscribers
  - Establish LyricLearn as the go-to passive vocabulary tool for PET prep


3.2 USER GOALS
──────────────
  - Encounter at least 5 new psychometric words per week without extra effort
  - Understand the meaning and context of songs they already love
  - Feel a measurable improvement in English comprehension over time
  - Maintain a daily learning habit with minimal friction


3.3 KEY METRICS (KPIs)
──────────────────────
Metric                            | Month 3 Target  | Month 6 Target
──────────────────────────────────|─────────────────|────────────────
Monthly Active Users              | 5,000           | 10,000+
Daily Active Users                | 1,500           | 3,500
Day-7 Retention                   | 25%             | 35%
Avg. session length               | 8 min           | 12 min
Words encountered / user / week   | 15              | 25
Words "learned" / user / week     | 4               | 7
Spotify auth completion rate      | 70%             | 80%
Free → Premium conversion rate    | —               | 5–8%
App Store / Play rating           | 4.0+            | 4.3+
Translation cache hit rate        | 80%             | 95%


3.4 DEFINITION OF "WORD LEARNED"
─────────────────────────────────
A word is considered "learned" when the user has encountered it in lyrics on
3 or more separate sessions AND has tapped on the word card at least once to
view its full definition. This is a conservative proxy for retention.


────────────────────────────────────────────────────────────────────────────────
4. FEATURES & REQUIREMENTS
────────────────────────────────────────────────────────────────────────────────

4.1 FEATURE OVERVIEW
────────────────────
Feature                  | Priority     | Phase
─────────────────────────|──────────────|─────────
Spotify Connect          | Must Have    | Phase 1
Synced Lyrics Display    | Must Have    | Phase 1
Hebrew Translation       | Must Have    | Phase 1
Psychometric Highlights  | Must Have    | Phase 1
Word Card (inline)       | Must Have    | Phase 1
Onboarding Flow          | Must Have    | Phase 1
Progress Tracker         | Should Have  | Phase 1
Personal Dictionary      | Should Have  | Phase 2
Spaced Repetition        | Should Have  | Phase 2
Push Notifications       | Should Have  | Phase 2
Offline Mode             | Nice to Have | Phase 3
Apple Music Integration  | Nice to Have | Phase 3
Social / Sharing         | Nice to Have | Phase 4


4.2 DETAILED FEATURE REQUIREMENTS
──────────────────────────────────

4.2.1 SPOTIFY INTEGRATION
  - User authenticates via Spotify OAuth 2.0 on first launch
  - App stores refresh token in Firebase Auth / Firestore for persistent sessions
  - Backend polls Spotify Web API /me/player endpoint every 1,000ms to retrieve:
      · Current track name, artist, album, album art URL
      · Current playback position (ms)
      · Is playing / paused state
  - On song change: immediately trigger lyrics fetch for new track
  - On pause: freeze lyric highlight at current line, show paused state
  - On resume: re-sync position and continue
  - Handle edge cases:
      · No active playback — show idle screen with prompt to open Spotify
      · Spotify free account — verify if Playback State API is accessible;
        if not, display upgrade prompt or graceful fallback
      · API rate limit (429) — implement exponential backoff, max 5s retry
      · Token expiry — auto-refresh using stored refresh token
      · Song not found in Musixmatch — show lyrics unavailable state gracefully


4.2.2 SYNCHRONIZED LYRICS DISPLAY
  - On song detection, fetch LRC-format (time-stamped) lyrics from Musixmatch
  - Parse LRC timestamps into array of { time_ms, line_english } objects
  - Every 200ms, compare current Spotify playback position to LRC timestamps
  - Activate the lyric line whose timestamp is <= current position
  - Scroll view auto-centers the active line with smooth animation (300ms ease)
  - Display layout per line:
      · English lyric text (full width, left-aligned, white)
      · Hebrew translation immediately below (smaller, muted color, right-aligned)
      · Psychometric words in the English text highlighted in accent color
  - Context lines: show 2 lines above (30% opacity) and 2 lines below (45% opacity)
  - Synchronization accuracy target: active line correct within ±500ms of audio
  - If LRC timestamps are unavailable, fall back to plain (unsynced) lyrics with
    a visual indicator that sync is unavailable for this track


4.2.3 HEBREW TRANSLATION SYSTEM
  - Translations are generated by Claude Haiku API (claude-haiku-4-5 model)
  - Translation prompt instructs the model to:
      · Translate each lyric line to natural, colloquial Hebrew
      · Preserve the emotional tone and intent of the original
      · Keep translations concise (1 line max per lyric line)
      · Return output as a JSON array matching the input line count
  - All translations cached in Firestore under key: translations/{musixmatch_track_id}
  - Cache is global — shared across all users
  - Before calling Claude API, always check cache first
  - Expected cache hit rate: ~80% at launch, ~95% after 3 months
  - Translation is fetched/generated when a new song is detected, before
    playback sync begins (target: <2 seconds end-to-end for cache hit)
  - If translation fails: show English only with a subtle indicator


4.2.4 PSYCHOMETRIC VOCABULARY SYSTEM
  - Maintain a local database of 1,200+ curated psychometric vocabulary words
  - Database includes per word:
      · English word (normalized lowercase)
      · Part of speech (noun, verb, adj, adv)
      · Hebrew definition (short, 3–6 words)
      · Hebrew definition (full, 1–2 sentences)
      · Phonetic transcription (IPA)
      · Frequency tier: HIGH / MEDIUM / LOW (based on PET appearance frequency)
      · 1–2 example sentences in English
      · 3–5 synonyms
  - Word matching: when a lyric line becomes active, scan English text for any
    word (case-insensitive, strip punctuation) that exists in the database
  - If 1+ matches found: highlight all matching words in the lyric line
  - Display persistent word card at bottom of screen for the FIRST new match
    (if multiple matches in one line, cycle through them every 4 seconds)
  - Word card content:
      · English word (large, prominent)
      · IPA phonetic transcription
      · Part of speech
      · Short Hebrew definition
      · Frequency badge (HIGH = red, MEDIUM = yellow, LOW = green)
  - Tap on word card → expand to full detail view (see 4.2.5)
  - Tap on highlighted word in lyrics → same full detail view
  - Words the user has already "learned" (seen 3+ times) shown with a
    subtle checkmark icon rather than full highlight


4.2.5 WORD DETAIL VIEW
  - Full-screen modal, opened by tapping word card or highlighted word
  - Content:
      · English word (large heading)
      · IPA phonetic + audio pronunciation button (TTS via device API)
      · Part of speech + frequency tier badge
      · Hebrew definition (full version)
      · Context box: the lyric line where the word appeared + its translation
      · Example sentence in English
      · Synonyms (tappable — each opens its own detail view)
      · "Add to review list" toggle (for spaced repetition in Phase 2)
  - Dismiss: swipe down or tap outside
  - Music continues playing while detail view is open


4.2.6 PROGRESS & GAMIFICATION
  - Daily streak: incremented when user has at least 1 active session per day
    Streak resets at midnight (Israel time, Asia/Jerusalem timezone)
  - Stats tracked per user in Firestore:
      · Total words encountered (unique)
      · Total words "learned" (per definition in 3.4)
      · Total songs listened to through the app
      · Total unique artists
      · All-time sessions count and total listening time
  - Progress screen displays:
      · Streak with flame icon and count
      · Weekly word counter (resets Monday)
      · Total learned words vs. total psychometric words (progress bar)
      · Recent words list (last 20 encountered, with song context)
      · Stats grid (songs, artists, total time)
  - Weekly summary push notification (opt-in, sent Sunday evening):
      "This week you learned 8 new words across 34 songs 🎵"


4.2.7 ONBOARDING FLOW
  - Screen 1: Value proposition — "Learn psychometric words while you listen"
               (3 animated screens, skippable)
  - Screen 2: Connect Spotify — OAuth button, explanation of why it's needed
  - Screen 3: Permission requests — notifications (optional, explained)
  - Screen 4: Quick demo — show a mock "now playing" screen with highlighted
               word to set expectations before first real use
  - Total onboarding: target <90 seconds to first real song playing


────────────────────────────────────────────────────────────────────────────────
5. TECHNICAL ARCHITECTURE
────────────────────────────────────────────────────────────────────────────────

5.1 TECH STACK
──────────────
Layer                      | Technology
───────────────────────────|────────────────────────────────────────────────────
Frontend                   | React Native (Expo) — iOS & Android single codebase
Music Integration          | Spotify Web API (OAuth 2.0 + Playback State)
Apple Music (Phase 3)      | Apple MusicKit for iOS (Swift native module)
Lyrics                     | Musixmatch API (LRC time-synced format)
AI Translation             | Anthropic Claude Haiku (claude-haiku-4-5-20251001)
Database                   | Firebase Firestore (NoSQL, real-time)
Authentication             | Firebase Auth + Spotify OAuth tokens stored in
                           | Firestore
Backend                    | Node.js + Express (API proxy, token refresh,
                           | Claude API calls — keeps API keys server-side)
Hosting                    | Firebase Hosting + Cloud Functions (serverless)
Push Notifications         | Firebase Cloud Messaging (FCM)
Analytics                  | Firebase Analytics + custom Firestore events


5.2 FIRESTORE DATA MODEL
────────────────────────

Collection: users/{uid}
  Fields:
    - spotifyAccessToken: string
    - spotifyRefreshToken: string
    - spotifyTokenExpiry: timestamp
    - streakCount: number
    - streakLastUpdated: date (YYYY-MM-DD)
    - totalWordsEncountered: number
    - totalWordsLearned: number
    - totalSongs: number
    - createdAt: timestamp
    - isPremium: boolean
    - premiumExpiresAt: timestamp | null

Collection: users/{uid}/wordHistory/{wordId}
  Fields:
    - word: string
    - encounterCount: number
    - firstEncounteredAt: timestamp
    - lastEncounteredAt: timestamp
    - learnedAt: timestamp | null
    - songContexts: array of { trackId, artistName, trackName }
    - addedToReview: boolean

Collection: translations/{musixmatch_track_id}
  Fields:
    - trackId: string
    - trackName: string
    - artistName: string
    - lines: array of { time_ms: number, english: string, hebrew: string }
    - generatedAt: timestamp
    - model: string ("claude-haiku-4-5-20251001")

Collection: psychometric_words/{wordId}
  Fields:
    - word: string (lowercase)
    - partOfSpeech: string
    - hebrewShort: string
    - hebrewFull: string
    - ipa: string
    - frequencyTier: "HIGH" | "MEDIUM" | "LOW"
    - synonyms: string[]
    - exampleSentence: string


5.3 DATA FLOW — HAPPY PATH
──────────────────────────
1.  User opens LyricLearn. Firebase Auth restores session.
2.  App checks Spotify token expiry. If expired, backend refreshes via
    stored refresh token.
3.  Polling loop starts: every 1,000ms, call Spotify /me/player.
4.  New song detected (track ID changed).
5.  App checks Firestore: translations/{track_id}.
      → CACHE HIT (~95%): load translations array immediately.
      → CACHE MISS: call backend /api/translate endpoint.
          · Backend fetches lyrics from Musixmatch API.
          · Backend calls Claude Haiku with lyrics + system prompt.
          · Backend stores result in Firestore translations/{track_id}.
          · Returns translations to app.
6.  App parses LRC timestamps and builds lyric + translation array.
7.  Playback sync loop starts (every 200ms):
      · Get current Spotify position from latest poll result.
      · Find matching lyric line by timestamp.
      · If line changed: update UI, scan for psychometric words, update word card.
8.  User taps word card → word detail modal opens.
9.  Encounter logged to users/{uid}/wordHistory/{wordId} in Firestore.
10. If encounterCount reaches 3 AND user has tapped word card at least once:
    mark word as "learned", update user stats.


5.4 CLAUDE HAIKU TRANSLATION PROMPT
────────────────────────────────────
System prompt sent to Claude Haiku:

  "You are a Hebrew translator specializing in song lyrics. You will receive an
   array of English lyric lines. Translate each line to natural, colloquial
   Hebrew. Preserve emotional tone and poetic meaning. Keep each translation
   concise — one line maximum. Return ONLY a valid JSON array of Hebrew strings,
   in the same order as the input. No preamble, no markdown, no explanation."

User message: JSON array of English lyric lines.
Expected response: JSON array of Hebrew translation strings, same length.


5.5 API DEPENDENCIES & RISK ASSESSMENT
───────────────────────────────────────
API              | Usage                        | Risk   | Mitigation
─────────────────|──────────────────────────────|────────|────────────────────────────────────
Spotify Web API  | Track detection, position    | Medium | Exponential backoff on 429;
                 |                              |        | cache last-known track state;
                 |                              |        | degrade gracefully on failure
Musixmatch API   | Time-synced lyrics (LRC)     | High   | Cache all lyrics in Firestore;
                 |                              |        | fallback to unsynced lyrics;
                 |                              |        | evaluate Genius API as backup
Claude Haiku API | Hebrew translation           | Low    | Global translation cache means
                 |                              |        | API is rarely called; retry once
                 |                              |        | on failure, then show English-only
Firebase         | Auth, DB, hosting            | Low    | Google SLA; no single point of
                 |                              |        | failure; Firestore auto-scales


5.6 PERFORMANCE TARGETS
───────────────────────
  - Time from song change to lyrics displayed: <2s (cache hit), <5s (cache miss)
  - Lyric sync accuracy: ±500ms of actual audio position
  - App cold start time: <3 seconds
  - Polling battery impact: minimal — Spotify API calls are lightweight JSON;
    target <1% additional battery drain per hour vs. not running the app


5.7 REAL-TIME SYNC — EDGE CASE STRATEGIES
──────────────────────────────────────────
This section defines the expected behavior for every non-happy-path sync
scenario. Three core principles apply across all cases:
  1. Always show something — never display a blank screen
  2. Always sync from Spotify position (source of truth), not local time
  3. Cancel unnecessary requests as early as possible

─────────────────────────────────────────────────────────────────────────────
CASE 1: LOADING DELAY ON NEW SONG (baseline problem)
─────────────────────────────────────────────────────────────────────────────
Scenario:
  User picks a song. App needs to fetch lyrics + translation before it can
  display anything. Song is already playing. Estimated worst-case delay: 4–5s.

Strategy — Progressive Display + Streaming:
  Step 1: As soon as new track is detected, immediately display the song title
          and artist with a subtle loading indicator. Never show a blank screen.
  Step 2: Fetch lyrics from Musixmatch. Display English lyrics immediately,
          unstyled, with no translation yet. Sync highlighting begins.
  Step 3: Call Claude Haiku with streaming enabled. As each translated line
          arrives in the stream, insert it into the UI beneath the English line.
          Translations "fill in" progressively — the user sees the app working,
          not waiting.
  Step 4: Once all translations are loaded, store in Firestore cache for all
          future users.

Cache hit path (expected ~95% of cases):
  Steps 2–3 collapse into one: fetch lyrics + cached translations together,
  display immediately. Target: <1.5s total.

─────────────────────────────────────────────────────────────────────────────
CASE 2: USER SKIPS SONG WITHIN 5 SECONDS
─────────────────────────────────────────────────────────────────────────────
Scenario:
  User skips a song before translation has finished loading. An in-flight
  Claude API call is still running, wasting tokens and potentially writing a
  stale translation to Firestore.

Strategy — AbortController:
  Every outgoing Claude API request is created with an AbortController signal.
  The signal and its associated track ID are stored in app state.
  When the polling loop detects a track ID change:
    1. Immediately call signal.abort() on the previous request.
    2. Do NOT write partial translations to Firestore.
    3. Clear current lyrics state.
    4. Begin the loading flow for the new track from scratch.

  This ensures zero wasted tokens and no stale cache entries.

─────────────────────────────────────────────────────────────────────────────
CASE 3: APP OPENED MID-SONG
─────────────────────────────────────────────────────────────────────────────
Scenario:
  User listened to a song in Spotify for 2 minutes, then opened LyricLearn.
  The app must not start syncing from the beginning — it must jump to the
  correct line immediately.

Strategy — Position-Aware Load:
  On app open (or foreground restore), the first Spotify poll returns both
  the track ID AND the current position_ms.
  This position_ms is passed as a parameter to the lyrics loading function.
  After lyrics and translations are ready, instead of starting from line 0,
  the sync algorithm finds the correct line by scanning LRC timestamps for
  the last timestamp <= current position_ms.
  The UI jumps directly to that line with no animation (instant render),
  then resumes normal 200ms sync loop from that point.

─────────────────────────────────────────────────────────────────────────────
CASE 4: NETWORK DROPOUT (e.g. train tunnel)
─────────────────────────────────────────────────────────────────────────────
Scenario:
  Connection drops for 3–10 seconds mid-song. Spotify continues playing
  (it buffers ahead). LyricLearn polling fails silently. When connection
  returns, the app does not know how much time has passed.

Strategy — Reconnect & Re-sync:
  While offline:
    - Polling failures are caught silently (no error screen).
    - Display a subtle connectivity indicator (small icon, not intrusive).
    - Freeze the lyric highlight on the last known line.
    - Continue showing existing lyrics and translations (already in memory).

  When connection restores:
    - Immediately fire a Spotify poll to get the current position_ms.
    - Do NOT attempt to "catch up" by animating through missed lines.
    - Jump directly to the correct current line (same as Case 3 logic).
    - Remove the connectivity indicator.

  If the song ended while offline:
    - The next poll will return a new track ID.
    - Normal new-song flow begins.

─────────────────────────────────────────────────────────────────────────────
CASE 5: SONG NOT FOUND IN MUSIXMATCH
─────────────────────────────────────────────────────────────────────────────
Scenario:
  Rare, live, non-English, or very new song has no lyrics in Musixmatch.

Strategy — Graceful Degradation:
  - Display the song title and artist as normal.
  - Show a clear, friendly Hebrew message: "מילות השיר הזה לא זמינות כרגע"
  - Do NOT call Claude (no lyrics to translate).
  - Show a "דווח על שיר חסר" button that logs the track ID to a Firestore
    missing_tracks collection for manual review or future indexing.
  - If the track name itself contains a psychometric word, show the word card
    for that word (rare but a nice touch).
  - This state is not treated as an error — it is a known, handled state.

─────────────────────────────────────────────────────────────────────────────
CASE 6: SHUFFLE MODE — NO PRE-FETCH POSSIBLE
─────────────────────────────────────────────────────────────────────────────
Scenario:
  User plays a playlist on shuffle. The next song is unknown, so pre-fetching
  is not possible. Every song change is a potential cache miss.

Strategy — Optimistic Immediate Display:
  Pre-fetch is disabled in shuffle mode (detected when Spotify shuffle_state
  is true in the polling response).
  On every song change:
    - Immediately check cache (covers ~95% of popular songs).
    - If cache hit: normal fast load.
    - If cache miss: progressive display strategy from Case 1.
  The user experience is identical to Case 1 — the only difference is that
  pre-fetch never runs, so cache misses are slightly more likely.
  No special UI treatment needed; shuffle mode is handled transparently.

─────────────────────────────────────────────────────────────────────────────
CASE 7: MANY CONSECUTIVE CACHE MISSES (new album)
─────────────────────────────────────────────────────────────────────────────
Scenario:
  User listens to an entire new album. All 12 songs are cache misses.
  Each triggers a Claude API call. This creates cost spikes and potential
  API rate limit issues.

Strategy — Backend Queue + Soft Rate Limit:
  Backend enforces: max 1 concurrent Claude translation request per user.
  If a second request arrives while one is in flight:
    - Queue it (not reject it).
    - Return English-only lyrics immediately so the app is never blank.
    - Process translation as soon as the previous request completes.
    - Stream translated lines into the UI as they arrive.

  Additionally, if 5+ cache misses are detected in a 10-minute window for
  the same user, log this as a "new album session" event in Firebase Analytics
  for cost monitoring — but do not degrade the user experience.

  Cache population benefit: after the first user listens to a new album,
  all subsequent users get cache hits. The cost of cache-warming is a
  one-time expense shared across the entire user base.

─────────────────────────────────────────────────────────────────────────────
CASE 8: RAPID PAUSE / RESUME
─────────────────────────────────────────────────────────────────────────────
Scenario:
  User pauses and resumes quickly (e.g. answering a question, then resuming).
  The polling interval (1,000ms) may miss a short pause entirely. Relying
  on the is_playing flag alone produces unreliable behavior.

Strategy — Position Delta Detection:
  Do not rely solely on the is_playing flag from Spotify.
  Instead, compare position_ms between two consecutive polls:
    - If position_ms did NOT advance by ~1,000ms between polls → paused.
    - If position_ms advanced normally → playing.
    - If position_ms jumped forward significantly → user scrubbed forward.
    - If position_ms decreased → user scrubbed backward or restarted.

  On detected pause: freeze highlight, show subtle pause indicator.
  On detected resume: resume sync loop from current position_ms.
  On detected scrub: jump to correct line (same as Case 3 logic).

  This position-delta approach is robust against polling timing jitter and
  does not depend on the is_playing flag being accurate.

─────────────────────────────────────────────────────────────────────────────
CASE 9: SONG ON REPEAT (LOOP)
─────────────────────────────────────────────────────────────────────────────
Scenario:
  User has a single song on repeat. When the song loops, position_ms drops
  back to near 0 while track ID stays the same. This must not be treated as
  a new song (which would trigger a redundant reload) nor should it cause
  the highlight to freeze at the last line.

Strategy — Loop Detection:
  Store the current track's duration_ms from the Spotify polling response.
  On each poll, compare the new position_ms to the previous one:
    - If new position_ms < 3,000ms AND previous position_ms > (duration_ms - 5,000ms)
      AND track ID has NOT changed → this is a loop, not a new song.

  On loop detection:
    - Reset the active line index to 0.
    - Resume the sync loop from the beginning.
    - Do NOT re-fetch lyrics or translations (already in memory).
    - Do NOT increment any counters that track "new song" events.

  This produces seamless repeat behavior with zero extra API calls.


────────────────────────────────────────────────────────────────────────────────
6. UX & DESIGN PRINCIPLES
────────────────────────────────────────────────────────────────────────────────

6.1 CORE UX PRINCIPLES
──────────────────────
1. Zero behavior change
   The user continues using Spotify exactly as they always have. LyricLearn
   runs alongside it. There is no "instead of" — only "in addition to."

2. Passive learning first
   The primary learning loop requires zero active engagement. Words are
   highlighted automatically. The user can completely ignore the app and still
   benefit from passive exposure.

3. Tap for depth, never forced
   Full definitions, synonyms, and examples are available on tap. They are
   never shown unsolicited. The UI respects the user's attention.

4. Dark-first design
   The app is used primarily during music listening — commutes, gym, evenings.
   Dark mode is the default and primary design target.

5. Hebrew-native
   All UI chrome, labels, definitions, and navigation are in Hebrew. English
   appears only as content (song lyrics, word headings). This is not an English
   learning app that happens to have Hebrew — it's a Hebrew app that teaches
   English in context.

6. Delight without distraction
   Animations and transitions should feel smooth and musical, not gamified or
   loud. The design serves the music, not the other way around.


6.2 SCREEN STRUCTURE
────────────────────
Tab 1 — NOW PLAYING (default)
  - Album art + track name + artist + Spotify badge
  - Scrolling synced lyrics (active line centered, past/future dimmed)
  - Word card persistent at bottom (slides in when psychometric word found)
  - Progress bar synchronized with Spotify playback
  - Idle state when no song is playing

Tab 2 — DICTIONARY
  - Full list of psychometric words the user has encountered
  - Filterable by: all / learned / not yet learned / high frequency
  - Search bar
  - Each word row: English, Hebrew short def, frequency badge, encounter count
  - Tap → word detail view

Tab 3 — PROGRESS
  - Streak counter (prominent, top of screen)
  - Stats grid: words learned, songs, artists, total time
  - Weekly word chart (bar chart, Mon–Sun)
  - Recent words list with song context


6.3 OUT OF SCOPE — VERSION 1
─────────────────────────────
  - In-app music playback controls
  - Social features or word sharing
  - Custom word lists or user-added words
  - Apple Music integration (Phase 3)
  - Web app version
  - Multiple language support (Hebrew only for v1)
  - Quiz or test mode (Phase 2+)


────────────────────────────────────────────────────────────────────────────────
7. MONETIZATION STRATEGY
────────────────────────────────────────────────────────────────────────────────

7.1 MODEL: FREEMIUM
───────────────────
Tier              | Features
──────────────────|─────────────────────────────────────────────────────────────
Free              | Full lyric sync + Hebrew translation
                  | Up to 5 psychometric word highlights per song
                  | Basic streak counter
                  | Limited word history (last 50 words)
──────────────────|─────────────────────────────────────────────────────────────
Premium           | Unlimited word highlights
                  | Full word cards with phonetics, synonyms, examples
                  | Complete word history and dictionary
                  | Spaced repetition flashcard review (Phase 2)
                  | Offline mode — cached lyrics & translations (Phase 3)
                  | Weekly progress report notifications
                  | Priority support


7.2 PRICING (PROPOSED)
──────────────────────
  - Free:            NIS 0
  - Monthly Premium: NIS 19.90 / month
  - Annual Premium:  NIS 99 / year  (~NIS 8.25/month, ~58% discount)

Primary conversion target: annual plan. Positioning: "Less than a single
Kidum session — for a year of passive learning."


7.3 COST & PROFITABILITY ANALYSIS
──────────────────────────────────
Assumptions: premium user, ~10 songs/day, ~30 days/month.

Cost Item                          | Monthly Cost / User | Notes
───────────────────────────────────|─────────────────────|──────────────────────
Claude Haiku API (translation)     | ~$0.001             | After 95% cache hit
                                   |                     | rate. Cold cost
                                   |                     | (0% cache): ~$0.03
Musixmatch API                     | ~$0.20              | Commercial tier est.
Firebase (Firestore + Functions)   | ~$0.10              | Scales with DAU
Spotify API                        | $0.00               | Free
───────────────────────────────────|─────────────────────|──────────────────────
Total COGS                         | ~$0.30              | Conservative
───────────────────────────────────|─────────────────────|──────────────────────
Revenue (annual plan, annualized)  | ~$2.25              | NIS 99 ÷ 12 ÷ ~3.7
───────────────────────────────────|─────────────────────|──────────────────────
Gross Margin                       | ~$1.95  (~87%)      | Healthy SaaS margin

Key insight: The global translation cache is the most important cost lever.
Popular songs are shared across thousands of users, so the marginal AI cost
per active user approaches ~$0 as the catalog grows. After 6 months, the
effective AI cost per user is estimated at under $0.005/month.

Break-even estimate: ~500 premium subscribers cover basic infrastructure.
Meaningful profitability begins around 2,000 premium subscribers.


────────────────────────────────────────────────────────────────────────────────
8. DEVELOPMENT ROADMAP
────────────────────────────────────────────────────────────────────────────────

PHASE 1 — MVP (Months 1–2)
  Goal: Internal beta on TestFlight / Google Play Internal Track
  Deliverables:
    - Spotify OAuth integration + polling loop
    - Musixmatch lyrics fetch + LRC parser
    - Claude Haiku translation pipeline + Firestore cache
    - Synchronized lyrics UI with active line highlighting
    - Psychometric word database (1,200 words) + highlight logic
    - Word card (inline) + word detail modal
    - Basic progress tracking (streak, word count)
    - Onboarding flow (3 screens + Spotify connect)
    - Firebase Auth + Firestore data model
  Success criteria: 10 internal users complete 5+ sessions without critical bugs

PHASE 2 — PUBLIC LAUNCH (Months 3–4)
  Goal: App Store + Google Play public release
  Deliverables:
    - Dictionary tab (full word history, search, filter)
    - Spaced repetition flashcard review (basic SRS algorithm)
    - Push notifications (streak reminders, weekly summary)
    - App Store / Play Store assets, screenshots, description
    - Privacy policy + terms of service
    - Crash reporting (Sentry or Firebase Crashlytics)
    - Performance optimization (cold start, sync accuracy)
  Success criteria: 1,000 downloads in first 2 weeks, 4.0+ rating

PHASE 3 — MONETIZATION (Months 5–6)
  Goal: Revenue launch
  Deliverables:
    - Premium paywall (RevenueCat integration for in-app purchases)
    - Offline mode (cache lyrics + translations for saved songs)
    - Apple Music integration via MusicKit (iOS only, Swift native module)
    - A/B test: monthly vs. annual plan emphasis
    - Referral program ("Invite a friend, both get 2 weeks free")
  Success criteria: 300+ paying subscribers, positive unit economics

PHASE 4 — GROWTH (Month 7+)
  Goal: Retention and viral growth
  Deliverables:
    - Social sharing ("I just learned 'elusive' from The Weeknd 🎵")
    - Streak sharing / leaderboard (opt-in)
    - Advanced analytics dashboard (internal)
    - Word list partnerships (Kidum, Yael integration)
    - In-app quiz mode (test yourself on encountered words)


────────────────────────────────────────────────────────────────────────────────
9. RISKS & MITIGATIONS
────────────────────────────────────────────────────────────────────────────────

Risk                               | Severity | Mitigation
───────────────────────────────────|──────────|────────────────────────────────
Musixmatch API cost or             | HIGH     | Pre-negotiate pricing before
availability at scale              |          | launch. Cache all lyrics in
                                   |          | Firestore (never re-fetch for
                                   |          | same track). Evaluate Genius
                                   |          | API as fallback provider.
───────────────────────────────────|──────────|────────────────────────────────
Spotify free users cannot          | HIGH     | Verify API access during Phase
access Playback State API          |          | 1 testing. If blocked: show
                                   |          | clear messaging; offer Spotify
                                   |          | Premium trial link; consider
                                   |          | manual "what's playing" input
                                   |          | as fallback.
───────────────────────────────────|──────────|────────────────────────────────
Lyric sync accuracy issues         | MEDIUM   | Invest in sync algorithm during
(highlights out of time)           |          | Phase 1. Tune polling interval.
                                   |          | Allow ±500ms tolerance.
                                   |          | User testing with 5+ songs.
───────────────────────────────────|──────────|────────────────────────────────
Lyrics copyright liability         | MEDIUM   | Operate exclusively under
                                   |          | Musixmatch licensing terms.
                                   |          | Do not store full raw lyrics
                                   |          | permanently — only translated
                                   |          | pairs. Consult legal before
                                   |          | public launch.
───────────────────────────────────|──────────|────────────────────────────────
Low retention after initial        | MEDIUM   | Invest in streak mechanics from
novelty wears off                  |          | Day 1. Weekly progress reports.
                                   |          | Spaced repetition in Phase 2
                                   |          | increases stickiness.
───────────────────────────────────|──────────|────────────────────────────────
Psychometric word list             | LOW      | Validate word list with a
inaccuracy                         |          | psychometric tutor before
                                   |          | launch. Plan quarterly reviews.
                                   |          | Allow users to flag incorrect
                                   |          | definitions.
───────────────────────────────────|──────────|────────────────────────────────
Firebase cost scaling              | LOW      | Monitor Firestore read/write
unexpectedly                       |          | counts. Batch writes where
                                   |          | possible. Set billing alerts.


────────────────────────────────────────────────────────────────────────────────
10. OPEN QUESTIONS
────────────────────────────────────────────────────────────────────────────────

The following questions require decisions before or during Phase 1 development:

1. MUSIXMATCH API TIER
   What plan is required for our expected request volume? Is the free tier
   (2,000 calls/day) sufficient for beta testing with 20–50 internal users?
   What is the commercial tier cost and what are its rate limits?

2. SPOTIFY FREE VS. PREMIUM
   Does the Spotify Web API's /me/player endpoint work for free-tier Spotify
   users, or does it require a Premium account? This is critical — if Premium
   is required, a significant portion of our target market may be excluded.
   Needs to be tested in Phase 1 week 1.

3. GLOBAL TRANSLATION CACHE — LEGAL / OWNERSHIP
   Storing per-song translations in a global Firestore collection means all
   users share translations generated on another user's behalf. Are there any
   data ownership concerns with this model? Does Musixmatch's license permit
   derivative works (translations) to be stored?

4. PSYCHOMETRIC WORD LIST SOURCE
   Build in-house (time-intensive but fully controlled) vs. license from an
   existing provider such as Kidum or Yael (faster, pre-validated, but may
   have licensing restrictions or cost). Which path is better for Phase 1?

5. MINIMUM VIABLE SONG COVERAGE
   What percentage of a typical Israeli user's Spotify listening must be
   covered by Musixmatch for the product to feel useful? Target hypothesis:
   80% of top-200 streamed songs in Israel. Needs validation before launch.

6. REACT NATIVE vs. EXPO
   Should we use bare React Native or Expo managed workflow? Expo is faster
   for vibe coding but may limit native module access (needed for MusicKit
   in Phase 3). Recommendation: start with Expo, eject if needed for Phase 3.


────────────────────────────────────────────────────────────────────────────────
11. SECURITY REQUIREMENTS
────────────────────────────────────────────────────────────────────────────────

11.1 API KEY MANAGEMENT
───────────────────────
All third-party API keys (Spotify Client Secret, Musixmatch API key, Anthropic
API key) MUST be stored exclusively on the backend. They must never appear in:
  - The React Native / Expo app bundle
  - Client-side JavaScript or TypeScript files
  - Git repositories (including private ones)
  - App Store or Play Store builds

Implementation:
  - Store all secrets in environment variables on the backend server
  - Use Firebase Cloud Functions as the proxy layer — the app calls your
    own backend endpoints, never third-party APIs directly
  - Use a secrets manager (e.g., Google Cloud Secret Manager, which integrates
    natively with Firebase) for production key storage
  - Rotate all API keys immediately if any accidental exposure is detected
  - Add .env to .gitignore from day one; use .env.example with placeholder
    values for documentation


11.2 AUTHENTICATION & SESSION SECURITY
────────────────────────────────────────
  - Firebase Auth handles all user session management (do not implement
    custom session logic)
  - Spotify OAuth tokens (access token + refresh token) are stored in
    Firestore under the authenticated user's document — never in local storage,
    AsyncStorage, or device logs
  - Spotify access tokens expire after 1 hour; the backend auto-refreshes
    using the stored refresh token — the client never holds the refresh token
  - Firebase Auth ID tokens are short-lived (1 hour); Firebase SDK auto-renews
    them silently
  - All backend API endpoints must verify the Firebase ID token sent in the
    Authorization header before processing any request:
      Authorization: Bearer <firebase_id_token>
  - Reject any request with a missing, expired, or invalid token with HTTP 401


11.3 FIRESTORE SECURITY RULES
──────────────────────────────
Firestore security rules must enforce the following at the database level
(not just in application code):

  users/{uid}
    - Read: authenticated user can only read their own document (uid == request.auth.uid)
    - Write: same restriction; backend service account can write via Admin SDK

  users/{uid}/wordHistory/{wordId}
    - Read/Write: only the owning user

  translations/{trackId}
    - Read: any authenticated user (global cache, readable by all)
    - Write: only backend service account (via Admin SDK) — never from client

  psychometric_words/{wordId}
    - Read: any authenticated user
    - Write: no client writes — managed only via Admin SDK or Firebase console

  Default rule: deny all reads and writes not explicitly permitted above.

Example rule structure:
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /users/{uid}/{document=**} {
        allow read, write: if request.auth != null && request.auth.uid == uid;
      }
      match /translations/{trackId} {
        allow read: if request.auth != null;
        allow write: if false; // backend only via Admin SDK
      }
      match /psychometric_words/{wordId} {
        allow read: if request.auth != null;
        allow write: if false;
      }
    }
  }


11.4 TRANSPORT SECURITY
────────────────────────
  - All communication between app and backend must use HTTPS — no HTTP allowed
  - All communication between backend and third-party APIs (Spotify,
    Musixmatch, Anthropic) uses HTTPS — enforced by those providers
  - Firebase Hosting and Cloud Functions serve over HTTPS by default
  - Certificate pinning: not required for v1, but evaluate for Phase 2 if
    the app handles any payment or sensitive personal data


11.5 DATA MINIMIZATION & PRIVACY
──────────────────────────────────
  - Only collect data that is strictly necessary for app functionality
  - Do NOT collect: real name, phone number, email (unless user provides for
    support), location, contacts, or any data unrelated to music + vocabulary
  - Spotify OAuth scope must be limited to the minimum required:
      · user-read-playback-state  (detect current track)
      · user-read-currently-playing  (fallback)
      · Do NOT request playlist access, library access, or follow data
  - User word history is private to each user — never shared, aggregated for
    ad targeting, or sold to third parties
  - Raw lyrics are never permanently stored — only translated line pairs
    (English + Hebrew) are cached, and only under Musixmatch license terms
  - Comply with Israeli Privacy Protection Law (PPL) and GDPR (for any EU
    users who may use the app)
  - Publish a clear, plain-language privacy policy before public launch
    (required by App Store and Google Play)


11.6 INPUT VALIDATION & INJECTION PREVENTION
──────────────────────────────────────────────
  - All data written to Firestore from the backend must be validated and
    sanitized before storage (e.g., track IDs should match expected format)
  - Claude Haiku API calls use a fixed system prompt — user-provided data
    (lyric lines) is passed as content, not injected into the system prompt,
    to prevent prompt injection attacks
  - Backend endpoints must validate all incoming parameters:
      · Track IDs: alphanumeric + hyphens only, max 64 chars
      · User IDs: must match Firebase UID format
      · Reject and log any request with unexpected parameter shapes
  - Never pass raw Spotify or Musixmatch data directly to the Claude API
    without first stripping any embedded HTML or script tags


11.7 DEPENDENCY SECURITY
─────────────────────────
  - Use a lockfile (package-lock.json or yarn.lock) and commit it to version
    control to ensure reproducible builds
  - Run npm audit (or yarn audit) before each production deployment
  - Keep all dependencies up to date; prioritize security patches
  - Do not install packages with no maintenance history or very low download
    counts without careful review
  - Use Expo's managed workflow dependency updates (expo upgrade) rather than
    manually bumping native dependencies


11.8 BACKEND SECURITY
──────────────────────
  - Cloud Functions should run with the minimum required IAM permissions
    (principle of least privilege)
  - Enable Firebase App Check to ensure only your legitimate app binary can
    call your Cloud Functions — this prevents API abuse from scrapers or
    third-party clients spoofing your app
  - Rate-limit all backend endpoints per authenticated user:
      · /api/translate: max 20 calls/minute per user (cache should prevent
        most calls — high rate indicates abuse)
      · /api/spotify/refresh: max 5 calls/minute per user
  - Log all backend errors to Firebase Crashlytics or a logging service;
    never log raw API keys, tokens, or personal data in logs
  - Set up billing alerts on Firebase and Google Cloud to detect unexpected
    usage spikes (which may indicate abuse or a runaway bug)


11.9 INCIDENT RESPONSE
───────────────────────
  - Designate a security contact email before public launch
  - If a Spotify or Musixmatch token is exposed: revoke immediately via the
    respective developer dashboard and rotate all related secrets
  - If Firestore rules are found to be misconfigured: disable writes via
    Firebase console immediately, audit affected data, notify users if
    their data may have been accessed
  - Maintain a private changelog of any security incidents, even minor ones,
    for internal review


────────────────────────────────────────────────────────────────────────────────
END OF DOCUMENT
LyricLearn PRD v1.3 — Confidential — April 2026
────────────────────────────────────────────────────────────────────────────────