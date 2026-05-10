import React, { useRef } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  ScrollView, PanResponder,
} from 'react-native';
import useWordStore from '../store/useWordStore';
import { psychometricWordMap } from '../utils/psychometricWords';

const FREQ_COLOR = { HIGH: '#F76A8A', MEDIUM: '#FFC832', LOW: '#6AF7C8' };
const FREQ_BG = {
  HIGH: 'rgba(247,106,138,0.15)',
  MEDIUM: 'rgba(255,200,50,0.15)',
  LOW: 'rgba(106,247,200,0.15)',
};

export default function WordDetailModal() {
  const { selectedWord, closeModal, setSelectedWord } = useWordStore();

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
                <Text style={[styles.badgeText, { color: FREQ_COLOR[freq] }]}>{freq}</Text>
              </View>
            ) : null}
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Full Hebrew definition */}
            <Text style={styles.defText}>{selectedWord.hebrewFull || selectedWord.hebrewShort}</Text>

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
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#13131A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  dragArea: {
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 6,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 6,
  },
  wordTitle: {
    color: '#F0EEFF',
    fontSize: 30,
    fontWeight: '700',
    flex: 1,
    letterSpacing: 0.3,
  },
  closeBtn: {
    padding: 8,
    marginLeft: 8,
  },
  closeBtnText: {
    color: '#7A7A9A',
    fontSize: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 14,
    flexWrap: 'wrap',
  },
  ipaText: {
    color: '#7A7A9A',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  posText: {
    color: '#6AF7C8',
    fontSize: 14,
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
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  scrollContent: {
    padding: 20,
  },
  defText: {
    color: '#F0EEFF',
    fontSize: 20,
    textAlign: 'right',
    lineHeight: 30,
    marginBottom: 18,
  },
  section: {
    backgroundColor: '#1C1C28',
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  sectionLabel: {
    color: '#7A7A9A',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    textAlign: 'right',
  },
  contextEnglish: {
    color: '#C8C2FF',
    fontSize: 15,
    fontStyle: 'italic',
    textAlign: 'left',
    lineHeight: 22,
    marginBottom: 6,
  },
  contextHebrew: {
    color: '#9890CC',
    fontSize: 13,
    textAlign: 'right',
    lineHeight: 20,
  },
  exampleText: {
    color: '#C8C2FF',
    fontSize: 15,
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
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  chipHighlighted: {
    backgroundColor: 'rgba(124,106,247,0.15)',
    borderColor: 'rgba(124,106,247,0.35)',
  },
  chipText: {
    color: '#7A7A9A',
    fontSize: 14,
  },
  chipTextHighlighted: {
    color: '#7C6AF7',
  },
  bottomSpacer: {
    height: 32,
  },
});
