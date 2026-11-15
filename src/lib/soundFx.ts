const MUTE_KEY = 'rotor_clash_muted';
const LEGACY_MUTE_KEY = 'aeolian_muted';

class SoundFxManager {
  private ctx: AudioContext | null = null;
  private muted = false;

  constructor() {
    if (typeof window !== 'undefined') {
      let stored = localStorage.getItem(MUTE_KEY);
      if (stored === null) {
        const legacy = localStorage.getItem(LEGACY_MUTE_KEY);
        if (legacy !== null) {
          localStorage.setItem(MUTE_KEY, legacy);
          localStorage.removeItem(LEGACY_MUTE_KEY);
          stored = legacy;
        }
      }
      this.muted = stored === '1';
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    if (typeof window !== 'undefined') {
      localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0');
    }
    return this.muted;
  }

  private getContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private tone(freq: number, duration: number, type: OscillatorType = 'sine', gain = 0.08, delay = 0) {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.exponentialRampToValueAtTime(gain, now + 0.015);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(amp);
    amp.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public playClick() {
    this.tone(540, 0.06, 'triangle', 0.05);
  }

  public playCardFlip() {
    this.tone(360, 0.08, 'sine', 0.06, 0);
    this.tone(480, 0.09, 'sine', 0.05, 0.04);
  }

  public playWinRound() {
    this.tone(523.25, 0.12, 'triangle', 0.07, 0);
    this.tone(659.25, 0.14, 'triangle', 0.07, 0.07);
    this.tone(783.99, 0.2, 'sine', 0.07, 0.14);
  }

  public playLoseRound() {
    this.tone(329.63, 0.14, 'sine', 0.06, 0);
    this.tone(261.63, 0.22, 'sine', 0.06, 0.09);
  }

  public playTie() {
    this.tone(440, 0.12, 'triangle', 0.06, 0);
    this.tone(440, 0.14, 'triangle', 0.05, 0.12);
  }

  public playQuartetChime() {
    this.tone(587.33, 0.14, 'triangle', 0.08, 0);
    this.tone(739.99, 0.14, 'triangle', 0.08, 0.08);
    this.tone(880.0, 0.16, 'triangle', 0.08, 0.16);
    this.tone(1174.66, 0.3, 'sine', 0.08, 0.24);
  }

  public playVictory() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      this.tone(n, 0.22, 'triangle', 0.08, idx * 0.09);
    });
  }
}

export const soundFx = new SoundFxManager();
