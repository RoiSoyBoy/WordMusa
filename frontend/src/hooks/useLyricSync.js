import { useState, useEffect, useRef, useCallback } from 'react';
import { parseLRC, getActiveLyricIndex } from '../utils/lrcParser';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

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
  const [translationsReady, setTranslationsReady] = useState(false);
  const currentTrackIdRef = useRef(null);
  const abortControllerRef = useRef(null);
  const syncIntervalRef = useRef(null);
  const positionRef = useRef(0);
  const lastPollTimeRef = useRef(Date.now());
  const isPlayingRef = useRef(false);
  const linesRef = useRef([]);

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
      const elapsed = isPlayingRef.current ? Date.now() - lastPollTimeRef.current : 0;
      const interpolatedPosition = positionRef.current + elapsed;
      const newIndex = getActiveLyricIndex(linesRef.current, interpolatedPosition);
      setActiveIndex(prev => prev !== newIndex ? newIndex : prev);
    }, 200);

    return () => {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    };
  }, [hasLines]);

  const getAuthToken = async () => {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');
    return user.getIdToken();
  };

  const loadLyricsAndTranslation = async (track, signal) => {
    try {
      const token = await getAuthToken();
      const durationSecs = Math.round(track.duration_ms / 1000);

      // Fire translation cache check immediately — runs in parallel with lyricsFetch
      const translationCachePromise = getDoc(doc(db, 'translations', track.track_id))
        .catch(() => null);

      // Step 1: Fetch lyrics — check Firestore cache directly, then LRCLIB if needed.
      // Bypasses the lyricsFetch backend function to eliminate cold-start and auth overhead.
      const cacheKey = `${track.track_name.toLowerCase().replace(/\s+/g, '_')}_${track.artist.toLowerCase().replace(/\s+/g, '_')}`;
      const t0 = Date.now();
      const lyricsCacheDoc = await Promise.race([
        getDoc(doc(db, 'lyrics_cache', cacheKey)),
        new Promise(r => setTimeout(() => r(null), 3000)),
      ]);
      console.log(`[LL] Firestore cache: ${lyricsCacheDoc ? (lyricsCacheDoc.exists() ? 'HIT' : 'miss') : 'timeout'} (${Date.now()-t0}ms)`);

      if (signal.aborted) return;

      let lyricsData;
      if (lyricsCacheDoc?.exists()) {
        lyricsData = lyricsCacheDoc.data().lyrics;
      } else {
        const lyricsParams = new URLSearchParams({ track_name: track.track_name, artist_name: track.artist });
        if (durationSecs > 0) lyricsParams.append('duration', durationSecs);

        let fetchedViaBackend = false;
        let rawData = null;

        // Try direct LRCLIB first (15s timeout).
        // Only fall back to backend on CORS/network errors — not on timeout, since the
        // backend would just call LRCLIB again and compound the wait.
        let lrclibTimedOut = false;
        try {
          const lrclibAbort = new AbortController();
          const lrclibTimeout = setTimeout(() => lrclibAbort.abort(), 15000);
          signal.addEventListener('abort', () => lrclibAbort.abort());

          const t1 = Date.now();
          const lrclibRes = await fetch(`https://lrclib.net/api/get?${lyricsParams}`, {
            headers: { 'User-Agent': 'LyricLearn/1.0' },
            signal: lrclibAbort.signal,
          });
          clearTimeout(lrclibTimeout);
          console.log(`[LL] LRCLIB direct: ${lrclibRes.status} (${Date.now()-t1}ms)`);

          if (signal.aborted) return;
          if (lrclibRes.status === 404) { setStatus('no_lyrics'); return; }
          if (lrclibRes.ok) rawData = await lrclibRes.json();
        } catch (lrclibErr) {
          if (lrclibErr.name === 'AbortError') {
            console.warn(`[LL] LRCLIB timed out — no backend retry`);
            lrclibTimedOut = true;
          } else {
            console.warn(`[LL] LRCLIB CORS/network error, trying backend: ${lrclibErr.message}`);
          }
        }

        if (lrclibTimedOut) { setStatus('no_lyrics'); return; }

        // Backend fallback — only reached on CORS/network failure (e.g. Safari)
        if (!rawData) {
          if (signal.aborted) return;
          const t2 = Date.now();
          const backendRes = await fetch(
            `${BACKEND_URL}/lyricsFetch?${lyricsParams}`,
            { headers: { Authorization: `Bearer ${token}` }, signal }
          );
          console.log(`[LL] Backend lyricsFetch: ${backendRes.status} (${Date.now()-t2}ms)`);
          if (signal.aborted) return;
          if (backendRes.status === 404 || backendRes.status === 504) { setStatus('no_lyrics'); return; }
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
        // No synced lyrics — show plain text without sync
        if (lyricsData.plain) {
          const plainLines = lyricsData.plain
            .split('\n')
            .filter(l => l.trim())
            .map((text, i) => ({ time_ms: i * 3000, text, translation: null }));
          setLines(plainLines);
          setStatus('ready');
          setTranslationsReady(true);
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

      // Step 4: Check if translation was already cached (Firestore read fired in parallel above).
      // Use Promise.race with a 2s cap so a slow Firestore read doesn't delay starting the stream.
      const englishLines = parsedLines.map(l => l.text);
      const translationCacheDoc = await Promise.race([
        translationCachePromise,
        new Promise(r => setTimeout(() => r(null), 2000)),
      ]);
      if (translationCacheDoc?.exists()) {
        const cached = translationCacheDoc.data().translated_lyrics;
        if (Array.isArray(cached)) {
          console.log(`[useLyricSync] Translation cache hit (Firestore direct) for: ${track.track_name}`);
          setLines(parsedLines.map((l, i) => ({ ...l, translation: cached[i] || null })));
          setTranslationsReady(true);
          return;
        }
      }

      // Step 5: Cache miss — fetch Hebrew translation via streaming SSE
      console.log(`[useLyricSync] Requesting translation for: ${track.track_name} (${englishLines.length} lines)`);

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
                if (dataStr === '[DONE]') {
                  console.log('[useLyricSync] Stream [DONE] received');
                  break;
                }

                try {
                  const event = JSON.parse(dataStr);

                  if (event.translated_lyrics) {
                    console.log('[useLyricSync] Cache hit received');
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
                    console.error('[useLyricSync] Stream error event:', event.error);
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
            console.log('[useLyricSync] XHR complete. Final status:', xhr.status);
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
                console.log('[useLyricSync] Final parse error (could mean stream died early):', e.message);
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
      console.error('[LL] outer catch:', err.name, err.message, err);
      setStatus('error');
    }
  };

  return { lines, activeIndex, status, translationsReady };
}
