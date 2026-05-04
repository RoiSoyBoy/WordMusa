import { create } from 'zustand';

const usePlayerStore = create((set) => ({
  trackId: null,
  trackName: null,
  artist: null,
  albumArt: null,
  positionMs: 0,
  durationMs: 0,
  isPlaying: false,
  shuffleState: false,
  isNewSong: false,
  isScrubbing: false,
  isLooping: false,
  isPausedByDelta: false,
  pollResponse: null,
  
  // Lyrics & Network State
  lyrics: null, // Array of { time_ms, english, hebrew }
  isFetchingLyrics: false,
  isTranslating: false,
  lyricsError: null,
  networkOffline: false,

  setPlayerState: (stateUpdate) => set((state) => ({ ...state, ...stateUpdate })),
}));

export default usePlayerStore;
