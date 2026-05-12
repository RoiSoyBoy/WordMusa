import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, Image,
} from 'react-native';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { useLyricSync } from '../hooks/useLyricSync';
import { useWordTracking } from '../hooks/useWordTracking';
import useWordStore from '../store/useWordStore';
import { psychometricWordSet, psychometricWordMap } from '../utils/psychometricWords';
import WordCard from '../components/WordCard';
import PlaybackControls from '../components/PlaybackControls';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const POLL_INTERVAL_MS = 1000;

export default function NowPlayingScreen() {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [highlightedWord, setHighlightedWord] = useState(null);
  const pollIntervalRef = useRef(null);
  const scrollViewRef = useRef(null);
  const itemRefs = useRef({});
  const userScrollingRef = useRef(false);
  const scrollResumeTimerRef = useRef(null);
  const activeIndexRef = useRef(-1);

  const { lines, activeIndex, status } = useLyricSync(currentTrack);
  const { recordWordEncounter, recordWordTap, recordTrackSeen } = useWordTracking();
  const { setActiveWords, setSelectedWord } = useWordStore();

  // ── Spotify polling ──────────────────────────────────────────────────────────

  const pollSpotify = useCallback(async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      const res = await fetch(`${BACKEND_URL}/spotifyPlayer`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        // Token invalid or user record gone (e.g. emulator restart) — force re-auth
        signOut(auth).catch(() => {});
        return;
      }
      if (!res.ok) return;
      const data = await res.json();
      if (!data.is_playing) {
        setCurrentTrack(prev => prev ? { ...prev, is_playing: false } : null);
        return;
      }
      setCurrentTrack(prev =>
        prev?.track_id === data.track_id ? { ...data } : data
      );
    } catch (err) {
      console.warn('Spotify poll failed:', err.message);
    }
  }, []);

  useEffect(() => {
    pollSpotify();
    pollIntervalRef.current = setInterval(pollSpotify, POLL_INTERVAL_MS);
    return () => clearInterval(pollIntervalRef.current);
  }, [pollSpotify]);

  // Track new songs for stats
  useEffect(() => {
    if (currentTrack?.track_id) recordTrackSeen(currentTrack.track_id);
  }, [currentTrack?.track_id]);

  // ── Word scanning ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (activeIndex < 0 || !lines[activeIndex]) {
      setActiveWords([]);
      setHighlightedWord(null);
      return;
    }
    const text = lines[activeIndex].text;
    const seen = new Set();
    const matched = [];

    text.split(/\b/).forEach(part => {
      const clean = part.toLowerCase().replace(/[^a-z]/g, '');
      if (clean && psychometricWordMap.has(clean) && !seen.has(clean)) {
        seen.add(clean);
        matched.push(psychometricWordMap.get(clean));
      }
    });

    setActiveWords(matched);
    setHighlightedWord(matched[0] || null);

    if (matched.length > 0 && currentTrack) {
      matched.forEach(wordData => {
        recordWordEncounter(wordData, {
          trackName: currentTrack.track_name,
          artistName: currentTrack.artist,
          lyricLine: text,
        });
      });
    }
  }, [activeIndex]);

  // ── Auto-scroll (Spotify-style) ───────────────────────────────────────────────

  useEffect(() => { activeIndexRef.current = activeIndex; }, [activeIndex]);

  useEffect(() => () => clearTimeout(scrollResumeTimerRef.current), []);

  const scrollToActive = useCallback((idx) => {
    if (idx < 0 || !scrollViewRef.current) return;
    const item = itemRefs.current[idx];
    if (!item) return;
    item.measureLayout(
      scrollViewRef.current,
      (_x, y) => {
        scrollViewRef.current?.scrollTo({ y: Math.max(0, y - 180), animated: true });
      },
      () => {}
    );
  }, []);

  const resumeAutoScroll = useCallback(() => {
    userScrollingRef.current = false;
    scrollToActive(activeIndexRef.current);
  }, [scrollToActive]);

  const handleScrollBeginDrag = useCallback(() => {
    userScrollingRef.current = true;
    clearTimeout(scrollResumeTimerRef.current);
  }, []);

  const handleScrollEnd = useCallback((e) => {
    clearTimeout(scrollResumeTimerRef.current);
    const currentY = e.nativeEvent.contentOffset.y;
    const idx = activeIndexRef.current;
    const item = itemRefs.current[idx];
    if (!item || !scrollViewRef.current) return;
    item.measureLayout(
      scrollViewRef.current,
      (_x, lineY) => {
        const targetY = Math.max(0, lineY - 180);
        if (Math.abs(currentY - targetY) < 250) {
          // Near the playing segment — resume auto-scroll after a short pause
          scrollResumeTimerRef.current = setTimeout(resumeAutoScroll, 2000);
        }
        // Far away — stay where the user scrolled, don't resume
      },
      () => {}
    );
  }, [resumeAutoScroll]);

  // Auto-scroll fires only when user isn't manually scrolling
  useEffect(() => {
    if (userScrollingRef.current) return;
    scrollToActive(activeIndex);
  }, [activeIndex, scrollToActive]);

  // Re-center once when translations first arrive — their added height shifts all
  // line positions, making the initial English-only scroll measurement stale.
  const hasTranslations = useMemo(() => lines.some(l => l.translation != null), [lines]);
  useEffect(() => {
    if (!hasTranslations || userScrollingRef.current) return;
    const t = setTimeout(() => scrollToActive(activeIndexRef.current), 150);
    return () => clearTimeout(t);
  }, [hasTranslations, scrollToActive]);

  // ── Lyric seek ───────────────────────────────────────────────────────────────

  const seekToLine = useCallback(async (timeMs) => {
    try {
      const token = await auth.currentUser.getIdToken();
      fetch(`${BACKEND_URL}/spotifyControl`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seek', position_ms: timeMs }),
      }).then(() => pollSpotify()).catch(console.warn);
    } catch (err) {
      console.warn('seek error:', err.message);
    }
  }, [pollSpotify]);

  // ── Lyric line rendering ──────────────────────────────────────────────────────

  const handleWordLongPress = (part, line) => {
    const clean = part.toLowerCase().replace(/[^a-z]/g, '');
    if (!clean) return;
    const lyricContext = line
      ? { text: line.text, translation: line.translation || null }
      : null;
    const fullWord = psychometricWordMap.get(clean);
    if (fullWord) {
      setSelectedWord({ ...fullWord, lyricContext });
    } else {
      setSelectedWord({
        word: part.trim(),
        lyricContext,
        trackName: currentTrack?.track_name,
        artistName: currentTrack?.artist,
      });
    }
  };

  const renderHighlightedLine = (text, baseStyle, line) => {
    if (!text) return <Text style={baseStyle} />;
    const parts = text.split(/(\b[a-zA-Z']+\b)/);
    return (
      <Text style={baseStyle}>
        {parts.map((part, idx) => {
          const clean = part.toLowerCase().replace(/[^a-z]/g, '');
          if (!clean) return <Text key={idx}>{part}</Text>;
          if (psychometricWordSet.has(clean)) {
            return (
              <Text key={idx} style={styles.highlightedWord} onLongPress={() => handleWordLongPress(part, line)} suppressHighlighting>
                {part}
              </Text>
            );
          }
          return (
            <Text key={idx} onLongPress={() => handleWordLongPress(part, line)} suppressHighlighting>
              {part}
            </Text>
          );
        })}
      </Text>
    );
  };

  const renderLyricLine = (line, index) => {
    const isActive = index === activeIndex;
    const isPast = index < activeIndex;
    const isFuture = index > activeIndex;

    const englishStyle = [
      styles.lyricEnglish,
      isPast && styles.textPast,
      isActive && styles.textActive,
      isFuture && styles.textFuture,
    ];

    return (
      <Pressable
        key={index}
        ref={(r) => { itemRefs.current[index] = r; }}
        onPress={() => seekToLine(line.time_ms)}
        style={({ pressed }) => [
          styles.lyricLine,
          isActive && styles.lyricLineActive,
          pressed && styles.lyricLinePressed,
        ]}
      >
        {renderHighlightedLine(line.text, englishStyle, line)}
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
          status === 'ready' && <View style={styles.translationPlaceholder} />
        )}
      </Pressable>
    );
  };

  // ── Empty state ───────────────────────────────────────────────────────────────

  if (!currentTrack) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>פתח את ספוטיפיי והתחל להאזין</Text>
        <Text style={styles.emptySubtext}>LyricLearn יסנכרן אוטומטית</Text>
      </View>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────────

  const activeLine = (activeIndex >= 0 && lines[activeIndex]) ? lines[activeIndex] : null;
  const activeLyricContext = activeLine
    ? { text: activeLine.text, translation: activeLine.translation || null }
    : null;

  return (
    <View style={styles.container}>
      {/* Track header */}
      <View style={styles.header}>
        {currentTrack.album_art && (
          <Image source={{ uri: currentTrack.album_art }} style={styles.albumArt} />
        )}
        <View style={styles.trackInfo}>
          <Text style={styles.trackName} numberOfLines={1}>{currentTrack.track_name}</Text>
          <Text style={styles.artistName} numberOfLines={1}>{currentTrack.artist}</Text>
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
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={handleScrollBeginDrag}
          onScrollEndDrag={handleScrollEnd}
          onMomentumScrollEnd={handleScrollEnd}
        >
          {lines.map((line, index) => renderLyricLine(line, index))}
          <View style={styles.bottomPadding} />
        </ScrollView>
      )}

      {/* Word card — sits between lyrics and playback controls */}
      <WordCard
        lyricContext={activeLyricContext}
        onWordTap={(wordData) => recordWordTap(wordData)}
      />

      <PlaybackControls currentTrack={currentTrack} onPollNow={pollSpotify} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  albumArt: { width: 48, height: 48, borderRadius: 8, marginRight: 12 },
  trackInfo: { flex: 1 },
  trackName: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  artistName: { color: '#7A7A9A', fontSize: 13, marginTop: 2 },
  lyricsScroll: { flex: 1 },
  lyricsContent: { paddingTop: 24, paddingHorizontal: 20 },
  lyricLine: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 8,
  },
  lyricLineActive: {
    backgroundColor: 'rgba(124,106,247,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(124,106,247,0.3)',
  },
  lyricLinePressed: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  lyricEnglish: {
    fontSize: 19,
    color: 'rgba(240,238,255,0.9)',
    textAlign: 'left',
    lineHeight: 26,
  },
  lyricHebrew: {
    fontSize: 15,
    color: '#7A7A9A',
    textAlign: 'right',
    marginTop: 6,
    fontStyle: 'italic',
    lineHeight: 21,
  },
  highlightedWord: {
    color: '#6AF7C8',
    fontWeight: '600',
  },
  textPast: { opacity: 0.3 },
  textActive: { color: '#FFFFFF', fontWeight: '600' },
  textFuture: { opacity: 0.45 },
  hebrewActive: { color: 'rgba(200,195,255,0.8)' },
  translationPlaceholder: {
    height: 15,
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
  emptyText: { color: '#7A7A9A', fontSize: 16, textAlign: 'center' },
  emptySubtext: {
    color: 'rgba(122,122,154,0.6)',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  bottomPadding: { height: 12 },
});
