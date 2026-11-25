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
    recordForfeit(params) {
      const leaver = this.getOrCreatePlayer(params.leaverId);
      const opponent = this.getOrCreatePlayer(
        params.leaverId === params.player1Id ? params.player2Id : params.player1Id
      );
      leaver.gamesPlayed += 1;
      leaver.losses += 1;
      leaver.elo -= 16;
      matches.unshift({
        id: params.matchId,
        mode: params.mode,
        winnerId: opponent.id,
        winnerCallsign: opponent.callsign,
        loserCallsign: leaver.callsign,
        player1Callsign: this.getOrCreatePlayer(params.player1Id).callsign,
        player2Callsign: this.getOrCreatePlayer(params.player2Id).callsign,
        player1Cards: params.p1Cards,
        player2Cards: params.p2Cards,
        roundsPlayed: params.roundsPlayed,
        eloDelta: 16,
        isDraw: false,
        finishedAt: Date.now(),
      });
      return -16;
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

    // Leaving after a decided round is rated: the leaver takes the loss, the opponent gets nothing.
    engine.forfeitMatch('bob', aliceState.matchId);
    const finished = engine.getMatchForPlayer('alice') as ClientMatchState;
    const leaver = engine.getMatchForPlayer('bob') as ClientMatchState;
    assert.equal(finished.status, 'FINISHED');
    assert.equal(finished.winReason, 'FORFEIT');
    assert.equal(finished.winnerId, null);
    assert.equal(finished.forfeitRated, true);
    assert.equal(finished.eloChange, null, 'the opponent gets no rating change');
    assert.equal(leaver.eloChange, -16, 'the leaver takes the loss');
    assert.equal(finished.abandonedBy, 'opponent');
    assert.equal(leaver.abandonedBy, 'you');
    assert.equal(store.getRecentMatches().length, 1);
    assert.equal(store.getRecentMatches()[0].winnerId, 'alice');
    const loserProfile = store.getOrCreatePlayer('bob');
    assert.equal(loserProfile.elo, 1184);
    assert.equal(loserProfile.gamesPlayed, 1);
    assert.equal(loserProfile.losses, 1);
    const winnerProfile = store.getOrCreatePlayer('alice');
    assert.equal(winnerProfile.elo, 1200, 'the opponent is not credited');
    assert.equal(winnerProfile.gamesPlayed, 0);
    assert.equal(winnerProfile.wins, 0);
  } finally {
    engine.dispose();
  }
});

test('MatchEngine counts a match (ELO, stats, history) only when it is played to the end', () => {
  const store = createMemoryStore();
  const engine = new MatchEngine(
    () => {},
    () => {},
    () => true,
    store
  );

  try {
    const code = engine.createRoom('alice').room!.roomCode;
    engine.joinRoom('bob', code);
    const matchId = (engine.getMatchForPlayer('alice') as ClientMatchState).matchId;

    for (let i = 0; i < 200; i++) {
      const state = engine.getMatchForPlayer('alice') as ClientMatchState;
      if (state.status === 'FINISHED') break;
      if (state.status === 'PLAYING') {
        engine.playStat(state.turnPlayerId!, matchId, 'ratedPowerMw');
      } else {
        // skip the short anti-skip lock on the reveal screen
        (engine as unknown as { matches: Map<string, { revealLockedUntil: number }> }).matches.get(matchId)!.revealLockedUntil = 0;
        engine.requestNextRound('alice', matchId);
      }
    }

    const done = engine.getMatchForPlayer('alice') as ClientMatchState;
    assert.equal(done.status, 'FINISHED');
    assert.notEqual(done.winReason, 'FORFEIT');
    assert.equal(done.abandonedBy, null);
    assert.equal(store.getRecentMatches().length, 1);
    assert.equal(store.getOrCreatePlayer('alice').gamesPlayed, 1);
    assert.equal(store.getOrCreatePlayer('bob').gamesPlayed, 1);
  } finally {
    engine.dispose();
  }
});

test('MatchEngine leaves a forfeit before the first round unrated', () => {
  const store = createMemoryStore();
  const engine = new MatchEngine(
    () => {},
    () => {},
    () => true,
    store
  );

  try {
    const code = engine.createRoom('carol').room!.roomCode;
    engine.joinRoom('dave', code);
    const matchId = (engine.getMatchForPlayer('carol') as ClientMatchState).matchId;

    engine.forfeitMatch('carol', matchId);
    const done = engine.getMatchForPlayer('carol') as ClientMatchState;
    assert.equal(done.status, 'FINISHED');
    assert.equal(done.winReason, 'FORFEIT');
    assert.equal(done.forfeitRated, false, 'an early drop is not punished');
    assert.equal(done.eloChange, null);
    assert.equal(store.getRecentMatches().length, 0);
    assert.equal(store.getOrCreatePlayer('carol').gamesPlayed, 0);
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

test('MatchEngine deck modes: a Grand Tour room deals 32 cards each, allows 48 rounds and reports its mode', () => {
  const engine = new MatchEngine(() => {}, () => {}, () => true, createMemoryStore());
  try {
    const created = engine.createRoom('alice', 'grand');
    assert.equal(created.ok, true);
    assert.equal(created.room?.deckMode, 'grand');
    assert.equal(created.room?.listed, false, 'new rooms are private until the host lists them');
    assert.equal(engine.getLobbySnapshot(2).openRooms.length, 0);
    assert.equal(engine.setRoomListed('alice', true)?.listed, true);
    assert.equal(engine.getLobbySnapshot(2).openRooms[0].deckMode, 'grand');

    assert.equal(engine.joinRoom('bob', created.room!.roomCode).ok, true);
    const state = engine.getMatchForPlayer('alice') as ClientMatchState;
    assert.equal(state.deckMode, 'grand');
    assert.equal(state.maxRounds, 48);
    assert.equal(state.you.cardCount, 32);
    assert.equal(state.opponent.cardCount, 32);
    assert.equal(state.quartetGroupIds.length, 16);
  } finally {
    engine.dispose();
  }
});

test('MatchEngine deck modes: records and mixed rooms deal 32 cards each from the right pool', () => {
  const engine = new MatchEngine(() => {}, () => {}, () => true, createMemoryStore());
  try {
    const records = engine.createRoom('a1', 'records').room!;
    engine.joinRoom('b1', records.roomCode);
    const r = engine.getMatchForPlayer('a1') as ClientMatchState;
    assert.equal(r.deckMode, 'records');
    assert.equal(r.you.cardCount, 16);
    assert.ok(r.quartetGroupIds.every((g) => g >= 9 && g <= 16));
    assert.equal(r.quartetGroupIds.length, 8);

    const mixed = engine.createRoom('a2', 'mixed').room!;
    engine.joinRoom('b2', mixed.roomCode);
    const m = engine.getMatchForPlayer('a2') as ClientMatchState;
    assert.equal(m.deckMode, 'mixed');
    assert.equal(m.you.cardCount, 16);
    assert.equal(m.quartetGroupIds.length, 8);
    assert.equal(m.maxRounds, 24);
  } finally {
    engine.dispose();
  }
});

test('MatchEngine deck modes: quick-match queues are separate per deck, and unknown modes fall back to modern', () => {
  const engine = new MatchEngine(() => {}, () => {}, () => true, createMemoryStore());
  try {
    assert.equal(engine.joinQueue('a', 'modern').ok, true);
    assert.equal(engine.joinQueue('b', 'records').ok, true);
    assert.equal(engine.getMatchForPlayer('a'), null, 'different decks must not be paired');
    assert.equal(engine.getMatchForPlayer('b'), null);

    assert.equal(engine.joinQueue('c', 'modern').ok, true);
    const pair = engine.getMatchForPlayer('a') as ClientMatchState;
    assert.ok(pair);
    assert.equal(pair.deckMode, 'modern');
    assert.equal(engine.getMatchForPlayer('b'), null, 'the records player keeps waiting');

    // Invalid input from a client is treated as the default deck.
    const bogus = engine.createRoom('d', 'definitely-not-a-deck' as never);
    assert.equal(bogus.room?.deckMode, 'modern');
    // Lobby counts every waiting player, whichever deck they chose.
    assert.equal(engine.getLobbySnapshot(4).queueCount, 1);
  } finally {
    engine.dispose();
  }
});
