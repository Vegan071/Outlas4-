import * as THREE from 'three';
import { ctx, game, world } from '../state.js';
import { textures } from '../core/textures.js';
import { getTerrainHeight } from './terrain.js';

const FOREST_NOTES = 8;

function createNoteMesh(isForest) {
  const group = new THREE.Group();
  group.add(new THREE.Mesh(
    new THREE.PlaneGeometry(0.45, 0.65),
    new THREE.MeshBasicMaterial({ map: textures.notePaper, side: THREE.DoubleSide }),
  ));

  if (isForest) {
    // Ореол и световое пятно на земле, чтобы записки в лесу было видно издалека
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: textures.glow, color: 0xffffee, transparent: true, opacity: 0.65,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    halo.scale.set(6.5, 6.5, 1);
    halo.position.set(0, 0, 0.25);
    group.add(halo);

    const poolGeo = new THREE.PlaneGeometry(14, 14);
    poolGeo.rotateX(-Math.PI / 2);
    const pool = new THREE.Mesh(poolGeo, new THREE.MeshBasicMaterial({
      map: textures.glow, transparent: true, opacity: 0.45,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    pool.position.set(0, -1.42, 0);
    group.add(pool);
  }

  group.isForest = isForest;
  group.collected = false;
  return group;
}

function addNote(note) {
  ctx.scene.add(note);
  world.notes.push(note);
}

/** Размещает записки: одну на доме, одну у машины, остальные в лесу у деревьев */
export function spawnNotes() {
  const rnd = (n) => Math.floor(Math.random() * n);

  if (world.houses.length) {
    const h = world.houses[rnd(world.houses.length)];
    const note = createNoteMesh(false);
    const side = rnd(4);
    const along = (len) => Math.random() * len * 0.7 - len * 0.35;
    if (side === 0) { note.position.set(h.x + along(h.w), 1.5, h.z + h.d / 2 + 0.12); note.rotation.y = 0; }
    else if (side === 1) { note.position.set(h.x + along(h.w), 1.5, h.z - h.d / 2 - 0.12); note.rotation.y = Math.PI; }
    else if (side === 2) { note.position.set(h.x - h.w / 2 - 0.12, 1.5, h.z + along(h.d)); note.rotation.y = -Math.PI / 2; }
    else { note.position.set(h.x + h.w / 2 + 0.12, 1.5, h.z + along(h.d)); note.rotation.y = Math.PI / 2; }
    addNote(note);
  }

  if (world.cars.length) {
    const car = world.cars[rnd(world.cars.length)];
    const note = createNoteMesh(false);
    note.position.set(
      car.x + Math.cos(car.rot + Math.PI / 2) * 1.12,
      1.2,
      car.z + Math.sin(car.rot + Math.PI / 2) * 1.12,
    );
    note.rotation.y = car.rot + Math.PI / 2;
    addNote(note);
  }

  const candidates = world.forestTrees.filter(
    (t) => (Math.abs(t.x) > 55 || Math.abs(t.z) > 55) && Math.abs(t.x) < 320 && Math.abs(t.z) < 320,
  );
  for (let i = 0; i < FOREST_NOTES && candidates.length; i++) {
    const tree = candidates.splice(rnd(candidates.length), 1)[0];
    const angle = Math.random() * Math.PI * 2;
    const nx = tree.x + Math.cos(angle) * 2.15;
    const nz = tree.z + Math.sin(angle) * 2.15;
    const note = createNoteMesh(true);
    note.position.set(nx, getTerrainHeight(nx, nz) + 1.55, nz);
    note.rotation.y = -angle + Math.PI / 2;
    addNote(note);
  }

  game.totalNotes = world.notes.length;
}

/** Убирает записку со сцены */
export function collectNote(note) {
  note.collected = true;
  note.visible = false;
  note.position.y = -1000;
}
