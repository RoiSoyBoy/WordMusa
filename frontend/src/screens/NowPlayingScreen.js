import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator, Image, Animated,
  Dimensions, Platform, Modal, SafeAreaView,
} from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
import { useNowPlaying } from '../hooks/useNowPlaying';
import { useLyricSync } from '../hooks/useLyricSync';
import { useWordTracking } from '../hooks/useWordTracking';
import useWordStore from '../store/useWordStore';
import useDevSettings from '../store/useDevSettings';
import { psychometricWordMap, basicWordSet } from '../utils/psychometricWords';
import WordCard from '../components/WordCard';
import Icon from '../components/Icon';
import SpotifyIcon from '../components/SpotifyIcon';
import SongWordsSheet from '../components/SongWordsSheet';
import SongWordsList from '../components/SongWordsList';
import PlaybackControls from '../components/PlaybackControls';
import DevMenu from '../components/dev/DevMenu';
import DebugOverlay from '../components/dev/DebugOverlay';
import { LinearGradient } from 'expo-linear-gradient';
import { extractAlbumColor } from '../utils/extractAlbumColor';
import { theme } from '../styles/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TIER_RANK = { LOW: 0, MEDIUM: 1, HIGH: 2 };

export default function NowPlayingScreen() {
  const insets = useSafeAreaInsets();
  const [headerColor, setHeaderColor] = useState(null);
  const gradientOpacity = useRef(new Animated.Value(0)).current;
  const providerId = useDevSettings(s => s.providerId);
  const { provider, currentTrack, lastError } = useNowPlaying(providerId);
  const [devMenuVisible, setDevMenuVisible] = useState(false);
  const openDevMenu = __DEV__ ? () => setDevMenuVisible(true) : undefined;
  const [highlightedWord, setHighlightedWord] = useState(null);
  const scrollViewRef = useRef(null);
  const itemRefs = useRef({});
  const itemYOffsets = useRef({});
  const userScrollingRef = useRef(false);
  const scrollResumeTimerRef = useRef(null);
  const activeIndexRef = useRef(-1);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const currentTrackRef = useRef(null);
  const encounteredRef = useRef(new Set());

  const [sheetWords, setSheetWords] = useState([]);
  const [sheetVisible, setSheetVisible] = useState(false);
  const songWordsRef = useRef([]);
  const [wordsModalVisible, setWordsModalVisible] = useState(false);
  const [allSongWords, setAllSongWords] = useState([]);

  const { lines, activeIndex, status, translationsReady, lyricsError } = useLyricSync(currentTrack, provider.syncOptions);
  const { recordWordEncounter, recordWordTap, recordTrackSeen, recordWordFlag, flaggedWordSet } = useWordTracking();
  const { setActiveWords, setSelectedWord } = useWordStore();

  // ── Spotify live badge pulse ──────────────────────────────────────────────────

  useEffect(() => {
    if (!currentTrack?.is_playing) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.25, duration: 900, useNativeDriver: false }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: false }),
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
        Animated.timing(gradientOpacity, { toValue: 1, duration: 900, useNativeDriver: false }).start();
      });
  }, [currentTrack?.album_art]);

  useEffect(() => {
    if (currentTrack?.track_id) {
      recordTrackSeen(currentTrack.track_id);
      encounteredRef.current.clear();
    }
    // Reset scroll state on every track change so stale Y offsets and
    // a previous user-scroll lock don't break auto-scroll for the new song.
    itemYOffsets.current = {};
    itemRefs.current = {};
    userScrollingRef.current = false;
    clearTimeout(scrollResumeTimerRef.current);
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
  }, [currentTrack?.track_id]);

  // When song changes: show bottom sheet with top 5 words from the previous song
  useEffect(() => {
    const sorted = [...songWordsRef.current]
      .sort((a, b) => TIER_RANK[b.frequencyTier] - TIER_RANK[a.frequencyTier])
      .slice(0, 5);
    if (sorted.length > 0) {
      setSheetWords(sorted);
      setSheetVisible(true);
    }
    songWordsRef.current = [];
    setAllSongWords([]);
    setWordsModalVisible(false);
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

      // Record encounter once per word per line per track
      const encounterKey = `${activeIndex}:${clean}`;
      if (!encounteredRef.current.has(encounterKey)) {
        encounteredRef.current.add(encounterKey);
        const track = currentTrackRef.current;
        recordWordEncounter(wordData, {
          trackName: track?.track_name || '',
          artistName: track?.artist || '',
          lyricLine: text,
        });
      }

      // Focus words (user-chosen) → highlight and show WordCard
      if (flaggedWordSet.has(clean) && !focusMatched.find(w => w.word.toLowerCase() === clean)) {
        focusMatched.push(wordData);
      }
    });

    setActiveWords(focusMatched);
    setHighlightedWord(focusMatched[0] || null);
  }, [activeIndex, flaggedWordSet]);

  // ── Scan full song lyrics for all psychometric words ─────────────────────────

  useEffect(() => {
    if (!lines.length) { setAllSongWords([]); return; }
    const found = new Map();
    lines.forEach(({ text }) => {
      text.split(/\b/).forEach(part => {
        const clean = part.toLowerCase().replace(/[^a-z]/g, '');
        if (!clean || !psychometricWordMap.has(clean)) return;
        if (!found.has(clean)) found.set(clean, psychometricWordMap.get(clean));
      });
    });
    const sorted = [...found.values()].sort((a, b) => (a.unit ?? 99) - (b.unit ?? 99));
    setAllSongWords(sorted);
  }, [lines]);

  // ── Auto-scroll (Spotify-style) ───────────────────────────────────────────────

  useEffect(() => { activeIndexRef.current = activeIndex; }, [activeIndex]);

  const translationsReadyRef = useRef(false);
  useEffect(() => { translationsReadyRef.current = translationsReady; }, [translationsReady]);
  useEffect(() => { currentTrackRef.current = currentTrack; }, [currentTrack]);

  useEffect(() => () => clearTimeout(scrollResumeTimerRef.current), []);

  const scrollToActive = useCallback((idx) => {
    if (idx < 0 || !scrollViewRef.current) return;
    const y = itemYOffsets.current[idx];
    if (y != null) {
      scrollViewRef.current.scrollTo({ y: Math.max(0, y - 180), animated: true });
      return;
    }
    // Fallback: measureLayout if onLayout hasn't fired yet (first render)
    const item = itemRefs.current[idx];
    if (!item) return;
    item.measureLayout(
      scrollViewRef.current,
      (_x, measuredY) => {
        scrollViewRef.current?.scrollTo({ y: Math.max(0, measuredY - 180), animated: true });
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

  const handleScrollEnd = useCallback(() => {
    clearTimeout(scrollResumeTimerRef.current);
    scrollResumeTimerRef.current = setTimeout(resumeAutoScroll, 2000);
  }, [resumeAutoScroll]);

  // Scroll whenever activeIndex changes. Placeholder height (19px) matches
  // Hebrew text lineHeight (19px), so layout is stable throughout streaming.
  useEffect(() => {
    if (userScrollingRef.current) return;
    const y = itemYOffsets.current[activeIndex];
    if (y != null) {
      scrollViewRef.current?.scrollTo({ y: Math.max(0, y - 180), animated: true });
    } else {
      scrollToActive(activeIndex); // fallback: measureLayout (first render)
    }
  }, [activeIndex, scrollToActive]);

  // Re-center once when all translations settle. Delayed 150ms so layout is stable.
  useEffect(() => {
    if (!translationsReady || userScrollingRef.current) return;
    const t = setTimeout(() => scrollToActive(activeIndexRef.current), 150);
    return () => clearTimeout(t);
  }, [translationsReady, scrollToActive]);

  // ── Lyric seek ───────────────────────────────────────────────────────────────

  const seekToLine = useCallback((timeMs) => {
    if (!provider.controls?.seek) return;
    provider.controls.seek(timeMs).catch(err => console.warn('seek error:', err.message));
  }, [provider]);

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
    const wordPress = (part) => Platform.OS === 'web'
      ? { onPress: () => handleWordLongPress(part, line) }
      : { onLongPress: () => handleWordLongPress(part, line) };
    return (
      <Text style={baseStyle}>
        {parts.map((part, idx) => {
          const clean = part.toLowerCase().replace(/[^a-z]/g, '');
          if (!clean) return <Text key={idx}>{part}</Text>;
          if (flaggedWordSet.has(clean)) {
            return (
              <Text key={idx} style={styles.highlightedWord} {...wordPress(part)} suppressHighlighting>
                {part}
              </Text>
            );
          }
          return (
            <Text key={idx} {...wordPress(part)} suppressHighlighting>
              {part}
            </Text>
          );
        })}
      </Text>
    );
  };

  const renderLyricLine = (line, index) => {
    const isActive = index === activeIndex;

    const englishStyle = [
      styles.lyricEnglish,
      isActive && styles.textActive,
    ];

    return (
      <Pressable
        key={index}
        ref={(r) => { itemRefs.current[index] = r; }}
        onLayout={(e) => { itemYOffsets.current[index] = e.nativeEvent.layout.y; }}
        onPress={() => seekToLine(line.time_ms)}
        style={({ pressed }) => [
          styles.lyricLine,
          isActive && styles.lyricLineActive,
          pressed && styles.lyricLinePressed,
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

  // ── Dev tools (dev builds only) ──────────────────────────────────────────────

  const devTools = __DEV__ ? (
    <>
      <DebugOverlay
        providerId={provider.id}
        track={currentTrack}
        activeIndex={activeIndex}
        lineCount={lines.length}
        status={status}
        lastError={lastError}
        lyricsError={lyricsError}
        top={insets.top + 72}
        onPress={openDevMenu}
      />
      <DevMenu visible={devMenuVisible} onClose={() => setDevMenuVisible(false)} />
    </>
  ) : null;

  // ── Empty state ───────────────────────────────────────────────────────────────

  if (!currentTrack) {
    return (
      <Pressable style={styles.emptyContainer} onLongPress={openDevMenu} delayLongPress={600}>
        <Text style={styles.emptyText}>פתח את ספוטיפיי והתחל להאזין</Text>
        <Text style={styles.emptySubtext}>PsychoLyrics יסנכרן אוטומטית</Text>
        {devTools}
      </Pressable>
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
          <Pressable style={styles.trackInfo} onLongPress={openDevMenu} delayLongPress={600}>
            <Text style={styles.trackName} numberOfLines={1}>{currentTrack.track_name}</Text>
            <Text style={styles.artistName} numberOfLines={1}>{currentTrack.artist}</Text>
          </Pressable>
          {allSongWords.length > 0 && (
            <Pressable
              onPress={() => setWordsModalVisible(true)}
              style={({ pressed }) => [styles.wordsPill, pressed && { opacity: 0.75 }]}
            >
              <Text style={styles.wordsPillLabel}>{allSongWords.length} מילים</Text>
            </Pressable>
          )}
          {provider.openApp && (
            <Pressable
              onPress={provider.openApp}
              style={({ pressed }) => [styles.spotifyIconBtn, pressed && { opacity: 0.75 }]}
            >
              <SpotifyIcon size={22} color="#fff" />
              {currentTrack.is_playing && (
                <Animated.View style={[styles.spotifyDot, { opacity: pulseAnim }]} />
              )}
            </Pressable>
          )}
        </View>
      </View>

      {/* Lyrics area */}
      <View style={styles.lyricsArea}>
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
      </View>

      {/* Word card */}
      <WordCard
        lyricContext={activeLyricContext}
        onWordTap={(wordData) => recordWordTap(wordData)}
      />

      <PlaybackControls currentTrack={currentTrack} controls={provider.controls} />

      <SongWordsSheet
        visible={sheetVisible}
        words={sheetWords}
        onAdd={(wordData) => recordWordFlag(wordData.word, null, null, wordData.hebrewShort)}
        onDismiss={() => setSheetVisible(false)}
      />

      {/* Psychometric words modal */}
      <Modal
        visible={wordsModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setWordsModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setWordsModalVisible(false)} />
        <SafeAreaView style={styles.wordsSheet}>
          <View style={styles.wordsSheetHandle} />
          <View style={styles.wordsSheetHeader}>
            <Pressable onPress={() => setWordsModalVisible(false)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={styles.wordsSheetClose}>✕</Text>
            </Pressable>
            <Text style={styles.wordsSheetTitle}>{`מילים פסיכומטריות בשיר (${allSongWords.length})`}</Text>
          </View>
          <SongWordsList
            words={allSongWords}
            onWordPress={(word) => { setWordsModalVisible(false); setSelectedWord({ ...word, lyricContext: null }); }}
            flaggedWordSet={flaggedWordSet}
            onWordFocus={(wordData) => recordWordFlag(wordData.word, null, null, wordData.hebrewShort)}
          />
        </SafeAreaView>
      </Modal>

      {devTools}
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
  wordsPill: {
    marginLeft: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  wordsPillLabel: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  spotifyIconBtn: {
    marginLeft: 8,
    padding: 4,
  },
  spotifyDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.colors.accent,
  },
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


  // ── Lyrics area ──────────────────────────────────────────────────────────────
  lyricsArea: { flex: 1 },

  // ── Words modal ──────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  wordsSheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  wordsSheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 12,
  },
  wordsSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  wordsSheetClose: {
    color: theme.colors.muted,
    fontSize: 18,
    padding: 4,
  },
  wordsSheetTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
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
  lyricLinePressed: {
    backgroundColor: 'rgba(124,106,247,0.15)',
    borderRadius: 8,
  },
  lyricEnglish: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'left',
    lineHeight: 26,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  lyricHebrew: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
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
