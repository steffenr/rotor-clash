# AGENTS.md — Contributor & AI Agent Guide

This file defines the architectural rules, conventions, and verification steps for anyone (human or AI agent) modifying **Rotor Clash**.

---

## 1. Architecture Overview

- **Frontend**: Pure **Alpine.js** + **Tailwind CSS 4.x** + **TypeScript** (no React).
  - Entry point: `index.html` mounts `<div id="app" x-data="rotorClashApp()" x-cloak>` and loads `src/main.ts`.
  - State & actions: `src/app/rotorClashStore.ts` (`createRotorClashApp()`).
  - UI markup: String-returning template functions in `src/templates/sections.ts`, `src/templates/cardMarkup.ts`, and `src/templates/icons.ts` injected into `#app` before `Alpine.start()`.
- **Shared Logic (`src/shared/`)**:
  - `gameTypes.ts`, `turbines.ts`, `decks.ts`, `botRules.ts`, `markdownParser.ts`, `photoCredits.ts`.
  - **Rule**: Keep `src/shared/` 100% free of Vite-only imports (`?raw`, `import.meta.glob`) and browser globals (`window`, `localStorage`) so Node (`tsx --test`, `server.ts`, `esbuild`) can import them directly.
- **Browser Loaders (`src/lib/`)**:
  - `turbineDeck.ts` uses Vite `?raw` + `import.meta.glob` to load `src/data/*.md`.
  - `botEngine.ts` wraps `src/shared/botRules.ts` with Vite-loaded cards.
  - `playerIdentity.ts` & `soundFx.ts` manage `localStorage` (`rotor_clash_*` with one-time migration from `aeolian_*`); `playerIdentity.ts` also holds the player id; `deviceKey.ts` keeps the non-extractable login key in IndexedDB.
- **Backend (`server.ts`, `src/server/`)**:
  - Authoritative game engine (`MatchEngine` in `src/server/matchEngine.ts`), disk deck loader (`turbineRepository.ts`), atomic and debounced JSON persistence (`store.ts` → `data/leaderboard.json`, which also holds the public device keys), and the security helpers in `security.ts` (validation, challenge-response proofs, rate and connection limits, origin check, headers/CSP builders). `server.ts` wires them to Express and `ws`.

---

## 2. Critical Conventions & Gotchas

1. **Alpine.js Null-Safety & `x-if` Rule**:
   - In Alpine.js, `x-if` **must only** be placed on a `<template x-if="...">` element wrapping a single root child—never on `<div>`, `<article>`, or `<section>`.
   - Expressions inside `x-show="false"` elements are **still evaluated** by Alpine. Always wrap nullable expressions (`arenaYourCard()`, `arenaOppCard()`, `activeMatch`, `inspectedCard`) in `<template x-if="...">`.
   - `tests/templates.test.ts` fails CI if `<div x-if=...>` or legacy React mount code is introduced.

2. **Tailwind CSS 4.x**:
   - Configured via `@tailwindcss/vite` in `vite.config.ts` and `@import "tailwindcss";` + `@theme` in `src/index.css`.
   - **Colours are theme tokens** (`bg-c-paper`, `text-c-ink`, `border-c-ink`, …) defined as CSS variables in `src/index.css` with a `.dark` override on `<html>`. Never hardcode hex colours in templates (use `var(--c-*)` in inline styles); otherwise dark mode breaks. Theme logic lives in `src/lib/theme.ts` (key `rotor_clash_theme`).
   - PWA/home-screen assets live in `public/` (`manifest.webmanifest`, `icon-*.png`, `apple-touch-icon.png`); the app name there must stay "Rotor Clash". `public/theme-init.js` applies the saved theme before first paint and must stay an external file (no inline scripts, see the CSP rule in item 8).
   - Avoid inline `style="..."` except for dynamic computed bindings (e.g., category hex colors or progress bar widths).

3. **Data & Translations Separation**:
   - Keep **technical specs only** in `src/data/groups.md` and `src/data/turbines/*.md`.
   - Keep **all human-readable translations** in `src/data/locales/en/` and `src/data/locales/de/` (`groups.md`, `turbines.md`, `ui.ts`).
   - Any new key added to `EN_UI` must also be added to `DE_UI` and `Translations` (`src/lib/i18n.ts`). `tests/deckIntegrity.test.ts` enforces strict key parity.
   - `tests/strings.test.ts` scans every UI, card and group text (EN and DE) and fails on empty brackets like `()`, stray or double spaces, `undefined`/`NaN` text, unbalanced parentheses and mismatched `{placeholders}` (the only one the app fills in is `{rounds}`). When a template combines a label and a value (for example `label (unit)`), handle empty values explicitly, as stats without a unit exist.

4. **Server, Node.js & Production Compatibility**:
   - Requires Node.js `>=26.0.0`; CI and the release workflow read the version from `.nvmrc`.
   - `.nvmrc` and `.node-version` lock the target version (`26`).
   - `server.ts` must lazy-import `vite` inside `if (!IS_PROD)` so production builds never load Vite dev dependencies at runtime.
   - `server.ts` must continue supporting both numeric TCP ports and Unix socket strings in `process.env.PORT` (process managers such as Phusion Passenger pass a socket path).
   - Keep `MatchEngine`'s optional `store` constructor injection and `dispose()` method working so `tests/matchEngine.test.ts` never mutates `data/leaderboard.json` or leaves open timers.

5. **Decks & Deck Modes**:
   - There are two decks of 8 quartets (32 cards) each, told apart by group id: groups 1–8 are `modern` (cards `1A`–`8D`), groups 9–16 are `records` (cards `9A`–`16D`). The rules live in `src/shared/decks.ts` (keep it free of Vite/browser imports).
   - A match uses one **deck mode**: `modern`, `records`, `mixed` (8 random whole quartets of 16) or `grand` (all 64 cards, 16 quartets, 48 rounds). The stat set belongs to the **match**, not the card: `modern` compares cut-in speed, every other mode compares first-power year (older wins). Always use `statKeysForMode(match.deckMode)` / `statDefsFor(card, activeMatch.deckMode)`; never infer stats from a single card inside a match.
   - Deck-2 cards have no `cutInWindMs` (leave it out of the markdown); `firstPowerYear` is taken from the card's `year`.
   - Quick-match queues are separate per deck mode, rooms carry their deck mode and a `listed` flag (private by default, see item 8), and clients may send any string: the server normalises unknown or unavailable modes to `modern`.
   - The tutorial (step 1) has a deck switch that shows a Modern card (Start Wind) and a Records card (Switched On, German label "Eingeschaltet"); keep both fifth stats explained when you touch it.
   - New cards need EN **and** DE text in `src/data/locales/*/turbines.md`, a source URL, and a photo credit (see below). Research notes and confidence per figure live in `docs/research/second-deck-verification.md`.

6. **Card Photography, Licences & Detail View (Two-Column Field-Guide Dossier)**:
   - Real photos live in `src/assets/images/real/` and are registered **by file name** in `src/lib/cardImages.ts` (`hywind.jpg` → photo key `hywind`). Concept images (`fallback_*`) and all other images in `src/assets/images/` are **AI-generated** (Google C2PA Content Credentials embedded); they are documented in `src/data/projectImages.ts`, guarded by `tests/projectImages.test.ts`, and labelled as AI concept images in the UI. Do not add an undocumented image there.
   - **Every real photo must come from Wikimedia Commons under a free licence (CC0, public domain, CC BY, CC BY-SA)** and have an entry in `src/data/photoCredits.ts` (author, licence, licence URL, Commons file page). `tests/photoCredits.test.ts` fails CI for an image without a credit or a non-free licence. The credit is shown in the card detail and listed in `docs/PHOTO_CREDITS.md`. Never add a photo from anywhere else.
   - Floating offshore turbines (Group 4) must use floating ocean platform assets (`hywind`, `windfloat_atlantic`, `fallback_floating`; `kincardine_floating` once a licensed photo exists), never onshore test-centre imagery.
   - The lighthouse comparison on every card (`cardMarkup.ts`) must keep turbine and lighthouse on **one** scale: use `lighthouseDiagram()` from `src/shared/lighthouse.ts` and never size them separately (an earlier version drew an 18 m and a 100 m hub almost alike next to the lighthouse). `tests/lighthouse.test.ts` guards the proportions for all cards.
   - The card detail modal (`renderCardDetailModal()`) uses an uncropped (`object-contain`) mounted specimen gallery on the left and technical dossier on the right, with deck flip navigation (`inspectPrevCard()`, `inspectNextCard()`) bound to buttons and <kbd>←</kbd> / <kbd>→</kbd> arrow keys.

6a. **Licences & Copyright**:
   - The project is **AGPL-3.0-only** (`LICENSE`, `"license"` in `package.json`), Copyright (C) 2026 Steffen Rühlmann. The name "Rotor Clash" and the logo/app icons are **all rights reserved** and explicitly outside the AGPL (`NOTICE.md`); photographs keep their Wikimedia licences (`docs/PHOTO_CREDITS.md`); AI-generated images carry no copyright claim. Keep `NOTICE.md` in sync when you add a new kind of asset.
   - Only add code and dependencies whose licences are compatible with the AGPL-3.0 (MIT, BSD, Apache-2.0, LGPL, GPL-3.0 are fine; "non-commercial", "no-derivatives" and proprietary terms are not).
   - AGPL section 13: once the repository is public, the app must show a visible link to its source code (the `repository` field in `package.json` is set to https://github.com/steffenr/rotor-clash). The footer (`renderFooter()` in `src/templates/sections.ts`) shows the app version and links to the source code, `LICENSE` and `docs/PHOTO_CREDITS.md`; the imprint opens from it as a modal (`legal.*` strings, EN and DE). Keep these when you touch the shell.
7. **Platform Manifest Constraint**:
   - Do **not** rename `"name"` inside `metadata.json` (required by AI Studio's applet manifest). All user-facing branding, `<title>`, OpenGraph metadata, storage keys, and UI copy must use **Rotor Clash**.

8. **Security Rules (server is the trust boundary)**:
   - **Identity**: the player id is a *public handle* (it appears in `/api/leaderboard` and in opponents' match state). The credential is a per-browser ECDSA P-256 **device key**, created non-extractable in `src/lib/deviceKey.ts`; login is `auth:hello` (public key) → `auth:challenge` → `auth:proof` (signature, checked by `verifyChallengeProof()`), and the first key proven for an id is bound to it (`LeaderboardStore.bindPublicKey()`, which refuses ranked profiles without a key so nobody can take over a public id). Never store a login secret as text on the client, never treat a player id as proof of identity, and never log keys or signatures.
   - **Client input is hostile**: parse every WebSocket message with `parseClientMessage()`, validate ids with `isValidPlayerId()`, bound string lengths before using them, and validate game moves against the match (e.g. `playStat` only accepts `statKeysForMode(match.deckMode)`). Keys that come from clients must never index a plain `{}`: use `Map`, or the prototype-less dictionaries in `store.ts`; `__proto__`, `constructor` and `prototype` are refused outright.
   - **Limits**: `maxPayload` 4 KB, 30-message burst then 10/s per socket (sustained abuse closes the socket), 30 sockets per address, 60 REST requests per minute and address, at most 25 waiting friend rooms, rename cooldown, coalesced lobby and leaderboard broadcasts, debounced disk writes, and a cap on unranked profiles. Do not remove a limit without replacing it. Every `ws` socket needs an `'error'` listener, otherwise one oversized frame stops the process.
   - **Rooms** are private (code or invite link) unless the host ticks *Show in open rooms*; room codes, shuffles and the starting player use `crypto`, never `Math.random()`. At most 25 waiting rooms exist at once (`MAX_WAITING_ROOMS`).
   - **Ranked results**: once a round has been decided, a forfeit is rated (`LeaderboardStore.recordForfeit()`): the player who left takes the loss, the opponent gets neither a win nor rating. Leaving during the first round stays unrated. Do not turn this back into a free exit — it would let a losing player dodge every defeat. `notePairing()` damps rating when the same two players meet repeatedly (third meeting in an hour half, later ones nothing); keep that when changing the ELO code.
   - **Headers**: the web server in front of the app (for example nginx) typically serves `index.html` and `/assets/*` itself, so the security headers (nosniff, `X-Frame-Options`, referrer and permissions policies, HSTS, CSP) are configured there (plain `Name: value` lines, exact text in the README). The app therefore does **not** send them unless `SECURITY_HEADERS=app` is set (`securityHeaders()` in `security.ts`); setting them in both places sends every header twice. The built `index.html` also carries the CSP as a `<meta>` tag (`cspMeta()` plugin in `vite.config.ts`, `buildMetaCsp()`), so the policy survives a lost web-server config. If you change the CSP, update `security.ts` **and** the README text. The CSP needs `'unsafe-eval'` because the standard Alpine build compiles expressions; keep scripts external, never inline.
   - **Deploys**: pin GitHub Actions by commit SHA, install production dependencies with `npm ci` from the lockfile, and keep the `SSH_KNOWN_HOSTS` secret/variable current. Its host name must equal `SSH_HOST`; the release uses strict host-key checking and fails (before uploading anything) if the key is unknown.
   - Optional environment variables: `TRUST_PROXY=0` (ignore `X-Forwarded-For` when the app is exposed directly), `ALLOWED_ORIGINS` (comma-separated extra origins allowed to open the WebSocket) and `SECURITY_HEADERS=app` (send the security headers from the app). Tests for all of this live in `tests/security.test.ts`.

9. **Releases, Versions & Updating Clients**:
   - The app has **no service worker** (the home-screen icon only opens the site). Do not add one without a complete update flow, because a service worker that serves a stale shell is the classic way to strand players on an old version.
   - The release workflow bumps `package.json` *before* building. The bundle receives that number as `__APP_VERSION__` (`define` in `vite.config.ts`, declared in `src/globals.d.ts`), and the server reports it via `readAppVersion()` (`src/server/version.ts`) in `GET /api/health` and in the WebSocket `auth:ack` (`serverVersion`). The client (`handleServerVersion()` in the store) reloads once when idle and otherwise shows the *Update now* banner. Keep that handshake working; never remove `version` from `/api/health` or `serverVersion` from `auth:ack`.
   - A page can be one version behind the server for a while (an app resumed from the background, a cached `index.html`). Keep WebSocket messages backward compatible for at least one release, or make sure an old client fails in a way that the banner/reload fixes. Build output is content-hashed and old files stay on the server after a deploy (the archive is extracted over `dist/`), so an old page keeps working until it reloads.

---

## 3. Required Verification Before Committing / Merging

Run all four checks locally before pushing or merging into `develop`:

```bash
npm run lint          # TypeScript strict check (tsc --noEmit)
npm test              # unit/integration tests incl. security tests (tsx --test tests/*.test.ts)
npm run build         # Vite + Tailwind 4 production client bundle (dist/)
npm run build:server  # esbuild CommonJS server bundle (dist-server/server.cjs)
```
