// Dev-only provider: a fake playback clock over real songs that have synced
// lyrics on LRCLIB, so lyric sync can be tested with no Spotify account or Apple
// hardware. No audio plays. IDs use letters/digits/dashes only — the backend's
// track ID check rejects anything else.
const TRACKS = [
  { track_id: 'mock-let-it-be', track_name: 'Let It Be', artist: 'The Beatles', duration_ms: 243000 },
  { track_id: 'mock-viva-la-vida', track_name: 'Viva La Vida', artist: 'Coldplay', duration_ms: 242000 },
];
const REPORT_INTERVAL_MS = 1000;

export function createMockProvider() {
  let setTrack = null;
  let intervalId = null;
  let trackIndex = 0;
  let playing = true;
  // Position is anchored at a wall-clock moment and advances from there while playing
  let anchorPositionMs = 0;
  let anchoredAt = Date.now();

  const track = () => TRACKS[trackIndex];
  const position = () => (playing ? anchorPositionMs + Date.now() - anchoredAt : anchorPositionMs);
  const anchor = (positionMs) => { anchorPositionMs = positionMs; anchoredAt = Date.now(); };

  const report = () => {
    // Loop at the end, like Spotify's repeat-one: same track ID, position drops to 0
    if (position() >= track().duration_ms) anchor(0);
    setTrack?.({ ...track(), album_art: null, position_ms: Math.round(position()), is_playing: playing });
  };

  const act = (fn) => async (...args) => { fn(...args); report(); return true; };

  return {
    id: 'mock',
    label: 'Mock',
    controls: {
      play: act(() => { anchor(position()); playing = true; }),
      pause: act(() => { anchor(position()); playing = false; }),
      seek: act((positionMs) => anchor(Math.max(0, Math.min(positionMs, track().duration_ms)))),
      next: act(() => { trackIndex = (trackIndex + 1) % TRACKS.length; anchor(0); }),
      previous: act(() => {
        if (position() < 3000) trackIndex = (trackIndex - 1 + TRACKS.length) % TRACKS.length;
        anchor(0);
      }),
    },
    start({ onTrack }) {
      setTrack = onTrack;
      report();
      intervalId = setInterval(report, REPORT_INTERVAL_MS);
      return () => {
        clearInterval(intervalId);
        setTrack = null;
      };
    },
    pollNow: report,
  };
}
