import {Color3,MeshBuilder,StandardMaterial,Vector3,Ray} from '@babylonjs/core';
import type {Scene} from '@babylonjs/core/scene';
import type {UniversalCamera} from '@babylonjs/core/Cameras/universalCamera';
export type MonsterMode='patrol'|'investigate'|'chase'|'stunned';
export class Monster{
 readonly mesh;
 mode:MonsterMode='patrol';
 private target=new Vector3(36,0,0);
 private stunTimer=0;
 private patrolTimer=0;
 private lastKnown=new Vector3(0,0,0);
 constructor(private scene:Scene,private player:UniversalCamera){
  const dark=new StandardMaterial('wendigo-skin',scene);dark.diffuseColor=new Color3(.045,.035,.03);dark.specularColor=Color3.Black();
  this.mesh=MeshBuilder.CreateCapsule('wendigo',{height:3.6,radius:.43,tessellation:7},scene);this.mesh.position.set(34,1.8,34);this.mesh.material=dark;this.mesh.isPickable=false;
  const head=MeshBuilder.CreateSphere('wendigo-head',{diameter:.72,segments:7},scene);head.parent=this.mesh;head.position.y=1.75;head.material=dark;
  const limbMat=dark;
  for(const side of [-1,1]){
   const arm=MeshBuilder.CreateCylinder('wendigo-arm',{height:1.9,diameterTop:.19,diameterBottom:.27,tessellation:5},scene);arm.parent=this.mesh;arm.position.set(side*.58,.55,.03);arm.rotation.z=side*-.18;arm.material=limbMat;
   const eyeMat=new StandardMaterial('wendigo-eye-'+side,scene);eyeMat.emissiveColor=new Color3(.9,.018,.006);
   const eye=MeshBuilder.CreateSphere('wendigo-eye',{diameter:.085,segments:5},scene);eye.parent=this.mesh;eye.position.set(side*.17,1.83,.31);eye.material=eyeMat;
  }
 }
 stun(seconds:number):void{this.mode='stunned';this.stunTimer=seconds;}
 private canSeePlayer(distance:number):boolean{
  if(distance>42)return false;
  const origin=this.mesh.position.add(new Vector3(0,1.35,0));
  const destination=this.player.position.add(new Vector3(0,-.25,0));
  const direction=destination.subtract(origin).normalize();
  const ray=new Ray(origin,direction,distance);
  const hit=this.scene.pickWithRay(ray,m=>m.isPickable&&m!==this.mesh);
  return !hit?.hit;
 }
 update(dt:number,now:number,flashlightOn:boolean,sprinting=false):void{
  if(this.mode==='stunned'){this.stunTimer-=dt;if(this.stunTimer<=0)this.mode='investigate';return;}
  const distance=Vector3.Distance(this.mesh.position,this.player.position);
  const sees=this.canSeePlayer(distance);
  const hears=distance<(sprinting?58:distance<20?20:0);
  if(sees&&(distance<(flashlightOn?42:18)))this.mode='chase';
  else if(hears&&this.mode!=='chase'){this.mode='investigate';this.lastKnown.copyFrom(this.player.position);}
  if(this.mode==='chase'){
   if(sees||distance<5)this.target.copyFrom(this.player.position);
   else{this.mode='investigate';this.lastKnown.copyFrom(this.target);}
  }else if(this.mode==='investigate'){
   this.target.copyFrom(this.lastKnown);
   if(Vector3.Distance(this.mesh.position,this.target)<2)this.mode='patrol';
  }else{
   this.patrolTimer-=dt;
   if(this.patrolTimer<=0||Vector3.Distance(this.mesh.position,this.target)<2){
    const a=Math.random()*Math.PI*2,r=22+Math.random()*48;
    this.target.set(Math.cos(a)*r,0,Math.sin(a)*r);this.patrolTimer=5+Math.random()*6;
   }
  }
  const direction=this.target.subtract(this.mesh.position);direction.y=0;
  if(direction.lengthSquared()>.1){direction.normalize();const speed=this.mode==='chase'?5.1:this.mode==='investigate'?2.4:1.15;this.mesh.position.addInPlace(direction.scale(speed*dt));this.mesh.rotation.y=Math.atan2(direction.x,direction.z);}
  this.mesh.position.y=1.8+Math.sin(now*.003)*.035;
 }
 dispose():void{this.mesh.dispose();}
}
