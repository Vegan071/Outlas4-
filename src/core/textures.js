// Процедурные текстуры (рисуются на canvas — внешних картинок нет).

import * as THREE from 'three';

export const textures = {};

function createTex(draw, size = 256, repeat = true) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  draw(canvas.getContext('2d'), size);
  const tex = new THREE.CanvasTexture(canvas);
  if (repeat) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
  }
  return tex;
}

const speckle = (ctx, size, count, colors, w, h = w) => {
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
    ctx.fillRect(Math.random() * size, Math.random() * size, w, h);
  }
};

export function generateProceduralTextures() {
  textures.building = createTex((ctx, size) => {
    ctx.fillStyle = '#22201e'; ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#141210';
    for (let y = 0; y < size; y += 16) {
      for (let x = 0; x < size; x += 32) ctx.fillRect(x + (y % 32 === 0 ? 0 : 16), y, 28, 13);
    }
    for (let wy = 24; wy < size - 24; wy += 64) {
      for (let wx = 20; wx < size - 20; wx += 56) {
        ctx.fillStyle = '#050505'; ctx.fillRect(wx, wy, 36, 46);
        ctx.fillStyle = Math.random() > 0.65 ? '#ddaa55' : '#0b0c10';
        ctx.fillRect(wx + 3, wy + 3, 13, 19); ctx.fillRect(wx + 20, wy + 3, 13, 19);
        ctx.fillRect(wx + 3, wy + 25, 13, 18); ctx.fillRect(wx + 20, wy + 25, 13, 18);
      }
    }
  });

  textures.asphalt = createTex((ctx, size) => {
    ctx.fillStyle = '#181818'; ctx.fillRect(0, 0, size, size);
    speckle(ctx, size, 3500, ['#222', '#0e0e0e'], 2);
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    for (let y = 0; y < size; y += 64) ctx.fillRect(size / 2 - 3, y, 6, 28);
  });

  textures.ground = createTex((ctx, size) => {
    ctx.fillStyle = '#0c0a07'; ctx.fillRect(0, 0, size, size);
    speckle(ctx, size, 3500, ['#16120c', '#060503'], 3);
  });

  textures.monsterSkin = createTex((ctx, size) => {
    ctx.fillStyle = '#241715'; ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 4000; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? '#160d0c' : (Math.random() > 0.4 ? '#3d1e1b' : '#4a2521');
      ctx.fillRect(Math.random() * size, Math.random() * size, Math.random() * 6 + 1, Math.random() * 2 + 1);
    }
    ctx.strokeStyle = 'rgba(90,5,5,.75)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 45; i++) {
      ctx.beginPath();
      let vx = Math.random() * size, vy = Math.random() * size;
      ctx.moveTo(vx, vy);
      for (let j = 0; j < 5; j++) {
        vx += (Math.random() - 0.5) * 40;
        vy += (Math.random() - 0.5) * 40;
        ctx.lineTo(vx, vy);
      }
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(140,0,0,.65)';
    for (let i = 0; i < 40; i++) {
      ctx.beginPath(); ctx.arc(Math.random() * size, Math.random() * size, Math.random() * 16 + 4, 0, Math.PI * 2); ctx.fill();
    }
  });

  textures.monsterBone = createTex((ctx, size) => {
    ctx.fillStyle = '#b8aa96'; ctx.fillRect(0, 0, size, size);
    speckle(ctx, size, 3000, ['#8f816d', '#cfc2ae'], 3);
    ctx.fillStyle = 'rgba(120,10,5,.6)';
    for (let i = 0; i < 25; i++) {
      ctx.beginPath(); ctx.arc(Math.random() * size, Math.random() * size, Math.random() * 18 + 5, 0, Math.PI * 2); ctx.fill();
    }
  });

  textures.bark = createTex((ctx, size) => {
    ctx.fillStyle = '#1c120a'; ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#0c0602';
    for (let i = 0; i < 250; i++) ctx.fillRect(Math.random() * size, Math.random() * size, 4, Math.random() * 28 + 8);
  }, 128);

  textures.notePaper = createTex((ctx, size) => {
    ctx.fillStyle = '#eae2d2'; ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = 'rgba(60,90,140,.35)';
    ctx.lineWidth = 2;
    for (let y = 24; y < size; y += 20) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke();
    }
    ctx.fillStyle = '#1a1111';
    for (let y = 36; y < size - 30; y += 20) {
      if (Math.random() > 0.25) ctx.fillRect(16, y, Math.random() * (size - 50) + 20, 5);
    }
    ctx.strokeStyle = '#900'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(size / 2, size / 2 + 10, 42, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(140,0,0,.6)';
    ctx.beginPath(); ctx.arc(size - 45, size - 50, 24, 0, Math.PI * 2); ctx.fill();
  });

  textures.glow = createTex((ctx, size) => {
    const grad = ctx.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(255,250,235,.9)');
    grad.addColorStop(0.35, 'rgba(220,235,255,.35)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }, 128, false);

  textures.graffiti = createTex((ctx, size) => {
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = 'rgba(160,5,5,.85)';
    ctx.font = 'bold 34px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('НЕ СМОТРИ', size / 2, size / 2 - 10);
    ctx.fillText('НАЗАД', size / 2, size / 2 + 30);
  });
}
