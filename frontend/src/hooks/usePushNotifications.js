import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { doc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';

// Requests push permission once on mount and saves the Expo push token
// to users/{uid}.expoPushToken so backend can send targeted notifications.
export function usePushNotifications() {
  useEffect(() => {
    registerAsync().catch(() => {});
  }, []);
}

async function registerAsync() {
  // Web doesn't support Expo push tokens
  if (Platform.OS === 'web') return;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'LyricLearn',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const user = auth.currentUser;
  if (!user) return;

  // getExpoPushTokenAsync throws in simulators — catch silently
  const tokenResult = await Notifications.getExpoPushTokenAsync().catch(() => null);
  const token = tokenResult?.data;
  if (!token) return;

  await setDoc(doc(db, 'users', user.uid), { expoPushToken: token }, { merge: true });
}
