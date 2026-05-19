import React, { useRef, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  ScrollView, PanResponder, ActivityIndicator,
} from 'react-native';
import useWordStore from '../store/useWordStore';
import { psychometricWordMap } from '../utils/psychometricWords';
import { useWordTracking } from '../hooks/useWordTracking';
import { auth } from '../firebase';
import { theme } from '../styles/theme';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const FREQ_COLOR = { HIGH: '#F76A8A', MEDIUM: '#FFC832', LOW: '#6AF7C8' };
const FREQ_BG = {
  HIGH: 'rgba(247,106,138,0.15)',
  MEDIUM: 'rgba(255,200,50,0.15)',
  LOW: 'rgba(106,247,200,0.15)',
};
const FREQ_LABEL = { HIGH: 'נפוץ', MEDIUM: 'בינוני', LOW: 'נדיר' };

export default function WordDetailModal() {
  const { selectedWord, closeModal, setSelectedWord } = useWordStore();
  const { recordWordFlag } = useWordTracking();
  const [added, setAdded] = useState(false);
  const [wordTranslation, setWordTranslation] = useState(null);
  const [translationLoading, setTranslationLoading] = useState(false);

  const isPsychometric = !!(selectedWord?.frequencyTier || selectedWord?.hebrewShort || selectedWord?.hebrewFull);

  useEffect(() => {
    setAdded(false);
    setWordTranslation(null);
    if (!selectedWord?.word || isPsychometric) return;

    let cancelled = false;
    setTranslationLoading(true);

    (async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;
        const token = await user.getIdToken();
        const res = await fetch(`${BACKEND_URL}/translateWord`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ word: selectedWord.word }),
        });
        if (!cancelled && res.ok) {
          const data = await res.json();
          const translation = data.translation || null;
          setWordTranslation(translation);
        }
      } catch (err) {
        console.warn('translateWord error:', err.message);
      } finally {
        if (!cancelled) setTranslationLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [selectedWord?.word, isPsychometric]);

  // Swipe-down to close
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dy }) => dy > 8,
      onPanResponderRelease: (_, { dy }) => {
        if (dy > 80) closeModal();
      },
    })
  ).current;

  if (!selectedWord?.word) return null;

  const freq = selectedWord.frequencyTier;
  const lyricContext = selectedWord.lyricContext || null;

  const handleSynonymTap = (syn) => {
    const synWord = psychometricWordMap.get(syn.toLowerCase());
    if (synWord) setSelectedWord({ ...synWord, lyricContext });
  };

  return (
    <Modal
      visible={!!selectedWord}
      animationType="slide"
      transparent={true}
      onRequestClose={closeModal}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Drag handle — pan responder target */}
          <View {...panResponder.panHandlers} style={styles.dragArea}>
            <View style={styles.handle} />
          </View>

          {/* Header — word + close button */}
          <View style={styles.header}>
            <Text style={styles.wordTitle} numberOfLines={1} adjustsFontSizeToFit>
              {selectedWord.word}
            </Text>
            <TouchableOpacity onPress={closeModal} style={styles.closeBtn} activeOpacity={0.7}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* IPA + pos + freq badge */}
          <View style={styles.metaRow}>
            {selectedWord.ipa ? (
              <Text style={styles.ipaText}>/{selectedWord.ipa}/</Text>
            ) : null}
            {selectedWord.partOfSpeech ? (
              <Text style={styles.posText}>{selectedWord.partOfSpeech}</Text>
            ) : null}
            {freq ? (
              <View style={[styles.badge, { borderColor: FREQ_COLOR[freq], backgroundColor: FREQ_BG[freq] }]}>
                <Text style={[styles.badgeText, { color: FREQ_COLOR[freq] }]}>{FREQ_LABEL[freq] ?? freq}</Text>
              </View>
            ) : null}
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Hebrew definition — psychometric words show dictionary def; others show fetched translation */}
            {isPsychometric ? (
              <Text style={styles.defText}>{selectedWord.hebrewFull || selectedWord.hebrewShort}</Text>
            ) : translationLoading ? (
              <ActivityIndicator color={theme.colors.accent} style={{ marginBottom: 18 }} />
            ) : wordTranslation ? (
              <Text style={styles.defText}>{wordTranslation}</Text>
            ) : null}

            {/* Lyric context box */}
            {lyricContext?.text ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>מתוך השיר</Text>
                <Text style={styles.contextEnglish}>"{lyricContext.text}"</Text>
                {lyricContext.translation ? (
                  <Text style={styles.contextHebrew}>{lyricContext.translation}</Text>
                ) : null}
              </View>
            ) : null}

            {/* Example sentence */}
            {selectedWord.exampleSentence ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>דוגמה</Text>
                <Text style={styles.exampleText}>{selectedWord.exampleSentence}</Text>
              </View>
            ) : null}

            {/* Synonyms */}
            {selectedWord.synonyms?.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>מילים נרדפות</Text>
                <View style={styles.chipsRow}>
                  {selectedWord.synonyms.map((syn, idx) => {
                    const isInDict = psychometricWordMap.has(syn.toLowerCase());
                    return (
                      <TouchableOpacity
                        key={idx}
                        onPress={() => handleSynonymTap(syn)}
                        style={[styles.chip, isInDict && styles.chipHighlighted]}
                        activeOpacity={0.7}
                        disabled={!isInDict}
                      >
                        <Text style={[styles.chipText, isInDict && styles.chipTextHighlighted]}>
                          {syn}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {!isPsychometric && (
              <TouchableOpacity
                style={[styles.addBtn, added && styles.addBtnDone]}
                activeOpacity={0.7}
                onPress={() => {
                  if (added) return;
                  recordWordFlag(
                    selectedWord.word,
                    selectedWord.lyricContext,
                    { trackName: selectedWord.trackName, artistName: selectedWord.artistName },
                    wordTranslation
                  );
                  setAdded(true);
                }}
              >
                <Text style={[styles.addBtnText, added && styles.addBtnTextDone]}>
                  {added ? 'נוסף למילון ✓' : 'הוסף למילון'}
                </Text>
              </TouchableOpacity>
            )}

            <View style={styles.bottomSpacer} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.surface2,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    maxHeight: '85%',
  },
  dragArea: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
    paddingTop: 4,
  },
  wordTitle: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: '700',
    flex: 1,
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  closeBtnText: {
    color: theme.colors.text,
    fontSize: 16,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexWrap: 'wrap',
  },
  ipaText: {
    color: theme.colors.muted,
    fontSize: 13,
    fontFamily: 'monospace',
  },
  posText: {
    color: theme.colors.accentGreen,
    fontSize: 13,
    fontStyle: 'italic',
  },
  badge: {
    paddingHorizontal: 10,
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
  scroll: {
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  scrollContent: {
    padding: 20,
  },
  defText: {
    color: theme.colors.text,
    fontSize: 19,
    textAlign: 'right',
    lineHeight: 28,
    marginBottom: 16,
    fontWeight: '500',
  },
  section: {
    backgroundColor: '#121212',
    padding: 14,
    borderRadius: theme.radii.md,
    marginBottom: 10,
  },
  sectionLabel: {
    color: theme.colors.muted,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 8,
    textAlign: 'right',
    fontWeight: '600',
  },
  contextEnglish: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'left',
    lineHeight: 22,
    marginBottom: 6,
  },
  contextHebrew: {
    color: theme.colors.muted,
    fontSize: 13,
    textAlign: 'right',
    lineHeight: 20,
  },
  exampleText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    textAlign: 'left',
    lineHeight: 22,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  chipHighlighted: {
    backgroundColor: theme.colors.highlight,
    borderColor: theme.colors.highlightBorder,
  },
  chipText: {
    color: theme.colors.muted,
    fontSize: 13,
  },
  chipTextHighlighted: {
    color: theme.colors.accent,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 32,
  },
  addBtn: {
    marginTop: 16,
    backgroundColor: theme.colors.accent,
    borderRadius: 500,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addBtnDone: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  addBtnText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '700',
  },
  addBtnTextDone: {
    color: theme.colors.muted,
    fontWeight: '600',
  },
});
