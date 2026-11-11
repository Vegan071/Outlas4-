// Главное меню / пауза / экраны победы и поражения + настройки.

import { settings } from '../state.js';
import { saveSettings } from '../core/settings.js';
import { setVolume } from '../core/audio.js';

const $ = (id) => document.getElementById(id);

const el = {
  menu: $('menu'),
  title: $('menu-title'),
  desc: $('menu-desc'),
  note: $('menu-note'),
  startBtn: $('start-btn'),
  potato: $('potato-mode-cb'),
  bloom: $('bloom-cb'),
  sens: $('sens-slider'),
  volume: $('volume-slider'),
};

const DEFAULT_BG = 'rgba(4, 4, 6, 0.96)';
let mode = 'start'; // 'start' | 'pause' | 'restart'
let onPrimary = () => {};

/** onPrimary вызывается при нажатии главной кнопки в режимах start/pause */
export function initMenu(callbacks) {
  onPrimary = callbacks.onPrimary;

  syncControls();

  el.potato.addEventListener('change', () => {
    settings.potato = el.potato.checked;
    if (settings.potato) settings.bloom = false;
    syncControls();
    saveSettings();
  });
  el.bloom.addEventListener('change', () => {
    settings.bloom = el.bloom.checked;
    saveSettings();
  });
  el.sens.addEventListener('input', () => {
    settings.sens = parseFloat(el.sens.value);
    saveSettings();
  });
  el.volume.addEventListener('input', () => {
    settings.volume = parseFloat(el.volume.value);
    setVolume(settings.volume);
    saveSettings();
  });

  el.startBtn.addEventListener('click', () => {
    if (mode === 'restart') location.reload();
    else onPrimary();
  });

  showMenu('start');
}

function syncControls() {
  el.potato.checked = settings.potato;
  el.bloom.checked = settings.bloom && !settings.potato;
  el.bloom.disabled = settings.potato;
  el.sens.value = settings.sens;
  el.volume.value = settings.volume;
}

export function showMenu(kind, opts = {}) {
  mode = kind === 'start' || kind === 'pause' ? kind : 'restart';
  const presets = {
    start: {
      title: 'Point of No Return', color: '#b11', shadow: '0 0 20px rgba(255,0,0,.5)', bg: DEFAULT_BG,
      desc: 'Закат. Лес. Вендиго. Соберите 10 записок, не попавшись монстру, и доберитесь до полицейской машины.',
      button: 'Начать игру',
    },
    pause: {
      title: 'Пауза', color: '#a00', shadow: '0 0 20px rgba(255,0,0,.5)', bg: DEFAULT_BG,
      desc: 'Игра приостановлена. Можно поменять настройки.',
      button: 'Продолжить',
    },
    win: {
      title: 'Вы спаслись!', color: '#48f', shadow: '0 0 30px rgba(0,100,255,.8)', bg: 'rgba(0, 10, 45, 0.96)',
      desc: 'Вы собрали все улики и успели запрыгнуть в патрульную машину.',
      button: 'Сыграть ещё раз',
    },
    lose: {
      title: 'Вы погибли', color: '#f22', shadow: '0 0 30px rgba(255,0,0,.8)', bg: 'rgba(40, 0, 0, 0.96)',
      desc: 'Вендиго выследил вас в темноте.',
      button: 'Попробовать снова',
    },
  };
  const p = { ...presets[kind], ...opts };
  el.title.innerText = p.title;
  el.title.style.color = p.color;
  el.title.style.textShadow = p.shadow;
  el.desc.innerText = p.desc;
  el.startBtn.innerText = p.button;
  el.menu.style.backgroundColor = p.bg;
  el.menu.style.display = 'flex';
  el.note.innerText = '';
}

export const hideMenu = () => { el.menu.style.display = 'none'; };
export const setMenuNote = (text) => { el.note.innerText = text; };
