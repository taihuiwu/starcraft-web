// ═══════════════════════════════════════════
// StarCraft Web - MathUtils 单元测试
// ═══════════════════════════════════════════

import assert from 'node:assert/strict';
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

console.log('=== MathUtils Tests ===\n');

// ── distance2D ───────────────────────────
console.log('distance2D:');
test('same point → 0', () => {
  assert.equal(distance2D({ x: 0, y: 0 }, { x: 0, y: 0 }), 0);
});

test('horizontal distance', () => {
  assert.equal(distance2D({ x: 0, y: 0 }, { x: 3, y: 0 }), 3);
});

test('vertical distance', () => {
  assert.equal(distance2D({ x: 0, y: 0 }, { x: 0, y: 4 }), 4);
});

test('3-4-5 triangle', () => {
  assert.ok(Math.abs(distance2D({ x: 0, y: 0 }, { x: 3, y: 4 }) - 5) < 1e-10);
});

test('uses z property when present', () => {
  assert.equal(distance2D({ x: 0, z: 0 }, { x: 3, z: 4 }), 5);
});

// ── distance3D ───────────────────────────
console.log('\ndistance3D:');
test('same point → 0', () => {
  assert.equal(distance3D({ x: 1, y: 2, z: 3 }, { x: 1, y: 2, z: 3 }), 0);
});

test('3D distance', () => {
  const d = distance3D({ x: 0, y: 0, z: 0 }, { x: 1, y: 2, z: 2 });
  assert.ok(Math.abs(d - 3) < 1e-10);
});

// ── distanceSq2D ─────────────────────────
console.log('\ndistanceSq2D:');
test('returns squared distance', () => {
  assert.equal(distanceSq2D({ x: 0, y: 0 }, { x: 3, y: 4 }), 25);
});

// ── lerp ─────────────────────────────────
console.log('\nlerp:');
test('t=0 → a', () => { assert.equal(lerp(0, 10, 0), 0); });
test('t=1 → b', () => { assert.equal(lerp(0, 10, 1), 10); });
test('t=0.5 → midpoint', () => { assert.equal(lerp(0, 10, 0.5), 5); });
test('t<0 clamped to 0', () => { assert.equal(lerp(0, 10, -1), 0); });
test('t>1 clamped to 1', () => { assert.equal(lerp(0, 10, 2), 10); });

// ── clamp ────────────────────────────────
console.log('\nclamp:');
test('value within range → value', () => { assert.equal(clamp(5, 0, 10), 5); });
test('value below min → min', () => { assert.equal(clamp(-5, 0, 10), 0); });
test('value above max → max', () => { assert.equal(clamp(15, 0, 10), 10); });
test('value at boundary min', () => { assert.equal(clamp(0, 0, 10), 0); });
test('value at boundary max', () => { assert.equal(clamp(10, 0, 10), 10); });

// ── normalize2D ──────────────────────────
console.log('\nnormalize2D:');
test('unit vector right', () => {
  const n = normalize2D(1, 0);
  assert.equal(n.x, 1);
  assert.equal(n.z, 0);
});

test('unit vector down', () => {
  const n = normalize2D(0, 1);
  assert.equal(n.x, 0);
  assert.equal(n.z, 1);
});

test('diagonal normalized', () => {
  const n = normalize2D(3, 4);
  const len = Math.sqrt(n.x * n.x + n.z * n.z);
  assert.ok(Math.abs(len - 1) < 1e-10);
});

test('zero vector → zero', () => {
  const n = normalize2D(0, 0);
  assert.equal(n.x, 0);
  assert.equal(n.z, 0);
});

// ── circleCollision ──────────────────────
console.log('\ncircleCollision:');
test('overlapping circles → true', () => {
  assert.equal(circleCollision({ x: 0, y: 0 }, 2, { x: 1, y: 0 }, 2), true);
});

test('touching circles (edge) → false', () => {
  assert.equal(circleCollision({ x: 0, y: 0 }, 1, { x: 2, y: 0 }, 1), false);
});

test('far apart → false', () => {
  assert.equal(circleCollision({ x: 0, y: 0 }, 1, { x: 10, y: 0 }, 1), false);
});

test('contained circles → true', () => {
  assert.equal(circleCollision({ x: 0, y: 0 }, 5, { x: 1, y: 0 }, 1), true);
});

// ── worldToGrid ──────────────────────────
console.log('\nworldToGrid:');
test('(0,0) → (0,0)', () => {
  const g = worldToGrid(0, 0);
  assert.deepEqual(g, { gx: 0, gz: 0 });
});

test('(5.5, 3.2) → (5,3)', () => {
  const g = worldToGrid(5.5, 3.2);
  assert.deepEqual(g, { gx: 5, gz: 3 });
});

test('custom tileSize', () => {
  const g = worldToGrid(6, 4, 2);
  assert.deepEqual(g, { gx: 3, gz: 2 });
});

// ── gridToWorld ──────────────────────────
console.log('\ngridToWorld:');
test('(0,0) → center of first tile', () => {
  const w = gridToWorld(0, 0);
  assert.equal(w.x, 0.5);
  assert.equal(w.z, 0.5);
});

test('(1,2) → center of tile', () => {
  const w = gridToWorld(1, 2);
  assert.equal(w.x, 1.5);
  assert.equal(w.z, 2.5);
});

test('custom tileSize', () => {
  const w = gridToWorld(3, 4, 2);
  assert.equal(w.x, 7);
  assert.equal(w.z, 9);
});

// ── degToRad / radToDeg ──────────────────
console.log('\ndegToRad / radToDeg:');
test('90° → π/2', () => { assert.equal(degToRad(90), Math.PI / 2); });
test('π/2 → 90°', () => { assert.equal(radToDeg(Math.PI / 2), 90); });
test('round-trip', () => { assert.equal(radToDeg(degToRad(45)), 45); });

// ── angleToTarget ────────────────────────
console.log('\nangleToTarget:');
test('target to the right → 0', () => {
  const a = angleToTarget({ x: 0, z: 0 }, { x: 1, z: 0 });
  assert.ok(Math.abs(a) < 1e-10);
});

test('target above → π/2', () => {
  const a = angleToTarget({ x: 0, z: 0 }, { x: 0, z: 1 });
  assert.ok(Math.abs(a - Math.PI / 2) < 1e-10);
});

// ── computeAABB ──────────────────────────
console.log('\ncomputeAABB:');
test('simple points', () => {
  const bb = computeAABB([
    { x: 0, y: 0, z: 0 },
    { x: 3, y: 5, z: 7 },
    { x: -1, y: 2, z: -2 },
  ]);
  assert.deepEqual(bb.min, { x: -1, y: 0, z: -2 });
  assert.deepEqual(bb.max, { x: 3, y: 5, z: 7 });
});

// ── randomInt / randomFloat ──────────────
console.log('\nrandomInt / randomFloat:');
test('randomInt in range', () => {
  for (let i = 0; i < 100; i++) {
    const v = randomInt(5, 10);
    assert.ok(v >= 5 && v <= 10, `got ${v}`);
  }
});

test('randomFloat in range', () => {
  for (let i = 0; i < 100; i++) {
    const v = randomFloat(5, 10);
    assert.ok(v >= 5 && v < 10, `got ${v}`);
  }
});

// ── Summary ──────────────────────────────
console.log(`\n${'='.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
