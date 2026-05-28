// ═══════════════════════════════════════════════════════════════
// StarCraft Web - 四叉树空间分区
// 2D 空间查询优化：范围查询 + 最近邻查询 + 节点分裂与合并
// ═══════════════════════════════════════════════════════════════

/**
 * 矩形边界定义
 */
export class Bounds {
  /**
   * @param {number} x - 左上角 X
   * @param {number} y - 左上角 Y
   * @param {number} width - 宽度
   * @param {number} height - 高度
   */
  constructor(x, y, width, height) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  /**
   * 检查一个点是否在此边界内
   * @param {{ x: number, y: number }} point
   * @returns {boolean}
   */
  containsPoint(point) {
    return (
      point.x >= this.x &&
      point.x <= this.x + this.width &&
      point.y >= this.y &&
      point.y <= this.y + this.height
    );
  }

  /**
   * 检查另一个边界是否与此边界相交
   * @param {Bounds} range
   * @returns {boolean}
   */
  intersects(range) {
    return !(
      range.x > this.x + this.width ||
      range.x + range.width < this.x ||
      range.y > this.y + this.height ||
      range.y + range.height < this.y
    );
  }
}

/**
 * 四叉树节点（内部使用）
 */
class QuadtreeNode {
  /**
   * @param {Bounds} bounds - 此节点的空间边界
   * @param {number} maxObjects - 分裂前最大对象数
   * @param {number} maxLevels - 最大递归深度
   * @param {number} level - 当前层级
   */
  constructor(bounds, maxObjects, maxLevels, level) {
    this.bounds = bounds;
    this.maxObjects = maxObjects;
    this.maxLevels = maxLevels;
    this.level = level;
    this.objects = [];
    this.children = null; // [NW, NE, SW, SE] 或 null
  }

  /**
   * 将此节点分裂为四个子节点
   */
  split() {
    const { x, y, width, height } = this.bounds;
    const halfW = width / 2;
    const halfH = height / 2;
    const nextLevel = this.level + 1;

    this.children = [
      new QuadtreeNode(new Bounds(x, y, halfW, halfH), this.maxObjects, this.maxLevels, nextLevel),               // NW
      new QuadtreeNode(new Bounds(x + halfW, y, halfW, halfH), this.maxObjects, this.maxLevels, nextLevel),        // NE
      new QuadtreeNode(new Bounds(x, y + halfH, halfW, halfH), this.maxObjects, this.maxLevels, nextLevel),        // SW
      new QuadtreeNode(new Bounds(x + halfW, y + halfH, halfW, halfH), this.maxObjects, this.maxLevels, nextLevel), // SE
    ];
  }

  /**
   * 确定对象应放入哪个子节点
   * @param {{ x: number, y: number }} point
   * @returns {number} 0=NW, 1=NE, 2=SW, 3=SE, -1=不完全在任何子节点中
   */
  getIndex(point) {
    const midX = this.bounds.x + this.bounds.width / 2;
    const midY = this.bounds.y + this.bounds.height / 2;

    const topHalf = point.y <= midY;
    const leftHalf = point.x <= midX;

    if (topHalf && leftHalf) return 0; // NW
    if (topHalf && !leftHalf) return 1; // NE
    if (!topHalf && leftHalf) return 2; // SW
    return 3; // SE
  }
}

/**
 * 四叉树空间分区系统
 * 提供高效的 2D 空间查询：插入/删除/范围查询/最近邻查询
 */
export class Quadtree {
  /**
   * @param {Bounds} bounds - 四叉树的总边界
   * @param {number} [maxObjects=8] - 单个节点分裂前的最大对象数
   * @param {number} [maxLevels=6] - 最大递归深度
   */
  constructor(bounds, maxObjects = 8, maxLevels = 6) {
    this.root = new QuadtreeNode(bounds, maxObjects, maxLevels, 0);
  }

  /**
   * 插入一个对象到四叉树
   * @param {{ x: number, y: number, [key: string]: any }} object - 必须包含 x, y 坐标
   */
  insert(object) {
    this._insertNode(this.root, object);
  }

  /**
   * 在指定节点中插入对象（递归）
   * @param {QuadtreeNode} node
   * @param {object} object
   * @private
   */
  _insertNode(node, object) {
    // 如果有子节点，尝试放入子节点
    if (node.children) {
      const index = node.getIndex(object);
      if (index !== -1) {
        this._insertNode(node.children[index], object);
        return;
      }
      // 对象跨越多个子节点，留在当前节点
      node.objects.push(object);
      return;
    }

    // 叶子节点
    node.objects.push(object);

    // 超过容量且未达到最大层级 → 分裂
    if (node.objects.length > node.maxObjects && node.level < node.maxLevels) {
      if (!node.children) {
        node.split();

        // 重新分配对象到子节点
        let i = 0;
        while (i < node.objects.length) {
          const obj = node.objects[i];
          const index = node.getIndex(obj);
          if (index !== -1) {
            this._insertNode(node.children[index], obj);
            node.objects.splice(i, 1);
          } else {
            i++;
          }
        }
      }
    }
  }

  /**
   * 从四叉树移除一个对象
   * @param {{ x: number, y: number }} object
   */
  remove(object) {
    this._removeNode(this.root, object);
  }

  /**
   * 在指定节点中移除对象（递归）
   * @param {QuadtreeNode} node
   * @param {object} object
   * @returns {boolean} 是否成功移除
   * @private
   */
  _removeNode(node, object) {
    // 在当前节点的对象列表中查找
    const idx = node.objects.indexOf(object);
    if (idx !== -1) {
      node.objects.splice(idx, 1);
      this._tryMerge(node);
      return true;
    }

    // 递归子节点
    if (node.children) {
      const childIdx = node.getIndex(object);
      if (childIdx !== -1) {
        return this._removeNode(node.children[childIdx], object);
      }
      // 对象不在任何子节点中（可能跨越多节点），不在这里
    }

    return false;
  }

  /**
   * 尝试合并子节点回当前节点（当子节点总对象数低于阈值时）
   * @param {QuadtreeNode} node
   * @private
   */
  _tryMerge(node) {
    if (!node.children) return;

    // 计算所有子节点的总对象数
    let totalObjects = node.objects.length;
    for (const child of node.children) {
      totalObjects += child.objects.length;
    }

    // 如果总对象数低于阈值，合并子节点
    if (totalObjects <= node.maxObjects) {
      for (const child of node.children) {
        node.objects.push(...child.objects);
      }
      node.children = null;
    }
  }

  /**
   * 范围查询：查找与给定矩形相交的所有对象
   * @param {Bounds} range - 查询范围
   * @returns {object[]} 范围内的对象数组
   */
  queryRange(range) {
    const results = [];
    this._queryRangeNode(this.root, range, results);
    return results;
  }

  /**
   * 在节点中执行范围查询（递归）
   * @param {QuadtreeNode} node
   * @param {Bounds} range
   * @param {object[]} results
   * @private
   */
  _queryRangeNode(node, range, results) {
    // 边界检查：节点范围与查询范围不相交则跳过
    if (!node.bounds.intersects(range)) return;

    // 收集当前节点中的对象
    for (let i = 0; i < node.objects.length; i++) {
      const obj = node.objects[i];
      if (range.containsPoint(obj)) {
        results.push(obj);
      }
    }

    // 递归子节点
    if (node.children) {
      for (let i = 0; i < 4; i++) {
        this._queryRangeNode(node.children[i], range, results);
      }
    }
  }

  /**
   * 最近邻查询：查找距离给定点最近的对象
   * @param {{ x: number, y: number }} point - 查询点
   * @param {number} [radius=Infinity] - 搜索半径
   * @returns {{ object: object, distance: number } | null} 最近的对象及其距离
   */
  queryNearest(point, radius = Infinity) {
    let best = null;
    let bestDist = radius * radius; // 使用平方距离避免开方

    this._queryNearestNode(this.root, point, best, bestDist);

    return best ? best : null;
  }

  /**
   * 在节点中执行最近邻查询（递归）
   * @param {QuadtreeNode} node
   * @param {{ x: number, y: number }} point
   * @param {{ object: object, distance: number } | null} best
   * @param {number} bestDistSq - 最佳距离的平方
   * @returns {{ object: object, distance: number } | null}
   * @private
   */
  _queryNearestNode(node, point, best, bestDistSq) {
    // 计算点到节点边界的最近距离（平方）
    const closestX = Math.max(node.bounds.x, Math.min(point.x, node.bounds.x + node.bounds.width));
    const closestY = Math.max(node.bounds.y, Math.min(point.y, node.bounds.y + node.bounds.height));
    const dx = point.x - closestX;
    const dy = point.y - closestY;
    const distToNodeSq = dx * dx + dy * dy;

    // 节点距离超过当前最佳距离则跳过
    if (distToNodeSq > bestDistSq) return best;

    // 检查当前节点中的对象
    for (let i = 0; i < node.objects.length; i++) {
      const obj = node.objects[i];
      const ox = obj.x - point.x;
      const oy = obj.y - point.y;
      const distSq = ox * ox + oy * oy;
      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        best = { object: obj, distance: Math.sqrt(distSq) };
      }
    }

    // 递归子节点
    if (node.children) {
      for (let i = 0; i < 4; i++) {
        best = this._queryNearestNode(node.children[i], point, best, bestDistSq);
        if (best) bestDistSq = best.distance * best.distance;
      }
    }

    return best;
  }

  /**
   * 清空四叉树
   */
  clear() {
    this.root.objects.length = 0;
    this.root.children = null;
  }

  /**
   * 获取树中存储的总对象数
   * @returns {number}
   */
  getCount() {
    return this._countNode(this.root);
  }

  /**
   * 递归计算节点及子节点中的对象数
   * @param {QuadtreeNode} node
   * @returns {number}
   * @private
   */
  _countNode(node) {
    let count = node.objects.length;
    if (node.children) {
      for (let i = 0; i < 4; i++) {
        count += this._countNode(node.children[i]);
      }
    }
    return count;
  }
}

export default Quadtree;
