import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
} from 'react-native';
import { theme } from '../styles/theme';

const TIER_STYLE = {
  LOW:    { bg: 'rgba(106,247,200,0.15)', text: '#6AF7C8', label: 'נדיר' },
  MEDIUM: { bg: 'rgba(255,200,50,0.15)',  text: '#FFC832', label: 'בינוני' },
  HIGH:   { bg: 'rgba(247,106,138,0.15)', text: '#F76A8A', label: 'נפוץ' },
};

export default function SongWordsSheet({ visible, words, onAdd, onDismiss }) {
  const [added, setAdded] = useState(new Set());

  function handleAdd(wordData) {
    const key = wordData.word.toLowerCase();
    if (added.has(key)) return;
    setAdded(prev => new Set([...prev, key]));
    onAdd(wordData);
  }

  function handleAddAll() {
    words.forEach(w => handleAdd(w));
  }

  function handleDismiss() {
    setAdded(new Set());
    onDismiss();
  }

  if (!visible || !words?.length) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleDismiss}
    >
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={handleDismiss} />
      <SafeAreaView style={styles.sheet}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <TouchableOpacity onPress={handleDismiss} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.closeBtn}>✕</Text>
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.title}>מילים מהשיר</Text>
            <Text style={styles.subtitle}>{words.length} מילים פסיכומטריות</Text>
          </View>
        </View>

        {words.map((wordData, i) => {
          const key = wordData.word.toLowerCase();
          const isAdded = added.has(key);
          const tier = TIER_STYLE[wordData.frequencyTier] || TIER_STYLE.HIGH;
          return (
            <View key={key} style={[styles.row, i < words.length - 1 && styles.rowBorder]}>
              <View style={styles.rowLeft}>
                <Text style={styles.wordEn}>{wordData.word}</Text>
                <Text style={styles.wordHe}>{wordData.hebrewShort}</Text>
              </View>
              <View style={styles.rowRight}>
                <View style={[styles.badge, { backgroundColor: tier.bg }]}>
                  <Text style={[styles.badgeText, { color: tier.text }]}>{tier.label}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleAdd(wordData)}
                  activeOpacity={0.7}
                  style={[styles.addBtn, isAdded && styles.addBtnDone]}
                >
                  <Text style={[styles.addBtnText, isAdded && styles.addBtnTextDone]}>
                    {isAdded ? '✓' : '+'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        <TouchableOpacity
          style={styles.addAllBtn}
          activeOpacity={0.7}
          onPress={handleAddAll}
        >
          <Text style={styles.addAllText}>הוסף את כולן לרשימת הפוקוס</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: theme.colors.surface2,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.xl,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: theme.spacing.md,
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  headerText: { alignItems: 'flex-end' },
  title: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'right',
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: 12,
    textAlign: 'right',
    marginTop: 2,
  },
  closeBtn: {
    color: theme.colors.muted,
    fontSize: 18,
    padding: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  rowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  rowLeft: { flex: 1, alignItems: 'flex-start' },
  wordEn: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  wordHe: {
    color: theme.colors.muted,
    fontSize: 13,
    marginTop: 2,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  badge: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  addBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: theme.colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnDone: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  addBtnText: {
    color: theme.colors.muted,
    fontSize: 17,
    lineHeight: 19,
    fontWeight: '400',
  },
  addBtnTextDone: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '700',
  },
  addAllBtn: {
    marginTop: theme.spacing.md,
    backgroundColor: theme.colors.accent,
    borderRadius: 500,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addAllText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '700',
  },
});
