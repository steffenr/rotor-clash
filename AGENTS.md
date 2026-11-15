# AGENTS.md — Contributor & AI Agent Guide

This file defines the architectural rules, conventions, and verification steps for anyone (human or AI agent) modifying **Rotor Clash**.

---

## 1. Architecture Overview

- **Frontend**: Pure **Alpine.js** + **Tailwind CSS 4.x** + **TypeScript** (no React).
  - Entry point: `index.html` mounts `<div id="app" x-data="rotorClashApp()" x-cloak>` and loads `src/main.ts`.
  - State & actions: `src/app/rotorClashStore.ts` (`createRotorClashApp()`).
  - UI markup: String-returning template functions in `src/templates/sections.ts`, `src/templates/cardMarkup.ts`, and `src/templates/icons.ts` injected into `#app` before `Alpine.start()`.
- **Shared Logic (`src/shared/`)**:
  - `gameTypes.ts`, `turbines.ts`, `botRules.ts`, `markdownParser.ts`.
  - **Rule**: Keep `src/shared/` 100% free of Vite-only imports (`?raw`, `import.meta.glob`) and browser globals (`window`, `localStorage`) so Node (`tsx --test`, `server.ts`, `esbuild`) can import them directly.
- **Browser Loaders (`src/lib/`)**:
  - `turbineDeck.ts` uses Vite `?raw` + `import.meta.glob` to load `src/data/*.md`.
  - `botEngine.ts` wraps `src/shared/botRules.ts` with Vite-loaded cards.
  - `playerIdentity.ts` & `soundFx.ts` manage `localStorage` (`rotor_clash_*` with one-time migration from `aeolian_*`).
- **Backend (`server.ts`, `src/server/`)**:
  - Authoritative game engine (`MatchEngine` in `src/server/matchEngine.ts`), disk deck loader (`turbineRepository.ts`), and atomic JSON persistence (`store.ts` → `data/leaderboard.json`).

---

## 2. Critical Conventions & Gotchas

1. **Alpine.js Null-Safety & `x-if` Rule**:
   - In Alpine.js, `x-if` **must only** be placed on a `<template x-if="...">` element wrapping a single root child—never on `<div>`, `<article>`, or `<section>`.
   - Expressions inside `x-show="false"` elements are **still evaluated** by Alpine. Always wrap nullable expressions (`arenaYourCard()`, `arenaOppCard()`, `activeMatch`, `inspectedCard`) in `<template x-if="...">`.
   - `tests/templates.test.ts` fails CI if `<div x-if=...>` or legacy React mount code is introduced.

2. **Tailwind CSS 4.x**:
   - Configured via `@tailwindcss/vite` in `vite.config.ts` and `@import "tailwindcss";` + `@theme` in `src/index.css`.
   - Avoid inline `style="..."` except for dynamic computed bindings (e.g., category hex colors or progress bar widths).

3. **Data & Translations Separation**:
   - Keep **technical specs only** in `src/data/groups.md` and `src/data/turbines/*.md`.
   - Keep **all human-readable translations** in `src/data/locales/en/` and `src/data/locales/de/` (`groups.md`, `turbines.md`, `ui.ts`).
   - Any new key added to `EN_UI` must also be added to `DE_UI` and `Translations` (`src/lib/i18n.ts`). `tests/deckIntegrity.test.ts` enforces strict key parity.

4. **Server, Node.js & Plesk Production Compatibility**:
   - Requires Node.js `>=22.0.0` (actively verified across Node 22 LTS, 24 LTS, and 26 LTS).
   - `.nvmrc` and `.node-version` lock the target version (`26`).
   - `server.ts` must lazy-import `vite` inside `if (!IS_PROD)` so production builds never load Vite dev dependencies at runtime.
   - `server.ts` must continue supporting both numeric TCP ports and Unix socket strings in `process.env.PORT` (used by Phusion Passenger on netcup).
   - Keep `MatchEngine`'s optional `store` constructor injection and `dispose()` method working so `tests/matchEngine.test.ts` never mutates `data/leaderboard.json` or leaves open timers.

5. **Card Photography & Detail View (Two-Column Field-Guide Dossier)**:
   - All turbine photos are mapped in `src/lib/cardImages.ts` (`CARD_PHOTO_MAP`).
   - Floating offshore turbines (Group 4) must use floating ocean platform assets (`hywind`, `kincardine_floating`, `windfloat_atlantic`, `fallback_floating`), never onshore test-centre imagery.
   - The card detail modal (`renderCardDetailModal()`) uses an uncropped (`object-contain`) mounted specimen gallery on the left and technical dossier on the right, with deck flip navigation (`inspectPrevCard()`, `inspectNextCard()`) bound to buttons and <kbd>←</kbd> / <kbd>→</kbd> arrow keys.

6. **Platform Manifest Constraint**:
   - Do **not** rename `"name"` inside `metadata.json` (required by AI Studio's applet manifest). All user-facing branding, `<title>`, OpenGraph metadata, storage keys, and UI copy must use **Rotor Clash**.

---

## 3. Required Verification Before Committing / Merging

Run all four checks locally before pushing or merging into `develop`:

```bash
npm run lint          # TypeScript strict check (tsc --noEmit)
npm test              # 15+ unit/integration tests (tsx --test tests/*.test.ts)
npm run build         # Vite + Tailwind 4 production client bundle (dist/)
npm run build:server  # esbuild CommonJS server bundle (dist-server/server.cjs)
```
