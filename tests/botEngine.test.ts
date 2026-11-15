import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceBotRound,
  chooseBotStatFromDeck,
  createLocalBotMatchFromDeck,
  resolveBotRoundFromDeck,
  serializeBotMatchFromDeck,
} from '../src/shared/botRules.ts';
import { SERVER_CARD_BY_ID, SERVER_TURBINE_DECK } from '../src/server/turbineRepository.ts';

test('createLocalBotMatchFromDeck deals 16 unique cards to each player', () => {
  const match = createLocalBotMatchFromDeck('p1', 'Explorer', 1200, 'tactical', SERVER_TURBINE_DECK);
  assert.equal(match.status, 'PLAYING');
  assert.equal(match.p1Deck.length, 16);
  assert.equal(match.p2Deck.length, 16);
  const all = new Set([...match.p1Deck, ...match.p2Deck]);
  assert.equal(all.size, 32);
});

test('chooseBotStatFromDeck always returns a valid stat key', () => {
  const match = createLocalBotMatchFromDeck('p1', 'Explorer', 1200, 'tactical', SERVER_TURBINE_DECK);
  match.p2Deck = ['8C']; // 2.0 m/s cutInWindMs is a standout stat
  const chosen = chooseBotStatFromDeck(match, SERVER_CARD_BY_ID);
  assert.ok(
    ['ratedPowerMw', 'rotorDiameterM', 'hubHeightM', 'cutInWindMs', 'plantCapacityMw'].includes(chosen)
  );
  assert.equal(chosen, 'cutInWindMs');
});

test('resolveBotRoundFromDeck handles win, tie pot accumulation, scoop, and round advance', () => {
  const base = createLocalBotMatchFromDeck('p1', 'Explorer', 1200, 'tactical', SERVER_TURBINE_DECK);
  // Force a tie on round 1 (1A vs 1C both have rotorDiameterM = 260? Check: 1A=310, 2A=236, 2B=236!)
  base.p1Deck = ['2A', '1A', '3A']; // 2A: rotor=236, 1A: power=26
  base.p2Deck = ['2B', '8D', '3D']; // 2B: rotor=236, 8D: power=3.0

  const afterTie = resolveBotRoundFromDeck(base, 'rotorDiameterM', 'p1', SERVER_CARD_BY_ID);
  assert.equal(afterTie.status, 'ROUND_REVEAL');
  assert.equal(afterTie.lastRound?.winnerId, null);
  assert.equal(afterTie.tiePot.length, 2);
  assert.equal(afterTie.p1Deck.length, 2);
  assert.equal(afterTie.p2Deck.length, 2);

  const round2 = advanceBotRound(afterTie);
  assert.equal(round2.status, 'PLAYING');
  assert.equal(round2.roundNumber, 2);

  // Round 2: 1A (26 MW) vs 8D (3.0 MW) -> p1 wins all 4 cards (2 from tie pot + 2 from round)
  const afterWin = resolveBotRoundFromDeck(round2, 'ratedPowerMw', 'p1', SERVER_CARD_BY_ID);
  assert.equal(afterWin.status, 'ROUND_REVEAL');
  assert.equal(afterWin.lastRound?.winnerId, 'p1');
  assert.equal(afterWin.lastRound?.cardsWonCount, 4);
  assert.equal(afterWin.tiePot.length, 0);
  assert.equal(afterWin.p1Deck.length, 5);
  assert.equal(afterWin.p2Deck.length, 1);

  const serialized = serializeBotMatchFromDeck(afterWin, SERVER_CARD_BY_ID);
  assert.equal(serialized.you.cardCount, 5);
  assert.equal(serialized.opponent.cardCount, 1);
  assert.equal(serialized.tiePotCount, 0);
});

test('resolveBotRoundFromDeck finishes match when one player loses all cards', () => {
  const match = createLocalBotMatchFromDeck('p1', 'Explorer', 1200, 'standard', SERVER_TURBINE_DECK);
  match.p1Deck = ['1A']; // 26 MW
  match.p2Deck = ['8C']; // 2.3 MW

  const finished = resolveBotRoundFromDeck(match, 'ratedPowerMw', 'p1', SERVER_CARD_BY_ID);
  assert.equal(finished.status, 'FINISHED');
  assert.equal(finished.winnerId, 'p1');
  assert.equal(finished.winReason, 'ALL_CARDS');
});
