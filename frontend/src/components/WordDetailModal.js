import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Switch } from 'react-native';
import useWordStore from '../store/useWordStore';
import usePlayerStore from '../store/usePlayerStore';

export default function WordDetailModal() {
  const { selectedWord, closeModal, userProgress, toggleReviewList, setSelectedWord, dictionary } = useWordStore();
  const { lyrics } = usePlayerStore();

if (!selectedWord || !selectedWord.word) return null;
  const wordStr = selectedWord.word.toLowerCase();
  const progress = userProgress[wordStr] || {};
  const isSaved = progress.savedToReview || false;

  // Find lyric context if possible
  let lyricContext = '';
  if (lyrics) {
    const lineWithWord = lyrics.find(l => l.english?.toLowerCase().includes(wordStr));    if (lineWithWord) {
      lyricContext = lineWithWord.english;
    }
  }

  const handleSynonymTap = (syn) => {
    const synWord = dictionary[syn.toLowerCase()];
    if (synWord) {
      setSelectedWord(synWord);
    }
  };

  return (
    <Modal
      visible={!!selectedWord}
      animationType="slide"
      transparent={true}
      onRequestClose={closeModal}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          
          <View style={styles.header}>
            <Text style={styles.wordTitle}>{selectedWord.word}</Text>
            <TouchableOpacity onPress={closeModal} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea}>
            <View style={styles.subHeader}>
              <Text style={styles.ipaText}>/{selectedWord.ipa}/</Text>
              <Text style={styles.posText}>{selectedWord.partOfSpeech}</Text>
            </View>

            <Text style={styles.defText}>{selectedWord.hebrewDefinitionFull}</Text>
            
            {lyricContext ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>In Lyrics</Text>
                <Text style={styles.contextText}>"{lyricContext}"</Text>
              </View>
            ) : null}

            {selectedWord.exampleSentence ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Example</Text>
                <Text style={styles.contextText}>{selectedWord.exampleSentence}</Text>
              </View>
            ) : null}

            {selectedWord.synonyms && selectedWord.synonyms.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Synonyms</Text>
                <View style={styles.synonymsContainer}>
                  {selectedWord.synonyms.map((syn, idx) => (
                    <TouchableOpacity key={idx} onPress={() => handleSynonymTap(syn)}>
                      <Text style={styles.synonymText}>{syn}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.toggleRow}>
              <Text style={styles.toggleText}>Add to review list</Text>
              <Switch 
                value={isSaved} 
                onValueChange={() => toggleReviewList(wordStr)}
                trackColor={{ false: '#767577', true: '#1DB954' }}
                thumbColor={'#fff'}
              />
            </View>
            
            <View style={styles.statsRow}>
              <Text style={styles.statsText}>Encounters: {progress.encounterCount ?? 0}</Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1e1e1e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  wordTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  closeBtn: {
    padding: 8,
  },
  closeBtnText: {
    color: '#aaa',
    fontSize: 24,
  },
  scrollArea: {
    marginBottom: 20,
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  ipaText: {
    color: '#aaa',
    fontSize: 16,
    marginRight: 10,
  },
  posText: {
    color: '#1DB954',
    fontSize: 16,
    fontStyle: 'italic',
  },
  defText: {
    color: '#fff',
    fontSize: 20,
    textAlign: 'right',
    marginBottom: 20,
  },
  section: {
    backgroundColor: '#282828',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#aaa',
    fontSize: 12,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  contextText: {
    color: '#ddd',
    fontSize: 16,
    fontStyle: 'italic',
  },
  synonymsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  synonymText: {
    color: '#1DB954',
    fontSize: 16,
    marginRight: 12,
    marginBottom: 8,
    textDecorationLine: 'underline',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  toggleText: {
    color: '#fff',
    fontSize: 16,
  },
  statsRow: {
    marginTop: 10,
  },
  statsText: {
    color: '#888',
    fontSize: 14,
  }
});
