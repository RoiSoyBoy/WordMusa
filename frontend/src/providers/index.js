import { createSpotifyProvider } from './spotifyProvider';
import { createMockProvider } from './mockProvider';
import { createAppleMusicProvider } from './appleMusicProvider';

/**
 * Now-playing provider contract
 *
 * A provider is a plain object created by a factory below:
 *   id, label
 *   available?          false when the provider can't run yet (Apple Music stub)
 *   start({ onTrack, onError }) → stop()
 *     onTrack(updater)  React-style setter: pass a track snapshot, null, or prev => next
 *     onError(message)  last error for the dev overlay (null clears it)
 *   pollNow?()          force an immediate refresh (e.g. after a control action)
 *   controls?           optional capabilities — any subset of
 *                       { play(), pause(), next(), previous(), seek(ms) }, each
 *                       async → true on success. Missing ones are hidden in the UI.
 *   openApp?()          optional — open the source player app
 *   syncOptions?        optional { leadCompensationMs, maxExtrapolationMs } overrides
 *                       for useLyricSync's shared position estimate; allowAnonymous
 *                       (dev builds only) loads lyrics without a login
 *
 * Track snapshot shape (same as the spotifyPlayer response the app already uses):
 *   { track_id, track_name, artist, album_art, duration_ms, position_ms, is_playing }
 *
 * Providers report raw position + play state only. Position interpolation between
 * reports lives in useLyricSync (shared), never in a provider.
 */

const FACTORIES = {
  spotify: createSpotifyProvider,
  apple: createAppleMusicProvider,
  ...(__DEV__ ? { mock: createMockProvider } : {}),
};

export const PROVIDER_IDS = Object.keys(FACTORIES);

// Unknown or dev-only ids fall back to Spotify, so production can never run Mock
export function createProvider(id) {
  return (FACTORIES[id] || FACTORIES.spotify)();
}
