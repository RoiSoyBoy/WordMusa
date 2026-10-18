import { useState, useEffect, useRef } from 'react';
import { parseLRC, getActiveLyricIndex } from '../utils/lrcParser';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Shared position-estimate tuning; a provider can override any of these via
// provider.syncOptions (e.g. if its reported time drifts differently).
const DEFAULT_SYNC_OPTIONS = {
  // How much earlier LRC timestamps tend to mark a line vs. when it's actually sung.
  leadCompensationMs: 500,
  // Max time to extrapolate past the last successful poll before treating the
  // estimate as stale — bounds drift from missed polls / backgrounding.
  maxExtrapolationMs: 3000,
};

/**
 * Hook: useLyricSync
 *
 * Accepts the current track snapshot from the active now-playing provider:
 * { track_id, track_name, artist, duration_ms, position_ms, is_playing }
 * and optional syncOptions overriding DEFAULT_SYNC_OPTIONS.
 *
 * Returns:
 * {
 *   lines: [{ time_ms, text, translation }],  // merged lyrics + translations
 *   activeIndex: number,                        // currently active line index
 *   status: 'idle' | 'loading' | 'ready' | 'no_lyrics' | 'error'
 * }
 */
export function useLyricSync(currentTrack, syncOptions) {
  const [lines, setLines] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [status, setStatus] = useState('idle');
  const [translationsReady, setTranslationsReady] = useState(false);
  // Last lyric-loading problem, shown in the dev debug overlay (no console on the phone)
  const [lyricsError, setLyricsError] = useState(null);
  const currentTrackIdRef = useRef(null);
  const abortControllerRef = useRef(null);
  const syncIntervalRef = useRef(null);
  const positionRef = useRef(0);
  const lastPollTimeRef = useRef(Date.now());
  const isPlayingRef = useRef(false);
  const linesRef = useRef([]);
  // Read by the sync interval, so a provider switch applies without restarting it
  const syncOptionsRef = useRef(DEFAULT_SYNC_OPTIONS);
  syncOptionsRef.current = { ...DEFAULT_SYNC_OPTIONS, ...syncOptions };

  // Keep linesRef in sync so the interval always reads the latest lines
  useEffect(() => {
    linesRef.current = lines;
  }, [lines]);

  // Record poll snapshot — position + wall-clock time so interval can interpolate
  useEffect(() => {
    if (currentTrack?.position_ms != null) {
      positionRef.current = currentTrack.position_ms;
      lastPollTimeRef.current = Date.now();
      isPlayingRef.current = currentTrack.is_playing ?? true;
    }
  }, [currentTrack?.position_ms, currentTrack?.is_playing]);

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
    setTranslationsReady(false);
    setLyricsError(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    loadLyricsAndTranslation(currentTrack, controller.signal);

    return () => {
      controller.abort();
    };
  }, [currentTrack?.track_id]);

  // Sync loop: starts when lines first arrive, reads linesRef so it never
  // restarts on translation chunk updates (which would freeze the interval).
  const hasLines = lines.length > 0;
  useEffect(() => {
    if (!hasLines) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
      return;
    }

    syncIntervalRef.current = setInterval(() => {
      const { leadCompensationMs, maxExtrapolationMs } = syncOptionsRef.current;
      // Cap extrapolation: if a poll is missed (network hiccup, app backgrounded —
      // OS throttles JS timers) elapsed can otherwise grow unbounded, racing the
      // estimated position far past reality and locking the active line onto
      // whatever's near the end of the song until the next poll corrects it.
      const rawElapsed = isPlayingRef.current ? Date.now() - lastPollTimeRef.current : 0;
      const elapsed = Math.min(rawElapsed, maxExtrapolationMs);
      // LRC timestamps (crowd-sourced via LRCLIB) commonly mark a line slightly
      // before the vocal actually starts — compensate so the highlight doesn't
      // jump early.
      const interpolatedPosition = positionRef.current + elapsed - leadCompensationMs;
      const newIndex = getActiveLyricIndex(linesRef.current, interpolatedPosition);
      setActiveIndex(prev => prev !== newIndex ? newIndex : prev);
    }, 200);

    return () => {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    };
  }, [hasLines]);

  const getAuthToken = async () => {
    // Dev builds only: the Mock provider may run without a usable login — logged out,
    // or a stale emulator session whose token can't refresh (English lyrics, no translation)
    const anonymousOk = __DEV__ && syncOptionsRef.current.allowAnonymous;
    const user = auth.currentUser;
    if (!user) {
      if (anonymousOk) return null;
      throw new Error('Not authenticated');
    }
    try {
      return await user.getIdToken();
    } catch (err) {
      if (anonymousOk) return null;
      throw err;
    }
  };

  const loadLyricsAndTranslation = async (track, signal) => {
    try {
      const token = await getAuthToken();
      const durationSecs = Math.round(track.duration_ms / 1000);

      const cacheKey = `${track.track_name.toLowerCase().replace(/\s+/g, '_')}_${track.artist.toLowerCase().replace(/\s+/g, '_')}`;
      const lyricsParams = new URLSearchParams({ track_name: track.track_name, artist_name: track.artist });
      if (durationSecs > 0) lyricsParams.append('duration', durationSecs);

      // Fire everything in parallel immediately
      const translationCachePromise = getDoc(doc(db, 'translations', track.track_id)).catch(() => null);

      // LRCLIB starts immediately — no waiting for Firestore cache miss confirmation
      const lrclibAbort = new AbortController();
      const lrclibTimeout = setTimeout(() => lrclibAbort.abort(), 10000);
      signal.addEventListener('abort', () => lrclibAbort.abort());
      const lrclibFetchPromise = fetch(`https://lrclib.net/api/get?${lyricsParams}`, {
        headers: { 'User-Agent': 'LyricLearn/1.0' },
        signal: lrclibAbort.signal,
      }).catch(err => ({ _error: err }));

      // Firestore lyrics cache — LRCLIB is already running in parallel
      const t0 = Date.now();
      const lyricsCacheDoc = await Promise.race([
        getDoc(doc(db, 'lyrics_cache', cacheKey)).catch(() => null),
        new Promise(r => setTimeout(() => r(null), 2000)),
      ]);

      if (signal.aborted) { clearTimeout(lrclibTimeout); lrclibAbort.abort(); return; }

      let lyricsData;

      if (lyricsCacheDoc?.exists()) {
        // Cache hit — cancel the speculative LRCLIB fetch
        clearTimeout(lrclibTimeout);
        lrclibAbort.abort();
        lyricsData = lyricsCacheDoc.data().lyrics;
      } else {
        // Cache miss — LRCLIB fetch is already in flight, just await the result
        let rawData = null;
        let fetchedViaBackend = false;

        const t1 = Date.now();
        const lrclibResult = await lrclibFetchPromise;
        clearTimeout(lrclibTimeout);

        if (signal.aborted) return;

        if (lrclibResult?._error) {
          const err = lrclibResult._error;
          if (err.name === 'AbortError') {
            if (signal.aborted) return; // track changed
            console.warn('[LL] LRCLIB timed out — trying backend');
            setLyricsError('LRCLIB timed out (10s)');
          } else {
            console.warn(`[LL] LRCLIB CORS/network error, trying backend: ${err.message}`);
            setLyricsError(`LRCLIB: ${err.message}`);
          }
        } else {
          console.log(`[LL] LRCLIB direct: ${lrclibResult.status} (${Date.now()-t1}ms)`);
          if (lrclibResult.status === 404) { setStatus('no_lyrics'); return; }
          if (lrclibResult.ok) rawData = await lrclibResult.json();
          else setLyricsError(`LRCLIB HTTP ${lrclibResult.status}`);
        }

        if (signal.aborted) return;

        // Backend fallback — on timeout or CORS/network failure
        if (!rawData) {
          // No token (dev Mock without login): the backend would reject the request anyway
          if (!token) { setStatus('error'); return; }
          const t2 = Date.now();
          const backendRes = await fetch(
            `${BACKEND_URL}/lyricsFetch?${lyricsParams}`,
            { headers: { Authorization: `Bearer ${token}` }, signal }
          );
          if (signal.aborted) return;
          if (backendRes.status === 404) { setStatus('no_lyrics'); return; }
          if (!backendRes.ok) { setStatus('error'); return; }
          rawData = await backendRes.json();
          fetchedViaBackend = true;
        }

        lyricsData = { synced: rawData.syncedLyrics || rawData.synced || null, plain: rawData.plainLyrics || rawData.plain || null };

        if (!fetchedViaBackend) {
          setDoc(doc(db, 'lyrics_cache', cacheKey), {
            lyrics: lyricsData,
            track_name: track.track_name,
            artist_name: track.artist,
            cached_at: serverTimestamp(),
          }).catch(() => {});
        }
      }

      if (!lyricsData.synced) {
        setStatus('no_lyrics');
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

      // Step 4: Check if translation was already cached (Firestore read fired in parallel above).
      // By the time lyrics have loaded and parsed, the read has almost certainly resolved — 500ms cap.
      const englishLines = parsedLines.map(l => l.text);
      const translationCacheDoc = await Promise.race([
        translationCachePromise,
        new Promise(r => setTimeout(() => r(null), 500)),
      ]);
      if (translationCacheDoc?.exists()) {
        const cached = translationCacheDoc.data().translated_lyrics;
        if (Array.isArray(cached)) {
          setLines(parsedLines.map((l, i) => ({ ...l, translation: cached[i] || null })));
          setTranslationsReady(true);
          return;
        }
      }

      // Logged-out dev Mock session: translation needs auth, so stop at English
      if (!token) { setTranslationsReady(true); return; }

      // Step 5: Cache miss — fetch Hebrew translation via streaming SSE
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${BACKEND_URL}/translateLyrics`);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        
        let processedTextLength = 0;
        let buffer = '';
        let fullText = '';
        let translationsArray = null;
        let lastExtractedCount = 0;

        xhr.onreadystatechange = () => {
          if (signal.aborted) {
            xhr.abort();
            resolve();
            return;
          }

          if (xhr.readyState === 3 || xhr.readyState === 4) {
            if (xhr.status !== 200 && xhr.readyState === 4) {
              console.warn('[useLyricSync] Translation failed, status:', xhr.status);
              resolve();
              return;
            }

            const currentText = xhr.responseText;
            const newText = currentText.substring(processedTextLength);
            
            if (newText) {
              processedTextLength = currentText.length;
              buffer += newText;
              
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';
              
              for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                const dataStr = line.slice(6);
                if (dataStr === '[DONE]') break;

                try {
                  const event = JSON.parse(dataStr);

                  if (event.translated_lyrics) {
                    translationsArray = event.translated_lyrics;
                  } else if (event.text) {
                    fullText += event.text;
                    // Only re-extract when a quote arrives (≈ start/end of each translated line)
                    if (event.text.includes('"')) {
                      const matches = [...fullText.matchAll(/"([^"\\]*(\\.[^"\\]*)*)"/g)];
                      if (matches.length > lastExtractedCount) {
                        lastExtractedCount = matches.length;
                        const partialArray = matches.map(m => {
                          try { return JSON.parse(m[0]); } catch (e) { return ''; }
                        });
                        setLines(prevLines => prevLines.map((l, i) => ({
                          ...l,
                          translation: partialArray[i] || l.translation,
                        })));
                      }
                    }
                  } else if (event.error) {
                    console.warn('[useLyricSync] Stream error event:', event.error);
                  }
                } catch (e) {
                  // Incomplete chunk, ignore
                }
              }
              
              if (translationsArray && Array.isArray(translationsArray)) {
                setLines(prevLines => prevLines.map((l, i) => ({
                  ...l,
                  translation: translationsArray[i] || l.translation,
                })));
              }
            }
          }

          if (xhr.readyState === 4) {
            setTranslationsReady(true);
            if (!translationsArray && fullText) {
              try {
                const finalArray = JSON.parse(fullText);
                if (Array.isArray(finalArray)) {
                  setLines(prevLines => prevLines.map((l, i) => ({
                    ...l,
                    translation: finalArray[i] || l.translation,
                  })));
                }
              } catch (e) {
                console.warn('[useLyricSync] Final parse error (stream may have ended early):', e.message);
              }
            }
            resolve();
          }
        };

        xhr.onerror = () => {
          console.warn('[useLyricSync] Translation network error');
          resolve();
        };

        xhr.send(JSON.stringify({
          track_id: track.track_id,
          lyrics: englishLines,
          track_name: track.track_name,
          artist_name: track.artist,
        }));
        
        signal.addEventListener('abort', () => {
          xhr.abort();
          resolve();
        });
      });

    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('[useLyricSync] Unexpected error:', err.name, err.message, err);
      setLyricsError(prev => prev ? `${prev} → ${err.message}` : err.message);
      setStatus('error');
    }
  };

  return { lines, activeIndex, status, translationsReady, lyricsError };
}
