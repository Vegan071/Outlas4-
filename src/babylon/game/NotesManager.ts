import { Color3, MeshBuilder, StandardMaterial, Vector3 } from '@babylonjs/core';
import type { Scene } from '@babylonjs/core/scene';
export interface Note { mesh: ReturnType<typeof MeshBuilder.CreateBox>; text:string; collected:boolean; }
const texts = [
'Если ты читаешь это, не включай фонарь. Он видит свет сквозь деревья.',
'Мы приехали проверить сигнал у старой дороги. Машина больше не заводится.',
'Не иди на звук шагов. Иногда он повторяет твои.',
'На вышке есть предохранитель. Без него ворота не открыть.',
'Я видел его между деревьями. Оно было выше сосен.',
'Рация шипит, когда оно близко. Не стой на месте.',
'Ключи от полицейской машины должны быть у КПП.',
'Солнце село слишком быстро. Здесь что-то не так.',
'Если услышишь собственный голос — беги.',
'Десятая записка. Теперь найди машину и уезжай.'
];
export class NotesManager {
  readonly notes: Note[]=[];
  constructor(private scene:Scene) {
    const mat=new StandardMaterial('note-paper',scene); mat.diffuseColor=new Color3(.72,.62,.39);
    for(let i=0;i<10;i++){
      const a=i*2.399, r=13+(i%4)*9;
      const mesh=MeshBuilder.CreateBox('note-'+i,{width:.42,height:.035,depth:.3},scene);
      mesh.position.set(Math.cos(a)*r,.12,Math.sin(a)*r);
      mesh.rotation.y=-a; mesh.material=mat; mesh.isPickable=true;
      this.notes.push({mesh,text:texts[i],collected:false});
    }
  }
  nearest(position:Vector3,maxDistance=2.2):Note|null {
    let best:Note|null=null, d=maxDistance;
    for(const n of this.notes){if(n.collected)continue;const nd=Vector3.Distance(position,n.mesh.position);if(nd<d){d=nd;best=n;}}
    return best;
  }
  collect(note:Note):string { note.collected=true; note.mesh.dispose(); return note.text; }
  get count():number{return this.notes.filter(n=>n.collected).length;}
}
