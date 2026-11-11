import '../styles.css';
import { Color3, DefaultRenderingPipeline, Vector3 } from '@babylonjs/core';
import { createEngine } from './engine/createEngine';
import { createWorld } from './world/createWorld';
import { createPlayer } from './player/createPlayer';
import { AudioManager } from './audio/AudioManager';
import { AssetLoader } from './assets/AssetLoader';
import { createGameState } from './game/GameState';
import { NotesManager } from './game/NotesManager';
import { Gadgets } from './game/Gadgets';
import { FirstPersonEquipment } from './game/FirstPersonEquipment';
import { SaveManager } from './game/SaveManager';
import { GameSettings } from './game/GameSettings';
import { Monster } from './entities/Monster';
import { Phantom } from './entities/Phantom';
import { Jumpscare } from './entities/Jumpscare';
import { Hud } from './ui/Hud';

function fatal(message: string): void {
  const el = document.getElementById('error-box');
  if (el) { el.textContent = message; el.style.display = 'flex'; }
}

function bootstrap(): void {
  try {
    const { engine, scene, canvas } = createEngine();
    const worldLayout = createWorld(scene);
    const camera = createPlayer(scene, canvas);
    const pipeline = new DefaultRenderingPipeline('ponr-postprocess', true, scene, [camera]);
    pipeline.bloomEnabled = true; pipeline.bloomThreshold = .72; pipeline.bloomWeight = .75; pipeline.bloomKernel = 64;
    pipeline.fxaaEnabled = true; pipeline.imageProcessingEnabled = false;
    const state = createGameState();
    const notes = new NotesManager(scene, worldLayout);
    const gadgets = new Gadgets(scene, camera, state);
    const monster = new Monster(scene, camera, worldLayout.terrainHeight, worldLayout.textures);
    const equipment = new FirstPersonEquipment(scene, camera, state, notes, monster, worldLayout);
    state.flashlightOn = gadgets.toggleFlashlight();
    equipment.setFlashlight(state.flashlightOn);
    const phantom = new Phantom(scene, camera);
    const jumpscare = new Jumpscare(scene, camera);
    const audio = new AudioManager(scene);
    const settings = new GameSettings(engine, camera, audio, pipeline);
    const assets = new AssetLoader(scene);
    const save = new SaveManager();
    const hud = new Hud();
    const menu = document.getElementById('menu');
    const start = document.getElementById('start-btn');
    const title = document.getElementById('menu-title');
    const fps = document.getElementById('fps-counter');
    const layer = document.getElementById('ui-layer');

    let previous = performance.now();
    let elapsed = 0;
    let sprinting = false;
    let jumpVelocity = 0;
    let grounded = true;
    let monsterSpawned = false;
    let scareResolved = false;
    let flashPulseUntil = 0;
    let twigCooldown = 0;
    let lastMonsterMode = monster.mode;
    const previousPlayerPosition = camera.position.clone();

    const saved = save.load();
    if (saved) {
      state.health = saved.health ?? 100;
      state.stamina = saved.stamina ?? 100;
      state.substationPowered = saved.substationPowered ?? false;
      if (state.substationPowered) worldLayout.activateSubstation();
      notes.restore(saved.notesFound ?? 0);
      state.notesFound = notes.count;
      if (state.notesFound >= 10) worldLayout.spawnPoliceCar();
      hud.update(state);
    }

    const showMenu = (heading: string, button: string): void => {
      audio.suspend();
      if (menu) menu.style.display = 'flex';
      if (title) title.textContent = heading;
      if (start) start.textContent = button;
      if (layer) layer.style.display = 'none';
    };
    const startGame = (): void => {
      if (state.phase === 'won' || state.phase === 'lost') window.location.reload();
      state.phase = 'playing';
      if (menu) menu.style.display = 'none';
      if (layer) layer.style.display = 'block';
      canvas.requestPointerLock?.();
      canvas.focus();
      void audio.unlock().then(() => { if (state.notesFound >= 10) audio.startSiren(); });
      audio.startAmbience();
    };
    start?.addEventListener('click', startGame);

    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement !== canvas && state.phase === 'playing' && !jumpscare.active) {
        state.phase = 'paused';
        audio.setFootsteps(false, false); audio.setHeartbeat(false);
        showMenu('Пауза', 'Продолжить');
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' && state.phase === 'playing') {
        state.phase = 'paused';
        showMenu('Пауза', 'Продолжить');
        return;
      }
      if (state.phase !== 'playing' || e.repeat) return;
      const now = performance.now();
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') sprinting = true;
      if (e.code === 'Space' && grounded) { jumpVelocity = 10.8; grounded = false; e.preventDefault(); }
      if (e.code === 'KeyF') {
        state.flashlightOn = gadgets.toggleFlashlight();
        equipment.setFlashlight(state.flashlightOn);
        hud.notify(state.flashlightOn ? 'Фонарик включён — Вендиго может заметить свет' : 'Фонарик выключен');
      }
      if (e.code === 'KeyR') {
        if (gadgets.flashbang(now)) {
          flashPulseUntil = now + 180;
          hud.flashScreen();
          audio.playEvent('flash', .9);
          if (Vector3.Distance(monster.mesh.position, camera.position) < 28) {
            monster.stun(4);
            audio.playEvent('roar', .8);
            hud.notify('Вспышка ослепила Вендиго — бегите!');
          } else hud.notify('Фотовспышка сработала');
        } else hud.notify('Фотовспышка перезаряжается');
      }
      if (e.code === 'KeyQ') {
        if (gadgets.radar(now)) {
          const nearestNote = notes.nearest(camera.position, 100);
          const monsterDistance = monster.mesh.isEnabled() ? Vector3.Distance(camera.position, monster.mesh.position) : Infinity;
          let target: Vector3 | undefined;
          let signal = '';
          if (state.notesFound < 10 && monsterDistance < 100 && (!nearestNote || monsterDistance < Vector3.Distance(camera.position, nearestNote.mesh.position))) {
            target = monster.mesh.position;
            signal = 'КРАСНАЯ МЕТКА · ВЕНДИГО';
          } else if (state.notesFound >= 10) {
            target = worldLayout.policeCarPosition();
            signal = 'СИНЯЯ МЕТКА · МАШИНА';
          } else if (nearestNote) {
            target = nearestNote.mesh.position;
            signal = 'ЗЕЛЁНАЯ МЕТКА · ЗАПИСКА';
          }
          if (target) {
            const delta = target.subtract(camera.position);
            const forward = camera.getForwardRay().direction.clone(); forward.y = 0; forward.normalize();
            const right = new Vector3(forward.z, 0, -forward.x);
            const direction = delta.clone(); direction.y = 0; direction.normalize();
            const facing = Vector3.Dot(forward, direction);
            const side = Vector3.Dot(right, direction);
            const bearing = facing < -.5 ? 'ПОЗАДИ' : side > .35 ? 'СПРАВА' : side < -.35 ? 'СЛЕВА' : 'ВПЕРЕДИ';
            hud.notify('ЭМП: ' + signal + ' · ' + Math.round(delta.length()) + ' м · ' + bearing, 3000);
          } else hud.notify('ЭМП: сигнал не обнаружен');
        } else hud.notify('Радар перезаряжается');
      }
      if (e.code === 'KeyE') {
        const note = notes.nearest(camera.position, 3.6, camera.getForwardRay().direction);
        if (note) {
          hud.notify(notes.collect(note), 5200);
          audio.playEvent('twig', .2);
          state.notesFound = notes.count;
          hud.update(state);
          save.save(state);
          if (state.notesFound === 10) {
            worldLayout.spawnPoliceCar();
            audio.startSiren();
            hud.notify('Все десять записок собраны. Ищите полицейскую сирену на окраине!', 5000);
          }
        } else if (!state.substationPowered && Vector3.Distance(camera.position, new Vector3(-88.5, worldLayout.terrainHeight(-92, -65) + 1.6, -65)) < 4.5) {
          state.substationPowered = true;
          worldLayout.activateSubstation();
          save.save(state);
          hud.notify('Подстанция запущена. Прожекторы города включены, радар перезаряжается быстрее.');
        } else if (state.notesFound >= 10 && Vector3.Distance(camera.position, worldLayout.policeCarPosition()) < 5.5) {
          state.phase = 'won';
          showMenu('Вы спаслись', 'Играть снова');
        }
      }
    });
    document.addEventListener('keyup', (e) => {
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') sprinting = false;
    });

    scene.onBeforeRenderObservable.add(() => {
      const now = performance.now();
      const dt = Math.min((now - previous) / 1000, .05);
      previous = now;
      if (fps) fps.textContent = 'FPS: ' + Math.round(engine.getFps());
      if (state.phase !== 'playing') { audio.setFootsteps(false, false); audio.setHeartbeat(false); return; }

      elapsed += dt;
      const dayProgress = Math.min(elapsed / 45, 1);
      const isNight = dayProgress >= 1;
      worldLayout.updateAtmosphere(dt, dayProgress, camera.position);
      gadgets.update(dt, now);
      if (isNight && !monsterSpawned) { monster.spawn(camera.position); monsterSpawned = true; audio.playEvent('roar', .7); }

      const canSprint = sprinting && state.stamina > 0;
      if (canSprint) state.stamina = Math.max(0, state.stamina - dt * 25);
      else state.stamina = Math.min(100, state.stamina + dt * (state.substationPowered ? 30 : 15));
      camera.speed = canSprint ? 20 : 7.8;

      // Explicit jump arc is layered over Babylon's collision-enabled first-person camera.
      if (!grounded || jumpVelocity > 0) {
        jumpVelocity -= 26 * dt;
        camera.position.y += jumpVelocity * dt;
        const floorY = worldLayout.terrainHeight(camera.position.x, camera.position.z) + 2.0;
        if (camera.position.y <= floorY) { camera.position.y = floorY; jumpVelocity = 0; grounded = true; }
      }

      if (grounded) camera.position.y = worldLayout.terrainHeight(camera.position.x, camera.position.z) + 2.0;
      const note = notes.nearest(camera.position, 3.6, camera.getForwardRay().direction);
      const nearStation = !state.substationPowered && Vector3.Distance(camera.position, new Vector3(-88.5, worldLayout.terrainHeight(-92, -65) + 1.6, -65)) < 4.5;
      const nearCar = state.notesFound >= 10 && Vector3.Distance(camera.position, worldLayout.policeCarPosition()) < 5.5;
      hud.showInteraction(note ? '[E] Прочитать записку' : nearStation ? '[E] Включить подстанцию' : nearCar ? '[E] Уехать на полицейской машине' : '');
      const dx = camera.position.x - previousPlayerPosition.x;
      const dz = camera.position.z - previousPlayerPosition.z;
      const isMoving = grounded && dx * dx + dz * dz > .0008;
      previousPlayerPosition.copyFrom(camera.position);
      twigCooldown = Math.max(0, twigCooldown - dt);
      let playerNoise = isMoving ? (canSprint ? 2 : 1) : 0;
      if (isMoving && canSprint && Math.abs(camera.position.x) > 38 && twigCooldown <= 0 && Math.random() < .25) {
        playerNoise = 3; twigCooldown = 4; audio.playEvent('twig', .85);
      }
      const inForest = Math.abs(camera.position.x) > 38 || Math.abs(camera.position.z) > 210;
      audio.setFootsteps(isMoving, canSprint, inForest);
      equipment.update(dt, now, isMoving, canSprint, camera.position, camera.getForwardRay().direction);
      monster.update(dt, now, state.flashlightOn, canSprint, playerNoise);
      if (monster.mode !== lastMonsterMode) {
        if (monster.mode === 'chase') { audio.playEvent('roar', .9); audio.setChaseState(true); }
        else if (lastMonsterMode === 'chase') audio.setChaseState(false);
        if (monster.mode === 'investigate_sound' || monster.mode === 'investigate_light') audio.playEvent('twig', .45);
        lastMonsterMode = monster.mode;
      }
      const closeToMonster = monster.mesh.isEnabled() && Vector3.Distance(camera.position, monster.mesh.position) < 18;
      audio.setHeartbeat(closeToMonster && monster.mode === 'chase');
      if (phantom.update(dt, isNight, camera.position)) audio.playEvent('whisper', .7);

      audio.setSirenVolume(worldLayout.updatePoliceCar(now, camera.position));
      const distance = Vector3.Distance(monster.mesh.position, camera.position);
      if (!jumpscare.active && monster.mode === 'chase' && distance < 2.3) {
        jumpscare.start();
        audio.playEvent('jumpscare', 1);
        monster.mesh.setEnabled(false);
      }
      if (jumpscare.active && jumpscare.update(dt) && !scareResolved) {
        scareResolved = true;
        state.health = 0;
        state.phase = 'lost';
        showMenu('Вендиго настиг вас', 'Попробовать снова');
      }
      if (camera.position.y < -5) {
        state.health = 0; state.phase = 'lost';
        showMenu('Вы погибли', 'Попробовать снова');
      }
      if (now > flashPulseUntil) { /* flash pulse is intentionally brief */ }
      hud.update(state, monster.mesh.isEnabled() ? monster.mode : undefined, monster.mesh.isEnabled() ? Vector3.Distance(camera.position, monster.mesh.position) : undefined, playerNoise);
    });

    engine.runRenderLoop(() => scene.render());
    if (import.meta.env.DEV) Object.assign(window, { __ponrBabylon: { engine, scene, camera, state, notes, monster, phantom, jumpscare, audio, assets, gadgets, settings, equipment, pipeline } });
    window.addEventListener('beforeunload', () => {
      save.save(state); equipment.dispose(); gadgets.dispose(); monster.dispose(); phantom.dispose(); jumpscare.dispose();
      audio.dispose(); pipeline.dispose(); scene.dispose(); engine.dispose();
    });
  } catch (error) {
    console.error(error);
    fatal('Не удалось запустить Babylon.js. Проверьте поддержку WebGL и обновите браузер.');
  }
}
bootstrap();
