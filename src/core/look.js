// Свои контролы взгляда вместо PointerLockControls из three r128.
//
// Зачем:
//  1. requestPointerLock({ unadjustedMovement: true }) отключает акселерацию мыши в ОС.
//     Из-за неё при низком DPI медленные движения «гасились» (мышь тормозит), а при высоком —
//     всё становилось слишком резким: одно и то же движение руки давало разный поворот.
//  2. Chromium иногда присылает в pointer lock одиночные выбросы movementX/Y (в сотни и тысячи
//     пикселей) — камеру «колбасит» в случайные стороны. Такие события отбрасываем.
//  3. Чувствительность применяется один раз (раньше стандартный обработчик + look.js).

import * as THREE from 'three';
import { settings } from '../state.js';

const BASE = 0.002; // радиан на пиксель при чувствительности 1.0 (как в PointerLockControls)
const HALF_PI = Math.PI / 2;
const MAX_DELTA = 600; // событие с большим сдвигом считаем выбросом и игнорируем

const euler = new THREE.Euler(0, 0, 0, 'YXZ');
const vec = new THREE.Vector3();

const lockEvent = { type: 'lock' };
const unlockEvent = { type: 'unlock' };

export class LookControls extends THREE.EventDispatcher {
  constructor(camera, domElement) {
    super();
    this.camera = camera;
    this.domElement = domElement;
    this.isLocked = false;
    this.rawInput = false; // true, если браузер дал мышь без ускорения ОС

    document.addEventListener('mousemove', (e) => this._onMouseMove(e));
    document.addEventListener('pointerlockchange', () => this._onLockChange());
  }

  _onMouseMove(e) {
    if (!this.isLocked) return;
    const dx = e.movementX || 0;
    const dy = e.movementY || 0;
    if (Math.abs(dx) > MAX_DELTA || Math.abs(dy) > MAX_DELTA) return;

    const k = BASE * settings.sens;
    euler.setFromQuaternion(this.camera.quaternion);
    euler.y -= dx * k;
    euler.x -= dy * k;
    euler.x = Math.max(-HALF_PI, Math.min(HALF_PI, euler.x));
    this.camera.quaternion.setFromEuler(euler);
  }

  _onLockChange() {
    if (document.pointerLockElement === this.domElement) {
      this.isLocked = true;
      this.dispatchEvent(lockEvent);
    } else {
      this.isLocked = false;
      this.dispatchEvent(unlockEvent);
    }
  }

  /** Захват курсора. Сначала просим сырой ввод, если не поддерживается — обычный захват */
  lock() {
    const el = this.domElement;
    let request;
    try {
      request = el.requestPointerLock({ unadjustedMovement: true });
    } catch {
      request = undefined;
    }

    if (request && typeof request.then === 'function') {
      request.then(
        () => { this.rawInput = true; },
        (err) => {
          // NotSupportedError: платформа не умеет сырой ввод (например, часть Linux/macOS)
          this.rawInput = false;
          if (err && err.name === 'NotSupportedError') el.requestPointerLock();
        },
      );
    } else {
      // Firefox и старые браузеры: опции игнорируются, промиса нет
      this.rawInput = false;
    }
  }

  unlock() {
    document.exitPointerLock();
  }

  getObject() {
    return this.camera;
  }

  // Движение строго по горизонтали, независимо от наклона камеры
  moveForward(distance) {
    vec.setFromMatrixColumn(this.camera.matrix, 0);
    vec.crossVectors(this.camera.up, vec);
    this.camera.position.addScaledVector(vec, distance);
  }

  moveRight(distance) {
    vec.setFromMatrixColumn(this.camera.matrix, 0);
    this.camera.position.addScaledVector(vec, distance);
  }
}
