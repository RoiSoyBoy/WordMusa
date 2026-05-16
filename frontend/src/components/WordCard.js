import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import useWordStore from '../store/useWordStore';
import { theme } from '../styles/theme';

const FREQ_COLOR = { HIGH: '#F76A8A', MEDIUM: '#FFC832', LOW: '#6AF7C8' };
const FREQ_BG = {
  HIGH: 'rgba(247,106,138,0.15)',
  MEDIUM: 'rgba(255,200,50,0.15)',
  LOW: 'rgba(106,247,200,0.15)',
};

export default function WordCard({ onWordTap, lyricContext }) {
  const { activeWords, setSelectedWord } = useWordStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const slideAnim = useRef(new Animated.Value(100)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Animate in/out when activeWords changes
  useEffect(() => {
    setCurrentIndex(0);
    if (activeWords.length > 0) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(100);
      fadeAnim.setValue(0);
    }
  }, [activeWords]);

  // Cycle through multiple words every 4 seconds
  useEffect(() => {
    if (activeWords.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % activeWords.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [activeWords]);

  if (!activeWords || activeWords.length === 0) return null;

  const safeIndex = currentIndex < activeWords.length ? currentIndex : 0;
  const word = activeWords[safeIndex];
  if (!word) return null;

  const freq = word.frequencyTier;

  return (
    <Animated.View
      style={[
        styles.card,
        { transform: [{ translateY: slideAnim }], opacity: fadeAnim },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => {
          setSelectedWord({ ...word, lyricContext });
          onWordTap?.(word);
        }}
      >
        <View style={styles.inner}>
          {/* Row 1 — word + frequency badge */}
          <View style={styles.headerRow}>
            <Text style={styles.wordText}>{word.word}</Text>
            <View style={styles.rightMeta}>
              {freq && (
                <View style={[styles.badge, { borderColor: FREQ_COLOR[freq], backgroundColor: FREQ_BG[freq] }]}>
                  <Text style={[styles.badgeText, { color: FREQ_COLOR[freq] }]}>{freq}</Text>
                </View>
              )}
              <Text style={styles.chevron}>›</Text>
            </View>
          </View>

          {/* Row 2 — IPA + part of speech */}
          <View style={styles.metaRow}>
            {word.ipa ? <Text style={styles.ipaText}>/{word.ipa}/</Text> : null}
            {word.partOfSpeech ? <Text style={styles.posText}>{word.partOfSpeech}</Text> : null}
          </View>

          {/* Row 3 — Hebrew short definition */}
          <Text style={styles.defText} numberOfLines={2}>
            {word.hebrewShort}
          </Text>

          {/* Pagination dots for multiple words */}
          {activeWords.length > 1 && (
            <View style={styles.dots}>
              {activeWords.map((_, idx) => (
                <View key={idx} style={[styles.dot, idx === safeIndex && styles.dotActive]} />
              ))}
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface2,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.accent,
    overflow: 'hidden',
  },
  inner: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  wordText: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  rightMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  chevron: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 20,
    lineHeight: 22,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 7,
  },
  ipaText: {
    color: theme.colors.muted,
    fontSize: 13,
    fontFamily: 'monospace',
  },
  posText: {
    color: theme.colors.accentGreen,
    fontSize: 12,
    fontStyle: 'italic',
    opacity: 0.85,
  },
  defText: {
    color: '#C8C4F0',
    fontSize: 15,
    textAlign: 'right',
    lineHeight: 22,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
    gap: 5,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  dotActive: {
    backgroundColor: theme.colors.accent,
    width: 14,
    borderRadius: 3,
  },
});
