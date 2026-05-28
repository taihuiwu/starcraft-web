// ═══════════════════════════════════════════
// StarCraft Web - 阵型系统 (Formation)
// 预设阵型、编队移动、自动阵型调整
// ═══════════════════════════════════════════

import { normalize2D, distance2D, angleToTarget } from '../shared/MathUtils.js';

// ── 预设阵型 ──
export const FORMATION_TYPE = {
  LINE: 'line',         // 横列
  COLUMN: 'column',     // 纵列
  SQUARE: 'square',     // 方形
  DIAMOND: 'diamond',   // 菱形
  CIRCLE: 'circle',     // 圆形
  WEDGE: 'wedge',       // 楔形（箭头）
  PHALANX: 'phalanx',   // 方阵
};

// ── 阵型间距（格子单位） ──
const FORMATION_SPACING = {
  [FORMATION_TYPE.LINE]: 1.2,
  [FORMATION_TYPE.COLUMN]: 1.2,
  [FORMATION_TYPE.SQUARE]: 1.3,
  [FORMATION_TYPE.DIAMOND]: 1.3,
  [FORMATION_TYPE.CIRCLE]: 1.5,
  [FORMATION_TYPE.WEDGE]: 1.3,
  [FORMATION_TYPE.PHALANX]: 1.2,
};

/**
 * Formation - 阵型系统
 * 管理编队移动时的阵型保持和自动调整
 */
export default class Formation {
  constructor() {
    /**
     * 活跃编队
     * @type {Map<number, FormationGroup>}
     */
    this.groups = new Map();
    this._nextGroupId = 1;
  }

  // ═══════════════════════════════════════
  // 编队管理
  // ═══════════════════════════════════════

  /**
   * 创建编队
   * @param {Array} units - 单位列表
   * @param {string} formationType - FORMATION_TYPE
   * @returns {number} 编队ID
   */
  createGroup(units, formationType = FORMATION_TYPE.LINE) {
    const groupId = this._nextGroupId++;
    const group = {
      id: groupId,
      units: [...units],
      formationType,
      targetPosition: null,
      moving: false,
      spacing: FORMATION_SPACING[formationType] || 1.2,
      anchorPosition: null,   // 锚点位置（编队中心）
      anchorAngle: 0,         // 锚点朝向
    };

    // 设置初始锚点为所有单位的中心
    group.anchorPosition = this._computeCenter(units);

    this.groups.set(groupId, group);
    return groupId;
  }

  /**
   * 移除编队
   * @param {number} groupId
   */
  removeGroup(groupId) {
    this.groups.delete(groupId);
  }

  /**
   * 添加单位到编队
   * @param {number} groupId
   * @param {Object} unit
   */
  addToGroup(groupId, unit) {
    const group = this.groups.get(groupId);
    if (group && !group.units.includes(unit)) {
      group.units.push(unit);
    }
  }

  /**
   * 从编队移除单位
   * @param {number} groupId
   * @param {Object} unit
   */
  removeFromGroup(groupId, unit) {
    const group = this.groups.get(groupId);
    if (group) {
      const idx = group.units.indexOf(unit);
      if (idx !== -1) group.units.splice(idx, 1);
      if (group.units.length === 0) {
        this.groups.delete(groupId);
      }
    }
  }

  /**
   * 获取编队
   * @param {number} groupId
   * @returns {FormationGroup|null}
   */
  getGroup(groupId) {
    return this.groups.get(groupId) || null;
  }

  // ═══════════════════════════════════════
  // 移动命令
  // ═══════════════════════════════════════

  /**
   * 按阵型移动编队到目标位置
   * @param {number} groupId
   * @param {{x: number, z: number}} targetPos - 目标位置
   * @param {number} [facingAngle] - 朝向角度（弧度）
   */
  moveTo(groupId, targetPos, facingAngle) {
    const group = this.groups.get(groupId);
    if (!group) return;

    group.targetPosition = { ...targetPos };
    group.moving = true;

    // 计算朝向（如果有目标则朝向目标方向）
    if (facingAngle !== undefined) {
      group.anchorAngle = facingAngle;
    } else if (group.anchorPosition) {
      group.anchorAngle = angleToTarget(group.anchorPosition, targetPos);
    }

    // 计算每个单位的阵型偏移位置
    const offsets = this._computeFormationOffsets(group.units.length, group.formationType, group.spacing);

    // 为每个单位设置目标位置
    for (let i = 0; i < group.units.length; i++) {
      const unit = group.units[i];
      if (!unit || !unit.alive) continue;

      const offset = offsets[i];
      if (!offset) continue;

      // 将偏移旋转到朝向角度
      const cos = Math.cos(group.anchorAngle);
      const sin = Math.sin(group.anchorAngle);
      const rotatedX = offset.x * cos - offset.z * sin;
      const rotatedZ = offset.x * sin + offset.z * cos;

      unit.targetPosition = {
        x: targetPos.x + rotatedX,
        z: targetPos.z + rotatedZ,
      };
    }
  }

  /**
   * 更新编队状态（每帧调用）
   * @param {number} dt - 帧间隔（秒）
   */
  update(delta) {
    for (const [groupId, group] of this.groups) {
      if (!group.moving || !group.targetPosition) continue;

      // 更新锚点位置（跟随第一个存活单位）
      const leader = group.units.find(u => u && u.alive);
      if (leader) {
        group.anchorPosition = { ...leader.position };
      }

      // 检查是否所有单位已到达目标
      let allArrived = true;
      for (const unit of group.units) {
        if (!unit || !unit.alive) continue;
        if (unit.targetPosition) {
          const dist = distance2D(unit.position, unit.targetPosition);
          if (dist > 0.5) {
            allArrived = false;
            break;
          }
        }
      }

      if (allArrived) {
        group.moving = false;
        group.targetPosition = null;
      }
    }
  }

  // ═══════════════════════════════════════
  // 阵型偏移计算
  // ═══════════════════════════════════════

  /**
   * 计算指定阵型的单位偏移位置
   * @param {number} unitCount - 单位数量
   * @param {string} type - FORMATION_TYPE
   * @param {number} spacing - 间距
   * @returns {Array<{x: number, z: number}>}
   */
  _computeFormationOffsets(unitCount, type, spacing) {
    switch (type) {
      case FORMATION_TYPE.LINE:
        return this._lineOffsets(unitCount, spacing);
      case FORMATION_TYPE.COLUMN:
        return this._columnOffsets(unitCount, spacing);
      case FORMATION_TYPE.SQUARE:
        return this._squareOffsets(unitCount, spacing);
      case FORMATION_TYPE.DIAMOND:
        return this._diamondOffsets(unitCount, spacing);
      case FORMATION_TYPE.CIRCLE:
        return this._circleOffsets(unitCount, spacing);
      case FORMATION_TYPE.WEDGE:
        return this._wedgeOffsets(unitCount, spacing);
      case FORMATION_TYPE.PHALANX:
        return this._phalanxOffsets(unitCount, spacing);
      default:
        return this._lineOffsets(unitCount, spacing);
    }
  }

  /**
   * 横列阵型：一排横着排列
   * @private
   */
  _lineOffsets(count, spacing) {
    const offsets = [];
    const startX = -(count - 1) * spacing / 2;
    for (let i = 0; i < count; i++) {
      offsets.push({ x: startX + i * spacing, z: 0 });
    }
    return offsets;
  }

  /**
   * 纵列阵型：一列前后排列
   * @private
   */
  _columnOffsets(count, spacing) {
    const offsets = [];
    for (let i = 0; i < count; i++) {
      offsets.push({ x: 0, z: i * spacing });
    }
    return offsets;
  }

  /**
   * 方形阵型：近似正方形排列
   * @private
   */
  _squareOffsets(count, spacing) {
    const cols = Math.ceil(Math.sqrt(count));
    const offsets = [];
    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      offsets.push({
        x: (col - (cols - 1) / 2) * spacing,
        z: (row - (Math.ceil(count / cols) - 1) / 2) * spacing,
      });
    }
    return offsets;
  }

  /**
   * 菱形阵型：中心突出，两翼渐缩
   * @private
   */
  _diamondOffsets(count, spacing) {
    if (count <= 1) return [{ x: 0, z: 0 }];
    if (count <= 3) return this._lineOffsets(count, spacing);

    const offsets = [{ x: 0, z: 0 }]; // 中心
    let ring = 1;
    let placed = 1;

    while (placed < count) {
      // 上
      if (placed < count) { offsets.push({ x: 0, z: -ring * spacing }); placed++; }
      // 右
      if (placed < count) { offsets.push({ x: ring * spacing, z: 0 }); placed++; }
      // 下
      if (placed < count) { offsets.push({ x: 0, z: ring * spacing }); placed++; }
      // 左
      if (placed < count) { offsets.push({ x: -ring * spacing, z: 0 }); placed++; }

      // 填充对角线
      for (let d = 1; d < ring; d++) {
        if (placed >= count) break;
        offsets.push({ x: d * spacing, z: -d * spacing }); placed++;
        if (placed >= count) break;
        offsets.push({ x: -d * spacing, z: d * spacing }); placed++;
      }
      ring++;
    }
    return offsets;
  }

  /**
   * 圆形阵型：围绕中心点排列
   * @private
   */
  _circleOffsets(count, spacing) {
    if (count <= 1) return [{ x: 0, z: 0 }];

    const offsets = [];
    const radius = count * spacing / (2 * Math.PI);

    for (let i = 0; i < count; i++) {
      const angle = (2 * Math.PI * i) / count - Math.PI / 2;
      offsets.push({
        x: Math.cos(angle) * radius,
        z: Math.sin(angle) * radius,
      });
    }
    return offsets;
  }

  /**
   * 楔形（V形/箭头）阵型：前方尖端，两翼展开
   * @private
   */
  _wedgeOffsets(count, spacing) {
    if (count <= 1) return [{ x: 0, z: 0 }];

    const offsets = [{ x: 0, z: 0 }]; // 尖端
    let leftSide = 1;
    let rightSide = 1;
    let row = 1;
    let placed = 1;

    while (placed < count) {
      // 左翼
      if (placed < count) {
        offsets.push({ x: -leftSide * spacing * 0.7, z: row * spacing });
        placed++;
      }
      // 右翼
      if (placed < count) {
        offsets.push({ x: rightSide * spacing * 0.7, z: row * spacing });
        placed++;
      }
      leftSide++;
      rightSide++;
      row++;
    }
    return offsets;
  }

  /**
   * 方阵阵型：密集矩形排列
   * @private
   */
  _phalanxOffsets(count, spacing) {
    const cols = Math.min(count, Math.ceil(Math.sqrt(count)));
    const offsets = [];
    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      offsets.push({
        x: (col - (cols - 1) / 2) * spacing,
        z: row * spacing,
      });
    }
    return offsets;
  }

  // ═══════════════════════════════════════
  // 辅助方法
  // ═══════════════════════════════════════

  /**
   * 计算一组单位的中心位置
   * @param {Array} units
   * @returns {{x: number, z: number}}
   * @private
   */
  _computeCenter(units) {
    const alive = units.filter(u => u && u.alive);
    if (alive.length === 0) return { x: 0, z: 0 };

    let sumX = 0, sumZ = 0;
    for (const u of alive) {
      sumX += u.position.x;
      sumZ += u.position.z;
    }
    return { x: sumX / alive.length, z: sumZ / alive.length };
  }

  /**
   * 切换编队阵型
   * @param {number} groupId
   * @param {string} newType - FORMATION_TYPE
   */
  changeFormation(groupId, newType) {
    const group = this.groups.get(groupId);
    if (group) {
      group.formationType = newType;
      group.spacing = FORMATION_SPACING[newType] || 1.2;

      // 如果正在移动，重新计算目标位置
      if (group.moving && group.targetPosition) {
        this.moveTo(groupId, group.targetPosition, group.anchorAngle);
      }
    }
  }

  /**
   * 获取所有编队列表
   * @returns {Array<{id: number, unitCount: number, type: string}>}
   */
  listGroups() {
    const result = [];
    for (const [id, group] of this.groups) {
      result.push({
        id,
        unitCount: group.units.filter(u => u && u.alive).length,
        type: group.formationType,
        moving: group.moving,
      });
    }
    return result;
  }
}
