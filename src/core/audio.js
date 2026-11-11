// Процедурный звук на WebAudio (без внешних файлов).

import { settings } from '../state.js';

let ctx = null;
let master = null;
let chaseGain = null;
let ambientGain = null;
let chaseLfo = null;
let sirenGain = null;
let ready = false;

export function initAudio() {
  if (ready) return;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = settings.volume;
    master.connect(ctx.destination);

    // Музыка погони
    chaseGain = ctx.createGain();
    chaseGain.gain.value = 0;
    chaseGain.connect(master);
    const osc1 = ctx.createOscillator(); osc1.type = 'sawtooth'; osc1.frequency.value = 45;
    const osc2 = ctx.createOscillator(); osc2.type = 'square'; osc2.frequency.value = 50;
    chaseLfo = ctx.createOscillator(); chaseLfo.type = 'sine'; chaseLfo.frequency.value = 0;
    const lfoGain = ctx.createGain(); lfoGain.gain.value = 25;
    chaseLfo.connect(lfoGain); lfoGain.connect(osc1.frequency); lfoGain.connect(osc2.frequency);
    const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 350;
    osc1.connect(filter); osc2.connect(filter); filter.connect(chaseGain);
    osc1.start(); osc2.start(); chaseLfo.start();

    // Фоновый гул
    ambientGain = ctx.createGain();
    ambientGain.gain.value = 0.4;
    ambientGain.connect(master);
    const amb = ctx.createOscillator(); amb.type = 'sine'; amb.frequency.value = 55;
    const ambLfo = ctx.createOscillator(); ambLfo.type = 'triangle'; ambLfo.frequency.value = 0.15;
    const ambLfoGain = ctx.createGain(); ambLfoGain.gain.value = 8;
    ambLfo.connect(ambLfoGain); ambLfoGain.connect(amb.frequency);
    amb.connect(ambientGain); amb.start(); ambLfo.start();

    ready = true;
  } catch (e) {
    console.warn('Аудио недоступно:', e);
  }
}

export function setVolume(v) {
  if (master) master.gain.value = v;
}

export const resumeAudio = () => { if (ctx && ctx.state === 'suspended') ctx.resume(); };
export const suspendAudio = () => { if (ctx && ctx.state === 'running') ctx.suspend(); };

/** Короткий звук: тип осциллятора + частотная кривая + огибающая громкости */
function blip({ type, f0, f1, t, peak, attack = 0, dur, extra }) {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f0, now);
  if (f1) osc.frequency.exponentialRampToValueAtTime(f1, now + t);
  if (attack > 0) {
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peak, now + attack);
  } else {
    gain.gain.setValueAtTime(peak, now);
  }
  gain.gain.exponentialRampToValueAtTime(0.005, now + dur);
  osc.connect(gain);
  gain.connect(master);
  osc.start(now);
  osc.stop(now + dur + 0.03);
  if (extra) extra(now, gain, dur);
}

/** Второй осциллятор, подключённый к той же огибающей */
function layer(type, f0, f1, t) {
  return (now, gain, dur) => {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, now);
    if (type === 'square' && f1 === 'lin') {
      o.frequency.linearRampToValueAtTime(90, now + t);
    } else {
      o.frequency.exponentialRampToValueAtTime(f1, now + t);
    }
    o.connect(gain);
    o.start(now);
    o.stop(now + dur + 0.03);
  };
}

const SOUNDS = {
  step: () => blip({ type: 'triangle', f0: 70, f1: 15, t: 0.1, peak: 0.18, dur: 0.1 }),
  spawn: () => blip({ type: 'sawtooth', f0: 90, f1: 25, t: 3, peak: 0.9, attack: 0.5, dur: 3.5 }),
  jumpscare: () => blip({
    type: 'sawtooth', f0: 650, f1: 1900, t: 0.35, peak: 1.4, attack: 0.05, dur: 1.8,
    extra: layer('square', 180, 'lin', 1.4),
  }),
  pickup: () => blip({ type: 'triangle', f0: 320, f1: 680, t: 0.12, peak: 0.35, dur: 0.16 }),
  click: () => blip({ type: 'square', f0: 1200, f1: 250, t: 0.04, peak: 0.25, dur: 0.045 }),
  radar: () => blip({ type: 'sine', f0: 880, f1: 440, t: 0.35, peak: 0.25, dur: 0.38 }),
  flashbang: () => blip({ type: 'sawtooth', f0: 1600, f1: 110, t: 0.65, peak: 0.8, dur: 0.7 }),
  roar: () => blip({
    type: 'sawtooth', f0: 140, f1: 45, t: 0.8, peak: 0.9, attack: 0.1, dur: 0.9,
    extra: layer('square', 105, 35, 0.8),
  }),
  whisper: () => blip({ type: 'sine', f0: 210, f1: 75, t: 0.6, peak: 0.22, dur: 0.65 }),
};

export function playSound(type) {
  if (!ready) return;
  SOUNDS[type]?.();
}

export function playProximitySound(type, volume) {
  if (!ready || volume <= 0.01) return;
  if (type === 'heartbeat') {
    blip({ type: 'sine', f0: 65, f1: 28, t: 0.16, peak: volume, dur: 0.18 });
  } else if (type === 'monsterStep') {
    blip({ type: 'sawtooth', f0: 50, f1: 14, t: 0.18, peak: volume, dur: 0.2 });
  }
}

export function updateMusicState(chasing) {
  if (!ready) return;
  const now = ctx.currentTime;
  chaseGain.gain.cancelScheduledValues(now);
  ambientGain.gain.cancelScheduledValues(now);
  if (chasing) {
    chaseGain.gain.linearRampToValueAtTime(0.8, now + 0.8);
    ambientGain.gain.linearRampToValueAtTime(0, now + 0.5);
    chaseLfo.frequency.value = 10;
  } else {
    chaseGain.gain.linearRampToValueAtTime(0, now + 2.5);
    ambientGain.gain.linearRampToValueAtTime(0.4, now + 2.5);
    chaseLfo.frequency.value = 0;
  }
}

/** Усиливает фон при наступлении ночи */
export function swellAmbient() {
  if (!ready) return;
  ambientGain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 3);
}

/** Сирена полицейской машины (громкость задаётся из игрового цикла) */
export function startSiren() {
  if (!ready || sirenGain) return;
  sirenGain = ctx.createGain();
  sirenGain.gain.value = 0;
  sirenGain.connect(master);
  const osc = ctx.createOscillator();
  osc.type = 'square';
  osc.frequency.value = 680;
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 2.2;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 220;
  lfo.connect(lfoGain); lfoGain.connect(osc.frequency);
  osc.connect(sirenGain);
  osc.start(); lfo.start();
}

export function setSirenVolume(v) {
  if (sirenGain) sirenGain.gain.value = v;
}

/** Глушит всё «фоновое» при завершении игры */
export function stopAmbience() {
  if (!ready) return;
  const now = ctx.currentTime;
  chaseGain.gain.cancelScheduledValues(now);
  ambientGain.gain.cancelScheduledValues(now);
  chaseGain.gain.linearRampToValueAtTime(0, now + 0.4);
  ambientGain.gain.linearRampToValueAtTime(0, now + 0.4);
  setSirenVolume(0);
}
