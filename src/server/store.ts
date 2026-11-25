import fs from 'node:fs';
import path from 'node:path';
import type { MatchRecord, PlayerProfile } from '../shared/gameTypes.ts';
import { isForbiddenKey, isValidPublicKey } from './security.ts';

interface StoreData {
  players: Record<string, PlayerProfile>;
  /** Public device keys (ECDSA P-256) that prove a login. Public by nature, still never sent to clients. */
  keys: Record<string, string>;
  matches: MatchRecord[];
}

const DEFAULT_DATA_FILE = path.join(path.resolve(process.cwd(), 'data'), 'leaderboard.json');

/** Visitors who never finished a game carry no data worth keeping. */
const INACTIVE_VISITOR_MS = 30 * 24 * 60 * 60 * 1000;
const PRUNE_INTERVAL_MS = 60 * 60 * 1000;
const DEFAULT_LEADERBOARD_LIMIT = 50;
/** Upper bound for profiles held in memory; ranked players are never evicted, unranked ones are. */
const MAX_PROFILES = 5000;
/** Disk writes are coalesced, so a burst of changes costs one write. */
const PERSIST_DELAY_MS = 500;
const MAX_CALLSIGN_INPUT = 64;
/** Two players who keep meeting in this window get damped rating, which stops collusion farming. */
const REPEAT_PAIR_WINDOW_MS = 60 * 60 * 1000;
const MAX_TRACKED_PAIRS = 5000;

/**
 * Prototype-less dictionary: keys such as `__proto__` or `constructor` are plain data, never the
 * Object.prototype accessors. Player ids come from clients, so this is a security boundary.
 */
function dictionary<T>(): Record<string, T> {
  return Object.create(null) as Record<string, T>;
}

export class LeaderboardStore {
  private data: StoreData = { players: dictionary(), keys: dictionary(), matches: [] };
  private writeQueue: Promise<void> = Promise.resolve();
  private readonly dataDir: string;
  /** All ranked players (>= 1 game), best first. Rebuilt lazily after any ranking change. */
  private rankedCache: PlayerProfile[] | null = null;
  /** Unordered player pairs and how often they met recently; memory only, capped. */
  private readonly recentPairs = new Map<string, { count: number; lastAt: number }>();
  private lastPruneAt = Date.now();
  private dirty = false;
  private persistTimer: NodeJS.Timeout | undefined;

  constructor(private readonly dataFile: string = DEFAULT_DATA_FILE) {
    this.dataDir = path.dirname(dataFile);
    this.load();
    this.pruneInactive();
  }

  /**
   * Removes players with zero games who have not been seen for 30 days.
   * Players with at least one game are never removed. Returns how many were dropped.
   */
  public pruneInactive(now = Date.now()): number {
    this.lastPruneAt = now;
    let removed = 0;
    for (const [id, player] of Object.entries(this.data.players)) {
      if (player.gamesPlayed === 0 && now - player.updatedAt >= INACTIVE_VISITOR_MS) {
        this.deletePlayer(id);
        removed += 1;
      }
    }
    return removed;
  }

  private deletePlayer(id: string) {
    delete this.data.players[id];
    delete this.data.keys[id];
  }

  private load() {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      if (fs.existsSync(this.dataFile)) {
        const raw = fs.readFileSync(this.dataFile, 'utf-8');
        const parsed = JSON.parse(raw) as {
          players?: Record<string, PlayerProfile>;
          keys?: Record<string, unknown>;
          matches?: MatchRecord[];
        };
        const data: StoreData = { players: dictionary(), keys: dictionary(), matches: [] };
        for (const [id, profile] of Object.entries(parsed.players ?? {})) {
          if (isForbiddenKey(id) || !profile || typeof profile !== 'object') continue;
          data.players[id] = profile;
        }
        for (const [id, key] of Object.entries(parsed.keys ?? {})) {
          if (isForbiddenKey(id) || !isValidPublicKey(key)) continue;
          data.keys[id] = key;
        }
        data.matches = Array.isArray(parsed.matches) ? parsed.matches : [];
        this.data = data;
      }
    } catch (err) {
      console.error('Failed to load leaderboard store:', err);
      this.data = { players: dictionary(), keys: dictionary(), matches: [] };
    }
  }

  /** Only ranked players are worth keeping across restarts; visitors without a game are cheap to recreate. */
  private serialize(): string {
    const players: Record<string, PlayerProfile> = {};
    const keys: Record<string, string> = {};
    for (const [id, profile] of Object.entries(this.data.players)) {
      if (profile.gamesPlayed <= 0) continue;
      players[id] = profile;
      const key = this.data.keys[id];
      if (key) keys[id] = key;
    }
    return JSON.stringify({ players, keys, matches: this.data.matches }, null, 2);
  }

  /** Marks the data as changed and schedules one coalesced write. */
  private persist() {
    this.dirty = true;
    if (this.persistTimer) return;
    this.persistTimer = setTimeout(() => {
      this.persistTimer = undefined;
      void this.flush();
    }, PERSIST_DELAY_MS);
    this.persistTimer.unref?.();
  }

  /** Writes pending changes now (atomic temp-file + rename). Call before the process exits. */
  public flush(): Promise<void> {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
      this.persistTimer = undefined;
    }
    if (!this.dirty) return this.writeQueue;
    this.dirty = false;
    const snapshot = this.serialize();
    this.writeQueue = this.writeQueue
      .then(async () => {
        if (!fs.existsSync(this.dataDir)) {
          await fs.promises.mkdir(this.dataDir, { recursive: true });
        }
        const tmpFile = `${this.dataFile}.tmp`;
        await fs.promises.writeFile(tmpFile, snapshot, 'utf-8');
        await fs.promises.rename(tmpFile, this.dataFile);
      })
      .catch((err) => {
        console.error('Failed to persist leaderboard store:', err);
      });
    return this.writeQueue;
  }

  private findPlayer(id: string): PlayerProfile | undefined {
    return Object.hasOwn(this.data.players, id) ? this.data.players[id] : undefined;
  }

  /** The device public key bound to this id, if any. */
  public getPublicKey(id: string): string | undefined {
    if (isForbiddenKey(id)) return undefined;
    return Object.hasOwn(this.data.keys, id) ? this.data.keys[id] : undefined;
  }

  /**
   * Binds a device key to an id after the browser proved it holds the private key. The first key wins.
   * A ranked profile without a key (from before device keys) cannot be claimed: the id is public, so
   * handing it to whoever asks first would let anyone take over that ranking.
   * A key belongs to exactly one id, so one browser cannot farm a crowd of identities.
   */
  public bindPublicKey(id: string, publicKey: string): boolean {
    if (isForbiddenKey(id) || !isValidPublicKey(publicKey)) return false;
    const existing = this.getPublicKey(id);
    if (existing) return existing === publicKey;
    if (Object.values(this.data.keys).includes(publicKey)) return false;
    if ((this.findPlayer(id)?.gamesPlayed ?? 0) > 0) return false;
    this.data.keys[id] = publicKey;
    this.persist();
    return true;
  }

  /**
   * The profile for an id, created with `callsign` when it does not exist yet. An existing profile is
   * never renamed here: renaming goes through `updateCallsign()`, which the server rate limits.
   */
  public getOrCreatePlayer(id: string, callsign?: string): PlayerProfile {
    if (isForbiddenKey(id)) throw new Error('Invalid player id');
    const cleanCallsign = this.sanitizeCallsign(callsign);
    const existing = this.findPlayer(id);
    if (existing) return existing;

    const created: PlayerProfile = {
      id,
      callsign: cleanCallsign || `Engineer-${id.slice(0, 4).toUpperCase()}`,
      elo: 1200,
      wins: 0,
      losses: 0,
      draws: 0,
      gamesPlayed: 0,
      winStreak: 0,
      bestStreak: 0,
      quartetsCompleted: 0,
      updatedAt: Date.now(),
    };
    this.data.players[id] = created;
    if (Date.now() - this.lastPruneAt >= PRUNE_INTERVAL_MS) this.pruneInactive();
    if (Object.keys(this.data.players).length > MAX_PROFILES) this.evictUnranked();
    return created;
  }

  /** Drops the oldest visitors without a game so random ids cannot grow memory without bound. */
  private evictUnranked() {
    const unranked = Object.values(this.data.players)
      .filter((p) => p.gamesPlayed === 0)
      .sort((a, b) => a.updatedAt - b.updatedAt);
    const excess = Object.keys(this.data.players).length - Math.floor(MAX_PROFILES * 0.9);
    for (const profile of unranked.slice(0, Math.max(0, excess))) {
      this.deletePlayer(profile.id);
    }
  }

  public updateCallsign(id: string, callsign: string): PlayerProfile {
    const player = this.getOrCreatePlayer(id);
    const clean = this.sanitizeCallsign(callsign);
    if (clean && clean !== player.callsign) {
      player.callsign = clean;
      player.updatedAt = Date.now();
      if (player.gamesPlayed > 0) {
        this.rankedCache = null;
        this.persist();
      }
    }
    return player;
  }

  public getPlayer(id: string): PlayerProfile | null {
    return this.findPlayer(id) ?? null;
  }

  public recordPvpMatch(params: {
    matchId: string;
    mode: 'ranked' | 'room';
    p1Id: string;
    p2Id: string;
    p1Cards: number;
    p2Cards: number;
    p1Quartets: number;
    p2Quartets: number;
    winnerId: string | null;
    roundsPlayed: number;
  }): { p1Delta: number; p2Delta: number } {
    const p1 = this.getOrCreatePlayer(params.p1Id);
    const p2 = this.getOrCreatePlayer(params.p2Id);

    const expected1 = 1 / (1 + Math.pow(10, (p2.elo - p1.elo) / 400));
    const expected2 = 1 - expected1;
    const K = 32;
    // Familiar opponents are worth less: the third meeting within an hour counts half, the fourth
    // and later ones nothing. Real duels are unaffected; a two-account farm stops earning.
    const repeatMultiplier = this.notePairing(p1.id, p2.id);

    let score1 = 0.5;
    let score2 = 0.5;
    if (params.winnerId === p1.id) {
      score1 = 1;
      score2 = 0;
    } else if (params.winnerId === p2.id) {
      score1 = 0;
      score2 = 1;
    }

    // `|| 0` turns a damped -0 into 0 so no UI ever renders "-0".
    const p1Delta = Math.round(K * (score1 - expected1) * repeatMultiplier) || 0;
    const p2Delta = Math.round(K * (score2 - expected2) * repeatMultiplier) || 0;

    p1.elo = Math.max(400, p1.elo + p1Delta);
    p2.elo = Math.max(400, p2.elo + p2Delta);
    p1.gamesPlayed += 1;
    p2.gamesPlayed += 1;
    p1.quartetsCompleted += params.p1Quartets;
    p2.quartetsCompleted += params.p2Quartets;

    if (params.winnerId === p1.id) {
      p1.wins += 1;
      p1.winStreak += 1;
      p1.bestStreak = Math.max(p1.bestStreak, p1.winStreak);
      p2.losses += 1;
      p2.winStreak = 0;
    } else if (params.winnerId === p2.id) {
      p2.wins += 1;
      p2.winStreak += 1;
      p2.bestStreak = Math.max(p2.bestStreak, p2.winStreak);
      p1.losses += 1;
      p1.winStreak = 0;
    } else {
      p1.draws += 1;
      p2.draws += 1;
      p1.winStreak = 0;
      p2.winStreak = 0;
    }

    const now = Date.now();
    p1.updatedAt = now;
    p2.updatedAt = now;

    const winnerProfile = params.winnerId === p1.id ? p1 : params.winnerId === p2.id ? p2 : null;
    const loserProfile = params.winnerId === p1.id ? p2 : params.winnerId === p2.id ? p1 : null;

    const record: MatchRecord = {
      id: params.matchId,
      mode: params.mode,
      winnerId: params.winnerId,
      winnerCallsign: winnerProfile?.callsign ?? null,
      loserCallsign: loserProfile?.callsign ?? null,
      player1Callsign: p1.callsign,
      player2Callsign: p2.callsign,
      player1Cards: params.p1Cards,
      player2Cards: params.p2Cards,
      roundsPlayed: params.roundsPlayed,
      eloDelta: Math.abs(params.winnerId === p1.id ? p1Delta : p2Delta),
      isDraw: params.winnerId === null,
      finishedAt: now,
    };

    this.data.matches.unshift(record);
    if (this.data.matches.length > 50) {
      this.data.matches = this.data.matches.slice(0, 50);
    }

    this.rankedCache = null;
    this.persist();
    return { p1Delta, p2Delta };
  }

  /**
   * A match is rated as a loss for the player who left once a round had been decided. Only the leaver
   * is changed: the opponent gets no win, no rating and no game count, so leaving cannot farm points
   * and cannot dodge a defeat either. Returns the leaver's rating change (negative).
   */
  public recordForfeit(params: {
    matchId: string;
    mode: 'ranked' | 'room';
    player1Id: string;
    player2Id: string;
    leaverId: string;
    p1Cards: number;
    p2Cards: number;
    roundsPlayed: number;
  }): number {
    if (params.leaverId !== params.player1Id && params.leaverId !== params.player2Id) return 0;

    const p1 = this.getOrCreatePlayer(params.player1Id);
    const p2 = this.getOrCreatePlayer(params.player2Id);
    const leaver = params.leaverId === p1.id ? p1 : p2;
    const opponent = params.leaverId === p1.id ? p2 : p1;

    const expected = 1 / (1 + Math.pow(10, (opponent.elo - leaver.elo) / 400));
    const K = 32;
    // At least one point, however strong the favourite was.
    const wanted = Math.min(-1, Math.round(K * (0 - expected)));
    const before = leaver.elo;
    leaver.elo = Math.max(400, before + wanted);
    const delta = leaver.elo - before;
    leaver.gamesPlayed += 1;
    leaver.losses += 1;
    leaver.winStreak = 0;
    leaver.updatedAt = Date.now();

    const record: MatchRecord = {
      id: params.matchId,
      mode: params.mode,
      winnerId: opponent.id,
      winnerCallsign: opponent.callsign,
      loserCallsign: leaver.callsign,
      player1Callsign: p1.callsign,
      player2Callsign: p2.callsign,
      player1Cards: params.p1Cards,
      player2Cards: params.p2Cards,
      roundsPlayed: params.roundsPlayed,
      eloDelta: Math.abs(delta),
      isDraw: false,
      finishedAt: Date.now(),
    };
    this.data.matches.unshift(record);
    if (this.data.matches.length > 50) {
      this.data.matches = this.data.matches.slice(0, 50);
    }

    this.rankedCache = null;
    this.persist();
    return delta;
  }

  /**
   * Records that two players met and returns the rating factor for this match: 1 for a fresh or
   * second opponent, 0.5 for the third meeting within the window, 0 after that.
   */
  private notePairing(p1Id: string, p2Id: string): number {
    const now = Date.now();
    const key = p1Id < p2Id ? `${p1Id}:${p2Id}` : `${p2Id}:${p1Id}`;
    const previous = this.recentPairs.get(key);
    const repeats = previous && now - previous.lastAt <= REPEAT_PAIR_WINDOW_MS ? previous.count : 0;
    // Re-insert so the insertion order stays least-recently-used for eviction.
    if (previous) this.recentPairs.delete(key);
    if (this.recentPairs.size >= MAX_TRACKED_PAIRS) {
      const oldest = this.recentPairs.keys().next().value;
      if (oldest !== undefined) this.recentPairs.delete(oldest);
    }
    this.recentPairs.set(key, { count: repeats + 1, lastAt: now });
    if (repeats < 2) return 1;
    return repeats === 2 ? 0.5 : 0;
  }

  /** Ranking is only recomputed after a result or rename; connects and broadcasts reuse it. */
  public getLeaderboard(limit = DEFAULT_LEADERBOARD_LIMIT): PlayerProfile[] {
    if (!this.rankedCache) {
      this.rankedCache = Object.values(this.data.players)
        .filter((p) => p.gamesPlayed > 0)
        .sort((a, b) => {
          if (b.elo !== a.elo) return b.elo - a.elo;
          if (b.wins !== a.wins) return b.wins - a.wins;
          return a.updatedAt - b.updatedAt;
        });
    }
    return this.rankedCache.slice(0, limit);
  }

  public getRecentMatches(limit = 20): MatchRecord[] {
    return this.data.matches.slice(0, limit);
  }

  /** Bounded before the regex runs, so an oversized value cannot cost CPU. */
  private sanitizeCallsign(raw?: string): string {
    if (!raw) return '';
    return raw.slice(0, MAX_CALLSIGN_INPUT).trim().replace(/[^\w\s-]/g, '').slice(0, 20).trim();
  }
}

export const leaderboardStore = new LeaderboardStore();
