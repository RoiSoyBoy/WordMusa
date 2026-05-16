import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@lyriclearn/wordCap';

export function useDifficulty() {
  const [wordCap, setWordCapState] = useState(2);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(v => { if (v) setWordCapState(parseInt(v, 10)); })
      .catch(() => {});
  }, []);

  const setWordCap = async (n) => {
    setWordCapState(n);
    await AsyncStorage.setItem(STORAGE_KEY, String(n)).catch(() => {});
  };

  return { wordCap, setWordCap };
}
