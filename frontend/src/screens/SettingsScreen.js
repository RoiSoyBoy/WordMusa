import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useDifficulty } from '../hooks/useDifficulty';
import { theme } from '../styles/theme';

const CAPS = [
  {
    value: 1,
    label: 'מילה אחת',
    description: 'פוקוס מקסימלי — מילה אחת לשיר',
    tag: 'x1',
  },
  {
    value: 2,
    label: 'שתי מילים',
    description: 'איזון מושלם — קל לזכור',
    tag: 'x2',
    recommended: true,
  },
  {
    value: 3,
    label: 'שלוש מילים',
    description: 'חשיפה רחבה — שלוש מילות לשיר',
    tag: 'x3',
  },
];

export default function SettingsScreen() {
  const { wordCap, setWordCap } = useDifficulty();

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.screenTitle}>הגדרות</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>מילים לשיר</Text>
        <Text style={styles.sectionSubtitle}>
          כמה מילים יוצגו לך בכל שיר? המילים נבחרות מהאוצר מילים הפסיכומטרי שעוד לא למדת
        </Text>

        {CAPS.map((c) => {
          const isActive = wordCap === c.value;
          return (
            <TouchableOpacity
              key={c.value}
              activeOpacity={0.7}
              onPress={() => setWordCap(c.value)}
              style={[styles.card, isActive && styles.cardActive]}
            >
              <View style={styles.cardLeft}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardLabel, isActive && styles.cardLabelActive]}>
                    {c.label}
                  </Text>
                  <View style={[styles.badge, isActive && styles.badgeActive]}>
                    <Text style={[styles.badgeText, isActive && styles.badgeTextActive]}>
                      {c.tag}
                    </Text>
                  </View>
                  {c.recommended && (
                    <View style={styles.recBadge}>
                      <Text style={styles.recBadgeText}>מומלץ</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.cardDescription}>{c.description}</Text>
              </View>
              <View style={[styles.radio, isActive && styles.radioActive]}>
                {isActive && <View style={styles.radioDot} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.note}>
        <Text style={styles.noteText}>
          💡 המילים נבחרות לפי רמת קושי — המילים הנדירות ביותר מוצגות קודם. מילים שכבר למדת לא יוצגו שוב.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    paddingHorizontal: theme.spacing.md,
  },
  screenTitle: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'right',
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  section: { gap: theme.spacing.sm },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
    marginBottom: 4,
  },
  sectionSubtitle: {
    color: theme.colors.muted,
    fontSize: 13,
    textAlign: 'right',
    marginBottom: theme.spacing.sm,
    lineHeight: 20,
  },
  card: {
    backgroundColor: theme.colors.surface2,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  cardActive: {
    borderColor: theme.colors.accent,
    backgroundColor: 'rgba(124,106,247,0.1)',
  },
  cardLeft: { flex: 1 },
  cardHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: 4,
  },
  cardLabel: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  cardLabelActive: { color: theme.colors.accent },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  badgeActive: { backgroundColor: 'rgba(124,106,247,0.2)' },
  badgeText: {
    color: theme.colors.muted,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badgeTextActive: { color: theme.colors.accent },
  recBadge: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: 'rgba(106,247,200,0.15)',
  },
  recBadgeText: {
    color: theme.colors.accentGreen,
    fontSize: 10,
    fontWeight: '600',
  },
  cardDescription: {
    color: theme.colors.muted,
    fontSize: 13,
    textAlign: 'right',
    lineHeight: 18,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: theme.colors.accent },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.accent,
  },
  note: {
    marginTop: theme.spacing.xl,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  noteText: {
    color: theme.colors.muted,
    fontSize: 13,
    textAlign: 'right',
    lineHeight: 20,
  },
});
