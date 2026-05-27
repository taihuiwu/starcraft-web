// ═══════════════════════════════════════════
// StarCraft Web - ResourceManager 单元测试
// ═══════════════════════════════════════════

import assert from 'node:assert/strict';
import { GAME, RESOURCE, EVENTS } from '../src/shared/Constants.js';
import { eventBus } from '../src/shared/EventBus.js';

// Mock GameManager (ResourceManager only stores a reference, doesn't call it in basic ops)
class MockGameManager {
  constructor() {
    this.units = [];
    this.buildings = [];
  }
}

// Import ResourceManager
import ResourceManager from '../src/shared/../game/ResourceManager.js';

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

function createRM() {
  const rm = new ResourceManager(new MockGameManager());
  rm.init();
  return rm;
}

console.log('=== ResourceManager Tests ===\n');

// ── 初始化 ───────────────────────────────
console.log('initialization:');
test('init creates players 1-8', () => {
  const rm = createRM();
  for (let t = 1; t <= 8; t++) {
    assert.ok(rm.players[t], `team ${t} should exist`);
    assert.equal(rm.players[t].minerals, GAME.STARTING_MINERALS);
    assert.equal(rm.players[t].gas, GAME.STARTING_GAS);
    assert.equal(rm.players[t].supply, 0);
    assert.equal(rm.players[t].supplyMax, GAME.STARTING_SUPPLY);
  }
});

test('getResources returns existing player data', () => {
  const rm = createRM();
  const res = rm.getResources(1);
  assert.equal(res.minerals, GAME.STARTING_MINERALS);
});

test('getResources auto-creates unknown team', () => {
  const rm = createRM();
  const res = rm.getResources(99);
  assert.equal(res.minerals, 0);
  assert.equal(res.gas, 0);
});

// ── addResource ──────────────────────────
console.log('\naddResource:');
test('add minerals', () => {
  const rm = createRM();
  rm.addResource(1, RESOURCE.MINERALS, 100);
  assert.equal(rm.players[1].minerals, GAME.STARTING_MINERALS + 100);
});

test('add gas', () => {
  const rm = createRM();
  rm.addResource(1, RESOURCE.GAS, 50);
  assert.equal(rm.players[1].gas, 50);
});

test('addResource emits event', () => {
  const rm = createRM();
  let eventFired = false;
  const unsub = eventBus.on(EVENTS.RESOURCE_CHANGED, () => { eventFired = true; });
  rm.addResource(1, RESOURCE.MINERALS, 10);
  unsub();
  eventBus.clearAll();
  assert.equal(eventFired, true);
});

// ── spend ────────────────────────────────
console.log('\nspend:');
test('spend minerals succeeds when affordable', () => {
  const rm = createRM();
  const result = rm.spend(1, { minerals: 50 });
  assert.equal(result, true);
  assert.equal(rm.players[1].minerals, GAME.STARTING_MINERALS - 50);
});

test('spend minerals fails when insufficient', () => {
  const rm = createRM();
  const result = rm.spend(1, { minerals: 9999 });
  assert.equal(result, false);
  assert.equal(rm.players[1].minerals, GAME.STARTING_MINERALS); // unchanged
});

test('spend gas succeeds', () => {
  const rm = createRM();
  rm.addResource(1, RESOURCE.GAS, 100);
  const result = rm.spend(1, { gas: 30 });
  assert.equal(result, true);
  assert.equal(rm.players[1].gas, 70);
});

test('spend supply succeeds within cap', () => {
  const rm = createRM();
  const result = rm.spend(1, { supply: 5 });
  assert.equal(result, true);
  assert.equal(rm.players[1].supply, 5);
});

test('spend supply fails when over cap', () => {
  const rm = createRM();
  const result = rm.spend(1, { supply: 999 });
  assert.equal(result, false);
  assert.equal(rm.players[1].supply, 0);
});

test('spend combined cost', () => {
  const rm = createRM();
  rm.addResource(1, RESOURCE.MINERALS, 100);
  rm.addResource(1, RESOURCE.GAS, 100);
  const result = rm.spend(1, { minerals: 100, gas: 50, supply: 2 });
  assert.equal(result, true);
  assert.equal(rm.players[1].minerals, GAME.STARTING_MINERALS + 100 - 100);
  assert.equal(rm.players[1].gas, 50);
  assert.equal(rm.players[1].supply, 2);
});

// ── canAfford ────────────────────────────
console.log('\ncanAfford:');
test('canAfford with enough resources', () => {
  const rm = createRM();
  assert.equal(rm.canAfford(1, { minerals: 50 }), true);
});

test('canAfford with insufficient resources', () => {
  const rm = createRM();
  assert.equal(rm.canAfford(1, { minerals: 9999 }), false);
});

test('canAfford gas-only cost', () => {
  const rm = createRM();
  rm.addResource(1, RESOURCE.GAS, 50);
  assert.equal(rm.canAfford(1, { gas: 30 }), true);
  assert.equal(rm.canAfford(1, { gas: 60 }), false);
});

test('canAfford supply within cap', () => {
  const rm = createRM();
  assert.equal(rm.canAfford(1, { supply: GAME.STARTING_SUPPLY }), true);
  assert.equal(rm.canAfford(1, { supply: GAME.STARTING_SUPPLY + 1 }), false);
});

test('canAfford empty cost → true', () => {
  const rm = createRM();
  assert.equal(rm.canAfford(1, {}), true);
});

// ── supply management ────────────────────
console.log('\nsupply management:');
test('addSupply increases supply', () => {
  const rm = createRM();
  rm.addSupply(1, 3);
  assert.equal(rm.players[1].supply, 3);
});

test('releaseSupply decreases supply', () => {
  const rm = createRM();
  rm.addSupply(1, 5);
  rm.releaseSupply(1, 2);
  assert.equal(rm.players[1].supply, 3);
});

test('releaseSupply cannot go below 0', () => {
  const rm = createRM();
  rm.addSupply(1, 2);
  rm.releaseSupply(1, 10);
  assert.equal(rm.players[1].supply, 0);
});

test('addSupplyMax increases cap', () => {
  const rm = createRM();
  rm.addSupplyMax(1, 8);
  assert.equal(rm.players[1].supplyMax, GAME.STARTING_SUPPLY + 8);
});

test('addSupplyMax capped at MAX_SUPPLY', () => {
  const rm = createRM();
  rm.addSupplyMax(1, 9999);
  assert.equal(rm.players[1].supplyMax, GAME.MAX_SUPPLY);
});

// ── refund ───────────────────────────────
console.log('\nrefund:');
test('refund returns 75% by default', () => {
  const rm = createRM();
  rm.refund(1, { minerals: 100, gas: 40 });
  assert.equal(rm.players[1].minerals, GAME.STARTING_MINERALS + 75);
  assert.equal(rm.players[1].gas, 30); // 40 * 0.75 = 30
});

test('refund custom rate', () => {
  const rm = createRM();
  rm.refund(1, { minerals: 100 }, 0.5);
  assert.equal(rm.players[1].minerals, GAME.STARTING_MINERALS + 50);
});

// ── mineral patches ──────────────────────
console.log('\nmineral patches:');
test('registerMineralPatch', () => {
  const rm = createRM();
  const patch = rm.registerMineralPatch({ position: { x: 10, z: 10 } });
  assert.equal(patch.amount, 1500);
  assert.equal(patch.yieldPerTick, 7);
});

test('registerGasGeyser', () => {
  const rm = createRM();
  const geyser = rm.registerGasGeyser({ position: { x: 20, z: 20 } });
  assert.equal(geyser.amount, 2500);
  assert.equal(geyser.yieldPerTick, 8);
});

// ── Summary ──────────────────────────────
console.log(`\n${'='.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
