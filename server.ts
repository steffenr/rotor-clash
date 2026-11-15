import 'dotenv/config';
import express from 'express';
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

const RAW_PORT = process.env.PORT || '3000';
const IS_PROD = process.env.NODE_ENV === 'production';

async function bootstrap() {
  const app = express();
  app.use(express.json());

  // REST API endpoints
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
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
    const profile = leaderboardStore.getPlayer(req.params.id);
    if (!profile) {
      res.status(404).json({ error: 'Player not found' });
      return;
    }
    res.json({ profile });
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  // Track sockets by playerId
  const playerSockets = new Map<string, Set<WebSocket>>();
  const socketToPlayer = new Map<WebSocket, string>();

  const sendJson = (ws: WebSocket, event: string, payload: unknown) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ event, payload }));
    }
  };

  const emitToPlayer = (playerId: string, event: string, payload: unknown) => {
    const sockets = playerSockets.get(playerId);
    if (!sockets) return;
    for (const sock of sockets) {
      sendJson(sock, event, payload);
    }
  };

  const broadcastAll = (event: string, payload: unknown) => {
    for (const sock of wss.clients) {
      sendJson(sock, event, payload);
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

  const broadcastLobby = () => {
    broadcastAll('lobby:state', engine.getLobbySnapshot(playerSockets.size));
  };

  wss.on('connection', (ws) => {
    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as { event?: string; payload?: Record<string, unknown> };
        const event = msg.event;
        const payload = msg.payload ?? {};

        if (event === 'auth:hello') {
          const playerId = String(payload.playerId || '').trim();
          const callsign = payload.callsign ? String(payload.callsign) : undefined;
          if (!playerId || playerId.length < 4) return;

          const prevId = socketToPlayer.get(ws);
          if (prevId && prevId !== playerId) {
            playerSockets.get(prevId)?.delete(ws);
          }

          socketToPlayer.set(ws, playerId);
          if (!playerSockets.has(playerId)) {
            playerSockets.set(playerId, new Set());
          }
          playerSockets.get(playerId)!.add(ws);

          const profile = leaderboardStore.getOrCreatePlayer(playerId, callsign);
          sendJson(ws, 'auth:ack', { profile });
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
          return;
        }

        const playerId = socketToPlayer.get(ws);
        if (!playerId) return;

        switch (event) {
          case 'profile:rename': {
            const callsign = String(payload.callsign || '');
            const profile = leaderboardStore.updateCallsign(playerId, callsign);
            emitToPlayer(playerId, 'auth:ack', { profile });
            broadcastLobby();
            broadcastAll('leaderboard:updated', {
              leaderboard: leaderboardStore.getLeaderboard(),
              recentMatches: leaderboardStore.getRecentMatches(),
            });
            break;
          }
          case 'queue:join': {
            const res = engine.joinQueue(playerId);
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
            const res = engine.createRoom(playerId);
            if (!res.ok) {
              sendJson(ws, 'error:toast', { message: res.error });
            } else {
              sendJson(ws, 'room:created', { room: res.room });
            }
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
            const roomCode = String(payload.roomCode || '');
            const res = engine.joinRoom(playerId, roomCode);
            if (!res.ok) {
              sendJson(ws, 'error:toast', { message: res.error });
            }
            broadcastLobby();
            break;
          }
          case 'match:play_stat': {
            const matchId = String(payload.matchId || '');
            const statKey = String(payload.statKey || '') as StatKey;
            const res = engine.playStat(playerId, matchId, statKey);
            if (!res.ok && res.error) {
              sendJson(ws, 'error:toast', { message: res.error });
            }
            break;
          }
          case 'match:next_round': {
            const matchId = String(payload.matchId || '');
            engine.requestNextRound(playerId, matchId);
            break;
          }
          case 'match:forfeit': {
            const matchId = String(payload.matchId || '');
            engine.forfeitMatch(playerId, matchId);
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
      const playerId = socketToPlayer.get(ws);
      socketToPlayer.delete(ws);
      if (!playerId) return;
      const set = playerSockets.get(playerId);
      if (set) {
        set.delete(ws);
        if (set.size === 0) {
          playerSockets.delete(playerId);
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
    app.use(express.static(distDir));
    app.use((req, res, next) => {
      if (req.method !== 'GET') return next();
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  if (/^\d+$/.test(RAW_PORT)) {
    const portNum = Number(RAW_PORT);
    server.listen(portNum, '0.0.0.0', () => {
      console.log(`Rotor Clash server listening on http://0.0.0.0:${portNum}`);
    });
  } else {
    // Phusion Passenger (e.g. netcup Plesk) passes a Unix socket/pipe path in PORT
    server.listen(RAW_PORT, () => {
      console.log(`Rotor Clash server listening on socket ${RAW_PORT}`);
    });
  }
}

bootstrap();
