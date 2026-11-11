import '../styles.css';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { createEngine } from './engine/createEngine';
import { createWorld } from './world/createWorld';
import { createPlayer } from './player/createPlayer';
import { AudioManager } from './audio/AudioManager';
import { AssetLoader } from './assets/AssetLoader';

function showFatalError(message: string): void {
  const box = document.getElementById('error-box');
  if (!box) return;
  box.textContent = message;
  box.style.display = 'flex';
}

function bootstrap(): void {
  try {
    const { engine, scene, canvas } = createEngine();
    createWorld(scene);
    const camera = createPlayer(scene, canvas);
    const audio = new AudioManager(scene);
    const assets = new AssetLoader(scene);

    const menu = document.getElementById('menu');
    const startButton = document.getElementById('start-btn');
    const fps = document.getElementById('fps-counter');
    const noteCounter = document.getElementById('note-counter');
    const interaction = document.getElementById('interaction-text');
    let started = false;

    startButton?.addEventListener('click', () => {
      started = true;
      if (menu) menu.style.display = 'none';
      canvas.requestPointerLock?.();
      canvas.focus();
      const ui = document.getElementById('ui-layer');
      if (ui) ui.style.display = 'block';
    });

    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement !== canvas && started) {
        if (menu) menu.style.display = 'flex';
      } else if (document.pointerLockElement === canvas) {
        if (menu) menu.style.display = 'none';
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.code === 'Escape' && started && menu) menu.style.display = 'flex';
      if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') camera.speed = 0.38;
    });
    document.addEventListener('keyup', (event) => {
      if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') camera.speed = 0.22;
    });

    scene.onBeforeRenderObservable.add(() => {
      if (fps) fps.textContent = 'FPS: ' + Math.round(engine.getFps());
      const noteExists = scene.getMeshByName('test-note') !== null;
      const nearNote = noteExists && camera.position.subtract(new Vector3(0, 0.65, 5)).length() < 2.1;
      if (interaction) {
        interaction.textContent = nearNote ? '[E] Осмотреть записку' : '';
        interaction.style.display = nearNote ? 'block' : 'none';
      }
    });

    document.addEventListener('keydown', (event) => {
      const noteExists = scene.getMeshByName('test-note') !== null;
      const nearNote = noteExists && camera.position.subtract(new Vector3(0, 0.65, 5)).length() < 2.1;
      if (started && event.code === 'KeyE' && nearNote) {
        const note = scene.getMeshByName('test-note');
        if (note) {
          note.dispose();
          if (noteCounter) noteCounter.textContent = 'Записки: 1 / 10';
          if (interaction) interaction.textContent = 'Записка найдена';
        }
      }
    });

    engine.runRenderLoop(() => scene.render());

    if (import.meta.env.DEV) {
      Object.assign(window, { __ponrBabylon: { engine, scene, camera, audio, assets } });
    }

    window.addEventListener('beforeunload', () => {
      audio.dispose();
      scene.dispose();
      engine.dispose();
    });
  } catch (error) {
    console.error(error);
    showFatalError('Не удалось запустить Babylon.js. Проверьте поддержку WebGL и обновите браузер.');
  }
}

bootstrap();
