import { PLAYER } from '../config.js';
import { world } from '../state.js';

/** Выталкивает позицию из круглых и прямоугольных коллайдеров (в плоскости XZ). */
export function checkHorizontalCollision(pos, radius = PLAYER.RADIUS) {
  const circles = world.circleColliders;
  for (let i = 0; i < circles.length; i++) {
    const c = circles[i];
    const dx = pos.x - c.x;
    const dz = pos.z - c.z;
    const minDist = radius + c.r;
    if (dx > minDist || dx < -minDist || dz > minDist || dz < -minDist) continue; // быстрый отсев
    const distSq = dx * dx + dz * dz;
    if (distSq < minDist * minDist && distSq > 0.0001) {
      const dist = Math.sqrt(distSq);
      const overlap = minDist - dist;
      pos.x += (dx / dist) * overlap;
      pos.z += (dz / dist) * overlap;
    }
  }

  const boxes = world.boxColliders;
  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i];
    const closestX = Math.max(b.minX, Math.min(pos.x, b.maxX));
    const closestZ = Math.max(b.minZ, Math.min(pos.z, b.maxZ));
    const dx = pos.x - closestX;
    const dz = pos.z - closestZ;
    const distSq = dx * dx + dz * dz;
    if (distSq < radius * radius && distSq > 0.00001) {
      const dist = Math.sqrt(distSq);
      const overlap = radius - dist;
      pos.x += (dx / dist) * overlap;
      pos.z += (dz / dist) * overlap;
    }
  }
}
