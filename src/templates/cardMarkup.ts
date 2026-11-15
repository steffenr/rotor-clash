import { iconSvg } from './icons';

export interface CardRenderOptions {
  compact?: boolean;
  playfulHover?: boolean;
  selectableExpr?: string;
  selectedStatExpr?: string;
  highlightOutcomeExpr?: string;
  onSelectStatHandler?: string;
  /** In-match phone layout: hide photo, lighthouse diagram and source link so the stats are the first thing visible. */
  hideMediaOnMobile?: boolean;
  /** Alpine expression for the match's deck mode; in a match all cards are compared on one stat set. */
  statModeExpr?: string;
}

export function renderTurbineCard(cardExpr: string, opts: CardRenderOptions = {}): string {
  const {
    compact = false,
    playfulHover = false,
    selectableExpr = 'false',
    selectedStatExpr = 'null',
    highlightOutcomeExpr = 'null',
    onSelectStatHandler = '',
    hideMediaOnMobile = false,
    statModeExpr = 'null',
  } = opts;
  const mobileHide = hideMediaOnMobile ? 'max-sm:hidden' : '';

  const widthClass = compact ? 'w-full max-w-[308px]' : 'w-full max-w-[356px]';
  const photoHeightClass = compact ? 'h-28' : 'h-32';
  const hoverClass = playfulHover ? 'hover:-translate-y-1' : '';

  const rowClassExpr = `statRowClass(stat.key, ${selectableExpr}, ${selectedStatExpr}, ${highlightOutcomeExpr})`;

  const statInner = `
    <div class="w-full space-y-1">
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-1.5 min-w-0">
          <span
            class="inline-flex items-center justify-center w-5 h-5 rounded shrink-0 border border-c-ink/15"
            :style="'background-color:' + (stat.higherWins ? 'var(--c-sand)' : 'var(--c-peach)') + '; color:' + (stat.higherWins ? 'var(--c-ink)' : 'var(--c-orange-deep)')"
            :title="stat.higherWins ? t.card.higherWins : t.card.lowerWins"
          >
            <span x-show="stat.key === 'ratedPowerMw'">${iconSvg('zap', 'w-3.5 h-3.5')}</span>
            <span x-show="stat.key === 'rotorDiameterM'">${iconSvg('disc', 'w-3.5 h-3.5')}</span>
            <span x-show="stat.key === 'hubHeightM'">${iconSvg('arrow-up-from-line', 'w-3.5 h-3.5')}</span>
            <span x-show="stat.key === 'cutInWindMs'">${iconSvg('wind', 'w-3.5 h-3.5')}</span>
            <span x-show="stat.key === 'firstPowerYear'">${iconSvg('clock', 'w-3.5 h-3.5')}</span>
            <span x-show="stat.key === 'plantCapacityMw'">${iconSvg('factory', 'w-3.5 h-3.5')}</span>
          </span>
          <span class="text-xs font-bold truncate" x-text="t.stats[stat.key].label"></span>
          <span
            x-show="!stat.higherWins"
            class="text-[10px] font-bold text-c-orange-deep inline-flex items-center gap-0.5 shrink-0"
          >
            ${iconSvg('arrow-down', 'w-2.5 h-2.5')}
            <span x-text="lang === 'de' ? 'Niedriger' : 'Min'"></span>
          </span>
        </div>
        <div class="flex items-baseline gap-1 shrink-0">
          <span
            class="font-mono tabular-nums text-sm font-bold text-c-ink"
            x-text="formatStatValue(stat.key, ${cardExpr}.stats[stat.key])"
          ></span>
          <span
            class="text-[11px] font-semibold text-c-ink-2 min-w-[1.5rem] text-right"
            x-text="stat.unit"
          ></span>
        </div>
      </div>
      <div class="h-1.5 w-full rounded-full bg-c-sand overflow-hidden border border-c-ink/10">
        <div
          class="h-full rounded-full transition-all duration-300"
          :style="'width:' + statStrengthPercent(stat.key, ${cardExpr}.stats[stat.key]) + '%; background-color:' + (stat.higherWins ? cardTheme(${cardExpr}).bar : 'var(--c-orange)')"
        ></div>
      </div>
    </div>
  `;

  return `
    <template x-if="${cardExpr}">
      <article
        class="relative flex flex-col rounded-2xl bg-c-paper-hi text-c-ink border-[2.5px] border-c-ink shadow-[0_5px_0_var(--c-line)] overflow-hidden transition-transform duration-200 ${widthClass} ${hoverClass}"
      >
      <!-- Category Color Crest Band -->
      <div class="h-1.5 w-full shrink-0" :style="'background-color:' + cardTheme(${cardExpr}).border"></div>

      <!-- Explorer Header with Harbor-Ink Stamped Quartet Seal -->
      <div class="px-3.5 pt-2.5 pb-2.5 bg-c-paper border-b-2 border-c-ink/15 flex items-start gap-2.5">
        <div
          :style="'background-color:' + cardTheme(${cardExpr}).stampBg + '; color:' + cardTheme(${cardExpr}).stampText"
          class="w-10 h-10 rounded-full shrink-0 flex items-center justify-center font-mono font-bold text-sm border-2 border-c-ink shadow-[0_2px_0_var(--c-line)]"
          :title="groupName(${cardExpr}.groupId)"
          x-text="${cardExpr}.id"
        ></div>

        <div class="min-w-0 flex-1">
          <div class="flex items-center justify-between gap-1.5">
            <span
              class="text-[11px] font-bold truncate"
              :style="'color:' + cardTheme(${cardExpr}).border"
              x-text="groupName(${cardExpr}.groupId)"
            ></span>
            <div class="flex items-center gap-1.5 shrink-0">
              <span class="font-mono tabular-nums text-[11px] font-semibold text-c-ink-3" x-text="${cardExpr}.year"></span>
              <button
                type="button"
                @click="inspectCard(${cardExpr})"
                :title="t.card.fullView"
                :aria-label="t.card.fullView + ': ' + ${cardExpr}.modelName"
                class="${hideMediaOnMobile ? 'max-sm:hidden' : ''} w-8 h-8 -my-1 -mr-1 rounded-md bg-c-paper-hi hover:bg-c-sky border border-c-ink/35 text-c-ink flex items-center justify-center transition-colors"
              >
                ${iconSvg('maximize', 'w-3.5 h-3.5')}
              </button>
            </div>
          </div>

          <h3
            class="font-display text-base sm:text-lg font-extrabold leading-snug text-c-ink truncate"
            :title="${cardExpr}.modelName"
            x-text="${cardExpr}.modelName"
          ></h3>

          <div class="text-[11px] text-c-ink-2 truncate">
            <span class="font-bold text-c-ink" x-text="${cardExpr}.manufacturer"></span>
            <span aria-hidden="true"> · </span>
            <span x-text="cardLocale(${cardExpr}).country"></span>
          </div>
        </div>
        ${
          hideMediaOnMobile
            ? `<!-- Phone-only thumbnail: keeps the field photo without pushing the stats down -->
        <button
          type="button"
          @click="inspectCard(${cardExpr})"
          :aria-label="t.card.fullView + ': ' + ${cardExpr}.modelName"
          class="sm:hidden shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 border-c-ink/30 bg-c-sand-soft"
          x-data="{ imgFailed: false }"
          x-effect="void (${cardExpr}?.id); imgFailed = false"
        >
          <img
            x-show="!imgFailed"
            :src="photoUrl(${cardExpr})"
            alt=""
            referrerpolicy="no-referrer"
            @error="imgFailed = true"
            class="h-full w-full object-cover"
          />
          <span x-show="imgFailed" class="h-full w-full flex items-center justify-center text-c-teal">${iconSvg('wind', 'w-6 h-6')}</span>
        </button>`
            : ''
        }
      </div>

      <!-- Mounted Field Photo + Coastal Sky Arch Lighthouse Scale Diagram -->
      <div class="px-3.5 pt-3 pb-2 grid grid-cols-12 gap-2.5 items-stretch bg-c-paper-hi ${mobileHide}">
        <div
          class="col-span-8 bg-c-paper p-1 rounded-xl border-2 border-c-ink/25 shadow-sm flex flex-col"
          x-data="{ imgFailed: false }"
          x-effect="void (${cardExpr}?.id); imgFailed = false"
        >
          <div class="relative w-full overflow-hidden rounded-lg bg-c-sand-soft ${photoHeightClass}">
            <img
              x-show="!imgFailed"
              :src="photoUrl(${cardExpr})"
              :alt="${cardExpr}.modelName + ' (' + ${cardExpr}.flagshipPlant + ')'"
              referrerpolicy="no-referrer"
              @error="imgFailed = true"
              class="h-full w-full object-cover"
            />
            <div
              x-show="imgFailed"
              class="h-full w-full bg-gradient-to-br from-c-sky to-c-paper flex flex-col items-center justify-center text-c-teal p-2 text-center"
            >
              ${iconSvg('wind', 'w-7 h-7 mb-1')}
              <span class="text-[11px] font-semibold leading-tight" x-text="${cardExpr}.modelName"></span>
            </div>
            <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-c-ink/85 via-c-ink/40 to-transparent px-2 py-1.5 text-white">
              <div class="text-[10px] font-semibold leading-tight truncate" x-text="${cardExpr}.flagshipPlant"></div>
              <div class="text-[9px] text-white/85 truncate" x-text="${cardExpr}.flagshipLocation"></div>
            </div>
          </div>
        </div>

        <div
          class="col-span-4 rounded-t-[2.25rem] rounded-b-xl border-2 border-c-ink bg-gradient-to-b from-[#2A86A8] via-[#B4DFEF] to-[#EDF6F9] p-1.5 flex flex-col items-center justify-between text-center overflow-hidden shadow-inner"
          :title="lighthouseTooltip(${cardExpr})"
        >
          <svg viewBox="0 0 72 84" class="w-full h-24 overflow-visible" aria-hidden="true">
            <!-- Soft Sea Horizon & Coastal Meadow Bluff -->
            <rect x="0" y="72" width="72" height="12" fill="#1E7898" opacity="0.35" />
            <path d="M0 76 Q20 71 42 74 Q58 68 72 72 L72 84 L0 84 Z" fill="#5F7A3A" />
            <line x1="2" y1="76" x2="70" y2="76" stroke="#173240" stroke-width="1.2" opacity="0.55" />

            <!-- Wind Turbine (Cream with Harbor Navy Ink Stroke) -->
            <line
              x1="27"
              y1="76"
              x2="27"
              :y2="cardHubY(${cardExpr})"
              stroke="#173240"
              stroke-width="3.6"
              stroke-linecap="round"
            />
            <line
              x1="27"
              y1="76"
              x2="27"
              :y2="cardHubY(${cardExpr})"
              stroke="#FAF4E4"
              stroke-width="1.8"
              stroke-linecap="round"
            />
            <circle
              cx="27"
              :cy="cardHubY(${cardExpr})"
              :r="cardBladeLen(${cardExpr})"
              fill="none"
              stroke="#173240"
              stroke-width="0.9"
              stroke-dasharray="2.5 2"
              opacity="0.45"
            />
            <g stroke="#173240" stroke-width="2.6" stroke-linecap="round">
              <line x1="27" :y1="cardHubY(${cardExpr})" x2="27" :y2="cardHubY(${cardExpr}) - cardBladeLen(${cardExpr})" />
              <line x1="27" :y1="cardHubY(${cardExpr})" :x2="27 + cardBladeLen(${cardExpr}) * 0.866" :y2="cardHubY(${cardExpr}) + cardBladeLen(${cardExpr}) * 0.5" />
              <line x1="27" :y1="cardHubY(${cardExpr})" :x2="27 - cardBladeLen(${cardExpr}) * 0.866" :y2="cardHubY(${cardExpr}) + cardBladeLen(${cardExpr}) * 0.5" />
            </g>
            <g stroke="#FAF4E4" stroke-width="1.2" stroke-linecap="round">
              <line x1="27" :y1="cardHubY(${cardExpr})" x2="27" :y2="cardHubY(${cardExpr}) - cardBladeLen(${cardExpr})" />
              <line x1="27" :y1="cardHubY(${cardExpr})" :x2="27 + cardBladeLen(${cardExpr}) * 0.866" :y2="cardHubY(${cardExpr}) + cardBladeLen(${cardExpr}) * 0.5" />
              <line x1="27" :y1="cardHubY(${cardExpr})" :x2="27 - cardBladeLen(${cardExpr}) * 0.866" :y2="cardHubY(${cardExpr}) + cardBladeLen(${cardExpr}) * 0.5" />
            </g>
            <circle cx="27" :cy="cardHubY(${cardExpr})" r="2.6" fill="#FAF4E4" stroke="#173240" stroke-width="1.4" />

            <!-- 45m Striped Beacon Orange & Cream Coastal Lighthouse -->
            <g>
              <polygon points="53,74 62,74 60,57 55,57" fill="#F15A24" stroke="#173240" stroke-width="1.1" />
              <rect x="55.3" y="61" width="4.4" height="3.2" fill="#FAF4E4" />
              <rect x="54.6" y="67" width="5.8" height="3.2" fill="#FAF4E4" />
              <rect x="55.8" y="54" width="3.4" height="3" fill="#FAF4E4" stroke="#173240" stroke-width="0.9" />
              <polygon points="54.8,54 60.2,54 57.5,51" fill="#173240" />
            </g>
          </svg>
          <span
            class="font-mono tabular-nums text-[9px] font-bold text-c-ink bg-c-paper/95 px-1.5 py-0.5 rounded border border-c-ink/35 leading-none"
            x-text="${cardExpr}.stats.hubHeightM + 'm / 45m'"
          ></span>
        </div>
      </div>

      <!-- 5 Kid-Friendly Stat Rows -->
      <div class="px-3.5 pb-3 pt-1 flex flex-col gap-1.5 bg-c-paper-hi">
        <template x-for="stat in statDefsFor(${cardExpr}, ${statModeExpr})" :key="stat.key">
          <div>
            ${
              onSelectStatHandler
                ? `<button
                    x-show="${selectableExpr}"
                    type="button"
                    @click="${onSelectStatHandler}"
                    :class="'w-full min-h-[44px] px-2.5 py-1.5 rounded-xl border text-left transition-all duration-150 ' + ${rowClassExpr}"
                  >
                    ${statInner}
                  </button>
                  <div
                    x-show="!(${selectableExpr})"
                    :class="'w-full min-h-[42px] px-2.5 py-1.5 rounded-xl border flex items-center transition-colors ' + ${rowClassExpr}"
                  >
                    ${statInner}
                  </div>`
                : `<div
                    :class="'w-full min-h-[42px] px-2.5 py-1.5 rounded-xl border flex items-center transition-colors ' + ${rowClassExpr}"
                  >
                    ${statInner}
                  </div>`
            }
          </div>
        </template>
      </div>

      <!-- Field Guide Footer -->
      <div class="px-3.5 py-2 bg-c-paper border-t-2 border-c-ink/15 text-[11px] text-c-ink-2 flex items-center justify-between gap-2">
        <span
          class="font-mono tabular-nums font-semibold truncate"
          x-text="formatNumber(${cardExpr}.sweptAreaM2) + ' m²'"
        ></span>
        <div class="flex items-center gap-3 shrink-0">
          <span class="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-semibold text-c-ink-3">
            ${iconSvg('arrow-up', 'w-2.5 h-2.5')}
            <span x-text="t.card.higherWins"></span>
          </span>
          <a
            :href="${cardExpr}.sourceUrl"
            target="_blank"
            rel="noopener noreferrer"
            :title="${cardExpr}.sourceLabel"
            class="inline-flex items-center gap-1 py-1.5 font-bold text-c-teal hover:text-c-ink hover:underline ${hideMediaOnMobile ? 'max-sm:hidden' : ''}"
          >
            <span x-text="t.card.source"></span>
            ${iconSvg('external-link', 'w-3 h-3')}
          </a>
        </div>
      </div>
      </article>
    </template>
  `;
}

export function renderTurbineCardBack(
  countExpr: string,
  labelExpr: string,
  compact = false
): string {
  const sizeClass = compact
    ? 'w-full max-w-[308px] h-[440px]'
    : 'w-full max-w-[356px] h-[476px]';

  return `
    <div
      class="relative rounded-2xl bg-c-paper border-[2.5px] border-c-ink shadow-[0_5px_0_var(--c-line)] overflow-hidden flex flex-col items-center justify-between p-3 text-center select-none ${sizeClass}"
    >
      <div class="relative w-full h-full rounded-xl overflow-hidden border-2 border-c-ink flex flex-col items-center justify-between py-5 px-4 bg-c-ink">
        <!-- Coastal Teal & Beacon Orange Horizontal Speed Stripes -->
        <div class="absolute inset-x-0 top-1/2 -translate-y-12 pointer-events-none space-y-2 opacity-90" aria-hidden="true">
          <div class="h-2.5 w-full bg-c-teal"></div>
          <div class="h-2.5 w-full bg-c-teal"></div>
        </div>
        <div class="absolute inset-x-0 top-1/2 translate-y-6 pointer-events-none space-y-2 opacity-95" aria-hidden="true">
          <div class="h-2.5 w-full bg-c-orange"></div>
          <div class="h-2.5 w-full bg-c-orange"></div>
        </div>
        <div
          class="absolute inset-2.5 rounded-lg border border-c-paper/30 pointer-events-none"
          aria-hidden="true"
        ></div>

        <div
          class="relative z-10 px-3 py-1 rounded-lg bg-c-paper border-2 border-c-ink text-xs font-bold text-c-ink max-w-full truncate shadow-[0_2px_0_rgba(0,0,0,0.25)]"
          x-text="${labelExpr}"
        ></div>

        <!-- Central Collector Medallion featuring the Rotor Clash Emblem -->
        <div class="relative z-10 w-48 h-48 rounded-full bg-c-paper-hi border-[3px] border-c-ink shadow-[0_4px_0_rgba(0,0,0,0.35)] flex flex-col items-center justify-center p-4">
          <div class="w-full h-full rounded-full border-2 border-dashed border-c-teal/50 flex flex-col items-center justify-center p-2">
            <img
              src="/assets/aistudio/logo_rotor_clash_3a6e5dcc.png"
              alt="Rotor Clash"
              class="w-36 h-auto object-contain"
            />
            <span class="sr-only">ROTOR CLASH</span>
          </div>
        </div>

        <div class="relative z-10 px-4 py-2 rounded-xl bg-c-paper border-2 border-c-ink shadow-[0_2px_0_rgba(0,0,0,0.25)]">
          <span class="font-mono tabular-nums text-xl font-bold text-c-orange" x-text="${countExpr}"></span>
          <span
            class="ml-2 text-xs font-bold text-c-ink"
            x-text="(${countExpr}) === 1 ? t.arena.cardRemaining : t.arena.cardsRemaining"
          ></span>
        </div>
      </div>
    </div>
  `;
}
