import { renderTurbineCard, renderTurbineCardBack } from './cardMarkup';
import { iconSvg } from './icons';
import { renderDeckPicker } from './deckPicker';

export function renderQuartetMatrix(
  ownedIdsExpr: string,
  completedExpr: string,
  titleExpr: string,
  groupsExpr = 'quartetGroups',
  totalExpr = '8'
): string {
  return `
    <div class="rounded-xl bg-c-paper-hi border-2 border-c-ink p-4">
      <div class="flex items-center justify-between gap-3 mb-3">
        <h3 class="font-display text-sm font-bold text-c-ink" x-text="${titleExpr}"></h3>
        <span
          class="font-mono tabular-nums text-xs font-bold text-c-green"
          x-text="(${completedExpr}).length + '/' + (${totalExpr}) + ' ' + (lang === 'de' ? 'Quartette' : 'Quartets')"
        ></span>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <template x-for="group in ${groupsExpr}" :key="group.id">
          <div
            :class="'rounded-lg p-2 border-2 transition-colors ' + ((${completedExpr}).includes(group.id) ? 'bg-c-mint border-c-green' : 'bg-c-paper border-c-ink/20')"
          >
            <div class="flex items-center justify-between gap-1 mb-1.5">
              <span
                class="text-[11px] font-bold text-c-ink truncate"
                :title="groupName(group.id)"
                x-text="group.code + '. ' + groupName(group.id)"
              ></span>
              <span x-show="(${completedExpr}).includes(group.id)" class="text-c-green shrink-0">
                ${iconSvg('check', 'w-3.5 h-3.5')}
              </span>
            </div>
            <div class="grid grid-cols-4 gap-1">
              <template x-for="slot in ['A', 'B', 'C', 'D']" :key="slot">
                <div
                  :title="cardTitleById(group.id + slot)"
                  :class="'h-6 rounded flex items-center justify-center font-mono text-[11px] font-bold border ' + ((${ownedIdsExpr}).includes(group.id + slot) ? ((${completedExpr}).includes(group.id) ? 'bg-c-green border-c-ink text-white' : 'bg-c-teal border-c-ink text-white') : 'bg-c-sand-soft border-c-ink/20 text-c-ink-4')"
                  x-text="slot"
                ></div>
              </template>
            </div>
          </div>
        </template>
      </div>
    </div>
  `;
}

export function renderHeader(): string {
  return `
    <header class="sticky top-0 z-30 border-b-2 border-c-ink bg-c-paper/95 backdrop-blur-md pt-[env(safe-area-inset-top)]">
      <!-- Subtle Coastal Dual Accent Line -->
      <div class="h-1 w-full flex" aria-hidden="true">
        <div class="flex-1 bg-c-teal"></div>
        <div class="w-16 bg-c-ink"></div>
        <div class="flex-1 bg-c-orange"></div>
      </div>

      <div class="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-24 flex items-center justify-between gap-2 sm:gap-8">
        <!-- Zone 1: Brand Emblem -->
        <a
          href="#arena"
          @click.prevent="setTab('arena')"
          aria-label="Rotor Clash"
          class="inline-flex items-center gap-2.5 shrink-0 py-1 group"
        >
          <img
            src="/assets/aistudio/logo_rotor_clash_3a6e5dcc.png"
            alt="Rotor Clash"
            class="h-11 sm:h-20 w-auto object-contain transition-transform duration-150 group-hover:scale-[1.03]"
          />
          <span class="sr-only">Rotor Clash</span>
        </a>

        <!-- Phone-only: current round next to the brand while a match is running -->
        <template x-if="activeMatch && activeTab === 'arena'">
          <div class="md:hidden flex flex-col items-center justify-center leading-none px-2.5 h-10 rounded-xl bg-c-paper border-2 border-c-ink/25">
            <span class="text-[9px] font-bold uppercase tracking-wide text-c-ink-3" x-text="t.arena.round"></span>
            <span class="mt-0.5 font-mono tabular-nums text-sm font-bold text-c-ink" x-text="activeMatch.roundNumber + '/' + activeMatch.maxRounds"></span>
          </div>
        </template>

        <!-- Zone 2: 4 Single-Line Navigation Links -->
        <nav class="hidden md:flex items-center gap-5 lg:gap-7 text-sm font-bold">
          <template x-for="item in navItems()" :key="item.id">
            <button
              type="button"
              @click="setTab(item.id)"
              :class="'py-1 border-b-[3px] transition-colors whitespace-nowrap shrink-0 ' + (activeTab === item.id ? 'border-c-orange text-c-ink' : 'border-transparent text-c-ink-3 hover:text-c-ink')"
              x-text="item.label"
            ></button>
          </template>
        </nav>

        <!-- Zone 3: 1 Primary Action -->
        <div class="shrink-0 flex items-center gap-2">
          <button
            type="button"
            @click="toggleTheme()"
            :aria-label="lang === 'de' ? 'Hell/Dunkel-Modus wechseln' : 'Switch light/dark mode'"
            :aria-pressed="theme === 'dark'"
            class="w-10 h-10 sm:w-11 sm:h-11 inline-flex items-center justify-center rounded-xl bg-c-paper-hi hover:bg-c-sand border-2 border-c-ink text-c-ink transition-colors"
          >
            <span class="theme-icon-moon">${iconSvg('moon', 'w-5 h-5')}</span>
            <span class="theme-icon-sun">${iconSvg('sun', 'w-5 h-5')}</span>
          </button>
          <button
            type="button"
            @click="handleHeaderQuickMatch()"
            class="px-3 sm:px-4 h-10 sm:h-auto sm:py-2 rounded-xl bg-c-green hover:bg-c-green-deep text-c-paper-hi border-2 border-c-ink font-bold text-xs sm:text-sm shadow-[0_3px_0_var(--c-line)] active:translate-y-0.5 transition-all whitespace-nowrap shrink-0"
            x-text="activeMatch ? t.nav.resumeMatch : (inQueue ? t.nav.searching : t.nav.quickMatch)"
          ></button>
        </div>
      </div>

    </header>

    <!-- Mobile bottom tab bar (thumb reachable, safe-area aware) -->
    <nav
      x-show="!(activeMatch && isReveal() && activeMatch.lastRound)"
      class="md:hidden fixed bottom-0 inset-x-0 z-30 border-t-2 border-c-ink bg-c-paper/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
      aria-label="Main navigation"
    >
      <div class="grid grid-cols-4">
        <template x-for="item in navItems()" :key="item.id">
          <button
            type="button"
            @click="setTab(item.id)"
            :aria-current="activeTab === item.id ? 'page' : null"
            :class="'min-h-14 px-1 py-2 text-[11px] leading-tight font-bold flex items-center justify-center text-center border-t-[3px] -mt-0.5 transition-colors ' + (activeTab === item.id ? 'border-c-orange text-c-ink bg-c-sand/60' : 'border-transparent text-c-ink-3')"
            x-text="item.label"
          ></button>
        </template>
      </div>
    </nav>

    <!-- Workspace Utility Strip: Language Switcher & Audio Toggle -->
    <div :class="'border-b-2 border-c-ink/15 bg-c-sand/90 ' + (activeMatch ? 'hidden md:block' : '')">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-between gap-4 text-xs">
        <div class="text-c-ink-2 font-medium truncate">
          <span class="font-bold text-c-ink" x-text="profile.callsign"></span>
          <span aria-hidden="true"> · </span>
          <span class="font-mono tabular-nums font-bold text-c-green" x-text="profile.elo + ' pts'"></span>
        </div>

        <div class="flex items-center gap-3 shrink-0">
          <button
            type="button"
            @click="toggleMute()"
            class="px-3 py-2 max-sm:min-h-10 rounded-lg bg-c-paper-hi hover:bg-c-paper border border-c-ink/35 text-c-ink font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <span x-show="muted" class="text-c-ink-4">${iconSvg('volume-x', 'w-3.5 h-3.5')}</span>
            <span x-show="!muted" class="text-c-teal">${iconSvg('volume-2', 'w-3.5 h-3.5')}</span>
            <span x-text="muted ? t.lobby.audioMuted : t.lobby.audioOn"></span>
          </button>

          <div
            class="inline-flex items-center gap-1 p-0.5 rounded-lg bg-c-paper-hi border border-c-ink/35"
            role="group"
            aria-label="Language switcher"
          >
            <span class="text-c-ink-2 ml-1.5 mr-0.5">${iconSvg('globe', 'w-3.5 h-3.5')}</span>
            <button
              type="button"
              @click="setLang('en')"
              :class="'px-3 py-1.5 max-sm:min-h-9 rounded-md text-xs font-bold transition-colors whitespace-nowrap ' + (lang === 'en' ? 'bg-c-teal text-white' : 'text-c-ink-3 hover:text-c-ink')"
            >
              EN
            </button>
            <button
              type="button"
              @click="setLang('de')"
              :class="'px-3 py-1.5 max-sm:min-h-9 rounded-md text-xs font-bold transition-colors whitespace-nowrap ' + (lang === 'de' ? 'bg-c-teal text-white' : 'text-c-ink-3 hover:text-c-ink')"
            >
              DE
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Error Toast -->
    <div x-show="toastError" class="max-w-7xl mx-auto px-4 sm:px-6 pt-4 w-full">
      <div class="rounded-xl bg-c-rose border-2 border-c-red px-4 py-2.5 flex items-center justify-between gap-3 text-xs font-semibold text-c-red-deep">
        <span x-text="toastError"></span>
        <button
          type="button"
          @click="toastError = null"
          aria-label="Dismiss message"
          class="text-c-red-ink hover:text-c-red-deep"
        >
          ${iconSvg('x', 'w-4 h-4')}
        </button>
      </div>
    </div>
  `;
}

export function renderLobby(): string {
  return `
    <div x-show="activeTab === 'arena' && !activeMatch" class="space-y-8">
      <section class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        <!-- Left: Collector Emblem Showcase & 3 Big Tactile Play Choices -->
        <div class="lg:col-span-7 rounded-2xl bg-c-paper-hi ink-panel p-4 sm:p-8 flex flex-col justify-between space-y-4 sm:space-y-6">
          <div class="space-y-4">
            <!-- Signature Coastal Speed-Stripe Emblem Plaque -->
            <div class="max-sm:hidden flex items-center gap-3 sm:gap-4 rounded-xl bg-c-paper border-2 border-c-ink px-4 py-2.5 shadow-[0_3px_0_var(--c-line)]">
              <div class="hidden sm:flex flex-col gap-1.5 flex-1 min-w-[28px]" aria-hidden="true">
                <div class="h-1.5 rounded-sm bg-c-teal"></div>
                <div class="h-1.5 rounded-sm bg-c-orange"></div>
              </div>
              <img
                src="/assets/aistudio/logo_rotor_clash_3a6e5dcc.png"
                alt="Rotor Clash"
                class="h-14 sm:h-16 w-auto object-contain shrink-0"
              />
              <div class="flex flex-col gap-1.5 flex-1 min-w-[28px]" aria-hidden="true">
                <div class="h-1.5 rounded-sm bg-c-teal"></div>
                <div class="h-1.5 rounded-sm bg-c-orange"></div>
              </div>
            </div>

            <div class="space-y-2.5 pt-1">
              <div class="max-sm:hidden text-xs font-extrabold tracking-wide uppercase text-c-orange" x-text="t.lobby.kicker"></div>
              <h1
                class="font-display text-2xl sm:text-4xl font-extrabold text-c-ink leading-tight max-w-2xl"
                style="text-wrap: balance;"
                x-text="t.lobby.heroTitle"
              ></h1>
              <p class="max-sm:hidden text-sm sm:text-base text-c-ink-2 max-w-2xl leading-relaxed" x-text="t.lobby.heroSubtitle"></p>
            </div>
          </div>

          <div x-show="inQueue" class="rounded-xl bg-c-sky border-2 border-c-ink p-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div class="font-display font-bold text-sm text-c-ink" x-text="t.lobby.searchingTitle"></div>
              <div
                class="text-xs text-c-teal-deep mt-0.5 font-mono tabular-nums font-bold"
                x-text="lobby.queueCount + ' ' + t.lobby.inQueue + ' · ' + lobby.onlineCount + ' ' + t.lobby.online"
              ></div>
            </div>
            <button
              type="button"
              @click="leaveQueue()"
              class="px-3.5 py-2 rounded-xl bg-c-paper-hi hover:bg-c-paper border-2 border-c-ink text-xs font-bold text-c-ink whitespace-nowrap"
              x-text="t.lobby.cancelQueue"
            ></button>
          </div>

          <div x-show="hostedRoom" class="rounded-xl bg-c-mint border-2 border-c-ink p-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div class="text-xs text-c-green font-bold" x-text="t.lobby.roomReady"></div>
              <div class="mt-1 flex items-center gap-3">
                <span class="font-mono text-2xl font-bold tracking-widest text-c-ink" x-text="hostedRoom?.roomCode || ''"></span>
                <button
                  type="button"
                  @click="copyInvite(hostedRoom?.roomCode || '')"
                  class="px-2.5 py-1 rounded-lg bg-c-paper-hi hover:bg-c-paper border-2 border-c-ink text-xs font-bold text-c-green inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  <span x-show="copiedCode">${iconSvg('check', 'w-3.5 h-3.5')}</span>
                  <span x-show="!copiedCode">${iconSvg('copy', 'w-3.5 h-3.5')}</span>
                  <span x-text="copiedCode ? t.lobby.copiedLink : t.lobby.copyInviteLink"></span>
                </button>
              </div>
            </div>
            <button
              type="button"
              @click="cancelRoom()"
              class="px-3.5 py-2 rounded-xl bg-c-paper-hi hover:bg-c-paper border-2 border-c-ink text-xs font-bold text-c-ink whitespace-nowrap"
              x-text="t.lobby.closeRoom"
            ></button>
          </div>

          <div class="space-y-4">
            ${renderDeckPicker()}

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                @click="startBotMatch(botDifficulty)"
                class="px-3 sm:px-4 py-4 rounded-xl bg-c-green hover:bg-c-green-deep text-c-paper-hi border-2 border-c-ink font-bold text-sm shadow-[0_4px_0_var(--c-line)] active:translate-y-0.5 transition-all flex flex-col items-center justify-center gap-1.5 text-center"
              >
                ${iconSvg('bot', 'w-6 h-6')}
                <span class="leading-snug" x-text="t.lobby.practiceBot"></span>
              </button>

              <button
                type="button"
                @click="createRoom()"
                class="px-3 sm:px-4 py-4 rounded-xl bg-c-orange hover:bg-c-orange-deep text-c-paper-hi border-2 border-c-ink font-bold text-sm shadow-[0_4px_0_var(--c-line)] active:translate-y-0.5 transition-all flex flex-col items-center justify-center gap-1.5 text-center"
              >
                ${iconSvg('key-round', 'w-6 h-6')}
                <span class="leading-snug" x-text="t.lobby.createPrivateRoom"></span>
              </button>

              <button
                type="button"
                @click="inQueue ? leaveQueue() : joinQueue()"
                class="px-3 sm:px-4 py-4 rounded-xl bg-c-teal hover:bg-c-teal-deep text-c-paper-hi border-2 border-c-ink font-bold text-sm shadow-[0_4px_0_var(--c-line)] active:translate-y-0.5 transition-all flex flex-col items-center justify-center gap-1.5 text-center"
              >
                ${iconSvg('swords', 'w-6 h-6')}
                <span class="leading-snug" x-text="inQueue ? t.lobby.searchingBtn : t.lobby.findOnlineMatch"></span>
              </button>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <form @submit.prevent="joinRoom(joinCodeInput)" class="flex items-center gap-2">
                <input
                  type="text"
                  maxlength="8"
                  x-model="joinCodeInput"
                  @input="joinCodeInput = joinCodeInput.toUpperCase()"
                  :placeholder="t.lobby.roomPlaceholder"
                  class="flex-1 min-w-0 px-3 py-2.5 rounded-xl bg-c-paper border-2 border-c-ink/35 font-mono text-xs sm:text-sm text-c-ink placeholder:text-c-ink-4 focus:border-c-teal focus:outline-none uppercase"
                />
                <button
                  type="submit"
                  class="px-3.5 sm:px-4 py-2.5 rounded-xl bg-c-paper hover:bg-c-sand border-2 border-c-ink text-xs sm:text-sm font-bold text-c-ink shadow-[0_2px_0_var(--c-line)] active:translate-y-0.5 whitespace-nowrap shrink-0"
                  x-text="t.lobby.joinRoom"
                ></button>
              </form>

              <div class="flex items-center justify-between gap-2 rounded-xl bg-c-paper border-2 border-c-ink/25 px-3 py-1.5">
                <span class="text-xs font-bold text-c-ink-2 whitespace-nowrap" x-text="t.lobby.botDifficultyLabel + ':'"></span>
                <select
                  aria-label="Bot difficulty"
                  x-model="botDifficulty"
                  class="min-w-0 px-2.5 py-1.5 rounded-lg bg-c-paper-hi border border-c-ink/35 text-xs font-bold text-c-ink focus:border-c-teal focus:outline-none"
                >
                  <option value="standard" x-text="t.lobby.botCadet"></option>
                  <option value="tactical" x-text="t.lobby.botTactical"></option>
                </select>
              </div>
            </div>

            <div x-show="lobby.openRooms.length > 0" class="rounded-xl bg-c-paper border-2 border-c-ink/25 p-3.5 space-y-2">
              <div class="text-xs font-bold text-c-ink flex items-center justify-between">
                <span x-text="t.lobby.openRoomsTitle"></span>
                <span class="font-mono tabular-nums text-c-teal" x-text="lobby.openRooms.length"></span>
              </div>
              <div class="space-y-1.5 max-h-32 overflow-y-auto">
                <template x-for="room in lobby.openRooms" :key="room.roomCode">
                  <div class="flex items-center justify-between gap-3 rounded-lg bg-c-paper-hi border border-c-ink/25 px-3 py-2 text-xs">
                    <div class="min-w-0 truncate">
                      <span class="font-mono font-bold text-c-orange mr-2" x-text="room.roomCode"></span>
                      <span class="text-c-ink font-bold" x-text="room.hostCallsign"></span>
                      <span class="text-c-ink-3 ml-1.5 font-mono tabular-nums" x-text="'(' + room.hostElo + ' pts)'"></span>
                      <span class="text-c-ink-3 ml-1.5" x-text="'· ' + deckModeName(room.deckMode)"></span>
                    </div>
                    <span
                      x-show="hostedRoom && hostedRoom.roomCode === room.roomCode"
                      class="text-c-green font-bold shrink-0"
                      x-text="t.lobby.yourRoom"
                    ></span>
                    <button
                      x-show="!hostedRoom || hostedRoom.roomCode !== room.roomCode"
                      type="button"
                      @click="joinRoom(room.roomCode)"
                      class="px-3 py-1 rounded-lg bg-c-teal hover:bg-c-teal-deep text-white font-bold shrink-0 whitespace-nowrap"
                      x-text="t.lobby.joinDuel"
                    ></button>
                  </div>
                </template>
              </div>
            </div>
          </div>

          <div class="pt-4 border-t-2 border-c-ink/15 flex flex-wrap items-center justify-between gap-3 text-xs text-c-ink-2">
            <span x-text="t.lobby.tutorialPrompt"></span>
            <button
              type="button"
              @click="setTab('tutorial')"
              class="text-c-teal hover:text-c-ink hover:underline font-bold inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              ${iconSvg('book-open', 'w-3.5 h-3.5')}
              <span x-text="t.lobby.launchTutorial"></span>
            </button>
          </div>
        </div>

        <!-- Right: Coastal Sky Showcase Preview -->
        <div class="lg:col-span-5 rounded-2xl bg-gradient-to-b from-c-sky to-c-paper ink-panel p-6 flex flex-col items-center justify-between space-y-4">
          <div class="w-full flex flex-wrap items-center justify-between gap-2">
            <span class="text-xs font-extrabold text-c-ink" x-text="t.lobby.previewLabel"></span>
            <div class="flex items-center gap-1 bg-c-paper-hi p-1 rounded-xl border-2 border-c-ink">
              <template x-for="opt in previewOptions()" :key="opt.id">
                <button
                  type="button"
                  @click="selectPreviewCard(opt.id)"
                  :class="'px-2 py-1 rounded-lg text-[11px] font-bold transition-colors whitespace-nowrap ' + (previewCardId === opt.id ? 'bg-c-teal text-white' : 'text-c-ink-3 hover:text-c-ink')"
                  x-text="opt.label"
                ></button>
              </template>
            </div>
          </div>

          ${renderTurbineCard('previewCard()', { playfulHover: true })}
        </div>
      </section>

      <!-- 4-Column Explorer Strip -->
      <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <form @submit.prevent="saveCallsign()" class="rounded-2xl bg-c-paper-hi ink-panel p-4 flex flex-col justify-between gap-2">
          <label for="callsign-input" class="text-xs font-bold text-c-ink-2" x-text="t.lobby.pilotCallsign"></label>
          <div class="flex items-center gap-2">
            <input
              id="callsign-input"
              type="text"
              maxlength="20"
              x-model="callsignDraft"
              class="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-c-paper border border-c-ink/35 text-sm font-bold text-c-ink focus:border-c-teal focus:outline-none"
            />
            <button
              type="submit"
              class="px-2.5 py-1.5 rounded-lg bg-c-paper hover:bg-c-sand border-2 border-c-ink text-xs font-bold text-c-ink whitespace-nowrap shrink-0"
              x-text="callsignSaved ? t.lobby.saved : t.lobby.save"
            ></button>
          </div>
        </form>

        <div class="rounded-2xl bg-c-paper-hi ink-panel p-4 flex flex-col justify-between">
          <div class="text-xs font-bold text-c-ink-2" x-text="t.lobby.competitiveRank"></div>
          <div class="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 mt-1">
            <span class="font-display text-lg font-extrabold leading-tight" :style="'color:' + playerTier().accentHex" x-text="playerTier().name"></span>
            <span class="font-mono tabular-nums text-base font-bold text-c-ink whitespace-nowrap" x-text="profile.elo + ' pts'"></span>
          </div>
          <div
            class="text-xs text-c-ink-3 font-mono tabular-nums mt-1"
            x-text="profile.wins + (lang === 'de' ? 'S · ' : 'W · ') + profile.losses + (lang === 'de' ? 'N · ' : 'L · ') + profile.quartetsCompleted + ' ' + t.lobby.quartets"
          ></div>
        </div>

        <div class="rounded-2xl bg-c-paper-hi ink-panel p-4 flex flex-col justify-between">
          <div class="text-xs font-bold text-c-ink-2" x-text="t.lobby.multiplayerServer"></div>
          <div class="flex flex-wrap items-center justify-between gap-2 mt-1">
            <div class="flex items-center gap-2">
              <span
                :class="'w-2.5 h-2.5 rounded-full border border-c-ink shrink-0 ' + (wsConnected ? 'bg-c-green' : 'bg-c-orange')"
                aria-hidden="true"
              ></span>
              <span class="font-display text-base font-bold text-c-ink" x-text="wsConnected ? t.lobby.connected : t.lobby.reconnecting"></span>
            </div>
            <span class="font-mono tabular-nums text-sm font-bold text-c-teal flex items-center gap-1 whitespace-nowrap">
              ${iconSvg('users', 'w-3.5 h-3.5')}
              <span x-text="lobby.onlineCount + ' ' + t.lobby.online"></span>
            </span>
          </div>
          <div
            class="text-xs text-c-ink-3 mt-1"
            x-text="lobby.openRooms.length + ' ' + t.lobby.openRoomsCount + ' · ' + lobby.queueCount + ' ' + t.lobby.inQueue"
          ></div>
        </div>

        <div class="rounded-2xl bg-c-paper-hi ink-panel p-4 flex flex-col justify-between">
          <div class="text-xs font-bold text-c-ink-2" x-text="t.lobby.tableAudioQuickStart"></div>
          <div class="flex flex-wrap items-center gap-2 mt-2">
            <button
              type="button"
              @click="toggleMute()"
              class="px-2.5 py-2 rounded-xl bg-c-paper hover:bg-c-sand border-2 border-c-ink text-xs font-bold text-c-ink inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <span x-show="muted" class="text-c-ink-4">${iconSvg('volume-x', 'w-4 h-4')}</span>
              <span x-show="!muted" class="text-c-teal">${iconSvg('volume-2', 'w-4 h-4')}</span>
              <span x-text="muted ? t.lobby.audioMuted : t.lobby.audioOn"></span>
            </button>

            <button
              type="button"
              @click="startBotMatch(botDifficulty)"
              class="flex-1 min-w-fit px-2.5 py-2 rounded-xl bg-c-mint hover:bg-c-mint-hover border-2 border-c-ink text-xs font-bold text-c-ink inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
            >
              <span class="text-c-green shrink-0">${iconSvg('play', 'w-3.5 h-3.5')}</span>
              <span x-text="t.lobby.soloWarmup"></span>
            </button>
          </div>
        </div>
      </section>
    </div>
  `;
}

export function renderArena(): string {
  return `
    <template x-if="activeTab === 'arena' && activeMatch">
      <div
        id="arena-root"
        :class="'relative overflow-hidden border-2 border-c-ink bg-c-canvas-2 shadow-[0_6px_0_var(--c-line)] transition-all scroll-mt-16 ' + (isTheaterFull ? 'fixed inset-0 z-40 rounded-none overflow-y-auto' : 'rounded-2xl')"
      >
        <div
          class="absolute inset-0 bg-cover bg-center opacity-50 pointer-events-none"
          :style="'background-image: url(' + fieldDeskImg + ')'"
          aria-hidden="true"
        ></div>
        <div class="absolute inset-0 bg-c-canvas/60 pointer-events-none" aria-hidden="true"></div>

        <div :class="'relative z-10 max-w-6xl mx-auto p-3 sm:p-6 space-y-3 sm:space-y-5 ' + (isReveal() && activeMatch.lastRound ? 'max-lg:pb-56' : '')">
          <!-- Field Guide Match Scoreboard -->
          <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-2xl bg-c-paper-hi/95 border-2 border-c-ink shadow-[0_3px_0_var(--c-line)] px-3 sm:px-4 py-2 sm:py-2.5">
            <div class="order-1 flex flex-1 items-center gap-3 min-w-0">
              <div
                class="w-10 h-10 rounded-xl bg-c-teal text-white border-2 border-c-ink flex items-center justify-center font-mono text-base font-bold shrink-0"
                x-text="activeMatch.you.cardCount"
              ></div>
              <div class="min-w-0">
                <div class="font-display font-bold text-sm text-c-ink truncate">
                  <span x-text="activeMatch.you.callsign"></span>
                  <span class="text-xs font-sans font-bold text-c-teal" x-text="' (' + t.arena.you + ')'"></span>
                </div>
                <div
                  class="hidden sm:block text-[11px] text-c-ink-2 font-mono tabular-nums"
                  x-text="tierForElo(activeMatch.you.elo).name + ' · ' + activeMatch.you.elo + ' pts'"
                ></div>
              </div>
            </div>

            <div
              :class="'order-3 w-full justify-center sm:w-auto sm:order-2 flex flex-wrap items-center gap-2 sm:gap-2.5 ' + ((activeMatch.tiePotCount > 0 || (secondsLeft !== null && activeMatch.status === 'PLAYING')) ? '' : 'max-sm:hidden')"
            >
              <div class="max-sm:hidden px-3 py-1.5 rounded-xl bg-c-paper border-2 border-c-ink/25 text-center whitespace-nowrap">
                <span class="text-[11px] font-bold text-c-ink-2 mr-1.5" x-text="t.arena.round"></span>
                <span
                  class="font-mono tabular-nums text-sm font-bold text-c-ink"
                  x-text="activeMatch.roundNumber + '/' + activeMatch.maxRounds"
                ></span>
              </div>

              <div
                x-show="activeMatch.tiePotCount > 0"
                class="px-3 py-1.5 rounded-xl bg-c-cream-amber border-2 border-c-amber flex items-center gap-1.5 whitespace-nowrap"
              >
                <span class="text-c-amber-deep">${iconSvg('layers', 'w-3.5 h-3.5')}</span>
                <span
                  class="text-xs font-bold text-c-amber-ink font-mono tabular-nums"
                  x-text="t.arena.tiePot + ': ' + activeMatch.tiePotCount"
                ></span>
              </div>

              <div
                x-show="secondsLeft !== null && activeMatch.status === 'PLAYING'"
                :class="'px-2.5 py-1.5 rounded-xl border-2 flex items-center gap-1 font-mono tabular-nums text-xs font-bold whitespace-nowrap ' + (secondsLeft <= 10 ? 'bg-c-rose border-c-red text-c-red-ink anim-urgent' : 'bg-c-paper border-c-ink/25 text-c-ink')"
              >
                ${iconSvg('clock', 'w-3.5 h-3.5')}
                <span x-text="secondsLeft + 's'"></span>
              </div>
            </div>

            <div class="order-2 sm:order-3 flex flex-nowrap shrink-0 items-center justify-end gap-2">
              <div class="text-right min-w-0 hidden sm:block">
                <div class="flex items-center justify-end gap-1.5">
                  <span
                    x-show="activeMatch.mode !== 'bot'"
                    :title="activeMatch.opponent.connected ? t.lobby.connected : t.lobby.reconnecting"
                    class="inline-flex shrink-0"
                  >
                    <span x-show="activeMatch.opponent.connected" class="text-c-green">${iconSvg('wifi', 'w-3.5 h-3.5')}</span>
                    <span x-show="!activeMatch.opponent.connected" class="text-c-amber">${iconSvg('wifi-off', 'w-3.5 h-3.5')}</span>
                  </span>
                  <span class="font-display font-bold text-sm text-c-ink truncate" x-text="activeMatch.opponent.callsign"></span>
                </div>
                <div class="text-[11px] text-c-ink-2 font-mono tabular-nums" x-text="activeMatch.opponent.elo + ' pts'"></div>
              </div>

              <div
                class="w-10 h-10 rounded-xl bg-c-orange text-white border-2 border-c-ink flex items-center justify-center font-mono text-base font-bold shrink-0"
                x-text="activeMatch.opponent.cardCount"
              ></div>

              <button
                type="button"
                @click="toggleTheaterFull()"
                :title="isTheaterFull ? t.arena.exitFullscreen : t.arena.fullscreen"
                class="max-md:hidden px-2.5 py-2 rounded-xl text-xs font-bold text-c-ink bg-c-paper hover:bg-c-sand border-2 border-c-ink/30 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                <span x-show="isTheaterFull">${iconSvg('minimize', 'w-3.5 h-3.5')}</span>
                <span x-show="!isTheaterFull">${iconSvg('maximize', 'w-3.5 h-3.5')}</span>
                <span class="hidden md:inline" x-text="isTheaterFull ? t.arena.exitFullscreen : t.arena.fullscreen"></span>
              </button>

              <div x-show="activeMatch.status !== 'FINISHED'">
                <button
                  x-show="!confirmForfeit"
                  type="button"
                  @click="confirmForfeit = true"
                  :aria-label="t.arena.leave"
                  class="min-w-10 min-h-10 justify-center px-2.5 py-2 rounded-xl text-xs font-bold text-c-ink-2 hover:text-c-ink bg-c-paper hover:bg-c-sand border-2 border-c-ink/30 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  ${iconSvg('log-out', 'w-4 h-4')}
                  <span class="hidden sm:inline" x-text="t.arena.leave"></span>
                </button>
                <div x-show="confirmForfeit" class="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    @click="confirmForfeit = false; forfeitMatch()"
                    class="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-c-red hover:bg-c-red-hover text-white border border-c-ink whitespace-nowrap"
                    x-text="t.arena.confirmForfeit"
                  ></button>
                  <button
                    type="button"
                    @click="confirmForfeit = false"
                    class="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-c-sand text-c-ink hover:bg-c-sand-hover border border-c-ink/35 whitespace-nowrap"
                    x-text="t.arena.cancel"
                  ></button>
                </div>
              </div>
            </div>
          </div>

          <!-- Disconnected Banner -->
          <div
            x-show="activeMatch.mode !== 'bot' && !activeMatch.opponent.connected && activeMatch.status !== 'FINISHED'"
            class="rounded-xl bg-c-cream-amber border-2 border-c-amber px-4 py-2.5 flex items-center gap-2 text-xs font-medium text-c-amber-ink"
          >
            <span class="text-c-amber-deep shrink-0">${iconSvg('shield-alert', 'w-4 h-4')}</span>
            <span x-text="activeMatch.opponent.callsign + ' ' + t.arena.disconnectedMsg"></span>
          </div>

          <!-- Finished Screen -->
          <div
            x-show="activeMatch.status === 'FINISHED'"
            :class="'relative overflow-hidden rounded-2xl bg-c-paper-hi ink-panel p-6 sm:p-8 max-w-2xl mx-auto text-center space-y-6 anim-pop-in ' + (activeMatch.winnerId && activeMatch.winnerId === activeMatch.you.id ? 'win-panel' : '')"
          >
            <!-- Victory sunburst (only visible on a win, see .win-panel in index.css) -->
            <div class="win-rays" aria-hidden="true"></div>

            <button
              type="button"
              @click="activeMatch.winnerId === activeMatch.you.id && celebrate()"
              :aria-label="activeMatch.winnerId === activeMatch.you.id ? 'Celebrate again' : null"
              :tabindex="activeMatch.winnerId === activeMatch.you.id ? 0 : -1"
              :class="'relative trophy-badge inline-flex items-center justify-center rounded-2xl border-2 border-c-ink mx-auto shadow-[0_3px_0_var(--c-line)] ' + (activeMatch.winnerId === activeMatch.you.id ? 'w-20 h-20 bg-c-cream-amber text-c-orange anim-trophy trophy-shine' : 'w-16 h-16 bg-c-paper text-c-ink-3 anim-droop pointer-events-none')"
            >
              <span class="win-sparkles" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span>
              ${iconSvg('trophy', 'w-8 h-8')}
            </button>

            <div class="relative">
              <h2 :class="'font-display text-2xl sm:text-3xl font-extrabold text-c-ink ' + (activeMatch.winnerId && activeMatch.winnerId === activeMatch.you.id ? 'win-headline' : '')" x-text="finishedHeadline()"></h2>
              <p class="mt-1.5 text-sm text-c-ink-2" x-text="finishedReason()"></p>
            </div>

            <div class="grid grid-cols-3 gap-3 text-left">
              <div class="rounded-xl bg-c-paper border-2 border-c-ink/20 p-3.5">
                <div class="text-xs font-bold text-c-ink-2" x-text="t.arena.finalCards"></div>
                <div class="mt-1 font-mono tabular-nums text-xl font-bold text-c-ink">
                  <span x-text="activeMatch.you.cardCount"></span>
                  <span class="text-sm text-c-ink-3" x-text="' vs ' + activeMatch.opponent.cardCount"></span>
                </div>
              </div>
              <div class="rounded-xl bg-c-paper border-2 border-c-ink/20 p-3.5">
                <div class="text-xs font-bold text-c-ink-2" x-text="t.arena.quartetsBuilt"></div>
                <div
                  class="mt-1 font-mono tabular-nums text-xl font-bold text-c-green"
                  x-text="activeMatch.you.completedQuartets.length + ' / ' + matchQuartetTotal()"
                ></div>
              </div>
              <div class="rounded-xl bg-c-paper border-2 border-c-ink/20 p-3.5">
                <div
                  class="text-xs font-bold text-c-ink-2"
                  x-text="activeMatch.mode === 'bot' ? t.arena.practiceMode : t.arena.eloDelta"
                ></div>
                <div
                  :class="'mt-1 font-mono tabular-nums text-xl font-bold ' + (activeMatch.eloChange === null ? 'text-c-ink-3' : (activeMatch.eloChange >= 0 ? 'text-c-green' : 'text-c-red'))"
                  x-text="activeMatch.eloChange === null ? t.arena.unranked : ((activeMatch.eloChange >= 0 ? '+' : '') + activeMatch.eloChange)"
                ></div>
              </div>
            </div>

            <div class="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                @click="playAgain()"
                class="px-5 py-2.5 rounded-xl bg-c-green hover:bg-c-green-deep text-c-paper-hi border-2 border-c-ink font-bold text-sm shadow-[0_3px_0_var(--c-line)] active:translate-y-0.5 transition-all inline-flex items-center gap-2 whitespace-nowrap"
              >
                ${iconSvg('rotate-ccw', 'w-4 h-4')}
                <span x-text="t.arena.playAgain"></span>
              </button>
              <button
                type="button"
                @click="if (isTheaterFull) toggleTheaterFull(); returnToLobby()"
                class="px-5 py-2.5 rounded-xl bg-c-paper hover:bg-c-sand text-c-ink border-2 border-c-ink font-bold text-sm transition-colors whitespace-nowrap"
                x-text="t.arena.returnLobby"
              ></button>
            </div>
          </div>

          <!-- Active 2-Card Duel Table -->
          <div x-show="activeMatch.status !== 'FINISHED'" class="space-y-5">
            <div class="grid grid-cols-1 lg:grid-cols-11 gap-3 sm:gap-5 items-center justify-items-center py-0 sm:py-2">
              <!-- Your Card -->
              <div class="lg:col-span-4 w-full flex flex-col items-center">
                <div
                  class="max-lg:hidden mb-2 text-xs font-extrabold text-c-teal bg-c-paper px-3 py-1 rounded-lg border-2 border-c-ink shadow-[0_2px_0_var(--c-line)]"
                  x-text="t.arena.yourTopCard"
                ></div>
                <div class="w-full flex justify-center">
                  ${renderTurbineCard('arenaYourCard()', {
                    playfulHover: true,
                    selectableExpr: 'isYourTurn()',
                    selectedStatExpr: 'isReveal() && activeMatch.lastRound ? activeMatch.lastRound.chosenStat : null',
                    highlightOutcomeExpr: 'arenaYourOutcome()',
                    onSelectStatHandler: 'selectStat(stat.key)',
                    hideMediaOnMobile: true,
                    statModeExpr: 'activeMatch.deckMode',
                  })}
                </div>
              </div>

              <!-- Center Duel Feedback -->
              <div class="max-lg:order-first lg:col-span-3 w-full max-w-[356px] lg:max-w-none flex flex-col items-center justify-center text-center px-1 sm:px-2">
                <div
                  x-show="isReveal() && activeMatch.lastRound"
                  class="w-full rounded-2xl bg-c-paper-hi ink-panel p-4 space-y-3 anim-pop-in max-lg:fixed max-lg:inset-x-3 max-lg:bottom-[calc(0.75rem+env(safe-area-inset-bottom))] max-lg:z-40 max-lg:w-auto max-lg:max-w-md max-lg:mx-auto max-lg:p-3 max-lg:space-y-2 max-lg:shadow-[0_-6px_24px_rgba(0,0,0,0.25)]"
                >
                  <div class="max-lg:hidden text-[11px] font-bold text-c-ink-2" x-text="t.arena.statCompared"></div>
                  <div
                    class="font-display text-lg font-extrabold text-c-ink max-lg:text-base max-lg:leading-tight"
                    x-text="activeMatch.lastRound ? t.stats[activeMatch.lastRound.chosenStat].label : ''"
                  ></div>

                  <div class="py-2.5 px-3 rounded-xl bg-c-paper border border-c-ink/20 flex flex-wrap items-center justify-center sm:justify-between gap-x-2 gap-y-0.5 font-mono tabular-nums text-sm">
                    <span
                      :class="'font-bold whitespace-nowrap ' + (arenaYourOutcome() === 'win' ? 'text-c-green' : (arenaYourOutcome() === 'loss' ? 'text-c-red' : 'text-c-amber-deep'))"
                      x-text="arenaRevealValues().yourValText"
                    ></span>
                    <span class="text-c-ink-4 text-xs font-sans font-bold">vs</span>
                    <span
                      :class="'font-bold whitespace-nowrap ' + (arenaOppOutcome() === 'win' ? 'text-c-green' : (arenaOppOutcome() === 'loss' ? 'text-c-red' : 'text-c-amber-deep'))"
                      x-text="arenaRevealValues().oppValText"
                    ></span>
                  </div>

                  <div
                    :class="'rounded-xl px-3 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 border-2 ' + (arenaYourOutcome() === 'win' ? 'bg-c-mint text-c-ink border-c-green anim-win-glow' : (arenaYourOutcome() === 'loss' ? 'bg-c-rose text-c-red-deep border-c-red anim-shake' : 'bg-c-cream-amber text-c-amber-ink border-c-amber'))"
                  >
                    <span x-show="arenaYourOutcome() === 'win'" class="shrink-0">${iconSvg('check-circle', 'w-4 h-4')}</span>
                    <span class="leading-snug" x-text="arenaOutcomeText()"></span>
                  </div>

                  <div
                    x-show="arenaNewlyCompletedQuartetName()"
                    class="rounded-xl bg-c-mint border-2 border-c-green px-3 py-2 text-xs font-bold text-c-ink flex items-center justify-center gap-1.5 anim-pop-in"
                  >
                    <span class="text-c-green shrink-0">${iconSvg('award', 'w-4 h-4')}</span>
                    <span class="leading-snug" x-text="t.arena.quartetCompleted + ' ' + arenaNewlyCompletedQuartetName()"></span>
                  </div>

                  <button
                    type="button"
                    @click="nextRound()"
                    class="w-full min-h-11 py-2.5 px-3 rounded-xl bg-c-teal hover:bg-c-teal-deep text-white border-2 border-c-ink font-bold text-sm shadow-[0_3px_0_var(--c-line)] active:translate-y-0.5 transition-all inline-flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <span x-text="t.arena.nextRound"></span>
                    ${iconSvg('arrow-right', 'w-4 h-4')}
                  </button>
                </div>

                <div
                  x-show="!(isReveal() && activeMatch.lastRound)"
                  :class="'w-full rounded-2xl bg-c-paper-hi ink-panel p-5 max-lg:p-2.5 space-y-2.5 max-lg:space-y-0 ' + (isYourTurn() ? 'animate-gentle-bob' : '')"
                >
                  <div
                    :class="'max-lg:hidden inline-flex items-center justify-center w-12 h-12 rounded-xl border-2 border-c-ink mx-auto ' + (isYourTurn() ? 'bg-c-sky text-c-teal' : 'bg-c-paper text-c-ink-3')"
                  >
                    <span x-show="isYourTurn()">${iconSvg('swords', 'w-5 h-5')}</span>
                    <span x-show="!isYourTurn()">${iconSvg('sparkles', 'w-5 h-5')}</span>
                  </div>
                  <div
                    class="font-display text-lg max-lg:text-base font-extrabold text-c-ink"
                    x-text="isYourTurn() ? t.arena.yourTurnTitle : t.arena.oppTurnTitle"
                  ></div>
                  <p
                    class="max-lg:hidden text-xs text-c-ink-2 leading-relaxed"
                    x-text="isYourTurn() ? t.arena.yourTurnDesc : t.arena.oppTurnDesc"
                  ></p>
                </div>
              </div>

              <!-- Opponent Card -->
              <div :class="'lg:col-span-4 w-full flex-col items-center ' + (isReveal() ? 'flex' : 'max-lg:hidden flex')">
                <div
                  class="mb-2 text-xs font-extrabold text-c-orange bg-c-paper px-3 py-1 rounded-lg border-2 border-c-ink shadow-[0_2px_0_var(--c-line)]"
                  x-text="isReveal() ? t.arena.revealedCard : t.arena.hiddenStack"
                ></div>
                <div x-show="isReveal() && arenaOppCard()" class="w-full flex justify-center anim-flip-in">
                  ${renderTurbineCard('arenaOppCard()', {
                    selectedStatExpr: 'activeMatch.lastRound ? activeMatch.lastRound.chosenStat : null',
                    highlightOutcomeExpr: 'arenaOppOutcome()',
                    hideMediaOnMobile: true,
                    statModeExpr: 'activeMatch.deckMode',
                  })}
                </div>
                <div x-show="!(isReveal() && arenaOppCard())" class="w-full flex justify-center">
                  ${renderTurbineCardBack('activeMatch.opponent.cardCount', 'activeMatch.opponent.callsign', false)}
                </div>
              </div>
            </div>

            <!-- Compact Quartet Collector Strip -->
            <div class="rounded-2xl bg-c-paper-hi/95 border-2 border-c-ink px-4 py-2.5 space-y-3 shadow-[0_3px_0_var(--c-line)]">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div class="flex items-center gap-3 flex-wrap">
                  <span class="text-xs font-bold text-c-ink" x-text="t.arena.quartetStripLabel + ':'"></span>
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <template x-for="g in matchGroups()" :key="g.id">
                      <div
                        :title="g.code + '. ' + groupName(g.id) + ' (' + ownedGroupCount(g.id) + '/4)'"
                        :class="'px-2 py-1 rounded-lg border font-mono text-[11px] font-bold flex items-center gap-1 ' + (activeMatch.you.completedQuartets.includes(g.id) ? 'bg-c-green border-c-ink text-white' : (ownedGroupCount(g.id) > 0 ? 'bg-c-sky border-c-teal text-c-ink' : 'bg-c-paper border-c-ink/20 text-c-ink-4'))"
                      >
                        <span x-text="g.code"></span>
                        <span class="text-[10px] opacity-85" x-text="ownedGroupCount(g.id) + '/4'"></span>
                      </div>
                    </template>
                  </div>
                </div>

                <button
                  type="button"
                  @click="toggleMatrixDrawer()"
                  class="text-xs font-bold text-c-teal hover:text-c-ink hover:underline inline-flex items-center gap-1 whitespace-nowrap"
                >
                  <span x-text="showMatrixDrawer ? t.arena.hideMatrix : t.arena.showMatrix"></span>
                  <span x-show="showMatrixDrawer">${iconSvg('chevron-up', 'w-3.5 h-3.5')}</span>
                  <span x-show="!showMatrixDrawer">${iconSvg('chevron-down', 'w-3.5 h-3.5')}</span>
                </button>
              </div>

              <div x-show="showMatrixDrawer">
                ${renderQuartetMatrix('activeMatch.you.ownedCardIds', 'activeMatch.you.completedQuartets', 't.arena.quartetStripLabel', 'matchGroups()', 'matchQuartetTotal()')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  `;
}

export function renderCompendium(): string {
  return `
    <section x-show="activeTab === 'compendium'" class="max-w-7xl mx-auto space-y-6">
      <div class="rounded-2xl bg-c-paper-hi ink-panel p-6 space-y-4">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 class="font-display text-2xl sm:text-3xl font-extrabold text-c-ink" x-text="t.compendium.title"></h2>
            <p class="mt-1 text-sm text-c-ink-2 max-w-2xl" x-text="t.compendium.subtitle"></p>
          </div>

          <div class="relative w-full md:w-72">
            <span class="text-c-ink-3 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              ${iconSvg('search', 'w-4 h-4')}
            </span>
            <input
              type="text"
              x-model="compendiumSearch"
              :placeholder="t.compendium.searchPlaceholder"
              class="w-full pl-9 pr-3 py-2.5 rounded-xl bg-c-paper border-2 border-c-ink/30 text-sm text-c-ink placeholder:text-c-ink-4 focus:border-c-teal focus:outline-none"
            />
          </div>
        </div>

        <div x-show="deckModes.includes('records')" class="flex flex-wrap items-center gap-1.5 pt-1" role="tablist">
          <template x-for="d in [{ id: 'modern', label: t.decks.tabModern }, { id: 'records', label: t.decks.tabRecords }]" :key="d.id">
            <button
              type="button"
              role="tab"
              :aria-selected="compendiumDeck === d.id"
              @click="setCompendiumDeck(d.id)"
              :class="'px-3.5 py-2 min-h-10 rounded-xl text-xs font-bold transition-colors whitespace-nowrap border-2 ' + (compendiumDeck === d.id ? 'bg-c-orange border-c-ink text-c-paper-hi' : 'bg-c-paper-hi text-c-ink hover:bg-c-sand border-c-ink/30')"
              x-text="d.label"
            ></button>
          </template>
        </div>

        <div class="flex flex-wrap items-center gap-1.5 pt-1">
          <button
            type="button"
            @click="compendiumGroup = 'all'"
            :class="'px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap border-2 ' + (compendiumGroup === 'all' ? 'bg-c-green border-c-ink text-white' : 'bg-c-paper text-c-ink hover:bg-c-sand border-c-ink/25')"
            x-text="t.compendium.allQuartets"
          ></button>
          <template x-for="g in compendiumGroups()" :key="g.id">
            <button
              type="button"
              @click="compendiumGroup = g.id"
              :class="'px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap border-2 ' + (compendiumGroup === g.id ? 'bg-c-teal border-c-ink text-white' : 'bg-c-paper text-c-ink hover:bg-c-sand border-c-ink/25')"
              x-text="g.code + '. ' + groupName(g.id)"
            ></button>
          </template>
        </div>
      </div>

      <div
        x-show="filteredDeck().length === 0"
        class="rounded-2xl bg-c-paper-hi ink-panel p-10 text-center text-sm text-c-ink-2"
        x-text="t.compendium.noMatches"
      ></div>

      <div
        x-show="filteredDeck().length > 0"
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-center"
      >
        <template x-for="card in filteredDeck()" :key="card.id">
          <div class="w-full flex flex-col items-center space-y-2.5">
            ${renderTurbineCard('card', { compact: true, playfulHover: true })}
            <div class="w-full max-w-[308px] flex items-start justify-between gap-2 px-1">
              <p class="text-xs text-c-ink-2 leading-relaxed line-clamp-2" x-text="cardLocale(card).engineeringNote"></p>
              <button
                type="button"
                @click="inspectCard(card)"
                class="text-[11px] font-bold text-c-teal hover:text-c-ink hover:underline inline-flex items-center gap-1 shrink-0 whitespace-nowrap"
              >
                ${iconSvg('maximize', 'w-3 h-3')}
                <span x-text="t.compendium.inspectFull"></span>
              </button>
            </div>
          </div>
        </template>
      </div>
    </section>
  `;
}

export function renderLeaderboard(): string {
  return `
    <section x-show="activeTab === 'leaderboard'" class="max-w-6xl mx-auto space-y-6">
      <div class="rounded-2xl bg-c-paper-hi ink-panel p-6">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 class="font-display text-2xl sm:text-3xl font-extrabold text-c-ink" x-text="t.leaderboard.title"></h2>
            <p class="mt-1 text-sm text-c-ink-2" x-text="t.leaderboard.subtitle"></p>
          </div>
          <button
            type="button"
            @click="setTab('arena')"
            class="px-4 py-2.5 rounded-xl bg-c-green hover:bg-c-green-deep text-c-paper-hi border-2 border-c-ink font-bold text-sm shadow-[0_3px_0_var(--c-line)] active:translate-y-0.5 transition-all inline-flex items-center gap-2 self-start whitespace-nowrap"
          >
            ${iconSvg('swords', 'w-4 h-4')}
            <span x-text="t.leaderboard.playRanked"></span>
          </button>
        </div>

        <div class="mt-5 pt-4 border-t-2 border-c-ink/15 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-c-ink-2">
          <template x-for="tier in allRankTiers()" :key="tier.name">
            <div class="flex items-center gap-2">
              <span class="font-bold" :style="'color:' + tier.accentHex" x-text="tier.displayName"></span>
              <span class="font-mono tabular-nums text-c-ink-4" x-text="tier.minElo === 0 ? '<1150' : (tier.minElo + '+')"></span>
            </div>
          </template>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div class="lg:col-span-8 rounded-2xl bg-c-paper-hi ink-panel overflow-hidden">
          <div class="px-5 py-4 border-b-2 border-c-ink/15 flex items-center justify-between bg-c-paper">
            <h3 class="font-display text-base font-bold text-c-ink flex items-center gap-2">
              <span class="text-c-orange">${iconSvg('trophy', 'w-4 h-4')}</span>
              <span x-text="t.leaderboard.standings"></span>
            </h3>
            <span class="font-mono tabular-nums text-xs font-bold text-c-ink-2" x-text="leaderboard.length + ' ' + t.leaderboard.rankedPlayers"></span>
          </div>

          <div x-show="leaderboard.length === 0" class="p-10 text-center space-y-3">
            <div class="text-c-ink-5 flex justify-center">${iconSvg('award', 'w-10 h-10')}</div>
            <div class="font-display text-lg font-bold text-c-ink" x-text="t.leaderboard.emptyTitle"></div>
            <p class="text-sm text-c-ink-2 max-w-md mx-auto" x-text="t.leaderboard.emptyDesc"></p>
          </div>

          <div x-show="leaderboard.length > 0" class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-sm">
              <thead>
                <tr class="border-b-2 border-c-ink/15 text-xs text-c-ink-2 bg-c-paper/70 whitespace-nowrap">
                  <th class="py-3 px-4 font-bold" x-text="t.leaderboard.colRank"></th>
                  <th class="py-3 px-4 font-bold" x-text="t.leaderboard.colPlayer"></th>
                  <th class="py-3 px-4 font-bold" x-text="t.leaderboard.colTier"></th>
                  <th class="py-3 px-4 font-bold text-right" x-text="t.leaderboard.colElo"></th>
                  <th class="py-3 px-4 font-bold text-right" x-text="t.leaderboard.colWld"></th>
                  <th class="py-3 px-4 font-bold text-right" x-text="t.leaderboard.colWinPct"></th>
                  <th class="py-3 px-4 font-bold text-right" x-text="t.leaderboard.colQuartets"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-c-ink/10">
                <template x-for="(p, idx) in leaderboard" :key="p.id">
                  <tr :class="p.id === playerId ? 'bg-c-sky text-c-ink' : 'hover:bg-c-paper text-c-ink'">
                    <td class="py-3 px-4 font-mono tabular-nums font-bold text-c-ink-2" x-text="'#' + (idx + 1)"></td>
                    <td class="py-3 px-4 font-bold text-c-ink">
                      <span x-text="p.callsign"></span>
                      <span x-show="p.id === playerId" class="ml-2 text-xs font-bold text-c-teal" x-text="'(' + t.arena.you + ')'"></span>
                    </td>
                    <td class="py-3 px-4 text-xs font-bold" :style="'color:' + tierForElo(p.elo).accentHex" x-text="tierForElo(p.elo).name"></td>
                    <td class="py-3 px-4 text-right font-mono tabular-nums font-bold text-c-ink" x-text="p.elo"></td>
                    <td class="py-3 px-4 text-right font-mono tabular-nums text-xs text-c-ink-2" x-text="p.wins + '-' + p.losses + '-' + p.draws"></td>
                    <td class="py-3 px-4 text-right font-mono tabular-nums text-xs text-c-ink-2" x-text="(p.gamesPlayed > 0 ? Math.round((p.wins / p.gamesPlayed) * 100) : 0) + '%'"></td>
                    <td class="py-3 px-4 text-right font-mono tabular-nums text-xs font-bold text-c-green" x-text="p.quartetsCompleted"></td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </div>

        <div class="lg:col-span-4 rounded-2xl bg-c-paper-hi ink-panel overflow-hidden">
          <div class="px-5 py-4 border-b-2 border-c-ink/15 bg-c-paper">
            <h3 class="font-display text-base font-bold text-c-ink" x-text="t.leaderboard.recentMatches"></h3>
          </div>

          <div x-show="recentMatches.length === 0" class="p-6 text-center text-xs text-c-ink-2" x-text="t.leaderboard.noMatchesYet"></div>

          <ul x-show="recentMatches.length > 0" class="divide-y divide-c-ink/10">
            <template x-for="m in recentMatches" :key="m.id">
              <li class="px-5 py-3.5 text-xs space-y-1">
                <div class="flex items-center justify-between gap-2">
                  <span
                    class="font-bold text-c-ink truncate"
                    x-text="m.isDraw ? (m.player1Callsign + ' vs ' + m.player2Callsign) : (m.winnerCallsign + (lang === 'de' ? ' besiegt ' : ' def. ') + m.loserCallsign)"
                  ></span>
                  <span class="font-mono tabular-nums text-c-ink-4 shrink-0" x-text="formatRelativeTime(m.finishedAt)"></span>
                </div>
                <div class="flex items-center justify-between text-c-ink-2">
                  <span
                    class="font-mono tabular-nums"
                    x-text="m.player1Cards + '–' + m.player2Cards + ' ' + t.leaderboard.cards + ' · ' + m.roundsPlayed + ' ' + t.leaderboard.rounds"
                  ></span>
                  <span x-show="!m.isDraw" class="font-mono tabular-nums font-bold text-c-green" x-text="'+' + m.eloDelta + ' pts'"></span>
                </div>
              </li>
            </template>
          </ul>
        </div>
      </div>
    </section>
  `;
}

export function renderTutorial(): string {
  return `
    <section x-show="activeTab === 'tutorial'" class="max-w-6xl mx-auto space-y-6">
      <div class="rounded-2xl bg-c-paper-hi ink-panel p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 class="font-display text-2xl sm:text-3xl font-extrabold text-c-ink" x-text="t.tutorial.title"></h2>
          <p class="mt-1 text-sm text-c-ink-2" x-text="t.tutorial.subtitle"></p>
        </div>

        <div class="flex flex-wrap items-center gap-1.5 bg-c-paper p-1.5 rounded-xl border-2 border-c-ink">
          <template x-for="(label, idx) in t.tutorial.steps" :key="idx">
            <button
              type="button"
              @click="setTutorialStep(idx)"
              :class="'px-3 py-2.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ' + (tutorialStep === idx ? 'bg-c-teal text-white' : 'text-c-ink-3 hover:text-c-ink hover:bg-c-sand')"
              x-text="(idx + 1) + '. ' + label"
            ></button>
          </template>
        </div>
      </div>

      <!-- Step 1 -->
      <div x-show="tutorialStep === 0" class="rounded-2xl bg-c-paper-hi ink-panel p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div class="lg:col-span-5 flex justify-center">
          ${renderTurbineCard("cardById('2A')", {
            selectableExpr: 'true',
            selectedStatExpr: 'tutorialInspectedStat',
            onSelectStatHandler: 'setTutorialInspectedStat(stat.key)',
          })}
        </div>

        <div class="lg:col-span-7 space-y-5">
          <div>
            <div class="text-xs font-extrabold uppercase tracking-wide text-c-teal" x-text="t.tutorial.step1Tag"></div>
            <h3 class="mt-1 font-display text-2xl font-extrabold text-c-ink" x-text="t.tutorial.step1Title"></h3>
            <p class="mt-2 text-sm text-c-ink-2 leading-relaxed" x-text="t.tutorial.step1Desc"></p>
          </div>

          <div class="rounded-2xl bg-c-paper border-2 border-c-ink/25 p-5 space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <span
                class="font-display text-lg font-bold text-c-ink"
                x-text="t.stats[tutorialInspectedStat].label + ' (' + statDef(tutorialInspectedStat).unit + ')'"
              ></span>
              <span
                :class="'text-xs font-bold px-2.5 py-1 rounded-lg border-2 whitespace-nowrap ' + (statDef(tutorialInspectedStat).higherWins ? 'bg-c-mint text-c-ink border-c-green' : 'bg-c-peach text-c-orange-deep border-c-orange')"
                x-text="statDef(tutorialInspectedStat).higherWins ? t.card.higherWins : t.card.lowerWins"
              ></span>
            </div>
            <p class="text-sm text-c-ink" x-text="t.stats[tutorialInspectedStat].description"></p>
            <div
              class="text-xs font-medium text-c-ink-2 pt-1"
              x-text="tutorialInspectedStat === 'cutInWindMs' ? t.tutorial.step1TipCutIn : (tutorialInspectedStat === 'hubHeightM' ? t.tutorial.step1TipHub : t.tutorial.step1TipDefault)"
            ></div>
          </div>

          <div class="flex justify-end">
            <button
              type="button"
              @click="setTutorialStep(1)"
              class="px-5 py-2.5 rounded-xl bg-c-green hover:bg-c-green-deep text-c-paper-hi border-2 border-c-ink font-bold text-sm shadow-[0_3px_0_var(--c-line)] active:translate-y-0.5 transition-all inline-flex items-center gap-2 whitespace-nowrap"
            >
              <span x-text="t.tutorial.nextStep2"></span>
              ${iconSvg('arrow-right', 'w-4 h-4')}
            </button>
          </div>
        </div>
      </div>

      <!-- Step 2 -->
      <div x-show="tutorialStep === 1" class="rounded-2xl bg-c-paper-hi ink-panel p-6 space-y-6">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div class="text-xs font-extrabold uppercase tracking-wide text-c-teal" x-text="t.tutorial.step2Tag"></div>
            <h3 class="mt-1 font-display text-2xl font-extrabold text-c-ink" x-text="t.tutorial.step2Title"></h3>
            <p class="mt-1 text-sm text-c-ink-2" x-text="t.tutorial.step2Desc"></p>
          </div>

          <button
            x-show="tutorialPracticeStat"
            type="button"
            @click="resetTutorialPractice()"
            class="px-3.5 py-2 rounded-xl bg-c-paper hover:bg-c-sand text-xs font-bold text-c-ink border-2 border-c-ink self-start whitespace-nowrap"
            x-text="t.tutorial.resetPractice"
          ></button>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-11 gap-4 items-center justify-items-center">
          <div class="lg:col-span-4 w-full flex justify-center">
            ${renderTurbineCard("cardById('3C')", {
              selectableExpr: 'tutorialPracticeStat === null',
              selectedStatExpr: 'tutorialPracticeStat',
              highlightOutcomeExpr: 'tutorialYourOutcome()',
              onSelectStatHandler: 'playTutorialPracticeStat(stat.key)',
            })}
          </div>

          <div class="lg:col-span-3 w-full max-w-[356px] lg:max-w-none text-center space-y-3 px-1 sm:px-2">
            <div x-show="!tutorialPracticeStat" class="rounded-2xl bg-c-paper border-2 border-c-ink/25 p-4">
              <div class="font-display font-bold text-c-ink text-base" x-text="t.tutorial.pickYourStat"></div>
              <p class="mt-1.5 text-xs text-c-ink-2" x-text="t.tutorial.pickHint"></p>
            </div>
            <div x-show="tutorialPracticeStat" class="rounded-2xl bg-c-paper border-2 border-c-ink/25 p-4 space-y-2.5">
              <div
                :class="'text-sm font-bold flex items-center justify-center gap-1.5 ' + (tutorialPracticeResult() === 1 ? 'text-c-green' : (tutorialPracticeResult() === 2 ? 'text-c-red' : 'text-c-amber-deep'))"
              >
                <span x-show="tutorialPracticeResult() === 1" class="shrink-0">${iconSvg('check-circle', 'w-4 h-4')}</span>
                <span x-text="tutorialPracticeResult() === 1 ? t.tutorial.youWinBoth : (tutorialPracticeResult() === 2 ? t.tutorial.oppWinsHint : t.tutorial.exactTie)"></span>
              </div>
              <p class="text-xs text-c-ink" x-text="tutorialPracticeResult() === 1 ? t.tutorial.winDesc : t.tutorial.lossDesc"></p>
            </div>
          </div>

          <div class="lg:col-span-4 w-full flex justify-center">
            <div x-show="tutorialPracticeStat" class="w-full flex justify-center">
              ${renderTurbineCard("cardById('1B')", {
                selectedStatExpr: 'tutorialPracticeStat',
                highlightOutcomeExpr: 'tutorialOppOutcome()',
              })}
            </div>
            <div x-show="!tutorialPracticeStat" class="w-full flex justify-center">
              ${renderTurbineCardBack('16', "lang === 'de' ? 'Prototypen-Stapel' : 'Prototype Stack'", false)}
            </div>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button
            type="button"
            @click="setTutorialStep(0)"
            class="px-4 py-2 rounded-xl bg-c-paper hover:bg-c-sand border-2 border-c-ink text-c-ink text-xs sm:text-sm font-bold inline-flex items-center gap-2 whitespace-nowrap"
          >
            ${iconSvg('arrow-left', 'w-4 h-4')}
            <span x-text="t.tutorial.prev"></span>
          </button>
          <button
            type="button"
            @click="setTutorialStep(2)"
            class="px-4 sm:px-5 py-2.5 rounded-xl bg-c-green hover:bg-c-green-deep text-c-paper-hi border-2 border-c-ink font-bold text-xs sm:text-sm shadow-[0_3px_0_var(--c-line)] active:translate-y-0.5 transition-all inline-flex items-center gap-2 whitespace-nowrap"
          >
            <span x-text="t.tutorial.nextStep3"></span>
            ${iconSvg('arrow-right', 'w-4 h-4')}
          </button>
        </div>
      </div>

      <!-- Step 3 -->
      <div x-show="tutorialStep === 2" class="rounded-2xl bg-c-paper-hi ink-panel p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div class="lg:col-span-6 space-y-5">
          <div>
            <div class="text-xs font-extrabold uppercase tracking-wide text-c-teal" x-text="t.tutorial.step3Tag"></div>
            <h3 class="mt-1 font-display text-2xl font-extrabold text-c-ink" x-text="t.tutorial.step3Title"></h3>
          </div>

          <div class="space-y-4">
            <div class="rounded-xl bg-c-paper border-2 border-c-ink/20 p-4 flex items-start gap-3.5">
              <div class="w-9 h-9 rounded-lg bg-c-cream-amber border-2 border-c-amber flex items-center justify-center text-c-amber-deep shrink-0">
                ${iconSvg('layers', 'w-5 h-5')}
              </div>
              <div>
                <h4 class="font-display font-bold text-sm text-c-ink" x-text="t.tutorial.tiePotTitle"></h4>
                <p class="mt-1 text-xs text-c-ink-2 leading-relaxed" x-text="t.tutorial.tiePotDesc"></p>
              </div>
            </div>

            <div class="rounded-xl bg-c-paper border-2 border-c-ink/20 p-4 flex items-start gap-3.5">
              <div class="w-9 h-9 rounded-lg bg-c-mint border-2 border-c-green flex items-center justify-center text-c-green shrink-0">
                ${iconSvg('award', 'w-5 h-5')}
              </div>
              <div>
                <h4 class="font-display font-bold text-sm text-c-ink" x-text="t.tutorial.quartetTitle"></h4>
                <p class="mt-1 text-xs text-c-ink-2 leading-relaxed" x-text="t.tutorial.quartetDesc"></p>
              </div>
            </div>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="button"
              @click="setTutorialStep(1)"
              class="px-4 py-2 rounded-xl bg-c-paper hover:bg-c-sand border-2 border-c-ink text-c-ink text-xs sm:text-sm font-bold inline-flex items-center gap-2 whitespace-nowrap"
            >
              ${iconSvg('arrow-left', 'w-4 h-4')}
              <span x-text="t.tutorial.prev"></span>
            </button>
            <button
              type="button"
              @click="setTutorialStep(3)"
              class="px-4 sm:px-5 py-2.5 rounded-xl bg-c-green hover:bg-c-green-deep text-c-paper-hi border-2 border-c-ink font-bold text-xs sm:text-sm shadow-[0_3px_0_var(--c-line)] active:translate-y-0.5 transition-all inline-flex items-center gap-2 whitespace-nowrap"
            >
              <span x-text="t.tutorial.nextStep4"></span>
              ${iconSvg('arrow-right', 'w-4 h-4')}
            </button>
          </div>
        </div>

        <div class="lg:col-span-6">
          ${renderQuartetMatrix(
            "['1A', '1B', '1C', '1D', '2A', '2B', '2C', '3A', '3B', '5A', '5B', '5C', '5D', '8A', '8C']",
            '[1, 5]',
            't.tutorial.exampleMatrix',
            'quartetGroups.filter((g) => g.id <= 8)',
            '8'
          )}
        </div>
      </div>

      <!-- Step 4 -->
      <div x-show="tutorialStep === 3" class="rounded-2xl bg-c-paper-hi ink-panel p-6 space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="rounded-xl bg-c-paper border-2 border-c-ink/20 p-5 space-y-3">
            <div class="w-10 h-10 rounded-lg bg-c-sky border-2 border-c-teal flex items-center justify-center text-c-teal">
              ${iconSvg('users', 'w-5 h-5')}
            </div>
            <h3 class="font-display text-lg font-bold text-c-ink" x-text="t.tutorial.mpTitle"></h3>
            <p class="text-sm text-c-ink-2 leading-relaxed" x-text="t.tutorial.mpDesc"></p>
          </div>

          <div class="rounded-xl bg-c-paper border-2 border-c-ink/20 p-5 space-y-3">
            <div class="w-10 h-10 rounded-lg bg-c-peach border-2 border-c-orange flex items-center justify-center text-c-orange-deep">
              ${iconSvg('trophy', 'w-5 h-5')}
            </div>
            <h3 class="font-display text-lg font-bold text-c-ink" x-text="t.tutorial.eloTitle"></h3>
            <p class="text-sm text-c-ink-2 leading-relaxed" x-text="t.tutorial.eloDesc"></p>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-4 pt-2 border-t-2 border-c-ink/15">
          <button
            type="button"
            @click="setTutorialStep(2)"
            class="px-4 py-2 rounded-xl bg-c-paper hover:bg-c-sand border-2 border-c-ink text-c-ink text-sm font-bold inline-flex items-center gap-2 whitespace-nowrap"
          >
            ${iconSvg('arrow-left', 'w-4 h-4')}
            <span x-text="t.tutorial.prev"></span>
          </button>

          <div class="flex flex-wrap items-center gap-3">
            <button
              type="button"
              @click="startBotMatch('standard')"
              class="px-5 py-2.5 rounded-xl bg-c-paper hover:bg-c-sand text-c-ink border-2 border-c-ink font-bold text-sm inline-flex items-center gap-2 whitespace-nowrap"
            >
              <span class="text-c-green">${iconSvg('play', 'w-4 h-4')}</span>
              <span x-text="t.tutorial.startBotBtn"></span>
            </button>
            <button
              type="button"
              @click="setTab('arena')"
              class="px-5 py-2.5 rounded-xl bg-c-green hover:bg-c-green-deep text-c-paper-hi border-2 border-c-ink font-bold text-sm shadow-[0_3px_0_var(--c-line)] active:translate-y-0.5 transition-all inline-flex items-center gap-2 whitespace-nowrap"
            >
              <span x-text="t.tutorial.enterArenaBtn"></span>
              ${iconSvg('arrow-right', 'w-4 h-4')}
            </button>
          </div>
        </div>
      </div>
    </section>
  `;
}

export function renderCardDetailModal(): string {
  return `
    <template x-if="inspectedCard">
      <div
        @click="closeModal()"
        class="fixed inset-0 z-50 bg-[#0B1A22]/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
        role="dialog"
        aria-modal="true"
        :aria-label="inspectedCard.modelName"
      >
        <div
          @click.stop
          class="w-full max-w-5xl rounded-2xl bg-c-paper-hi text-c-ink border-[3px] border-c-ink shadow-[0_8px_0_var(--c-line)] overflow-hidden my-auto max-h-[92vh] flex flex-col"
        >
          <!-- Category Color Crest Band -->
          <div class="h-1.5 w-full shrink-0" :style="'background-color:' + cardTheme(inspectedCard).border"></div>

          <!-- Option 1: Two-Column Split Field-Guide Dossier -->
          <div class="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 items-stretch divide-y-2 md:divide-y-0 md:divide-x-2 divide-c-ink/15">
            <!-- Left Column: Uncropped Full-Length Specimen Gallery Frame -->
            <div class="md:col-span-5 p-4 sm:p-5 bg-c-paper flex flex-col justify-between space-y-3.5">
              <!-- Mobile-Only Header Bar with Card ID & Instant Close -->
              <div class="flex md:hidden items-center justify-between gap-2 pb-0.5">
                <div class="flex items-center gap-2 min-w-0">
                  <div
                    :style="'background-color:' + cardTheme(inspectedCard).stampBg + '; color:' + cardTheme(inspectedCard).stampText"
                    class="w-7 h-7 rounded-full shrink-0 flex items-center justify-center font-mono font-bold text-xs border-2 border-c-ink"
                    x-text="inspectedCard.id"
                  ></div>
                  <span class="text-xs font-bold text-c-ink truncate" x-text="inspectedCard.modelName"></span>
                </div>
                <button
                  type="button"
                  @click="closeModal()"
                  :aria-label="t.card.close"
                  class="w-8 h-8 rounded-lg bg-c-paper-hi hover:bg-c-sand border-2 border-c-ink text-c-ink flex items-center justify-center shrink-0 shadow-[0_1.5px_0_var(--c-line)] active:translate-y-0.5 transition-all"
                >
                  ${iconSvg('x', 'w-4 h-4')}
                </button>
              </div>

              <div
                class="relative w-full rounded-xl bg-c-paper-hi border-2 border-c-ink/30 p-2 sm:p-3 shadow-inner flex flex-col items-center justify-center min-h-[300px] sm:min-h-[380px] md:min-h-[440px] flex-1"
                x-data="{ imgFailed: false }"
                x-effect="void (inspectedCard?.id); imgFailed = false"
              >
                <!-- Subtle Field-Guide Measurement Ticks -->
                <div class="absolute left-1.5 inset-y-4 flex flex-col justify-between pointer-events-none opacity-35" aria-hidden="true">
                  <div class="w-1.5 h-0.5 bg-c-ink"></div>
                  <div class="w-1 h-0.5 bg-c-ink"></div>
                  <div class="w-1.5 h-0.5 bg-c-ink"></div>
                  <div class="w-1 h-0.5 bg-c-ink"></div>
                  <div class="w-1.5 h-0.5 bg-c-ink"></div>
                  <div class="w-1 h-0.5 bg-c-ink"></div>
                  <div class="w-1.5 h-0.5 bg-c-ink"></div>
                </div>

                <!-- Complete Uncropped Wind Turbine Photo (Zero Cut-Off) -->
                <img
                  x-show="!imgFailed"
                  :src="photoUrl(inspectedCard)"
                  :alt="inspectedCard.modelName + ' (' + inspectedCard.flagshipPlant + ')'"
                  referrerpolicy="no-referrer"
                  @error="imgFailed = true"
                  class="w-full h-full max-h-[360px] sm:max-h-[420px] md:max-h-[480px] object-contain rounded-lg select-none"
                />

                <div
                  x-show="imgFailed"
                  class="h-64 w-full bg-gradient-to-br from-c-sky to-c-paper flex flex-col items-center justify-center text-c-teal p-4 text-center rounded-lg"
                >
                  ${iconSvg('wind', 'w-10 h-10 mb-2')}
                  <span class="text-sm font-bold text-c-ink" x-text="inspectedCard.modelName"></span>
                  <span class="text-xs text-c-ink-2 mt-1" x-text="inspectedCard.manufacturer"></span>
                </div>
              </div>

              <!-- Uncropped Specimen Info & Provenance Tag -->
              <div class="rounded-xl bg-c-paper-hi border-2 border-c-ink/20 p-3 space-y-1 text-xs">
                <div class="flex items-center justify-between gap-2">
                  <span class="font-bold text-c-ink truncate" x-text="inspectedCard.flagshipPlant"></span>
                  <span
                    class="px-2 py-0.5 rounded text-[10px] font-bold border border-c-ink/25 whitespace-nowrap"
                    :class="inspectedCard.isRealPhoto ? 'bg-c-mint text-c-green' : 'bg-c-paper text-c-amber-ink'"
                    x-text="inspectedCard.isRealPhoto ? t.card.photoReal : t.card.photoConcept"
                  ></span>
                </div>
                <div class="text-c-ink-2 text-[11px] flex items-center justify-between gap-2">
                  <span class="truncate" x-text="inspectedCard.flagshipLocation"></span>
                  <span class="font-mono tabular-nums font-semibold shrink-0" x-text="formatNumber(inspectedCard.turbineCountInPlant) + ' ' + (lang === 'de' ? 'Anlagen' : 'turbines')"></span>
                </div>
                <!-- Photo credit: author, licence and source for every real photograph -->
                <template x-if="photoCredit(inspectedCard)">
                  <div class="pt-1.5 mt-1 border-t border-c-ink/15 text-[10px] leading-snug text-c-ink-3">
                    <span x-text="t.decks.photoBy + ' '"></span>
                    <span class="font-semibold text-c-ink-2" x-text="photoCredit(inspectedCard).author"></span>
                    <span aria-hidden="true"> · </span>
                    <a
                      :href="photoCredit(inspectedCard).licenseUrl"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="underline hover:text-c-ink"
                      x-text="photoCredit(inspectedCard).license"
                    ></a>
                    <span aria-hidden="true"> · </span>
                    <a
                      :href="photoCredit(inspectedCard).sourceUrl"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="underline hover:text-c-ink"
                      x-text="t.decks.photoViewSource"
                    ></a>
                  </div>
                </template>
                <template x-if="!photoCredit(inspectedCard)">
                  <div class="pt-1.5 mt-1 border-t border-c-ink/15 text-[10px] leading-snug text-c-ink-3" x-text="t.decks.photoConcept"></div>
                </template>
              </div>

              <!-- Deck Navigation -->
              <div class="flex items-center justify-between gap-2 pt-0.5">
                <button
                  type="button"
                  @click="inspectPrevCard()"
                  class="px-3 py-1.5 rounded-lg bg-c-paper-hi hover:bg-c-sand border-2 border-c-ink text-xs font-bold text-c-ink inline-flex items-center gap-1.5 shadow-[0_2px_0_var(--c-line)] active:translate-y-0.5 transition-all whitespace-nowrap"
                >
                  ${iconSvg('arrow-left', 'w-3.5 h-3.5')}
                  <span x-text="t.card.prevCard"></span>
                </button>
                <span class="font-mono tabular-nums text-xs font-bold text-c-ink-2" x-text="inspectedCard.id + ' / ' + lastCardId(inspectedCard)"></span>
                <button
                  type="button"
                  @click="inspectNextCard()"
                  class="px-3 py-1.5 rounded-lg bg-c-paper-hi hover:bg-c-sand border-2 border-c-ink text-xs font-bold text-c-ink inline-flex items-center gap-1.5 shadow-[0_2px_0_var(--c-line)] active:translate-y-0.5 transition-all whitespace-nowrap"
                >
                  <span x-text="t.card.nextCard"></span>
                  ${iconSvg('arrow-right', 'w-3.5 h-3.5')}
                </button>
              </div>
            </div>

            <!-- Right Column: Specs, Stats & Engineering Dossier -->
            <div class="md:col-span-7 p-5 sm:p-6 flex flex-col justify-between space-y-4 bg-c-paper-hi">
              <!-- Header -->
              <div>
                <div class="flex items-start justify-between gap-3">
                  <div class="flex items-center gap-2.5 min-w-0">
                    <div
                      :style="'background-color:' + cardTheme(inspectedCard).stampBg + '; color:' + cardTheme(inspectedCard).stampText"
                      class="w-11 h-11 rounded-full shrink-0 flex items-center justify-center font-mono font-bold text-base border-2 border-c-ink shadow-[0_2px_0_var(--c-line)]"
                      :title="groupName(inspectedCard.groupId)"
                      x-text="inspectedCard.id"
                    ></div>
                    <div class="min-w-0">
                      <span
                        class="text-xs font-extrabold uppercase tracking-wide truncate block"
                        :style="'color:' + cardTheme(inspectedCard).border"
                        x-text="groupName(inspectedCard.groupId)"
                      ></span>
                      <span class="text-xs font-semibold text-c-ink-3" x-text="deploymentLabel(inspectedCard.deploymentType)"></span>
                    </div>
                  </div>

                  <button
                    type="button"
                    @click="closeModal()"
                    :aria-label="t.card.close"
                    class="w-9 h-9 rounded-xl bg-c-paper hover:bg-white border-2 border-c-ink text-c-ink flex items-center justify-center shadow-[0_2px_0_var(--c-line)] transition-colors shrink-0"
                  >
                    ${iconSvg('x', 'w-4 h-4')}
                  </button>
                </div>

                <h2 class="mt-2.5 font-display text-2xl sm:text-3xl font-extrabold text-c-ink leading-tight" x-text="inspectedCard.modelName"></h2>
                <div class="text-xs sm:text-sm text-c-ink-2 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span class="font-bold text-c-ink" x-text="inspectedCard.manufacturer"></span>
                  <span aria-hidden="true">·</span>
                  <span x-text="cardLocale(inspectedCard).country"></span>
                  <span aria-hidden="true">·</span>
                  <span class="font-mono tabular-nums font-semibold" x-text="inspectedCard.year"></span>
                </div>
              </div>

              <!-- 5 Stat Tiles Grid -->
              <div class="space-y-1.5">
                <div class="text-xs font-bold text-c-ink-2" x-text="lang === 'de' ? 'Vergleichswerte im Quartett' : 'Quartet Battle Stats'"></div>
                <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                  <template x-for="stat in statDefsFor(inspectedCard)" :key="stat.key">
                    <div class="rounded-xl bg-c-paper border-2 border-c-ink/20 p-2 sm:p-2.5 flex flex-col justify-between">
                      <div class="text-[10px] font-bold text-c-ink-2 truncate" x-text="t.stats[stat.key].shortLabel"></div>
                      <div class="my-0.5 font-mono tabular-nums text-base sm:text-lg font-bold text-c-ink leading-tight">
                        <span
                          :title="isApproxStat(inspectedCard, stat.key) ? t.card.approximate : null"
                          x-text="(isApproxStat(inspectedCard, stat.key) ? '≈ ' : '') + formatStatValue(stat.key, inspectedCard.stats[stat.key])"
                        ></span>
                        <span class="text-[10px] font-medium text-c-ink-2" x-text="stat.unit"></span>
                      </div>
                      <div
                        class="text-[9px] font-bold truncate flex items-center gap-0.5"
                        :style="'color:' + (stat.higherWins ? 'var(--c-green)' : 'var(--c-orange-deep)')"
                      >
                        <span x-show="stat.higherWins">${iconSvg('arrow-up', 'w-2 h-2')}</span>
                        <span x-show="!stat.higherWins">${iconSvg('arrow-down', 'w-2 h-2')}</span>
                        <span x-text="stat.higherWins ? (lang === 'de' ? 'Höher' : 'Max') : (lang === 'de' ? 'Niedriger' : 'Min')"></span>
                      </div>
                    </div>
                  </template>
                </div>
              </div>

              <!-- Technical Specifications Box -->
              <div class="rounded-xl bg-c-paper border-2 border-c-ink/20 p-3 sm:p-3.5 space-y-2 text-xs">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                  <div class="flex justify-between gap-2">
                    <span class="text-c-ink-2" x-text="t.card.drivetrain"></span>
                    <span class="font-bold text-c-ink text-right truncate" x-text="cardLocale(inspectedCard).drivetrain"></span>
                  </div>
                  <div class="flex justify-between gap-2">
                    <span class="text-c-ink-2" x-text="t.card.sweptArea"></span>
                    <span class="font-mono tabular-nums font-bold text-c-ink text-right" x-text="formatNumber(inspectedCard.sweptAreaM2) + ' m²'"></span>
                  </div>
                  <div class="flex justify-between gap-2">
                    <span class="text-c-ink-2" x-text="t.card.flagshipPlant"></span>
                    <span class="font-bold text-c-ink text-right truncate" x-text="inspectedCard.flagshipPlant"></span>
                  </div>
                  <div class="flex justify-between gap-2">
                    <span class="text-c-ink-2" x-text="t.card.deployedYear"></span>
                    <span class="font-mono tabular-nums font-bold text-c-ink text-right" x-text="inspectedCard.year"></span>
                  </div>
                </div>
              </div>

              <!-- Field Guide Fact & Source Link Button -->
              <div class="rounded-xl bg-c-paper border-2 border-c-ink/25 p-3.5 space-y-2.5">
                <div class="space-y-1">
                  <div class="text-xs font-bold text-c-green flex items-center gap-1.5">
                    ${iconSvg('wind', 'w-3.5 h-3.5')}
                    <span x-text="t.card.engineeringSummary"></span>
                  </div>
                  <p class="text-xs sm:text-sm text-c-ink leading-relaxed" x-text="cardLocale(inspectedCard).engineeringNote"></p>
                </div>

                <div class="pt-1 flex flex-wrap items-center justify-between gap-2 border-t border-c-ink/15">
                  <span class="text-[11px] text-c-ink-3 truncate max-w-[240px]" :title="inspectedCard.sourceLabel" x-text="inspectedCard.sourceLabel"></span>
                  <a
                    :href="inspectedCard.sourceUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="px-3.5 py-1.5 rounded-lg bg-c-teal hover:bg-c-teal-deep text-white border-2 border-c-ink font-bold text-xs inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 shadow-[0_2px_0_var(--c-line)]"
                  >
                    <span x-text="t.card.technicalSource"></span>
                    ${iconSvg('external-link', 'w-3.5 h-3.5')}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  `;
}

export function renderAppShell(): string {
  return `
    <div
      @keydown.escape.window="if (inspectedCard) closeModal()"
      @keydown.arrow-left.window="if (inspectedCard) inspectPrevCard()"
      @keydown.arrow-right.window="if (inspectedCard) inspectNextCard()"
      class="min-h-screen flex flex-col bg-c-canvas text-c-ink paper-grain"
    >
      ${renderHeader()}
      <main class="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8 pb-24 md:pb-8">
        ${renderLobby()}
        ${renderArena()}
        ${renderCompendium()}
        ${renderLeaderboard()}
        ${renderTutorial()}
      </main>
      ${renderCardDetailModal()}
    </div>
  `;
}
