import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const POLL_INTERVAL_MS = 1000;

export function createSpotifyProvider() {
  let setTrack = null;
  let reportError = null;
  let intervalId = null;
  // Direct Spotify access token from the poll response — lets controls skip the backend hop
  const spotifyTokenRef = { current: null };

  const poll = async () => {
    const requestStartedAt = Date.now();
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      const res = await fetch(`${BACKEND_URL}/spotifyPlayer`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        signOut(auth).catch(() => {});
        return;
      }
      if (!res.ok) { reportError?.(`spotifyPlayer HTTP ${res.status}`); return; }
      const data = await res.json();
      reportError?.(null);
      if (data.spotify_access_token) spotifyTokenRef.current = data.spotify_access_token;
      if (!data.is_playing) {
        setTrack?.(prev => prev ? { ...prev, is_playing: false } : null);
        return;
      }
      // data.position_ms reflects playback position as of when Spotify answered our
      // backend, which is already `requestRoundTripMs` in the past by the time we
      // process it here — without this, lyrics/progress lag real audio by that amount.
      const requestRoundTripMs = Date.now() - requestStartedAt;
      const compensatedPositionMs = data.duration_ms
        ? Math.min(data.position_ms + requestRoundTripMs, data.duration_ms)
        : data.position_ms + requestRoundTripMs;
      setTrack?.(prev => {
        if (
          prev?.track_id === data.track_id &&
          prev.position_ms === compensatedPositionMs &&
          prev.is_playing === data.is_playing
        ) return prev;
        return { ...data, position_ms: compensatedPositionMs };
      });
    } catch (err) {
      console.warn('Spotify poll failed:', err.message);
      reportError?.(`Spotify poll failed: ${err.message}`);
    }
  };

  return {
    id: 'spotify',
    label: 'Spotify',
    spotifyTokenRef,
    start({ onTrack, onError }) {
      setTrack = onTrack;
      reportError = onError;
      poll();
      intervalId = setInterval(poll, POLL_INTERVAL_MS);
      return () => {
        clearInterval(intervalId);
        setTrack = null;
        reportError = null;
      };
    },
    pollNow: poll,
  };
}
