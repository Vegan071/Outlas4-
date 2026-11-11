import { Color3, MeshBuilder, StandardMaterial, Vector3 } from '@babylonjs/core';
import type { Scene } from '@babylonjs/core/scene';
import type { UniversalCamera } from '@babylonjs/core/Cameras/universalCamera';
export type MonsterMode='patrol'|'investigate'|'chase'|'stunned';
export class Monster {
  readonly mesh;
  mode:MonsterMode='patrol'; private target=new Vector3(0,0,0); private timer=0;
  constructor(private scene:Scene,private player:UniversalCamera){
    const mat=new StandardMaterial('wendigo-material',scene);mat.diffuseColor=new Color3(.055,.035,.03);mat.emissiveColor=new Color3(.012,.004,.003);
    this.mesh=MeshBuilder.CreateCapsule('wendigo',{height:3.7,radius:.48,tessellation:6},scene);
    this.mesh.position.set(28,1.85,28);this.mesh.material=mat;this.mesh.isPickable=false;
    const eye=new StandardMaterial('wendigo-eyes',scene);eye.emissiveColor=new Color3(.8,.025,.005);
    for(const x of [-.18,.18]){const e=MeshBuilder.CreateSphere('eye',{diameter:.09},scene);e.parent=this.mesh;e.position.set(x,1.05,.35);e.material=eye;}
  }
  stun(seconds:number):void{this.mode='stunned';this.timer=seconds;}
  update(dt:number,now:number,flashlightOn:boolean):void{
    const distance=Vector3.Distance(this.mesh.position,this.player.position);
    if(this.mode==='stunned'){this.timer-=dt;if(this.timer<=0)this.mode='investigate';return;}
    if(distance<(flashlightOn?35:18))this.mode='chase';
    else if(this.mode==='chase')this.mode='investigate';
    if(this.mode==='patrol'){
      if(Vector3.Distance(this.mesh.position,this.target)<2){const a=Math.random()*Math.PI*2;this.target.set(Math.cos(a)*34,0,Math.sin(a)*34);}
    }else if(this.mode==='investigate'){this.target.copyFrom(this.player.position);}
    else this.target.copyFrom(this.player.position);
    const direction=this.target.subtract(this.mesh.position);direction.y=0;
    if(direction.lengthSquared()>.1){direction.normalize();const speed=this.mode==='chase'?5.2:1.25;this.mesh.position.addInPlace(direction.scale(speed*dt));this.mesh.rotation.y=Math.atan2(direction.x,direction.z);}
    if(distance<1.25){this.mode='chase';}
  }
  dispose():void{this.mesh.dispose();}
}
