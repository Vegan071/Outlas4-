import '../styles.css';
import { Color3, Vector3 } from '@babylonjs/core';
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
    createWorld(scene);
    const camera = createPlayer(scene, canvas);
    const state = createGameState();
    const notes = new NotesManager(scene);
    const gadgets = new Gadgets(scene, camera, state);
    const monster = new Monster(scene, camera);
    const phantom = new Phantom(scene, camera);
    const jumpscare = new Jumpscare(scene, camera);
    const audio = new AudioManager(scene);
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
    let lastMonsterMode = monster.mode;
    const previousPlayerPosition = camera.position.clone();

    const saved = save.load();
    if (saved) {
      state.health = saved.health ?? 100;
      state.stamina = saved.stamina ?? 100;
      notes.restore(saved.notesFound ?? 0);
      state.notesFound = notes.count;
      if (state.notesFound >= 10) scene.getTransformNodeByName('police-car')?.setEnabled(true);
      hud.update(state);
    }

    const showMenu = (heading: string, button: string): void => {
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
      void audio.unlock();
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
      if (e.code === 'Space' && grounded) { jumpVelocity = 6.4; grounded = false; e.preventDefault(); }
      if (e.code === 'KeyF') {
        state.flashlightOn = gadgets.toggleFlashlight();
        hud.notify(state.flashlightOn ? 'Фонарик включён — Вендиго может заметить свет' : 'Фонарик выключен');
      }
      if (e.code === 'KeyR') {
        if (gadgets.flashbang(now)) {
          flashPulseUntil = now + 180;
          audio.playEvent('flash', .9);
          if (Vector3.Distance(monster.mesh.position, camera.position) < 22) {
            monster.stun(4);
            audio.playEvent('roar', .8);
            hud.notify('Вспышка ослепила Вендиго — бегите!');
          } else hud.notify('Фотовспышка сработала');
        } else hud.notify('Фотовспышка перезаряжается');
      }
      if (e.code === 'KeyQ') {
        if (gadgets.radar(now)) {
          const target = state.notesFound >= 10
            ? scene.getTransformNodeByName('police-car')?.position
            : notes.nearest(camera.position, 100)?.mesh.position;
          if (target) {
            const delta = target.subtract(camera.position);
            hud.notify('ЭМП: ' + Math.round(delta.length()) + ' м · ' + (delta.x > 2 ? 'справа' : delta.x < -2 ? 'слева' : 'впереди'));
          } else hud.notify('ЭМП: сигнал не обнаружен');
        } else hud.notify('Радар перезаряжается');
      }
      if (e.code === 'KeyE') {
        const note = notes.nearest(camera.position, 3.6);
        if (note) {
          hud.notify(notes.collect(note), 5200);
          audio.playEvent('twig', .2);
          state.notesFound = notes.count;
          hud.update(state);
          save.save(state);
          if (state.notesFound === 10) {
            scene.getTransformNodeByName('police-car')?.setEnabled(true);
            hud.notify('Все десять записок собраны. Полицейская машина ждёт у дороги!', 5000);
          }
        } else if (!state.substationPowered && Vector3.Distance(camera.position, new Vector3(-87, 1, -61)) < 4.5) {
          state.substationPowered = true;
          hud.notify('Подстанция запущена. Зарядка гаджетов ускорена.');
        } else if (state.notesFound >= 10 && Vector3.Distance(camera.position, new Vector3(0, 1, 28)) < 5.5) {
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
      const isNight = elapsed > 45;
      const ambient = scene.getLightByName('night-ambient');
      if (ambient) ambient.intensity = isNight ? .22 : .52;
      scene.fogDensity = isNight ? .011 : .0045;
      scene.fogColor = isNight ? new Color3(.018, .025, .04) : new Color3(.12, .105, .09);
      if (isNight && !monsterSpawned) { monster.spawn(camera.position); monsterSpawned = true; audio.playEvent('roar', .7); }

      const canSprint = sprinting && state.stamina > 0;
      if (canSprint) state.stamina = Math.max(0, state.stamina - dt * 25);
      else state.stamina = Math.min(100, state.stamina + dt * (state.substationPowered ? 22 : 15));
      camera.speed = canSprint ? .39 : .22;

      // Explicit jump arc is layered over Babylon's collision-enabled first-person camera.
      if (!grounded || jumpVelocity > 0) {
        jumpVelocity -= 15 * dt;
        camera.position.y += jumpVelocity * dt;
        if (camera.position.y <= 1.8) { camera.position.y = 1.8; jumpVelocity = 0; grounded = true; }
      }

      const note = notes.nearest(camera.position, 3.6);
      const nearStation = !state.substationPowered && Vector3.Distance(camera.position, new Vector3(26, 1, 42)) < 4.5;
      const nearCar = state.notesFound >= 10 && Vector3.Distance(camera.position, new Vector3(0, 1, 3)) < 5.5;
      hud.showInteraction(note ? '[E] Прочитать записку' : nearStation ? '[E] Включить подстанцию' : nearCar ? '[E] Уехать на полицейской машине' : '');
      const movedDistance = Vector3.DistanceSquared(camera.position, previousPlayerPosition);
      const isMoving = movedDistance > .0008;
      previousPlayerPosition.copyFrom(camera.position);
      const playerNoise = isMoving ? (canSprint ? 3 : 1) : 0;
      audio.setFootsteps(isMoving, canSprint);
      monster.update(dt, now, state.flashlightOn, canSprint, playerNoise);
      if (monster.mode !== lastMonsterMode) {
        if (monster.mode === 'chase') audio.playEvent('roar', .9);
        if (monster.mode === 'investigate_sound' || monster.mode === 'investigate_light') audio.playEvent('twig', .45);
        lastMonsterMode = monster.mode;
      }
      const closeToMonster = monster.mesh.isEnabled() && Vector3.Distance(camera.position, monster.mesh.position) < 18;
      audio.setHeartbeat(closeToMonster && monster.mode === 'chase');
      if (phantom.update(dt, isNight, camera.position)) audio.playEvent('whisper', .7);

      const distance = Vector3.Distance(monster.mesh.position, camera.position);
      if (!jumpscare.active && monster.mode === 'chase' && distance < 2.2) {
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
      hud.update(state);
      if (state.radarUntil > now) hud.notify('ЭМП-радар активен', 150);
    });

    engine.runRenderLoop(() => scene.render());
    if (import.meta.env.DEV) Object.assign(window, { __ponrBabylon: { engine, scene, camera, state, notes, monster, phantom, jumpscare, audio, assets, gadgets } });
    window.addEventListener('beforeunload', () => {
      save.save(state); gadgets.dispose(); monster.dispose(); phantom.dispose(); jumpscare.dispose();
      audio.dispose(); scene.dispose(); engine.dispose();
    });
  } catch (error) {
    console.error(error);
    fatal('Не удалось запустить Babylon.js. Проверьте поддержку WebGL и обновите браузер.');
  }
}
bootstrap();
