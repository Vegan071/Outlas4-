// Чувствительность мыши.
// В three r128 у PointerLockControls нет pointerSpeed, поэтому добавляем недостающую
// часть поворота сами: стандартный обработчик уже применяет множитель 1.

import * as THREE from 'three';
import { ctx, settings } from '../state.js';

const BASE = 0.002; // тот же коэффициент, что у PointerLockControls
const HALF_PI = Math.PI / 2;
const euler = new THREE.Euler(0, 0, 0, 'YXZ');

export function initLook() {
  document.addEventListener('mousemove', (e) => {
    if (!ctx.controls.isLocked) return;
    const extra = settings.sens - 1;
    if (Math.abs(extra) < 0.001) return;

    const cam = ctx.camera;
    euler.setFromQuaternion(cam.quaternion);
    euler.y -= e.movementX * BASE * extra;
    euler.x -= e.movementY * BASE * extra;
    euler.x = Math.max(-HALF_PI, Math.min(HALF_PI, euler.x));
    cam.quaternion.setFromEuler(euler);
  });
}
