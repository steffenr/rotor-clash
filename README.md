# Rotor Clash

**Rotor Clash** is a real-time 2-player multiplayer and solo-bot wind turbine Quartet card game with an **Illustrated Field Guide** visual theme and full **English (`EN`) / German (`DE`)** localization.

Players battle across **32 real-world wind turbines** organized into **8 Quartet groups (`1A`–`8D`)**, comparing five engineering metrics each round—including *Start Wind / Cut-In Speed* where the **smallest** number wins.

---

## Features

- **3 Ways to Play**:
  - **Play vs Robot**: Offline-friendly solo duels against `Standard` or `Tactical` AI opponents.
  - **Play a Friend**: Create a 6-character private room code and share a direct invite link (`/?room=XXXXXX`).
  - **Online Match**: Real-time 2-player matchmaking queue over WebSockets (`/ws`) with ELO points and Explorer Rank tiers.
- **Quartet Collector Mechanics**:
  - Ties build a central **Tie Pile** (`Stich-Stapel`) scooped by the winner of the next decisive round.
  - Collecting all 4 turbines (`A–D`) in a group awards a Quartet badge tracked in the live collector grid.
- **Field Guide Card Album & Interactive Tutorial**:
  - Browse and filter all 32 turbines, compare turbine hub height & rotor span against a **45 m coastal lighthouse**, inspect full engineering sheets, and verify every stat via external source links.
  - 4-step interactive onboarding guide teaching card reading, lower-wins strategy, tie piles, and multiplayer modes.
- **Zero-Signup Browser Identity (`localStorage`)**:
  - Player ID, callsign, cached stats, sound mute preference, and selected language persist automatically in browser `localStorage` (`rotor_clash_*`).
  - Global online leaderboard and recent match history persist on the server in `data/leaderboard.json`.

---

## Tech Stack

- **Frontend**: [Alpine.js](https://alpinejs.dev/) (`^3.17`) + [Tailwind CSS 4.x](https://tailwindcss.com/) (`@tailwindcss/vite`) + TypeScript + Vite 8
- **Backend**: Node.js (v20/22) + Express + WebSockets (`ws`)
- **Bundling & Tooling**: `tsx`, `esbuild`, `tsc`, Node built-in test runner (`node:test`)

---

## Project Structure

```text
├── .github/workflows/
│   ├── ci.yml                  # Lint, test & build checks on PRs to develop and pushes to main/develop
│   └── release.yml             # Manual workflow_dispatch build & rsync/SSH deploy to netcup
├── server.ts                   # Express + WebSocket server (dev Vite middleware / prod dist/)
├── index.html                  # Alpine.js root mount & font imports
├── src/
│   ├── app/rotorClashStore.ts  # Alpine.js reactive store, WS client, timers, UI helpers
│   ├── templates/              # HTML template builders (header, lobby, arena, card, modal, icons)
│   ├── data/
│   │   ├── groups.md           # Language-neutral Quartet group definitions
│   │   ├── turbines/*.md       # 32 language-neutral technical Markdown cards
│   │   └── locales/{en,de}/    # Localized UI strings, group names, and turbine notes
│   ├── shared/                 # Pure isomorphic rules & parsers (no Vite-only imports)
│   ├── lib/                    # Browser utilities (localStorage identity, WebAudio FX, deck loader)
│   └── server/                 # Authoritative MatchEngine, Markdown repository, JSON store
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
| `npm run build:server` | Bundle `server.ts` into CommonJS `dist-server/server.cjs` for production/Plesk |
| `npm start` | Run `tsx server.ts` directly (set `NODE_ENV=production` to serve `dist/`) |

---

## Production & Deployment (netcup Webhosting 4000 / VPS)

Rotor Clash requires a persistent **Node.js** process with **WebSocket (`/ws`)** support and writable disk storage at `./data` (single instance, since active rooms and matches live in memory).

### CI/CD Branch & Release Flow
- **`main` / `develop` (`ci.yml`)**: Automatically runs `npm run lint`, `npm test`, `npm run build`, and `npm run build:server` on pushes to `main`/`develop` and pull requests into `develop`/`main`.
- **Manual Release (`release.yml`)**: Triggered manually in **GitHub → Actions → Release — Deploy to netcup → Run workflow**. It runs the full verification suite, syncs the compiled app via `rsync` over SSH (preserving `data/` and `tmp/`), installs production dependencies (`npm install --omit=dev`), and reloads Phusion Passenger (`touch tmp/restart.txt`).

### Required GitHub Secrets / Variables
- `SSH_PRIVATE_KEY` *(Repository Secret)* — unencrypted deploy private key matching `~/.ssh/authorized_keys`
- `SSH_HOST`, `SSH_USER`, `DEPLOY_PATH`, optional `SSH_PORT` *(default `22`)*

### netcup Plesk Configuration
1. **Apache & nginx Settings**: Uncheck **Proxy mode** so Nginx forwards `/ws` WebSocket upgrades directly to Phusion Passenger.
2. **Node.js**:
   - **Application Root**: `<DEPLOY_PATH>`
   - **Document Root**: `<DEPLOY_PATH>/dist`
   - **Application Startup File**: `dist-server/server.cjs`
   - **Application Mode / Env**: `production` (`NODE_ENV=production`)
   - **Tip**: Configure a Plesk scheduled task to ping `/api/health` every ~5 minutes if Passenger idles out inactive workers.
