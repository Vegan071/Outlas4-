import { UniversalCamera } from '@babylonjs/core/Cameras/universalCamera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Scene } from '@babylonjs/core/scene';

export function createPlayer(scene: Scene, canvas: HTMLCanvasElement): UniversalCamera {
  const camera = new UniversalCamera('player-camera', new Vector3(0, 2.0, -4), scene);
  camera.attachControl(canvas, true);
  camera.minZ = 0.08;
  camera.fov = 0.9;
  camera.speed = 0.22;
  camera.angularSensibility = 2600;
  camera.inertia = 0.72;
  camera.applyGravity = false;
  camera.checkCollisions = true;
  camera.ellipsoid = new Vector3(0.42, 1.0, 0.42);
  camera.ellipsoidOffset = new Vector3(0, -1.0, 0);
  camera.keysUp.push(87);
  camera.keysDown.push(83);
  camera.keysLeft.push(65);
  camera.keysRight.push(68);
  scene.gravity = new Vector3(0, -26, 0);
  return camera;
}
