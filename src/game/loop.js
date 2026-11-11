// Главный игровой цикл.

import { ctx, game, getPlayer } from '../state.js';
import { renderFrame } from '../core/renderer.js';
import { playSound, swellAmbient } from '../core/audio.js';
import { updateDayCycle, updateNearbyLights } from '../world/lighting.js';
import { updateAsh } from '../world/sky.js';
import { updateBeacon } from '../world/pois.js';
import { drawEmpScreen } from '../entities/empDetector.js';
import { updateHands } from '../entities/hands.js';
import { updatePhantom } from '../entities/phantom.js';
import { updatePoliceCar } from '../entities/policeCar.js';
import { spawnMonster, updateMonster } from '../entities/monsterAI.js';
import { updateJumpscare } from '../entities/jumpscare.js';
import { playerState, updatePlayer } from './player.js';
import { setFlashlight, updateGadgets } from './gadgets.js';
import { updateInteraction } from './interactions.js';
import { endGame } from './session.js';
import * as hud from '../ui/hud.js';

let prevTime = performance.now();
let frames = 0;
let lastFpsTime = prevTime;
let elapsed = 0;
let shownSecond = -1;

export function startLoop() {
  prevTime = performance.now();
  requestAnimationFrame(tick);
}

function tick() {
  requestAnimationFrame(tick);
  const time = performance.now();
  const delta = Math.min((time - prevTime) / 1000, 0.1);
  prevTime = time;

  frames++;
  if (time - lastFpsTime >= 500) {
    hud.setFps(Math.round((frames * 1000) / (time - lastFpsTime)));
    frames = 0;
    lastFpsTime = time;
  }

  if (game.active && ctx.controls.isLocked) update(delta, time);

  if (ctx.bodycamPass) ctx.bodycamPass.uniforms.time.value = time * 0.001;
  renderFrame();
}

function update(delta, time) {
  const player = getPlayer();

  if (updateDayCycle(delta)) startNight(player);
  updateBeacon(time);
  updateNearbyLights(player);
  updateGadgets(delta);

  elapsed += delta;
  const sec = Math.floor(elapsed);
  if (sec !== shownSecond) {
    shownSecond = sec;
    hud.setCamTimer(sec);
  }

  drawEmpScreen(delta, player);

  if (game.jumpscare) {
    if (updateJumpscare(delta)) endGame(false);
    return;
  }

  updatePlayer(delta, time);
  updateHands(delta, playerState.bobTimer);
  updateAsh(delta, player, playerState.groundY);
  updatePhantom(delta, player);
  updateInteraction();
  updatePoliceCar(time, player);
  updateMonster(delta, time, player);
}

function startNight(player) {
  setFlashlight(true);
  spawnMonster(player);
  playSound('spawn');
  swellAmbient();
  hud.showSystemMsg('Наступила ночь. Вендиго вышел на охоту — он слышит шаги и видит луч фонарика!', 5000);
}
