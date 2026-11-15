import { ClientMatchState, StatKey } from '../shared/gameTypes.ts';
import type { DeckMode } from '../shared/decks.ts';
import {
  advanceBotRound,
  BotDifficulty,
  chooseBotStatFromDeck,
  createLocalBotMatchFromDeck,
  LocalBotMatch,
  resolveBotRoundFromDeck,
  serializeBotMatchFromDeck,
} from '../shared/botRules.ts';
import { CARD_BY_ID, TURBINE_DECK } from './turbineDeck.ts';

export type { BotDifficulty, LocalBotMatch };
export { advanceBotRound };

export function createLocalBotMatch(
  playerId: string,
  playerCallsign: string,
  playerElo: number,
  difficulty: BotDifficulty,
  deckMode?: DeckMode
): LocalBotMatch {
  return createLocalBotMatchFromDeck(playerId, playerCallsign, playerElo, difficulty, TURBINE_DECK, deckMode);
}

export function chooseBotStat(match: LocalBotMatch): StatKey {
  return chooseBotStatFromDeck(match, CARD_BY_ID);
}

export function resolveBotRound(
  prev: LocalBotMatch,
  statKey: StatKey,
  chosenByPlayerId: string
): LocalBotMatch {
  return resolveBotRoundFromDeck(prev, statKey, chosenByPlayerId, CARD_BY_ID);
}

export function serializeBotMatch(match: LocalBotMatch): ClientMatchState {
  return serializeBotMatchFromDeck(match, CARD_BY_ID);
}
