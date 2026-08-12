import { Platform } from 'react-native';

const APP_GROUP = 'group.com.roisoyboy.psycholyrics'; // iOS App Group suite name
const PREFS_FILE = 'widget_prefs';                    // Android SharedPreferences file
const KEY = 'lyriclearn_widget_word';

function getPrefs() {
  if (Platform.OS === 'web') return null;
  try {
    // Dynamic require so the web bundle never tries to load this native module
    return require('react-native-shared-group-preferences').default;
  } catch {
    return null;
  }
}

/**
 * Write the widget payload to the shared native storage.
 * The iOS widget reads from NSUserDefaults(suiteName: APP_GROUP).
 * The Android widget reads from SharedPreferences(PREFS_FILE).
 * Safe to call on web — silently does nothing.
 */
export async function writeWidgetWord(wordData, { isPinned = false } = {}) {
  const prefs = getPrefs();
  if (!prefs) return;

  const payload = JSON.stringify({
    word: wordData.word,
    partOfSpeech: wordData.partOfSpeech || '',
    hebrewShort: wordData.hebrewShort || '',
    frequencyTier: wordData.frequencyTier || 'MEDIUM',
    isPinned,
    date: new Date().toISOString().slice(0, 10), // YYYY-MM-DD
  });

  try {
    if (Platform.OS === 'ios') {
      await prefs.setItem(KEY, payload, APP_GROUP);
      // Tell WidgetKit to re-render immediately instead of waiting until midnight
      prefs.reloadAllTimelines?.();
    } else if (Platform.OS === 'android') {
      await prefs.setItem(KEY, payload, PREFS_FILE);
    }
  } catch (err) {
    console.warn('widgetBridge write error:', err.message);
  }
}

/**
 * Read the current widget payload from shared native storage.
 * Returns null on web or if no word has been written yet.
 */
export async function readWidgetWord() {
  const prefs = getPrefs();
  if (!prefs) return null;

  try {
    const raw = Platform.OS === 'ios'
      ? await prefs.getItem(KEY, APP_GROUP)
      : await prefs.getItem(KEY, PREFS_FILE);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
