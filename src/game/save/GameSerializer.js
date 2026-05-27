// ═══════════════════════════════════════════
// StarCraft Web - 游戏状态序列化 (GameSerializer)
// 负责将完整游戏状态转为JSON，以及从JSON恢复状态
// 支持增量存档优化和版本兼容
// ═══════════════════════════════════════════

/**
 * 存档格式版本号
 * 每次修改存档结构时递增，用于版本兼容
 */
const SAVE_VERSION = 2;

/**
 * 支持版本升级的迁移函数映射
 * key: 旧版本号, value: 升级函数（将旧格式转为新格式）
 */
const MIGRATIONS = {
  1: (data) => {
    // v1 → v2: 添加了shield字段
    if (data.units) {
      for (const unit of data.units) {
        if (unit.shield === undefined) unit.shield = 0;
        if (unit.maxShield === undefined) unit.maxShield = 0;
      }
    }
    data.version = 2;
    return data;
  },
};

export default class GameSerializer {
  constructor() {
    /**
     * 上一次完整序列化的快照（用于增量存档）
     * @type {Object|null}
     */
    this._lastFullSnapshot = null;

    /** @type {boolean} 是否启用增量存档 */
    this.enableDelta = true;
  }

  // ═══════════════════════════════════════
  // 序列化（游戏状态 → JSON）
  // ═══════════════════════════════════════

  /**
   * 将完整游戏状态序列化为JSON字符串
   * @param {import('../GameManager.js').default} gameManager - 游戏管理器
   * @returns {string} JSON字符串
   */
  serialize(gameManager) {
    const saveData = {
      // ── 元数据 ──
      version: SAVE_VERSION,
      timestamp: Date.now(),
      gameTime: gameManager.gameTickTime,
      frame: Math.floor(gameManager.gameTickTime),
      playerRace: gameManager.playerRace,

      // ── 单位状态 ──
      units: this._serializeUnits(gameManager.units),

      // ── 建筑状态 ──
      buildings: this._serializeBuildings(gameManager.buildings),

      // ── 资源状态 ──
      resources: this._serializeResources(gameManager.resourceManager),

      // ── 科技状态 ──
      tech: this._serializeTech(gameManager.techTree),

      // ── 地图迷雾 ──
      fogOfWar: this._serializeFog(gameManager),

      // ── ID分配器 ──
      nextUnitId: gameManager.nextUnitId,

      // ── 战役进度（如果有） ──
      campaign: this._serializeCampaign(gameManager),
    };

    const json = JSON.stringify(saveData);

    // 保存完整快照用于增量比较
    this._lastFullSnapshot = JSON.parse(json);

    console.log(`[GameSerializer] 序列化完成，大小: ${(json.length / 1024).toFixed(1)}KB`);
    return json;
  }

  /**
   * 生成增量存档（只保存自上次以来的变化）
   * @param {import('../GameManager.js').default} gameManager
   * @returns {string} 增量JSON字符串
   */
  serializeDelta(gameManager) {
    const current = {
      version: SAVE_VERSION,
      timestamp: Date.now(),
      gameTime: gameManager.gameTickTime,
      units: this._serializeUnits(gameManager.units),
      buildings: this._serializeBuildings(gameManager.buildings),
      resources: this._serializeResources(gameManager.resourceManager),
      tech: this._serializeTech(gameManager.techTree),
      nextUnitId: gameManager.nextUnitId,
    };

    if (!this._lastFullSnapshot) {
      return this.serialize(gameManager);
    }

    const delta = this._computeDelta(this._lastFullSnapshot, current);
    delta.isDelta = true;
    delta.baseTimestamp = this._lastFullSnapshot.timestamp;

    const json = JSON.stringify(delta);
    console.log(`[GameSerializer] 增量存档，大小: ${(json.length / 1024).toFixed(1)}KB`);
    return json;
  }

  /**
   * 序列化单位列表
   * @param {Array} units
   * @returns {Array}
   */
  _serializeUnits(units) {
    if (!units) return [];
    return units
      .filter((u) => u.alive)
      .map((u) => ({
        id: u.id,
        type: u.type,
        name: u.name,
        race: u.race,
        team: u.team,
        pos: [u.position.x, u.position.y || 0, u.position.z],
        facing: u.facing || 0,
        hp: u.hp,
        maxHp: u.maxHp,
        shield: u.shield || 0,
        maxShield: u.maxShield || 0,
        armor: u.armor || 0,
        attackCooldown: u.attackCooldown || 0,
        attackTarget: u.attackTarget || null,
        selected: u.selected || false,
        speed: u.speed || 0,
        currentCommand: u.currentCommand || null,
        commandQueue: u.commandQueue || [],
        targetPosition: u.targetPosition || null,
        animState: u.animState || 'idle',
      }));
  }

  /**
   * 序列化建筑列表
   * @param {Array} buildings
   * @returns {Array}
   */
  _serializeBuildings(buildings) {
    if (!buildings) return [];
    return buildings
      .filter((b) => b.alive)
      .map((b) => ({
        id: b.id,
        type: b.type,
        name: b.name,
        race: b.race,
        team: b.team,
        pos: [b.position.x, b.position.y || 0, b.position.z],
        hp: b.hp,
        maxHp: b.maxHp,
        shield: b.shield || 0,
        maxShield: b.maxShield || 0,
        armor: b.armor || 0,
        buildProgress: b.buildProgress || 0,
        isComplete: b.isComplete || false,
        isBuilding: b.isBuilding || false,
        selected: b.selected || false,
      }));
  }

  /**
   * 序列化资源管理器状态
   * @param {ResourceManager} rm
   * @returns {Object}
   */
  _serializeResources(rm) {
    if (!rm) return {};
    try {
      if (rm.resources) {
        return JSON.parse(JSON.stringify(rm.resources));
      }
      return {};
    } catch (err) {
      console.warn('[GameSerializer] 资源序列化失败:', err);
      return {};
    }
  }

  /**
   * 序列化科技树状态
   * @param {TechTree} techTree
   * @returns {Object}
   */
  _serializeTech(techTree) {
    if (!techTree) return {};
    try {
      if (techTree.playerTechs) {
        return JSON.parse(JSON.stringify(techTree.playerTechs));
      }
      return {};
    } catch (err) {
      console.warn('[GameSerializer] 科技序列化失败:', err);
      return {};
    }
  }

  /**
   * 序列化战争迷雾状态
   * @param {GameManager} gameManager
   * @returns {Object|null}
   */
  _serializeFog(gameManager) {
    if (gameManager.fogOfWar) {
      return JSON.parse(JSON.stringify(gameManager.fogOfWar));
    }
    return null;
  }

  /**
   * 序列化战役进度
   * @param {GameManager} gameManager
   * @returns {Object|null}
   */
  _serializeCampaign(gameManager) {
    if (gameManager.campaignManager) {
      return { status: gameManager.campaignManager.getStatus() };
    }
    return null;
  }

  // ═══════════════════════════════════════
  // 反序列化（JSON → 游戏状态）
  // ═══════════════════════════════════════

  /**
   * 从JSON字符串恢复游戏状态
   * @param {string} json - JSON字符串
   * @param {import('../GameManager.js').default} gameManager - 游戏管理器
   * @returns {boolean} 是否成功恢复
   */
  deserialize(json, gameManager) {
    try {
      let saveData = JSON.parse(json);

      // 版本兼容处理
      saveData = this._migrateVersion(saveData);

      // 恢复基础状态
      gameManager.gameTickTime = saveData.gameTime || 0;
      gameManager.playerRace = saveData.playerRace;
      gameManager.nextUnitId = saveData.nextUnitId || 1;

      // 恢复实体
      this._deserializeUnits(saveData.units || [], gameManager);
      this._deserializeBuildings(saveData.buildings || [], gameManager);
      this._deserializeResources(saveData.resources || {}, gameManager);
      this._deserializeTech(saveData.tech || {}, gameManager);

      // 恢复迷雾
      if (saveData.fogOfWar && gameManager.fogOfWar) {
        gameManager.fogOfWar = saveData.fogOfWar;
      }

      console.log('[GameSerializer] 游戏状态恢复成功');
      return true;
    } catch (err) {
      console.error('[GameSerializer] 反序列化失败:', err);
      return false;
    }
  }

  /**
   * 应用增量存档
   * @param {string} deltaJson
   * @param {import('../GameManager.js').default} gameManager
   * @returns {boolean}
   */
  applyDelta(deltaJson, gameManager) {
    try {
      const delta = JSON.parse(deltaJson);

      if (delta.isDelta && this._lastFullSnapshot &&
          delta.baseTimestamp === this._lastFullSnapshot.timestamp) {
        this._applyDeltaToState(delta, gameManager);
        console.log('[GameSerializer] 增量存档应用成功');
        return true;
      } else {
        console.warn('[GameSerializer] 增量存档不兼容，尝试完整加载');
        return this.deserialize(deltaJson, gameManager);
      }
    } catch (err) {
      console.error('[GameSerializer] 增量存档应用失败:', err);
      return false;
    }
  }

  /**
   * 从JSON恢复单位列表
   * @param {Array} unitData
   * @param {GameManager} gm
   */
  _deserializeUnits(unitData, gm) {
    gm.units = [];
    for (const data of unitData) {
      const unitDef = gm._getUnitDef ? gm._getUnitDef(data.type) : null;
      gm.units.push({
        id: data.id,
        type: data.type,
        name: data.name || data.type,
        race: data.race || gm.playerRace,
        team: data.team,
        position: { x: data.pos[0], y: data.pos[1] || 0, z: data.pos[2] || 0 },
        targetPosition: data.targetPosition || null,
        velocity: { x: 0, y: 0, z: 0 },
        facing: data.facing || 0,
        hp: data.hp,
        maxHp: data.maxHp || data.hp,
        shield: data.shield || 0,
        maxShield: data.maxShield || 0,
        armor: data.armor || 0,
        attack: unitDef ? { ...unitDef.attack } : null,
        attackCooldown: data.attackCooldown || 0,
        attackTarget: data.attackTarget || null,
        alive: true,
        selected: data.selected || false,
        speed: data.speed || (unitDef && unitDef.speed) || 2,
        commandQueue: data.commandQueue || [],
        currentCommand: data.currentCommand || null,
        buildTime: unitDef ? unitDef.buildTime : 24,
        abilities: unitDef ? unitDef.abilities : [],
        mesh: null,
        unitSize: unitDef ? unitDef.size : 'medium',
        animState: data.animState || 'idle',
      });
    }
  }

  /**
   * 从JSON恢复建筑列表
   * @param {Array} buildingData
   * @param {GameManager} gm
   */
  _deserializeBuildings(buildingData, gm) {
    gm.buildings = [];
    for (const data of buildingData) {
      const bldDef = gm._getBuildingDef ? gm._getBuildingDef(data.type) : null;
      gm.buildings.push({
        id: data.id,
        type: data.type,
        name: data.name || data.type,
        race: data.race || gm.playerRace,
        team: data.team,
        position: { x: data.pos[0], y: data.pos[1] || 0, z: data.pos[2] || 0 },
        size: bldDef ? bldDef.size : { w: 2, h: 2 },
        hp: data.hp,
        maxHp: data.maxHp || data.hp,
        shield: data.shield || 0,
        maxShield: data.maxShield || 0,
        armor: data.armor || 0,
        buildProgress: data.buildProgress || 0,
        isComplete: data.isComplete || false,
        isBuilding: data.isBuilding || false,
        producesUnits: bldDef ? bldDef.producesUnits : [],
        providesSupply: bldDef ? bldDef.providesSupply : 0,
        canResearch: bldDef ? bldDef.canResearch : [],
        alive: true,
        selected: data.selected || false,
        mesh: null,
        requiresCreep: bldDef ? bldDef.requiresCreep : false,
        hasCreep: false,
      });
    }
  }

  /**
   * 从JSON恢复资源
   * @param {Object} resourceData
   * @param {GameManager} gm
   */
  _deserializeResources(resourceData, gm) {
    if (gm.resourceManager) {
      try {
        if (gm.resourceManager.resources) {
          Object.assign(gm.resourceManager.resources, resourceData);
        }
      } catch (err) {
        console.warn('[GameSerializer] 资源恢复失败:', err);
      }
    }
  }

  /**
   * 从JSON恢复科技状态
   * @param {Object} techData
   * @param {GameManager} gm
   */
  _deserializeTech(techData, gm) {
    if (gm.techTree && gm.techTree.playerTechs) {
      try {
        Object.assign(gm.techTree.playerTechs, techData);
      } catch (err) {
        console.warn('[GameSerializer] 科技恢复失败:', err);
      }
    }
  }

  // ═══════════════════════════════════════
  // 增量存档内部方法
  // ═══════════════════════════════════════

  /**
   * 计算两个状态之间的差异
   * @param {Object} base
   * @param {Object} current
   * @returns {Object} 差异对象
   */
  _computeDelta(base, current) {
    return {
      version: current.version,
      timestamp: current.timestamp,
      gameTime: current.gameTime,
      units: this._diffArrays(base.units || [], current.units || [], 'id'),
      buildings: this._diffArrays(base.buildings || [], current.buildings || [], 'id'),
      resources: this._diffObjects(base.resources || {}, current.resources || {}),
      tech: this._diffObjects(base.tech || {}, current.tech || {}),
      nextUnitId: current.nextUnitId,
    };
  }

  /**
   * 计算数组差异
   * @param {Array} baseArr
   * @param {Array} currArr
   * @param {string} idKey
   * @returns {Object} { added, removed, changed }
   */
  _diffArrays(baseArr, currArr, idKey) {
    const baseMap = new Map(baseArr.map((item) => [item[idKey], item]));
    const currMap = new Map(currArr.map((item) => [item[idKey], item]));
    const added = [];
    const removed = [];
    const changed = [];

    for (const [id, item] of currMap) {
      if (!baseMap.has(id)) {
        added.push(item);
      } else {
        const diff = this._diffObjects(baseMap.get(id), item);
        if (Object.keys(diff).length > 0) {
          diff[idKey] = id;
          changed.push(diff);
        }
      }
    }
    for (const [id] of baseMap) {
      if (!currMap.has(id)) removed.push(id);
    }
    return { added, removed, changed };
  }

  /**
   * 计算对象差异
   * @param {Object} base
   * @param {Object} current
   * @returns {Object}
   */
  _diffObjects(base, current) {
    const diff = {};
    for (const key of Object.keys(current)) {
      if (JSON.stringify(base[key]) !== JSON.stringify(current[key])) {
        diff[key] = current[key];
      }
    }
    return diff;
  }

  /**
   * 将增量应用到当前状态
   * @param {Object} delta
   * @param {GameManager} gm
   */
  _applyDeltaToState(delta, gm) {
    gm.gameTickTime = delta.gameTime || gm.gameTickTime;
    gm.nextUnitId = delta.nextUnitId || gm.nextUnitId;

    if (delta.units) {
      this._applyArrayDelta(gm.units, delta.units, 'id');
    }
    if (delta.buildings) {
      this._applyArrayDelta(gm.buildings, delta.buildings, 'id');
    }
    if (delta.resources && gm.resourceManager && gm.resourceManager.resources) {
      Object.assign(gm.resourceManager.resources, delta.resources);
    }
    if (delta.tech && gm.techTree && gm.techTree.playerTechs) {
      Object.assign(gm.techTree.playerTechs, delta.tech);
    }
  }

  /**
   * 应用数组增量
   * @param {Array} currentArr
   * @param {Object} arrayDelta
   * @param {string} idKey
   */
  _applyArrayDelta(currentArr, arrayDelta, idKey) {
    if (arrayDelta.added) {
      for (const item of arrayDelta.added) {
        currentArr.push(item);
      }
    }
    if (arrayDelta.removed) {
      for (const id of arrayDelta.removed) {
        const idx = currentArr.findIndex((item) => item[idKey] === id);
        if (idx !== -1) currentArr.splice(idx, 1);
      }
    }
    if (arrayDelta.changed) {
      const currentMap = new Map(currentArr.map((item) => [item[idKey], item]));
      for (const diff of arrayDelta.changed) {
        const item = currentMap.get(diff[idKey]);
        if (item) Object.assign(item, diff);
      }
    }
  }

  // ═══════════════════════════════════════
  // 版本兼容
  // ═══════════════════════════════════════

  /**
   * 对存档数据进行版本迁移
   * @param {Object} saveData
   * @returns {Object} 迁移后的数据
   */
  _migrateVersion(saveData) {
    const version = saveData.version || 1;
    if (version === SAVE_VERSION) return saveData;

    console.log(`[GameSerializer] 存档版本: ${version}，正在迁移到: ${SAVE_VERSION}`);

    let migrated = { ...saveData };
    // 逐版本升级
    for (let v = version; v < SAVE_VERSION; v++) {
      if (MIGRATIONS[v]) {
        migrated = MIGRATIONS[v](migrated);
        console.log(`[GameSerializer] 已从 v${v} 迁移到 v${v + 1}`);
      }
    }
    return migrated;
  }
}
