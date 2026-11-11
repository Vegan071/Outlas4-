import * as THREE from 'three';
import { DAY_DURATION, FLASHLIGHT_INTENSITY } from '../config.js';
import { ctx, game, world } from '../state.js';
import { setMoonProgress } from './sky.js';

export const lights = {
  ambient: null,
  sun: null,
  flashlight: null,
  flashFill: null,
  streetLight: null,
  noteLight: null,
};

const SUNSET_SKY = new THREE.Color(0xff7733);
const NIGHT_SKY = new THREE.Color(0x030307);
const SUNSET_AMBIENT = new THREE.Color(0xffaa66);
const NIGHT_AMBIENT = new THREE.Color(0x121424);
const BULB_OFF = new THREE.Color(0x666666);
const BULB_ON = new THREE.Color(0xffffee);

export function setupLights() {
  const { scene, camera } = ctx;

  lights.ambient = new THREE.AmbientLight(0xffaa66, 0.85);
  lights.sun = new THREE.DirectionalLight(0xffeedd, 1.1);
  lights.sun.position.set(120, 60, 100);
  scene.add(lights.ambient, lights.sun);

  // Фонарик и подсветка вокруг игрока крепятся к камере
  lights.flashlight = new THREE.SpotLight(0xfff6e5, FLASHLIGHT_INTENSITY);
  lights.flashlight.position.set(0.24, -0.18, 0);
  lights.flashlight.target.position.set(0, 0, -1);
  lights.flashlight.angle = Math.PI / 2.8;
  lights.flashlight.penumbra = 0.45;
  lights.flashlight.distance = 125;
  lights.flashlight.decay = 1.15;
  lights.flashFill = new THREE.PointLight(0xffeedd, 1.5, 22);
  camera.add(lights.flashlight, lights.flashlight.target, lights.flashFill);

  // Ближайший уличный фонарь и ближайшая записка получают реальный источник света
  // (на сцене всегда один/два PointLight вместо десятков — так дешевле)
  lights.streetLight = new THREE.PointLight(0xffddaa, 0, 42);
  lights.noteLight = new THREE.PointLight(0xffffff, 0, 26);
  scene.add(lights.streetLight, lights.noteLight);
}

/**
 * Переход от заката к ночи. Возвращает true в тот кадр, когда ночь наступила.
 */
export function updateDayCycle(delta) {
  if (game.isNight) {
    lights.streetLight.intensity = game.substationPowered ? 6.8 : 3.5;
    return false;
  }

  game.time += delta;
  const p = Math.min(game.time / DAY_DURATION, 1);
  const { scene } = ctx;

  scene.background.lerpColors(SUNSET_SKY, NIGHT_SKY, p);
  scene.fog.color.copy(scene.background);
  scene.fog.density = 0.012 + 0.015 * p;

  lights.ambient.color.lerpColors(SUNSET_AMBIENT, NIGHT_AMBIENT, p);
  lights.ambient.intensity = 0.85 - 0.52 * p;
  lights.sun.intensity = 1.1 * (1 - p);

  const bulbColor = BULB_OFF.clone().lerp(BULB_ON, p);
  for (const bulb of world.streetBulbs) bulb.material.color.copy(bulbColor);
  lights.streetLight.intensity = (game.substationPowered ? 6.5 : 3.5) * p;

  setMoonProgress(p);

  if (p >= 1) {
    game.isNight = true;
    return true;
  }
  return false;
}

/** Переставляет два динамических источника света к ближайшим фонарю и записке */
export function updateNearbyLights(player) {
  let bestSq = Infinity;
  let best = null;
  for (const pos of world.streetLightPositions) {
    const d = player.position.distanceToSquared(pos);
    if (d < bestSq) { bestSq = d; best = pos; }
  }
  if (best) lights.streetLight.position.copy(best);

  bestSq = Infinity;
  best = null;
  for (const note of world.notes) {
    if (note.collected || !note.isForest) continue;
    const d = player.position.distanceToSquared(note.position);
    if (d < bestSq) { bestSq = d; best = note.position; }
  }
  if (best && bestSq < 2500) {
    lights.noteLight.position.set(best.x, best.y + 0.7, best.z);
    lights.noteLight.intensity = 2.5;
  } else {
    lights.noteLight.intensity = 0;
  }
}
