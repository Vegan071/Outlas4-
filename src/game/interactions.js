// Что игрок видит перед собой и что происходит по нажатию [E].

import * as THREE from 'three';
import { NOTE_TEXTS, POI } from '../config.js';
import { ctx, game, getPlayer, world } from '../state.js';
import { playSound } from '../core/audio.js';
import { activateSubstationVisuals } from '../world/pois.js';
import { collectNote } from '../world/notes.js';
import { police, spawnPoliceCar } from '../entities/policeCar.js';
import { endGame } from './session.js';
import * as hud from '../ui/hud.js';

let target = null; // { type: 'police' | 'substation' | 'note', note? }

const camForward = new THREE.Vector3();
const dirToNote = new THREE.Vector3();

function findTarget(player) {
  if (police.car && player.position.distanceTo(police.car.position) < 5.5) {
    return { type: 'police' };
  }

  if (!game.substationPowered) {
    const d = Math.hypot(player.position.x - (POI.substation.x + 3.5), player.position.z - POI.substation.z);
    if (d < 4.2) return { type: 'substation' };
  }

  camForward.set(0, 0, -1).applyQuaternion(ctx.camera.quaternion);
  for (const note of world.notes) {
    if (note.collected) continue;
    if (player.position.distanceTo(note.position) >= 3.6) continue;
    dirToNote.subVectors(note.position, ctx.camera.position).normalize();
    if (camForward.dot(dirToNote) > 0.78) return { type: 'note', note };
  }
  return null;
}

const PROMPTS = {
  police: 'Нажмите [E] чтобы уехать на патрульной машине!',
  substation: 'Нажмите [E] чтобы включить рубильник подстанции (220В)',
  note: 'Нажмите [E] чтобы забрать записку',
};

export function updateInteraction() {
  target = findTarget(getPlayer());
  hud.setInteraction(target ? PROMPTS[target.type] : null);
}

export function interact() {
  if (!game.active || game.jumpscare || !ctx.controls.isLocked || !target) return;

  switch (target.type) {
    case 'police':
      endGame(true);
      break;

    case 'substation':
      game.substationPowered = true;
      playSound('flashbang');
      activateSubstationVisuals();
      hud.setSubstationStatus(true);
      hud.showSystemMsg('⚡ ПОДСТАНЦИЯ ЗАПУЩЕНА! Улицы освещены, перезарядка гаджетов ускорена в 2 раза!', 5500);
      break;

    case 'note':
      pickUpNote(target.note);
      break;
  }
}

function pickUpNote(note) {
  collectNote(note);
  target = null;
  game.notesCollected++;
  playSound('pickup');
  hud.setNoteCounter(game.notesCollected, game.totalNotes);
  hud.setInteraction(null);
  hud.showNoteLore(NOTE_TEXTS[Math.min(game.notesCollected - 1, NOTE_TEXTS.length - 1)]);

  if (game.notesCollected >= game.totalNotes) {
    hud.showSystemMsg('🚨 ВСЕ ЗАПИСКИ СОБРАНЫ! СМОТРИТЕ НА СИНЮЮ ТОЧКУ РАДАРА И СЛУШАЙТЕ СИРЕНУ!', 6500);
    spawnPoliceCar();
  }
}
