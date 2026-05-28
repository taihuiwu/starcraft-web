// ═══════════════════════════════════════════
// StarCraft Web - CombatSystem 伤害计算单元测试
// ═══════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import { ATTACK_TYPE, UNIT_SIZE, DAMAGE_TABLE } from '../src/shared/Constants.js';
import { FLIGHT_HEIGHT, AIR_HEIGHT_MAP } from '../src/shared/Constants.js';
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

  // ═══════════════════════════════════════════════════
  // 空军攻击能力检查
  // ═══════════════════════════════════════════════════
  describe('Air combat: canAttackTarget', () => {
    const groundUnit = {
      alive: true, isFlying: false, unitSize: 'medium',
      attack: { damage: 10, range: 5, speed: 22, type: ATTACK_TYPE.NORMAL },
    };
    const groundUnitWithAA = {
      alive: true, isFlying: false, unitSize: 'medium',
      attack: {
        damage: 20, range: 5, speed: 30, type: ATTACK_TYPE.NORMAL,
        antiAir: { damage: 20, range: 6, speed: 22, type: ATTACK_TYPE.EXPLOSIVE },
      },
    };
    const airUnit = {
      alive: true, isFlying: true, unitSize: 'small',
      attack: { damage: 8, range: 5, speed: 22, type: ATTACK_TYPE.NORMAL },
    };
    const antiAirOnlyUnit = {
      alive: true, isFlying: true, unitSize: 'large',
      attack: {
        damage: 6, range: 6, speed: 30, type: ATTACK_TYPE.EXPLOSIVE,
        antiAirOnly: true, splash: 2.0,
      },
    };
    const groundOnlyAirUnit = {
      alive: true, isFlying: true, unitSize: 'large',
      attack: {
        damage: 20, range: 8, speed: 30, type: ATTACK_TYPE.EXPLOSIVE,
        groundOnly: true,
      },
    };
    const groundTarget = { alive: true, isFlying: false, unitSize: 'medium' };
    const airTarget = { alive: true, isFlying: true, unitSize: 'small' };

    it('ground unit cannot attack air target (no AA)', () => {
      expect(combat.canAttackTarget(groundUnit, airTarget)).toBe(false);
    });

    it('ground unit can attack ground target', () => {
      expect(combat.canAttackTarget(groundUnit, groundTarget)).toBe(true);
    });

    it('ground unit with AA can attack air target', () => {
      expect(combat.canAttackTarget(groundUnitWithAA, airTarget)).toBe(true);
    });

    it('ground unit with AA can attack ground target', () => {
      expect(combat.canAttackTarget(groundUnitWithAA, groundTarget)).toBe(true);
    });

    it('air unit can attack ground target', () => {
      expect(combat.canAttackTarget(airUnit, groundTarget)).toBe(true);
    });

    it('air unit can attack air target', () => {
      expect(combat.canAttackTarget(airUnit, airTarget)).toBe(true);
    });

    it('antiAirOnly unit can attack air target', () => {
      expect(combat.canAttackTarget(antiAirOnlyUnit, airTarget)).toBe(true);
    });

    it('antiAirOnly unit cannot attack ground target', () => {
      expect(combat.canAttackTarget(antiAirOnlyUnit, groundTarget)).toBe(false);
    });

    it('groundOnly air unit can attack ground target', () => {
      expect(combat.canAttackTarget(groundOnlyAirUnit, groundTarget)).toBe(true);
    });

    it('groundOnly air unit cannot attack air target', () => {
      expect(combat.canAttackTarget(groundOnlyAirUnit, airTarget)).toBe(false);
    });

    it('dead unit cannot attack', () => {
      const deadAttacker = { ...groundUnit, alive: false };
      expect(combat.canAttackTarget(deadAttacker, groundTarget)).toBe(false);
    });

    it('cannot attack dead target', () => {
      const deadTarget = { ...groundTarget, alive: false };
      expect(combat.canAttackTarget(groundUnit, deadTarget)).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════
  // 攻击档案选择
  // ═══════════════════════════════════════════════════
  describe('Air combat: attack profile selection', () => {
    it('selects antiAir profile when target is flying', () => {
      const attacker = {
        attack: {
          damage: 10, range: 5, type: ATTACK_TYPE.NORMAL,
          antiAir: { damage: 20, range: 6, type: ATTACK_TYPE.EXPLOSIVE },
        },
      };
      const flyingTarget = { isFlying: true };
      const profile = combat._selectAttackProfile(attacker, flyingTarget);
      expect(profile).toBe(attacker.attack.antiAir);
      expect(profile.damage).toBe(20);
    });

    it('selects base profile when target is ground', () => {
      const attacker = {
        attack: {
          damage: 10, range: 5, type: ATTACK_TYPE.NORMAL,
          antiAir: { damage: 20, range: 6, type: ATTACK_TYPE.EXPLOSIVE },
        },
      };
      const groundTarget = { isFlying: false };
      const profile = combat._selectAttackProfile(attacker, groundTarget);
      expect(profile).toBe(attacker.attack);
      expect(profile.damage).toBe(10);
    });

    it('returns null when unit has no attack', () => {
      const attacker = { attack: null };
      const target = { isFlying: false };
      expect(combat._selectAttackProfile(attacker, target)).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════
  // 飞行高度系统
  // ═══════════════════════════════════════════════════
  describe('Flight height system', () => {
    it('ground unit has height 0', () => {
      expect(combat.getFlightHeight({ isFlying: false })).toBe(FLIGHT_HEIGHT.GROUND);
    });

    it('small flying unit is at low altitude', () => {
      expect(combat.getFlightHeight({ isFlying: true, unitSize: 'small' }))
        .toBe(FLIGHT_HEIGHT.LOW_ALTITUDE);
    });

    it('medium flying unit is at low altitude', () => {
      expect(combat.getFlightHeight({ isFlying: true, unitSize: 'medium' }))
        .toBe(FLIGHT_HEIGHT.LOW_ALTITUDE);
    });

    it('large flying unit is at high altitude', () => {
      expect(combat.getFlightHeight({ isFlying: true, unitSize: 'large' }))
        .toBe(FLIGHT_HEIGHT.HIGH_ALTITUDE);
    });

    it('getUnitWorldPosition includes flight height', () => {
      const unit = { isFlying: true, unitSize: 'small', position: { x: 5, z: 10 } };
      const pos = combat.getUnitWorldPosition(unit);
      expect(pos.x).toBe(5);
      expect(pos.z).toBe(10);
      expect(pos.y).toBe(FLIGHT_HEIGHT.LOW_ALTITUDE);
    });

    it('getUnitWorldPosition for ground unit is flat', () => {
      const unit = { isFlying: false, position: { x: 5, y: 0, z: 10 } };
      const pos = combat.getUnitWorldPosition(unit);
      expect(pos.y).toBe(0);
    });

    it('AIR_HEIGHT_MAP has correct entries', () => {
      expect(AIR_HEIGHT_MAP[UNIT_SIZE.SMALL]).toBe(FLIGHT_HEIGHT.LOW_ALTITUDE);
      expect(AIR_HEIGHT_MAP[UNIT_SIZE.MEDIUM]).toBe(FLIGHT_HEIGHT.LOW_ALTITUDE);
      expect(AIR_HEIGHT_MAP[UNIT_SIZE.LARGE]).toBe(FLIGHT_HEIGHT.HIGH_ALTITUDE);
    });
  });

  // ═══════════════════════════════════════════════════
  // findNearestEnemy 空军过滤
  // ═══════════════════════════════════════════════════
  describe('findNearestEnemy with air units', () => {
    it('ground unit without AA ignores air targets', () => {
      const gm = {
        units: [],
        getUnitsInRadius: () => [
          { id: 1, alive: true, isFlying: true, unitSize: 'small',
            position: { x: 1, z: 0 } },
          { id: 2, alive: true, isFlying: false, unitSize: 'medium',
            position: { x: 2, z: 0 } },
        ],
      };
      const cs = new CombatSystem(gm);
      const unit = {
        team: 1, alive: true, isFlying: false, position: { x: 0, z: 0 },
        attack: { damage: 10, range: 5, type: ATTACK_TYPE.NORMAL },
      };
      const enemy = cs.findNearestEnemy(unit, 10);
      // Should skip the flying target (id:1) and find the ground target (id:2)
      expect(enemy).not.toBeNull();
      expect(enemy.id).toBe(2);
    });

    it('ground unit with AA can target air units', () => {
      const gm = {
        units: [],
        getUnitsInRadius: () => [
          { id: 1, alive: true, isFlying: true, unitSize: 'small',
            position: { x: 1, z: 0 } },
          { id: 2, alive: true, isFlying: false, unitSize: 'medium',
            position: { x: 5, z: 0 } },
        ],
      };
      const cs = new CombatSystem(gm);
      const unit = {
        team: 1, alive: true, isFlying: false, position: { x: 0, z: 0 },
        attack: {
          damage: 10, range: 5, type: ATTACK_TYPE.NORMAL,
          antiAir: { damage: 20, range: 6, type: ATTACK_TYPE.EXPLOSIVE },
        },
      };
      const enemy = cs.findNearestEnemy(unit, 10);
      // Should find air target (id:1) as nearest
      expect(enemy).not.toBeNull();
      expect(enemy.id).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════
  // 攻击特效（空战颜色区分）
  // ═══════════════════════════════════════════════════
  describe('Attack effects with air units', () => {
    it('air-to-air effect has correct flags', () => {
      combat.attackEffects = [];
      const attacker = { isFlying: true, position: { x: 0, z: 0 } };
      const defender = { isFlying: true, position: { x: 5, z: 0 } };
      combat._spawnAttackEffect(attacker, defender, 10,
        { type: ATTACK_TYPE.EXPLOSIVE });
      const effect = combat.attackEffects[0];
      expect(effect.isAirToAir).toBe(true);
      expect(effect.isGroundToAir).toBe(false);
    });

    it('ground-to-air effect has correct flags', () => {
      combat.attackEffects = [];
      const attacker = { isFlying: false, position: { x: 0, z: 0 } };
      const defender = { isFlying: true, position: { x: 5, z: 0 } };
      combat._spawnAttackEffect(attacker, defender, 10,
        { type: ATTACK_TYPE.EXPLOSIVE });
      const effect = combat.attackEffects[0];
      expect(effect.isAirToAir).toBe(false);
      expect(effect.isGroundToAir).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════
  // 使用攻击档案计算伤害
  // ═══════════════════════════════════════════════════
  describe('calculateDamage with attackProfile', () => {
    it('uses attackProfile when provided', () => {
      const attacker = {
        attack: { damage: 10, type: ATTACK_TYPE.NORMAL },
      };
      const defender = { unitSize: 'large', armor: 0 };
      // Use explosive profile against large = 1.0x
      const profile = { damage: 20, type: ATTACK_TYPE.EXPLOSIVE };
      expect(combat.calculateDamage(attacker, defender, profile)).toBe(20);
    });
  });
});
