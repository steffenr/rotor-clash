import fs from 'node:fs';
import path from 'node:path';
import type { MatchRecord, PlayerProfile } from '../shared/gameTypes.ts';

interface PersistedData {
  players: Record<string, PlayerProfile>;
  matches: MatchRecord[];
}

const DEFAULT_DATA_FILE = path.join(path.resolve(process.cwd(), 'data'), 'leaderboard.json');

/** Visitors who never finished a game carry no data worth keeping. */
const INACTIVE_VISITOR_MS = 30 * 24 * 60 * 60 * 1000;
const PRUNE_INTERVAL_MS = 60 * 60 * 1000;
const DEFAULT_LEADERBOARD_LIMIT = 50;

export class LeaderboardStore {
  private data: PersistedData = { players: {}, matches: [] };
  private writeQueue: Promise<void> = Promise.resolve();
  private readonly dataDir: string;
  /** All ranked players (>= 1 game), best first. Rebuilt lazily after any ranking change. */
  private rankedCache: PlayerProfile[] | null = null;
  private lastPruneAt = Date.now();

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
        delete this.data.players[id];
        removed += 1;
      }
    }
    return removed;
  }

  private load() {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      if (fs.existsSync(this.dataFile)) {
        const raw = fs.readFileSync(this.dataFile, 'utf-8');
        const parsed = JSON.parse(raw) as Partial<PersistedData>;
        this.data = {
          players: parsed.players ?? {},
          matches: Array.isArray(parsed.matches) ? parsed.matches : [],
        };
      }
    } catch (err) {
      console.error('Failed to load leaderboard store:', err);
      this.data = { players: {}, matches: [] };
    }
  }

  private persist() {
    const snapshot = JSON.stringify(this.data, null, 2);
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
  }

  public getOrCreatePlayer(id: string, callsign?: string): PlayerProfile {
    const cleanCallsign = this.sanitizeCallsign(callsign);
    const existing = this.data.players[id];
    if (existing) {
      if (cleanCallsign && existing.callsign !== cleanCallsign) {
        existing.callsign = cleanCallsign;
        existing.updatedAt = Date.now();
        if (existing.gamesPlayed > 0) {
          this.rankedCache = null;
          this.persist();
        }
      }
      return existing;
    }

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
    return created;
  }

  public updateCallsign(id: string, callsign: string): PlayerProfile {
    const player = this.getOrCreatePlayer(id, callsign);
    const clean = this.sanitizeCallsign(callsign);
    if (clean) {
      player.callsign = clean;
      player.updatedAt = Date.now();
      if (player.gamesPlayed > 0) this.rankedCache = null;
      this.persist();
    }
    return player;
  }

  public getPlayer(id: string): PlayerProfile | null {
    return this.data.players[id] ?? null;
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

    let score1 = 0.5;
    let score2 = 0.5;
    if (params.winnerId === p1.id) {
      score1 = 1;
      score2 = 0;
    } else if (params.winnerId === p2.id) {
      score1 = 0;
      score2 = 1;
    }

    const p1Delta = Math.round(K * (score1 - expected1));
    const p2Delta = Math.round(K * (score2 - expected2));

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

  private sanitizeCallsign(raw?: string): string {
    if (!raw) return '';
    return raw.trim().replace(/[^\w\s-]/g, '').slice(0, 20).trim();
  }
}

export const leaderboardStore = new LeaderboardStore();
