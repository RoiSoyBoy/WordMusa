import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { theme } from '../styles/theme';

export default function SongWordsList({ words, onWordPress, flaggedWordSet, onWordFocus }) {
  const [filter, setFilter] = useState('all');

  useEffect(() => { setFilter('all'); }, [words]);

  const levelFilters = useMemo(() => {
    const counts = {};
    words.forEach(w => { if (w.unit != null) counts[w.unit] = (counts[w.unit] || 0) + 1; });
    return Object.keys(counts).map(Number).sort((a, b) => a - b)
      .map(u => ({ key: u, label: `${u} (${counts[u]})` }));
  }, [words]);

  const filtered = useMemo(() => {
    if (filter === 'all') return words;
    return words.filter(w => w.unit === filter);
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

  const renderItem = ({ item }) => {
    const wordKey = item.word.toLowerCase();
    const isInFocus = flaggedWordSet?.has(wordKey);
    return (
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
        </View>
        <Text style={styles.hebrew} numberOfLines={2}>{item.hebrewShort}</Text>
        <Pressable
          onPress={() => onWordFocus?.(item)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.starBtn}
        >
          <Text style={[styles.starText, isInFocus && styles.starTextActive]}>
            {isInFocus ? '★' : '☆'}
          </Text>
        </Pressable>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      {/* Difficulty filter chips */}
      <View style={styles.filterRow}>
        <Pressable
          onPress={() => setFilter('all')}
          style={({ pressed }) => [styles.chip, filter === 'all' && styles.chipActive, pressed && { opacity: 0.7 }]}
        >
          <Text style={[styles.chipText, filter === 'all' && styles.chipTextActive]}>הכל</Text>
        </Pressable>
        {levelFilters.map(f => (
          <Pressable
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={({ pressed }) => [styles.chip, filter === f.key && styles.chipActive, pressed && { opacity: 0.7 }]}
          >
            <Text style={[styles.chipText, filter === f.key && styles.chipTextActive]}>{f.label}</Text>
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
    flexWrap: 'wrap',
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    rowGap: 8,
  },
  chip: {
    flexShrink: 0,
    marginRight: 8,
    paddingHorizontal: 16,
    paddingVertical: 9,
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
    fontSize: 13,
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
  starBtn: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  starText: { color: 'rgba(255,255,255,0.25)', fontSize: 20 },
  starTextActive: { color: theme.colors.accent },
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
