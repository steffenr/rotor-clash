import { iconSvg } from './icons';

export interface CardRenderOptions {
  compact?: boolean;
  playfulHover?: boolean;
  selectableExpr?: string;
  selectedStatExpr?: string;
  highlightOutcomeExpr?: string;
  onSelectStatHandler?: string;
}

export function renderTurbineCard(cardExpr: string, opts: CardRenderOptions = {}): string {
  const {
    compact = false,
    playfulHover = false,
    selectableExpr = 'false',
    selectedStatExpr = 'null',
    highlightOutcomeExpr = 'null',
    onSelectStatHandler = '',
  } = opts;

  const widthClass = compact ? 'w-full max-w-[308px]' : 'w-full max-w-[356px]';
  const photoHeightClass = compact ? 'h-28' : 'h-32';
  const hoverClass = playfulHover ? 'hover:-translate-y-1' : '';

  const rowClassExpr = `statRowClass(stat.key, ${selectableExpr}, ${selectedStatExpr}, ${highlightOutcomeExpr})`;

  const statInner = `
    <div class="w-full space-y-1">
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-1.5 min-w-0">
          <span
            class="inline-flex items-center justify-center w-5 h-5 rounded shrink-0"
            :style="'background-color:' + (stat.higherWins ? '#EAE2CF' : '#FFEDD5') + '; color:' + (stat.higherWins ? '#334155' : '#C2410C')"
            :title="stat.higherWins ? t.card.higherWins : t.card.lowerWins"
          >
            <span x-show="stat.key === 'ratedPowerMw'">${iconSvg('zap', 'w-3.5 h-3.5')}</span>
            <span x-show="stat.key === 'rotorDiameterM'">${iconSvg('disc', 'w-3.5 h-3.5')}</span>
            <span x-show="stat.key === 'hubHeightM'">${iconSvg('arrow-up-from-line', 'w-3.5 h-3.5')}</span>
            <span x-show="stat.key === 'cutInWindMs'">${iconSvg('wind', 'w-3.5 h-3.5')}</span>
            <span x-show="stat.key === 'plantCapacityMw'">${iconSvg('factory', 'w-3.5 h-3.5')}</span>
          </span>
          <span class="text-xs font-bold truncate" x-text="t.stats[stat.key].label"></span>
          <span
            x-show="!stat.higherWins"
            class="text-[10px] font-semibold text-[#C2410C] inline-flex items-center gap-0.5 shrink-0"
          >
            ${iconSvg('arrow-down', 'w-2.5 h-2.5')}
            <span x-text="lang === 'de' ? 'Kleiner' : 'Min'"></span>
          </span>
        </div>
        <div class="flex items-baseline gap-1 shrink-0">
          <span
            class="font-mono tabular-nums text-sm font-bold text-[#1F2933]"
            x-text="formatStatValue(stat.key, ${cardExpr}.stats[stat.key])"
          ></span>
          <span
            class="text-[11px] font-semibold text-[#52606D] w-7 text-right"
            x-text="stat.unit"
          ></span>
        </div>
      </div>
      <div class="h-1.5 w-full rounded-full bg-[#E8E0CD] overflow-hidden">
        <div
          class="h-full rounded-full transition-all duration-300"
          :style="'width:' + statStrengthPercent(stat.key, ${cardExpr}.stats[stat.key]) + '%; background-color:' + (stat.higherWins ? cardTheme(${cardExpr}).bar : '#EA580C')"
        ></div>
      </div>
    </div>
  `;

  return `
    <template x-if="${cardExpr}">
      <article
        :style="'border-color:' + cardTheme(${cardExpr}).border"
        class="relative flex flex-col rounded-2xl bg-[#FFFDF8] text-[#1F2933] border-[3px] shadow-[0_6px_0_rgba(31,41,51,0.10)] overflow-hidden transition-transform duration-200 ${widthClass} ${hoverClass}"
      >
      <!-- Explorer Header with Stamped Quartet Seal -->
      <div class="px-3.5 pt-3 pb-2.5 bg-[#FAF6EC] border-b border-[#E4DBC7] flex items-start gap-2.5">
        <div
          :style="'background-color:' + cardTheme(${cardExpr}).stampBg + '; color:' + cardTheme(${cardExpr}).stampText"
          class="w-10 h-10 rounded-full shrink-0 flex items-center justify-center font-mono font-bold text-sm shadow-sm ring-2 ring-[#FFFDF8] ring-offset-1"
          :title="groupName(${cardExpr}.groupId)"
          x-text="${cardExpr}.id"
        ></div>

        <div class="min-w-0 flex-1">
          <div class="flex items-center justify-between gap-1.5">
            <span
              class="text-[11px] font-semibold truncate"
              :style="'color:' + cardTheme(${cardExpr}).border"
              x-text="groupName(${cardExpr}.groupId)"
            ></span>
            <div class="flex items-center gap-1.5 shrink-0">
              <span class="font-mono tabular-nums text-[11px] text-[#6B7280]" x-text="${cardExpr}.year"></span>
              <button
                type="button"
                @click="inspectCard(${cardExpr})"
                :title="t.card.fullView"
                :aria-label="t.card.fullView + ': ' + ${cardExpr}.modelName"
                class="w-6 h-6 rounded-md bg-[#EFE8D6] hover:bg-[#E2D6BC] text-[#1F2933] flex items-center justify-center transition-colors"
              >
                ${iconSvg('maximize', 'w-3.5 h-3.5')}
              </button>
            </div>
          </div>

          <h3
            class="font-display text-base sm:text-lg font-bold leading-snug text-[#1F2933] truncate"
            :title="${cardExpr}.modelName"
            x-text="${cardExpr}.modelName"
          ></h3>

          <div class="text-[11px] text-[#52606D] truncate">
            <span class="font-semibold text-[#334155]" x-text="${cardExpr}.manufacturer"></span>
            <span aria-hidden="true"> · </span>
            <span x-text="cardLocale(${cardExpr}).country"></span>
          </div>
        </div>
      </div>

      <!-- Mounted Field Photo + Coastal Lighthouse Scale Comparison -->
      <div class="px-3.5 pt-3 pb-2 grid grid-cols-12 gap-2.5 items-stretch bg-[#FFFDF8]">
        <div
          class="col-span-8 bg-[#F4EFE2] p-1 rounded-lg border border-[#DCD2BA] shadow-sm flex flex-col"
          x-data="{ imgFailed: false }"
          x-effect="void (${cardExpr}?.id); imgFailed = false"
        >
          <div class="relative w-full overflow-hidden rounded bg-[#E6DEC9] ${photoHeightClass}">
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
              class="h-full w-full bg-gradient-to-br from-[#D9ECEE] to-[#E9E1CC] flex flex-col items-center justify-center text-[#0E7490] p-2 text-center"
            >
              ${iconSvg('wind', 'w-7 h-7 mb-1')}
              <span class="text-[11px] font-semibold leading-tight" x-text="${cardExpr}.modelName"></span>
            </div>
            <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent px-2 py-1.5 text-white">
              <div class="text-[10px] font-semibold leading-tight truncate" x-text="${cardExpr}.flagshipPlant"></div>
              <div class="text-[9px] text-white/85 truncate" x-text="${cardExpr}.flagshipLocation"></div>
            </div>
          </div>
        </div>

        <div
          class="col-span-4 rounded-lg bg-[#F5F0E3] border border-[#DCD2BA] p-1.5 flex flex-col items-center justify-between text-center"
          :title="lighthouseTooltip(${cardExpr})"
        >
          <svg viewBox="0 0 72 84" class="w-full h-24 overflow-visible" aria-hidden="true">
            <line x1="4" y1="76" x2="68" y2="76" stroke="#B8AC92" stroke-width="1.5" />
            <line
              x1="27"
              y1="76"
              x2="27"
              :y2="cardHubY(${cardExpr})"
              stroke="#334155"
              stroke-width="2.6"
              stroke-linecap="round"
            />
            <circle
              cx="27"
              :cy="cardHubY(${cardExpr})"
              :r="cardBladeLen(${cardExpr})"
              fill="none"
              :stroke="cardTheme(${cardExpr}).border"
              stroke-width="0.9"
              stroke-dasharray="2 2"
              opacity="0.55"
            />
            <g :stroke="cardTheme(${cardExpr}).border" stroke-width="2" stroke-linecap="round">
              <line x1="27" :y1="cardHubY(${cardExpr})" x2="27" :y2="cardHubY(${cardExpr}) - cardBladeLen(${cardExpr})" />
              <line x1="27" :y1="cardHubY(${cardExpr})" :x2="27 + cardBladeLen(${cardExpr}) * 0.866" :y2="cardHubY(${cardExpr}) + cardBladeLen(${cardExpr}) * 0.5" />
              <line x1="27" :y1="cardHubY(${cardExpr})" :x2="27 - cardBladeLen(${cardExpr}) * 0.866" :y2="cardHubY(${cardExpr}) + cardBladeLen(${cardExpr}) * 0.5" />
            </g>
            <circle cx="27" :cy="cardHubY(${cardExpr})" r="2.5" fill="#1F2933" />
            <g opacity="0.88">
              <polygon points="54,76 62,76 60,60 56,60" fill="#EA580C" />
              <rect x="56" y="64" width="4" height="3" fill="#FFFDF8" />
              <rect x="55.5" y="69.5" width="5" height="3" fill="#FFFDF8" />
              <rect x="56.5" y="57" width="3" height="3" fill="#FBBF24" />
              <polygon points="55.5,57 60.5,57 58,54.5" fill="#1F2933" />
            </g>
          </svg>
          <span
            class="font-mono tabular-nums text-[9px] font-semibold text-[#52606D] leading-none"
            x-text="${cardExpr}.stats.hubHeightM + 'm / 45m'"
          ></span>
        </div>
      </div>

      <!-- 5 Kid-Friendly Stat Rows -->
      <div class="px-3.5 pb-3 pt-1 flex flex-col gap-1.5 bg-[#FFFDF8]">
        <template x-for="stat in statDefinitions" :key="stat.key">
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
      <div class="px-3.5 py-2 bg-[#F4EFE2] border-t border-[#E4DBC7] text-[11px] text-[#52606D] flex items-center justify-between gap-2">
        <span
          class="font-mono tabular-nums truncate"
          x-text="formatNumber(${cardExpr}.sweptAreaM2) + ' m²'"
        ></span>
        <div class="flex items-center gap-3 shrink-0">
          <span class="hidden sm:inline-flex items-center gap-0.5 text-[10px] text-[#6B7280]">
            ${iconSvg('arrow-up', 'w-2.5 h-2.5')}
            <span x-text="t.card.higherWins"></span>
          </span>
          <a
            :href="${cardExpr}.sourceUrl"
            target="_blank"
            rel="noopener noreferrer"
            :title="${cardExpr}.sourceLabel"
            class="inline-flex items-center gap-1 font-bold text-[#0E7490] hover:underline"
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
      class="relative rounded-2xl bg-[#F5EEDB] border-[3px] border-[#CBBFA3] shadow-[0_6px_0_rgba(31,41,51,0.10)] overflow-hidden flex flex-col items-center justify-between p-4 text-center select-none ${sizeClass}"
    >
      <div class="relative w-full h-full rounded-xl overflow-hidden border-2 border-[#FFFDF8] shadow-inner flex flex-col items-center justify-between py-5 px-4 bg-[#0E7490]">
        <div
          class="absolute inset-0 pointer-events-none"
          style="background: linear-gradient(135deg, #0E7490 0%, #0E7490 50%, #EA580C 50%, #EA580C 100%);"
          aria-hidden="true"
        ></div>
        <div
          class="absolute inset-2.5 rounded-lg border border-[#F6F2E9]/45 pointer-events-none"
          aria-hidden="true"
        ></div>

        <div
          class="relative z-10 px-3 py-1 rounded-md bg-[#FFFDF8]/95 border border-[#D9D0BE] text-xs font-bold text-[#1F2933] max-w-full truncate shadow-sm"
          x-text="${labelExpr}"
        ></div>

        <!-- Wind Turbine Medallion (Replacing Compass Rose) -->
        <div class="relative z-10 w-44 h-44 rounded-full bg-[#FFFDF8] border-4 border-[#F6EFE0] shadow-lg flex flex-col items-center justify-center p-3">
          <div class="w-full h-full rounded-full border-2 border-dashed border-[#CBBFA3] flex flex-col items-center justify-center">
            <svg viewBox="0 0 100 92" class="w-24 h-22" aria-hidden="true">
              <path d="M12 30 Q22 25 32 30" fill="none" stroke="#0E7490" stroke-width="2.2" stroke-linecap="round" />
              <path d="M68 24 Q78 19 88 24" fill="none" stroke="#EA580C" stroke-width="2.2" stroke-linecap="round" />
              <path d="M16 82 Q50 74 84 82" fill="none" stroke="#1B6B52" stroke-width="3" stroke-linecap="round" />
              <polygon points="46,79 54,79 52,38 48,38" fill="#1F2933" />
              <g fill="#0E7490" stroke="#1F2933" stroke-width="1.4" stroke-linejoin="round">
                <path d="M50 38 C47 26 48 12 50 7 C52 12 53 26 50 38 Z" />
                <path d="M50 38 C60 41 72 48 76 53 C70 52 58 46 50 38 Z" />
                <path d="M50 38 C40 41 28 48 24 53 C30 52 42 46 50 38 Z" />
              </g>
              <circle cx="50" cy="38" r="4.5" fill="#EA580C" stroke="#1F2933" stroke-width="1.5" />
            </svg>
            <div class="font-display text-sm font-extrabold tracking-tight text-[#1F2933] leading-none -mt-0.5">
              ROTOR CLASH
            </div>
          </div>
        </div>

        <div class="relative z-10 px-4 py-2 rounded-xl bg-[#FFFDF8] border border-[#D9D0BE] shadow-sm">
          <span class="font-mono tabular-nums text-xl font-bold text-[#0E7490]" x-text="${countExpr}"></span>
          <span
            class="ml-2 text-xs font-bold text-[#1F2933]"
            x-text="(${countExpr}) === 1 ? t.arena.cardRemaining : t.arena.cardsRemaining"
          ></span>
        </div>
      </div>
    </div>
  `;
}
