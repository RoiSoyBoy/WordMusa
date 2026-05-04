import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import usePlayerStore from '../store/usePlayerStore';
import { auth } from '../firebase';

export default function useSpotifyPolling() {
  const setPlayerState = usePlayerStore((state) => state.setPlayerState);
  const previousPollRef = useRef(null);
  const abortControllerRef = useRef(null);
  const [appState, setAppState] = useState(AppState.currentState);

  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      setAppState(nextAppState);
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    let intervalId;

    const pollSpotify = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser || appState !== 'active') {
        return;
      }

      try {
        const idToken = await currentUser.getIdToken();
        

        // Abort previous request if still in flight
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        
        abortControllerRef.current = new AbortController();

        const functionUrl = process.env.EXPO_PUBLIC_SPOTIFY_PLAYER_URL 
          || `https://us-central1-${process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID}.cloudfunctions.net/spotifyPlayer`;        
        const response = await fetch(functionUrl, {
          headers: {
            'Authorization': `Bearer ${idToken}`,
          },
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error('Failed to fetch player state');
        }

        const data = await response.json();
        
        if (!data || !data.track_id) {
          // No track playing
          setPlayerState({ isPlaying: false });
          return;
        }

        const currentPoll = {
          trackId: data.track_id,
          trackName: data.track_name,
          artist: data.artist,
          albumArt: data.album_art,
          positionMs: data.position_ms,
          durationMs: data.duration_ms,
          isPlaying: data.is_playing,
          shuffleState: data.shuffle_state,
        };

        const previousPoll = previousPollRef.current;
        let isNewSong = false;
        let isScrubbing = false;
        let isLooping = false;
        let isPausedByDelta = false;

        if (previousPoll) {
          // NEW SONG
          if (currentPoll.trackId !== previousPoll.trackId) {
            isNewSong = true;
          } else {
            const positionDelta = currentPoll.positionMs - previousPoll.positionMs;
            
            // PAUSE detection via delta
            if (positionDelta >= 0 && positionDelta < 200) {
              isPausedByDelta = true;
            }

            // SCRUB FORWARD/BACKWARD
            if (Math.abs(positionDelta) > 3000) {
              // LOOP detection: position drops below 3000ms while track ID unchanged AND previous position within 5000ms of duration
              if (positionDelta < -3000 && previousPoll.durationMs - previousPoll.positionMs <= 5000) {
                isLooping = true;
              } else {
                isScrubbing = true;
              }
            }
          }
        } else {
          isNewSong = true; // Initial poll
        }

        previousPollRef.current = currentPoll;

        setPlayerState({
          ...currentPoll,
          isNewSong,
          isScrubbing,
          isLooping,
          isPausedByDelta,
          pollResponse: data,
        });

      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Spotify polling error:', error);
          // Simple network dropout detection: fetch fails or timeout
          setPlayerState({ networkOffline: true });
        }
      }
    };

    if (appState === 'active' && auth.currentUser) {
      pollSpotify(); // Initial call
      intervalId = setInterval(pollSpotify, 1000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [appState, setPlayerState]);
}
