import { Color3, Mesh, MeshBuilder, PointLight, StandardMaterial, TransformNode } from '@babylonjs/core';
import type { Scene } from '@babylonjs/core/scene';
import type { UniversalCamera } from '@babylonjs/core/Cameras/universalCamera';

/** 1.6-second camera-attached Wendigo attack with jaw, claws, teeth and red flash light. */
export class Jumpscare {
  readonly root: TransformNode;
  active = false;
  private elapsed = 0;
  private readonly jaw: Mesh;
  private readonly leftClaw: TransformNode;
  private readonly rightClaw: TransformNode;

  constructor(scene: Scene, camera: UniversalCamera) {
    const skin = new StandardMaterial('scare-skin', scene);
    skin.diffuseColor = new Color3(.16, .12, .1);
    const bone = new StandardMaterial('scare-bone', scene);
    bone.diffuseColor = new Color3(.62, .54, .4);
    const eyes = new StandardMaterial('scare-eyes', scene);
    eyes.emissiveColor = new Color3(1, .01, .005);
    const dark = new StandardMaterial('scare-socket', scene);
    dark.diffuseColor = new Color3(.005, 0, 0);

    this.root = new TransformNode('jumpscare-root', scene);
    this.root.parent = camera;
    this.root.position.set(0, -.04, .95);
    this.root.setEnabled(false);

    const skull = MeshBuilder.CreateSphere('scare-skull', { diameter: .72, segments: 12 }, scene);
    skull.parent = this.root; skull.scaling.set(.9, 1.25, 1.2); skull.material = bone; skull.isPickable = false;
    const snout = MeshBuilder.CreateCylinder('scare-snout', { height: .55, diameterTop: .3, diameterBottom: .48, tessellation: 8 }, scene);
    snout.parent = this.root; snout.position.set(0, -.03, .36); snout.rotation.x = Math.PI / 2; snout.material = bone; snout.isPickable = false;

    for (const side of [-1, 1]) {
      const socket = MeshBuilder.CreateSphere('scare-eye-socket-' + side, { diameter: .22, segments: 8 }, scene);
      socket.parent = this.root; socket.position.set(side * .16, .1, .31); socket.material = dark; socket.isPickable = false;
      const eye = MeshBuilder.CreateSphere('scare-eye-' + side, { diameter: .105, segments: 8 }, scene);
      eye.parent = this.root; eye.position.set(side * .15, .1, .39); eye.material = eyes; eye.isPickable = false;
      const upperEye = MeshBuilder.CreateSphere('scare-upper-eye-' + side, { diameter: .064, segments: 6 }, scene);
      upperEye.parent = this.root; upperEye.position.set(side * .21, .23, .34); upperEye.material = eyes; upperEye.isPickable = false;
      const horn = MeshBuilder.CreateCylinder('scare-horn-' + side, { height: .75, diameterTop: 0, diameterBottom: .1, tessellation: 6 }, scene);
      horn.parent = this.root; horn.position.set(side * .28, .52, -.05); horn.rotation.z = -side * .45; horn.material = skin; horn.isPickable = false;
    }

    this.jaw = MeshBuilder.CreateBox('scare-jaw', { width: .34, height: .15, depth: .5 }, scene);
    this.jaw.parent = this.root; this.jaw.position.set(0, -.24, .23); this.jaw.material = skin; this.jaw.isPickable = false;
    for (let i = -4; i <= 4; i++) {
      const upper = MeshBuilder.CreateCylinder('scare-upper-tooth-' + i, { height: .12, diameterTop: 0, diameterBottom: .045, tessellation: 4 }, scene);
      upper.parent = this.root; upper.position.set(i * .04, -.11, .43 - Math.abs(i) * .018); upper.rotation.x = Math.PI; upper.material = bone; upper.isPickable = false;
      const lower = MeshBuilder.CreateCylinder('scare-lower-tooth-' + i, { height: .12, diameterTop: 0, diameterBottom: .045, tessellation: 4 }, scene);
      lower.parent = this.jaw; lower.position.set(i * .04, .09, .18 - Math.abs(i) * .018); lower.material = bone; lower.isPickable = false;
    }

    this.leftClaw = new TransformNode('scare-left-claw', scene);
    this.rightClaw = new TransformNode('scare-right-claw', scene);
    this.leftClaw.parent = this.root; this.rightClaw.parent = this.root;
    this.leftClaw.position.set(-.42, -.15, .24); this.rightClaw.position.set(.42, -.15, .24);
    for (let i = -1; i <= 1; i++) {
      const left = MeshBuilder.CreateCylinder('scare-left-talon-' + i, { height: .55, diameterTop: 0, diameterBottom: .07, tessellation: 5 }, scene);
      left.parent = this.leftClaw; left.position.set(i * .06, 0, 0); left.rotation.set(.8, 0, -.6); left.material = bone; left.isPickable = false;
      const right = MeshBuilder.CreateCylinder('scare-right-talon-' + i, { height: .55, diameterTop: 0, diameterBottom: .07, tessellation: 5 }, scene);
      right.parent = this.rightClaw; right.position.set(i * .06, 0, 0); right.rotation.set(.8, 0, .6); right.material = bone; right.isPickable = false;
    }
    const light = new PointLight('scare-red-light', TransformNode ? this.root.position.clone() : this.root.position, scene);
    light.parent = this.root; light.position.set(0, .1, .8); light.diffuse = new Color3(1, .02, .005); light.intensity = 4.5; light.range = 4.5;
  }

  start(): void {
    if (this.active) return;
    this.active = true; this.elapsed = 0; this.root.setEnabled(true);
  }

  update(dt: number): boolean {
    if (!this.active) return false;
    this.elapsed += dt;
    const t = this.elapsed;
    this.root.position.x = (Math.random() - .5) * .09;
    this.root.position.y = -.04 + (Math.random() - .5) * .09;
    this.root.position.z = .78 + Math.sin(t * 35) * .08;
    this.jaw.rotation.x = .35 + Math.abs(Math.sin(t * 28)) * .45;
    this.leftClaw.position.x = -.35 + Math.sin(t * 25) * .08;
    this.rightClaw.position.x = .35 - Math.sin(t * 25) * .08;
    if (t > 1.6) { this.active = false; this.root.setEnabled(false); return true; }
    return false;
  }

  dispose(): void { this.root.dispose(false, true); }
}
