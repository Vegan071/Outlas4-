// Общее изменяемое состояние. Модули импортируют его вместо глобальных переменных.

import { TOTAL_NOTES } from './config.js';

/** Объекты движка (заполняются в core/renderer.js) */
export const ctx = {
  scene: null,
  camera: null,
  renderer: null,
  composer: null,
  bloomPass: null,
  bodycamPass: null,
  controls: null,
};

/** Пользовательские настройки (сохраняются в localStorage) */
export const settings = {
  potato: false,
  bloom: true,
  sens: 1.0,
  volume: 1.0,
};

/** Состояние игровой сессии */
export const game = {
  active: false,
  initialized: false,
  isNight: false,
  time: 0,
  lowSpec: false,
  usePostProcessing: true,

  notesCollected: 0,
  totalNotes: TOTAL_NOTES,
  substationPowered: false,

  flashlightOn: true,
  radarCooldown: 0,
  flashbangCooldown: 0,

  playerNoise: 0,
  jumpscare: false,
  jumpscareTimer: 0,
};

/** Состояние ИИ монстра */
export const ai = {
  active: false,
  state: 'PATROL', // PATROL | INVESTIGATE_SOUND | INVESTIGATE_LIGHT | AMBUSH | CHASE
  stun: 0,
  ambush: 0,
  wanderWait: 0,
  chaseUntil: 0,
  lastVision: 0,
  lastStep: 0,
  lastHeartbeat: 0,
};

/** Коллайдеры и списки объектов мира */
export const world = {
  circleColliders: [],
  boxColliders: [],
  visionBlockers: [],
  houses: [],
  cars: [],
  forestTrees: [],
  notes: [],
  streetBulbs: [],
  streetLightPositions: [],
};

export const getPlayer = () => ctx.controls.getObject();
