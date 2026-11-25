import 'dotenv/config';
import express from 'express';
import rateLimit from 'express-rate-limit';
import http from 'node:http';
import path from 'node:path';
import { WebSocket, WebSocketServer } from 'ws';
import { StatKey } from './src/shared/gameTypes.ts';
import {
  SERVER_QUARTET_GROUPS,
  SERVER_TURBINE_DECK,
} from './src/server/turbineRepository.ts';
import { MatchEngine } from './src/server/matchEngine.ts';
import { leaderboardStore } from './src/server/store.ts';
import { readAppVersion } from './src/server/version.ts';
import {
  ConnectionLimiter,
  KeyedRateLimiter,
  MAX_MESSAGE_BYTES,
  RateLimiter,
  clientIp,
  isAllowedOrigin,
  isValidPlayerId,
  isValidPublicKey,
  isValidSignature,
  newChallengeNonce,
  parseClientMessage,
  securityHeaders,
  verifyChallengeProof,
} from './src/server/security.ts';

const RAW_PORT = process.env.PORT || '3000';
const IS_PROD = process.env.NODE_ENV === 'production';
/**
 * Security headers (nosniff, framing, referrer, permissions, CSP) are normally set by the web server
 * configuration in front of the app (for example nginx), which also covers the static files
 * that never reach Node. Setting them here as well would send every header twice, so the app only does
 * it when SECURITY_HEADERS=app, for example when it is exposed directly without a configured proxy.
 */
const APP_SENDS_SECURITY_HEADERS = process.env.SECURITY_HEADERS === 'app';
/** Reported to clients, which reload themselves when their own bundle is older. */
const APP_VERSION = readAppVersion();

/** Sockets per client address (several players can share one school / home network) and overall. */
const MAX_SOCKETS_PER_IP = 30;
const MAX_SOCKETS_TOTAL = 2000;
/** Per socket: a burst of 30 messages, then 10 per second. Sustained abuse closes the socket. */
const MESSAGE_BURST = 30;
const MESSAGES_PER_SECOND = 10;
const MAX_DROPPED_MESSAGES = 100;
/** REST API: 60 requests per minute and address. */
const API_BURST = 60;
const API_REFILL_PER_SECOND = 1;
/** WebSocket handshakes per address: enough for a burst of page loads, not for a flood. */
const HANDSHAKE_BURST = 30;
const HANDSHAKE_REFILL_PER_SECOND = 5;
/** Room joins per socket: a player needs a handful, guessing a 6-character code needs billions. */
const ROOM_JOIN_BURST = 5;
const ROOM_JOIN_REFILL_PER_SECOND = 0.1;
/** Lobby and leaderboard broadcasts reach every client, so bursts are merged into one. */
const BROADCAST_DELAY_MS = 250;
const RENAME_COOLDOWN_MS = 2000;

const trimString = (value: unknown, max: number): string =>
  typeof value === 'string' ? value.slice(0, max) : '';

async function bootstrap() {
  const app = express();
  app.disable('x-powered-by');
  if (APP_SENDS_SECURITY_HEADERS) {
    app.use(securityHeaders(IS_PROD));
  } else {
    console.log('Security headers are expected from the web server configuration (SECURITY_HEADERS=app sends them from the app).');
  }

  // Small per-address limit on the REST API, with a bounded table so forged client addresses
  // cannot grow memory. Handshakes get their own bucket, checked before a socket is upgraded.
  const apiLimiter = new KeyedRateLimiter(API_BURST, API_REFILL_PER_SECOND);
  const handshakeLimiter = new KeyedRateLimiter(HANDSHAKE_BURST, HANDSHAKE_REFILL_PER_SECOND);
  const apiCleanup = setInterval(() => {
    apiLimiter.prune();
    handshakeLimiter.prune();
  }, 5 * 60 * 1000);
  apiCleanup.unref();

  app.use('/api', (req, res, next) => {
    if (!apiLimiter.take(clientIp(req))) {
      res.status(429).json({ error: 'Too many requests' });
      return;
    }
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  // REST API endpoints
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, version: APP_VERSION, timestamp: Date.now() });
  });

  app.get('/api/deck', (_req, res) => {
    res.json({ groups: SERVER_QUARTET_GROUPS, cards: SERVER_TURBINE_DECK });
  });

  app.get('/api/leaderboard', (_req, res) => {
    res.json({
      leaderboard: leaderboardStore.getLeaderboard(),
      recentMatches: leaderboardStore.getRecentMatches(),
    });
  });

  app.get('/api/player/:id', (req, res) => {
    const profile = isValidPlayerId(req.params.id) ? leaderboardStore.getPlayer(req.params.id) : null;
    if (!profile) {
      res.status(404).json({ error: 'Player not found' });
      return;
    }
    res.json({ profile });
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({
    server,
    path: '/ws',
    // Real messages are tiny; `ws` defaults to 100 MiB per message.
    maxPayload: MAX_MESSAGE_BYTES,
    // Browsers always send Origin: refuse handshakes started from other websites, and cap how fast
    // one address may open sockets at all.
    verifyClient: (info: { origin: string; req: http.IncomingMessage }) =>
      isAllowedOrigin(info.origin, info.req.headers.host) && handshakeLimiter.take(clientIp(info.req)),
  });
  const connectionLimiter = new ConnectionLimiter(MAX_SOCKETS_PER_IP, MAX_SOCKETS_TOTAL);

  // Track sockets by playerId
  const playerSockets = new Map<string, Set<WebSocket>>();
  const socketToPlayer = new Map<WebSocket, string>();
  const lastRenameAt = new Map<string, number>();

  /** One serialized frame is shared by all recipients; broadcasts carry the same payload everywhere. */
  const frameOf = (event: string, payload: unknown) => JSON.stringify({ event, payload });

  const sendJson = (ws: WebSocket, event: string, payload: unknown) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(frameOf(event, payload));
    }
  };

  const emitToPlayer = (playerId: string, event: string, payload: unknown) => {
    const sockets = playerSockets.get(playerId);
    if (!sockets) return;
    for (const sock of sockets) {
      sendJson(sock, event, payload);
    }
  };

  /**
   * Lobby and leaderboard broadcasts are player state, so sockets that never finished the login
   * handshake are skipped: they can neither use nor afford to receive them.
   */
  const broadcastAll = (event: string, payload: unknown) => {
    const frame = frameOf(event, payload);
    for (const sock of wss.clients) {
      if (sock.readyState === WebSocket.OPEN && socketToPlayer.has(sock)) {
        sock.send(frame);
      }
    }
  };

  const isPlayerConnected = (playerId: string) => {
    const sockets = playerSockets.get(playerId);
    if (!sockets) return false;
    for (const sock of sockets) {
      if (sock.readyState === WebSocket.OPEN) return true;
    }
    return false;
  };

  const engine = new MatchEngine(emitToPlayer, broadcastAll, isPlayerConnected);

  let lobbyTimer: NodeJS.Timeout | null = null;
  const broadcastLobby = () => {
    if (lobbyTimer) return;
    lobbyTimer = setTimeout(() => {
      lobbyTimer = null;
      broadcastAll('lobby:state', engine.getLobbySnapshot(playerSockets.size));
    }, BROADCAST_DELAY_MS);
    lobbyTimer.unref();
  };

  let leaderboardTimer: NodeJS.Timeout | null = null;
  const broadcastLeaderboard = () => {
    if (leaderboardTimer) return;
    leaderboardTimer = setTimeout(() => {
      leaderboardTimer = null;
      broadcastAll('leaderboard:updated', {
        leaderboard: leaderboardStore.getLeaderboard(),
        recentMatches: leaderboardStore.getRecentMatches(),
      });
    }, BROADCAST_DELAY_MS);
    leaderboardTimer.unref();
  };

  // `ws` reports protocol violations (for example a frame over maxPayload) as an 'error' event on the
  // socket and closes it. Without a listener that event would be thrown and stop the whole server.
  wss.on('error', (err) => console.error('WS server error:', err.message));

  /** Logins that got a challenge and wait for the signed proof. One per socket, gone after one attempt. */
  const pendingAuth = new WeakMap<
    WebSocket,
    { playerId: string; publicKey: string; nonce: string; callsign: string | undefined }
  >();

  /** The browser proved who it is: register the socket and send the first state. */
  function completeLogin(ws: WebSocket, playerId: string, callsign: string | undefined) {
    const authedAs = socketToPlayer.get(ws);
    if (authedAs && authedAs !== playerId) return; // one identity per connection

    socketToPlayer.set(ws, playerId);
    if (!playerSockets.has(playerId)) {
      playerSockets.set(playerId, new Set());
    }
    playerSockets.get(playerId)!.add(ws);

    const profile = leaderboardStore.getOrCreatePlayer(playerId, callsign);
    sendJson(ws, 'auth:ack', { profile, serverVersion: APP_VERSION });
    sendJson(ws, 'lobby:state', engine.getLobbySnapshot(playerSockets.size));
    sendJson(ws, 'leaderboard:updated', {
      leaderboard: leaderboardStore.getLeaderboard(),
      recentMatches: leaderboardStore.getRecentMatches(),
    });

    const activeRoom = engine.getWaitingRoomForPlayer(playerId);
    if (activeRoom) {
      sendJson(ws, 'room:created', { room: activeRoom });
    }

    engine.handlePlayerConnected(playerId);
    const currentMatch = engine.getMatchForPlayer(playerId);
    if (currentMatch) {
      sendJson(ws, 'match:state', currentMatch);
    }

    broadcastLobby();
  }

  wss.on('connection', (ws, req) => {
    ws.on('error', () => {
      /* the socket is closed by ws itself; nothing to clean up here */
    });

    const ip = clientIp(req);
    if (!connectionLimiter.tryAcquire(ip)) {
      ws.close(1013, 'Too many connections');
      return;
    }

    const limiter = new RateLimiter(MESSAGE_BURST, MESSAGES_PER_SECOND);
    const roomJoinLimiter = new RateLimiter(ROOM_JOIN_BURST, ROOM_JOIN_REFILL_PER_SECOND);
    let dropped = 0;

    ws.on('message', (raw, isBinary) => {
      if (isBinary) return;
      if (!limiter.take()) {
        dropped += 1;
        if (dropped >= MAX_DROPPED_MESSAGES) ws.close(1008, 'Rate limit exceeded');
        return;
      }

      try {
        const msg = parseClientMessage(raw.toString());
        if (!msg) return;
        const { event, payload } = msg;

        // The id is a public handle (it appears in rankings); the credential is a device key.
        // Login is challenge-response: hello -> challenge -> proof (a signature over the challenge).
        if (event === 'auth:hello') {
          const playerId = payload.playerId;
          const publicKey = payload.publicKey;
          if (!isValidPlayerId(playerId) || !isValidPublicKey(publicKey)) {
            sendJson(ws, 'auth:rejected', { reason: 'invalid' });
            return;
          }
          const authedAs = socketToPlayer.get(ws);
          if (authedAs && authedAs !== playerId) return; // one identity per connection

          const boundKey = leaderboardStore.getPublicKey(playerId);
          if (boundKey && boundKey !== publicKey) {
            sendJson(ws, 'auth:rejected', { reason: 'key' });
            return;
          }

          const nonce = newChallengeNonce();
          pendingAuth.set(ws, {
            playerId,
            publicKey,
            nonce,
            callsign: trimString(payload.callsign, 64) || undefined,
          });
          sendJson(ws, 'auth:challenge', { nonce });
          return;
        }

        if (event === 'auth:proof') {
          const pending = pendingAuth.get(ws);
          pendingAuth.delete(ws); // a challenge is good for one attempt
          if (!pending || !isValidSignature(payload.signature)) {
            sendJson(ws, 'auth:rejected', { reason: 'invalid' });
            return;
          }
          const { playerId, publicKey, nonce, callsign } = pending;
          if (!verifyChallengeProof(publicKey, playerId, nonce, payload.signature)) {
            sendJson(ws, 'auth:rejected', { reason: 'key' });
            return;
          }
          // The proof shows the browser holds the private key; the first key bound to an id wins.
          if (!leaderboardStore.bindPublicKey(playerId, publicKey)) {
            sendJson(ws, 'auth:rejected', { reason: 'key' });
            return;
          }
          completeLogin(ws, playerId, callsign);
          return;
        }

        const playerId = socketToPlayer.get(ws);
        if (!playerId) return;

        switch (event) {
          case 'profile:rename': {
            const now = Date.now();
            if (now - (lastRenameAt.get(playerId) ?? 0) < RENAME_COOLDOWN_MS) {
              sendJson(ws, 'error:toast', { message: 'Please wait a moment before renaming again.' });
              break;
            }
            lastRenameAt.set(playerId, now);
            const before = leaderboardStore.getPlayer(playerId)?.callsign;
            const profile = leaderboardStore.updateCallsign(playerId, trimString(payload.callsign, 64));
            emitToPlayer(playerId, 'auth:ack', { profile });
            if (profile.callsign !== before) {
              broadcastLobby();
              if (profile.gamesPlayed > 0) broadcastLeaderboard();
            }
            break;
          }
          case 'queue:join': {
            const res = engine.joinQueue(playerId, payload.deckMode);
            if (!res.ok) {
              sendJson(ws, 'error:toast', { message: res.error });
            } else {
              sendJson(ws, 'queue:joined', {});
            }
            broadcastLobby();
            break;
          }
          case 'queue:leave': {
            engine.removeFromQueue(playerId);
            sendJson(ws, 'queue:left', {});
            broadcastLobby();
            break;
          }
          case 'room:create': {
            const res = engine.createRoom(playerId, payload.deckMode);
            if (!res.ok) {
              sendJson(ws, 'error:toast', { message: res.error, code: res.code });
            } else {
              sendJson(ws, 'room:created', { room: res.room });
            }
            broadcastLobby();
            break;
          }
          case 'room:visibility': {
            if (typeof payload.listed !== 'boolean') break;
            const room = engine.setRoomListed(playerId, payload.listed);
            if (room) sendJson(ws, 'room:created', { room });
            broadcastLobby();
            break;
          }
          case 'room:cancel': {
            engine.cancelHostedRooms(playerId);
            sendJson(ws, 'room:cancelled', {});
            broadcastLobby();
            break;
          }
          case 'room:join': {
            // Guessing a room code is a numbers game; a human never needs this many attempts.
            if (!roomJoinLimiter.take()) {
              sendJson(ws, 'error:toast', {
                message: 'Too many join attempts. Please wait a moment and try again.',
                code: 'ROOM_JOIN_THROTTLED',
              });
              break;
            }
            const roomCode = trimString(payload.roomCode, 12);
            const res = engine.joinRoom(playerId, roomCode);
            if (!res.ok) {
              sendJson(ws, 'error:toast', { message: res.error });
            }
            broadcastLobby();
            break;
          }
          case 'match:play_stat': {
            const matchId = trimString(payload.matchId, 64);
            const statKey = trimString(payload.statKey, 32) as StatKey;
            const res = engine.playStat(playerId, matchId, statKey);
            if (!res.ok && res.error) {
              sendJson(ws, 'error:toast', { message: res.error });
            }
            break;
          }
          case 'match:next_round': {
            engine.requestNextRound(playerId, trimString(payload.matchId, 64));
            break;
          }
          case 'match:forfeit': {
            engine.forfeitMatch(playerId, trimString(payload.matchId, 64));
            break;
          }
          case 'match:dismiss': {
            engine.dismissFinishedMatch(playerId);
            sendJson(ws, 'match:cleared', {});
            break;
          }
        }
      } catch (err) {
        console.error('WS message error:', err);
      }
    });

    ws.on('close', () => {
      connectionLimiter.release(ip);
      const playerId = socketToPlayer.get(ws);
      socketToPlayer.delete(ws);
      if (!playerId) return;
      const set = playerSockets.get(playerId);
      if (set) {
        set.delete(ws);
        if (set.size === 0) {
          playerSockets.delete(playerId);
          lastRenameAt.delete(playerId);
          engine.handlePlayerDisconnected(playerId);
        }
      }
      broadcastLobby();
    });
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    // Per-address limit on static files and the SPA fallback (they touch the file system).
    const staticLimiter = rateLimit({
      windowMs: 60 * 1000,
      limit: 300,
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => clientIp(req),
      validate: { keyGeneratorIpFallback: false },
    });
    app.use(staticLimiter);
    app.use(express.static(distDir));
    app.use((req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') return next();
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  if (/^\d+$/.test(RAW_PORT)) {
    const portNum = Number(RAW_PORT);
    server.listen(portNum, '0.0.0.0', () => {
      console.log(`Rotor Clash server listening on http://0.0.0.0:${portNum}`);
    });
  } else {
    // A process manager (e.g. Phusion Passenger) may pass a Unix socket/pipe path in PORT
    server.listen(RAW_PORT, () => {
      console.log(`Rotor Clash server listening on socket ${RAW_PORT}`);
    });
  }

  // Writes are coalesced; make sure the last changes reach the disk when the process is stopped.
  const shutdown = () => {
    const force = setTimeout(() => process.exit(0), 3000);
    force.unref();
    void leaderboardStore.flush().finally(() => process.exit(0));
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

bootstrap();
