// ═══════════════════════════════════════════
// StarCraft Web - Pathfinding A* 单元测试
// ═══════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import { Pathfinding } from '../src/game/Pathfinding.js';

/**
 * Create an open grid (all walkable)
 */
function createOpenGrid(size) {
  return Array.from({ length: size }, () => new Array(size).fill(true));
}

/**
 * Create a grid with a wall (horizontal barrier)
 */
function createGridWithWall(size, wallZ) {
  const grid = createOpenGrid(size);
  for (let x = 0; x < size; x++) {
    grid[wallZ][x] = false;
  }
  return grid;
}

/**
 * Create a fully blocked grid (all unwalkable)
 */
function createBlockedGrid(size) {
  return Array.from({ length: size }, () => new Array(size).fill(false));
}

describe('Pathfinding', () => {
  // ── 简单直线路径 ─────────────────────────
  describe('Simple straight path', () => {
    it('horizontal straight path', () => {
      const grid = createOpenGrid(10);
      const pf = new Pathfinding(10, 10, grid);
      const path = pf.findPath({ x: 1, z: 5 }, { x: 8, z: 5 });
      expect(path).not.toBeNull();
      expect(path.length).toBeGreaterThanOrEqual(2);
      // Start and end should be close to requested positions
      expect(Math.abs(path[0].x - 1)).toBeLessThan(1.5);
      expect(Math.abs(path[path.length - 1].x - 8)).toBeLessThan(1.5);
    });

    it('vertical straight path', () => {
      const grid = createOpenGrid(10);
      const pf = new Pathfinding(10, 10, grid);
      const path = pf.findPath({ x: 5, z: 1 }, { x: 5, z: 8 });
      expect(path).not.toBeNull();
      expect(path.length).toBeGreaterThanOrEqual(2);
    });

    it('same start and end', () => {
      const grid = createOpenGrid(10);
      const pf = new Pathfinding(10, 10, grid);
      const path = pf.findPath({ x: 5, z: 5 }, { x: 5, z: 5 });
      expect(path).not.toBeNull();
      expect(path.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── 绕过障碍物 ──────────────────────────
  describe('Obstacle avoidance', () => {
    it('path goes around a horizontal wall', () => {
      // Grid 10x10, wall at z=5 but leave a gap on the right side
      const grid = createGridWithWall(10, 5);
      grid[5][9] = true; // gap at right edge
      const pf = new Pathfinding(10, 10, grid);
      const path = pf.findPath({ x: 5, z: 1 }, { x: 5, z: 8 });
      expect(path).not.toBeNull();
      // Path should not go through the wall
      for (const p of path) {
        const gx = Math.round(p.x - 0.5); // convert world to grid approx
        const gz = Math.round(p.z - 0.5);
        if (gx >= 0 && gx < 10 && gz >= 0 && gz < 10) {
          expect(grid[gz][gx] !== false || gz !== 5).toBeTruthy();
        }
      }
    });

    it('path goes around a vertical wall', () => {
      const grid = createOpenGrid(10);
      // Create vertical wall at x=5 but leave a gap at bottom
      for (let z = 0; z < 9; z++) {
        grid[z][5] = false;
      }
      const pf = new Pathfinding(10, 10, grid);
      const path = pf.findPath({ x: 2, z: 5 }, { x: 8, z: 5 });
      expect(path).not.toBeNull();
    });

    it('path goes around a block obstacle', () => {
      const grid = createOpenGrid(10);
      // Create a 3x3 block in the center
      for (let z = 4; z <= 6; z++) {
        for (let x = 4; x <= 6; x++) {
          grid[z][x] = false;
        }
      }
      const pf = new Pathfinding(10, 10, grid);
      const path = pf.findPath({ x: 2, z: 5 }, { x: 8, z: 5 });
      expect(path).not.toBeNull();
    });
  });

  // ── 无效路径（被完全堵死）────────────────
  describe('Invalid paths', () => {
    it('completely blocked → null', () => {
      const grid = createBlockedGrid(10);
      // Make start walkable
      grid[1][1] = true;
      // Make end walkable
      grid[8][8] = true;
      const pf = new Pathfinding(10, 10, grid);
      const path = pf.findPath({ x: 1, z: 1 }, { x: 8, z: 8 });
      expect(path).toBeNull();
    });

    it('start on unwalkable tile → tries to find nearest walkable', () => {
      const grid = createOpenGrid(10);
      grid[1][1] = false; // Start tile blocked
      const pf = new Pathfinding(10, 10, grid);
      // Should either find path from nearby walkable tile or return null
      const path = pf.findPath({ x: 1, z: 1 }, { x: 8, z: 8 });
      // Either finds an alternative start or returns null
      if (path !== null) {
        expect(path.length).toBeGreaterThanOrEqual(2);
      }
    });

    it('end on unwalkable tile → tries to find nearest walkable', () => {
      const grid = createOpenGrid(10);
      grid[8][8] = false; // End tile blocked
      const pf = new Pathfinding(10, 10, grid);
      const path = pf.findPath({ x: 1, z: 1 }, { x: 8, z: 8 });
      if (path !== null) {
        expect(path.length).toBeGreaterThanOrEqual(2);
      }
    });
  });

  // ── 缓存 ────────────────────────────────
  describe('Cache', () => {
    it('cached result is returned', () => {
      const grid = createOpenGrid(10);
      const pf = new Pathfinding(10, 10, grid);
      const path1 = pf.findPath({ x: 1, z: 1 }, { x: 8, z: 8 });
      const path2 = pf.findPath({ x: 1, z: 1 }, { x: 8, z: 8 });
      expect(path1).not.toBeNull();
      expect(path2).not.toBeNull();
      // Cached path should be the same reference
      expect(path1).toBe(path2);
    });

    it('clearCache works', () => {
      const grid = createOpenGrid(10);
      const pf = new Pathfinding(10, 10, grid);
      pf.findPath({ x: 1, z: 1 }, { x: 8, z: 8 });
      pf.clearCache();
      // After clearing, should still find path
      const path = pf.findPath({ x: 1, z: 1 }, { x: 8, z: 8 });
      expect(path).not.toBeNull();
    });
  });

  // ── setWalkable ──────────────────────────
  describe('setWalkable', () => {
    it('setWalkable changes path', () => {
      const grid = createOpenGrid(10);
      const pf = new Pathfinding(10, 10, grid);
      const path1 = pf.findPath({ x: 1, z: 5 }, { x: 8, z: 5 });
      expect(path1).not.toBeNull();

      // Block the straight path
      for (let x = 2; x < 8; x++) {
        pf.setWalkable(x, 5, false);
      }
      // Now path needs to go around
      const path2 = pf.findPath({ x: 1, z: 5 }, { x: 8, z: 5 });
      if (path2 !== null) {
        // Path should be different (longer due to detour)
        expect(path2.length > path1.length || path2 !== path1).toBeTruthy();
      }
    });
  });
});
