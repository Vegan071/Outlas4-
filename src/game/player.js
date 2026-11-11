// Движение игрока по рельефу, прыжок, шум шагов.

import * as THREE from 'three';
import { NOISE_LABELS, PLAYER } from '../config.js';
import { ctx, game, getPlayer } from '../state.js';
import { input } from '../core/input.js';
import { checkHorizontalCollision } from '../core/collision.js';
import { playSound } from '../core/audio.js';
import { getTerrainHeight } from '../world/terrain.js';
import * as hud from '../ui/hud.js';

export const playerState = { bobTimer: 0, groundY: 0 };

const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
let baseY = PLAYER.HEIGHT;
let canJump = true;
let lastStepTime = 0;
let twigCooldown = 0;
let shownNoise = -1;

export function jump() {
  if (!canJump || !game.active || game.jumpscare || !ctx.controls.isLocked) return;
  velocity.y = PLAYER.JUMP_FORCE;
  canJump = false;
}

export function updatePlayer(delta, time) {
  const obj = getPlayer();
  const speed = input.sprint ? PLAYER.SPRINT_SPEED : PLAYER.WALK_SPEED;

  direction.z = Number(input.forward) - Number(input.backward);
  direction.x = Number(input.right) - Number(input.left);
  direction.normalize();

  if (input.forward || input.backward) velocity.z -= direction.z * speed * delta * 10;
  if (input.left || input.right) velocity.x += direction.x * speed * delta * 10;
  // Коэффициент торможения ограничен: при delta = 0.1 (FPS ≤ 10) формула «v -= v * 10 * delta»
  // обнуляла скорость каждый кадр, и игрок не мог сдвинуться с места. На 60 FPS ничего не меняется.
  const damping = Math.min(10 * delta, 0.5);
  velocity.x -= velocity.x * damping;
  velocity.z -= velocity.z * damping;

  // moveForward/moveRight двигают строго по горизонтали, независимо от наклона камеры
  ctx.controls.moveRight(velocity.x * delta);
  ctx.controls.moveForward(-velocity.z * delta);
  checkHorizontalCollision(obj.position, PLAYER.RADIUS);

  // вертикаль: гравитация + пол (рельеф или тротуар)
  velocity.y -= PLAYER.GRAVITY * delta;
  baseY += velocity.y * delta;
  const onSidewalk = Math.abs(obj.position.x) >= 8 && Math.abs(obj.position.x) <= 13 && Math.abs(obj.position.z) <= 250;
  const terrainY = getTerrainHeight(obj.position.x, obj.position.z);
  const floorY = onSidewalk ? 0.22 : terrainY;
  if (baseY - PLAYER.HEIGHT <= floorY) {
    velocity.y = Math.max(0, velocity.y);
    baseY = floorY + PLAYER.HEIGHT;
    canJump = true;
  }
  playerState.groundY = terrainY;

  // шаги, покачивание головы, уровень шума
  twigCooldown = Math.max(0, twigCooldown - delta);
  const moving = Math.abs(velocity.x) > 0.5 || Math.abs(velocity.z) > 0.5;

  if (moving && canJump) {
    if (time - lastStepTime > (input.sprint ? 330 : 540)) {
      playSound('step');
      lastStepTime = time;
      // в лесу при беге можно наступить на ветку — это очень громко
      if (input.sprint && Math.abs(obj.position.x) > 38 && Math.random() < 0.25 && twigCooldown <= 0) {
        playSound('click');
        twigCooldown = 4;
        game.playerNoise = 3;
      }
    }
    playerState.bobTimer += delta * (input.sprint ? 13 : 8);
    obj.position.y = baseY + Math.sin(playerState.bobTimer) * 0.06;
    if (twigCooldown <= 3.2) game.playerNoise = input.sprint ? 2 : 1;
  } else {
    game.playerNoise = 0;
    obj.position.y = THREE.MathUtils.lerp(obj.position.y, baseY, Math.min(1, delta * 10));
  }

  if (game.playerNoise !== shownNoise) {
    shownNoise = game.playerNoise;
    const label = NOISE_LABELS[shownNoise];
    hud.setNoise(label.text, label.color);
  }
}
