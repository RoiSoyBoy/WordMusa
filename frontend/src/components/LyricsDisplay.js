import React, { useRef, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import usePlayerStore from '../store/usePlayerStore';
import useWordStore from '../store/useWordStore';
import { scanLineForWords } from '../utils/wordScanner';
import { auth } from '../firebase';

const LINE_ITEM_HEIGHT = 60;

export default function LyricsDisplay() {
  const { dictionary, setActiveWords, userProgress, setSelectedWord } = useWordStore();

  const { 
    lyrics, 
    isFetchingLyrics, 
    isTranslating, 
    lyricsError, 
    positionMs,
    trackId,
    trackName,
    networkOffline
  } = usePlayerStore();
  
  const scrollViewRef = useRef(null);
  const [currentLineIndex, setCurrentLineIndex] = useState(-1);
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const localPositionRef = useRef(0);
  const lastPollTimeRef = useRef(Date.now());
  const initialJumpDone = useRef(false);

  // Track if we've initiated a fetch to avoid flashing "not found"
  useEffect(() => {
    if (isFetchingLyrics) {
      setHasFetched(true);
    }
  }, [isFetchingLyrics]);

  useEffect(() => {
    setHasFetched(false);
  }, [trackId]);

  // Sync local position with store
  useEffect(() => {
    localPositionRef.current = positionMs;
    lastPollTimeRef.current = Date.now();
  }, [positionMs]);

  // Sync Loop
  useEffect(() => {
    const interval = setInterval(() => {
      const state = usePlayerStore.getState();
      const currentLyrics = state.lyrics;
      
      if (!currentLyrics || currentLyrics.length === 0) return;

      const { isPlaying, isScrubbing, isLooping, isPausedByDelta } = state;
      
      let extrapolatedPosition = localPositionRef.current;
      if (isPlaying && !isPausedByDelta) {
        extrapolatedPosition += (Date.now() - lastPollTimeRef.current);
      }

      let newIndex = -1;
      for (let i = 0; i < currentLyrics.length; i++) {
        if (extrapolatedPosition >= currentLyrics[i].time_ms) {
          newIndex = i;
        } else {
          break;
        }
      }

      setCurrentLineIndex((prevIndex) => {
        if (newIndex !== prevIndex) {
          if (newIndex >= 0 && currentLyrics[newIndex]) {
            const lineTokens = scanLineForWords(currentLyrics[newIndex].english, dictionary);
            const matchedWords = lineTokens.filter(t => t.isMatch).map(t => t.wordData);
            useWordStore.getState().setActiveWords(matchedWords);
          } else {
            useWordStore.getState().setActiveWords([]);
          }

          if (scrollViewRef.current && newIndex >= 0) {
            let animated = true;
            if (!initialJumpDone.current || isScrubbing) {
              animated = false;
              initialJumpDone.current = true;
            }
            if (isLooping && newIndex === 0) {
              scrollViewRef.current.scrollTo({ y: 0, animated: false });
            } else {
              scrollViewRef.current.scrollTo({ y: Math.max(0, newIndex * LINE_ITEM_HEIGHT - 120), animated });
            }
          }
          return newIndex;
        }
        return prevIndex;
      });
      
    }, 200);

    return () => clearInterval(interval);
  }, []);

  const handleReport = async () => {
    if (reported || reporting) return;
    setReporting(true);
    try {
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }
      const token = await auth.currentUser.getIdToken();
      await fetch(`${process.env.REACT_APP_API_URL || ''}/tracksMissing`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ track_id: trackId, track_name: trackName })
      });
      setReported(true);
    } catch (e) {
      console.error(e);
    }
    setReporting(false);
  };

  if (isFetchingLyrics) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1DB954" />
        <Text style={styles.loadingText}>Loading lyrics...</Text>
      </View>
    );
  }

  if (lyricsError === 'not_found' || (!lyrics && !isFetchingLyrics && hasFetched)) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>מילות השיר הזה לא זמינות כרגע</Text>
        <TouchableOpacity style={styles.reportButton} onPress={handleReport} disabled={reported || reporting}>
          <Text style={styles.reportButtonText}>
            {reporting ? 'Reporting...' : reported ? 'Reported!' : 'Report Missing Lyrics'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {networkOffline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>No connection. Position frozen.</Text>
        </View>
      )}
      
      <ScrollView ref={scrollViewRef} style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {lyrics?.map((line, index) => {
          const isCurrent = index === currentLineIndex;
          let opacity = 1;
          if (index < currentLineIndex) {
            opacity = 0.30;
          } else if (index > currentLineIndex) {
            opacity = 0.45;
          }
          let renderedEnglish;
          
          if (isCurrent) {
            const tokens = scanLineForWords(line.english, dictionary);
            renderedEnglish = (
              <Text style={[styles.englishText, styles.activeText]}>
                {tokens.map((token, i) => {
                  if (token.isMatch) {
                    const wordStr = token.wordData.word.toLowerCase();
                    const progress = userProgress[wordStr] || {};
                    const isLearned = progress.encounterCount >= 3 && progress.tapped;
                    return (
                      <Text 
                        key={i} 
                        style={isLearned ? styles.learnedWordText : styles.highlightedWordText}
                        onPress={() => setSelectedWord(token.wordData)}
                      >
                        {token.text}
                      </Text>
                    );
                  }
                  return <Text key={i}>{token.text}</Text>;
                })}
              </Text>
            );
          } else {
            renderedEnglish = (
              <Text style={[styles.englishText]}>
                {line.english}
              </Text>
            );
          }

          return (
            <View key={index} style={[styles.lineContainer, isCurrent && styles.currentLine, { opacity }]}>
              {renderedEnglish}
              {line.hebrew && (
                <Text style={[styles.hebrewText, isCurrent && styles.activeText]}>
                  {line.hebrew}
                </Text>
              )}
            </View>
          );
        })}
        {isTranslating && (
          <ActivityIndicator style={styles.translatingIndicator} size="small" color="#1DB954" />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  reportButton: {
    backgroundColor: '#1DB954',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  reportButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: '50%',
    paddingHorizontal: 20,
  },
  lineContainer: {
    marginVertical: 10,
    minHeight: LINE_ITEM_HEIGHT - 20,
    justifyContent: 'center',
  },
  currentLine: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 10,
  },
  englishText: {
    color: '#aaa',
    fontSize: 18,
  },
  hebrewText: {
    color: '#888',
    fontSize: 16,
    marginTop: 4,
    textAlign: 'right',
  },
  activeText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  highlightedWordText: {
    color: '#1DB954',
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  learnedWordText: {
    color: '#A0D9B4', // subtle green
    fontWeight: 'bold',
  },
  translatingIndicator: {
    marginTop: 20,
  },
  offlineBanner: {
    backgroundColor: '#E22134',
    padding: 10,
    alignItems: 'center',
  },
  offlineText: {
    color: '#fff',
    fontWeight: 'bold',
  }
});
