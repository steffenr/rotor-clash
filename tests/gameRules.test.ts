import test from 'node:test';
import assert from 'node:assert/strict';
import { compareStat, computeCompletedQuartets } from '../src/shared/turbines.ts';
import { getRankTier } from '../src/shared/gameTypes.ts';
import { SERVER_CARD_BY_ID } from '../src/server/turbineRepository.ts';

test('compareStat resolves higher-wins and lower-wins (cutInWindMs) correctly', () => {
  assert.equal(compareStat('ratedPowerMw', 15, 14.7), 1);
  assert.equal(compareStat('ratedPowerMw', 7.2, 20), 2);
  assert.equal(compareStat('ratedPowerMw', 15, 15), 0);

  // Lower cut-in wind speed wins
  assert.equal(compareStat('cutInWindMs', 2.0, 3.5), 1);
  assert.equal(compareStat('cutInWindMs', 3.5, 2.5), 2);
  assert.equal(compareStat('cutInWindMs', 3.0, 3.0), 0);
});

test('computeCompletedQuartets detects full 4-card groups only', () => {
  assert.deepEqual(computeCompletedQuartets(['1A', '1B', '1C'], SERVER_CARD_BY_ID), []);
  assert.deepEqual(computeCompletedQuartets(['1A', '1B', '1C', '1D'], SERVER_CARD_BY_ID), [1]);
  assert.deepEqual(
    computeCompletedQuartets(['5D', '1A', '5B', '1B', '5C', '1C', '5A', '1D', '2A', 'UNKNOWN'], SERVER_CARD_BY_ID),
    [1, 5]
  );
});

test('getRankTier maps ELO ratings across all thresholds', () => {
  assert.equal(getRankTier(900).name, 'Wind Cadet');
  assert.equal(getRankTier(1150).name, 'Grid Engineer');
  assert.equal(getRankTier(1250).name, 'Turbine Lead');
  assert.equal(getRankTier(1400).name, 'Offshore Ace');
  assert.equal(getRankTier(1600).name, 'Rotor Clash Grandmaster');
});
