import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SERVER_CARD_BY_ID,
  SERVER_QUARTET_GROUPS,
  SERVER_TURBINE_DECK,
} from '../src/server/turbineRepository.ts';
import { EN_UI } from '../src/data/locales/en/ui.ts';
import { DE_UI } from '../src/data/locales/de/ui.ts';

test('deck contains exactly 8 quartet groups and 32 unique turbine cards', () => {
  assert.equal(SERVER_QUARTET_GROUPS.length, 8);
  assert.equal(SERVER_TURBINE_DECK.length, 32);

  const ids = new Set(SERVER_TURBINE_DECK.map((c) => c.id));
  assert.equal(ids.size, 32);

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

test('all 32 turbine cards have valid engineering stats, source URLs, and EN/DE translations', () => {
  for (const card of SERVER_TURBINE_DECK) {
    assert.ok(card.modelName.trim().length > 0, `${card.id} missing modelName`);
    assert.ok(card.manufacturer.trim().length > 0, `${card.id} missing manufacturer`);
    assert.ok(card.sourceUrl.startsWith('https://'), `${card.id} sourceUrl must be https`);
    assert.ok(card.sweptAreaM2 > 0, `${card.id} sweptAreaM2 must be > 0`);

    assert.ok(card.stats.ratedPowerMw > 0, `${card.id} ratedPowerMw`);
    assert.ok(card.stats.rotorDiameterM > 0, `${card.id} rotorDiameterM`);
    assert.ok(card.stats.hubHeightM > 0, `${card.id} hubHeightM`);
    assert.ok(card.stats.cutInWindMs > 0, `${card.id} cutInWindMs`);
    assert.ok(card.stats.plantCapacityMw > 0, `${card.id} plantCapacityMw`);

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
