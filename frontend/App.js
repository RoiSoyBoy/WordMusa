import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { onAuthStateChanged } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from 'expo-font';
import Ionicons from '@expo/vector-icons/Ionicons';
import { auth } from './src/firebase';
import OnboardingFlow from './src/components/OnboardingFlow';
import AppNavigator from './src/navigation/AppNavigator';
import WordDetailModal from './src/components/WordDetailModal';
import WelcomeTourModal from './src/components/WelcomeTourModal';
import useDevSettings from './src/store/useDevSettings';

export default function App() {
  const [fontsLoaded] = useFonts(Ionicons.font);
  const [user, setUser] = useState(null);
  // Dev builds only: Mock runs without a login, so it skips the login gate
  const devMockBypass = useDevSettings(s => __DEV__ && s.providerId === 'mock');
  const [showOnboarding, setShowOnboarding] = useState(null);
  const [hasSeenTour, setHasSeenTour] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem('hasCompletedOnboarding')
      .then(v => setShowOnboarding(v !== 'true'))
      .catch(() => setShowOnboarding(true));
  }, []);

  useEffect(() => {
    AsyncStorage.getItem('hasSeenTour')
      .then(v => setHasSeenTour(v === 'true'))
      .catch(() => setHasSeenTour(false));
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, setUser);
  }, []);

  // Wait for data reads before rendering anything (fonts load in background)
  if (showOnboarding === null || hasSeenTour === null) return null;

  if ((showOnboarding || !user) && !devMockBypass) {
    return (
      <SafeAreaProvider>
        <OnboardingFlow onComplete={() => setShowOnboarding(false)} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <AppNavigator />
      <WordDetailModal />
      <WelcomeTourModal
        visible={hasSeenTour === false}
        onClose={() => setHasSeenTour(true)}
      />
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
