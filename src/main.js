import './styles.css';
import { loadSettings } from './core/settings.js';
import { generateProceduralTextures } from './core/textures.js';
import { createRenderer } from './core/renderer.js';
import { initInput } from './core/input.js';
import { setupLights } from './world/lighting.js';
import { initMenu } from './ui/menu.js';
import { ctx } from './state.js';
import { jump } from './game/player.js';
import { interact } from './game/interactions.js';
import { toggleFlashlight, triggerFlashbang, triggerRadarPing } from './game/gadgets.js';
import { initSession, startOrResume } from './game/session.js';
import { startLoop } from './game/loop.js';

function showFatalError(message) {
  const box = document.getElementById('error-box');
  box.textContent = message;
  box.style.display = 'flex';
}

function bootstrap() {
  loadSettings();

  try {
    generateProceduralTextures();
    createRenderer();
  } catch (err) {
    console.error(err);
    showFatalError('Не удалось запустить WebGL. Включите аппаратное ускорение в браузере или попробуйте другой браузер.');
    return;
  }

  setupLights();

  initMenu({ onPrimary: startOrResume });

  initInput({
    jump,
    interact,
    flashlight: toggleFlashlight,
    flashbang: triggerFlashbang,
    radar: triggerRadarPing,
    pause: () => ctx.controls.isLocked && ctx.controls.unlock(),
  });

  initSession();
  startLoop();

  // Отладочный доступ из консоли (в продакшен-сборку не попадает)
  if (import.meta.env.DEV) {
    Promise.all([import('./state.js')]).then(([state]) => { window.__ponr = state; });
  }
}

bootstrap();
