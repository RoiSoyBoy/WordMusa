import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import useWordStore from '../store/useWordStore';

export default function WordCard() {
  const { activeWords, setSelectedWord, incrementEncounter } = useWordStore();

  // Move the null/undefined guard for activeWords to the very top of the WordCard component 
  // (before any access to activeWords.length or any hooks that derive state)
  if (!activeWords || activeWords.length === 0) {
    return null; // Don't show if no active words
  }

  const [currentIndex, setCurrentIndex] = useState(0);

  // bounds check for currentIndex
  const safeIndex = (currentIndex >= 0 && currentIndex < activeWords.length) ? currentIndex : 0;
  
  useEffect(() => {
    // Reset index when active words change
    setCurrentIndex(0);
    
    if (activeWords.length > 0) {
      // Increment encounter for the first word immediately
      incrementEncounter(activeWords[0].word.toLowerCase());
    }
  }, [activeWords, incrementEncounter]);

  useEffect(() => {
    if (activeWords.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        const nextIndex = prev + 1;
        return nextIndex >= activeWords.length ? 0 : nextIndex;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [activeWords.length]);

  // Separate effect to track encounters when index changes
  useEffect(() => {
    if (safeIndex > 0 && safeIndex < activeWords.length) {
      incrementEncounter(activeWords[safeIndex].word.toLowerCase());
    }
  }, [safeIndex, activeWords, incrementEncounter]);

  const currentWord = activeWords[safeIndex];
  if (!currentWord) return null;

  const frequencyColors = {
    HIGH: '#E22134',
    MEDIUM: '#F1C40F',
    LOW: '#2ECC71'
  };

  return (
    <TouchableOpacity 
      style={styles.cardContainer} 
      activeOpacity={0.8}
      onPress={() => setSelectedWord(currentWord)}
    >
      <View style={styles.headerRow}>
        <Text style={styles.wordText}>{currentWord.word}</Text>
        <View style={[styles.badge, { backgroundColor: frequencyColors[currentWord.frequency] || '#888' }]}>
          <Text style={styles.badgeText}>{currentWord.frequency}</Text>
        </View>
      </View>
      
      <View style={styles.subHeaderRow}>
        <Text style={styles.ipaText}>/{currentWord.ipa}/</Text>
        <Text style={styles.posText}>{currentWord.partOfSpeech}</Text>
      </View>

      <Text style={styles.defText}>{currentWord.hebrewDefinitionShort}</Text>
      
      {activeWords.length > 1 && (
        <View style={styles.dotsContainer}>
          {activeWords.map((_, idx) => (
            <View key={idx} style={[styles.dot, idx === safeIndex && styles.activeDot]} />
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#282828',
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  wordText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  subHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ipaText: {
    color: '#aaa',
    fontSize: 14,
    marginRight: 8,
  },
  posText: {
    color: '#1DB954',
    fontSize: 14,
    fontStyle: 'italic',
  },
  defText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'right',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#555',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#1DB954',
  }
});