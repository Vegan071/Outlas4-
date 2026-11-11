import type { Engine } from '@babylonjs/core/Engines/engine';
import type { UniversalCamera } from '@babylonjs/core/Cameras/universalCamera';
import type { AudioManager } from '../audio/AudioManager';

interface SettingsData { potato: boolean; sens: number; volume: number }
const KEY = 'ponr-settings-v1';
const defaults: SettingsData = { potato: false, sens: 1, volume: .7 };

export class GameSettings {
  private data: SettingsData = { ...defaults };
  constructor(private engine: Engine, private camera: UniversalCamera, private audio: AudioManager) {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || 'null') as Partial<SettingsData> | null;
      if (saved) {
        if (typeof saved.potato === 'boolean') this.data.potato = saved.potato;
        if (Number.isFinite(saved.sens)) this.data.sens = Math.max(.1, Math.min(2.5, saved.sens!));
        if (Number.isFinite(saved.volume)) this.data.volume = Math.max(0, Math.min(1, saved.volume!));
      }
    } catch { /* Use defaults if localStorage is unavailable or malformed. */ }

    const potato = document.getElementById('potato-mode-cb') as HTMLInputElement | null;
    const sens = document.getElementById('sens-slider') as HTMLInputElement | null;
    const volume = document.getElementById('volume-slider') as HTMLInputElement | null;
    if (potato) {
      potato.checked = this.data.potato;
      potato.addEventListener('change', () => { this.data.potato = potato.checked; this.apply(); this.save(); });
    }
    if (sens) {
      sens.value = String(this.data.sens);
      sens.addEventListener('input', () => { this.data.sens = Number(sens.value); this.apply(); this.save(); });
    }
    if (volume) {
      volume.value = String(this.data.volume);
      volume.addEventListener('input', () => { this.data.volume = Number(volume.value); this.apply(); this.save(); });
    }
    this.apply();
  }
  private apply(): void {
    this.engine.setHardwareScalingLevel(this.data.potato ? 1.5 : 1);
    this.engine.resize();
    this.camera.angularSensibility = 2600 / this.data.sens;
    this.audio.setMasterVolume(this.data.volume);
  }
  private save(): void {
    try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch { /* Ignore unavailable storage. */ }
  }
}
