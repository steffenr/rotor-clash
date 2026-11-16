# Rotor Clash

**Rotor Clash** is a real-time 2-player multiplayer and solo-bot wind turbine Quartet card game with an **Illustrated Field Guide** visual theme and full **English (`EN`) / German (`DE`)** localization.

> **Images:** real photographs come from Wikimedia Commons under free licences (credits in [`docs/PHOTO_CREDITS.md`](docs/PHOTO_CREDITS.md)). The concept images shown on cards without a free photo are **AI-generated**.

Players battle across **64 real-world wind turbines** in two decks of **8 Quartet groups** each — *Modern Giants* (`1A`–`8D`) and *Records & Firsts* (`9A`–`16D`) — comparing five engineering metrics each round. In *Modern Giants* the **smallest** *Start Wind* wins; in *Records & Firsts* the **oldest** machine wins on *First Power* year.

---

## Features

- **3 Ways to Play**:
  - **Play vs Robot**: Offline-friendly solo duels against `Standard` or `Tactical` AI opponents.
  - **Play a Friend**: Create a 6-character private room code and share a direct invite link (`/?room=XXXXXX`).
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
  - 4-step interactive onboarding guide teaching card reading, lower-wins strategy, tie piles, and multiplayer modes.
- **Zero-Signup Browser Identity (`localStorage`)**:
  - Player ID, callsign, cached stats, sound mute preference, and selected language persist automatically in browser `localStorage` (`rotor_clash_*`).
- **Photo credits**: every real photograph comes from Wikimedia Commons under a free licence; the author and licence are shown in the card detail and listed in [`docs/PHOTO_CREDITS.md`](docs/PHOTO_CREDITS.md). Cards without a free photo show an AI-generated concept image, labelled as such.
  - Global online leaderboard and recent match history persist on the server in `data/leaderboard.json`.

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
│   └── release.yml             # Manual workflow_dispatch build & SCP/tar deploy to netcup
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
- **Manual Release (`release.yml`)**: Triggered manually on `main` in **GitHub → Actions → Release — Deploy to netcup → Run workflow**. Choose the version bump (`patch`, `minor` or `major`) and optionally add a release note. The workflow bumps the version in `package.json`, runs the full verification suite, packages the compiled build into a compressed payload, securely transfers it via `scp` and unpacks it via `tar` over SSH (preserving `data/` and `tmp/`), ships the production `node_modules` in the archive (installed in CI, because the netcup SSH shell has no Node.js/npm), and reloads Phusion Passenger (`touch tmp/restart.txt`). Only after a successful deploy it commits `chore(release): vX.Y.Z` to `main`, pushes the tag `vX.Y.Z` and creates a GitHub Release with generated notes. If the build or deploy fails, no commit, tag or release is created. Pushing to `main` requires that `github-actions[bot]` may push there (allow it to bypass branch protection if enabled).

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

## Security

- A player id is only a public handle; logging in needs a per-browser secret that the server stores hashed (first use binds it to the id).
- The server validates every WebSocket message and game move, limits message size and rate, and caps connections per address.
- Friend rooms are private (code or link) unless the host chooses *Show in open rooms*.
- Production responses carry a Content-Security-Policy and the usual hardening headers; dependencies are installed from the lockfile and audited in CI.
- Contributor rules live in `AGENTS.md` (section 2, item 8). Please report vulnerabilities privately to the repository owner rather than in a public issue.

### Plesk / nginx: headers for static files

On Plesk, nginx serves `index.html` and the other static files itself, so Node never sees those requests. The built `index.html` carries the Content-Security-Policy as a `<meta>` tag, but `frame-ancestors`, `X-Frame-Options` and `nosniff` only work as response headers. Add them once under *Domains → rotor-clash.port11.de → Apache & nginx Settings → Additional nginx directives*:

```nginx
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=()" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' wss://rotor-clash.port11.de; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'" always;
```

Check with `curl -sI https://rotor-clash.port11.de/`.
