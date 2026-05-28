// ═══════════════════════════════════════════
// StarCraft Web - 战斗系统 (CombatSystem)
// 复刻SC1战斗公式：攻击类型×体型克制 → 减护甲 → 护盾优先扣减
// 支持普通/爆炸/冲击三种攻击类型
// 支持空中单位战斗：防空能力检查、攻击档案切换、自杀式攻击
// ═══════════════════════════════════════════

import {
  ATTACK_TYPE, DAMAGE_TABLE, EVENTS,
  FLIGHT_HEIGHT, AIR_HEIGHT_MAP, AIR_EFFECT_COLORS,
  UNIT_SIZE,
} from '../shared/Constants.js';
import { eventBus } from '../shared/EventBus.js';
import { effectiveHP } from '../shared/MathUtils.js';

/**
 * 获取飞行单位在Y轴上的飞行高度
 * @param {Object} unit - 单位实例
 * @returns {number} Y轴偏移量（地面为0）
 */
function getFlightHeight(unit) {
  if (!unit || !unit.isFlying) return FLIGHT_HEIGHT.GROUND;
  const size = unit.unitSize || 'medium';
  return AIR_HEIGHT_MAP[size] ?? FLIGHT_HEIGHT.LOW_ALTITUDE;
}

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
  // 空军能力检查
  // ═══════════════════════════════════════

  /**
   * 判断攻击者是否能攻击目标（核心空军逻辑）
   *
   * 规则（复刻SC1）：
   *  1. 地面单位默认只能攻击地面目标
   *  2. 地面单位拥有 antiAir 属性时，可额外攻击空中目标
   *  3. 空中单位默认可攻击地面和空中目标
   *  4. 空中单位的 antiAirOnly=true 时，只能攻击空中目标（对空专用）
   *  5. 空中单位的 groundOnly=true 时，只能攻击地面目标（如守护者）
   *
   * @param {Object} attacker - 攻击者单位实例
   * @param {Object} target - 目标单位实例
   * @returns {boolean} 是否可以攻击
   */
  canAttackTarget(attacker, target) {
    if (!attacker || !target) return false;
    if (!attacker.alive || !target.alive) return false;
    if (!attacker.attack) return false;

    const attackerFlying = !!attacker.isFlying;
    const targetFlying = !!target.isFlying;

    // ── 选择攻击档案，检查限制属性 ──────
    const attackProfile = this._selectAttackProfile(attacker, target);

    // ── antiAirOnly: 只能攻击空中目标 ──────
    if (attackProfile && attackProfile.antiAirOnly) {
      return targetFlying;
    }

    // ── groundOnly: 只能攻击地面目标 ──────
    if (attackProfile && attackProfile.groundOnly) {
      return !targetFlying;
    }

    if (attackerFlying) {
      // ── 空中攻击者：默认可攻击所有目标 ──
      return true;
    } else {
      // ── 地面攻击者 ──
      if (targetFlying) {
        // 地面单位打空中，需要antiAir能力
        return this._hasAntiAirCapability(attacker);
      }
      return true; // 地面打地面，始终允许
    }
  }

  /**
   * 检查单位是否具有防空能力（地面单位打空中必须满足）
   * 通过检查 attack.antiAir 子属性是否存在来判定
   *
   * @param {Object} unit - 单位实例
   * @returns {boolean}
   */
  _hasAntiAirCapability(unit) {
    if (!unit.attack) return false;
    return !!unit.attack.antiAir;
  }

  /**
   * 根据目标类型选择合适的攻击档案（attack profile）
   *
   * SC1规则：
   *  - 目标是空中：使用 attack.antiAir（如果存在）
   *  - 目标是地面：使用基础 attack 属性
   *  - 如果没有对应的攻击档案，返回null（不能攻击）
   *
   * @param {Object} attacker - 攻击者
   * @param {Object} target - 目标
   * @returns {Object|null} 攻击档案 { damage, range, speed, type, ... } 或 null
   */
  _selectAttackProfile(attacker, target) {
    if (!attacker.attack) return null;

    const targetFlying = !!target.isFlying;

    if (targetFlying && attacker.attack.antiAir) {
      // 目标飞行中，且有对空武器 → 使用对空攻击档案
      return attacker.attack.antiAir;
    }

    // 使用默认攻击档案（对地 / 通用）
    return attacker.attack;
  }

  // ═══════════════════════════════════════
  // 飞行高度系统
  // ═══════════════════════════════════════

  /**
   * 获取飞行单位在Y轴上的渲染高度（供外部调用）
   * @param {Object} unit - 单位实例
   * @returns {number} Y轴偏移量
   */
  getFlightHeight(unit) {
    return getFlightHeight(unit);
  }

  /**
   * 获取飞行单位位置（含高度），用于渲染和弹道计算
   *
   * @param {Object} unit - 单位实例
   * @returns {Object} { x, y, z } — y已包含飞行高度偏移
   */
  getUnitWorldPosition(unit) {
    const pos = unit.position;
    const yOff = getFlightHeight(unit);
    return {
      x: pos.x,
      y: (pos.y || 0) + yOff,
      z: pos.z || 0,
    };
  }

  // ═══════════════════════════════════════
  // 每帧更新
  // ═══════════════════════════════════════

  /**
   * 战斗系统每tick更新
   * 遍历所有有攻击目标的单位，检查攻击冷却并执行伤害计算
   * @param {number} delta - tick间隔（秒）
   */
  update(delta) {
    const gm = this.gameManager;

    for (const unit of gm.units) {
      if (!unit.alive || !unit.attack || !unit.attackTarget) continue;

      // 获取攻击目标
      const target = gm.getUnitById(unit.attackTarget);
      if (!target || !target.alive) {
        unit.attackTarget = null;
        continue;
      }

      // ─── 空军能力检查：当前攻击者能否攻击该目标 ────
      if (!this.canAttackTarget(unit, target)) {
        // 目标不可攻击（如地面单位选了空中目标但没有防空能力）
        unit.attackTarget = null;
        continue;
      }

      // ─── 选择攻击档案 ─────────────────
      const attackProfile = this._selectAttackProfile(unit, target);

      // ─── 检查是否在射程内 ────────────
      const range = attackProfile ? attackProfile.range : (unit.attack.range || 0);
      const dist = this._distance2D(unit.position, target.position);

      if (dist > range) {
        // 目标超出射程，需要追击
        // （由CommandSystem负责移动靠近）
        continue;
      }

      // ─── 攻击冷却计时 ────────────────
      unit.attackCooldown -= delta;

      if (unit.attackCooldown <= 0) {
        // 冷却完毕，执行攻击
        this._performAttack(unit, target);

        // 重置冷却时间（attack.speed = 攻击间隔tick数，转换为秒）
        const speed = attackProfile ? attackProfile.speed : (unit.attack.speed || 30);
        unit.attackCooldown = speed / 24; // 24 tick/s
      }
    }

    for (const effect of this.attackEffects) {
      effect.lifetime += delta;
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
    // ─── 选择攻击档案 ─────────────────
    const attackProfile = this._selectAttackProfile(attacker, defender);
    if (!attackProfile) return; // 无法攻击

    // ─── 计算伤害（使用攻击档案的属性） ──
    const damage = this.calculateDamage(attacker, defender, attackProfile);

    // ─── 应用伤害 ─────────────────────
    const killed = this.applyDamage(defender, damage, attackProfile.type);

    // ─── 生成攻击特效（区分对空/对地） ──
    this._spawnAttackEffect(attacker, defender, damage, attackProfile);

    // ─── 空战类型标记 ──────────────────
    const isAirToAir = !!attacker.isFlying && !!defender.isFlying;
    const isGroundToAir = !attacker.isFlying && !!defender.isFlying;

    // ─── 发射弹道（远程攻击） ─────────
    if (attackProfile.range > 2) {
      this.gameManager.spawnProjectile({
        origin: this._getProjectileOrigin(attacker),
        target: defender.id,
        targetPosition: this._getProjectileTargetPosition(defender),
        speed: 15,
        damage: 0, // 伤害已在performAttack中计算
        attackType: attackProfile.type,
        team: attacker.team,
        maxLifetime: 2,
        // 空战附加信息
        isAirToAir,
        isGroundToAir,
        isAntiAir: isGroundToAir,
      });
    }

    // ─── 自杀式攻击处理（如Scourge） ─────
    if (attackProfile.suicide) {
      // 自杀单位攻击后自身死亡
      attacker.hp = 0;
      attacker.alive = false;
      attacker.selected = false;
      eventBus.emit(EVENTS.UNIT_DIED, { unit: attacker });

      if (attacker.mesh && this.gameManager.scene) {
        this.gameManager.scene.remove(attacker.mesh);
      }
    }

    // ─── 通知攻击事件 ─────────────────
    eventBus.emit(EVENTS.UNIT_DAMAGE, {
      attacker: attacker.id,
      defender: defender.id,
      damage,
      killed,
      isAirToAir,
      isGroundToAir,
    });

    if (killed) {
      eventBus.emit(EVENTS.UNIT_DIED, { unit: defender });
    }
  }

  /**
   * 获取弹道发射点（考虑飞行高度偏移）
   * @param {Object} attacker
   * @returns {Object} { x, y, z }
   */
  _getProjectileOrigin(attacker) {
    const origin = { ...attacker.position };
    if (attacker.isFlying) {
      origin.y = (origin.y || 0) + getFlightHeight(attacker);
    }
    return origin;
  }

  /**
   * 获取弹道目标点（考虑飞行高度偏移）
   * @param {Object} defender
   * @returns {Object} { x, y, z }
   */
  _getProjectileTargetPosition(defender) {
    const target = { ...defender.position };
    if (defender.isFlying) {
      target.y = (target.y || 0) + getFlightHeight(defender);
    }
    return target;
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
   * @param {Object} [attackProfile] - 可选攻击档案（用于对空/对地切换）
   * @returns {number} 实际伤害值
   */
  calculateDamage(attacker, defender, attackProfile = null) {
    const profile = attackProfile || attacker.attack;
    const baseDamage = profile.damage;
    const attackType = profile.type; // 'normal' | 'explosive' | 'concussive'
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
  // 攻击特效（区分对空/对地）
  // ═══════════════════════════════════════

  /**
   * 生成攻击视觉特效
   * 区分对空（橙色尾焰）和对地（红色爆炸）效果
   *
   * @param {Object} attacker
   * @param {Object} defender
   * @param {number} damage
   * @param {Object} attackProfile - 使用的攻击档案
   */
  _spawnAttackEffect(attacker, defender, damage, attackProfile) {
    const isTargetFlying = !!defender.isFlying;

    // 根据攻击类型和目标类型确定特效颜色
    let color;
    if (isTargetFlying) {
      // 对空攻击特效
      if (attackProfile.type === ATTACK_TYPE.EXPLOSIVE) {
        color = AIR_EFFECT_COLORS.MISSILE_AIR;     // 橙色导弹尾焰
      } else if (attackProfile.type === ATTACK_TYPE.CONCUSSIVE) {
        color = AIR_EFFECT_COLORS.CONCUSSIVE_AIR;  // 蓝色冲击波
      } else {
        color = 0xffcc00; // 普通对空（亮黄色）
      }
    } else {
      // 对地攻击特效
      if (attackProfile.type === ATTACK_TYPE.EXPLOSIVE) {
        color = AIR_EFFECT_COLORS.MISSILE_GROUND;  // 红色爆炸
      } else if (attackProfile.type === ATTACK_TYPE.CONCUSSIVE) {
        color = AIR_EFFECT_COLORS.LASER;            // 绿色激光
      } else {
        color = 0xffffff; // 普通对地（白色）
      }
    }

    // 计算特效起止Y坐标（包含飞行高度）
    const originY = getFlightHeight(attacker);
    const targetY = getFlightHeight(defender);

    const effect = {
      type: attackProfile.type,
      origin: { ...attacker.position, y: originY },
      target: { ...defender.position, y: targetY },
      damage,
      lifetime: 0,
      maxLifetime: 0.3,
      color,
      isAirToAir: attacker.isFlying && defender.isFlying,
      isGroundToAir: !attacker.isFlying && defender.isFlying,
      isSuicide: !!attackProfile.suicide,
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
   * 查找最近的可攻击敌方单位
   * 遵循空军攻击规则：地面单位只找地面+有antiAir时才找空中目标
   *
   * @param {Object} unit - 我方单位
   * @param {number} maxRange - 最大搜索范围
   * @returns {Object|null} 最近的可攻击敌方单位
   */
  findNearestEnemy(unit, maxRange = 10) {
    const gm = this.gameManager;
    const enemyTeam = unit.team === 1 ? 2 : 1;
    const enemies = gm.getUnitsInRadius(unit.position, maxRange, enemyTeam);

    if (enemies.length === 0) return null;

    // 筛选可攻击的目标
    const targetable = enemies.filter(enemy => this.canAttackTarget(unit, enemy));

    if (targetable.length === 0) return null;

    let nearest = targetable[0];
    let nearestDist = this._distance2D(unit.position, nearest.position);

    for (let i = 1; i < targetable.length; i++) {
      const dist = this._distance2D(unit.position, targetable[i].position);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = targetable[i];
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

export { CombatSystem };
