// Жизненный цикл сессии: сборка мира, пауза, победа/поражение.

import { ctx, game } from '../state.js';
import { resetInput } from '../core/input.js';
import { initAudio, resumeAudio, stopAmbience, suspendAudio } from '../core/audio.js';
import { applyQuality } from '../core/renderer.js';
import { initTerrainNoise, buildGround } from '../world/terrain.js';
import { buildCity } from '../world/city.js';
import { buildForest } from '../world/forest.js';
import { buildSky } from '../world/sky.js';
import { buildPOIs } from '../world/pois.js';
import { spawnNotes } from '../world/notes.js';
import { buildHands } from '../entities/hands.js';
import { buildMonster } from '../entities/monster.js';
import { initMonsterAI } from '../entities/monsterAI.js';
import { buildJumpscareRig, endJumpscareVisuals } from '../entities/jumpscare.js';
import { buildPhantom } from '../entities/phantom.js';
import { setFlashlight } from './gadgets.js';
import { hideMenu, setMenuNote, showMenu } from '../ui/menu.js';
import * as hud from '../ui/hud.js';

export function initSession() {
  const { controls } = ctx;
  controls.addEventListener('lock', onLock);
  controls.addEventListener('unlock', onUnlock);
  document.addEventListener('pointerlockerror', () => {
    setMenuNote('Не удалось захватить курсор. Подождите секунду и нажмите кнопку ещё раз.');
  });
}

/** Нажатие «Начать»/«Продолжить»: применяем настройки и захватываем курсор */
export function startOrResume() {
  initAudio();
  applyQuality();
  ctx.controls.lock();
}

function buildGame() {
  initTerrainNoise();
  buildGround();
  buildCity();
  buildForest();
  buildSky();
  buildPOIs();
  spawnNotes();
  buildHands();
  buildMonster();
  initMonsterAI();
  buildJumpscareRig();
  buildPhantom();

  setFlashlight(true);
  hud.setNoteCounter(0, game.totalNotes);
  hud.setSubstationStatus(false);
  hud.setRadarStatus(0);
  hud.setFlashbangStatus(0);
  hud.setSanity('СПИТ', '#aaaaaa');
}

function onLock() {
  hideMenu();
  hud.showUI(true);
  if (!game.initialized) {
    buildGame();
    game.initialized = true;
    hud.showSystemMsg('Закат. Следите за экраном ЭМП в левой руке! В лесу есть подстанция и вышка.', 6000);
  }
  game.active = true;
  resumeAudio();
}

function onUnlock() {
  resetInput();
  if (game.active && !game.jumpscare) {
    hud.showUI(false);
    showMenu('pause');
    suspendAudio();
  }
}

/** Конец игры. win = true — спасение, false — смерть */
export function endGame(win) {
  game.active = false; // до unlock(), чтобы onUnlock не показал паузу
  endJumpscareVisuals();
  stopAmbience();
  ctx.controls.unlock();
  hud.showUI(false);
  showMenu(win ? 'win' : 'lose');
}
