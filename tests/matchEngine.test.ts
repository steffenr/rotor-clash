import test from 'node:test';
import assert from 'node:assert/strict';
import { MatchEngine, MatchStoreLike } from '../src/server/matchEngine.ts';
import type { ClientMatchState, MatchRecord, PlayerProfile } from '../src/shared/gameTypes.ts';

function createMemoryStore(): MatchStoreLike {
  const players = new Map<string, PlayerProfile>();
  const matches: MatchRecord[] = [];

  return {
    getOrCreatePlayer(id: string, callsign?: string): PlayerProfile {
      const existing = players.get(id);
      if (existing) return existing;
      const created: PlayerProfile = {
        id,
        callsign: callsign || `Player-${id}`,
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
      players.set(id, created);
      return created;
    },
    recordPvpMatch(params) {
      const p1 = this.getOrCreatePlayer(params.p1Id);
      const p2 = this.getOrCreatePlayer(params.p2Id);
      p1.gamesPlayed += 1;
      p2.gamesPlayed += 1;
      let p1Delta = 0;
      let p2Delta = 0;
      if (params.winnerId === params.p1Id) {
        p1.wins += 1;
        p2.losses += 1;
        p1Delta = 16;
        p2Delta = -16;
      } else if (params.winnerId === params.p2Id) {
        p2.wins += 1;
        p1.losses += 1;
        p2Delta = 16;
        p1Delta = -16;
      } else {
        p1.draws += 1;
        p2.draws += 1;
      }
      p1.elo += p1Delta;
      p2.elo += p2Delta;
      matches.unshift({
        id: params.matchId,
        mode: params.mode,
        winnerId: params.winnerId,
        winnerCallsign: params.winnerId ? this.getOrCreatePlayer(params.winnerId).callsign : null,
        loserCallsign: null,
        player1Callsign: p1.callsign,
        player2Callsign: p2.callsign,
        player1Cards: params.p1Cards,
        player2Cards: params.p2Cards,
        roundsPlayed: params.roundsPlayed,
        eloDelta: Math.abs(p1Delta),
        isDraw: params.winnerId === null,
        finishedAt: Date.now(),
      });
      return { p1Delta, p2Delta };
    },
    getLeaderboard() {
      return Array.from(players.values());
    },
    getRecentMatches() {
      return matches;
    },
  };
}

test('MatchEngine pairs private room players, enforces turns, resolves rounds, and handles forfeit', () => {
  const emitted: Record<string, Array<{ event: string; payload: unknown }>> = {};
  const broadcasts: Array<{ event: string; payload: unknown }> = [];
  const store = createMemoryStore();

  const engine = new MatchEngine(
    (playerId, event, payload) => {
      (emitted[playerId] ||= []).push({ event, payload });
    },
    (event, payload) => {
      broadcasts.push({ event, payload });
    },
    () => true,
    store
  );

  try {
    const roomRes = engine.createRoom('alice');
    assert.equal(roomRes.ok, true);
    assert.ok(roomRes.room?.roomCode);
    const code = roomRes.room!.roomCode;

    // Host cannot join their own room
    const selfJoin = engine.joinRoom('alice', code);
    assert.equal(selfJoin.ok, false);

    // Bob joins -> match starts
    const bobJoin = engine.joinRoom('bob', code);
    assert.equal(bobJoin.ok, true);

    const aliceState = engine.getMatchForPlayer('alice') as ClientMatchState;
    assert.ok(aliceState);
    assert.equal(aliceState.status, 'PLAYING');
    assert.equal(aliceState.you.cardCount, 16);
    assert.equal(aliceState.opponent.cardCount, 16);

    const turnId = aliceState.turnPlayerId;
    const otherId = turnId === 'alice' ? 'bob' : 'alice';

    // Non-turn player cannot play
    const wrongTurn = engine.playStat(otherId, aliceState.matchId, 'ratedPowerMw');
    assert.equal(wrongTurn.ok, false);

    // Turn player plays stat -> ROUND_REVEAL
    const rightTurn = engine.playStat(turnId, aliceState.matchId, 'ratedPowerMw');
    assert.equal(rightTurn.ok, true);

    const revealState = engine.getMatchForPlayer('alice') as ClientMatchState;
    assert.equal(revealState.status, 'ROUND_REVEAL');
    assert.equal(revealState.lastRound?.chosenStat, 'ratedPowerMw');

    // Forfeit settles match & updates store
    engine.forfeitMatch('bob', aliceState.matchId);
    const finished = engine.getMatchForPlayer('alice') as ClientMatchState;
    assert.equal(finished.status, 'FINISHED');
    assert.equal(finished.winnerId, 'alice');
    assert.equal(finished.winReason, 'FORFEIT');
    assert.equal(store.getRecentMatches().length, 1);
    assert.ok(broadcasts.some((b) => b.event === 'leaderboard:updated'));
  } finally {
    engine.dispose();
  }
});

test('MatchEngine quick-match queue pairs two connected players', () => {
  const store = createMemoryStore();
  const engine = new MatchEngine(
    () => {},
    () => {},
    () => true,
    store
  );

  try {
    assert.equal(engine.joinQueue('p1').ok, true);
    assert.equal(engine.getLobbySnapshot(2).queueCount, 1);

    assert.equal(engine.joinQueue('p2').ok, true);
    assert.equal(engine.getLobbySnapshot(2).queueCount, 0);

    const m1 = engine.getMatchForPlayer('p1');
    const m2 = engine.getMatchForPlayer('p2');
    assert.ok(m1 && m2);
    assert.equal(m1!.matchId, m2!.matchId);
    assert.equal(m1!.mode, 'ranked');
  } finally {
    engine.dispose();
  }
});
