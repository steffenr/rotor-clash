/**
 * Server-side security helpers: input validation, secrets, rate limiting, connection limits and
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

/** The client-held secret: 32 random bytes as lowercase hex. It never leaves the server again. */
export const SECRET_PATTERN = /^[a-f0-9]{64}$/;

export function isValidSecret(value: unknown): value is string {
  return typeof value === 'string' && SECRET_PATTERN.test(value);
}

export function hashSecret(secret: string): string {
  return crypto.createHash('sha256').update(secret).digest('hex');
}

/** Constant-time comparison of a presented secret against a stored hash. */
export function secretMatchesHash(secret: string, storedHash: string): boolean {
  const presented = Buffer.from(hashSecret(secret), 'hex');
  const stored = Buffer.from(storedHash, 'hex');
  return presented.length === stored.length && crypto.timingSafeEqual(presented, stored);
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
 * Client address for limits. Behind a reverse proxy (for example nginx) the TCP peer is the
 * proxy, so the last `X-Forwarded-For` entry (the one the proxy appended) is used when present.
 * Set TRUST_PROXY=0 to ignore the header when the app is exposed directly.
 */
export function clientIp(req: IncomingMessage, trustProxy = process.env.TRUST_PROXY !== '0'): string {
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
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
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
    // The Vite dev server injects inline scripts and a HMR socket, so the CSP applies to production only.
    if (isProd) res.setHeader('Content-Security-Policy', buildCsp(req.headers.host));
    next();
  };
}
