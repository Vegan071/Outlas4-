import {Color3,HemisphericLight,MeshBuilder,Matrix,Quaternion,Scene,StandardMaterial,DirectionalLight,Vector3,PointLight,TransformNode} from '@babylonjs/core';
import {createNoise2D} from 'simplex-noise';
function mat(scene:Scene,name:string,color:Color3):StandardMaterial{const m=new StandardMaterial(name,scene);m.diffuseColor=color;m.specularColor=Color3.Black();return m;}
export function createWorld(scene:Scene):void{
 const ground=MeshBuilder.CreateGround('terrain',{width:440,height:440,subdivisions:100},scene);ground.material=mat(scene,'terrain-material',new Color3(.07,.085,.06));ground.checkCollisions=true;
 const noise=createNoise2D(),trunk=MeshBuilder.CreateCylinder('tree-trunk',{height:5.4,diameterTop:.3,diameterBottom:.58,tessellation:6},scene),crown=MeshBuilder.CreateCylinder('tree-crown',{height:7.6,diameterTop:0,diameterBottom:4.3,tessellation:6},scene);
 trunk.material=mat(scene,'bark',new Color3(.105,.062,.038));crown.material=mat(scene,'pine-needles',new Color3(.018,.065,.038));trunk.isVisible=false;crown.isVisible=false;
 const tm:Matrix[]=[],cm:Matrix[]=[];
 for(let i=0;i<1450;i++){const a=Math.random()*Math.PI*2,r=15+Math.random()*190,x=Math.cos(a)*r,z=Math.sin(a)*r;if(Math.abs(x)<8&&Math.abs(z)<18)continue;const s=.72+Math.random()*.8+noise(x*.025,z*.025)*.07,q=Quaternion.RotationAxis(Vector3.Up(),Math.random()*Math.PI*2);tm.push(Matrix.Compose(new Vector3(s,s,s),q,new Vector3(x,2.7*s,z)));cm.push(Matrix.Compose(new Vector3(s,s,s),q,new Vector3(x,7.5*s,z)));}
 trunk.thinInstanceAdd(tm);crown.thinInstanceAdd(cm);trunk.isVisible=true;crown.isVisible=true;trunk.alwaysSelectAsActiveMesh=true;crown.alwaysSelectAsActiveMesh=true;
 const road=MeshBuilder.CreateGround('main-road',{width:7,height:390},scene);road.position.set(0,.02,0);road.material=mat(scene,'road-dirt',new Color3(.13,.115,.085));
 // Abandoned settlement: low-poly buildings placed on both sides of the forest road.
 for(let i=0;i<22;i++){const side=i%2?1:-1,z=-150+Math.floor(i/2)*28,x=side*(12+Math.random()*9),w=5+Math.random()*4,d=5+Math.random()*5,h=2.8+Math.random()*2.2;const b=MeshBuilder.CreateBox('ruined-building-'+i,{width:w,height:h,depth:d},scene);b.position.set(x,h/2,z);b.material=mat(scene,'building-'+i,new Color3(.11+Math.random()*.04,.105+Math.random()*.04,.09));b.checkCollisions=true;const roof=MeshBuilder.CreateBox('building-roof-'+i,{width:w+.4,height:.22,depth:d+.4},scene);roof.position.set(x,h+.1,z);roof.material=mat(scene,'building-roof-material-'+i,new Color3(.035,.04,.04));}
 // Radio mast with a beacon.
 const tower=MeshBuilder.CreateCylinder('radio-tower',{height:48,diameterTop:.35,diameterBottom:3.2,tessellation:4},scene);tower.position.set(-34,24,52);tower.material=mat(scene,'tower-metal',new Color3(.12,.105,.09));tower.checkCollisions=true;
 const beacon=MeshBuilder.CreateSphere('radio-beacon',{diameter:1.1},scene);beacon.position.set(-34,48.5,52);beacon.material=mat(scene,'beacon-material',new Color3(.8,.015,.005));
 const beaconLight=new PointLight('beacon-light',beacon.position,scene);beaconLight.diffuse=new Color3(1,.015,.005);beaconLight.intensity=1.4;beaconLight.range=16;
 // Substation and its interactive switch.
 const station=MeshBuilder.CreateBox('substation',{width:8,height:4,depth:7},scene);station.position.set(31,2,46);station.material=mat(scene,'substation-metal',new Color3(.12,.14,.13));station.checkCollisions=true;
 const switchBox=MeshBuilder.CreateBox('substation-switch',{width:.55,height:1.2,depth:.35},scene);switchBox.position.set(26,.9,42);switchBox.material=mat(scene,'switch-material',new Color3(.65,.22,.025));
 // Cabin landmark.
 const cabin=MeshBuilder.CreateBox('forest-cabin',{width:7.5,height:3.8,depth:6.5},scene);cabin.position.set(-48,1.9,-42);cabin.material=mat(scene,'cabin-wood',new Color3(.14,.085,.05));cabin.checkCollisions=true;
 const cabinRoof=MeshBuilder.CreateCylinder('cabin-roof',{height:2.5,diameterTop:0,diameterBottom:10,tessellation:4},scene);cabinRoof.position.set(-48,4.8,-42);cabinRoof.rotation.y=Math.PI/4;cabinRoof.material=mat(scene,'cabin-roof-material',new Color3(.045,.03,.025));
 // Extraction car remains hidden until all ten notes have been collected.
 const car=new TransformNode('police-car',scene);car.position.set(0,0,3);car.setEnabled(false);
 const body=MeshBuilder.CreateBox('police-car-body',{width:2.1,height:.8,depth:4.4},scene);body.parent=car;body.position.y=.8;body.material=mat(scene,'police-car-paint',new Color3(.75,.76,.72));
 const roof=MeshBuilder.CreateBox('police-car-roof',{width:1.75,height:.65,depth:2.1},scene);roof.parent=car;roof.position.set(0,1.5,-.15);roof.material=mat(scene,'police-car-glass',new Color3(.025,.06,.075));
 const stripe=MeshBuilder.CreateBox('police-car-stripe',{width:2.12,height:.18,depth:4.42},scene);stripe.parent=car;stripe.position.y=.82;stripe.material=mat(scene,'police-car-stripe-mat',new Color3(.04,.12,.55));
 const red=new PointLight('siren-red',new Vector3(-.35,2,0),scene);red.parent=car;red.diffuse=new Color3(1,.02,.01);red.intensity=1.5;red.range=8;
 const blue=new PointLight('siren-blue',new Vector3(.35,2,0),scene);blue.parent=car;blue.diffuse=new Color3(.02,.12,1);blue.intensity=1.5;blue.range=8;
 const ambient=new HemisphericLight('night-ambient',new Vector3(0,1,0),scene);ambient.intensity=.3;ambient.diffuse=new Color3(.38,.48,.58);
 const moon=new DirectionalLight('moonlight',new Vector3(-.4,-1,.25),scene);moon.intensity=.5;moon.diffuse=new Color3(.45,.55,.72);
 scene.fogMode=Scene.FOGMODE_EXP2;scene.fogDensity=.008;scene.fogColor=new Color3(.025,.035,.045);
}
