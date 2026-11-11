import '../styles.css';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { createEngine } from './engine/createEngine';
import { createWorld } from './world/createWorld';
import { createPlayer } from './player/createPlayer';
import { AudioManager } from './audio/AudioManager';
import { AssetLoader } from './assets/AssetLoader';
import { createGameState } from './game/GameState';
import { NotesManager } from './game/NotesManager';
import { Gadgets } from './game/Gadgets';
import { SaveManager } from './game/SaveManager';
import { Monster } from './entities/Monster';
import { Hud } from './ui/Hud';

function showFatalError(message:string):void {
  const box=document.getElementById('error-box');
  if(box){box.textContent=message;box.style.display='flex';}
}
function bootstrap():void {
  try {
    const {engine,scene,canvas}=createEngine();
    createWorld(scene);
    const camera=createPlayer(scene,canvas);
    const state=createGameState();
    const notes=new NotesManager(scene);
    const gadgets=new Gadgets(scene,camera,state);
    const monster=new Monster(scene,camera);
    const audio=new AudioManager(scene);
    const assets=new AssetLoader(scene);
    const save=new SaveManager();
    const hud=new Hud();
    const menu=document.getElementById('menu');
    const start=document.getElementById('start-btn');
    const fps=document.getElementById('fps-counter');
    let previous=performance.now();
    const startGame=():void=>{
      state.phase='playing';
      if(menu)menu.style.display='none';
      canvas.requestPointerLock?.();
      canvas.focus();
    };
    start?.addEventListener('click',startGame);
    document.addEventListener('pointerlockchange',()=>{
      if(document.pointerLockElement!==canvas&&state.phase==='playing'){
        state.phase='paused';if(menu)menu.style.display='flex';
        const title=document.getElementById('menu-title');if(title)title.textContent='Пауза';
        if(start)start.textContent='Продолжить';
      }
    });
    document.addEventListener('keydown',(event)=>{
      if(event.code==='Escape'&&state.phase==='playing'){state.phase='paused';if(menu)menu.style.display='flex';}
      if(state.phase!=='playing')return;
      const now=performance.now();
      if(event.code==='KeyF'){state.flashlightOn=gadgets.toggleFlashlight();hud.notify(state.flashlightOn?'Фонарик включён':'Фонарик выключен');}
      if(event.code==='KeyR'){if(gadgets.flashbang(now)){monster.stun(4);hud.notify('Вспышка! Вендиго ослеплён');}else hud.notify('Фотовспышка перезаряжается');}
      if(event.code==='KeyQ'){if(gadgets.radar(now))hud.notify('ЭМП-радар активирован');else hud.notify('Радар перезаряжается');}
      if(event.code==='KeyE'){
        const note=notes.nearest(camera.position);
        if(note){const text=notes.collect(note);state.notesFound=notes.count;hud.update(state);hud.notify(text);save.save(state);}
        else if(camera.position.length()<5&&state.notesFound>=10){state.phase='won';hud.notify('Вы добрались до машины. Победа!');if(menu)menu.style.display='flex';}
      }
    });
    scene.onBeforeRenderObservable.add(()=>{
      const now=performance.now(),dt=Math.min((now-previous)/1000,.05);previous=now;
      if(fps)fps.textContent='FPS: '+Math.round(engine.getFps());
      if(state.phase==='playing'){
        if(camera.position.y< -5){state.health=0;state.phase='lost';if(menu)menu.style.display='flex';}
        const note=notes.nearest(camera.position);
        hud.showInteraction(note?'[E] Прочитать записку':'');
        monster.update(dt,now,state.flashlightOn);
        if(Vector3.Distance(monster.mesh.position,camera.position)<1.15){
          state.health-=dt*35;
          if(state.health<=0){state.phase='lost';if(menu)menu.style.display='flex';hud.notify('Вендиго настиг вас. Попробуйте ещё раз.');}
        }
        if(now>state.messageUntil&&hud) { /* transient messages are replaced by proximity prompts */ }
        if(state.radarUntil>now){
          const direction=monster.mesh.position.subtract(camera.position);
          hud.notify('ЭМП: цель '+Math.round(direction.length())+' м');
        }
      }
    });
    engine.runRenderLoop(()=>scene.render());
    if(import.meta.env.DEV)Object.assign(window,{__ponrBabylon:{engine,scene,camera,state,notes,monster,audio,assets,gadgets}});
    window.addEventListener('beforeunload',()=>{save.save(state);gadgets.dispose();monster.dispose();audio.dispose();scene.dispose();engine.dispose();});
  } catch(error){console.error(error);showFatalError('Не удалось запустить Babylon.js. Проверьте поддержку WebGL и обновите браузер.');}
}
bootstrap();
