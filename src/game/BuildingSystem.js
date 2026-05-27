// ═══════════════════════════════════════════
// StarCraft Web - 建筑系统 (BuildingSystem)
// 管理建筑建造流程：放置、建造进度、完成
// 包含位置合法性检查和虫族creep特殊逻辑
// ═══════════════════════════════════════════

import { RACE, EVENTS, GAME } from '../shared/Constants.js';
import { eventBus } from '../shared/EventBus.js';

export default class BuildingSystem {
  /**
   * @param {import('./GameManager.js').default} gameManager
   */
  constructor(gameManager) {
    /** @type {import('./GameManager.js').default} */
    this.gameManager = gameManager;

    /**
     * 建筑定义表（由种族数据注入）
     * @type {Object<string, BuildingDefinition>}
     */
    this.buildingDefinitions = {};

    /**
     * Creep蔓延数据（虫族专用）
     * 记录每个creep菌毯覆盖的格子
     * @type {Set<string>} 格子坐标 "x,z"
     */
    this.creepMap = new Set();

    /**
     * 地形通行性网格（0=不可通行, 1=可通行）
     * @type {Array<Array<number>>}
     */
    this.terrainGrid = null;

    /**
     * 建筑占用网格（记录哪些格子被建筑占据）
     * @type {Set<string>} 格子坐标 "gx,gz"
     */
    this.occupiedTiles = new Set();
  }

  /**
   * 初始化建筑系统
   */
  init() {
    // 初始化128×128地形网格（全部可通行）
    this.terrainGrid = Array.from({ length: GAME.MAP_SIZE }, () =>
      new Array(GAME.MAP_SIZE).fill(1)
    );
    console.log('[BuildingSystem] 建筑系统初始化完成');
  }

  /**
   * 重置建筑系统
   */
  reset() {
    this.occupiedTiles.clear();
    this.creepMap.clear();
    this.init();
  }

  // ═══════════════════════════════════════
  // 建筑定义注册
  // ═══════════════════════════════════════

  /**
   * 注册建筑定义
   * @param {Object} buildingDef - 建筑定义对象
   */
  registerBuilding(buildingDef) {
    this.buildingDefinitions[buildingDef.id] = {
      id: buildingDef.id,
      name: buildingDef.name,
      race: buildingDef.race,
      hp: buildingDef.hp || 100,
      armor: buildingDef.armor || 0,
      shield: buildingDef.shield || 0,
      size: buildingDef.size || { w: 2, h: 2 },  // 占地格数 {w, h}
      cost: buildingDef.cost || { minerals: 100, gas: 0 },
      buildTime: buildingDef.buildTime || 100,     // 建造tick数
      requiresCreep: buildingDef.requiresCreep || false, // 虫族建筑需要creep
      prerequisites: buildingDef.prerequisites || [],   // 前置建筑
      producesUnits: buildingDef.producesUnits || [],
      providesSupply: buildingDef.providesSupply || 0,
      canResearch: buildingDef.canResearch || [],
      isRefinery: buildingDef.isRefinery || false,      // 是否为采集建筑
      canLift: buildingDef.canLift || false,            // 人族建筑可否起飞
    };
  }

  /**
   * 批量注册建筑定义
   * @param {Array} defs
   */
  registerBuildings(defs) {
    for (const def of defs) {
      this.registerBuilding(def);
    }
  }

  // ═══════════════════════════════════════
  // 建造入口
  // ═══════════════════════════════════════

  /**
   * 开始建造建筑
   * @param {number} player - 队伍编号
   * @param {string} buildingType - 建筑类型ID
   * @param {Object} position - 建筑位置 {x, y, z}
   * @returns {Object|null} 创建的建筑实例，或null表示失败
   */
  startBuild(player, buildingType, position) {
    const def = this.buildingDefinitions[buildingType];
    if (!def) {
      console.warn(`[BuildingSystem] 未知建筑类型: ${buildingType}`);
      return null;
    }

    // ─── 检查前置条件 ────────────────
    if (!this._checkPrerequisites(player, def)) {
      console.warn(`[BuildingSystem] 前置条件不满足: ${buildingType}`);
      return null;
    }

    // ─── 检查位置合法性 ──────────────
    if (!this.isPositionValid(position, def.size, player)) {
      console.warn(`[BuildingSystem] 位置不合法: ${buildingType} at (${position.x},${position.z})`);
      return null;
    }

    // ─── 检查资源花费 ────────────────
    const rm = this.gameManager.resourceManager;
    if (!rm.canAfford(player, def.cost)) {
      console.warn(`[BuildingSystem] 资源不足: ${buildingType}`);
      return null;
    }

    // ─── 虫族creep检查 ──────────────
    if (def.requiresCreep && !this._hasCreep(position, def.size)) {
      console.warn(`[BuildingSystem] 虫族建筑需要creep: ${buildingType}`);
      return null;
    }

    // ─── 扣除资源 ────────────────────
    rm.spend(player, def.cost);

    // ─── 创建建筑实例 ────────────────
    const building = this.gameManager.spawnBuilding(def, position, player);

    // ─── 占据地形格子 ────────────────
    this._occupyTiles(position, def.size);

    // ─── 虫族：生成creep ─────────────
    if (building.race === RACE.ZERG) {
      this._spreadCreep(position, def.size);
    }

    return building;
  }

  // ═══════════════════════════════════════
  // 每帧更新
  // ═══════════════════════════════════════

  /**
   * 建筑系统每tick更新
   * 推进所有正在建造中的建筑进度
   * @param {number} dt - tick间隔（秒）
   */
  update(dt) {
    const tickRate = 24; // GAME.TICK_RATE
    const tickIncrement = dt * tickRate;

    for (const building of this.gameManager.buildings) {
      if (!building.alive || building.isComplete) continue;

      // 推进建造进度
      const def = this.buildingDefinitions[building.type];
      if (!def) continue;

      building.buildProgress += tickIncrement / def.buildTime;

      // 检查是否建造完成
      if (building.buildProgress >= 1) {
        building.buildProgress = 1;
        this.completeBuild(building);
      }
    }
  }

  // ═══════════════════════════════════════
  // 建造完成
  // ═══════════════════════════════════════

  /**
   * 建造完成处理
   * @param {Object} building - 建筑实例
   */
  completeBuild(building) {
    building.isComplete = true;
    building.isBuilding = false;
    building.hp = building.maxHp;

    // ─── 提供人口 ────────────────────
    if (building.providesSupply > 0) {
      this.gameManager.resourceManager.addSupplyMax(
        building.team, building.providesSupply
      );
    }

    // ─── 发送完成事件 ────────────────
    eventBus.emit(EVENTS.BUILD_COMPLETE, { building });

    console.log(`[BuildingSystem] 建造完成: ${building.name} (队伍${building.team})`);
  }

  /**
   * 取消建造（退还75%资源）
   * @param {Object} building
   * @returns {boolean}
   */
  cancelBuild(building) {
    if (building.isComplete) return false;

    const def = this.buildingDefinitions[building.type];
    if (def && def.cost) {
      this.gameManager.resourceManager.refund(building.team, def.cost, 0.75);
    }

    // 释放占据的格子
    this._freeTiles(building.position, def?.size || { w: 2, h: 2 });

    building.alive = false;

    eventBus.emit(EVENTS.BUILD_CANCELLED, { building });
    return true;
  }

  /**
   * 建筑被摧毁
   * @param {Object} building
   */
  destroyBuilding(building) {
    building.alive = false;

    // 释放人口
    if (building.providesSupply > 0) {
      this.gameManager.resourceManager.removeSupplyMax(
        building.team, building.providesSupply
      );
    }

    // 释放占据的格子
    const def = this.buildingDefinitions[building.type];
    this._freeTiles(building.position, def?.size || { w: 2, h: 2 });

    // 产生爆炸特效
    this.gameManager.spawnExplosion(building.position, 30, 0xff4400);
  }

  // ═══════════════════════════════════════
  // 位置合法性检查
  // ═══════════════════════════════════════

  /**
   * 检查建筑放置位置是否合法
   * @param {Object} position - 建筑中心位置 {x, y, z}
   * @param {Object} size - 建筑占地 {w, h}（格数）
   * @param {number} player - 队伍编号
   * @returns {boolean} 位置是否合法
   */
  isPositionValid(position, size, player) {
    // ─── 地图边界检查 ────────────────
    const halfW = (size.w / 2) * GAME.TILE_SIZE;
    const halfH = (size.h / 2) * GAME.TILE_SIZE;

    if (position.x - halfW < 0 || position.x + halfW > GAME.MAP_SIZE) {
      return false;
    }
    if (position.z - halfH < 0 || position.z + halfH > GAME.MAP_SIZE) {
      return false;
    }

    // ─── 地形通行性检查 ──────────────
    const startGx = Math.floor((position.x - halfW) / GAME.TILE_SIZE);
    const startGz = Math.floor((position.z - halfH) / GAME.TILE_SIZE);
    const endGx = Math.ceil((position.x + halfW) / GAME.TILE_SIZE);
    const endGz = Math.ceil((position.z + halfH) / GAME.TILE_SIZE);

    for (let gx = startGx; gx < endGx; gx++) {
      for (let gz = startGz; gz < endGz; gz++) {
        if (gx < 0 || gx >= GAME.MAP_SIZE || gz < 0 || gz >= GAME.MAP_SIZE) {
          return false;
        }
        if (this.terrainGrid[gx][gz] === 0) {
          return false; // 不可通行地形
        }
      }
    }

    // ─── 建筑碰撞检查（不能重叠） ────
    for (const building of this.gameManager.buildings) {
      if (!building.alive) continue;

      const otherDef = this.buildingDefinitions[building.type];
      if (!otherDef) continue;

      if (this._checkTileOverlap(
        position, size,
        building.position, otherDef.size
      )) {
        return false;
      }
    }

    return true;
  }

  /**
   * 检查两个矩形区域是否重叠
   * @param {Object} posA - 区域A中心
   * @param {Object} sizeA - 区域A尺寸
   * @param {Object} posB - 区域B中心
   * @param {Object} sizeB - 区域B尺寸
   * @returns {boolean}
   */
  _checkTileOverlap(posA, sizeA, posB, sizeB) {
    const aLeft = posA.x - sizeA.w / 2;
    const aRight = posA.x + sizeA.w / 2;
    const aTop = posA.z - sizeA.h / 2;
    const aBottom = posA.z + sizeA.h / 2;

    const bLeft = posB.x - sizeB.w / 2;
    const bRight = posB.x + sizeB.w / 2;
    const bTop = posB.z - sizeB.h / 2;
    const bBottom = posB.z + sizeB.h / 2;

    return aLeft < bRight && aRight > bLeft && aTop < bBottom && aBottom > bTop;
  }

  // ═══════════════════════════════════════
  // 前置条件
  // ═══════════════════════════════════════

  /**
   * 检查建造前置条件
   * @param {number} player
   * @param {Object} def - 建筑定义
   * @returns {boolean}
   */
  _checkPrerequisites(player, def) {
    if (!def.prerequisites || def.prerequisites.length === 0) return true;

    for (const prereq of def.prerequisites) {
      // 检查是否需要已研发的科技
      if (prereq.startsWith('tech:')) {
        const techId = prereq.replace('tech:', '');
        if (!this.gameManager.techTree.hasResearched(player, techId)) {
          return false;
        }
      }
      // 检查是否需要已建造的建筑
      else {
        const hasBuilding = this.gameManager.buildings.some(
          b => b.team === player && b.type === prereq && b.isComplete && b.alive
        );
        if (!hasBuilding) return false;
      }
    }

    return true;
  }

  // ═══════════════════════════════════════
  // 地形格子管理
  // ═══════════════════════════════════════

  /**
   * 标记建筑占据的格子
   * @param {Object} position - 建筑中心位置
   * @param {Object} size - 建筑尺寸 {w, h}
   */
  _occupyTiles(position, size) {
    const halfW = Math.floor(size.w / 2);
    const halfH = Math.floor(size.h / 2);
    const cx = Math.floor(position.x / GAME.TILE_SIZE);
    const cz = Math.floor(position.z / GAME.TILE_SIZE);

    for (let dx = -halfW; dx < halfW; dx++) {
      for (let dz = -halfH; dz < halfH; dz++) {
        const key = `${cx + dx},${cz + dz}`;
        this.occupiedTiles.add(key);
      }
    }
  }

  /**
   * 释放建筑占据的格子
   * @param {Object} position
   * @param {Object} size
   */
  _freeTiles(position, size) {
    const halfW = Math.floor(size.w / 2);
    const halfH = Math.floor(size.h / 2);
    const cx = Math.floor(position.x / GAME.TILE_SIZE);
    const cz = Math.floor(position.z / GAME.TILE_SIZE);

    for (let dx = -halfW; dx < halfW; dx++) {
      for (let dz = -halfH; dz < halfH; dz++) {
        const key = `${cx + dx},${cz + dz}`;
        this.occupiedTiles.delete(key);
      }
    }
  }

  /**
   * 检查某个格子是否被占用
   * @param {number} gx - 格子X坐标
   * @param {number} gz - 格子Z坐标
   * @returns {boolean}
   */
  isTileOccupied(gx, gz) {
    return this.occupiedTiles.has(`${gx},${gz}`);
  }

  // ═══════════════════════════════════════
  // 虫族Creep系统
  // ═══════════════════════════════════════

  /**
   * 建筑完成后蔓延creep（虫族菌毯）
   * @param {Object} position - 建筑位置
   * @param {Object} size - 建筑尺寸
   */
  _spreadCreep(position, size) {
    const creepRadius = 5; // creep蔓延半径（格子数）
    const cx = Math.floor(position.x / GAME.TILE_SIZE);
    const cz = Math.floor(position.z / GAME.TILE_SIZE);

    for (let dx = -creepRadius; dx <= creepRadius; dx++) {
      for (let dz = -creepRadius; dz <= creepRadius; dz++) {
        if (dx * dx + dz * dz <= creepRadius * creepRadius) {
          const key = `${cx + dx},${cz + dz}`;
          this.creepMap.add(key);
        }
      }
    }
  }

  /**
   * 检查位置是否在creep范围内
   * @param {Object} position - 检查位置
   * @param {Object} size - 建筑尺寸
   * @returns {boolean}
   */
  _hasCreep(position, size) {
    const halfW = Math.floor(size.w / 2);
    const halfH = Math.floor(size.h / 2);
    const cx = Math.floor(position.x / GAME.TILE_SIZE);
    const cz = Math.floor(position.z / GAME.TILE_SIZE);

    // 至少有一个角在creep上即可
    const corners = [
      `${cx - halfW},${cz - halfH}`,
      `${cx + halfW},${cz - halfH}`,
      `${cx - halfW},${cz + halfH}`,
      `${cx + halfW},${cz + halfH}`,
      `${cx},${cz}`, // 中心点
    ];

    return corners.some(key => this.creepMap.has(key));
  }

  /**
   * 检查creep是否存在
   * @param {Object} position
   * @returns {boolean}
   */
  hasCreepAt(position) {
    const gx = Math.floor(position.x / GAME.TILE_SIZE);
    const gz = Math.floor(position.z / GAME.TILE_SIZE);
    return this.creepMap.has(`${gx},${gz}`);
  }

  /**
   * 获取当前所有creep覆盖的格子（供渲染层绘制菌毯纹理）
   * @returns {Set<string>}
   */
  getCreepTiles() {
    return this.creepMap;
  }
}
