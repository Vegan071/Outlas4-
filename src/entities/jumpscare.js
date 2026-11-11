// Скример: морда монстра прямо перед камерой.

import * as THREE from 'three';
import { ctx, game } from '../state.js';
import { textures } from '../core/textures.js';
import { playSound } from '../core/audio.js';
import { monsterRig } from './monster.js';
import { hands } from './hands.js';
import * as hud from '../ui/hud.js';

const SCARE_DURATION = 1.6;
const rig = { group: null, jaw: null, lClaw: null, rClaw: null };

export function buildJumpscareRig() {
  const skin = new THREE.MeshPhongMaterial({ map: textures.monsterSkin, shininess: 30 });
  const bone = new THREE.MeshPhongMaterial({ map: textures.monsterBone, shininess: 20 });
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff1100 });

  const head = new THREE.Group();
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.36, 12, 12), bone);
  skull.scale.set(0.9, 1.25, 1.2);
  const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.24, 0.55, 8), bone);
  snout.rotation.x = Math.PI / 2;
  snout.position.set(0, -0.03, 0.35);
  head.add(skull, snout);

  [-1, 1].forEach((side) => {
    const eye1 = new THREE.Mesh(new THREE.SphereGeometry(0.052, 8, 8), eyeMat);
    eye1.position.set(side * 0.14, 0.1, 0.38);
    const eye2 = new THREE.Mesh(new THREE.SphereGeometry(0.032, 6, 6), eyeMat);
    eye2.position.set(side * 0.2, 0.22, 0.32);
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.75, 6), skin);
    horn.position.set(side * 0.28, 0.52, -0.05);
    horn.rotation.z = -side * 0.45;
    head.add(eye1, eye2, horn);
  });

  const jaw = new THREE.Group();
  const jawMesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 0.52), skin);
  jawMesh.position.set(0, -0.22, 0.22);
  jaw.add(jawMesh);
  const toothGeo = new THREE.ConeGeometry(0.024, 0.11, 4);
  for (let i = -4; i <= 4; i++) {
    const upper = new THREE.Mesh(toothGeo, bone);
    upper.rotation.x = Math.PI;
    upper.position.set(i * 0.034, -0.1, 0.42 - Math.abs(i) * 0.02);
    head.add(upper);
    const lower = new THREE.Mesh(toothGeo, bone);
    lower.position.set(i * 0.034, -0.14, 0.42 - Math.abs(i) * 0.02);
    jaw.add(lower);
  }
  head.add(jaw);

  const lClaw = new THREE.Group();
  const rClaw = new THREE.Group();
  const bladeGeo = new THREE.ConeGeometry(0.035, 0.55, 5);
  for (let c = -1; c <= 1; c++) {
    const l = new THREE.Mesh(bladeGeo, bone);
    l.position.set(c * 0.06, c * 0.05, 0);
    l.rotation.set(0.8, 0, -0.6);
    lClaw.add(l);
    const r = new THREE.Mesh(bladeGeo, bone);
    r.position.set(c * 0.06, c * 0.05, 0);
    r.rotation.set(0.8, 0, 0.6);
    rClaw.add(r);
  }
  lClaw.position.set(-0.42, -0.15, 0.25);
  rClaw.position.set(0.42, -0.15, 0.25);

  const light = new THREE.PointLight(0xff2200, 4.5, 4.5);
  light.position.set(0, 0.1, 0.8);

  const group = new THREE.Group();
  group.add(head, lClaw, rClaw, light);
  group.position.set(0, -0.05, -0.95);
  group.visible = false;
  ctx.camera.add(group);

  Object.assign(rig, { group, jaw, lClaw, rClaw });
}

export function startJumpscare() {
  if (game.jumpscare) return;
  game.jumpscare = true;
  game.jumpscareTimer = 0;
  playSound('jumpscare');
  hud.setBlood(1);
  hud.setGlitch(true, 'СИГНАЛ ПОТЕРЯН // ФАТАЛЬНАЯ ОШИБКА');
  hud.setInteraction(null);
  monsterRig.group.visible = false;
  if (hands.rig) hands.rig.visible = false;
  rig.group.visible = true;
}

/** Анимирует скример; возвращает true, когда он закончился */
export function updateJumpscare(delta) {
  game.jumpscareTimer += delta;
  const t = game.jumpscareTimer;
  rig.group.position.x = (Math.random() - 0.5) * 0.09;
  rig.group.position.y = -0.04 + (Math.random() - 0.5) * 0.09;
  rig.group.position.z = -0.78 + Math.sin(t * 35) * 0.08;
  rig.jaw.rotation.x = 0.35 + Math.abs(Math.sin(t * 28)) * 0.45;
  rig.lClaw.position.x = -0.35 + Math.sin(t * 25) * 0.08;
  rig.rClaw.position.x = 0.35 - Math.sin(t * 25) * 0.08;
  return t > SCARE_DURATION;
}

export function endJumpscareVisuals() {
  game.jumpscare = false;
  rig.group.visible = false;
  hud.setGlitch(false);
}
