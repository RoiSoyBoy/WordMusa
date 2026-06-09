import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from './Icon';
import { auth } from '../firebase';
import { theme } from '../styles/theme';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

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

function formatMs(ms) {
  if (!ms || ms < 0) return '0:00';
  const totalSecs = Math.floor(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function PlaybackControls({ currentTrack, onPollNow, spotifyTokenRef }) {
  const [loadingAction, setLoadingAction] = useState(null);
  const [displayPositionMs, setDisplayPositionMs] = useState(0);
  const [dragDisplay, setDragDisplay] = useState(null);
  const [optimisticIsPlaying, setOptimisticIsPlaying] = useState(null);
  const progressBarRef = useRef(null);
  const barLayoutRef = useRef(null);
  const lastPollRef = useRef({ positionMs: 0, timestamp: Date.now(), isPlaying: false });

  useEffect(() => {
    if (!currentTrack) return;
    lastPollRef.current = {
      positionMs: currentTrack.position_ms,
      timestamp: Date.now(),
      isPlaying: currentTrack.is_playing,
    };
    setDisplayPositionMs(currentTrack.position_ms);
  }, [currentTrack?.position_ms, currentTrack?.track_id]);

  // Clear optimistic override when Spotify confirms the new play/pause state
  useEffect(() => {
    setOptimisticIsPlaying(null);
  }, [currentTrack?.is_playing, currentTrack?.track_id]);

  useEffect(() => {
    const interval = setInterval(() => {
      const { positionMs, timestamp, isPlaying } = lastPollRef.current;
      if (!isPlaying) return;
      const elapsed = Date.now() - timestamp;
      setDisplayPositionMs(Math.min(positionMs + elapsed, currentTrack?.duration_ms ?? 0));
    }, 200);
    return () => clearInterval(interval);
  }, [currentTrack?.duration_ms]);

  const handleControl = useCallback(async (action, positionMs) => {
    if (loadingAction) return;

    // Optimistic UI: flip play/pause instantly so user doesn't wait for API round-trip
    if (action === 'pause') {
      setOptimisticIsPlaying(false);
      lastPollRef.current = { ...lastPollRef.current, isPlaying: false };
    } else if (action === 'play') {
      setOptimisticIsPlaying(true);
      lastPollRef.current = { ...lastPollRef.current, isPlaying: true, timestamp: Date.now() };
    }

    setLoadingAction(action);
    try {
      const directToken = spotifyTokenRef?.current;
      if (directToken) {
        const result = await callSpotifyDirect(action, positionMs, directToken);
        if (result === true) { onPollNow?.(); return; }
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
      if (res.ok) onPollNow?.();
      else setOptimisticIsPlaying(null);
    } catch (err) {
      console.warn('spotifyControl error:', err.message);
      setOptimisticIsPlaying(null);
    } finally {
      setLoadingAction(null);
    }
  }, [loadingAction, onPollNow, spotifyTokenRef]);

  const getMsFromPageX = useCallback((pageX) => {
    if (!barLayoutRef.current || !currentTrack?.duration_ms) return null;
    const { barPageX, barWidth } = barLayoutRef.current;
    const pct = Math.max(0, Math.min(1, (pageX - barPageX) / barWidth));
    return Math.floor(pct * currentTrack.duration_ms);
  }, [currentTrack?.duration_ms]);

  const onSeekGrant = useCallback((e) => {
    const pageX = e.nativeEvent.pageX;
    progressBarRef.current?.measure((_x, _y, w, _h, px) => {
      barLayoutRef.current = { barPageX: px, barWidth: w };
      if (!currentTrack?.duration_ms) return;
      const pct = Math.max(0, Math.min(1, (pageX - px) / w));
      setDragDisplay(Math.floor(pct * currentTrack.duration_ms));
    });
  }, [currentTrack?.duration_ms]);

  const onSeekMove = useCallback((e) => {
    const ms = getMsFromPageX(e.nativeEvent.pageX);
    if (ms !== null) setDragDisplay(ms);
  }, [getMsFromPageX]);

  const onSeekRelease = useCallback((e) => {
    const ms = getMsFromPageX(e.nativeEvent.pageX);
    setDragDisplay(null);
    if (ms !== null) handleControl('seek', ms);
  }, [getMsFromPageX, handleControl]);

  if (!currentTrack) return null;

  const { is_playing: realIsPlaying, duration_ms } = currentTrack;
  const is_playing = optimisticIsPlaying !== null ? optimisticIsPlaying : realIsPlaying;
  const isDragging = dragDisplay !== null;
  const seekMs = isDragging ? dragDisplay : displayPositionMs;
  const progress = duration_ms > 0 ? seekMs / duration_ms : 0;
  const progressPct = `${Math.min(progress * 100, 100)}%`;

  return (
    <View style={styles.container}>
      {/* Progress bar — draggable */}
      <View
        style={styles.progressWrapper}
        onStartShouldSetResponder={() => !!duration_ms}
        onMoveShouldSetResponder={() => !!duration_ms}
        onResponderGrant={onSeekGrant}
        onResponderMove={onSeekMove}
        onResponderRelease={onSeekRelease}
        onResponderTerminate={() => setDragDisplay(null)}
      >
        <View
          ref={progressBarRef}
          style={[styles.progressTrack, isDragging && styles.progressTrackActive]}
        >
          <View style={[styles.progressFill, { width: progressPct }]}>
            {isDragging && <View style={styles.progressThumb} />}
          </View>
        </View>
      </View>

      {/* Time labels */}
      <View style={styles.timeRow}>
        <Text style={[styles.timeText, isDragging && styles.timeTextActive]}>
          {formatMs(seekMs)}
        </Text>
        <Text style={styles.timeText}>{formatMs(duration_ms)}</Text>
      </View>

      {/* Transport buttons */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.sideBtn}
          activeOpacity={0.7}
          onPress={() => handleControl('previous')}
          disabled={!!loadingAction}
        >
          <Icon
            name="play-skip-back"
            size={26}
            color={loadingAction === 'previous' ? 'rgba(255,255,255,0.3)' : theme.colors.text}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.playBtn}
          activeOpacity={0.85}
          onPress={() => handleControl(is_playing ? 'pause' : 'play')}
          disabled={!!loadingAction}
        >
          <Icon
            name={is_playing ? 'pause' : 'play'}
            size={28}
            color={loadingAction ? 'rgba(0,0,0,0.4)' : '#000000'}
            style={!is_playing && { marginLeft: 3 }}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.sideBtn}
          activeOpacity={0.7}
          onPress={() => handleControl('next')}
          disabled={!!loadingAction}
        >
          <Icon
            name="play-skip-forward"
            size={26}
            color={loadingAction === 'next' ? 'rgba(255,255,255,0.3)' : theme.colors.text}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 24,
    paddingBottom: 14,
    paddingTop: 8,
  },
  progressWrapper: {
    paddingVertical: 6,
    justifyContent: 'center',
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#535353',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressTrackActive: {
    height: 8,
    overflow: 'visible',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  progressThumb: {
    position: 'absolute',
    right: -6,
    top: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  timeText: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: '400',
  },
  timeTextActive: {
    color: theme.colors.text,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 36,
    paddingTop: 2,
    paddingBottom: 2,
  },
  sideBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
