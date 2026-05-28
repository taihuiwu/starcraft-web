// ═══════════════════════════════════════════════════════════════
// StarCraft Web - 寻路计算 Worker
// 在 WebWorker 中执行 A* 寻路算法
// 自包含文件，不依赖外部 ES modules
// ═══════════════════════════════════════════════════════════════

/**
 * A* 寻路算法实现
 * 支持 4 方向和 8 方向移动，使用二叉堆优化开放列表
 */

// ─── 二叉堆（最小堆）实现 ───

/**
 * 最小堆数据结构，用于 A* 开放列表的高效提取最小值
 */
class MinHeap {
  constructor() {
    /** @type {Array<object>} */
    this.data = [];
  }

  /**
   * 插入元素
   * @param {object} item - 必须有 f 属性作为优先级
   */
  push(item) {
    this.data.push(item);
    this._bubbleUp(this.data.length - 1);
  }

  /**
   * 提取最小元素
   * @returns {object | undefined}
   */
  pop() {
    if (this.data.length === 0) return undefined;
    const min = this.data[0];
    const last = this.data.pop();
    if (this.data.length > 0) {
      this.data[0] = last;
      this._sinkDown(0);
    }
    return min;
  }

  /** @returns {number} 堆大小 */
  get size() {
    return this.data.length;
  }

  /**
   * 向上冒泡
   * @param {number} idx
   * @private
   */
  _bubbleUp(idx) {
    while (idx > 0) {
      const parentIdx = (idx - 1) >> 1;
      if (this.data[idx].f < this.data[parentIdx].f) {
        [this.data[idx], this.data[parentIdx]] = [this.data[parentIdx], this.data[idx]];
        idx = parentIdx;
      } else {
        break;
      }
    }
  }

  /**
   * 向下沉降
   * @param {number} idx
   * @private
   */
  _sinkDown(idx) {
    const len = this.data.length;
    while (true) {
      let smallest = idx;
      const left = 2 * idx + 1;
      const right = 2 * idx + 2;

      if (left < len && this.data[left].f < this.data[smallest].f) {
        smallest = left;
      }
      if (right < len && this.data[right].f < this.data[smallest].f) {
        smallest = right;
      }
      if (smallest !== idx) {
        [this.data[idx], this.data[smallest]] = [this.data[smallest], this.data[idx]];
        idx = smallest;
      } else {
        break;
      }
    }
  }
}

// ─── A* 寻路 ───

/**
 * 8方向偏移量（含对角线）
 */
const DIRS_8 = [
  { dx: 0, dy: -1, cost: 1 },   // 上
  { dx: 1, dy: 0, cost: 1 },    // 右
  { dx: 0, dy: 1, cost: 1 },    // 下
  { dx: -1, dy: 0, cost: 1 },   // 左
  { dx: 1, dy: -1, cost: 1.414 },  // 右上
  { dx: 1, dy: 1, cost: 1.414 },   // 右下
  { dx: -1, dy: 1, cost: 1.414 },  // 左下
  { dx: -1, dy: -1, cost: 1.414 }, // 左上
];

/**
 * 4方向偏移量（不含对角线）
 */
const DIRS_4 = [
  { dx: 0, dy: -1, cost: 1 },
  { dx: 1, dy: 0, cost: 1 },
  { dx: 0, dy: 1, cost: 1 },
  { dx: -1, dy: 0, cost: 1 },
];

/**
 * 执行 A* 寻路
 * @param {{ x: number, y: number }} start - 起点坐标
 * @param {{ x: number, y: number }} end - 终点坐标
 * @param {Uint8Array[]} grid - 2D 可通行性网格 (1=可通行, 0=障碍)
 * @param {object} [options] - 可选配置
 * @param {boolean} [options.diagonal=true] - 是否允许对角线移动
 * @param {number} [options.maxIterations=10000] - 最大迭代次数
 * @returns {{ x: number, y: number }[]} 路径坐标数组（含起点和终点），无路径返回空数组
 */
function aStar(start, end, grid, options) {
  const diagonal = options && options.diagonal !== undefined ? options.diagonal : true;
  const maxIterations = options && options.maxIterations ? options.maxIterations : 10000;
  const dirs = diagonal ? DIRS_8 : DIRS_4;
  const gridHeight = grid.length;
  const gridWidth = grid[0] ? grid[0].length : 0;

  // 边界检查
  if (
    start.x < 0 || start.x >= gridWidth ||
    start.y < 0 || start.y >= gridHeight ||
    end.x < 0 || end.x >= gridWidth ||
    end.y < 0 || end.y >= gridHeight
  ) {
    return [];
  }

  // 起点或终点不可通行
  if (grid[start.y][start.x] === 0 || grid[end.y][end.x] === 0) {
    return [];
  }

  // 起点 == 终点
  if (start.x === end.x && start.y === end.y) {
    return [{ x: start.x, y: start.y }];
  }

  // 启发函数：八方向用 octile 距离，四方向用曼哈顿距离
  const heuristic = diagonal
    ? (ax, ay, bx, by) => {
      const dx = Math.abs(ax - bx);
      const dy = Math.abs(ay - by);
      return Math.max(dx, dy) + (1.414 - 1) * Math.min(dx, dy);
    }
    : (ax, ay, bx, by) => Math.abs(ax - bx) + Math.abs(ay - by);

  // 开放列表（最小堆）
  const open = new MinHeap();

  // 关闭集合（使用 Set 存储编码后的坐标）
  const closed = new Set();

  // g 值和父节点记录
  const gScore = new Map();
  const parent = new Map();

  const startKey = start.y * gridWidth + start.x;
  const endKey = end.y * gridWidth + end.x;

  gScore.set(startKey, 0);
  open.push({
    x: start.x,
    y: start.y,
    f: heuristic(start.x, start.y, end.x, end.y),
    g: 0,
  });

  let iterations = 0;

  while (open.size > 0 && iterations < maxIterations) {
    iterations++;

    const current = open.pop();
    const currentKey = current.y * gridWidth + current.x;

    // 已到达终点
    if (currentKey === endKey) {
      return _reconstructPath(parent, current, gridWidth);
    }

    // 已经处理过更优路径
    if (closed.has(currentKey)) continue;
    closed.add(currentKey);

    // 遍历邻居
    for (let d = 0; d < dirs.length; d++) {
      const dir = dirs[d];
      const nx = current.x + dir.dx;
      const ny = current.y + dir.dy;

      // 边界检查
      if (nx < 0 || nx >= gridWidth || ny < 0 || ny >= gridHeight) continue;

      const neighborKey = ny * gridWidth + nx;

      // 已关闭或不可通行
      if (closed.has(neighborKey)) continue;
      if (grid[ny][nx] === 0) continue;

      // 对角线移动时检查角落阻挡（防止穿墙）
      if (dir.dx !== 0 && dir.dy !== 0) {
        if (grid[current.y][current.x + dir.dx] === 0 ||
          grid[current.y + dir.dy][current.x] === 0) {
          continue;
        }
      }

      const tentativeG = current.g + dir.cost;
      const prevG = gScore.get(neighborKey);

      if (prevG === undefined || tentativeG < prevG) {
        gScore.set(neighborKey, tentativeG);
        parent.set(neighborKey, { x: current.x, y: current.y });
        open.push({
          x: nx,
          y: ny,
          f: tentativeG + heuristic(nx, ny, end.x, end.y),
          g: tentativeG,
        });
      }
    }
  }

  // 未找到路径
  return [];
}

/**
 * 从 parent 映射中重建路径
 * @param {Map<number, {x: number, y: number}>} parent
 * @param {{ x: number, y: number }} endNode
 * @param {number} gridWidth
 * @returns {{ x: number, y: number }[]}
 * @private
 */
function _reconstructPath(parent, endNode, gridWidth) {
  const path = [];
  let current = { x: endNode.x, y: endNode.y };
  const currentKey = current.y * gridWidth + current.x;

  path.push(current);

  let key = currentKey;
  while (parent.has(key)) {
    const p = parent.get(key);
    path.push(p);
    key = p.y * gridWidth + p.x;
  }

  // 反转路径（从起点到终点）
  path.reverse();
  return path;
}

// ─── Worker 消息处理 ───

/**
 * 处理来自主线程的消息
 */
self.onmessage = function (event) {
  const msg = event.data;

  if (msg.type === 'pathfind') {
    const { start, end, grid, options } = msg;
    const taskId = msg.taskId;

    try {
      // 将 Uint8Array 数据还原为二维数组访问
      const gridArray = grid;

      const path = aStar(start, end, gridArray, options || {});

      self.postMessage({
        type: 'pathresult',
        taskId: taskId,
        path: path,
      });
    } catch (err) {
      self.postMessage({
        type: 'pathresult',
        taskId: taskId,
        path: [],
        error: err.message || String(err),
      });
    }
  }
};
