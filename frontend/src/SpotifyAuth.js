import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, ActivityIndicator } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri, useAuthRequest } from 'expo-auth-session';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from './firebase';

WebBrowser.maybeCompleteAuthSession();

const discovery = {
  authorizationEndpoint: 'https://accounts.spotify.com/authorize',
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
};

// FIX: Use a specific env var that includes the full function URL path.
// In your frontend .env file set:
//   EXPO_PUBLIC_SPOTIFY_AUTH_URL=http://127.0.0.1:5001/demo-wordmusa/us-central1/spotifyAuth
// For production:
//   EXPO_PUBLIC_SPOTIFY_AUTH_URL=https://us-central1-wordmusa.cloudfunctions.net/spotifyAuth
const SPOTIFY_AUTH_URL = process.env.EXPO_PUBLIC_SPOTIFY_AUTH_URL;

export default function SpotifyAuth({ onAuthComplete }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const testConnection = async () => {
    const url = process.env.EXPO_PUBLIC_SPOTIFY_AUTH_URL;
    console.log('[TEST] Attempting to reach:', url);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'test', redirectUri: 'test' }),
      });
      console.log('[TEST] Response status:', res.status);
      const text = await res.text();
      console.log('[TEST] Response body:', text);
    } catch (err) {
      console.error('[TEST] Fetch failed:', err.message);
      console.error('[TEST] Full error:', JSON.stringify(err));
    }
  };

  const redirectUri = makeRedirectUri({
    scheme: 'lyriclearn',
    preferLocalhost: true,
  });

  // Debug logs — remove before production
  console.log('[SpotifyAuth] Client ID:', process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID);
  console.log('[SpotifyAuth] Redirect URI:', redirectUri);
  console.log('[SpotifyAuth] Backend URL:', SPOTIFY_AUTH_URL);

  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: process.env.EXPO_PUBLIC_SPOTIFY_CLIENT_ID || 'CLIENT_ID_NOT_FOUND',
      scopes: ['user-read-playback-state', 'user-read-currently-playing', 'user-modify-playback-state'],
      usePKCE: false,
      redirectUri,
    },
    discovery
  );

  useEffect(() => {
    if (response?.type === 'success') {
      const { code } = response.params;
      exchangeCodeForFirebaseToken(code);
    } else if (response?.type === 'error') {
      setError('Spotify login failed. Please try again.');
      console.error('[SpotifyAuth] OAuth error:', response.error);
    }
  }, [response]);

  const exchangeCodeForFirebaseToken = async (code) => {
    setLoading(true);
    setError(null);

    try {
      if (!SPOTIFY_AUTH_URL) {
        throw new Error('EXPO_PUBLIC_SPOTIFY_AUTH_URL is not set in your .env file.');
      }

      // redirectUri must exactly match what was sent to Spotify during the auth request
      const currentRedirectUri = makeRedirectUri({
        scheme: 'lyriclearn',
        preferLocalhost: true,
      });

      const res = await fetch(SPOTIFY_AUTH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, redirectUri: currentRedirectUri }),
      });

      if (!res.ok) {
        const body = await res.text();
        console.error('[SpotifyAuth] Backend error:', res.status, body);
        throw new Error(`Backend returned ${res.status}: ${body}`);
      }

      const { firebaseToken } = await res.json();
      await signInWithCustomToken(auth, firebaseToken);

      console.log('[SpotifyAuth] Firebase sign-in successful.');
      if (onAuthComplete) onAuthComplete();

    } catch (err) {
      console.error('[SpotifyAuth] Token exchange failed:', err.message);
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#1DB954" />
      ) : (
        <>
          {error ? (
            <Text style={styles.error}>{error}</Text>
          ) : null}
          <Button
            disabled={!request}
            title="Connect Spotify"
            onPress={() => {
              setError(null);
              promptAsync();
            }}
            color="#1DB954"
          />
          <Button title="Test Connection" onPress={testConnection} color="red" />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    color: '#cc0000',
    marginBottom: 12,
    textAlign: 'center',
    fontSize: 14,
  },
});