import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import useWordStore from '../store/useWordStore';
import { psychometricWordMap } from '../utils/psychometricWords';

const FILTERS = ['הכל', 'נלמד', 'בתהליך', 'HIGH'];

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
    if (activeFilter === 'בתהליך') return !w.learnedAt;
    if (activeFilter === 'HIGH') return psychometricWordMap.get(wordStr)?.frequencyTier === 'HIGH';
    return true;
  });

  const renderItem = ({ item }) => {
    const fullWord = psychometricWordMap.get(item.word?.toLowerCase());
    const freq = fullWord?.frequencyTier;

    return (
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.7}
        onPress={() => fullWord && setSelectedWord(fullWord)}
      >
        <View style={styles.rowLeft}>
          <Text style={styles.wordText}>{item.word}</Text>
          <Text style={styles.hebrewText} numberOfLines={1}>
            {fullWord?.hebrewShort || ''}
          </Text>
        </View>
        <View style={styles.rowRight}>
          {freq && (
            <View style={[styles.badge, { borderColor: FREQ_COLOR[freq], backgroundColor: FREQ_BG[freq] }]}>
              <Text style={[styles.badgeText, { color: FREQ_COLOR[freq] }]}>{freq}</Text>
            </View>
          )}
          <Text style={styles.count}>{item.encounterCount}×</Text>
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
        <ActivityIndicator color="#7C6AF7" style={styles.spinner} />
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
  container: { flex: 1, backgroundColor: '#0A0A0F', paddingTop: 12 },
  searchInput: {
    backgroundColor: '#1C1C28',
    color: '#F0EEFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  filterRow: {
    flexDirection: 'row-reverse', // Reversed for RTL layout consistency
    paddingHorizontal: 16,
    gap: 8,
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
    borderColor: '#7C6AF7',
    backgroundColor: 'rgba(124,106,247,0.15)',
  },
  filterLabel: { color: '#7A7A9A', fontSize: 13 },
  filterLabelActive: { color: '#7C6AF7' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  rowLeft: { flex: 1 }, // Added to ensure spacing
  wordText: { 
    color: '#F0EEFF', 
    fontSize: 16, 
    fontWeight: '600', 
    marginBottom: 3, 
    textAlign: 'left' 
  },
  hebrewText: { color: '#7A7A9A', fontSize: 13, textAlign: 'left' },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 12 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeText: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  count: { color: '#7A7A9A', fontSize: 12 },
  check: { color: '#6AF7C8', fontSize: 16, fontWeight: '700' },
  spinner: { marginTop: 40 },
  empty: { marginTop: 50, paddingHorizontal: 40 },
  emptyText: { color: '#7A7A9A', fontSize: 15, textAlign: 'center', lineHeight: 24 },
});