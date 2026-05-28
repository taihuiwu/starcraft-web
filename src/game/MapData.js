// ═══════════════════════════════════════════
// StarCraft Web - 地图数据格式 (MapData)
// 定义地图数据结构、验证、出生点和资源点获取
// ═══════════════════════════════════════════

// ── 地形类型 ──
export const TERRAIN = {
  GRASS: 0,    // 草地（可通行）
  DIRT: 1,     // 泥土（可通行）
  ROCK: 2,     // 岩石（不可通行）
  WATER: 3,    // 水域（不可通行）
  HIGH: 4,     // 高地（可通行，视野优势）
  RAMP: 5,     // 坡道（可通行，连接高低地）
};

// ── 地形属性表 ──
export const TERRAIN_PROPS = {
  [TERRAIN.GRASS]: { walkable: true, name: '草地', color: '#3a7d2a' },
  [TERRAIN.DIRT]: { walkable: true, name: '泥土', color: '#8b7355' },
  [TERRAIN.ROCK]: { walkable: false, name: '岩石', color: '#6b6b6b' },
  [TERRAIN.WATER]: { walkable: false, name: '水域', color: '#2255aa' },
  [TERRAIN.HIGH]: { walkable: true, name: '高地', color: '#5a8a3a' },
  [TERRAIN.RAMP]: { walkable: true, name: '坡道', color: '#6a9a4a' },
};

// ── 资源类型 ──
export const RESOURCE_TYPE = {
  MINERAL: 'mineral',
  GAS: 'gas',
  VESPENE: 'vespene',
};

// ── 地图预制尺寸 ──
export const MAP_SIZES = {
  SMALL: { width: 64, height: 64, label: '64×64' },
  MEDIUM: { width: 128, height: 128, label: '128×128' },
  LARGE: { width: 256, height: 256, label: '256×256' },
};

/**
 * MapData - 地图数据类
 * 存储地形层、单位层、建筑层、资源点等信息
 */
export default class MapData {
  /**
   * @param {Object} options
   * @param {number} options.width - 地图宽度（格数）
   * @param {number} options.height - 地图高度（格数）
   * @param {string} [options.name] - 地图名称
   * @param {string} [options.author] - 地图作者
   * @param {number} [options.tileSize=32] - 每格像素大小（编辑器用）
   */
  constructor(options = {}) {
    this.width = options.width || 128;
    this.height = options.height || 128;
    this.name = options.name || '未命名地图';
    this.author = options.author || '未知作者';
    this.tileSize = options.tileSize || 32;

    // ── 地形层（2D数组） ──
    // terrain[gz][gx] = TERRAIN类型
    this.terrain = this._createGrid(this.width, this.height, TERRAIN.GRASS);

    // ── 高度层（2D数组） ──
    // heightMap[gz][gx] = 浮点高度值（0~1）
    this.heightMap = this._createGrid(this.width, this.height, 0);

    // ── 建筑占位（2D数组） ──
    // buildingGrid[gz][gx] = buildingId 或 null
    this.buildingGrid = this._createGrid(this.width, this.height, null);

    // ── 出生点列表 ──
    this.spawnPoints = [];

    // ── 资源点列表 ──
    this.resourceNodes = [];

    // ── 单位放置列表 ──
    this.units = [];

    // ── 建筑放置列表 ──
    this.buildings = [];

    // ── 版本信息 ──
    this.version = '1.0';
    this.format = 'sc-web-map';
  }

  /**
   * 创建2D网格
   * @private
   */
  _createGrid(w, h, fillValue) {
    const grid = [];
    for (let z = 0; z < h; z++) {
      const row = new Array(w);
      row.fill(fillValue);
      grid.push(row);
    }
    return grid;
  }

  // ═══════════════════════════════════════
  // 地形操作
  // ═══════════════════════════════════════

  /**
   * 设置地形类型
   * @param {number} gx - X坐标
   * @param {number} gz - Z坐标
   * @param {number} type - TERRAIN类型
   */
  setTerrain(gx, gz, type) {
    if (gx >= 0 && gx < this.width && gz >= 0 && gz < this.height) {
      this.terrain[gz][gx] = type;
    }
  }

  /**
   * 获取地形类型
   * @param {number} gx
   * @param {number} gz
   * @returns {number}
   */
  getTerrain(gx, gz) {
    if (gx < 0 || gx >= this.width || gz < 0 || gz >= this.height) {
      return TERRAIN.ROCK; // 地图外视为不可通行
    }
    return this.terrain[gz][gx];
  }

  /**
   * 设置高度值
   * @param {number} gx
   * @param {number} gz
   * @param {number} height - 0~1
   */
  setHeight(gx, gz, height) {
    if (gx >= 0 && gx < this.width && gz >= 0 && gz < this.height) {
      this.heightMap[gz][gx] = Math.max(0, Math.min(1, height));
    }
  }

  /**
   * 获取高度值
   * @param {number} gx
   * @param {number} gz
   * @returns {number}
   */
  getHeight(gx, gz) {
    if (gx < 0 || gx >= this.width || gz < 0 || gz >= this.height) return 0;
    return this.heightMap[gz][gx];
  }

  /**
   * 批量绘制地形（笔刷）
   * @param {number} cx - 中心X
   * @param {number} cz - 中心Z
   * @param {number} radius - 半径
   * @param {number} type - TERRAIN类型
   */
  paintTerrain(cx, cz, radius, type) {
    const r = Math.ceil(radius);
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dz * dz <= radius * radius) {
          this.setTerrain(cx + dx, cz + dz, type);
        }
      }
    }
  }

  /**
   * 生成可通行性网格（用于寻路）
   * @returns {boolean[][]} walkable[gz][gx]
   */
  getWalkableGrid() {
    const grid = [];
    for (let gz = 0; gz < this.height; gz++) {
      const row = new Array(this.width);
      for (let gx = 0; gx < this.width; gx++) {
        const terrain = this.terrain[gz][gx];
        const props = TERRAIN_PROPS[terrain];
        row[gx] = props ? props.walkable : false;
      }
      grid.push(row);
    }
    return grid;
  }

  // ═══════════════════════════════════════
  // 出生点管理
  // ═══════════════════════════════════════

  /**
   * 添加出生点
   * @param {number} x - 世界X坐标
   * @param {number} z - 世界Z坐标
   * @param {number} team - 队伍编号 (1-8)
   */
  addSpawnPoint(x, z, team) {
    this.spawnPoints.push({ x, z, team });
  }

  /**
   * 获取所有出生点
   * @returns {Array<{x: number, z: number, team: number}>}
   */
  getSpawnPoints() {
    return [...this.spawnPoints];
  }

  /**
   * 根据队伍获取出生点
   * @param {number} team
   * @returns {{x: number, z: number, team: number}|null}
   */
  getSpawnPointByTeam(team) {
    return this.spawnPoints.find(sp => sp.team === team) || null;
  }

  // ═══════════════════════════════════════
  // 资源点管理
  // ═══════════════════════════════════════

  /**
   * 添加资源点
   * @param {Object} node
   * @param {number} node.x - 世界X坐标
   * @param {number} node.z - 世界Z坐标
   * @param {string} node.type - 资源类型
   * @param {number} [node.amount=1500] - 资源量
   */
  addResourceNode(node) {
    this.resourceNodes.push({
      x: node.x,
      z: node.z,
      type: node.type || RESOURCE_TYPE.MINERAL,
      amount: node.amount || (node.type === RESOURCE_TYPE.GAS ? 2500 : 1500),
    });
  }

  /**
   * 获取所有资源节点
   * @returns {Array}
   */
  getResourceNodes() {
    return [...this.resourceNodes];
  }

  /**
   * 获取指定范围内的资源节点
   * @param {number} x
   * @param {number} z
   * @param {number} radius
   * @returns {Array}
   */
  getResourceNodesInRange(x, z, radius) {
    const rSq = radius * radius;
    return this.resourceNodes.filter(n => {
      const dx = n.x - x;
      const dz = n.z - z;
      return dx * dx + dz * dz <= rSq;
    });
  }

  // ═══════════════════════════════════════
  // 序列化
  // ═══════════════════════════════════════

  /**
   * 导出地图为JSON对象
   * @returns {Object}
   */
  toJSON() {
    return {
      format: this.format,
      version: this.version,
      name: this.name,
      author: this.author,
      width: this.width,
      height: this.height,
      tileSize: this.tileSize,
      terrain: this.terrain,
      heightMap: this.heightMap,
      spawnPoints: this.spawnPoints,
      resourceNodes: this.resourceNodes,
      units: this.units,
      buildings: this.buildings,
    };
  }

  /**
   * 从JSON对象加载地图
   * @param {Object} json
   * @returns {MapData}
   */
  static fromJSON(json) {
    const map = new MapData({
      width: json.width,
      height: json.height,
      name: json.name,
      author: json.author,
      tileSize: json.tileSize,
    });

    map.terrain = json.terrain || map.terrain;
    map.heightMap = json.heightMap || map.heightMap;
    map.spawnPoints = json.spawnPoints || [];
    map.resourceNodes = json.resourceNodes || [];
    map.units = json.units || [];
    map.buildings = json.buildings || [];
    map.version = json.version || '1.0';

    return map;
  }

  /**
   * 导出为游戏可用的地形数据格式
   * 简化格式：只保留地形类型和关键数据
   * @returns {Object}
   */
  exportForGame() {
    return {
      width: this.width,
      height: this.height,
      terrain: this.terrain,
      heightMap: this.heightMap,
      walkable: this.getWalkableGrid(),
      spawnPoints: this.spawnPoints,
      resourceNodes: this.resourceNodes,
    };
  }

  /**
   * 保存到JSON字符串（用于浏览器下载/localStorage）
   * @returns {string}
   */
  serialize() {
    return JSON.stringify(this.toJSON());
  }

  /**
   * 从JSON字符串加载
   * @param {string} jsonStr
   * @returns {MapData}
   */
  static deserialize(jsonStr) {
    const json = JSON.parse(jsonStr);
    return MapData.fromJSON(json);
  }
}

// ═══════════════════════════════════════
// 地图验证
// ═══════════════════════════════════════

/**
 * 验证地图合法性
 * @param {MapData} mapData - 地图数据
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export function validateMap(mapData) {
  const errors = [];
  const warnings = [];

  // 1. 基本尺寸检查
  if (!mapData.width || mapData.width < 32 || mapData.width > 256) {
    errors.push(`地图宽度无效: ${mapData.width}（应为32~256）`);
  }
  if (!mapData.height || mapData.height < 32 || mapData.height > 256) {
    errors.push(`地图高度无效: ${mapData.height}（应为32~256）`);
  }

  // 2. 地形数据检查
  if (!mapData.terrain || !Array.isArray(mapData.terrain)) {
    errors.push('缺少地形数据');
  } else {
    if (mapData.terrain.length !== mapData.height) {
      errors.push(`地形行数(${mapData.terrain.length})与地图高度(${mapData.height})不匹配`);
    }
    for (let gz = 0; gz < Math.min(mapData.terrain.length, mapData.height); gz++) {
      if (!mapData.terrain[gz] || mapData.terrain[gz].length !== mapData.width) {
        errors.push(`第${gz}行列数不正确`);
        break;
      }
    }
  }

  // 3. 检查地图是否全为不可通行地形
  let allBlocked = true;
  if (mapData.terrain) {
    for (let gz = 0; gz < mapData.height && allBlocked; gz++) {
      for (let gx = 0; gx < mapData.width && allBlocked; gx++) {
        const t = mapData.terrain[gz][gx];
        const props = TERRAIN_PROPS[t];
        if (props && props.walkable) allBlocked = false;
      }
    }
  }
  if (allBlocked) {
    errors.push('地图无可通行区域');
  }

  // 4. 出生点检查
  if (!mapData.spawnPoints || mapData.spawnPoints.length === 0) {
    warnings.push('地图没有设置出生点');
  } else {
    const teams = new Set();
    for (const sp of mapData.spawnPoints) {
      if (sp.team < 1 || sp.team > 8) {
        errors.push(`出生点队伍编号无效: ${sp.team}`);
      }
      if (teams.has(sp.team)) {
        warnings.push(`队伍${sp.team}有多个出生点`);
      }
      teams.add(sp.team);

      // 检查出生点位置
      const gx = Math.floor(sp.x);
      const gz = Math.floor(sp.z);
      if (gx < 0 || gx >= mapData.width || gz < 0 || gz >= mapData.height) {
        errors.push(`出生点(队伍${sp.team})超出地图范围`);
      }
    }
  }

  // 5. 资源点检查
  if (!mapData.resourceNodes || mapData.resourceNodes.length === 0) {
    warnings.push('地图没有设置资源点');
  } else {
    for (const rn of mapData.resourceNodes) {
      if (!rn.type || (rn.type !== RESOURCE_TYPE.MINERAL && rn.type !== RESOURCE_TYPE.GAS)) {
        warnings.push(`资源点类型未知: ${rn.type}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
