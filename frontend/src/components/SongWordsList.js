import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { theme } from '../styles/theme';

const FILTERS = [
  { key: 'all', label: 'הכל' },
  { key: 'easy', label: 'קל 1–4' },
  { key: 'medium', label: 'בינוני 5–7' },
  { key: 'hard', label: 'קשה 8–10' },
];

export default function SongWordsList({ words, onWordPress }) {
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(() => {
    if (filter === 'easy')   return words.filter(w => (w.unit ?? 99) <= 4);
    if (filter === 'medium') return words.filter(w => (w.unit ?? 99) >= 5 && (w.unit ?? 99) <= 7);
    if (filter === 'hard')   return words.filter(w => (w.unit ?? 99) >= 8);
    return words;
  }, [words, filter]);

  const renderEmpty = () => {
    if (!words.length) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {words.length === 0 && filter === 'all'
              ? 'לא נמצאו מילים פסיכומטריות בשיר הזה'
              : 'אין מילים ברמה זו בשיר'}
          </Text>
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>אין מילים ברמה זו בשיר</Text>
      </View>
    );
  };

  const renderItem = ({ item }) => (
    <Pressable
      onPress={() => onWordPress(item)}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.rowLeft}>
        <View style={styles.wordRow}>
          <Text style={styles.word}>{item.word}</Text>
          {item.unit != null && (
            <View style={styles.unitBadge}>
              <Text style={styles.unitText}>יחידה {item.unit}</Text>
            </View>
          )}
        </View>
        {item.ipa ? <Text style={styles.ipa}>{item.ipa}</Text> : null}
      </View>
      <Text style={styles.hebrew} numberOfLines={2}>{item.hebrewShort}</Text>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      {/* Difficulty filter chips */}
      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <Pressable
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={({ pressed }) => [
              styles.chip,
              filter === f.key && styles.chipActive,
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={[styles.chipText, filter === f.key && styles.chipTextActive]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.word}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={filtered.length === 0 ? styles.emptyList : styles.list}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: theme.colors.surface2,
  },
  chipActive: {
    backgroundColor: 'rgba(124,106,247,0.2)',
    borderColor: theme.colors.accent,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.muted,
  },
  chipTextActive: {
    color: theme.colors.accent,
  },

  list: { paddingHorizontal: theme.spacing.md, paddingBottom: 16 },
  emptyList: { flex: 1 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface2,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  rowPressed: {
    backgroundColor: 'rgba(124,106,247,0.1)',
  },
  rowLeft: { flex: 1 },
  wordRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  word: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  unitBadge: {
    backgroundColor: 'rgba(124,106,247,0.18)',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  unitText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.accent,
  },
  ipa: {
    fontSize: 12,
    color: theme.colors.muted,
    marginTop: 2,
  },
  hebrew: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'right',
    marginLeft: 12,
    flexShrink: 1,
  },

  separator: {
    height: 6,
  },

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
  },
  emptyText: {
    color: theme.colors.muted,
    fontSize: 15,
    textAlign: 'center',
    fontWeight: '500',
  },
});
