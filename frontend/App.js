;import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, SafeAreaView } from 'react-native';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './src/firebase';
import SpotifyAuth from './src/SpotifyAuth';
import useSpotifyPolling from './src/hooks/useSpotifyPolling';
import usePlayerStore from './src/store/usePlayerStore';
import WordCard from './src/components/WordCard';
import WordDetailModal from './src/components/WordDetailModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OnboardingFlow from './src/components/OnboardingFlow';
import NowPlayingScreen from './src/screens/NowPlayingScreen';

export default function App() {
  const [user, setUser] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(null);

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const value = await AsyncStorage.getItem('hasCompletedOnboarding');
        if (value === 'true') {
          setShowOnboarding(false);
        } else {
          setShowOnboarding(true);
        }
      } catch (e) {
        setShowOnboarding(true);
      }
    };
    checkOnboarding();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return unsubscribe;
  }, []);

  if (showOnboarding === null) {
    return null; // Or a loading spinner
  }

  if (showOnboarding || !user) {
    return <OnboardingFlow onComplete={() => setShowOnboarding(false)} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>LyricLearn</Text>
      <View style={{flex:1, width: '100%'}}>
        <NowPlayingScreen />
      </View>
      <WordCard />
      <WordDetailModal />
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 50,
  },
  lyricsContainer: {
    flex: 1,
    width: '100%',
    marginTop: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  playerContainer: {
    padding: 20,
    alignItems: 'center',
    width: '100%',
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
});
