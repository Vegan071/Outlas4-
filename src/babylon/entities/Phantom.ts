import { Color3, Mesh, MeshBuilder, StandardMaterial, Vector3 } from '@babylonjs/core';
import type { Scene } from '@babylonjs/core/scene';
import type { UniversalCamera } from '@babylonjs/core/Cameras/universalCamera';

/** Night-time hallucination that appears in the player's forward field of view. */
export class Phantom {
  readonly root: Mesh;
  private cooldown = 18;
  private visibleFor = 0;
  constructor(scene: Scene, private camera: UniversalCamera) {
    const mat = new StandardMaterial('phantom-mat', scene);
    mat.diffuseColor = new Color3(.005, .005, .008); mat.emissiveColor = new Color3(.006, .006, .009);
    const root = MeshBuilder.CreateCapsule('phantom', { height: 2.6, radius: .32, tessellation: 7 }, scene);
    root.material = mat; root.isPickable = false; root.setEnabled(false); this.root = root;
    const head = MeshBuilder.CreateSphere('phantom-head', { diameter: .58, segments: 7 }, scene);
    head.parent = root; head.position.y = 1.18; head.material = mat; head.isPickable = false;
    const eyes = new StandardMaterial('phantom-eyes', scene); eyes.emissiveColor = Color3.White();
    for (const x of [-.1, .1]) { const eye = MeshBuilder.CreateSphere('phantom-eye', { diameter: .045 }, scene); eye.parent = root; eye.position.set(x, 1.2, .27); eye.material = eyes; eye.isPickable = false; }
  }
  update(dt: number, isNight: boolean, player: Vector3): boolean {
    if (!isNight) { this.root.setEnabled(false); return false; }
    if (!this.root.isEnabled()) {
      this.cooldown -= dt;
      if (this.cooldown > 0 || (Math.abs(player.x) <= 40 && Math.abs(player.z) <= 40)) return false;
      const forward = this.camera.getForwardRay().direction.clone(); forward.y = 0; forward.normalize();
      forward.rotateByQuaternionToRef(this.camera.rotationQuaternion ?? this.camera.getDirection(Vector3.Forward()).toQuaternion(), forward);
      const angle = (Math.random() - .5) * 1.1;
      const c = Math.cos(angle), s = Math.sin(angle);
      const x = forward.x * c - forward.z * s, z = forward.x * s + forward.z * c;
      this.root.position.set(player.x + x * 16, 1.3, player.z + z * 16);
      this.root.lookAt(player);
      this.root.setEnabled(true); this.visibleFor = 2.8; this.cooldown = 22 + Math.random() * 18;
      return true;
    }
    this.visibleFor -= dt; this.root.lookAt(player);
    if (this.visibleFor <= 0 || Vector3.Distance(player, this.root.position) < 7.5) this.root.setEnabled(false);
    return false;
  }
  dispose(): void { this.root.dispose(false, true); }
}
