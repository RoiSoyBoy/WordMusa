import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri, useAuthRequest } from 'expo-auth-session';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from './firebase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

WebBrowser.maybeCompleteAuthSession();

const { width } = Dimensions.get('window');

const discovery = {
  authorizationEndpoint: 'https://accounts.spotify.com/authorize',
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
};

const SPOTIFY_AUTH_URL = process.env.EXPO_PUBLIC_SPOTIFY_AUTH_URL;

export default function SpotifyAuth({ onAuthComplete }) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const redirectUri = makeRedirectUri({
    scheme: 'lyriclearn',
    preferLocalhost: true,
  });

  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID || '',
      scopes: ['user-read-playback-state', 'user-read-currently-playing', 'user-modify-playback-state'],
      usePKCE: false,
      redirectUri,
    },
    discovery
  );

  useEffect(() => {
    if (response?.type === 'success') {
      exchangeCodeForFirebaseToken(response.params.code);
    } else if (response?.type === 'error') {
      setError('החיבור ל-Spotify נכשל. נסה שוב.');
    }
  }, [response]);

  const exchangeCodeForFirebaseToken = async (code) => {
    setLoading(true);
    setError(null);
    try {
      if (!SPOTIFY_AUTH_URL) throw new Error('EXPO_PUBLIC_SPOTIFY_AUTH_URL is not set.');
      const currentRedirectUri = makeRedirectUri({ scheme: 'lyriclearn', preferLocalhost: true });
      const res = await fetch(SPOTIFY_AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, redirectUri: currentRedirectUri }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Backend returned ${res.status}: ${body}`);
      }
      const { firebaseToken } = await res.json();
      await signInWithCustomToken(auth, firebaseToken);
      if (onAuthComplete) onAuthComplete();
    } catch (err) {
      setError('החיבור נכשל. בדוק את החיבור לאינטרנט ונסה שוב.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#1A0E3A', '#0A0A0F', '#0A0A0F']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Purple glow blob behind logo */}
      <View style={styles.glowBlob} />

      <View style={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40 }]}>

        {/* Logo area */}
        <View style={styles.logoArea}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>🎵</Text>
          </View>
          <Text style={styles.appName}>PsychoLyrics</Text>
          <Text style={styles.tagline}>למד אנגלית דרך מוזיקה</Text>
        </View>

        {/* Pitch */}
        <View style={styles.pitchArea}>
          <Text style={styles.pitch}>שמע שיר, ראה מילים — בזמן אמת</Text>
          <Text style={styles.subPitch}>מילות פסיכומטרי מסומנות אוטומטית עם הסבר בעברית</Text>
        </View>

        {/* Feature pills */}
        <View style={styles.pillsRow}>
          {['תרגום חי', 'פסיכומטרי', 'כרטיסיות חזרה'].map(label => (
            <View key={label} style={styles.pill}>
              <Text style={styles.pillText}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Auth area */}
        <View style={styles.authArea}>
          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}

          {loading ? (
            <ActivityIndicator size="large" color="#1DB954" style={styles.spinner} />
          ) : (
            <TouchableOpacity
              style={[styles.spotifyBtn, !request && styles.spotifyBtnDisabled]}
              activeOpacity={0.8}
              onPress={() => { setError(null); promptAsync(); }}
              disabled={!request}
            >
              <Text style={styles.spotifyBtnIcon}>♫</Text>
              <Text style={styles.spotifyBtnText}>התחבר עם Spotify</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.disclaimer}>
            נגישות לפרטי Spotify שלך בלבד.{'\n'}לא שומרים סיסמאות.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  glowBlob: {
    position: 'absolute',
    top: -80,
    alignSelf: 'center',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(124,106,247,0.18)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'space-between',
  },
  logoArea: {
    alignItems: 'center',
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(124,106,247,0.2)',
    borderWidth: 1.5,
    borderColor: 'rgba(124,106,247,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoEmoji: {
    fontSize: 36,
  },
  appName: {
    color: '#F0EEFF',
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: -1,
    marginBottom: 6,
  },
  tagline: {
    color: '#7A7A9A',
    fontSize: 16,
    fontWeight: '500',
  },
  pitchArea: {
    alignItems: 'center',
  },
  pitch: {
    color: '#F0EEFF',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.4,
    marginBottom: 10,
  },
  subPitch: {
    color: '#7A7A9A',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  pillsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  pill: {
    backgroundColor: 'rgba(124,106,247,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(124,106,247,0.3)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  pillText: {
    color: '#7C6AF7',
    fontSize: 13,
    fontWeight: '600',
  },
  authArea: {
    alignItems: 'center',
  },
  errorText: {
    color: '#F76A8A',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 20,
  },
  spinner: {
    marginVertical: 20,
  },
  spotifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#1DB954',
    borderRadius: 500,
    paddingVertical: 16,
    width: '100%',
    marginBottom: 20,
  },
  spotifyBtnDisabled: {
    opacity: 0.5,
  },
  spotifyBtnIcon: {
    fontSize: 20,
    color: '#000000',
  },
  spotifyBtnText: {
    color: '#000000',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  disclaimer: {
    color: '#4A4A6A',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
