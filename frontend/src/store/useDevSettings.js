import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Dev-only switches (provider choice, debug overlay). In production builds the
// defaults are fixed: nothing is loaded from storage and update() is a no-op.
const STORAGE_KEY = 'devSettings';
const DEFAULTS = { providerId: 'spotify', overlayVisible: false };

const useDevSettings = create((set, get) => ({
  ...DEFAULTS,
  update: (patch) => {
    if (!__DEV__) return;
    set(patch);
    const { providerId, overlayVisible } = { ...get(), ...patch };
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ providerId, overlayVisible })).catch(() => {});
  },
}));

if (__DEV__) {
  AsyncStorage.getItem(STORAGE_KEY)
    .then(raw => { if (raw) useDevSettings.setState({ ...DEFAULTS, ...JSON.parse(raw) }); })
    .catch(() => {});
}

export default useDevSettings;
