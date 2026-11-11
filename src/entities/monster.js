// 3D-модель Вендиго (собрана из примитивов).

import * as THREE from 'three';
import { ctx } from '../state.js';
import { textures } from '../core/textures.js';

/** group — корневой объект, parts — подвижные части для анимации */
export const monsterRig = { group: null, parts: {} };

export function buildMonster() {
  const monster = new THREE.Group();
  const parts = {};

  const skin = new THREE.MeshPhongMaterial({ map: textures.monsterSkin, shininess: 28, specular: 0x331111 });
  const bone = new THREE.MeshPhongMaterial({ map: textures.monsterBone, shininess: 18 });
  const darkFlesh = new THREE.MeshPhongMaterial({ color: 0x3a0707, shininess: 45, specular: 0x661111 });
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff1100 });
  const heartMat = new THREE.MeshBasicMaterial({ color: 0xff0022 });

  // ----- таз, позвоночник, торс -----
  const pelvis = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.28, 0.45, 8), bone);
  pelvis.position.set(0, 2.0, -0.05);
  monster.add(pelvis);

  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    const vy = 2.15 + t * 2.1;
    const vz = -0.1 - Math.sin(t * Math.PI) * 0.25 + t * 0.25;

    const vertebra = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.24, 7), skin);
    vertebra.position.set(0, vy, vz);
    vertebra.rotation.x = 0.22;
    monster.add(vertebra);

    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.35 + Math.sin(t * Math.PI) * 0.45, 5), bone);
    spike.position.set(0, vy + 0.05, vz - 0.22);
    spike.rotation.x = -Math.PI / 2.3;
    monster.add(spike);
  }

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.22, 1.9, 8), skin);
  torso.position.set(0, 3.1, 0.02);
  torso.rotation.x = 0.18;
  monster.add(torso);

  parts.heart = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22, 1), heartMat);
  parts.heart.position.set(0, 3.25, 0.16);
  monster.add(parts.heart);

  const chestGlow = new THREE.PointLight(0xff0011, 1.8, 7.5);
  chestGlow.position.set(0, 3.25, 0.35);
  monster.add(chestGlow);

  for (let i = 0; i < 5; i++) {
    const scale = 1.0 - i * 0.08;
    [-1, 1].forEach((side) => {
      const rib = new THREE.Mesh(new THREE.TorusGeometry(0.38 * scale, 0.042, 6, 10, Math.PI * 0.85), bone);
      rib.position.set(side * 0.06, 3.85 - i * 0.28, 0.02);
      rib.rotation.x = Math.PI / 2 + 0.2;
      rib.rotation.z = side > 0 ? -0.25 : Math.PI + 0.25;
      monster.add(rib);
    });
  }

  [-1, 1].forEach((side) => {
    const shoulder = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32, 0), skin);
    shoulder.position.set(side * 0.65, 4.05, 0.08);
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.55, 5), bone);
    spike.position.set(side * 0.72, 4.38, 0.02);
    spike.rotation.z = -side * 0.45;
    monster.add(shoulder, spike);
  });

  // ----- голова -----
  const head = new THREE.Group();
  head.position.set(0, 4.35, 0.28);

  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.38, 10, 10), bone);
  cranium.scale.set(0.88, 1.15, 1.25);
  const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, 0.65, 7), bone);
  snout.rotation.x = Math.PI / 2 + 0.15;
  snout.position.set(0, -0.04, 0.48);
  head.add(cranium, snout);

  const socketMat = new THREE.MeshBasicMaterial({ color: 0x050000 });
  [-1, 1].forEach((side) => {
    const socket = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), socketMat);
    socket.position.set(side * 0.17, 0.08, 0.36);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.048, 8, 8), eyeMat);
    eye.position.set(side * 0.17, 0.08, 0.43);
    const upperEye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), eyeMat);
    upperEye.position.set(side * 0.22, 0.22, 0.34);
    head.add(socket, eye, upperEye);
  });

  const fangGeo = new THREE.ConeGeometry(0.025, 0.14, 4);
  for (let i = -3; i <= 3; i++) {
    const fang = new THREE.Mesh(fangGeo, bone);
    fang.rotation.x = Math.PI;
    fang.position.set(i * 0.045, -0.18, 0.55 - Math.abs(i) * 0.04);
    head.add(fang);
  }

  const jaw = new THREE.Group();
  jaw.position.set(0, -0.18, 0.12);
  const jawBone = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.68), skin);
  jawBone.position.set(0, -0.08, 0.28);
  jaw.add(jawBone);
  const lowerFangGeo = new THREE.ConeGeometry(0.024, 0.13, 4);
  for (let i = -3; i <= 3; i++) {
    const fang = new THREE.Mesh(lowerFangGeo, bone);
    fang.position.set(i * 0.042, 0.02, 0.44 - Math.abs(i) * 0.04);
    jaw.add(fang);
  }
  parts.jaw = jaw;
  head.add(jaw);

  [-1, 1].forEach((side) => {
    const antler = new THREE.Group();
    antler.position.set(side * 0.22, 0.32, -0.05);

    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.07, 1.15, 6), darkFlesh);
    beam.position.set(side * 0.25, 0.48, -0.15);
    beam.rotation.set(-0.3, 0, -side * 0.48);

    const tine1 = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.65, 5), bone);
    tine1.position.set(side * 0.35, 0.55, 0.12);
    tine1.rotation.set(0.55, 0, -side * 0.3);

    const tine2 = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.75, 5), bone);
    tine2.position.set(side * 0.52, 0.88, -0.1);
    tine2.rotation.z = -side * 0.65;

    const tine3 = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.55, 5), bone);
    tine3.position.set(side * 0.22, 0.95, -0.28);
    tine3.rotation.x = -0.4;

    antler.add(beam, tine1, tine2, tine3);
    head.add(antler);
  });

  parts.head = head;
  monster.add(head);

  // ----- конечности -----
  function createArm() {
    const root = new THREE.Group();
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.09, 1.55, 7), skin);
    upper.position.y = -0.75;
    const elbowSpike = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.35, 5), bone);
    elbowSpike.position.set(0, -1.5, -0.14);
    elbowSpike.rotation.x = -Math.PI / 1.4;
    root.add(upper, elbowSpike);

    const lower = new THREE.Group();
    lower.position.y = -1.5;
    lower.rotation.x = -0.35;
    const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 1.65, 7), skin);
    forearm.position.y = -0.82;
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.22, 0.12), darkFlesh);
    hand.position.y = -1.68;
    lower.add(forearm, hand);
    for (let c = -1.5; c <= 1.5; c += 1.0) {
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.68, 5), bone);
      claw.position.set(c * 0.045, -2.08, 0.08);
      claw.rotation.x = Math.PI - 0.22;
      lower.add(claw);
    }
    root.add(lower);
    return { root, joint: lower };
  }

  function createLeg() {
    const root = new THREE.Group();
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.11, 1.15, 7), skin);
    thigh.position.set(0, -0.55, 0.12);
    thigh.rotation.x = -0.25;
    root.add(thigh);

    const lower = new THREE.Group();
    lower.position.set(0, -1.05, 0.25);
    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.07, 1.15, 7), bone);
    shin.position.set(0, -0.5, -0.12);
    shin.rotation.x = 0.22;
    lower.add(shin);
    for (let t = -1; t <= 1; t++) {
      const talon = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.35, 4), bone);
      talon.rotation.x = Math.PI / 2;
      talon.position.set(t * 0.07, -1.0, 0.08);
      lower.add(talon);
    }
    root.add(lower);
    return { root, joint: lower };
  }

  parts.lArm = createArm(); parts.lArm.root.position.set(-0.72, 4.0, 0.08);
  parts.rArm = createArm(); parts.rArm.root.position.set(0.72, 4.0, 0.08);
  parts.lLeg = createLeg(); parts.lLeg.root.position.set(-0.32, 2.05, -0.05);
  parts.rLeg = createLeg(); parts.rLeg.root.position.set(0.32, 2.05, -0.05);
  monster.add(parts.lArm.root, parts.rArm.root, parts.lLeg.root, parts.rLeg.root);

  monster.visible = false;
  monster.position.set(0, -100, 0);
  ctx.scene.add(monster);

  monsterRig.group = monster;
  monsterRig.parts = parts;
}
