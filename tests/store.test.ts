import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { LeaderboardStore } from '../src/server/store.ts';
import type { PlayerProfile } from '../src/shared/gameTypes.ts';

const DAY = 24 * 60 * 60 * 1000;

function profile(id: string, over: Partial<PlayerProfile> = {}): PlayerProfile {
  return {
    id,
    callsign: `P-${id}`,
    elo: 1200,
    wins: 0,
    losses: 0,
    draws: 0,
    gamesPlayed: 0,
    winStreak: 0,
    bestStreak: 0,
    quartetsCompleted: 0,
    updatedAt: Date.now(),
    ...over,
  };
}

function tempFile(players: PlayerProfile[] = []): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rotor-clash-store-'));
  const file = path.join(dir, 'leaderboard.json');
  fs.writeFileSync(
    file,
    JSON.stringify({ players: Object.fromEntries(players.map((p) => [p.id, p])), matches: [] })
  );
  return file;
}

test('LeaderboardStore drops zero-game players that were inactive for 30+ days, keeps everyone else', () => {
  const now = Date.now();
  const file = tempFile([
    profile('stale-visitor', { updatedAt: now - 31 * DAY }),
    profile('fresh-visitor', { updatedAt: now - 2 * DAY }),
    profile('old-veteran', { updatedAt: now - 400 * DAY, gamesPlayed: 5, wins: 3, losses: 2, elo: 1250 }),
  ]);

  const store = new LeaderboardStore(file);

  assert.equal(store.getPlayer('stale-visitor'), null);
  assert.ok(store.getPlayer('fresh-visitor'));
  assert.ok(store.getPlayer('old-veteran'), 'players with games are never pruned, however old');
});

test('LeaderboardStore.pruneInactive reports how many players were removed', () => {
  const now = Date.now();
  const store = new LeaderboardStore(tempFile());
  store.getOrCreatePlayer('a');
  store.getOrCreatePlayer('b');

  assert.equal(store.pruneInactive(now), 0, 'nothing is old yet');
  assert.equal(store.pruneInactive(now + 31 * DAY), 2);
  assert.equal(store.getPlayer('a'), null);
});

test('LeaderboardStore leaderboard is ranked, limited, and reflects new results (cache is invalidated)', () => {
  const now = Date.now();
  const players = Array.from({ length: 60 }, (_, i) =>
    profile(`p${i}`, { gamesPlayed: 1, wins: 1, elo: 1000 + i, updatedAt: now })
  );
  const store = new LeaderboardStore(tempFile(players));

  const first = store.getLeaderboard();
  assert.equal(first.length, 50, 'default limit is 50');
  assert.equal(first[0].id, 'p59');
  assert.equal(store.getLeaderboard(3).length, 3);

  // Lowest-rated player (p0) beats the top player (p59) -> rankings must change.
  store.recordPvpMatch({
    matchId: 'm1',
    mode: 'ranked',
    p1Id: 'p0',
    p2Id: 'p59',
    p1Cards: 20,
    p2Cards: 0,
    p1Quartets: 1,
    p2Quartets: 0,
    winnerId: 'p0',
    roundsPlayed: 10,
  });

  const after = store.getLeaderboard();
  const p0Rank = after.findIndex((p) => p.id === 'p0');
  assert.ok(p0Rank >= 0 && p0Rank < 50, 'p0 jumped into the visible top 50');
  assert.ok(after.findIndex((p) => p.id === 'p59') > 0, 'p59 lost the top spot');
  for (let i = 1; i < after.length; i++) {
    assert.ok(after[i - 1].elo >= after[i].elo, 'sorted by ELO descending');
  }
});

test('LeaderboardStore leaderboard only lists players who have played a game', () => {
  const store = new LeaderboardStore(tempFile());
  store.getOrCreatePlayer('lurker');
  assert.equal(store.getLeaderboard().length, 0);
});

test('LeaderboardStore.recordForfeit rates the leaver only and records the result', () => {
  const store = new LeaderboardStore(tempFile());
  const delta = store.recordForfeit({
    matchId: 'forfeit-1',
    mode: 'ranked',
    player1Id: 'alice',
    player2Id: 'bob',
    leaverId: 'bob',
    p1Cards: 20,
    p2Cards: 12,
    roundsPlayed: 5,
  });

  assert.ok(delta <= -1, `a loss costs at least one point, got ${delta}`);
  const alice = store.getPlayer('alice')!;
  const bob = store.getPlayer('bob')!;
  assert.equal(alice.elo, 1200, 'the opponent is not rated');
  assert.equal(alice.gamesPlayed, 0);
  assert.equal(alice.wins, 0);
  assert.equal(bob.elo, 1200 + delta);
  assert.equal(bob.gamesPlayed, 1);
  assert.equal(bob.losses, 1);
  assert.equal(bob.winStreak, 0);

  const [record] = store.getRecentMatches();
  assert.equal(record.winnerId, 'alice');
  assert.equal(record.loserCallsign, bob.callsign);
  assert.equal(record.eloDelta, -delta);

  assert.equal(
    store.recordForfeit({
      matchId: 'forfeit-2',
      mode: 'ranked',
      player1Id: 'alice',
      player2Id: 'bob',
      leaverId: 'nobody',
      p1Cards: 1,
      p2Cards: 1,
      roundsPlayed: 1,
    }),
    0,
    'a leaver who is not in the match changes nothing'
  );
  assert.equal(store.getRecentMatches().length, 1);
});

test('LeaderboardStore.recordForfeit never pushes a rating below the floor', () => {
  const store = new LeaderboardStore(tempFile([profile('low', { elo: 400, gamesPlayed: 3, losses: 3 })]));
  const delta = store.recordForfeit({
    matchId: 'forfeit-3',
    mode: 'room',
    player1Id: 'low',
    player2Id: 'high',
    leaverId: 'low',
    p1Cards: 4,
    p2Cards: 18,
    roundsPlayed: 9,
  });
  assert.equal(delta, 0);
  assert.equal(store.getPlayer('low')!.elo, 400);
  assert.equal(store.getPlayer('low')!.losses, 4);
});
