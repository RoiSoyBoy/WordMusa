import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import useWordStore from '../store/useWordStore';
import { psychometricWordMap } from '../utils/psychometricWords';
import { theme } from '../styles/theme';

const FILTERS = ['הכל', 'נלמד', 'בתהליך', 'HIGH', 'מסומן'];

const FREQ_COLOR = { HIGH: '#F76A8A', MEDIUM: '#FFC832', LOW: '#6AF7C8' };
const FREQ_BG = {
  HIGH: 'rgba(247,106,138,0.2)',
  MEDIUM: 'rgba(255,200,50,0.2)',
  LOW: 'rgba(106,247,200,0.2)',
};

export default function DictionaryScreen() {
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('הכל');
  const { setSelectedWord } = useWordStore();

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'users', user.uid, 'wordHistory'),
      orderBy('lastEncounteredAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      setWords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return unsub; // Correctly returns the unsubscribe function
  }, []); // Fixed missing closing brace for the useEffect block

  const filtered = words.filter(w => {
    const wordStr = w.word?.toLowerCase() || '';
    if (search && !wordStr.includes(search.toLowerCase())) return false;
    if (activeFilter === 'נלמד') return !!w.learnedAt;
    if (activeFilter === 'בתהליך') return !w.learnedAt && w.encounterCount > 0;
    if (activeFilter === 'HIGH') return psychometricWordMap.get(wordStr)?.frequencyTier === 'HIGH';
    if (activeFilter === 'מסומן') return !!w.flagged;
    return true;
  });

  const renderItem = ({ item }) => {
    const fullWord = psychometricWordMap.get(item.word?.toLowerCase());
    const freq = fullWord?.frequencyTier;
    const isFlaggedOnly = item.flagged && !fullWord;

    const handlePress = () => {
      if (isFlaggedOnly) {
        setSelectedWord({
          word: item.word,
          lyricContext: {
            text: item.flagContext?.text || '',
            translation: item.flagContext?.translation || null,
          },
        });
      } else if (fullWord) {
        setSelectedWord(fullWord);
      }
    };

    return (
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.7}
        onPress={handlePress}
      >
        <View style={styles.rowLeft}>
          <Text style={styles.wordText}>{item.word}</Text>
          <Text style={styles.hebrewText} numberOfLines={1}>
            {isFlaggedOnly
              ? (item.flagContext?.wordTranslation || '')
              : (fullWord?.hebrewShort || '')}
          </Text>
        </View>
        <View style={styles.rowRight}>
          {!isFlaggedOnly && freq ? (
            <View style={[styles.badge, { borderColor: FREQ_COLOR[freq], backgroundColor: FREQ_BG[freq] }]}>
              <Text style={[styles.badgeText, { color: FREQ_COLOR[freq] }]}>{freq}</Text>
            </View>
          ) : null}
          {item.encounterCount > 0 && (
            <Text style={styles.count}>{item.encounterCount}×</Text>
          )}
          {item.learnedAt && <Text style={styles.check}>✓</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="חפש מילה..."
        placeholderTextColor="#7A7A9A"
        value={search}
        onChangeText={setSearch}
        textAlign="right"
      />

      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, activeFilter === f && styles.filterTabActive]}
            activeOpacity={0.7}
            onPress={() => setActiveFilter(f)}
          >
            <Text style={[styles.filterLabel, activeFilter === f && styles.filterLabelActive]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={theme.colors.accent} style={styles.spinner} />
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            {words.length === 0
              ? 'עדיין לא למדת מילים. התחל להאזין לשירים!'
              : 'אין תוצאות לסינון זה'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg, paddingTop: 12 },
  searchInput: {
    backgroundColor: theme.colors.surface2,
    color: theme.colors.text,
    borderRadius: theme.radii.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 10,
    marginHorizontal: theme.spacing.md,
    marginBottom: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  filterRow: {
    flexDirection: 'row-reverse',
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
    marginBottom: 12,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  filterTabActive: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.highlight,
  },
  filterLabel: { color: theme.colors.muted, fontSize: 13 },
  filterLabelActive: { color: theme.colors.accent },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  rowLeft: { flex: 1 },
  wordText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 3,
    textAlign: 'left',
  },
  hebrewText: { color: theme.colors.muted, fontSize: 13, textAlign: 'left' },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 12 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeText: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  count: { color: theme.colors.muted, fontSize: 12 },
  check: { color: theme.colors.accentGreen, fontSize: 16, fontWeight: '700' },
  spinner: { marginTop: 40 },
  empty: { marginTop: 50, paddingHorizontal: 40 },
  emptyText: { color: theme.colors.muted, fontSize: 15, textAlign: 'center', lineHeight: 24 },
});