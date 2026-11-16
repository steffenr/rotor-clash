# Rotor Clash

**Rotor Clash** is a real-time 2-player multiplayer and solo-bot wind turbine Quartet card game with an **Illustrated Field Guide** visual theme and full **English (`EN`) / German (`DE`)** localization.

> **Images:** real photographs come from Wikimedia Commons under free licences (credits in [`docs/PHOTO_CREDITS.md`](docs/PHOTO_CREDITS.md)). The concept images shown on cards without a free photo are **AI-generated**.

Players battle across **64 real-world wind turbines** in two decks of **8 Quartet groups** each — *Modern Giants* (`1A`–`8D`) and *Records & Firsts* (`9A`–`16D`) — comparing five engineering metrics each round. In *Modern Giants* the **smallest** *Start Wind* wins; in *Records & Firsts* the **oldest** machine wins on *First Power* year.

---

## Features

- **3 Ways to Play**:
  - **Play vs Robot**: Offline-friendly solo duels against `Standard` or `Tactical` AI opponents.
  - **Play a Friend**: Create a 6-character room code and share a direct invite link (`/?room=XXXXXX`). Rooms are private by default; the host can tick *Show in open rooms* to list one in the lobby.
  - **Online Match**: Real-time 2-player matchmaking queue over WebSockets (`/ws`) with ELO points and Explorer Rank tiers.
- **Four deck modes** (choose in the lobby for robot games, friend rooms and online matches):
  - **Modern Giants** and **Records & Firsts**: 32 cards, 8 quartets each.
  - **Mixed Deck**: 8 random whole quartets drawn from both decks.
  - **Grand Tour**: all 64 cards, 16 quartets and up to 48 rounds.
- **Quartet Collector Mechanics**:
  - Ties build a central **Tie Pile** (`Stich-Stapel`) scooped by the winner of the next decisive round.
  - Collecting all 4 turbines (`A–D`) in a group awards a Quartet badge tracked in the live collector grid.
- **Field Guide Card Album & Split-Dossier Detail Modal**:
  - Browse and filter all 64 turbines (deck tabs), compare hub height & rotor span against a **45 m coastal lighthouse**, and open the **Two-Column Split Field-Guide Dossier** modal.
  - Features 100% uncropped full-length turbine photography (`object-contain`) from blade tip to foundation, technical specs, provenance tags, and seamless deck flip browsing (<kbd>←</kbd> / <kbd>→</kbd> arrow keys or Prev/Next buttons).
  - 4-step interactive onboarding guide teaching card reading (with a switch between a *Modern Giants* card and a *Records & Firsts* card, so both fifth stats are shown), lower-wins strategy, tie piles, and multiplayer modes.
- **Zero-Signup Browser Identity (`localStorage`)**:
  - Player ID, a private login secret, callsign, cached stats, sound mute preference, and selected language persist automatically in browser `localStorage` (`rotor_clash_*`). The player ID is a public handle; the secret proves that the browser owns it (see [Security](#security)).
- **Photo credits**: every real photograph comes from Wikimedia Commons under a free licence; the author and licence are shown in the card detail and listed in [`docs/PHOTO_CREDITS.md`](docs/PHOTO_CREDITS.md). Cards without a free photo show an AI-generated concept image, labelled as such.
- **Leaderboard**: ranked players, hashed login secrets and the recent match history persist on the server in `data/leaderboard.json` (players without a finished game are not written to disk).

---

## Tech Stack

- **Frontend**: [Alpine.js](https://alpinejs.dev/) (`v3.17.5`) + [Tailwind CSS 4.x](https://tailwindcss.com/) (`v4.3.5` via `@tailwindcss/vite`) + TypeScript (`v7.0.2`) + Vite (`v8.3.8`)
- **Backend**: Node.js (`>=26.0.0`, pinned via `.nvmrc`) + Express (`v5.3.0`) + WebSockets (`ws v8.23.0`)
- **Bundling & Tooling**: `tsx` (`v4.23.15`), `esbuild` (`v0.28.2`), `tsc`, Node built-in test runner (`node:test` via `tsx --test`)

---

## Project Structure

```text
├── .github/workflows/
│   ├── ci.yml                  # Lint, test & build checks on PRs to develop and pushes to main/develop
│   └── release.yml             # Manual workflow_dispatch build & SCP/tar deploy to the target host
├── server.ts                   # Express + WebSocket server (dev Vite middleware / prod dist/)
├── index.html                  # Alpine.js root mount & font imports
├── public/                     # Static files copied as-is (manifest, icons, theme-init.js)
├── src/
│   ├── app/rotorClashStore.ts  # Alpine.js reactive store, WS client, timers, UI helpers
│   ├── templates/              # HTML template builders (header, lobby, arena, card, modal, icons)
│   ├── data/
│   │   ├── groups.md           # Language-neutral Quartet group definitions
│   │   ├── turbines/*.md       # 32 language-neutral technical Markdown cards
│   │   └── locales/{en,de}/    # Localized UI strings, group names, and turbine notes
│   ├── shared/                 # Pure isomorphic rules & parsers (no Vite-only imports)
│   ├── lib/                    # Browser utilities (localStorage identity, WebAudio FX, deck loader)
│   └── server/                 # Authoritative MatchEngine, Markdown repository, JSON store, security helpers
└── tests/                      # Automated unit & integration tests (node:test via tsx)
```

---

## Local Development

```bash
# Install dependencies
npm install

# Start Express + Vite + WebSocket dev server on http://localhost:3000
npm run dev
```

### Useful Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run dev server with Vite middleware & WebSockets on port `3000` |
| `npm run lint` | Run TypeScript typechecking (`tsc --noEmit`) |
| `npm test` | Run all unit & integration tests (`tsx --test tests/*.test.ts`) |
| `npm run build` | Build production frontend assets into `dist/` |
| `npm run build:server` | Bundle `server.ts` into CommonJS `dist-server/server.cjs` for production/hosting panel |
| `npm start` | Run `tsx server.ts` directly (set `NODE_ENV=production` to serve `dist/`) |

---

## Configuration

Environment variables (a local `.env` file is read through `dotenv`; see `.env.example`):

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | TCP port, or a Unix socket path (Phusion Passenger passes one) |
| `NODE_ENV` | — | `production` serves the built `dist/` instead of the Vite dev server |
| `TRUST_PROXY` | trusted | Set to `0` when the app is exposed directly: the client-supplied `X-Forwarded-For` header is then ignored for per-address limits. Behind nginx/Passenger leave it unset. |
| `ALLOWED_ORIGINS` | — | Comma-separated extra origins that may open the WebSocket (the app's own origin is always allowed) |
| `SECURITY_HEADERS` | off | Set to `app` to let the app send the security headers itself (for example when it runs without a configured web server). Leave it unset when the web server already sets them, otherwise every header is sent twice. |

## Security

- **Identity**: a player ID is only a public handle (it appears in rankings and match data). Logging in needs a per-browser **secret** that the server stores only as a SHA-256 hash; the first secret presented for an ID is bound to it, and any other secret is refused. A browser whose pair is refused starts again with a fresh ID.
- **Server-side validation**: every WebSocket message is parsed strictly, IDs and strings are bounded, and every game move is checked against the match (for example only the stats of the chosen deck can be played).
- **Limits**: 4 KB per WebSocket message, a burst of 30 messages then 10 per second per socket, 30 sockets per address (2,000 overall), 60 API requests per minute and address, a rename cooldown, merged lobby/leaderboard broadcasts, debounced disk writes and a cap on profiles without a finished game. WebSocket handshakes from other websites are refused.
- **Rooms**: friend rooms are private (code or invite link) unless the host ticks *Show in open rooms*. Room codes, shuffles and the starting player use `crypto` randomness.
- **Data**: `data/leaderboard.json` holds ranked players, their hashed login secrets and recent matches. Keep it outside the web root (the Document Root is `dist/`) and out of backups you share.
- **Supply chain**: production dependencies are installed from the lockfile and audited in CI, GitHub Actions are pinned by commit SHA, and deployments verify the pinned SSH host key.
- Contributor rules live in [`AGENTS.md`](AGENTS.md) (section 2, item 8). Please report vulnerabilities privately to the repository owner rather than in a public issue.
