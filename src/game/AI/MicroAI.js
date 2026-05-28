// ═══════════════════════════════════════════
// StarCraft Web - 单位微操 AI
// 编队移动 / 拉扯 / 集火 / 闪避
// ═══════════════════════════════════════════

import { COMMAND } from '../../shared/Constants.js';
import { distance2D, normalize2D } from '../../shared/MathUtils.js';
import { eventBus } from '../../shared/EventBus.js';

// ── 微操行为模式 ──
/** @enum {string} */
const MICRO_STATE = {
  IDLE: 'idle',
  ATTACKING: 'attacking',
  KITING: 'kiting',
  RETREATING: 'retreating',
  FORMATION: 'formation',
  FLANKING: 'flanking',
};

// ── 默认微操配置 ──
const MICRO_CONFIG = {
  /** 拉扯操作的最小射程比率 (实际射程 * 此比率 = 拉扯开始距离) */
  kiteRangeRatio: 0.85,
  /** 拉扯操作的脱离距离 (射程倍数) */
  kiteRetreatDistance: 2.0,
  /** 后撤血量阈值 (最大血量的百分比) */
  retreatHpThreshold: 0.2,
  /** 编队移动间距 (单位) */
  formationSpacing: 1.5,
  /** 集火判定范围 (射程倍数) */
  focusFireRangeMultiplier: 2.0,
  /** 闪避反应延迟 (秒) */
  dodgeDelay: 0.3,
};

/**
 * 单位微操 AI - 控制单个单位的精细操作
 *
 * @example
 * const micro = new MicroAI(unit);
 * micro.update(delta);
 * // 或执行特定行为
 * micro.kite(enemyUnit);
 * micro.focusFire(enemyUnit);
 */
export class MicroAI {
  /**
   * @param {object} unit - 被控制的单位对象
   * @param {object} [config] - 微操配置覆盖
   */
  constructor(unit, config = {}) {
    /** @type {object} 被控制的单位 */
    this.unit = unit;

    /** @type {object} 微操配置 */
    this.config = { ...MICRO_CONFIG, ...config };

    // ── 状态 ──
    /** @type {string} 当前微操状态 */
    this.state = MICRO_STATE.IDLE;
    /** @type {object|null} 当前目标 */
    this.currentTarget = null;
    /** @type {object|null} 移动目标（拉扯/后撤用） */
    this.moveTarget = null;
    /** @type {object|null} 编队锚点位置 */
    this.formationAnchor = null;

    // ── 计时器 ──
    /** @type {number} 状态持续时间 */
    this.stateTimer = 0;
    /** @type {number} 拉扯计时器（攻击间隔追踪） */
    this.kiteTimer = 0;
    /** @type {number} 闪避延迟计时器 */
    this.dodgeTimer = 0;
    /** @type {number} 上次攻击时间 */
    this.lastAttackTime = 0;

    // ── 攻击间隔追踪 ──
    /** @type {number} 攻击冷却时间（从单位属性读取） */
    this.attackCooldown = unit.attack?.cooldown || 1.0;

    // ── 编队 ──
    /** @type {number} 编队中的位置索引 */
    this.formationIndex = 0;
    /** @type {number} 编队总人数 */
    this.formationSize = 1;
    /** @type {string} 编队阵型 ('line', 'wedge', 'arc') */
    this.formationType = 'line';
  }

  // ═══════════════════════════════════════════
  // 主更新循环
  // ═══════════════════════════════════════════

  /**
   * 微操 AI 主更新（每帧调用）
   * @param {number} delta - 帧间隔（秒）
   * @param {object} [gameState] - 可选的游戏状态（用于自动决策）
   */
  update(delta, gameState) {
    this.stateTimer += delta;
    this.kiteTimer += delta;
    this.dodgeTimer += delta;

    switch (this.state) {
      case MICRO_STATE.IDLE:
        this._updateIdle(delta, gameState);
        break;
      case MICRO_STATE.ATTACKING:
        this._updateAttacking(delta, gameState);
        break;
      case MICRO_STATE.KITING:
        this._updateKiting(delta, gameState);
        break;
      case MICRO_STATE.RETREATING:
        this._updateRetreating(delta, gameState);
        break;
      case MICRO_STATE.FORMATION:
        this._updateFormation(delta, gameState);
        break;
      case MICRO_STATE.FLANKING:
        this._updateFlanking(delta, gameState);
        break;
    }
  }

  // ═══════════════════════════════════════════
  // 行为接口: Attack Move
  // ═══════════════════════════════════════════

  /**
   * 攻击移动 - 向目标位置移动，途中攻击遇到的敌人
   * @param {object} target - 目标位置 {x, z}
   */
  attackMove(target) {
    if (!target) return;

    this.currentTarget = null;
    this.moveTarget = target;
    this.state = MICRO_STATE.ATTACKING;
    this.stateTimer = 0;

    this._issueCommand(COMMAND.ATTACK, target);
  }

  /**
   * 更新攻击移动状态
   * @private
   */
  _updateAttacking(delta, gameState) {
    // 自动寻找并攻击最近的敌人
    if (!this.currentTarget && gameState) {
      const nearest = this._findNearestEnemy(gameState);
      if (nearest && this._isInRange(nearest)) {
        this.currentTarget = nearest;
      }
    }

    // 有目标就攻击
    if (this.currentTarget) {
      // 检查目标是否还活着
      if (this.currentTarget.hp <= 0) {
        this.currentTarget = null;
        return;
      }

      if (this._isInRange(this.currentTarget)) {
        this._issueCommand(COMMAND.ATTACK, this.currentTarget);
      } else {
        // 目标不在射程内，移动过去
        this._issueCommand(COMMAND.MOVE, this.currentTarget);
      }
    }
  }

  // ═══════════════════════════════════════════
  // 行为接口: Kite (拉扯/Hit & Run)
  // ═══════════════════════════════════════════

  /**
   * 拉扯操作 - 保持距离边打边退
   * @param {object} target - 敌方目标 {position, hp, attack}
   */
  kite(target) {
    if (!target) return;

    this.currentTarget = target;
    this.state = MICRO_STATE.KITING;
    this.stateTimer = 0;
    this.kiteTimer = 0;
  }

  /**
   * 更新拉扯状态
   * @private
   */
  _updateKiting(delta, gameState) {
    if (!this.currentTarget || this.currentTarget.hp <= 0) {
      this.state = MICRO_STATE.IDLE;
      return;
    }

    const dist = distance2D(this.unit.position, this.currentTarget.position);
    const attackRange = this.unit.attack?.range || 5;
    const kiteRange = attackRange * this.config.kiteRangeRatio;

    if (this.kiteTimer >= this.attackCooldown && dist <= attackRange) {
      // 攻击间隔到了且在射程内，进行攻击
      this._issueCommand(COMMAND.ATTACK, this.currentTarget);
      this.kiteTimer = 0;

      // 攻击后立即后撤（拉扯核心逻辑）
      const retreatDist = this.config.kiteRetreatDistance;
      const dir = normalize2D(
        this.unit.position.x - this.currentTarget.position.x,
        this.unit.position.z - this.currentTarget.position.z
      );

      const retreatPoint = {
        x: this.unit.position.x + dir.x * retreatDist,
        z: this.unit.position.z + dir.z * retreatDist,
      };

      // 延迟一点后撤以确保攻击发出
      setTimeout(() => {
        this._issueCommand(COMMAND.MOVE, retreatPoint);
      }, 50);
    } else if (dist > attackRange) {
      // 射程外，靠近目标
      this._issueCommand(COMMAND.MOVE, this.currentTarget);
    } else if (dist < kiteRange && this.kiteTimer < this.attackCooldown) {
      // 太近了但还在冷却，后撤保持距离
      const dir = normalize2D(
        this.unit.position.x - this.currentTarget.position.x,
        this.unit.position.z - this.currentTarget.position.z
      );
      const retreatPoint = {
        x: this.unit.position.x + dir.x * 2,
        z: this.unit.position.z + dir.z * 2,
      };
      this._issueCommand(COMMAND.MOVE, retreatPoint);
    }
  }

  // ═══════════════════════════════════════════
  // 行为接口: Focus Fire (集火)
  // ═══════════════════════════════════════════

  /**
   * 集火攻击 - 集中火力攻击指定高价值目标
   * @param {object} target - 目标单位 {position, hp, shield, value}
   */
  focusFire(target) {
    if (!target) return;

    this.currentTarget = target;
    this.state = MICRO_STATE.ATTACKING;
    this.stateTimer = 0;

    // 直接集火指定目标
    this._issueCommand(COMMAND.ATTACK, target);
  }

  /**
   * 从附近的敌人中选择最高价值目标并集火
   * @param {object} gameState - 游戏状态
   * @returns {object|null} 选中的目标
   */
  selectAndFocusFire(gameState) {
    if (!gameState) return null;

    const enemies = gameState.enemyUnits || [];
    const nearby = enemies.filter(e =>
      distance2D(this.unit.position, e.position) <=
      (this.unit.attack?.range || 5) * this.config.focusFireRangeMultiplier
    );

    if (nearby.length === 0) return null;

    // 选择最高价值目标: 血量最低 > 治疗者 > 施法者 > 最近
    const target = nearby.reduce((best, e) => {
      const bestScore = this._evaluateTargetValue(best);
      const score = this._evaluateTargetValue(e);
      return score > bestScore ? e : best;
    });

    this.focusFire(target);
    return target;
  }

  /**
   * 评估目标价值分数
   * @private
   * @param {object} target - 目标单位
   * @returns {number} 价值分数（越高越优先攻击）
   */
  _evaluateTargetValue(target) {
    if (!target) return 0;

    let score = 0;

    // 血量越低价值越高（优先击杀）
    const hpRatio = ((target.hp || 0) + (target.shield || 0)) /
                    ((target.maxHp || 100) + (target.maxShield || 0));
    score += (1 - hpRatio) * 50;

    // 支持/治疗单位价值最高
    if (target.isSupport || target.isHealer) score += 80;

    // 施法者价值高
    if (target.isCaster || (target.abilities && target.abilities.length > 0)) {
      score += 60;
    }

    // 高攻击力单位价值高
    score += (target.attack?.damage || 0) * 2;

    // 近距离目标价值高（更容易击杀）
    const dist = distance2D(this.unit.position, target.position);
    score += Math.max(0, 30 - dist);

    return score;
  }

  // ═══════════════════════════════════════════
  // 行为接口: Retreat (后撤)
  // ═══════════════════════════════════════════

  /**
   * 后撤 - 远离威胁移动到安全位置
   * @param {object} [safePosition] - 目标安全位置（可选，默认向远离敌人的方向撤退）
   */
  retreat(safePosition) {
    this.currentTarget = null;
    this.state = MICRO_STATE.RETREATING;
    this.stateTimer = 0;

    if (safePosition) {
      this._issueCommand(COMMAND.MOVE, safePosition);
    }
  }

  /**
   * 更新后撤状态
   * @private
   */
  _updateRetreating(delta, gameState) {
    if (!gameState) return;

    // 检查是否已经安全
    const enemies = gameState.enemyUnits || [];
    const nearestEnemy = this._findNearestEnemy(gameState);

    if (!nearestEnemy || distance2D(this.unit.position, nearestEnemy.position) > 20) {
      // 远离敌人了，停止后撤
      this.state = MICRO_STATE.IDLE;
      return;
    }

    // 自动寻找更远的安全点
    if (!this.moveTarget) {
      const dir = normalize2D(
        this.unit.position.x - nearestEnemy.position.x,
        this.unit.position.z - nearestEnemy.position.z
      );
      this.moveTarget = {
        x: this.unit.position.x + dir.x * 15,
        z: this.unit.position.z + dir.z * 15,
      };
      this._issueCommand(COMMAND.MOVE, this.moveTarget);
    }
  }

  // ═══════════════════════════════════════════
  // 行为接口: Formation (编队移动)
  // ═══════════════════════════════════════════

  /**
   * 编队移动 - 按阵型排列移动到目标位置
   * @param {object} anchor - 编队锚点位置 {x, z}
   * @param {number} index - 在编队中的位置索引
   * @param {number} total - 编队总人数
   * @param {string} [type='line'] - 阵型类型 ('line', 'wedge', 'arc')
   */
  formationMove(anchor, index, total, type = 'line') {
    this.formationAnchor = anchor;
    this.formationIndex = index;
    this.formationSize = total;
    this.formationType = type;
    this.state = MICRO_STATE.FORMATION;
    this.stateTimer = 0;

    const pos = this._calculateFormationPosition(anchor, index, total, type);
    this.moveTarget = pos;
    this._issueCommand(COMMAND.MOVE, pos);
  }

  /**
   * 更新编队状态
   * @private
   */
  _updateFormation(delta, gameState) {
    if (!this.formationAnchor) {
      this.state = MICRO_STATE.IDLE;
      return;
    }

    // 计算当前位置与目标位置的偏差
    const expected = this._calculateFormationPosition(
      this.formationAnchor, this.formationIndex, this.formationSize, this.formationType
    );
    const dist = distance2D(this.unit.position, expected);

    // 偏差超过阈值时修正
    if (dist > this.config.formationSpacing) {
      this._issueCommand(COMMAND.MOVE, expected);
    }

    // 编队中遇到敌人时自动攻击
    if (gameState) {
      const nearest = this._findNearestEnemy(gameState);
      if (nearest && this._isInRange(nearest)) {
        this._issueCommand(COMMAND.ATTACK, nearest);
      }
    }
  }

  /**
   * 计算编队位置
   * @private
   * @param {object} anchor - 锚点位置
   * @param {number} index - 位置索引
   * @param {number} total - 总人数
   * @param {string} type - 阵型类型
   * @returns {object} 编队位置 {x, z}
   */
  _calculateFormationPosition(anchor, index, total, type) {
    const spacing = this.config.formationSpacing;
    const halfTotal = (total - 1) / 2;

    switch (type) {
      case 'wedge': {
        // 楔形阵: V字排列
        const row = Math.floor(index / 2);
        const side = index % 2 === 0 ? -1 : 1;
        return {
          x: anchor.x - row * spacing,
          z: anchor.z + side * (row + 1) * spacing * 0.8,
        };
      }
      case 'arc': {
        // 弧形阵
        const angle = (index / Math.max(1, total - 1) - 0.5) * Math.PI;
        const radius = spacing * total * 0.4;
        return {
          x: anchor.x + Math.cos(angle) * radius,
          z: anchor.z + Math.sin(angle) * radius,
        };
      }
      case 'line':
      default: {
        // 横排一字阵
        return {
          x: anchor.x,
          z: anchor.z + (index - halfTotal) * spacing,
        };
      }
    }
  }

  // ═══════════════════════════════════════════
  // 行为接口: Flank (包抄)
  // ═══════════════════════════════════════════

  /**
   * 包抄移动 - 从侧翼攻击目标
   * @param {object} target - 目标位置 {x, z}
   * @param {number} flankAngle - 包抄角度（弧度，默认 PI/3）
   */
  flank(target, flankAngle = Math.PI / 3) {
    if (!target) return;

    const dist = distance2D(this.unit.position, target);
    const dir = normalize2D(
      target.x - this.unit.position.x,
      target.z - this.unit.position.z
    );

    // 计算侧翼位置
    const cos = Math.cos(flankAngle);
    const sin = Math.sin(flankAngle);
    const flankPos = {
      x: target.x + (dir.x * cos - dir.z * sin) * dist,
      z: target.z + (dir.x * sin + dir.z * cos) * dist,
    };

    this.moveTarget = flankPos;
    this.currentTarget = target;
    this.state = MICRO_STATE.FLANKING;
    this.stateTimer = 0;

    this._issueCommand(COMMAND.MOVE, flankPos);
  }

  /**
   * 更新包抄状态
   * @private
   */
  _updateFlanking(delta, gameState) {
    if (!this.moveTarget) {
      this.state = MICRO_STATE.IDLE;
      return;
    }

    const dist = distance2D(this.unit.position, this.moveTarget);

    // 到达包抄位置后切换到攻击
    if (dist < 2 && this.currentTarget) {
      this.state = MICRO_STATE.ATTACKING;
      this._issueCommand(COMMAND.ATTACK, this.currentTarget);
    }
  }

  // ═══════════════════════════════════════════
  // 辅助方法
  // ═══════════════════════════════════════════

  /**
   * 更新空闲状态 - 自动寻找目标
   * @private
   */
  _updateIdle(delta, gameState) {
    if (!gameState) return;

    // 自动选择目标
    const target = this.selectAndFocusFire(gameState);
    if (target) {
      // 已自动切换到 ATTACKING 状态
    }
  }

  /**
   * 查找最近的敌人
   * @private
   * @param {object} gameState
   * @returns {object|null}
   */
  _findNearestEnemy(gameState) {
    const enemies = gameState.enemyUnits || [];
    if (enemies.length === 0) return null;

    let nearest = null;
    let minDist = Infinity;

    for (const e of enemies) {
      const d = distance2D(this.unit.position, e.position);
      if (d < minDist) {
        minDist = d;
        nearest = e;
      }
    }

    return nearest;
  }

  /**
   * 检查目标是否在攻击范围内
   * @private
   * @param {object} target
   * @returns {boolean}
   */
  _isInRange(target) {
    const range = this.unit.attack?.range || 5;
    return distance2D(this.unit.position, target.position) <= range;
  }

  /**
   * 发出游戏命令
   * @private
   * @param {string} commandType - 命令类型
   * @param {object} target - 目标
   */
  _issueCommand(commandType, target) {
    eventBus.emit('ai:command', {
      unitId: this.unit.id,
      command: commandType,
      target,
    });
  }

  /**
   * 停止当前行为
   */
  stop() {
    this.state = MICRO_STATE.IDLE;
    this.currentTarget = null;
    this.moveTarget = null;
    this.formationAnchor = null;
    this.stateTimer = 0;

    this._issueCommand(COMMAND.STOP, null);
  }

  /**
   * 获取当前微操状态信息
   * @returns {object}
   */
  getInfo() {
    return {
      unitId: this.unit.id,
      state: this.state,
      target: this.currentTarget?.id || null,
      stateTimer: this.stateTimer,
    };
  }
}

export { MICRO_STATE, MICRO_CONFIG };
export default MicroAI;
