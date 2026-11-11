import { DynamicTexture, Texture } from '@babylonjs/core';
import type { Scene } from '@babylonjs/core/scene';

export interface WorldTextures {
  building: DynamicTexture;
  asphalt: DynamicTexture;
  ground: DynamicTexture;
  monsterSkin: DynamicTexture;
  monsterBone: DynamicTexture;
  bark: DynamicTexture;
  notePaper: DynamicTexture;
  glow: DynamicTexture;
  graffiti: DynamicTexture;
}

function randomFrom(seed: number): () => number {
  return () => {
    seed |= 0; seed = seed + 0x6d2b79f5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function texture(scene: Scene, name: string, size: number, draw: (ctx: CanvasRenderingContext2D, size: number, random: () => number) => void, repeat = true): DynamicTexture {
  const tex = new DynamicTexture(name, { width: size, height: size }, scene, false, Texture.TRILINEAR_SAMPLINGMODE);
  const ctx = tex.getContext() as CanvasRenderingContext2D;
  draw(ctx, size, randomFrom(name.length * 7919 + size * 31));
  tex.update();
  if (repeat) { tex.wrapU = Texture.WRAP_ADDRESSMODE; tex.wrapV = Texture.WRAP_ADDRESSMODE; }
  return tex;
}
function speckle(ctx: CanvasRenderingContext2D, size: number, random: () => number, count: number, colors: string[], width: number, height = width): void {
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = colors[Math.floor(random() * colors.length)];
    ctx.fillRect(random() * size, random() * size, width, height);
  }
}

export function createWorldTextures(scene: Scene): WorldTextures {
  const building = texture(scene, 'building-procedural', 256, (ctx, size, random) => {
    ctx.fillStyle = '#22201e'; ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#141210';
    for (let y = 0; y < size; y += 16) for (let x = 0; x < size; x += 32) ctx.fillRect(x + (y % 32 === 0 ? 0 : 16), y, 28, 13);
    for (let wy = 24; wy < size - 24; wy += 64) for (let wx = 20; wx < size - 20; wx += 56) {
      ctx.fillStyle = '#050505'; ctx.fillRect(wx, wy, 36, 46);
      ctx.fillStyle = random() > .65 ? '#ddaa55' : '#0b0c10';
      ctx.fillRect(wx + 3, wy + 3, 13, 19); ctx.fillRect(wx + 20, wy + 3, 13, 19);
      ctx.fillRect(wx + 3, wy + 25, 13, 18); ctx.fillRect(wx + 20, wy + 25, 13, 18);
    }
    speckle(ctx, size, random, 700, ['rgba(0,0,0,.25)', 'rgba(90,80,70,.12)'], 2);
  });
  const asphalt = texture(scene, 'asphalt-procedural', 256, (ctx, size, random) => {
    ctx.fillStyle = '#181818'; ctx.fillRect(0, 0, size, size);
    speckle(ctx, size, random, 3500, ['#222', '#0e0e0e'], 2);
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    for (let y = 0; y < size; y += 64) ctx.fillRect(size / 2 - 3, y, 6, 28);
  });
  const ground = texture(scene, 'ground-procedural', 256, (ctx, size, random) => {
    ctx.fillStyle = '#0c0a07'; ctx.fillRect(0, 0, size, size);
    speckle(ctx, size, random, 3500, ['#16120c', '#060503', '#211b12'], 3);
  });
  const monsterSkin = texture(scene, 'monster-skin-procedural', 256, (ctx, size, random) => {
    ctx.fillStyle = '#241715'; ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 4000; i++) {
      ctx.fillStyle = random() > .5 ? '#160d0c' : random() > .4 ? '#3d1e1b' : '#4a2521';
      ctx.fillRect(random() * size, random() * size, random() * 6 + 1, random() * 2 + 1);
    }
    ctx.strokeStyle = 'rgba(90,5,5,.75)'; ctx.lineWidth = 2;
    for (let i = 0; i < 45; i++) {
      ctx.beginPath(); let x = random() * size, y = random() * size; ctx.moveTo(x, y);
      for (let j = 0; j < 5; j++) { x += (random() - .5) * 40; y += (random() - .5) * 40; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(140,0,0,.65)';
    for (let i = 0; i < 40; i++) { ctx.beginPath(); ctx.arc(random() * size, random() * size, random() * 16 + 4, 0, Math.PI * 2); ctx.fill(); }
  });
  const monsterBone = texture(scene, 'monster-bone-procedural', 256, (ctx, size, random) => {
    ctx.fillStyle = '#b8aa96'; ctx.fillRect(0, 0, size, size);
    speckle(ctx, size, random, 3000, ['#8f816d', '#cfc2ae'], 3);
    ctx.fillStyle = 'rgba(120,10,5,.6)';
    for (let i = 0; i < 25; i++) { ctx.beginPath(); ctx.arc(random() * size, random() * size, random() * 18 + 5, 0, Math.PI * 2); ctx.fill(); }
  });
  const bark = texture(scene, 'bark-procedural', 128, (ctx, size, random) => {
    ctx.fillStyle = '#1c120a'; ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#0c0602';
    for (let i = 0; i < 250; i++) ctx.fillRect(random() * size, random() * size, 4, random() * 28 + 8);
  });
  const notePaper = texture(scene, 'note-paper-procedural', 256, (ctx, size, random) => {
    ctx.fillStyle = '#eae2d2'; ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = 'rgba(60,90,140,.35)'; ctx.lineWidth = 2;
    for (let y = 24; y < size; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke(); }
    ctx.fillStyle = '#1a1111';
    for (let y = 36; y < size - 30; y += 20) if (random() > .25) ctx.fillRect(16, y, random() * (size - 50) + 20, 5);
    ctx.strokeStyle = '#900'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(size / 2, size / 2 + 10, 42, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(140,0,0,.6)'; ctx.beginPath(); ctx.arc(size - 45, size - 50, 24, 0, Math.PI * 2); ctx.fill();
  });
  const glow = texture(scene, 'glow-procedural', 128, (ctx, size) => {
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255,250,235,.9)'); gradient.addColorStop(.35, 'rgba(220,235,255,.35)'); gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, size, size);
  }, false);
  const graffiti = texture(scene, 'graffiti-procedural', 256, (ctx, size) => {
    ctx.clearRect(0, 0, size, size); ctx.fillStyle = 'rgba(160,5,5,.85)';
    ctx.font = 'bold 34px Courier New'; ctx.textAlign = 'center';
    ctx.fillText('НЕ СМОТРИ', size / 2, size / 2 - 10); ctx.fillText('НАЗАД', size / 2, size / 2 + 30);
  });
  graffiti.hasAlpha = true;
  return { building, asphalt, ground, monsterSkin, monsterBone, bark, notePaper, glow, graffiti };
}
