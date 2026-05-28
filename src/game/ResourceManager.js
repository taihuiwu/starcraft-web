// ═══════════════════════════════════════════
// StarCraft Web - 资源管理系统 (ResourceManager)
// 管理每个玩家的矿物、瓦斯、人口资源
// 处理水晶矿采集结算、花费扣除、人口限制
// ═══════════════════════════════════════════

import { GAME, RESOURCE, EVENTS } from '../shared/Constants.js';
import { eventBus } from '../shared/EventBus.js';

export default class ResourceManager {
  /**
   * @param {import('./GameManager.js').default} gameManager - 游戏管理器引用
   */
  constructor(gameManager) {
    /** @type {import('./GameManager.js').default} */
    this.gameManager = gameManager;

    /**
     * 每个队伍的资源数据
     * @type {Object<number, PlayerResources>}
     */
    this.players = {};

    /**
     * 水晶矿脉定义（地图上的资源点）
     * @type {Array<MineralPatch>}
     */
    this.mineralPatches = [];

    /**
     * 瓦斯气泉定义
     * @type {Array<GasGeyser>}
     */
    this.gasGeysers = [];
  }

  // ═══════════════════════════════════════
  // 初始化
  // ═══════════════════════════════════════

  /**
   * 初始化资源系统，为所有玩家创建资源数据
   */
  init() {
    // 为队伍1和2（人类玩家和AI）初始化资源
    for (let team = 1; team <= 8; team++) {
      this.players[team] = {
        minerals: GAME.STARTING_MINERALS,
        gas: GAME.STARTING_GAS,
        supply: 0,                 // 当前已用人口
        supplyMax: GAME.STARTING_SUPPLY, // 最大人口上限
      };
    }

    console.log('[ResourceManager] 资源系统初始化完成');
  }

  /**
   * 重置资源系统
   */
  reset() {
    this.players = {};
    this.mineralPatches = [];
    this.gasGeysers = [];
  }

  // ═══════════════════════════════════════
  // 资源查询
  // ═══════════════════════════════════════

  /**
   * 获取指定队伍的资源数据
   * @param {number} team - 队伍编号
   * @returns {PlayerResources}
   */
  getResources(team) {
    if (!this.players[team]) {
      this.players[team] = {
        minerals: 0, gas: 0, supply: 0, supplyMax: 10,
      };
    }
    return this.players[team];
  }

  /**
   * 判断指定队伍是否负担得起某项花费
   * @param {number} team - 队伍编号
   * @param {Object} cost - 花费对象 { minerals?: number, gas?: number, supply?: number }
   * @returns {boolean} 是否负担得起
   */
  canAfford(team, cost) {
    const res = this.getResources(team);
    const mineralsOk = !cost.minerals || res.minerals >= cost.minerals;
    const gasOk = !cost.gas || res.gas >= cost.gas;
    const supplyOk = !cost.supply || (res.supply + cost.supply) <= res.supplyMax;
    return mineralsOk && gasOk && supplyOk;
  }

  // ═══════════════════════════════════════
  // 资源操作
  // ═══════════════════════════════════════

  /**
   * 增加资源
   * @param {number} team - 队伍编号
   * @param {string} type - 资源类型 ('minerals' | 'gas')
   * @param {number} amount - 增加数量
   */
  addResource(team, type, amount) {
    const res = this.getResources(team);
    if (type === RESOURCE.MINERALS) {
      res.minerals += amount;
    } else if (type === RESOURCE.GAS) {
      res.gas += amount;
    }

    // 通知UI更新
    eventBus.emit(EVENTS.RESOURCE_CHANGED, {
      team,
      type,
      amount,
      resources: { ...res },
    });
  }

  /**
   * 花费资源（检查并扣除）
   * @param {number} team - 队伍编号
   * @param {Object} cost - 花费 { minerals?: number, gas?: number, supply?: number }
   * @returns {boolean} 是否成功扣除
   */
  spend(team, cost) {
    if (!this.canAfford(team, cost)) {
      return false;
    }

    const res = this.getResources(team);
    if (cost.minerals) res.minerals -= cost.minerals;
    if (cost.gas) res.gas -= cost.gas;
    if (cost.supply) res.supply += cost.supply;

    // 通知资源变化
    eventBus.emit(EVENTS.RESOURCE_CHANGED, {
      team,
      type: 'spend',
      cost,
      resources: { ...res },
    });

    return true;
  }

  /**
   * 退还资源（建造取消等场景）
   * @param {number} team
   * @param {Object} cost - 退还的花费
   * @param {number} [refundRate=0.75] - 退还比例（SC1建筑取消退75%）
   */
  refund(team, cost, refundRate = 0.75) {
    const res = this.getResources(team);
    if (cost.minerals) res.minerals += Math.floor(cost.minerals * refundRate);
    if (cost.gas) res.gas += Math.floor(cost.gas * refundRate);
    // 人口不退还（已释放）

    eventBus.emit(EVENTS.RESOURCE_CHANGED, {
      team,
      type: 'refund',
      resources: { ...res },
    });
  }

  /**
   * 增加人口占用
   * @param {number} team
   * @param {number} amount - 占用人口数
   */
  addSupply(team, amount) {
    const res = this.getResources(team);
    res.supply += amount;

    eventBus.emit(EVENTS.SUPPLY_CHANGED, {
      team,
      supply: res.supply,
      supplyMax: res.supplyMax,
    });
  }

  /**
   * 释放人口（单位死亡）
   * @param {number} team
   * @param {number} amount - 释放人口数
   */
  releaseSupply(team, amount) {
    const res = this.getResources(team);
    res.supply = Math.max(0, res.supply - amount);

    eventBus.emit(EVENTS.SUPPLY_CHANGED, {
      team,
      supply: res.supply,
      supplyMax: res.supplyMax,
    });
  }

  /**
   * 增加人口上限（建造房子/水晶塔等）
   * @param {number} team
   * @param {number} amount
   */
  addSupplyMax(team, amount) {
    const res = this.getResources(team);
    res.supplyMax = Math.min(GAME.MAX_SUPPLY, res.supplyMax + amount);

    eventBus.emit(EVENTS.SUPPLY_CHANGED, {
      team,
      supply: res.supply,
      supplyMax: res.supplyMax,
    });
  }

  /**
   * 减少人口上限（建筑被摧毁）
   * @param {number} team
   * @param {number} amount
   */
  removeSupplyMax(team, amount) {
    const res = this.getResources(team);
    res.supplyMax = Math.max(0, res.supplyMax - amount);

    eventBus.emit(EVENTS.SUPPLY_CHANGED, {
      team,
      supply: res.supply,
      supplyMax: res.supplyMax,
    });
  }

  // ═══════════════════════════════════════
  // 水晶矿/瓦斯采集
  // ═══════════════════════════════════════

  /**
   * 注册水晶矿脉
   * @param {Object} patch - { position: {x,y,z}, amount: number, maxAmount: number }
   * @returns {MineralPatch}
   */
  registerMineralPatch(patch) {
    const mineralPatch = {
      id: this.mineralPatches.length,
      position: patch.position,
      amount: patch.amount || 1500,        // SC1每矿脉1500水晶
      maxAmount: patch.maxAmount || 1500,
      harvesters: new Map(),               // team -> 采集工人数量
      yieldPerTick: 7,                     // 每tick每工人产出7水晶
    };
    this.mineralPatches.push(mineralPatch);
    return mineralPatch;
  }

  /**
   * 注册瓦斯气泉
   * @param {Object} geyser - { position, amount }
   * @returns {GasGeyser}
   */
  registerGasGeyser(geyser) {
    const gasGeyser = {
      id: this.gasGeysers.length,
      position: geyser.position,
      amount: geyser.amount || 2500,       // SC1每气泉2500瓦斯
      maxAmount: geyser.maxAmount || 2500,
      harvesters: new Map(),
      yieldPerTick: 8,                     // 每tick每工人产出8瓦斯
      refinery: null,                      // 附属采集建筑ID
    };
    this.gasGeysers.push(gasGeyser);
    return gasGeyser;
  }

  /**
   * 分配工人到矿脉采集
   * @param {number} patchId - 矿脉ID
   * @param {number} team - 队伍
   * @param {number} count - 工人数
   */
  assignHarvester(patchId, team, count) {
    const patch = this.mineralPatches[patchId];
    if (!patch) return;
    const current = patch.harvesters.get(team) || 0;
    patch.harvesters.set(team, current + count);
  }

  /**
   * 移除矿脉的采集工人
   * @param {number} patchId
   * @param {number} team
   * @param {number} count
   */
  removeHarvester(patchId, team, count) {
    const patch = this.mineralPatches[patchId];
    if (!patch) return;
    const current = patch.harvesters.get(team) || 0;
    patch.harvesters.set(team, Math.max(0, current - count));
  }

  // ═══════════════════════════════════════
  // 每帧更新
  // ═══════════════════════════════════════

  /**
   * 资源系统每tick更新
   * 结算所有水晶矿脉的采集产出
   * @param {number} dt - tick间隔（秒）
   */
  update(dt) {
    const tickFactor = dt * GAME.TICK_RATE; // 归一化到每tick

    // ─── 水晶矿采集结算 ──────────────
    for (const patch of this.mineralPatches) {
      if (patch.amount <= 0) continue; // 矿已采空

      for (const [team, harvesterCount] of patch.harvesters) {
        if (harvesterCount <= 0) continue;

        // 每tick每工人产7水晶
        const yield_ = patch.yieldPerTick * harvesterCount * tickFactor;
        const actualYield = Math.min(yield_, patch.amount); // 不超过剩余量

        if (actualYield > 0) {
          patch.amount -= actualYield;
          this.addResource(team, RESOURCE.MINERALS, Math.floor(actualYield));
        }
      }
    }

    // ─── 瓦斯采集结算 ────────────────
    for (const geyser of this.gasGeysers) {
      if (geyser.amount <= 0) continue;

      for (const [team, harvesterCount] of geyser.harvesters) {
        if (harvesterCount <= 0) continue;

        const yield_ = geyser.yieldPerTick * harvesterCount * tickFactor;
        const actualYield = Math.min(yield_, geyser.amount);

        if (actualYield > 0) {
          geyser.amount -= actualYield;
          this.addResource(team, RESOURCE.GAS, Math.floor(actualYield));
        }
      }
    }

    // ─── 采集工人动画更新 ──────────────
    this._updateHarvesterAnimations(dt);
  }

  // ═══════════════════════════════════════
  // 采集工人视觉动画
  // ═══════════════════════════════════════

  /**
   * 采集工人动画状态
   * 每个工人在矿脉和基地之间来回移动
   * @type {Map<number, HarvesterAnim>}
   */
  _harvesterAnims = new Map();

  /**
   * 创建采集工人动画
   * @param {number} unitId - 工人单位ID
   * @param {{x: number, z: number}} mineralPos - 矿脉位置
   * @param {{x: number, z: number}} basePos - 基地位置
   */
  createHarvesterAnim(unitId, mineralPos, basePos) {
    this._harvesterAnims.set(unitId, {
      unitId,
      phase: 'walking_to_mineral', // walking_to_mineral | mining | walking_to_base | dropping
      targetPos: { ...mineralPos },
      startPos: { ...basePos },
      mineralPos: { ...mineralPos },
      basePos: { ...basePos },
      phaseTimer: 0,
      miningDuration: 1.5,   // 采矿动画持续时间（秒）
      droppingDuration: 0.8, // 卸货动画持续时间（秒）
      speed: 2.5,            // 移动速度
      progress: 0,           // 0~1 行走进度
    });
  }

  /**
   * 移除采集工人动画
   * @param {number} unitId
   */
  removeHarvesterAnim(unitId) {
    this._harvesterAnims.delete(unitId);
  }

  /**
   * 获取采集工人当前动画数据（用于渲染）
   * @param {number} unitId
   * @returns {{ position: {x,z}, phase: string, facing: number }|null}
   */
  getHarvesterAnimState(unitId) {
    const anim = this._harvesterAnims.get(unitId);
    if (!anim) return null;

    // 根据阶段计算当前位置
    let x, z;
    switch (anim.phase) {
      case 'walking_to_mineral':
      case 'walking_to_base': {
        const t = Math.min(1, anim.progress);
        x = anim.startPos.x + (anim.targetPos.x - anim.startPos.x) * t;
        z = anim.startPos.z + (anim.targetPos.z - anim.startPos.z) * t;
        break;
      }
      case 'mining':
        x = anim.mineralPos.x;
        z = anim.mineralPos.z;
        break;
      case 'dropping':
        x = anim.basePos.x;
        z = anim.basePos.z;
        break;
      default:
        x = anim.startPos.x;
        z = anim.startPos.z;
    }

    // 计算朝向
    const dx = anim.targetPos.x - anim.startPos.x;
    const dz = anim.targetPos.z - anim.startPos.z;
    const facing = Math.atan2(dz, dx);

    return {
      position: { x, z },
      phase: anim.phase,
      facing,
      progress: anim.progress,
    };
  }

  /**
   * 更新所有采集工人动画
   * @param {number} dt - 帧间隔（秒）
   * @private
   */
  _updateHarvesterAnimations(dt) {
    for (const [unitId, anim] of this._harvesterAnims) {
      switch (anim.phase) {
        case 'walking_to_mineral':
          anim.progress += (anim.speed / this._distance(anim.startPos, anim.targetPos)) * dt;
          if (anim.progress >= 1) {
            anim.progress = 0;
            anim.phase = 'mining';
            anim.phaseTimer = 0;
          }
          break;

        case 'mining':
          anim.phaseTimer += dt;
          // 原地采矿，轻微抖动（由渲染层处理）
          if (anim.phaseTimer >= anim.miningDuration) {
            // 切换到回程
            anim.phase = 'walking_to_base';
            anim.startPos = { ...anim.mineralPos };
            anim.targetPos = { ...anim.basePos };
            anim.progress = 0;
          }
          break;

        case 'walking_to_base':
          anim.progress += (anim.speed / this._distance(anim.startPos, anim.targetPos)) * dt;
          if (anim.progress >= 1) {
            anim.progress = 0;
            anim.phase = 'dropping';
            anim.phaseTimer = 0;
          }
          break;

        case 'dropping':
          anim.phaseTimer += dt;
          if (anim.phaseTimer >= anim.droppingDuration) {
            // 开始新一轮采集
            anim.phase = 'walking_to_mineral';
            anim.startPos = { ...anim.basePos };
            anim.targetPos = { ...anim.mineralPos };
            anim.progress = 0;
          }
          break;
      }
    }
  }

  /**
   * 计算两点距离
   * @private
   */
  _distance(a, b) {
    const dx = a.x - b.x;
    const dz = a.z - b.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    return Math.max(0.1, dist);
  }
}
