import { useState, useEffect, useMemo } from 'react';
import { createProvider } from '../providers';

/**
 * Hook: useNowPlaying
 *
 * Runs the selected now-playing provider and exposes its latest track snapshot.
 * Switching providerId stops the old provider and starts the new one from a clean slate.
 */
export function useNowPlaying(providerId) {
  const provider = useMemo(() => createProvider(providerId), [providerId]);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [lastError, setLastError] = useState(null);

  useEffect(() => {
    setCurrentTrack(null);
    setLastError(null);
    return provider.start({ onTrack: setCurrentTrack, onError: setLastError });
  }, [provider]);

  return { provider, currentTrack, lastError };
}
