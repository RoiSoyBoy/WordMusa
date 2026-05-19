import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  doc, onSnapshot, collection, query, where, orderBy, getDocs, Timestamp,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import useWordStore from '../store/useWordStore';
import { psychometricWordMap } from '../utils/psychometricWords';
import { theme } from '../styles/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DAYS_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

function getDayLabel(daysAgo) {
  if (daysAgo === 0) return 'היום';
  if (daysAgo === 1) return 'אתמול';
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const jerusalemDate = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' }));
  return DAYS_HE[jerusalemDate.getDay()];
}

export default function ProgressScreen() {
  const insets = useSafeAreaInsets();
  const [userData, setUserData] = useState(null);
  const [recentWords, setRecentWords] = useState([]);
  const [weeklyData, setWeeklyData] = useState(Array(7).fill(0));
  const [loading, setLoading] = useState(true);
  const { setSelectedWord } = useWordStore();

  // Real-time user stats
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) { setLoading(false); return; }

    const userRef = doc(db, 'users', user.uid);
    const unsub = onSnapshot(userRef, snap => {
      setUserData(snap.data() || {});
      setLoading(false);
    }, () => setLoading(false));

    return unsub;
  }, []);

  // Recent words (last 10)
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(
      collection(db, 'users', user.uid, 'wordHistory'),
      orderBy('lastEncounteredAt', 'desc')
    );
    const unsub = onSnapshot(q, snap => {
      setRecentWords(snap.docs.slice(0, 10).map(d => ({ id: d.id, ...d.data() })));
    });

    return unsub;
  }, []);

  // Weekly chart — words learned per day for last 7 days
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const since = new Date();
    since.setDate(since.getDate() - 7);
    since.setHours(0, 0, 0, 0);

    const q = query(
      collection(db, 'users', user.uid, 'wordHistory'),
      where('learnedAt', '>=', Timestamp.fromDate(since))
    );

    getDocs(q).then(snap => {
      const counts = Array(7).fill(0);
      snap.docs.forEach(d => {
        const data = d.data();
        if (!data.learnedAt) return;
        const learnedDate = data.learnedAt.toDate();
        const daysAgo = Math.floor((Date.now() - learnedDate.getTime()) / 86400000);
        if (daysAgo >= 0 && daysAgo < 7) counts[6 - daysAgo]++;
      });
      setWeeklyData(counts);
    }).catch(() => {});
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  const stats = userData || {};
  const streak = stats.streakCount || 0;
  const learned = stats.totalWordsLearned || 0;
  const encountered = stats.totalWordsEncountered || 0;
  const songs = stats.totalSongs || 0;
  const memory = encountered > 0 ? Math.round((learned / encountered) * 100) : 0;
  const maxBar = Math.max(...weeklyData, 1);

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top + theme.spacing.md }]}>
      {/* Streak card */}
      <LinearGradient
        colors={['rgba(29,185,84,0.18)', 'rgba(29,185,84,0.06)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.streakCard}
      >
        <Text style={styles.streakFlame}>🔥</Text>
        <Text style={styles.streakCount}>{streak}</Text>
        <Text style={styles.streakLabel}>ימים רצופים</Text>
      </LinearGradient>

      {/* Stats grid */}
      <View style={styles.statsGrid}>
        <StatCell value={learned} label="מילים נלמדו" color={theme.colors.accent} />
        <StatCell value={encountered} label="מילים נתקלו" color={theme.colors.accentGreen} />
        <StatCell value={songs} label="שירים הושמעו" color={theme.colors.accent} />
        <StatCell value={`${memory}%`} label="אחוז זכירה" color={theme.colors.accentGreen} />
      </View>

      {/* Weekly chart */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>מילים נלמדו השבוע</Text>
        <View style={styles.chart}>
          {weeklyData.map((count, idx) => (
            <View key={idx} style={styles.barColumn}>
              <Text style={styles.barCount}>{count > 0 ? count : ''}</Text>
              <View style={styles.barTrack}>
                <View style={[
                  styles.barFill,
                  { height: `${Math.round((count / maxBar) * 100)}%` },
                  count === 0 && styles.barEmpty,
                ]} />
              </View>
              <Text style={styles.barLabel}>{getDayLabel(6 - idx)}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Recent words */}
      {recentWords.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>מילים אחרונות</Text>
          {recentWords.map(item => {
            const fullWord = psychometricWordMap.get(item.word?.toLowerCase());
            const isLearned = !!item.learnedAt;
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.recentRow}
                activeOpacity={0.7}
                onPress={() => fullWord && setSelectedWord(fullWord)}
              >
                <View style={styles.recentLeft}>
                  <Text style={styles.recentWord}>{item.word}</Text>
                  <Text style={styles.recentHebrew} numberOfLines={1}>
                    {fullWord?.hebrewShort || ''}
                  </Text>
                </View>
                <View style={styles.recentRight}>
                  {item.songContexts?.[0]?.trackName ? (
                    <Text style={styles.recentSong} numberOfLines={1}>
                      🎵 {item.songContexts[0].trackName}
                    </Text>
                  ) : null}
                  <View style={[
                    styles.statusDot,
                    { backgroundColor: isLearned ? theme.colors.accentGreen : theme.colors.accent },
                  ]} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

function StatCell({ value, label, color }) {
  return (
    <View style={styles.statCell}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: theme.spacing.md, paddingBottom: 40 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  streakCard: {
    borderRadius: theme.radii.lg,
    padding: 24,
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  streakFlame: { fontSize: 36, marginBottom: 6 },
  streakCount: {
    color: theme.colors.accent,
    fontSize: 56,
    fontWeight: '900',
    lineHeight: 64,
    letterSpacing: -1,
  },
  streakLabel: {
    color: theme.colors.muted,
    fontSize: 14,
    marginTop: 4,
    textAlign: 'right',
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: theme.spacing.md,
  },
  statCell: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  statValue: { fontSize: 30, fontWeight: '800', marginBottom: 4, letterSpacing: -0.5 },
  statLabel: { color: theme.colors.muted, fontSize: 11, textAlign: 'right', fontWeight: '500' },
  section: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    color: theme.colors.muted,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: theme.spacing.md,
    textAlign: 'right',
    fontWeight: '600',
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 110,
    gap: 6,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barCount: {
    color: theme.colors.accent,
    fontSize: 10,
    marginBottom: 2,
    height: 14,
    fontWeight: '600',
  },
  barTrack: {
    width: '100%',
    flex: 1,
    backgroundColor: theme.colors.surface2,
    borderRadius: 3,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: theme.colors.accent,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  barEmpty: { backgroundColor: 'transparent' },
  barLabel: { color: theme.colors.muted, fontSize: 9, marginTop: 5, textAlign: 'center' },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  recentLeft: { flex: 1 },
  recentWord: { color: theme.colors.text, fontSize: 14, fontWeight: '600' },
  recentHebrew: { color: theme.colors.muted, fontSize: 12, textAlign: 'right', marginTop: 2 },
  recentRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
  recentSong: { color: theme.colors.muted, fontSize: 11, maxWidth: 100, textAlign: 'right' },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
});
