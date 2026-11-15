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
  return `p_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export function getOrCreateIdentity(): { playerId: string; callsign: string } {
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
