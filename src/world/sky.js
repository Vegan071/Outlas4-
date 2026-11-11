import * as THREE from 'three';
import { ctx, game } from '../state.js';

export let bloodMoon = null;
let ash = null;

export function buildSky() {
  bloodMoon = new THREE.Mesh(
    new THREE.SphereGeometry(18, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xff2211, fog: false }),
  );
  bloodMoon.position.set(-180, -30, -220);
  ctx.scene.add(bloodMoon);

  const count = 600;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < pos.length; i += 3) {
    pos[i] = (Math.random() - 0.5) * 110;
    pos[i + 1] = Math.random() * 22;
    pos[i + 2] = (Math.random() - 0.5) * 110;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  ash = new THREE.Points(
    geo,
    new THREE.PointsMaterial({ color: 0xaaaaaa, size: 0.15, transparent: true, opacity: 0.5 }),
  );
  ash.frustumCulled = false;
  ctx.scene.add(ash);
}

/** Луна поднимается по мере наступления ночи (progress 0..1) */
export function setMoonProgress(p) {
  if (bloodMoon) bloodMoon.position.y = -30 + p * 125;
}

/** Падающий пепел вокруг игрока */
export function updateAsh(delta, player, groundY) {
  if (!ash) return;
  if (!game.lowSpec) {
    const arr = ash.geometry.attributes.position.array;
    for (let i = 1; i < arr.length; i += 3) {
      arr[i] -= delta * 0.8;
      if (arr[i] < 0) arr[i] = 22;
    }
    ash.geometry.attributes.position.needsUpdate = true;
  }
  ash.position.set(player.position.x, groundY, player.position.z);
}
