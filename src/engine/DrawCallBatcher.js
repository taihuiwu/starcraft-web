// ═══════════════════════════════════════════════════════════════
// StarCraft Web - Draw Call 批量合并器
// 将相同材质的单位合并为 InstancedMesh，显著减少 draw calls
// ═══════════════════════════════════════════════════════════════

import * as THREE from 'three';
import InstancedMeshPool from './InstancedMeshPool.js';

/**
 * 材质批次
 * 管理同一 geometry+material 组合的所有实例化单元
 * @typedef {object} MaterialBatch
 * @property {string} key - 批次唯一标识 (geometry.uuid + '|' + material.uuid)
 * @property {InstancedMeshPool} pool - 底层实例化渲染池
 * @property {Map<number, number>} unitToId - unit.id → instancedId 映射
 * @property {THREE.Object3D} group - 管理这批实例的 Object3D 容器
 */

/**
 * Draw Call 批量合并管理器
 * 将相同 geometry + material 的单位合并为 InstancedMesh 实例化渲染，
 * 显著减少 draw calls。每个材质组合维护一个 InstancedMeshPool。
 *
 * 用法示例:
 *   const batcher = new DrawCallBatcher();
 *   batcher.addUnit(unit, geometry, material);
 *   // 在渲染循环中：
 *   batcher.updateTransforms(unitPositions);
 *   batcher.render(renderer);
 */
export class DrawCallBatcher {
  /**
   * @param {object} [options] - 配置选项
   * @param {number} [options.defaultMaxInstances=256] - 每个批次默认最大实例数
   * @param {boolean} [options.autoAddToScene=true] - 是否自动将 batch mesh 添加到场景
   */
  constructor(options = {}) {
    /** @type {number} 每个批次默认最大实例数 */
    this.defaultMaxInstances = options.defaultMaxInstances || 256;

    /** @type {boolean} 是否自动将 batch mesh 添加到场景 */
    this.autoAddToScene = options.autoAddToScene !== false;

    /**
     * 所有活跃批次
     * @type {Map<string, MaterialBatch>}
     */
    this._batches = new Map();

    /**
     * unit.id → batch key 映射（快速查找单位所属批次）
     * @type {Map<number, string>}
     */
    this._unitBatchMap = new Map();

    /**
     * 场景引用（调用 addToScene 时设置）
     * @type {THREE.Scene|null}
     */
    this._scene = null;

    /**
     * 全局实例 ID 计数器
     * @type {number}
     */
    this._nextGlobalId = 1;

    /**
     * 统计信息
     * @type {{ totalBatches: number, totalInstances: number, totalDrawCalls: number }}
     */
    this.stats = {
      totalBatches: 0,
      totalInstances: 0,
      totalDrawCalls: 0,
    };
  }

  /**
   * 设置场景引用（用于自动添加 instanced mesh 到场景）
   * @param {THREE.Scene} scene
   */
  setScene(scene) {
    this._scene = scene;
  }

  /**
   * 生成材质批次的唯一键
   * @param {THREE.BufferGeometry} geometry
   * @param {THREE.Material} material
   * @returns {string}
   * @private
   */
  _getBatchKey(geometry, material) {
    return `${geometry.uuid || 'default'}|${material.uuid || 'default'}`;
  }

  /**
   * 获取或创建一个材质批次
   * @param {string} key - 批次唯一键
   * @param {THREE.BufferGeometry} geometry
   * @param {THREE.Material} material
   * @returns {MaterialBatch}
   * @private
   */
  _getOrCreateBatch(key, geometry, material) {
    if (this._batches.has(key)) {
      return this._batches.get(key);
    }

    // 创建新的 InstancedMeshPool
    const pool = new InstancedMeshPool(geometry, material, this.defaultMaxInstances);
    const group = new THREE.Group();
    group.name = `batch_${key}`;
    group.add(pool.getMesh());

    const batch = {
      key,
      pool,
      unitToId: new Map(),
      group,
    };

    this._batches.set(key, batch);
    this.stats.totalBatches = this._batches.size;

    // 自动添加到场景
    if (this.autoAddToScene && this._scene) {
      this._scene.add(group);
    }

    return batch;
  }

  /**
   * 将一个单位添加到实例化渲染批次
   * @param {object} unit - 单位实例（需要有 id 属性和 position 属性）
   * @param {THREE.BufferGeometry} geometry - 共享几何体
   * @param {THREE.Material} material - 共享材质
   * @param {THREE.Matrix4} [transform] - 初始变换矩阵
   * @returns {number} 实例 ID（用于后续更新/移除）
   * @throws 当批次已满且无法扩展时抛出错误
   */
  addUnit(unit, geometry, material, transform) {
    if (!unit || !unit.id) {
      throw new Error('[DrawCallBatcher] unit 必须包含 id 属性');
    }

    // 如果单位已在某批次中，先移除
    if (this._unitBatchMap.has(unit.id)) {
      this.removeUnit(unit);
    }

    const key = this._getBatchKey(geometry, material);
    const batch = this._getOrCreateBatch(key, geometry, material);

    // 计算初始变换矩阵
    const matrix = transform || this._buildTransformMatrix(unit);
    const instanceId = batch.pool.addInstance(matrix);

    batch.unitToId.set(unit.id, instanceId);
    this._unitBatchMap.set(unit.id, key);

    this._updateStats();
    return instanceId;
  }

  /**
   * 从批次中移除一个单位
   * @param {object} unit - 单位实例（需要有 id 属性）
   */
  removeUnit(unit) {
    if (!unit || !unit.id) return;

    const key = this._unitBatchMap.get(unit.id);
    if (!key) return;

    const batch = this._batches.get(key);
    if (!batch) return;

    const instanceId = batch.unitToId.get(unit.id);
    if (instanceId !== undefined) {
      batch.pool.removeInstance(instanceId);
      batch.unitToId.delete(unit.id);
    }

    this._unitBatchMap.delete(unit.id);

    // 如果批次为空，移除整个批次
    if (batch.pool.getActiveCount() === 0) {
      this._removeBatch(key);
    }

    this._updateStats();
  }

  /**
   * 更新指定单位的变换矩阵
   * @param {object} unit - 单位实例（需要有 id 和 position 属性）
   * @param {THREE.Matrix4} [transform] - 新的变换矩阵（可选，不传则根据 unit.position 重建）
   */
  updateUnit(unit, transform) {
    if (!unit || !unit.id) return;

    const key = this._unitBatchMap.get(unit.id);
    if (!key) return;

    const batch = this._batches.get(key);
    if (!batch) return;

    const instanceId = batch.unitToId.get(unit.id);
    if (instanceId === undefined) return;

    const matrix = transform || this._buildTransformMatrix(unit);
    batch.pool.updateInstance(instanceId, matrix);
  }

  /**
   * 批量更新所有单位的变换矩阵
   * 适用于每帧批量同步位置
   * @param {Map<number, THREE.Matrix4>|object} transforms - unit.id → Matrix4 的映射
   */
  updateAllTransforms(transforms) {
    if (!transforms) return;

    for (const [unitId, matrix] of transforms) {
      const key = this._unitBatchMap.get(unitId);
      if (!key) continue;

      const batch = this._batches.get(key);
      if (!batch) continue;

      const instanceId = batch.unitToId.get(unitId);
      if (instanceId !== undefined) {
        batch.pool.updateInstance(instanceId, matrix);
      }
    }
  }

  /**
   * 根据单位的 position 属性构建变换矩阵
   * @param {object} unit - 单位实例
   * @returns {THREE.Matrix4}
   * @private
   */
  _buildTransformMatrix(unit) {
    const pos = unit.position || { x: 0, y: 0, z: 0 };
    const matrix = new THREE.Matrix4();
    const scale = unit.scale || 1;
    matrix.compose(
      new THREE.Vector3(pos.x || 0, pos.y || 0, pos.z || 0),
      new THREE.Quaternion(), // 默认朝向
      new THREE.Vector3(scale, scale, scale),
    );
    return matrix;
  }

  /**
   * 移除整个批次
   * @param {string} key - 批次唯一键
   * @private
   */
  _removeBatch(key) {
    const batch = this._batches.get(key);
    if (!batch) return;

    // 从场景移除
    if (this._scene && batch.group.parent === this._scene) {
      this._scene.remove(batch.group);
    }

    // 释放 GPU 资源
    batch.pool.dispose();
    this._batches.delete(key);
    this.stats.totalBatches = this._batches.size;
  }

  /**
   * 更新统计信息
   * @private
   */
  _updateStats() {
    let totalInstances = 0;
    for (const batch of this._batches.values()) {
      totalInstances += batch.pool.getActiveCount();
    }
    this.stats.totalInstances = totalInstances;
    this.stats.totalDrawCalls = this._batches.size; // 每个批次 = 1 个 draw call
  }

  /**
   * 获取当前总 draw calls 数（每个材质批次 = 1 个 draw call）
   * @returns {number}
   */
  getDrawCallCount() {
    return this._batches.size;
  }

  /**
   * 获取当前总实例数
   * @returns {number}
   */
  getTotalInstanceCount() {
    let total = 0;
    for (const batch of this._batches.values()) {
      total += batch.pool.getActiveCount();
    }
    return total;
  }

  /**
   * 获取所有批次的 InstancedMesh（用于渲染）
   * @returns {THREE.InstancedMesh[]}
   */
  getBatchMeshes() {
    const meshes = [];
    for (const batch of this._batches.values()) {
      meshes.push(batch.pool.getMesh());
    }
    return meshes;
  }

  /**
   * 检查单位是否在某个批次中
   * @param {object} unit - 单位实例
   * @returns {boolean}
   */
  hasUnit(unit) {
    return unit && unit.id && this._unitBatchMap.has(unit.id);
  }

  /**
   * 获取单位所属的批次信息
   * @param {object} unit - 单位实例
   * @returns {{ key: string, instanceId: number } | null}
   */
  getUnitInfo(unit) {
    if (!unit || !unit.id) return null;
    const key = this._unitBatchMap.get(unit.id);
    if (!key) return null;
    const batch = this._batches.get(key);
    if (!batch) return null;
    return { key, instanceId: batch.unitToId.get(unit.id) };
  }

  /**
   * 清空所有批次
   */
  clear() {
    for (const [key, batch] of this._batches) {
      if (this._scene && batch.group.parent === this._scene) {
        this._scene.remove(batch.group);
      }
      batch.pool.dispose();
    }
    this._batches.clear();
    this._unitBatchMap.clear();
    this._updateStats();
  }

  /**
   * 释放所有 GPU 资源
   */
  dispose() {
    this.clear();
    this._scene = null;
  }
}

export default DrawCallBatcher;
