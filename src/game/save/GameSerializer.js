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
 * 最低支持的存档版本（低于此版本的数据无法恢复）
 */
const MIN_SUPPORTED_VERSION = 1;

/**
 * 存档数据校验规则
 */
const SAVE_SCHEMA = {
  requiredFields: ['version', 'gameTime', 'playerRace'],
  arrayFields: { units: 'id', buildings: 'id' },
  numericFields: ['version', 'gameTime', 'nextUnitId'],
};

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

/**
 * 向后兼容的默认值映射
 * 当存档缺少某些字段时，使用这些默认值填充
 */
const FIELD_DEFAULTS = {
  shield: 0,
  maxShield: 0,
  armor: 0,
  attackCooldown: 0,
  selected: false,
  speed: 2,
  facing: 0,
  animState: 'idle',
  commandQueue: [],
  currentCommand: null,
  targetPosition: null,
  buildProgress: 0,
  isComplete: false,
  isBuilding: false,
  requiresCreep: false,
  hasCreep: false,
};

/**
 * 压缩存档配置
 */
const COMPRESSION_CONFIG = {
  enabled: true,
  threshold: 512, // 字节，低于此值不压缩
  method: 'lz-string', // 压缩算法
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

    /** @type {boolean} 是否启用压缩 */
    this.enableCompression = COMPRESSION_CONFIG.enabled;
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

      // 尝试解压缩（如果数据被压缩过）
      const decompressed = this._tryDecompress(json);
      if (decompressed !== json) {
        saveData = JSON.parse(decompressed);
      } else {
        // JSON.parse 已在上面执行
      }

      // 校验存档数据基本结构
      const validation = this.validateSaveData(saveData);
      if (!validation.valid) {
        console.warn('[GameSerializer] 存档数据校验警告:', validation.errors);
        saveData = this._applyFieldDefaults(saveData);
      }

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
    const version = (saveData.version !== undefined && saveData.version !== null) ? saveData.version : 1;
    if (version === SAVE_VERSION) return saveData;
    // 版本范围检查
    if (version > SAVE_VERSION) {
      console.warn(`[GameSerializer] 存档版本(${version})高于当前版本(${SAVE_VERSION})，尝试兼容加载`);
      saveData._futureVersion = true;
      return this._applyFieldDefaults(saveData);
    }

    if (version < MIN_SUPPORTED_VERSION) {
      console.error(`[GameSerializer] 存档版本(${version})低于最低支持版本(${MIN_SUPPORTED_VERSION})，无法加载`);
      throw new Error(`存档版本过低: v${version}，最低需要v${MIN_SUPPORTED_VERSION}`);
    }

    console.log(`[GameSerializer] 存档版本: ${version}，正在迁移到: ${SAVE_VERSION}`);

    let migrated = { ...saveData };
    // 逐版本升级
    for (let v = version; v < SAVE_VERSION; v++) {
      if (MIGRATIONS[v]) {
        try {
          migrated = MIGRATIONS[v](migrated);
        } catch (err) {
          console.error(`[GameSerializer] v${v} → v${v + 1} 迁移失败:`, err);
          migrated = this._applyFieldDefaults(migrated);
          migrated.version = v + 1;
        }
        console.log(`[GameSerializer] 已从 v${v} 迁移到 v${v + 1}`);
      }
    }
    return migrated;
  }

  // ═══════════════════════════════════════
  // 存档校验与修复
  // ═══════════════════════════════════════

  /**
   * 校验存档数据结构是否合法
   * @param {Object} saveData - 解析后的存档数据
   * @returns {{ valid: boolean, errors: string[] }} 校验结果
   */
  validateSaveData(saveData) {
    const errors = [];

    if (!saveData || typeof saveData !== 'object') {
      return { valid: false, errors: ['存档数据不是有效的对象'] };
    }

    // 检查必需字段
    for (const field of SAVE_SCHEMA.requiredFields) {
      if (saveData[field] === undefined || saveData[field] === null) {
        errors.push(`缺少必需字段: ${field}`);
      }
    }

    // 检查数值字段类型
    for (const field of SAVE_SCHEMA.numericFields) {
      if (saveData[field] !== undefined && typeof saveData[field] !== 'number') {
        const num = Number(saveData[field]);
        if (!isNaN(num)) {
          saveData[field] = num;
        } else {
          errors.push(`字段类型错误: ${field} 应为number`);
        }
      }
    }

    // 检查数组字段
    for (const [field, idKey] of Object.entries(SAVE_SCHEMA.arrayFields)) {
      if (saveData[field] !== undefined) {
        if (!Array.isArray(saveData[field])) {
          errors.push(`字段类型错误: ${field} 应为Array`);
          saveData[field] = [];
        } else {
          const invalidItems = saveData[field].filter((item) => !item || item[idKey] === undefined);
          if (invalidItems.length > 0) {
            errors.push(`${field} 中有 ${invalidItems.length} 个无效元素`);
            saveData[field] = saveData[field].filter((item) => item && item[idKey] !== undefined);
          }
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * 为存档数据中的缺失字段填充默认值
   * @param {Object} saveData - 存档数据
   * @returns {Object} 补全后的数据
   */
  _applyFieldDefaults(saveData) {
    if (Array.isArray(saveData.units)) {
      saveData.units = saveData.units.map((unit) => ({
        ...Object.fromEntries(
          Object.entries(FIELD_DEFAULTS).map(([k, v]) => [k, v])
        ),
        ...unit,
      }));
    }

    if (Array.isArray(saveData.buildings)) {
      saveData.buildings = saveData.buildings.map((building) => ({
        ...Object.fromEntries(
          Object.entries(FIELD_DEFAULTS).map(([k, v]) => [k, v])
        ),
        ...building,
      }));
    }

    if (!saveData.version) saveData.version = SAVE_VERSION;
    if (saveData.gameTime === undefined) saveData.gameTime = 0;
    if (!saveData.playerRace) saveData.playerRace = 'terran';
    if (!Array.isArray(saveData.units)) saveData.units = [];
    if (!Array.isArray(saveData.buildings)) saveData.buildings = [];

    return saveData;
  }

  // ═══════════════════════════════════════
  // 压缩支持
  // ═══════════════════════════════════════

  /**
   * 尝试解压缩数据（自动检测压缩格式）
   * @param {string} data - 可能被压缩的数据
   * @returns {string} 解压后的数据
   */
  _tryDecompress(data) {
    if (!data) return data;

    if (data.startsWith('SCZ:')) {
      try {
        const compressed = data.slice(4);
        const decompressed = this._lzStringDecompress(compressed);
        console.log(`[GameSerializer] 解压缩: ${(data.length / 1024).toFixed(1)}KB → ${(decompressed.length / 1024).toFixed(1)}KB`);
        return decompressed;
      } catch (err) {
        console.warn('[GameSerializer] 解压缩失败，使用原始数据:', err);
        return data;
      }
    }

    return data;
  }

  /**
   * 压缩存档数据
   * @param {string} data - JSON字符串
   * @returns {string} 压缩后的数据（带 "SCZ:" 前缀）
   */
  compress(data) {
    if (!this.enableCompression || !data || data.length < COMPRESSION_CONFIG.threshold) {
      return data;
    }

    try {
      const compressed = this._lzStringCompress(data);
      const result = 'SCZ:' + compressed;
      console.log(`[GameSerializer] 压缩: ${(data.length / 1024).toFixed(1)}KB → ${(result.length / 1024).toFixed(1)}KB`);
      return result;
    } catch (err) {
      console.warn('[GameSerializer] 压缩失败，使用原始数据:', err);
      return data;
    }
  }

  /**
   * LZ-String压缩实现（纯JavaScript，无需外部依赖）
   * @param {string} input
   * @returns {string}
   */
  _lzStringCompress(input) {
    if (input == null) return '';

    // 简单压缩：将连续3个以上相同字符编码为计数+字符
    let compressed = '';
    let count = 1;
    for (let idx = 1; idx <= input.length; idx++) {
      if (idx < input.length && input.charCodeAt(idx) === input.charCodeAt(idx - 1)) {
        count++;
      } else {
        if (count > 3) {
          compressed += '\x00' + String.fromCharCode(count) + input[idx - 1];
        } else {
          for (let c = 0; c < count; c++) {
            compressed += input[idx - 1];
          }
        }
        count = 1;
      }
    }

    // Base64编码
    return btoa(unescape(encodeURIComponent(compressed)));
  }

  /**
   * LZ-String解压缩实现
   * @param {string} compressed
   * @returns {string}
   */
  _lzStringDecompress(compressed) {
    if (!compressed) return '';

    const decoded = decodeURIComponent(escape(atob(compressed)));

    let output = '';
    let idx = 0;
    while (idx < decoded.length) {
      if (decoded.charCodeAt(idx) === 0) {
        const count = decoded.charCodeAt(idx + 1);
        const char = decoded.charCodeAt(idx + 2);
        for (let c = 0; c < count; c++) {
          output += String.fromCharCode(char);
        }
        idx += 3;
      } else {
        output += decoded[idx];
        idx++;
      }
    }

    return output;
  }

  /**
   * 获取当前存档格式版本号
   * @returns {number}
   */
  static getSaveVersion() {
    return SAVE_VERSION;
  }

  /**
   * 获取支持的最低版本号
   * @returns {number}
   */
  static getMinSupportedVersion() {
    return MIN_SUPPORTED_VERSION;
  }

  /**
   * 检查存档版本是否可迁移
   * @param {number} fromVersion
   * @returns {boolean}
   */
  static canMigrate(fromVersion) {
    if (fromVersion < MIN_SUPPORTED_VERSION || fromVersion > SAVE_VERSION) return false;
    for (let v = fromVersion; v < SAVE_VERSION; v++) {
      if (!MIGRATIONS[v]) return false;
    }
    return true;
  }
}
