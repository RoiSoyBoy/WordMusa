import React, { useState } from 'react';
import { View, Text, StyleSheet, Button, SafeAreaView, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import SpotifyAuth from '../SpotifyAuth';
import LyricsDisplay from './LyricsDisplay';

export default function OnboardingFlow({ onComplete = () => {} }) {
  const [step, setStep] = useState(1);
  const [slide, setSlide] = useState(1); // For Screen 1

  const handleFinish = async () => {
    try {
      await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
      onComplete();
    } catch (e) {
      console.error('Failed to save onboarding state', e);
      onComplete(); // Still finish even if storage fails
    }
  };

  const renderScreen1 = () => (
    <View style={styles.screen}>
      <Text style={styles.title}>איך זה עובד?</Text>
      {slide === 1 && <Text style={styles.text}>שומעים שיר ב-Spotify...</Text>}
      {slide === 2 && <Text style={styles.text}>רואים את המילים, ומילים קשות מודגשות...</Text>}
      {slide === 3 && <Text style={styles.text}>לוחצים על מילה כדי לראות את ההגדרה וללמוד!</Text>}
      
      <View style={styles.controls}>
        {slide < 3 ? (
          <Button title="הבא" onPress={() => setSlide(slide + 1)} />
        ) : (
          <Button title="המשך" onPress={() => setStep(2)} />
        )}
      </View>
      <TouchableOpacity style={styles.skipButton} onPress={() => setStep(2)}>
        <Text style={styles.skipText}>דלג</Text>
      </TouchableOpacity>
    </View>
  );

  const renderScreen2 = () => (
    <View style={styles.screen}>
      <Text style={styles.title}>חיבור ל-Spotify</Text>
      <Text style={styles.text}>
        כדי שנוכל להראות לך את המילים של השירים שאתה שומע עכשיו, אנחנו צריכים שתתחבר לחשבון ה-Spotify שלך.
        אנו מבקשים גישה רק כדי לראות מה מתנגן כרגע.
      </Text>
      <SpotifyAuth onAuthComplete={() => setStep(3)} />
    </View>
  );

  const handleAllowNotifications = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      await AsyncStorage.setItem('notificationsPreference', status === 'granted' ? 'granted' : 'denied');
    } catch (e) {
      console.error('Failed to request notification permissions', e);
    } finally {
      setStep(4);
    }
  };

  const handleDenyNotifications = async () => {
    try {
      await AsyncStorage.setItem('notificationsPreference', 'denied');
    } catch (e) {
      console.error('Failed to save notification preference', e);
    } finally {
      setStep(4);
    }
  };

  const renderScreen3 = () => (
    <View style={styles.screen}>
      <Text style={styles.title}>התראות (רשות)</Text>
      <Text style={styles.text}>
        נשמח לשלוח לך סיכום שבועי של המילים החדשות שלמדת! 
        האם תרצה לאשר התראות?
      </Text>
      <View style={styles.controls}>
        <Button title="אשר התראות" onPress={handleAllowNotifications} />
        <View style={{ width: 10 }} />
        <Button title="לא תודה" onPress={handleDenyNotifications} color="gray" />
      </View>
    </View>
  );

  const renderScreen4 = () => (
    <View style={styles.screen}>
      <Text style={styles.title}>הכל מוכן!</Text>
      <Text style={styles.text}>כך זה ייראה כשתשמע שיר:</Text>
      <View style={styles.mockPlayer}>
        <Text style={styles.mockTitle}>Track: השיר הראשון שלי</Text>
        <Text style={styles.mockTitle}>Artist: האמן האהוב עליך</Text>
        {/* Mock lyrics display */}
        <View style={{ marginTop: 20, backgroundColor: '#f0f0f0', padding: 10, borderRadius: 8 }}>
          <Text style={{ fontSize: 18 }}>
            מילים מילים מילים <Text style={{ color: 'blue', fontWeight: 'bold' }}>מילה_קשה</Text> מילים
          </Text>
        </View>
      </View>
      <Button title="התחל להאזין" onPress={handleFinish} color="#1DB954" />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {step === 1 && renderScreen1()}
      {step === 2 && renderScreen2()}
      {step === 3 && renderScreen3()}
      {step === 4 && renderScreen4()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  screen: { flex: 1, padding: 20, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  text: { fontSize: 18, marginBottom: 30, textAlign: 'center', lineHeight: 26 },
  controls: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  skipButton: { position: 'absolute', bottom: 40 },
  skipText: { fontSize: 16, color: 'gray', textDecorationLine: 'underline' },
  mockPlayer: { width: '100%', padding: 20, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginBottom: 30 },
  mockTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 }
});
