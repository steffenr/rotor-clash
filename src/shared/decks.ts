import { STAT_DEFINITIONS, type StatDefinition, type StatKey, type TurbineCard } from './gameTypes.ts';

/**
 * Deck configuration. A deck is a set of 8 quartets (32 cards) that is compared on five stats.
 * The four stats every turbine has are shared; the fifth differs per deck because cut-in speed
 * is not documented for historic and prototype machines.
 *
 * Group ids decide the deck, so cards need no extra field: groups 1-8 are "modern", 9-16 are "records".
 * Keep this file free of Vite-only and browser-only imports (see AGENTS.md).
 */
export type DeckId = 'modern' | 'records';

export interface DeckConfig {
  id: DeckId;
  groupIds: number[];
  /** Compared stats, in display order. */
  statKeys: StatKey[];
}

export const DECKS: DeckConfig[] = [
  {
    id: 'modern',
    groupIds: [1, 2, 3, 4, 5, 6, 7, 8],
    statKeys: ['ratedPowerMw', 'rotorDiameterM', 'hubHeightM', 'cutInWindMs', 'plantCapacityMw'],
  },
  {
    id: 'records',
    groupIds: [9, 10, 11, 12, 13, 14, 15, 16],
    statKeys: ['ratedPowerMw', 'rotorDiameterM', 'hubHeightM', 'firstPowerYear', 'plantCapacityMw'],
  },
];

export const DEFAULT_DECK_ID: DeckId = 'modern';

export function deckConfig(deckId: DeckId): DeckConfig {
  return DECKS.find((d) => d.id === deckId) ?? DECKS[0];
}

export function deckIdForGroup(groupId: number): DeckId {
  return DECKS.find((d) => d.groupIds.includes(groupId))?.id ?? DEFAULT_DECK_ID;
}

export function deckIdOfCard(card: Pick<TurbineCard, 'groupId'>): DeckId {
  return deckIdForGroup(card.groupId);
}

export function statKeysForDeck(deckId: DeckId): StatKey[] {
  return deckConfig(deckId).statKeys;
}

export function statDefinitionsForDeck(deckId: DeckId): StatDefinition[] {
  return statKeysForDeck(deckId).map(
    (key) => STAT_DEFINITIONS.find((s) => s.key === key) ?? STAT_DEFINITIONS[0]
  );
}

/** Cards that belong to a deck. */
export function cardsOfDeck(cards: TurbineCard[], deckId: DeckId): TurbineCard[] {
  return cards.filter((c) => deckIdOfCard(c) === deckId);
}

/** A deck can be played once all of its quartets are present (4 cards per group). */
export function availableDeckIds(cards: TurbineCard[]): DeckId[] {
  return DECKS.filter((d) => cardsOfDeck(cards, d.id).length === d.groupIds.length * 4).map((d) => d.id);
}

/** Newest year a machine can have for the "older wins" scale. */
const YEAR_NOW = 2026;
const YEAR_SPAN = YEAR_NOW - 1941;

/**
 * How strong a value is, roughly 0..1, relative to the best machines in the game.
 * Used by the bot and by the auto-pick on timeout, so they always agree.
 */
const STRENGTH: Record<StatKey, (v: number) => number> = {
  ratedPowerMw: (v) => v / 26,
  rotorDiameterM: (v) => v / 310,
  hubHeightM: (v) => v / 185,
  cutInWindMs: (v) => Math.max(0, (4.2 - v) / 2.2),
  plantCapacityMw: (v) => Math.log10(Math.max(10, v)) / 4.1,
  firstPowerYear: (v) => Math.max(0, (YEAR_NOW - v) / YEAR_SPAN),
};

export function statStrength(key: StatKey, value: number): number {
  return STRENGTH[key](value);
}

/** The card's stats among `statKeys`, strongest first. */
export function rankStatsByStrength(stats: Record<StatKey, number>, statKeys: StatKey[]): StatKey[] {
  return [...statKeys].sort((a, b) => statStrength(b, stats[b]) - statStrength(a, stats[a]));
}

export function pickStrongestStat(stats: Record<StatKey, number>, statKeys: StatKey[]): StatKey {
  return rankStatsByStrength(stats, statKeys)[0];
}

/** Width of a stat bar on a card, 0..100. Older machines fill the first-power-year bar more. */
export function statStrengthPercent(key: StatKey, value: number): number {
  const clamp = (min: number, n: number) => Math.min(100, Math.max(min, Math.round(n)));
  switch (key) {
    case 'ratedPowerMw':
      return clamp(12, (value / 26) * 100);
    case 'rotorDiameterM':
      return clamp(20, (value / 310) * 100);
    case 'hubHeightM':
      return clamp(20, (value / 190) * 100);
    case 'cutInWindMs':
      return clamp(18, ((4.5 - value) / 2.5) * 100);
    case 'plantCapacityMw':
      // Same scale as before from 10 MW up; below that a small ramp so tiny machines still differ.
      if (value < 10) return clamp(5, 5 + ((Math.log10(Math.max(0.01, value)) + 2) / 3) * 20);
      return clamp(14, (Math.log10(value) / 4.05) * 100);
    case 'firstPowerYear':
      return clamp(10, ((YEAR_NOW - value) / YEAR_SPAN) * 100);
  }
}

// ---------------------------------------------------------------------------
// Deck modes: which cards a match is dealt and which five stats it compares.
// ---------------------------------------------------------------------------

/**
 * - modern: the 32 cards of deck 1 (compares cut-in speed)
 * - records: the 32 cards of deck 2 (compares first-power year)
 * - mixed: 8 random whole quartets from all 16 (32 cards, normal length)
 * - grand: all 64 cards, 16 quartets, longer match
 */
export type DeckMode = 'modern' | 'records' | 'mixed' | 'grand';

export const DECK_MODES: readonly DeckMode[] = ['modern', 'records', 'mixed', 'grand'];
export const DEFAULT_DECK_MODE: DeckMode = 'modern';

export function isDeckMode(value: unknown): value is DeckMode {
  return typeof value === 'string' && (DECK_MODES as readonly string[]).includes(value);
}

/**
 * A match compares every card on one stat set, so the set belongs to the mode, not to a card.
 * Every card has a year, which is why mixed and grand matches use the records stat set.
 */
export function statKeysForMode(mode: DeckMode): StatKey[] {
  return statKeysForDeck(mode === 'modern' ? 'modern' : 'records');
}

export function maxRoundsForMode(mode: DeckMode): number {
  return mode === 'grand' ? 48 : 24;
}

/** Falls back to the modern deck when the cards a mode needs are not available. */
export function resolveDeckMode(mode: DeckMode, cards: TurbineCard[]): DeckMode {
  const available = availableDeckIds(cards);
  const hasModern = available.includes('modern');
  const hasRecords = available.includes('records');
  switch (mode) {
    case 'records':
      return hasRecords ? 'records' : DEFAULT_DECK_MODE;
    case 'mixed':
    case 'grand':
      return hasModern && hasRecords ? mode : DEFAULT_DECK_MODE;
    default:
      return DEFAULT_DECK_MODE;
  }
}

function shuffled<T>(items: T[], rng: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** The shuffled card ids dealt for a match in this mode. */
export function buildMatchCardIds(mode: DeckMode, cards: TurbineCard[], rng: () => number = Math.random): string[] {
  const resolved = resolveDeckMode(mode, cards);
  let pool: TurbineCard[];
  if (resolved === 'modern') {
    pool = cardsOfDeck(cards, 'modern');
  } else if (resolved === 'records') {
    pool = cardsOfDeck(cards, 'records');
  } else if (resolved === 'grand') {
    pool = [...cardsOfDeck(cards, 'modern'), ...cardsOfDeck(cards, 'records')];
  } else {
    const groupIds = shuffled(
      DECKS.flatMap((d) => d.groupIds).filter((g) => cards.filter((c) => c.groupId === g).length === 4),
      rng
    ).slice(0, 8);
    pool = cards.filter((c) => groupIds.includes(c.groupId));
  }
  return shuffled(pool.map((c) => c.id), rng);
}

/** Group ids present among the given card ids, ascending. */
export function quartetGroupIdsOf(cardIds: string[], cards: TurbineCard[]): number[] {
  const byId = new Map(cards.map((c) => [c.id, c]));
  const groups = new Set<number>();
  for (const id of cardIds) {
    const card = byId.get(id);
    if (card) groups.add(card.groupId);
  }
  return [...groups].sort((a, b) => a - b);
}

export function statDefinitionsForMode(mode: DeckMode): StatDefinition[] {
  return statKeysForMode(mode).map(
    (key) => STAT_DEFINITIONS.find((s) => s.key === key) ?? STAT_DEFINITIONS[0]
  );
}

/** The last card id of the deck a card belongs to, e.g. "8D" or "16D". */
export function lastCardIdOfDeck(card: Pick<TurbineCard, 'groupId'>): string {
  const groups = deckConfig(deckIdOfCard(card)).groupIds;
  return `${Math.max(...groups)}D`;
}

/** Display text for a stat value; keeps precision for small machines (a 12 kW windmill is not "0 MW"). */
export function formatStatValue(key: StatKey, value: number, lang: 'en' | 'de'): string {
  const locale = lang === 'de' ? 'de-DE' : 'en-US';
  switch (key) {
    case 'firstPowerYear':
      return String(Math.round(value));
    case 'rotorDiameterM':
    case 'hubHeightM':
      return value.toLocaleString(locale, { maximumFractionDigits: 0 });
    case 'plantCapacityMw': {
      const digits = value < 1 ? 3 : value < 10 ? 2 : 0;
      return value.toLocaleString(locale, { maximumFractionDigits: digits });
    }
    case 'ratedPowerMw':
      if (value < 1) return String(Number(value.toFixed(3)));
      return value % 1 === 0 ? value.toFixed(1) : value.toFixed(2).replace(/0$/, '');
    default:
      return value.toFixed(1);
  }
}
