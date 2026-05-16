import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, Image, Animated,
} from 'react-native';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { useLyricSync } from '../hooks/useLyricSync';
import { useWordTracking } from '../hooks/useWordTracking';
import useWordStore from '../store/useWordStore';
import { psychometricWordMap, basicWordSet } from '../utils/psychometricWords';
import { useDifficulty } from '../hooks/useDifficulty';
import WordCard from '../components/WordCard';
import PlaybackControls from '../components/PlaybackControls';
import { theme } from '../styles/theme';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const POLL_INTERVAL_MS = 1000;

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
  const [currentTrack, setCurrentTrack] = useState(null);
  const [highlightedWord, setHighlightedWord] = useState(null);
  const pollIntervalRef = useRef(null);
  const scrollViewRef = useRef(null);
  const itemRefs = useRef({});
  const userScrollingRef = useRef(false);
  const scrollResumeTimerRef = useRef(null);
  const activeIndexRef = useRef(-1);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const { lines, activeIndex, status, translationsReady } = useLyricSync(currentTrack);
  const { recordWordEncounter, recordWordTap, recordTrackSeen, learnedWordSet } = useWordTracking();
  const { setActiveWords, setSelectedWord } = useWordStore();
  const { wordCap } = useDifficulty();
  const songWordBudget = useRef(new Set());

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

  // Reset word budget on every new song so 3-word cap applies fresh each time
  useEffect(() => {
    songWordBudget.current = new Set();
  }, [currentTrack?.track_id]);

  // ── Word scanning ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (activeIndex < 0 || !lines[activeIndex]) {
      setActiveWords([]);
      setHighlightedWord(null);
      return;
    }
    const text = lines[activeIndex].text;
    // LOW tier = rarest in exam = hardest for the student
    const TIER_RANK = { LOW: 0, MEDIUM: 1, HIGH: 2 };
    const seen = new Set();
    const eligible = [];

    // Collect all eligible words in this line
    text.split(/\b/).forEach(part => {
      const clean = part.toLowerCase().replace(/[^a-z]/g, '');
      if (!clean || !psychometricWordMap.has(clean) || seen.has(clean)) return;
      if (basicWordSet.has(clean)) return;     // CEFR A1-A2: student already knows it
      if (learnedWordSet.has(clean)) return;   // already learned: skip
      seen.add(clean);
      eligible.push(psychometricWordMap.get(clean));
    });

    // Sort hardest first, then apply the per-song budget
    eligible.sort((a, b) => TIER_RANK[a.frequencyTier] - TIER_RANK[b.frequencyTier]);

    const matched = [];
    eligible.forEach(wordData => {
      const key = wordData.word.toLowerCase();
      if (songWordBudget.current.size >= wordCap && !songWordBudget.current.has(key)) return;
      songWordBudget.current.add(key);
      matched.push(wordData);
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
  }, [activeIndex, wordCap, learnedWordSet]);

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
          if (songWordBudget.current.has(clean)) {
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
      {/* Track header */}
      <View style={styles.header}>
        {currentTrack.album_art && (
          <Image source={{ uri: currentTrack.album_art }} style={styles.albumArt} />
        )}
        <View style={styles.trackInfo}>
          <Text style={styles.trackName} numberOfLines={1}>{currentTrack.track_name}</Text>
          <Text style={styles.artistName} numberOfLines={1}>{currentTrack.artist}</Text>
        </View>
        {currentTrack.is_playing && (
          <View style={styles.spotifyBadge}>
            <Animated.View style={[styles.spotifyDot, { opacity: pulseAnim }]} />
            <Text style={styles.spotifyLabel}>Spotify</Text>
          </View>
        )}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  albumArt: {
    width: 56,
    height: 56,
    borderRadius: 12,
    marginRight: 12,
    shadowColor: 'rgba(124,106,247,0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 8,
  },
  trackInfo: { flex: 1 },
  trackName: { color: theme.colors.text, fontSize: 15, fontWeight: '700' },
  artistName: { color: theme.colors.muted, fontSize: 13, marginTop: 2 },
  spotifyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(29,185,84,0.1)',
    borderRadius: theme.radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  spotifyDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.colors.spotify,
  },
  spotifyLabel: {
    color: theme.colors.spotify,
    fontSize: 11,
    fontWeight: '600',
  },
  lyricsScroll: { flex: 1 },
  lyricsContent: { paddingTop: 24, paddingHorizontal: 20 },
  lyricLine: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: theme.radii.md,
    marginBottom: 8,
  },
  lyricLineActive: {
    backgroundColor: theme.colors.highlight,
    borderWidth: 1,
    borderColor: theme.colors.highlightBorder,
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
    color: theme.colors.muted,
    textAlign: 'right',
    marginTop: 6,
    fontStyle: 'italic',
    lineHeight: 21,
  },
  highlightedWord: {
    color: theme.colors.accentGreen,
    fontWeight: '600',
  },
  textActive: { color: theme.colors.text, fontWeight: '600' },
  hebrewActive: { color: 'rgba(200,195,255,0.8)' },
  translationPlaceholder: {
    height: 21,
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
  loadingText: { color: theme.colors.muted, fontSize: 14 },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  emptyText: { color: theme.colors.muted, fontSize: 16, textAlign: 'center' },
  emptySubtext: {
    color: 'rgba(122,122,154,0.6)',
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  bottomPadding: { height: 12 },
});
