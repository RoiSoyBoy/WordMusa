// Placeholder until a native iOS module (MPMusicPlayerController.systemMusicPlayer
// or MusicKit's SystemMusicPlayer, via an Expo dev build) can report the Music
// app's now-playing item and playback time. Never emits a track, has no controls.
const NOT_AVAILABLE = 'Apple Music provider not available yet (needs native iOS module)';

export function createAppleMusicProvider() {
  return {
    id: 'apple',
    label: 'Apple Music',
    available: false,
    start({ onTrack, onError }) {
      onTrack(null);
      onError?.(NOT_AVAILABLE);
      return () => {};
    },
    pollNow: () => {},
  };
}
