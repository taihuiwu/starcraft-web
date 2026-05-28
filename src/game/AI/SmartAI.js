// ═══════════════════════════════════════════
// StarCraft Web - 高级决策树 AI
// 多层决策: 战略层 → 战术层 → 操作层
// ═══════════════════════════════════════════

import { RACE, COMMAND, AI_STATE } from '../../shared/Constants.js';
import { distance2D } from '../../shared/MathUtils.js';
import { eventBus } from '../../shared/EventBus.js';

// ── AI 战略阶段 ──
/** @enum {string} */
const STRATEGY_PHASE = {
  OPENING: 'opening',
  EARLY_GAME: 'early_game',
  MID_GAME: 'mid_game',
  LATE_GAME: 'late_game',
};

// ── 威胁等级 ──
/** @enum {string} */
const THREAT_LEVEL = {
  NONE: 'none',
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

// ── 兵种角色 ──
/** @enum {string} */
const UNIT_ROLE = {
  TANK: 'tank',       // 肉盾/前排
  DPS: 'dps',         // 输出
  SUPPORT: 'support', // 辅助/治疗
  CASTER: 'caster',   // 施法者
  SCOUT: 'scout',     // 侦察
  AIR: 'air',         // 空军
};

// ── 军事/经济平衡配置 ──
const BALANCE_CONFIG = {
  [STRATEGY_PHASE.OPENING]: { economyWeight: 0.9, militaryWeight: 0.1 },
  [STRATEGY_PHASE.EARLY_GAME]: { economyWeight: 0.7, militaryWeight: 0.3 },
  [STRATEGY_PHASE.MID_GAME]: { economyWeight: 0.5, militaryWeight: 0.5 },
  [STRATEGY_PHASE.LATE_GAME]: { economyWeight: 0.4, militaryWeight: 0.6 },
};

// ── 种族兵种角色表 ──
const UNIT_ROLE_MAP = {
  [RACE.TERRAN]: {
    marine: UNIT_ROLE.DPS,
    firebat: UNIT_ROLE.TANK,
    medic: UNIT_ROLE.SUPPORT,
    siege_tank: UNIT_ROLE.DPS,
    goliath: UNIT_ROLE.AIR,
    wraith: UNIT_ROLE.AIR,
    science_vessel: UNIT_ROLE.SUPPORT,
    vulture: UNIT_ROLE.SCOUT,
  },
  [RACE.ZERG]: {
    zergling: UNIT_ROLE.TANK,
    hydralisk: UNIT_ROLE.DPS,
    lurker: UNIT_ROLE.DPS,
    mutalisk: UNIT_ROLE.AIR,
    ultralisk: UNIT_ROLE.TANK,
    defiler: UNIT_ROLE.CASTER,
    scourge: UNIT_ROLE.AIR,
  },
  [RACE.PROTOSS]: {
    zealot: UNIT_ROLE.TANK,
    dragoon: UNIT_ROLE.DPS,
    high_templar: UNIT_ROLE.CASTER,
    archon: UNIT_ROLE.TANK,
    corsair: UNIT_ROLE.AIR,
    carrier: UNIT_ROLE.AIR,
    reaver: UNIT_ROLE.DPS,
    dark_templar: UNIT_ROLE.SCOUT,
  },
};

// ═══════════════════════════════════════════
// 威胁评估系统
// ═══════════════════════════════════════════

/**
 * @typedef {Object} Threat
 * @property {number} score - 威胁分数
 * @property {string} level - 威胁等级 (THREAT_LEVEL)
 * @property {string} type - 威胁类型 ('army', 'air', 'stealth', 'rush')
 * @property {object} position - 威胁位置
 * @property {number} estimatedUnits - 预估敌方单位数
 */

/**
 * 威胁评估系统 - 分析敌方态势并量化威胁
 */
class ThreatAnalyzer {
  constructor() {
    /** @type {Threat[]} 已知威胁列表 */
    this.threats = [];
    /** @type {number} 最后分析时间 */
    this.lastAnalysisTime = 0;
    /** @type {number} 分析间隔（秒） */
    this.analysisInterval = 3.0;
  }

  /**
   * 分析当前游戏状态中的威胁
   * @param {object} gameState - 游戏状态快照
   * @param {number} playerId - AI 玩家 ID
   * @returns {Threat[]} 威胁列表
   */
  analyze(gameState, playerId) {
    this.threats = [];

    const myUnits = this._getMyUnits(gameState, playerId);
    const enemyUnits = this._getEnemyUnits(gameState, playerId);
    const myBuildings = this._getMyBuildings(gameState, playerId);

    if (enemyUnits.length === 0 || myBuildings.length === 0) {
      return this.threats;
    }

    // 检测近基威胁
    this._detectBaseThreats(enemyUnits, myBuildings);

    // 检测空中威胁
    this._detectAirThreats(enemyUnits, myUnits);

    // 检测隐形单位威胁
    this._detectStealthThreats(enemyUnits, myUnits);

    // 检测快攻威胁
    this._detectRushThreats(enemyUnits, gameState);

    // 排序并限制数量
    this.threats.sort((a, b) => b.score - a.score);
    this.threats = this.threats.slice(0, 5);

    return this.threats;
  }

  /**
   * 获取整体威胁等级
   * @returns {string} THREAT_LEVEL
   */
  getOverallLevel() {
    if (this.threats.length === 0) return THREAT_LEVEL.NONE;
    const maxScore = this.threats[0].score;
    if (maxScore >= 800) return THREAT_LEVEL.CRITICAL;
    if (maxScore >= 500) return THREAT_LEVEL.HIGH;
    if (maxScore >= 250) return THREAT_LEVEL.MEDIUM;
    if (maxScore >= 100) return THREAT_LEVEL.LOW;
    return THREAT_LEVEL.NONE;
  }

  /**
   * 获取基地附近的威胁
   * @returns {Threat[]}
   */
  getBaseThreats() {
    return this.threats.filter(t => t.type === 'army' || t.type === 'rush');
  }

  /**
   * 检测靠近基地的威胁
   * @private
   */
  _detectBaseThreats(enemyUnits, myBuildings) {
    const BASE_THREAT_RADIUS = 15;

    for (const building of myBuildings) {
      const nearbyEnemies = enemyUnits.filter(e =>
        distance2D(e.position, building.position) <= BASE_THREAT_RADIUS
      );

      if (nearbyEnemies.length > 0) {
        const score = this._calculateThreatScore(nearbyEnemies);
        this.threats.push({
          score,
          level: this._scoreToLevel(score),
          type: 'army',
          position: this._averagePosition(nearbyEnemies),
          estimatedUnits: nearbyEnemies.length,
        });
      }
    }
  }

  /**
   * 检测空中威胁
   * @private
   */
  _detectAirThreats(enemyUnits, myUnits) {
    const airEnemies = enemyUnits.filter(e => e.isAir);
    if (airEnemies.length === 0) return;

    const antiAirUnits = myUnits.filter(u =>
      u.attack && u.attack.canHitAir
    );

    if (antiAirUnits.length < airEnemies.length * 0.5) {
      const score = airEnemies.length * 150;
      this.threats.push({
        score,
        level: this._scoreToLevel(score),
        type: 'air',
        position: this._averagePosition(airEnemies),
        estimatedUnits: airEnemies.length,
      });
    }
  }

  /**
   * 检测隐形单位威胁
   * @private
   */
  _detectStealthThreats(enemyUnits, myUnits) {
    const stealthEnemies = enemyUnits.filter(e => e.isCloaked);
    if (stealthEnemies.length === 0) return;

    const detectors = myUnits.filter(u =>
      u.isDetector || (u.abilities && u.abilities.includes('detector'))
    );

    if (detectors.length === 0) {
      const score = stealthEnemies.length * 200;
      this.threats.push({
        score,
        level: this._scoreToLevel(score),
        type: 'stealth',
        position: this._averagePosition(stealthEnemies),
        estimatedUnits: stealthEnemies.length,
      });
    }
  }

  /**
   * 检测快攻威胁
   * @private
   */
  _detectRushThreats(enemyUnits, gameState) {
    if (gameState.gameTime > 300) return; // 5 分钟后不再考虑快攻

    const rushUnits = enemyUnits.filter(u =>
      u.isFast && !u.isWorker && (u.attack && u.attack.range < 3)
    );

    if (rushUnits.length >= 6) {
      const score = rushUnits.length * 100 + (300 - gameState.gameTime) * 2;
      this.threats.push({
        score,
        level: this._scoreToLevel(score),
        type: 'rush',
        position: this._averagePosition(rushUnits),
        estimatedUnits: rushUnits.length,
      });
    }
  }

  /** @private */
  _calculateThreatScore(units) {
    return units.reduce((sum, u) => {
      const hpScore = (u.hp || 0) + (u.shield || 0);
      const atkScore = u.attack ? (u.attack.damage || 0) * 2 : 0;
      return sum + hpScore + atkScore;
    }, 0);
  }

  /** @private */
  _scoreToLevel(score) {
    if (score >= 800) return THREAT_LEVEL.CRITICAL;
    if (score >= 500) return THREAT_LEVEL.HIGH;
    if (score >= 250) return THREAT_LEVEL.MEDIUM;
    if (score >= 100) return THREAT_LEVEL.LOW;
    return THREAT_LEVEL.NONE;
  }

  /** @private */
  _averagePosition(units) {
    if (units.length === 0) return { x: 0, z: 0 };
    const sum = units.reduce(
      (acc, u) => ({
        x: acc.x + (u.position?.x || 0),
        z: acc.z + (u.position?.z || 0),
      }),
      { x: 0, z: 0 }
    );
    return { x: sum.x / units.length, z: sum.z / units.length };
  }

  /** @private */
  _getMyUnits(gs, pid) {
    return (gs.myUnits || gs.units || []).filter(u => u.playerId === pid);
  }

  /** @private */
  _getEnemyUnits(gs, pid) {
    return (gs.enemyUnits || gs.units || []).filter(u => u.playerId !== pid);
  }

  /** @private */
  _getMyBuildings(gs, pid) {
    return (gs.myBuildings || gs.buildings || []).filter(b => b.playerId === pid);
  }
}

// ═══════════════════════════════════════════
// SmartAI 主类
// ═══════════════════════════════════════════

/**
 * @typedef {Object} ArmyComposition
 * @property {number} tanks - 前排肉盾数
 * @property {number} dps - 输出单位数
 * @property {number} support - 辅助单位数
 * @property {number} casters - 施法者数
 * @property {number} air - 空军数
 * @property {number} scouts - 侦察单位数
 */

/**
 * @typedef {Object} StrategyPlan
 * @property {string} phase - 当前阶段
 * @property {string} approach - 策略方向 ('macro', 'aggressive', 'defensive', 'balanced')
 * @property {object} productionTarget - 出兵目标
 * @property {object} techTarget - 科技目标
 * @property {string|null} attackTarget - 攻击目标位置
 * @property {string|null} defendPosition - 防守位置
 */

/**
 * 高级决策树 AI - 多层次战略/战术/操作决策
 *
 * @example
 * const smartAI = new SmartAI({ playerId: 2, race: 'terran', gameState });
 * // 在游戏循环中调用
 * smartAI.update(delta);
 */
export class SmartAI {
  /**
   * @param {object} options
   * @param {number} options.playerId - AI 玩家 ID
   * @param {string} options.race - 种族
   * @param {object} options.gameState - 游戏状态引用
   * @param {string} [options.difficulty='normal'] - 难度等级
   */
  constructor(options) {
    /** @type {number} AI 玩家 ID */
    this.playerId = options.playerId;
    /** @type {string} 种族 */
    this.race = options.race;
    /** @type {object} 游戏状态引用 */
    this.gameState = options.gameState;
    /** @type {string} 难度等级 */
    this.difficulty = options.difficulty || 'normal';

    /** @type {ThreatAnalyzer} 威胁分析器 */
    this.threatAnalyzer = new ThreatAnalyzer();

    // ── 决策层状态 ──
    /** @type {string} 当前战略阶段 */
    this.currentPhase = STRATEGY_PHASE.OPENING;
    /** @type {StrategyPlan|null} 当前策略计划 */
    this.currentPlan = null;
    /** @type {THREAT_LEVEL} 当前威胁等级 */
    this.threatLevel = THREAT_LEVEL.NONE;

    // ── 计时器 ──
    /** @type {number} 战略决策计时器 */
    this.strategyTimer = 0;
    /** @type {number} 战术决策计时器 */
    this.tacticsTimer = 0;
    /** @type {number} 操作层计时器 */
    this.microTimer = 0;

    // ── 决策间隔（秒）──
    /** @type {number} 战略层决策间隔 */
    this.strategyInterval = 5.0;
    /** @type {number} 战术层决策间隔 */
    this.tacticsInterval = 2.0;
    /** @type {number} 操作层更新间隔 */
    this.microInterval = 0.5;

    // ── 经济/军事平衡 ──
    /** @type {number} 经济权重 (0~1) */
    this.economyWeight = 0.9;
    /** @type {number} 军事权重 (0~1) */
    this.militaryWeight = 0.1;

    // ── 兵种组合追踪 ──
    /** @type {ArmyComposition} 当前兵种组合 */
    this.armyComposition = {
      tanks: 0,
      dps: 0,
      support: 0,
      casters: 0,
      air: 0,
      scouts: 0,
    };

    // ── 攻防状态 ──
    /** @type {string} AI 状态 (AI_STATE) */
    this.state = AI_STATE.EARLY_BUILD;
    /** @type {object[]} 攻击编队 */
    this.attackGroup = [];
    /** @type {object|null} 攻击目标 */
    this.attackTarget = null;
    /** @type {number} 攻击冷却（秒） */
    this.attackCooldown = 0;
    /** @type {number} 上次扩张时间 */
    this.lastExpansionTime = 0;

    // 初始化策略
    this._updatePhase();
    this.currentPlan = this.planStrategy();
  }

  // ═══════════════════════════════════════════
  // 主更新循环
  // ═══════════════════════════════════════════

  /**
   * AI 主更新入口（每帧调用）
   * @param {number} delta - 帧间隔（秒）
   */
  update(delta) {
    // 更新各层计时器
    this.strategyTimer += delta;
    this.tacticsTimer += delta;
    this.microTimer += delta;

    // 获取最新游戏快照
    const snapshot = this._getSnapshot();
    if (!snapshot) return;

    // ── 第一层: 战略决策（低频）──
    if (this.strategyTimer >= this.strategyInterval) {
      this.strategyTimer = 0;
      this._updatePhase();
      this.analyzeThreats();
      this.currentPlan = this.planStrategy();
    }

    // ── 第二层: 战术决策（中频）──
    if (this.tacticsTimer >= this.tacticsInterval) {
      this.tacticsTimer = 0;
      this.executeTactics();
    }

    // ── 第三层: 操作层（高频）──
    if (this.microTimer >= this.microInterval) {
      this.microTimer = 0;
      this._executeMicro();
    }

    // 更新冷却
    this.attackCooldown = Math.max(0, this.attackCooldown - delta);
  }

  // ═══════════════════════════════════════════
  // 战略层: 威胁分析
  // ═══════════════════════════════════════════

  /**
   * 分析当前威胁态势
   * @returns {Threat[]} 威胁列表
   */
  analyzeThreats() {
    const snapshot = this._getSnapshot();
    if (!snapshot) return [];

    const threats = this.threatAnalyzer.analyze(snapshot, this.playerId);
    this.threatLevel = this.threatAnalyzer.getOverallLevel();

    // 根据威胁等级调整经济/军事平衡
    this._adjustBalance();

    return threats;
  }

  // ═══════════════════════════════════════════
  // 战略层: 策略规划
  // ═══════════════════════════════════════════

  /**
   * 制定当前策略计划
   * @returns {StrategyPlan} 策略计划
   */
  planStrategy() {
    const snapshot = this._getSnapshot();
    if (!snapshot) return this._defaultPlan();

    const myArmyScore = this._calculateArmyScore(snapshot.myUnits || [], snapshot.playerId);
    const enemyArmyScore = this._calculateEnemyArmyScore(snapshot);

    // 确定策略方向
    let approach = 'balanced';
    if (this.threatLevel === THREAT_LEVEL.HIGH || this.threatLevel === THREAT_LEVEL.CRITICAL) {
      approach = 'defensive';
    } else if (this.threatLevel === THREAT_LEVEL.NONE && myArmyScore > enemyArmyScore * 1.2) {
      approach = 'aggressive';
    } else if (myArmyScore < enemyArmyScore * 0.6) {
      approach = 'defensive';
    } else if (this.economyWeight > 0.6) {
      approach = 'macro';
    }

    // 确定出兵目标
    const productionTarget = this._getProductionTarget(snapshot, approach);

    // 确定科技目标
    const techTarget = this._getTechTarget(snapshot);

    // 确定攻击/防守位置
    const attackTarget = approach === 'aggressive'
      ? this._selectAttackTarget(snapshot)
      : null;
    const defendPosition = approach === 'defensive'
      ? this._selectDefendPosition(snapshot)
      : null;

    const plan = {
      phase: this.currentPhase,
      approach,
      productionTarget,
      techTarget,
      attackTarget,
      defendPosition,
    };

    // 执行战略层决策命令
    this._executeStrategyCommands(plan, snapshot);

    return plan;
  }

  // ═══════════════════════════════════════════
  // 战术层: 执行战术
  // ═══════════════════════════════════════════

  /**
   * 执行战术层决策
   */
  executeTactics() {
    const snapshot = this._getSnapshot();
    if (!snapshot) return;

    const plan = this.currentPlan || this._defaultPlan();

    switch (plan.approach) {
      case 'aggressive':
        this._executeAggressiveTactics(snapshot);
        break;
      case 'defensive':
        this._executeDefensiveTactics(snapshot);
        break;
      case 'macro':
        this._executeMacroTactics(snapshot);
        break;
      default:
        this._executeBalancedTactics(snapshot);
        break;
    }
  }

  // ═══════════════════════════════════════════
  // 经济/军事平衡调控
  // ═══════════════════════════════════════════

  /**
   * 根据威胁等级和阶段调整经济/军事权重
   * @private
   */
  _adjustBalance() {
    const base = BALANCE_CONFIG[this.currentPhase] || BALANCE_CONFIG[STRATEGY_PHASE.MID_GAME];

    // 根据威胁等级调整
    let threatModifier = 0;
    switch (this.threatLevel) {
      case THREAT_LEVEL.CRITICAL: threatModifier = 0.4; break;
      case THREAT_LEVEL.HIGH: threatModifier = 0.3; break;
      case THREAT_LEVEL.MEDIUM: threatModifier = 0.15; break;
      case THREAT_LEVEL.LOW: threatModifier = 0.05; break;
      default: threatModifier = 0;
    }

    this.militaryWeight = Math.min(0.9, base.militaryWeight + threatModifier);
    this.economyWeight = 1 - this.militaryWeight;
  }

  // ═══════════════════════════════════════════
  // 兵种组合推荐
  // ═══════════════════════════════════════════

  /**
   * 分析当前兵种组合并推荐补充单位
   * @param {object[]} myUnits - 己方单位列表
   * @returns {string[]} 推荐训练的单位 ID 列表
   */
  getRecommendedUnits(myUnits) {
    // 统计当前兵种组合
    this._updateArmyComposition(myUnits);

    const comp = this.armyComposition;
    const total = comp.tanks + comp.dps + comp.support + comp.casters + comp.air;
    const recommended = [];

    // 理想兵种配比
    const idealRatio = {
      tanks: 0.25,
      dps: 0.35,
      support: 0.15,
      casters: 0.10,
      air: 0.15,
    };

    // 找出最缺的兵种角色
    const deficits = [];
    for (const [role, ideal] of Object.entries(idealRatio)) {
      const actual = total > 0 ? (comp[role] || 0) / total : 0;
      const deficit = ideal - actual;
      if (deficit > 0.05) {
        deficits.push({ role, deficit });
      }
    }

    // 按缺口大小排序
    deficits.sort((a, b) => b.deficit - a.deficit);

    // 为缺口最大的角色推荐单位
    for (const { role } of deficits) {
      const units = this._getUnitsForRole(role);
      recommended.push(...units);
    }

    return recommended;
  }

  /**
   * 获取指定角色的单位 ID 列表
   * @private
   * @param {string} role - 兵种角色
   * @returns {string[]} 单位 ID 列表
   */
  _getUnitsForRole(role) {
    const raceRoles = UNIT_ROLE_MAP[this.race] || {};
    return Object.entries(raceRoles)
      .filter(([, r]) => r === role)
      .map(([id]) => id);
  }

  /**
   * 更新兵种组合统计
   * @private
   */
  _updateArmyComposition(myUnits) {
    const raceRoles = UNIT_ROLE_MAP[this.race] || {};

    this.armyComposition = {
      tanks: 0,
      dps: 0,
      support: 0,
      casters: 0,
      air: 0,
      scouts: 0,
    };

    for (const unit of myUnits) {
      if (unit.isWorker || unit.isBuilding) continue;
      const role = raceRoles[unit.type || unit.id] || UNIT_ROLE.DPS;

      switch (role) {
        case UNIT_ROLE.TANK: this.armyComposition.tanks++; break;
        case UNIT_ROLE.DPS: this.armyComposition.dps++; break;
        case UNIT_ROLE.SUPPORT: this.armyComposition.support++; break;
        case UNIT_ROLE.CASTER: this.armyComposition.casters++; break;
        case UNIT_ROLE.AIR: this.armyComposition.air++; break;
        case UNIT_ROLE.SCOUT: this.armyComposition.scouts++; break;
      }
    }
  }

  // ═══════════════════════════════════════════
  // 战略命令执行
  // ═══════════════════════════════════════════

  /**
   * 执行战略层决策命令
   * @private
   */
  _executeStrategyCommands(plan, snapshot) {
    // 经济决策: 建造/扩张
    if (plan.approach === 'macro' || plan.approach === 'balanced') {
      this._manageEconomy(snapshot);
    }

    // 出兵决策
    if (plan.productionTarget) {
      this._manageProduction(plan.productionTarget, snapshot);
    }

    // 科技决策
    if (plan.techTarget) {
      this._manageResearch(plan.techTarget, snapshot);
    }
  }

  /**
   * 管理经济决策
   * @private
   */
  _manageEconomy(snapshot) {
    const { minerals, gas, workers, supplyUsed, supplyTotal } = snapshot;

    // 补给管理
    if (supplyUsed >= supplyTotal - 3 && minerals >= 100) {
      this._buildSupply(snapshot);
    }

    // 工人管理
    const workerTarget = this.currentPhase === STRATEGY_PHASE.OPENING ? 22 : 30;
    if (workers < workerTarget && minerals >= 50) {
      this._trainWorker(snapshot);
    }

    // 扩张管理
    if (this.attackCooldown <= 0 && minerals > 500 && workers >= 18) {
      this._manageExpansion(snapshot);
    }
  }

  /**
   * 管理出兵决策
   * @private
   */
  _manageProduction(target, snapshot) {
    const { minerals, gas, supplyUsed, supplyTotal } = snapshot;
    if (supplyUsed >= supplyTotal - 2) return;

    const recommended = this.getRecommendedUnits(snapshot.myUnits || []);

    for (const unitId of recommended) {
      const cost = this._getUnitCost(unitId);
      if (cost && this._canAfford(cost, snapshot)) {
        eventBus.emit('ai:train', {
          playerId: this.playerId,
          unit: unitId,
        });
        break;
      }
    }
  }

  /**
   * 管理科技研发
   * @private
   */
  _manageResearch(techTarget, snapshot) {
    if (techTarget && !snapshot.techDone?.[techTarget]) {
      const cost = this._getTechCost(techTarget);
      if (cost && this._canAfford(cost, snapshot)) {
        eventBus.emit('ai:research', {
          playerId: this.playerId,
          tech: techTarget,
        });
      }
    }
  }

  // ═══════════════════════════════════════════
  // 战术执行
  // ═══════════════════════════════════════════

  /**
   * 执行进攻战术
   * @private
   */
  _executeAggressiveTactics(snapshot) {
    if (this.attackCooldown > 0) return;

    if (this.attackGroup.length === 0) {
      this.attackGroup = this._selectAttackForce(snapshot);
      this.attackTarget = this.currentPlan?.attackTarget || this._selectAttackTarget(snapshot);
    }

    if (this.attackGroup.length > 0 && this.attackTarget) {
      for (const unit of this.attackGroup) {
        eventBus.emit('ai:command', {
          playerId: this.playerId,
          unitId: unit.id,
          command: COMMAND.ATTACK,
          target: this.attackTarget,
        });
      }
      this.attackCooldown = 30;
      this.state = AI_STATE.ATTACK;
    }
  }

  /**
   * 执行防守战术
   * @private
   */
  _executeDefensiveTactics(snapshot) {
    const threats = this.threatAnalyzer.getBaseThreats();
    if (threats.length === 0) return;

    const myUnits = snapshot.myUnits || [];
    const defenders = myUnits.filter(u => u.attack && !u.isWorker && !u.isBuilding);

    const targetThreat = threats[0];

    for (const unit of defenders) {
      eventBus.emit('ai:command', {
        playerId: this.playerId,
        unitId: unit.id,
        command: COMMAND.ATTACK,
        target: targetThreat.position,
      });
    }

    this.state = AI_STATE.DEFEND;
  }

  /**
   * 执行宏观战术
   * @private
   */
  _executeMacroTactics(snapshot) {
    // 保守出兵，不主动进攻
    this.state = AI_STATE.MID_BUILD;
  }

  /**
   * 执行均衡战术
   * @private
   */
  _executeBalancedTactics(snapshot) {
    // 根据威胁分析结果决定
    if (this.threatLevel !== THREAT_LEVEL.NONE) {
      this._executeDefensiveTactics(snapshot);
    }
  }

  // ═══════════════════════════════════════════
  // 操作层: 单位微操
  // ═══════════════════════════════════════════

  /**
   * 执行操作层微操指令
   * @private
   */
  _executeMicro() {
    const snapshot = this._getSnapshot();
    if (!snapshot) return;

    const myUnits = snapshot.myUnits || [];
    const enemyUnits = snapshot.enemyUnits || [];

    for (const unit of myUnits) {
      if (!unit.attack || unit.isWorker || unit.isBuilding) continue;

      // 低血量单位后撤
      if (unit.hp < unit.maxHp * 0.2) {
        const safePoint = this._findSafePoint(unit, snapshot);
        if (safePoint) {
          eventBus.emit('ai:command', {
            playerId: this.playerId,
            unitId: unit.id,
            command: COMMAND.MOVE,
            target: safePoint,
          });
          continue;
        }
      }

      // 集火: 优先攻击血量最低的敌人
      const nearbyEnemies = enemyUnits.filter(e =>
        distance2D(unit.position, e.position) <= (unit.attack.range || 5) * 1.5
      );

      if (nearbyEnemies.length > 1) {
        const weakest = nearbyEnemies.reduce((min, e) => {
          const hpA = (e.hp || 0) + (e.shield || 0);
          const hpB = (min.hp || 0) + (min.shield || 0);
          return hpA < hpB ? e : min;
        });

        eventBus.emit('ai:command', {
          playerId: this.playerId,
          unitId: unit.id,
          command: COMMAND.ATTACK,
          target: weakest,
        });
      }
    }

    // 使用技能
    this._useAbilities(myUnits, enemyUnits, snapshot);
  }

  /**
   * 使用单位技能
   * @private
   */
  _useAbilities(myUnits, enemyUnits, snapshot) {
    for (const unit of myUnits) {
      if (!unit.abilities || unit.abilities.length === 0) continue;

      // 兴奋剂
      if (unit.abilities.includes('stimpack') && unit.hp > unit.maxHp * 0.5) {
        const hasEnemyNearby = enemyUnits.some(e =>
          distance2D(unit.position, e.position) <= 6
        );
        if (hasEnemyNearby) {
          eventBus.emit('ai:cast_ability', {
            playerId: this.playerId,
            unitId: unit.id,
            ability: 'stimpack',
          });
        }
      }

      // 灵能风暴
      if (unit.abilities.includes('psionic_storm') && unit.energy >= 75) {
        const cluster = this._findEnemyCluster(unit.position, enemyUnits);
        if (cluster && cluster.count >= 3) {
          eventBus.emit('ai:cast_ability', {
            playerId: this.playerId,
            unitId: unit.id,
            ability: 'psionic_storm',
            target: cluster.center,
          });
        }
      }
    }
  }

  // ═══════════════════════════════════════════
  // 辅助方法
  // ═══════════════════════════════════════════

  /**
   * 更新战略阶段
   * @private
   */
  _updatePhase() {
    const snapshot = this._getSnapshot();
    if (!snapshot) return;

    const gameTime = snapshot.gameTime || 0;
    const buildingCount = snapshot.buildingCount || 0;

    if (gameTime < 120 || buildingCount < 4) {
      this.currentPhase = STRATEGY_PHASE.OPENING;
    } else if (gameTime < 420 || buildingCount < 8) {
      this.currentPhase = STRATEGY_PHASE.EARLY_GAME;
    } else if (gameTime < 900) {
      this.currentPhase = STRATEGY_PHASE.MID_GAME;
    } else {
      this.currentPhase = STRATEGY_PHASE.LATE_GAME;
    }
  }

  /**
   * 获取游戏状态快照
   * @private
   * @returns {object|null}
   */
  _getSnapshot() {
    if (!this.gameState) return null;
    return typeof this.gameState === 'function'
      ? this.gameState(this.playerId)
      : this.gameState;
  }

  /**
   * 计算己方军队评分
   * @private
   */
  _calculateArmyScore(units, pid) {
    return units
      .filter(u => u.playerId === pid && u.attack && !u.isWorker)
      .reduce((score, u) => {
        const hp = (u.hp || 0) + (u.shield || 0);
        const atk = (u.attack?.damage || 0) * 2;
        return score + hp + atk;
      }, 0);
  }

  /**
   * 计算敌方军队评分
   * @private
   */
  _calculateEnemyArmyScore(snapshot) {
    return (snapshot.enemyUnits || [])
      .filter(u => u.attack && !u.isWorker)
      .reduce((score, u) => {
        const hp = (u.hp || 0) + (u.shield || 0);
        const atk = (u.attack?.damage || 0) * 2;
        return score + hp + atk;
      }, 0);
  }

  /**
   * 选择攻击编队
   * @private
   */
  _selectAttackForce(snapshot) {
    const units = snapshot.myUnits || [];
    return units
      .filter(u => u.attack && !u.isWorker && !u.isBuilding)
      .sort((a, b) => {
        const scoreA = (a.attack?.damage || 0) + (a.hp || 0) * 0.5;
        const scoreB = (b.attack?.damage || 0) + (b.hp || 0) * 0.5;
        return scoreB - scoreA;
      })
      .slice(0, Math.min(20, units.length));
  }

  /**
   * 选择攻击目标
   * @private
   */
  _selectAttackTarget(snapshot) {
    const enemyBases = snapshot.enemyBases || [];
    if (enemyBases.length === 0) return snapshot.enemyMainBase || null;

    return enemyBases
      .sort((a, b) => (a.defenseScore || 0) - (b.defenseScore || 0))[0] || null;
  }

  /**
   * 选择防守位置
   * @private
   */
  _selectDefendPosition(snapshot) {
    const threats = this.threatAnalyzer.getBaseThreats();
    if (threats.length > 0) return threats[0].position;

    const myBuildings = snapshot.myBuildings || [];
    return myBuildings.length > 0 ? myBuildings[0].position : null;
  }

  /**
   * 找到安全位置
   * @private
   */
  _findSafePoint(unit, snapshot) {
    const buildings = snapshot.myBuildings || [];
    if (buildings.length === 0) return null;

    let closest = buildings[0];
    let minDist = Infinity;
    for (const b of buildings) {
      const d = distance2D(unit.position, b.position);
      if (d < minDist) {
        minDist = d;
        closest = b;
      }
    }
    return closest.position;
  }

  /**
   * 查找敌方集群中心
   * @private
   */
  _findEnemyCluster(pos, enemies) {
    let bestCluster = null;
    let bestCount = 0;

    for (const enemy of enemies) {
      const nearby = enemies.filter(e =>
        distance2D(enemy.position, e.position) <= 3
      );
      if (nearby.length > bestCount) {
        bestCount = nearby.length;
        bestCluster = { center: enemy.position, count: nearby.length };
      }
    }
    return bestCount >= 3 ? bestCluster : null;
  }

  /**
   * 获取生产目标
   * @private
   */
  _getProductionTarget(snapshot, approach) {
    const recommended = this.getRecommendedUnits(snapshot.myUnits || []);
    return recommended.length > 0 ? recommended[0] : null;
  }

  /**
   * 获取科技目标
   * @private
   */
  _getTechTarget(snapshot) {
    const techPriority = this._getTechPriority();
    for (const tech of techPriority) {
      if (!snapshot.techDone?.[tech.id] && this._canAfford(tech.cost, snapshot)) {
        return tech.id;
      }
    }
    return null;
  }

  /**
   * 获取科技优先级列表
   * @private
   */
  _getTechPriority() {
    const priorities = {
      [RACE.TERRAN]: [
        { id: 'stimpack', cost: { minerals: 100, gas: 100 } },
        { id: 'infantry_weapons_1', cost: { minerals: 100, gas: 100 } },
        { id: 'infantry_armor_1', cost: { minerals: 100, gas: 100 } },
        { id: 'siege_tech', cost: { minerals: 150, gas: 150 } },
        { id: 'vehicle_weapons_1', cost: { minerals: 100, gas: 100 } },
      ],
      [RACE.ZERG]: [
        { id: 'metabolic_boost', cost: { minerals: 100, gas: 100 } },
        { id: 'melee_attacks_1', cost: { minerals: 100, gas: 100 } },
        { id: 'carapace_1', cost: { minerals: 100, gas: 100 } },
        { id: 'muscular_augments', cost: { minerals: 150, gas: 150 } },
        { id: 'lurker_aspect', cost: { minerals: 150, gas: 150 } },
      ],
      [RACE.PROTOSS]: [
        { id: 'leg_enhancements', cost: { minerals: 200, gas: 200 } },
        { id: 'singularity_charge', cost: { minerals: 150, gas: 150 } },
        { id: 'ground_weapons_1', cost: { minerals: 100, gas: 100 } },
        { id: 'psionic_storm', cost: { minerals: 200, gas: 200 } },
        { id: 'carrier_capacity', cost: { minerals: 100, gas: 100 } },
      ],
    };
    return priorities[this.race] || [];
  }

  /**
   * 获取单位训练费用
   * @private
   */
  _getUnitCost(unitId) {
    const costs = {
      marine: { minerals: 50, gas: 0, supply: 1 },
      firebat: { minerals: 50, gas: 0, supply: 1 },
      medic: { minerals: 50, gas: 25, supply: 2 },
      siege_tank: { minerals: 150, gas: 100, supply: 2 },
      goliath: { minerals: 100, gas: 50, supply: 2 },
      wraith: { minerals: 150, gas: 100, supply: 2 },
      science_vessel: { minerals: 100, gas: 225, supply: 2 },
      vulture: { minerals: 75, gas: 0, supply: 2 },
      zergling: { minerals: 50, gas: 0, supply: 1 },
      hydralisk: { minerals: 75, gas: 25, supply: 2 },
      lurker: { minerals: 75, gas: 25, supply: 2 },
      mutalisk: { minerals: 100, gas: 100, supply: 2 },
      ultralisk: { minerals: 200, gas: 200, supply: 4 },
      defiler: { minerals: 50, gas: 150, supply: 2 },
      scourge: { minerals: 25, gas: 75, supply: 1 },
      zealot: { minerals: 100, gas: 0, supply: 2 },
      dragoon: { minerals: 125, gas: 50, supply: 2 },
      high_templar: { minerals: 50, gas: 150, supply: 2 },
      archon: { minerals: 0, gas: 0, supply: 4 },
      corsair: { minerals: 100, gas: 100, supply: 2 },
      carrier: { minerals: 350, gas: 250, supply: 6 },
      reaver: { minerals: 200, gas: 100, supply: 4 },
      dark_templar: { minerals: 125, gas: 100, supply: 2 },
      scv: { minerals: 50, gas: 0, supply: 1 },
      drone: { minerals: 50, gas: 0, supply: 1 },
      probe: { minerals: 50, gas: 0, supply: 1 },
      overlord: { minerals: 100, gas: 0, supply: 0 },
    };
    return costs[unitId] || null;
  }

  /**
   * 获取科技研发费用
   * @private
   */
  _getTechCost(techId) {
    const tech = this._getTechPriority().find(t => t.id === techId);
    return tech ? tech.cost : null;
  }

  /**
   * 检查是否负担得起
   * @private
   */
  _canAfford(cost, snapshot) {
    return (snapshot.minerals || 0) >= (cost.minerals || 0) &&
           (snapshot.gas || 0) >= (cost.gas || 0);
  }

  /**
   * 建造补给建筑
   * @private
   */
  _buildSupply(snapshot) {
    const supplyBuildings = {
      [RACE.TERRAN]: 'supply_depot',
      [RACE.ZERG]: 'overlord',
      [RACE.PROTOSS]: 'pylon',
    };
    const building = supplyBuildings[this.race];
    if (!building) return;

    if (this.race === RACE.ZERG) {
      eventBus.emit('ai:train', { playerId: this.playerId, unit: 'overlord' });
    } else {
      eventBus.emit('ai:build', { playerId: this.playerId, building });
    }
  }

  /**
   * 训练工人
   * @private
   */
  _trainWorker(snapshot) {
    const workers = {
      [RACE.TERRAN]: 'scv',
      [RACE.ZERG]: 'drone',
      [RACE.PROTOSS]: 'probe',
    };
    eventBus.emit('ai:train', { playerId: this.playerId, unit: workers[this.race] });
  }

  /**
   * 管理扩张
   * @private
   */
  _manageExpansion(snapshot) {
    if (snapshot.gameTime - this.lastExpansionTime < 60) return;
    eventBus.emit('ai:expand', { playerId: this.playerId });
    this.lastExpansionTime = snapshot.gameTime;
  }

  /**
   * 默认策略计划
   * @private
   * @returns {StrategyPlan}
   */
  _defaultPlan() {
    return {
      phase: this.currentPhase,
      approach: 'balanced',
      productionTarget: null,
      techTarget: null,
      attackTarget: null,
      defendPosition: null,
    };
  }

  /**
   * 获取 AI 信息摘要（调试用）
   * @returns {object}
   */
  getInfo() {
    return {
      playerId: this.playerId,
      race: this.race,
      phase: this.currentPhase,
      threatLevel: this.threatLevel,
      economyWeight: this.economyWeight,
      militaryWeight: this.militaryWeight,
      armyComposition: { ...this.armyComposition },
      state: this.state,
    };
  }
}

export { THREAT_LEVEL, STRATEGY_PHASE, UNIT_ROLE, ThreatAnalyzer };
export default SmartAI;
