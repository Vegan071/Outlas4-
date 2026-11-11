import {
  Color3, DynamicTexture, Mesh, MeshBuilder, StandardMaterial, TransformNode, Vector3,
} from '@babylonjs/core';
import type { Scene } from '@babylonjs/core/scene';
import type { UniversalCamera } from '@babylonjs/core/Cameras/universalCamera';
import type { GameState } from './GameState';
import type { NotesManager } from './NotesManager';
import type { Monster } from '../entities/Monster';
import type { WorldLayout } from '../world/createWorld';

/** Camera-attached first-person hands, tactical flashlight and live canvas EMF display. */
export class FirstPersonEquipment {
  private root: TransformNode;
  private rightHand: TransformNode;
  private leftHand: TransformNode;
  private flashlightLens: Mesh;
  private flashlightBeam: Mesh;
  private crystal: Mesh;
  private screenTexture: DynamicTexture;
  private screenContext: CanvasRenderingContext2D;
  private sweep = 0;
  private idleKey = '';
  private readonly width = 128;
  private readonly height = 160;
  private readonly centerX = 64;
  private readonly centerY = 68;
  private readonly radius = 50;

  constructor(
    scene: Scene,
    camera: UniversalCamera,
    private state: GameState,
    private notes: NotesManager,
    private monster: Monster,
    private world: WorldLayout,
  ) {
    const sleeve = new StandardMaterial('equipment-sleeve', scene);
    sleeve.diffuseColor = new Color3(.07, .09, .11);
    const glove = new StandardMaterial('equipment-glove', scene);
    glove.diffuseColor = new Color3(.025, .025, .025);
    const metal = new StandardMaterial('equipment-metal', scene);
    metal.diffuseColor = new Color3(.16, .18, .2); metal.specularColor = new Color3(.45, .45, .45);
    const glow = new StandardMaterial('equipment-glow', scene);
    glow.emissiveColor = new Color3(.0, .85, .65);

    this.root = new TransformNode('first-person-equipment', scene);
    this.root.parent = camera;

    this.rightHand = new TransformNode('right-hand-rig', scene);
    this.rightHand.parent = this.root;
    this.rightHand.position.set(.28, -.25, .58);
    const rightSleeve = MeshBuilder.CreateCapsule('right-sleeve', { height: .48, radius: .07, tessellation: 7 }, scene);
    rightSleeve.parent = this.rightHand; rightSleeve.rotation.x = Math.PI / 2.2; rightSleeve.position.set(0, -.04, .12); rightSleeve.material = sleeve;
    const rightGlove = MeshBuilder.CreateSphere('right-glove', { diameter: .13, segments: 7 }, scene);
    rightGlove.parent = this.rightHand; rightGlove.position.set(0, -.02, .26); rightGlove.material = glove;
    const flashlightBody = MeshBuilder.CreateCylinder('tactical-flashlight-body', { height: .34, diameter: .075, tessellation: 10 }, scene);
    flashlightBody.parent = this.rightHand; flashlightBody.rotation.x = Math.PI / 2; flashlightBody.position.set(0, .02, .32); flashlightBody.material = metal;
    const flashlightHead = MeshBuilder.CreateCylinder('tactical-flashlight-head', { height: .09, diameterTop: .12, diameterBottom: .075, tessellation: 10 }, scene);
    flashlightHead.parent = this.rightHand; flashlightHead.rotation.x = Math.PI / 2; flashlightHead.position.set(0, .02, .49); flashlightHead.material = metal;
    const lensMat = new StandardMaterial('flashlight-lens-mat', scene);
    lensMat.emissiveColor = Color3.Black(); lensMat.diffuseColor = new Color3(.7, .7, .65);
    this.flashlightLens = MeshBuilder.CreateDisc('flashlight-lens', { radius: .05, tessellation: 12 }, scene);
    this.flashlightLens.parent = this.rightHand; this.flashlightLens.position.set(0, .02, .54); this.flashlightLens.material = lensMat;
    const beamMat = new StandardMaterial('flashlight-beam-mat', scene);
    beamMat.diffuseColor = new Color3(1, .94, .72); beamMat.emissiveColor = new Color3(.4, .34, .2);
    beamMat.alpha = .07; beamMat.backFaceCulling = false; beamMat.disableLighting = true;
    this.flashlightBeam = MeshBuilder.CreateCylinder('flashlight-visible-beam', { height: 1.5, diameterTop: 0, diameterBottom: .72, tessellation: 12 }, scene);
    this.flashlightBeam.parent = this.rightHand; this.flashlightBeam.rotation.x = -Math.PI / 2;
    this.flashlightBeam.position.set(0, .02, 1.25); this.flashlightBeam.material = beamMat;
    this.flashlightBeam.isVisible = false; this.flashlightBeam.isPickable = false;

    this.leftHand = new TransformNode('left-hand-rig', scene);
    this.leftHand.parent = this.root;
    this.leftHand.position.set(-.29, -.24, .6);
    const leftSleeve = MeshBuilder.CreateCapsule('left-sleeve', { height: .48, radius: .07, tessellation: 7 }, scene);
    leftSleeve.parent = this.leftHand; leftSleeve.rotation.x = Math.PI / 2.2; leftSleeve.position.set(0, -.04, .12); leftSleeve.material = sleeve;
    const leftGlove = MeshBuilder.CreateSphere('left-glove', { diameter: .13, segments: 7 }, scene);
    leftGlove.parent = this.leftHand; leftGlove.position.set(0, -.02, .25); leftGlove.material = glove;
    const detector = MeshBuilder.CreateBox('emp-detector-case', { width: .18, height: .25, depth: .055 }, scene);
    detector.parent = this.leftHand; detector.position.set(0, .04, .32); detector.rotation.x = -.25; detector.material = metal;
    const antenna = MeshBuilder.CreateCylinder('emp-antenna', { height: .13, diameter: .012, tessellation: 6 }, scene);
    antenna.parent = this.leftHand; antenna.position.set(-.055, .19, .3); antenna.rotation.x = -.3; antenna.material = metal;
    this.crystal = MeshBuilder.CreatePolyhedron('emp-crystal', { type: 1, size: .035 }, scene);
    this.crystal.parent = this.leftHand; this.crystal.position.set(.055, .17, .3); this.crystal.material = glow;

    this.screenTexture = new DynamicTexture('emp-radar-texture', { width: this.width, height: this.height }, scene, false);
    this.screenContext = this.screenTexture.getContext() as CanvasRenderingContext2D;
    const screenMat = new StandardMaterial('emp-screen-material', scene);
    screenMat.diffuseTexture = this.screenTexture; screenMat.emissiveColor = new Color3(.1, .55, .42);
    screenMat.disableLighting = true;
    const screen = MeshBuilder.CreatePlane('emp-screen', { width: .135, height: .17, sideOrientation: Mesh.DOUBLESIDE }, scene);
    screen.parent = this.leftHand; screen.position.set(0, .04, .352); screen.rotation.x = -.25; screen.material = screenMat;
    this.drawIdle(0);
  }

  setFlashlight(on: boolean): void {
    const mat = this.flashlightLens.material as StandardMaterial;
    mat.emissiveColor = on ? new Color3(.9, .85, .65) : Color3.Black();
    this.flashlightBeam.isVisible = on;
  }

  update(dt: number, now: number, moving: boolean, running: boolean, player: Vector3, forward: Vector3): void {
    const bob = moving ? 1 : .2;
    const speed = running ? 13 : 8;
    const phase = now * .001 * speed;
    this.rightHand.position.y = -.25 + Math.cos(phase) * .014 * bob;
    this.rightHand.position.x = .28 + Math.sin(phase * .5) * .012 * bob;
    this.leftHand.position.y = -.24 + Math.sin(phase) * .012 * bob;
    this.leftHand.position.x = -.29 + Math.cos(phase * .5) * .01 * bob;
    this.crystal.rotation.y += dt * 2.5;
    this.drawRadar(dt, now, player, forward);
  }

  private drawIdle(now: number): void {
    const ctx = this.screenContext;
    const ready = this.state.radarReadyAt <= now;
    const key = ready ? 'ready' : String(Math.ceil((this.state.radarReadyAt - now) / 1000));
    if (key === this.idleKey) return;
    this.idleKey = key;
    ctx.fillStyle = '#010806'; ctx.fillRect(0, 0, this.width, this.height);
    ctx.textAlign = 'center'; ctx.fillStyle = ready ? '#00ffcc' : '#ff8844';
    ctx.font = 'bold 14px Courier New'; ctx.fillText(ready ? 'ГОТОВ' : 'ЗАРЯДКА', this.centerX, this.centerY - 4);
    ctx.font = 'bold 22px Courier New'; ctx.fillText(ready ? '[Q]' : key + 'с', this.centerX, this.centerY + 24);
    ctx.fillStyle = '#1a3a30'; ctx.font = '10px Courier New'; ctx.fillText('ЭМП-РАДАР', this.centerX, 152);
    this.screenTexture.update();
  }

  private project(dx: number, dz: number, forward: Vector3, right: Vector3, range: number): { x: number; y: number } {
    return {
      x: this.centerX + ((dx * right.x + dz * right.z) / range) * this.radius,
      y: this.centerY - ((dx * forward.x + dz * forward.z) / range) * this.radius,
    };
  }

  private dot(ctx: CanvasRenderingContext2D, point: { x: number; y: number }, color: string, radius: number): void {
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(point.x, point.y, radius, 0, Math.PI * 2); ctx.fill();
  }

  private drawRadar(dt: number, now: number, player: Vector3, cameraForward: Vector3): void {
    const ctx = this.screenContext;
    const active = this.state.radarUntil > now;
    if (!active) { this.drawIdle(now); return; }
    this.idleKey = '';
    ctx.fillStyle = '#031610'; ctx.fillRect(0, 0, this.width, this.height);
    const remaining = Math.max(0, (this.state.radarUntil - now) / 5000);
    ctx.fillStyle = remaining < .2 && Math.floor(now / 120) % 2 === 0 ? '#ff4422' : '#00ffcc';
    ctx.fillRect(14, 4, (this.width - 28) * remaining, 5);
    ctx.strokeStyle = 'rgba(0,255,170,.35)'; ctx.lineWidth = 1;
    [18, 34, 50].forEach(r => { ctx.beginPath(); ctx.arc(this.centerX, this.centerY, r, 0, Math.PI * 2); ctx.stroke(); });
    ctx.beginPath(); ctx.moveTo(this.centerX - this.radius, this.centerY); ctx.lineTo(this.centerX + this.radius, this.centerY);
    ctx.moveTo(this.centerX, this.centerY - this.radius); ctx.lineTo(this.centerX, this.centerY + this.radius); ctx.stroke();
    const forward = cameraForward.clone(); forward.y = 0; forward.normalize();
    const right = new Vector3(forward.z, 0, -forward.x);
    this.sweep = (this.sweep + dt * 3.8) % (Math.PI * 2);
    ctx.strokeStyle = '#00ffcc'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(this.centerX, this.centerY);
    ctx.lineTo(this.centerX + Math.cos(this.sweep) * this.radius, this.centerY + Math.sin(this.sweep) * this.radius); ctx.stroke();
    let nearest = Infinity;
    for (const note of this.notes.notes) {
      if (note.collected) continue;
      const dx = note.mesh.position.x - player.x, dz = note.mesh.position.z - player.z;
      const distance = Math.hypot(dx, dz); nearest = Math.min(nearest, distance);
      if (distance < 160) this.dot(ctx, this.project(dx, dz, forward, right, 160), '#55ff88', 3);
    }
    if (!this.state.substationPowered) {
      const dx = -92 - player.x, dz = -65 - player.z;
      if (Math.hypot(dx, dz) < 180) {
        const p = this.project(dx, dz, forward, right, 180);
        ctx.fillStyle = '#ffcc00'; ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
      }
    }
    if (this.state.notesFound >= 10) {
      const car = this.world.policeCarPosition();
      const dx = car.x - player.x, dz = car.z - player.z, distance = Math.hypot(dx, dz) || 1;
      nearest = distance;
      if (distance < 160) this.dot(ctx, this.project(dx, dz, forward, right, 160), '#3399ff', 4.5);
    }
    if (this.monster.mesh.isEnabled()) {
      const dx = this.monster.mesh.position.x - player.x, dz = this.monster.mesh.position.z - player.z;
      if (Math.hypot(dx, dz) < 95) this.dot(ctx, this.project(dx, dz, forward, right, 95), '#ff2222', 4);
    }
    ctx.textAlign = 'center'; ctx.fillStyle = '#00ffcc'; ctx.font = 'bold 12px Courier New';
    ctx.fillText('ЦЕЛЬ: ' + (nearest < Infinity ? Math.round(nearest) + 'm' : '--'), this.centerX, 136);
    ctx.fillStyle = this.state.substationPowered ? '#66ff88' : '#ffaa44'; ctx.font = '10px Courier New';
    ctx.fillText(this.state.substationPowered ? 'СЕТЬ: 220В ВКЛ' : 'СЕТЬ: ОТКЛ', this.centerX, 152);
    this.screenTexture.update();
  }

  dispose(): void { this.root.dispose(false, true); this.screenTexture.dispose(); }
}
