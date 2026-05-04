# LyricLearn

## Project Overview
LyricLearn is a mobile companion app that helps Israeli students preparing for the Psychometric Entrance Test (PET) learn English vocabulary in a natural, engaging way. It connects to the user's Spotify account, detects what song is currently playing, fetches time-synced lyrics, and renders them in real time with:
- Hebrew translation beneath each English line
- Psychometric vocabulary words highlighted in a distinct color
- A word card explaining the highlighted word

## Structure
The project is organized into two main parts:

### Frontend
- Located in the `frontend/` directory.
- Built with **React Native (Expo)** for cross-platform (iOS and Android) support.
- Contains the UI components for displaying lyrics (`LyricsDisplay.js`), word cards (`WordCard.js`, `WordDetailModal.js`), onboarding (`OnboardingFlow.js`), and Spotify authentication (`SpotifyAuth.js`).
- Uses Zustand for state management (`useWordStore.js`, `usePlayerStore.js`).
- Uses custom hooks for Spotify polling and lyrics synchronization (`useSpotifyPolling.js`, `useLyrics.js`).

### Backend
- Located in the `backend/` directory.
- Built with **Node.js** and **Firebase** (Firestore & Firebase Functions/Express).
- Manages Spotify tokens securely.
- Fetches lyrics from LRCLIB and handles Hebrew translations via the Anthropic Claude 3 Haiku API.
- Caches translations and stores the psychometric vocabulary database in Firestore to optimize performance and reduce API costs.
- Enforces strict security rules (`firestore.rules`).

## Goals
- Make every song a vocabulary lesson — without the student even noticing they're studying.
- Increase vocabulary retention through contextual exposure to English words in natural settings.
- Keep users engaged by utilizing their existing music listening habits on Spotify.

## Setup Instructions

### Prerequisites
- Node.js
- Firebase CLI
- Expo CLI
- Spotify Developer Account (for API credentials)
- Anthropic API Key (for Claude translations)

### Backend Setup
1. Navigate to the `backend/` directory.
2. Run `npm install` to install dependencies.
3. Set up your `.env` file based on `.env.example` with the necessary API keys.
4. Run `npm start` or deploy to Firebase.
5. You can seed the initial vocabulary by running `node seed_words.js`.

### Frontend Setup
1. Navigate to the `frontend/` directory.
2. Run `npm install` to install dependencies.
3. Start the Expo development server with `npx expo start`.
4. Use the Expo Go app on your mobile device or an emulator to view the app.
