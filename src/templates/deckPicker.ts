/**
 * Deck chooser: every deck is drawn as a small stack of card backs (see `.deck-*` in index.css).
 * The stack depth hints at how many cards the deck holds; the selected stack lifts and fans out.
 * Purely presentational: selection still goes through `setDeckMode()` and `deckMode` in the store.
 */

type DeckStackSpec = {
  mode: 'modern' | 'records' | 'mixed' | 'grand';
  /** Number of card backs peeking out behind the top card. */
  layers: number;
  /** Cards dealt in a match from this deck (shown on the top card). */
  count: number;
  /** Extra class that sets the stripe colours / face (see index.css). */
  tone: string;
  emblem: string;
};

const EMBLEM_ATTRS =
  'class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';

const EMBLEMS = {
  // Rotor with three blades on a tower.
  turbine: `<svg ${EMBLEM_ATTRS}><circle cx="12" cy="9" r="1.6"/><path d="M12 7.4V2.5M10.6 9.8 6.4 12.3M13.4 9.8l4.2 2.5M12 10.6V21"/></svg>`,
  // Prize rosette with ribbons: records and firsts.
  rosette: `<svg ${EMBLEM_ATTRS}><circle cx="12" cy="9.5" r="5"/><path d="M9 14l-2 7 5-2.5 5 2.5-2-7"/></svg>`,
  // Shuffle arrows: cards from both decks.
  shuffle: `<svg ${EMBLEM_ATTRS}><path d="M3 7h4l10 10h4M3 17h4l3-3M14 10l3-3h4M18 4l3 3-3 3M18 14l3 3-3 3"/></svg>`,
  // Compass star: the full tour.
  compass: `<svg ${EMBLEM_ATTRS}><path d="M12 2l2.2 7.8L22 12l-7.8 2.2L12 22l-2.2-7.8L2 12l7.8-2.2z"/></svg>`,
};

const DECKS: DeckStackSpec[] = [
  { mode: 'modern', layers: 3, count: 32, tone: 'deck-tone-modern', emblem: EMBLEMS.turbine },
  { mode: 'records', layers: 3, count: 32, tone: 'deck-tone-records', emblem: EMBLEMS.rosette },
  { mode: 'mixed', layers: 3, count: 32, tone: 'deck-tone-mixed', emblem: EMBLEMS.shuffle },
  { mode: 'grand', layers: 5, count: 64, tone: 'deck-tone-grand', emblem: EMBLEMS.compass },
];

function renderDeckOption(spec: DeckStackSpec): string {
  const layers = Array.from({ length: spec.layers }, (_, i) => {
    const index = spec.layers - i; // paint the deepest layer first
    return `<i class="deck-layer" style="--i:${index}"></i>`;
  }).join('');

  return `
    <button
      type="button"
      role="radio"
      x-show="deckModes.includes('${spec.mode}')"
      :aria-checked="deckMode === '${spec.mode}'"
      :class="{ 'is-selected': deckMode === '${spec.mode}' }"
      @click="setDeckMode('${spec.mode}')"
      class="deck-option ${spec.tone}"
    >
      <span class="deck-stack" aria-hidden="true">
        ${layers}
        <span class="deck-layer deck-face" style="--i:0">
          <span class="deck-seal">${spec.emblem}</span>
          <span class="deck-count">${spec.count}</span>
        </span>
        <span class="deck-check">
          <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>
        </span>
      </span>
      <span class="deck-name" x-text="deckModeName('${spec.mode}')"></span>
    </button>`;
}

export function renderDeckPicker(): string {
  return `
            <!-- Deck choice: applies to robot games, friend rooms and online matches -->
            <div x-show="deckModes.length > 1" class="space-y-1.5">
              <div class="flex items-baseline justify-between gap-3">
                <span class="text-xs font-bold text-c-ink-2" x-text="t.decks.title"></span>
                <span class="text-[11px] text-c-ink-3 text-right" x-text="t.decks[deckMode].desc"></span>
              </div>
              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2" role="radiogroup" :aria-label="t.decks.title">
                ${DECKS.map(renderDeckOption).join('')}
              </div>
            </div>`;
}
