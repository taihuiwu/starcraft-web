// ═══════════════════════════════════════════
// StarCraft Web - A*寻路系统
// 支持WebWorker / 碰撞体积 / 路径平滑 / 缓存
// ═══════════════════════════════════════════

import { worldToGrid, gridToWorld } from '../shared/MathUtils.js';

// ── 方向常量（8方向） ──
const DIRS = [
  { dx:  0, dz: -1, cost: 1 },   // 上
  { dx:  1, dz:  0, cost: 1 },   // 右
  { dx:  0, dz:  1, cost: 1 },   // 下
  { dx: -1, dz:  0, cost: 1 },   // 左
  { dx:  1, dz: -1, cost: 1.414 }, // 右上
  { dx:  1, dz:  1, cost: 1.414 }, // 右下
  { dx: -1, dz:  1, cost: 1.414 }, // 左下
  { dx: -1, dz: -1, cost: 1.414 }, // 左上
];

// ── 最小二叉堆（用于openList高效取最小f值） ──
class MinHeap {
  constructor() {
    this.data = [];
  }

  push(node) {
    this.data.push(node);
    this._bubbleUp(this.data.length - 1);
  }

  pop() {
    const top = this.data[0];
    const last = this.data.pop();
    if (this.data.length > 0) {
      this.data[0] = last;
      this._sinkDown(0);
    }
    return top;
  }

  get size() { return this.data.length; }

  _bubbleUp(i) {
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.data[i].f < this.data[parent].f) {
        [this.data[i], this.data[parent]] = [this.data[parent], this.data[i]];
        i = parent;
      } else break;
    }
  }

  _sinkDown(i) {
    const n = this.data.length;
    while (true) {
      let smallest = i;
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      if (l < n && this.data[l].f < this.data[smallest].f) smallest = l;
      if (r < n && this.data[r].f < this.data[smallest].f) smallest = r;
      if (smallest !== i) {
        [this.data[i], this.data[smallest]] = [this.data[smallest], this.data[i]];
        i = smallest;
      } else break;
    }
  }
}



// ═══════════════════════════════════════════
// Pathfinding 主类
// ═══════════════════════════════════════════
export class Pathfinding {
  /**
   * @param {number} width  - 地图宽度（格数）
   * @param {number} height - 地图高度（格数）
   * @param {boolean[][]} walkable - walkable[gz][gx] = true/false
   * @param {object} [options]
   * @param {number} [options.maxSearchNodes=2000] - 最大搜索节点数
   * @param {number} [options.cacheSize=1024] - 路径缓存容量
   */
  constructor(width, height, walkable, options = {}) {
    this.width = width;
    this.height = height;
    this.walkable = walkable; // 2D boolean grid
    this.maxSearchNodes = options.maxSearchNodes || 2000;
    this.cacheSize = options.cacheSize || 1024;
    // ── 实例级节点池（对象池减少GC） ──
    this._nodePool = [];

    // 路径缓存: key = "startX,startZ,endX,endZ,size" → path[]
    this._cache = new Map();
    this._cacheOrder = [];
  }

  // ── 更新地形（如地形破坏） ──
  setWalkable(gx, gz, walkable) {
    if (gz >= 0 && gz < this.height && gx >= 0 && gx < this.width) {
      this.walkable[gz][gx] = walkable;
    }
    this._cache.clear();
    this._cacheOrder.length = 0;
  }

  // ── 添加临时障碍（如建筑/移动单位） ──
  addTemporaryObstacle(gx, gz) {
    if (gz >= 0 && gz < this.height && gx >= 0 && gx < this.width) {
      this.walkable[gz][gx] = false;
    }
  }

  removeTemporaryObstacle(gx, gz) {
    if (gz >= 0 && gz < this.height && gx >= 0 && gx < this.width) {
      this.walkable[gz][gx] = true;
    }
  }

  // ═══════════════════════════════════════════
  // A* 核心算法
  // ═══════════════════════════════════════════

  /**
   * 寻路主入口
   * @param {{x: number, z: number}} start - 世界坐标起点
   * @param {{x: number, z: number}} end   - 世界坐标终点
   * @param {number} [unitSize=1] - 单位碰撞半径（格数），大单位需更宽通道
   * @returns {Array<{x: number, z: number}>|null} 世界坐标路径点数组，无路返回null
   */
  findPath(start, end, unitSize = 1) {
    const startGrid = worldToGrid(start.x, start.z);
    const endGrid = worldToGrid(end.x, end.z);
    const size = Math.ceil(unitSize);

    // 检查缓存
    const cacheKey = `${startGrid.gx},${startGrid.gz},${endGrid.gx},${endGrid.gz},${size}`;
    const cached = this._cache.get(cacheKey);
    if (cached) return cached;

    // 检查起点终点可通行性
    if (!this._isWalkableForSize(endGrid.gx, endGrid.gz, size)) {
      // 尝试在终点附近找最近可通行点
      const alt = this._findNearestWalkable(endGrid.gx, endGrid.gz, size, 10);
      if (!alt) return null;
      endGrid.gx = alt.gx;
      endGrid.gz = alt.gz;
    }
    if (!this._isWalkableForSize(startGrid.gx, startGrid.gz, size)) {
      const alt = this._findNearestWalkable(startGrid.gx, startGrid.gz, size, 10);
      if (!alt) return null;
      startGrid.gx = alt.gx;
      startGrid.gz = alt.gz;
    }

    const path = this._astar(startGrid.gx, startGrid.gz, endGrid.gx, endGrid.gz, size);
    if (!path) return null;

    // 转换为世界坐标并平滑
    const worldPath = path.map(p => gridToWorld(p.gx, p.gz));
    const smoothed = this._smoothPath(worldPath);

    // 写入缓存
    this._cachePath(cacheKey, smoothed);

    return smoothed;
  }

  /**
   * A*算法实现
   * @returns {Array<{gx: number, gz: number}>|null} 格子路径
   */
  _astar(sx, sz, ex, ez, unitSize) {
    const open = new MinHeap();
    const closed = new Set();
    const nodes = new Map(); // key="gx,gz" → node
    const startNode = this._acquireNode(sx, sz);
    startNode.g = 0;
    startNode.h = this._heuristic(sx, sz, ex, ez);
    startNode.f = startNode.h;
    startNode.open = true;
    nodes.set(`${sx},${sz}`, startNode);
    open.push(startNode);

    let searched = 0;

    while (open.size > 0 && searched < this.maxSearchNodes) {
      const current = open.pop();
      const curKey = `${current.gx},${current.gz}`;

      if (current.gx === ex && current.gz === ez) {
        // 回溯路径
        const path = this._reconstructPath(current);
        // 清理所有节点
        for (const n of nodes.values()) this._releaseNode(n);
        return path;
      }

      closed.add(curKey);
      current.open = false;
      searched++;

      for (const dir of DIRS) {
        const nx = current.gx + dir.dx;
        const nz = current.gz + dir.dz;
        const nKey = `${nx},${nz}`;

        // 跳过已访问
        if (closed.has(nKey)) continue;

        // 检查可通行（考虑单位碰撞体积）
        if (!this._isWalkableForSize(nx, nz, unitSize)) continue;

        // 斜向移动时检查对角是否被堵（防止穿墙角）
        if (dir.dx !== 0 && dir.dz !== 0) {
          if (!this._isWalkableForSize(current.gx + dir.dx, current.gz, unitSize) ||
              !this._isWalkableForSize(current.gx, current.gz + dir.dz, unitSize)) {
            continue;
          }
        }

        const tentativeG = current.g + dir.cost;

        let neighbor = nodes.get(nKey);
        if (!neighbor) {
          neighbor = this._acquireNode(nx, nz);
          nodes.set(nKey, neighbor);
        }

        if (tentativeG < neighbor.g) {
          neighbor.parent = current;
          neighbor.g = tentativeG;
          neighbor.h = this._heuristic(nx, nz, ex, ez);
          neighbor.f = neighbor.g + neighbor.h;

          if (!neighbor.open) {
            neighbor.open = true;
            open.push(neighbor);
          }
        }
      }
    }

    // 未找到路径，清理
    for (const n of nodes.values()) this._releaseNode(n);
    return null;
  }

  // ── 启发式函数（Octile距离） ──
  _heuristic(ax, az, bx, bz) {
    const dx = Math.abs(ax - bx);
    const dz = Math.abs(az - bz);
    // Octile distance: 允许斜向移动的最优启发式
    return Math.max(dx, dz) + 0.414 * Math.min(dx, dz);
  }

  // ── 回溯重建路径 ──
  _reconstructPath(node) {
    const path = [];
    let current = node;
    while (current) {
      path.push({ gx: current.gx, gz: current.gz });
      current = current.parent;
    }
    path.reverse();
    return path;
  }

  // ── 检查格子是否对指定大小单位可通行 ──
  _isWalkableForSize(gx, gz, size) {
    // 基础检查：格子在地图内且地形可通行
    if (gx < 0 || gx >= this.width || gz < 0 || gz >= this.height) return false;

    // 对于大小为1的单位，只需检查中心格
    if (size <= 1) return this.walkable[gz][gx];

    // 大单位：检查以中心为原点的碰撞框内所有格子
    const half = Math.floor(size / 2);
    for (let dz = -half; dz <= half; dz++) {
      for (let dx = -half; dx <= half; dx++) {
        const cx = gx + dx;
        const cz = gz + dz;
        if (cx < 0 || cx >= this.width || cz < 0 || cz >= this.height) return false;
        if (!this.walkable[cz][cx]) return false;
      }
    }
    return true;
  }

  // ── 查找最近的可通行格子 ──
  _findNearestWalkable(gx, gz, size, maxRadius) {
    for (let r = 1; r <= maxRadius; r++) {
      for (let dz = -r; dz <= r; dz++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.abs(dx) !== r && Math.abs(dz) !== r) continue; // 只检查边界
          if (this._isWalkableForSize(gx + dx, gz + dz, size)) {
            return { gx: gx + dx, gz: gz + dz };
          }
        }
      }
    }
    return null;
  }

  // ═══════════════════════════════════════════
  // 路径平滑化
  // ═══════════════════════════════════════════

  /**
   * 去除冗余拐点，使用视线检测（LOS）简化路径
   * @param {Array<{x: number, z: number}>} path
   * @returns {Array<{x: number, z: number}>}
   */
  _smoothPath(path) {
    if (!path || path.length <= 2) return path;

    const smoothed = [path[0]];
    let current = 0;

    while (current < path.length - 1) {
      // 尝试跳过中间点，直接连到最远可达点
      let farthest = current + 1;
      for (let test = path.length - 1; test > current + 1; test--) {
        if (this._hasLineOfSight(path[current], path[test])) {
          farthest = test;
          break;
        }
      }
      smoothed.push(path[farthest]);
      current = farthest;
    }

    return smoothed;
  }

  // ── 视线检测（Bresenham简化版） ──
  _hasLineOfSight(a, b) {
    const startGrid = worldToGrid(a.x, a.z);
    const endGrid = worldToGrid(b.x, b.z);
    return this._bresenhamWalkable(startGrid.gx, startGrid.gz, endGrid.gx, endGrid.gz);
  }

  _bresenhamWalkable(x0, z0, x1, z1) {
    let dx = Math.abs(x1 - x0);
    let dz = Math.abs(z1 - z0);
    const sx = x0 < x1 ? 1 : -1;
    const sz = z0 < z1 ? 1 : -1;
    let err = dx - dz;

    while (true) {
      if (x0 >= 0 && x0 < this.width && z0 >= 0 && z0 < this.height) {
        if (!this.walkable[z0][x0]) return false;
      } else {
        return false;
      }

      if (x0 === x1 && z0 === z1) break;

      const e2 = 2 * err;
      if (e2 > -dz) { err -= dz; x0 += sx; }
      if (e2 < dx) { err += dx; z0 += sz; }
    }
    return true;
  }

  // ═══════════════════════════════════════════
  // 缓存管理
  // ═══════════════════════════════════════════

  _cacheKey(sx, sz, ex, ez, size) {
    return `${sx},${sz},${ex},${ez},${size}`;
  }

  _cachePath(key, path) {
    if (this._cache.size >= this.cacheSize) {
      const oldest = this._cacheOrder.shift();
      this._cache.delete(oldest);
    }
    this._cache.set(key, path);
    this._cacheOrder.push(key);
  }

  clearCache() {
    this._cache.clear();
    this._cacheOrder.length = 0;
  }

  /**
   * 从实例节点池获取一个节点
   * @private
   */
  _acquireNode(gx, gz) {
    const node = this._nodePool.length > 0 ? this._nodePool.pop() : {};
    node.gx = gx;
    node.gz = gz;
    node.g = Infinity;
    node.h = 0;
    node.f = Infinity;
    node.parent = null;
    node.open = false;
    return node;
  }

  /**
   * 归还节点到实例节点池
   * @private
   */
  _releaseNode(node) {
    node.parent = null;
    node.open = false;
    this._nodePool.push(node);
  }
}

// ═══════════════════════════════════════════
// WebWorker 兼容层
// ═══════════════════════════════════════════

/**
 * WebWorker 入口函数
 * 在Worker线程中运行，通过消息收发与主线程通信
 *
 * 主线程 → Worker 消息格式:
 *   { type: 'init', width, height, walkable }
 *   { type: 'findPath', id, start: {x,z}, end: {x,z}, unitSize }
 *   { type: 'setWalkable', gx, gz, walkable }
 *   { type: 'clearCache' }
 *
 * Worker → 主线程 消息格式:
 *   { type: 'pathResult', id, path }
 *   { type: 'error', id, message }
 */
let pathfinder = null;

export function workerMessageHandler(event) {
  const msg = event.data;

  switch (msg.type) {
    case 'init':
      pathfinder = new Pathfinding(msg.width, msg.height, msg.walkable, msg.options);
      break;

    case 'findPath':
      if (!pathfinder) {
        self.postMessage({ type: 'error', id: msg.id, message: 'Pathfinder not initialized' });
        return;
      }
      try {
        const path = pathfinder.findPath(msg.start, msg.end, msg.unitSize || 1);
        self.postMessage({ type: 'pathResult', id: msg.id, path });
      } catch (e) {
        self.postMessage({ type: 'error', id: msg.id, message: e.message });
      }
      break;

    case 'setWalkable':
      if (pathfinder) pathfinder.setWalkable(msg.gx, msg.gz, msg.walkable);
      break;

    case 'clearCache':
      if (pathfinder) pathfinder.clearCache();
      break;
  }
}

// 如果在Worker环境中运行
if (typeof self !== 'undefined' && typeof window === 'undefined') {
  self.addEventListener('message', workerMessageHandler);
}

export default Pathfinding;
