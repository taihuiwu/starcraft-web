// ═══════════════════════════════════════════
// StarCraft Web - Quadtree 空间分区单元测试
// ═══════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import { Quadtree, Bounds } from '../src/engine/Quadtree.js';

describe('Bounds', () => {
  it('containsPoint works for points inside', () => {
    const b = new Bounds(0, 0, 10, 10);
    expect(b.containsPoint({ x: 5, y: 5 })).toBe(true);
  });

  it('containsPoint works for points on edge', () => {
    const b = new Bounds(0, 0, 10, 10);
    expect(b.containsPoint({ x: 0, y: 0 })).toBe(true);
    expect(b.containsPoint({ x: 10, y: 10 })).toBe(true);
  });

  it('containsPoint returns false for outside points', () => {
    const b = new Bounds(0, 0, 10, 10);
    expect(b.containsPoint({ x: 11, y: 5 })).toBe(false);
    expect(b.containsPoint({ x: 5, y: -1 })).toBe(false);
  });

  it('intersects for overlapping bounds', () => {
    const a = new Bounds(0, 0, 10, 10);
    const b = new Bounds(5, 5, 10, 10);
    expect(a.intersects(b)).toBe(true);
  });

  it('intersects for non-overlapping bounds', () => {
    const a = new Bounds(0, 0, 5, 5);
    const b = new Bounds(10, 10, 5, 5);
    expect(a.intersects(b)).toBe(false);
  });

  it('intersects for contained bounds', () => {
    const a = new Bounds(0, 0, 20, 20);
    const b = new Bounds(5, 5, 5, 5);
    expect(a.intersects(b)).toBe(true);
  });
});

describe('Quadtree', () => {
  describe('insert and getCount', () => {
    it('insert single object', () => {
      const qt = new Quadtree(new Bounds(0, 0, 100, 100));
      qt.insert({ x: 10, y: 10 });
      expect(qt.getCount()).toBe(1);
    });

    it('insert multiple objects', () => {
      const qt = new Quadtree(new Bounds(0, 0, 100, 100));
      for (let i = 0; i < 5; i++) {
        qt.insert({ x: i * 10, y: i * 10, id: i });
      }
      expect(qt.getCount()).toBe(5);
    });

    it('insert triggers splitting at capacity', () => {
      const qt = new Quadtree(new Bounds(0, 0, 100, 100), 4, 6);
      for (let i = 0; i < 10; i++) {
        qt.insert({ x: i * 5 + 1, y: i * 5 + 1, id: i });
      }
      expect(qt.getCount()).toBe(10);
    });

    it('insert objects at same position', () => {
      const qt = new Quadtree(new Bounds(0, 0, 100, 100));
      qt.insert({ x: 50, y: 50, id: 'a' });
      qt.insert({ x: 50, y: 50, id: 'b' });
      expect(qt.getCount()).toBe(2);
    });
  });

  describe('remove', () => {
    it('remove existing object', () => {
      const qt = new Quadtree(new Bounds(0, 0, 100, 100));
      const obj = { x: 10, y: 10 };
      qt.insert(obj);
      expect(qt.getCount()).toBe(1);
      qt.remove(obj);
      expect(qt.getCount()).toBe(0);
    });

    it('remove non-existing object does not error', () => {
      const qt = new Quadtree(new Bounds(0, 0, 100, 100));
      qt.insert({ x: 10, y: 10 });
      qt.remove({ x: 99, y: 99 });
      expect(qt.getCount()).toBe(1);
    });

    it('remove from split tree triggers merge', () => {
      const qt = new Quadtree(new Bounds(0, 0, 100, 100), 3, 6);
      const objs = [];
      for (let i = 0; i < 8; i++) {
        const obj = { x: 10 + i * 8, y: 10 + i * 8, id: i };
        objs.push(obj);
        qt.insert(obj);
      }
      expect(qt.getCount()).toBe(8);
      // Remove most objects to trigger merge
      for (let i = 0; i < 6; i++) {
        qt.remove(objs[i]);
      }
      expect(qt.getCount()).toBe(2);
    });
  });

  describe('queryRange', () => {
    it('finds objects within range', () => {
      const qt = new Quadtree(new Bounds(0, 0, 100, 100));
      qt.insert({ x: 10, y: 10 });
      qt.insert({ x: 20, y: 20 });
      qt.insert({ x: 80, y: 80 });
      const results = qt.queryRange(new Bounds(0, 0, 30, 30));
      expect(results.length).toBe(2);
    });

    it('returns empty for non-intersecting range', () => {
      const qt = new Quadtree(new Bounds(0, 0, 100, 100));
      qt.insert({ x: 10, y: 10 });
      qt.insert({ x: 20, y: 20 });
      const results = qt.queryRange(new Bounds(50, 50, 10, 10));
      expect(results.length).toBe(0);
    });

    it('queryRange on empty tree', () => {
      const qt = new Quadtree(new Bounds(0, 0, 100, 100));
      const results = qt.queryRange(new Bounds(0, 0, 100, 100));
      expect(results.length).toBe(0);
    });

    it('queryRange covers entire tree', () => {
      const qt = new Quadtree(new Bounds(0, 0, 100, 100));
      qt.insert({ x: 10, y: 10 });
      qt.insert({ x: 50, y: 50 });
      qt.insert({ x: 90, y: 90 });
      const results = qt.queryRange(new Bounds(0, 0, 100, 100));
      expect(results.length).toBe(3);
    });

    it('queryRange after insert and remove', () => {
      const qt = new Quadtree(new Bounds(0, 0, 100, 100));
      const obj = { x: 15, y: 15 };
      qt.insert(obj);
      qt.insert({ x: 80, y: 80 });
      qt.remove(obj);
      const results = qt.queryRange(new Bounds(0, 0, 30, 30));
      expect(results.length).toBe(0);
    });

    it('queryRange works with split tree', () => {
      const qt = new Quadtree(new Bounds(0, 0, 100, 100), 3, 6);
      for (let i = 0; i < 10; i++) {
        qt.insert({ x: 5 + i * 9, y: 5 + i * 9, id: i });
      }
      const results = qt.queryRange(new Bounds(0, 0, 50, 50));
      expect(results.length).toBeGreaterThan(0);
      for (const r of results) {
        expect(r.x).toBeGreaterThanOrEqual(0);
        expect(r.x).toBeLessThanOrEqual(50);
        expect(r.y).toBeGreaterThanOrEqual(0);
        expect(r.y).toBeLessThanOrEqual(50);
      }
    });
  });

  describe('queryNearest', () => {
    it('finds nearest object', () => {
      const qt = new Quadtree(new Bounds(0, 0, 100, 100));
      qt.insert({ x: 10, y: 10 });
      qt.insert({ x: 50, y: 50 });
      qt.insert({ x: 90, y: 90 });
      const result = qt.queryNearest({ x: 12, y: 12 });
      expect(result).not.toBeNull();
      expect(result.object.x).toBe(10);
      expect(result.object.y).toBe(10);
    });

    it('returns null on empty tree', () => {
      const qt = new Quadtree(new Bounds(0, 0, 100, 100));
      const result = qt.queryNearest({ x: 50, y: 50 });
      expect(result).toBeNull();
    });

    it('respects radius limit', () => {
      const qt = new Quadtree(new Bounds(0, 0, 100, 100));
      qt.insert({ x: 10, y: 10 });
      qt.insert({ x: 80, y: 80 });
      const result = qt.queryNearest({ x: 50, y: 50 }, 5);
      expect(result).toBeNull(); // both are beyond radius 5
    });

    it('finds nearest within radius', () => {
      const qt = new Quadtree(new Bounds(0, 0, 100, 100));
      qt.insert({ x: 10, y: 10 });
      qt.insert({ x: 50, y: 50 });
      qt.insert({ x: 90, y: 90 });
      const result = qt.queryNearest({ x: 48, y: 48 }, 20);
      expect(result).not.toBeNull();
      expect(result.object.x).toBe(50);
      expect(result.object.y).toBe(50);
    });

    it('finds nearest in split tree', () => {
      const qt = new Quadtree(new Bounds(0, 0, 100, 100), 3, 6);
      for (let i = 0; i < 10; i++) {
        qt.insert({ x: 5 + i * 9, y: 5 + i * 9, id: i });
      }
      const result = qt.queryNearest({ x: 50, y: 50 });
      expect(result).not.toBeNull();
      expect(result.distance).toBeLessThan(10);
    });
  });

  describe('clear', () => {
    it('clear removes all objects', () => {
      const qt = new Quadtree(new Bounds(0, 0, 100, 100));
      qt.insert({ x: 10, y: 10 });
      qt.insert({ x: 50, y: 50 });
      qt.insert({ x: 90, y: 90 });
      expect(qt.getCount()).toBe(3);
      qt.clear();
      expect(qt.getCount()).toBe(0);
    });

    it('clear allows reinsertion', () => {
      const qt = new Quadtree(new Bounds(0, 0, 100, 100));
      qt.insert({ x: 10, y: 10 });
      qt.clear();
      qt.insert({ x: 50, y: 50 });
      expect(qt.getCount()).toBe(1);
      const results = qt.queryRange(new Bounds(0, 0, 100, 100));
      expect(results.length).toBe(1);
      expect(results[0].x).toBe(50);
    });
  });
});
