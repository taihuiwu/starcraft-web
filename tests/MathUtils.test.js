// ═══════════════════════════════════════════
// StarCraft Web - MathUtils 单元测试
// ═══════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import {
  distance2D,
  distance3D,
  distanceSq2D,
  lerp,
  clamp,
  normalize2D,
  circleCollision,
  worldToGrid,
  gridToWorld,
  degToRad,
  radToDeg,
  angleToTarget,
  computeAABB,
  randomInt,
  randomFloat,
} from '../src/shared/MathUtils.js';

describe('MathUtils', () => {
  // ── distance2D ───────────────────────────
  describe('distance2D', () => {
    it('same point → 0', () => {
      expect(distance2D({ x: 0, y: 0 }, { x: 0, y: 0 })).toBe(0);
    });

    it('horizontal distance', () => {
      expect(distance2D({ x: 0, y: 0 }, { x: 3, y: 0 })).toBe(3);
    });

    it('vertical distance', () => {
      expect(distance2D({ x: 0, y: 0 }, { x: 0, y: 4 })).toBe(4);
    });

    it('3-4-5 triangle', () => {
      expect(Math.abs(distance2D({ x: 0, y: 0 }, { x: 3, y: 4 }) - 5)).toBeLessThan(1e-10);
    });

    it('uses z property when present', () => {
      expect(distance2D({ x: 0, z: 0 }, { x: 3, z: 4 })).toBe(5);
    });
  });

  // ── distance3D ───────────────────────────
  describe('distance3D', () => {
    it('same point → 0', () => {
      expect(distance3D({ x: 1, y: 2, z: 3 }, { x: 1, y: 2, z: 3 })).toBe(0);
    });

    it('3D distance', () => {
      const d = distance3D({ x: 0, y: 0, z: 0 }, { x: 1, y: 2, z: 2 });
      expect(Math.abs(d - 3)).toBeLessThan(1e-10);
    });
  });

  // ── distanceSq2D ─────────────────────────
  describe('distanceSq2D', () => {
    it('returns squared distance', () => {
      expect(distanceSq2D({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(25);
    });
  });

  // ── lerp ─────────────────────────────────
  describe('lerp', () => {
    it('t=0 → a', () => { expect(lerp(0, 10, 0)).toBe(0); });
    it('t=1 → b', () => { expect(lerp(0, 10, 1)).toBe(10); });
    it('t=0.5 → midpoint', () => { expect(lerp(0, 10, 0.5)).toBe(5); });
    it('t<0 clamped to 0', () => { expect(lerp(0, 10, -1)).toBe(0); });
    it('t>1 clamped to 1', () => { expect(lerp(0, 10, 2)).toBe(10); });
  });

  // ── clamp ────────────────────────────────
  describe('clamp', () => {
    it('value within range → value', () => { expect(clamp(5, 0, 10)).toBe(5); });
    it('value below min → min', () => { expect(clamp(-5, 0, 10)).toBe(0); });
    it('value above max → max', () => { expect(clamp(15, 0, 10)).toBe(10); });
    it('value at boundary min', () => { expect(clamp(0, 0, 10)).toBe(0); });
    it('value at boundary max', () => { expect(clamp(10, 0, 10)).toBe(10); });
  });

  // ── normalize2D ──────────────────────────
  describe('normalize2D', () => {
    it('unit vector right', () => {
      const n = normalize2D(1, 0);
      expect(n.x).toBe(1);
      expect(n.z).toBe(0);
    });

    it('unit vector down', () => {
      const n = normalize2D(0, 1);
      expect(n.x).toBe(0);
      expect(n.z).toBe(1);
    });

    it('diagonal normalized', () => {
      const n = normalize2D(3, 4);
      const len = Math.sqrt(n.x * n.x + n.z * n.z);
      expect(Math.abs(len - 1)).toBeLessThan(1e-10);
    });

    it('zero vector → zero', () => {
      const n = normalize2D(0, 0);
      expect(n.x).toBe(0);
      expect(n.z).toBe(0);
    });
  });

  // ── circleCollision ──────────────────────
  describe('circleCollision', () => {
    it('overlapping circles → true', () => {
      expect(circleCollision({ x: 0, y: 0 }, 2, { x: 1, y: 0 }, 2)).toBe(true);
    });

    it('touching circles (edge) → false', () => {
      expect(circleCollision({ x: 0, y: 0 }, 1, { x: 2, y: 0 }, 1)).toBe(false);
    });

    it('far apart → false', () => {
      expect(circleCollision({ x: 0, y: 0 }, 1, { x: 10, y: 0 }, 1)).toBe(false);
    });

    it('contained circles → true', () => {
      expect(circleCollision({ x: 0, y: 0 }, 5, { x: 1, y: 0 }, 1)).toBe(true);
    });
  });

  // ── worldToGrid ──────────────────────────
  describe('worldToGrid', () => {
    it('(0,0) → (0,0)', () => {
      const g = worldToGrid(0, 0);
      expect(g).toEqual({ gx: 0, gz: 0 });
    });

    it('(5.5, 3.2) → (5,3)', () => {
      const g = worldToGrid(5.5, 3.2);
      expect(g).toEqual({ gx: 5, gz: 3 });
    });

    it('custom tileSize', () => {
      const g = worldToGrid(6, 4, 2);
      expect(g).toEqual({ gx: 3, gz: 2 });
    });
  });

  // ── gridToWorld ──────────────────────────
  describe('gridToWorld', () => {
    it('(0,0) → center of first tile', () => {
      const w = gridToWorld(0, 0);
      expect(w.x).toBe(0.5);
      expect(w.z).toBe(0.5);
    });

    it('(1,2) → center of tile', () => {
      const w = gridToWorld(1, 2);
      expect(w.x).toBe(1.5);
      expect(w.z).toBe(2.5);
    });

    it('custom tileSize', () => {
      const w = gridToWorld(3, 4, 2);
      expect(w.x).toBe(7);
      expect(w.z).toBe(9);
    });
  });

  // ── degToRad / radToDeg ──────────────────
  describe('degToRad / radToDeg', () => {
    it('90° → π/2', () => { expect(degToRad(90)).toBe(Math.PI / 2); });
    it('π/2 → 90°', () => { expect(radToDeg(Math.PI / 2)).toBe(90); });
    it('round-trip', () => { expect(radToDeg(degToRad(45))).toBe(45); });
  });

  // ── angleToTarget ────────────────────────
  describe('angleToTarget', () => {
    it('target to the right → 0', () => {
      const a = angleToTarget({ x: 0, z: 0 }, { x: 1, z: 0 });
      expect(Math.abs(a)).toBeLessThan(1e-10);
    });

    it('target above → π/2', () => {
      const a = angleToTarget({ x: 0, z: 0 }, { x: 0, z: 1 });
      expect(Math.abs(a - Math.PI / 2)).toBeLessThan(1e-10);
    });
  });

  // ── computeAABB ──────────────────────────
  describe('computeAABB', () => {
    it('simple points', () => {
      const bb = computeAABB([
        { x: 0, y: 0, z: 0 },
        { x: 3, y: 5, z: 7 },
        { x: -1, y: 2, z: -2 },
      ]);
      expect(bb.min).toEqual({ x: -1, y: 0, z: -2 });
      expect(bb.max).toEqual({ x: 3, y: 5, z: 7 });
    });
  });

  // ── randomInt / randomFloat ──────────────
  describe('randomInt / randomFloat', () => {
    it('randomInt in range', () => {
      for (let i = 0; i < 100; i++) {
        const v = randomInt(5, 10);
        expect(v).toBeGreaterThanOrEqual(5);
        expect(v).toBeLessThanOrEqual(10);
      }
    });

    it('randomFloat in range', () => {
      for (let i = 0; i < 100; i++) {
        const v = randomFloat(5, 10);
        expect(v).toBeGreaterThanOrEqual(5);
        expect(v).toBeLessThan(10);
      }
    });
  });
});
