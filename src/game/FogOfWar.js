// ═══════════════════════════════════════════
// StarCraft Web - 战争迷雾系统 (FogOfWar)
// 基于视野范围的迷雾计算
// ═══════════════════════════════════════════

// ── 迷雾状态常量 ──
export const FOG_STATE = {
  UNEXPLORED: 0,   // 未探索：完全黑色
  EXPLORED: 1,     // 已探索但不可见：半透明灰色
  VISIBLE: 2,      // 当前视野内：完全可见
};

/**
 * FogOfWar - 战争迷雾系统
 * 每个玩家维护独立的迷雾状态
 */
export default class FogOfWar {
  /**
   * @param {number} width - 地图宽度（格数）
   * @param {number} height - 地图高度（格数）
   */
  constructor(width, height) {
    this.width = width;
    this.height = height;

    /**
     * 每个队伍的迷雾状态
     * fog[team][gz][gx] = FOG_STATE
     * @type {Map<number, number[][]>}
     */
    this.fogByTeam = new Map();

    /**
     * 每个队伍的已探索记录（用于保持"已探索"状态）
     * explored[team][gz][gx] = boolean
     * @type {Map<number, boolean[][]>}
     */
    this.exploredByTeam = new Map();
  }

  // ═══════════════════════════════════════
  // 初始化
  // ═══════════════════════════════════════

  /**
   * 为指定队伍初始化迷雾数据
   * @param {number} team - 队伍编号
   */
  initTeam(team) {
    if (this.fogByTeam.has(team)) return;

    const fog = [];
    const explored = [];
    for (let gz = 0; gz < this.height; gz++) {
      fog.push(new Array(this.width).fill(FOG_STATE.UNEXPLORED));
      explored.push(new Array(this.width).fill(false));
    }
    this.fogByTeam.set(team, fog);
    this.exploredByTeam.set(team, explored);
  }

  /**
   * 重置指定队伍的迷雾
   * @param {number} team
   */
  resetTeam(team) {
    this.fogByTeam.delete(team);
    this.exploredByTeam.delete(team);
  }

  // ═══════════════════════════════════════
  // 视野计算
  // ═══════════════════════════════════════

  /**
   * 计算单个单位的视野范围
   * 使用圆形视野+地形阻挡
   * @param {number} team - 队伍
   * @param {number} gx - 单位格子X
   * @param {number} gz - 单位格子Z
   * @param {number} sightRange - 视野半径（格数）
   * @param {boolean[][]} [walkableGrid] - 可通行网格（用于视线检测）
   */
  revealArea(team, gx, gz, sightRange, walkableGrid = null) {
    this.initTeam(team);
    const fog = this.fogByTeam.get(team);
    const explored = this.exploredByTeam.get(team);
    const radius = Math.ceil(sightRange);

    for (let dz = -radius; dz <= radius; dz++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const tx = gx + dx;
        const tz = gz + dz;

        // 范围检查
        if (tx < 0 || tx >= this.width || tz < 0 || tz >= this.height) continue;

        // 圆形距离检查
        if (dx * dx + dz * dz > sightRange * sightRange) continue;

        // 可选：视线检查（简单版本，检查是否被岩石阻挡）
        if (walkableGrid && !this._hasLineOfSight(gx, gz, tx, tz, walkableGrid)) {
          continue;
        }

        // 设置为可见
        fog[tz][tx] = FOG_STATE.VISIBLE;
        explored[tz][tx] = true;
      }
    }
  }

  /**
   * 更新整个队伍的迷雾状态
   * 遍历所有单位，计算综合视野
   * @param {number} team
   * @param {Array} units - 单位列表（己方+友方）
   * @param {Array} [buildings] - 建筑列表
   * @param {boolean[][]} [walkableGrid] - 可通行网格
   */
  update(team, units, buildings = [], walkableGrid = null) {
    this.initTeam(team);
    const fog = this.fogByTeam.get(team);
    const explored = this.exploredByTeam.get(team);

    // 1. 先将所有"可见"降级为"已探索"
    for (let gz = 0; gz < this.height; gz++) {
      for (let gx = 0; gx < this.width; gx++) {
        if (fog[gz][gx] === FOG_STATE.VISIBLE) {
          fog[gz][gx] = FOG_STATE.EXPLORED;
        }
      }
    }

    // 2. 根据单位视野揭示区域
    for (const unit of units) {
      if (!unit.alive || unit.team !== team) continue;
      const gx = Math.floor(unit.position.x);
      const gz = Math.floor(unit.position.z);
      const sightRange = unit.sightRange || 7; // 默认7格视野
      this.revealArea(team, gx, gz, sightRange, walkableGrid);
    }

    // 3. 根据建筑视野揭示区域（建筑通常有较大视野）
    for (const bld of buildings) {
      if (!bld.alive || bld.team !== team) continue;
      const gx = Math.floor(bld.position.x);
      const gz = Math.floor(bld.position.z);
      const sightRange = bld.sightRange || 10; // 建筑默认10格视野
      this.revealArea(team, gx, gz, sightRange, walkableGrid);
    }
  }

  // ═══════════════════════════════════════
  // 视线检测
  // ═══════════════════════════════════════

  /**
   * 检测两点之间是否有视线
   * 使用Bresenham直线算法
   * @private
   * @returns {boolean} 是否可见
   */
  _hasLineOfSight(x0, z0, x1, z1, walkableGrid) {
    let dx = Math.abs(x1 - x0);
    let dz = Math.abs(z1 - z0);
    const sx = x0 < x1 ? 1 : -1;
    const sz = z0 < z1 ? 1 : -1;
    let err = dx - dz;

    while (true) {
      // 岩石/水域阻挡视线
      if (x0 >= 0 && x0 < this.width && z0 >= 0 && z0 < this.height) {
        if (walkableGrid && !walkableGrid[z0][x0]) {
          // 如果不在终点，且该格不可通行，则阻挡视线
          if (x0 !== x1 || z0 !== z1) return false;
        }
      }

      if (x0 === x1 && z0 === z1) break;

      const e2 = 2 * err;
      if (e2 > -dz) { err -= dz; x0 += sx; }
      if (e2 < dx) { err += dx; z0 += sz; }
    }
    return true;
  }

  // ═══════════════════════════════════════
  // 查询
  // ═══════════════════════════════════════

  /**
   * 获取指定位置对某队伍的迷雾状态
   * @param {number} team
   * @param {number} gx
   * @param {number} gz
   * @returns {number} FOG_STATE枚举值
   */
  getState(team, gx, gz) {
    const fog = this.fogByTeam.get(team);
    if (!fog) return FOG_STATE.UNEXPLORED;
    if (gx < 0 || gx >= this.width || gz < 0 || gz >= this.height) return FOG_STATE.UNEXPLORED;
    return fog[gz][gx];
  }

  /**
   * 指定位置是否对该队伍可见
   * @param {number} team
   * @param {number} gx
   * @param {number} gz
   * @returns {boolean}
   */
  isVisible(team, gx, gz) {
    return this.getState(team, gx, gz) === FOG_STATE.VISIBLE;
  }

  /**
   * 指定位置是否已被该队伍探索过
   * @param {number} team
   * @param {number} gx
   * @param {number} gz
   * @returns {boolean}
   */
  isExplored(team, gx, gz) {
    const explored = this.exploredByTeam.get(team);
    if (!explored) return false;
    if (gx < 0 || gx >= this.width || gz < 0 || gz >= this.height) return false;
    return explored[gz][gx];
  }

  /**
   * 获取指定队伍的完整迷雾数据（用于渲染）
   * @param {number} team
   * @returns {number[][]|null}
   */
  getFogData(team) {
    return this.fogByTeam.get(team) || null;
  }

  // ═══════════════════════════════════════
  // 与3D引擎集成
  // ═══════════════════════════════════════

  /**
   * 生成迷雾渲染用的透明度贴图
   * 返回Float32Array，每个格子对应一个透明度值
   * @param {number} team
   * @returns {Float32Array} 透明度数组 [0=全黑, 0.5=半透明, 1=完全可见]
   */
  generateOpacityMap(team) {
    const fog = this.fogByTeam.get(team);
    if (!fog) return new Float32Array(this.width * this.height);

    const map = new Float32Array(this.width * this.height);
    for (let gz = 0; gz < this.height; gz++) {
      for (let gx = 0; gx < this.width; gx++) {
        const idx = gz * this.width + gx;
        switch (fog[gz][gx]) {
          case FOG_STATE.UNEXPLORED:
            map[idx] = 0;       // 全黑
            break;
          case FOG_STATE.EXPLORED:
            map[idx] = 0.35;    // 半透明
            break;
          case FOG_STATE.VISIBLE:
            map[idx] = 1;       // 完全可见
            break;
        }
      }
    }
    return map;
  }

  /**
   * 生成迷雾颜色贴图（Canvas 2D用）
   * @param {number} team
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} tileSize - 格子像素大小
   */
  renderToCanvas(team, ctx, tileSize) {
    const fog = this.fogByTeam.get(team);
    if (!fog) {
      // 全黑
      ctx.fillStyle = 'rgba(0, 0, 0, 1)';
      ctx.fillRect(0, 0, this.width * tileSize, this.height * tileSize);
      return;
    }

    for (let gz = 0; gz < this.height; gz++) {
      for (let gx = 0; gx < this.width; gx++) {
        const x = gx * tileSize;
        const y = gz * tileSize;
        switch (fog[gz][gx]) {
          case FOG_STATE.UNEXPLORED:
            ctx.fillStyle = 'rgba(0, 0, 0, 1)';
            break;
          case FOG_STATE.EXPLORED:
            ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
            break;
          case FOG_STATE.VISIBLE:
            continue; // 不绘制（完全可见）
        }
        ctx.fillRect(x, y, tileSize, tileSize);
      }
    }
  }
}
