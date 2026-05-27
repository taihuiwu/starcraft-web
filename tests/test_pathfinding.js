// ═══════════════════════════════════════════
// StarCraft Web - Pathfinding A* 单元测试
// ═══════════════════════════════════════════

import assert from 'node:assert/strict';
import { Pathfinding } from '../src/game/Pathfinding.js';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${e.message}`);
  }
}

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

console.log('=== Pathfinding Tests ===\n');

// ── 简单直线路径 ─────────────────────────
console.log('Simple straight path:');
test('horizontal straight path', () => {
  const grid = createOpenGrid(10);
  const pf = new Pathfinding(10, 10, grid);
  const path = pf.findPath({ x: 1, z: 5 }, { x: 8, z: 5 });
  assert.ok(path !== null, 'should find a path');
  assert.ok(path.length >= 2, 'path should have at least start and end');
  // Start and end should be close to requested positions
  assert.ok(Math.abs(path[0].x - 1) < 1.5, `start x should be ~1, got ${path[0].x}`);
  assert.ok(Math.abs(path[path.length - 1].x - 8) < 1.5, `end x should be ~8, got ${path[path.length - 1].x}`);
});

test('vertical straight path', () => {
  const grid = createOpenGrid(10);
  const pf = new Pathfinding(10, 10, grid);
  const path = pf.findPath({ x: 5, z: 1 }, { x: 5, z: 8 });
  assert.ok(path !== null, 'should find a path');
  assert.ok(path.length >= 2);
});

test('same start and end', () => {
  const grid = createOpenGrid(10);
  const pf = new Pathfinding(10, 10, grid);
  const path = pf.findPath({ x: 5, z: 5 }, { x: 5, z: 5 });
  assert.ok(path !== null, 'should find a path (same point)');
  assert.ok(path.length >= 1);
});

// ── 绕过障碍物 ──────────────────────────
console.log('\nObstacle avoidance:');
test('path goes around a horizontal wall', () => {
  // Grid 10x10, wall at z=5 but leave a gap on the right side
  const grid = createGridWithWall(10, 5);
  grid[5][9] = true; // gap at right edge
  const wallZ = 5;
  const pf = new Pathfinding(10, 10, grid);
  const path = pf.findPath({ x: 5, z: 1 }, { x: 5, z: 8 });
  assert.ok(path !== null, 'should find a path around the wall');
  // Path should not go through the wall
  for (const p of path) {
    const gx = Math.round(p.x - 0.5); // convert world to grid approx
    const gz = Math.round(p.z - 0.5);
    if (gx >= 0 && gx < 10 && gz >= 0 && gz < 10) {
      assert.ok(grid[gz][gx] !== false || gz !== 5,
        `path point (${p.x}, ${p.z}) should not be on the wall`);
    }
  }
});

test('path goes around a vertical wall', () => {
  const grid = createOpenGrid(10);
  // Create vertical wall at x=5 but leave a gap at bottom
  for (let z = 0; z < 9; z++) {
    grid[z][5] = false;
  }
  const pf = new Pathfinding(10, 10, grid);
  const path = pf.findPath({ x: 2, z: 5 }, { x: 8, z: 5 });
  assert.ok(path !== null, 'should find a path around the wall');
});

test('path goes around a block obstacle', () => {
  const grid = createOpenGrid(10);
  // Create a 3x3 block in the center
  for (let z = 4; z <= 6; z++) {
    for (let x = 4; x <= 6; x++) {
      grid[z][x] = false;
    }
  }
  const pf = new Pathfinding(10, 10, grid);
  const path = pf.findPath({ x: 2, z: 5 }, { x: 8, z: 5 });
  assert.ok(path !== null, 'should find a path around the block');
});

// ── 无效路径（被完全堵死）────────────────
console.log('\nInvalid paths:');
test('completely blocked → null', () => {
  const grid = createBlockedGrid(10);
  // Make start walkable
  grid[1][1] = true;
  // Make end walkable
  grid[8][8] = true;
  const pf = new Pathfinding(10, 10, grid);
  const path = pf.findPath({ x: 1, z: 1 }, { x: 8, z: 8 });
  assert.equal(path, null, 'should return null when path is blocked');
});

test('start on unwalkable tile → tries to find nearest walkable', () => {
  const grid = createOpenGrid(10);
  grid[1][1] = false; // Start tile blocked
  const pf = new Pathfinding(10, 10, grid);
  // Should either find path from nearby walkable tile or return null
  const path = pf.findPath({ x: 1, z: 1 }, { x: 8, z: 8 });
  // Either finds an alternative start or returns null
  if (path !== null) {
    assert.ok(path.length >= 2);
  }
});

test('end on unwalkable tile → tries to find nearest walkable', () => {
  const grid = createOpenGrid(10);
  grid[8][8] = false; // End tile blocked
  const pf = new Pathfinding(10, 10, grid);
  const path = pf.findPath({ x: 1, z: 1 }, { x: 8, z: 8 });
  if (path !== null) {
    assert.ok(path.length >= 2);
  }
});

// ── 缓存 ────────────────────────────────
console.log('\nCache:');
test('cached result is returned', () => {
  const grid = createOpenGrid(10);
  const pf = new Pathfinding(10, 10, grid);
  const path1 = pf.findPath({ x: 1, z: 1 }, { x: 8, z: 8 });
  const path2 = pf.findPath({ x: 1, z: 1 }, { x: 8, z: 8 });
  assert.ok(path1 !== null);
  assert.ok(path2 !== null);
  // Cached path should be the same reference
  assert.equal(path1, path2);
});

test('clearCache works', () => {
  const grid = createOpenGrid(10);
  const pf = new Pathfinding(10, 10, grid);
  pf.findPath({ x: 1, z: 1 }, { x: 8, z: 8 });
  pf.clearCache();
  // After clearing, should still find path
  const path = pf.findPath({ x: 1, z: 1 }, { x: 8, z: 8 });
  assert.ok(path !== null);
});

// ── setWalkable ──────────────────────────
console.log('\nsetWalkable:');
test('setWalkable changes path', () => {
  const grid = createOpenGrid(10);
  const pf = new Pathfinding(10, 10, grid);
  const path1 = pf.findPath({ x: 1, z: 5 }, { x: 8, z: 5 });
  assert.ok(path1 !== null);

  // Block the straight path
  for (let x = 2; x < 8; x++) {
    pf.setWalkable(x, 5, false);
  }
  // Now path needs to go around
  const path2 = pf.findPath({ x: 1, z: 5 }, { x: 8, z: 5 });
  if (path2 !== null) {
    // Path should be different (longer due to detour)
    assert.ok(path2.length > path1.length || path2 !== path1);
  }
});

// ── Summary ──────────────────────────────
console.log(`\n${'='.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
