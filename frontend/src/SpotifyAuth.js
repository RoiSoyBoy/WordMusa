import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, ActivityIndicator } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri, useAuthRequest } from 'expo-auth-session';
import { signInWithCustomToken } from 'firebase/auth';
import { auth } from './firebase';

WebBrowser.maybeCompleteAuthSession();

// Endpoint
const discovery = {
  authorizationEndpoint: 'https://accounts.spotify.com/authorize',
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
};

export default function SpotifyAuth() {
  const [loading, setLoading] = useState(false);

  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: 'YOUR_SPOTIFY_CLIENT_ID', // Replace with your Spotify Client ID
      scopes: ['user-read-playback-state', 'user-read-currently-playing'],
      usePKCE: false, // We use authorization code flow with client secret on backend
      redirectUri: makeRedirectUri({
        scheme: 'lyriclearn'
      }),
    },
    discovery
  );

  useEffect(() => {
    if (response?.type === 'success') {
      const { code } = response.params;
      exchangeCodeForFirebaseToken(code);
    }
  }, [response]);

  const exchangeCodeForFirebaseToken = async (code) => {
    setLoading(true);
    try {
      const redirectUri = makeRedirectUri({
        scheme: 'lyriclearn'
      });

      // Point this to your local or deployed Firebase Cloud Function
      const functionUrl = 'http://localhost:5001/YOUR_PROJECT_ID/us-central1/spotifyAuth';

      const res = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, redirectUri }),
      });

      if (!res.ok) {
        throw new Error('Failed to exchange token');
      }

      const { firebaseToken } = await res.json();
      
      // Sign in to Firebase with the custom token
      await signInWithCustomToken(auth, firebaseToken);
      console.log('Successfully signed in with Firebase!');
    } catch (error) {
      console.error('Auth error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#1DB954" />
      ) : (
        <Button
          disabled={!request}
          title="Connect Spotify"
          onPress={() => {
            promptAsync();
          }}
          color="#1DB954"
        />
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
});
