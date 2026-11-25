import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { IncomingMessage } from 'node:http';
import { LeaderboardStore } from '../src/server/store.ts';
import { MatchEngine, MAX_WAITING_ROOMS } from '../src/server/matchEngine.ts';
import {
  ConnectionLimiter,
  KeyedRateLimiter,
  MAX_MESSAGE_BYTES,
  RateLimiter,
  buildCsp,
  clientIp,
  isAllowedOrigin,
  isValidPlayerId,
  parseClientMessage,
  securityHeaders,
  trustForwardedHeader,
} from '../src/server/security.ts';


function tempStoreFile(): string {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'rotor-clash-sec-')), 'leaderboard.json');
}

// ---------------------------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------------------------

test('player ids: UUIDs and legacy ids pass, prototype keys and odd input are refused', () => {
  assert.equal(isValidPlayerId('3f2b8c1e-7d44-4c6a-9a3f-0b1c2d3e4f50'), true);
  assert.equal(isValidPlayerId('p_1a2b3c4d5e6f'), true);
  for (const bad of ['__proto__', 'constructor', 'prototype', 'abc', '', 'a b c d', 'x'.repeat(65), '../etc', 42, null, {}]) {
    assert.equal(isValidPlayerId(bad), false, `${String(bad)} must be refused`);
  }
});

test('client messages: only well-formed, size-bounded JSON objects are parsed', () => {
  assert.deepEqual(parseClientMessage('{"event":"queue:leave"}'), { event: 'queue:leave', payload: {} });
  assert.deepEqual(parseClientMessage('{"event":"room:join","payload":{"roomCode":"ABC234"}}'), {
    event: 'room:join',
    payload: { roomCode: 'ABC234' },
  });
  for (const bad of [
    'not json',
    'null',
    '[]',
    '"event"',
    '{"event":42}',
    '{"event":""}',
    `{"event":"${'x'.repeat(41)}"}`,
    '{"event":"a","payload":[1,2]}',
    '{"event":"a","payload":"text"}',
    `{"event":"a","payload":{"x":"${'y'.repeat(MAX_MESSAGE_BYTES)}"}}`,
  ]) {
    assert.equal(parseClientMessage(bad), null, bad.slice(0, 40));
  }
});

// ---------------------------------------------------------------------------------------------
// Limits
// ---------------------------------------------------------------------------------------------

test('rate limiter: allows a burst, then refills over time', () => {
  let now = 0;
  const limiter = new RateLimiter(3, 1, () => now);
  assert.deepEqual([limiter.take(), limiter.take(), limiter.take(), limiter.take()], [true, true, true, false]);
  now += 1000;
  assert.equal(limiter.take(), true, 'one token came back after a second');
  assert.equal(limiter.take(), false);
});

test('connection limiter: caps sockets per address and overall, and frees slots on release', () => {
  const limiter = new ConnectionLimiter(2, 3);
  assert.equal(limiter.tryAcquire('1.1.1.1'), true);
  assert.equal(limiter.tryAcquire('1.1.1.1'), true);
  assert.equal(limiter.tryAcquire('1.1.1.1'), false, 'per-address cap');
  assert.equal(limiter.tryAcquire('2.2.2.2'), true);
  assert.equal(limiter.tryAcquire('3.3.3.3'), false, 'overall cap');
  limiter.release('1.1.1.1');
  assert.equal(limiter.tryAcquire('3.3.3.3'), true);
});

test('client address: the proxy-appended X-Forwarded-For entry wins only when proxies are trusted', () => {
  const req = {
    headers: { 'x-forwarded-for': '6.6.6.6, 203.0.113.9' },
    socket: { remoteAddress: '127.0.0.1' },
  } as unknown as IncomingMessage;
  assert.equal(clientIp(req, true), '203.0.113.9', 'the last entry is the one our proxy added');
  assert.equal(clientIp(req, false), '127.0.0.1');
});

test('client address: a client-supplied X-Forwarded-For is ignored unless the peer is local', () => {
  const withEnv = (value: string | undefined, run: () => void) => {
    const before = process.env.TRUST_PROXY;
    if (value === undefined) delete process.env.TRUST_PROXY;
    else process.env.TRUST_PROXY = value;
    try {
      run();
    } finally {
      if (before === undefined) delete process.env.TRUST_PROXY;
      else process.env.TRUST_PROXY = before;
    }
  };
  const reqFrom = (remoteAddress: string | undefined) =>
    ({
      headers: { 'x-forwarded-for': '203.0.113.9' },
      socket: { remoteAddress },
    }) as unknown as IncomingMessage;

  withEnv(undefined, () => {
    assert.equal(trustForwardedHeader(reqFrom('198.51.100.7')), false, 'a remote peer cannot spoof the header');
    assert.equal(clientIp(reqFrom('198.51.100.7')), '198.51.100.7');
    assert.equal(trustForwardedHeader(reqFrom('127.0.0.1')), true, 'a proxy on this host is trusted');
    assert.equal(trustForwardedHeader(reqFrom('::1')), true);
    assert.equal(trustForwardedHeader(reqFrom(undefined)), true, 'a unix socket has no remote client');
    assert.equal(clientIp(reqFrom('127.0.0.1')), '203.0.113.9');
  });
  withEnv('0', () => {
    assert.equal(clientIp(reqFrom('127.0.0.1')), '127.0.0.1', 'TRUST_PROXY=0 always ignores the header');
  });
  withEnv('1', () => {
    assert.equal(clientIp(reqFrom('198.51.100.7')), '203.0.113.9', 'a proxy on another host can be declared');
  });
});

test('keyed rate limiter: bounds its table and drops idle keys', () => {
  let now = 0;
  const limiter = new KeyedRateLimiter(1, 1, 3, 1000, () => now);
  assert.equal(limiter.take('a'), true);
  assert.equal(limiter.take('a'), false, 'one token per key');
  limiter.take('b');
  limiter.take('c');
  assert.equal(limiter.size, 3);
  limiter.take('d');
  assert.equal(limiter.size, 3, 'a fourth key evicts the oldest instead of growing');
  assert.equal(limiter.take('a'), true, 'the evicted key starts with a full bucket again');
  now += 5000;
  assert.equal(limiter.prune(), 3, 'idle keys are removed');
  assert.equal(limiter.size, 0);
});

test('websocket origin: same-origin, allow-listed and header-less clients pass; other sites do not', () => {
  assert.equal(isAllowedOrigin('https://rotor-clash.example', 'rotor-clash.example', []), true);
  assert.equal(isAllowedOrigin(undefined, 'rotor-clash.example', []), true);
  assert.equal(isAllowedOrigin('https://evil.example', 'rotor-clash.example', []), false);
  assert.equal(isAllowedOrigin('https://evil.example', 'rotor-clash.example', ['https://evil.example']), true);
  assert.equal(isAllowedOrigin('not a url', 'rotor-clash.example', []), false);
});

// ---------------------------------------------------------------------------------------------
// HTTP headers
// ---------------------------------------------------------------------------------------------

test('security headers: nosniff, framing and referrer policy always; CSP only for production', () => {
  const run = (isProd: boolean) => {
    const headers: Record<string, string> = {};
    const res = { setHeader: (k: string, v: string) => (headers[k] = v) };
    let called = false;
    securityHeaders(isProd)({ headers: { host: 'rotor-clash.example' } } as never, res as never, () => (called = true));
    assert.equal(called, true);
    return headers;
  };
  const prod = run(true);
  assert.equal(prod['X-Content-Type-Options'], 'nosniff');
  assert.equal(prod['X-Frame-Options'], 'DENY');
  assert.ok(prod['Referrer-Policy']);
  assert.match(prod['Content-Security-Policy'], /frame-ancestors 'none'/);
  assert.match(prod['Content-Security-Policy'], /object-src 'none'/);
  assert.match(prod['Content-Security-Policy'], /wss:\/\/rotor-clash\.example/);
  assert.equal(run(false)['Content-Security-Policy'], undefined);
});

test('csp: a hostile Host header cannot inject extra directives', () => {
  const csp = buildCsp("evil.example; script-src *");
  assert.doesNotMatch(csp, /evil\.example/);
  assert.doesNotMatch(csp, /script-src \*/);
});

// ---------------------------------------------------------------------------------------------
// Store: prototype pollution and secrets
// ---------------------------------------------------------------------------------------------

test('store: a player id of "__proto__" cannot pollute Object.prototype', () => {
  const store = new LeaderboardStore(tempStoreFile());
  assert.throws(() => store.getOrCreatePlayer('__proto__', 'Hax'));
  assert.equal(store.getPlayer('__proto__'), null);
  assert.equal(store.getPlayer('constructor'), null);
  assert.equal(({} as Record<string, unknown>).callsign, undefined);
  assert.equal(({} as Record<string, unknown>).elo, undefined);
});

test('store: a poisoned data file cannot smuggle prototype keys in', () => {
  const file = tempStoreFile();
  fs.writeFileSync(
    file,
    '{"players":{"__proto__":{"callsign":"Hax","gamesPlayed":9},"constructor":{"id":"x","gamesPlayed":1}},"keys":{"__proto__":"' +
      'c'.repeat(64) +
      '"},"matches":[]}'
  );
  const store = new LeaderboardStore(file);
  assert.equal(store.getLeaderboard().length, 0);
  assert.equal(({} as Record<string, unknown>).callsign, undefined);
});

test('store: a device key is bound to exactly one player id', () => {
  const store = new LeaderboardStore(tempStoreFile());
  const key = `B${'A'.repeat(86)}`; // 65 bytes starting with the uncompressed-point marker
  assert.equal(store.bindPublicKey('player-a', key), true);
  assert.equal(store.bindPublicKey('player-a', key), true, 'the same id keeps working');
  assert.equal(store.bindPublicKey('player-b', key), false, 'another id cannot reuse the key');
  assert.equal(store.getPublicKey('player-b'), undefined);
  assert.equal(store.bindPublicKey('player-b', `B${'A'.repeat(85)}C`), true, 'a fresh key is fine');
});

test('store: logging in again cannot rename a profile around the cooldown', () => {
  const store = new LeaderboardStore(tempStoreFile());
  assert.equal(store.getOrCreatePlayer('player-x', 'Alice').callsign, 'Alice');
  assert.equal(store.getOrCreatePlayer('player-x', 'Mallory').callsign, 'Alice', 'login keeps the name');
  assert.equal(store.updateCallsign('player-x', 'Mallory').callsign, 'Mallory', 'a real rename still works');
});

test('store: renaming to the same name does not write, and oversized names are bounded', async () => {
  const file = tempStoreFile();
  const store = new LeaderboardStore(file);
  store.getOrCreatePlayer('someone-1', 'Alice');
  store.updateCallsign('someone-1', 'Alice');
  await store.flush();
  assert.equal(fs.existsSync(file), false, 'visitors without a game are never written to disk');

  const profile = store.updateCallsign('someone-1', 'B'.repeat(10_000_000));
  assert.ok(profile.callsign.length <= 20);
});

test('store: random ids cannot grow the profile table without bound', () => {
  const store = new LeaderboardStore(tempStoreFile());
  for (let i = 0; i < 6000; i++) store.getOrCreatePlayer(`visitor-${i}`);
  let present = 0;
  for (let i = 0; i < 6000; i++) if (store.getPlayer(`visitor-${i}`)) present++;
  assert.ok(present <= 5000, `kept ${present} profiles`);
});

// ---------------------------------------------------------------------------------------------
// Match engine: stat validation
// ---------------------------------------------------------------------------------------------

test('match engine: a stat the deck does not compare is refused and changes nothing', () => {
  const store = new LeaderboardStore(tempStoreFile());
  const engine = new MatchEngine(() => {}, () => {}, () => true, store);
  try {
    engine.joinQueue('player-aaaa', 'modern');
    engine.joinQueue('player-bbbb', 'modern');
    const state = engine.getMatchForPlayer('player-aaaa')!;
    const active = (engine as unknown as { matches: Map<string, { turnPlayerId: string; p1Deck: string[]; p2Deck: string[] }> }).matches.get(state.matchId)!;
    const mover = active.turnPlayerId;
    const decksBefore = [active.p1Deck.length, active.p2Deck.length];

    for (const bogus of ['definitelyNotAStat', 'firstPowerYear', '__proto__', 'constructor', '']) {
      const res = engine.playStat(mover, state.matchId, bogus as never);
      assert.equal(res.ok, false, `${bogus} must be refused`);
    }
    assert.deepEqual([active.p1Deck.length, active.p2Deck.length], decksBefore, 'no card was dealt');
    assert.equal(engine.playStat(mover, state.matchId, 'ratedPowerMw').ok, true, 'a legal stat still works');
  } finally {
    engine.dispose();
  }
});

test('match engine: friend rooms are private by default, use unpredictable codes and are capped', () => {
  const store = new LeaderboardStore(tempStoreFile());
  const engine = new MatchEngine(() => {}, () => {}, () => true, store);
  try {
    const codes = new Set<string>();
    for (let i = 0; i < MAX_WAITING_ROOMS; i++) {
      const created = engine.createRoom(`host-${i}-xx`);
      assert.match(created.room!.roomCode, /^[A-HJ-NP-Z2-9]{6}$/);
      codes.add(created.room!.roomCode);
    }
    assert.equal(codes.size, MAX_WAITING_ROOMS);

    const refused = engine.createRoom('one-too-many');
    assert.equal(refused.ok, false, 'the lobby refuses room number 26');
    assert.equal(refused.code, 'ROOM_LIMIT');
    assert.match(refused.error ?? '', /friend rooms/);
    assert.equal(engine.getWaitingRoomForPlayer('one-too-many'), null);

    const replaced = engine.createRoom('host-3-xx');
    assert.equal(replaced.ok, true, 'a host can replace their own room while the lobby is full');

    assert.equal(engine.getLobbySnapshot(40).openRooms.length, 0, 'nothing is listed unless the host opts in');
    engine.setRoomListed('host-3-xx', true);
    assert.equal(engine.getLobbySnapshot(40).openRooms.length, 1);
    engine.setRoomListed('host-3-xx', false);
    assert.equal(engine.getLobbySnapshot(40).openRooms.length, 0);
  } finally {
    engine.dispose();
  }
});
