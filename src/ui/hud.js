// Тонкая обёртка над DOM-элементами HUD.

const $ = (id) => document.getElementById(id);

const el = {
  layer: $('ui-layer'),
  interaction: $('interaction-text'),
  notes: $('note-counter'),
  fps: $('fps-counter'),
  substation: $('substation-status'),
  camTimer: $('cam-timer'),
  pulse: $('pulse-text'),
  sanity: $('sanity-status'),
  noise: $('noise-status'),
  flashlight: $('flashlight-status'),
  flashbang: $('flashbang-status'),
  radar: $('radar-status'),
  radarMsg: $('radar-msg'),
  lore: $('note-lore-box'),
  system: $('system-msg'),
  blood: $('blood-overlay'),
  flash: $('flash-overlay'),
  fear: $('fear-overlay'),
  glitch: $('glitch-text'),
};

const GLITCH_DEFAULT = el.glitch.textContent;
const timers = {};
const last = {}; // последние записанные значения — чтобы не трогать DOM каждый кадр

/** Показывает элемент и скрывает его через ms; повторный вызов перезапускает таймер */
function flashMessage(key, node, text, ms) {
  node.innerText = text;
  node.style.opacity = 1;
  clearTimeout(timers[key]);
  timers[key] = setTimeout(() => { node.style.opacity = 0; }, ms);
}

export const showUI = (visible) => { el.layer.style.display = visible ? 'block' : 'none'; };
export const showSystemMsg = (text, ms = 4000) => flashMessage('system', el.system, text, ms);
export const showNoteLore = (text, ms = 4500) => flashMessage('lore', el.lore, text, ms);
export const showRadarMsg = (text, ms = 4200) => flashMessage('radar', el.radarMsg, text, ms);

export function setNoteCounter(n, total) {
  el.notes.innerText = `Записки: ${n} / ${total}`;
}

export function setFps(fps) {
  el.fps.innerText = `FPS: ${fps}`;
  el.fps.style.color = fps >= 45 ? '#77ff77' : fps >= 25 ? '#ffcc44' : '#ff4444';
}

export function setCamTimer(totalSec) {
  const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const ss = String(totalSec % 60).padStart(2, '0');
  el.camTimer.innerText = `REC ${mm}:${ss}`;
}

export function setSubstationStatus(powered) {
  el.substation.innerText = powered
    ? '⚡ Подстанция: ПИТАНИЕ ВКЛЮЧЕНО (прожекторы + быстрая зарядка 2x)'
    : '⚡ Подстанция: ОТКЛЮЧЕНА (в лесу на западе)';
  el.substation.style.color = powered ? '#66ff88' : '#ffaa44';
}

export function setInteraction(text) {
  if (last.interaction === text) return;
  last.interaction = text;
  if (text) {
    el.interaction.innerText = text;
    el.interaction.style.display = 'block';
  } else {
    el.interaction.style.display = 'none';
  }
}

export const setBlood = (v) => { el.blood.style.opacity = v; };

export function setFear(v) {
  const s = v.toFixed(2);
  if (last.fear === s) return;
  last.fear = s;
  el.fear.style.opacity = s;
}

export function flashScreen() {
  el.flash.style.opacity = 0.95;
  setTimeout(() => { el.flash.style.opacity = 0; }, 220);
}

export function setGlitch(visible, text = GLITCH_DEFAULT) {
  const display = visible ? 'block' : 'none';
  if (last.glitch !== display) {
    last.glitch = display;
    el.glitch.style.display = display;
  }
  if (visible && el.glitch.textContent !== text) el.glitch.textContent = text;
}

export function setPulse(bpm) {
  if (last.pulse === bpm) return;
  last.pulse = bpm;
  el.pulse.innerText = `${bpm} BPM`;
}

export function setSanity(text, color) {
  if (el.sanity.innerText !== text) el.sanity.innerText = text;
  el.sanity.style.color = color;
}

export function setNoise(text, color) {
  el.noise.innerText = text;
  el.noise.style.color = color;
}

export function setFlashlightStatus(on) {
  el.flashlight.innerText = on ? 'ВКЛ (луч виден монстру!)' : 'ВЫКЛ (стелс)';
  el.flashlight.style.color = on ? '#ffcc44' : '#88aa88';
}

export function setRadarStatus(cooldown) {
  el.radar.innerText = cooldown > 0 ? `ИМПУЛЬС (${Math.ceil(cooldown)}с)` : 'АКТИВЕН';
  el.radar.style.color = cooldown > 0 ? '#ff8844' : '#66ffcc';
}

export function setFlashbangStatus(cooldown) {
  el.flashbang.innerText = cooldown > 0 ? `${Math.ceil(cooldown)}с` : 'ГОТОВО';
  el.flashbang.style.color = cooldown > 0 ? '#ff8844' : '#ffdd55';
}
