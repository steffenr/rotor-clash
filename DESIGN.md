# DESIGN.md — Rotor Clash Visual & UX System

**Rotor Clash** follows an **Illustrated Coastal Field Guide** visual language derived directly from the official Rotor Clash emblem (`/assets/aistudio/logo_rotor_clash_3a6e5dcc.png`)—combining crisp Harbor Navy comic-print ink outlines, warm badge-cream card stock, Coastal Sky Teal, Beacon Orange, and Meadow Green.

---

## 1. Colour Tokens, Shape & Depth

Every colour is a CSS custom property `--c-*` in `src/index.css`. `:root` holds the light palette (the original "paper & ink" look) and the `.dark` class on `<html>` overrides the values (and switches `color-scheme`). A `@theme inline` block exposes each token to Tailwind as `bg-c-*`, `text-c-*` and `border-c-*`, so **templates never contain hex colours**; inline styles use `var(--c-*)`. There are 37 tokens. Since the theme system was introduced only one token has been added: `--c-back` (the card-back navy, for the deck chooser). The saved or system theme is applied before first paint by `public/theme-init.js` (storage key `rotor_clash_theme`, logic in `src/lib/theme.ts`).

### Surfaces & Paper Hierarchy
| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--c-canvas` | `#F5EFE0` | `#0F1D26` | Desk background: warm parchment with the `.paper-grain` dot texture (`--c-dot`) and a coastal-sky horizon wash (`--c-glow` → `--c-glow-end`) |
| `--c-canvas-2` | `#EFE8D6` | `#14262F` | Arena table surface |
| `--c-paper-hi` | `#FFFDF7` | `#25394A` | Card and panel stock (`.ink-panel`, `.ink-card`) |
| `--c-paper` | `#FAF4E4` | `#1D2F3B` | Badge plaques, stat insets, secondary buttons |
| `--c-sand` / `--c-sand-soft` / `--c-sand-hover` | `#EAE1CA` / `#EFE7D1` / `#DCD1B4` | `#2D4553` / `#263E4B` / `#36505F` | Utility strips, neutral buttons and their hover |
| `--c-sky` / `--c-sky-soft` | `#DCEEF5` / `#E7F4F9` | `#193A4A` / `#1E4254` | Coastal-sky tint: searching panel, update banner, sky arch |

### Ink & Structural Outlines
| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--c-ink` | `#173240` | `#E8E2D0` | **Harbor Navy**: headings, body text, ink borders. Flips to cream in dark mode. |
| `--c-ink-2` / `-3` / `-4` / `-5` | `#3C5866` / `#4B6675` / `#667D8A` / `#8CA0AB` | `#BCC9D1` / `#A6B6C0` / `#8BA0AC` / `#7A909C` | Secondary ink, muted metadata, disabled and hairline ink |
| `--c-line` | `#173240` | `#070F14` | The hard outline and press-shadow colour (`0 4px 0 var(--c-line)`) |
| `--c-back` | `#173240` | `#173240` | Card-back navy, identical in both themes (a real card back does not invert) |

### Accent Palette
| Token | Light | Dark | Role |
| --- | --- | --- | --- |
| `--c-teal` / `--c-teal-deep` | `#1E7898` / `#155B75` | `#2E96BC` / `#7CCBE6` | Offshore category crest, sky arch, Online Match CTA, upper speed-stripe, links, focus ring |
| `--c-orange` / `--c-orange-deep` / `--c-peach` | `#F15A24` / `#C94213` / `#FFE8DC` | `#F26B3A` / `#FF8A5C` / `#3D2A20` | Play a Friend CTA, lower speed-stripe, active nav underline, **lower-wins markers** (*Start Wind*, *Switched On*: `Min` / `Kleiner`), Windbase category, lighthouse, selected-deck check |
| `--c-green` / `--c-green-deep` | `#2F6F4E` / `#23553C` | `#4EAE80` / `#8FE0B4` | Quick Match and Play vs Robot CTAs, *Update now*, Onshore category crest, completed Quartets, win states |
| `--c-mint` / `--c-mint-hover` | `#E7F4EC` / `#D1EBE0` | `#17382A` / `#1F4A38` | Friend-room panel, win fill |
| `--c-ink` (navy) | `#173240` | n/a | Floating Offshore category crest, card-back canvas (`--c-back`) |

### Round & Status Semantics
| State | Fill | Border | Text |
| --- | --- | --- | --- |
| **Win** | `--c-mint` (`#E7F4EC` / dark `#17382A`) | `--c-green` | `--c-ink` |
| **Loss / danger** (also the *Quit Game* button and dialog) | `--c-rose` (`#FEECEB` / dark `#3B1F22`) | `--c-red` (`#DC2626` / `#EF5350`) | `--c-red-deep` (`#7F1D1D` / `#F5A5A5`); button hover `--c-red-hover`; text on tint `--c-red-ink` |
| **Tie / pending pot** | `--c-cream-amber` (`#FEF3C7` / dark `#3A3118`) | `--c-amber` (`#D97706` / `#E58A1F`) | `--c-amber-ink` (`#78350F` / `#F5C27A`); icons `--c-amber-deep` |

### Dark Mode Rules
- Hard ink borders (`.border-c-ink`) soften to `--c-ink-5` in dark mode so the outlines do not glare; `--c-line` (outlines and press shadows) becomes a near-black instead.
- Accents get lighter and `-deep` variants become *lighter* (not darker) so text on dark surfaces keeps its contrast.
- The card back (`--c-back`) and the deck-stack faces stay Harbor Navy in both themes.
- Never hardcode a hex colour in a template. Add a token with a light **and** a dark value instead.

### Shape & Depth
- **Outline + press shadow**: `.ink-panel` = `2px solid var(--c-line)` + `0 4px 0 var(--c-line)`; `.ink-card` = `2.5px` + `0 5px 0`; buttons `0 3px 0` with `active:translate-y-0.5`; the arena table `0 6px 0`.
- **Radii**: controls and chips `rounded-xl`, panels and cards `rounded-2xl`, the coastal-sky arch `rounded-t-[2.25rem]`, status pills fully round.
- **Touch targets**: at least 40 px high (`min-h-10`), stat rows 44 px (`min-h-[44px]`).
- **Safe areas**: the page respects `env(safe-area-inset-*)` for notches and the home indicator.

---

## 2. Typography

Defined in `index.html` (loaded from Google Fonts, see the CSP in the README) and mapped as Tailwind CSS 4.x `@theme` tokens in `src/index.css`:
- **Display (`--font-display`)**: **Fraunces**: expressive editorial serif for headings (`h1`–`h4`, `.font-display`), turbine model titles and card emblems.
- **UI & Body (`--font-sans`)**: **Plus Jakarta Sans**: clean, open geometric sans-serif for navigation, explanations and tactile buttons.
- **Numbers & Codes (`--font-mono`)**: **JetBrains Mono** (`tabular-nums`): aligned comparison metrics, Quartet IDs (`1A`–`16D`), countdowns and room codes.
- **Base rules**: form fields are at least 16 px so iOS Safari does not zoom on focus; controls use `touch-action: manipulation` (no tap delay); every focusable element gets a `2px` `--c-teal` focus ring with `2px` offset.

---

## 3. Navigation, Brand Emblem & Motif Discipline

- **3-Zone Sticky Header**:
  1. Left: Illustrated **Rotor Clash** logo emblem (`/assets/aistudio/logo_rotor_clash_3a6e5dcc.png`) with `sr-only` text fallback, topped by a Coastal Teal / Harbor Navy / Beacon Orange accent hairline.
  2. Center: 4 single-line links (`Play`, `Card Album`, `Leaderboard`, `How to Play`) with Beacon Orange `#F15A24` active underline.
  3. Right: light/dark theme toggle plus **one primary button that changes with the situation** (`headerAction()` in `src/shared/headerAction.ts`): no game -> *Quick Match* (green); queued -> *Searching…*; game running and the arena open -> *Quit Game* (red, with the log-out icon); game running and another page open -> *Back to Game*. Styled with `#173240` ink border & press lip. A finished game counts as no game.
- **Quit dialog**: *Quit Game* opens a small modal (`role="dialog"`, `aria-modal`) instead of inline buttons: title "Quit this game?", one sentence on the consequence (a robot game is not saved; a match against a person does not count for anyone), a red **Quit Game** button and a sand **Keep Playing** button. Focus starts on *Keep Playing*, Tab cycles between the two, Escape or a click on the backdrop closes it. There is no Full Screen mode any more.
- **Update banner**: when the server runs a newer version than the open page, a Coastal Sky strip below the utility bar reads *"A new version of Rotor Clash is available."* with a Meadow Green **Update now** button (`t.nav.updateAvailable` / `t.nav.updateReload`). An idle page reloads itself once; during a match only the banner appears, so no game is interrupted. It sits above the red error toast.
- **Phone layout (below `md`)**: the centre links move to a fixed bottom tab bar, a match shows its round counter next to the logo in the header, the scoreboard is compact (card counts only, names truncate) and the round result slides up as a bottom sheet.
- **Themes**: every colour is a `--c-*` token with a `.dark` override on `<html>` (`src/lib/theme.ts`, storage key `rotor_clash_theme`; the saved or system theme is applied before first paint by `public/theme-init.js`). Never hardcode hex colours in templates. Card backs keep their Harbor Navy in dark mode (`--c-back`).
- **Workspace Utility Strip**: Secondary bar directly beneath the header showing current Explorer callsign + points, audio mute toggle, and `EN` / `DE` language switcher.
- **Collector Emblem Banner (Lobby Hero)**: Features the Rotor Clash emblem centered inside a `#FAF4E4` cream plaque flanked by the logo's signature **dual Coastal Teal & Beacon Orange speed-stripes**, paired with a coastal-sky card preview showcase on the right.

---

## 4. Card & Component Anatomy

### Turbine Card (`src/templates/cardMarkup.ts`)
1. **Category Crest Band & Explorer Header**: Top `6px` category bar, circular Harbor-ink Quartet seal (`1A`–`16D`) on `#FAF4E4` badge cream, group name, build year, full-view inspect button, model heading, manufacturer & country.
2. **Mounted Photo + Coastal Sky Arch Lighthouse Diagram**:
   - 8/12 columns: Framed field photograph (`referrerpolicy="no-referrer"` with clean SVG wind fallback) and overlaid plant/location caption.
   - 4/12 columns: Rounded-top **Coastal Sky Arch Window** (`rounded-t-[2.25rem]`) with sky gradient (`#2A86A8` → `#B4DFEF` → `#EDF6F9`), green coastal headland, cream ink-stroked turbine, and Beacon Orange striped **45 m coastal lighthouse**. Turbine and lighthouse are drawn on one shared scale (`src/shared/lighthouse.ts`), so the heights are in true proportion: a 45 m hub is exactly as tall as the lighthouse, a 100 m hub about 2.2 times, an 18 m hub 0.4 times. The scale is chosen per card so the taller of the two fills the picture, which means giant turbines show a small lighthouse; `tests/lighthouse.test.ts` checks every card. Never size the two independently.
3. **5 Tactile Stat Rows (`min-h-[44px]`)**:
   - Icon badge, localized kid-friendly label (*Power*, *Rotor Size*, *Tower Height*, *Wind Farm* and a fifth stat that depends on the deck), tabular metric + unit, and proportional strength bar.
   - The fifth stat belongs to the match's deck mode: *Modern Giants* compares *Start Wind* (`cutInWindMs`, German *Anlaufwind*); *Records & Firsts*, *Mixed* and *Grand Tour* compare *Switched On* (`firstPowerYear`, German *Eingeschaltet*, the year the machine was first switched on and made electricity), where the oldest machine wins.
   - Both lower-wins stats display an explicit Beacon Orange `Min` / `Kleiner` indicator so younger players immediately spot that the lower value wins. A value flagged as approximate (`approximateStats` in the card file) is shown with a `≈` and a tooltip.
4. **Field Guide Footer**: Swept area (`m²`), rule reminder, and verified external technical source link.

### Card Detail Modal (`renderCardDetailModal`)
- **Two-Column Split Field-Guide Dossier**:
  - **Left Gallery Column (`md:col-span-5`)**: Mounted `#FFFDF7` ivory field frame with vertical measurement ticks, uncropped turbine photography (`object-contain`, `max-h-[480px]`) preserving the full turbine anatomy from blade tip to tower foundation across all aspect ratios, specimen provenance tag with installation count and verified photo status (`Real Photo` / `Concept & Prototype`), and previous/next card flip buttons.
  - **Right Dossier Column (`md:col-span-7`)**: Stamped Quartet category seal, model heading, manufacturer, country, deployment badge, 5-stat comparison grid with win indicators, technical specifications box, and Field Guide Fact with external engineering documentation button.
  - **Accessibility & Shortcuts**: Closed via <kbd>Escape</kbd>, backdrop click, or close button; deck flipping via <kbd>←</kbd> and <kbd>→</kbd> arrow keys.

### Card Back (`renderTurbineCardBack`)
- Features a **Harbor Navy (`#173240`)** interior framed by `#FAF4E4` cream stock, traversed by **Coastal Teal & Beacon Orange horizontal speed-stripes** behind a circular cream collector medallion displaying the **Rotor Clash logo** (`/assets/aistudio/logo_rotor_clash_3a6e5dcc.png`) and remaining deck counter.

### Deck Chooser (`renderDeckPicker`, `src/templates/deckPicker.ts`)
- Each deck is drawn as a **stack of card backs**, not a button: the top card is a miniature of the card back (Harbor Navy, cream hairline, speed-stripes, cream medallion) and 3–5 cream cards peek out behind it. Stack depth hints at deck size (Grand Tour is the tallest); a mono seal shows the card count dealt in a match.
- Identity per deck lives in the stripes and emblem only: Modern Giants = teal stripes + turbine, Records & Firsts = orange stripes + rosette, Mixed Deck = diagonal teal/orange face + shuffle arrows, Grand Tour = teal and orange stripes + compass star.
- **Selected** = the stack lifts 5 px and fans out, the tile frames like an ivory card (`2px` ink border, `0 4px 0` press lip) and a Beacon Orange check badge pops in. **Hover** = a smaller fan. The deck description for the selected deck stays on the right of the title row.
- The face colour is the `--c-back` token, which stays Harbor Navy in dark mode like a real card back. Motion is limited to `transform`/`opacity` and is neutralised by the global `prefers-reduced-motion` rule. Tiles keep `role="radio"` inside a `radiogroup`.

### Arena Table & Collector Strip (`renderArena`)
- Plays on the plain `--c-canvas-2` desk colour: no background illustration, so nothing competes with the two cards.
- Match scoreboard: only the match itself (your card count and name, the round counter, tie pile and turn timer, the opponent and their card count). There is no Full Screen button and no Quit button here: quitting lives in the header button. From `sm` up it is a three-column grid (`minmax(0,1fr) auto minmax(0,1fr)`), so the round counter sits exactly in the middle whatever the player names or ratings are; on phones it wraps and the counter moves to the header.
- 3-column battle table: **Your Card** | **Center Duel Feedback / Turn Cue** (`animate-gentle-bob` on active turn) | **Opponent Card / Card Back**.
- Compact bottom Quartet collector bar (one chip per quartet of the deck mode, `0/4`–`4/4` progress) expandable into the full Quartet Matrix (`renderQuartetMatrix`: 32 slots, or 64 in *Grand Tour*).

### Lobby: Friend Rooms
- Creating a friend room shows a mint panel with the 6-character code, a *Copy Invite Link* button and a **Show in open rooms** checkbox. Rooms are private by default; ticking the box lists the room under *Open rooms* for everyone, unticking hides it again.

### How to Play (Tutorial)
- Step 1 shows an interactive example card. A **Modern Giants / Records & Firsts** switch above it swaps between the Vestas V236 (Start Wind) and the Gedser Wind Turbine (Switched On), and the explanation tip follows the stat the learner taps.

---

## 5. Motion, Tactility & Accessibility

- **Tactile Press Depth**: action buttons and panels use `var(--c-line)` ink borders with a solid bottom press shadow (`shadow-[0_4px_0_var(--c-line)] active:translate-y-0.5`).
- **Motion set** (all in `src/index.css`; motion is limited to `transform`, `opacity` and shadow):

  | Class / keyframes | Timing | Purpose |
  | --- | --- | --- |
  | `.anim-pop-in` (`popIn`) | `0.38s` cubic-bezier(0.2, 0.9, 0.3, 1.2) | Quit dialog and the end-of-match panel appearing with a small overshoot |
  | `.anim-flip-in` (`flipIn`) | `0.45s` cubic-bezier(0.2, 0.8, 0.3, 1) | Opponent card revealed after a round |
  | `.anim-shake` | `0.45s` | Round banner after a lost round |
  | `.anim-win-glow` | `0.9s`, twice | Round banner after a won round |
  | `.anim-droop` | `0.6s` | Drooping icon on the defeat screen |
  | `.anim-trophy` (`trophyBounce`) | `0.7s` cubic-bezier(0.3, 1.3, 0.5, 1) | Trophy on the victory screen |
  | `.anim-urgent` (`urgentPulse`) | `0.8s`, infinite | Turn timer at 10 s or less |
  | `.animate-gentle-bob` | looping, 3 px | Turn cue |
  | `.win-panel` (`.win-rays`, `.win-sparkles`, `.win-headline`) + canvas confetti (`src/lib/celebrate.ts`) | `~2.6s` loops | Victory celebration |
  | `.deck-stack` / `.deck-layer` | `0.45s` cubic-bezier(0.2, 0.9, 0.3, 1.15) | Lift and fan of the selected deck |

- **Reduced Motion**: `@media (prefers-reduced-motion: reduce)` shortens every animation and transition to `0.01ms` and hides the victory rays and sparkles.
- **Keyboard & Contrast**: ink tokens on paper tokens keep body text well above 4.5:1 in both themes; a `2px` `--c-teal` focus-visible ring everywhere; `Escape` closes the card detail modal and the quit dialog; dialogs set `role="dialog"` and `aria-modal`, and the quit dialog traps Tab between its two buttons.
