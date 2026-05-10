import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, Pressable, StyleSheet } from 'react-native';
import { auth } from '../firebase';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

function formatMs(ms) {
  if (!ms || ms < 0) return '0:00';
  const totalSecs = Math.floor(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function PlaybackControls({ currentTrack, onPollNow }) {
  const [loadingAction, setLoadingAction] = useState(null);
  const [displayPositionMs, setDisplayPositionMs] = useState(0);
  const progressBarRef = useRef(null);
  const lastPollRef = useRef({ positionMs: 0, timestamp: Date.now(), isPlaying: false });

  // Snap interpolation base when poll brings a new position or track
  useEffect(() => {
    if (!currentTrack) return;
    lastPollRef.current = {
      positionMs: currentTrack.position_ms,
      timestamp: Date.now(),
      isPlaying: currentTrack.is_playing,
    };
    setDisplayPositionMs(currentTrack.position_ms);
  }, [currentTrack?.position_ms, currentTrack?.track_id]);

  // Smooth progress interpolation — ticks every 200ms while playing
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
    setLoadingAction(action);
    try {
      const token = await auth.currentUser.getIdToken();
      const body = { action };
      if (action === 'seek') body.position_ms = positionMs;

      const res = await fetch(`${BACKEND_URL}/spotifyControl`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (res.ok) onPollNow?.();
    } catch (err) {
      console.warn('spotifyControl error:', err.message);
    } finally {
      setLoadingAction(null);
    }
  }, [loadingAction, onPollNow]);

  const handleSeekPress = useCallback((evt) => {
    const durationMs = currentTrack?.duration_ms;
    if (!progressBarRef.current || !durationMs) return;
    progressBarRef.current.measure((_x, _y, width, _h, _pageX) => {
      const locationX = evt.nativeEvent.pageX - _pageX;
      const pct = Math.max(0, Math.min(1, locationX / width));
      handleControl('seek', Math.floor(pct * durationMs));
    });
  }, [currentTrack?.duration_ms, handleControl]);

  if (!currentTrack) return null;

  const { is_playing, duration_ms } = currentTrack;
  const progress = duration_ms > 0 ? displayPositionMs / duration_ms : 0;

  return (
    <View style={styles.container}>
      {/* Progress bar — large hit area, measure-based seek */}
      <Pressable
        hitSlop={{ top: 12, bottom: 12 }}
        onPress={handleSeekPress}
      >
        <View
          ref={progressBarRef}
          style={styles.progressTrack}
        >
          <View style={[styles.progressFill, { width: `${Math.min(progress * 100, 100)}%` }]} />
        </View>
      </Pressable>

      {/* Time labels */}
      <View style={styles.timeRow}>
        <Text style={styles.timeText}>{formatMs(displayPositionMs)}</Text>
        <Text style={styles.timeText}>{formatMs(duration_ms)}</Text>
      </View>

      {/* Transport buttons */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.btn}
          activeOpacity={0.7}
          onPress={() => handleControl('previous')}
          disabled={!!loadingAction}
        >
          <Text style={[styles.btnIcon, loadingAction === 'previous' && styles.dimmed]}>⏮</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.playBtn]}
          activeOpacity={0.7}
          onPress={() => handleControl(is_playing ? 'pause' : 'play')}
          disabled={!!loadingAction}
        >
          <Text style={[styles.playIcon, loadingAction && styles.dimmed]}>
            {is_playing ? '⏸' : '▶'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.btn}
          activeOpacity={0.7}
          onPress={() => handleControl('next')}
          disabled={!!loadingAction}
        >
          <Text style={[styles.btnIcon, loadingAction === 'next' && styles.dimmed]}>⏭</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0A0A0F',
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  progressTrack: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#7C6AF7',
    borderRadius: 2,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 2,
  },
  timeText: {
    color: '#7A7A9A',
    fontSize: 11,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    paddingTop: 6,
  },
  btn: {
    padding: 8,
  },
  btnIcon: {
    fontSize: 22,
    color: '#F0EEFF',
  },
  playBtn: {
    backgroundColor: '#7C6AF7',
    borderRadius: 28,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  playIcon: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  dimmed: {
    opacity: 0.4,
  },
});
