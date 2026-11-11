import { Color3, MeshBuilder, StandardMaterial, Vector3 } from '@babylonjs/core';
import type { Scene } from '@babylonjs/core/scene';

export interface Note {
  mesh: ReturnType<typeof MeshBuilder.CreateBox>;
  text: string;
  collected: boolean;
}
const texts = [
  'Записка #1: Он появляется после заката. Не беги с зажатым Shift — он слышит топот и хруст веток.',
  'Записка #2: Осторожнее с фонариком. Тварь замечает пятно света на земле и деревьях.',
  'Записка #3: Фотовспышка выжигает ему глаза на четыре секунды. Используй её, если он близко.',
  'Записка #4: На западе в лесу есть трансформаторная будка. Включи рубильник.',
  'Записка #5: ЭМП-сканер включается клавишей Q. Зелёные точки — улики, красная — Вендиго.',
  'Записка #6: Иногда он прячется за широкими соснами и ждёт, пока ты подойдёшь ближе.',
  'Записка #7: На восточном холме стоит высокая радиовышка с красным маяком.',
  'Записка #8: На севере есть старая сторожка лесника. Не задерживайся там.',
  'Записка #9: Когда он рядом, его биополе вызывает искажения изображения.',
  'Записка #10: Все улики собраны. Ищи полицейскую машину у главной дороги.'
];
// Eight clues in the forest, one at the cabin and one near the abandoned settlement.
const positions: [number, number][] = [
  [-68, -92], [-142, -35], [-168, 88], [-76, 152],
  [48, 136], [142, 118], [176, -42], [82, -154],
  [-108, 105], [7, 28],
];

export class NotesManager {
  readonly notes: Note[] = [];
  constructor(private scene: Scene) {
    const paper = new StandardMaterial('note-paper', scene);
    paper.diffuseColor = new Color3(.76, .68, .48);
    paper.emissiveColor = new Color3(.12, .09, .035);
    const glow = new StandardMaterial('note-glow', scene);
    glow.emissiveColor = new Color3(.7, .52, .18);
    for (let i = 0; i < positions.length; i++) {
      const [x, z] = positions[i];
      const mesh = MeshBuilder.CreateBox('note-' + i, { width: .48, height: .035, depth: .34 }, this.scene);
      mesh.position.set(x, 1.35, z);
      mesh.rotation.set(.04, Math.atan2(x, z), .08);
      mesh.material = paper;
      mesh.isPickable = true;
      const halo = MeshBuilder.CreateSphere('note-glow-' + i, { diameter: .18, segments: 6 }, this.scene);
      halo.parent = mesh; halo.position.y = .28; halo.material = glow; halo.isPickable = false;
      this.notes.push({ mesh, text: texts[i], collected: false });
    }
  }
  nearest(position: Vector3, maxDistance = 2.2): Note | null {
    let best: Note | null = null, distance = maxDistance;
    for (const note of this.notes) {
      if (note.collected) continue;
      const d = Vector3.Distance(position, note.mesh.position);
      if (d < distance) { distance = d; best = note; }
    }
    return best;
  }
  collect(note: Note): string {
    note.collected = true;
    note.mesh.dispose(false, true);
    return note.text;
  }
  restore(count: number): void {
    for (const note of this.notes.slice(0, Math.max(0, Math.min(count, this.notes.length)))) {
      note.collected = true;
      note.mesh.dispose(false, true);
    }
  }
  get count(): number { return this.notes.filter(note => note.collected).length; }
}
