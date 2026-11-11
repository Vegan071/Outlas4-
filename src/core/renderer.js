import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { BodycamShader } from '../shaders/bodycam.js';
import { LookControls } from './look.js';
import { PLAYER } from '../config.js';
import { ctx, game, settings } from '../state.js';

const SUNSET = 0xff7733;
const FAR_NORMAL = 260;
const FAR_LOWSPEC = 200;

const pixelRatio = () => (game.lowSpec ? 1.0 : Math.min(window.devicePixelRatio, 1.35));

/** Создаёт сцену, камеру, рендерер, постпроцессинг и контролы взгляда. Бросает исключение, если нет WebGL. */
export function createRenderer() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SUNSET);
  scene.fog = new THREE.FogExp2(SUNSET, 0.012);

  const camera = new THREE.PerspectiveCamera(74, window.innerWidth / window.innerHeight, 0.1, FAR_NORMAL);
  camera.position.set(0, PLAYER.HEIGHT, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(pixelRatio());
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = false;
  document.body.appendChild(renderer.domElement);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2), 0.75, 0.45, 0.72,
  );
  composer.addPass(bloomPass);
  const bodycamPass = new ShaderPass(BodycamShader);
  composer.addPass(bodycamPass);

  const controls = new LookControls(camera, document.body);
  scene.add(controls.getObject());

  Object.assign(ctx, { scene, camera, renderer, composer, bloomPass, bodycamPass, controls });
  window.addEventListener('resize', onResize);
}

/** Применяет настройки качества (вызывается при старте/продолжении игры) */
export function applyQuality() {
  game.lowSpec = settings.potato;
  game.usePostProcessing = settings.bloom && !settings.potato;
  ctx.renderer.setPixelRatio(pixelRatio());
  ctx.composer.setPixelRatio(pixelRatio());
  ctx.composer.setSize(window.innerWidth, window.innerHeight);
  ctx.camera.far = game.lowSpec ? FAR_LOWSPEC : FAR_NORMAL;
  ctx.camera.updateProjectionMatrix();
}

function onResize() {
  const { camera, renderer, composer } = ctx;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}

export function renderFrame() {
  if (game.usePostProcessing) ctx.composer.render();
  else ctx.renderer.render(ctx.scene, ctx.camera);
}
