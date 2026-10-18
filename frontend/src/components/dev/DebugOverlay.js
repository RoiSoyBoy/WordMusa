import React from 'react';
import { Text, Pressable, StyleSheet, Platform } from 'react-native';
import useDevSettings from '../../store/useDevSettings';
import { theme } from '../../styles/theme';

// Dev builds only — live provider/sync state for testing on a phone with no console.
// Tap it to open the dev menu.
export default function DebugOverlay({ providerId, track, activeIndex, lineCount, status, lastError, lyricsError, top, onPress }) {
  const visible = useDevSettings(s => s.overlayVisible);
  if (!__DEV__ || !visible) return null;

  const rows = [
    `provider: ${providerId}`,
    `track: ${track ? `${track.track_name} — ${track.artist}` : '—'}`,
    `position_ms: ${track?.position_ms ?? '—'}`,
    `isPlaying: ${track ? String(!!track.is_playing) : '—'}`,
    `line: ${activeIndex} / ${lineCount} (${status})`,
    `error: ${lastError || '—'}`,
    `lyrics error: ${lyricsError || '—'}`,
  ];

  return (
    <Pressable onPress={onPress} style={[styles.box, { top }]}>
      {rows.map((row, i) => (
        <Text key={i} style={styles.text} numberOfLines={4}>{row}</Text>
      ))}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    right: theme.spacing.sm,
    maxWidth: '80%',
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: theme.radii.sm,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    zIndex: 50,
    elevation: 50,
  },
  text: {
    color: theme.colors.text,
    fontSize: 11,
    lineHeight: 15,
    textAlign: 'left',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: undefined }),
  },
});
