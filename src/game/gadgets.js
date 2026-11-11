// Гаджеты игрока: фонарик, ЭМП-импульс, фотовспышка.

import * as THREE from 'three';
import { FLASHBANG, FLASHLIGHT_INTENSITY, RADAR } from '../config.js';
import { ai, ctx, game, getPlayer, world } from '../state.js';
import { playSound } from '../core/audio.js';
import { lights } from '../world/lighting.js';
import { setHandsFlashlight } from '../entities/hands.js';
import { monsterRig } from '../entities/monster.js';
import { police } from '../entities/policeCar.js';
import { stunMonster } from '../entities/monsterAI.js';
import * as hud from '../ui/hud.js';

const forward = new THREE.Vector3();
const toTarget = new THREE.Vector3();

const canAct = () => game.active && !game.jumpscare && ctx.controls.isLocked;

export function setFlashlight(on) {
  game.flashlightOn = on;
  lights.flashlight.intensity = on ? FLASHLIGHT_INTENSITY : 0;
  lights.flashFill.intensity = on ? 1.5 : 0;
  setHandsFlashlight(on);
  hud.setFlashlightStatus(on);
}

export function toggleFlashlight() {
  if (!canAct()) return;
  playSound('click');
  setFlashlight(!game.flashlightOn);
}

/**
 * Включает экран ЭМП-радара на RADAR.DURATION секунд и показывает направление и расстояние
 * до ближайшей записки (или до полицейской машины в конце). Потом — перезарядка.
 */
export function triggerRadarPing() {
  if (!canAct() || game.radarActive > 0 || game.radarCooldown > 0) return;
  game.radarActive = RADAR.DURATION;
  hud.setRadarStatus(game.radarActive, 0);
  playSound('radar');

  const player = getPlayer();
  let targetPos = null;
  let label = 'Ближайшая записка';
  let best = Infinity;

  if (game.notesCollected >= game.totalNotes && police.car) {
    targetPos = police.car.position;
    best = player.position.distanceTo(targetPos);
    label = 'Полицейская машина';
  } else {
    for (const note of world.notes) {
      if (note.collected) continue;
      const d = player.position.distanceTo(note.position);
      if (d < best) { best = d; targetPos = note.position; }
    }
  }
  if (!targetPos) return;

  forward.set(0, 0, -1).applyQuaternion(ctx.camera.quaternion);
  forward.y = 0;
  forward.normalize();
  toTarget.subVectors(targetPos, player.position);
  toTarget.y = 0;
  toTarget.normalize();

  const dot = forward.dot(toTarget);
  const cross = forward.x * toTarget.z - forward.z * toTarget.x;
  let dir = 'ПРЯМО ВПЕРЕДИ';
  if (dot < -0.5) dir = 'ПОЗАДИ ВАС';
  else if (cross > 0.35) dir = 'СПРАВА';
  else if (cross < -0.35) dir = 'СЛЕВА';

  hud.showRadarMsg(`📡 ЭМП-СИГНАЛ: ${label} — ${Math.round(best)}м [${dir}]`);
}

/** Фотовспышка: ослепляет монстра, если он ближе FLASHBANG.RANGE */
export function triggerFlashbang() {
  if (!canAct() || game.flashbangCooldown > 0) return;
  game.flashbangCooldown = FLASHBANG.COOLDOWN;
  playSound('flashbang');
  hud.flashScreen();

  if (!ai.active) return;
  const dist = getPlayer().position.distanceTo(monsterRig.group.position);
  if (dist < FLASHBANG.RANGE) {
    stunMonster(FLASHBANG.STUN);
    hud.showSystemMsg(`⚡ МОНСТР ОСЛЕПЛЁН НА ${FLASHBANG.STUN} СЕКУНДЫ! БЕГИТЕ!`, 3500);
  } else {
    hud.showSystemMsg('Вспышка сработала (монстр был слишком далеко)', 2500);
  }
}

/** Перезарядка гаджетов (с включённой подстанцией — вдвое быстрее) */
export function updateGadgets(delta) {
  const rate = game.substationPowered ? delta * 2 : delta;
  if (game.radarActive > 0) {
    // экран работает в реальном времени; перезарядка стартует, когда он погас
    game.radarActive = Math.max(0, game.radarActive - delta);
    if (game.radarActive === 0) game.radarCooldown = RADAR.COOLDOWN;
    hud.setRadarStatus(game.radarActive, game.radarCooldown);
  } else if (game.radarCooldown > 0) {
    game.radarCooldown = Math.max(0, game.radarCooldown - rate);
    hud.setRadarStatus(0, game.radarCooldown);
  }
  if (game.flashbangCooldown > 0) {
    game.flashbangCooldown = Math.max(0, game.flashbangCooldown - rate);
    hud.setFlashbangStatus(game.flashbangCooldown);
  }
}
