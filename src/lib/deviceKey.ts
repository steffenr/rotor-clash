/**
 * The browser's login credential: an ECDSA P-256 key pair created by WebCrypto as **non-extractable**
 * and kept in IndexedDB. Scripts (and anything that reads storage) can use the private key to sign but
 * can never read it out, so there is no secret to steal and nothing sensitive is stored as text.
 * The server only learns the public key (see `verifyChallengeProof()` in `src/server/security.ts`).
 */

const DB_NAME = 'rotor_clash_keys';
const STORE = 'keys';
const RECORD_ID = 'device_v1';
const ALGORITHM = { name: 'ECDSA', namedCurve: 'P-256' } as const;

let cached: Promise<CryptoKeyPair> | null = null;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readStored(): Promise<CryptoKeyPair | null> {
  const db = await openDb();
  try {
    return await new Promise<CryptoKeyPair | null>((resolve, reject) => {
      const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(RECORD_ID);
      request.onsuccess = () => resolve((request.result as CryptoKeyPair | undefined) ?? null);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

async function writeStored(pair: CryptoKeyPair | null): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      if (pair) store.put(pair, RECORD_ID);
      else store.delete(RECORD_ID);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

async function loadOrCreate(): Promise<CryptoKeyPair> {
  try {
    const stored = await readStored();
    if (stored?.privateKey && stored.publicKey) return stored;
  } catch {
    // IndexedDB unavailable (for example some private windows): fall through to a session-only key
  }
  const pair = await crypto.subtle.generateKey(ALGORITHM, false, ['sign', 'verify']);
  try {
    await writeStored(pair);
  } catch {
    // the key then lives for this page only
  }
  return pair;
}

function getKeyPair(): Promise<CryptoKeyPair> {
  cached ??= loadOrCreate();
  return cached;
}

function toBase64Url(bytes: ArrayBuffer): string {
  let binary = '';
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Public key as base64url of the raw uncompressed point (87 characters). Safe to send to the server. */
export async function getPublicKey(): Promise<string> {
  const { publicKey } = await getKeyPair();
  return toBase64Url(await crypto.subtle.exportKey('raw', publicKey));
}

/** Signs the server's login challenge. Must match `challengeMessage()` on the server. */
export async function signChallenge(playerId: string, nonce: string): Promise<string> {
  const { privateKey } = await getKeyPair();
  const message = new TextEncoder().encode(`rotor-clash-auth:v1:${playerId}:${nonce}`);
  return toBase64Url(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privateKey, message));
}

/** Forgets the key, so the next login creates a new one (used together with a new player id). */
export async function resetDeviceKey(): Promise<void> {
  cached = null;
  try {
    await writeStored(null);
  } catch {
    // nothing stored or storage unavailable
  }
}
