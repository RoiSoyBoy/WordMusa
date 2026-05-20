import React from 'react';
import { SafeAreaView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SpotifyAuth from '../SpotifyAuth';

export default function OnboardingFlow({ onComplete = () => {} }) {
  const handleAuthComplete = async () => {
    try {
      await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
    } catch (_) {}
    onComplete();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0A0A0F' }}>
      <SpotifyAuth onAuthComplete={handleAuthComplete} />
    </SafeAreaView>
  );
}
