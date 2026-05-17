import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView,
  Animated, PanResponder, Dimensions, ActivityIndicator,
} from 'react-native';
import { TouchableOpacity } from 'react-native';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { psychometricWordList } from '../utils/psychometricWords';
import { theme } from '../styles/theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.32;

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

  const cardPosition = useRef(new Animated.ValueXY()).current;
  const flippedRef = useRef(false);
  // Handler refs to avoid stale closures inside PanResponder
  const actionsRef = useRef({});

  // Keep handler refs current every render
  actionsRef.current.flip = () => {
    if (flippedRef.current) return;
    flippedRef.current = true;
    setFlipped(true);
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
    if (knew) setCorrect(c => c + 1);
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
      const words = snap.docs.map(d => WORD_MAP.get(d.id)).filter(Boolean);
      setFocusWords(words);
    }, () => setFocusWords([]));
    return unsub;
  }, []);

  useEffect(() => {
    if (focusWords?.length > 0) startSession(focusWords);
  }, [focusWords]);

  function startSession(words) {
    setQueue(shuffle(words));
    setCardIndex(0);
    setFlipped(false);
    flippedRef.current = false;
    setCorrect(0);
    setDone(false);
    cardPosition.setValue({ x: 0, y: 0 });
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
  if (focusWords === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  // ── Empty ────────────────────────────────────────────────────────────────────
  if (focusWords.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.screenTitle}>חזרה</Text>
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

  // ── Done ─────────────────────────────────────────────────────────────────────
  if (done) {
    const total = queue.length;
    const pct = Math.round((correct / total) * 100);
    const scoreColor = pct >= 70 ? theme.colors.accentGreen : pct >= 40 ? '#FFC832' : theme.colors.accentPink;
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.screenTitle}>חזרה</Text>
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
        <Text style={styles.screenTitle}>חזרה</Text>
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
    fontSize: 22,
    fontWeight: '800',
  },
  progress: { color: theme.colors.muted, fontSize: 14, fontWeight: '500' },
  progressBg: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginHorizontal: theme.spacing.md,
    borderRadius: 2,
    marginBottom: theme.spacing.sm,
  },
  progressFill: {
    height: 3,
    backgroundColor: theme.colors.accent,
    borderRadius: 2,
  },
  hintsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xl,
    marginBottom: theme.spacing.sm,
  },
  hintLeft: { color: 'rgba(247,106,138,0.4)', fontSize: 12 },
  hintRight: { color: 'rgba(106,247,200,0.4)', fontSize: 12 },
  card: {
    flex: 1,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
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
    top: 32,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 3,
    zIndex: 10,
  },
  swipeLabelYes: {
    right: 24,
    borderColor: theme.colors.accentGreen,
    backgroundColor: 'rgba(106,247,200,0.1)',
    transform: [{ rotate: '12deg' }],
  },
  swipeLabelNo: {
    left: 24,
    borderColor: theme.colors.accentPink,
    backgroundColor: 'rgba(247,106,138,0.1)',
    transform: [{ rotate: '-12deg' }],
  },
  swipeLabelTextYes: { color: theme.colors.accentGreen, fontSize: 18, fontWeight: '900' },
  swipeLabelTextNo: { color: theme.colors.accentPink, fontSize: 18, fontWeight: '900' },
  levelBadge: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: theme.spacing.sm,
  },
  levelBadgeText: { fontSize: 12, fontWeight: '700' },
  wordEn: {
    color: theme.colors.text,
    fontSize: 42,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  pos: { color: theme.colors.muted, fontSize: 14, fontStyle: 'italic' },
  tapHint: {
    color: 'rgba(122,122,154,0.45)',
    fontSize: 12,
    marginTop: theme.spacing.xl,
    textAlign: 'center',
  },
  wordEnSmall: {
    color: theme.colors.muted,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
  },
  wordHe: {
    color: theme.colors.text,
    fontSize: 36,
    fontWeight: '800',
    textAlign: 'center',
  },
  wordHeFull: {
    color: theme.colors.muted,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 4,
  },
  example: {
    color: 'rgba(122,122,154,0.65)',
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
    backgroundColor: 'rgba(247,106,138,0.12)',
    borderWidth: 2,
    borderColor: 'rgba(247,106,138,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  yesBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(106,247,200,0.12)',
    borderWidth: 2,
    borderColor: 'rgba(106,247,200,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flipBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.surface2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  noBtnText: { color: theme.colors.accentPink, fontSize: 22, fontWeight: '700' },
  yesBtnText: { color: theme.colors.accentGreen, fontSize: 22, fontWeight: '700' },
  flipBtnText: { color: theme.colors.muted, fontSize: 14, fontWeight: '600' },
  // Empty / done
  emptyIcon: { fontSize: 48, marginBottom: theme.spacing.md },
  emptyTitle: { color: theme.colors.text, fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: theme.spacing.sm },
  emptySubtitle: { color: theme.colors.muted, fontSize: 14, textAlign: 'center', lineHeight: 22 },
  doneScore: { fontSize: 72, fontWeight: '900', marginBottom: theme.spacing.sm },
  doneTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '600', marginBottom: theme.spacing.xl },
  restartBtn: { backgroundColor: theme.colors.accent, paddingHorizontal: 32, paddingVertical: 14, borderRadius: theme.radii.lg },
  restartText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
