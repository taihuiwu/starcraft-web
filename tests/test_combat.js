// ═══════════════════════════════════════════
// StarCraft Web - CombatSystem 伤害计算单元测试
// ═══════════════════════════════════════════

import assert from 'node:assert/strict';
import { ATTACK_TYPE, UNIT_SIZE, DAMAGE_TABLE } from '../src/shared/Constants.js';
import CombatSystem from '../src/game/CombatSystem.js';

// Create a CombatSystem instance with a mock gameManager
const combat = new CombatSystem({});

/**
 * Wrapper matching original test signature for calculateDamage
 */
function calculateDamage(baseDamage, attackType, targetSize, armor) {
  const attacker = { attack: { damage: baseDamage, type: attackType } };
  const defender = { unitSize: targetSize, armor };
  return combat.calculateDamage(attacker, defender);
}

/**
 * Wrapper matching original test signature for applyDamage
 */
function applyDamage(target, damage, attackType = 'normal') {
  return combat.applyDamage(target, damage, attackType);
}

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

console.log('=== CombatSystem Tests ===\\n');

// ── Normal攻击对三种体型 ─────────────────
console.log('Normal attack (multiplier 1.0 for all):');
test('Normal vs Small (10 dmg, 0 armor) → 10', () => {
  assert.equal(calculateDamage(10, ATTACK_TYPE.NORMAL, UNIT_SIZE.SMALL, 0), 10);
});

test('Normal vs Medium (10 dmg, 0 armor) → 10', () => {
  assert.equal(calculateDamage(10, ATTACK_TYPE.NORMAL, UNIT_SIZE.MEDIUM, 0), 10);
});

test('Normal vs Large (10 dmg, 0 armor) → 10', () => {
  assert.equal(calculateDamage(10, ATTACK_TYPE.NORMAL, UNIT_SIZE.LARGE, 0), 10);
});

// ── Explosive攻击对三种体型 ──────────────
console.log('\nExplosive attack:');
test('Explosive vs Small (10 dmg) → 2 (10×0.25=2.5→2)', () => {
  assert.equal(calculateDamage(10, ATTACK_TYPE.EXPLOSIVE, UNIT_SIZE.SMALL, 0), 2);
});

test('Explosive vs Medium (10 dmg) → 5 (10×0.5=5)', () => {
  assert.equal(calculateDamage(10, ATTACK_TYPE.EXPLOSIVE, UNIT_SIZE.MEDIUM, 0), 5);
});

test('Explosive vs Large (10 dmg) → 10 (10×1.0=10)', () => {
  assert.equal(calculateDamage(10, ATTACK_TYPE.EXPLOSIVE, UNIT_SIZE.LARGE, 0), 10);
});

// ── Concussive攻击对三种体型 ─────────────
console.log('\nConcussive attack:');
test('Concussive vs Small (10 dmg) → 10 (10×1.0=10)', () => {
  assert.equal(calculateDamage(10, ATTACK_TYPE.CONCUSSIVE, UNIT_SIZE.SMALL, 0), 10);
});

test('Concussive vs Medium (10 dmg) → 5 (10×0.5=5)', () => {
  assert.equal(calculateDamage(10, ATTACK_TYPE.CONCUSSIVE, UNIT_SIZE.MEDIUM, 0), 5);
});

test('Concussive vs Large (10 dmg) → 2 (10×0.25=2.5→2)', () => {
  assert.equal(calculateDamage(10, ATTACK_TYPE.CONCUSSIVE, UNIT_SIZE.LARGE, 0), 2);
});

// ── 护甲减免 ────────────────────────────
console.log('\nArmor reduction:');
test('Normal 10dmg vs 2 armor → 8', () => {
  assert.equal(calculateDamage(10, ATTACK_TYPE.NORMAL, UNIT_SIZE.MEDIUM, 2), 8);
});

test('Explosive 10dmg vs Medium with 1 armor → 4 (5-1=4)', () => {
  assert.equal(calculateDamage(10, ATTACK_TYPE.EXPLOSIVE, UNIT_SIZE.MEDIUM, 1), 4);
});

test('Concussive 10dmg vs Large with 1 armor → 1 (2.5-1=1.5→1)', () => {
  assert.equal(calculateDamage(10, ATTACK_TYPE.CONCUSSIVE, UNIT_SIZE.LARGE, 1), 1);
});

test('armor completely blocks damage → 0', () => {
  // 10 × 0.25 (concussive vs large) = 2.5, armor = 3
  assert.equal(calculateDamage(10, ATTACK_TYPE.CONCUSSIVE, UNIT_SIZE.LARGE, 3), 0);
});

test('armor fully negates → 0 (explosive vs small, high armor)', () => {
  // 10 × 0.25 = 2.5, armor = 5 → fully blocked
  assert.equal(calculateDamage(10, ATTACK_TYPE.EXPLOSIVE, UNIT_SIZE.SMALL, 5), 0);
});

test('minimum damage is 1 when not fully blocked', () => {
  // 10 × 0.25 = 2.5, armor = 2 → 0.5 → floor = 0, but not fully blocked → min 1
  const result = calculateDamage(10, ATTACK_TYPE.EXPLOSIVE, UNIT_SIZE.SMALL, 2);
  assert.equal(result, 1);
});

// ── 护盾优先扣减 ────────────────────────
console.log('\nShield absorption:');
test('shield absorbs all damage', () => {
  const target = { hp: 100, shield: 50, alive: true, selected: true };
  const killed = applyDamage(target, 30);
  assert.equal(killed, false);
  assert.equal(target.shield, 20);
  assert.equal(target.hp, 100);
});

test('shield partially absorbs damage', () => {
  const target = { hp: 100, shield: 10, alive: true, selected: true };
  const killed = applyDamage(target, 30);
  assert.equal(killed, false);
  assert.equal(target.shield, 0);
  assert.equal(target.hp, 80); // 30 - 10 = 20 to HP
});

test('damage goes to HP when no shield', () => {
  const target = { hp: 100, shield: 0, alive: true, selected: true };
  const killed = applyDamage(target, 50);
  assert.equal(killed, false);
  assert.equal(target.hp, 50);
});

test('lethal damage kills target', () => {
  const target = { hp: 30, shield: 0, alive: true, selected: true };
  const killed = applyDamage(target, 50);
  assert.equal(killed, true);
  assert.equal(target.hp, 0);
  assert.equal(target.alive, false);
  assert.equal(target.selected, false);
});

test('shield + hp both depleted', () => {
  const target = { hp: 20, shield: 10, alive: true, selected: true };
  const killed = applyDamage(target, 50);
  assert.equal(killed, true);
  assert.equal(target.shield, 0);
  assert.equal(target.hp, 0);
  assert.equal(target.alive, false);
});

test('zero damage → no effect', () => {
  const target = { hp: 100, shield: 50, alive: true, selected: true };
  const killed = applyDamage(target, 0);
  assert.equal(killed, false);
  assert.equal(target.hp, 100);
  assert.equal(target.shield, 50);
});

test('damage to dead target → no effect', () => {
  const target = { hp: 0, shield: 0, alive: false, selected: false };
  const killed = applyDamage(target, 50);
  assert.equal(killed, false);
});

test('negative damage → no effect', () => {
  const target = { hp: 100, shield: 0, alive: true, selected: false };
  const killed = applyDamage(target, -10);
  assert.equal(killed, false);
  assert.equal(target.hp, 100);
});

// ── DAMAGE_TABLE 验证 ────────────────────
console.log('\nDAMAGE_TABLE validation:');
test('all attack types have entries for all sizes', () => {
  const attackTypes = [ATTACK_TYPE.NORMAL, ATTACK_TYPE.EXPLOSIVE, ATTACK_TYPE.CONCUSSIVE];
  const sizes = [UNIT_SIZE.SMALL, UNIT_SIZE.MEDIUM, UNIT_SIZE.LARGE];
  for (const at of attackTypes) {
    for (const sz of sizes) {
      assert.ok(DAMAGE_TABLE[at]?.[sz] !== undefined,
        `DAMAGE_TABLE[${at}][${sz}] should be defined`);
    }
  }
});

test('Normal has 1.0 multiplier for all sizes', () => {
  assert.equal(DAMAGE_TABLE[ATTACK_TYPE.NORMAL][UNIT_SIZE.SMALL], 1.0);
  assert.equal(DAMAGE_TABLE[ATTACK_TYPE.NORMAL][UNIT_SIZE.MEDIUM], 1.0);
  assert.equal(DAMAGE_TABLE[ATTACK_TYPE.NORMAL][UNIT_SIZE.LARGE], 1.0);
});

test('Explosive: small=0.25, medium=0.5, large=1.0', () => {
  assert.equal(DAMAGE_TABLE[ATTACK_TYPE.EXPLOSIVE][UNIT_SIZE.SMALL], 0.25);
  assert.equal(DAMAGE_TABLE[ATTACK_TYPE.EXPLOSIVE][UNIT_SIZE.MEDIUM], 0.5);
  assert.equal(DAMAGE_TABLE[ATTACK_TYPE.EXPLOSIVE][UNIT_SIZE.LARGE], 1.0);
});

test('Concussive: small=1.0, medium=0.5, large=0.25', () => {
  assert.equal(DAMAGE_TABLE[ATTACK_TYPE.CONCUSSIVE][UNIT_SIZE.SMALL], 1.0);
  assert.equal(DAMAGE_TABLE[ATTACK_TYPE.CONCUSSIVE][UNIT_SIZE.MEDIUM], 0.5);
  assert.equal(DAMAGE_TABLE[ATTACK_TYPE.CONCUSSIVE][UNIT_SIZE.LARGE], 0.25);
});

// ── Summary ──────────────────────────────
console.log(`\n${'='.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
