import crypto from 'node:crypto';
import {
  ClientMatchState,
  OpenRoomSummary,
  RoundResolution,
  StatKey,
} from '../shared/gameTypes.ts';
import {
  compareStat,
  computeCompletedQuartets,
} from '../shared/turbines.ts';
import {
  SERVER_CARD_BY_ID,
  SERVER_TURBINE_DECK,
} from './turbineRepository.ts';
import { leaderboardStore } from './store.ts';
import {
  DECK_MODES,
  DEFAULT_DECK_MODE,
  buildMatchCardIds,
  isDeckMode,
  maxRoundsForMode,
  pickStrongestStat,
  quartetGroupIdsOf,
  resolveDeckMode,
  statKeysForMode,
  type DeckMode,
} from '../shared/decks.ts';

export interface ActiveMatch {
  id: string;
  mode: 'ranked' | 'room';
  roomCode?: string;
  status: 'PLAYING' | 'ROUND_REVEAL' | 'FINISHED';
  p1Id: string;
  p2Id: string;
  p1Deck: string[];
  p2Deck: string[];
  tiePot: string[];
  turnPlayerId: string;
  roundNumber: number;
  maxRounds: number;
  lastRound: RoundResolution | null;
  revealLockedUntil: number;
  winnerId: string | null;
  winReason: 'ALL_CARDS' | 'ROUND_LIMIT' | 'FORFEIT' | 'DRAW' | null;
  p1EloChange: number | null;
  p2EloChange: number | null;
  /** Player who left / dropped out. A forfeit after the first round costs them the match. */
  abandonedById: string | null;
  deckMode: DeckMode;
  quartetGroupIds: number[];
  turnDeadlineAt: number | null;
  revealTimer?: NodeJS.Timeout;
  turnTimer?: NodeJS.Timeout;
  p1DisconnectTimer?: NodeJS.Timeout;
  p2DisconnectTimer?: NodeJS.Timeout;
}

interface WaitingRoom {
  roomCode: string;
  hostId: string;
  createdAt: number;
  deckMode: DeckMode;
  /** Unlisted rooms can only be joined with their code or invite link. */
  listed: boolean;
}

/** Room creation is refused with this code once every room slot is taken. */
export type RoomErrorCode = 'ROOM_LIMIT';

/** Hard cap on waiting friend rooms, so the lobby ties stay bounded and the open list stays short. */
export const MAX_WAITING_ROOMS = 25;

/** Uniform float in [0, 1) from the OS random source, for shuffles and coin flips. */
const secureRandom = () => crypto.randomInt(0, 2 ** 32) / 2 ** 32;

const TURN_DURATION_MS = 45_000;
const REVEAL_AUTO_ADVANCE_MS = 5_500;
const REVEAL_MIN_LOCK_MS = 600;
const DISCONNECT_GRACE_MS = 25_000;

/** Clients may send anything; unknown or unavailable decks fall back to the default deck. */
function normalizeDeckMode(raw: unknown): DeckMode {
  return isDeckMode(raw) ? resolveDeckMode(raw, SERVER_TURBINE_DECK) : DEFAULT_DECK_MODE;
}

export type EmitToPlayerFn = (playerId: string, event: string, payload: unknown) => void;
export type BroadcastAllFn = (event: string, payload: unknown) => void;
export type IsPlayerConnectedFn = (playerId: string) => boolean;

export interface MatchStoreLike {
  getOrCreatePlayer: typeof leaderboardStore.getOrCreatePlayer;
  recordPvpMatch: typeof leaderboardStore.recordPvpMatch;
  recordForfeit: typeof leaderboardStore.recordForfeit;
  getLeaderboard: typeof leaderboardStore.getLeaderboard;
  getRecentMatches: typeof leaderboardStore.getRecentMatches;
}

export class MatchEngine {
  private matches = new Map<string, ActiveMatch>();
  private playerToMatch = new Map<string, string>();
  /** One waiting line per deck, so players are only paired with someone who wants the same deck. */
  private queues = new Map<DeckMode, string[]>(DECK_MODES.map((m) => [m, []]));
  private rooms = new Map<string, WaitingRoom>();

  constructor(
    private emitToPlayer: EmitToPlayerFn,
    private broadcastAll: BroadcastAllFn,
    private isPlayerConnected: IsPlayerConnectedFn,
    private store: MatchStoreLike = leaderboardStore
  ) {}

  public dispose() {
    for (const match of this.matches.values()) {
      this.clearTimers(match);
      if (match.p1DisconnectTimer) clearTimeout(match.p1DisconnectTimer);
      if (match.p2DisconnectTimer) clearTimeout(match.p2DisconnectTimer);
    }
    this.matches.clear();
    this.playerToMatch.clear();
    for (const mode of DECK_MODES) this.queues.set(mode, []);
    this.rooms.clear();
  }

  public getLobbySnapshot(onlineCount: number) {
    const openRooms: OpenRoomSummary[] = Array.from(this.rooms.values())
      .filter((room) => room.listed)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((room) => this.summarizeRoom(room));

    return {
      onlineCount,
      queueCount: [...this.queues.values()].reduce((sum, q) => sum + q.length, 0),
      openRooms,
    };
  }

  public getMatchForPlayer(playerId: string): ClientMatchState | null {
    const matchId = this.playerToMatch.get(playerId);
    if (!matchId) return null;
    const match = this.matches.get(matchId);
    if (!match) {
      this.playerToMatch.delete(playerId);
      return null;
    }
    return this.serializeMatchForPlayer(match, playerId);
  }

  public getWaitingRoomForPlayer(playerId: string): OpenRoomSummary | null {
    for (const room of this.rooms.values()) {
      if (room.hostId === playerId) return this.summarizeRoom(room);
    }
    return null;
  }

  private summarizeRoom(room: WaitingRoom): OpenRoomSummary {
    const host = this.store.getOrCreatePlayer(room.hostId);
    return {
      roomCode: room.roomCode,
      hostCallsign: host.callsign,
      hostElo: host.elo,
      createdAt: room.createdAt,
      deckMode: room.deckMode,
      listed: room.listed,
    };
  }

  /** Lets the host show or hide their waiting room in the public open-rooms list. */
  public setRoomListed(playerId: string, listed: boolean): OpenRoomSummary | null {
    for (const room of this.rooms.values()) {
      if (room.hostId === playerId) {
        room.listed = listed;
        return this.summarizeRoom(room);
      }
    }
    return null;
  }

  public handlePlayerConnected(playerId: string) {
    const matchId = this.playerToMatch.get(playerId);
    if (!matchId) return;
    const match = this.matches.get(matchId);
    if (!match) return;

    if (match.p1Id === playerId && match.p1DisconnectTimer) {
      clearTimeout(match.p1DisconnectTimer);
      match.p1DisconnectTimer = undefined;
    }
    if (match.p2Id === playerId && match.p2DisconnectTimer) {
      clearTimeout(match.p2DisconnectTimer);
      match.p2DisconnectTimer = undefined;
    }

    this.broadcastMatchState(match);
  }

  public handlePlayerDisconnected(playerId: string) {
    // Remove from matchmaking queue
    this.removeFromQueue(playerId);

    // Cancel any waiting room hosted by this player
    for (const [code, room] of this.rooms.entries()) {
      if (room.hostId === playerId) {
        this.rooms.delete(code);
      }
    }

    // Handle active match disconnect grace window
    const matchId = this.playerToMatch.get(playerId);
    if (!matchId) return;
    const match = this.matches.get(matchId);
    if (!match || match.status === 'FINISHED') return;

    this.broadcastMatchState(match);

    const timer = setTimeout(() => {
      if (match.status === 'FINISHED') return;
      if (!this.isPlayerConnected(playerId)) {
        this.abandonMatch(match, playerId);
      }
    }, DISCONNECT_GRACE_MS);

    if (match.p1Id === playerId) {
      if (match.p1DisconnectTimer) clearTimeout(match.p1DisconnectTimer);
      match.p1DisconnectTimer = timer;
    } else {
      if (match.p2DisconnectTimer) clearTimeout(match.p2DisconnectTimer);
      match.p2DisconnectTimer = timer;
    }
  }

  public joinQueue(playerId: string, rawDeckMode?: unknown): { ok: boolean; error?: string } {
    const deckMode = normalizeDeckMode(rawDeckMode);
    if (this.playerToMatch.has(playerId)) {
      const existing = this.matches.get(this.playerToMatch.get(playerId)!);
      if (existing && existing.status !== 'FINISHED') {
        return { ok: false, error: 'You are already in an active match.' };
      }
      this.playerToMatch.delete(playerId);
    }

    this.cancelHostedRooms(playerId);
    this.removeFromQueue(playerId);

    const queue = this.queues.get(deckMode)!;
    queue.push(playerId);

    // Attempt pairing connected players who chose the same deck
    const waiting = queue.filter((id) => this.isPlayerConnected(id));
    this.queues.set(deckMode, waiting);
    if (waiting.length >= 2) {
      const p1 = waiting.shift()!;
      const p2 = waiting.shift()!;
      if (p1 !== p2) {
        this.createAndStartMatch(p1, p2, 'ranked', deckMode);
      }
    }

    return { ok: true };
  }

  public removeFromQueue(playerId: string) {
    for (const [mode, queue] of this.queues) {
      this.queues.set(mode, queue.filter((id) => id !== playerId));
    }
  }

  public createRoom(
    playerId: string,
    rawDeckMode?: unknown
  ): { ok: boolean; room?: OpenRoomSummary; error?: string; code?: RoomErrorCode } {
    const deckMode = normalizeDeckMode(rawDeckMode);
    if (this.playerToMatch.has(playerId)) {
      const existing = this.matches.get(this.playerToMatch.get(playerId)!);
      if (existing && existing.status !== 'FINISHED') {
        return { ok: false, error: 'Finish or leave your active match first.' };
      }
      this.playerToMatch.delete(playerId);
    }

    this.removeFromQueue(playerId);
    this.cancelHostedRooms(playerId);

    // The player's own room (if any) was just freed, so replacing it always works at the cap.
    if (this.rooms.size >= MAX_WAITING_ROOMS) {
      return {
        ok: false,
        error: `All ${MAX_WAITING_ROOMS} friend rooms are in use right now. Try again in a moment.`,
        code: 'ROOM_LIMIT',
      };
    }

    let code = '';
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    do {
      code = Array.from({ length: 6 }, () => alphabet[crypto.randomInt(alphabet.length)]).join('');
    } while (this.rooms.has(code));

    const room: WaitingRoom = {
      roomCode: code,
      hostId: playerId,
      createdAt: Date.now(),
      deckMode,
      listed: false,
    };
    this.rooms.set(code, room);

    return { ok: true, room: this.summarizeRoom(room) };
  }

  public cancelHostedRooms(playerId: string) {
    for (const [code, room] of this.rooms.entries()) {
      if (room.hostId === playerId) {
        this.rooms.delete(code);
      }
    }
  }

  public joinRoom(playerId: string, rawCode: string): { ok: boolean; error?: string } {
    const code = rawCode.trim().toUpperCase();
    const room = this.rooms.get(code);
    if (!room) {
      return { ok: false, error: `Room "${code}" was not found or has already started.` };
    }
    if (room.hostId === playerId) {
      return { ok: false, error: 'Cannot join your own room as opponent. Share the code or open another tab.' };
    }
    if (!this.isPlayerConnected(room.hostId)) {
      this.rooms.delete(code);
      return { ok: false, error: 'Room host disconnected.' };
    }

    this.rooms.delete(code);
    this.removeFromQueue(playerId);
    this.cancelHostedRooms(playerId);

    this.createAndStartMatch(room.hostId, playerId, 'room', room.deckMode, code);
    return { ok: true };
  }

  private createAndStartMatch(
    p1Id: string,
    p2Id: string,
    mode: 'ranked' | 'room',
    deckMode: DeckMode,
    roomCode?: string
  ) {
    const shuffled = buildMatchCardIds(deckMode, SERVER_TURBINE_DECK, secureRandom);
    const half = Math.floor(shuffled.length / 2);
    const p1Deck = shuffled.slice(0, half);
    const p2Deck = shuffled.slice(half);
    const startingPlayer = crypto.randomInt(2) === 0 ? p1Id : p2Id;

    const match: ActiveMatch = {
      id: crypto.randomUUID(),
      mode,
      roomCode,
      status: 'PLAYING',
      p1Id,
      p2Id,
      p1Deck,
      p2Deck,
      tiePot: [],
      turnPlayerId: startingPlayer,
      roundNumber: 1,
      maxRounds: maxRoundsForMode(deckMode),
      lastRound: null,
      revealLockedUntil: 0,
      winnerId: null,
      winReason: null,
      p1EloChange: null,
      p2EloChange: null,
      abandonedById: null,
      deckMode,
      quartetGroupIds: quartetGroupIdsOf(shuffled, SERVER_TURBINE_DECK),
      turnDeadlineAt: Date.now() + TURN_DURATION_MS,
    };

    this.matches.set(match.id, match);
    this.playerToMatch.set(p1Id, match.id);
    this.playerToMatch.set(p2Id, match.id);

    this.scheduleTurnTimer(match);
    this.broadcastMatchState(match);
  }

  public playStat(playerId: string, matchId: string, statKey: StatKey): { ok: boolean; error?: string } {
    const match = this.matches.get(matchId);
    if (!match) return { ok: false, error: 'Match not found.' };
    if (match.status !== 'PLAYING') return { ok: false, error: 'Wait for the next round.' };
    if (match.turnPlayerId !== playerId) return { ok: false, error: 'It is not your turn.' };
    // Clients may send anything: only the stats this match's deck actually compares are legal.
    if (!statKeysForMode(match.deckMode).includes(statKey)) return { ok: false, error: 'Invalid stat.' };

    this.clearTimers(match);

    const p1CardId = match.p1Deck.shift();
    const p2CardId = match.p2Deck.shift();
    if (!p1CardId || !p2CardId) {
      const winnerId = match.p1Deck.length > match.p2Deck.length ? match.p1Id : match.p2Id;
      this.finishMatch(match, winnerId, 'ALL_CARDS');
      return { ok: true };
    }

    const p1Card = SERVER_CARD_BY_ID[p1CardId];
    const p2Card = SERVER_CARD_BY_ID[p2CardId];
    const p1Val = p1Card.stats[statKey];
    const p2Val = p2Card.stats[statKey];
    const cmp = compareStat(statKey, p1Val, p2Val);

    const prevQuartetsP1 = new Set(computeCompletedQuartets([...match.p1Deck, p1CardId], SERVER_CARD_BY_ID));
    const prevQuartetsP2 = new Set(computeCompletedQuartets([...match.p2Deck, p2CardId], SERVER_CARD_BY_ID));

    let winnerId: string | null = null;
    let cardsWonCount = 0;

    if (cmp === 0) {
      // Tie: add both cards to tiePot
      match.tiePot.push(p1CardId, p2CardId);
    } else if (cmp === 1) {
      winnerId = match.p1Id;
      const won = [...match.tiePot, p1CardId, p2CardId];
      cardsWonCount = won.length;
      match.tiePot = [];
      match.p1Deck.push(...won);
      match.turnPlayerId = match.p1Id;
    } else {
      winnerId = match.p2Id;
      const won = [...match.tiePot, p2CardId, p1CardId];
      cardsWonCount = won.length;
      match.tiePot = [];
      match.p2Deck.push(...won);
      match.turnPlayerId = match.p2Id;
    }

    const nextQuartetsP1 = computeCompletedQuartets(match.p1Deck, SERVER_CARD_BY_ID);
    const nextQuartetsP2 = computeCompletedQuartets(match.p2Deck, SERVER_CARD_BY_ID);

    const newlyCompletedQuartetsP1 = nextQuartetsP1.filter((q) => !prevQuartetsP1.has(q));
    const newlyCompletedQuartetsP2 = nextQuartetsP2.filter((q) => !prevQuartetsP2.has(q));

    match.lastRound = {
      roundNumber: match.roundNumber,
      chosenStat: statKey,
      chosenByPlayerId: playerId,
      p1Card,
      p2Card,
      p1Value: p1Val,
      p2Value: p2Val,
      winnerId,
      tiePotSizeAfter: match.tiePot.length,
      cardsWonCount,
      newlyCompletedQuartetsP1,
      newlyCompletedQuartetsP2,
    };

    // Check immediate elimination
    if (match.p1Deck.length === 0 || match.p2Deck.length === 0) {
      if (match.p1Deck.length === 0 && match.p2Deck.length === 0) {
        this.finishMatch(match, null, 'DRAW');
      } else {
        const finalWinner = match.p1Deck.length > 0 ? match.p1Id : match.p2Id;
        this.finishMatch(match, finalWinner, 'ALL_CARDS');
      }
      return { ok: true };
    }

    // Check round limit
    if (match.roundNumber >= match.maxRounds) {
      if (match.p1Deck.length > match.p2Deck.length) {
        this.finishMatch(match, match.p1Id, 'ROUND_LIMIT');
      } else if (match.p2Deck.length > match.p1Deck.length) {
        this.finishMatch(match, match.p2Id, 'ROUND_LIMIT');
      } else {
        const q1 = nextQuartetsP1.length;
        const q2 = nextQuartetsP2.length;
        const finalWinner = q1 > q2 ? match.p1Id : q2 > q1 ? match.p2Id : null;
        this.finishMatch(match, finalWinner, finalWinner ? 'ROUND_LIMIT' : 'DRAW');
      }
      return { ok: true };
    }

    match.status = 'ROUND_REVEAL';
    match.revealLockedUntil = Date.now() + REVEAL_MIN_LOCK_MS;
    match.turnDeadlineAt = null;
    this.broadcastMatchState(match);

    match.revealTimer = setTimeout(() => {
      this.advanceRound(match);
    }, REVEAL_AUTO_ADVANCE_MS);

    return { ok: true };
  }

  public requestNextRound(playerId: string, matchId: string) {
    const match = this.matches.get(matchId);
    if (!match || match.status !== 'ROUND_REVEAL') return;
    if (playerId !== match.p1Id && playerId !== match.p2Id) return;
    if (Date.now() < match.revealLockedUntil) return;

    this.advanceRound(match);
  }

  private advanceRound(match: ActiveMatch) {
    if (match.status !== 'ROUND_REVEAL') return;
    if (match.revealTimer) {
      clearTimeout(match.revealTimer);
      match.revealTimer = undefined;
    }

    match.roundNumber += 1;
    match.status = 'PLAYING';
    match.turnDeadlineAt = Date.now() + TURN_DURATION_MS;
    this.scheduleTurnTimer(match);
    this.broadcastMatchState(match);
  }

  public forfeitMatch(playerId: string, matchId: string) {
    const match = this.matches.get(matchId);
    if (!match || match.status === 'FINISHED') return;
    if (playerId !== match.p1Id && playerId !== match.p2Id) return;
    this.abandonMatch(match, playerId);
  }

  /**
   * A player left (Leave button) or stayed disconnected past the grace window.
   * Before the first round nothing is counted, so an accidental drop costs nothing. After that the
   * leaver takes the loss and the opponent gets no points, so nobody can dodge a defeat by leaving.
   */
  private abandonMatch(match: ActiveMatch, leaverId: string) {
    match.abandonedById = leaverId;
    this.finishMatch(match, null, 'FORFEIT');
  }

  public dismissFinishedMatch(playerId: string) {
    const matchId = this.playerToMatch.get(playerId);
    if (!matchId) return;
    const match = this.matches.get(matchId);
    if (!match || match.status === 'FINISHED') {
      this.playerToMatch.delete(playerId);
    }
  }

  private finishMatch(
    match: ActiveMatch,
    winnerId: string | null,
    reason: 'ALL_CARDS' | 'ROUND_LIMIT' | 'FORFEIT' | 'DRAW'
  ) {
    this.clearTimers(match);
    if (match.p1DisconnectTimer) clearTimeout(match.p1DisconnectTimer);
    if (match.p2DisconnectTimer) clearTimeout(match.p2DisconnectTimer);

    match.status = 'FINISHED';
    match.winnerId = winnerId;
    match.winReason = reason;
    match.turnDeadlineAt = null;

    let rated = true;
    if (reason !== 'FORFEIT') {
      const p1Quartets = computeCompletedQuartets(match.p1Deck, SERVER_CARD_BY_ID).length;
      const p2Quartets = computeCompletedQuartets(match.p2Deck, SERVER_CARD_BY_ID).length;

      const { p1Delta, p2Delta } = this.store.recordPvpMatch({
        matchId: match.id,
        mode: match.mode,
        p1Id: match.p1Id,
        p2Id: match.p2Id,
        p1Cards: match.p1Deck.length,
        p2Cards: match.p2Deck.length,
        p1Quartets,
        p2Quartets,
        winnerId,
        roundsPlayed: match.roundNumber,
      });

      match.p1EloChange = p1Delta;
      match.p2EloChange = p2Delta;
    } else if (match.abandonedById && match.lastRound) {
      // A round was already decided: the leaver takes the loss, the opponent gets nothing.
      const leaverId = match.abandonedById;
      const delta = this.store.recordForfeit({
        matchId: match.id,
        mode: match.mode,
        player1Id: match.p1Id,
        player2Id: match.p2Id,
        leaverId,
        p1Cards: match.p1Deck.length,
        p2Cards: match.p2Deck.length,
        roundsPlayed: match.roundNumber,
      });
      if (leaverId === match.p1Id) match.p1EloChange = delta;
      else match.p2EloChange = delta;
    } else {
      // Left during the first round: an accidental drop is not punished.
      rated = false;
    }

    this.broadcastMatchState(match);
    if (rated) {
      this.broadcastAll('leaderboard:updated', {
        leaderboard: this.store.getLeaderboard(),
        recentMatches: this.store.getRecentMatches(),
      });
    }

    // Clear active match binding after sending final screen (client can still view local state until dismissed)
    const cleanupTimer = setTimeout(() => {
      if (this.playerToMatch.get(match.p1Id) === match.id) {
        this.playerToMatch.delete(match.p1Id);
      }
      if (this.playerToMatch.get(match.p2Id) === match.id) {
        this.playerToMatch.delete(match.p2Id);
      }
      this.matches.delete(match.id);
    }, 30_000);
    cleanupTimer.unref?.();
  }

  private scheduleTurnTimer(match: ActiveMatch) {
    if (match.turnTimer) clearTimeout(match.turnTimer);
    match.turnTimer = setTimeout(() => {
      if (match.status !== 'PLAYING') return;
      const activeId = match.turnPlayerId;
      const deck = activeId === match.p1Id ? match.p1Deck : match.p2Deck;
      const topId = deck[0];
      const topCard = topId ? SERVER_CARD_BY_ID[topId] : null;
      if (!topCard) return;

      // Auto-pick best stat on timeout so game stays moving
      const bestStat = pickStrongestStat(topCard.stats, statKeysForMode(match.deckMode));
      this.playStat(activeId, match.id, bestStat);
    }, TURN_DURATION_MS);
  }

  private clearTimers(match: ActiveMatch) {
    if (match.turnTimer) {
      clearTimeout(match.turnTimer);
      match.turnTimer = undefined;
    }
    if (match.revealTimer) {
      clearTimeout(match.revealTimer);
      match.revealTimer = undefined;
    }
  }

  private broadcastMatchState(match: ActiveMatch) {
    this.emitToPlayer(match.p1Id, 'match:state', this.serializeMatchForPlayer(match, match.p1Id));
    this.emitToPlayer(match.p2Id, 'match:state', this.serializeMatchForPlayer(match, match.p2Id));
  }

  private serializeMatchForPlayer(match: ActiveMatch, playerId: string): ClientMatchState {
    const isP1 = playerId === match.p1Id;
    const youId = isP1 ? match.p1Id : match.p2Id;
    const oppId = isP1 ? match.p2Id : match.p1Id;
    const yourDeck = isP1 ? match.p1Deck : match.p2Deck;
    const oppDeck = isP1 ? match.p2Deck : match.p1Deck;

    const youProfile = this.store.getOrCreatePlayer(youId);
    const oppProfile = this.store.getOrCreatePlayer(oppId);

    return {
      matchId: match.id,
      mode: match.mode,
      roomCode: match.roomCode,
      status: match.status,
      roundNumber: match.roundNumber,
      maxRounds: match.maxRounds,
      tiePotCount: match.tiePot.length,
      turnPlayerId: match.turnPlayerId,
      turnDeadlineAt: match.turnDeadlineAt,
      you: {
        id: youId,
        callsign: youProfile.callsign,
        elo: youProfile.elo,
        cardCount: yourDeck.length,
        topCard: yourDeck[0] ? SERVER_CARD_BY_ID[yourDeck[0]] : null,
        ownedCardIds: [...yourDeck],
        completedQuartets: computeCompletedQuartets(yourDeck, SERVER_CARD_BY_ID),
      },
      opponent: {
        id: oppId,
        callsign: oppProfile.callsign,
        elo: oppProfile.elo,
        cardCount: oppDeck.length,
        completedQuartets: computeCompletedQuartets(oppDeck, SERVER_CARD_BY_ID),
        connected: this.isPlayerConnected(oppId),
      },
      lastRound: match.lastRound,
      winnerId: match.winnerId,
      winReason: match.winReason,
      eloChange: isP1 ? match.p1EloChange : match.p2EloChange,
      abandonedBy: match.abandonedById === null ? null : match.abandonedById === playerId ? 'you' : 'opponent',
      forfeitRated: match.winReason === 'FORFEIT' && (match.p1EloChange !== null || match.p2EloChange !== null),
      deckMode: match.deckMode,
      quartetGroupIds: match.quartetGroupIds,
    };
  }
}
