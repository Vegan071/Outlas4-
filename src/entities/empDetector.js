// Экран ЭМП-детектора: радар рисуется на canvas и показывается как текстура на 3D-модели.

import * as THREE from 'three';
import { POI, RADAR } from '../config.js';
import { ai, ctx, game, world } from '../state.js';
import { police } from './policeCar.js';
import { monsterRig } from './monster.js';

const W = 128;
const H = 160;
const CX = W / 2;
const CY = 68;
const RADIUS = 50;

let canvas = null;
let g = null;
let texture = null;
let sweepAngle = 0;
let idleKey = null; // что сейчас нарисовано на погасшем экране

const forward = new THREE.Vector3();
const right = new THREE.Vector3();
const FORWARD_AXIS = new THREE.Vector3(0, 0, -1);

export function createEmpScreenTexture() {
  canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  g = canvas.getContext('2d');
  texture = new THREE.CanvasTexture(canvas);
  return texture;
}

/** Переводит мировую позицию в координаты экрана радара (вверх = туда, куда смотрит игрок) */
function project(dx, dz, range) {
  return {
    x: CX + ((dx * right.x + dz * right.z) / range) * RADIUS,
    y: CY - ((dx * forward.x + dz * forward.z) / range) * RADIUS,
  };
}

const dot = (p, color, r) => {
  g.fillStyle = color;
  g.beginPath(); g.arc(p.x, p.y, r, 0, Math.PI * 2); g.fill();
};

/** Погасший экран: показывает, сколько осталось до перезарядки. Перерисовывается только при смене надписи. */
function drawIdleScreen() {
  const ready = game.radarCooldown <= 0;
  const key = ready ? 'ready' : Math.ceil(game.radarCooldown);
  if (key === idleKey) return;
  idleKey = key;

  g.fillStyle = '#010806';
  g.fillRect(0, 0, W, H);
  g.textAlign = 'center';
  g.fillStyle = ready ? '#00ffcc' : '#ff8844';
  g.font = 'bold 14px Courier New';
  g.fillText(ready ? 'ГОТОВ' : 'ЗАРЯДКА', CX, CY - 4);
  g.font = 'bold 22px Courier New';
  g.fillText(ready ? '[Q]' : `${key}с`, CX, CY + 24);
  g.fillStyle = '#1a3a30';
  g.font = '10px Courier New';
  g.fillText('ЭМП-РАДАР', CX, 152);
  texture.needsUpdate = true;
}

export function drawEmpScreen(delta, player) {
  if (!g) return;

  // Радар работает только пока идёт окно обзора (RADAR.DURATION секунд после нажатия Q)
  if (game.radarActive <= 0) {
    drawIdleScreen();
    return;
  }
  idleKey = null;

  g.fillStyle = '#031610';
  g.fillRect(0, 0, W, H);

  // полоска оставшегося времени; в последнюю секунду экран мигает
  const left = game.radarActive / RADAR.DURATION;
  g.fillStyle = game.radarActive < 1 && Math.floor(game.radarActive * 8) % 2 === 0 ? '#ff4422' : '#00ffcc';
  g.fillRect(14, 4, (W - 28) * left, 5);

  // сетка
  g.strokeStyle = 'rgba(0,255,170,.35)';
  g.lineWidth = 1;
  [18, 34, 50].forEach((r) => { g.beginPath(); g.arc(CX, CY, r, 0, Math.PI * 2); g.stroke(); });
  g.beginPath();
  g.moveTo(CX - RADIUS, CY); g.lineTo(CX + RADIUS, CY);
  g.moveTo(CX, CY - RADIUS); g.lineTo(CX, CY + RADIUS);
  g.stroke();

  // развёртка
  sweepAngle = (sweepAngle + delta * 3.8) % (Math.PI * 2);
  g.strokeStyle = '#00ffcc';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(CX, CY);
  g.lineTo(CX + Math.cos(sweepAngle) * RADIUS, CY + Math.sin(sweepAngle) * RADIUS);
  g.stroke();

  // базис: направление взгляда в плоскости XZ и вектор «вправо»
  forward.copy(FORWARD_AXIS).applyQuaternion(ctx.camera.quaternion);
  forward.y = 0;
  forward.normalize();
  right.set(-forward.z, 0, forward.x);

  const px = player.position.x;
  const pz = player.position.z;
  let nearest = Infinity;

  for (const note of world.notes) {
    if (note.collected) continue;
    const dx = note.position.x - px;
    const dz = note.position.z - pz;
    const dist = Math.hypot(dx, dz);
    nearest = Math.min(nearest, dist);
    if (dist < 160) dot(project(dx, dz, 160), '#55ff88', 3);
  }

  if (!game.substationPowered) {
    const dx = POI.substation.x - px;
    const dz = POI.substation.z - pz;
    if (Math.hypot(dx, dz) < 180) {
      const p = project(dx, dz, 180);
      g.fillStyle = '#ffcc00';
      g.fillRect(p.x - 3, p.y - 3, 6, 6);
    }
  }

  if (police.car) {
    const dx = police.car.position.x - px;
    const dz = police.car.position.z - pz;
    const dist = Math.hypot(dx, dz) || 1;
    nearest = dist;
    const clamped = Math.min(dist, 160);
    dot(project(dx / dist * clamped, dz / dist * clamped, 160), '#3399ff', 4.5);
  }

  if (ai.active && monsterRig.group) {
    const dx = monsterRig.group.position.x - px;
    const dz = monsterRig.group.position.z - pz;
    if (Math.hypot(dx, dz) < 95) dot(project(dx, dz, 95), '#ff2222', 4);
  }

  g.textAlign = 'center';
  g.fillStyle = '#00ffcc';
  g.font = 'bold 12px Courier New';
  g.fillText(`ЦЕЛЬ: ${nearest < Infinity ? Math.round(nearest) + 'm' : '--'}`, CX, 136);
  g.fillStyle = game.substationPowered ? '#66ff88' : '#ffaa44';
  g.font = '10px Courier New';
  g.fillText(game.substationPowered ? 'СЕТЬ: 220В ВКЛ' : 'СЕТЬ: ОТКЛ', CX, 152);

  texture.needsUpdate = true;
}
