import {
  ClientMatchState,
  getRankTier,
  ImageCategory,
  MatchRecord,
  OpenRoomSummary,
  PlayerProfile,
  QuartetGroup,
  RANK_TIERS,
  STAT_DEFINITIONS,
  StatDefinition,
  StatKey,
  TurbineCard,
} from '../shared/gameTypes';
import { compareStat } from '../shared/turbines';
import { lighthouseDiagram } from '../shared/lighthouse';
import { headerAction as sharedHeaderAction, type HeaderAction } from '../shared/headerAction';
import { CARD_BY_ID, GROUP_BY_ID, QUARTET_GROUPS, TURBINE_DECK } from '../lib/turbineDeck';
import { resolveCardPhoto } from '../lib/cardImages';
import { getPhotoCredit, type PhotoCredit } from '../shared/photoCredits';
import {
  getOrCreateIdentity,
  getSavedCallsign,
  loadCachedProfile,
  loadSavedLanguage,
  resetIdentity,
  saveCachedProfile,
  saveCallsignLocally,
  saveLanguage,
} from '../lib/playerIdentity';
import { getPublicKey, resetDeviceKey, signChallenge } from '../lib/deviceKey';
import {
  advanceBotRound,
  BotDifficulty,
  chooseBotStat,
  createLocalBotMatch,
  LocalBotMatch,
  resolveBotRound,
  serializeBotMatch,
} from '../lib/botEngine';
import { soundFx } from '../lib/soundFx';
import { launchConfetti } from '../lib/celebrate';
import {
  DECKS,
  DECK_MODES,
  DEFAULT_DECK_ID,
  deckIdOfCard,
  lastCardIdOfDeck,
  resolveDeckMode,
  statDefinitionsForDeck,
  statDefinitionsForMode,
  formatStatValue as sharedFormatStatValue,
  statStrengthPercent as sharedStatStrengthPercent,
  type DeckId,
  type DeckMode,
} from '../shared/decks';
import { loadSavedDeckMode, saveDeckMode } from '../lib/deckPreference';
import { Theme, applyTheme, loadSavedTheme, resolveInitialTheme, saveTheme } from '../lib/theme';
import { Language, TRANSLATIONS, Translations } from '../lib/i18n';

type NavTab = 'arena' | 'compendium' | 'leaderboard' | 'tutorial';

interface LobbyState {
  onlineCount: number;
  queueCount: number;
  openRooms: OpenRoomSummary[];
}

const CATEGORY_THEME: Record<
  ImageCategory,
  { border: string; stampBg: string; stampText: string; bar: string }
> = {
  offshore: { border: '#1E7898', stampBg: '#1E7898', stampText: '#FAF4E4', bar: '#1E7898' },
  onshore: { border: '#2F6F4E', stampBg: '#2F6F4E', stampText: '#FAF4E4', bar: '#2F6F4E' },
  floating: { border: 'var(--c-ink)', stampBg: 'var(--c-ink)', stampText: 'var(--c-paper)', bar: 'var(--c-ink)' },
  windbase: { border: '#F15A24', stampBg: '#F15A24', stampText: '#FFFDF7', bar: '#F15A24' },
};

const RELOADED_FOR_KEY = 'rotor_clash_reloaded_for';

/** Remembers (per browser tab session) that we already reloaded for this server version. `true` = first time. */
function markReloadedFor(version: string): boolean {
  try {
    if (sessionStorage.getItem(RELOADED_FOR_KEY) === version) return false;
    sessionStorage.setItem(RELOADED_FOR_KEY, version);
    return true;
  } catch {
    return false; // storage unavailable: show the banner instead of risking a reload loop
  }
}

/**
 * Server errors carry a code for the cases the UI knows how to phrase itself; everything else keeps
 * the server's message. Codes are only trusted for display, never for logic.
 */
function serverErrorMessage(payload: unknown, t: Translations): string {
  const { code, message } = (payload ?? {}) as { code?: unknown; message?: unknown };
  if (code === 'ROOM_LIMIT') return t.lobby.roomLimitReached;
  if (code === 'ROOM_JOIN_THROTTLED') return t.lobby.joinThrottled;
  return typeof message === 'string' ? message : '';
}

export function createRotorClashApp() {
  let identity = getOrCreateIdentity();
  /** The server may refuse a saved id/secret pair once; a fresh identity is created then (never in a loop). */
  let identityResets = 0;
  const initialLang = loadSavedLanguage();
  let ws: WebSocket | null = null;
  let disposed = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let countdownInterval: ReturnType<typeof setInterval> | null = null;
  let botTurnTimer: ReturnType<typeof setTimeout> | null = null;
  let toastTimer: ReturnType<typeof setTimeout> | null = null;
  let visibilityHandler: (() => void) | null = null;
  let backoffMs = 800;
  let pendingRoomInvite: string | null =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('room')
      : null;

  return {
    // Core Reactive State
    playerId: identity.playerId,
    lang: initialLang as Language,
    t: TRANSLATIONS[initialLang] as Translations,
    activeTab: 'arena' as NavTab,
    profile: loadCachedProfile(identity.playerId, identity.callsign) as PlayerProfile,
    callsignDraft: identity.callsign,
    callsignSaved: false,
    muted: soundFx.isMuted(),
    theme: resolveInitialTheme() as Theme,
    inspectedCard: null as TurbineCard | null,
    showImprint: false,
    appVersion: __APP_VERSION__,

    // Lobby & WS
    wsConnected: false,
    lobby: { onlineCount: 0, queueCount: 0, openRooms: [] } as LobbyState,
    inQueue: false,
    hostedRoom: null as OpenRoomSummary | null,
    joinCodeInput: '',
    copiedCode: false,
    toastError: null as string | null,
    /** The server runs a newer version than this page: a reload fetches the new bundle. */
    updateAvailable: false,

    // Leaderboard
    leaderboard: [] as PlayerProfile[],
    recentMatches: [] as MatchRecord[],

    // Match State
    pvpMatch: null as ClientMatchState | null,
    botMatch: null as LocalBotMatch | null,
    activeMatch: null as ClientMatchState | null,
    botDifficulty: 'tactical' as BotDifficulty,
    previewCardId: '2C',
    secondsLeft: null as number | null,
    showQuitDialog: false,
    showMatrixDrawer: false,
    rememberedTopCardId: null as string | null,

    // Compendium & Tutorial State
    compendiumGroup: 'all' as number | 'all',
    compendiumDeck: 'modern' as DeckId,
    deckMode: resolveDeckMode(loadSavedDeckMode(), TURBINE_DECK) as DeckMode,
    deckModes: DECK_MODES.filter((m) => resolveDeckMode(m, TURBINE_DECK) === m) as DeckMode[],
    compendiumSearch: '',
    tutorialStep: 0,
    tutorialInspectedStat: 'ratedPowerMw' as StatKey,
    /** Which deck's example card step 1 of the tutorial shows (Start Wind vs. Switched On). */
    tutorialDeck: 'modern' as 'modern' | 'records',
    tutorialPracticeStat: null as StatKey | null,

    // Static References
    quartetGroups: QUARTET_GROUPS,
    statDefinitions: STAT_DEFINITIONS,
    rankTiersReversed: RANK_TIERS.slice().reverse(),

    previewOptions() {
      return [
        { id: '2C', label: this.lang === 'de' ? 'Nordsee' : 'North Sea' },
        { id: '6A', label: 'Hornsea 2' },
        { id: '4B', label: 'Hywind' },
        { id: '5A', label: 'Gansu' },
      ];
    },

    init() {
      applyTheme(this.theme);
      // Follow the OS setting live until the player picks a theme explicitly.
      window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (loadSavedTheme()) return;
        this.theme = e.matches ? 'dark' : 'light';
        applyTheme(this.theme);
      });

      fetch('/api/leaderboard')
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.leaderboard) this.leaderboard = data.leaderboard;
          if (data?.recentMatches) this.recentMatches = data.recentMatches;
        })
        .catch(() => {});

      this.connectWebSocket();

      // A home-screen app can sit in the background for days and never reload by itself:
      // look for a newer version every time it comes back to the foreground.
      visibilityHandler = () => {
        if (!document.hidden) void this.checkForUpdate();
      };
      document.addEventListener('visibilitychange', visibilityHandler);
      window.addEventListener('online', visibilityHandler);

      countdownInterval = setInterval(() => {
        if (!this.activeMatch || !this.activeMatch.turnDeadlineAt || this.activeMatch.status !== 'PLAYING') {
          this.secondsLeft = null;
          return;
        }
        const next = Math.max(0, Math.ceil((this.activeMatch.turnDeadlineAt - Date.now()) / 1000));
        if (next !== this.secondsLeft && next > 0 && next <= 5 && this.isYourTurn()) soundFx.playTick();
        this.secondsLeft = next;
      }, 500);
    },

    destroy() {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (countdownInterval) clearInterval(countdownInterval);
      if (botTurnTimer) clearTimeout(botTurnTimer);
      if (toastTimer) clearTimeout(toastTimer);
      if (visibilityHandler) {
        document.removeEventListener('visibilitychange', visibilityHandler);
        window.removeEventListener('online', visibilityHandler);
      }
      ws?.close();
    },

    /** Asks the server for its version (never from the HTTP cache) and reacts if it differs from this bundle. */
    async checkForUpdate() {
      try {
        const res = await fetch('/api/health', { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as { version?: unknown };
        if (typeof data.version === 'string') this.handleServerVersion(data.version);
      } catch {
        // offline or server restarting: the next resume or reconnect checks again
      }
    },

    handleServerVersion(serverVersion: string) {
      if (serverVersion === 'unknown' || serverVersion === __APP_VERSION__) {
        this.updateAvailable = false;
        return;
      }
      this.updateAvailable = true;
      // Reload at once only when nothing is in progress, and at most once per server version,
      // so a stale cache can never cause a reload loop. Otherwise the banner offers the reload.
      const idle = !this.activeMatch && !this.inQueue && !this.hostedRoom;
      if (idle && markReloadedFor(serverVersion)) window.location.reload();
    },

    reloadForUpdate() {
      window.location.reload();
    },

    connectWebSocket() {
      if (disposed) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const socket = new WebSocket(`${protocol}//${window.location.host}/ws`);
      ws = socket;

      socket.onopen = () => {
        if (disposed) return;
        this.wsConnected = true;
        backoffMs = 800;
        // Login is challenge-response with the device key: hello (public key) -> challenge -> proof.
        void getPublicKey()
          .then((publicKey) => {
            if (socket.readyState !== WebSocket.OPEN) return;
            socket.send(
              JSON.stringify({
                event: 'auth:hello',
                payload: {
                  playerId: identity.playerId,
                  publicKey,
                  callsign: getSavedCallsign(identity.callsign),
                },
              })
            );
          })
          .catch(() => this.showToast(this.t.lobby.authFailed));
      };

      socket.onmessage = (evt) => {
        try {
          const msg = JSON.parse(evt.data) as { event: string; payload: any };
          switch (msg.event) {
            case 'auth:challenge':
              if (typeof msg.payload?.nonce === 'string') {
                const nonce = msg.payload.nonce;
                void signChallenge(identity.playerId, nonce)
                  .then((signature) => {
                    if (socket.readyState === WebSocket.OPEN) {
                      socket.send(JSON.stringify({ event: 'auth:proof', payload: { signature } }));
                    }
                  })
                  .catch(() => this.showToast(this.t.lobby.authFailed));
              }
              break;
            case 'auth:ack':
              if (typeof msg.payload?.serverVersion === 'string') {
                this.handleServerVersion(msg.payload.serverVersion);
              }
              if (msg.payload?.profile) {
                const srvProfile = msg.payload.profile as PlayerProfile;
                this.profile = srvProfile;
                this.callsignDraft = srvProfile.callsign;
                saveCachedProfile(srvProfile);
              }
              if (pendingRoomInvite) {
                const code = pendingRoomInvite.trim().toUpperCase();
                pendingRoomInvite = null;
                this.joinCodeInput = code;
                socket.send(JSON.stringify({ event: 'room:join', payload: { roomCode: code } }));
              }
              break;
            case 'auth:rejected':
              this.handleAuthRejected();
              break;
            case 'lobby:state':
              if (msg.payload) this.lobby = msg.payload;
              break;
            case 'leaderboard:updated':
              if (msg.payload?.leaderboard) {
                this.leaderboard = msg.payload.leaderboard;
                const me = (msg.payload.leaderboard as PlayerProfile[]).find(
                  (p) => p.id === identity.playerId
                );
                if (me) {
                  this.profile = me;
                  saveCachedProfile(me);
                }
              }
              if (msg.payload?.recentMatches) this.recentMatches = msg.payload.recentMatches;
              break;
            case 'queue:joined':
              this.inQueue = true;
              this.hostedRoom = null;
              break;
            case 'queue:left':
              this.inQueue = false;
              break;
            case 'room:created':
              if (msg.payload?.room) {
                this.hostedRoom = msg.payload.room;
                this.inQueue = false;
              }
              break;
            case 'room:cancelled':
              this.hostedRoom = null;
              break;
            case 'match:state':
              if (msg.payload) {
                const nextMatch = msg.payload as ClientMatchState;
                const prevRound = this.activeMatch?.lastRound?.roundNumber;
                const prevStatus = this.activeMatch?.status;
                this.pvpMatch = nextMatch;
                this.botMatch = null;
                this.inQueue = false;
                this.hostedRoom = null;
                this.activeTab = 'arena';
                this.syncActiveMatch(prevStatus, prevRound);
              }
              break;
            case 'match:cleared':
              this.pvpMatch = null;
              this.syncActiveMatch();
              break;
            case 'error:toast':
              if (msg.payload?.message || msg.payload?.code) {
                this.showToast(serverErrorMessage(msg.payload, this.t));
              }
              break;
          }
        } catch (err) {
          console.error('Failed to parse WS message:', err);
        }
      };

      socket.onclose = () => {
        if (disposed) return;
        this.wsConnected = false;
        ws = null;
        reconnectTimer = setTimeout(() => {
          backoffMs = Math.min(5000, backoffMs * 1.5);
          this.connectWebSocket();
        }, backoffMs);
      };
    },

    /** The server did not accept this browser's id/secret pair: continue with a fresh identity, once. */
    handleAuthRejected() {
      if (identityResets >= 1) {
        this.showToast(this.t.lobby.authFailed);
        return;
      }
      identityResets += 1;
      identity = resetIdentity();
      this.playerId = identity.playerId;
      this.profile = loadCachedProfile(identity.playerId, identity.callsign) as PlayerProfile;
      this.callsignDraft = identity.callsign;
      this.showToast(this.t.lobby.authReset);
      // a new id gets a new device key; then the reconnect logic logs in again
      void resetDeviceKey().finally(() => ws?.close());
    },

    setRoomListed(listed: boolean) {
      soundFx.playClick();
      this.sendWs('room:visibility', { listed });
    },

    sendWs(event: string, payload: Record<string, unknown> = {}) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ event, payload }));
        return true;
      }
      return false;
    },

    showToast(message: string) {
      this.toastError = message;
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => {
        this.toastError = null;
      }, 4500);
    },

    syncActiveMatch(prevStatus?: string, prevRound?: number) {
      this.activeMatch = this.pvpMatch ?? (this.botMatch ? serializeBotMatch(this.botMatch) : null);
      if (!this.activeMatch) {
        this.secondsLeft = null;
        this.showQuitDialog = false;
        return;
      }

      if (this.activeMatch.status === 'PLAYING' && this.activeMatch.you.topCard) {
        this.rememberedTopCardId = this.activeMatch.you.topCard.id;
      }

      // Sound effects on round reveal or match end
      if (
        this.activeMatch.status === 'ROUND_REVEAL' &&
        this.activeMatch.lastRound &&
        (prevStatus !== 'ROUND_REVEAL' || prevRound !== this.activeMatch.lastRound.roundNumber)
      ) {
        soundFx.playCardFlip();
        const lr = this.activeMatch.lastRound;
        if (lr.winnerId === null) soundFx.playTie();
        else if (lr.winnerId === this.activeMatch.you.id) soundFx.playWinRound();
        else soundFx.playLoseRound();

        if (
          (lr.newlyCompletedQuartetsP1.length > 0 || lr.newlyCompletedQuartetsP2.length > 0) &&
          lr.winnerId === this.activeMatch.you.id
        ) {
          setTimeout(() => soundFx.playQuartetChime(), 220);
        }
      } else if (this.activeMatch.status === 'FINISHED' && prevStatus !== 'FINISHED') {
        // Let the round-result sound finish before the game-result jingle starts.
        const finished = this.activeMatch;
        setTimeout(() => {
          if (finished.winReason === 'FORFEIT' || finished.winnerId === null) soundFx.playDraw();
          else if (finished.winnerId === finished.you.id) {
            soundFx.playVictory();
            launchConfetti();
          }
          else soundFx.playDefeat();
        }, 450);
      }

      // Phones: start every round (and the match) with the scoreboard + stats in view,
      // so the player never has to hunt for their card after the result sheet.
      if (this.activeMatch.status === 'PLAYING' && prevStatus !== 'PLAYING') {
        this.scrollArenaIntoView();
      }

      this.scheduleBotTurnIfNeeded();
    },

    scrollArenaIntoView() {
      if (!window.matchMedia?.('(max-width: 1023px)').matches) return;
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      setTimeout(() => {
        document.getElementById('arena-root')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      }, 60);
    },

    scheduleBotTurnIfNeeded() {
      if (botTurnTimer) {
        clearTimeout(botTurnTimer);
        botTurnTimer = null;
      }
      if (!this.botMatch || this.botMatch.status !== 'PLAYING') return;
      if (this.botMatch.turnPlayerId !== this.botMatch.botId) return;

      botTurnTimer = setTimeout(() => {
        if (!this.botMatch || this.botMatch.status !== 'PLAYING') return;
        if (this.botMatch.turnPlayerId !== this.botMatch.botId) return;
        const prevStatus = this.activeMatch?.status;
        const prevRound = this.activeMatch?.lastRound?.roundNumber;
        const stat = chooseBotStat(this.botMatch);
        this.botMatch = resolveBotRound(this.botMatch, stat, this.botMatch.botId);
        this.syncActiveMatch(prevStatus, prevRound);
      }, 850);
    },

    // Navigation & Utility Actions
    navItems() {
      return [
        { id: 'arena' as NavTab, label: this.t.nav.arena },
        { id: 'compendium' as NavTab, label: this.t.nav.compendium },
        { id: 'leaderboard' as NavTab, label: this.t.nav.leaderboard },
        { id: 'tutorial' as NavTab, label: this.t.nav.tutorial },
      ];
    },

    setTab(tab: NavTab) {
      soundFx.playClick();
      this.activeTab = tab;
    },

    setLang(nextLang: Language) {
      soundFx.playClick();
      this.lang = nextLang;
      this.t = TRANSLATIONS[nextLang];
      saveLanguage(nextLang);
    },

    /** Tap the trophy on the win screen to celebrate again. */
    celebrate() {
      soundFx.playQuartetChime();
      launchConfetti();
    },

    toggleTheme() {
      this.theme = this.theme === 'dark' ? 'light' : 'dark';
      applyTheme(this.theme);
      saveTheme(this.theme);
    },

    toggleMute() {
      const next = soundFx.toggleMute();
      this.muted = next;
      if (!next) soundFx.playClick();
    },

    /**
     * What the header's main button does right now:
     * - 'quit':      a game is running and the arena is on screen -> Quit Game (asks first)
     * - 'back':      a game is running and another page is open -> Back to Game
     * - 'searching': waiting in the matchmaking queue
     * - 'quick':     no game (a finished game's result counts as no game) -> Quick Match
     */
    headerAction(): HeaderAction {
      return sharedHeaderAction(this.activeMatch, this.activeTab, this.inQueue);
    },

    headerLabel(): string {
      switch (this.headerAction()) {
        case 'quit':
          return this.t.nav.quitGame;
        case 'back':
          return this.t.nav.resumeMatch;
        case 'searching':
          return this.t.nav.searching;
        default:
          return this.t.nav.quickMatch;
      }
    },

    handleHeaderAction() {
      const action = this.headerAction();
      if (action === 'quit') {
        soundFx.playClick();
        this.showQuitDialog = true;
        return;
      }
      if (action === 'back') {
        soundFx.playClick();
        this.activeTab = 'arena';
        return;
      }
      // A finished game's result is dismissed first, then the search starts.
      if (action === 'quick' && this.activeMatch) this.returnToLobby();
      this.handleHeaderQuickMatch();
    },

    confirmQuit() {
      this.showQuitDialog = false;
      this.forfeitMatch();
    },

    handleHeaderQuickMatch() {
      soundFx.playClick();
      this.activeTab = 'arena';
      if (!this.activeMatch && !this.inQueue) {
        this.joinQueue();
      }
    },

    saveCallsign() {
      const cleaned = this.callsignDraft.trim().slice(0, 20);
      if (!cleaned) return;
      soundFx.playClick();
      saveCallsignLocally(cleaned);
      this.profile = { ...this.profile, callsign: cleaned };
      saveCachedProfile(this.profile);
      this.sendWs('profile:rename', { callsign: cleaned });
      this.callsignSaved = true;
      setTimeout(() => {
        this.callsignSaved = false;
      }, 1800);
    },

    selectPreviewCard(id: string) {
      soundFx.playClick();
      this.previewCardId = id;
    },

    previewCard(): TurbineCard {
      return CARD_BY_ID[this.previewCardId] ?? CARD_BY_ID['2C'];
    },

    // Matchmaking & Rooms
    startBotMatch(diff?: BotDifficulty) {
      const chosenDiff = diff ?? this.botDifficulty;
      soundFx.playClick();
      if (this.inQueue) this.sendWs('queue:leave');
      if (this.hostedRoom) this.sendWs('room:cancel');
      this.pvpMatch = null;
      this.botMatch = createLocalBotMatch(
        identity.playerId,
        this.profile.callsign,
        this.profile.elo,
        chosenDiff,
        this.deckMode
      );
      this.activeTab = 'arena';
      this.syncActiveMatch();
    },

    joinQueue() {
      soundFx.playClick();
      if (!this.wsConnected) {
        this.showToast(
          this.lang === 'de'
            ? 'Verbindung zum Server wird hergestellt — bitte kurz warten.'
            : 'Connecting to multiplayer server — please retry in a moment.'
        );
        return;
      }
      this.sendWs('queue:join', { deckMode: this.deckMode });
    },

    setDeckMode(mode: DeckMode) {
      if (!this.deckModes.includes(mode)) return;
      soundFx.playClick();
      // Leave a waiting line so players never wait in a queue for a deck they no longer want.
      if (this.inQueue && mode !== this.deckMode) this.sendWs('queue:leave');
      this.deckMode = mode;
      saveDeckMode(mode);
    },

    leaveQueue() {
      soundFx.playClick();
      this.sendWs('queue:leave');
    },

    createRoom() {
      soundFx.playClick();
      if (!this.wsConnected) {
        this.showToast(
          this.lang === 'de'
            ? 'Verbindung zum Server wird hergestellt — bitte kurz warten.'
            : 'Connecting to multiplayer server — please retry in a moment.'
        );
        return;
      }
      this.sendWs('room:create', { deckMode: this.deckMode });
    },

    cancelRoom() {
      soundFx.playClick();
      this.sendWs('room:cancel');
    },

    joinRoom(code: string) {
      soundFx.playClick();
      const clean = code.trim().toUpperCase();
      if (!clean) {
        this.showToast(
          this.lang === 'de'
            ? 'Bitte einen 6-stelligen Raumcode eingeben.'
            : 'Enter a 6-character room code.'
        );
        return;
      }
      if (!this.wsConnected) {
        this.showToast(
          this.lang === 'de'
            ? 'Verbindung zum Server wird hergestellt — bitte kurz warten.'
            : 'Connecting to multiplayer server — please retry in a moment.'
        );
        return;
      }
      this.sendWs('room:join', { roomCode: clean });
    },

    copyInvite(roomCode: string) {
      if (!roomCode) return;
      const url = `${window.location.origin}/?room=${roomCode}`;
      navigator.clipboard?.writeText(url).catch(() => {});
      this.copiedCode = true;
      setTimeout(() => {
        this.copiedCode = false;
      }, 2000);
    },

    // Active Gameplay Actions
    selectStat(statKey: StatKey) {
      soundFx.playSelect();
      if (this.pvpMatch) {
        this.sendWs('match:play_stat', { matchId: this.pvpMatch.matchId, statKey });
      } else if (this.botMatch) {
        const prevStatus = this.activeMatch?.status;
        const prevRound = this.activeMatch?.lastRound?.roundNumber;
        this.botMatch = resolveBotRound(this.botMatch, statKey, this.botMatch.playerId);
        this.syncActiveMatch(prevStatus, prevRound);
      }
    },

    nextRound() {
      soundFx.playClick();
      if (this.pvpMatch) {
        this.sendWs('match:next_round', { matchId: this.pvpMatch.matchId });
      } else if (this.botMatch) {
        const prevStatus = this.activeMatch?.status;
        const prevRound = this.activeMatch?.lastRound?.roundNumber;
        this.botMatch = advanceBotRound(this.botMatch);
        this.syncActiveMatch(prevStatus, prevRound);
      }
    },

    forfeitMatch() {
      soundFx.playClick();
      if (this.pvpMatch) {
        this.sendWs('match:forfeit', { matchId: this.pvpMatch.matchId });
      } else if (this.botMatch) {
        this.botMatch = null;
        this.syncActiveMatch();
      }
    },

    playAgain() {
      soundFx.playClick();
      if (this.pvpMatch) {
        const wasRanked = this.pvpMatch.mode === 'ranked';
        this.sendWs('match:dismiss');
        this.pvpMatch = null;
        this.syncActiveMatch();
        if (wasRanked) this.sendWs('queue:join', { deckMode: this.deckMode });
      } else if (this.botMatch) {
        this.startBotMatch(this.botMatch.difficulty);
      }
    },

    returnToLobby() {
      soundFx.playClick();
      if (this.pvpMatch) {
        this.sendWs('match:dismiss');
        this.pvpMatch = null;
      }
      this.botMatch = null;
      this.syncActiveMatch();
    },

    toggleMatrixDrawer() {
      soundFx.playClick();
      this.showMatrixDrawer = !this.showMatrixDrawer;
    },

    // Arena Derived Helpers
    isYourTurn(): boolean {
      return Boolean(
        this.activeMatch &&
          this.activeMatch.status === 'PLAYING' &&
          this.activeMatch.turnPlayerId === this.activeMatch.you.id
      );
    },

    isReveal(): boolean {
      return Boolean(
        this.activeMatch &&
          this.activeMatch.status === 'ROUND_REVEAL' &&
          this.activeMatch.lastRound !== null
      );
    },

    resolvedReveal() {
      const m = this.activeMatch;
      if (!m || !m.lastRound) return null;
      const lr = m.lastRound;
      const youWereP1 =
        this.rememberedTopCardId === lr.p1Card.id ||
        (this.rememberedTopCardId !== lr.p2Card.id && m.mode === 'bot');
      return {
        yourCard: youWereP1 ? lr.p1Card : lr.p2Card,
        oppCard: youWereP1 ? lr.p2Card : lr.p1Card,
        yourVal: youWereP1 ? lr.p1Value : lr.p2Value,
        oppVal: youWereP1 ? lr.p2Value : lr.p1Value,
      };
    },

    arenaYourCard(): TurbineCard | null {
      if (!this.activeMatch) return null;
      if (this.isReveal()) return this.resolvedReveal()?.yourCard ?? this.activeMatch.you.topCard;
      return this.activeMatch.you.topCard;
    },

    arenaOppCard(): TurbineCard | null {
      if (!this.activeMatch || !this.isReveal()) return null;
      return this.resolvedReveal()?.oppCard ?? null;
    },

    arenaYourOutcome(): 'win' | 'loss' | 'tie' | null {
      if (!this.activeMatch || !this.isReveal() || !this.activeMatch.lastRound) return null;
      const w = this.activeMatch.lastRound.winnerId;
      if (w === null) return 'tie';
      return w === this.activeMatch.you.id ? 'win' : 'loss';
    },

    arenaOppOutcome(): 'win' | 'loss' | 'tie' | null {
      const yo = this.arenaYourOutcome();
      if (yo === 'win') return 'loss';
      if (yo === 'loss') return 'win';
      return yo;
    },

    arenaRevealValues() {
      const lr = this.activeMatch?.lastRound;
      const rev = this.resolvedReveal();
      if (!lr || !rev) return { yourValText: '', oppValText: '' };
      const unit = this.statDef(lr.chosenStat).unit;
      return {
        yourValText: `${rev.yourVal} ${unit}`.trim(),
        oppValText: `${rev.oppVal} ${unit}`.trim(),
      };
    },

    arenaOutcomeText(): string {
      const lr = this.activeMatch?.lastRound;
      if (!lr || !this.activeMatch) return '';
      const yo = this.arenaYourOutcome();
      const unit = this.lang === 'de' ? ' Karten' : '';
      if (yo === 'win') return `${this.t.arena.youWonCards} +${lr.cardsWonCount}${unit}!`;
      if (yo === 'loss') return `${this.activeMatch.opponent.callsign} ${this.t.arena.oppWonCards} +${lr.cardsWonCount}${unit}`;
      return `${this.t.arena.tiePotAdded} ${lr.tiePotSizeAfter}`;
    },

    arenaNewlyCompletedQuartetName(): string {
      const lr = this.activeMatch?.lastRound;
      if (!lr || !this.activeMatch || lr.winnerId !== this.activeMatch.you.id) return '';
      const gId = lr.newlyCompletedQuartetsP1[0] ?? lr.newlyCompletedQuartetsP2[0];
      if (!gId) return '';
      return this.groupName(gId);
    },

    ownedGroupCount(groupId: number): number {
      if (!this.activeMatch) return 0;
      const owned = this.activeMatch.you.ownedCardIds;
      return (['A', 'B', 'C', 'D'] as const).filter((slot) => owned.includes(`${groupId}${slot}`)).length;
    },

    finishedHeadline(): string {
      const m = this.activeMatch;
      if (!m) return '';
      if (m.winReason === 'FORFEIT') return this.t.arena.matchAbandoned;
      if (m.winnerId === null) return this.t.arena.matchDrawn;
      return m.winnerId === m.you.id ? this.t.arena.victorySecured : this.t.arena.matchDefeat;
    },

    finishedReason(): string {
      const m = this.activeMatch;
      if (!m) return '';
      if (m.winReason === 'ALL_CARDS') {
        return m.winnerId === m.you.id
          ? this.t.arena.reasonAllCardsWin
          : `${m.opponent.callsign} ${this.t.arena.reasonAllCardsLoss}`;
      }
      if (m.winReason === 'ROUND_LIMIT') return this.t.arena.reasonRoundLimit.replace('{rounds}', String(m.maxRounds));
      if (m.winReason === 'FORFEIT') {
        return m.abandonedBy === 'you'
          ? this.t.arena.reasonForfeitLoss
          : `${m.opponent.callsign} ${this.t.arena.reasonForfeitWin}`;
      }
      if (m.winReason === 'DRAW') return this.t.arena.reasonDraw.replace('{rounds}', String(m.maxRounds));
      return '';
    },

    // Compendium
    filteredDeck(): TurbineCard[] {
      const q = this.compendiumSearch.trim().toLowerCase();
      return TURBINE_DECK.filter((card) => {
        if (deckIdOfCard(card) !== this.compendiumDeck) return false;
        if (this.compendiumGroup !== 'all' && card.groupId !== this.compendiumGroup) return false;
        if (!q) return true;
        const loc = this.cardLocale(card);
        return (
          card.modelName.toLowerCase().includes(q) ||
          card.manufacturer.toLowerCase().includes(q) ||
          card.flagshipPlant.toLowerCase().includes(q) ||
          loc.country.toLowerCase().includes(q) ||
          card.id.toLowerCase().includes(q)
        );
      });
    },

    // Tutorial
    setTutorialStep(idx: number) {
      soundFx.playClick();
      this.tutorialStep = idx;
    },

    setTutorialInspectedStat(statKey: StatKey) {
      soundFx.playClick();
      this.tutorialInspectedStat = statKey;
    },

    /** Example card for step 1: a Modern Giants card or a Records & Firsts card (Gedser, 1957). */
    tutorialCardId(): string {
      return this.tutorialDeck === 'records' ? '9C' : '2A';
    },

    setTutorialDeck(deck: 'modern' | 'records') {
      if (deck === this.tutorialDeck) return;
      soundFx.playClick();
      this.tutorialDeck = deck;
      this.tutorialInspectedStat = 'ratedPowerMw';
    },

    playTutorialPracticeStat(statKey: StatKey) {
      this.tutorialPracticeStat = statKey;
      const res = this.tutorialPracticeResult();
      if (res === 1) soundFx.playWinRound();
      else if (res === 2) soundFx.playLoseRound();
      else soundFx.playTie();
    },

    resetTutorialPractice() {
      soundFx.playClick();
      this.tutorialPracticeStat = null;
    },

    tutorialPracticeResult(): 0 | 1 | 2 | null {
      if (!this.tutorialPracticeStat) return null;
      const c1 = CARD_BY_ID['3C'];
      const c2 = CARD_BY_ID['1B'];
      return compareStat(
        this.tutorialPracticeStat,
        c1.stats[this.tutorialPracticeStat],
        c2.stats[this.tutorialPracticeStat]
      );
    },

    tutorialYourOutcome(): 'win' | 'loss' | 'tie' | null {
      const r = this.tutorialPracticeResult();
      if (r === 1) return 'win';
      if (r === 2) return 'loss';
      if (r === 0) return 'tie';
      return null;
    },

    tutorialOppOutcome(): 'win' | 'loss' | 'tie' | null {
      const r = this.tutorialPracticeResult();
      if (r === 2) return 'win';
      if (r === 1) return 'loss';
      if (r === 0) return 'tie';
      return null;
    },

    // Modal
    inspectCard(card: TurbineCard) {
      soundFx.playClick();
      this.inspectedCard = card;
    },

    closeModal() {
      this.inspectedCard = null;
    },

    inspectNextCard() {
      if (!this.inspectedCard) return;
      soundFx.playCardFlip();
      const idx = TURBINE_DECK.findIndex((c) => c.id === this.inspectedCard?.id);
      const nextIdx = (idx + 1) % TURBINE_DECK.length;
      this.inspectedCard = TURBINE_DECK[nextIdx];
    },

    inspectPrevCard() {
      if (!this.inspectedCard) return;
      soundFx.playCardFlip();
      const idx = TURBINE_DECK.findIndex((c) => c.id === this.inspectedCard?.id);
      const prevIdx = (idx - 1 + TURBINE_DECK.length) % TURBINE_DECK.length;
      this.inspectedCard = TURBINE_DECK[prevIdx];
    },

    // Shared Card / Locale / Formatting Helpers
    localizeTierName(name: string): string {
      if (this.lang !== 'de') return name;
      switch (name) {
        case 'Rotor Clash Grandmaster':
          return 'Rotor-Großmeister';
        case 'Offshore Ace':
          return 'Offshore-Ass';
        case 'Turbine Lead':
          return 'Turbinenprofi';
        case 'Grid Engineer':
          return 'Netzingenieur';
        case 'Wind Cadet':
          return 'Windkadett';
        default:
          return name;
      }
    },

    allRankTiers() {
      return this.rankTiersReversed.map((tier) => ({
        ...tier,
        displayName: this.localizeTierName(tier.name),
      }));
    },

    playerTier() {
      const tier = getRankTier(this.profile.elo);
      return { ...tier, name: this.localizeTierName(tier.name) };
    },

    tierForElo(elo: number) {
      const tier = getRankTier(elo);
      return { ...tier, name: this.localizeTierName(tier.name) };
    },

    deploymentLabel(dep: TurbineCard['deploymentType']): string {
      if (this.lang !== 'de') return dep;
      switch (dep) {
        case 'Floating Offshore':
          return 'Schwimmend (Offshore)';
        case 'Offshore Prototype':
          return 'Offshore-Prototyp';
        case 'Offshore':
          return 'Offshore (Meer)';
        case 'Onshore':
          return 'Onshore (Land)';
      }
    },

    lighthouseTooltip(card: TurbineCard | null): string {
      if (!card) return '';
      if (this.lang === 'de') {
        return `Nabenhöhe ${card.stats.hubHeightM} m / Rotor ${card.stats.rotorDiameterM} m im Vergleich zum 45-m-Leuchtturm`;
      }
      return `Turbine Hub ${card.stats.hubHeightM}m / Rotor ${card.stats.rotorDiameterM}m vs 45m Lighthouse`;
    },

    cardById(id: string): TurbineCard {
      return CARD_BY_ID[id];
    },

    cardTitleById(id: string): string {
      const c = CARD_BY_ID[id];
      return c ? `${id}: ${c.modelName}` : id;
    },

    groupName(groupId: number): string {
      const g = GROUP_BY_ID[groupId];
      if (!g) return '';
      return (g.translations[this.lang] ?? g.translations.en).name;
    },

    cardLocale(card: TurbineCard | null) {
      if (!card) return { country: '', drivetrain: '', engineeringNote: '' };
      return card.translations[this.lang] ?? card.translations.en;
    },

    photoUrl(card: TurbineCard | null): string {
      return card ? resolveCardPhoto(card.photoKey) : '';
    },

    cardTheme(card: TurbineCard | null) {
      return CATEGORY_THEME[card?.imageCategory ?? 'offshore'];
    },

    /** Turbine and lighthouse share one scale (see shared/lighthouse.ts), so their heights are in true proportion. */
    cardDiagram(card: TurbineCard | null) {
      return lighthouseDiagram(card?.stats.hubHeightM ?? 100, card?.stats.rotorDiameterM ?? 100);
    },

    cardHubY(card: TurbineCard | null): number {
      return this.cardDiagram(card).hubY;
    },

    cardBladeLen(card: TurbineCard | null): number {
      return this.cardDiagram(card).bladeLen;
    },

    cardLighthouseScale(card: TurbineCard | null): number {
      return this.cardDiagram(card).lighthouseScale;
    },

    statDef(key: StatKey): StatDefinition {
      return STAT_DEFINITIONS.find((s) => s.key === key) ?? STAT_DEFINITIONS[0];
    },

    statStrengthPercent(key: StatKey, value: number): number {
      return sharedStatStrengthPercent(key, value);
    },

    isApproxStat(card: TurbineCard | null, key: StatKey): boolean {
      return !!card && card.approximateStats.includes(key);
    },

    photoCredit(card: TurbineCard | null): PhotoCredit | null {
      return card && card.isRealPhoto ? getPhotoCredit(card.photoKey) : null;
    },

    /** The five stats compared for this card's deck. */
    statDefsFor(card: TurbineCard | null, mode?: DeckMode | null): StatDefinition[] {
      // In a match every card is compared on the match's stat set; elsewhere a card shows its own deck's.
      if (mode) return statDefinitionsForMode(mode);
      return statDefinitionsForDeck(card ? deckIdOfCard(card) : DEFAULT_DECK_ID);
    },

    /** Quartet groups in play in the current match (8, or 16 in the Grand Tour). */
    matchGroups(): QuartetGroup[] {
      const ids = this.activeMatch?.quartetGroupIds;
      return ids && ids.length ? QUARTET_GROUPS.filter((g) => ids.includes(g.id)) : QUARTET_GROUPS;
    },

    matchQuartetTotal(): number {
      return this.activeMatch?.quartetGroupIds?.length || 8;
    },

    deckModeName(mode: DeckMode): string {
      return this.t.decks[mode].name;
    },

    lastCardId(card: TurbineCard | null): string {
      return card ? lastCardIdOfDeck(card) : '8D';
    },

    /** Groups shown as chips in the Card Album for the selected deck tab. */
    compendiumGroups(): QuartetGroup[] {
      const deck = DECKS.find((d) => d.id === this.compendiumDeck) ?? DECKS[0];
      return QUARTET_GROUPS.filter((g) => deck.groupIds.includes(g.id));
    },

    setCompendiumDeck(deckId: DeckId) {
      soundFx.playClick();
      this.compendiumDeck = deckId;
      this.compendiumGroup = 'all';
    },

    statRowClass(
      statKey: StatKey,
      selectable: boolean,
      selectedStat: StatKey | null,
      outcome: 'win' | 'loss' | 'tie' | null
    ): string {
      if (selectedStat === statKey) {
        if (outcome === 'win') return 'bg-c-mint border-c-green text-c-ink ring-2 ring-c-green/30';
        if (outcome === 'loss') return 'bg-c-rose border-c-red text-c-red-deep';
        if (outcome === 'tie') return 'bg-c-cream-amber border-c-amber text-c-amber-ink';
        return 'bg-c-sky border-c-teal text-c-ink ring-2 ring-c-teal/30';
      }
      if (selectable) {
        return 'bg-c-paper border-c-ink/30 hover:border-c-teal hover:bg-c-sky-soft hover:translate-x-0.5 text-c-ink shadow-[0_2px_0_rgba(23,50,64,0.18)] active:translate-y-0.5';
      }
      return 'bg-c-paper border-c-ink/20 text-c-ink';
    },

    formatStatValue(key: StatKey, val: number): string {
      return sharedFormatStatValue(key, val, this.lang);
    },

    formatNumber(val: number): string {
      return val.toLocaleString(this.lang === 'de' ? 'de-DE' : 'en-US');
    },

    formatRelativeTime(ts: number): string {
      const mins = Math.floor((Date.now() - ts) / 60000);
      if (mins < 1) return this.lang === 'de' ? 'Gerade eben' : 'Just now';
      if (mins < 60) return this.lang === 'de' ? `vor ${mins} Min.` : `${mins}m`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return this.lang === 'de' ? `vor ${hrs} Std.` : `${hrs}h`;
      const days = Math.floor(hrs / 24);
      return this.lang === 'de' ? `vor ${days} T.` : `${days}d`;
    },
  };
}
