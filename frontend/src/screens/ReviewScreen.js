import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  Animated, PanResponder, Dimensions, ActivityIndicator,
} from 'react-native';
import { TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { psychometricWordList } from '../utils/psychometricWords';
import { theme } from '../styles/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.32;

const STORAGE_FILTER_ON = 'FLASHCARD_FILTER_ON';
const STORAGE_WORDS_LEARNT = 'FLASHCARD_WORDS_LEARNT';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function levelColor(level) {
  if (level <= 3) return '#6AF7C8';
  if (level <= 6) return '#FFC832';
  return '#F76A8A';
}

const WORD_MAP = new Map(psychometricWordList.map(w => [w.word.toLowerCase(), w]));

export default function ReviewScreen() {
  const [focusWords, setFocusWords] = useState(null);
  const [queue, setQueue] = useState([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);
  const [filterKnown, setFilterKnown] = useState(false);
  const [asyncLoaded, setAsyncLoaded] = useState(false);

  const cardPosition = useRef(new Animated.ValueXY()).current;
  const flippedRef = useRef(false);
  const actionsRef = useRef({});
  const filterKnownRef = useRef(false);
  const wordsLearntRef = useRef(new Set());

  // Load filter preference and learnt words from AsyncStorage
  useEffect(() => {
    async function load() {
      const [filterVal, learntVal] = await Promise.all([
        AsyncStorage.getItem(STORAGE_FILTER_ON),
        AsyncStorage.getItem(STORAGE_WORDS_LEARNT),
      ]);
      filterKnownRef.current = filterVal === 'true';
      wordsLearntRef.current = learntVal ? new Set(JSON.parse(learntVal)) : new Set();
      setFilterKnown(filterKnownRef.current);
      setAsyncLoaded(true);
    }
    load();
  }, []);

  // Keep handler refs current every render
  actionsRef.current.flip = () => {
    flippedRef.current = !flippedRef.current;
    setFlipped(f => !f);
  };
  actionsRef.current.swipeOff = (direction) => {
    const toX = direction === 'right' ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5;
    Animated.timing(cardPosition, {
      toValue: { x: toX, y: 0 },
      duration: 280,
      useNativeDriver: false,
    }).start(() => {
      cardPosition.setValue({ x: 0, y: 0 });
      flippedRef.current = false;
      setFlipped(false);
      actionsRef.current.advance(direction === 'right');
    });
  };
  actionsRef.current.advance = (knew) => {
    if (knew) {
      const currentWord = queue[cardIndex];
      if (currentWord?.word && !wordsLearntRef.current.has(currentWord.word)) {
        wordsLearntRef.current.add(currentWord.word);
        AsyncStorage.setItem(
          STORAGE_WORDS_LEARNT,
          JSON.stringify([...wordsLearntRef.current])
        );
      }
      setCorrect(c => c + 1);
    }
    setCardIndex(i => {
      if (i + 1 >= queue.length) { setDone(true); return i; }
      return i + 1;
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 6 || Math.abs(g.dy) > 6,
      onPanResponderMove: Animated.event(
        [null, { dx: cardPosition.x, dy: cardPosition.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (_, g) => {
        if (g.dx > SWIPE_THRESHOLD || g.vx > 0.8) {
          actionsRef.current.swipeOff('right');
        } else if (g.dx < -SWIPE_THRESHOLD || g.vx < -0.8) {
          actionsRef.current.swipeOff('left');
        } else if (Math.abs(g.dx) < 8 && Math.abs(g.dy) < 8) {
          actionsRef.current.flip();
          Animated.spring(cardPosition, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
        } else {
          Animated.spring(cardPosition, {
            toValue: { x: 0, y: 0 },
            friction: 5,
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) { setFocusWords([]); return; }
    const q = query(
      collection(db, 'users', user.uid, 'wordHistory'),
      where('flagged', '==', true)
    );
    const unsub = onSnapshot(q, snap => {
      const words = snap.docs.map(d => {
        const data = d.data();
        const contexts = data.songContexts || [];
        const songContext = contexts.length > 0 ? contexts[contexts.length - 1] : null;
        const lookup = WORD_MAP.get(d.id);
        if (lookup) return { ...lookup, songContext };
        if (!data.word) return null;
        return {
          word: data.word,
          hebrewShort: data.flagContext?.wordTranslation || null,
          hebrewFull: null,
          partOfSpeech: null,
          level: null,
          frequencyTier: null,
          exampleSentence: null,
          songContext,
        };
      }).filter(Boolean);
      setFocusWords(words);
    }, () => setFocusWords([]));
    return unsub;
  }, []);

  // Wait for both focusWords and AsyncStorage before starting session
  useEffect(() => {
    if (focusWords?.length > 0 && asyncLoaded) startSession(focusWords);
  }, [focusWords, asyncLoaded]);

  function startSession(words) {
    const filtered = filterKnownRef.current
      ? words.filter(w => !wordsLearntRef.current.has(w.word))
      : words;
    setQueue(shuffle(filtered));
    setCardIndex(0);
    setFlipped(false);
    flippedRef.current = false;
    setCorrect(0);
    setDone(false);
    cardPosition.setValue({ x: 0, y: 0 });
  }

  function toggleFilter() {
    const newVal = !filterKnownRef.current;
    filterKnownRef.current = newVal;
    setFilterKnown(newVal);
    AsyncStorage.setItem(STORAGE_FILTER_ON, newVal ? 'true' : 'false');
    if (focusWords?.length > 0) startSession(focusWords);
  }

  // Animated values derived from card position
  const rotate = cardPosition.x.interpolate({
    inputRange: [-SCREEN_WIDTH, 0, SCREEN_WIDTH],
    outputRange: ['-20deg', '0deg', '20deg'],
    extrapolate: 'clamp',
  });
  const yesOpacity = cardPosition.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD * 0.6],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const noOpacity = cardPosition.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD * 0.6, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (focusWords === null || !asyncLoaded) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  // ── Empty (no focus words) ───────────────────────────────────────────────────
  if (focusWords.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>📚</Text>
          <Text style={styles.emptyTitle}>אין מילים לחזרה</Text>
          <Text style={styles.emptySubtitle}>
            הוסף מילים לרשימת הפוקוס מהמילון{'\n'}או מגיליון השיר
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Empty (all focus words are in wordsLearnt and filter is ON) ──────────────
  if (filterKnown && queue.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>🎉</Text>
          <Text style={styles.emptyTitle}>ידעת את כל המילים!</Text>
          <Text style={styles.emptySubtitle}>
            סימנת את כל מילות הפוקוס כ"ידועות"{'\n'}
            עבור ל"כל המילים" לתרגול מחדש
          </Text>
          <TouchableOpacity
            style={[styles.restartBtn, { marginTop: 28 }]}
            activeOpacity={0.7}
            onPress={() => {
              filterKnownRef.current = false;
              setFilterKnown(false);
              AsyncStorage.setItem(STORAGE_FILTER_ON, 'false');
              startSession(focusWords);
            }}
          >
            <Text style={styles.restartText}>כל המילים</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Done ─────────────────────────────────────────────────────────────────────
  if (done) {
    const total = queue.length;
    const pct = Math.round((correct / total) * 100);
    const scoreColor = pct >= 70 ? theme.colors.accentGreen : pct >= 40 ? '#FFC832' : theme.colors.accentPink;
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={[styles.doneScore, { color: scoreColor }]}>{pct}%</Text>
          <Text style={styles.doneTitle}>ידעת {correct} מתוך {total} מילים</Text>
          <TouchableOpacity
            style={styles.restartBtn}
            activeOpacity={0.7}
            onPress={() => startSession(focusWords)}
          >
            <Text style={styles.restartText}>שחק שוב</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Main ─────────────────────────────────────────────────────────────────────
  const card = queue[cardIndex];
  const color = card?.level ? levelColor(card.level) : theme.colors.muted;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.progress}>{cardIndex + 1} / {queue.length}</Text>
        <TouchableOpacity
          style={[styles.filterPill, filterKnown && styles.filterPillActive]}
          activeOpacity={0.7}
          onPress={toggleFilter}
        >
          <Text style={[styles.filterPillText, filterKnown && styles.filterPillTextActive]}>
            {filterKnown ? 'מילים שאני עדיין לא יודע' : 'כל המילים'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBg}>
        <View style={[styles.progressFill, { width: `${(cardIndex / queue.length) * 100}%` }]} />
      </View>

      {/* Swipe hints */}
      <View style={styles.hintsRow}>
        <Text style={styles.hintLeft}>← עוד לא</Text>
        <Text style={styles.hintRight}>ידעתי →</Text>
      </View>

      {/* Card */}
      <Animated.View
        style={[
          styles.card,
          {
            transform: [
              { translateX: cardPosition.x },
              { translateY: cardPosition.y },
              { rotate },
            ],
          },
        ]}
        {...panResponder.panHandlers}
      >
        {/* "ידעתי" overlay (right swipe) */}
        <Animated.View style={[styles.swipeLabel, styles.swipeLabelYes, { opacity: yesOpacity }]}>
          <Text style={styles.swipeLabelTextYes}>ידעתי ✓</Text>
        </Animated.View>

        {/* "עוד לא" overlay (left swipe) */}
        <Animated.View style={[styles.swipeLabel, styles.swipeLabelNo, { opacity: noOpacity }]}>
          <Text style={styles.swipeLabelTextNo}>עוד לא ✗</Text>
        </Animated.View>

        {!flipped ? (
          /* Front */
          <View style={styles.cardInner}>
            <View style={[styles.levelBadge, { backgroundColor: `${color}22` }]}>
              <Text style={[styles.levelBadgeText, { color }]}>רמה {card?.level}</Text>
            </View>
            <Text style={styles.wordEn}>{card?.word}</Text>
            {card?.songContext?.trackName ? (
              <Text style={styles.songContext}>♪  {card.songContext.trackName}</Text>
            ) : null}
            <Text style={styles.pos}>{card?.partOfSpeech}</Text>
            <Text style={styles.tapHint}>הקש לגלות • החלק לתשובה</Text>
          </View>
        ) : (
          /* Back */
          <View style={styles.cardInner}>
            <Text style={styles.wordEnSmall}>{card?.word}</Text>
            <Text style={styles.wordHe}>{card?.hebrewShort}</Text>
            {card?.hebrewFull ? (
              <Text style={styles.wordHeFull}>{card.hebrewFull}</Text>
            ) : null}
            {card?.exampleSentence ? (
              <Text style={styles.example}>"{card.exampleSentence}"</Text>
            ) : null}
            <Text style={styles.tapHint}>החלק ימינה — ידעתי  •  שמאלה — עוד לא</Text>
          </View>
        )}
      </Animated.View>

      {/* Tap buttons (alternative to swiping) */}
      <View style={styles.btnRow}>
        <TouchableOpacity
          style={styles.noBtn}
          activeOpacity={0.7}
          onPress={() => actionsRef.current.swipeOff('left')}
        >
          <Text style={styles.noBtnText}>✗</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.flipBtn}
          activeOpacity={0.7}
          onPress={() => actionsRef.current.flip()}
        >
          <Text style={styles.flipBtnText}>הפוך</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.yesBtn}
          activeOpacity={0.7}
          onPress={() => actionsRef.current.swipeOff('right')}
        >
          <Text style={styles.yesBtnText}>✓</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  screenTitle: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  progress: { color: theme.colors.muted, fontSize: 13, fontWeight: '500' },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  filterPillActive: {
    borderColor: theme.colors.accent,
    backgroundColor: `${theme.colors.accent}22`,
  },
  filterPillText: { color: theme.colors.muted, fontSize: 11, fontWeight: '600' },
  filterPillTextActive: { color: theme.colors.accent },
  progressBg: {
    height: 2,
    backgroundColor: theme.colors.surface2,
    marginHorizontal: theme.spacing.md,
    borderRadius: 1,
    marginBottom: theme.spacing.sm,
  },
  progressFill: {
    height: 2,
    backgroundColor: theme.colors.accent,
    borderRadius: 1,
  },
  hintsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.sm,
  },
  hintLeft: { color: 'rgba(255,255,255,0.2)', fontSize: 11 },
  hintRight: { color: 'rgba(255,255,255,0.2)', fontSize: 11 },
  card: {
    flex: 1,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
  },
  swipeLabel: {
    position: 'absolute',
    top: 28,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 2,
    zIndex: 10,
  },
  swipeLabelYes: {
    right: 20,
    borderColor: theme.colors.accent,
    backgroundColor: 'rgba(29,185,84,0.1)',
    transform: [{ rotate: '12deg' }],
  },
  swipeLabelNo: {
    left: 20,
    borderColor: theme.colors.accentPink,
    backgroundColor: 'rgba(247,106,138,0.1)',
    transform: [{ rotate: '-12deg' }],
  },
  swipeLabelTextYes: { color: theme.colors.accent, fontSize: 16, fontWeight: '800' },
  swipeLabelTextNo: { color: theme.colors.accentPink, fontSize: 16, fontWeight: '800' },
  levelBadge: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: theme.spacing.sm,
  },
  levelBadgeText: { fontSize: 11, fontWeight: '700' },
  wordEn: {
    color: theme.colors.text,
    fontSize: 40,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  songContext: { color: theme.colors.muted, fontSize: 12, textAlign: 'center', opacity: 0.65 },
  pos: { color: theme.colors.muted, fontSize: 13, fontStyle: 'italic' },
  tapHint: {
    color: 'rgba(179,179,179,0.35)',
    fontSize: 11,
    marginTop: theme.spacing.xl,
    textAlign: 'center',
  },
  wordEnSmall: {
    color: theme.colors.muted,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
  },
  wordHe: {
    color: theme.colors.text,
    fontSize: 34,
    fontWeight: '800',
    textAlign: 'center',
  },
  wordHeFull: {
    color: theme.colors.muted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
    marginTop: 4,
  },
  example: {
    color: 'rgba(179,179,179,0.55)',
    fontSize: 13,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 20,
    marginTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    gap: theme.spacing.md,
  },
  noBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  yesBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flipBtn: {
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 500,
    backgroundColor: theme.colors.surface2,
  },
  noBtnText: { color: theme.colors.text, fontSize: 20, fontWeight: '700' },
  yesBtnText: { color: '#000000', fontSize: 20, fontWeight: '700' },
  flipBtnText: { color: theme.colors.text, fontSize: 14, fontWeight: '600' },
  // Empty / done
  emptyIcon: { fontSize: 44, marginBottom: theme.spacing.md },
  emptyTitle: { color: theme.colors.text, fontSize: 19, fontWeight: '700', textAlign: 'center', marginBottom: theme.spacing.sm },
  emptySubtitle: { color: theme.colors.muted, fontSize: 14, textAlign: 'center', lineHeight: 22 },
  doneScore: { fontSize: 68, fontWeight: '900', marginBottom: theme.spacing.sm, letterSpacing: -1 },
  doneTitle: { color: theme.colors.muted, fontSize: 16, fontWeight: '500', marginBottom: theme.spacing.xl, textAlign: 'center' },
  restartBtn: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 500,
  },
  restartText: { color: '#000000', fontSize: 16, fontWeight: '700' },
});
