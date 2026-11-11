import { Color3, Mesh, MeshBuilder, StandardMaterial, Vector3 } from '@babylonjs/core';
import type { Scene } from '@babylonjs/core/scene';
import type { UniversalCamera } from '@babylonjs/core/Cameras/universalCamera';

/** Camera-attached 1.6 second scare sequence. */
export class Jumpscare {
  readonly root: Mesh;
  active = false;
  private elapsed = 0;
  private readonly jaw: Mesh;
  constructor(scene: Scene, camera: UniversalCamera) {
    const skin = new StandardMaterial('scare-skin', scene); skin.diffuseColor = new Color3(.16, .12, .1);
    const bone = new StandardMaterial('scare-bone', scene); bone.diffuseColor = new Color3(.55, .48, .36);
    const eyes = new StandardMaterial('scare-eyes', scene); eyes.emissiveColor = new Color3(1, .01, .005);
    const root = MeshBuilder.CreateSphere('jumpscare-root', { diameter: .72, segments: 10 }, scene);
    root.parent = camera; root.position.set(0, -.04, 1); root.material = bone; root.isPickable = false; root.setEnabled(false); this.root = root;
    for (const x of [-.2, .2]) {
      const eye = MeshBuilder.CreateSphere('scare-eye', { diameter: .11 }, scene); eye.parent = root; eye.position.set(x, .1, .3); eye.material = eyes; eye.isPickable = false;
      const horn = MeshBuilder.CreateCylinder('scare-horn', { height: .7, diameterTop: 0, diameterBottom: .09 }, scene); horn.parent = root; horn.position.set(x * 1.3, .53, 0); horn.rotation.z = x > 0 ? -.35 : .35; horn.material = skin; horn.isPickable = false;
    }
    this.jaw = MeshBuilder.CreateBox('scare-jaw', { width: .42, height: .18, depth: .45 }, scene);
    this.jaw.parent = root; this.jaw.position.set(0, -.25, .2); this.jaw.material = skin; this.jaw.isPickable = false;
    const teeth = new StandardMaterial('scare-teeth', scene); teeth.diffuseColor = Color3.White();
    for (let i = -3; i <= 3; i++) { const tooth = MeshBuilder.CreateCylinder('scare-tooth', { height: .12, diameterTop: 0, diameterBottom: .045, tessellation: 4 }, scene); tooth.parent = root; tooth.position.set(i * .05, -.13, .38); tooth.material = teeth; tooth.isPickable = false; }
  }
  start(): void { if (this.active) return; this.active = true; this.elapsed = 0; this.root.setEnabled(true); }
  update(dt: number): boolean {
    if (!this.active) return false;
    this.elapsed += dt; const t = this.elapsed;
    this.root.position.x = (Math.random() - .5) * .08;
    this.root.position.y = -.04 + (Math.random() - .5) * .08;
    this.root.position.z = .82 + Math.sin(t * 35) * .08;
    this.jaw.rotation.x = .35 + Math.abs(Math.sin(t * 28)) * .45;
    if (t >= 1.6) { this.active = false; this.root.setEnabled(false); return true; }
    return false;
  }
  dispose(): void { this.root.dispose(false, true); }
}
