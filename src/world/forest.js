import * as THREE from 'three';
import { POI } from '../config.js';
import { ctx, world } from '../state.js';
import { textures } from '../core/textures.js';
import { getTerrainHeight } from './terrain.js';

const TREE_COUNT = 800;
const MAX_ATTEMPTS = 1200;

const nearPOI = (x, z, r) =>
  Object.values(POI).some((p) => Math.hypot(x - p.x, z - p.z) < r);

/** Сосновый лес на InstancedMesh (3 draw call'а на все деревья) */
export function buildForest() {
  const barkMat = new THREE.MeshPhongMaterial({ map: textures.bark, shininess: 3 });
  const leafMat = new THREE.MeshPhongMaterial({ color: 0x071807, shininess: 2 });

  const trunkGeo = new THREE.CylinderGeometry(1.8, 2.1, 1.0, 7);
  trunkGeo.translate(0, 0.5, 0);
  const leafGeo = new THREE.ConeGeometry(10.5, 1.0, 6);
  leafGeo.translate(0, 0.5, 0);

  const trunks = new THREE.InstancedMesh(trunkGeo, barkMat, TREE_COUNT);
  const leaves1 = new THREE.InstancedMesh(leafGeo, leafMat, TREE_COUNT);
  const leaves2 = new THREE.InstancedMesh(leafGeo, leafMat, TREE_COUNT);
  // Bounding sphere у InstancedMesh считается по одной геометрии в начале координат,
  // поэтому без этого флага весь лес исчезает, стоит отвернуться от (0,0,0).
  trunks.frustumCulled = leaves1.frustumCulled = leaves2.frustumCulled = false;

  const dummy = new THREE.Object3D();
  let count = 0;

  for (let i = 0; i < MAX_ATTEMPTS && count < TREE_COUNT; i++) {
    const x = (Math.random() - 0.5) * 750;
    const z = (Math.random() - 0.5) * 750;
    if (Math.abs(x) < 52 && Math.abs(z) < 225) continue; // город и дорога
    if (nearPOI(x, z, 18)) continue;

    const y = getTerrainHeight(x, z);
    const h = 38 + Math.random() * 20;

    dummy.position.set(x, y - 0.4, z);
    dummy.scale.set(1, h, 1);
    dummy.rotation.set(0, Math.random() * Math.PI, 0);
    dummy.updateMatrix();
    trunks.setMatrixAt(count, dummy.matrix);

    dummy.position.set(x, y + h * 0.28, z);
    dummy.scale.set(1.05, h * 0.45, 1.05);
    dummy.updateMatrix();
    leaves1.setMatrixAt(count, dummy.matrix);

    dummy.position.set(x, y + h * 0.58, z);
    dummy.scale.set(0.75, h * 0.48, 0.75);
    dummy.updateMatrix();
    leaves2.setMatrixAt(count, dummy.matrix);

    world.circleColliders.push({ x, z, r: 2.05 });
    world.forestTrees.push({ x, z, y, r: 2.0 });
    count++;
  }

  trunks.count = leaves1.count = leaves2.count = count;
  ctx.scene.add(trunks, leaves1, leaves2);
}
