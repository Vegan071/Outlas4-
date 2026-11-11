// Полицейская машина-эвакуация: появляется, когда собраны все записки.

import * as THREE from 'three';
import { ctx, world } from '../state.js';
import { startSiren, setSirenVolume } from '../core/audio.js';
import { getTerrainHeight } from '../world/terrain.js';

export const police = { car: null, lights: [] };

const SIREN_RANGE = 95;

export function spawnPoliceCar() {
  if (police.car) return;
  const car = new THREE.Group();
  const white = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const black = new THREE.MeshLambertMaterial({ color: 0x111111 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.72, 4.5), white);
  body.position.y = 0.6;
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.87, 0.2, 4.4), new THREE.MeshBasicMaterial({ color: 0x1144cc }));
  stripe.position.y = 0.65;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 2.4), white);
  cabin.position.set(0, 1.25, -0.2);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.15, 0.4), black);
  bar.position.set(0, 1.6, -0.2);
  const red = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.15, 0.42), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
  red.position.set(-0.35, 1.6, -0.2);
  const blue = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.15, 0.42), new THREE.MeshBasicMaterial({ color: 0x0055ff }));
  blue.position.set(0.35, 1.6, -0.2);
  car.add(body, stripe, cabin, bar, red, blue);

  const redLight = new THREE.PointLight(0xff0000, 0, 45);
  redLight.position.set(-0.6, 2.2, -0.2);
  const blueLight = new THREE.PointLight(0x0066ff, 0, 45);
  blueLight.position.set(0.6, 2.2, -0.2);
  police.lights = [redLight, blueLight];
  car.add(redLight, blueLight);

  // Появляется за пределами леса на случайной стороне карты
  let x, z;
  switch (Math.floor(Math.random() * 4)) {
    case 0: x = 120 + Math.random() * 85; z = -100 + Math.random() * 200; break;
    case 1: x = -120 - Math.random() * 85; z = -100 + Math.random() * 200; break;
    case 2: x = -90 + Math.random() * 180; z = 240 + Math.random() * 65; break;
    default: x = -90 + Math.random() * 180; z = -240 - Math.random() * 65;
  }
  car.position.set(x, getTerrainHeight(x, z), z);
  car.rotation.y = Math.random() * Math.PI * 2;
  ctx.scene.add(car);
  world.circleColliders.push({ x, z, r: 2.3 });

  police.car = car;
  startSiren();
}

export function updatePoliceCar(time, player) {
  if (!police.car) return;
  const phase = Math.floor((time / 1000) * 6) % 2 === 0;
  police.lights[0].intensity = phase ? 5 : 0;
  police.lights[1].intensity = phase ? 0 : 5;

  const dist = player.position.distanceTo(police.car.position);
  setSirenVolume(dist < SIREN_RANGE ? 0.38 * (1 - dist / SIREN_RANGE) : 0);
}
