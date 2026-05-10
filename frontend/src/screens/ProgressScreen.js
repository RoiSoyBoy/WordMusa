import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
} from 'react-native';
import {
  doc, onSnapshot, collection, query, where, orderBy, getDocs, Timestamp,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import useWordStore from '../store/useWordStore';
import { psychometricWordMap } from '../utils/psychometricWords';

const DAYS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

function getDayLabel(daysAgo) {
  if (daysAgo === 0) return 'היום';
  if (daysAgo === 1) return 'אתמול';
   const d = new Date();
  d.setDate(d.getDate() - daysAgo);
 const formatter = new Intl.DateTimeFormat('he-IL', {
    timeZone: 'Asia/Jerusalem',
   weekday: 'short'
  });
 const parts = formatter.formatToParts(d);
 const dayOfWeek = d.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem', weekday: 'short' });
  // Map to get day index in Asia/Jerusalem timezone
  const jerusalemDate = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' }));
 return DAYS[jerusalemDate.getDay()];
}

export default function ProgressScreen() {
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
        <ActivityIndicator color="#7C6AF7" />
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Streak card */}
      <View style={styles.streakCard}>
        <Text style={styles.streakFlame}>🔥</Text>
        <Text style={styles.streakCount}>{streak}</Text>
        <Text style={styles.streakLabel}>ימים רצופים</Text>
      </View>

      {/* Stats grid */}
      <View style={styles.statsGrid}>
        <StatCell value={learned} label="מילים נלמדו" color="#7C6AF7" />
        <StatCell value={encountered} label="מילים נתקלו" color="#6AF7C8" />
        <StatCell value={songs} label="שירים הושמעו" color="#7C6AF7" />
        <StatCell value={`${memory}%`} label="אחוז זכירה" color="#6AF7C8" />
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
            return (
              <View key={item.id} style={styles.recentRow}>
                <View style={styles.recentLeft}>
                  <Text style={styles.recentWord}>{item.word}</Text>
                  <Text style={styles.recentHebrew} numberOfLines={1}>
                    {fullWord?.hebrewShort || ''}
                  </Text>
                </View>
                {item.songContexts?.[0]?.trackName ? (
                  <Text style={styles.recentSong} numberOfLines={1}>
                    🎵 {item.songContexts[0].trackName}
                  </Text>
                ) : null}
              </View>
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
  container: { flex: 1, backgroundColor: '#0A0A0F' },
  content: { padding: 16, paddingBottom: 40 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  streakCard: {
    backgroundColor: 'rgba(247,106,138,0.12)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(247,106,138,0.25)',
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  streakFlame: { fontSize: 40, marginBottom: 8 },
  streakCount: { color: '#F76A8A', fontSize: 52, fontWeight: '800', lineHeight: 60 },
  streakLabel: { color: '#F76A8A', fontSize: 15, opacity: 0.8, marginTop: 4, textAlign: 'right' },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCell: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#13131A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 16,
    alignItems: 'center',
  },
  statValue: { fontSize: 32, fontWeight: '800', marginBottom: 4 },
  statLabel: { color: '#7A7A9A', fontSize: 12, textAlign: 'right' },
  section: {
    backgroundColor: '#13131A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#7A7A9A',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
    textAlign: 'right',
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 120,
    gap: 6,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  barCount: {
    color: '#7C6AF7',
    fontSize: 10,
    marginBottom: 2,
    height: 14,
  },
  barTrack: {
    width: '100%',
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: '#7C6AF7',
    borderRadius: 4,
  },
  barEmpty: { backgroundColor: 'transparent' },
  barLabel: { color: '#7A7A9A', fontSize: 10, marginTop: 6 },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  recentLeft: { flex: 1 },
  recentWord: { color: '#F0EEFF', fontSize: 15, fontWeight: '600' },
  recentHebrew: { color: '#7A7A9A', fontSize: 12, textAlign: 'right', marginTop: 2 },
  recentSong: { color: '#7A7A9A', fontSize: 11, maxWidth: 120, textAlign: 'right' },
});
