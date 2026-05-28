// ═══════════════════════════════════════════════════════════════
// StarCraft Web - 实例化渲染池
// 基于 THREE.InstancedMesh 的对象池，动态管理批量实例渲染
// ═══════════════════════════════════════════════════════════════

import * as THREE from 'three';

/**
 * 实例化渲染池
 * 封装 THREE.InstancedMesh，提供动态增减实例、批量变换矩阵更新、
 * 空闲 ID 复用等功能，显著减少 draw calls。
 */
export class InstancedMeshPool {
  /**
   * @param {THREE.BufferGeometry} geometry - 共享几何体
   * @param {THREE.Material} material - 共享材质
   * @param {number} maxCount - 最大实例数上限
   */
  constructor(geometry, material, maxCount) {
    this.maxCount = maxCount;

    /** @type {THREE.InstancedMesh} 底层 instancedMesh */
    this.mesh = new THREE.InstancedMesh(geometry, material, maxCount);
    this.mesh.count = 0; // 初始无实例

    // 默认变换矩阵（单位矩阵）
    this._defaultMatrix = new THREE.Matrix4();

    /**
     * 已使用的实例 ID 集合
     * @type {Set<number>}
     */
    this._usedIds = new Set();

    /**
     * 空闲 ID 栈（用于复用已移除的 ID）
     * @type {number[]}
     */
    this._freeIds = [];

    /**
     /** ID → 实例索引的映射
      * @type {Map<number, number>}
      */
     this._idToIndex = new Map();

     /**
      * 实例索引 → ID 的反向映射（O(1) swap-delete 查找）
      * @type {Map<number, number>}
      */
     this._indexToId = new Map();

    /**
     * 当前活跃实例数量
     * @type {number}
     */
    this._activeCount = 0;

    /**
     * 自增 ID 计数器
     * @type {number}
     */
    this._nextId = 1;
  }

  /**
   * 添加一个实例
   * @param {THREE.Matrix4} [transform] - 变换矩阵（默认为单位矩阵）
   * @returns {number} 分配的实例 ID
   * @throws 当实例数超过 maxCount 时抛出错误
   */
  addInstance(transform) {
    if (this._activeCount >= this.maxCount) {
      throw new Error(
        `[InstancedMeshPool] 已达最大实例数 ${this.maxCount}，无法添加更多实例`
      );
    }

    // 分配 ID：优先复用空闲 ID
    let id;
    if (this._freeIds.length > 0) {
      id = this._freeIds.pop();
    } else {
      id = this._nextId++;
    }

    const index = this._activeCount;
    this._usedIds.add(id);
    this._idToIndex.set(id, index);
    this._indexToId.set(index, id);

    // 设置变换矩阵
    const matrix = transform || this._defaultMatrix;
    this.mesh.setMatrixAt(index, matrix);

    this._activeCount++;
    this.mesh.count = this._activeCount;
    this.mesh.instanceMatrix.needsUpdate = true;

    return id;
  }

  /**
   * 移除一个实例（通过 ID）
   * 使用"交换删除"策略：将最后一个实例移到被删除位置，O(1) 复杂度
   * @param {number} id - 要移除的实例 ID
   */
  removeInstance(id) {
    if (!this._usedIds.has(id)) return;

    const removeIndex = this._idToIndex.get(id);

    const lastIndex = this._activeCount - 1;
    if (removeIndex !== lastIndex) {
      const tempMatrix = new THREE.Matrix4();
      this.mesh.getMatrixAt(lastIndex, tempMatrix);
      this.mesh.setMatrixAt(removeIndex, tempMatrix);
      // O(1) 反向映射查找被移动的实例 ID
      const movedId = this._indexToId.get(lastIndex);
      this._idToIndex.set(movedId, removeIndex);
      this._indexToId.set(removeIndex, movedId);
    }

    // 清理被删除 ID
    this._usedIds.delete(id);
    this._idToIndex.delete(id);
    this._indexToId.delete(lastIndex);
    this._freeIds.push(id);

    this._activeCount--;
    this.mesh.count = this._activeCount;
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  /**
   * 更新指定实例的变换矩阵
   * @param {number} id - 实例 ID
   * @param {THREE.Matrix4} transform - 新的变换矩阵
   */
  updateInstance(id, transform) {
    const index = this._idToIndex.get(id);
    if (index === undefined) return;

    this.mesh.setMatrixAt(index, transform);
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  /**
   * 获取底层 InstancedMesh 对象
   * @returns {THREE.InstancedMesh}
   */
  getMesh() {
    return this.mesh;
  }

  /**
   * 获取当前活跃实例数量
   * @returns {number}
   */
  getActiveCount() {
    return this._activeCount;
  }

  /**
   * 释放所有 GPU 资源
   */
  dispose() {
    if (this.mesh) {
      this.mesh.dispose();
      this.mesh = null;
    }
    this._usedIds.clear();
    this._idToIndex.clear();
    this._indexToId.clear();
    this._freeIds.length = 0;
    this._activeCount = 0;
  }
}

export default InstancedMeshPool;
