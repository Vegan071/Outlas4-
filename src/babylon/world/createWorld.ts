import {
  Color3, DirectionalLight, HemisphericLight, Matrix, Mesh, MeshBuilder, PointLight,
  Quaternion, Scene, StandardMaterial, TransformNode, Vector3, VertexBuffer, VertexData,
} from '@babylonjs/core';
import { createNoise2D } from 'simplex-noise';
import { createWorldTextures, type WorldTextures } from './createTextures';

export interface WorldTree { x: number; z: number; y: number; radius: number }
export interface WorldHouse { x: number; z: number; width: number; depth: number; height: number }
export interface WorldCar { x: number; z: number; rotation: number }
export interface WorldLayout {
  trees: WorldTree[];
  houses: WorldHouse[];
  cars: WorldCar[];
  terrainHeight: (x: number, z: number) => number;
  updateAtmosphere: (delta: number, progress: number, player: Vector3) => void;
  activateSubstation: () => void;
  textures: WorldTextures;
  spawnPoliceCar: () => Vector3;
  updatePoliceCar: (time: number, player: Vector3) => number;
  policeCarPosition: () => Vector3;
}

const POI = {
  substation: { x: -92, z: -65 },
  tower: { x: 112, z: 82 },
  cabin: { x: -108, z: 105 },
};
const CAR_COLORS = [
  new Color3(.78, .78, .75), new Color3(.35, .055, .055), new Color3(.055, .09, .28),
  new Color3(.09, .18, .12), new Color3(.16, .16, .16), new Color3(.35, .23, .08),
];

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0; seed = seed + 0x6d2b79f5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function material(scene: Scene, name: string, color: Color3): StandardMaterial {
  const mat = new StandardMaterial(name, scene);
  mat.diffuseColor = color;
  mat.specularColor = Color3.Black();
  return mat;
}
function makeBox(scene: Scene, name: string, width: number, height: number, depth: number, x: number, y: number, z: number, mat: StandardMaterial, collides = false): Mesh {
  const mesh = MeshBuilder.CreateBox(name, { width, height, depth }, scene);
  mesh.position.set(x, y, z); mesh.material = mat; mesh.checkCollisions = collides;
  return mesh;
}

export function createWorld(scene: Scene): WorldLayout {
  const textures = createWorldTextures(scene);
  const random = mulberry32(0x504f4e52);
  const noise = createNoise2D(random);
  const terrainHeight = (x: number, z: number): number => {
    const dx = Math.abs(x);
    if (dx < 34) return 0;
    const t = Math.min(1, (dx - 34) / 24);
    const smooth = t * t * (3 - 2 * t);
    return (noise(x * .0085, z * .0085) * 6.2 + noise(x * .025, z * .025) * 1.6) * smooth;
  };

  // Original 800x800 rolling terrain; road corridor remains flat.
  const ground = MeshBuilder.CreateGround('terrain', { width: 800, height: 800, subdivisions: 110 }, scene);
  const positions = ground.getVerticesData(VertexBuffer.PositionKind);
  if (positions) {
    for (let i = 0; i < positions.length; i += 3) {
      positions[i + 1] = terrainHeight(positions[i], positions[i + 2]);
    }
    ground.updateVerticesData(VertexBuffer.PositionKind, positions);
    const indices = ground.getIndices();
    const normals: number[] = [];
    if (indices) { VertexData.ComputeNormals(positions, indices, normals); ground.setVerticesData(VertexBuffer.NormalKind, normals, true); }
  }
  const groundMaterial = material(scene, 'terrain-material', new Color3(.75, .75, .75));
  groundMaterial.diffuseTexture = textures.ground; textures.ground.uScale = 75; textures.ground.vScale = 75;
  ground.material = groundMaterial;
  ground.checkCollisions = true;
  ground.isPickable = true;

  // Main road, sidewalks and road edge barriers.
  const road = MeshBuilder.CreateGround('main-road', { width: 16, height: 500, subdivisions: 1 }, scene);
  road.position.y = .055;
  const roadMaterial = material(scene, 'road-asphalt', new Color3(.85, .85, .85));
  roadMaterial.diffuseTexture = textures.asphalt; textures.asphalt.uScale = 1; textures.asphalt.vScale = 28;
  road.material = roadMaterial;
  for (const x of [-10.5, 10.5]) {
    makeBox(scene, 'road-curb-' + x, 5, .22, 500, x, .11, 0, material(scene, 'curb-material-' + x, new Color3(.25, .25, .24)));
  }

  // Original forest: 800 pines outside the city/road corridor and clearings around POIs.
  const treeMat = material(scene, 'bark', new Color3(.8, .8, .8)); treeMat.diffuseTexture = textures.bark;
  const leafMat = material(scene, 'pine-needles', new Color3(.018, .065, .038));
  const trunk = MeshBuilder.CreateCylinder('pine-trunk-instances', { height: 1, diameterTop: 3.6, diameterBottom: 4.2, tessellation: 7 }, scene);
  const crownA = MeshBuilder.CreateCylinder('pine-crown-lower', { height: 1, diameterTop: 0, diameterBottom: 21, tessellation: 6 }, scene);
  const crownB = MeshBuilder.CreateCylinder('pine-crown-upper', { height: 1, diameterTop: 0, diameterBottom: 15.75, tessellation: 6 }, scene);
  trunk.material = treeMat; crownA.material = leafMat; crownB.material = leafMat;
  trunk.isVisible = false; crownA.isVisible = false; crownB.isVisible = false;
  const trunkMatrices: Matrix[] = [], lowerMatrices: Matrix[] = [], upperMatrices: Matrix[] = [];
  const trees: WorldTree[] = [];
  const nearPOI = (x: number, z: number, radius: number): boolean =>
    Object.values(POI).some(p => Math.hypot(x - p.x, z - p.z) < radius);
  for (let attempt = 0; attempt < 1200 && trees.length < 800; attempt++) {
    const x = (random() - .5) * 750, z = (random() - .5) * 750;
    if (Math.abs(x) < 52 && Math.abs(z) < 225) continue;
    if (nearPOI(x, z, 18)) continue;
    const y = terrainHeight(x, z), height = 38 + random() * 20, rotation = Quaternion.RotationAxis(Vector3.Up(), random() * Math.PI);
    trunkMatrices.push(Matrix.Compose(new Vector3(1, height, 1), rotation, new Vector3(x, y + height * .5, z)));
    lowerMatrices.push(Matrix.Compose(new Vector3(1.05, height * .45, 1.05), rotation, new Vector3(x, y + height * .28 + height * .225, z)));
    upperMatrices.push(Matrix.Compose(new Vector3(.75, height * .48, .75), rotation, new Vector3(x, y + height * .58 + height * .24, z)));
    trees.push({ x, z, y, radius: 2.05 });
  }
  const setInstances = (mesh: Mesh, matrices: Matrix[]): void => {
    const buffer = new Float32Array(matrices.length * 16);
    matrices.forEach((matrix, index) => buffer.set(matrix.m, index * 16));
    mesh.thinInstanceSetBuffer('matrix', buffer, 16, true);
    mesh.isVisible = true; mesh.alwaysSelectAsActiveMesh = true;
  };
  setInstances(trunk, trunkMatrices); setInstances(crownA, lowerMatrices); setInstances(crownB, upperMatrices);
  trunk.checkCollisions = true; trunk.isPickable = true;

  // City blocks: two rows of tall abandoned buildings, with collision walls.
  const houses: WorldHouse[] = [];
  const buildingMaterial = material(scene, 'abandoned-building', new Color3(.8, .8, .8)); buildingMaterial.diffuseTexture = textures.building; textures.building.uScale = 2; textures.building.vScale = 3;
  const roofMaterial = material(scene, 'building-roof', new Color3(.045, .05, .05));
  for (let z = -180; z < 180; z += 45) {
    if (Math.abs(z) <= 15) continue;
    for (const x of [-26, 26]) {
      const width = 22, depth = 35, height = 26 + random() * 14;
      makeBox(scene, 'city-building-' + x + '-' + z, width, height, depth, x, height / 2, z, buildingMaterial, true);
      const house = { x, z, width, depth, height }; houses.push(house);
      makeBox(scene, 'building-roof-' + x + '-' + z, width + .35, .25, depth + .35, x, height + .12, z, roofMaterial);
      if (random() > .45) {
        const graffiti = makeBox(scene, 'building-graffiti-' + x + '-' + z, .025, 2.5, 4, x + (x < 0 ? 1 : -1) * (width / 2 + .03), 2.4, z + (random() - .5) * 10, material(scene, 'graffiti-' + x + '-' + z, new Color3(.9, .9, .9)));
        graffiti.isPickable = false;
      }
    }
  }

  // Six abandoned Lada-like vehicles, matching original placements and rotations.
  const cars: WorldCar[] = [];
  const black = material(scene, 'car-black', new Color3(.035, .035, .035));
  const glass = material(scene, 'car-glass', new Color3(.025, .07, .085));
  const tire = material(scene, 'car-tire', new Color3(.012, .012, .012));
  const carPlacements: [number, number, number, boolean][] = [
    [4, 15, .2, false], [-4, -45, -.8, true], [2, -110, Math.PI / 3, false],
    [-14, 25, .1, true], [5, 78, -.35, false], [-5, -155, .5, true],
  ];
  for (let i = 0; i < carPlacements.length; i++) {
    const [x, z, rotation, destroyed] = carPlacements[i];
    const root = new TransformNode('abandoned-car-' + i, scene);
    root.position.set(x, destroyed ? -.08 : 0, z); root.rotation.y = rotation;
    const paint = material(scene, 'car-paint-' + i, destroyed ? new Color3(.04, .04, .04) : CAR_COLORS[i]);
    const carBody = makeBox(scene, 'car-body-' + i, 1.75, .68, 4.3, 0, .62, 0, paint, true); carBody.parent = root; carBody.isPickable = true;
    makeBox(scene, 'car-cabin-' + i, 1.52, .55, 2.15, 0, 1.2, -.15, paint).parent = root;
    makeBox(scene, 'car-windows-' + i, 1.54, .42, 1.85, 0, 1.22, -.15, glass).parent = root;
    makeBox(scene, 'car-grille-' + i, 1.1, .25, .08, 0, .65, 2.13, black).parent = root;
    for (const [wx, wz] of [[-.85, 1.35], [.85, 1.35], [-.85, -1.35], [.85, -1.35]]) {
      if (destroyed && random() > .5) continue;
      const wheel = MeshBuilder.CreateCylinder('car-wheel-' + i, { height: .22, diameter: .64, tessellation: 10 }, scene);
      wheel.parent = root; wheel.position.set(wx, .32, wz); wheel.rotation.z = Math.PI / 2; wheel.material = tire;
    }
    if (!destroyed) {
      const headlight = material(scene, 'car-headlight-' + i, new Color3(.8, .78, .62));
      const tail = material(scene, 'car-tail-' + i, new Color3(.5, .015, .01));
      for (const side of [-1, 1]) {
        makeBox(scene, 'car-headlamp-' + i, .26, .2, .06, side * .62, .65, 2.14, headlight).parent = root;
        makeBox(scene, 'car-taillamp-' + i, .28, .16, .06, side * .62, .68, -2.14, tail).parent = root;
      }
    }
    cars.push({ x, z, rotation });
  }

  // Streetlights and collision poles along the city road.
  const poleMat = material(scene, 'streetlight-metal', new Color3(.09, .09, .085));
  const bulbMat = material(scene, 'streetlight-bulb', new Color3(.24, .22, .17));
  const streetLights: PointLight[] = [];
  const streetBulbs: Mesh[] = [];
  for (let z = -150; z <= 150; z += 50) {
    for (const x of [-13, 13]) {
      const group = new TransformNode('streetlight-' + x + '-' + z, scene); group.position.set(x, 0, z);
      const pole = MeshBuilder.CreateCylinder('streetlight-pole', { height: 6.5, diameterTop: .24, diameterBottom: .32, tessellation: 6 }, scene);
      pole.parent = group; pole.position.y = 3.25; pole.material = poleMat; pole.checkCollisions = true;
      const arm = MeshBuilder.CreateCylinder('streetlight-arm', { height: 2.2, diameter: .12, tessellation: 6 }, scene);
      arm.parent = group; arm.position.set(x < 0 ? 1.1 : -1.1, 6.3, 0); arm.rotation.z = (x < 0 ? 1 : -1) * Math.PI / 2.5; arm.material = poleMat;
      const housing = makeBox(scene, 'streetlight-housing', .7, .2, .4, x < 0 ? 2 : -2, 6.8, 0, poleMat); housing.parent = group;
      const bulb = makeBox(scene, 'streetlight-bulb', .5, .04, .25, x < 0 ? 2 : -2, 6.69, 0, bulbMat); bulb.parent = group; streetBulbs.push(bulb);
      const light = new PointLight('streetlight-point-' + x + '-' + z, new Vector3(x + (x < 0 ? 2 : -2), 6.5, z), scene);
      light.diffuse = new Color3(1, .78, .5); light.intensity = 0; light.range = 42; streetLights.push(light);
    }
  }

  // POI: substation with three transformer coils and a usable lever.
  const station = new TransformNode('substation-root', scene);
  station.position.set(POI.substation.x, terrainHeight(POI.substation.x, POI.substation.z), POI.substation.z);
  makeBox(scene, 'substation', 6.5, 4.5, 5.5, 0, 2.25, 0, material(scene, 'substation-brick', new Color3(.16, .15, .13)), true).parent = station;
  for (const x of [-1.8, 0, 1.8]) {
    const coil = MeshBuilder.CreateCylinder('transformer-coil', { height: 1.8, diameter: .7, tessellation: 8 }, scene);
    coil.parent = station; coil.position.set(x, 5.4, 0); coil.material = poleMat;
  }
  makeBox(scene, 'substation-switch-box', .3, 1.1, .8, 3.35, 1.6, 0, poleMat).parent = station;
  const leverMat = material(scene, 'substation-lever-mat', new Color3(1, .08, .01));
  const lever = makeBox(scene, 'substation-switch', .45, .14, .14, 3.55, 1.6, 0, leverMat); lever.parent = station;
  const stationLight = new PointLight('substation-light', new Vector3(4.2, 2.4, 0), scene);
  stationLight.parent = station; stationLight.diffuse = new Color3(1, .03, .01); stationLight.intensity = 2.5; stationLight.range = 18;
  let substationPowered = false;
  const activateSubstation = (): void => {
    substationPowered = true;
    leverMat.diffuseColor = new Color3(.02, .9, .18);
    stationLight.diffuse = new Color3(.02, 1, .12);
    stationLight.intensity = 3.5;
  };

  // POI: tall wireframe radio mast with a blinking beacon.
  const towerRoot = new TransformNode('radio-tower-root', scene);
  towerRoot.position.set(POI.tower.x, terrainHeight(POI.tower.x, POI.tower.z), POI.tower.z);
  const tower = MeshBuilder.CreateCylinder('radio-tower', { height: 68, diameterTop: 1.2, diameterBottom: 9, tessellation: 4, subdivisions: 14 }, scene);
  tower.parent = towerRoot; tower.position.y = 34; tower.material = material(scene, 'tower-wireframe', new Color3(.22, .16, .12)); (tower.material as StandardMaterial).wireframe = true; tower.checkCollisions = true;
  const beaconMat = material(scene, 'radio-beacon-mat', new Color3(1, .01, .005));
  const beacon = MeshBuilder.CreateSphere('radio-beacon', { diameter: 1.7, segments: 8 }, scene);
  beacon.parent = towerRoot; beacon.position.y = 68.5; beacon.material = beaconMat;
  const beaconLight = new PointLight('radio-beacon-light', new Vector3(0, 68.5, 0), scene);
  beaconLight.parent = towerRoot; beaconLight.diffuse = new Color3(1, .01, .005); beaconLight.intensity = 1.2; beaconLight.range = 16;
  scene.onBeforeRenderObservable.add(() => {
    const on = Math.floor(performance.now() / 450) % 2 === 0;
    beaconMat.emissiveColor = on ? new Color3(.8, .005, 0) : Color3.Black();
    beaconLight.intensity = on ? 1.2 : .08;
  });

  // POI: forest ranger cabin.
  const cabinRoot = new TransformNode('forest-cabin-root', scene);
  cabinRoot.position.set(POI.cabin.x, terrainHeight(POI.cabin.x, POI.cabin.z), POI.cabin.z);
  makeBox(scene, 'forest-cabin', 7.5, 4, 6.5, 0, 2, 0, material(scene, 'cabin-wood', new Color3(.14, .085, .05)), true).parent = cabinRoot;
  const cabinRoof = MeshBuilder.CreateCylinder('cabin-roof', { height: 2.8, diameterTop: 0, diameterBottom: 12.4, tessellation: 4 }, scene);
  cabinRoof.parent = cabinRoot; cabinRoof.position.y = 5.4; cabinRoof.rotation.y = Math.PI / 4; cabinRoof.material = material(scene, 'cabin-roof-material', new Color3(.045, .03, .025));
  const cabinBulb = MeshBuilder.CreateSphere('cabin-bulb', { diameter: .36 }, scene);
  cabinBulb.parent = cabinRoot; cabinBulb.position.set(3.85, 3.1, 0); cabinBulb.material = material(scene, 'cabin-bulb-mat', new Color3(1, .48, .08));

  // Extraction vehicle, unlocked after all ten clues are recovered.
  const policeCar = new TransformNode('police-car', scene);
  policeCar.position.set(0, 0, 3); policeCar.setEnabled(false);
  const policeBody = makeBox(scene, 'police-car-body', 2.1, .8, 4.4, 0, .8, 0, material(scene, 'police-car-paint', new Color3(.75, .76, .72)), true); policeBody.parent = policeCar; policeBody.isPickable = true;
  makeBox(scene, 'police-car-roof', 1.75, .65, 2.1, 0, 1.5, -.15, glass).parent = policeCar;
  makeBox(scene, 'police-car-stripe', 2.12, .18, 4.42, 0, .82, 0, material(scene, 'police-car-stripe-mat', new Color3(.04, .12, .55))).parent = policeCar;
  const lightbar = makeBox(scene, 'police-lightbar', 1.4, .15, .4, 0, 1.6, -.2, black); lightbar.parent = policeCar;
  const redLensMat = material(scene, 'police-red-lens', new Color3(.65, .01, .01)); redLensMat.emissiveColor = new Color3(.8, .005, 0);
  const blueLensMat = material(scene, 'police-blue-lens', new Color3(.01, .04, .65)); blueLensMat.emissiveColor = new Color3(.005, .04, .8);
  const redLens = makeBox(scene, 'police-red-lens-mesh', .6, .15, .42, -.35, 1.6, -.2, redLensMat); redLens.parent = policeCar;
  const blueLens = makeBox(scene, 'police-blue-lens-mesh', .6, .15, .42, .35, 1.6, -.2, blueLensMat); blueLens.parent = policeCar;
  const policeTire = material(scene, 'police-tire', new Color3(.01, .01, .01));
  for (const [x, z] of [[-.95, 1.35], [.95, 1.35], [-.95, -1.35], [.95, -1.35]]) {
    const wheel = MeshBuilder.CreateCylinder('police-wheel', { height: .22, diameter: .66, tessellation: 10 }, scene);
    wheel.parent = policeCar; wheel.position.set(x, .32, z); wheel.rotation.z = Math.PI / 2; wheel.material = policeTire;
  }
  const red = new PointLight('siren-red', new Vector3(-.6, 2.2, -.2), scene); red.parent = policeCar; red.diffuse = new Color3(1, .02, .01); red.intensity = 0; red.range = 45;
  const blue = new PointLight('siren-blue', new Vector3(.6, 2.2, -.2), scene); blue.parent = policeCar; blue.diffuse = new Color3(.02, .12, 1); blue.intensity = 0; blue.range = 45;
  const spawnPoliceCar = (): Vector3 => {
    if (policeCar.isEnabled()) return policeCar.position.clone();
    let x = 0, z = 0;
    switch (Math.floor(random() * 4)) {
      case 0: x = 120 + random() * 85; z = -100 + random() * 200; break;
      case 1: x = -120 - random() * 85; z = -100 + random() * 200; break;
      case 2: x = -90 + random() * 180; z = 240 + random() * 65; break;
      default: x = -90 + random() * 180; z = -240 - random() * 65; break;
    }
    policeCar.position.set(x, terrainHeight(x, z), z);
    policeCar.rotation.y = random() * Math.PI * 2;
    policeCar.setEnabled(true);
    return policeCar.position.clone();
  };
  const updatePoliceCar = (time: number, player: Vector3): number => {
    if (!policeCar.isEnabled()) return 0;
    const phase = Math.floor((time / 1000) * 6) % 2 === 0;
    red.intensity = phase ? 5 : 0; blue.intensity = phase ? 0 : 5;
    redLensMat.emissiveColor = phase ? new Color3(.8, .005, 0) : Color3.Black();
    blueLensMat.emissiveColor = phase ? Color3.Black() : new Color3(.005, .04, .8);
    const distance = Vector3.Distance(player, policeCar.position);
    return distance < 95 ? .38 * (1 - distance / 95) : 0;
  };
  const policeCarPosition = (): Vector3 => policeCar.position;

  // Original invisible world boundary walls.
  const boundaryMat = material(scene, 'boundary-invisible', new Color3(0, 0, 0));
  for (const [x, z, width, depth] of [
    [0, -390, 800, 10], [0, 390, 800, 10], [-390, 0, 10, 800], [390, 0, 10, 800],
  ]) {
    const wall = makeBox(scene, 'world-boundary', width, 30, depth, x, 10, z, boundaryMat, true);
    wall.isVisible = false; wall.isPickable = false;
  }

  const ambient = new HemisphericLight('night-ambient', new Vector3(0, 1, 0), scene);
  ambient.intensity = .85; ambient.diffuse = new Color3(1, .67, .4);
  const sun = new DirectionalLight('sunlight', new Vector3(-.4, -1, -.5), scene);
  sun.position.set(120, 60, 100); sun.intensity = 1.1; sun.diffuse = new Color3(1, .9, .8);
  scene.fogMode = Scene.FOGMODE_EXP2; scene.fogDensity = .012; scene.fogColor = new Color3(.8, .35, .18);
  scene.clearColor.set(.8, .35, .18, 1);

  // Blood moon and a lightweight thin-instance ash field, matching the original night sky.
  const moonMat = material(scene, 'blood-moon-material', new Color3(.55, .025, .012));
  moonMat.emissiveColor = new Color3(.55, .025, .012);
  const moon = MeshBuilder.CreateSphere('blood-moon', { diameter: 36, segments: 16 }, scene);
  moon.material = moonMat; moon.position.set(-180, -30, -220); moon.isPickable = false;
  const ash = MeshBuilder.CreateSphere('ash-particles', { diameter: .15, segments: 3 }, scene);
  ash.material = material(scene, 'ash-material', new Color3(.42, .42, .42));
  const ashRandom = mulberry32(0x415348);
  const ashMatrices = new Float32Array(600 * 16);
  const ashState: { x: number; y: number; z: number }[] = [];
  for (let i = 0; i < 600; i++) {
    const p = { x: (ashRandom() - .5) * 110, y: ashRandom() * 22, z: (ashRandom() - .5) * 110 };
    ashState.push(p);
    ashMatrices.set(Matrix.Translation(p.x, p.y, p.z).m, i * 16);
  }
  ash.thinInstanceSetBuffer('matrix', ashMatrices, 16, false);
  ash.isPickable = false; ash.alwaysSelectAsActiveMesh = true;

  const updateAtmosphere = (delta: number, progress: number, player: Vector3): void => {
    const p = Math.max(0, Math.min(1, progress));
    const sunsetSky = new Color3(1, .467, .2), nightSky = new Color3(.012, .012, .027);
    const sunsetAmbient = new Color3(1, .667, .4), nightAmbient = new Color3(.071, .078, .14);
    const sky = Color3.Lerp(sunsetSky, nightSky, p);
    scene.fogColor.copyFrom(sky); scene.clearColor.set(sky.r, sky.g, sky.b, 1);
    scene.fogDensity = .012 + .015 * p;
    ambient.diffuse.copyFrom(Color3.Lerp(sunsetAmbient, nightAmbient, p));
    ambient.intensity = .85 - .52 * p;
    sun.intensity = 1.1 * (1 - p);
    moon.position.y = -30 + p * 125;
    const bulb = Color3.Lerp(new Color3(.4, .4, .4), new Color3(1, 1, .93), p);
    for (const mesh of streetBulbs) {
      const mat = mesh.material as StandardMaterial | null;
      if (mat) mat.diffuseColor.copyFrom(bulb);
    }
    for (const light of streetLights) light.intensity = (substationPowered ? 6.8 : 3.5) * p;
    ash.position.set(player.x, terrainHeight(player.x, player.z), player.z);
    for (let i = 0; i < ashState.length; i++) {
      const particle = ashState[i];
      particle.y -= delta * .8;
      if (particle.y < 0) particle.y = 22;
      ashMatrices.set(Matrix.Translation(particle.x, particle.y, particle.z).m, i * 16);
    }
    ash.thinInstanceBufferUpdated('matrix');
  };

  return { trees, houses, cars, terrainHeight, updateAtmosphere, activateSubstation, spawnPoliceCar, updatePoliceCar, policeCarPosition, textures };
}
