import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  doc, onSnapshot, collection, query, where, orderBy, getDocs, Timestamp,
  documentId,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { getAchievements } from '../utils/achievements';
import { theme } from '../styles/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DAYS_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const CALENDAR_DAY_LETTERS = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

function getDayLabel(daysAgo) {
  if (daysAgo === 0) return 'היום';
  if (daysAgo === 1) return 'אתמול';
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const jerusalemDate = new Date(d.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' }));
  return DAYS_HE[jerusalemDate.getDay()];
}

function toISOJerusalem(date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(date);
}

// 4-week x 7-day grid (Sun..Sat columns), oldest week on top, current week on bottom.
function buildStreakGrid(activeDates) {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' }));
  now.setHours(0, 0, 0, 0);
  const startOfCurrentWeek = new Date(now);
  startOfCurrentWeek.setDate(now.getDate() - now.getDay());
  const gridStart = new Date(startOfCurrentWeek);
  gridStart.setDate(startOfCurrentWeek.getDate() - 21);

  const weeks = [];
  for (let row = 0; row < 4; row++) {
    const week = [];
    for (let col = 0; col < 7; col++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + row * 7 + col);
      const iso = toISOJerusalem(d);
      week.push({ iso, active: activeDates.has(iso), isToday: iso === toISOJerusalem(now) });
    }
    weeks.push(week);
  }
  return weeks;
}

export default function ProgressScreen() {
  const insets = useSafeAreaInsets();
  const [userData, setUserData] = useState(null);
  const [weeklyData, setWeeklyData] = useState(Array(7).fill(0));
  const [streakLogDates, setStreakLogDates] = useState(new Set());
  const [loading, setLoading] = useState(true);

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

  // Streak calendar — last 28 days of activity log
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const start = new Date();
    start.setDate(start.getDate() - 28);
    const startISO = toISOJerusalem(start);

    const q = query(
      collection(db, 'users', user.uid, 'streakLog'),
      where(documentId(), '>=', startISO)
    );
    const unsub = onSnapshot(q, snap => {
      setStreakLogDates(new Set(snap.docs.map(d => d.id)));
    }, () => {});

    return unsub;
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
  const streakGrid = buildStreakGrid(streakLogDates);
  const achievements = getAchievements(stats);

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

      {/* Streak calendar */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>יומן רצף</Text>
        <View style={styles.calendarDayLabels}>
          {CALENDAR_DAY_LETTERS.map((d, i) => (
            <Text key={i} style={styles.calendarDayLabel}>{d}</Text>
          ))}
        </View>
        {streakGrid.map((week, wi) => (
          <View key={wi} style={styles.calendarRow}>
            {week.map(day => (
              <View
                key={day.iso}
                style={[
                  styles.calendarCell,
                  day.active && styles.calendarCellActive,
                  day.isToday && styles.calendarCellToday,
                ]}
              />
            ))}
          </View>
        ))}
      </View>

      {/* Stats grid */}
      <View style={styles.statsGrid}>
        <StatCell value={learned} label="מילים נלמדו" color={theme.colors.accent} />
        <StatCell value={encountered} label="מילים נתקלו" color={theme.colors.accentGreen} />
        <StatCell value={songs} label="שירים הושמעו" color={theme.colors.accent} />
        <StatCell value={`${memory}%`} label="אחוז זכירה" color={theme.colors.accentGreen} />
      </View>

      {/* Achievements */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>הישגים</Text>
        {achievements.map(a => (
          <AchievementRow key={a.key} achievement={a} />
        ))}
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

function AchievementRow({ achievement }) {
  const { icon, label, tiers, earnedTiers, nextTier, progress } = achievement;
  const highest = earnedTiers.length ? earnedTiers[earnedTiers.length - 1] : 0;
  return (
    <View style={styles.achievementRow}>
      <View style={styles.achievementHeader}>
        <Text style={styles.achievementIcon}>{icon}</Text>
        <Text style={styles.achievementLabel}>{label}</Text>
      </View>
      <View style={styles.badgeChipsRow}>
        {tiers.map(t => {
          const earned = t <= highest;
          return (
            <View key={t} style={[styles.badgeChip, earned ? styles.badgeChipEarned : styles.badgeChipLocked]}>
              <Text style={[styles.badgeChipText, earned && styles.badgeChipTextEarned]}>{t}</Text>
            </View>
          );
        })}
      </View>
      {nextTier != null && (
        <View style={styles.achievementProgressTrack}>
          <View style={[styles.achievementProgressFill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
      )}
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

  calendarDayLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  calendarDayLabel: { color: theme.colors.muted, fontSize: 10, width: 24, textAlign: 'center' },
  calendarRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  calendarCell: {
    width: 24,
    height: 24,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.surface2,
  },
  calendarCellActive: { backgroundColor: theme.colors.accentGreen },
  calendarCellToday: { borderWidth: 2, borderColor: theme.colors.accent },

  achievementRow: { marginBottom: theme.spacing.md },
  achievementHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6, justifyContent: 'flex-end' },
  achievementIcon: { fontSize: 14 },
  achievementLabel: { color: theme.colors.text, fontSize: 13, fontWeight: '600' },
  badgeChipsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' },
  badgeChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.surface2,
  },
  badgeChipEarned: { backgroundColor: theme.colors.accentPink },
  badgeChipLocked: { backgroundColor: theme.colors.surface2 },
  badgeChipText: { color: theme.colors.muted, fontSize: 11, fontWeight: '700' },
  badgeChipTextEarned: { color: theme.colors.text },
  achievementProgressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.surface2,
    marginTop: 6,
    overflow: 'hidden',
  },
  achievementProgressFill: { height: '100%', backgroundColor: theme.colors.accentPink, borderRadius: 2 },
});
