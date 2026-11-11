// Город: дорога, тротуары, дома, машины, фонари и границы карты.

import * as THREE from 'three';
import { ctx, world } from '../state.js';
import { textures } from '../core/textures.js';

const CAR_COLORS = [0xdddddd, 0x772222, 0x223366, 0x2e4433, 0x444444, 0x886622];

export function buildCity() {
  buildRoad();
  buildBuildings();
  buildCars();
  buildStreetLights();
  buildBoundaries();
}

function buildRoad() {
  const { scene } = ctx;
  textures.asphalt.repeat.set(10, 60);

  const roadGeo = new THREE.PlaneGeometry(16, 500, 4, 60);
  roadGeo.rotateX(-Math.PI / 2);
  const road = new THREE.Mesh(roadGeo, new THREE.MeshPhongMaterial({ map: textures.asphalt, shininess: 8 }));
  road.position.set(0, 0.05, 0);
  scene.add(road);

  const sideGeo = new THREE.BoxGeometry(5, 0.22, 500, 1, 1, 40);
  const sideMat = new THREE.MeshPhongMaterial({ color: 0x444444, shininess: 5 });
  [-10.5, 10.5].forEach((x) => {
    const side = new THREE.Mesh(sideGeo, sideMat);
    side.position.set(x, 0.11, 0);
    scene.add(side);
  });
}

function buildBuildings() {
  const { scene } = ctx;
  textures.building.repeat.set(3, 3);
  const mat = new THREE.MeshPhongMaterial({ map: textures.building, shininess: 5 });
  const grafMat = new THREE.MeshBasicMaterial({ map: textures.graffiti, transparent: true });

  function createBuilding(w, h, d, x, z) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, h / 2, z);
    scene.add(mesh);
    mesh.updateMatrixWorld();

    if (Math.random() > 0.45) {
      const graf = new THREE.Mesh(new THREE.PlaneGeometry(4, 2.5), grafMat);
      const faceRoad = x < 0 ? 1 : -1;
      graf.position.set(x + faceRoad * (w / 2 + 0.05), 2.4, z + (Math.random() - 0.5) * 10);
      graf.rotation.y = faceRoad > 0 ? Math.PI / 2 : -Math.PI / 2;
      scene.add(graf);
    }

    world.boxColliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
    world.visionBlockers.push(mesh);
    world.houses.push({ w, h, d, x, z });
  }

  for (let z = -180; z < 180; z += 45) {
    if (Math.abs(z) <= 15) continue;
    createBuilding(22, 26 + Math.random() * 14, 35, -26, z);
    createBuilding(22, 26 + Math.random() * 14, 35, 26, z);
  }
}

function buildCars() {
  const { scene } = ctx;
  const blackMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const glassMat = new THREE.MeshPhongMaterial({ color: 0x182228, shininess: 80 });
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffee });
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xdd1111 });
  const wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.22, 10);
  wheelGeo.rotateZ(Math.PI / 2);

  function createLada(x, z, rot, destroyed) {
    const group = new THREE.Group();
    const color = destroyed ? 0x1a1a1a : CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)];
    const paint = new THREE.MeshPhongMaterial({ color, shininess: 35 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.68, 4.3), paint);
    body.position.y = 0.62;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.55, 2.15), paint);
    cabin.position.set(0, 1.2, -0.15);
    const windows = new THREE.Mesh(new THREE.BoxGeometry(1.54, 0.42, 1.85), glassMat);
    windows.position.set(0, 1.22, -0.15);
    const grille = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.25, 0.08), blackMat);
    grille.position.set(0, 0.65, 2.13);
    group.add(body, cabin, windows, grille);

    [[-0.85, 1.35], [0.85, 1.35], [-0.85, -1.35], [0.85, -1.35]].forEach(([wx, wz]) => {
      if (destroyed && Math.random() > 0.5) return;
      const wheel = new THREE.Mesh(wheelGeo, blackMat);
      wheel.position.set(wx, 0.32, wz);
      group.add(wheel);
    });

    if (!destroyed) {
      [[-0.62, 0.65, 2.14, lightMat, 0.26, 0.2], [0.62, 0.65, 2.14, lightMat, 0.26, 0.2],
       [-0.62, 0.68, -2.14, tailMat, 0.28, 0.16], [0.62, 0.68, -2.14, tailMat, 0.28, 0.16]]
        .forEach(([lx, ly, lz, m, w, h]) => {
          const lamp = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.06), m);
          lamp.position.set(lx, ly, lz);
          group.add(lamp);
        });
    }

    group.position.set(x, destroyed ? -0.08 : 0, z);
    group.rotation.y = rot;
    scene.add(group);

    world.circleColliders.push({ x, z, r: 2.1 });
    world.visionBlockers.push(body);
    world.cars.push({ x, z, rot });
  }

  createLada(4, 15, 0.2, false);
  createLada(-4, -45, -0.8, true);
  createLada(2, -110, Math.PI / 3, false);
  createLada(-14, 25, 0.1, true);
  createLada(5, 78, -0.35, false);
  createLada(-5, -155, 0.5, true);
}

function buildStreetLights() {
  const { scene } = ctx;
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
  const poleGeo = new THREE.CylinderGeometry(0.12, 0.16, 6.5, 6);
  const armGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.2, 6);
  const housingGeo = new THREE.BoxGeometry(0.7, 0.2, 0.4);
  const bulbGeo = new THREE.PlaneGeometry(0.5, 0.25);

  for (let z = -150; z <= 150; z += 50) {
    [-13, 13].forEach((x) => {
      const group = new THREE.Group();
      const armDir = x < 0 ? 1 : -1;

      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(0, 3.25, 0);
      const arm = new THREE.Mesh(armGeo, poleMat);
      arm.position.set(armDir * 1.1, 6.3, 0);
      arm.rotation.z = (armDir * Math.PI) / 2.5;
      const housing = new THREE.Mesh(housingGeo, poleMat);
      housing.position.set(armDir * 2.0, 6.8, 0);
      const bulb = new THREE.Mesh(bulbGeo, new THREE.MeshBasicMaterial({ color: 0x666666 }));
      bulb.rotation.x = Math.PI / 2;
      bulb.position.set(armDir * 2.0, 6.69, 0);
      group.add(pole, arm, housing, bulb);

      group.position.set(x, 0, z);
      scene.add(group);

      world.streetBulbs.push(bulb);
      world.streetLightPositions.push(new THREE.Vector3(x + armDir * 2.0, 6.5, z));
      world.circleColliders.push({ x, z, r: 0.35 });
    });
  }
}

/** Невидимые стены по краю карты */
function buildBoundaries() {
  world.boxColliders.push(
    { minX: -400, maxX: 400, minZ: -395, maxZ: -385 },
    { minX: -400, maxX: 400, minZ: 385, maxZ: 395 },
    { minX: -395, maxX: -385, minZ: -400, maxZ: 400 },
    { minX: 385, maxX: 395, minZ: -400, maxZ: 400 },
  );
}
