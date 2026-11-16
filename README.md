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
│   └── release.yml             # Manual workflow_dispatch build & SCP/tar deploy to netcup
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
| `npm run build:server` | Bundle `server.ts` into CommonJS `dist-server/server.cjs` for production/Plesk |
| `npm start` | Run `tsx server.ts` directly (set `NODE_ENV=production` to serve `dist/`) |

---

## Production & Deployment (netcup Webhosting 4000 / VPS)

Rotor Clash requires a persistent **Node.js** process with **WebSocket (`/ws`)** support and writable disk storage at `./data` (single instance, since active rooms and matches live in memory).

### CI/CD Branch & Release Flow
- **`main` / `develop` (`ci.yml`)**: Automatically runs `npm run lint`, `npm test`, `npm audit --omit=dev --audit-level=high` (fails on high-severity advisories in production dependencies), `npm run build`, and `npm run build:server` on pushes to `main`/`develop` and pull requests into `develop`/`main`.
- **Manual Release (`release.yml`)**: Triggered manually on `main` in **GitHub → Actions → Release — Deploy to netcup → Run workflow**. Choose the version bump (`patch`, `minor` or `major`) and optionally add a release note. The workflow bumps the version in `package.json`, runs the full verification suite, packages the compiled build into a compressed payload, securely transfers it via `scp` and unpacks it via `tar` over SSH (preserving `data/` and `tmp/`), and reloads Phusion Passenger (`touch tmp/restart.txt`). The production `node_modules` are installed in CI with `npm ci --omit=dev` from the lockfile (so the deployed versions are the tested ones) and shipped inside the archive, because the netcup SSH shell has no Node.js/npm. SSH uses strict host-key checking against the pinned `SSH_KNOWN_HOSTS`. Only after a successful deploy the workflow commits `chore(release): vX.Y.Z` to `main`, pushes the tag `vX.Y.Z` and creates a GitHub Release with generated notes. If the build or deploy fails, no commit, tag or release is created. Pushing to `main` requires that `github-actions[bot]` may push there (allow it to bypass branch protection if enabled). Third-party actions are pinned by commit SHA; Dependabot proposes updates weekly.

### Required GitHub Secrets / Variables
- `SSH_PRIVATE_KEY` *(Repository Secret)* — unencrypted deploy private key matching `~/.ssh/authorized_keys`
- `SSH_HOST`, `SSH_USER`, `DEPLOY_PATH`, optional `SSH_PORT` *(default `22`)*
- `SSH_KNOWN_HOSTS` *(recommended secret or variable)* — the server's host key line(s), created with `ssh-keyscan -p <port> <SSH_HOST>` and checked against the server's real fingerprint. **The host name at the start of each line must be identical to `SSH_HOST`**, otherwise the deploy stops with "No ED25519 host key is known" (a pinned-key ED25519 line is enough). If it is missing, the release still runs but prints a warning and trusts the key presented on first contact. After a server reinstall the key changes: create the line again and update the secret.

### netcup Plesk Configuration
1. **Apache & nginx Settings**: Uncheck **Proxy mode** so Nginx forwards `/ws` WebSocket upgrades directly to Phusion Passenger.
2. **Apache & nginx Settings → Additional headers** (choose *Enter custom value*): paste the security headers listed under [Security headers](#security-headers). nginx serves the static files itself, so this setting is what puts the headers on `index.html` and `/assets/*`.
3. **Node.js**:
   - **Application Root**: `<DEPLOY_PATH>`
   - **Document Root**: `<DEPLOY_PATH>/dist`
   - **Application Startup File**: `dist-server/server.cjs`
   - **Application Mode / Env**: `production` (`NODE_ENV=production`)
   - **Tip**: Configure a Plesk scheduled task to ping `/api/health` every ~5 minutes if Passenger idles out inactive workers.

### How players get updates (including the home-screen app)

- **No service worker, no store.** The home-screen icon (`public/manifest.webmanifest`, `display: standalone`) simply opens the website, so the installed app updates exactly like the site does. Nothing has to be reinstalled.
- **Hashed assets.** Builds are content-hashed (`/assets/index-<hash>.js`), so a release never changes a file that a cached page depends on. Only `index.html` can be out of date.
- **Version handshake.** The release workflow bumps `package.json` before the build. The bundle contains that version (`__APP_VERSION__`), and the server reports its own in `GET /api/health` and in the WebSocket `auth:ack`. A page that finds the server running a newer version:
  - reloads itself **once** when it is idle (lobby, no match, queue or room), or
  - shows the banner *"A new version of Rotor Clash is available" → Update now* while a match is running, so nothing is lost.
  It checks on every connect, whenever the app returns to the foreground (a phone app can stay in the background for days) and when the network comes back. The automatic reload happens at most once per version, so a stale cache can never cause a reload loop.
- **Caching.** Add `Cache-Control: no-cache` to the Plesk *Additional headers* (optional line below): browsers then ask the server on every visit whether `index.html` changed, which costs a tiny `304` response.
- **Manifest changes** (icon, name, colours) are copied by iOS when the icon is added; after such a change the icon has to be removed and added again. Normal releases are not affected.

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

### Security headers

The page and its static files are served by nginx, so the headers are configured there. In Plesk open **Domains → rotor-clash.port11.de → Apache & nginx Settings → Additional headers → Enter custom value** and paste exactly these lines (`Name: value`, one per line, no quotes and no trailing `;`):

```text
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' wss://rotor-clash.port11.de; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'
```

Optional sixth line, so that browsers always revalidate the page and a release reaches players quickly (see *How players get updates*):

```text
Cache-Control: no-cache
```

Notes:

- Do **not** paste nginx `add_header …;` syntax into this field: the quotes and `always;` would become part of the header value and browsers would ignore the headers.
- The built `index.html` also carries the same policy (without `frame-ancestors`, which only works as a header) in a `<meta>` tag, so the CSP applies even if the web server configuration is lost.
- `'unsafe-eval'` is required by the standard Alpine.js build, which compiles template expressions at runtime. External scripts, plugins, framing and foreign form targets are still blocked. Keep scripts external (`public/theme-init.js`); never add inline scripts.
- The app does not send these headers itself unless `SECURITY_HEADERS=app` is set (see Configuration).
- Check with `curl -sI https://rotor-clash.port11.de/`: all five headers should appear exactly once. If the host name changes, update the `connect-src` entry.
