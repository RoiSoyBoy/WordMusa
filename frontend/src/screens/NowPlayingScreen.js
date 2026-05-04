import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  Image, TouchableOpacity
} from 'react-native';
import { auth } from '../firebase';
import { useLyricSync } from '../hooks/useLyricSync';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const POLL_INTERVAL_MS = 1000;

export default function NowPlayingScreen() {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPolling, setIsPolling] = useState(true);
  const pollIntervalRef = useRef(null);
  const scrollViewRef = useRef(null);
  const lineHeightRef = useRef(72); // approximate px per lyric line

  const { lines, activeIndex, status } = useLyricSync(currentTrack);

  // Polling loop
  const pollSpotify = useCallback(async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();

      const res = await fetch(`${BACKEND_URL}/spotifyPlayer`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) return;

      const data = await res.json();
      if (!data.is_playing) {
        setCurrentTrack(prev => prev ? { ...prev, is_playing: false } : null);
        return;
      }

      setCurrentTrack(prev => {
        // Preserve track_id continuity for useLyricSync change detection
        if (prev?.track_id === data.track_id) {
          return { ...data };
        }
        return data;
      });
    } catch (err) {
      console.warn('Spotify poll failed:', err.message);
    }
  }, []);

  useEffect(() => {
    pollSpotify();
    pollIntervalRef.current = setInterval(pollSpotify, POLL_INTERVAL_MS);
    return () => clearInterval(pollIntervalRef.current);
  }, [pollSpotify]);

  // Auto-scroll to active line
  useEffect(() => {
    if (activeIndex < 0 || !scrollViewRef.current) return;
    const yOffset = Math.max(0, activeIndex * lineHeightRef.current - 150);
    scrollViewRef.current.scrollTo({ y: yOffset, animated: true });
  }, [activeIndex]);

  // ── Render helpers ──────────────────────────────────────────────────────────

  const renderLyricLine = (line, index) => {
    const isActive = index === activeIndex;
    const isPast = index < activeIndex;
    const isFuture = index > activeIndex;

    return (
      <View
        key={index}
        style={[
          styles.lyricLine,
          isActive && styles.lyricLineActive,
        ]}
      >
        <Text style={[
          styles.lyricEnglish,
          isPast && styles.textPast,
          isActive && styles.textActive,
          isFuture && styles.textFuture,
        ]}>
          {line.text}
        </Text>
        {line.translation ? (
          <Text style={[
            styles.lyricHebrew,
            isPast && styles.textPast,
            isActive && styles.hebrewActive,
            isFuture && styles.textFuture,
          ]}>
            {line.translation}
          </Text>
        ) : (
          // Translation loading placeholder
          status === 'ready' && (
            <View style={styles.translationPlaceholder} />
          )
        )}
      </View>
    );
  };

  // ── States ──────────────────────────────────────────────────────────────────

  if (!currentTrack || !currentTrack.is_playing) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>פתח את ספוטיפיי והתחל להאזין</Text>
        <Text style={styles.emptySubtext}>LyricLearn יסנכרן אוטומטית</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Track header */}
      <View style={styles.header}>
        {currentTrack.album_art && (
          <Image source={{ uri: currentTrack.album_art }} style={styles.albumArt} />
        )}
        <View style={styles.trackInfo}>
          <Text style={styles.trackName} numberOfLines={1}>
            {currentTrack.track_name}
          </Text>
          <Text style={styles.artistName} numberOfLines={1}>
            {currentTrack.artist}
          </Text>
        </View>
      </View>

      {/* Lyrics area */}
      {status === 'loading' && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#7C6AF7" />
          <Text style={styles.loadingText}>טוען מילים...</Text>
        </View>
      )}

      {status === 'no_lyrics' && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>מילות השיר הזה לא זמינות כרגע</Text>
        </View>
      )}

      {status === 'error' && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>שגיאה בטעינת המילים</Text>
        </View>
      )}

      {status === 'ready' && lines.length > 0 && (
        <ScrollView
          ref={scrollViewRef}
          style={styles.lyricsScroll}
          contentContainerStyle={styles.lyricsContent}
          showsVerticalScrollIndicator={false}
        >
          {lines.map((line, index) => renderLyricLine(line, index))}
          <View style={styles.bottomPadding} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  albumArt: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
  },
  trackInfo: { flex: 1 },
  trackName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  artistName: {
    color: '#7A7A9A',
    fontSize: 13,
    marginTop: 2,
  },
  lyricsScroll: { flex: 1 },
  lyricsContent: { paddingTop: 24, paddingHorizontal: 20 },
  lyricLine: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 4,
    minHeight: 64,
  },
  lyricLineActive: {
    backgroundColor: 'rgba(124,106,247,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(124,106,247,0.3)',
  },
  lyricEnglish: {
    fontSize: 15,
    color: 'rgba(240,238,255,0.9)',
    textAlign: 'left',
  },
  lyricHebrew: {
    fontSize: 13,
    color: '#7A7A9A',
    textAlign: 'right',
    marginTop: 4,
    fontStyle: 'italic',
  },
  textPast: { opacity: 0.3 },
  textActive: { color: '#FFFFFF', fontWeight: '600' },
  textFuture: { opacity: 0.45 },
  hebrewActive: { color: 'rgba(200,195,255,0.8)' },
  translationPlaceholder: {
    height: 13,
    width: '60%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 4,
    marginTop: 6,
    alignSelf: 'flex-end',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: { color: '#7A7A9A', fontSize: 14 },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    color: '#7A7A9A',
    fontSize: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    color: 'rgba(122,122,154,0.6)',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  bottomPadding: { height: 100 },
});
