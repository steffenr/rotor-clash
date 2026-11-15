# DESIGN.md — Rotor Clash Visual & UX System

**Rotor Clash** follows an **Illustrated Coastal Field Guide** visual language derived directly from the official Rotor Clash emblem (`/assets/aistudio/logo_rotor_clash_3a6e5dcc.png`)—combining crisp Harbor Navy comic-print ink outlines, warm badge-cream card stock, Coastal Sky Teal, Beacon Orange, and Meadow Green.

---

## 1. Visual Identity & Color Tokens

### Surfaces & Paper Hierarchy
- **Desk Background**: `#F5EFE0` (warm parchment canvas with radial `.paper-grain` texture and subtle coastal-sky horizon wash)
- **Card / Panel Surface**: `#FFFDF7` (clean warm-ivory card stock with `.ink-panel` / `.ink-card` `2px`–`2.5px` `#173240` outlines and solid offset press shadows)
- **Badge Plaque Cream / Stat Inset**: `#FAF4E4`
- **Utility Strip & Mounted Accents**: `#EAE1CA` / `#DCEEF5` (Coastal Sky tint)

### Primary Ink & Structural Outlines
- **Harbor Navy Ink**: `#173240` (primary headings, body text, printed outlines, and solid offset shadows `0 4px 0 #173240` / `0 5px 0 #173240`)
- **Secondary Ink**: `#3C5866` / `#4B6675`
- **Muted Metadata**: `#667D8A`

### Accent & Quartet Category Palette
| Role | Hex | Usage |
| --- | --- | --- |
| **Coastal Sky Teal** | `#1E7898` | Offshore category crest/stamp, sky arch gradients, Online Match CTA, upper speed-stripe, links |
| **Beacon Orange** | `#F15A24` | Private Room CTA, lower speed-stripe, active nav indicator, *Start Wind* (`Min` / `Kleiner`) highlights, Windbase category, coastal lighthouse |
| **Coastal Meadow Green** | `#2F6F4E` | Header Quick Match CTA, Play vs Bot CTA, Onshore category crest/stamp, completed Quartets, win states |
| **Harbor Navy** | `#173240` | Floating Offshore category crest/stamp, primary ink borders, card-back canvas |

### Round & Status Semantics
- **Win**: `#E7F4EC` fill / `#2F6F4E` border / `#173240` text
- **Loss**: `#FEECEB` fill / `#DC2626` border / `#7F1D1D` text
- **Tie / Pending Pot**: `#FEF3C7` fill / `#D97706` border / `#78350F` text

---

## 2. Typography

Defined in `index.html` and mapped as Tailwind CSS 4.x `@theme` tokens in `src/index.css`:
- **Display (`--font-display`)**: **Fraunces** — expressive editorial serif for headings, turbine model titles, and card emblems.
- **UI & Body (`--font-sans`)**: **Plus Jakarta Sans** — clean, open geometric sans-serif for navigation, explanations, and tactile buttons.
- **Numbers & Codes (`--font-mono`)**: **JetBrains Mono** (`tabular-nums`) — aligned comparison metrics, Quartet IDs (`1A`–`8D`), countdowns, and room codes.

---

## 3. Navigation, Brand Emblem & Motif Discipline

- **3-Zone Sticky Header**:
  1. Left: Illustrated **Rotor Clash** logo emblem (`/assets/aistudio/logo_rotor_clash_3a6e5dcc.png`) with `sr-only` text fallback, topped by a Coastal Teal / Harbor Navy / Beacon Orange accent hairline.
  2. Center: 4 single-line links (`Play`, `Card Album`, `Leaderboard`, `How to Play`) with Beacon Orange `#F15A24` active underline.
  3. Right: Single primary CTA (`Quick Match` / `Back to Game`) styled with Meadow Green + `#173240` ink border & press lip.
- **Workspace Utility Strip**: Secondary bar directly beneath the header showing current Explorer callsign + points, audio mute toggle, and `EN` / `DE` language switcher.
- **Collector Emblem Banner (Lobby Hero)**: Features the Rotor Clash emblem centered inside a `#FAF4E4` cream plaque flanked by the logo's signature **dual Coastal Teal & Beacon Orange speed-stripes**, paired with a coastal-sky card preview showcase on the right.

---

## 4. Card & Component Anatomy

### Turbine Card (`src/templates/cardMarkup.ts`)
1. **Category Crest Band & Explorer Header**: Top `6px` category bar, circular Harbor-ink Quartet seal (`1A`–`8D`) on `#FAF4E4` badge cream, group name, build year, full-view inspect button, model heading, manufacturer & country.
2. **Mounted Photo + Coastal Sky Arch Lighthouse Diagram**:
   - 8/12 columns: Framed field photograph (`referrerpolicy="no-referrer"` with clean SVG wind fallback) and overlaid plant/location caption.
   - 4/12 columns: Rounded-top **Coastal Sky Arch Window** (`rounded-t-[2.25rem]`) with sky gradient (`#2A86A8` → `#B4DFEF` → `#EDF6F9`), green coastal headland, cream ink-stroked turbine, and Beacon Orange striped **45 m coastal lighthouse** (`hubHeightM / 45m`).
3. **5 Tactile Stat Rows (`min-h-[44px]`)**:
   - Icon badge, localized kid-friendly label (*Power*, *Rotor Size*, *Tower Height*, *Start Wind*, *Wind Farm*), tabular metric + unit, and proportional strength bar.
   - *Start Wind* (`cutInWindMs`) displays an explicit Beacon Orange `Min` / `Kleiner` indicator so younger players immediately spot that lower values win.
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
- 3-column battle table: **Your Card** | **Center Duel Feedback / Turn Cue** (`animate-gentle-bob` on active turn) | **Opponent Card / Card Back**.
- Compact bottom Quartet collector bar (`1..8` with `0/4`–`4/4` progress) expandable into the full 32-slot Quartet Matrix (`renderQuartetMatrix`).

---

## 5. Motion, Tactility & Accessibility

- **Tactile Press Depth**: Action buttons and panels use `#173240` Harbor Navy ink borders with solid bottom press shadows (`shadow-[0_4px_0_#173240] active:translate-y-0.5`).
- **Reduced Motion**: `src/index.css` includes `@media (prefers-reduced-motion: reduce)` resetting animations and transitions.
- **Keyboard & Contrast**: High-contrast Harbor Navy ink (`#173240`) on ivory/cream surfaces, clear `2px` `#1E7898` focus-visible rings, and `Escape` dismissal for the full-detail card modal.
