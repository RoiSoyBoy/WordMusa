import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, Image, Animated,
  Dimensions,
} from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { useLyricSync } from '../hooks/useLyricSync';
import { useWordTracking } from '../hooks/useWordTracking';
import useWordStore from '../store/useWordStore';
import { psychometricWordMap, basicWordSet } from '../utils/psychometricWords';
import WordCard from '../components/WordCard';
import SongWordsSheet from '../components/SongWordsSheet';
import PlaybackControls from '../components/PlaybackControls';
import { LinearGradient } from 'expo-linear-gradient';
import { extractAlbumColor } from '../utils/extractAlbumColor';
import { theme } from '../styles/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const POLL_INTERVAL_MS = 1000;
const TIER_RANK = { LOW: 0, MEDIUM: 1, HIGH: 2 };

function getLineOpacity(index, activeIdx) {
  if (activeIdx < 0) return 0.5;
  const distance = Math.abs(index - activeIdx);
  if (distance === 0) return 1;
  if (distance === 1) return 0.75;
  if (distance === 2) return 0.5;
  if (distance === 3) return 0.25;
  return 0.05;
}

export default function NowPlayingScreen() {
  const insets = useSafeAreaInsets();
  const [headerColor, setHeaderColor] = useState(null);
  const gradientOpacity = useRef(new Animated.Value(0)).current;
  const [currentTrack, setCurrentTrack] = useState(null);
  const [highlightedWord, setHighlightedWord] = useState(null);
  const pollIntervalRef = useRef(null);
  const scrollViewRef = useRef(null);
  const itemRefs = useRef({});
  const userScrollingRef = useRef(false);
  const scrollResumeTimerRef = useRef(null);
  const activeIndexRef = useRef(-1);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const [sheetWords, setSheetWords] = useState([]);
  const [sheetVisible, setSheetVisible] = useState(false);
  const songWordsRef = useRef([]);

  const { lines, activeIndex, status, translationsReady } = useLyricSync(currentTrack);
  const { recordWordTap, recordTrackSeen, recordWordFlag, flaggedWordSet } = useWordTracking();
  const { setActiveWords, setSelectedWord } = useWordStore();

  // ── Spotify live badge pulse ──────────────────────────────────────────────────

  useEffect(() => {
    if (!currentTrack?.is_playing) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.25, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [currentTrack?.is_playing, pulseAnim]);

  // ── Album art color extraction ───────────────────────────────────────────────

  useEffect(() => {
    gradientOpacity.setValue(0);
    if (!currentTrack?.album_art) { setHeaderColor(null); return; }
    extractAlbumColor(currentTrack.album_art)
      .then(color => {
        if (!color) return;
        setHeaderColor(color);
        Animated.timing(gradientOpacity, { toValue: 1, duration: 900, useNativeDriver: true }).start();
      });
  }, [currentTrack?.album_art]);

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

  useEffect(() => {
    if (currentTrack?.track_id) recordTrackSeen(currentTrack.track_id);
  }, [currentTrack?.track_id]);

  // When song changes: show bottom sheet with top 5 words from the previous song
  useEffect(() => {
    const sorted = [...songWordsRef.current]
      .sort((a, b) => TIER_RANK[a.frequencyTier] - TIER_RANK[b.frequencyTier])
      .slice(0, 5);
    if (sorted.length > 0) {
      setSheetWords(sorted);
      setSheetVisible(true);
    }
    songWordsRef.current = [];
  }, [currentTrack?.track_id]);

  // ── Word scanning ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (activeIndex < 0 || !lines[activeIndex]) {
      setActiveWords([]);
      setHighlightedWord(null);
      return;
    }
    const text = lines[activeIndex].text;
    const focusMatched = [];

    text.split(/\b/).forEach(part => {
      const clean = part.toLowerCase().replace(/[^a-z]/g, '');
      if (!clean || !psychometricWordMap.has(clean)) return;
      const wordData = psychometricWordMap.get(clean);

      // Accumulate eligible words for the end-of-song sheet
      if (!basicWordSet.has(clean) && !flaggedWordSet.has(clean)) {
        if (!songWordsRef.current.find(w => w.word.toLowerCase() === clean)) {
          songWordsRef.current.push(wordData);
        }
      }

      // Focus words (user-chosen) → highlight and show WordCard
      if (flaggedWordSet.has(clean) && !focusMatched.find(w => w.word.toLowerCase() === clean)) {
        focusMatched.push(wordData);
      }
    });

    setActiveWords(focusMatched);
    setHighlightedWord(focusMatched[0] || null);
  }, [activeIndex, flaggedWordSet]);

  // ── Auto-scroll (Spotify-style) ───────────────────────────────────────────────

  useEffect(() => { activeIndexRef.current = activeIndex; }, [activeIndex]);

  const translationsReadyRef = useRef(false);
  useEffect(() => { translationsReadyRef.current = translationsReady; }, [translationsReady]);

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
          scrollResumeTimerRef.current = setTimeout(resumeAutoScroll, 2000);
        }
      },
      () => {}
    );
  }, [resumeAutoScroll]);

  // Auto-scroll suppressed during streaming — measureLayout returns unstable Y while
  // translations are filling in, causing scroll flicker.
  useEffect(() => {
    if (userScrollingRef.current) return;
    if (!translationsReadyRef.current) return;
    scrollToActive(activeIndex);
  }, [activeIndex, scrollToActive]);

  // Re-center once when all translations settle. Delayed 150ms so layout is stable.
  useEffect(() => {
    if (!translationsReady || userScrollingRef.current) return;
    const t = setTimeout(() => scrollToActive(activeIndexRef.current), 150);
    return () => clearTimeout(t);
  }, [translationsReady, scrollToActive]);

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
          if (flaggedWordSet.has(clean)) {
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
    const opacity = getLineOpacity(index, activeIndex);

    const englishStyle = [
      styles.lyricEnglish,
      isActive && styles.textActive,
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
          { opacity },
        ]}
      >
        {renderHighlightedLine(line.text, englishStyle, line)}
        {line.translation ? (
          <Text style={[styles.lyricHebrew, isActive && styles.hebrewActive]}>
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
      {/* Album art color gradient */}
      {headerColor && (
        <Animated.View style={[styles.bgGradient, { opacity: gradientOpacity }]} pointerEvents="none">
          <LinearGradient
            colors={[`${headerColor}E6`, `${headerColor}99`, `${headerColor}00`]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
        </Animated.View>
      )}

      {/* Track header */}
      <View style={[styles.header, { paddingTop: insets.top + theme.spacing.sm }]}>
        <View style={styles.trackRow}>
          {currentTrack.album_art && (
            <Image source={{ uri: currentTrack.album_art }} style={styles.albumArt} />
          )}
          <View style={styles.trackInfo}>
            <Text style={styles.trackName} numberOfLines={1}>{currentTrack.track_name}</Text>
            <Text style={styles.artistName} numberOfLines={1}>{currentTrack.artist}</Text>
          </View>
          {currentTrack.is_playing && (
            <Animated.View style={[styles.playingDot, { opacity: pulseAnim }]} />
          )}
        </View>
      </View>

      {/* Lyrics area */}
      {status === 'loading' && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={theme.colors.accent} />
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

      {/* Word card */}
      <WordCard
        lyricContext={activeLyricContext}
        onWordTap={(wordData) => recordWordTap(wordData)}
      />

      <PlaybackControls currentTrack={currentTrack} onPollNow={pollSpotify} />

      <SongWordsSheet
        visible={sheetVisible}
        words={sheetWords}
        onAdd={(wordData) => recordWordFlag(wordData.word, null, null, wordData.hebrewShort)}
        onDismiss={() => setSheetVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  bgGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 340,
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  albumArt: {
    width: 52,
    height: 52,
    borderRadius: theme.radii.sm,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  trackInfo: { flex: 1 },
  trackName: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  artistName: {
    color: theme.colors.muted,
    fontSize: 13,
    marginTop: 2,
    fontWeight: '400',
  },
  playingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.accent,
    marginLeft: 8,
  },

  // ── Lyrics ──────────────────────────────────────────────────────────────────
  lyricsScroll: { flex: 1 },
  lyricsContent: { paddingTop: 16, paddingHorizontal: 24, paddingBottom: 8 },
  lyricLine: {
    paddingVertical: 10,
    paddingHorizontal: 0,
    marginBottom: 4,
  },
  lyricLineActive: {},
  lyricLinePressed: { opacity: 0.6 },
  lyricEnglish: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'left',
    lineHeight: 26,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  lyricHebrew: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'right',
    marginTop: 4,
    fontWeight: '600',
    lineHeight: 19,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  highlightedWord: {
    color: theme.colors.accentGreen,
    fontWeight: '700',
  },
  textActive: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  hebrewActive: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 14,
    fontWeight: '700',
  },
  translationPlaceholder: {
    height: 19,
    width: '55%',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 3,
    marginTop: 4,
    alignSelf: 'flex-end',
  },

  // ── States ──────────────────────────────────────────────────────────────────
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: { color: theme.colors.muted, fontSize: 14 },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  emptyText: {
    color: theme.colors.muted,
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  emptySubtext: {
    color: 'rgba(179,179,179,0.5)',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  bottomPadding: { height: 12 },
});
