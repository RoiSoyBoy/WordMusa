import React from 'react';
import { SafeAreaView, Pressable, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SpotifyAuth from '../SpotifyAuth';
import useDevSettings from '../store/useDevSettings';
import { theme } from '../styles/theme';

export default function OnboardingFlow({ onComplete = () => {} }) {
  const updateDevSettings = useDevSettings(s => s.update);

  const handleAuthComplete = async () => {
    try {
      await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
    } catch (_) {}
    onComplete();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0A0A0F' }}>
      <SpotifyAuth onAuthComplete={handleAuthComplete} />
      {__DEV__ && (
        <Pressable
          onPress={() => updateDevSettings({ providerId: 'mock' })}
          style={({ pressed }) => [{ padding: theme.spacing.md, alignItems: 'center' }, pressed && { opacity: 0.7 }]}
        >
          <Text style={{ color: theme.colors.muted, fontSize: 13 }}>Dev: continue with Mock (no login)</Text>
        </Pressable>
      )}
    </SafeAreaView>
  );
}
