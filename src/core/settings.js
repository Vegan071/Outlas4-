import { STORAGE_KEY } from '../config.js';
import { settings } from '../state.js';

export function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (typeof data.potato === 'boolean') settings.potato = data.potato;
    if (typeof data.bloom === 'boolean') settings.bloom = data.bloom;
    if (Number.isFinite(data.sens)) settings.sens = Math.min(2.5, Math.max(0.1, data.sens));
    if (Number.isFinite(data.volume)) settings.volume = Math.min(1, Math.max(0, data.volume));
  } catch {
    /* localStorage недоступен или повреждён — используем значения по умолчанию */
  }
}

export function saveSettings() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    /* ignore */
  }
}
