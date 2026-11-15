import { ClientMatchState, RoundResolution, StatKey, TurbineCard } from './gameTypes.ts';
import { compareStat, computeCompletedQuartets } from './turbines.ts';

export type BotDifficulty = 'standard' | 'tactical';

export interface LocalBotMatch {
  matchId: string;
  difficulty: BotDifficulty;
  playerId: string;
  playerCallsign: string;
  playerElo: number;
  botId: string;
  botCallsign: string;
  status: 'PLAYING' | 'ROUND_REVEAL' | 'FINISHED';
  p1Deck: string[];
  p2Deck: string[];
  tiePot: string[];
  turnPlayerId: string;
  roundNumber: number;
  maxRounds: number;
  lastRound: RoundResolution | null;
  winnerId: string | null;
  winReason: 'ALL_CARDS' | 'ROUND_LIMIT' | 'FORFEIT' | 'DRAW' | null;
}

function shuffleIds(ids: string[]): string[] {
  const arr = [...ids];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function createLocalBotMatchFromDeck(
  playerId: string,
  playerCallsign: string,
  playerElo: number,
  difficulty: BotDifficulty,
  deck: TurbineCard[]
): LocalBotMatch {
  const shuffled = shuffleIds(deck.map((c) => c.id));
  const half = Math.floor(shuffled.length / 2);
  return {
    matchId: `bot_${Date.now()}`,
    difficulty,
    playerId,
    playerCallsign,
    playerElo,
    botId: 'BOT_AEOLUS',
    botCallsign: difficulty === 'tactical' ? 'Aeolus Tactician (Bot)' : 'Nordic Cadet (Bot)',
    status: 'PLAYING',
    p1Deck: shuffled.slice(0, half),
    p2Deck: shuffled.slice(half),
    tiePot: [],
    turnPlayerId: playerId,
    roundNumber: 1,
    maxRounds: 24,
    lastRound: null,
    winnerId: null,
    winReason: null,
  };
}

export function chooseBotStatFromDeck(
  match: LocalBotMatch,
  cardById: Record<string, TurbineCard>
): StatKey {
  const topId = match.p2Deck[0];
  const card = topId ? cardById[topId] : null;
  if (!card) return 'ratedPowerMw';

  const stats = card.stats;
  const scored: { key: StatKey; score: number }[] = [
    { key: 'ratedPowerMw', score: stats.ratedPowerMw / 26 },
    { key: 'rotorDiameterM', score: stats.rotorDiameterM / 310 },
    { key: 'hubHeightM', score: stats.hubHeightM / 185 },
    { key: 'cutInWindMs', score: Math.max(0, (4.2 - stats.cutInWindMs) / 2.2) },
    { key: 'plantCapacityMw', score: Math.log10(Math.max(10, stats.plantCapacityMw)) / 4.1 },
  ];
  scored.sort((a, b) => b.score - a.score);

  if (match.difficulty === 'tactical') {
    return scored[0].key;
  }
  const idx = Math.random() < 0.72 ? 0 : 1;
  return scored[idx].key;
}

export function resolveBotRoundFromDeck(
  prev: LocalBotMatch,
  statKey: StatKey,
  chosenByPlayerId: string,
  cardById: Record<string, TurbineCard>
): LocalBotMatch {
  if (prev.status !== 'PLAYING') return prev;
  const p1Deck = [...prev.p1Deck];
  const p2Deck = [...prev.p2Deck];
  const tiePot = [...prev.tiePot];

  const p1CardId = p1Deck.shift();
  const p2CardId = p2Deck.shift();
  if (!p1CardId || !p2CardId) return prev;

  const p1Card = cardById[p1CardId];
  const p2Card = cardById[p2CardId];
  const p1Val = p1Card.stats[statKey];
  const p2Val = p2Card.stats[statKey];
  const cmp = compareStat(statKey, p1Val, p2Val);

  const prevQ1 = new Set(computeCompletedQuartets([...p1Deck, p1CardId], cardById));
  const prevQ2 = new Set(computeCompletedQuartets([...p2Deck, p2CardId], cardById));

  let winnerId: string | null = null;
  let cardsWonCount = 0;
  let nextTurnPlayerId = prev.turnPlayerId;

  if (cmp === 0) {
    tiePot.push(p1CardId, p2CardId);
  } else if (cmp === 1) {
    winnerId = prev.playerId;
    const won = [...tiePot, p1CardId, p2CardId];
    cardsWonCount = won.length;
    tiePot.length = 0;
    p1Deck.push(...won);
    nextTurnPlayerId = prev.playerId;
  } else {
    winnerId = prev.botId;
    const won = [...tiePot, p2CardId, p1CardId];
    cardsWonCount = won.length;
    tiePot.length = 0;
    p2Deck.push(...won);
    nextTurnPlayerId = prev.botId;
  }

  const nextQ1 = computeCompletedQuartets(p1Deck, cardById);
  const nextQ2 = computeCompletedQuartets(p2Deck, cardById);

  const lastRound: RoundResolution = {
    roundNumber: prev.roundNumber,
    chosenStat: statKey,
    chosenByPlayerId,
    p1Card,
    p2Card,
    p1Value: p1Val,
    p2Value: p2Val,
    winnerId,
    tiePotSizeAfter: tiePot.length,
    cardsWonCount,
    newlyCompletedQuartetsP1: nextQ1.filter((q) => !prevQ1.has(q)),
    newlyCompletedQuartetsP2: nextQ2.filter((q) => !prevQ2.has(q)),
  };

  if (p1Deck.length === 0 || p2Deck.length === 0) {
    const finalWinner = p1Deck.length > 0 ? prev.playerId : p2Deck.length > 0 ? prev.botId : null;
    return {
      ...prev,
      p1Deck,
      p2Deck,
      tiePot,
      lastRound,
      turnPlayerId: nextTurnPlayerId,
      status: 'FINISHED',
      winnerId: finalWinner,
      winReason: finalWinner ? 'ALL_CARDS' : 'DRAW',
    };
  }

  if (prev.roundNumber >= prev.maxRounds) {
    let finalWinner: string | null = null;
    if (p1Deck.length > p2Deck.length) finalWinner = prev.playerId;
    else if (p2Deck.length > p1Deck.length) finalWinner = prev.botId;
    else if (nextQ1.length !== nextQ2.length) {
      finalWinner = nextQ1.length > nextQ2.length ? prev.playerId : prev.botId;
    }
    return {
      ...prev,
      p1Deck,
      p2Deck,
      tiePot,
      lastRound,
      turnPlayerId: nextTurnPlayerId,
      status: 'FINISHED',
      winnerId: finalWinner,
      winReason: finalWinner ? 'ROUND_LIMIT' : 'DRAW',
    };
  }

  return {
    ...prev,
    p1Deck,
    p2Deck,
    tiePot,
    lastRound,
    turnPlayerId: nextTurnPlayerId,
    status: 'ROUND_REVEAL',
  };
}

export function advanceBotRound(prev: LocalBotMatch): LocalBotMatch {
  if (prev.status !== 'ROUND_REVEAL') return prev;
  return {
    ...prev,
    roundNumber: prev.roundNumber + 1,
    status: 'PLAYING',
  };
}

export function serializeBotMatchFromDeck(
  match: LocalBotMatch,
  cardById: Record<string, TurbineCard>
): ClientMatchState {
  return {
    matchId: match.matchId,
    mode: 'bot',
    status: match.status,
    roundNumber: match.roundNumber,
    maxRounds: match.maxRounds,
    tiePotCount: match.tiePot.length,
    turnPlayerId: match.turnPlayerId,
    turnDeadlineAt: null,
    you: {
      id: match.playerId,
      callsign: match.playerCallsign,
      elo: match.playerElo,
      cardCount: match.p1Deck.length,
      topCard: match.p1Deck[0] ? cardById[match.p1Deck[0]] : null,
      ownedCardIds: [...match.p1Deck],
      completedQuartets: computeCompletedQuartets(match.p1Deck, cardById),
    },
    opponent: {
      id: match.botId,
      callsign: match.botCallsign,
      elo: match.difficulty === 'tactical' ? 1340 : 1140,
      cardCount: match.p2Deck.length,
      completedQuartets: computeCompletedQuartets(match.p2Deck, cardById),
      connected: true,
    },
    lastRound: match.lastRound,
    winnerId: match.winnerId,
    winReason: match.winReason,
    eloChange: null,
    abandonedBy: null,
  };
}
