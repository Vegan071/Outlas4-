import { Color3, Mesh, MeshBuilder, PointLight, Ray, StandardMaterial, TransformNode, Vector3 } from '@babylonjs/core';
import type { Scene } from '@babylonjs/core/scene';
import type { UniversalCamera } from '@babylonjs/core/Cameras/universalCamera';
import * as YUKA from 'yuka';
import type { WorldLayout } from '../world/createWorld';

export type MonsterMode = 'patrol' | 'investigate_sound' | 'investigate_light' | 'ambush' | 'chase' | 'stunned';

/**
 * Wendigo FSM port: patrol, sound/light investigation, ambush, pursuit and flash stun.
 * Movement uses Babylon ray tests for sight and steering; the state transitions mirror
 * the original Three.js/Yuka implementation while keeping the controller engine-native.
 */
export class Monster {
  readonly mesh: Mesh;
  mode: MonsterMode = 'patrol';
  private target = new Vector3(30, 0, 0);
  private lastKnown = Vector3.Zero();
  private stunTimer = 0;
  private ambushTimer = 0;
  private patrolWait = 0;
  private chaseUntil = 0;
  private lastPerception = 0;
  private readonly parts: { head: Mesh; jaw: Mesh; leftArm: Mesh; rightArm: Mesh; leftLeg: Mesh; rightLeg: Mesh; heart: Mesh };
  private readonly material: StandardMaterial;
  private readonly terrainHeight: (x: number, z: number) => number;
  private manager!: YUKA.EntityManager;
  private vehicle!: YUKA.Vehicle;
  private seek!: YUKA.SeekBehavior;
  private wander!: YUKA.WanderBehavior;

  constructor(
    private readonly scene: Scene,
    private readonly player: UniversalCamera,
    world: WorldLayout,
  ) {
    this.terrainHeight = world.terrainHeight;
    this.material = new StandardMaterial('wendigo-hide', scene);
    this.material.diffuseColor = new Color3(.12, .095, .075);
    this.material.specularColor = new Color3(.08, .06, .05);
    this.material.diffuseTexture = world.textures.monsterSkin;
    this.mesh = MeshBuilder.CreateBox('wendigo-root', { width: .9, height: 2.8, depth: .62 }, scene);
    this.mesh.isVisible = false;
    this.mesh.setEnabled(false);
    this.mesh.isPickable = false;
    this.mesh.position.set(0, 1.4, 0);
    const torso = MeshBuilder.CreateCapsule('wendigo-torso', { height: 2.1, radius: .42, tessellation: 8 }, scene);
    torso.parent = this.mesh; torso.position.y = .1; torso.material = this.material; torso.isPickable = false;
    const head = MeshBuilder.CreateSphere('wendigo-head', { diameter: .72, segments: 8 }, scene);
    head.parent = this.mesh; head.position.set(0, 1.45, .04); head.material = this.material; head.isPickable = false;
    const bone = new StandardMaterial('wendigo-bone', scene);
    bone.diffuseColor = new Color3(.8, .8, .8); bone.specularColor = new Color3(.12, .1, .08);
    bone.diffuseTexture = world.textures.monsterBone;
    const darkFlesh = new StandardMaterial('wendigo-dark-flesh', scene);
    darkFlesh.diffuseColor = new Color3(.45, .35, .3); darkFlesh.specularColor = new Color3(.22, .025, .02);
    darkFlesh.diffuseTexture = world.textures.monsterSkin;
    const eyeBlack = new StandardMaterial('wendigo-eye-socket', scene);
    eyeBlack.diffuseColor = new Color3(.008, .002, .002);
    const makeDetail = (mesh: Mesh, parent: TransformNode, position: Vector3, mat: StandardMaterial): Mesh => {
      mesh.parent = parent; mesh.position.copyFrom(position); mesh.material = mat; mesh.isPickable = false; return mesh;
    };
    // Pelvis, segmented spine and exposed vertebrae.
    makeDetail(MeshBuilder.CreateCylinder('wendigo-pelvis', { height: .48, diameterTop: .7, diameterBottom: .52, tessellation: 8 }, scene), this.mesh, new Vector3(0, -.72, -.04), bone);
    for (let i = 0; i < 9; i++) {
      const t = i / 8, y = -.48 + t * 1.72, z = -.08 - Math.sin(t * Math.PI) * .2 + t * .12;
      makeDetail(MeshBuilder.CreateCylinder('wendigo-vertebra-' + i, { height: .24, diameterTop: .32, diameterBottom: .36, tessellation: 7 }, scene), this.mesh, new Vector3(0, y, z), bone).rotation.x = .22;
      const spike = makeDetail(MeshBuilder.CreateCylinder('wendigo-spine-spike-' + i, { height: .35 + Math.sin(t * Math.PI) * .45, diameterTop: 0, diameterBottom: .12, tessellation: 5 }, scene), this.mesh, new Vector3(0, y + .04, z - .23), bone);
      spike.rotation.x = Math.PI / 2.3;
    }
    // Rib cage, shoulders and bony protrusions.
    for (let i = 0; i < 5; i++) {
      const scale = 1 - i * .08;
      for (const side of [-1, 1]) {
        const rib = MeshBuilder.CreateTorus('wendigo-rib-' + i + '-' + side, { diameter: .78 * scale, thickness: .045, tessellation: 10 }, scene);
        rib.parent = this.mesh; rib.position.set(side * .055, .72 - i * .25, .08); rib.scaling.set(1, .72, .55); rib.material = bone; rib.isPickable = false;
      }
    }
    for (const side of [-1, 1]) {
      const shoulder = makeDetail(MeshBuilder.CreatePolyhedron('wendigo-shoulder-' + side, { type: 2, size: .34 }, scene), this.mesh, new Vector3(side * .64, .42, .08), this.material);
      shoulder.rotation.z = side * .18;
      const shoulderSpike = makeDetail(MeshBuilder.CreateCylinder('wendigo-shoulder-spike-' + side, { height: .55, diameterTop: 0, diameterBottom: .16, tessellation: 5 }, scene), this.mesh, new Vector3(side * .72, .82, .02), bone);
      shoulderSpike.rotation.z = -side * .45;
    }
    // Long muzzle, dark sockets, extra teeth and branching antlers.
    const snout = MeshBuilder.CreateCylinder('wendigo-snout', { height: .65, diameterTop: .28, diameterBottom: .48, tessellation: 7 }, scene);
    snout.parent = head; snout.position.set(0, -.04, .42); snout.rotation.x = Math.PI / 2 + .15; snout.material = bone; snout.isPickable = false;
    for (const side of [-1, 1]) {
      const socket = MeshBuilder.CreateSphere('wendigo-eye-socket-' + side, { diameter: .22, segments: 7 }, scene);
      socket.parent = head; socket.position.set(side * .17, .05, .28); socket.material = eyeBlack; socket.isPickable = false;
      const antlerRoot = new TransformNode('wendigo-antler-' + side, scene);
      antlerRoot.parent = head; antlerRoot.position.set(side * .22, .32, -.05);
      const beam = MeshBuilder.CreateCylinder('wendigo-antler-beam-' + side, { height: 1.15, diameterTop: .06, diameterBottom: .14, tessellation: 6 }, scene);
      beam.parent = antlerRoot; beam.position.set(side * .25, .48, -.15); beam.rotation.set(-.3, 0, -side * .48); beam.material = darkFlesh; beam.isPickable = false;
      const tineA = MeshBuilder.CreateCylinder('wendigo-antler-tine-a-' + side, { height: .65, diameterTop: 0, diameterBottom: .08, tessellation: 5 }, scene);
      tineA.parent = antlerRoot; tineA.position.set(side * .35, .55, .12); tineA.rotation.z = -side * .3; tineA.material = bone; tineA.isPickable = false;
      const tineB = MeshBuilder.CreateCylinder('wendigo-antler-tine-b-' + side, { height: .75, diameterTop: 0, diameterBottom: .07, tessellation: 5 }, scene);
      tineB.parent = antlerRoot; tineB.position.set(side * .52, .88, -.1); tineB.rotation.z = -side * .65; tineB.material = bone; tineB.isPickable = false;
      for (let i = -3; i <= 3; i++) {
        const fang = MeshBuilder.CreateCylinder('wendigo-fang-' + side + '-' + i, { height: .14, diameterTop: 0, diameterBottom: .05, tessellation: 4 }, scene);
        fang.parent = head; fang.position.set(i * .045, -.18, .55 - Math.abs(i) * .04); fang.rotation.x = Math.PI; fang.material = bone; fang.isPickable = false;
      }
    }
    // Glowing exposed heart and chest light.
    const heartLight = new PointLight('wendigo-heart-light', Vector3.Zero(), scene);
    heartLight.parent = this.mesh; heartLight.position.set(0, .1, .48); heartLight.diffuse = new Color3(1, .005, .02); heartLight.intensity = 1.8; heartLight.range = 7.5;
    const jaw = MeshBuilder.CreateBox('wendigo-jaw', { width: .42, height: .16, depth: .3 }, scene);
    jaw.parent = head; jaw.position.set(0, -.25, .18); jaw.material = this.material; jaw.isPickable = false;
    const makeLimb = (name: string, x: number, y: number, length: number, width: number) => {
      const limb = MeshBuilder.CreateCapsule(name, { height: length, radius: width, tessellation: 6 }, scene);
      limb.parent = this.mesh; limb.position.set(x, y, 0); limb.material = this.material; limb.isPickable = false; return limb;
    };
    const leftArm = makeLimb('wendigo-left-arm', -.58, .42, 1.65, .14);
    const rightArm = makeLimb('wendigo-right-arm', .58, .42, 1.65, .14);
    const leftLeg = makeLimb('wendigo-left-leg', -.23, -.95, 1.5, .17);
    const rightLeg = makeLimb('wendigo-right-leg', .23, -.95, 1.5, .17);
    const heart = MeshBuilder.CreateSphere('wendigo-heart', { diameter: .18, segments: 6 }, scene);
    heart.parent = this.mesh; heart.position.set(0, .1, .38); heart.material = this.material; heart.isPickable = false;
    this.parts = { head, jaw, leftArm, rightArm, leftLeg, rightLeg, heart };
    this.initSteering(world);
    for (const side of [-1, 1]) {
      const eyeMat = new StandardMaterial('wendigo-eye-' + side, scene);
      eyeMat.emissiveColor = new Color3(.9, .015, .005);
      const eye = MeshBuilder.CreateSphere('wendigo-eye-' + side, { diameter: .09 }, scene);
      eye.parent = head; eye.position.set(side * .17, .04, .31); eye.material = eyeMat; eye.isPickable = false;
      const horn = MeshBuilder.CreateCylinder('wendigo-horn-' + side, { height: .85, diameterTop: 0, diameterBottom: .14, tessellation: 5 }, scene);
      horn.parent = head; horn.position.set(side * .25, .52, -.02); horn.rotation.z = side * -.35; horn.material = this.material; horn.isPickable = false;
    }
  }

  private initSteering(world: WorldLayout): void {
    this.manager = new YUKA.EntityManager();
    this.vehicle = new YUKA.Vehicle();
    this.vehicle.maxSpeed = 4.5; this.vehicle.maxForce = 24; this.vehicle.boundingRadius = 1.2;
    this.wander = new YUKA.WanderBehavior(9, 16, 2.8);
    this.seek = new YUKA.SeekBehavior(new YUKA.Vector3(0, 0, 0)); this.seek.weight = 0;
    const obstacles: YUKA.GameEntity[] = [];
    const addObstacle = (x: number, z: number, radius: number): void => {
      const obstacle = new YUKA.GameEntity(); obstacle.position.set(x, 0, z); obstacle.boundingRadius = radius;
      this.manager.add(obstacle); obstacles.push(obstacle);
    };
    world.houses.forEach(h => addObstacle(h.x, h.z, Math.max(h.width, h.depth) * .52));
    world.cars.forEach(c => addObstacle(c.x, c.z, 2.4));
    addObstacle(-92, -65, 4.2);
    const avoid = new YUKA.ObstacleAvoidanceBehavior(obstacles);
    avoid.dBoxMinLength = 5.5; avoid.weight = 2.2;
    this.vehicle.steering.add(avoid); this.vehicle.steering.add(this.wander); this.vehicle.steering.add(this.seek);
    this.manager.add(this.vehicle);
  }

  spawn(player = this.player.position): void {
    const z = Math.max(-300, Math.min(300, player.z + (Math.random() > .5 ? 85 : -85)));
    this.mesh.position.set(0, this.terrainHeight(0, z) + 2.0, z);
    this.vehicle.position.set(0, 0, z); this.vehicle.velocity.set(0, 0, 0);
    this.mesh.setEnabled(true); this.mesh.isVisible = false;
    this.mode = 'patrol'; this.patrolWait = 0; this.pickPatrolTarget(player);
  }

  stun(seconds: number): void { this.mode = 'stunned'; this.stunTimer = seconds; }

  private pickPatrolTarget(player: Vector3): void {
    const angle = Math.random() * Math.PI * 2, distance = 25 + Math.random() * 55;
    this.target.set(
      Math.max(-220, Math.min(220, player.x + Math.cos(angle) * distance)),
      0,
      Math.max(-220, Math.min(220, player.z + Math.sin(angle) * distance)),
    );
  }

  private hasLineOfSight(distance: number, range: number): boolean {
    if (distance > range) return false;
    const origin = this.mesh.position.add(new Vector3(0, 3.0, 0));
    const direction = this.player.position.subtract(origin).normalize();
    const ray = new Ray(origin, direction, distance);
    const hit = this.scene.pickWithRay(ray, mesh => mesh.isEnabled() && mesh.checkCollisions && mesh !== this.mesh && mesh.name !== 'terrain' && mesh.name !== 'main-road');
    return !hit?.hit || (hit.distance ?? distance) >= distance - .8;
  }

  update(dt: number, now: number, flashlightOn: boolean, sprinting = false, playerNoise = 0): void {
    if (!this.mesh.isEnabled()) return;
    if (this.mode === 'stunned') {
      this.stunTimer -= dt;
      this.parts.leftArm.rotation.x = -1.8; this.parts.rightArm.rotation.x = -1.8;
      if (this.stunTimer <= 0) { this.mode = 'patrol'; this.pickPatrolTarget(this.player.position); }
      return;
    }

    const distance = Vector3.Distance(this.mesh.position, this.player.position);
    if (now - this.lastPerception > 280) {
      this.lastPerception = now;
      const canSee = this.hasLineOfSight(distance, flashlightOn ? 39 : 17);
      const forward = this.player.getForwardRay().direction;
      const lightX = this.player.position.x + forward.x * 18;
      const lightZ = this.player.position.z + forward.z * 18;
      const lightSpotted = !canSee && flashlightOn && distance < 60 && Math.hypot(this.mesh.position.x - lightX, this.mesh.position.z - lightZ) < 22;
      const hearingRange = playerNoise >= 3 ? 75 : playerNoise === 2 ? 55 : playerNoise === 1 ? 20 : 0;
      const heard = !canSee && hearingRange > 0 && distance < hearingRange;
      if (canSee) {
        this.mode = 'chase'; this.target.copyFrom(this.player.position); this.chaseUntil = now + 2000;
      } else if (this.mode === 'chase') {
        if (now < this.chaseUntil) this.target.copyFrom(this.player.position);
        else { this.mode = 'patrol'; this.pickPatrolTarget(this.player.position); }
      } else if (heard || lightSpotted) {
        this.mode = heard ? 'investigate_sound' : 'investigate_light';
        this.lastKnown.copyFrom(this.player.position); this.target.copyFrom(this.lastKnown); this.patrolWait = 0;
      } else if (this.mode === 'patrol' && distance > 24 && distance < 52 && Math.random() < .08) {
        this.mode = 'ambush'; this.ambushTimer = 6.5;
      }
    }

    if (this.mode === 'ambush') {
      this.ambushTimer -= dt;
      this.mesh.rotation.y = Math.atan2(this.player.position.x - this.mesh.position.x, this.player.position.z - this.mesh.position.z);
      if (this.ambushTimer <= 0 || distance < 16) {
        if (distance < 22) { this.mode = 'chase'; this.chaseUntil = now + 2000; }
        else { this.mode = 'patrol'; this.pickPatrolTarget(this.player.position); }
      }
    } else if (this.mode === 'investigate_sound' || this.mode === 'investigate_light') {
      if (Vector3.Distance(this.mesh.position, this.target) < 3.5) this.mode = 'patrol';
    } else if (this.mode === 'patrol') {
      this.patrolWait -= dt;
      if (this.patrolWait > 0) return;
      if (Vector3.Distance(this.mesh.position, this.target) < 3) {
        this.patrolWait = .2;
        this.pickPatrolTarget(this.player.position);
      }
    }

    if (this.mode === 'ambush') {
      this.mesh.position.y = this.terrainHeight(this.mesh.position.x, this.mesh.position.z) + 1.15;
      this.animate(now, 0);
      return;
    }
    const speed = this.mode === 'chase' ? 13.8 : this.mode === 'investigate_sound' || this.mode === 'investigate_light' ? 7.4 : 4.5;
    this.move(dt, speed);
    this.animate(now, speed);
  }

  private move(dt: number, speed: number): void {
    let direction = this.target.subtract(this.mesh.position); direction.y = 0;
    if (direction.lengthSquared() < .01) return;
    direction.normalize();
    const seeking = this.mode === 'chase' || this.mode === 'investigate_sound' || this.mode === 'investigate_light';
    this.vehicle.position.set(this.mesh.position.x, 0, this.mesh.position.z);
    this.vehicle.maxSpeed = speed;
    this.seek.target.set(this.target.x, 0, this.target.z);
    this.seek.weight = seeking ? 1.8 : .85;
    this.wander.weight = seeking ? 0 : .65;
    this.manager.update(dt);
    const velocity = this.vehicle.velocity;
    if (velocity.x * velocity.x + velocity.z * velocity.z > .05) direction.set(velocity.x, 0, velocity.z).normalize();
    const origin = this.mesh.position.add(new Vector3(0, .8, 0));
    const hit = this.scene.pickWithRay(new Ray(origin, direction, 4.5), mesh => mesh.isEnabled() && mesh.checkCollisions && mesh !== this.mesh);
    if (hit?.hit) {
      const left = new Vector3(-direction.z, 0, direction.x);
      const right = left.scale(-1);
      const leftHit = this.scene.pickWithRay(new Ray(origin, left, 4.5), mesh => mesh.checkCollisions);
      const rightHit = this.scene.pickWithRay(new Ray(origin, right, 4.5), mesh => mesh.checkCollisions);
      direction = (leftHit?.distance ?? 999) > (rightHit?.distance ?? 999) ? left : right;
    }
    this.mesh.position.addInPlace(direction.scale(speed * dt));
    this.mesh.position.y = this.terrainHeight(this.mesh.position.x, this.mesh.position.z) + (this.mode === 'ambush' ? 1.15 : 2.0) + Math.sin(performance.now() * .004) * .035;
    const desired = Math.atan2(direction.x, direction.z);
    let delta = desired - this.mesh.rotation.y;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    this.mesh.rotation.y += delta * Math.min(1, 7 * dt);
  }

  private animate(now: number, speed: number): void {
    const chasing = this.mode === 'chase';
    const t = now * .001 * (chasing ? 14.5 : speed > 0 ? 6.5 : 1.5);
    const swing = chasing ? 1.05 : speed > 0 ? .55 : .08;
    this.parts.leftArm.rotation.x = Math.sin(t) * swing;
    this.parts.rightArm.rotation.x = Math.sin(t + Math.PI) * swing;
    this.parts.leftLeg.rotation.x = Math.sin(t + Math.PI) * swing;
    this.parts.rightLeg.rotation.x = Math.sin(t) * swing;
    this.parts.head.rotation.z = chasing ? Math.sin(t * 2) * .18 : this.mode === 'ambush' ? .35 : 0;
    this.parts.jaw.rotation.x = chasing ? Math.abs(Math.sin(t * 4)) * .42 : .1;
    this.parts.heart.scaling.setAll(1 + Math.sin(now * .012) * .2);
  }

  dispose(): void { this.mesh.dispose(false, true); this.material.dispose(); }
}
