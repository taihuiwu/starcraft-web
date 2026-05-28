// ═══════════════════════════════════════════════════════════════
// StarCraft Web - Level of Detail 管理系统
// 根据摄像机距离自动切换模型精度，支持3级LOD与过渡渐变
// ═══════════════════════════════════════════════════════════════

/**
 * LOD 模型等级枚举
 */
export const LOD_LEVEL = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
};

/**
 * Level of Detail 管理系统
 * 根据摄像机与物体的距离自动切换显示精度（高/中/低），
 * 使用平滑过渡避免 LOD 突变。
 */
export class LODSystem {
  /**
   * @param {object} camera - Three.js PerspectiveCamera（需要有 position 属性）
   */
  constructor(camera) {
    /** @type {object} 摄像机引用 */
    this.camera = camera;

    /**
     * 距离阈值：在此距离以内使用 HIGH，超过后依次 MEDIUM、LOW
     * @type {{ high: number, medium: number, low: number }}
     */
    this.distances = {
      high: 30,
      medium: 80,
      low: 150,
    };

    /**
     * 管理的 LOD 对象列表
     * 每个条目：{ object, levels: [highObj, mediumObj, lowObj], currentLevel, transition }
     * @type {Array<object>}
     */
    this._objects = [];

    /**
     * 过渡渐变的速度（0~1，越大过渡越快）
     * @type {number}
     */
    this.transitionSpeed = 3.0;
  }

  /**
   * 添加物体到 LOD 系统
   * @param {object} object - 用于距离计算的引用对象（需要有 position 属性）
   * @param {object[]} lodLevels - [highDetail, mediumDetail, lowDetail] 三个精度级别的 Three.js Object3D
   * @returns {number} LOD 条目索引
   */
  addObject(object, lodLevels) {
    const entry = {
      object,
      levels: lodLevels,
      currentLevel: LOD_LEVEL.HIGH,
      targetLevel: LOD_LEVEL.HIGH,
      transition: 0, // 0 = 完全显示 currentLevel, 1 = 已完成过渡
    };

    // 初始时只显示最高精度
    if (lodLevels[LOD_LEVEL.HIGH]) {
      lodLevels[LOD_LEVEL.HIGH].visible = true;
    }
    if (lodLevels[LOD_LEVEL.MEDIUM]) {
      lodLevels[LOD_LEVEL.MEDIUM].visible = false;
    }
    if (lodLevels[LOD_LEVEL.LOW]) {
      lodLevels[LOD_LEVEL.LOW].visible = false;
    }

    this._objects.push(entry);
    return this._objects.length - 1;
  }

  /**
   * 从 LOD 系统移除物体
   * @param {object} object - 之前添加的引用对象
   */
  removeObject(object) {
    const idx = this._objects.findIndex((e) => e.object === object);
    if (idx !== -1) {
      this._objects.splice(idx, 1);
    }
  }

  /**
   * 更新所有 LOD 对象
   * 根据与摄像机的距离计算目标 LOD 等级，并执行平滑过渡
   * @param {number} delta - 帧间隔时间（秒）
   */
  update(delta) {
    if (!this.camera) return;

    const camPos = this.camera.position;
    const transitionStep = this.transitionSpeed * delta;

    for (let i = 0; i < this._objects.length; i++) {
      const entry = this._objects[i];
      const objPos = entry.object.position;

      // 计算与摄像机的距离（仅使用 XZ 平面，忽略高度差异）
      const dx = camPos.x - objPos.x;
      const dz = camPos.z - objPos.z;
      const distance = Math.sqrt(dx * dx + dz * dz);

      // 确定目标 LOD 等级
      let targetLevel;
      if (distance < this.distances.high) {
        targetLevel = LOD_LEVEL.HIGH;
      } else if (distance < this.distances.medium) {
        targetLevel = LOD_LEVEL.MEDIUM;
      } else {
        targetLevel = LOD_LEVEL.LOW;
      }

      // 如果目标等级发生变化，开始过渡
      if (targetLevel !== entry.targetLevel) {
        entry.targetLevel = targetLevel;
        entry.transition = 0;
      }

      // 平滑过渡
      if (entry.transition < 1) {
        entry.transition = Math.min(1, entry.transition + transitionStep);

        // 如果过渡完成，切换 currentLevel
        if (entry.transition >= 1) {
          entry.currentLevel = entry.targetLevel;
        }
      }

      // 更新可见性和透明度
      this._updateVisibility(entry);
    }
  }

  /**
   * 根据当前过渡状态更新 LOD 对象的可见性和平滑过渡
   * @param {object} entry - LOD 条目
   * @private
   */
  _updateVisibility(entry) {
    const { levels, currentLevel, targetLevel, transition } = entry;

    // 在过渡期间，同时操作旧等级和新等级的显示
    if (transition < 1 && currentLevel !== targetLevel) {
      // 旧等级淡出
      const oldLevel = levels[currentLevel];
      if (oldLevel) {
        oldLevel.visible = true;
        // 使用 scale 渐变模拟淡出（避免透明度排序问题）
        const fadeOut = 1 - transition;
        oldLevel.scale.setScalar(fadeOut);
      }

      // 新等级淡入
      const newLevel = levels[targetLevel];
      if (newLevel) {
        newLevel.visible = true;
        newLevel.scale.setScalar(transition);
      }

      // 隐藏其他等级
      for (let l = 0; l < 3; l++) {
        if (l !== currentLevel && l !== targetLevel && levels[l]) {
          levels[l].visible = false;
          levels[l].scale.setScalar(1);
        }
      }
    } else {
      // 无过渡：仅显示目标等级
      for (let l = 0; l < 3; l++) {
        if (levels[l]) {
          levels[l].visible = (l === entry.currentLevel);
          levels[l].scale.setScalar(1);
        }
      }
    }
  }

  /**
   * 设置 LOD 距离阈值
   * @param {number} high - HIGH→MEDIUM 切换距离
   * @param {number} medium - MEDIUM→LOW 切换距离
   * @param {number} low - LOW 以外的距离上限（超出则不渲染，可选）
   */
  setDistances(high, medium, low) {
    this.distances.high = high;
    this.distances.medium = medium;
    this.distances.low = low;
  }

  /**
   * 获取当前管理的物体数量
   * @returns {number}
   */
  getCount() {
    return this._objects.length;
  }

  /**
   * 清空所有 LOD 物体
   */
  clear() {
    this._objects.length = 0;
  }

  /**
   * 销毁 LOD 系统
   */
  dispose() {
    this.clear();
    this.camera = null;
  }
}

export default LODSystem;
