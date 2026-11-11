import { Sound } from '@babylonjs/core/Audio/sound';
import type { Scene } from '@babylonjs/core/scene';

/** Centralized audio entry point. Add licensed OGG/MP3 assets here as they arrive. */
export class AudioManager {
  private readonly sounds = new Map<string, Sound>();

  constructor(private readonly scene: Scene) {}

  load(id: string, url: string, options: { loop?: boolean; volume?: number; spatial?: boolean } = {}): void {
    if (this.sounds.has(id)) return;
    const sound = new Sound(id, url, this.scene, undefined, {
      autoplay: false,
      loop: options.loop ?? false,
      volume: options.volume ?? 1,
      spatialSound: options.spatial ?? false,
      distanceModel: 'linear',
      maxDistance: 35,
    });
    this.sounds.set(id, sound);
  }

  play(id: string): void {
    this.sounds.get(id)?.play();
  }

  stop(id: string): void {
    this.sounds.get(id)?.stop();
  }

  setMasterVolume(volume: number): void {
    const normalized = Math.max(0, Math.min(1, volume));
    for (const sound of this.sounds.values()) sound.setVolume(normalized);
  }

  dispose(): void {
    for (const sound of this.sounds.values()) sound.dispose();
    this.sounds.clear();
  }
}
