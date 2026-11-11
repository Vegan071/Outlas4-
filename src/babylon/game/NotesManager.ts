import { Color3, Mesh, MeshBuilder, PointLight, StandardMaterial, TransformNode, Vector3 } from '@babylonjs/core';
import type { Scene } from '@babylonjs/core/scene';
import type { WorldLayout } from '../world/createWorld';

export interface Note {
  mesh: TransformNode;
  text: string;
  collected: boolean;
}
const texts = [
  '«Записка #1: Он появляется после заката. Не беги с зажатым Shift вблизи — он слышит топот и хруст веток!»',
  '«Записка #2: Осторожнее с фонариком [F]! Тварь замечает пятно света на земле и деревьях за 55 метров.»',
  '«Записка #3: Фотовспышка [R] выжигает ему глаза на 4 секунды! Используй, если он выпрыгнул из засады.»',
  '«Записка #4: На западе в лесу есть Трансформаторная будка. Включи рубильник — в городе зажгутся прожекторы!»',
  '«Записка #5: Нажми [Q] — экран ЭМП-сканера в левой руке включится на 5 секунд: зелёные точки — записки, красная — Вендиго.»',
  '«Записка #6: Иногда он прячется за широкими соснами в засаде и ждёт, пока ты подойдёшь ближе...»',
  '«Записка #7: На восточном холме стоит высокая Радиовышка с красным маяком — ориентируйся по ней.»',
  '«Записка #8: В северной части леса есть старая Сторожка лесника. Там можно укрыться за стенами.»',
  '«Записка #9: Когда он рядом, его биополе вызывает хроматические искажения объектива боди-камеры.»',
  '«Записка #10: Все 10 улик собраны! Смотри на синюю метку ЭМП-радара и беги к полицейской сирене!»',
];

export class NotesManager {
  readonly notes: Note[] = [];
  constructor(private scene: Scene, layout: WorldLayout) {
    this.createNotes(layout);
  }

  private createOne(index: number, position: Vector3, rotationY: number, isForest: boolean): void {
    const root = new TransformNode('note-root-' + index, this.scene);
    root.position.copyFrom(position); root.rotation.y = rotationY;
    const paper = new StandardMaterial('note-paper-' + index, this.scene);
    paper.diffuseColor = new Color3(.76, .68, .48);
    paper.emissiveColor = new Color3(.08, .065, .035);
    paper.diffuseTexture = layout.textures.notePaper;
    const card = MeshBuilder.CreatePlane('note-card-' + index, { width: .45, height: .65, sideOrientation: Mesh.DOUBLESIDE }, this.scene);
    card.parent = root; card.material = paper; card.isPickable = true;
    if (isForest) {
      const glowMat = new StandardMaterial('note-glow-mat-' + index, this.scene);
      glowMat.emissiveColor = new Color3(.9, .72, .28); glowMat.alpha = .45; glowMat.diffuseTexture = layout.textures.glow;
      const halo = MeshBuilder.CreateSphere('note-glow-' + index, { diameter: .32, segments: 6 }, this.scene);
      halo.parent = root; halo.position.y = .28; halo.material = glowMat; halo.isPickable = false;
      const light = new PointLight('note-light-' + index, position.add(new Vector3(0, .6, 0)), this.scene);
      light.diffuse = new Color3(1, .72, .3); light.intensity = .55; light.range = 8;
      light.parent = root; light.position.set(0, .6, 0);
    }
    this.notes.push({ mesh: root, text: texts[index], collected: false });
  }

  private createNotes(layout: WorldLayout): void {
    const random = mulberry32(0x4e4f5445);
    const houses = [...layout.houses], cars = [...layout.cars];
    if (houses.length) {
      const house = houses[Math.floor(random() * houses.length)];
      const side = Math.floor(random() * 4);
      const along = (length: number) => (random() - .5) * length * .7;
      let position: Vector3, rotation = 0;
      if (side === 0) position = new Vector3(house.x + along(house.width), 1.5, house.z + house.depth / 2 + .12);
      else if (side === 1) { position = new Vector3(house.x + along(house.width), 1.5, house.z - house.depth / 2 - .12); rotation = Math.PI; }
      else if (side === 2) { position = new Vector3(house.x - house.width / 2 - .12, 1.5, house.z + along(house.depth)); rotation = -Math.PI / 2; }
      else { position = new Vector3(house.x + house.width / 2 + .12, 1.5, house.z + along(house.depth)); rotation = Math.PI / 2; }
      this.createOne(0, position, rotation, false);
    }
    if (cars.length) {
      const car = cars[Math.floor(random() * cars.length)];
      const angle = car.rotation + Math.PI / 2;
      const position = new Vector3(car.x + Math.cos(angle) * 1.12, 1.2, car.z + Math.sin(angle) * 1.12);
      this.createOne(1, position, angle, false);
    }
    const candidates = layout.trees.filter(tree =>
      (Math.abs(tree.x) > 55 || Math.abs(tree.z) > 55) &&
      Math.abs(tree.x) < 320 && Math.abs(tree.z) < 320,
    );
    for (let i = 0; i < 8 && candidates.length; i++) {
      const index = Math.floor(random() * candidates.length);
      const tree = candidates.splice(index, 1)[0];
      const angle = random() * Math.PI * 2;
      const x = tree.x + Math.cos(angle) * 2.15;
      const z = tree.z + Math.sin(angle) * 2.15;
      this.createOne(i + 2, new Vector3(x, layout.terrainHeight(x, z) + 1.55, z), -angle + Math.PI / 2, true);
    }
  }

  nearest(position: Vector3, maxDistance = 2.2, forward?: Vector3): Note | null {
    let best: Note | null = null, distance = maxDistance;
    for (const note of this.notes) {
      if (note.collected) continue;
      const offset = note.mesh.position.subtract(position);
      const d = offset.length();
      if (d >= distance) continue;
      if (forward && d > 0) {
        offset.scaleInPlace(1 / d);
        if (Vector3.Dot(forward.normalizeToNew(), offset) <= .78) continue;
      }
      distance = d; best = note;
    }
    return best;
  }
  collect(note: Note): string {
    note.collected = true; note.mesh.dispose(false, true); return note.text;
  }
  restore(count: number): void {
    for (const note of this.notes.slice(0, Math.max(0, Math.min(count, this.notes.length)))) {
      note.collected = true; note.mesh.dispose(false, true);
    }
  }
  get count(): number { return this.notes.filter(note => note.collected).length; }
}
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0; seed = seed + 0x6d2b79f5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
