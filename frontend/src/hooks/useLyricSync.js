import { useState, useEffect, useRef, useCallback } from 'react';
import { parseLRC, getActiveLyricIndex } from '../utils/lrcParser';
import { auth } from '../firebase';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL; 

/**
 * Hook: useLyricSync
 * 
 * Accepts the current track object from spotifyPlayer polling:
 * { track_id, track_name, artist, duration_ms, position_ms, is_playing }
 * 
 * Returns:
 * {
 *   lines: [{ time_ms, text, translation }],  // merged lyrics + translations
 *   activeIndex: number,                        // currently active line index
 *   status: 'idle' | 'loading' | 'ready' | 'no_lyrics' | 'error'
 * }
 */
export function useLyricSync(currentTrack) {
  const [lines, setLines] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [status, setStatus] = useState('idle');
  const currentTrackIdRef = useRef(null);
  const abortControllerRef = useRef(null);
  const syncIntervalRef = useRef(null);
  const positionRef = useRef(0);

  // Update position ref on every render so sync interval always has latest value
  useEffect(() => {
    if (currentTrack?.position_ms != null) {
      positionRef.current = currentTrack.position_ms;
    }
  }, [currentTrack?.position_ms]);

  // Main effect: fires when track changes
  useEffect(() => {
    if (!currentTrack?.track_name) return;
    if (currentTrack.track_id === currentTrackIdRef.current) return;

    // Cancel any in-flight request for previous track
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    currentTrackIdRef.current = currentTrack.track_id;
    setLines([]);
    setActiveIndex(-1);
    setStatus('loading');

    const controller = new AbortController();
    abortControllerRef.current = controller;

    loadLyricsAndTranslation(currentTrack, controller.signal);

    return () => {
      controller.abort();
    };
  }, [currentTrack?.track_id]);

  // Sync loop: runs every 200ms, updates activeIndex
  useEffect(() => {
    if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);

    if (lines.length === 0) return;

    syncIntervalRef.current = setInterval(() => {
      const newIndex = getActiveLyricIndex(lines, positionRef.current);
      setActiveIndex(prev => prev !== newIndex ? newIndex : prev);
    }, 200);

    return () => clearInterval(syncIntervalRef.current);
  }, [lines]);

  const getAuthToken = async () => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    return user.getIdToken();
  };

  const loadLyricsAndTranslation = async (track, signal) => {
    try {
      const token = await getAuthToken();
      const durationSecs = Math.round(track.duration_ms / 1000);

      // Step 1: Fetch lyrics from LRCLIB via backend
      const lyricsParams = new URLSearchParams({
        track_name: track.track_name,
        artist_name: track.artist,
        duration: durationSecs,
      });

      const lyricsRes = await fetch(
        `${BACKEND_URL}/lyricsFetch?${lyricsParams}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          signal,
        }
      );

      if (signal.aborted) return;

      if (lyricsRes.status === 404) {
        setStatus('no_lyrics');
        return;
      }

      if (!lyricsRes.ok) {
        setStatus('error');
        return;
      }

      const lyricsData = await lyricsRes.json();

      if (!lyricsData.synced) {
        // No synced lyrics — show plain text without sync
        if (lyricsData.plain) {
          const plainLines = lyricsData.plain
            .split('\n')
            .filter(l => l.trim())
            .map((text, i) => ({ time_ms: i * 3000, text, translation: null }));
          setLines(plainLines);
          setStatus('ready');
        } else {
          setStatus('no_lyrics');
        }
        return;
      }

      // Step 2: Parse LRC into timed lines
      const parsedLines = parseLRC(lyricsData.synced);
      if (parsedLines.length === 0) {
        setStatus('no_lyrics');
        return;
      }

      // Step 3: Show English immediately — user sees lyrics in sync before translation arrives
      setLines(parsedLines.map(l => ({ ...l, translation: null })));
      setStatus('ready');

      if (signal.aborted) return;

      // Step 4: Fetch Hebrew translation (streaming)
      const englishLines = parsedLines.map(l => l.text);
      const translateRes = await fetch(`${BACKEND_URL}/translateLyrics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          track_id: track.track_id,
          lyrics: englishLines,
        }),
        signal,
      });

      if (signal.aborted) return;

      if (!translateRes.ok) {
        // Translation failed — English-only is fine, stay in 'ready' state
        console.warn('Translation failed, showing English only');
        return;
      }

      // Step 5: Read SSE stream — merge translations into lines as they arrive
      const reader = translateRes.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let translationsArray = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done || signal.aborted) break;

        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const dataStr = line.slice(6);
          if (dataStr === '[DONE]') break;

          try {
            const event = JSON.parse(dataStr);

            // Cache hit — full translation array returned at once
            if (event.translated_lyrics) {
              translationsArray = event.translated_lyrics;
              break;
            }
          } catch (e) {
            // Incomplete chunk, ignore
          }
        }

        if (translationsArray) break;
      }

      if (signal.aborted) return;

      // Step 6: Merge translations into lines
      if (translationsArray && Array.isArray(translationsArray)) {
        setLines(parsedLines.map((l, i) => ({
          ...l,
          translation: translationsArray[i] || null,
        })));
      }

    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('useLyricSync error:', err);
      setStatus('error');
    }
  };

  return { lines, activeIndex, status };
}
