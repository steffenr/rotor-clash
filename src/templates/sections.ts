import { renderTurbineCard, renderTurbineCardBack } from './cardMarkup';
import { iconSvg } from './icons';

export function renderQuartetMatrix(
  ownedIdsExpr: string,
  completedExpr: string,
  titleExpr: string
): string {
  return `
    <div class="rounded-xl bg-[#FFFDF7] border-2 border-[#173240] p-4">
      <div class="flex items-center justify-between gap-3 mb-3">
        <h3 class="font-display text-sm font-bold text-[#173240]" x-text="${titleExpr}"></h3>
        <span
          class="font-mono tabular-nums text-xs font-bold text-[#2F6F4E]"
          x-text="(${completedExpr}).length + '/8 ' + (lang === 'de' ? 'Quartette' : 'Quartets')"
        ></span>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <template x-for="group in quartetGroups" :key="group.id">
          <div
            :class="'rounded-lg p-2 border-2 transition-colors ' + ((${completedExpr}).includes(group.id) ? 'bg-[#E7F4EC] border-[#2F6F4E]' : 'bg-[#FAF4E4] border-[#173240]/20')"
          >
            <div class="flex items-center justify-between gap-1 mb-1.5">
              <span
                class="text-[11px] font-bold text-[#173240] truncate"
                :title="groupName(group.id)"
                x-text="group.code + '. ' + groupName(group.id)"
              ></span>
              <span x-show="(${completedExpr}).includes(group.id)" class="text-[#2F6F4E] shrink-0">
                ${iconSvg('check', 'w-3.5 h-3.5')}
              </span>
            </div>
            <div class="grid grid-cols-4 gap-1">
              <template x-for="slot in ['A', 'B', 'C', 'D']" :key="slot">
                <div
                  :title="cardTitleById(group.id + slot)"
                  :class="'h-6 rounded flex items-center justify-center font-mono text-[11px] font-bold border ' + ((${ownedIdsExpr}).includes(group.id + slot) ? ((${completedExpr}).includes(group.id) ? 'bg-[#2F6F4E] border-[#173240] text-white' : 'bg-[#1E7898] border-[#173240] text-white') : 'bg-[#EFE7D1] border-[#173240]/20 text-[#667D8A]')"
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
    <header class="sticky top-0 z-30 border-b-2 border-[#173240] bg-[#FAF4E4]/95 backdrop-blur-md">
      <!-- Subtle Coastal Dual Accent Line -->
      <div class="h-1 w-full flex" aria-hidden="true">
        <div class="flex-1 bg-[#1E7898]"></div>
        <div class="w-16 bg-[#173240]"></div>
        <div class="flex-1 bg-[#F15A24]"></div>
      </div>

      <div class="max-w-7xl mx-auto px-4 sm:px-6 h-20 sm:h-24 flex items-center justify-between gap-6 sm:gap-8">
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
            class="h-16 sm:h-20 w-auto object-contain transition-transform duration-150 group-hover:scale-[1.03]"
          />
          <span class="sr-only">Rotor Clash</span>
        </a>

        <!-- Zone 2: 4 Single-Line Navigation Links -->
        <nav class="hidden md:flex items-center gap-7 text-sm font-bold">
          <template x-for="item in navItems()" :key="item.id">
            <button
              type="button"
              @click="setTab(item.id)"
              :class="'py-1 border-b-[3px] transition-colors whitespace-nowrap shrink-0 ' + (activeTab === item.id ? 'border-[#F15A24] text-[#173240]' : 'border-transparent text-[#4B6675] hover:text-[#173240]')"
              x-text="item.label"
            ></button>
          </template>
        </nav>

        <!-- Zone 3: 1 Primary Action -->
        <div class="shrink-0">
          <button
            type="button"
            @click="handleHeaderQuickMatch()"
            class="px-4 py-2 rounded-xl bg-[#2F6F4E] hover:bg-[#23553C] text-[#FFFDF7] border-2 border-[#173240] font-bold text-xs sm:text-sm shadow-[0_3px_0_#173240] active:translate-y-0.5 transition-all whitespace-nowrap shrink-0"
            x-text="activeMatch ? t.nav.resumeMatch : (inQueue ? t.nav.searching : t.nav.quickMatch)"
          ></button>
        </div>
      </div>

      <!-- Mobile Secondary Tab Bar -->
      <div class="md:hidden border-t border-[#173240]/20 px-4 py-2 flex items-center justify-between gap-2 overflow-x-auto bg-[#F5EFE0]">
        <template x-for="item in navItems()" :key="item.id">
          <button
            type="button"
            @click="setTab(item.id)"
            :class="'px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 border ' + (activeTab === item.id ? 'bg-[#1E7898] border-[#173240] text-white' : 'border-transparent text-[#4B6675] hover:text-[#173240]')"
            x-text="item.label"
          ></button>
        </template>
      </div>
    </header>

    <!-- Workspace Utility Strip: Language Switcher & Audio Toggle -->
    <div class="border-b-2 border-[#173240]/15 bg-[#EAE1CA]/90">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-between gap-4 text-xs">
        <div class="text-[#3C5866] font-medium truncate">
          <span class="font-bold text-[#173240]" x-text="profile.callsign"></span>
          <span aria-hidden="true"> · </span>
          <span class="font-mono tabular-nums font-bold text-[#2F6F4E]" x-text="profile.elo + ' pts'"></span>
        </div>

        <div class="flex items-center gap-3 shrink-0">
          <button
            type="button"
            @click="toggleMute()"
            class="px-2.5 py-1 rounded-lg bg-[#FFFDF7] hover:bg-[#FAF4E4] border border-[#173240]/35 text-[#173240] font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <span x-show="muted" class="text-[#667D8A]">${iconSvg('volume-x', 'w-3.5 h-3.5')}</span>
            <span x-show="!muted" class="text-[#1E7898]">${iconSvg('volume-2', 'w-3.5 h-3.5')}</span>
            <span x-text="muted ? t.lobby.audioMuted : t.lobby.audioOn"></span>
          </button>

          <div
            class="inline-flex items-center gap-1 p-0.5 rounded-lg bg-[#FFFDF7] border border-[#173240]/35"
            role="group"
            aria-label="Language switcher"
          >
            <span class="text-[#3C5866] ml-1.5 mr-0.5">${iconSvg('globe', 'w-3.5 h-3.5')}</span>
            <button
              type="button"
              @click="setLang('en')"
              :class="'px-2.5 py-1 rounded-md text-xs font-bold transition-colors whitespace-nowrap ' + (lang === 'en' ? 'bg-[#1E7898] text-white' : 'text-[#4B6675] hover:text-[#173240]')"
            >
              EN
            </button>
            <button
              type="button"
              @click="setLang('de')"
              :class="'px-2.5 py-1 rounded-md text-xs font-bold transition-colors whitespace-nowrap ' + (lang === 'de' ? 'bg-[#1E7898] text-white' : 'text-[#4B6675] hover:text-[#173240]')"
            >
              DE
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Error Toast -->
    <div x-show="toastError" class="max-w-7xl mx-auto px-4 sm:px-6 pt-4 w-full">
      <div class="rounded-xl bg-[#FEECEB] border-2 border-[#DC2626] px-4 py-2.5 flex items-center justify-between gap-3 text-xs font-semibold text-[#7F1D1D]">
        <span x-text="toastError"></span>
        <button
          type="button"
          @click="toastError = null"
          aria-label="Dismiss message"
          class="text-[#991B1B] hover:text-[#7F1D1D]"
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
        <div class="lg:col-span-7 rounded-2xl bg-[#FFFDF7] ink-panel p-6 sm:p-8 flex flex-col justify-between space-y-6">
          <div class="space-y-4">
            <!-- Signature Coastal Speed-Stripe Emblem Plaque -->
            <div class="flex items-center gap-3 sm:gap-4 rounded-xl bg-[#FAF4E4] border-2 border-[#173240] px-4 py-2.5 shadow-[0_3px_0_#173240]">
              <div class="hidden sm:flex flex-col gap-1.5 flex-1 min-w-[28px]" aria-hidden="true">
                <div class="h-1.5 rounded-sm bg-[#1E7898]"></div>
                <div class="h-1.5 rounded-sm bg-[#F15A24]"></div>
              </div>
              <img
                src="/assets/aistudio/logo_rotor_clash_3a6e5dcc.png"
                alt="Rotor Clash"
                class="h-14 sm:h-16 w-auto object-contain shrink-0"
              />
              <div class="flex flex-col gap-1.5 flex-1 min-w-[28px]" aria-hidden="true">
                <div class="h-1.5 rounded-sm bg-[#1E7898]"></div>
                <div class="h-1.5 rounded-sm bg-[#F15A24]"></div>
              </div>
            </div>

            <div class="space-y-2.5 pt-1">
              <div class="text-xs font-extrabold tracking-wide uppercase text-[#F15A24]" x-text="t.lobby.kicker"></div>
              <h1
                class="font-display text-3xl sm:text-4xl font-extrabold text-[#173240] leading-tight max-w-2xl"
                style="text-wrap: balance;"
                x-text="t.lobby.heroTitle"
              ></h1>
              <p class="text-sm sm:text-base text-[#3C5866] max-w-2xl leading-relaxed" x-text="t.lobby.heroSubtitle"></p>
            </div>
          </div>

          <div x-show="inQueue" class="rounded-xl bg-[#DCEEF5] border-2 border-[#173240] p-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div class="font-display font-bold text-sm text-[#173240]" x-text="t.lobby.searchingTitle"></div>
              <div
                class="text-xs text-[#155B75] mt-0.5 font-mono tabular-nums font-bold"
                x-text="lobby.queueCount + ' ' + t.lobby.inQueue + ' · ' + lobby.onlineCount + ' ' + t.lobby.online"
              ></div>
            </div>
            <button
              type="button"
              @click="leaveQueue()"
              class="px-3.5 py-2 rounded-xl bg-[#FFFDF7] hover:bg-[#FAF4E4] border-2 border-[#173240] text-xs font-bold text-[#173240] whitespace-nowrap"
              x-text="t.lobby.cancelQueue"
            ></button>
          </div>

          <div x-show="hostedRoom" class="rounded-xl bg-[#E7F4EC] border-2 border-[#173240] p-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div class="text-xs text-[#2F6F4E] font-bold" x-text="t.lobby.roomReady"></div>
              <div class="mt-1 flex items-center gap-3">
                <span class="font-mono text-2xl font-bold tracking-widest text-[#173240]" x-text="hostedRoom?.roomCode || ''"></span>
                <button
                  type="button"
                  @click="copyInvite(hostedRoom?.roomCode || '')"
                  class="px-2.5 py-1 rounded-lg bg-[#FFFDF7] hover:bg-[#FAF4E4] border-2 border-[#173240] text-xs font-bold text-[#2F6F4E] inline-flex items-center gap-1.5 whitespace-nowrap"
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
              class="px-3.5 py-2 rounded-xl bg-[#FFFDF7] hover:bg-[#FAF4E4] border-2 border-[#173240] text-xs font-bold text-[#173240] whitespace-nowrap"
              x-text="t.lobby.closeRoom"
            ></button>
          </div>

          <div class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                @click="startBotMatch(botDifficulty)"
                class="px-4 py-4 rounded-xl bg-[#2F6F4E] hover:bg-[#23553C] text-[#FFFDF7] border-2 border-[#173240] font-bold text-sm shadow-[0_4px_0_#173240] active:translate-y-0.5 transition-all flex flex-col items-center justify-center gap-1.5 text-center"
              >
                ${iconSvg('bot', 'w-6 h-6')}
                <span x-text="t.lobby.practiceBot"></span>
              </button>

              <button
                type="button"
                @click="createRoom()"
                class="px-4 py-4 rounded-xl bg-[#F15A24] hover:bg-[#C94213] text-[#FFFDF7] border-2 border-[#173240] font-bold text-sm shadow-[0_4px_0_#173240] active:translate-y-0.5 transition-all flex flex-col items-center justify-center gap-1.5 text-center"
              >
                ${iconSvg('key-round', 'w-6 h-6')}
                <span x-text="t.lobby.createPrivateRoom"></span>
              </button>

              <button
                type="button"
                @click="inQueue ? leaveQueue() : joinQueue()"
                class="px-4 py-4 rounded-xl bg-[#1E7898] hover:bg-[#155B75] text-[#FFFDF7] border-2 border-[#173240] font-bold text-sm shadow-[0_4px_0_#173240] active:translate-y-0.5 transition-all flex flex-col items-center justify-center gap-1.5 text-center"
              >
                ${iconSvg('swords', 'w-6 h-6')}
                <span x-text="inQueue ? t.lobby.searchingBtn : t.lobby.findOnlineMatch"></span>
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
                  class="flex-1 min-w-0 px-3 py-2.5 rounded-xl bg-[#FAF4E4] border-2 border-[#173240]/35 font-mono text-xs sm:text-sm text-[#173240] placeholder:text-[#667D8A] focus:border-[#1E7898] focus:outline-none uppercase"
                />
                <button
                  type="submit"
                  class="px-4 py-2.5 rounded-xl bg-[#FAF4E4] hover:bg-[#EAE1CA] border-2 border-[#173240] text-xs sm:text-sm font-bold text-[#173240] shadow-[0_2px_0_#173240] active:translate-y-0.5 whitespace-nowrap shrink-0"
                  x-text="t.lobby.joinRoom"
                ></button>
              </form>

              <div class="flex items-center justify-between gap-2 rounded-xl bg-[#FAF4E4] border-2 border-[#173240]/25 px-3 py-1.5">
                <span class="text-xs font-bold text-[#3C5866] truncate" x-text="t.lobby.practiceBot + ':'"></span>
                <select
                  aria-label="Bot difficulty"
                  x-model="botDifficulty"
                  class="px-2.5 py-1.5 rounded-lg bg-[#FFFDF7] border border-[#173240]/35 text-xs font-bold text-[#173240] focus:border-[#1E7898] focus:outline-none"
                >
                  <option value="standard" x-text="t.lobby.botCadet"></option>
                  <option value="tactical" x-text="t.lobby.botTactical"></option>
                </select>
              </div>
            </div>

            <div x-show="lobby.openRooms.length > 0" class="rounded-xl bg-[#FAF4E4] border-2 border-[#173240]/25 p-3.5 space-y-2">
              <div class="text-xs font-bold text-[#173240] flex items-center justify-between">
                <span x-text="t.lobby.openRoomsTitle"></span>
                <span class="font-mono tabular-nums text-[#1E7898]" x-text="lobby.openRooms.length"></span>
              </div>
              <div class="space-y-1.5 max-h-32 overflow-y-auto">
                <template x-for="room in lobby.openRooms" :key="room.roomCode">
                  <div class="flex items-center justify-between gap-3 rounded-lg bg-[#FFFDF7] border border-[#173240]/25 px-3 py-2 text-xs">
                    <div class="min-w-0 truncate">
                      <span class="font-mono font-bold text-[#F15A24] mr-2" x-text="room.roomCode"></span>
                      <span class="text-[#173240] font-bold" x-text="room.hostCallsign"></span>
                      <span class="text-[#4B6675] ml-1.5 font-mono tabular-nums" x-text="'(' + room.hostElo + ' pts)'"></span>
                    </div>
                    <span
                      x-show="hostedRoom && hostedRoom.roomCode === room.roomCode"
                      class="text-[#2F6F4E] font-bold shrink-0"
                      x-text="t.lobby.yourRoom"
                    ></span>
                    <button
                      x-show="!hostedRoom || hostedRoom.roomCode !== room.roomCode"
                      type="button"
                      @click="joinRoom(room.roomCode)"
                      class="px-3 py-1 rounded-lg bg-[#1E7898] hover:bg-[#155B75] text-white font-bold shrink-0 whitespace-nowrap"
                      x-text="t.lobby.joinDuel"
                    ></button>
                  </div>
                </template>
              </div>
            </div>
          </div>

          <div class="pt-4 border-t-2 border-[#173240]/15 flex flex-wrap items-center justify-between gap-3 text-xs text-[#3C5866]">
            <span x-text="t.lobby.tutorialPrompt"></span>
            <button
              type="button"
              @click="setTab('tutorial')"
              class="text-[#1E7898] hover:text-[#173240] hover:underline font-bold inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              ${iconSvg('book-open', 'w-3.5 h-3.5')}
              <span x-text="t.lobby.launchTutorial"></span>
            </button>
          </div>
        </div>

        <!-- Right: Coastal Sky Showcase Preview -->
        <div class="lg:col-span-5 rounded-2xl bg-gradient-to-b from-[#DCEEF5] to-[#FAF4E4] ink-panel p-6 flex flex-col items-center justify-between space-y-4">
          <div class="w-full flex flex-wrap items-center justify-between gap-2">
            <span class="text-xs font-extrabold text-[#173240]" x-text="t.lobby.previewLabel"></span>
            <div class="flex items-center gap-1 bg-[#FFFDF7] p-1 rounded-xl border-2 border-[#173240]">
              <template x-for="opt in previewOptions()" :key="opt.id">
                <button
                  type="button"
                  @click="selectPreviewCard(opt.id)"
                  :class="'px-2 py-1 rounded-lg text-[11px] font-bold transition-colors whitespace-nowrap ' + (previewCardId === opt.id ? 'bg-[#1E7898] text-white' : 'text-[#4B6675] hover:text-[#173240]')"
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
        <form @submit.prevent="saveCallsign()" class="rounded-2xl bg-[#FFFDF7] ink-panel p-4 flex flex-col justify-between gap-2">
          <label for="callsign-input" class="text-xs font-bold text-[#3C5866]" x-text="t.lobby.pilotCallsign"></label>
          <div class="flex items-center gap-2">
            <input
              id="callsign-input"
              type="text"
              maxlength="20"
              x-model="callsignDraft"
              class="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-[#FAF4E4] border border-[#173240]/35 text-sm font-bold text-[#173240] focus:border-[#1E7898] focus:outline-none"
            />
            <button
              type="submit"
              class="px-3 py-1.5 rounded-lg bg-[#FAF4E4] hover:bg-[#EAE1CA] border-2 border-[#173240] text-xs font-bold text-[#173240] whitespace-nowrap shrink-0"
              x-text="callsignSaved ? t.lobby.saved : t.lobby.save"
            ></button>
          </div>
        </form>

        <div class="rounded-2xl bg-[#FFFDF7] ink-panel p-4 flex flex-col justify-between">
          <div class="text-xs font-bold text-[#3C5866]" x-text="t.lobby.competitiveRank"></div>
          <div class="flex items-baseline justify-between gap-2 mt-1">
            <span class="font-display text-lg font-extrabold" :style="'color:' + playerTier().accentHex" x-text="playerTier().name"></span>
            <span class="font-mono tabular-nums text-base font-bold text-[#173240]" x-text="profile.elo + ' pts'"></span>
          </div>
          <div
            class="text-xs text-[#4B6675] font-mono tabular-nums mt-1"
            x-text="profile.wins + (lang === 'de' ? 'S · ' : 'W · ') + profile.losses + (lang === 'de' ? 'N · ' : 'L · ') + profile.quartetsCompleted + ' ' + t.lobby.quartets"
          ></div>
        </div>

        <div class="rounded-2xl bg-[#FFFDF7] ink-panel p-4 flex flex-col justify-between">
          <div class="text-xs font-bold text-[#3C5866]" x-text="t.lobby.multiplayerServer"></div>
          <div class="flex items-center justify-between gap-2 mt-1">
            <div class="flex items-center gap-2">
              <span
                :class="'w-2.5 h-2.5 rounded-full border border-[#173240] ' + (wsConnected ? 'bg-[#2F6F4E]' : 'bg-[#F15A24]')"
                aria-hidden="true"
              ></span>
              <span class="font-display text-base font-bold text-[#173240]" x-text="wsConnected ? t.lobby.connected : t.lobby.reconnecting"></span>
            </div>
            <span class="font-mono tabular-nums text-sm font-bold text-[#1E7898] flex items-center gap-1">
              ${iconSvg('users', 'w-3.5 h-3.5')}
              <span x-text="lobby.onlineCount + ' ' + t.lobby.online"></span>
            </span>
          </div>
          <div
            class="text-xs text-[#4B6675] mt-1"
            x-text="lobby.openRooms.length + ' ' + t.lobby.openRoomsCount + ' · ' + lobby.queueCount + ' ' + t.lobby.inQueue"
          ></div>
        </div>

        <div class="rounded-2xl bg-[#FFFDF7] ink-panel p-4 flex flex-col justify-between">
          <div class="text-xs font-bold text-[#3C5866]" x-text="t.lobby.tableAudioQuickStart"></div>
          <div class="flex items-center justify-between gap-2 mt-2">
            <button
              type="button"
              @click="toggleMute()"
              class="px-3 py-2 rounded-xl bg-[#FAF4E4] hover:bg-[#EAE1CA] border-2 border-[#173240] text-xs font-bold text-[#173240] inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <span x-show="muted" class="text-[#667D8A]">${iconSvg('volume-x', 'w-4 h-4')}</span>
              <span x-show="!muted" class="text-[#1E7898]">${iconSvg('volume-2', 'w-4 h-4')}</span>
              <span x-text="muted ? t.lobby.audioMuted : t.lobby.audioOn"></span>
            </button>

            <button
              type="button"
              @click="startBotMatch('standard')"
              class="px-3 py-2 rounded-xl bg-[#E7F4EC] hover:bg-[#D1EBE0] border-2 border-[#173240] text-xs font-bold text-[#173240] inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <span class="text-[#2F6F4E]">${iconSvg('play', 'w-3.5 h-3.5')}</span>
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
        :class="'relative overflow-hidden border-2 border-[#173240] bg-[#EFE8D6] shadow-[0_6px_0_#173240] transition-all ' + (isTheaterFull ? 'fixed inset-0 z-40 rounded-none overflow-y-auto' : 'rounded-2xl')"
      >
        <div
          class="absolute inset-0 bg-cover bg-center opacity-50 pointer-events-none"
          :style="'background-image: url(' + fieldDeskImg + ')'"
          aria-hidden="true"
        ></div>
        <div class="absolute inset-0 bg-[#F5EFE0]/60 pointer-events-none" aria-hidden="true"></div>

        <div class="relative z-10 max-w-6xl mx-auto p-4 sm:p-6 space-y-5">
          <!-- Field Guide Match Scoreboard -->
          <div class="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#FFFDF7]/95 border-2 border-[#173240] shadow-[0_3px_0_#173240] px-4 py-2.5">
            <div class="flex items-center gap-3 min-w-0">
              <div
                class="w-10 h-10 rounded-xl bg-[#1E7898] text-white border-2 border-[#173240] flex items-center justify-center font-mono text-base font-bold shrink-0"
                x-text="activeMatch.you.cardCount"
              ></div>
              <div class="min-w-0">
                <div class="font-display font-bold text-sm text-[#173240] truncate">
                  <span x-text="activeMatch.you.callsign"></span>
                  <span class="text-xs font-sans font-bold text-[#1E7898]" x-text="' (' + t.arena.you + ')'"></span>
                </div>
                <div
                  class="text-[11px] text-[#3C5866] font-mono tabular-nums"
                  x-text="tierForElo(activeMatch.you.elo).name + ' · ' + activeMatch.you.elo + ' pts'"
                ></div>
              </div>
            </div>

            <div class="flex items-center gap-2.5">
              <div class="px-3 py-1.5 rounded-xl bg-[#FAF4E4] border-2 border-[#173240]/25 text-center">
                <span class="text-[11px] font-bold text-[#3C5866] mr-1.5" x-text="t.arena.round"></span>
                <span
                  class="font-mono tabular-nums text-sm font-bold text-[#173240]"
                  x-text="activeMatch.roundNumber + '/' + activeMatch.maxRounds"
                ></span>
              </div>

              <div
                x-show="activeMatch.tiePotCount > 0"
                class="px-3 py-1.5 rounded-xl bg-[#FEF3C7] border-2 border-[#D97706] flex items-center gap-1.5"
              >
                <span class="text-[#B45309]">${iconSvg('layers', 'w-3.5 h-3.5')}</span>
                <span
                  class="text-xs font-bold text-[#78350F] font-mono tabular-nums"
                  x-text="t.arena.tiePot + ': ' + activeMatch.tiePotCount"
                ></span>
              </div>

              <div
                x-show="secondsLeft !== null && activeMatch.status === 'PLAYING'"
                :class="'px-2.5 py-1.5 rounded-xl border-2 flex items-center gap-1 font-mono tabular-nums text-xs font-bold ' + (secondsLeft <= 10 ? 'bg-[#FEECEB] border-[#DC2626] text-[#991B1B]' : 'bg-[#FAF4E4] border-[#173240]/25 text-[#173240]')"
              >
                ${iconSvg('clock', 'w-3.5 h-3.5')}
                <span x-text="secondsLeft + 's'"></span>
              </div>
            </div>

            <div class="flex items-center gap-2.5">
              <div class="text-right min-w-0 hidden sm:block">
                <div class="flex items-center justify-end gap-1.5">
                  <span
                    x-show="activeMatch.mode !== 'bot'"
                    :title="activeMatch.opponent.connected ? 'Connected' : 'Reconnecting'"
                    class="inline-flex shrink-0"
                  >
                    <span x-show="activeMatch.opponent.connected" class="text-[#2F6F4E]">${iconSvg('wifi', 'w-3.5 h-3.5')}</span>
                    <span x-show="!activeMatch.opponent.connected" class="text-[#D97706]">${iconSvg('wifi-off', 'w-3.5 h-3.5')}</span>
                  </span>
                  <span class="font-display font-bold text-sm text-[#173240] truncate" x-text="activeMatch.opponent.callsign"></span>
                </div>
                <div class="text-[11px] text-[#3C5866] font-mono tabular-nums" x-text="activeMatch.opponent.elo + ' pts'"></div>
              </div>

              <div
                class="w-10 h-10 rounded-xl bg-[#F15A24] text-white border-2 border-[#173240] flex items-center justify-center font-mono text-base font-bold shrink-0"
                x-text="activeMatch.opponent.cardCount"
              ></div>

              <button
                type="button"
                @click="toggleTheaterFull()"
                :title="isTheaterFull ? t.arena.exitFullscreen : t.arena.fullscreen"
                class="px-2.5 py-2 rounded-xl text-xs font-bold text-[#173240] bg-[#FAF4E4] hover:bg-[#EAE1CA] border-2 border-[#173240]/30 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
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
                  class="px-2.5 py-2 rounded-xl text-xs font-bold text-[#3C5866] hover:text-[#173240] bg-[#FAF4E4] hover:bg-[#EAE1CA] border-2 border-[#173240]/30 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  ${iconSvg('flag', 'w-3.5 h-3.5')}
                  <span class="hidden sm:inline" x-text="t.arena.leave"></span>
                </button>
                <div x-show="confirmForfeit" class="flex items-center gap-1.5">
                  <button
                    type="button"
                    @click="confirmForfeit = false; forfeitMatch()"
                    class="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[#DC2626] hover:bg-[#B91C1C] text-white border border-[#173240] whitespace-nowrap"
                    x-text="t.arena.confirmForfeit"
                  ></button>
                  <button
                    type="button"
                    @click="confirmForfeit = false"
                    class="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[#EAE1CA] text-[#173240] hover:bg-[#DCD1B4] border border-[#173240]/35 whitespace-nowrap"
                    x-text="t.arena.cancel"
                  ></button>
                </div>
              </div>
            </div>
          </div>

          <!-- Disconnected Banner -->
          <div
            x-show="activeMatch.mode !== 'bot' && !activeMatch.opponent.connected && activeMatch.status !== 'FINISHED'"
            class="rounded-xl bg-[#FEF3C7] border-2 border-[#D97706] px-4 py-2.5 flex items-center gap-2 text-xs font-medium text-[#78350F]"
          >
            <span class="text-[#B45309] shrink-0">${iconSvg('shield-alert', 'w-4 h-4')}</span>
            <span x-text="activeMatch.opponent.callsign + ' ' + t.arena.disconnectedMsg"></span>
          </div>

          <!-- Finished Screen -->
          <div
            x-show="activeMatch.status === 'FINISHED'"
            class="rounded-2xl bg-[#FFFDF7] ink-panel p-6 sm:p-8 max-w-2xl mx-auto text-center space-y-6"
          >
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#FEF3C7] border-2 border-[#173240] text-[#F15A24] mx-auto shadow-[0_3px_0_#173240]">
              ${iconSvg('trophy', 'w-8 h-8')}
            </div>

            <div>
              <h2 class="font-display text-2xl sm:text-3xl font-extrabold text-[#173240]" x-text="finishedHeadline()"></h2>
              <p class="mt-1.5 text-sm text-[#3C5866]" x-text="finishedReason()"></p>
            </div>

            <div class="grid grid-cols-3 gap-3 text-left">
              <div class="rounded-xl bg-[#FAF4E4] border-2 border-[#173240]/20 p-3.5">
                <div class="text-xs font-bold text-[#3C5866]" x-text="t.arena.finalCards"></div>
                <div class="mt-1 font-mono tabular-nums text-xl font-bold text-[#173240]">
                  <span x-text="activeMatch.you.cardCount"></span>
                  <span class="text-sm text-[#4B6675]" x-text="' vs ' + activeMatch.opponent.cardCount"></span>
                </div>
              </div>
              <div class="rounded-xl bg-[#FAF4E4] border-2 border-[#173240]/20 p-3.5">
                <div class="text-xs font-bold text-[#3C5866]" x-text="t.arena.quartetsBuilt"></div>
                <div
                  class="mt-1 font-mono tabular-nums text-xl font-bold text-[#2F6F4E]"
                  x-text="activeMatch.you.completedQuartets.length + ' / 8'"
                ></div>
              </div>
              <div class="rounded-xl bg-[#FAF4E4] border-2 border-[#173240]/20 p-3.5">
                <div
                  class="text-xs font-bold text-[#3C5866]"
                  x-text="activeMatch.mode === 'bot' ? t.arena.practiceMode : t.arena.eloDelta"
                ></div>
                <div
                  :class="'mt-1 font-mono tabular-nums text-xl font-bold ' + (activeMatch.eloChange === null ? 'text-[#4B6675]' : (activeMatch.eloChange >= 0 ? 'text-[#2F6F4E]' : 'text-[#DC2626]'))"
                  x-text="activeMatch.eloChange === null ? t.arena.unranked : ((activeMatch.eloChange >= 0 ? '+' : '') + activeMatch.eloChange)"
                ></div>
              </div>
            </div>

            <div class="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                @click="playAgain()"
                class="px-5 py-2.5 rounded-xl bg-[#2F6F4E] hover:bg-[#23553C] text-[#FFFDF7] border-2 border-[#173240] font-bold text-sm shadow-[0_3px_0_#173240] active:translate-y-0.5 transition-all inline-flex items-center gap-2 whitespace-nowrap"
              >
                ${iconSvg('rotate-ccw', 'w-4 h-4')}
                <span x-text="t.arena.playAgain"></span>
              </button>
              <button
                type="button"
                @click="if (isTheaterFull) toggleTheaterFull(); returnToLobby()"
                class="px-5 py-2.5 rounded-xl bg-[#FAF4E4] hover:bg-[#EAE1CA] text-[#173240] border-2 border-[#173240] font-bold text-sm transition-colors whitespace-nowrap"
                x-text="t.arena.returnLobby"
              ></button>
            </div>
          </div>

          <!-- Active 2-Card Duel Table -->
          <div x-show="activeMatch.status !== 'FINISHED'" class="space-y-5">
            <div class="grid grid-cols-1 md:grid-cols-11 gap-5 items-center justify-items-center py-2">
              <!-- Your Card -->
              <div class="md:col-span-4 w-full flex flex-col items-center">
                <div
                  class="mb-2 text-xs font-extrabold text-[#1E7898] bg-[#FAF4E4] px-3 py-1 rounded-lg border-2 border-[#173240] shadow-[0_2px_0_#173240]"
                  x-text="t.arena.yourTopCard"
                ></div>
                <div class="w-full flex justify-center">
                  ${renderTurbineCard('arenaYourCard()', {
                    playfulHover: true,
                    selectableExpr: 'isYourTurn()',
                    selectedStatExpr: 'isReveal() && activeMatch.lastRound ? activeMatch.lastRound.chosenStat : null',
                    highlightOutcomeExpr: 'arenaYourOutcome()',
                    onSelectStatHandler: 'selectStat(stat.key)',
                  })}
                </div>
              </div>

              <!-- Center Duel Feedback -->
              <div class="md:col-span-3 w-full flex flex-col items-center justify-center text-center px-2">
                <div
                  x-show="isReveal() && activeMatch.lastRound"
                  class="w-full rounded-2xl bg-[#FFFDF7] ink-panel p-4 space-y-3"
                >
                  <div class="text-[11px] font-bold text-[#3C5866]" x-text="t.arena.statCompared"></div>
                  <div
                    class="font-display text-lg font-extrabold text-[#173240]"
                    x-text="activeMatch.lastRound ? t.stats[activeMatch.lastRound.chosenStat].label : ''"
                  ></div>

                  <div class="py-2.5 px-3 rounded-xl bg-[#FAF4E4] border border-[#173240]/20 flex items-center justify-between font-mono tabular-nums text-sm">
                    <span
                      :class="'font-bold ' + (arenaYourOutcome() === 'win' ? 'text-[#2F6F4E]' : (arenaYourOutcome() === 'loss' ? 'text-[#DC2626]' : 'text-[#B45309]'))"
                      x-text="arenaRevealValues().yourValText"
                    ></span>
                    <span class="text-[#667D8A] text-xs font-sans font-bold">vs</span>
                    <span
                      :class="'font-bold ' + (arenaOppOutcome() === 'win' ? 'text-[#2F6F4E]' : (arenaOppOutcome() === 'loss' ? 'text-[#DC2626]' : 'text-[#B45309]'))"
                      x-text="arenaRevealValues().oppValText"
                    ></span>
                  </div>

                  <div
                    :class="'rounded-xl px-3 py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 border-2 ' + (arenaYourOutcome() === 'win' ? 'bg-[#E7F4EC] text-[#173240] border-[#2F6F4E]' : (arenaYourOutcome() === 'loss' ? 'bg-[#FEECEB] text-[#7F1D1D] border-[#DC2626]' : 'bg-[#FEF3C7] text-[#78350F] border-[#D97706]'))"
                  >
                    <span x-show="arenaYourOutcome() === 'win'">${iconSvg('check-circle', 'w-4 h-4')}</span>
                    <span x-text="arenaOutcomeText()"></span>
                  </div>

                  <div
                    x-show="arenaNewlyCompletedQuartetName()"
                    class="rounded-xl bg-[#E7F4EC] border-2 border-[#2F6F4E] px-3 py-2 text-xs font-bold text-[#173240] flex items-center justify-center gap-1.5"
                  >
                    <span class="text-[#2F6F4E] shrink-0">${iconSvg('award', 'w-4 h-4')}</span>
                    <span x-text="t.arena.quartetCompleted + ' ' + arenaNewlyCompletedQuartetName()"></span>
                  </div>

                  <button
                    type="button"
                    @click="nextRound()"
                    class="w-full py-2.5 px-4 rounded-xl bg-[#1E7898] hover:bg-[#155B75] text-white border-2 border-[#173240] font-bold text-sm shadow-[0_3px_0_#173240] active:translate-y-0.5 transition-all inline-flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <span x-text="t.arena.nextRound"></span>
                    ${iconSvg('arrow-right', 'w-4 h-4')}
                  </button>
                </div>

                <div
                  x-show="!(isReveal() && activeMatch.lastRound)"
                  :class="'w-full rounded-2xl bg-[#FFFDF7] ink-panel p-5 space-y-2.5 ' + (isYourTurn() ? 'animate-gentle-bob' : '')"
                >
                  <div
                    :class="'inline-flex items-center justify-center w-12 h-12 rounded-xl border-2 border-[#173240] mx-auto ' + (isYourTurn() ? 'bg-[#DCEEF5] text-[#1E7898]' : 'bg-[#FAF4E4] text-[#4B6675]')"
                  >
                    <span x-show="isYourTurn()">${iconSvg('swords', 'w-5 h-5')}</span>
                    <span x-show="!isYourTurn()">${iconSvg('sparkles', 'w-5 h-5')}</span>
                  </div>
                  <div
                    class="font-display text-lg font-extrabold text-[#173240]"
                    x-text="isYourTurn() ? t.arena.yourTurnTitle : t.arena.oppTurnTitle"
                  ></div>
                  <p
                    class="text-xs text-[#3C5866] leading-relaxed"
                    x-text="isYourTurn() ? t.arena.yourTurnDesc : t.arena.oppTurnDesc"
                  ></p>
                </div>
              </div>

              <!-- Opponent Card -->
              <div class="md:col-span-4 w-full flex flex-col items-center">
                <div
                  class="mb-2 text-xs font-extrabold text-[#F15A24] bg-[#FAF4E4] px-3 py-1 rounded-lg border-2 border-[#173240] shadow-[0_2px_0_#173240]"
                  x-text="isReveal() ? t.arena.revealedCard : t.arena.hiddenStack"
                ></div>
                <div x-show="isReveal() && arenaOppCard()" class="w-full flex justify-center">
                  ${renderTurbineCard('arenaOppCard()', {
                    selectedStatExpr: 'activeMatch.lastRound ? activeMatch.lastRound.chosenStat : null',
                    highlightOutcomeExpr: 'arenaOppOutcome()',
                  })}
                </div>
                <div x-show="!(isReveal() && arenaOppCard())" class="w-full flex justify-center">
                  ${renderTurbineCardBack('activeMatch.opponent.cardCount', 'activeMatch.opponent.callsign', false)}
                </div>
              </div>
            </div>

            <!-- Compact Quartet Collector Strip -->
            <div class="rounded-2xl bg-[#FFFDF7]/95 border-2 border-[#173240] px-4 py-2.5 space-y-3 shadow-[0_3px_0_#173240]">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div class="flex items-center gap-3 flex-wrap">
                  <span class="text-xs font-bold text-[#173240]" x-text="t.arena.quartetStripLabel + ':'"></span>
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <template x-for="g in quartetGroups" :key="g.id">
                      <div
                        :title="g.code + '. ' + groupName(g.id) + ' (' + ownedGroupCount(g.id) + '/4)'"
                        :class="'px-2 py-1 rounded-lg border font-mono text-[11px] font-bold flex items-center gap-1 ' + (activeMatch.you.completedQuartets.includes(g.id) ? 'bg-[#2F6F4E] border-[#173240] text-white' : (ownedGroupCount(g.id) > 0 ? 'bg-[#DCEEF5] border-[#1E7898] text-[#173240]' : 'bg-[#FAF4E4] border-[#173240]/20 text-[#667D8A]'))"
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
                  class="text-xs font-bold text-[#1E7898] hover:text-[#173240] hover:underline inline-flex items-center gap-1 whitespace-nowrap"
                >
                  <span x-text="showMatrixDrawer ? t.arena.hideMatrix : t.arena.showMatrix"></span>
                  <span x-show="showMatrixDrawer">${iconSvg('chevron-up', 'w-3.5 h-3.5')}</span>
                  <span x-show="!showMatrixDrawer">${iconSvg('chevron-down', 'w-3.5 h-3.5')}</span>
                </button>
              </div>

              <div x-show="showMatrixDrawer">
                ${renderQuartetMatrix('activeMatch.you.ownedCardIds', 'activeMatch.you.completedQuartets', 't.arena.quartetStripLabel')}
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
      <div class="rounded-2xl bg-[#FFFDF7] ink-panel p-6 space-y-4">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 class="font-display text-2xl sm:text-3xl font-extrabold text-[#173240]" x-text="t.compendium.title"></h2>
            <p class="mt-1 text-sm text-[#3C5866] max-w-2xl" x-text="t.compendium.subtitle"></p>
          </div>

          <div class="relative w-full md:w-72">
            <span class="text-[#4B6675] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              ${iconSvg('search', 'w-4 h-4')}
            </span>
            <input
              type="text"
              x-model="compendiumSearch"
              :placeholder="t.compendium.searchPlaceholder"
              class="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#FAF4E4] border-2 border-[#173240]/30 text-sm text-[#173240] placeholder:text-[#667D8A] focus:border-[#1E7898] focus:outline-none"
            />
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-1.5 pt-1">
          <button
            type="button"
            @click="compendiumGroup = 'all'"
            :class="'px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap border-2 ' + (compendiumGroup === 'all' ? 'bg-[#2F6F4E] border-[#173240] text-white' : 'bg-[#FAF4E4] text-[#173240] hover:bg-[#EAE1CA] border-[#173240]/25')"
            x-text="t.compendium.allQuartets"
          ></button>
          <template x-for="g in quartetGroups" :key="g.id">
            <button
              type="button"
              @click="compendiumGroup = g.id"
              :class="'px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap border-2 ' + (compendiumGroup === g.id ? 'bg-[#1E7898] border-[#173240] text-white' : 'bg-[#FAF4E4] text-[#173240] hover:bg-[#EAE1CA] border-[#173240]/25')"
              x-text="g.code + '. ' + groupName(g.id)"
            ></button>
          </template>
        </div>
      </div>

      <div
        x-show="filteredDeck().length === 0"
        class="rounded-2xl bg-[#FFFDF7] ink-panel p-10 text-center text-sm text-[#3C5866]"
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
              <p class="text-xs text-[#3C5866] leading-relaxed line-clamp-2" x-text="cardLocale(card).engineeringNote"></p>
              <button
                type="button"
                @click="inspectCard(card)"
                class="text-[11px] font-bold text-[#1E7898] hover:text-[#173240] hover:underline inline-flex items-center gap-1 shrink-0 whitespace-nowrap"
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
      <div class="rounded-2xl bg-[#FFFDF7] ink-panel p-6">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 class="font-display text-2xl sm:text-3xl font-extrabold text-[#173240]" x-text="t.leaderboard.title"></h2>
            <p class="mt-1 text-sm text-[#3C5866]" x-text="t.leaderboard.subtitle"></p>
          </div>
          <button
            type="button"
            @click="setTab('arena')"
            class="px-4 py-2.5 rounded-xl bg-[#2F6F4E] hover:bg-[#23553C] text-[#FFFDF7] border-2 border-[#173240] font-bold text-sm shadow-[0_3px_0_#173240] active:translate-y-0.5 transition-all inline-flex items-center gap-2 self-start whitespace-nowrap"
          >
            ${iconSvg('swords', 'w-4 h-4')}
            <span x-text="t.leaderboard.playRanked"></span>
          </button>
        </div>

        <div class="mt-5 pt-4 border-t-2 border-[#173240]/15 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[#3C5866]">
          <template x-for="tier in allRankTiers()" :key="tier.name">
            <div class="flex items-center gap-2">
              <span class="font-bold" :style="'color:' + tier.accentHex" x-text="tier.displayName"></span>
              <span class="font-mono tabular-nums text-[#667D8A]" x-text="tier.minElo === 0 ? '<1150' : (tier.minElo + '+')"></span>
            </div>
          </template>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div class="lg:col-span-8 rounded-2xl bg-[#FFFDF7] ink-panel overflow-hidden">
          <div class="px-5 py-4 border-b-2 border-[#173240]/15 flex items-center justify-between bg-[#FAF4E4]">
            <h3 class="font-display text-base font-bold text-[#173240] flex items-center gap-2">
              <span class="text-[#F15A24]">${iconSvg('trophy', 'w-4 h-4')}</span>
              <span x-text="t.leaderboard.standings"></span>
            </h3>
            <span class="font-mono tabular-nums text-xs font-bold text-[#3C5866]" x-text="leaderboard.length + ' ' + t.leaderboard.rankedPlayers"></span>
          </div>

          <div x-show="leaderboard.length === 0" class="p-10 text-center space-y-3">
            <div class="text-[#8CA0AB] flex justify-center">${iconSvg('award', 'w-10 h-10')}</div>
            <div class="font-display text-lg font-bold text-[#173240]" x-text="t.leaderboard.emptyTitle"></div>
            <p class="text-sm text-[#3C5866] max-w-md mx-auto" x-text="t.leaderboard.emptyDesc"></p>
          </div>

          <div x-show="leaderboard.length > 0" class="overflow-x-auto">
            <table class="w-full text-left border-collapse text-sm">
              <thead>
                <tr class="border-b-2 border-[#173240]/15 text-xs text-[#3C5866] bg-[#FAF4E4]/70">
                  <th class="py-3 px-4 font-bold" x-text="t.leaderboard.colRank"></th>
                  <th class="py-3 px-4 font-bold" x-text="t.leaderboard.colPlayer"></th>
                  <th class="py-3 px-4 font-bold" x-text="t.leaderboard.colTier"></th>
                  <th class="py-3 px-4 font-bold text-right" x-text="t.leaderboard.colElo"></th>
                  <th class="py-3 px-4 font-bold text-right" x-text="t.leaderboard.colWld"></th>
                  <th class="py-3 px-4 font-bold text-right" x-text="t.leaderboard.colWinPct"></th>
                  <th class="py-3 px-4 font-bold text-right" x-text="t.leaderboard.colQuartets"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-[#173240]/10">
                <template x-for="(p, idx) in leaderboard" :key="p.id">
                  <tr :class="p.id === playerId ? 'bg-[#DCEEF5] text-[#173240]' : 'hover:bg-[#FAF4E4] text-[#173240]'">
                    <td class="py-3 px-4 font-mono tabular-nums font-bold text-[#3C5866]" x-text="'#' + (idx + 1)"></td>
                    <td class="py-3 px-4 font-bold text-[#173240]">
                      <span x-text="p.callsign"></span>
                      <span x-show="p.id === playerId" class="ml-2 text-xs font-bold text-[#1E7898]" x-text="'(' + t.arena.you + ')'"></span>
                    </td>
                    <td class="py-3 px-4 text-xs font-bold" :style="'color:' + tierForElo(p.elo).accentHex" x-text="tierForElo(p.elo).name"></td>
                    <td class="py-3 px-4 text-right font-mono tabular-nums font-bold text-[#173240]" x-text="p.elo"></td>
                    <td class="py-3 px-4 text-right font-mono tabular-nums text-xs text-[#3C5866]" x-text="p.wins + '-' + p.losses + '-' + p.draws"></td>
                    <td class="py-3 px-4 text-right font-mono tabular-nums text-xs text-[#3C5866]" x-text="(p.gamesPlayed > 0 ? Math.round((p.wins / p.gamesPlayed) * 100) : 0) + '%'"></td>
                    <td class="py-3 px-4 text-right font-mono tabular-nums text-xs font-bold text-[#2F6F4E]" x-text="p.quartetsCompleted"></td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </div>

        <div class="lg:col-span-4 rounded-2xl bg-[#FFFDF7] ink-panel overflow-hidden">
          <div class="px-5 py-4 border-b-2 border-[#173240]/15 bg-[#FAF4E4]">
            <h3 class="font-display text-base font-bold text-[#173240]" x-text="t.leaderboard.recentMatches"></h3>
          </div>

          <div x-show="recentMatches.length === 0" class="p-6 text-center text-xs text-[#3C5866]" x-text="t.leaderboard.noMatchesYet"></div>

          <ul x-show="recentMatches.length > 0" class="divide-y divide-[#173240]/10">
            <template x-for="m in recentMatches" :key="m.id">
              <li class="px-5 py-3.5 text-xs space-y-1">
                <div class="flex items-center justify-between gap-2">
                  <span
                    class="font-bold text-[#173240] truncate"
                    x-text="m.isDraw ? (m.player1Callsign + ' vs ' + m.player2Callsign) : (m.winnerCallsign + (lang === 'de' ? ' besiegt ' : ' def. ') + m.loserCallsign)"
                  ></span>
                  <span class="font-mono tabular-nums text-[#667D8A] shrink-0" x-text="formatRelativeTime(m.finishedAt)"></span>
                </div>
                <div class="flex items-center justify-between text-[#3C5866]">
                  <span
                    class="font-mono tabular-nums"
                    x-text="m.player1Cards + '–' + m.player2Cards + ' ' + t.leaderboard.cards + ' · ' + m.roundsPlayed + ' ' + t.leaderboard.rounds"
                  ></span>
                  <span x-show="!m.isDraw" class="font-mono tabular-nums font-bold text-[#2F6F4E]" x-text="'+' + m.eloDelta + ' pts'"></span>
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
      <div class="rounded-2xl bg-[#FFFDF7] ink-panel p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 class="font-display text-2xl sm:text-3xl font-extrabold text-[#173240]" x-text="t.tutorial.title"></h2>
          <p class="mt-1 text-sm text-[#3C5866]" x-text="t.tutorial.subtitle"></p>
        </div>

        <div class="flex flex-wrap items-center gap-1.5 bg-[#FAF4E4] p-1.5 rounded-xl border-2 border-[#173240]">
          <template x-for="(label, idx) in t.tutorial.steps" :key="idx">
            <button
              type="button"
              @click="setTutorialStep(idx)"
              :class="'px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ' + (tutorialStep === idx ? 'bg-[#1E7898] text-white' : 'text-[#4B6675] hover:text-[#173240] hover:bg-[#EAE1CA]')"
              x-text="(idx + 1) + '. ' + label"
            ></button>
          </template>
        </div>
      </div>

      <!-- Step 1 -->
      <div x-show="tutorialStep === 0" class="rounded-2xl bg-[#FFFDF7] ink-panel p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div class="lg:col-span-5 flex justify-center">
          ${renderTurbineCard("cardById('2A')", {
            selectableExpr: 'true',
            selectedStatExpr: 'tutorialInspectedStat',
            onSelectStatHandler: 'setTutorialInspectedStat(stat.key)',
          })}
        </div>

        <div class="lg:col-span-7 space-y-5">
          <div>
            <div class="text-xs font-extrabold uppercase tracking-wide text-[#1E7898]" x-text="t.tutorial.step1Tag"></div>
            <h3 class="mt-1 font-display text-2xl font-extrabold text-[#173240]" x-text="t.tutorial.step1Title"></h3>
            <p class="mt-2 text-sm text-[#3C5866] leading-relaxed" x-text="t.tutorial.step1Desc"></p>
          </div>

          <div class="rounded-2xl bg-[#FAF4E4] border-2 border-[#173240]/25 p-5 space-y-3">
            <div class="flex items-center justify-between gap-2">
              <span
                class="font-display text-lg font-bold text-[#173240]"
                x-text="t.stats[tutorialInspectedStat].label + ' (' + statDef(tutorialInspectedStat).unit + ')'"
              ></span>
              <span
                :class="'text-xs font-bold px-2.5 py-1 rounded-lg border-2 ' + (statDef(tutorialInspectedStat).higherWins ? 'bg-[#E7F4EC] text-[#173240] border-[#2F6F4E]' : 'bg-[#FFE8DC] text-[#C94213] border-[#F15A24]')"
                x-text="statDef(tutorialInspectedStat).higherWins ? t.card.higherWins : t.card.lowerWins"
              ></span>
            </div>
            <p class="text-sm text-[#173240]" x-text="t.stats[tutorialInspectedStat].description"></p>
            <div
              class="text-xs font-medium text-[#3C5866] pt-1"
              x-text="tutorialInspectedStat === 'cutInWindMs' ? t.tutorial.step1TipCutIn : (tutorialInspectedStat === 'hubHeightM' ? t.tutorial.step1TipHub : t.tutorial.step1TipDefault)"
            ></div>
          </div>

          <div class="flex justify-end">
            <button
              type="button"
              @click="setTutorialStep(1)"
              class="px-5 py-2.5 rounded-xl bg-[#2F6F4E] hover:bg-[#23553C] text-[#FFFDF7] border-2 border-[#173240] font-bold text-sm shadow-[0_3px_0_#173240] active:translate-y-0.5 transition-all inline-flex items-center gap-2 whitespace-nowrap"
            >
              <span x-text="t.tutorial.nextStep2"></span>
              ${iconSvg('arrow-right', 'w-4 h-4')}
            </button>
          </div>
        </div>
      </div>

      <!-- Step 2 -->
      <div x-show="tutorialStep === 1" class="rounded-2xl bg-[#FFFDF7] ink-panel p-6 space-y-6">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div class="text-xs font-extrabold uppercase tracking-wide text-[#1E7898]" x-text="t.tutorial.step2Tag"></div>
            <h3 class="mt-1 font-display text-2xl font-extrabold text-[#173240]" x-text="t.tutorial.step2Title"></h3>
            <p class="mt-1 text-sm text-[#3C5866]" x-text="t.tutorial.step2Desc"></p>
          </div>

          <button
            x-show="tutorialPracticeStat"
            type="button"
            @click="resetTutorialPractice()"
            class="px-3.5 py-2 rounded-xl bg-[#FAF4E4] hover:bg-[#EAE1CA] text-xs font-bold text-[#173240] border-2 border-[#173240] self-start whitespace-nowrap"
            x-text="t.tutorial.resetPractice"
          ></button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-11 gap-4 items-center justify-items-center">
          <div class="md:col-span-4 w-full flex justify-center">
            ${renderTurbineCard("cardById('3C')", {
              selectableExpr: 'tutorialPracticeStat === null',
              selectedStatExpr: 'tutorialPracticeStat',
              highlightOutcomeExpr: 'tutorialYourOutcome()',
              onSelectStatHandler: 'playTutorialPracticeStat(stat.key)',
            })}
          </div>

          <div class="md:col-span-3 w-full text-center space-y-3 px-2">
            <div x-show="!tutorialPracticeStat" class="rounded-2xl bg-[#FAF4E4] border-2 border-[#173240]/25 p-4">
              <div class="font-display font-bold text-[#173240] text-base" x-text="t.tutorial.pickYourStat"></div>
              <p class="mt-1.5 text-xs text-[#3C5866]" x-text="t.tutorial.pickHint"></p>
            </div>
            <div x-show="tutorialPracticeStat" class="rounded-2xl bg-[#FAF4E4] border-2 border-[#173240]/25 p-4 space-y-2.5">
              <div
                :class="'text-sm font-bold flex items-center justify-center gap-1.5 ' + (tutorialPracticeResult() === 1 ? 'text-[#2F6F4E]' : (tutorialPracticeResult() === 2 ? 'text-[#DC2626]' : 'text-[#B45309]'))"
              >
                <span x-show="tutorialPracticeResult() === 1">${iconSvg('check-circle', 'w-4 h-4')}</span>
                <span x-text="tutorialPracticeResult() === 1 ? t.tutorial.youWinBoth : (tutorialPracticeResult() === 2 ? t.tutorial.oppWinsHint : t.tutorial.exactTie)"></span>
              </div>
              <p class="text-xs text-[#173240]" x-text="tutorialPracticeResult() === 1 ? t.tutorial.winDesc : t.tutorial.lossDesc"></p>
            </div>
          </div>

          <div class="md:col-span-4 w-full flex justify-center">
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

        <div class="flex items-center justify-between pt-2">
          <button
            type="button"
            @click="setTutorialStep(0)"
            class="px-4 py-2 rounded-xl bg-[#FAF4E4] hover:bg-[#EAE1CA] border-2 border-[#173240] text-[#173240] text-sm font-bold inline-flex items-center gap-2 whitespace-nowrap"
          >
            ${iconSvg('arrow-left', 'w-4 h-4')}
            <span x-text="t.tutorial.prev"></span>
          </button>
          <button
            type="button"
            @click="setTutorialStep(2)"
            class="px-5 py-2.5 rounded-xl bg-[#2F6F4E] hover:bg-[#23553C] text-[#FFFDF7] border-2 border-[#173240] font-bold text-sm shadow-[0_3px_0_#173240] active:translate-y-0.5 transition-all inline-flex items-center gap-2 whitespace-nowrap"
          >
            <span x-text="t.tutorial.nextStep3"></span>
            ${iconSvg('arrow-right', 'w-4 h-4')}
          </button>
        </div>
      </div>

      <!-- Step 3 -->
      <div x-show="tutorialStep === 2" class="rounded-2xl bg-[#FFFDF7] ink-panel p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div class="lg:col-span-6 space-y-5">
          <div>
            <div class="text-xs font-extrabold uppercase tracking-wide text-[#1E7898]" x-text="t.tutorial.step3Tag"></div>
            <h3 class="mt-1 font-display text-2xl font-extrabold text-[#173240]" x-text="t.tutorial.step3Title"></h3>
          </div>

          <div class="space-y-4">
            <div class="rounded-xl bg-[#FAF4E4] border-2 border-[#173240]/20 p-4 flex items-start gap-3.5">
              <div class="w-9 h-9 rounded-lg bg-[#FEF3C7] border-2 border-[#D97706] flex items-center justify-center text-[#B45309] shrink-0">
                ${iconSvg('layers', 'w-5 h-5')}
              </div>
              <div>
                <h4 class="font-display font-bold text-sm text-[#173240]" x-text="t.tutorial.tiePotTitle"></h4>
                <p class="mt-1 text-xs text-[#3C5866] leading-relaxed" x-text="t.tutorial.tiePotDesc"></p>
              </div>
            </div>

            <div class="rounded-xl bg-[#FAF4E4] border-2 border-[#173240]/20 p-4 flex items-start gap-3.5">
              <div class="w-9 h-9 rounded-lg bg-[#E7F4EC] border-2 border-[#2F6F4E] flex items-center justify-center text-[#2F6F4E] shrink-0">
                ${iconSvg('award', 'w-5 h-5')}
              </div>
              <div>
                <h4 class="font-display font-bold text-sm text-[#173240]" x-text="t.tutorial.quartetTitle"></h4>
                <p class="mt-1 text-xs text-[#3C5866] leading-relaxed" x-text="t.tutorial.quartetDesc"></p>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between pt-2">
            <button
              type="button"
              @click="setTutorialStep(1)"
              class="px-4 py-2 rounded-xl bg-[#FAF4E4] hover:bg-[#EAE1CA] border-2 border-[#173240] text-[#173240] text-sm font-bold inline-flex items-center gap-2 whitespace-nowrap"
            >
              ${iconSvg('arrow-left', 'w-4 h-4')}
              <span x-text="t.tutorial.prev"></span>
            </button>
            <button
              type="button"
              @click="setTutorialStep(3)"
              class="px-5 py-2.5 rounded-xl bg-[#2F6F4E] hover:bg-[#23553C] text-[#FFFDF7] border-2 border-[#173240] font-bold text-sm shadow-[0_3px_0_#173240] active:translate-y-0.5 transition-all inline-flex items-center gap-2 whitespace-nowrap"
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
            't.tutorial.exampleMatrix'
          )}
        </div>
      </div>

      <!-- Step 4 -->
      <div x-show="tutorialStep === 3" class="rounded-2xl bg-[#FFFDF7] ink-panel p-6 space-y-6">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="rounded-xl bg-[#FAF4E4] border-2 border-[#173240]/20 p-5 space-y-3">
            <div class="w-10 h-10 rounded-lg bg-[#DCEEF5] border-2 border-[#1E7898] flex items-center justify-center text-[#1E7898]">
              ${iconSvg('users', 'w-5 h-5')}
            </div>
            <h3 class="font-display text-lg font-bold text-[#173240]" x-text="t.tutorial.mpTitle"></h3>
            <p class="text-sm text-[#3C5866] leading-relaxed" x-text="t.tutorial.mpDesc"></p>
          </div>

          <div class="rounded-xl bg-[#FAF4E4] border-2 border-[#173240]/20 p-5 space-y-3">
            <div class="w-10 h-10 rounded-lg bg-[#FFE8DC] border-2 border-[#F15A24] flex items-center justify-center text-[#C94213]">
              ${iconSvg('trophy', 'w-5 h-5')}
            </div>
            <h3 class="font-display text-lg font-bold text-[#173240]" x-text="t.tutorial.eloTitle"></h3>
            <p class="text-sm text-[#3C5866] leading-relaxed" x-text="t.tutorial.eloDesc"></p>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-4 pt-2 border-t-2 border-[#173240]/15">
          <button
            type="button"
            @click="setTutorialStep(2)"
            class="px-4 py-2 rounded-xl bg-[#FAF4E4] hover:bg-[#EAE1CA] border-2 border-[#173240] text-[#173240] text-sm font-bold inline-flex items-center gap-2 whitespace-nowrap"
          >
            ${iconSvg('arrow-left', 'w-4 h-4')}
            <span x-text="t.tutorial.prev"></span>
          </button>

          <div class="flex flex-wrap items-center gap-3">
            <button
              type="button"
              @click="startBotMatch('standard')"
              class="px-5 py-2.5 rounded-xl bg-[#FAF4E4] hover:bg-[#EAE1CA] text-[#173240] border-2 border-[#173240] font-bold text-sm inline-flex items-center gap-2 whitespace-nowrap"
            >
              <span class="text-[#2F6F4E]">${iconSvg('play', 'w-4 h-4')}</span>
              <span x-text="t.tutorial.startBotBtn"></span>
            </button>
            <button
              type="button"
              @click="setTab('arena')"
              class="px-5 py-2.5 rounded-xl bg-[#2F6F4E] hover:bg-[#23553C] text-[#FFFDF7] border-2 border-[#173240] font-bold text-sm shadow-[0_3px_0_#173240] active:translate-y-0.5 transition-all inline-flex items-center gap-2 whitespace-nowrap"
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
        class="fixed inset-0 z-50 bg-[#173240]/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
        role="dialog"
        aria-modal="true"
        :aria-label="inspectedCard.modelName"
      >
        <div
          @click.stop
          class="w-full max-w-3xl rounded-2xl bg-[#FFFDF7] text-[#173240] border-[3px] border-[#173240] shadow-[0_8px_0_#173240] overflow-hidden my-auto"
        >
          <div class="h-1.5 w-full" :style="'background-color:' + cardTheme(inspectedCard).border"></div>
          <div class="relative h-64 sm:h-76 w-full bg-[#EAE1CA] overflow-hidden">
            <img
              :src="photoUrl(inspectedCard)"
              :alt="inspectedCard.modelName"
              referrerpolicy="no-referrer"
              class="h-full w-full object-cover"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-[#173240]/92 via-[#173240]/35 to-transparent"></div>

            <button
              type="button"
              @click="closeModal()"
              :aria-label="t.card.close"
              class="absolute top-4 right-4 w-10 h-10 rounded-xl bg-[#FAF4E4] hover:bg-white border-2 border-[#173240] text-[#173240] flex items-center justify-center shadow-[0_2px_0_#173240] transition-colors"
            >
              ${iconSvg('x', 'w-5 h-5')}
            </button>

            <div class="absolute bottom-4 left-5 right-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <div class="text-xs font-semibold text-white/95 flex items-center gap-2">
                  <span
                    :style="'background-color:' + cardTheme(inspectedCard).stampBg"
                    class="px-2 py-0.5 rounded-md border border-[#173240] font-mono font-bold text-white"
                    x-text="inspectedCard.id"
                  ></span>
                  <span x-text="groupName(inspectedCard.groupId)"></span>
                  <span aria-hidden="true">·</span>
                  <span x-text="inspectedCard.isRealPhoto ? t.card.photoReal : t.card.photoConcept"></span>
                </div>
                <h2 class="mt-1.5 font-display text-2xl sm:text-3xl font-extrabold text-white" x-text="inspectedCard.modelName"></h2>
                <div
                  class="text-sm text-white/90"
                  x-text="inspectedCard.manufacturer + ' · ' + deploymentLabel(inspectedCard.deploymentType) + ' · ' + cardLocale(inspectedCard).country"
                ></div>
              </div>
            </div>
          </div>

          <div class="p-5 sm:p-6 space-y-5 bg-[#FFFDF7]">
            <div class="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <template x-for="stat in statDefinitions" :key="stat.key">
                <div class="rounded-xl bg-[#FAF4E4] border-2 border-[#173240]/20 p-3">
                  <div class="text-[11px] font-bold text-[#3C5866] truncate" x-text="t.stats[stat.key].label"></div>
                  <div class="mt-1 font-mono tabular-nums text-lg font-bold text-[#173240]">
                    <span x-text="formatStatValue(stat.key, inspectedCard.stats[stat.key])"></span>
                    <span class="ml-1 text-xs font-medium text-[#3C5866]" x-text="stat.unit"></span>
                  </div>
                  <div
                    class="mt-0.5 text-[10px] font-bold"
                    :style="'color:' + (stat.higherWins ? '#2F6F4E' : '#F15A24')"
                    x-text="stat.higherWins ? t.card.higherWins : t.card.lowerWins"
                  ></div>
                </div>
              </template>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div class="rounded-xl bg-[#FAF4E4] border-2 border-[#173240]/20 p-4 space-y-2.5">
                <div class="flex justify-between gap-2">
                  <span class="text-[#3C5866]" x-text="t.card.flagshipPlant"></span>
                  <span class="font-bold text-[#173240] text-right" x-text="inspectedCard.flagshipPlant"></span>
                </div>
                <div class="flex justify-between gap-2">
                  <span class="text-[#3C5866]" x-text="t.card.country"></span>
                  <span class="text-[#173240] text-right" x-text="inspectedCard.flagshipLocation"></span>
                </div>
                <div class="flex justify-between gap-2">
                  <span class="text-[#3C5866]" x-text="t.card.plantUnits"></span>
                  <span
                    class="font-mono tabular-nums font-bold text-[#173240]"
                    x-text="formatNumber(inspectedCard.turbineCountInPlant)"
                  ></span>
                </div>
              </div>

              <div class="rounded-xl bg-[#FAF4E4] border-2 border-[#173240]/20 p-4 space-y-2.5">
                <div class="flex justify-between gap-2">
                  <span class="text-[#3C5866]" x-text="t.card.drivetrain"></span>
                  <span class="font-bold text-[#173240] text-right" x-text="cardLocale(inspectedCard).drivetrain"></span>
                </div>
                <div class="flex justify-between gap-2">
                  <span class="text-[#3C5866]" x-text="t.card.sweptArea"></span>
                  <span
                    class="font-mono tabular-nums font-bold text-[#173240]"
                    x-text="formatNumber(inspectedCard.sweptAreaM2) + ' m²'"
                  ></span>
                </div>
                <div class="flex justify-between gap-2">
                  <span class="text-[#3C5866]" x-text="t.card.deployedYear"></span>
                  <span class="font-mono tabular-nums font-bold text-[#173240]" x-text="inspectedCard.year"></span>
                </div>
              </div>
            </div>

            <div class="rounded-xl bg-[#FAF4E4] border-2 border-[#173240]/25 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div class="space-y-1">
                <div class="text-xs font-bold text-[#2F6F4E] flex items-center gap-1.5">
                  ${iconSvg('wind', 'w-3.5 h-3.5')}
                  <span x-text="t.card.engineeringSummary"></span>
                </div>
                <p class="text-sm text-[#173240] leading-relaxed" x-text="cardLocale(inspectedCard).engineeringNote"></p>
              </div>

              <a
                :href="inspectedCard.sourceUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="px-4 py-2.5 rounded-xl bg-[#1E7898] hover:bg-[#155B75] text-white border-2 border-[#173240] font-bold text-xs inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 self-start sm:self-center shadow-[0_2px_0_#173240]"
              >
                <span x-text="t.card.technicalSource"></span>
                ${iconSvg('external-link', 'w-3.5 h-3.5')}
              </a>
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
      class="min-h-screen flex flex-col bg-[#F5EFE0] text-[#173240] paper-grain"
    >
      ${renderHeader()}
      <main class="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
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
