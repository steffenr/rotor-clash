# DESIGN.md — Rotor Clash Visual & UX System

**Rotor Clash** follows an **Illustrated Field Guide** visual language inspired by illustrated explorer notebooks and classic physical Quartet card decks—warm, tactile, and immediately legible for kids while remaining crisp and data-accurate for energy enthusiasts.

---

## 1. Visual Identity & Color Tokens

### Surfaces & Paper Hierarchy
- **Desk Background**: `#F6F2E9` (warm field-guide parchment with subtle radial `.paper-grain` texture)
- **Card / Panel Surface**: `#FFFDF8` (clean ivory card stock)
- **Inset / Stat Row Surface**: `#FAF6EC` (soft cream inset)
- **Footer / Mounted Frame**: `#F4EFE2` / `#EFE8D6`
- **Hairline Borders & Dividers**: `#DFD6C3`, `#E4DBC7`, `#D4C9B0`

### Primary Ink
- **Primary Text**: `#1F2933`
- **Secondary Text**: `#334155` / `#52606D`
- **Muted Metadata**: `#6B7280` / `#8B8270`

### Accent & Quartet Category Palette
| Role | Hex | Usage |
| --- | --- | --- |
| **Forest Green** | `#1B6B52` | Brand wordmark, primary play CTAs, Onshore category border/stamp, completed Quartets |
| **Ocean Teal** | `#0E7490` | Active navigation underline, Offshore category border/stamp, interactive stat selection, links |
| **Sunset Orange** | `#EA580C` | Lobby kicker, Play a Friend CTA, *Start Wind* (`Min` / `Kleiner`) highlights, Windbase category |
| **Deep Sea Blue** | `#1D4ED8` | Floating Offshore category border/stamp |

### Round & Status Semantics
- **Win**: `#E6F4EE` fill / `#1B6B52` border / `#0F4232` text
- **Loss**: `#FEECEB` fill / `#DC2626` border / `#7F1D1D` text
- **Tie / Pending Pot**: `#FEF3C7` fill / `#D97706` border / `#78350F` text

---

## 2. Typography

Defined in `index.html` and mapped as Tailwind CSS 4.x `@theme` tokens in `src/index.css`:
- **Display (`--font-display`)**: **Fraunces** — friendly, editorial storybook serif for headings, turbine model titles, and card emblems.
- **UI & Body (`--font-sans`)**: **Plus Jakarta Sans** — clean, open geometric sans-serif for navigation, explanations, and buttons.
- **Numbers & Codes (`--font-mono`)**: **JetBrains Mono** (`tabular-nums`) — aligned comparison metrics, Quartet IDs (`1A`–`8D`), countdowns, and room codes.

---

## 3. Navigation & Layout Discipline

- **3-Zone Sticky Header**:
  1. Left: Wordmark (`Rotor Clash`).
  2. Center: 4 single-line links (`Play`, `Card Album`, `Leaderboard`, `How to Play`).
  3. Right: Single primary CTA (`Quick Match` / `Back to Game`).
- **Workspace Utility Strip**: Secondary subtle bar directly beneath the header showing current Explorer callsign + points, audio mute toggle, and `EN` / `DE` language switcher.

---

## 4. Card & Component Anatomy

### Turbine Card (`src/templates/cardMarkup.ts`)
1. **Explorer Header**: Circular stamped Quartet seal (`1A`–`8D`) colored by turbine category, group name, build year, full-view inspect button, model heading, manufacturer & country.
2. **Mounted Photo + Coastal Lighthouse Scale Diagram**:
   - 8/12 columns: Framed field photograph (`referrerpolicy="no-referrer"` with clean SVG wind fallback) and overlaid plant/location caption.
   - 4/12 columns: Proportional SVG diagram comparing the turbine's **hub height & swept rotor circle** directly against a **45 m coastal lighthouse** (`hubHeightM / 45m`).
3. **5 Tactile Stat Rows (`min-h-[44px]`)**:
   - Icon badge, localized kid-friendly label (*Power*, *Rotor Size*, *Tower Height*, *Start Wind*, *Wind Farm*), tabular metric + unit, and proportional strength bar.
   - *Start Wind* (`cutInWindMs`) displays an explicit orange `Min` / `Kleiner` indicator so younger players immediately spot that lower values win.
4. **Field Guide Footer**: Swept area (`m²`), rule reminder, and verified external technical source link.

### Card Back (`renderTurbineCardBack`)
- Features a diagonal **Ocean Teal / Sunset Orange** crest framing a central **Wind Turbine Medallion** (three-blade rotor crest over coastal horizon with **ROTOR CLASH** wordmark) and remaining deck counter.

### Arena Table & Collector Strip (`renderArena`)
- Plays over the illustrated desk backdrop (`src/assets/images/field_guide_desk_1794678472040.jpg`) softened with a warm parchment scrim (`bg-[#F6F2E9]/55`).
- 3-column battle table: **Your Card** | **Center Duel Feedback / Turn Cue** (`animate-gentle-bob` on active turn) | **Opponent Card / Card Back**.
- Compact bottom Quartet collector bar (`1..8` with `0/4`–`4/4` progress) expandable into the full 32-slot Quartet Matrix (`renderQuartetMatrix`).

---

## 5. Motion, Tactility & Accessibility

- **Tactile Press Depth**: Primary buttons use solid bottom lips (`shadow-[0_4px_0_...] active:translate-y-0.5`) to feel like physical game pieces.
- **Reduced Motion**: `src/index.css` includes `@media (prefers-reduced-motion: reduce)` resetting animations and transitions.
- **Keyboard & Contrast**: High-contrast dark-slate ink (`#1F2933`) on ivory/parchment surfaces, clear `2px` `#0E7490` focus-visible rings, and `Escape` dismissal for the full-detail card modal.
