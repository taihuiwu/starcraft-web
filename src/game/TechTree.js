// ═══════════════════════════════════════════
// StarCraft Web - 科技树系统 (TechTree)
// 管理每个玩家的科技研发状态、前置条件检查、
// 研发进度推进、研发完成后的解锁效果
// ═══════════════════════════════════════════

import { EVENTS } from '../shared/Constants.js';
import { eventBus } from '../shared/EventBus.js';

export default class TechTree {
  /**
   * @param {import('./GameManager.js').default} gameManager
   */
  constructor(gameManager) {
    /** @type {import('./GameManager.js').default} */
    this.gameManager = gameManager;

    /**
     * 每个玩家的科技研发状态
     * 结构: { [team]: { [techId]: TechState } }
     *
     * TechState:
     *   - researched: boolean  是否已完成研发
     *   - researching: boolean 是否正在研发中
     *   - progress: number     研发进度 (0~1)
     *   - startTime: number    开始研发的时间
     *
     * @type {Object<number, Object<string, TechState>>}
     */
    this.playerTechs = {};

    /**
     * 科技定义表（由种族数据注入）
     * 结构: { [techId]: TechDefinition }
     *
     * TechDefinition:
     *   - id: string
     *   - name: string
     *   - race: string
     *   - cost: { minerals, gas }
     *   - buildTime: number (tick数)
     *   - prerequisites: string[] 前置科技/建筑ID
     *   - effects: Object 研发完成后的效果
     *
     * @type {Object<string, Object>}
     */
    this.techDefinitions = {};
  }

  /**
   * 初始化科技树系统
   */
  init() {
    // 为队伍1和2初始化空科技表
    this.playerTechs[1] = {};
    this.playerTechs[2] = {};
    console.log('[TechTree] 科技树系统初始化完成');
  }

  /**
   * 重置科技树
   */
  reset() {
    this.playerTechs = {};
  }

  // ═══════════════════════════════════════
  // 科技定义注册
  // ═══════════════════════════════════════

  /**
   * 注册科技定义
   * @param {Object} techDef - 科技定义对象
   */
  registerTech(techDef) {
    this.techDefinitions[techDef.id] = {
      id: techDef.id,
      name: techDef.name,
      race: techDef.race,
      cost: techDef.cost || { minerals: 0, gas: 0 },
      buildTime: techDef.buildTime || 100, // 默认100 tick
      prerequisites: techDef.prerequisites || [],
      effects: techDef.effects || {},
      icon: techDef.icon || null,
      description: techDef.description || '',
    };
  }

  /**
   * 批量注册多个科技定义
   * @param {Array} techDefs - 科技定义数组
   */
  registerTechs(techDefs) {
    for (const def of techDefs) {
      this.registerTech(def);
    }
  }

  // ═══════════════════════════════════════
  // 查询接口
  // ═══════════════════════════════════════

  /**
   * 检查某个科技是否已研发完成
   * @param {number} player - 队伍编号
   * @param {string} techId - 科技ID
   * @returns {boolean}
   */
  hasResearched(player, techId) {
    const techs = this.playerTechs[player];
    return techs && techs[techId] && techs[techId].researched;
  }

  /**
   * 检查某个科技是否正在研发中
   * @param {number} player
   * @param {string} techId
   * @returns {boolean}
   */
  isResearching(player, techId) {
    const techs = this.playerTechs[player];
    return techs && techs[techId] && techs[techId].researching;
  }

  /**
   * 获取科技研发进度
   * @param {number} player
   * @param {string} techId
   * @returns {number} 0~1
   */
  getProgress(player, techId) {
    const techs = this.playerTechs[player];
    if (!techs || !techs[techId]) return 0;
    return techs[techId].progress;
  }

  /**
   * 获取玩家所有已研发的科技列表
   * @param {number} player
   * @returns {Array<string>}
   */
  getResearchedTechs(player) {
    const techs = this.playerTechs[player];
    if (!techs) return [];
    return Object.keys(techs).filter(id => techs[id].researched);
  }

  /**
   * 获取玩家当前正在研发的科技
   * @param {number} player
   * @returns {Object|null} 正在研发的科技信息
   */
  getCurrentResearch(player) {
    const techs = this.playerTechs[player];
    if (!techs) return null;
    for (const [id, state] of Object.entries(techs)) {
      if (state.researching) {
        return { id, ...state, definition: this.techDefinitions[id] };
      }
    }
    return null;
  }

  // ═══════════════════════════════════════
  // 研发操作
  // ═══════════════════════════════════════

  /**
   * 开始研发科技
   * 检查前置条件和资源花费后开始计时
   *
   * @param {number} player - 队伍编号
   * @param {string} techId - 科技ID
   * @returns {boolean} 是否成功开始研发
   */
  startResearch(player, techId) {
    // ─── 检查科技定义是否存在 ────────
    const def = this.techDefinitions[techId];
    if (!def) {
      console.warn(`[TechTree] 未知科技: ${techId}`);
      return false;
    }

    // ─── 检查是否已研发或正在研发 ────
    if (this.hasResearched(player, techId)) {
      console.warn(`[TechTree] 科技已研发: ${techId}`);
      return false;
    }
    if (this.isResearching(player, techId)) {
      console.warn(`[TechTree] 科技正在研发中: ${techId}`);
      return false;
    }

    // ─── 检查前置条件 ────────────────
    if (!this.checkPrerequisites(player, techId)) {
      console.warn(`[TechTree] 前置条件不满足: ${techId}`);
      return false;
    }

    // ─── 检查资源花费 ────────────────
    const rm = this.gameManager.resourceManager;
    if (!rm.canAfford(player, def.cost)) {
      console.warn(`[TechTree] 资源不足: ${techId}`);
      return false;
    }

    // ─── 扣除资源 ────────────────────
    rm.spend(player, def.cost);

    // ─── 初始化研发状态 ──────────────
    if (!this.playerTechs[player]) {
      this.playerTechs[player] = {};
    }

    this.playerTechs[player][techId] = {
      researched: false,
      researching: true,
      progress: 0,
      startTime: Date.now(),
    };

    // ─── 发送事件 ────────────────────
    eventBus.emit(EVENTS.TECH_START, {
      player,
      techId,
      techName: def.name,
      buildTime: def.buildTime,
    });

    console.log(`[TechTree] 玩家${player} 开始研发: ${def.name} (${def.buildTime} ticks)`);
    return true;
  }

  /**
   * 取消研发（退还50%资源）
   * @param {number} player
   * @param {string} techId
   * @returns {boolean}
   */
  cancelResearch(player, techId) {
    if (!this.isResearching(player, techId)) return false;

    const def = this.techDefinitions[techId];
    if (def && def.cost) {
      this.gameManager.resourceManager.refund(player, def.cost, 0.5);
    }

    delete this.playerTechs[player][techId];
    console.log(`[TechTree] 玩家${player} 取消研发: ${techId}`);
    return true;
  }

  // ═══════════════════════════════════════
  // 前置条件检查
  // ═══════════════════════════════════════

  /**
   * 检查研发某个科技的前置条件是否满足
   * 前置条件可以是：
   *   - 已研发的科技ID
   *   - 已建造的建筑ID（前缀"building:"）
   *
   * @param {number} player - 队伍编号
   * @param {string} techId - 科技ID
   * @returns {boolean} 前置条件是否满足
   */
  checkPrerequisites(player, techId) {
    const def = this.techDefinitions[techId];
    if (!def) return false;
    if (!def.prerequisites || def.prerequisites.length === 0) return true;

    for (const prereq of def.prerequisites) {
      // 检查是否为建筑前置条件
      if (prereq.startsWith('building:')) {
        const buildingType = prereq.replace('building:', '');
        const hasBuilding = this.gameManager.buildings.some(
          b => b.team === player && b.type === buildingType && b.isComplete && b.alive
        );
        if (!hasBuilding) return false;
      }
      // 检查是否为科技前置条件
      else {
        if (!this.hasResearched(player, prereq)) return false;
      }
    }

    return true;
  }

  // ═══════════════════════════════════════
  // 每帧更新
  // ═══════════════════════════════════════

  /**
   * 科技树每tick更新
   * 推进所有正在研发中的科技进度
   * @param {number} dt - tick间隔（秒）
   */
  update(dt) {
    const tickRate = 24; // GAME.TICK_RATE
    const tickIncrement = dt * tickRate; // 转换为tick数

    for (const [player, techs] of Object.entries(this.playerTechs)) {
      for (const [techId, state] of Object.entries(techs)) {
        if (!state.researching) continue;

        const def = this.techDefinitions[techId];
        if (!def) continue;

        // 推进进度
        state.progress += tickIncrement / def.buildTime;

        // 检查是否完成
        if (state.progress >= 1) {
          state.progress = 1;
          this.completeResearch(parseInt(player), techId);
        }
      }
    }
  }

  // ═══════════════════════════════════════
  // 研发完成
  // ═══════════════════════════════════════

  /**
   * 完成科技研发，应用解锁效果
   * @param {number} player - 队伍编号
   * @param {string} techId - 科技ID
   */
  completeResearch(player, techId) {
    const def = this.techDefinitions[techId];
    const state = this.playerTechs[player]?.[techId];
    if (!def || !state) return;

    // 标记为已完成
    state.researched = true;
    state.researching = false;
    state.progress = 1;

    // ─── 应用研发效果 ────────────────
    this._applyEffects(player, def.effects);

    // ─── 发送完成事件 ────────────────
    eventBus.emit(EVENTS.TECH_COMPLETE, {
      player,
      techId,
      techName: def.name,
      effects: def.effects,
    });

    console.log(`[TechTree] 玩家${player} 研发完成: ${def.name}`);
  }

  /**
   * 应用科技效果
   * @param {number} player
   * @param {Object} effects - 效果定义
   */
  _applyEffects(player, effects) {
    if (!effects) return;

    const gm = this.gameManager;

    // ─── 解锁单位 ────────────────────
    if (effects.unlockUnits) {
      for (const unitType of effects.unlockUnits) {
        console.log(`[TechTree] 解锁单位: ${unitType}`);
        // 实际解锁逻辑由UnitProducer/UI层处理
      }
    }

    // ─── 解锁建筑 ────────────────────
    if (effects.unlockBuildings) {
      for (const buildingType of effects.unlockBuildings) {
        console.log(`[TechTree] 解锁建筑: ${buildingType}`);
      }
    }

    // ─── 解锁技能 ────────────────────
    if (effects.unlockAbilities) {
      for (const ability of effects.unlockAbilities) {
        console.log(`[TechTree] 解锁技能: ${ability}`);
        // 为所有该玩家单位添加技能
        for (const unit of gm.units) {
          if (unit.team === player && !unit.abilities.includes(ability)) {
            unit.abilities.push(ability);
          }
        }
      }
    }

    // ─── 属性加成 ────────────────────
    if (effects.unitBuff) {
      const { unitType, stat, bonus } = effects.unitBuff;
      for (const unit of gm.units) {
        if (unit.team === player && (!unitType || unit.type === unitType)) {
          if (stat === 'damage' && unit.attack) {
            unit.attack.damage += bonus;
          } else if (stat === 'hp') {
            unit.maxHp += bonus;
            unit.hp += bonus;
          } else if (stat === 'armor') {
            unit.armor += bonus;
          } else if (stat === 'speed') {
            unit.speed += bonus;
          } else if (stat === 'range' && unit.attack) {
            unit.attack.range += bonus;
          }
        }
      }
    }

    // ─── 攻击速度加成 ────────────────
    if (effects.attackSpeedBuff) {
      const { unitType, reduction } = effects.attackSpeedBuff;
      for (const unit of gm.units) {
        if (unit.team === player && unit.attack && (!unitType || unit.type === unitType)) {
          unit.attack.speed = Math.max(1, unit.attack.speed - reduction);
        }
      }
    }

    // ─── 建筑效果 ────────────────────
    if (effects.buildingBuff) {
      const { buildingType, stat, bonus } = effects.buildingBuff;
      for (const building of gm.buildings) {
        if (building.team === player && (!buildingType || building.type === buildingType)) {
          if (stat === 'hp') {
            building.maxHp += bonus;
            building.hp += bonus;
          }
        }
      }
    }
  }
}
