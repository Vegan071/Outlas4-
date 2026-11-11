// Руки от первого лица: фонарик справа, ЭМП-детектор слева.

import * as THREE from 'three';
import { ctx } from '../state.js';
import { createEmpScreenTexture } from './empDetector.js';

export const hands = { rig: null, right: null, left: null, flashLens: null, flashBeam: null, crystal: null };

export function buildHands() {
  const rig = new THREE.Group();
  const sleeveMat = new THREE.MeshLambertMaterial({ color: 0x1c242b });
  const gloveMat = new THREE.MeshLambertMaterial({ color: 0x121212 });
  const metalMat = new THREE.MeshPhongMaterial({ color: 0x2c3035, shininess: 40 });

  // --- правая рука: тактический фонарик ---
  const right = new THREE.Group();
  const rSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.068, 0.38, 8), sleeveMat);
  rSleeve.rotation.set(Math.PI / 2.2, 0, -0.2);
  rSleeve.position.set(0.06, -0.06, 0.16);
  const rGlove = new THREE.Mesh(new THREE.SphereGeometry(0.052, 8, 8), gloveMat);
  rGlove.position.set(0, -0.02, -0.02);

  const flBody = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.038, 0.32, 10), metalMat);
  flBody.rotation.x = Math.PI / 2;
  const flHead = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.038, 0.09, 10), metalMat);
  flHead.rotation.x = Math.PI / 2;
  flHead.position.z = -0.18;
  const flLens = new THREE.Mesh(new THREE.CircleGeometry(0.048, 10), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  flLens.rotation.y = Math.PI;
  flLens.position.z = -0.226;

  const beamGeo = new THREE.ConeGeometry(0.42, 1.5, 12, 1, true);
  beamGeo.rotateX(-Math.PI / 2);
  beamGeo.translate(0, 0, -0.95);
  const flBeam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({
    color: 0xfff8dd, transparent: true, opacity: 0.08,
    side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
  }));

  right.add(rSleeve, rGlove, flBody, flHead, flLens, flBeam);
  right.position.set(0.28, -0.24, -0.35);
  rig.add(right);

  // --- левая рука: ЭМП-детектор с экраном радара ---
  const left = new THREE.Group();
  const lSleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.068, 0.38, 8), sleeveMat);
  lSleeve.rotation.set(Math.PI / 2.2, 0, 0.25);
  lSleeve.position.set(-0.06, -0.06, 0.16);
  const lGlove = new THREE.Mesh(new THREE.SphereGeometry(0.052, 8, 8), gloveMat);
  lGlove.position.set(0, -0.02, -0.02);

  const empCase = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.21, 0.045), metalMat);
  empCase.rotation.set(-0.35, 0.32, 0);

  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.008, 0.12, 6), metalMat);
  antenna.position.set(-0.04, 0.13, -0.04);
  antenna.rotation.x = -0.35;
  const antTip = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 6), new THREE.MeshBasicMaterial({ color: 0x00ffcc }));
  antTip.position.set(-0.04, 0.19, -0.06);

  // Вращающийся кристалл-сенсор
  const crystal = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.022),
    new THREE.MeshPhongMaterial({ color: 0x00ffcc, emissive: 0x00aa88, shininess: 80 }),
  );
  crystal.position.set(0.035, 0.12, -0.03);

  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.115, 0.155),
    new THREE.MeshBasicMaterial({ map: createEmpScreenTexture() }),
  );
  screen.position.set(0.008, 0.01, 0.025);
  screen.rotation.set(-0.35, 0.32, 0);

  left.add(lSleeve, lGlove, empCase, antenna, antTip, crystal, screen);
  left.position.set(-0.29, -0.23, -0.36);
  rig.add(left);

  ctx.camera.add(rig);
  Object.assign(hands, { rig, right, left, flashLens: flLens, flashBeam: flBeam, crystal });
}

/** Покачивание рук в такт шагам */
export function updateHands(delta, bobTimer) {
  if (!hands.right) return;
  hands.right.position.y = -0.24 + Math.cos(bobTimer) * 0.014;
  hands.right.position.x = 0.28 + Math.sin(bobTimer * 0.5) * 0.012;
  hands.left.position.y = -0.23 + Math.sin(bobTimer) * 0.012;
  hands.left.position.x = -0.29 + Math.cos(bobTimer * 0.5) * 0.01;
  hands.crystal.rotation.y += delta * 2.5;
}

export function setHandsFlashlight(on) {
  if (hands.flashLens) hands.flashLens.material.color.setHex(on ? 0xffffff : 0x222222);
  if (hands.flashBeam) hands.flashBeam.visible = on;
}
