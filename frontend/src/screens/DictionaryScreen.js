import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, ScrollView,
} from 'react-native';
import {
  doc, getDoc, setDoc, updateDoc, collection, query,
  where, onSnapshot, serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import useWordStore from '../store/useWordStore';
import { psychometricWordMap, psychometricWordList } from '../utils/psychometricWords';
import { theme } from '../styles/theme';

const TIER_RANK = { LOW: 0, MEDIUM: 1, HIGH: 2 };
const TABS = ['כל המילים', 'הפוקוס שלי'];
const LEVEL_FILTERS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; // 0 = ALL

function levelColor(level) {
  if (level <= 3) return '#6AF7C8';
  if (level <= 6) return '#FFC832';
  return '#F76A8A';
}
function levelBg(level) {
  if (level <= 3) return 'rgba(106,247,200,0.15)';
  if (level <= 6) return 'rgba(255,200,50,0.15)';
  return 'rgba(247,106,138,0.15)';
}

const ALL_WORDS = psychometricWordList;

async function addToFocusList(wordData) {
  const user = auth.currentUser;
  if (!user) return;
  const wordId = wordData.word.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const wordRef = doc(db, 'users', user.uid, 'wordHistory', wordId);
  try {
    const snap = await getDoc(wordRef);
    if (!snap.exists()) {
      await setDoc(wordRef, {
        word: wordData.word,
        flagged: true,
        flagContext: {},
        encounterCount: 0,
        firstEncounteredAt: serverTimestamp(),
        lastEncounteredAt: serverTimestamp(),
        tappedAt: null,
        learnedAt: null,
        songContexts: [],
      });
    } else if (!snap.data().flagged) {
      await updateDoc(wordRef, { flagged: true });
    }
  } catch (err) {
    console.warn('addToFocusList error:', err.message);
  }
}

export default function DictionaryScreen() {
  const [activeTab, setActiveTab] = useState('כל המילים');
  const [levelFilter, setLevelFilter] = useState(0); // 0 = all levels
  const [search, setSearch] = useState('');
  const [flaggedIds, setFlaggedIds] = useState(new Set());
  const [loadingFocus, setLoadingFocus] = useState(true);
  const { setSelectedWord } = useWordStore();

  // Live subscription to focus words
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) { setLoadingFocus(false); return; }
    const q = query(
      collection(db, 'users', user.uid, 'wordHistory'),
      where('flagged', '==', true)
    );
    const unsub = onSnapshot(q, snap => {
      setFlaggedIds(new Set(snap.docs.map(d => d.id)));
      setLoadingFocus(false);
    }, err => {
      console.warn('flaggedIds snapshot error:', err.message);
      setLoadingFocus(false);
    });
    return unsub;
  }, []);

  const allFiltered = useMemo(() => {
    const s = search.toLowerCase();
    return ALL_WORDS.filter(w => {
      if (levelFilter !== 0 && w.level !== levelFilter) return false;
      if (s) return w.word.toLowerCase().includes(s) || w.hebrewShort?.toLowerCase().includes(s);
      return true;
    });
  }, [search, levelFilter]);

  const focusWords = useMemo(() => {
    return [...flaggedIds]
      .map(id => psychometricWordMap.get(id))
      .filter(Boolean)
      .sort((a, b) => {
        const td = TIER_RANK[a.frequencyTier] - TIER_RANK[b.frequencyTier];
        return td !== 0 ? td : a.word.localeCompare(b.word);
      })
      .filter(w => !search || w.word.toLowerCase().includes(search.toLowerCase()));
  }, [flaggedIds, search]);

  const listData = activeTab === 'כל המילים' ? allFiltered : focusWords;
  const isLoading = activeTab === 'הפוקוס שלי' && loadingFocus;

  const renderItem = ({ item }) => {
    const wordKey = item.word.toLowerCase();
    const isInFocus = flaggedIds.has(wordKey);

    return (
      <TouchableOpacity
        style={styles.row}
        activeOpacity={0.7}
        onPress={() => setSelectedWord(item)}
      >
        <View style={styles.rowLeft}>
          <Text style={styles.wordText}>{item.word}</Text>
          <Text style={styles.hebrewText} numberOfLines={1}>{item.hebrewShort}</Text>
        </View>
        <View style={styles.rowRight}>
          {item.level ? (
            <View style={[styles.badge, { backgroundColor: levelBg(item.level) }]}>
              <Text style={[styles.badgeText, { color: levelColor(item.level) }]}>
                {item.level}
              </Text>
            </View>
          ) : null}
          <TouchableOpacity
            onPress={() => { if (!isInFocus) addToFocusList(item); }}
            activeOpacity={isInFocus ? 1 : 0.7}
            style={[styles.focusBtn, isInFocus && styles.focusBtnActive]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.focusBtnText, isInFocus && styles.focusBtnTextActive]}>
              {isInFocus ? '★' : '☆'}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="חפש מילה..."
        placeholderTextColor={theme.colors.muted}
        value={search}
        onChangeText={setSearch}
        textAlign="right"
        autoCorrect={false}
        autoCapitalize="none"
      />

      <View style={styles.tabRow}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            activeOpacity={0.7}
            onPress={() => { setActiveTab(tab); setLevelFilter(0); }}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab}
            </Text>
            {tab === 'הפוקוס שלי' && flaggedIds.size > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{flaggedIds.size}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'כל המילים' && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.levelRow}
        >
          {LEVEL_FILTERS.map(lvl => {
            const isActive = levelFilter === lvl;
            const color = lvl === 0 ? theme.colors.accent : levelColor(lvl);
            const bg = lvl === 0 ? theme.colors.highlight : levelBg(lvl);
            return (
              <TouchableOpacity
                key={lvl}
                style={[styles.levelPill, isActive && { borderColor: color, backgroundColor: bg }]}
                activeOpacity={0.7}
                onPress={() => setLevelFilter(lvl)}
              >
                <Text style={[styles.levelText, isActive && { color }]}>
                  {lvl === 0 ? 'הכל' : `${lvl}`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {isLoading ? (
        <ActivityIndicator color={theme.colors.accent} style={styles.spinner} />
      ) : listData.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            {activeTab === 'הפוקוס שלי'
              ? 'עדיין לא הוספת מילים לרשימת הפוקוס.\nהאזן לשיר והוסף מילים מהגיליון!'
              : 'אין תוצאות'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={item => item.word}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
          initialNumToRender={30}
          maxToRenderPerBatch={30}
          windowSize={10}
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
  tabRow: {
    flexDirection: 'row-reverse',
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
    marginBottom: 12,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  tabActive: {
    borderColor: theme.colors.accent,
    backgroundColor: theme.colors.highlight,
  },
  tabText: { color: theme.colors.muted, fontSize: 14, fontWeight: '500' },
  tabTextActive: { color: theme.colors.accent, fontWeight: '600' },
  levelRow: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.md,
    gap: theme.spacing.sm,
    marginBottom: 10,
    paddingVertical: 2,
  },
  levelPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    minWidth: 44,
    alignItems: 'center',
  },
  levelText: { color: theme.colors.muted, fontSize: 13, fontWeight: '600' },
  tabBadge: {
    backgroundColor: theme.colors.accent,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 13,
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
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 10, marginLeft: 12 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  focusBtn: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  focusBtnActive: {},
  focusBtnText: { color: theme.colors.muted, fontSize: 20 },
  focusBtnTextActive: { color: theme.colors.accent },
  spinner: { marginTop: 40 },
  empty: { marginTop: 50, paddingHorizontal: 40 },
  emptyText: { color: theme.colors.muted, fontSize: 15, textAlign: 'center', lineHeight: 24 },
});
