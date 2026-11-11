import { Color3, PointLight, SpotLight, Vector3 } from '@babylonjs/core';
import type { Scene } from '@babylonjs/core/scene';
import type { UniversalCamera } from '@babylonjs/core/Cameras/universalCamera';
import type { GameState } from './GameState';
export class Gadgets {
  private flashlight:SpotLight;
  private flashLightMesh:PointLight;
  constructor(scene:Scene,camera:UniversalCamera,private state:GameState){
    this.flashlight=new SpotLight('player-flashlight',camera.position,new Vector3(0,0,1),Math.PI/5,12,scene);
    this.flashlight.parent=camera; this.flashlight.position.set(0,0,0); this.flashlight.direction=new Vector3(0,0,1);
    this.flashlight.intensity=0; this.flashlight.range=38; this.flashlight.diffuse=new Color3(.78,.86,1);
    this.flashLightMesh=new PointLight('flashbang-light',Vector3.Zero(),scene); this.flashLightMesh.intensity=0;
  }
  toggleFlashlight():boolean {this.state.flashlightOn=!this.state.flashlightOn;this.flashlight.intensity=this.state.flashlightOn?2.2:0;return this.state.flashlightOn;}
  flashbang(now:number):boolean {if(now<this.state.flashbangReadyAt)return false;this.state.flashbangReadyAt=now+22000;this.flashLightMesh.position.set(0,2,0);this.flashLightMesh.intensity=8;setTimeout(()=>this.flashLightMesh.intensity=0,180);return true;}
  radar(now:number):boolean {if(now<this.state.radarReadyAt)return false;this.state.radarReadyAt=now+15000;this.state.radarUntil=now+5000;return true;}
  dispose():void{this.flashlight.dispose();this.flashLightMesh.dispose();}
}
