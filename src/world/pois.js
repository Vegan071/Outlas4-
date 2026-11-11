// Точки интереса в лесу: подстанция, радиовышка, сторожка.

import * as THREE from 'three';
import { POI } from '../config.js';
import { ctx, world } from '../state.js';
import { textures } from '../core/textures.js';
import { getTerrainHeight } from './terrain.js';

export const substation = { lever: null, light: null };
let beacon = null;

export function buildPOIs() {
  buildSubstation();
  buildRadioTower();
  buildCabin();
}

function buildSubstation() {
  const { x, z } = POI.substation;
  const group = new THREE.Group();
  group.position.set(x, getTerrainHeight(x, z), z);

  const brick = new THREE.MeshPhongMaterial({ map: textures.building, shininess: 5 });
  const metal = new THREE.MeshPhongMaterial({ color: 0x33383d, shininess: 35 });

  const booth = new THREE.Mesh(new THREE.BoxGeometry(6.5, 4.5, 5.5), brick);
  booth.position.y = 2.25;
  group.add(booth);
  world.visionBlockers.push(booth);
  world.boxColliders.push({ minX: x - 3.3, maxX: x + 3.3, minZ: z - 2.8, maxZ: z + 2.8 });

  [-1.8, 0, 1.8].forEach((cx) => {
    const coil = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.8, 8), metal);
    coil.position.set(cx, 5.4, 0);
    group.add(coil);
  });

  const box = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.1, 0.8), metal);
  box.position.set(3.35, 1.6, 0);
  group.add(box);

  substation.lever = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.14, 0.14),
    new THREE.MeshBasicMaterial({ color: 0xff2200 }),
  );
  substation.lever.position.set(3.55, 1.6, 0);
  group.add(substation.lever);

  substation.light = new THREE.PointLight(0xff2200, 2.5, 18);
  substation.light.position.set(4.2, 2.4, 0);
  group.add(substation.light);

  ctx.scene.add(group);
}

/** Визуальный эффект включения рубильника */
export function activateSubstationVisuals() {
  substation.lever.material.color.setHex(0x00ff66);
  substation.lever.position.y = 1.85;
  substation.light.color.setHex(0x00ff66);
}

function buildRadioTower() {
  const { x, z } = POI.tower;
  const group = new THREE.Group();
  group.position.set(x, getTerrainHeight(x, z), z);

  const tower = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 4.5, 68, 4, 14),
    new THREE.MeshLambertMaterial({ color: 0x44332a, wireframe: true }),
  );
  tower.position.y = 34;
  group.add(tower);

  beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.85, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0xff0000, fog: false }),
  );
  beacon.position.y = 68.5;
  group.add(beacon);

  world.circleColliders.push({ x, z, r: 3.5 });
  ctx.scene.add(group);
}

function buildCabin() {
  const { x, z } = POI.cabin;
  const group = new THREE.Group();
  group.position.set(x, getTerrainHeight(x, z), z);

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(7.5, 4.0, 6.5),
    new THREE.MeshPhongMaterial({ map: textures.bark, shininess: 4 }),
  );
  body.position.y = 2.0;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(6.2, 2.8, 4), new THREE.MeshLambertMaterial({ color: 0x1a1410 }));
  roof.position.y = 5.4;
  roof.rotation.y = Math.PI / 4;
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffaa44 }));
  bulb.position.set(3.85, 3.1, 0);
  group.add(body, roof, bulb);

  world.visionBlockers.push(body);
  world.boxColliders.push({ minX: x - 3.8, maxX: x + 3.8, minZ: z - 3.3, maxZ: z + 3.3 });
  ctx.scene.add(group);
}

/** Мигающий красный маяк на вышке */
export function updateBeacon(time) {
  if (!beacon) return;
  beacon.material.color.setHex(Math.floor(time / 450) % 2 === 0 ? 0xff1100 : 0x330000);
}
