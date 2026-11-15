import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SERVER_CARD_BY_ID,
  SERVER_QUARTET_GROUPS,
  SERVER_TURBINE_DECK,
} from '../src/server/turbineRepository.ts';
import { EN_UI } from '../src/data/locales/en/ui.ts';
import { DE_UI } from '../src/data/locales/de/ui.ts';
import { DECKS, cardsOfDeck, deckIdOfCard, statKeysForDeck } from '../src/shared/decks.ts';

test('the game has two decks, each with 8 quartet groups and 32 unique turbine cards (64 total)', () => {
  assert.equal(SERVER_QUARTET_GROUPS.length, 16);
  assert.equal(SERVER_TURBINE_DECK.length, 64);

  const ids = new Set(SERVER_TURBINE_DECK.map((c) => c.id));
  assert.equal(ids.size, 64);

  for (const deck of DECKS) {
    assert.equal(cardsOfDeck(SERVER_TURBINE_DECK, deck.id).length, 32, `${deck.id} deck size`);
    assert.deepEqual(
      SERVER_QUARTET_GROUPS.filter((g) => deck.groupIds.includes(g.id)).map((g) => g.id),
      deck.groupIds,
      `${deck.id} groups`
    );
  }

  for (const group of SERVER_QUARTET_GROUPS) {
    assert.ok(group.translations.en.name.trim().length > 0, `Group ${group.id} missing EN name`);
    assert.ok(group.translations.de.name.trim().length > 0, `Group ${group.id} missing DE name`);
    assert.ok(group.translations.en.subtitle.trim().length > 0, `Group ${group.id} missing EN subtitle`);
    assert.ok(group.translations.de.subtitle.trim().length > 0, `Group ${group.id} missing DE subtitle`);

    for (const slot of ['A', 'B', 'C', 'D'] as const) {
      const id = `${group.id}${slot}`;
      const card = SERVER_CARD_BY_ID[id];
      assert.ok(card, `Missing card ${id}`);
      assert.equal(card.groupId, group.id);
      assert.equal(card.slot, slot);
    }
  }
});

test('all 64 turbine cards have valid engineering stats, source URLs, and EN/DE translations', () => {
  for (const card of SERVER_TURBINE_DECK) {
    assert.ok(card.modelName.trim().length > 0, `${card.id} missing modelName`);
    assert.ok(card.manufacturer.trim().length > 0, `${card.id} missing manufacturer`);
    assert.ok(card.sourceUrl.startsWith('https://'), `${card.id} sourceUrl must be https`);
    assert.ok(card.sweptAreaM2 > 0, `${card.id} sweptAreaM2 must be > 0`);
    assert.ok(card.photoKey && card.photoKey.trim().length > 0, `${card.id} missing photoKey`);

    // Floating offshore turbines (group 4) never show onshore or fixed-foundation imagery.
    if (card.groupId === 4) {
      assert.ok(
        ['hywind', 'kincardine_floating', 'windfloat_atlantic', 'fallback_floating'].includes(card.photoKey),
        `${card.id} must use a floating photo or the floating concept illustration`
      );
    }
    if (card.id === '4D') {
      assert.equal(card.photoKey, 'windfloat_atlantic', '4D must use windfloat_atlantic photoKey');
    }

    // Every stat compared in the card's own deck must be present (deck 2 has no cut-in speed).
    for (const key of statKeysForDeck(deckIdOfCard(card))) {
      assert.ok(card.stats[key] > 0, `${card.id} ${key}`);
    }

    for (const lang of ['en', 'de'] as const) {
      const loc = card.translations[lang];
      assert.ok(loc.country.trim().length > 0, `${card.id} missing ${lang} country`);
      assert.ok(loc.drivetrain.trim().length > 0, `${card.id} missing ${lang} drivetrain`);
      assert.ok(loc.engineeringNote.trim().length > 0, `${card.id} missing ${lang} engineeringNote`);
    }
  }
});

test('EN and DE UI translation dictionaries have matching keys and non-empty strings', () => {
  const checkShape = (enObj: unknown, deObj: unknown, path = '') => {
    assert.equal(typeof deObj, typeof enObj, `Type mismatch at ${path}`);
    if (typeof enObj === 'string') {
      assert.ok(enObj.trim().length > 0, `Empty EN string at ${path}`);
      assert.ok((deObj as string).trim().length > 0, `Empty DE string at ${path}`);
      return;
    }
    if (Array.isArray(enObj)) {
      assert.ok(Array.isArray(deObj), `Expected array at ${path}`);
      assert.equal(deObj.length, enObj.length, `Array length mismatch at ${path}`);
      enObj.forEach((item, idx) => checkShape(item, deObj[idx], `${path}[${idx}]`));
      return;
    }
    if (enObj && typeof enObj === 'object') {
      const enKeys = Object.keys(enObj).sort();
      const deKeys = Object.keys(deObj as Record<string, unknown>).sort();
      assert.deepEqual(deKeys, enKeys, `Key mismatch at ${path}`);
      for (const k of enKeys) {
        checkShape(
          (enObj as Record<string, unknown>)[k],
          (deObj as Record<string, unknown>)[k],
          path ? `${path}.${k}` : k
        );
      }
    }
  };

  checkShape(EN_UI, DE_UI);
});

test('the deck is ordered by group then slot, so 9A comes before 10A (not alphabetically)', () => {
  const ids = SERVER_TURBINE_DECK.map((c) => c.id);
  const expected = [...SERVER_TURBINE_DECK]
    .sort((a, b) => a.groupId - b.groupId || a.slot.localeCompare(b.slot))
    .map((c) => c.id);
  assert.deepEqual(ids, expected);
  assert.equal(ids[0], '1A');
  assert.equal(ids[31], '8D');
  assert.equal(ids[32], '9A');
  assert.equal(ids[63], '16D');
});

test('approximate stats are only flagged on stats the card’s deck actually compares', () => {
  let flagged = 0;
  for (const card of SERVER_TURBINE_DECK) {
    const compared = statKeysForDeck(deckIdOfCard(card));
    for (const key of card.approximateStats) {
      flagged++;
      assert.ok(compared.includes(key), `${card.id} flags ${key}, which its deck does not compare`);
    }
  }
  assert.ok(flagged > 0, 'derived and single-source values must be flagged, not presented as exact');
});
