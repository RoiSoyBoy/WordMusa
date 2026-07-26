import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, Pressable, Image, StyleSheet,
  ActivityIndicator, Platform, Linking,
} from 'react-native';
import { auth } from '../firebase';
import Icon from '../components/Icon';
import { theme } from '../styles/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

async function playSong(song) {
  try {
    const token = await auth.currentUser.getIdToken();
    const res = await fetch(`${BACKEND_URL}/spotifyControl`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'play', track_uri: `spotify:track:${song.spotifyTrackId}` }),
    });
    if (res.ok) return;
  } catch (e) {
    // fall through to deep-link
  }
  Linking.openURL(
    Platform.OS === 'web'
      ? `https://open.spotify.com/track/${song.spotifyTrackId}`
      : `spotify:track:${song.spotifyTrackId}`
  );
}

export default function RecommendationsScreen() {
  const insets = useSafeAreaInsets();
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadSongs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('not_authenticated');
      const token = await user.getIdToken();
      const res = await fetch(`${BACKEND_URL}/recommendedSongs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`status_${res.status}`);
      const data = await res.json();
      setSongs(data);
    } catch (e) {
      setError('שגיאה בטעינת ההמלצות. נסה שוב.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSongs(); }, [loadSongs]);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      {item.albumArt ? (
        <Image source={{ uri: item.albumArt }} style={styles.albumArt} />
      ) : (
        <View style={[styles.albumArt, styles.albumArtPlaceholder]} />
      )}
      <View style={styles.cardInfo}>
        <Text style={styles.trackName} numberOfLines={1}>{item.trackName}</Text>
        <Text style={styles.artistName} numberOfLines={1}>{item.artistName}</Text>
        <View style={styles.wordsPill}>
          <Text style={styles.wordsPillLabel}>{item.psychometricWordCount} מילים</Text>
        </View>
      </View>
      <Pressable
        onPress={() => playSong(item)}
        style={({ pressed }) => [styles.playBtn, pressed && { opacity: 0.75 }]}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Icon name="play" size={20} color="#000" />
      </Pressable>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <Text style={styles.title}>שירים מומלצים</Text>
      <Text style={styles.subtitle}>שירים פופולריים עם אוצר מילים פסיכומטרי עשיר</Text>

      {loading ? (
        <ActivityIndicator color={theme.colors.accent} style={styles.spinner} />
      ) : error ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{error}</Text>
          <Pressable onPress={loadSongs} style={styles.retryBtn}>
            <Text style={styles.retryText}>נסה שוב</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={songs}
          keyExtractor={item => `${item.trackName}_${item.artistName}`}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  title: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'right',
    paddingHorizontal: theme.spacing.md,
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: 13,
    textAlign: 'right',
    paddingHorizontal: theme.spacing.md,
    marginTop: 4,
    marginBottom: theme.spacing.md,
  },
  list: { paddingHorizontal: theme.spacing.md, paddingBottom: 24 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface2,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  albumArt: {
    width: 52,
    height: 52,
    borderRadius: theme.radii.sm,
  },
  albumArtPlaceholder: {
    backgroundColor: theme.colors.surface,
  },
  cardInfo: { flex: 1, marginLeft: 12 },
  trackName: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'left',
  },
  artistName: {
    color: theme.colors.muted,
    fontSize: 13,
    textAlign: 'left',
    marginTop: 1,
    marginBottom: 6,
  },
  wordsPill: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  wordsPillLabel: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  playBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  spinner: { marginTop: 40 },
  empty: { marginTop: 50, paddingHorizontal: 40, alignItems: 'center' },
  emptyText: { color: theme.colors.muted, fontSize: 14, textAlign: 'center', lineHeight: 22 },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: theme.colors.surface2,
  },
  retryText: { color: theme.colors.accent, fontWeight: '700', fontSize: 14 },
});
