import {
  Color3,
  HemisphericLight,
  MeshBuilder,
  Matrix,
  Quaternion,
  Scene,
  StandardMaterial,
  DirectionalLight,
  Vector3,
} from '@babylonjs/core';
import { createNoise2D } from 'simplex-noise';

function material(scene: Scene, name: string, color: Color3): StandardMaterial {
  const result = new StandardMaterial(name, scene);
  result.diffuseColor = color;
  result.specularColor = Color3.Black();
  return result;
}

export function createWorld(scene: Scene): void {
  const groundMaterial = material(scene, 'ground-material', new Color3(0.075, 0.09, 0.065));
  const ground = MeshBuilder.CreateGround('ground', { width: 180, height: 180, subdivisions: 2 }, scene);
  ground.material = groundMaterial;
  ground.checkCollisions = true;

  const noise = createNoise2D();
  const positions: number[] = [];
  for (let i = 0; i < 460; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 12 + Math.random() * 76;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (Math.abs(x) < 8 && Math.abs(z) < 8) continue;
    const variation = noise(x * 0.035, z * 0.035);
    positions.push(x, 0, z, 0.75 + Math.random() * 0.65 + variation * 0.06);
  }

  const trunkMaterial = material(scene, 'tree-trunk-material', new Color3(0.12, 0.075, 0.045));
  const leafMaterial = material(scene, 'tree-leaf-material', new Color3(0.025, 0.075, 0.045));
  const trunk = MeshBuilder.CreateCylinder('tree-trunk-source', {
    height: 5.2, diameterTop: 0.32, diameterBottom: 0.58, tessellation: 6,
  }, scene);
  trunk.material = trunkMaterial;
  trunk.isVisible = false;

  const leaves = MeshBuilder.CreateCylinder('tree-crown-source', {
    height: 7.5, diameterTop: 0, diameterBottom: 4.2, tessellation: 6,
  }, scene);
  leaves.material = leafMaterial;
  leaves.isVisible = false;

  const trunkMatrices: Matrix[] = [];
  const leafMatrices: Matrix[] = [];
  for (let i = 0; i < positions.length; i += 4) {
    const [x, , z, scale] = positions.slice(i, i + 4);
    const rotation = Math.random() * Math.PI * 2;
    trunkMatrices.push(Matrix.Compose(
      new Vector3(scale, scale, scale),
      Quaternion.RotationAxis(Vector3.Up(), rotation),
      new Vector3(x, 2.6 * scale, z),
    ));
    leafMatrices.push(Matrix.Compose(
      new Vector3(scale, scale, scale),
      Quaternion.RotationAxis(Vector3.Up(), rotation),
      new Vector3(x, 7.3 * scale, z),
    ));
  }

  trunk.thinInstanceAdd(trunkMatrices);
  leaves.thinInstanceAdd(leafMatrices);
  trunk.isVisible = true;
  leaves.isVisible = true;
  trunk.checkCollisions = false;
  leaves.checkCollisions = false;
  trunk.alwaysSelectAsActiveMesh = true;
  leaves.alwaysSelectAsActiveMesh = true;
  trunk.thinInstanceRefreshBoundingInfo();
  leaves.thinInstanceRefreshBoundingInfo();

  const ambient = new HemisphericLight('ambient-light', new Vector3(0, 1, 0), scene);
  ambient.intensity = 0.32;
  ambient.diffuse = new Color3(0.38, 0.48, 0.58);

  const moon = new DirectionalLight('moon-light', new Vector3(-0.4, -1, 0.25), scene);
  moon.intensity = 0.55;
  moon.diffuse = new Color3(0.45, 0.55, 0.72);

  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.012;
  scene.fogColor = new Color3(0.025, 0.035, 0.045);

  const noteMaterial = material(scene, 'note-material', new Color3(0.72, 0.62, 0.38));
  const note = MeshBuilder.CreateBox('test-note', { width: 0.38, height: 0.04, depth: 0.28 }, scene);
  note.position.set(0, 0.65, 5);
  note.material = noteMaterial;
}
