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

      // Step 4 & 5: Fetch Hebrew translation (streaming) using XMLHttpRequest
      const englishLines = parsedLines.map(l => l.text);
      
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
                    
                    // Progressive Regex parsing to extract completed strings safely
                    const matches = [...fullText.matchAll(/"([^"\\]*(\\.[^"\\]*)*)"/g)];
                    if (matches.length > 0) {
                      const partialArray = matches.map(m => {
                        try { return JSON.parse(m[0]); } catch(e) { return ""; }
                      });
                      
                      setLines(prevLines => prevLines.map((l, i) => ({
                        ...l,
                        translation: partialArray[i] || l.translation,
                      })));
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
        }));
        
        signal.addEventListener('abort', () => {
          xhr.abort();
          resolve();
        });
      });

    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('useLyricSync error:', err);
      setStatus('error');
    }
  };

  return { lines, activeIndex, status };
}
