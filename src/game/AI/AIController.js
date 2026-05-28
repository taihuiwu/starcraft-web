// ═══════════════════════════════════════════
// StarCraft Web - AI总控制器
// 每个AI玩家独立实例，管理经济/建造/出兵/攻防/微操
// ═══════════════════════════════════════════

import { RACE, AI_STATE, COMMAND } from '../../shared/Constants.js';
import { distance2D, randomInt, randomFloat, effectiveHP } from '../../shared/MathUtils.js';
import { eventBus } from '../../shared/EventBus.js';
import { BuildOrderManager, ACTION_TYPE } from './BuildOrder.js';

// ── 难度配置 ──
const DIFFICULTY_CONFIG = {
  easy: {
    resourceBonus: 0.5,       // 资源加成 50%
    decisionInterval: 2.0,    // 决策间隔（秒）
    attackThreshold: 0.6,     // 出兵阈值（兵力比）
    expandThreshold: 0.4,     // 扩张阈值
    microDelay: 1.0,          // 微操反应延迟
    maxUnits: 50,             // 最大单位数
    cheatVision: false,       // 开图
  },
  normal: {
    resourceBonus: 0.2,
    decisionInterval: 1.5,
    attackThreshold: 0.7,
    expandThreshold: 0.5,
    microDelay: 0.5,
    maxUnits: 80,
    cheatVision: false,
  },
  hard: {
    resourceBonus: 0,
    decisionInterval: 0.8,
    attackThreshold: 0.8,
    expandThreshold: 0.6,
    microDelay: 0.2,
    maxUnits: 120,
    cheatVision: false,
  },
};

// ═══════════════════════════════════════════
// AI 控制器
// ═══════════════════════════════════════════
export class AIController {
  /**
   * @param {object} options
   * @param {number} options.playerId   - AI玩家ID
   * @param {string} options.race       - 种族
   * @param {string} options.difficulty  - 难度 easy/normal/hard
   * @param {string} [options.opponentRace] - 对手种族
   * @param {object} options.gameState  - 游戏状态引用
   */
  constructor(options) {
    this.playerId = options.playerId;
    this.race = options.race;
    this.difficulty = options.difficulty || 'normal';
    this.opponentRace = options.opponentRace || null;
    this.gameState = options.gameState;

    this.config = DIFFICULTY_CONFIG[this.difficulty] || DIFFICULTY_CONFIG.normal;

    // 建造顺序管理
    this.buildOrderManager = new BuildOrderManager(this.race, this.opponentRace);

    // AI状态
    this.state = AI_STATE.EARLY_BUILD;
    this.stateTimer = 0;
    this.decisionTimer = 0;
    this.attackTimer = 0;
    this.scoutTimer = 0;
    this.microTimer = 0;

    // 军事评估
    this.armyScore = 0;
    this.enemyArmyScore = 0;
    this.lastAttackTime = 0;
    this.attackGroup = [];
    this.rallyPoint = null;

    // 经济状态
    this.workerTarget = 22; // 目标工人数
    this.expansionCount = 0;
    this.lastExpansionTime = 0;

    // 科技进度追踪
    this.techPriority = [];

    // 已知敌方信息
    this.enemyBuildings = [];
    this.enemyArmy = [];

    // 初始化建造顺序
    this.buildOrderManager.selectOrder(this.difficulty);
  }

  // ═══════════════════════════════════════════
  // 主更新循环
  // ═══════════════════════════════════════════

  /**
   * AI决策主循环（每帧调用）
   * @param {number} delta - 帧间隔（秒）
   * @param {object} gameState - 当前游戏状态
   */
  update(delta, gameState) {
    this.gameState = gameState;

    // 决策频率控制
    this.decisionTimer += delta;
    if (this.decisionTimer < this.config.decisionInterval) {
      // 只在决策间隔内进行微操更新
      this._updateMicro(delta);
      return;
    }
    this.decisionTimer = 0;

    // 获取当前状态快照
    const snapshot = this._getGameSnapshot();

    // 按优先级执行AI决策
    this._manageEconomy(snapshot);
    this._manageBuildOrder(snapshot);
    this._manageProduction(snapshot);
    this._manageResearch(snapshot);
    this._evaluateMilitary(snapshot);
    this._manageAttackDefend(snapshot);
    this._manageExpansion(snapshot);
    this._manageScouting(snapshot);

    // 更新状态机
    this._updateState(snapshot);

    // 微操更新
    this._updateMicro(delta);
  }

  // ═══════════════════════════════════════════
  // 经济管理
  // ═══════════════════════════════════════════

  _manageEconomy(snapshot) {
    const { minerals, gas, workers, supplyUsed, supplyTotal } = snapshot;

    // 难度加成资源
    if (this.config.resourceBonus > 0) {
      const bonus = this.config.resourceBonus;
      eventBus.emit('resource:ai_bonus', {
        playerId: this.playerId,
        minerals: Math.floor(bonus * 5),
        gas: Math.floor(bonus * 2),
      });
    }

    // 保持补给站/水晶塔/领主
    if (supplyUsed >= supplyTotal - 3 && minerals >= 100) {
      this._buildSupply(snapshot);
    }

    // 维持工人数量（每基地5个矿工+3个气矿工理想值）
    const targetWorkers = Math.min(this.workerTarget, this.config.maxUnits);
    const needWorkers = workers < targetWorkers && minerals >= 50;

    if (needWorkers) {
      this._trainWorker(snapshot);
    }

    // 瓦斯开采优先级
    if (workers > 8 && gas < 50) {
      this._ensureGasMining(snapshot);
    }
  }

  _buildSupply(snapshot) {
    const supplyBuildings = {
      [RACE.TERRAN]: 'supply_depot',
      [RACE.ZERG]: 'overlord',
      [RACE.PROTOSS]: 'pylon',
    };
    const building = supplyBuildings[this.race];
    if (!building) return;

    // 虫族特殊：造overlord而非建筑
    if (this.race === RACE.ZERG) {
      this._issueTrainCommand('overlord');
    } else {
      this._issueBuildCommand(building);
    }
  }

  _trainWorker(snapshot) {
    const workers = {
      [RACE.TERRAN]: 'scv',
      [RACE.ZERG]: 'drone',
      [RACE.PROTOSS]: 'probe',
    };
    this._issueTrainCommand(workers[this.race]);
  }

  _ensureGasMining(snapshot) {
    // 确保每个精炼厂/萃取场/气矿有3个工人
    eventBus.emit('ai:ensure_gas', { playerId: this.playerId });
  }

  // ═══════════════════════════════════════════
  // 建造决策
  // ═══════════════════════════════════════════

  _manageBuildOrder(snapshot) {
    const step = this.buildOrderManager.getNextStep(snapshot);
    if (!step) return;

    switch (step.action) {
      case ACTION_TYPE.BUILD_BUILDING:
        this._issueBuildCommand(step.building, step.location);
        break;
      case ACTION_TYPE.TRAIN_UNIT:
        for (let i = 0; i < (step.count || 1); i++) {
          this._issueTrainCommand(step.unit);
        }
        break;
      case ACTION_TYPE.UPGRADE:
        this._issueResearchCommand(step.tech);
        break;
      case ACTION_TYPE.EXPAND:
        this._issueExpandCommand();
        break;
      case ACTION_TYPE.ATTACK:
        this._prepareAttack(step.unitCount || 20);
        break;
    }
  }

  // ═══════════════════════════════════════════
  // 出兵决策
  // ═══════════════════════════════════════════

  _manageProduction(snapshot) {
    const { minerals, gas, supplyUsed, supplyTotal, buildings } = snapshot;

    // 补充兵力
    if (supplyUsed < supplyTotal - 2) {
      // 根据已有建筑和资源决定出什么兵
      const units = this._getProductionUnits(snapshot);
      for (const unit of units) {
        if (this._canAfford(unit.cost, snapshot) && supplyUsed < supplyTotal - unit.cost.supply) {
          this._issueTrainCommand(unit.id);
          break; // 每次决策周期只出一个
        }
      }
    }
  }

  _getProductionUnits(snapshot) {
    // 根据种族和科技阶段返回推荐出兵列表
    const unitPriority = {
      [RACE.TERRAN]: () => {
        const units = [];
        if (snapshot.buildingsDone?.barracks) {
          units.push({ id: 'marine', cost: { minerals: 50, gas: 0, supply: 1 } });
          if (snapshot.buildingsDone?.academy) {
            units.push({ id: 'medic', cost: { minerals: 50, gas: 25, supply: 2 } });
          }
        }
        if (snapshot.buildingsDone?.factory) {
          units.push({ id: 'siege_tank', cost: { minerals: 150, gas: 100, supply: 2 } });
          units.push({ id: 'goliath', cost: { minerals: 100, gas: 50, supply: 2 } });
        }
        if (snapshot.buildingsDone?.starport) {
          units.push({ id: 'wraith', cost: { minerals: 150, gas: 100, supply: 2 } });
        }
        if (snapshot.buildingsDone?.science_facility) {
          units.push({ id: 'science_vessel', cost: { minerals: 100, gas: 225, supply: 2 } });
        }
        return units;
      },
      [RACE.ZERG]: () => {
        const units = [];
        if (snapshot.buildingsDone?.spawning_pool) {
          units.push({ id: 'zergling', cost: { minerals: 50, gas: 0, supply: 1 } });
        }
        if (snapshot.buildingsDone?.hydralisk_den) {
          units.push({ id: 'hydralisk', cost: { minerals: 75, gas: 25, supply: 2 } });
        }
        if (snapshot.buildingsDone?.spire) {
          units.push({ id: 'mutalisk', cost: { minerals: 100, gas: 100, supply: 2 } });
        }
        if (snapshot.buildingsDone?.ultralisk_cavern) {
          units.push({ id: 'ultralisk', cost: { minerals: 200, gas: 200, supply: 4 } });
        }
        if (snapshot.buildingsDone?.defiler_mound) {
          units.push({ id: 'defiler', cost: { minerals: 50, gas: 150, supply: 2 } });
        }
        return units;
      },
      [RACE.PROTOSS]: () => {
        const units = [];
        if (snapshot.buildingsDone?.gateway) {
          units.push({ id: 'zealot', cost: { minerals: 100, gas: 0, supply: 2 } });
        }
        if (snapshot.buildingsDone?.cybernetics_core) {
          units.push({ id: 'dragoon', cost: { minerals: 125, gas: 50, supply: 2 } });
        }
        if (snapshot.buildingsDone?.templar_archives) {
          units.push({ id: 'high_templar', cost: { minerals: 50, gas: 150, supply: 2 } });
        }
        if (snapshot.buildingsDone?.stargate) {
          units.push({ id: 'corsair', cost: { minerals: 100, gas: 100, supply: 2 } });
        }
        if (snapshot.buildingsDone?.fleet_beacon) {
          units.push({ id: 'carrier', cost: { minerals: 350, gas: 250, supply: 6 } });
        }
        if (snapshot.buildingsDone?.robotics_facility) {
          units.push({ id: 'reaver', cost: { minerals: 200, gas: 100, supply: 4 } });
        }
        return units;
      },
    };

    return (unitPriority[this.race] || (() => []))();
  }

  // ═══════════════════════════════════════════
  // 科技研发决策
  // ═══════════════════════════════════════════

  _manageResearch(snapshot) {
    const techPriority = this._getTechPriority(snapshot);
    for (const tech of techPriority) {
      if (!snapshot.techDone?.[tech.id] && this._canAfford(tech.cost, snapshot)) {
        // 检查前置建筑
        if (tech.prerequisite && !snapshot.buildingsDone?.[tech.prerequisite]) continue;
        this._issueResearchCommand(tech.id);
        break;
      }
    }
  }

  _getTechPriority(snapshot) {
    const priorities = {
      [RACE.TERRAN]: [
        { id: 'stimpack', cost: { minerals: 100, gas: 100 }, prerequisite: 'academy' },
        { id: 'infantry_weapons_1', cost: { minerals: 100, gas: 100 }, prerequisite: 'engineering_bay' },
        { id: 'infantry_armor_1', cost: { minerals: 100, gas: 100 }, prerequisite: 'engineering_bay' },
        { id: 'siege_tech', cost: { minerals: 150, gas: 150 }, prerequisite: 'factory' },
        { id: 'vehicle_weapons_1', cost: { minerals: 100, gas: 100 }, prerequisite: 'armory' },
        { id: 'infantry_weapons_2', cost: { minerals: 150, gas: 150 }, prerequisite: 'engineering_bay' },
        { id: 'infantry_armor_2', cost: { minerals: 150, gas: 150 }, prerequisite: 'engineering_bay' },
        { id: 'cloaking_field', cost: { minerals: 100, gas: 100 }, prerequisite: 'science_facility' },
      ],
      [RACE.ZERG]: [
        { id: 'metabolic_boost', cost: { minerals: 100, gas: 100 }, prerequisite: 'spawning_pool' },
        { id: 'melee_attacks_1', cost: { minerals: 100, gas: 100 }, prerequisite: 'evolution_chamber' },
        { id: 'carapace_1', cost: { minerals: 100, gas: 100 }, prerequisite: 'evolution_chamber' },
        { id: 'muscular_augments', cost: { minerals: 150, gas: 150 }, prerequisite: 'hydralisk_den' },
        { id: 'missile_attacks_1', cost: { minerals: 100, gas: 100 }, prerequisite: 'evolution_chamber' },
        { id: 'lurker_aspect', cost: { minerals: 150, gas: 150 }, prerequisite: 'hydralisk_den' },
        { id: 'flyer_attacks_1', cost: { minerals: 100, gas: 100 }, prerequisite: 'spire' },
      ],
      [RACE.PROTOSS]: [
        { id: 'leg_enhancements', cost: { minerals: 200, gas: 200 }, prerequisite: 'citadel_of_adun' },
        { id: 'singularity_charge', cost: { minerals: 150, gas: 150 }, prerequisite: 'cybernetics_core' },
        { id: 'ground_weapons_1', cost: { minerals: 100, gas: 100 }, prerequisite: 'forge' },
        { id: 'ground_armor_1', cost: { minerals: 100, gas: 100 }, prerequisite: 'forge' },
        { id: 'psionic_storm', cost: { minerals: 200, gas: 200 }, prerequisite: 'templar_archives' },
        { id: 'air_weapons_1', cost: { minerals: 100, gas: 100 }, prerequisite: 'cybernetics_core' },
        { id: 'carrier_capacity', cost: { minerals: 100, gas: 100 }, prerequisite: 'fleet_beacon' },
      ],
    };
    return priorities[this.race] || [];
  }

  // ═══════════════════════════════════════════
  // 攻防决策
  // ═══════════════════════════════════════════

  _evaluateMilitary(snapshot) {
    // 评估己方兵力
    this.armyScore = this._calculateArmyScore(snapshot.myUnits || []);
    // 评估敌方兵力（基于侦察信息）
    this.enemyArmyScore = this._calculateArmyScore(snapshot.enemyUnits || []);
  }

  _calculateArmyScore(units) {
    return units.reduce((score, unit) => {
      const hpFactor = (unit.hp || 0) + (unit.shield || 0);
      const attackFactor = unit.attack ? (unit.attack.damage || 0) * 2 : 0;
      return score + hpFactor + attackFactor;
    }, 0);
  }

  _manageAttackDefend(snapshot) {
    const { minerals, gas, supplyUsed } = snapshot;

    // 决定状态
    const shouldAttack = this._shouldAttack(snapshot);
    const shouldDefend = this._shouldDefend(snapshot);

    if (shouldDefend) {
      this.state = AI_STATE.DEFEND;
      this._executeDefense(snapshot);
    } else if (shouldAttack) {
      this.state = AI_STATE.ATTACK;
      this._executeAttack(snapshot);
    } else {
      // 保持当前状态或回到建造
      if (this.state === AI_STATE.ATTACK || this.state === AI_STATE.DEFEND) {
        this.state = this.expansionCount > 0 ? AI_STATE.MID_BUILD : AI_STATE.EARLY_BUILD;
      }
    }
  }

  _shouldAttack(snapshot) {
    // 不在攻击冷却中
    if (this.attackTimer > 0) return false;

    // 兵力评估
    const armyRatio = this.enemyArmyScore > 0
      ? this.armyScore / this.enemyArmyScore
      : this.armyScore > 500 ? 1.5 : 0;

    // 满足攻击条件
    const hasMinimumArmy = snapshot.armyCount >= 10;
    const isStronger = armyRatio >= this.config.attackThreshold;
    const enoughTime = snapshot.gameTime > 120; // 至少游戏2分钟后

    return hasMinimumArmy && isStronger && enoughTime;
  }

  _shouldDefend(snapshot) {
    // 检测敌方在我基地附近的单位
    if (snapshot.threatsNearBase && snapshot.threatsNearBase.length > 0) {
      return true;
    }

    // 如果正在被攻击
    return snapshot.underAttack === true;
  }

  _executeAttack(snapshot) {
    if (this.attackGroup.length === 0) {
      // 编组攻击部队
      this.attackGroup = this._selectAttackForce(snapshot);
      this.rallyPoint = this._selectAttackTarget(snapshot);
    }

    if (this.attackGroup.length > 0 && this.rallyPoint) {
      // 发送攻击命令
      for (const unit of this.attackGroup) {
        eventBus.emit('ai:command', {
          playerId: this.playerId,
          unitId: unit.id,
          command: COMMAND.ATTACK,
          target: this.rallyPoint,
        });
      }
      this.attackTimer = 30; // 30秒攻击冷却
    }
  }

  _selectAttackForce(snapshot) {
    // 选择最强的地面和空中单位组成攻击部队
    const units = snapshot.myUnits || [];
    const attackers = units
      .filter(u => u.attack && !u.isWorker && !u.isBuilding)
      .sort((a, b) => {
        const scoreA = (a.attack?.damage || 0) + (a.hp || 0) * 0.5;
        const scoreB = (b.attack?.damage || 0) + (b.hp || 0) * 0.5;
        return scoreB - scoreA;
      })
      .slice(0, Math.min(20, units.length));
    return attackers;
  }

  _selectAttackTarget(snapshot) {
    // 选择最弱的敌方基地作为攻击目标
    const enemyBases = snapshot.enemyBases || [];
    if (enemyBases.length === 0) return snapshot.enemyMainBase || null;

    // 按防御强度排序，选最弱的
    return enemyBases
      .sort((a, b) => (a.defenseScore || 0) - (b.defenseScore || 0))[0] || null;
  }

  _executeDefense(snapshot) {
    const threats = snapshot.threatsNearBase || [];
    if (threats.length === 0) return;

    // 集结防御部队到基地附近
    const myUnits = snapshot.myUnits || [];
    const defenders = myUnits.filter(u => u.attack && !u.isWorker);

    for (const unit of defenders) {
      eventBus.emit('ai:command', {
        playerId: this.playerId,
        unitId: unit.id,
        command: COMMAND.ATTACK,
        target: threats[0], // 攻击最近威胁
      });
    }
  }

  // ═══════════════════════════════════════════
  // 扩张决策
  // ═══════════════════════════════════════════

  _manageExpansion(snapshot) {
    if (this.expansionCount >= 3) return; // 最多4个基地
    if (snapshot.gameTime - this.lastExpansionTime < 60) return; // 60秒冷却

    const shouldExpand = snapshot.minerals > 500 &&
      snapshot.workers >= this.workerTarget * (this.expansionCount + 1) * 0.8 &&
      snapshot.armyCount >= 15;

    if (shouldExpand) {
      this._issueExpandCommand();
      this.expansionCount++;
      this.lastExpansionTime = snapshot.gameTime;
      this.state = AI_STATE.EXPAND;
    }
  }

  // ═══════════════════════════════════════════
  // 侦察决策
  // ═══════════════════════════════════════════

  _manageScouting(snapshot) {
    this.scoutTimer += this.config.decisionInterval;

    if (this.scoutTimer >= 30) { // 每30秒侦察一次
      this.scoutTimer = 0;
      this._sendScout(snapshot);
    }
  }

  _sendScout(snapshot) {
    const workers = snapshot.myUnits?.filter(u => u.isWorker) || [];
    if (workers.length > 0) {
      const scout = workers[randomInt(0, workers.length - 1)];
      // 随机选择敌方基地位置
      const target = snapshot.enemyMainBase || { x: randomFloat(0, 128), z: randomFloat(0, 128) };
      eventBus.emit('ai:command', {
        playerId: this.playerId,
        unitId: scout.id,
        command: COMMAND.MOVE,
        target,
      });
    }
  }

  // ═══════════════════════════════════════════
  // 微操系统
  // ═══════════════════════════════════════════

  _updateMicro(delta) {
    this.microTimer += delta;
    if (this.microTimer < this.config.microDelay) return;
    this.microTimer = 0;

    const snapshot = this.gameState;
    if (!snapshot) return;

    const myUnits = snapshot.myUnits || [];
    const enemyUnits = snapshot.enemyUnits || [];

    // 低血单位后撤
    for (const unit of myUnits) {
      if (unit.hp < unit.maxHp * 0.2 && unit.isCombatUnit) {
        // 后撤到最近的友方建筑
        const safePoint = this._findSafePoint(unit, snapshot);
        if (safePoint) {
          eventBus.emit('ai:command', {
            playerId: this.playerId,
            unitId: unit.id,
            command: COMMAND.MOVE,
            target: safePoint,
          });
        }
      }
    }

    // 集火目标（选择最弱/最高价值目标）
    for (const unit of myUnits) {
      if (unit.attack && unit.target) {
        const nearbyEnemies = enemyUnits.filter(e =>
          distance2D(unit.position, e.position) <= unit.attack.range * 2
        );
        if (nearbyEnemies.length > 1) {
          // 集火血量最低的
          const weakest = nearbyEnemies.reduce((min, e) =>
            effectiveHP(e) < effectiveHP(min) ? e : min
          );
          eventBus.emit('ai:command', {
            playerId: this.playerId,
            unitId: unit.id,
            command: COMMAND.ATTACK,
            target: weakest,
          });
        }
      }
    }

    // 使用技能（如兴奋剂、灵能风暴等）
    this._useAbilities(myUnits, snapshot);
  }

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

  _useAbilities(myUnits, snapshot) {
    for (const unit of myUnits) {
      if (!unit.abilities || unit.abilities.length === 0) continue;

      // 兴奋剂（血量>50%时使用）
      if (unit.abilities.includes('stimpack') && unit.hp > unit.maxHp * 0.5) {
        const enemyNearby = (snapshot.enemyUnits || []).some(e =>
          distance2D(unit.position, e.position) <= 6
        );
        if (enemyNearby) {
          eventBus.emit('ai:cast_ability', {
            playerId: this.playerId,
            unitId: unit.id,
            ability: 'stimpack',
          });
        }
      }

      // 灵能风暴
      if (unit.abilities.includes('psionic_storm') && unit.energy >= 75) {
        const enemyCluster = this._findEnemyCluster(unit.position, snapshot.enemyUnits || []);
        if (enemyCluster && enemyCluster.count >= 3) {
          eventBus.emit('ai:cast_ability', {
            playerId: this.playerId,
            unitId: unit.id,
            ability: 'psionic_storm',
            target: enemyCluster.center,
          });
        }
      }
    }
  }

  _findEnemyCluster(pos, enemies) {
    let bestCluster = null;
    let bestCount = 0;

    for (const enemy of enemies) {
      const nearby = enemies.filter(e =>
        distance2D(enemy.position, e.position) <= 3
      );
      if (nearby.length > bestCount) {
        bestCount = nearby.length;
        bestCluster = {
          center: enemy.position,
          count: nearby.length,
        };
      }
    }
    return bestCount >= 3 ? bestCluster : null;
  }

  // ═══════════════════════════════════════════
  // 状态机管理
  // ═══════════════════════════════════════════

  _updateState(snapshot) {
    this.stateTimer += this.config.decisionInterval;
    this.attackTimer = Math.max(0, this.attackTimer - this.config.decisionInterval);

    switch (this.state) {
      case AI_STATE.EARLY_BUILD:
        if (snapshot.buildingCount >= 4) this.state = AI_STATE.MID_BUILD;
        break;
      case AI_STATE.MID_BUILD:
        if (snapshot.buildingCount >= 8 || snapshot.gameTime > 300) this.state = AI_STATE.LATE_BUILD;
        break;
      case AI_STATE.EXPAND:
        if (this.stateTimer > 10) this.state = AI_STATE.MID_BUILD;
        break;
      case AI_STATE.ATTACK:
        if (this.attackGroup.length === 0) this.state = AI_STATE.MID_BUILD;
        break;
    }
  }

  // ═══════════════════════════════════════════
  // 辅助方法
  // ═══════════════════════════════════════════

  _getGameSnapshot() {
    if (!this.gameState) return {};
    // 返回游戏状态快照
    return typeof this.gameState === 'function'
      ? this.gameState(this.playerId)
      : this.gameState;
  }

  _canAfford(cost, snapshot) {
    if (!cost) return false;
    return (snapshot.minerals || 0) >= (cost.minerals || 0) &&
           (snapshot.gas || 0) >= (cost.gas || 0) &&
           (snapshot.supplyUsed || 0) + (cost.supply || 0) <= (snapshot.supplyTotal || 200);
  }

  _issueBuildCommand(building, location) {
    eventBus.emit('ai:build', {
      playerId: this.playerId,
      building,
      location,
    });
  }

  _issueTrainCommand(unit) {
    eventBus.emit('ai:train', {
      playerId: this.playerId,
      unit,
    });
  }

  _issueResearchCommand(tech) {
    eventBus.emit('ai:research', {
      playerId: this.playerId,
      tech,
    });
  }

  _issueExpandCommand() {
    eventBus.emit('ai:expand', {
      playerId: this.playerId,
    });
  }

  _prepareAttack(targetCount) {
    this.state = AI_STATE.ATTACK;
    this.attackGroup = [];
  }

  /**
   * 获取AI信息摘要（调试用）
   */
  getInfo() {
    return {
      playerId: this.playerId,
      race: this.race,
      difficulty: this.difficulty,
      state: this.state,
      armyScore: this.armyScore,
      enemyArmyScore: this.enemyArmyScore,
      expansionCount: this.expansionCount,
      buildOrderProgress: this.buildOrderManager.currentIndex,
    };
  }
}

export default AIController;
