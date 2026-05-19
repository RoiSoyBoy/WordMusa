import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { onAuthStateChanged } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from './src/firebase';
import OnboardingFlow from './src/components/OnboardingFlow';
import AppNavigator from './src/navigation/AppNavigator';
import WordDetailModal from './src/components/WordDetailModal';

export default function App() {
  const [user, setUser] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem('hasCompletedOnboarding')
      .then(v => setShowOnboarding(v !== 'true'))
      .catch(() => setShowOnboarding(true));
  }, []);

  useEffect(() => {
    return onAuthStateChanged(auth, setUser);
  }, []);

  if (showOnboarding === null) return null;

  if (showOnboarding || !user) {
    return <OnboardingFlow onComplete={() => setShowOnboarding(false)} />;
  }

  return (
    <SafeAreaProvider>
      <AppNavigator />
      <WordDetailModal />
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
