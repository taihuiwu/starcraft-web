// ═══════════════════════════════════════════
// StarCraft Web - CombatSystem 伤害计算单元测试
// ═══════════════════════════════════════════

import { describe, it, expect } from 'vitest';
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

describe('CombatSystem', () => {
  // ── Normal攻击对三种体型 ─────────────────
  describe('Normal attack (multiplier 1.0 for all)', () => {
    it('Normal vs Small (10 dmg, 0 armor) → 10', () => {
      expect(calculateDamage(10, ATTACK_TYPE.NORMAL, UNIT_SIZE.SMALL, 0)).toBe(10);
    });

    it('Normal vs Medium (10 dmg, 0 armor) → 10', () => {
      expect(calculateDamage(10, ATTACK_TYPE.NORMAL, UNIT_SIZE.MEDIUM, 0)).toBe(10);
    });

    it('Normal vs Large (10 dmg, 0 armor) → 10', () => {
      expect(calculateDamage(10, ATTACK_TYPE.NORMAL, UNIT_SIZE.LARGE, 0)).toBe(10);
    });
  });

  // ── Explosive攻击对三种体型 ──────────────
  describe('Explosive attack', () => {
    it('Explosive vs Small (10 dmg) → 2 (10×0.25=2.5→2)', () => {
      expect(calculateDamage(10, ATTACK_TYPE.EXPLOSIVE, UNIT_SIZE.SMALL, 0)).toBe(2);
    });

    it('Explosive vs Medium (10 dmg) → 5 (10×0.5=5)', () => {
      expect(calculateDamage(10, ATTACK_TYPE.EXPLOSIVE, UNIT_SIZE.MEDIUM, 0)).toBe(5);
    });

    it('Explosive vs Large (10 dmg) → 10 (10×1.0=10)', () => {
      expect(calculateDamage(10, ATTACK_TYPE.EXPLOSIVE, UNIT_SIZE.LARGE, 0)).toBe(10);
    });
  });

  // ── Concussive攻击对三种体型 ─────────────
  describe('Concussive attack', () => {
    it('Concussive vs Small (10 dmg) → 10 (10×1.0=10)', () => {
      expect(calculateDamage(10, ATTACK_TYPE.CONCUSSIVE, UNIT_SIZE.SMALL, 0)).toBe(10);
    });

    it('Concussive vs Medium (10 dmg) → 5 (10×0.5=5)', () => {
      expect(calculateDamage(10, ATTACK_TYPE.CONCUSSIVE, UNIT_SIZE.MEDIUM, 0)).toBe(5);
    });

    it('Concussive vs Large (10 dmg) → 2 (10×0.25=2.5→2)', () => {
      expect(calculateDamage(10, ATTACK_TYPE.CONCUSSIVE, UNIT_SIZE.LARGE, 0)).toBe(2);
    });
  });

  // ── 护甲减免 ────────────────────────────
  describe('Armor reduction', () => {
    it('Normal 10dmg vs 2 armor → 8', () => {
      expect(calculateDamage(10, ATTACK_TYPE.NORMAL, UNIT_SIZE.MEDIUM, 2)).toBe(8);
    });

    it('Explosive 10dmg vs Medium with 1 armor → 4 (5-1=4)', () => {
      expect(calculateDamage(10, ATTACK_TYPE.EXPLOSIVE, UNIT_SIZE.MEDIUM, 1)).toBe(4);
    });

    it('Concussive 10dmg vs Large with 1 armor → 1 (2.5-1=1.5→1)', () => {
      expect(calculateDamage(10, ATTACK_TYPE.CONCUSSIVE, UNIT_SIZE.LARGE, 1)).toBe(1);
    });

    it('armor completely blocks damage → 0', () => {
      // 10 × 0.25 (concussive vs large) = 2.5, armor = 3
      expect(calculateDamage(10, ATTACK_TYPE.CONCUSSIVE, UNIT_SIZE.LARGE, 3)).toBe(0);
    });

    it('armor fully negates → 0 (explosive vs small, high armor)', () => {
      // 10 × 0.25 = 2.5, armor = 5 → fully blocked
      expect(calculateDamage(10, ATTACK_TYPE.EXPLOSIVE, UNIT_SIZE.SMALL, 5)).toBe(0);
    });

    it('minimum damage is 1 when not fully blocked', () => {
      // 10 × 0.25 = 2.5, armor = 2 → 0.5 → floor = 0, but not fully blocked → min 1
      const result = calculateDamage(10, ATTACK_TYPE.EXPLOSIVE, UNIT_SIZE.SMALL, 2);
      expect(result).toBe(1);
    });
  });

  // ── 护盾优先扣减 ────────────────────────
  describe('Shield absorption', () => {
    it('shield absorbs all damage', () => {
      const target = { hp: 100, shield: 50, alive: true, selected: true };
      const killed = applyDamage(target, 30);
      expect(killed).toBe(false);
      expect(target.shield).toBe(20);
      expect(target.hp).toBe(100);
    });

    it('shield partially absorbs damage', () => {
      const target = { hp: 100, shield: 10, alive: true, selected: true };
      const killed = applyDamage(target, 30);
      expect(killed).toBe(false);
      expect(target.shield).toBe(0);
      expect(target.hp).toBe(80); // 30 - 10 = 20 to HP
    });

    it('damage goes to HP when no shield', () => {
      const target = { hp: 100, shield: 0, alive: true, selected: true };
      const killed = applyDamage(target, 50);
      expect(killed).toBe(false);
      expect(target.hp).toBe(50);
    });

    it('lethal damage kills target', () => {
      const target = { hp: 30, shield: 0, alive: true, selected: true };
      const killed = applyDamage(target, 50);
      expect(killed).toBe(true);
      expect(target.hp).toBe(0);
      expect(target.alive).toBe(false);
      expect(target.selected).toBe(false);
    });

    it('shield + hp both depleted', () => {
      const target = { hp: 20, shield: 10, alive: true, selected: true };
      const killed = applyDamage(target, 50);
      expect(killed).toBe(true);
      expect(target.shield).toBe(0);
      expect(target.hp).toBe(0);
      expect(target.alive).toBe(false);
    });

    it('zero damage → no effect', () => {
      const target = { hp: 100, shield: 50, alive: true, selected: true };
      const killed = applyDamage(target, 0);
      expect(killed).toBe(false);
      expect(target.hp).toBe(100);
      expect(target.shield).toBe(50);
    });

    it('damage to dead target → no effect', () => {
      const target = { hp: 0, shield: 0, alive: false, selected: false };
      const killed = applyDamage(target, 50);
      expect(killed).toBe(false);
    });

    it('negative damage → no effect', () => {
      const target = { hp: 100, shield: 0, alive: true, selected: false };
      const killed = applyDamage(target, -10);
      expect(killed).toBe(false);
      expect(target.hp).toBe(100);
    });
  });

  // ── DAMAGE_TABLE 验证 ────────────────────
  describe('DAMAGE_TABLE validation', () => {
    it('all attack types have entries for all sizes', () => {
      const attackTypes = [ATTACK_TYPE.NORMAL, ATTACK_TYPE.EXPLOSIVE, ATTACK_TYPE.CONCUSSIVE];
      const sizes = [UNIT_SIZE.SMALL, UNIT_SIZE.MEDIUM, UNIT_SIZE.LARGE];
      for (const at of attackTypes) {
        for (const sz of sizes) {
          expect(DAMAGE_TABLE[at]?.[sz]).toBeDefined();
        }
      }
    });

    it('Normal has 1.0 multiplier for all sizes', () => {
      expect(DAMAGE_TABLE[ATTACK_TYPE.NORMAL][UNIT_SIZE.SMALL]).toBe(1.0);
      expect(DAMAGE_TABLE[ATTACK_TYPE.NORMAL][UNIT_SIZE.MEDIUM]).toBe(1.0);
      expect(DAMAGE_TABLE[ATTACK_TYPE.NORMAL][UNIT_SIZE.LARGE]).toBe(1.0);
    });

    it('Explosive: small=0.25, medium=0.5, large=1.0', () => {
      expect(DAMAGE_TABLE[ATTACK_TYPE.EXPLOSIVE][UNIT_SIZE.SMALL]).toBe(0.25);
      expect(DAMAGE_TABLE[ATTACK_TYPE.EXPLOSIVE][UNIT_SIZE.MEDIUM]).toBe(0.5);
      expect(DAMAGE_TABLE[ATTACK_TYPE.EXPLOSIVE][UNIT_SIZE.LARGE]).toBe(1.0);
    });

    it('Concussive: small=1.0, medium=0.5, large=0.25', () => {
      expect(DAMAGE_TABLE[ATTACK_TYPE.CONCUSSIVE][UNIT_SIZE.SMALL]).toBe(1.0);
      expect(DAMAGE_TABLE[ATTACK_TYPE.CONCUSSIVE][UNIT_SIZE.MEDIUM]).toBe(0.5);
      expect(DAMAGE_TABLE[ATTACK_TYPE.CONCUSSIVE][UNIT_SIZE.LARGE]).toBe(0.25);
    });
  });
});
