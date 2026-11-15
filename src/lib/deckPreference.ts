import { DEFAULT_DECK_MODE, isDeckMode, type DeckMode } from '../shared/decks.ts';

const KEY = 'rotor_clash_deck_v1';

export function loadSavedDeckMode(): DeckMode {
  try {
    const raw = localStorage.getItem(KEY);
    return isDeckMode(raw) ? raw : DEFAULT_DECK_MODE;
  } catch {
    return DEFAULT_DECK_MODE;
  }
}

export function saveDeckMode(mode: DeckMode): void {
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    /* storage unavailable: the choice still applies for this session */
  }
}
