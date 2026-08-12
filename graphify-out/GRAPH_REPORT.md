# Graph Report - .  (2026-07-04)

## Corpus Check
- 152 files · ~416,427 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 518 nodes · 694 edges · 74 communities (31 shown, 43 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 35 edges (avg confidence: 0.82)
- Token cost: 452,055 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Widget & Word Tracking System|Widget & Word Tracking System]]
- [[_COMMUNITY_Word Cards & Review UI|Word Cards & Review UI]]
- [[_COMMUNITY_Frontend Dependencies (package.json)|Frontend Dependencies (package.json)]]
- [[_COMMUNITY_Expo App Config & Android Widget Plugin|Expo App Config & Android Widget Plugin]]
- [[_COMMUNITY_Lyrics Sync, Firebase Init & Progress Tracking|Lyrics Sync, Firebase Init & Progress Tracking]]
- [[_COMMUNITY_Backend Core (AuthRate-Limit) & Word Data Pipeline|Backend Core (Auth/Rate-Limit) & Word Data Pipeline]]
- [[_COMMUNITY_Now Playing Screen & Lyric Sync Loop|Now Playing Screen & Lyric Sync Loop]]
- [[_COMMUNITY_Playback Controls & Navigation|Playback Controls & Navigation]]
- [[_COMMUNITY_Backend Dependencies (package.json)|Backend Dependencies (package.json)]]
- [[_COMMUNITY_Onboarding & Spotify Auth Flow|Onboarding & Spotify Auth Flow]]
- [[_COMMUNITY_App Check & Web Deployment Hardening|App Check & Web Deployment Hardening]]
- [[_COMMUNITY_Translation & Lyrics Caching (Firestore)|Translation & Lyrics Caching (Firestore)]]
- [[_COMMUNITY_PDF Word Cleanup Script (fix_parens_and_junk)|PDF Word Cleanup Script (fix_parens_and_junk)]]
- [[_COMMUNITY_Word Enrichment Pipeline (OpenAI)|Word Enrichment Pipeline (OpenAI)]]
- [[_COMMUNITY_Android MainActivity|Android MainActivity]]
- [[_COMMUNITY_MCP Server Configuration|MCP Server Configuration]]
- [[_COMMUNITY_Android MainApplication|Android MainApplication]]
- [[_COMMUNITY_Words JSON Fix Script|Words JSON Fix Script]]
- [[_COMMUNITY_Font Injection & Spotify Shortcut Button|Font Injection & Spotify Shortcut Button]]
- [[_COMMUNITY_Firestore Word Seeding Script|Firestore Word Seeding Script]]
- [[_COMMUNITY_EAS Build Config|EAS Build Config]]
- [[_COMMUNITY_Flashcard Song Context & Optimistic UI|Flashcard Song Context & Optimistic UI]]
- [[_COMMUNITY_PDF Word Extraction Script|PDF Word Extraction Script]]
- [[_COMMUNITY_Word Extraction Script (Markdown Source)|Word Extraction Script (Markdown Source)]]
- [[_COMMUNITY_Core Project Docs & Firestore Security Rules|Core Project Docs & Firestore Security Rules]]
- [[_COMMUNITY_Metro Bundler Config|Metro Bundler Config]]
- [[_COMMUNITY_Client Bundle Generator|Client Bundle Generator]]
- [[_COMMUNITY_API Key Leak Incident & Rotation|API Key Leak Incident & Rotation]]
- [[_COMMUNITY_Design System Spec|Design System Spec]]
- [[_COMMUNITY_Firestore Data Model Spec|Firestore Data Model Spec]]
- [[_COMMUNITY_Lyric Sync Loop Spec|Lyric Sync Loop Spec]]
- [[_COMMUNITY_Translation Cache Spec|Translation Cache Spec]]
- [[_COMMUNITY_Expo Dev Folder Readme (frontend)|Expo Dev Folder Readme (frontend)]]
- [[_COMMUNITY_Incident Response Plan|Incident Response Plan]]
- [[_COMMUNITY_Endpoint Auth Pattern Spec|Endpoint Auth Pattern Spec]]
- [[_COMMUNITY_Env File Rules (CRLFquotes)|Env File Rules (CRLF/quotes)]]
- [[_COMMUNITY_Firebase Init Pattern Spec|Firebase Init Pattern Spec]]
- [[_COMMUNITY_Hard Rules (CLAUDE.md)|Hard Rules (CLAUDE.md)]]
- [[_COMMUNITY_Session Retro Process|Session Retro Process]]
- [[_COMMUNITY_Streak Logic Spec|Streak Logic Spec]]
- [[_COMMUNITY_Root Expo Readme|Root Expo Readme]]
- [[_COMMUNITY_README Backend Structure|README: Backend Structure]]
- [[_COMMUNITY_README Frontend Structure|README: Frontend Structure]]
- [[_COMMUNITY_PRD API Risk Assessment|PRD: API Risk Assessment]]
- [[_COMMUNITY_PRD AuthSession Security|PRD: Auth/Session Security]]
- [[_COMMUNITY_PRD Backend Security|PRD: Backend Security]]
- [[_COMMUNITY_PRD Data Minimization & Privacy|PRD: Data Minimization & Privacy]]
- [[_COMMUNITY_PRD Dependency Security|PRD: Dependency Security]]
- [[_COMMUNITY_PRD Development Roadmap|PRD: Development Roadmap]]
- [[_COMMUNITY_PRD Edge Case App Opened Mid-Song|PRD Edge Case: App Opened Mid-Song]]
- [[_COMMUNITY_PRD Edge Case Cache Miss on New Album|PRD Edge Case: Cache Miss on New Album]]
- [[_COMMUNITY_PRD Edge Case Loading Delay|PRD Edge Case: Loading Delay]]
- [[_COMMUNITY_PRD Edge Case Network Dropout|PRD Edge Case: Network Dropout]]
- [[_COMMUNITY_PRD Edge Case Shuffle Mode|PRD Edge Case: Shuffle Mode]]
- [[_COMMUNITY_PRD Edge Case Skip Song|PRD Edge Case: Skip Song]]
- [[_COMMUNITY_PRD Edge Case Song Not Found|PRD Edge Case: Song Not Found]]
- [[_COMMUNITY_PRD Firestore Security Rules|PRD: Firestore Security Rules]]
- [[_COMMUNITY_PRD GPT Translation Prompt|PRD: GPT Translation Prompt]]
- [[_COMMUNITY_PRD Hebrew Translation System|PRD: Hebrew Translation System]]
- [[_COMMUNITY_PRD Input Validation|PRD: Input Validation]]
- [[_COMMUNITY_PRD Monetization Strategy|PRD: Monetization Strategy]]
- [[_COMMUNITY_PRD Open Questions|PRD: Open Questions]]
- [[_COMMUNITY_PRD Performance Targets|PRD: Performance Targets]]
- [[_COMMUNITY_PRD Persona (Roi)|PRD: Persona (Roi)]]
- [[_COMMUNITY_PRD Progress & Gamification|PRD: Progress & Gamification]]
- [[_COMMUNITY_PRD Psychometric Vocabulary System|PRD: Psychometric Vocabulary System]]
- [[_COMMUNITY_PRD Risks & Mitigations|PRD: Risks & Mitigations]]
- [[_COMMUNITY_PRD Security Requirements|PRD: Security Requirements]]
- [[_COMMUNITY_PRD Transport Security|PRD: Transport Security]]
- [[_COMMUNITY_PRD Word Detail View|PRD: Word Detail View]]

## God Nodes (most connected - your core abstractions)
1. `auth` - 15 edges
2. `expo` - 14 edges
3. `useWordStore` - 13 edges
4. `theme` - 12 edges
5. `db` - 8 edges
6. `useWordTracking()` - 8 edges
7. `DictionaryScreen()` - 8 edges
8. `readWidgetWord()` - 8 edges
9. `Retro: Step 2 Complete App Features` - 8 edges
10. `Retro: Web Deployment to psycholyrics.web.app` - 8 edges

## Surprising Connections (you probably didn't know these)
- `Spotify Polling (1000ms) + Loop/Pause Detection` --semantically_similar_to--> `Spotify Integration (PRD 4.2.1)`  [INFERRED] [semantically similar]
  CLAUDE.md → .taskmaster/docs/prd.md
- `Lyric Sync Loop (200ms)` --semantically_similar_to--> `Synchronized Lyrics Display (PRD 4.2.2)`  [INFERRED] [semantically similar]
  CLAUDE.md → .taskmaster/docs/prd.md
- `Retro: Onboarding Redesign + App Rename` --semantically_similar_to--> `Onboarding Flow (PRD 4.2.7)`  [INFERRED] [semantically similar]
  docs/retros/2026-05-20-onboarding-redesign.md → .taskmaster/docs/prd.md
- `Word 'Learned' Definition (CLAUDE.md)` --semantically_similar_to--> `Definition of Word Learned`  [INFERRED] [semantically similar]
  CLAUDE.md → .taskmaster/docs/prd.md
- `Firestore Data Model (CLAUDE.md)` --semantically_similar_to--> `Firestore Data Model (PRD 5.2)`  [INFERRED] [semantically similar]
  CLAUDE.md → .taskmaster/docs/prd.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Spotify UI Redesign — 4-Session Arc** — docs_retros_2026_05_18_spotify_ui_session1, docs_retros_2026_05_18_spotify_ui_session2, docs_retros_2026_05_18_spotify_ui_session3, docs_retros_2026_05_18_spotify_ui_session4, frontend_src_styles_theme [EXTRACTED 0.90]
- **Global Firestore Cache System (Lyrics, Translations, Word Translations)** — firestore_lyrics_cache_collection, firestore_translations_collection, firestore_word_translations_collection, backend_index_js_lyricsfetch, backend_index_js_translatelyrics, backend_index_js_translateword [EXTRACTED 0.90]
- **Production Deployment Hardening (App Check, CORS, Stale Build, Word Encounter Bugs)** — docs_retros_2026_05_24_web_deployment, docs_retros_2026_05_28_bug_fixes, docs_retros_2026_06_02_flashcard_filter, backend_index_js_verifyappcheck, docs_retros_2026_05_28_bug_recordwordencounter_never_called [INFERRED 0.85]
- **Home Screen Widget Feature Implementation Group** — frontend_src_utils_widgetwordselector, frontend_src_utils_widgetbridge, frontend_plugins_withandroidwidget, frontend_plugins_withioswidget, frontend_src_hooks_usewordtracking, frontend_src_components_worddetailmodal, frontend_src_screens_dictionaryscreen [EXTRACTED 0.90]
- **Recurring 'What to pick up next session' Cleanup Tasks (debug logs, GitHub PAT, database.rules.json)** — docs_retros_2026_06_09_flashcard_song_context, docs_retros_2026_06_09_lyric_tap_feedback, docs_retros_2026_06_09_lyrics_loading_performance, docs_retros_2026_06_09_optimistic_playback_controls, docs_retros_2026_06_09_spotify_shortcut_button, docs_retros_2026_06_09_translation_quality [INFERRED 0.85]
- **Phase 2 Session: Notifications + Song Words Tab Deliverables** — backend_index, frontend_src_hooks_usepushnotifications, frontend_src_navigation_appnavigator, frontend_src_screens_nowplayingscreen, frontend_src_components_songwordslist [EXTRACTED 0.90]

## Communities (74 total, 43 thin omitted)

### Community 0 - "Widget & Word Tracking System"
Cohesion: 0.07
Nodes (37): Word 'Learned' Definition (CLAUDE.md), App Rename LyricLearn to PsychoLyrics, Retro: Home Screen Widget Feature, djb2 Hash Daily Word Selection, Cross-Platform Widget Bridge Pattern, eas.json, app.json (Expo config), fs (+29 more)

### Community 1 - "Word Cards & Review UI"
Cohesion: 0.08
Nodes (30): CEFR A1-A2 Quality Gate Decision, flagged Field Reused for Focus Words Decision, Retro: Passive Lyrics + Focus Words System, Retro: Word Quality Filter & Vocabulary Expansion, Spotify Visual Redesign (theme.js Overhaul) Decision, Retro: Spotify UI Session 3 (Sheets & Cards), Retro: Spotify UI Session 4 (Dictionary, Progress, Review), Bug: SafeAreaView Padding Unreliable in Modal on iOS (+22 more)

### Community 2 - "Frontend Dependencies (package.json)"
Cohesion: 0.06
Nodes (35): expo-speech, dependencies, axios, expo, expo-auth-session, expo-crypto, expo-file-system, expo-font (+27 more)

### Community 3 - "Expo App Config & Android Widget Plugin"
Cohesion: 0.06
Nodes (29): backgroundColor, foregroundImage, adaptiveIcon, edgeToEdgeEnabled, package, expo, android, icon (+21 more)

### Community 4 - "Lyrics Sync, Firebase Init & Progress Tracking"
Cohesion: 0.11
Nodes (21): firebase, LyricsDisplay(), styles, app, auth, firebaseConfig, parseLRC(), useLyrics() (+13 more)

### Community 5 - "Backend Core (Auth/Rate-Limit) & Word Data Pipeline"
Cohesion: 0.08
Nodes (23): backend/.env, admin, checkRateLimit(), cors, db, { defineSecret }, { getFirestore, FieldValue, Timestamp }, { onRequest } (+15 more)

### Community 6 - "Now Playing Screen & Lyric Sync Loop"
Cohesion: 0.11
Nodes (24): LRC Parsing (lrcParser.js), Bug: TouchableOpacity Blocked Scroll+Tap, measureLayout Over onLayout Decision, Retro: Lyrics Screen UX & Scroll Overhaul, Bug: Apostrophe-only Lines Mistranslated, Passive Learning: No Auto-Highlight Decision, Bug: ImageManipulator Cannot Read Remote URLs, Retro: Phase 2 Notifications + Song Words Tab (+16 more)

### Community 7 - "Playback Controls & Navigation"
Cohesion: 0.11
Nodes (21): spotifyControl Cloud Function, Spotify Polling (1000ms) + Loop/Pause Detection, Retro: Playback Controls (Step 1), PlaybackControls Prop-Coupling Decision, Retro: Step 2 Complete App Features, Retro: Spotify UI Session 1 (Foundation), Retro: Spotify UI Session 2 (Now Playing + Controls), react (+13 more)

### Community 8 - "Backend Dependencies (package.json)"
Cohesion: 0.08
Nodes (23): author, dependencies, cors, dotenv, firebase-admin, firebase-functions, description, devDependencies (+15 more)

### Community 9 - "Onboarding & Spotify Auth Flow"
Cohesion: 0.13
Nodes (15): WordDetailModal Rendered at App Root Decision, Bug: No Safe Area Value Available Crash, Retro: Onboarding Redesign + App Rename, App(), App.js, OnboardingFlow(), SLIDES, styles (+7 more)

### Community 10 - "App Check & Web Deployment Hardening"
Cohesion: 0.14
Nodes (17): deploy-functions.ps1 script, firebase.json (emulator/hosting config), checkRateLimit function, verifyAppCheck function, Bug: GOOGLE_APPLICATION_CREDENTIALS Re-injection on Deploy, Bug: App Check reCAPTCHA 24h Throttle, App Check Bypass Decision, Retro: Web Deployment to psycholyrics.web.app (+9 more)

### Community 11 - "Translation & Lyrics Caching (Firestore)"
Cohesion: 0.14
Nodes (17): lyricsFetch Cloud Function, translateLyrics Cloud Function, translateWord Cloud Function, Bug: Translation Not Saved to Firestore, Bug: Wrong Lyric Context in Modal, Retro: Flag Unknown Word Feature, Lyric Sync Freeze — Root Cause Investigation, Bug: Translation Took 40s (onLayout storm) (+9 more)

### Community 12 - "PDF Word Cleanup Script (fix_parens_and_junk)"
Cohesion: 0.18
Nodes (8): frontendPath, fs, path, pdf, pdfPath, updated, words, wordsPath

### Community 13 - "Word Enrichment Pipeline (OpenAI)"
Cohesion: 0.36
Nodes (9): AsyncOpenAI, enrich_batch(), load_checkpoint(), load_existing_words(), main(), enrich_words.py — Enrich extracted words to full schema using GPT-4o-mini, then, run(), save_checkpoint() (+1 more)

### Community 14 - "Android MainActivity"
Cohesion: 0.20
Nodes (5): Bundle, MainActivity, ReactActivity, ReactActivityDelegate, String

### Community 15 - "MCP Server Configuration"
Cohesion: 0.24
Nodes (9): FIREBASE_PROJECT_ID, SERVICE_ACCOUNT_KEY_PATH, npx, context7, firebase, github, @gannonh/firebase-mcp, @modelcontextprotocol/server-github (+1 more)

### Community 16 - "Android MainApplication"
Cohesion: 0.22
Nodes (6): Application, Configuration, MainApplication, ReactApplication, ReactHost, ReactNativeHost

### Community 17 - "Words JSON Fix Script"
Cohesion: 0.22
Nodes (8): fs, manualFixes, path, pdf, pdfPath, updated, words, wordsPath

### Community 18 - "Font Injection & Spotify Shortcut Button"
Cohesion: 0.22
Nodes (8): Retro: Spotify Shortcut Button, Platform-Split Icon/Text Rendering Pattern, backendDist, distDir, fs, html, indexPath, path

### Community 19 - "Firestore Word Seeding Script"
Cohesion: 0.25
Nodes (6): admin, crypto, db, fs, path, { privateKey }

### Community 20 - "EAS Build Config"
Cohesion: 0.29
Nodes (6): projectId, expo, extra, owner, slug, eas

### Community 21 - "Flashcard Song Context & Optimistic UI"
Cohesion: 0.29
Nodes (7): backend/database.rules.json, Retro: Flashcard Song Context, Flashcard Song Context Display Feature, Retro: Lyric Tap Feedback + Flashcard Song Context, Lyric Line Tap Purple Overlay Feedback, Retro: Optimistic Playback Controls, Optimistic Play/Pause UI Pattern

### Community 22 - "PDF Word Extraction Script"
Cohesion: 0.29
Nodes (5): looks_like_category_header(), Extract words + unit numbers from ENG_DIC_CAMPUS PDF. Hebrew text is stored reve, Reverse a string to fix RTL extraction artifact., Category headers are Hebrew-only lines with dashes., reverse_hebrew()

### Community 23 - "Word Extraction Script (Markdown Source)"
Cohesion: 0.48
Nodes (6): extract_pairs(), fix_rtl(), is_skip(), main(), extract_words.py — Extract English/Hebrew word pairs from the Kempus PDF.  Usage, strip_checkboxes()

### Community 24 - "Core Project Docs & Firestore Security Rules"
Cohesion: 0.40
Nodes (6): firestore.rules, LyricLearn Project CLAUDE.md, Retro: Step 4 UI Polish, LyricLearn Top-level README, Emergency Firestore Lockdown Procedure, LyricLearn PRD v1.1

### Community 25 - "Metro Bundler Config"
Cohesion: 0.40
Nodes (4): config, { getDefaultConfig }, path, workspaceRoot

### Community 27 - "API Key Leak Incident & Rotation"
Cohesion: 0.50
Nodes (4): Protected Files List, Leaked Anthropic API Key (commit a2bc3860), Token Revocation Procedures (Spotify/Musixmatch/Anthropic), API Key Management (PRD 11.1)

## Knowledge Gaps
- **212 isolated node(s):** `@upstash/context7-mcp`, `@gannonh/firebase-mcp`, `SERVICE_ACCOUNT_KEY_PATH`, `FIREBASE_PROJECT_ID`, `@modelcontextprotocol/server-github` (+207 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **43 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Frontend Dependencies (package.json)` to `Lyrics Sync, Firebase Init & Progress Tracking`, `Playback Controls & Navigation`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **What connects `@upstash/context7-mcp`, `@gannonh/firebase-mcp`, `SERVICE_ACCOUNT_KEY_PATH` to the rest of the system?**
  _250 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Widget & Word Tracking System` be split into smaller, more focused modules?**
  _Cohesion score 0.06914893617021277 - nodes in this community are weakly interconnected._
- **Should `Word Cards & Review UI` be split into smaller, more focused modules?**
  _Cohesion score 0.07681365576102418 - nodes in this community are weakly interconnected._
- **Should `Frontend Dependencies (package.json)` be split into smaller, more focused modules?**
  _Cohesion score 0.05555555555555555 - nodes in this community are weakly interconnected._
- **Should `Expo App Config & Android Widget Plugin` be split into smaller, more focused modules?**
  _Cohesion score 0.06451612903225806 - nodes in this community are weakly interconnected._
- **Should `Lyrics Sync, Firebase Init & Progress Tracking` be split into smaller, more focused modules?**
  _Cohesion score 0.10967741935483871 - nodes in this community are weakly interconnected._