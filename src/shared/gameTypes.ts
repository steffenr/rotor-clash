import type { DeckMode } from './decks.ts';
export type StatKey =
  | 'ratedPowerMw'
  | 'rotorDiameterM'
  | 'hubHeightM'
  | 'cutInWindMs'
  | 'plantCapacityMw'
  | 'firstPowerYear';

export type ImageCategory = 'offshore' | 'onshore' | 'floating' | 'windbase';

export interface StatDefinition {
  key: StatKey;
  label: string;
  shortLabel: string;
  unit: string;
  higherWins: boolean;
  description: string;
}

export type LocaleCode = 'en' | 'de';

export interface GroupLocaleText {
  name: string;
  subtitle: string;
}

export interface TurbineLocaleText {
  country: string;
  drivetrain: string;
  engineeringNote: string;
}

export interface QuartetGroup {
  id: number;
  code: string;
  category: ImageCategory;
  translations: Record<LocaleCode, GroupLocaleText>;
}

export interface TurbineCard {
  id: string; // e.g. '1A'
  groupId: number;
  slot: 'A' | 'B' | 'C' | 'D';
  modelName: string;
  manufacturer: string;
  deploymentType: 'Offshore' | 'Onshore' | 'Floating Offshore' | 'Offshore Prototype';
  imageCategory: ImageCategory;
  photoKey: string;
  isRealPhoto: boolean;
  year: number;
  sweptAreaM2: number;
  flagshipPlant: string;
  flagshipLocation: string;
  turbineCountInPlant: number;
  sourceUrl: string;
  sourceLabel: string;
  stats: Record<StatKey, number>;
  translations: Record<LocaleCode, TurbineLocaleText>;
}

export interface RankTier {
  name: string;
  minElo: number;
  accentHex: string;
}

export interface PlayerProfile {
  id: string;
  callsign: string;
  elo: number;
  wins: number;
  losses: number;
  draws: number;
  gamesPlayed: number;
  winStreak: number;
  bestStreak: number;
  quartetsCompleted: number;
  updatedAt: number;
}

export interface MatchRecord {
  id: string;
  mode: 'ranked' | 'room';
  winnerId: string | null;
  winnerCallsign: string | null;
  loserCallsign: string | null;
  player1Callsign: string;
  player2Callsign: string;
  player1Cards: number;
  player2Cards: number;
  roundsPlayed: number;
  eloDelta: number;
  isDraw: boolean;
  finishedAt: number;
}

export interface OpenRoomSummary {
  roomCode: string;
  hostCallsign: string;
  hostElo: number;
  createdAt: number;
  deckMode: DeckMode;
}

export interface RoundResolution {
  roundNumber: number;
  chosenStat: StatKey;
  chosenByPlayerId: string;
  p1Card: TurbineCard;
  p2Card: TurbineCard;
  p1Value: number;
  p2Value: number;
  winnerId: string | null; // null = tie
  tiePotSizeAfter: number;
  cardsWonCount: number;
  newlyCompletedQuartetsP1: number[];
  newlyCompletedQuartetsP2: number[];
}

export interface ClientMatchState {
  matchId: string;
  mode: 'ranked' | 'room' | 'bot';
  roomCode?: string;
  status: 'WAITING_FOR_OPPONENT' | 'PLAYING' | 'ROUND_REVEAL' | 'FINISHED';
  roundNumber: number;
  maxRounds: number;
  tiePotCount: number;
  turnPlayerId: string;
  turnDeadlineAt: number | null;
  you: {
    id: string;
    callsign: string;
    elo: number;
    cardCount: number;
    topCard: TurbineCard | null;
    ownedCardIds: string[];
    completedQuartets: number[];
  };
  opponent: {
    id: string;
    callsign: string;
    elo: number;
    cardCount: number;
    completedQuartets: number[];
    connected: boolean;
  };
  lastRound: RoundResolution | null;
  winnerId: string | null;
  winReason: 'ALL_CARDS' | 'ROUND_LIMIT' | 'FORFEIT' | 'DRAW' | null;
  eloChange: number | null;
  /** Set when the match ended because someone left. Abandoned matches are not counted. */
  abandonedBy: 'you' | 'opponent' | null;
  /** Which cards and stats this match uses. */
  deckMode: DeckMode;
  /** Quartet groups in play (8, or 16 in the Grand Tour). */
  quartetGroupIds: number[];
}

export const STAT_DEFINITIONS: StatDefinition[] = [
  {
    key: 'ratedPowerMw',
    label: 'Rated Power',
    shortLabel: 'Power',
    unit: 'MW',
    higherWins: true,
    description: 'Maximum nameplate electrical output of a single turbine.',
  },
  {
    key: 'rotorDiameterM',
    label: 'Rotor Diameter',
    shortLabel: 'Rotor',
    unit: 'm',
    higherWins: true,
    description: 'Full tip-to-tip span swept by the rotating blades.',
  },
  {
    key: 'hubHeightM',
    label: 'Hub Height',
    shortLabel: 'Hub',
    unit: 'm',
    higherWins: true,
    description: 'Elevation from foundation/sea level to the rotor center.',
  },
  {
    key: 'cutInWindMs',
    label: 'Cut-In Speed',
    shortLabel: 'Cut-In',
    unit: 'm/s',
    higherWins: false,
    description: 'Minimum wind speed to begin generating power (lowest wins!).',
  },
  {
    key: 'plantCapacityMw',
    label: 'Flagship Plant',
    shortLabel: 'Plant',
    unit: 'MW',
    higherWins: true,
    description: 'Total installed capacity of this turbine’s flagship wind farm.',
  },
  {
    key: 'firstPowerYear',
    label: 'First Power',
    shortLabel: 'Since',
    unit: '',
    higherWins: false,
    description: 'Year the turbine first fed power to the grid (oldest wins!).',
  },
];

export const RANK_TIERS: RankTier[] = [
  { name: 'Rotor Clash Grandmaster', minElo: 1600, accentHex: '#B45309' },
  { name: 'Offshore Ace', minElo: 1400, accentHex: '#0E7490' },
  { name: 'Turbine Lead', minElo: 1250, accentHex: '#1B6B52' },
  { name: 'Grid Engineer', minElo: 1150, accentHex: '#475569' },
  { name: 'Wind Cadet', minElo: 0, accentHex: '#64748B' },
];

export function getRankTier(elo: number): RankTier {
  return RANK_TIERS.find((tier) => elo >= tier.minElo) ?? RANK_TIERS[RANK_TIERS.length - 1];
}
