import React from 'react';
import { Modal, View, Text, Pressable, Switch, StyleSheet } from 'react-native';
import { PROVIDER_IDS } from '../../providers';
import useDevSettings from '../../store/useDevSettings';
import { theme } from '../../styles/theme';

const LABELS = { spotify: 'Spotify', mock: 'Mock (fake timer)', apple: 'Apple Music (stub)' };

// Dev builds only — opened by long-pressing the song title / empty state on Now Playing
export default function DevMenu({ visible, onClose }) {
  const { providerId, overlayVisible, update } = useDevSettings();
  if (!__DEV__) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.panel}>
          <Text style={styles.title}>Dev menu</Text>
          <Text style={styles.section}>Now-playing provider</Text>
          {PROVIDER_IDS.map(id => (
            <Pressable
              key={id}
              onPress={() => update({ providerId: id })}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
            >
              <Text style={[styles.rowText, id === providerId && styles.rowActive]}>
                {id === providerId ? '●  ' : '○  '}{LABELS[id] || id}
              </Text>
            </Pressable>
          ))}
          <View style={[styles.row, styles.switchRow]}>
            <Text style={styles.rowText}>Debug overlay</Text>
            <Switch value={overlayVisible} onValueChange={v => update({ overlayVisible: v })} />
          </View>
          <Pressable onPress={onClose} style={({ pressed }) => [styles.close, pressed && { opacity: 0.7 }]}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  panel: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.md,
  },
  title: { color: theme.colors.text, fontSize: 18, fontWeight: '700', textAlign: 'left' },
  section: {
    color: theme.colors.muted,
    fontSize: 12,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
    textAlign: 'left',
  },
  row: { paddingVertical: 10 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowText: { color: theme.colors.text, fontSize: 15, textAlign: 'left' },
  rowActive: { color: theme.colors.accent, fontWeight: '700' },
  close: { marginTop: theme.spacing.sm, paddingVertical: 10, alignItems: 'center' },
  closeText: { color: theme.colors.accent, fontSize: 15, fontWeight: '600' },
});
