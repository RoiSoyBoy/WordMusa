import { Linking, Platform } from 'react-native';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const POLL_INTERVAL_MS = 1000;

async function callSpotifyDirect(action, positionMs, token) {
  const map = {
    play:     ['https://api.spotify.com/v1/me/player/play',     'PUT'],
    pause:    ['https://api.spotify.com/v1/me/player/pause',    'PUT'],
    next:     ['https://api.spotify.com/v1/me/player/next',     'POST'],
    previous: ['https://api.spotify.com/v1/me/player/previous', 'POST'],
    seek:     [`https://api.spotify.com/v1/me/player/seek?position_ms=${positionMs}`, 'PUT'],
  };
  const [url, method] = map[action];
  const res = await fetch(url, { method, headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401) return 401;
  return res.status === 204 || res.ok;
}

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

  // Resolves true on success (then re-polls), false on a rejected request; throws on network error
  const control = async (action, positionMs) => {
    const directToken = spotifyTokenRef.current;
    if (directToken) {
      const result = await callSpotifyDirect(action, positionMs, directToken);
      if (result === true) { poll(); return true; }
      if (result === 401) spotifyTokenRef.current = null; // expired — fall through to backend
    }
    // Backend fallback: handles token refresh + covers first load before token arrives
    const token = await auth.currentUser.getIdToken();
    const body = { action };
    if (action === 'seek') body.position_ms = positionMs;
    const res = await fetch(`${BACKEND_URL}/spotifyControl`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) poll();
    return res.ok;
  };

  return {
    id: 'spotify',
    label: 'Spotify',
    controls: {
      play: () => control('play'),
      pause: () => control('pause'),
      next: () => control('next'),
      previous: () => control('previous'),
      seek: (positionMs) => control('seek', positionMs),
    },
    openApp: () => Linking.openURL(Platform.OS === 'web' ? 'https://open.spotify.com' : 'spotify://'),
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
