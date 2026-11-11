import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { Color4 } from '@babylonjs/core/Maths/math.color';

export interface Runtime {
  engine: Engine;
  scene: Scene;
  canvas: HTMLCanvasElement;
}

export function createEngine(): Runtime {
  const canvas = document.createElement('canvas');
  canvas.id = 'game-canvas';
  canvas.setAttribute('aria-label', 'Игровая сцена Point of No Return');
  Object.assign(canvas.style, {
    position: 'fixed', inset: '0', zIndex: '0', width: '100%',
    height: '100%', outline: 'none', touchAction: 'none',
  });
  document.body.prepend(canvas);

  const engine = new Engine(canvas, true, {
    preserveDrawingBuffer: false,
    stencil: true,
    adaptToDeviceRatio: true,
  });

  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.012, 0.018, 0.025, 1);
  scene.collisionsEnabled = true;

  window.addEventListener('resize', () => engine.resize());
  return { engine, scene, canvas };
}
