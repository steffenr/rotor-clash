import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { webcrypto } from 'node:crypto';
import { LeaderboardStore } from '../src/server/store.ts';
import {
  challengeMessage,
  isValidPublicKey,
  newChallengeNonce,
  verifyChallengeProof,
} from '../src/server/security.ts';

const subtle = webcrypto.subtle;

function b64url(buf: ArrayBuffer): string {
  return Buffer.from(buf).toString('base64url');
}

/** Same steps as src/lib/deviceKey.ts, with Node's WebCrypto in place of the browser's. */
async function makeDevice() {
  const pair = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify']);
  const publicKey = b64url(await subtle.exportKey('raw', pair.publicKey));
  const sign = async (playerId: string, nonce: string) =>
    b64url(
      await subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        pair.privateKey,
        new TextEncoder().encode(challengeMessage(playerId, nonce))
      )
    );
  return { publicKey, sign };
}

function tempStoreFile(): string {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'rotor-clash-key-')), 'leaderboard.json');
}

test('device key: a browser-style signature verifies; wrong id, nonce or key does not', async () => {
  const a = await makeDevice();
  const b = await makeDevice();
  const nonce = newChallengeNonce();
  const sig = await a.sign('player-one', nonce);

  assert.equal(isValidPublicKey(a.publicKey), true);
  assert.equal(verifyChallengeProof(a.publicKey, 'player-one', nonce, sig), true);
  assert.equal(verifyChallengeProof(a.publicKey, 'player-two', nonce, sig), false, 'bound to the player id');
  assert.equal(verifyChallengeProof(a.publicKey, 'player-one', newChallengeNonce(), sig), false, 'bound to the nonce');
  assert.equal(verifyChallengeProof(b.publicKey, 'player-one', nonce, sig), false, 'another key cannot verify it');
});

test('device key: malformed keys and signatures are refused without throwing', () => {
  for (const bad of ['', 'x', 'A'.repeat(87), 'A'.repeat(88), 42, null, {}]) {
    assert.equal(isValidPublicKey(bad), false);
  }
  assert.equal(verifyChallengeProof('A'.repeat(87), 'player-one', 'n', 'B'.repeat(86)), false);
});

test('device key: nonces are unique', () => {
  assert.notEqual(newChallengeNonce(), newChallengeNonce());
});

test('store: the first device key is bound to an id; another key is refused', async () => {
  const store = new LeaderboardStore(tempStoreFile());
  const a = await makeDevice();
  const b = await makeDevice();
  assert.equal(store.bindPublicKey('player-one', a.publicKey), true);
  assert.equal(store.bindPublicKey('player-one', a.publicKey), true);
  assert.equal(store.bindPublicKey('player-one', b.publicKey), false, 'knowing the public id is not enough');
  assert.equal(store.getPublicKey('player-one'), a.publicKey);
  assert.equal(store.bindPublicKey('__proto__', a.publicKey), false);
  assert.equal(store.getPublicKey('__proto__'), undefined);
});

test('store: a ranked profile without a key (from before device keys) cannot be claimed by a stranger', async () => {
  const file = tempStoreFile();
  fs.writeFileSync(
    file,
    JSON.stringify({
      players: {
        'old-ranked': { id: 'old-ranked', callsign: 'Old', gamesPlayed: 5, wins: 3, losses: 2, elo: 1000, updatedAt: Date.now() },
      },
      matches: [],
    })
  );
  const store = new LeaderboardStore(file);
  const stranger = await makeDevice();
  assert.equal(store.bindPublicKey('old-ranked', stranger.publicKey), false, 'the id is public; first come must not win');
  assert.equal(store.bindPublicKey('brand-new-1', stranger.publicKey), true, 'unranked ids can still be claimed');
});

test('store: device keys survive a restart for ranked players and never appear in profiles', async () => {
  const file = tempStoreFile();
  const store = new LeaderboardStore(file);
  const device = await makeDevice();
  store.getOrCreatePlayer('winner-01', 'Winner');
  store.getOrCreatePlayer('loser-001', 'Loser');
  store.bindPublicKey('winner-01', device.publicKey);
  store.recordPvpMatch({
    matchId: 'm1',
    mode: 'room',
    p1Id: 'winner-01',
    p2Id: 'loser-001',
    p1Cards: 32,
    p2Cards: 0,
    p1Quartets: 8,
    p2Quartets: 0,
    winnerId: 'winner-01',
    roundsPlayed: 20,
  });
  await store.flush();

  const reloaded = new LeaderboardStore(file);
  assert.equal(reloaded.getPublicKey('winner-01'), device.publicKey);
  assert.equal(JSON.stringify(reloaded.getLeaderboard()).includes(device.publicKey), false);
});
