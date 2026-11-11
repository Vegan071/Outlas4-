import { Sound } from '@babylonjs/core/Audio/sound';
import type { Scene } from '@babylonjs/core/scene';

const CC0 = 'https://sfxmint.com/dl/';
const FILES = {
  ambience: CC0 + 'horror-ambience-dark-50.mp3',
  drone: CC0 + 'horror-drone-25.mp3',
  stinger: CC0 + 'horror-stinger-54.mp3',
  heartbeat: CC0 + 'horror-heartbeat-73.mp3',
  creak: CC0 + 'horror-creak-61.mp3',
  growl: CC0 + 'horror-growl-11.mp3',
  thunder: CC0 + 'ambience-thunder-04.mp3',
  footsteps: CC0 + 'footsteps-concrete-03.mp3',
  running: CC0 + 'footsteps-concrete-20.mp3',
  wind: CC0 + 'horror-wind-whisper-56.mp3',
  twig: CC0 + 'wood-snap-06.mp3',
} as const;

type EventName = 'step' | 'twig' | 'roar' | 'whisper' | 'heartbeat' | 'flash' | 'jumpscare' | 'siren' | 'thunder' | 'creak';

/**
 * CC0 sound library integration.
 * Remote MP3s are hotlinked from SFXMint (CC0 1.0); browser audio is unlocked on Start.
 * Procedural WebAudio remains a fallback if a remote file is unavailable.
 */
export class AudioManager {
  private readonly sounds = new Map<string, Sound>();
  private context: AudioContext | null = null;
  private master = 0.7;
  private ambienceTimer: number | null = null;
  private ambienceRequested = false;
  private footstepsActive = false;
  private runningFootsteps = false;
  private sirenGain: GainNode | null = null;
  private sirenOscillator: OscillatorNode | null = null;
  private sirenLfo: OscillatorNode | null = null;

  constructor(private readonly scene: Scene) {
    for (const [id, url] of Object.entries(FILES)) {
      const loop = ['ambience', 'drone', 'wind', 'heartbeat', 'footsteps', 'running'].includes(id);
      const volume = id === 'ambience' ? .34 : id === 'drone' ? .22 : id === 'wind' ? .2 :
        id === 'heartbeat' ? .0 : id === 'footsteps' || id === 'running' ? .42 : .75;
      try {
        let sound!: Sound;
        sound = new Sound(id, url, scene, () => {
          if (this.ambienceRequested && ['ambience', 'drone', 'wind'].includes(id) && !sound.isPlaying) sound.play();
        }, {
          autoplay: false, loop, volume: volume * this.master,
          spatialSound: false, distanceModel: 'linear', maxDistance: 55,
        });
        this.sounds.set(id, sound);
      } catch (error) {
        console.warn('Unable to load CC0 sound:', id, error);
      }
    }
  }

  suspend(): void {
    this.setFootsteps(false, false); this.setHeartbeat(false); this.setSirenVolume(0);
    for (const sound of this.sounds.values()) if (sound.isPlaying) sound.pause();
    if (this.context?.state === 'running') void this.context.suspend();
  }

  async unlock(): Promise<void> {
    if (!this.context && window.AudioContext) this.context = new window.AudioContext();
    if (this.context?.state === 'suspended') await this.context.resume();
  }

  private playSound(id: string): boolean {
    const sound = this.sounds.get(id);
    if (!sound || !sound.isReady()) return false;
    if (!sound.isPlaying) sound.play();
    return true;
  }

  private stopSound(id: string): void {
    const sound = this.sounds.get(id);
    if (sound?.isPlaying) sound.stop();
  }

  playEvent(event: EventName, intensity = 1): void {
    const ids: Record<EventName, string> = {
      step: 'footsteps', twig: 'twig', roar: 'growl', whisper: 'wind',
      heartbeat: 'heartbeat', flash: '', jumpscare: 'stinger', siren: '',
      thunder: 'thunder', creak: 'creak',
    };
    const id = ids[event];
    const sound = this.sounds.get(id);
    if (id && sound?.isReady()) {
      sound.setVolume(Math.max(.05, Math.min(1, intensity)) * this.master * (id === 'growl' ? .9 : 1));
      sound.stop();
      sound.play();
      return;
    }
    this.playFallback(event, intensity);
  }

  setFootsteps(moving: boolean, running: boolean): void {
    if (!moving) {
      if (this.footstepsActive) {
        this.stopSound(this.runningFootsteps ? 'running' : 'footsteps');
        this.footstepsActive = false;
      }
      return;
    }
    const id = running ? 'running' : 'footsteps';
    if (this.footstepsActive && this.runningFootsteps === running) return;
    if (this.footstepsActive) this.stopSound(this.runningFootsteps ? 'running' : 'footsteps');
    const sound = this.sounds.get(id);
    if (!sound?.isReady()) { this.footstepsActive = false; return; }
    sound.setVolume(this.master * (running ? .58 : .4));
    sound.play();
    this.footstepsActive = true;
    this.runningFootsteps = running;
  }

  startSiren(): void {
    if (!this.context || this.sirenGain) return;
    const ctx = this.context;
    this.sirenGain = ctx.createGain(); this.sirenGain.gain.value = 0; this.sirenGain.connect(ctx.destination);
    this.sirenOscillator = ctx.createOscillator(); this.sirenOscillator.type = 'square'; this.sirenOscillator.frequency.value = 680;
    this.sirenLfo = ctx.createOscillator(); this.sirenLfo.type = 'sine'; this.sirenLfo.frequency.value = 2.2;
    const depth = ctx.createGain(); depth.gain.value = 220;
    this.sirenLfo.connect(depth); depth.connect(this.sirenOscillator.frequency);
    this.sirenOscillator.connect(this.sirenGain); this.sirenOscillator.start(); this.sirenLfo.start();
  }

  setSirenVolume(volume: number): void {
    if (this.sirenGain) this.sirenGain.gain.setTargetAtTime(Math.max(0, Math.min(.5, volume)) * this.master, this.context!.currentTime, .08);
  }

  setChaseState(chasing: boolean): void {
    const drone = this.sounds.get('drone');
    if (drone) drone.setVolume(this.master * (chasing ? .52 : .22));
  }

  setHeartbeat(active: boolean): void {
    const sound = this.sounds.get('heartbeat');
    if (!sound?.isReady()) return;
    if (active && !sound.isPlaying) { sound.setVolume(this.master * .5); sound.play(); }
    if (!active && sound.isPlaying) sound.stop();
  }

  startAmbience(): void {
    this.ambienceRequested = true;
    this.playSound('ambience');
    this.playSound('drone');
    this.playSound('wind');
    if (this.ambienceTimer !== null) return;
    this.ambienceTimer = window.setInterval(() => {
      if (Math.random() > .62) this.playEvent(Math.random() > .5 ? 'twig' : 'creak', .25);
      else if (Math.random() > .72) this.playEvent('whisper', .2);
    }, 7200);
  }

  setMasterVolume(volume: number): void {
    this.master = Math.max(0, Math.min(1, volume));
    for (const [id, sound] of this.sounds) {
      const base = id === 'ambience' ? .34 : id === 'drone' ? .22 : id === 'wind' ? .2 : id === 'heartbeat' ? .5 : .7;
      sound.setVolume(base * this.master);
    }
  }

  private playFallback(event: EventName, intensity: number): void {
    if (!this.context || this.context.state !== 'running') return;
    const ctx = this.context, now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(Math.max(.001, Math.min(1, intensity)) * this.master * .15, now);
    gain.gain.exponentialRampToValueAtTime(.001, now + (event === 'jumpscare' ? .9 : .3));
    gain.connect(ctx.destination);
    const osc = ctx.createOscillator(), filter = ctx.createBiquadFilter();
    filter.type = event === 'whisper' || event === 'twig' ? 'highpass' : 'lowpass';
    filter.frequency.value = event === 'roar' || event === 'jumpscare' ? 420 : 1600;
    osc.type = event === 'twig' || event === 'flash' ? 'triangle' : 'sawtooth';
    const base = event === 'heartbeat' ? 48 : event === 'step' ? 72 : event === 'twig' ? 950 : event === 'flash' ? 1250 : event === 'whisper' ? 420 : 95;
    osc.frequency.setValueAtTime(base, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(25, base * .35), now + .22);
    osc.connect(filter); filter.connect(gain); osc.start(now); osc.stop(now + .3);
  }

  dispose(): void {
    for (const sound of this.sounds.values()) sound.dispose();
    this.sirenOscillator?.stop(); this.sirenLfo?.stop(); this.sirenGain?.disconnect();
    this.sounds.clear();
    if (this.ambienceTimer !== null) window.clearInterval(this.ambienceTimer);
    void this.context?.close();
  }
}
