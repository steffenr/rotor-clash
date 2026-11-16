import { PlayerProfile } from '../shared/gameTypes.ts';
import { Language } from './i18n.ts';

const PLAYER_ID_KEY = 'rotor_clash_player_id_v1';
const CALLSIGN_KEY = 'rotor_clash_callsign_v1';
const PROFILE_KEY = 'rotor_clash_profile_v1';
const LANGUAGE_KEY = 'rotor_clash_language_v1';

const LEGACY_KEYS = {
  playerId: 'aeolian_player_id_v1',
  callsign: 'aeolian_callsign_v1',
  profile: 'aeolian_profile_v1',
  language: 'aeolian_language_v1',
};

function readWithMigration(newKey: string, legacyKey: string): string | null {
  const current = localStorage.getItem(newKey);
  if (current !== null) return current;
  const legacy = localStorage.getItem(legacyKey);
  if (legacy !== null) {
    localStorage.setItem(newKey, legacy);
    localStorage.removeItem(legacyKey);
  }
  return legacy;
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return `p_${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Versions before device keys (see `deviceKey.ts`) stored a login secret as text. It is useless now,
 * so any leftover copy is deleted rather than left lying in storage.
 */
function removeStaleSecret() {
  try {
    localStorage.removeItem('rotor_clash_secret_v1');
  } catch {
    // ignore storage errors
  }
}

/**
 * Starts over with a brand-new player id, e.g. after the server refused the old id/key pair
 * (the caller also calls `resetDeviceKey()`).
 * The saved callsign is kept; ranking progress belongs to the old id and stays with it.
 */
export function resetIdentity(): { playerId: string; callsign: string } {
  try {
    localStorage.removeItem(PLAYER_ID_KEY);
    localStorage.removeItem(LEGACY_KEYS.playerId);
    localStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem(LEGACY_KEYS.profile);
    removeStaleSecret();
  } catch {
    // ignore storage errors
  }
  return getOrCreateIdentity();
}

export function getOrCreateIdentity(): { playerId: string; callsign: string } {
  removeStaleSecret();
  let playerId = readWithMigration(PLAYER_ID_KEY, LEGACY_KEYS.playerId);
  if (!playerId) {
    playerId = generateId();
    localStorage.setItem(PLAYER_ID_KEY, playerId);
  }

  let callsign = readWithMigration(CALLSIGN_KEY, LEGACY_KEYS.callsign);
  if (!callsign) {
    callsign = `Engineer-${playerId.slice(0, 4).toUpperCase()}`;
    localStorage.setItem(CALLSIGN_KEY, callsign);
  }

  return { playerId, callsign };
}

export function getSavedCallsign(fallback: string): string {
  return readWithMigration(CALLSIGN_KEY, LEGACY_KEYS.callsign) || fallback;
}

export function saveCallsignLocally(callsign: string) {
  localStorage.setItem(CALLSIGN_KEY, callsign);
}

export function loadCachedProfile(playerId: string, callsign: string): PlayerProfile {
  try {
    const raw = readWithMigration(PROFILE_KEY, LEGACY_KEYS.profile);
    if (raw) {
      const parsed = JSON.parse(raw) as PlayerProfile;
      if (parsed && parsed.id === playerId) {
        return { ...parsed, callsign };
      }
    }
  } catch {
    // ignore invalid JSON
  }
  return {
    id: playerId,
    callsign,
    elo: 1200,
    wins: 0,
    losses: 0,
    draws: 0,
    gamesPlayed: 0,
    winStreak: 0,
    bestStreak: 0,
    quartetsCompleted: 0,
    updatedAt: Date.now(),
  };
}

export function saveCachedProfile(profile: PlayerProfile) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    localStorage.setItem(CALLSIGN_KEY, profile.callsign);
  } catch {
    // ignore storage quota errors
  }
}

export function loadSavedLanguage(): Language {
  const saved = readWithMigration(LANGUAGE_KEY, LEGACY_KEYS.language);
  if (saved === 'de' || saved === 'en') return saved;
  return 'en';
}

export function saveLanguage(lang: Language) {
  localStorage.setItem(LANGUAGE_KEY, lang);
}
