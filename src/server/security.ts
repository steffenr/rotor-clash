/**
 * Server-side security helpers: input validation, login proofs, rate limiting, connection limits and
 * HTTP security headers. Pure Node (no Express types at runtime) so tests can import it directly.
 */
import crypto from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import type { NextFunction, Request, RequestHandler, Response } from 'express';

// ---------------------------------------------------------------------------------------------
// Player identity
// ---------------------------------------------------------------------------------------------

/** Letters, digits, `_` and `-`: covers UUIDs and the legacy `p_xxxx` ids, nothing exotic. */
export const PLAYER_ID_PATTERN = /^[A-Za-z0-9_-]{4,64}$/;

/** Keys that must never be used as object keys (prototype pollution). */
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function isForbiddenKey(key: string): boolean {
  return FORBIDDEN_KEYS.has(key);
}

export function isValidPlayerId(value: unknown): value is string {
  return typeof value === 'string' && PLAYER_ID_PATTERN.test(value) && !isForbiddenKey(value);
}

// ---------------------------------------------------------------------------------------------
// Device keys (challenge-response login)
// ---------------------------------------------------------------------------------------------

/** Raw uncompressed P-256 public key (0x04 || X || Y, 65 bytes) as base64url: 87 characters. */
export const PUBLIC_KEY_PATTERN = /^[A-Za-z0-9_-]{87}$/;
/** ECDSA P-256 signature as raw r || s (64 bytes) as base64url: 86 characters. */
export const SIGNATURE_PATTERN = /^[A-Za-z0-9_-]{86}$/;

export function isValidPublicKey(value: unknown): value is string {
  if (typeof value !== 'string' || !PUBLIC_KEY_PATTERN.test(value)) return false;
  return Buffer.from(value, 'base64url')[0] === 0x04;
}

export function isValidSignature(value: unknown): value is string {
  return typeof value === 'string' && SIGNATURE_PATTERN.test(value);
}

/** Fresh single-use login challenge. */
export function newChallengeNonce(): string {
  return crypto.randomBytes(24).toString('base64url');
}

/** The exact text the browser signs. Binding the player id stops a proof being replayed for another id. */
export function challengeMessage(playerId: string, nonce: string): string {
  return `rotor-clash-auth:v1:${playerId}:${nonce}`;
}

/** Verifies the browser's signature over the challenge with its public key. Never throws. */
export function verifyChallengeProof(publicKey: string, playerId: string, nonce: string, signature: string): boolean {
  if (!isValidPublicKey(publicKey) || !isValidSignature(signature)) return false;
  try {
    const raw = Buffer.from(publicKey, 'base64url');
    const key = crypto.createPublicKey({
      key: {
        kty: 'EC',
        crv: 'P-256',
        x: raw.subarray(1, 33).toString('base64url'),
        y: raw.subarray(33, 65).toString('base64url'),
      },
      format: 'jwk',
    });
    return crypto.verify(
      'sha256',
      Buffer.from(challengeMessage(playerId, nonce)),
      { key, dsaEncoding: 'ieee-p1363' },
      Buffer.from(signature, 'base64url')
    );
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------------------------
// WebSocket messages
// ---------------------------------------------------------------------------------------------

/** Real messages are a few hundred bytes; anything bigger is dropped by `ws` before it is parsed. */
export const MAX_MESSAGE_BYTES = 4096;

export interface ClientMessage {
  event: string;
  payload: Record<string, unknown>;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Returns a well-formed message or `null`; never throws. */
export function parseClientMessage(raw: string): ClientMessage | null {
  if (raw.length > MAX_MESSAGE_BYTES) return null;
  let msg: unknown;
  try {
    msg = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isPlainObject(msg)) return null;
  const { event, payload } = msg;
  if (typeof event !== 'string' || event.length === 0 || event.length > 40) return null;
  if (payload !== undefined && payload !== null && !isPlainObject(payload)) return null;
  return { event, payload: isPlainObject(payload) ? payload : {} };
}

// ---------------------------------------------------------------------------------------------
// Rate limiting and connection limits
// ---------------------------------------------------------------------------------------------

/** Token bucket: `capacity` messages in a burst, refilled at `refillPerSecond`. */
export class RateLimiter {
  private tokens: number;
  private last: number;

  constructor(
    private readonly capacity: number,
    private readonly refillPerSecond: number,
    private readonly now: () => number = Date.now
  ) {
    this.tokens = capacity;
    this.last = this.now();
  }

  /** `true` when the action is allowed. */
  public take(): boolean {
    const t = this.now();
    this.tokens = Math.min(this.capacity, this.tokens + ((t - this.last) / 1000) * this.refillPerSecond);
    this.last = t;
    if (this.tokens < 1) return false;
    this.tokens -= 1;
    return true;
  }
}

/** Counts open sockets per client address and in total. */
export class ConnectionLimiter {
  private readonly perIp = new Map<string, number>();
  private total = 0;

  constructor(
    private readonly maxPerIp: number,
    private readonly maxTotal: number
  ) {}

  public tryAcquire(ip: string): boolean {
    if (this.total >= this.maxTotal) return false;
    const current = this.perIp.get(ip) ?? 0;
    if (current >= this.maxPerIp) return false;
    this.perIp.set(ip, current + 1);
    this.total += 1;
    return true;
  }

  public release(ip: string) {
    const current = this.perIp.get(ip) ?? 0;
    if (current <= 1) this.perIp.delete(ip);
    else this.perIp.set(ip, current - 1);
    this.total = Math.max(0, this.total - 1);
  }
}

/**
 * Token buckets keyed by a client-controlled string (an address), with a hard bound on the table.
 * Without the bound, rotating the key (for example one forged `X-Forwarded-For` value per request)
 * would grow this map for as long as the attacker keeps sending.
 */
export class KeyedRateLimiter {
  private readonly buckets = new Map<string, { limiter: RateLimiter; lastSeen: number }>();

  constructor(
    private readonly capacity: number,
    private readonly refillPerSecond: number,
    private readonly maxKeys = 10_000,
    private readonly ttlMs = 10 * 60_000,
    private readonly now: () => number = Date.now
  ) {}

  /** `true` when the action is allowed for this key. */
  public take(key: string): boolean {
    const at = this.now();
    let bucket = this.buckets.get(key);
    if (!bucket) {
      if (this.buckets.size >= this.maxKeys) this.evictOldest();
      bucket = { limiter: new RateLimiter(this.capacity, this.refillPerSecond, this.now), lastSeen: at };
      this.buckets.set(key, bucket);
    }
    bucket.lastSeen = at;
    return bucket.limiter.take();
  }

  /** Drops buckets that have been idle for longer than the TTL. Returns how many were removed. */
  public prune(): number {
    const cutoff = this.now() - this.ttlMs;
    let removed = 0;
    for (const [key, bucket] of this.buckets) {
      if (bucket.lastSeen < cutoff) {
        this.buckets.delete(key);
        removed += 1;
      }
    }
    return removed;
  }

  public get size(): number {
    return this.buckets.size;
  }

  /** Oldest insertion first: a full table loses the key that has been around longest. */
  private evictOldest() {
    const oldest = this.buckets.keys().next().value;
    if (oldest !== undefined) this.buckets.delete(oldest);
  }
}

/** `TRUST_PROXY` overrides the automatic decision; unset means "decide from the peer address". */
function trustProxySetting(): boolean | null {
  const raw = (process.env.TRUST_PROXY ?? '').trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(raw)) return true;
  if (['0', 'false', 'no', 'off'].includes(raw)) return false;
  return null;
}

/** Peer addresses that can only be a reverse proxy on the same host. */
const LOCAL_PEER_ADDRESSES = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

/**
 * Whether `X-Forwarded-For` may be believed for this request. The header is client-controlled when the
 * app is exposed directly, so it is only trusted when the TCP peer cannot be a remote client: loopback
 * or no peer address at all (a unix socket, as process managers such as Phusion Passenger pass one).
 * A proxy on another host must be declared with TRUST_PROXY=1; TRUST_PROXY=0 always ignores the header.
 */
export function trustForwardedHeader(req: IncomingMessage): boolean {
  const setting = trustProxySetting();
  if (setting !== null) return setting;
  const peer = req.socket?.remoteAddress;
  return peer === undefined || LOCAL_PEER_ADDRESSES.has(peer);
}

/**
 * Client address for limits. Behind a reverse proxy (for example nginx) the TCP peer is the
 * proxy, so the last `X-Forwarded-For` entry (the one the proxy appended) is used when trusted
 * (see `trustForwardedHeader()`); otherwise the socket address is the client address.
 */
export function clientIp(req: IncomingMessage, trustProxy = trustForwardedHeader(req)): string {
  if (trustProxy) {
    const forwarded = req.headers['x-forwarded-for'];
    const value = Array.isArray(forwarded) ? forwarded.join(',') : forwarded;
    if (value) {
      const last = value.split(',').pop()?.trim();
      if (last) return last.slice(0, 64);
    }
  }
  return req.socket?.remoteAddress ?? 'unknown';
}

/**
 * Browsers always send `Origin` on a WebSocket handshake. Accept the page's own origin (compared to
 * the `Host` header), anything listed in ALLOWED_ORIGINS, and non-browser clients without an Origin.
 */
export function isAllowedOrigin(
  origin: string | undefined,
  host: string | undefined,
  allowed: string[] = (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
): boolean {
  if (!origin) return true;
  if (allowed.includes(origin)) return true;
  try {
    return !!host && new URL(origin).host === host;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------------------------
// HTTP security headers
// ---------------------------------------------------------------------------------------------

const HOST_PATTERN = /^[A-Za-z0-9.-]+(:\d{1,5})?$/;

/**
 * Content-Security-Policy for the production build.
 * `'unsafe-eval'` is required by the standard Alpine.js build (it compiles x-* expressions with
 * `new Function`); the policy still blocks every external script, plugin, framing and form target.
 */
function cspDirectives(connectSrc: string): string[] {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "img-src 'self' data: blob:",
    `connect-src ${connectSrc}`,
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];
}

export function buildCsp(host: string | undefined): string {
  const ws = host && HOST_PATTERN.test(host) ? ` wss://${host} ws://${host}` : '';
  return cspDirectives(`'self'${ws}`).join('; ');
}

/**
 * The same policy for a `<meta http-equiv>` tag, injected into the built index.html. Static files are
 * often served by the web server (for example nginx) without ever reaching Node, so the document itself
 * must carry the policy. Browsers ignore `frame-ancestors` in a meta tag (that one needs a response
 * header), and the host is unknown at build time, so secure WebSockets are allowed by scheme.
 */
export function buildMetaCsp(): string {
  return cspDirectives("'self' wss:")
    .filter((directive) => !directive.startsWith('frame-ancestors'))
    .join('; ');
}

export function securityHeaders(isProd: boolean): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    // Production only, like the CSP: a browser ignores HSTS on plain HTTP, and the dev server is HTTP.
    if (isProd) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000');
      // The Vite dev server injects inline scripts and a HMR socket, so the CSP applies to production only.
      res.setHeader('Content-Security-Policy', buildCsp(req.headers.host));
    }
    next();
  };
}
