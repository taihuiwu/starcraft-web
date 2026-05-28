// ═══════════════════════════════════════════
// StarCraft Web - 空投/运输战术系统
// 智能空投编队、增强扩张策略、空投反制
// ═══════════════════════════════════════════

import { RACE, COMMAND, AI_STATE } from '../../shared/Constants.js';
import { distance2D } from '../../shared/MathUtils.js';
import { eventBus } from '../../shared/EventBus.js';

// ── 运输单位定义（按种族） ──
const TRANSPORT_UNITS = {
  [RACE.TERRAN]: 'dropship',
  [RACE.ZERG]: 'overlord',
  [RACE.PROTOSS]: 'shuttle',
};

// ── 运输单位建造前置建筑 ──
const TRANSPORT_PREREQS = {
  [RACE.TERRAN]: 'starport',
  [RACE.ZERG]: 'spire', // overlord需要lair阶段（ventral_sacs科技）
  [RACE.PROTOSS]: 'robotics_facility',
};

// ── 可装载的步兵单位（按种族） ──
const DROPPABLE_UNITS = {
  [RACE.TERRAN]: ['marine', 'firebat', 'medic', 'siege_tank'],
  [RACE.ZERG]: ['zergling', 'hydralisk', 'lurker'],
  [RACE.PROTOSS]: ['zealot', 'dragoon', 'dark_templar'],
};

// ── 防空单位（按种族） ──
const ANTI_AIR_UNITS = {
  [RACE.TERRAN]: ['goliath', 'marine', 'wraith'],
  [RACE.ZERG]: ['hydralisk', 'scourge', 'mutalisk'],
  [RACE.PROTOSS]: ['dragoon', 'corsair', 'archon'],
};

// ── 空投阶段 ──
const DROP_PHASE = {
  IDLE: 'idle',
  ASSEMBLING: 'assembling',    // 集结空投部队
  LOADING: 'loading',          // 装载单位
  FLYING: 'flying',            // 运输机飞往目标
  UNLOADING: 'unloading',      // 卸载单位
  ATTACKING: 'attacking',      // 卸载后攻击
  RETURNING: 'returning',      // 运输机返航
};

// ── 扩张评分权重 ──
const EXPANSION_WEIGHTS = {
  distance: 0.3,       // 距离权重（越近越好）
  defense: 0.25,       // 防御权重（己方兵力越多越好）
  resources: 0.25,     // 资源权重（剩余矿越多越好）
  safety: 0.2,         // 安全权重（敌方兵力越少越好）
};

// ═══════════════════════════════════════════
// 空投/运输战术控制器
// ═══════════════════════════════════════════

/**
 * DropTactics - 管理AI的空投进攻、扩张策略和反空投
 *
 * @example
 * const dropTactics = new DropTactics({ playerId: 2, race: 'terran', gameState });
 * // 在游戏循环中调用
 * dropTactics.update(delta);
 */
export class DropTactics {
  /**
   * @param {object} options
   * @param {number} options.playerId - AI 玩家 ID
   * @param {string} options.race - 种族
   * @param {object} options.gameState - 游戏状态引用
   */
  constructor(options) {
    this.playerId = options.playerId;
    this.race = options.race;
    this.gameState = options.gameState;

    // ── 空投状态 ──
    /** @type {string} 当前空投阶段 */
    this.dropPhase = DROP_PHASE.IDLE;
    /** @type {object|null} 当前空投计划 */
    this.activeDropPlan = null;
    /** @type {object|null} 当前空投目标位置 */
    this.dropTarget = null;
    /** @type {object[]} 正在执行空投的运输机 */
    this.activeTransports = [];
    /** @type {object[]} 已装载的单位 */
    this.loadedUnits = [];
    /** @type {object[]} 已卸载的单位（待攻击指令） */
    this.unloadedUnits = [];

    // ── 冷却计时器 ──
    /** @type {number} 空投冷却（秒） */
    this.dropCooldown = 0;
    /** @type {number} 扩张评分冷却（秒） */
    this.expansionEvalCooldown = 0;
    /** @type {number} 反空投扫描冷却（秒） */
    this.antiDropScanCooldown = 0;

    // ── 扩张相关 ──
    /** @type {object[]} 已评分的扩张候选点 */
    this.expansionCandidates = [];
    /** @type {object|null} 当前最佳扩张点 */
    this.bestExpansionSite = null;
    /** @type {number} 上次扩张评分时间 */
    this.lastExpansionEvalTime = 0;

    // ── 反空投相关 ──
    /** @type {object[]} 检测到的敌方运输机 */
    this.detectedEnemyTransports = [];
    /** @type {object[]} 已调度的防空单位 */
    this.antiDropSquad = [];
    /** @type {boolean} 是否正在响应空投威胁 */
    this.respondingToDrop = false;
  }

  // ═══════════════════════════════════════════
  // 主更新循环
  // ═══════════════════════════════════════════

  /**
   * 主更新入口（每帧调用）
   * @param {number} delta - 帧间隔（秒）
   */
  update(delta) {
    // 更新冷却
    this.dropCooldown = Math.max(0, this.dropCooldown - delta);
    this.expansionEvalCooldown = Math.max(0, this.expansionEvalCooldown - delta);
    this.antiDropScanCooldown = Math.max(0, this.antiDropScanCooldown - delta);

    const snapshot = this._getSnapshot();
    if (!snapshot) return;

    // ── 1. 反空投检测（高优先级） ──
    if (this.antiDropScanCooldown <= 0) {
      this._scanForEnemyDrops(snapshot);
      this.antiDropScanCooldown = 1.5; // 每1.5秒扫描一次
    }

    // ── 2. 执行反空投响应 ──
    if (this.respondingToDrop) {
      this._executeAntiDropResponse(snapshot);
    }

    // ── 3. 管理活跃的空投任务 ──
    if (this.activeTransports.length > 0) {
      this._manageActiveDrop(snapshot);
    }

    // ── 4. 评估新的空投机会 ──
    if (this.dropCooldown <= 0 && this.dropPhase === DROP_PHASE.IDLE) {
      this._evaluateDropOpportunity(snapshot);
    }

    // ── 5. 增强扩张评分 ──
    if (this.expansionEvalCooldown <= 0) {
      this._evaluateExpansionSites(snapshot);
      this.expansionEvalCooldown = 5.0; // 每5秒重新评估
    }
  }

  // ═══════════════════════════════════════════
  // 空投逻辑
  // ═══════════════════════════════════════════

  /**
   * 评估是否应发动空投
   * @param {object} snapshot - 游戏状态快照
   */
  _evaluateDropOpportunity(snapshot) {
    const gameTime = snapshot.gameTime || 0;
    if (gameTime < 300) return; // 游戏5分钟前不空投

    // 检查是否有可用的运输单位
    const transports = this._findIdleTransports(snapshot);
    if (transports.length === 0) return;

    // 检查是否有可装载的步兵
    const droppable = this._findDroppableUnits(snapshot);
    if (droppable.length < 2) return; // 至少需要2个步兵

    // 评估空投目标
    const target = this._findDropTarget(snapshot);
    if (!target) return;

    // 决定是否值得空投
    const dropScore = this._calculateDropScore(transports, droppable, target, snapshot);
    if (dropScore < 60) return; // 分数低于60不值得空投

    // 发起空投
    this._initiateDrop(transports, droppable, target);
  }

  /**
   * 查找空闲的运输单位
   * @param {object} snapshot
   * @returns {object[]}
   * @private
   */
  _findIdleTransports(snapshot) {
    const myUnits = snapshot.myUnits || [];
    const transportType = TRANSPORT_UNITS[this.race];

    return myUnits.filter(u => {
      // 必须是运输单位类型
      if (u.type !== transportType && u.id !== transportType) return false;
      // 必须属于AI
      if (u.playerId !== this.playerId) return false;
      // 不能在当前空投任务中
      if (this.activeTransports.some(t => t.id === u.id)) return false;
      // 必须是空闲状态（不在战斗中）
      if (u.target && u.target.hp > 0) return false;
      // 虫族overlord需要有运输科技（cargo > 0）
      if (this.race === RACE.ZERG && (u.cargo || 0) <= 0) return false;
      return true;
    });
  }

  /**
   * 查找可装载的步兵单位
   * @param {object} snapshot
   * @returns {object[]}
   * @private
   */
  _findDroppableUnits(snapshot) {
    const myUnits = snapshot.myUnits || [];
    const droppableTypes = DROPPABLE_UNITS[this.race] || [];

    return myUnits.filter(u => {
      // 必须是可空投的步兵类型
      if (!droppableTypes.includes(u.type || u.id)) return false;
      // 必须属于AI
      if (u.playerId !== this.playerId) return false;
      // 不能是工人
      if (u.isWorker) return false;
      // 不能是建筑
      if (u.isBuilding) return false;
      // 不能在运输机里
      if (u.loaded) return false;
      // 不能太远（距离最近的运输机一定范围内）
      // 这里先不过滤距离，在initiateDrop时再处理
      return true;
    });
  }

  /**
   * 查找空投目标位置
   * @param {object} snapshot
   * @returns {object|null} 目标位置 {x, z, score, type}
   * @private
   */
  _findDropTarget(snapshot) {
    const targets = [];

    // ── 1. 敌方分矿（优先空投目标） ──
    const enemyBases = snapshot.enemyBases || [];
    for (const base of enemyBases) {
      if (base.isMain) continue; // 不空投主矿（防御太强）
      const defenseScore = this._evaluateBaseDefense(base, snapshot);
      if (defenseScore < 50) {
        targets.push({
          x: base.position.x,
          z: base.position.z,
          score: 100 - defenseScore, // 防御越弱分数越高
          type: 'expansion',
          base,
        });
      }
    }

    // ── 2. 敌方矿区（worker集中区） ──
    const enemyWorkers = (snapshot.enemyUnits || []).filter(
      u => u.isWorker && u.playerId !== this.playerId
    );
    const workerClusters = this._findWorkerClusters(enemyWorkers);
    for (const cluster of workerClusters) {
      const nearbyDefense = this._countNearbyDefenders(cluster.center, snapshot);
      if (nearbyDefense < 4) {
        targets.push({
          x: cluster.center.x,
          z: cluster.center.z,
          score: cluster.count * 5 + (10 - nearbyDefense) * 5,
          type: 'economy',
        });
      }
    }

    // ── 3. 敌方科技建筑区 ──
    const enemyBuildings = (snapshot.enemyBuildings || []).filter(
      b => b.playerId !== this.playerId && b.isTech
    );
    for (const building of enemyBuildings) {
      const nearbyDefense = this._countNearbyDefenders(building.position, snapshot);
      if (nearbyDefense < 3) {
        targets.push({
          x: building.position.x,
          z: building.position.z,
          score: 80 - nearbyDefense * 10,
          type: 'tech',
        });
      }
    }

    if (targets.length === 0) return null;

    // 按分数排序，选择最佳目标
    targets.sort((a, b) => b.score - a.score);
    return targets[0];
  }

  /**
   * 计算空投价值分数
   * @param {object[]} transports - 可用运输机
   * @param {object[]} droppable - 可装载步兵
   * @param {object} target - 目标位置
   * @param {object} snapshot
   * @returns {number} 0-100分
   * @private
   */
  _calculateDropScore(transports, droppable, target, snapshot) {
    let score = 0;

    // 基础分数：目标价值
    score += Math.min(40, target.score * 0.4);

    // 运输机可用性
    const transportCapacity = transports.reduce((sum, t) => sum + (t.cargo || 8), 0);
    score += Math.min(20, transportCapacity * 2);

    // 步兵数量
    score += Math.min(20, droppable.length * 3);

    // 距离因素：目标距离越近越好
    const myBases = (snapshot.myBuildings || []).filter(b => b.playerId === this.playerId);
    if (myBases.length > 0) {
      const avgDist = myBases.reduce((sum, b) =>
        sum + distance2D(b.position, target), 0) / myBases.length;
      const distPenalty = Math.min(20, avgDist * 0.5);
      score -= distPenalty;
    }

    // 当前威胁等级：防御态势下更倾向空投（分散敌方注意力）
    // 这里不直接用threatLevel，而是在调用方SmartAI中考虑

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 发起空投任务
   * @param {object[]} transports - 运输机
   * @param {object[]} droppable - 可装载步兵
   * @param {object} target - 目标位置
   * @private
   */
  _initiateDrop(transports, droppable, target) {
    this.dropPhase = DROP_PHASE.ASSEMBLING;
    this.dropTarget = target;
    this.activeTransports = [];
    this.loadedUnits = [];
    this.unloadedUnits = [];

    // 选择运输机（取最近的）
    const selectedTransports = transports.slice(0, Math.ceil(droppable.length / 8));
    this.activeTransports = [...selectedTransports];

    // 选择装载的步兵（按战斗力排序，优先装高价值单位）
    const sortedDroppable = [...droppable].sort((a, b) => {
      const scoreA = (a.attack?.damage || 0) * 2 + (a.hp || 0) * 0.5;
      const scoreB = (b.attack?.damage || 0) * 2 + (b.hp || 0) * 0.5;
      return scoreB - scoreA;
    });

    // 计算总装载容量
    const totalCapacity = selectedTransports.reduce((sum, t) => sum + (t.cargo || 8), 0);
    this.loadedUnits = sortedDroppable.slice(0, totalCapacity);

    // 集结步兵到运输机位置
    const rallyPoint = selectedTransports[0]?.position;
    if (rallyPoint) {
      for (const unit of this.loadedUnits) {
        eventBus.emit('ai:command', {
          playerId: this.playerId,
          unitId: unit.id,
          command: COMMAND.MOVE,
          target: rallyPoint,
        });
      }
      this.dropPhase = DROP_PHASE.LOADING;
    } else {
      this._resetDropState();
    }
  }

  /**
   * 管理进行中的空投任务
   * @param {object} snapshot
   * @private
   */
  _manageActiveDrop(snapshot) {
    switch (this.dropPhase) {
      case DROP_PHASE.LOADING:
        this._manageLoading(snapshot);
        break;
      case DROP_PHASE.FLYING:
        this._manageFlying(snapshot);
        break;
      case DROP_PHASE.UNLOADING:
        this._manageUnloading(snapshot);
        break;
      case DROP_PHASE.ATTACKING:
        this._manageAttacking(snapshot);
        break;
      case DROP_PHASE.RETURNING:
        this._manageReturning(snapshot);
        break;
    }
  }

  /**
   * 管理装载阶段
   * @param {object} snapshot
   * @private
   */
  _manageLoading(snapshot) {
    const myUnits = snapshot.myUnits || [];
    const allLoaded = this.loadedUnits.every(u => {
      const unit = myUnits.find(mu => mu.id === u.id);
      return unit && unit.loaded;
    });

    // 检查步兵是否已到达运输机附近
    let readyCount = 0;
    for (const unit of this.loadedUnits) {
      const liveUnit = myUnits.find(mu => mu.id === unit.id);
      if (!liveUnit) continue;

      const nearTransport = this.activeTransports.some(t =>
        distance2D(liveUnit.position, t.position) < 3
      );

      if (nearTransport) {
        // 发送装载命令
        eventBus.emit('ai:command', {
          playerId: this.playerId,
          unitId: liveUnit.id,
          command: COMMAND.LOAD,
          target: this.activeTransports[0], // 装载到第一架运输机
        });
        readyCount++;
      } else {
        // 继续向运输机移动
        eventBus.emit('ai:command', {
          playerId: this.playerId,
          unitId: liveUnit.id,
          command: COMMAND.MOVE,
          target: this.activeTransports[0]?.position,
        });
      }
    }

    // 所有步兵都装载完毕后开始飞行
    if (allLoaded || readyCount >= this.loadedUnits.length * 0.8) {
      this.dropPhase = DROP_PHASE.FLYING;
      // 命令运输机飞往目标
      for (const transport of this.activeTransports) {
        eventBus.emit('ai:command', {
          playerId: this.playerId,
          unitId: transport.id,
          command: COMMAND.MOVE,
          target: this.dropTarget,
        });
      }
    }

    // 超时保护：10秒后如果还没装载完，强制起飞
    if (!this._loadingStartTime) {
      this._loadingStartTime = Date.now();
    }
    if (Date.now() - this._loadingStartTime > 10000) {
      this.dropPhase = DROP_PHASE.FLYING;
      for (const transport of this.activeTransports) {
        eventBus.emit('ai:command', {
          playerId: this.playerId,
          unitId: transport.id,
          command: COMMAND.MOVE,
          target: this.dropTarget,
        });
      }
    }
  }

  /**
   * 管理飞行阶段
   * @param {object} snapshot
   * @private
   */
  _manageFlying(snapshot) {
    // 检查运输机是否到达目标区域
    const arrived = this.activeTransports.every(t => {
      const liveUnit = (snapshot.myUnits || []).find(u => u.id === t.id);
      return liveUnit && distance2D(liveUnit.position, this.dropTarget) < 5;
    });

    if (arrived) {
      this.dropPhase = DROP_PHASE.UNLOADING;
      this._unloadDrop(snapshot);
    } else {
      // 确保运输机继续飞往目标
      for (const transport of this.activeTransports) {
        const liveUnit = (snapshot.myUnits || []).find(u => u.id === transport.id);
        if (liveUnit) {
          eventBus.emit('ai:command', {
            playerId: this.playerId,
            unitId: liveUnit.id,
            command: COMMAND.MOVE,
            target: this.dropTarget,
          });
        }
      }
    }

    // 检查运输机是否被击毁
    this.activeTransports = this.activeTransports.filter(t => {
      const liveUnit = (snapshot.myUnits || []).find(u => u.id === t.id);
      return liveUnit && liveUnit.hp > 0;
    });

    if (this.activeTransports.length === 0) {
      this._resetDropState();
    }
  }

  /**
   * 卸载空投单位
   * @param {object} snapshot
   * @private
   */
  _unloadDrop(snapshot) {
    for (const transport of this.activeTransports) {
      const liveUnit = (snapshot.myUnits || []).find(u => u.id === transport.id);
      if (liveUnit) {
        eventBus.emit('ai:command', {
          playerId: this.playerId,
          unitId: liveUnit.id,
          command: COMMAND.UNLOAD,
          target: this.dropTarget,
        });
      }
    }

    this.unloadedUnits = this.loadedUnits;
    this.dropPhase = DROP_PHASE.ATTACKING;
  }

  /**
   * 管理卸载后的攻击阶段
   * @param {object} snapshot
   * @private
   */
  _manageAttacking(snapshot) {
    const myUnits = snapshot.myUnits || [];
    const enemyUnits = snapshot.enemyUnits || [];

    // 找到已卸载的步兵并命令攻击
    for (const unit of this.unloadedUnits) {
      const liveUnit = myUnits.find(u => u.id === unit.id);
      if (!liveUnit || liveUnit.hp <= 0) continue;

      // 查找最近的敌方目标
      const nearbyEnemies = enemyUnits.filter(e =>
        e.playerId !== this.playerId &&
        distance2D(liveUnit.position, e.position) < 10
      );

      if (nearbyEnemies.length > 0) {
        // 优先攻击工人
        const workers = nearbyEnemies.filter(e => e.isWorker);
        const target = workers.length > 0 ? workers[0] : nearbyEnemies[0];

        eventBus.emit('ai:command', {
          playerId: this.playerId,
          unitId: liveUnit.id,
          command: COMMAND.ATTACK,
          target: target,
        });
      } else {
        // 没有敌人，在目标区域巡逻
        const patrolOffset = {
          x: this.dropTarget.x + (Math.random() - 0.5) * 8,
          z: this.dropTarget.z + (Math.random() - 0.5) * 8,
        };
        eventBus.emit('ai:command', {
          playerId: this.playerId,
          unitId: liveUnit.id,
          command: COMMAND.PATROL,
          target: patrolOffset,
        });
      }
    }

    // 5秒后让运输机返航
    if (!this._attackStartTime) {
      this._attackStartTime = Date.now();
    }
    if (Date.now() - this._attackStartTime > 5000) {
      this.dropPhase = DROP_PHASE.RETURNING;
      this._manageReturning(snapshot);
    }
  }

  /**
   * 管理运输机返航
   * @param {object} snapshot
   * @private
   */
  _manageReturning(snapshot) {
    const myBases = (snapshot.myBuildings || []).filter(b => b.playerId === this.playerId);
    if (myBases.length === 0) {
      this._resetDropState();
      return;
    }

    const homeBase = myBases[0];
    for (const transport of this.activeTransports) {
      const liveUnit = (snapshot.myUnits || []).find(u => u.id === transport.id);
      if (liveUnit && liveUnit.hp > 0) {
        eventBus.emit('ai:command', {
          playerId: this.playerId,
          unitId: liveUnit.id,
          command: COMMAND.MOVE,
          target: homeBase.position,
        });
      }
    }

    // 返航完成后重置状态
    const allHome = this.activeTransports.every(t => {
      const liveUnit = (snapshot.myUnits || []).find(u => u.id === t.id);
      return liveUnit && distance2D(liveUnit.position, homeBase.position) < 5;
    });

    if (allHome || !this.activeTransports.some(t => {
      const liveUnit = (snapshot.myUnits || []).find(u => u.id === t.id);
      return liveUnit && liveUnit.hp > 0;
    })) {
      this._resetDropState();
    }
  }

  /**
   * 重置空投状态
   * @private
   */
  _resetDropState() {
    this.dropPhase = DROP_PHASE.IDLE;
    this.activeDropPlan = null;
    this.dropTarget = null;
    this.activeTransports = [];
    this.loadedUnits = [];
    this.unloadedUnits = [];
    this._loadingStartTime = null;
    this._attackStartTime = null;
    this.dropCooldown = 90; // 90秒空投冷却
  }

  // ═══════════════════════════════════════════
  // 增强扩张策略
  // ═══════════════════════════════════════════

  /**
   * 评估所有扩张候选点并选择最佳位置
   * @param {object} snapshot
   * @private
   */
  _evaluateExpansionSites(snapshot) {
    const myBuildings = (snapshot.myBuildings || []).filter(b => b.playerId === this.playerId);
    const enemyUnits = (snapshot.enemyUnits || []).filter(u => u.playerId !== this.playerId);
    const myUnits = (snapshot.myUnits || []).filter(u => u.playerId === this.playerId);

    if (myBuildings.length === 0) return;

    // 主基地位置
    const mainBase = myBuildings.find(b => b.isMain) || myBuildings[0];
    const mainPos = mainBase.position;

    // 生成扩张候选点（基于地图已知资源点）
    const resourceNodes = this._findResourceNodes(snapshot);
    const candidates = [];

    for (const node of resourceNodes) {
      // 跳过已被占领的矿点
      const occupied = myBuildings.some(b =>
        distance2D(b.position, node.position) < 5
      );
      if (occupied) continue;

      const score = this._scoreExpansionSite(node, mainPos, myUnits, enemyUnits, snapshot);
      if (score > 0) {
        candidates.push({ ...node, score });
      }
    }

    // 按分数排序
    candidates.sort((a, b) => b.score - a.score);
    this.expansionCandidates = candidates;
    this.bestExpansionSite = candidates.length > 0 ? candidates[0] : null;
  }

  /**
   * 为扩张候选点打分
   * @param {object} site - 候选点 {position, mineralCount, ...}
   * @param {object} mainPos - 主基地位置
   * @param {object[]} myUnits - 己方单位
   * @param {object[]} enemyUnits - 敌方单位
   * @param {object} snapshot
   * @returns {number} 0-100分
   * @private
   */
  _scoreExpansionSite(site, mainPos, myUnits, enemyUnits, snapshot) {
    let score = 0;

    // ── 1. 距离因素（越近越好） ──
    const dist = distance2D(site.position, mainPos);
    const maxDist = 80; // 最大可接受距离
    const distScore = Math.max(0, 100 - (dist / maxDist) * 100);
    score += distScore * EXPANSION_WEIGHTS.distance;

    // ── 2. 防御因素（己方兵力越多越好） ──
    const nearbyAllies = myUnits.filter(u =>
      distance2D(u.position, site.position) < 15 && u.attack
    );
    const defenseScore = Math.min(100, nearbyAllies.length * 10);
    score += defenseScore * EXPANSION_WEIGHTS.defense;

    // ── 3. 资源因素（剩余矿越多越好） ──
    const resourceScore = Math.min(100, (site.mineralCount || 0) / 10);
    score += resourceScore * EXPANSION_WEIGHTS.resources;

    // ── 4. 安全因素（敌方兵力越少越好） ──
    const nearbyEnemies = enemyUnits.filter(u =>
      distance2D(u.position, site.position) < 20 && u.attack
    );
    const safetyScore = Math.max(0, 100 - nearbyEnemies.length * 15);
    score += safetyScore * EXPANSION_WEIGHTS.safety;

    // ── 额外：已有防御建筑加分 ──
    const myBuildings = (snapshot.myBuildings || []).filter(b => b.playerId === this.playerId);
    const nearbyDefenses = myBuildings.filter(b =>
      distance2D(b.position, site.position) < 15 && b.isDefense
    );
    score += nearbyDefenses.length * 5;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 查找地图上的资源节点
   * @param {object} snapshot
   * @returns {object[]}
   * @private
   */
  _findResourceNodes(snapshot) {
    // 从已知的游戏状态中提取资源节点信息
    const nodes = [];

    // 如果snapshot有resourceNodes字段，直接使用
    if (snapshot.resourceNodes) {
      return snapshot.resourceNodes;
    }

    // 否则尝试从建筑和矿物推断
    const allBuildings = snapshot.buildings || snapshot.myBuildings || snapshot.enemyBuildings || [];
    // 简单启发式：在已知矿区周围搜索
    for (const building of allBuildings) {
      if (building.isMain) continue;
      // 分矿附近通常有矿点
      const hasNearbyMinerals = (snapshot.minerals || []).some(m =>
        distance2D(m.position, building.position) < 5
      );
      if (hasNearbyMinerals) {
        nodes.push({
          position: { x: building.position.x, z: building.position.z },
          mineralCount: building.mineralCount || 500,
        });
      }
    }

    return nodes;
  }

  /**
   * 获取最佳扩张点（供外部调用）
   * @returns {object|null} {x, z, score}
   */
  getBestExpansionSite() {
    return this.bestExpansionSite;
  }

  // ═══════════════════════════════════════════
  // 空投反制逻辑
  // ═══════════════════════════════════════════

  /**
   * 扫描敌方运输机
   * @param {object} snapshot
   * @private
   */
  _scanForEnemyDrops(snapshot) {
    const enemyUnits = (snapshot.enemyUnits || []).filter(u => u.playerId !== this.playerId);

    // 检测敌方运输机（飞行单位 + 有装载能力）
    this.detectedEnemyTransports = enemyUnits.filter(u => {
      if (!u.isFlying) return false;
      // 检查是否是运输单位
      const abilities = u.abilities || [];
      return abilities.includes('load') ||
             abilities.includes('unload') ||
             abilities.includes('drop') ||
             (u.cargo && u.cargo > 0);
    });

    // 如果检测到敌方运输机向我方基地移动
    const myBases = (snapshot.myBuildings || []).filter(b => b.playerId === this.playerId);
    const incomingTransports = this.detectedEnemyTransports.filter(t => {
      return myBases.some(base =>
        distance2D(t.position, base.position) < 25 &&
        this._isMovingToward(t, base.position)
      );
    });

    if (incomingTransports.length > 0) {
      this.respondingToDrop = true;
      this._scheduleAntiDropResponse(incomingTransports, snapshot);
    }
  }

  /**
   * 判断单位是否在朝目标移动
   * @param {object} unit
   * @param {object} targetPos
   * @returns {boolean}
   * @private
   */
  _isMovingToward(unit, targetPos) {
    if (!unit.target && !unit.moveTarget) return false;
    const target = unit.target || unit.moveTarget;
    if (!target || !target.position) return false;

    // 检查移动目标是否在朝着我方基地方向
    const distToTarget = distance2D(target.position, targetPos);
    const distToUnit = distance2D(unit.position, targetPos);
    return distToTarget < distToUnit;
  }

  /**
   * 调度防空单位响应空投威胁
   * @param {object[]} incomingTransports - 敌方运输机
   * @param {object} snapshot
   * @private
   */
  _scheduleAntiDropResponse(incomingTransports, snapshot) {
    const myUnits = (snapshot.myUnits || []).filter(u =>
      u.playerId === this.playerId && !u.isWorker && !u.isBuilding
    );
    const antiAirTypes = ANTI_AIR_UNITS[this.race] || [];

    // 找到我方防空单位
    const antiAirUnits = myUnits.filter(u => {
      const type = u.type || u.id;
      return antiAirTypes.includes(type) ||
             (u.attack && u.attack.canHitAir);
    });

    if (antiAirUnits.length === 0) return;

    // 为每个检测到的运输机分配防空单位
    this.antiDropSquad = [];
    for (const transport of incomingTransports) {
      // 选择最近的防空单位
      const sortedAA = [...antiAirUnits].sort((a, b) =>
        distance2D(a.position, transport.position) -
        distance2D(b.position, transport.position)
      );

      // 分配2-3个防空单位
      const assignCount = Math.min(3, sortedAA.length);
      for (let i = 0; i < assignCount; i++) {
        const aaUnit = sortedAA[i];
        this.antiDropSquad.push(aaUnit);

        eventBus.emit('ai:command', {
          playerId: this.playerId,
          unitId: aaUnit.id,
          command: COMMAND.ATTACK,
          target: transport,
        });
      }
    }
  }

  /**
   * 执行反空投响应
   * @param {object} snapshot
   * @private
   */
  _executeAntiDropResponse(snapshot) {
    // 检查是否还有敌方运输机
    if (this.detectedEnemyTransports.length === 0) {
      this.respondingToDrop = false;
      this.antiDropSquad = [];
      return;
    }

    // 确保防空单位仍在追击
    const myUnits = snapshot.myUnits || [];
    for (const aaUnit of this.antiDropSquad) {
      const liveUnit = myUnits.find(u => u.id === aaUnit.id);
      if (!liveUnit || liveUnit.hp <= 0) continue;

      // 检查是否还在追击
      if (!liveUnit.target || liveUnit.target.hp <= 0) {
        // 寻找最近的运输机
        const nearestTransport = this.detectedEnemyTransports
          .filter(t => t.hp > 0)
          .sort((a, b) =>
            distance2D(liveUnit.position, a.position) -
            distance2D(liveUnit.position, b.position)
          )[0];

        if (nearestTransport) {
          eventBus.emit('ai:command', {
            playerId: this.playerId,
            unitId: liveUnit.id,
            command: COMMAND.ATTACK,
            target: nearestTransport,
          });
        }
      }
    }
  }

  // ═══════════════════════════════════════════
  // 辅助方法
  // ═══════════════════════════════════════════

  /**
   * 评估敌方基地防御强度
   * @param {object} base - 敌方基地
   * @param {object} snapshot
   * @returns {number} 0-100分
   * @private
   */
  _evaluateBaseDefense(base, snapshot) {
    const enemyUnits = (snapshot.enemyUnits || []).filter(u =>
      u.playerId !== this.playerId && u.attack
    );

    const nearbyDefenders = enemyUnits.filter(u =>
      distance2D(u.position, base.position) < 12
    );

    return Math.min(100, nearbyDefenders.length * 15);
  }

  /**
   * 统计目标位置附近的敌方防御单位数
   * @param {object} position
   * @param {object} snapshot
   * @returns {number}
   * @private
   */
  _countNearbyDefenders(position, snapshot) {
    const enemyUnits = (snapshot.enemyUnits || []).filter(u =>
      u.playerId !== this.playerId && u.attack
    );

    return enemyUnits.filter(u =>
      distance2D(u.position, position) < 12
    ).length;
  }

  /**
   * 查找敌方worker集群
   * @param {object[]} workers
   * @returns {object[]}
   * @private
   */
  _findWorkerClusters(workers) {
    const clusters = [];
    const used = new Set();

    for (const w of workers) {
      if (used.has(w.id)) continue;

      const nearby = workers.filter(other =>
        !used.has(other.id) && distance2D(w.position, other.position) < 6
      );

      if (nearby.length >= 3) {
        const centerX = nearby.reduce((s, u) => s + u.position.x, 0) / nearby.length;
        const centerZ = nearby.reduce((s, u) => s + u.position.z, 0) / nearby.length;
        clusters.push({
          center: { x: centerX, z: centerZ },
          count: nearby.length,
        });
        nearby.forEach(u => used.add(u.id));
      }
    }

    return clusters;
  }

  /**
   * 获取游戏状态快照
   * @returns {object|null}
   * @private
   */
  _getSnapshot() {
    if (!this.gameState) return null;
    return typeof this.gameState === 'function'
      ? this.gameState(this.playerId)
      : this.gameState;
  }

  /**
   * 获取空投战术信息摘要（调试用）
   * @returns {object}
   */
  getInfo() {
    return {
      dropPhase: this.dropPhase,
      activeTransports: this.activeTransports.length,
      loadedUnits: this.loadedUnits.length,
      dropCooldown: this.dropCooldown,
      bestExpansionSite: this.bestExpansionSite,
      expansionCandidates: this.expansionCandidates.length,
      detectedEnemyTransports: this.detectedEnemyTransports.length,
      respondingToDrop: this.respondingToDrop,
      antiDropSquad: this.antiDropSquad.length,
    };
  }
}

export { DROP_PHASE, TRANSPORT_UNITS, ANTI_AIR_UNITS };
export default DropTactics;
