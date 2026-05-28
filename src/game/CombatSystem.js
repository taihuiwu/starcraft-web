// ═══════════════════════════════════════════
// StarCraft Web - 战斗系统 (CombatSystem)
// 复刻SC1战斗公式：攻击类型×体型克制 → 减护甲 → 护盾优先扣减
// 支持普通/爆炸/冲击三种攻击类型
// ═══════════════════════════════════════════

import { ATTACK_TYPE, DAMAGE_TABLE, EVENTS } from '../shared/Constants.js';
import { eventBus } from '../shared/EventBus.js';

export default class CombatSystem {
  /**
   * @param {import('./GameManager.js').default} gameManager
   */
  constructor(gameManager) {
    /** @type {import('./GameManager.js').default} */
    this.gameManager = gameManager;

    /** @type {Array} 待处理的攻击动画/特效队列 */
    this.attackEffects = [];
  }

  /**
   * 初始化战斗系统
   */
  init() {
    console.log('[CombatSystem] 战斗系统初始化完成');
  }

  /**
   * 重置战斗系统
   */
  reset() {
    this.attackEffects = [];
  }

  // ═══════════════════════════════════════
  // 每帧更新
  // ═══════════════════════════════════════

  /**
   * 战斗系统每tick更新
   * 遍历所有有攻击目标的单位，检查攻击冷却并执行伤害计算
   * @param {number} dt - tick间隔（秒）
   */
  update(dt) {
    const gm = this.gameManager;

    for (const unit of gm.units) {
      if (!unit.alive || !unit.attack || !unit.attackTarget) continue;

      // 获取攻击目标
      const target = gm.getUnitById(unit.attackTarget);
      if (!target || !target.alive) {
        unit.attackTarget = null;
        continue;
      }

      // ─── 检查是否在射程内 ────────────
      const dist = this._distance2D(unit.position, target.position);
      if (dist > unit.attack.range) {
        // 目标超出射程，需要追击
        // （由CommandSystem负责移动靠近）
        continue;
      }

      // ─── 攻击冷却计时 ────────────────
      unit.attackCooldown -= dt;

      if (unit.attackCooldown <= 0) {
        // 冷却完毕，执行攻击
        this._performAttack(unit, target);

        // 重置冷却时间（attack.speed = 攻击间隔tick数，转换为秒）
        unit.attackCooldown = unit.attack.speed / 24; // 24 tick/s
      }
    }

    for (const effect of this.attackEffects) {
      effect.lifetime += dt;
    }
    // ─── 就地清理已完成的攻击特效（避免每帧分配新数组） ────────
    for (let i = this.attackEffects.length - 1; i >= 0; i--) {
      if (this.attackEffects[i].lifetime >= this.attackEffects[i].maxLifetime) {
        this.attackEffects.splice(i, 1);
      }
    }
  }

  // ═══════════════════════════════════════
  // 攻击执行
  // ═══════════════════════════════════════

  /**
   * 执行一次攻击
   * @param {Object} attacker - 攻击者
   * @param {Object} defender - 防御者
   */
  _performAttack(attacker, defender) {
    // ─── 计算伤害 ─────────────────────
    const damage = this.calculateDamage(attacker, defender);

    // ─── 应用伤害 ─────────────────────
    const killed = this.applyDamage(defender, damage, attacker.attack.type);

    // ─── 生成攻击特效 ─────────────────
    this._spawnAttackEffect(attacker, defender, damage);

    // ─── 发射弹道（远程攻击） ─────────
    if (attacker.attack.range > 2) {
      this.gameManager.spawnProjectile({
        origin: { ...attacker.position },
        target: defender.id,
        targetPosition: { ...defender.position },
        speed: 15,
        damage: 0, // 伤害已在performAttack中计算
        attackType: attacker.attack.type,
        team: attacker.team,
        maxLifetime: 2,
      });
    }

    // ─── 通知攻击事件 ─────────────────
    eventBus.emit(EVENTS.UNIT_DAMAGE, {
      attacker: attacker.id,
      defender: defender.id,
      damage,
      killed,
    });

    if (killed) {
      eventBus.emit(EVENTS.UNIT_DIED, { unit: defender });
    }
  }

  // ═══════════════════════════════════════
  // 伤害计算（SC1公式）
  // ═══════════════════════════════════════

  /**
   * 计算伤害（使用SC1伤害公式）
   *
   * 公式：实际伤害 = 基础伤害 × 克制系数 - 护甲值
   * 最小伤害为1（除非护甲完全抵消）
   *
   * @param {Object} attacker - 攻击者
   * @param {Object} defender - 防御者
   * @returns {number} 实际伤害值
   */
  calculateDamage(attacker, defender) {
    const baseDamage = attacker.attack.damage;
    const attackType = attacker.attack.type; // 'normal' | 'explosive' | 'concussive'
    const targetSize = defender.unitSize || 'medium'; // 'small' | 'medium' | 'large'
    const armor = defender.armor || 0;

    // 1. 查表获取克制系数
    const multiplier = DAMAGE_TABLE[attackType]?.[targetSize] ?? 1.0;

    // 2. 计算扣除护甲前的伤害
    let damage = baseDamage * multiplier;

    // 3. 扣除护甲值
    damage = Math.max(0, damage - armor);

    // 4. SC1规则：至少造成0点伤害（某些情况下最低1点）
    // 但如果baseDamage×multiplier ≤ armor，则完全格挡
    if (baseDamage * multiplier <= armor) {
      damage = 0;
    } else {
      damage = Math.max(1, Math.floor(damage));
    }

    return damage;
  }

  /**
   * 对目标应用伤害
   * 护盾优先扣减（神族机制），然后扣血，最后判断死亡
   *
   * @param {Object} target - 受伤目标
   * @param {number} damage - 伤害值
   * @param {string} attackType - 攻击类型
   * @returns {boolean} 目标是否被击杀
   */
  applyDamage(target, damage, attackType = 'normal') {
    if (damage <= 0 || !target.alive) return false;

    let remainingDamage = damage;

    // ─── 1. 护盾优先扣减（神族机制） ──
    if (target.shield > 0) {
      if (target.shield >= remainingDamage) {
        target.shield -= remainingDamage;
        remainingDamage = 0;
      } else {
        remainingDamage -= target.shield;
        target.shield = 0;
      }
    }

    // ─── 2. 扣减生命值 ────────────────
    if (remainingDamage > 0) {
      target.hp -= remainingDamage;
    }

    // ─── 3. 死亡判定 ──────────────────
    if (target.hp <= 0) {
      target.hp = 0;
      target.alive = false;
      target.selected = false;
      return true; // 目标被击杀
    }

    return false; // 目标存活
  }

  // ═══════════════════════════════════════
  // 攻击特效
  // ═══════════════════════════════════════

  /**
   * 生成攻击视觉特效
   * @param {Object} attacker
   * @param {Object} defender
   * @param {number} damage
   */
  _spawnAttackEffect(attacker, defender, damage) {
    const effect = {
      type: attacker.attack.type,
      origin: { ...attacker.position },
      target: { ...defender.position },
      damage,
      lifetime: 0,
      maxLifetime: 0.3,
      color: attacker.attack.type === ATTACK_TYPE.EXPLOSIVE ? 0xff6600 :
             attacker.attack.type === ATTACK_TYPE.CONCUSSIVE ? 0x66aaff : 0xffffff,
    };
    this.attackEffects.push(effect);
  }

  // ═══════════════════════════════════════
  // 辅助方法
  // ═══════════════════════════════════════

  /**
   * 计算2D距离
   * @param {Object} a - {x, z}
   * @param {Object} b - {x, z}
   * @returns {number}
   */
  _distance2D(a, b) {
    const dx = a.x - b.x;
    const dz = (a.z || 0) - (b.z || 0);
    return Math.sqrt(dx * dx + dz * dz);
  }

  /**
   * 查找最近的敌方单位
   * @param {Object} unit - 我方单位
   * @param {number} maxRange - 最大搜索范围
   * @returns {Object|null} 最近的敌方单位
   */
  findNearestEnemy(unit, maxRange = 10) {
    const gm = this.gameManager;
    const enemyTeam = unit.team === 1 ? 2 : 1;
    const enemies = gm.getUnitsInRadius(unit.position, maxRange, enemyTeam);

    if (enemies.length === 0) return null;

    let nearest = enemies[0];
    let nearestDist = this._distance2D(unit.position, nearest.position);

    for (let i = 1; i < enemies.length; i++) {
      const dist = this._distance2D(unit.position, enemies[i].position);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = enemies[i];
      }
    }

    return nearest;
  }

  /**
   * 获取当前活跃的攻击特效列表（供渲染层使用）
   * @returns {Array}
   */
  getActiveEffects() {
    return this.attackEffects.filter(e => e.lifetime < e.maxLifetime);
  }
}
