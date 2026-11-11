import { Sound } from '@babylonjs/core/Audio/sound';
import type { Scene } from '@babylonjs/core/scene';

/** Audio registry for imported licensed assets plus synthesized fallback SFX. */
export class AudioManager {
  private readonly sounds = new Map<string, Sound>();
  private context: AudioContext | null = null;
  private master = 0.65;
  private ambienceTimer: number | null = null;

  constructor(private readonly scene: Scene) {}

  load(id: string, url: string, options: { loop?: boolean; volume?: number; spatial?: boolean } = {}): void {
    if (this.sounds.has(id)) return;
    const sound = new Sound(id, url, this.scene, undefined, {
      autoplay: false, loop: options.loop ?? false, volume: options.volume ?? 1,
      spatialSound: options.spatial ?? false, distanceModel: 'linear', maxDistance: 45,
    });
    this.sounds.set(id, sound);
  }

  /** Must be called from a user gesture because browsers gate audio playback. */
  async unlock(): Promise<void> {
    if (!this.context) {
      const AudioContextClass = window.AudioContext;
      if (AudioContextClass) this.context = new AudioContextClass();
    }
    if (this.context?.state === 'suspended') await this.context.resume();
  }

  play(id: string): void { this.sounds.get(id)?.play(); }

  /** Procedural fallback effects keep the game audible before external audio assets are supplied. */
  playEvent(event: 'step' | 'twig' | 'roar' | 'whisper' | 'heartbeat' | 'flash' | 'jumpscare' | 'siren', intensity = 1): void {
    const ctx = this.context;
    if (!ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(Math.max(.001, Math.min(1, intensity)) * this.master * .18, now);
    gain.gain.exponentialRampToValueAtTime(.001, now + (event === 'jumpscare' ? .9 : .28));
    gain.connect(ctx.destination);
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    filter.type = event === 'whisper' || event === 'twig' ? 'highpass' : 'lowpass';
    filter.frequency.value = event === 'roar' || event === 'jumpscare' ? 520 : 1800;
    osc.type = event === 'twig' || event === 'flash' ? 'triangle' : 'sawtooth';
    const base = event === 'heartbeat' ? 48 : event === 'step' ? 72 : event === 'twig' ? 950 : event === 'flash' ? 1250 : event === 'whisper' ? 420 : event === 'siren' ? 680 : 95;
    osc.frequency.setValueAtTime(base, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(25, base * (event === 'roar' || event === 'jumpscare' ? .28 : .62)), now + .22);
    osc.connect(filter); filter.connect(gain);
    osc.start(now); osc.stop(now + (event === 'jumpscare' ? .9 : .3));
    if (event === 'heartbeat') {
      const second = ctx.createOscillator(); const g2 = ctx.createGain();
      g2.gain.setValueAtTime(this.master * .13, now + .16); g2.gain.exponentialRampToValueAtTime(.001, now + .4);
      second.frequency.value = 42; second.connect(g2); g2.connect(ctx.destination); second.start(now + .16); second.stop(now + .42);
    }
  }

  startAmbience(): void {
    if (this.ambienceTimer !== null) return;
    this.ambienceTimer = window.setInterval(() => {
      if (Math.random() > .55) this.playEvent('whisper', .18 + Math.random() * .22);
    }, 6500);
  }

  setMasterVolume(volume: number): void {
    this.master = Math.max(0, Math.min(1, volume));
    for (const sound of this.sounds.values()) sound.setVolume(this.master);
  }

  dispose(): void {
    for (const sound of this.sounds.values()) sound.dispose();
    this.sounds.clear();
    if (this.ambienceTimer !== null) window.clearInterval(this.ambienceTimer);
    void this.context?.close();
  }
}
