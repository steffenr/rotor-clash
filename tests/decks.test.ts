import test from 'node:test';
import assert from 'node:assert/strict';
import { compareStat } from '../src/shared/turbines.ts';
import {
  DECKS,
  deckIdForGroup,
  deckIdOfCard,
  pickStrongestStat,
  statDefinitionsForDeck,
  statKeysForDeck,
  statStrengthPercent,
} from '../src/shared/decks.ts';
import { parseTurbineMarkdown } from '../src/shared/markdownParser.ts';
import type { StatKey, TurbineCard } from '../src/shared/gameTypes.ts';

const stats = (over: Partial<Record<StatKey, number>> = {}): Record<StatKey, number> => ({
  ratedPowerMw: 1,
  rotorDiameterM: 50,
  hubHeightM: 50,
  cutInWindMs: 4,
  plantCapacityMw: 20,
  firstPowerYear: 2020,
  ...over,
});

test('firstPowerYear is a lower-wins stat: the older machine wins, equal years tie', () => {
  assert.equal(compareStat('firstPowerYear', 1941, 1991), 1);
  assert.equal(compareStat('firstPowerYear', 2013, 1957), 2);
  assert.equal(compareStat('firstPowerYear', 1978, 1978), 0);
  // existing behaviour is untouched
  assert.equal(compareStat('cutInWindMs', 2.0, 3.5), 1);
  assert.equal(compareStat('ratedPowerMw', 15, 6), 1);
});

test('each deck compares exactly five stats; the modern deck uses cut-in, the records deck uses first-power year', () => {
  const modern = statKeysForDeck('modern');
  const records = statKeysForDeck('records');
  assert.equal(modern.length, 5);
  assert.equal(records.length, 5);
  assert.ok(modern.includes('cutInWindMs') && !modern.includes('firstPowerYear'));
  assert.ok(records.includes('firstPowerYear') && !records.includes('cutInWindMs'));
  for (const shared of ['ratedPowerMw', 'rotorDiameterM', 'hubHeightM', 'plantCapacityMw'] as StatKey[]) {
    assert.ok(modern.includes(shared) && records.includes(shared), shared);
  }
});

test('stat definitions for a deck follow the deck order and carry the lower-wins flag', () => {
  const defs = statDefinitionsForDeck('records');
  assert.deepEqual(
    defs.map((d) => d.key),
    statKeysForDeck('records')
  );
  assert.equal(defs.find((d) => d.key === 'firstPowerYear')?.higherWins, false);
  assert.equal(statDefinitionsForDeck('modern').find((d) => d.key === 'cutInWindMs')?.higherWins, false);
});

test('groups 1-8 belong to the modern deck and 9-16 to the records deck', () => {
  for (let g = 1; g <= 8; g++) assert.equal(deckIdForGroup(g), 'modern');
  for (let g = 9; g <= 16; g++) assert.equal(deckIdForGroup(g), 'records');
  assert.equal(deckIdOfCard({ groupId: 12 } as TurbineCard), 'records');
  assert.deepEqual(
    DECKS.map((d) => d.groupIds.length),
    [8, 8]
  );
});

test('stat choice only considers the stats of the card’s own deck', () => {
  // Very old machine: wins on first-power year in the records deck...
  const old = stats({ firstPowerYear: 1941, ratedPowerMw: 0.2, rotorDiameterM: 24, hubHeightM: 25, plantCapacityMw: 0.2 });
  assert.equal(pickStrongestStat(old, statKeysForDeck('records')), 'firstPowerYear');
  // ...but the modern deck ignores the year and falls back to its own best stat.
  assert.notEqual(pickStrongestStat(old, statKeysForDeck('modern')), 'firstPowerYear');
  // Modern behaviour is unchanged: a 2.0 m/s cut-in is the standout stat.
  const lowCutIn = stats({ cutInWindMs: 2.0, ratedPowerMw: 2, rotorDiameterM: 90, hubHeightM: 80, plantCapacityMw: 20 });
  assert.equal(pickStrongestStat(lowCutIn, statKeysForDeck('modern')), 'cutInWindMs');
});

test('strength bar for first-power year: older fills more, never empty', () => {
  assert.ok(statStrengthPercent('firstPowerYear', 1941) > statStrengthPercent('firstPowerYear', 2020));
  assert.ok(statStrengthPercent('firstPowerYear', 2025) >= 10);
  assert.ok(statStrengthPercent('firstPowerYear', 1941) <= 100);
  assert.equal(statStrengthPercent('ratedPowerMw', 26), 100);
});

test('a deck-2 card without a cut-in speed parses, with first-power year taken from its year', () => {
  const md = `---
id: 9A
groupId: 9
slot: A
modelName: Test Pioneer
manufacturer: Somebody
deploymentType: Onshore
imageCategory: onshore
photoKey: fallback_onshore
isRealPhoto: false
year: 1941
sweptAreaM2: 2227
flagshipPlant: Test Knob
flagshipLocation: Vermont, USA
turbineCountInPlant: 1
ratedPowerMw: 1.25
rotorDiameterM: 53.3
hubHeightM: 36
plantCapacityMw: 1.25
sourceUrl: https://example.org
sourceLabel: Example
---`;
  const card = parseTurbineMarkdown(md, { en: {}, de: {} });
  assert.equal(card.stats.firstPowerYear, 1941);
  assert.equal(card.stats.cutInWindMs, 0);
  assert.equal(card.stats.ratedPowerMw, 1.25);
  assert.equal(deckIdOfCard(card), 'records');
});

// ---- deck modes (which cards and stats a match uses) ----
import {
  DECK_MODES,
  buildMatchCardIds,
  isDeckMode,
  maxRoundsForMode,
  quartetGroupIdsOf,
  resolveDeckMode,
  statKeysForMode,
} from '../src/shared/decks.ts';

function syntheticCards(groupIds: number[]): TurbineCard[] {
  return groupIds.flatMap((g) =>
    (['A', 'B', 'C', 'D'] as const).map((slot) => ({ id: `${g}${slot}`, groupId: g, slot }) as TurbineCard)
  );
}
const ALL_GROUPS = Array.from({ length: 16 }, (_, i) => i + 1);

test('deck modes: validation and the match stat set (cut-in only in the modern deck)', () => {
  assert.deepEqual([...DECK_MODES], ['modern', 'records', 'mixed', 'grand']);
  assert.equal(isDeckMode('grand'), true);
  assert.equal(isDeckMode('mixed'), true);
  assert.equal(isDeckMode('nope'), false);
  assert.equal(isDeckMode(undefined), false);
  assert.ok(statKeysForMode('modern').includes('cutInWindMs'));
  // Every card has a year, so mixed and grand matches compare on first-power year.
  for (const m of ['records', 'mixed', 'grand'] as const) {
    assert.ok(statKeysForMode(m).includes('firstPowerYear'), m);
    assert.ok(!statKeysForMode(m).includes('cutInWindMs'), m);
  }
});

test('the Grand Tour is longer; every other mode keeps 24 rounds', () => {
  assert.equal(maxRoundsForMode('grand'), 48);
  for (const m of ['modern', 'records', 'mixed'] as const) assert.equal(maxRoundsForMode(m), 24);
});

test('buildMatchCardIds: modern and records use their own 32 cards, grand uses all 64', () => {
  const cards = syntheticCards(ALL_GROUPS);
  const modern = buildMatchCardIds('modern', cards);
  const records = buildMatchCardIds('records', cards);
  const grand = buildMatchCardIds('grand', cards);
  assert.equal(modern.length, 32);
  assert.equal(records.length, 32);
  assert.equal(grand.length, 64);
  assert.ok(quartetGroupIdsOf(modern, cards).every((g) => g <= 8));
  assert.ok(quartetGroupIdsOf(records, cards).every((g) => g >= 9));
  assert.equal(new Set(grand).size, 64);
  assert.deepEqual(quartetGroupIdsOf(grand, cards), ALL_GROUPS);
});

test('buildMatchCardIds mixed: 8 whole quartets drawn from both decks (32 cards, 4 per group)', () => {
  const cards = syntheticCards(ALL_GROUPS);
  const seen = new Set<string>();
  for (let i = 0; i < 40; i++) {
    const ids = buildMatchCardIds('mixed', cards);
    assert.equal(ids.length, 32);
    assert.equal(new Set(ids).size, 32);
    const groups = quartetGroupIdsOf(ids, cards);
    assert.equal(groups.length, 8);
    for (const g of groups) {
      assert.equal(ids.filter((id) => cards.find((c) => c.id === id)!.groupId === g).length, 4);
    }
    seen.add(groups.join(','));
  }
  assert.ok(seen.size > 1, 'the quartet selection is random');
});

test('a mode whose deck is not available falls back to the modern deck', () => {
  const modernOnly = syntheticCards([1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(resolveDeckMode('records', modernOnly), 'modern');
  assert.equal(resolveDeckMode('grand', modernOnly), 'modern');
  assert.equal(resolveDeckMode('modern', modernOnly), 'modern');
  assert.equal(resolveDeckMode('grand', syntheticCards(ALL_GROUPS)), 'grand');
  assert.equal(buildMatchCardIds('records', modernOnly).length, 32); // never an empty match
});

// ---- stat display: small machines must not round to zero ----
import { formatStatValue } from '../src/shared/decks.ts';

test('formatStatValue keeps precision for small machines and stays unchanged for big ones', () => {
  assert.equal(formatStatValue('ratedPowerMw', 0.012, 'en'), '0.012');
  assert.equal(formatStatValue('ratedPowerMw', 0.2, 'en'), '0.2');
  assert.equal(formatStatValue('ratedPowerMw', 0.45, 'en'), '0.45');
  assert.equal(formatStatValue('ratedPowerMw', 2.3, 'en'), '2.3');
  assert.equal(formatStatValue('ratedPowerMw', 6.15, 'en'), '6.15');
  assert.equal(formatStatValue('ratedPowerMw', 26, 'en'), '26.0');
  assert.equal(formatStatValue('plantCapacityMw', 0.012, 'en'), '0.012');
  assert.equal(formatStatValue('plantCapacityMw', 4.95, 'en'), '4.95');
  assert.equal(formatStatValue('plantCapacityMw', 11.5, 'en'), '12');
  assert.equal(formatStatValue('plantCapacityMw', 1200, 'en'), '1,200');
  assert.equal(formatStatValue('plantCapacityMw', 1200, 'de'), '1.200');
  assert.equal(formatStatValue('rotorDiameterM', 310, 'en'), '310');
  assert.equal(formatStatValue('cutInWindMs', 3, 'en'), '3.0');
  assert.equal(formatStatValue('firstPowerYear', 1888, 'en'), '1888');
});

test('plant bar grows with capacity from a tiny machine up to a gigawatt farm', () => {
  const sizes = [0.012, 0.2, 1, 9, 10, 100, 1000, 7965].map((v) => statStrengthPercent('plantCapacityMw', v));
  for (let i = 1; i < sizes.length; i++) assert.ok(sizes[i] >= sizes[i - 1], `non-decreasing at ${i}`);
  assert.ok(sizes[0] < sizes[3], 'a 12 kW windmill is visibly smaller than a 9 MW farm');
  assert.ok(sizes[4] >= 20, 'the 10 MW point stays where deck 1 had it');
});
