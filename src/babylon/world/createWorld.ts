import {
  Color3, HemisphericLight, MeshBuilder, Matrix, Quaternion, Scene,
  StandardMaterial, DirectionalLight, Vector3, PointLight,
} from '@babylonjs/core';
import { createNoise2D } from 'simplex-noise';

function mat(scene:Scene,name:string,color:Color3):StandardMaterial{
  const m=new StandardMaterial(name,scene);m.diffuseColor=color;m.specularColor=Color3.Black();return m;
}
export function createWorld(scene:Scene):void{
  const ground=MeshBuilder.CreateGround('terrain',{width:220,height:220,subdivisions:64},scene);
  const groundMat=mat(scene,'terrain-material',new Color3(.07,.085,.06));ground.material=groundMat;ground.checkCollisions=true;
  const noise=createNoise2D();
  const trunkMat=mat(scene,'bark',new Color3(.105,.062,.038));
  const leafMat=mat(scene,'pine-needles',new Color3(.018,.065,.038));
  const trunk=MeshBuilder.CreateCylinder('tree-trunk',{height:5.4,diameterTop:.3,diameterBottom:.58,tessellation:6},scene);
  trunk.material=trunkMat;trunk.isVisible=false;
  const crown=MeshBuilder.CreateCylinder('tree-crown',{height:7.6,diameterTop:0,diameterBottom:4.3,tessellation:6},scene);
  crown.material=leafMat;crown.isVisible=false;
  const trunkMatrices:Matrix[]=[],crownMatrices:Matrix[]=[];
  for(let i=0;i<820;i++){
    const a=Math.random()*Math.PI*2,r=13+Math.random()*91,x=Math.cos(a)*r,z=Math.sin(a)*r;
    if(Math.abs(x)<7&&Math.abs(z)<12)continue;
    const scale=.72+Math.random()*.8+noise(x*.025,z*.025)*.07;
    const rotation=Quaternion.RotationAxis(Vector3.Up(),Math.random()*Math.PI*2);
    trunkMatrices.push(Matrix.Compose(new Vector3(scale,scale,scale),rotation,new Vector3(x,2.7*scale,z)));
    crownMatrices.push(Matrix.Compose(new Vector3(scale,scale,scale),rotation,new Vector3(x,7.5*scale,z)));
  }
  trunk.thinInstanceAdd(trunkMatrices);crown.thinInstanceAdd(crownMatrices);
  trunk.isVisible=true;crown.isVisible=true;trunk.alwaysSelectAsActiveMesh=true;crown.alwaysSelectAsActiveMesh=true;

  // Dirt road from the forest entrance to the extraction point.
  const road=MeshBuilder.CreateGround('forest-road',{width:5,height:105},scene);
  road.position.set(0,.015,48);road.rotation.x=0;road.material=mat(scene,'road-material',new Color3(.12,.105,.075));

  // Small abandoned checkpoint and police vehicle used as the extraction landmark.
  const buildingMat=mat(scene,'checkpoint-concrete',new Color3(.16,.17,.16));
  const cabin=MeshBuilder.CreateBox('checkpoint-building',{width:8,height:3.4,depth:6},scene);
  cabin.position.set(0,1.7,13);cabin.material=buildingMat;cabin.checkCollisions=true;
  const roof=MeshBuilder.CreateBox('checkpoint-roof',{width:8.5,height:.3,depth:6.5},scene);
  roof.position.set(0,3.55,13);roof.material=mat(scene,'roof-material',new Color3(.035,.04,.04));
  const carBody=MeshBuilder.CreateBox('police-car-body',{width:2.2,height:.8,depth:4.4},scene);
  carBody.position.set(0,.85,3);carBody.material=mat(scene,'police-car-paint',new Color3(.07,.09,.11));
  const carTop=MeshBuilder.CreateBox('police-car-roof',{width:1.8,height:.65,depth:2.1},scene);
  carTop.position.set(0,1.55,2.95);carTop.material=mat(scene,'police-car-glass',new Color3(.025,.06,.075));
  const red= new PointLight('siren-red',new Vector3(-.35,2.05,2.95),scene);red.diffuse=new Color3(1,.02,.01);red.intensity=.25;red.range=5;
  const blue=new PointLight('siren-blue',new Vector3(.35,2.05,2.95),scene);blue.diffuse=new Color3(.02,.12,1);blue.intensity=.25;blue.range=5;

  const ambient=new HemisphericLight('night-ambient',new Vector3(0,1,0),scene);
  ambient.intensity=.3;ambient.diffuse=new Color3(.38,.48,.58);
  const moon=new DirectionalLight('moonlight',new Vector3(-.4,-1,.25),scene);
  moon.intensity=.5;moon.diffuse=new Color3(.45,.55,.72);
  scene.fogMode=Scene.FOGMODE_EXP2;scene.fogDensity=.009;scene.fogColor=new Color3(.025,.035,.045);
}
