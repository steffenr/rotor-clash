# Second deck ("Records, Firsts & Rarities") — verification pass

Status: research only. Nothing here is wired into the game. Compiled 2026-11-15.

Goal: find 32 turbines (8 quartets of 4) for a second deck whose stats can be stated with a source,
using the same five comparison stats as deck 1: rated power (MW), rotor diameter (m), hub height (m),
cut-in wind speed (m/s, lower wins), plant capacity (MW).

## How to read the confidence column

| Tier | Meaning |
| --- | --- |
| **A** | Read in a manufacturer, operator, government or project document |
| **B** | Two or more independent secondary sources agree, or one document-derived source |
| **C** | A single database/secondary source, or sources conflict. Needs a datasheet before shipping |
| **—** | Not found in this pass |

"Database" below means wind-turbine-models.com or thewindpower.net. Both are useful but secondary, and
thewindpower.net hides power curves and some fields behind a paywall.
Pages from auto-generated Wikipedia mirrors (for example cavac.at) were not used. One of them carried
irrelevant embedded instructions, which were ignored.

## Result in one paragraph

All 32 candidates exist and are documented as projects. **Rated power, rotor diameter and plant capacity
are solid for almost every card.** The weak spots are **cut-in speed** (found for 18 of 32, only 6 at
tier A/B) and **hub height** (found for 25 of 32, three of those derived or unofficial). The gaps are
concentrated in the historic, prototype and 2000s-offshore cards. This is a data-availability problem:
most of these machines have no public datasheet.
See "Decision needed" at the end.

## Quartet 1 — Pioneers (1941–1983)

| Card | Where / year | Rated | Rotor | Hub | Cut-in | Plant | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Smith-Putnam | Grandpa's Knob, Vermont, 1941 | 1.0–1.5 MW **(disputed)** C | 53.3 m B | 36 m (tower) B | — | 1 unit | ETHW: "designed to produce 1.5 megawatts", 36 m tower, 20 m blades. wind-works.org argues 1 MW is the correct rating; Putnam said 1.25. A blade broke in 1943 per ETHW (other sources say 1945). |
| Gedser | Gedser, Denmark, 1957 | 0.2 MW B | 24 m C | ~25 m C | 5.0 m/s C | 1 unit | Rotor and rating from wind-works history; tower height and cut-in from a database. |
| Tvindkraft | Ulfborg, Denmark, 1978 | 2 MW design, 1 MW in practice **A** | 54 m **A** | 53 m **A** ("a height of 53m", unclear if tower or total) | 5 m/s C | 1 unit | Official site tvindkraft.dk. Opened 26 March 1978. |
| Growian | Kaiser-Wilhelm-Koog, Germany, 1983 | 3 MW B | 100 m (100.4 in one database) B | 100 m B (a German trade article says 96 m) | 5.4 m/s C (single source) | 1 unit | Rated wind 12 m/s, cut-out 24 m/s. Ran about 400 hours, 1983–1987. NASA also reported on it. |

## Quartet 2 — Odd Designs

| Card | Where / year | Rated | Rotor | Hub | Cut-in | Plant | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Éole (vertical axis) | Cap-Chat, Québec, 1987/88 | 4 MW **A** | 64 m wide at midpoint **A** | 96 m (rotor height) **A** | 4.5 m/s C | 1 unit | Hydro-Québec history page. Ran to April 1993, about 12,000 MWh. Other sources say 110 m tall and 3.8 MW. |
| Vestas 4R-V29 multi-rotor | Risø campus, Denmark, 2016 | 4 × 225 kW = 0.9 MW **A** | 4 × 29.2 m **A** | 29.04 m (lower pair) / 59.50 m (upper pair) **A** | 3.5–4 m/s B | 1 unit | Wind Energy Science paper (Copernicus). Decommissioned December 2018. Cut-in: NREL 4 m/s (traced to a 1996 Vestas spec) vs database 3.5. |
| Gaildorf hybrid tower | Gaildorf, Germany, 2017 | 3.4 MW (GE 3.4-137) B | 137 m B | **178 m A** (tip 246.5 m) | 3 m/s C | 4 units = 13.6 MW | GE press release. Tower foundations are water reservoirs (70 MWh storage). Record hub height at the time. |
| Bahrain World Trade Center | Manama, Bahrain, 2008 | 3 × 225 kW = 0.675 MW B | 29 m B | — (building is 240 m tall; hub not found) | — | 3 units | Built by Norwin. Rotor from several press reports. Hub and cut-in need the Norwin datasheet. |

## Quartet 3 — Firsts

| Card | Where / year | Rated | Rotor | Hub | Cut-in | Plant | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Vindeby (first offshore farm) | Lolland, Denmark, 1991 | 11 × 450 kW (Bonus B35/450) B | 35 m B | 35 m C (a mirror says 37.5 m) | — | 4.95 MW B | Ørsted: 243 GWh over its life, dismantled 2016/17. |
| Horns Rev 1 | North Sea, Denmark, 2002 | 2 MW (Vestas V80) **A** | 80 m B | 70 m B | 4 m/s C | **160 MW A** (Vattenfall lists 158) | Ørsted / Danish Energy Agency document: 80 × V80 at 2 MW, four times the largest farm built before. Cut-in value is from a database V80 variant. |
| Block Island | Rhode Island, USA, 2016 | 6 MW (Haliade 150-6MW) B | 150 m (150.8 in a database) B | 100 m C | **3 m/s** B (GE brochure) | 30 MW B | First US offshore wind farm. |
| Hywind Scotland | off Peterhead, Scotland, 2017 | 6 MW **A** | **154 m A** (Equinor) | ~98 m, **derived** (253 m base-to-tip, 78 m submerged) | — | **30 MW A** | First floating farm. Depth 95–120 m. Masdar and Equinor fact sheets. Equinor does not publish a hub height. |

## Quartet 4 — Emerging Markets (Africa, Australia, India)

| Card | Where / year | Rated | Rotor | Hub | Cut-in | Plant | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Lake Turkana | Kenya, 2018 | 0.85 MW (V52) **A** | 52 m **A** | 44 m B | **4 m/s A** | 310.25 MW B (365 units) | Cut-in, nominal 16 m/s and cut-out 25 m/s read in the Vestas V52-850 kW brochure. Largest wind farm in Africa. |
| Hornsdale | South Australia, 2016–17 | 3.2 MW (SWT-3.2-113) B | 113 m B | **conflict**: 79.5 m (database range) vs 92 m (Power Technology) C | 2.5–3 m/s **conflict** C | 316.8 MW nameplate B (99 units; "315" and "309" also quoted) | Needs the Siemens Gamesa datasheet. |
| MacArthur | Victoria, Australia, 2013 | 3 MW (V112-3.0) B | 112 m B | 84 m (type certificate) vs 85 m (Wikipedia) B | 3 m/s B (rated 12 m/s) | 420 MW B (140 units) | One catalogue says 3.5/4 m/s for the offshore variant, ignored here. |
| Suzlon S144-140 | Gujarat, India, 2024 | 3.0–3.15 MW B | 144 m B | 140 m (up to 160) B | 3.0 m/s C (reseller listing) | **unconfirmed**: first major order was for Juniper Green, Gujarat | Order announced, first installation not confirmed. This is the weakest card in the quartet. |

## Quartet 5 — North American Prairies

| Card | Where / year | Rated | Rotor | Hub | Cut-in | Plant | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Horse Hollow (GE 1.5sle) | Texas, 2005–06 | 1.5 MW B | 77 m B | 80 m (85 m also quoted) B | **3.5 m/s** B | **735.5 MW A** (NextEra fact sheet: 291 × GE 1.5 + 130 × Siemens 2.3) | Rated wind 12 m/s. |
| Roscoe (Mitsubishi MWT-1000A) | Texas, 2008–09 | 1 MW B | 61.4 m B | — (a sale listing says 69 m tower) | 3 or 4 m/s **conflict** C | 781.5 MW, 627 turbines B | Mixed farm: 209 + 197 Mitsubishi 1 MW, 55 Siemens 2.3, 166 GE 1.5. |
| Shepherds Flat (GE 2.5-100) | Oregon, 2012 | 2.5 MW B | 100 m B | 75 / 85 m options B | **3 m/s** B (GE brochure) | **845 MW A** (338 units, GE press) | |
| Wolfe Island (SWT-2.3-93) | Ontario, 2009 | 2.3 MW **A** | 93 m (inferred from the model name; one database says 101 m) C | **80 m A** (TransAlta) | — | **197.8 MW A** (86 units) | Operator describes 86 × SWT-2.3-93 on 80 m towers. |

## Quartet 6 — Islands & Edges

| Card | Where / year | Rated | Rotor | Hub | Cut-in | Plant | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Ross Island (Antarctica) | Crater Hill, 2009–10 | 3 × 330 kW = 0.99 MW B | ~33 m C | "37 m" (unclear if hub or tip) C | 3.0 m/s C | 0.99 MW | Three Enercon E33. Being replaced by EWT DW54X 1 MW cold-climate turbines. |
| El Hierro (Gorona del Viento) | Canary Islands, 2014 | 2.3 MW (E-70) B | — | — | — | **11.5 MW A** (Enercon reference, 5 × E-70) | Wind plus pumped hydro. Rotor/hub need the Enercon E-70 E4 data sheet. |
| Samsø Offshore | Denmark, 2003 | 2.3 MW (Bonus B82/2300) B | 82.4 m B | **61.2 m** B (Danish Energy Agency) | 3.5 m/s C | 23 MW B (10 units) | One unit replaced with a Siemens SWT-2.3-93. Licence extended to 2037 in June 2025. |
| Burradale (Shetland) | Scotland, 2000/2003 | 0.66 MW (V47) B | 47 m B | ~45 m C | "4" (unit unclear) C | 3.68 MW B (3 × V47 + 2 × V52) | Reported load factor around 57% (Viking Energy). Mixed turbine models. |

## Quartet 7 — Giants Under Test (2025 prototypes)

| Card | Where / year | Rated | Rotor | Hub | Cut-in | Plant | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Siemens Gamesa SG 21.5-276 DD | Østerild, Denmark, 2025 | 21.5 MW B | 276 m B | 160–170 m **unofficial** C | — | 1 unit | Final blades installed 2 April 2025. DNV-certified prototype until 2027. |
| MingYang MySE 16.0-242 | China | 16 MW B | 242 m B | ~143 m **derived** (264 m tip − 121 m) | — | 1 unit | Status unclear: one database still lists it as under development. |
| CRRC Qihang 20 MW | Dongying, China, Jan 2025 | 20 MW B | 260 m B | **151 m** B | — | 1 unit | Floating-class prototype (offshoreWIND.biz). |
| Dongfang / Huaneng 17 MW | Fujian, China, 2025 | 17 MW B | 262 m B | — | — | 1 unit | Nacelle rolled out July 2025. Installation not reported. |

Most of this quartet has no public cut-in speed and several have no hub height.

## Quartet 8 — Early European Offshore (2000–2013)

| Card | Where / year | Rated | Rotor | Hub | Cut-in | Plant | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Middelgrunden | Copenhagen, 2000/01 | 2 MW (Bonus) B | 76 m B | 64 m B | — | 40 MW B (20 units) | 50% owned by a cooperative with 8,500 members. |
| Alpha Ventus | Germany, 2010 | 5 MW (REpower 5M; also 6 × Areva M5000) B | 126 m (REpower 5M); 116 m (M5000) B | — | — | 60 MW B | First German offshore farm, 45 km from Borkum, 30 m depth. |
| Thornton Bank | Belgium, 2009–2013 | 6.15 MW (Senvion 6.2M126, phases 2–3) B | 126 m B | — | — | 325.2 MW B | Phase 1 was 6 × REpower 5M, 30 MW. |
| Anholt | Kattegat, Denmark, 2013 | 3.6 MW (SWT-3.6-120) B | 120 m B | — ("141.6 m" quoted, unclear) | — | 399.6 MW B (111 units) | 14–19 m water depth. |

## Coverage summary

| Stat | Found | Tier A or B | Tier C only | Missing |
| --- | --- | --- | --- | --- |
| Rated power | 32 / 32 | most | Smith-Putnam (disputed) | none |
| Rotor diameter | 31 / 32 | most | Gedser, Ross Island, Wolfe Island | El Hierro |
| Hub height | 25 / 32 | about 14 | about 11 (incl. Hywind and MySE derived, SG unofficial) | 7 (Bahrain, Roscoe, El Hierro, Dongfang 17, Alpha Ventus, Thornton, Anholt) |
| Cut-in speed | 18 / 32 | 6 (Lake Turkana, 4R, Block Island, MacArthur, Horse Hollow, Shepherds Flat) | 12 | 14 |
| Plant capacity | 32 / 32 | most | Suzlon (farm unconfirmed) | none |

Photos: resolved, see "Photos and licences" below.

## Decision (2026-11-15): option 2, with first-power year as deck 2's fifth stat

Deck 2 compares rated power, rotor diameter, hub height, **first-power year (older wins)** and plant
capacity. Swept area was rejected because it ranks exactly like rotor diameter, and tip height because
7 cards have no hub height. Year is documented for all 32 cards and needs no new data field (cards already
carry `year`). The stat is configured per deck in `src/shared/decks.ts`, so it is easy to swap.

Still open before deck 2 can ship: **hub height for 7 cards** (Bahrain, Roscoe, El Hierro, Dongfang 17,
Alpha Ventus, Thornton Bank, Anholt), **rotor diameter for El Hierro**, a Suzlon S144 flagship plant,
and photos with licences.

## Final lineup as shipped, and how the gaps were closed

The tables above are the original candidate research. The shipped deck (`src/data/turbines/9A`–`16D`)
differs in a few places, and every open gap was resolved as follows.

**Lineup changes**
- **Bahrain World Trade Center → Charles Brush's 1888 windmill (9A).** Bahrain's turbine heights are not
  documented anywhere reliable. Brush's 144-blade, 12 kW, 17 m machine is well documented and is the oldest
  card in the game. Tvindkraft moved from Pioneers to Odd Designs.
- **MingYang MySE 16.0-242 → GE Haliade-X 12 MW prototype, Rotterdam (15B).** MySE has no documented
  first-power date (launched 2021, installation never confirmed). Haliade-X produced its first kWh on
  7 November 2019 (GE press release).
- **Suzlon S144 (12D)** now uses the Gondal prototype (160 m hybrid lattice-tubular tower) instead of an
  unconfirmed customer order. Year 2023 is approximate (certified November 2023).
- **El Hierro, Thornton Bank and Anholt were replaced** because their operators publish no hub height. The
  replacements all have a published hub height: **Húsahagi, Faroe Islands (14B)**: 13 × Enercon E-44, 900 kW, rotor
  44 m, hub 44 m, 11.7 MW, 2014 (Ingeniøren, the Danish technical press); **Kentish Flats (16C)**: 30 × Vestas V90-3.0,
  hub 70 m, rotor 90 m, 90 MW, 2005 (Vattenfall for the farm; two independent secondary sources agree on the
  turbine size); **Horns Rev 2 (16D)**: 91 × Siemens SWT-2.3-93, hub 68 m, rotor 93 m, 209 MW, 2009.
- **Quartet 7 and 16 are renamed** "Giants Under Test" and "North Sea Builders" in the game.

**Hub heights and other gaps, by card (final)**

Values marked **≈** are shown with "≈" in the game (card and detail) and carry a tooltip, because they are
derived, typical for the model, or from a single source. They are flagged in each card's `approximateStats`.

| Card | Value | Basis | Shown as |
| --- | --- | --- | --- |
| Hywind Scotland (11D) | hub 103 m | Siemens announcement: "hub height of 103 meter" (Equinor's fact sheet says 98 m, Wikipedia 101 m) | exact |
| Alpha Ventus (16B) | hub 92 m | Offshore-Stiftung page: 92 m from hub to water surface | exact |
| Roscoe (13B) | hub 69 m | Plant listings (infrasure.ai, gridinfo.com) give 69 m for the Roscoe turbines | exact |
| Hornsdale (12B) | hub 92 m | Power Technology: towers 92 m for all three stages | exact |
| Dongfang 17 MW (15D) | hub 152 m | Xinhua: "轮毂中心高度约152米" (about 152 m) | ≈ |
| SG DD-276 (15A) | hub 170 m | Danish press (DR): a 170 m tower; no official hub height | ≈ |
| Haliade-X 12 MW (15B) | hub 150 m | TNO: "approximately 150-metre high tower"; GE gives a 260 m tip height | ≈ |
| Block Island (11C) | hub 100 m | Database value for the Haliade 150-6MW | ≈ |
| Horse Hollow (13A) | hub 80 m | GE 1.5sle offers 80 or 85 m; one listing says 85 m | ≈ |
| Shepherds Flat (13C) | hub 85 m | GE 2.5-100 offers 75 or 85 m | ≈ |
| Ross Island (14A) | hub 37 m, rotor 33 m | "37 m-high" turbines (hub or tip not stated); E33 rotor from the model | ≈ |
| Burradale (14D) | hub 45 m | One listing's average across V47 and V52 | ≈ |
| Gedser (9C) | hub 25 m | Tower height 25 m in Wikipedia's Juul and Gedser articles; rotor 24 m from Wind-Works | exact |
| Vindeby (11A) | hub 35 m | Database (a mirror says 37.5 m) | ≈ |
| Growian (9D) | hub 100 m | NASA's translation of the GROWIAN final report (TM-75404) lists tower height 100 m (one German article says 96 m) | exact |
| Smith-Putnam (9B) | rated 1.25 MW | Sources give 1.0, 1.25 and 1.5 MW | ≈ |
| Suzlon S144 (12D) | year 2023 | Prototype reported installed by November 2023; no exact commissioning date | ≈ |

Rated power, rotor diameter, plant capacity and year are documented for every other card. First-power year
replaces cut-in speed in this deck, so the previously missing cut-in values no longer matter. Cards whose operators publish no hub height were replaced (see above), so no hub height in the deck is a guess
with no source; the remaining ≈ values are documented as approximate.

## Photos and licences

All real photos in the game, for both decks, were re-sourced from Wikimedia Commons because none of the
photos shipped before had a recorded source or licence. They were found with the Commons API, filtered to
free licences (CC0, public domain, CC BY, CC BY-SA; non-commercial and no-derivatives were excluded), checked
by eye, and downloaded at 1100 px wide. Author, licence, licence URL, Commons page and a SHA-256 of the shipped
file are in `src/data/photoCredits.ts`; a readable list is in [`../PHOTO_CREDITS.md`](../PHOTO_CREDITS.md).
`tests/photoCredits.test.ts` fails if an image has no credit, a non-free licence, or does not match its hash.

- **35 real photos** are used. The old, unattributed files were deleted (including two unused leftovers).
- **No free photo exists on Commons** (under several searches) for these cards, which therefore show Rotor
  Clash's own concept illustration and say so in the card detail: Vestas 4R (10B), GE hybrid tower at Gaildorf
  (10C; the only free photo was a construction site), Vindeby (11A), Lake Turkana (12A; the free photo showed a
  site camp, not turbines), Hornsdale (12B), Macarthur (12C), Suzlon S144 (12D), Horse Hollow (13A), Ross Island
  (14A), Samsø (14C), Horns Rev 2 (16D), SG DD-276 (15A), CRRC 20 MW (15C), Dongfang 17 MW (15D), plus deck-1 cards Kincardine (4C)
  and Hornsea 2 (6A; the only free photo was almost empty sea).
- Where a farm photo shows a similar machine rather than the exact model (for example the Skabersjö V90 for
  the Thanet card), the card still names the right plant and model; the photo is illustrative.
- The concept images (`fallback_*`) and every other image in `src/assets/images/` are **AI-generated**: each file embeds
  C2PA Content Credentials signed by "Google C2PA Media Services" with source type `trainedAlgorithmicMedia`. They are
  documented in `src/data/projectImages.ts`, labelled "AI concept image" in the game, and the project owner
  confirmed their use, provided the game's description says they are AI-generated (it does).

## Original options (for the record)

Cut-in is the stat that is both least documented and, for the historic and prototype cards, the one a
player would never expect to be exact. Options:

1. **Finish the datasheet pass** for the 14 cards missing cut-in. Needs manufacturer PDFs that were
   not reachable here (many were scanned or paywalled). Slow, and some cards (Smith-Putnam, Bahrain, Alpha Ventus)
   may have none.
2. **Replace cut-in with a derived stat for deck 2**, e.g. swept area (π × (rotor/2)², always available)
   or total tip height (hub + rotor/2). Needs the stat list to become per-deck: stat keys, i18n labels,
   strength-bar scaling and bot normalization.
3. **Allow tier-C values with a visible "approx." marker** on the card. Cheapest, but weakens the
   "verified specs" promise in AGENTS.md.

Recommended: option 2 if you want deck 2 soon, option 1 if you want it to stay identical to deck 1.

## Notes for the 64-card "Grand Tour" mode

- **Pool:** 64 cards, 16 quartets (groups 1–16), 32 cards each.
- **Alternative that keeps match length:** "Mixed Deck". Each match uses 8 random whole quartets drawn from the
  16, so a match is still 32 cards and about 24 rounds. Cheaper to build and easier to balance than the full pool.
- **Grand Tour length:** with 32 cards each, the round limit (now 24) should rise to roughly 48, and the
  turn timer matters more. Recommend friend rooms and robot games first, no ELO until the length is tuned.
- **Engine changes:** `matchEngine.ts` deals `slice(0,16)/(16,32)`; the client bot already splits the
  deck in half. Quartet progress shows "/8" in three UI places and "/ 8D" in the card detail.
- **IDs:** keep "1A–8D" for deck 1 and use "9A–16D" for deck 2 so the existing quartet logic (4 cards per group id) works unchanged.
- **Stat scaling:** deck 2 spans a 24 m to 276 m rotor and 0.2 MW to 21.5 MW, so bars, bot stat choice
  and `statStrengthPercent` need per-pool ranges.

## Sources

Primary or near-primary:
- [Tvindkraft, official site](https://www.tvindkraft.dk/what-is-tvindkraft-a-pioneer-of-wind-energy/)
- [Hydro-Québec: wind power history (Éole)](https://hydroquebec.com/learning/eolienne/historique-eolien-hydro-quebec.html)
- [Vestas 4R-V29, Wind Energy Science (Copernicus)](https://wes.copernicus.org/articles/4/251/2019/)
- [GE and Max Bögl: Gaildorf press release](https://www.ge.com/news/press-releases/ge-and-max-bögl-install-worlds-tallest-wind-turbine-integrated-pumped-storage-hydro)
- [Vestas V52-850 kW product brochure (read via local PDF extraction)](https://media.mwps.world/static/2020/10/vestas-v52-productbrochurev52_uk.pdf)
- [Horns Rev 1, Danish Energy Agency document](https://ens.dk/media/7639/download)
- [Horns Rev 1, Vattenfall](https://powerplants.vattenfall.com/en/horns-rev)
- [Hywind Scotland fact sheet (Masdar)](https://masdar.ae/-/media/corporate/projects/downloads/hywind/hywind-scotland_upd.pdf)
- [Hywind Scotland, Equinor](https://www.equinor.com/energy/hywind-scotland)
- [GE Haliade 150-6MW brochure](https://gevernova.com/wind-power/sites/default/files/2020-01/wind-offshore-haliade-wind-turbine.pdf)
- [Enercon El Hierro reference](https://www.enercon.de/en/references/el-hierro)
- [Samsø, Danish Energy Agency](https://ens.dk/media/2563/download)
- [Wolfe Island, TransAlta brochure](https://transalta.com/sites/default/files/WolfeIslandBrochure_2010.pdf)
- [Horse Hollow, NextEra fact sheet](https://www.nexteraenergyresources.com/content/dam/neer/us/en/pdf/portfolio/horsehollow.pdf)
- [GE 2.5 MW brochure](https://pl.wind-turbine.com/cms/storage/uploads/2021/11/16/327gea17007a-wind25brochure_x_1332153369_x__uid_6193dac669ade.pdf)
- [Offshore wind turbines in 2025 (offshoreWIND.biz)](https://www.offshorewind.biz/2026/01/01/offshore-wind-turbines-in-2025-china-continues-leading-in-single-unit-capacity-vestass-15-mw-turbine-installed-at-offshore-wind-farms/)
- [Smith-Putnam 1.5 MW turbine (ETHW)](https://ethw.org/Palmer_Putnam's_1.5_MW_Wind_Turbine)

Secondary (used for tier B/C values):
- [Smith-Putnam rating dispute (wind-works.org)](https://wind-works.org/beating-a-dead-horse-more-on-smith-putnams-1000-kw-rating/)
- [History of conventional wind turbines (wind-works.org)](https://wind-works.org/the-rest-of-the-story-part-2-of-history-of-conventional-wind-turbines-the-1970s-onward/)
- [Growian (Wikipedia)](https://en.wikipedia.org/wiki/Growian)
- [Éole datasheet (wind-turbine-models.com)](https://en.wind-turbine-models.com/turbines/1981-shawingan-lavalin-cap-chat-vawt)
- [Vestas V29 (NREL turbine-models)](https://nrel.github.io/turbine-models/VestasV29_225kW_29.html)
- [Lake Turkana Wind Power (Power Technology)](https://www.power-technology.com/projects/lake-turkana-wind-power-project-loyangalani/)
- [Hornsdale (The Wind Power)](https://www.thewindpower.net/windfarm_en_24056_hornsdale-wind-farm.php)
- [Hornsdale (Power Magazine)](https://www.powermag.com/a-wind-experiment-the-hornsdale-wind-farm/)
- [MacArthur (The Wind Power)](https://www.thewindpower.net/windfarm_en_17489_macarthur-wind-farm.php)
- [Suzlon S144 (The Wind Power)](https://www.thewindpower.net/turbine_en_1918_s144-3000.php)
- [Ross Island Wind Farm (Wind Energy NZ)](https://windenergy.org.nz/ross-island-wind-farm)
- [Roscoe Wind Farm (Power Technology)](https://power-technology.com/projects/roscoe-wind-farm/)
- [Siemens Gamesa 21.5 MW (POWER Magazine)](https://www.powermag.com/siemens-gamesa-installs-worlds-most-powerful-wind-turbine-at-denmark-test-site)
- [MingYang MySE 16.0-242 (CNBC)](https://www.cnbc.com/amp/2021/08/23/chinese-firm-announces-giant-264-meter-tall-offshore-wind-turbine.html)
- [Middelgrunden (Power Technology)](https://power-technology.com/?p=9900)
- [Alpha Ventus (Offshore Stiftung)](https://www.offshore-stiftung.de/en/alpha-ventus)
- [Thornton Bank (C-Power, TETHYS)](https://tethys.pnnl.gov/sites/default/files/publications/C-Power-2012.pdf)
- [Anholt (TETHYS)](https://tethys.pnnl.gov/wind-project-sites/anholt-offshore-wind-farm)

## Round 2 replacements (2026-11-15): five of ten "≈" cards swapped

| Card | Replaced | New card | Figures and source | Confidence |
|---|---|---|---|---|
| 9B | Smith-Putnam (rating disputed 1.0–1.5 MW) | NASA Mod-0, Plum Brook, 1975 | 100 kW, rotor 125 ft (38.1 m), tower 100 ft (30.5 m): [OSTI 5252397](https://www.osti.gov/biblio/5252397), NASA NTRS 19750021473 | High |
| 12D | Suzlon S144 (year approximate) | Siemens SWT-2.3-101, Jeffreys Bay, 2014 | 60 × 2.3 MW = 138 MW, hub 80 m, rotor 101 m, all 60 commissioned May 2014: [Engineering News](https://www.engineeringnews.co.za/article/all-60-jeffreys-bay-wind-farm-turbines-commissioned-2014-05-09) | Medium-high (one source says rotor 100 m) |
| 15A | SG DD-276 (hub approximate) | Enercon E-112, Egeln, 2002 | 4.5 MW, rotor 112.8 m, hub 124 m: [Enercon datasheet copy](https://offshore-wind.de/media/article000279/E112.pdf) | Medium (a database lists 114 m for the later rotor) |
| 15B | Haliade-X (hub approximate) | Vestas V164-8.0 MW prototype, Østerild, 2014 | 8 MW, rotor 164 m, hub 140 m, first power 28 Jan 2014: [offshoreWIND.biz](https://www.offshorewind.biz/2014/01/28/worlds-most-powerful-wind-turbine-produces-power/) | High |
| 15D | Dongfang 17 MW (hub approximate) | Enercon E-126 prototype, Emden, 2007 | 6 MW at install (uprated to 7.58 MW in 2009), rotor 126 m, hub 135 m: [Wikipedia](https://en.wikipedia.org/wiki/Enercon_E-126) | Medium (single table; Emden site not confirmed in the search results) |

Still flagged "≈" after this round, because no candidate had a fully published hub height: 11A Vindeby (hub 35 m, conflicts with a 33 m record), 13A Horse Hollow, 13C Shepherds Flat, 14A Ross Island, 14D Burradale.
Candidates checked and rejected: Nibe B (no hub), Blyth (hub 62 m vs 40 m), Ashegoda (no hub or rotor), Judith Gap (hub and rotor from one site), Fowler Ridge (mixed phases), Cabeólica and Huxley Hill (no hub), Tunø Knob (45 m may be tip height), Utgrunden and Tilos (no hub), REpower 5M (databases conflict), Thanet (single listing).
Cards 9B, 12D, 15A, 15B and 15D use concept art until a Commons photo is licensed. The Smith-Putnam and Haliade-X photos stay in `src/assets/images/real/` with their credits.
