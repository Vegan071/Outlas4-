// ИИ Вендиго: зрение, слух, реакция на луч фонарика, засады и погоня.
// Yuka отвечает за рулёжку (seek / wander / обход препятствий), остальное — конечный автомат ниже.

import * as THREE from 'three';
import * as YUKA from 'yuka';
import { FLASHLIGHT_INTENSITY, MONSTER, NOISE_RANGE, POI, SIGHT_RANGE, WORLD } from '../config.js';
import { ai, ctx, game, world } from '../state.js';
import { input } from '../core/input.js';
import { checkHorizontalCollision } from '../core/collision.js';
import { playProximitySound, playSound, updateMusicState } from '../core/audio.js';
import { getTerrainHeight } from '../world/terrain.js';
import { lights } from '../world/lighting.js';
import { monsterRig } from './monster.js';
import { startJumpscare } from './jumpscare.js';
import * as hud from '../ui/hud.js';

const STATUS = {
  CHASE: ['ОХОТА!', '#ff2222'],
  AMBUSH: ['В ЗАСАДЕ', '#ff55ff'],
  INVESTIGATE_SOUND: ['ИЩЕТ ВАС', '#ffaa33'],
  INVESTIGATE_LIGHT: ['ИЩЕТ ВАС', '#ffaa33'],
  PATROL: ['ПАТРУЛЬ', '#aaaaaa'],
};

const target = new THREE.Vector3();
const raycaster = new THREE.Raycaster();
const UP = new THREE.Vector3(0, 1, 0);
const _origin = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _tmp = new THREE.Vector3();
const _left = new THREE.Vector3();
const _right = new THREE.Vector3();

const yuka = { manager: null, vehicle: null, seek: null, wander: null };

const dist2D = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

export function initMonsterAI() {
  const manager = new YUKA.EntityManager();
  const vehicle = new YUKA.Vehicle();
  vehicle.maxSpeed = MONSTER.WANDER_SPEED;
  vehicle.maxForce = 24;
  vehicle.boundingRadius = 1.2;

  const wander = new YUKA.WanderBehavior(9, 16, 2.8);
  const seek = new YUKA.SeekBehavior(new YUKA.Vector3(0, 0, 0));
  seek.weight = 0;

  const obstacles = [];
  const addObstacle = (x, z, r) => {
    const obs = new YUKA.GameEntity();
    obs.position.set(x, 0, z);
    obs.boundingRadius = r;
    manager.add(obs);
    obstacles.push(obs);
  };
  world.houses.forEach((h) => addObstacle(h.x, h.z, Math.max(h.w, h.d) * 0.52));
  world.cars.forEach((c) => addObstacle(c.x, c.z, 2.4));
  addObstacle(POI.substation.x, POI.substation.z, 4.2);

  const avoid = new YUKA.ObstacleAvoidanceBehavior(obstacles);
  avoid.dBoxMinLength = 5.5;
  avoid.weight = 2.2;

  vehicle.steering.add(avoid);
  vehicle.steering.add(wander);
  vehicle.steering.add(seek);
  manager.add(vehicle);

  Object.assign(yuka, { manager, vehicle, seek, wander });
}

function pickPatrolTarget(player) {
  const angle = Math.random() * Math.PI * 2;
  const dist = 25 + Math.random() * 55;
  const b = WORLD.PLAY_BOUNDS;
  target.set(
    Math.max(-b, Math.min(b, player.position.x + Math.cos(angle) * dist)),
    0,
    Math.max(-b, Math.min(b, player.position.z + Math.sin(angle) * dist)),
  );
}

/** Ночь наступила: монстр появляется в ~85 м от игрока */
export function spawnMonster(player) {
  const z = Math.max(-300, Math.min(300, player.position.z + (Math.random() > 0.5 ? 85 : -85)));
  const m = monsterRig.group;
  m.position.set(0, getTerrainHeight(0, z), z);
  m.visible = true;
  yuka.vehicle?.position.set(0, 0, z);
  ai.active = true;
  ai.state = 'PATROL';
  ai.wanderWait = 0;
  pickPatrolTarget(player);
}

/** Фотовспышка: слепит монстра на заданное время */
export function stunMonster(seconds) {
  ai.stun = seconds;
  ai.state = 'PATROL';
  ai.wanderWait = 0;
  updateMusicState(false);
  playSound('roar');
}

export function updateMonster(delta, time, player) {
  if (!ai.active) return;
  const m = monsterRig.group;
  const parts = monsterRig.parts;

  yuka.manager?.update(delta);

  const dist = m.position.distanceTo(player.position);
  const terror = Math.max(0, 1 - dist / 58);

  // Реакция интерфейса на близость монстра
  hud.setPulse(Math.round(72 + terror * 95 + (input.sprint ? 18 : 0)));
  hud.setFear(terror * 0.85);
  if (ctx.bodycamPass) {
    ctx.bodycamPass.uniforms.aberration.value = 0.002 + terror * 0.016;
  }

  const near = dist < 22 && ai.stun <= 0;
  hud.setGlitch(near && Math.random() > 0.65);
  if (game.flashlightOn) {
    lights.flashlight.intensity = near && Math.random() <= 0.18 ? 1.2 : FLASHLIGHT_INTENSITY;
  }

  parts.heart.scale.setScalar(1 + Math.sin(time * 0.012) * 0.25);

  const beatInterval = Math.max(280, 900 - terror * 600);
  if (terror > 0.1 && time - ai.lastHeartbeat > beatInterval) {
    playProximitySound('heartbeat', terror * 0.55);
    ai.lastHeartbeat = time;
  }

  // Ослеплён вспышкой
  if (ai.stun > 0) {
    ai.stun -= delta;
    hud.setSanity('ОСЛЕПЛЁН', '#66ffcc');
    parts.lArm.root.rotation.x = -2.2;
    parts.rArm.root.rotation.x = -2.2;
    parts.head.rotation.z = Math.sin(time * 0.025) * 0.35;
    if (ai.stun <= 0) pickPatrolTarget(player);
    return;
  }

  perceive(time, dist, player);
  hud.setSanity(...STATUS[ai.state]);
  const speed = steer(delta, time, dist, player);
  animate(time, speed);

  if (ai.state === 'CHASE' && dist2D(player.position, m.position) < MONSTER.KILL_DISTANCE) {
    startJumpscare();
  }
}

/** Раз в ~280 мс проверяет, видит/слышит ли монстр игрока */
function perceive(time, dist, player) {
  if (time - ai.lastVision < 280) return;
  ai.lastVision = time;
  const m = monsterRig.group;
  const sight = game.flashlightOn ? SIGHT_RANGE.LIGHT_ON : SIGHT_RANGE.LIGHT_OFF;

  let canSee = false;
  if (dist < sight) {
    _origin.copy(m.position);
    _origin.y += 3.0;
    _dir.subVectors(player.position, _origin).normalize();
    raycaster.set(_origin, _dir);
    raycaster.near = 0;
    raycaster.far = sight + 2;
    const hits = raycaster.intersectObjects(world.visionBlockers, false);
    canSee = hits.length === 0 || hits[0].distance > dist;
  }

  // Монстр замечает пятно света от фонарика на земле/деревьях
  let spottedLight = false;
  if (!canSee && game.flashlightOn && dist < 60) {
    _tmp.set(0, 0, -18).applyQuaternion(ctx.camera.quaternion).add(player.position);
    spottedLight = Math.hypot(m.position.x - _tmp.x, m.position.z - _tmp.z) < 22;
  }

  const hearingRange = NOISE_RANGE[game.playerNoise] || 0;
  const heard = !canSee && hearingRange > 0 && dist < hearingRange;

  if (canSee) {
    if (ai.state !== 'CHASE') {
      ai.state = 'CHASE';
      updateMusicState(true);
      playSound('roar');
    }
    target.copy(player.position);
    ai.chaseUntil = time + 2000; // «память» о цели ещё 2 секунды
  } else if (ai.state === 'CHASE') {
    if (time < ai.chaseUntil) {
      target.copy(player.position);
    } else {
      ai.state = 'PATROL';
      updateMusicState(false);
      ai.wanderWait = 0;
      pickPatrolTarget(player);
    }
  } else if (heard || spottedLight) {
    ai.state = heard ? 'INVESTIGATE_SOUND' : 'INVESTIGATE_LIGHT';
    target.copy(player.position);
    ai.wanderWait = 0;
  } else if (ai.state === 'PATROL' && dist > 24 && dist < 52 && Math.random() < 0.08) {
    ai.state = 'AMBUSH';
    ai.ambush = 6.5;
  }
}

/** Двигает монстра согласно состоянию; возвращает текущую скорость (0 — стоит) */
function steer(delta, time, dist, player) {
  const m = monsterRig.group;
  let speed = MONSTER.WANDER_SPEED;

  switch (ai.state) {
    case 'CHASE':
      speed = MONSTER.CHASE_SPEED;
      break;

    case 'INVESTIGATE_SOUND':
    case 'INVESTIGATE_LIGHT':
      speed = MONSTER.INVESTIGATE_SPEED;
      if (dist2D(m.position, target) < 3.5) ai.state = 'PATROL';
      break;

    case 'AMBUSH':
      speed = 0;
      ai.ambush -= delta;
      m.lookAt(player.position.x, m.position.y, player.position.z);
      if (ai.ambush <= 0 || dist < 16) {
        if (dist < 22) {
          ai.state = 'CHASE';
          ai.chaseUntil = time + 2000;
          updateMusicState(true);
          playSound('roar');
        } else {
          ai.state = 'PATROL';
          pickPatrolTarget(player);
        }
      }
      break;

    default: // PATROL: дошёл до точки → постоял → выбрал новую
      if (ai.wanderWait > 0) {
        ai.wanderWait -= delta;
        speed = 0;
        if (ai.wanderWait <= 0) pickPatrolTarget(player);
      } else if (dist2D(m.position, target) < 3) {
        ai.wanderWait = MONSTER.PATROL_PAUSE;
        speed = 0;
      }
  }

  if (speed > 0) moveTowardTarget(delta, time, dist, speed);

  checkHorizontalCollision(m.position, 0.75);
  m.position.y = getTerrainHeight(m.position.x, m.position.z) + (ai.state === 'AMBUSH' ? -0.85 : 0);
  return speed;
}

function moveTowardTarget(delta, time, dist, speed) {
  const m = monsterRig.group;
  _dir.subVectors(target, m.position);
  _dir.y = 0;
  if (_dir.lengthSq() <= 0.1) return;
  _dir.normalize();

  // Yuka корректирует направление (обход препятствий, блуждание при патруле)
  if (yuka.vehicle) {
    const chasing = ai.state === 'CHASE' || ai.state === 'INVESTIGATE_SOUND' || ai.state === 'INVESTIGATE_LIGHT';
    yuka.vehicle.position.set(m.position.x, 0, m.position.z);
    yuka.vehicle.maxSpeed = speed;
    yuka.seek.target.set(target.x, 0, target.z);
    yuka.seek.weight = chasing ? 1.8 : 0.85;
    yuka.wander.weight = chasing ? 0 : 0.65;
    const v = yuka.vehicle.velocity;
    if (v.x * v.x + v.z * v.z > 0.05) _dir.set(v.x, 0, v.z).normalize();
  }

  // Если прямо впереди стена/машина — сворачиваем в сторону с большим просветом
  _origin.set(m.position.x, m.position.y + 1.5, m.position.z);
  raycaster.set(_origin, _dir);
  raycaster.near = 0;
  raycaster.far = 4.5;
  if (raycaster.intersectObjects(world.visionBlockers, false).length > 0) {
    _left.copy(_dir).applyAxisAngle(UP, 0.75);
    _right.copy(_dir).applyAxisAngle(UP, -0.75);
    raycaster.set(_origin, _left);
    const hl = raycaster.intersectObjects(world.visionBlockers, false);
    raycaster.set(_origin, _right);
    const hr = raycaster.intersectObjects(world.visionBlockers, false);
    const dl = hl.length ? hl[0].distance : 999;
    const dr = hr.length ? hr[0].distance : 999;
    _dir.copy(dl > dr ? _left : _right).normalize();
  }

  m.position.addScaledVector(_dir, speed * delta);

  const stepDelay = ai.state === 'CHASE' ? 310 : 620;
  if (time - ai.lastStep > stepDelay && dist < 65) {
    playProximitySound('monsterStep', Math.max(0, (1 - dist / 65) * 0.45));
    ai.lastStep = time;
  }

  // Плавный поворот в сторону движения
  let diff = Math.atan2(_dir.x, _dir.z) - m.rotation.y;
  while (diff < -Math.PI) diff += Math.PI * 2;
  while (diff > Math.PI) diff -= Math.PI * 2;
  m.rotation.y += diff * Math.min(1, 6.5 * delta);
}

function animate(time, speed) {
  const parts = monsterRig.parts;
  const chasing = ai.state === 'CHASE';
  const t = time * 0.001 * (chasing ? 14.5 : speed > 0 ? 6.5 : 1.5);
  const swing = chasing ? 1.05 : speed > 0 ? 0.55 : 0.08;

  parts.lArm.root.rotation.x = Math.sin(t) * swing;
  parts.rArm.root.rotation.x = Math.sin(t + Math.PI) * swing;
  parts.lLeg.root.rotation.x = Math.sin(t + Math.PI) * swing;
  parts.rLeg.root.rotation.x = Math.sin(t) * swing;

  if (chasing) {
    parts.head.rotation.z = Math.sin(t * 2) * 0.18;
    parts.jaw.rotation.x = Math.abs(Math.sin(t * 4)) * 0.42;
  } else if (ai.state === 'AMBUSH') {
    parts.head.rotation.z = 0.35;
    parts.jaw.rotation.x = 0.15;
  } else {
    parts.head.rotation.z = 0;
    parts.jaw.rotation.x = 0.1;
  }
}
