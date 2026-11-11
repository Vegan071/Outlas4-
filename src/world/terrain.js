import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import { WORLD } from '../config.js';
import { ctx } from '../state.js';
import { textures } from '../core/textures.js';

let noise2D = null;

/** Детерминированный ГПСЧ для сида шума */
function mulberry32(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function initTerrainNoise(seed = (Math.random() * 1e9) | 0) {
  noise2D = createNoise2D(mulberry32(seed));
}

/** Высота рельефа в точке. Вдоль дороги (|x| < ROAD_CLEAR_X) земля плоская, дальше — холмы. */
export function getTerrainHeight(x, z) {
  if (!noise2D) return 0;
  const distFromRoad = Math.abs(x);
  if (distFromRoad < WORLD.ROAD_CLEAR_X) return 0;
  const t = Math.min(1, (distFromRoad - WORLD.ROAD_CLEAR_X) / 24);
  const smooth = t * t * (3 - 2 * t);
  const n1 = noise2D(x * 0.0085, z * 0.0085) * 6.2;
  const n2 = noise2D(x * 0.025, z * 0.025) * 1.6;
  return (n1 + n2) * smooth;
}

export function buildGround() {
  textures.ground.repeat.set(60, 60);
  const geo = new THREE.PlaneGeometry(800, 800, 110, 110);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    pos.setY(i, getTerrainHeight(pos.getX(i), pos.getZ(i)));
  }
  geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({ map: textures.ground, shininess: 2 }));
  ctx.scene.add(ground);
}
