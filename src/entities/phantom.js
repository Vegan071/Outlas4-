// «Галлюцинация»: тёмный силуэт, который ненадолго появляется впереди и исчезает.

import * as THREE from 'three';
import { ctx, game } from '../state.js';
import { playSound } from '../core/audio.js';
import { getTerrainHeight } from '../world/terrain.js';

let phantom = null;
let cooldown = 18;
let visibleTimer = 0;

const forward = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

export function buildPhantom() {
  phantom = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0x020202, transparent: true, opacity: 0.88 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 2.3, 8), mat);
  body.position.y = 1.15;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8), mat);
  head.position.y = 2.5;
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const eyeGeo = new THREE.SphereGeometry(0.035);
  const e1 = new THREE.Mesh(eyeGeo, eyeMat); e1.position.set(-0.09, 2.52, 0.25);
  const e2 = new THREE.Mesh(eyeGeo, eyeMat); e2.position.set(0.09, 2.52, 0.25);
  phantom.add(body, head, e1, e2);
  phantom.visible = false;
  ctx.scene.add(phantom);
}

export function updatePhantom(delta, player) {
  if (!game.isNight || !phantom) return;

  if (!phantom.visible) {
    cooldown -= delta;
    const inForest = Math.abs(player.position.x) > 40 || Math.abs(player.position.z) > 40;
    if (cooldown > 0 || !inForest) return;

    forward.set(0, 0, -1).applyQuaternion(ctx.camera.quaternion);
    forward.y = 0;
    forward.normalize();
    forward.applyAxisAngle(UP, (Math.random() - 0.5) * 1.1);
    const x = player.position.x + forward.x * 16;
    const z = player.position.z + forward.z * 16;
    phantom.position.set(x, getTerrainHeight(x, z), z);
    phantom.lookAt(player.position.x, player.position.y, player.position.z);
    phantom.visible = true;
    visibleTimer = 2.8;
    cooldown = 22 + Math.random() * 18;
    playSound('whisper');
    return;
  }

  visibleTimer -= delta;
  phantom.lookAt(player.position.x, player.position.y, player.position.z);
  if (visibleTimer <= 0 || player.position.distanceTo(phantom.position) < 7.5) phantom.visible = false;
}
