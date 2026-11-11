import '../styles.css';
import {Vector3} from '@babylonjs/core/Maths/math.vector';
import {createEngine} from './engine/createEngine';
import {createWorld} from './world/createWorld';
import {createPlayer} from './player/createPlayer';
import {AudioManager} from './audio/AudioManager';
import {AssetLoader} from './assets/AssetLoader';
import {createGameState} from './game/GameState';
import {NotesManager} from './game/NotesManager';
import {Gadgets} from './game/Gadgets';
import {SaveManager} from './game/SaveManager';
import {Monster} from './entities/Monster';
import {Hud} from './ui/Hud';
function fatal(message:string):void{const el=document.getElementById('error-box');if(el){el.textContent=message;el.style.display='flex';}}
function bootstrap():void{
 try{
  const{engine,scene,canvas}=createEngine();createWorld(scene);
  const camera=createPlayer(scene,canvas),state=createGameState(),notes=new NotesManager(scene);
  const gadgets=new Gadgets(scene,camera,state),monster=new Monster(scene,camera),audio=new AudioManager(scene),assets=new AssetLoader(scene),save=new SaveManager(),hud=new Hud();
  const menu=document.getElementById('menu'),start=document.getElementById('start-btn'),fps=document.getElementById('fps-counter');
  let previous=performance.now(),sprinting=false;
  const startGame=():void=>{state.phase='playing';if(menu)menu.style.display='none';canvas.requestPointerLock?.();canvas.focus();};
  start?.addEventListener('click',startGame);
  document.addEventListener('pointerlockchange',()=>{if(document.pointerLockElement!==canvas&&state.phase==='playing'){state.phase='paused';if(menu)menu.style.display='flex';}});
  document.addEventListener('keydown',(e)=>{
   if(e.code==='Escape'&&state.phase==='playing'){state.phase='paused';if(menu)menu.style.display='flex';}
   if(state.phase!=='playing')return;
   const now=performance.now();
   if(e.code==='ShiftLeft'||e.code==='ShiftRight')sprinting=true;
   if(e.code==='KeyF'){state.flashlightOn=gadgets.toggleFlashlight();hud.notify(state.flashlightOn?'Фонарик включён':'Фонарик выключен');}
   if(e.code==='KeyR'){
    if(gadgets.flashbang(now)){
     const d=Vector3.Distance(monster.mesh.position,camera.position);
     if(d<22){monster.stun(4);hud.notify('Вендиго ослеплён — бегите!');}
     else hud.notify('Вспышка сработала, но монстр слишком далеко');
    }else hud.notify('Фотовспышка перезаряжается');
   }
   if(e.code==='KeyQ'){
    if(gadgets.radar(now)){
     const target=state.notesFound>=10?scene.getTransformNodeByName('police-car')?.position:notes.nearest(camera.position,100)?.mesh.position;
     if(target){const delta=target.subtract(camera.position);hud.notify('ЭМП: '+Math.round(delta.length())+' м · '+(delta.x>2?'справа':delta.x< -2?'слева':'впереди'));}
     else hud.notify('ЭМП: сигнал не обнаружен');
    }else hud.notify('Радар перезаряжается');
   }
   if(e.code==='KeyE'){
    const note=notes.nearest(camera.position,3.6);
    if(note){
     hud.notify(notes.collect(note));state.notesFound=notes.count;hud.update(state);save.save(state);
     if(state.notesFound===10){scene.getTransformNodeByName('police-car')?.setEnabled(true);hud.notify('Все записки собраны. Полицейская машина появилась у дороги!');}
    }else if(!state.substationPowered&&Vector3.Distance(camera.position,new Vector3(26,1,42))<4.5){
     state.substationPowered=true;hud.notify('Подстанция запущена. Перезарядка гаджетов ускорена.');
    }else if(state.notesFound>=10&&Vector3.Distance(camera.position,new Vector3(0,1,3))<5.5){
     state.phase='won';if(menu)menu.style.display='flex';const title=document.getElementById('menu-title');if(title)title.textContent='Вы спаслись';if(start)start.textContent='Играть снова';
    }
   }
  });
  document.addEventListener('keyup',(e)=>{if(e.code==='ShiftLeft'||e.code==='ShiftRight')sprinting=false;});
  scene.onBeforeRenderObservable.add(()=>{
   const now=performance.now(),dt=Math.min((now-previous)/1000,.05);previous=now;
   if(fps)fps.textContent='FPS: '+Math.round(engine.getFps());
   if(state.phase!=='playing')return;
   if(sprinting&&state.stamina>0){state.stamina=Math.max(0,state.stamina-dt*25);camera.speed=.39;}
   else{state.stamina=Math.min(100,state.stamina+dt*(state.substationPowered?22:15));camera.speed=.22;}
   const note=notes.nearest(camera.position,3.6);
   hud.showInteraction(note?'[E] Прочитать записку':(!state.substationPowered&&Vector3.Distance(camera.position,new Vector3(26,1,42))<4.5?'[E] Включить подстанцию':(state.notesFound>=10&&Vector3.Distance(camera.position,new Vector3(0,1,3))<5.5?'[E] Уехать на полицейской машине':'')));
   monster.update(dt,now,state.flashlightOn,sprinting);
   const distance=Vector3.Distance(monster.mesh.position,camera.position);
   if(distance<1.15&&monster.mode==='chase'){state.health-=dt*35;if(state.health<=0){state.phase='lost';if(menu)menu.style.display='flex';const title=document.getElementById('menu-title');if(title)title.textContent='Вас настиг Вендиго';}}
   if(state.radarUntil>now&&now>state.radarReadyAt-10000){/* radar pulse window */}
   if(camera.position.y< -5){state.phase='lost';if(menu)menu.style.display='flex';}
  });
  engine.runRenderLoop(()=>scene.render());
  if(import.meta.env.DEV)Object.assign(window,{__ponrBabylon:{engine,scene,camera,state,notes,monster,audio,assets,gadgets}});
  window.addEventListener('beforeunload',()=>{save.save(state);gadgets.dispose();monster.dispose();audio.dispose();scene.dispose();engine.dispose();});
 }catch(error){console.error(error);fatal('Не удалось запустить Babylon.js. Проверьте поддержку WebGL и обновите браузер.');}
}
bootstrap();
