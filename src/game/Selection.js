// ═══════════════════════════════════════════
// StarCraft Web - 选择系统 (Selection)
// 处理单位的单击选中、框选、Shift加选、
// 双击同类型全选、Ctrl+数字编队、数字召回编队
// ═══════════════════════════════════════════

import { EVENTS } from '../shared/Constants.js';
import { eventBus } from '../shared/EventBus.js';

export default class Selection {
  /**
   * @param {import('./GameManager.js').default} gameManager
   */
  constructor(gameManager) {
    /** @type {import('./GameManager.js').default} */
    this.gameManager = gameManager;

    // ─── 当前选中的单位列表 ────────────
    /** @type {Array} 当前选中的单位 */
    this.selectedUnits = [];

    /**
     * 编队存储 (Ctrl+1~9)
     * 键为0~8对应数字键1~9，值为单位ID数组
     * @type {Array<Array<number>>}
     */
    this.controlGroups = Array.from({ length: 9 }, () => []);

    // ─── 框选状态 ──────────────────────
    /** @type {boolean} 是否正在框选中 */
    this.isDragging = false;
    /** @type {Object|null} 框选起点 {x, y}（屏幕坐标） */
    this.dragStart = null;
    /** @type {Object|null} 框选终点 */
    this.dragEnd = null;

    // ─── 上次点击时间（用于双击检测） ──
    /** @type {number} */
    this.lastClickTime = 0;
    /** @type {Object|null} 上次点击位置 */
    this.lastClickPos = null;
    /** @type {number} 双击判定阈值（毫秒） */
    this.doubleClickThreshold = 300;

    // ─── Shift键状态 ───────────────────
    /** @type {boolean} */
    this.shiftHeld = false;
    /** @type {boolean} */
    this.ctrlHeld = false;

    // ─── 注册输入事件 ──────────────────
    this._bindEvents();
  }

  // ═══════════════════════════════════════
  // 事件绑定
  // ═══════════════════════════════════════

  /**
   * 绑定鼠标和键盘事件
   */
  _bindEvents() {
    // 只在浏览器环境中绑定
    if (typeof window === 'undefined') return;

    // ─── 鼠标事件 ─────────────────────
    window.addEventListener('mousedown', (e) => this._onMouseDown(e));
    window.addEventListener('mousemove', (e) => this._onMouseMove(e));
    window.addEventListener('mouseup', (e) => this._onMouseUp(e));
    window.addEventListener('dblclick', (e) => this._onDoubleClick(e));

    // ─── 键盘事件 ─────────────────────
    window.addEventListener('keydown', (e) => this._onKeyDown(e));
    window.addEventListener('keyup', (e) => this._onKeyUp(e));

    console.log('[Selection] 事件绑定完成');
  }

  // ═══════════════════════════════════════
  // 鼠标事件处理
  // ═══════════════════════════════════════

  /**
   * 鼠标按下 - 开始框选或准备单击选中
   * @param {MouseEvent} e
   */
  _onMouseDown(e) {
    // 只处理左键
    if (e.button !== 0) return;

    const now = Date.now();
    const pos = { x: e.clientX, y: e.clientY };

    // ─── 检测双击 ──────────────────────
    if (this.lastClickPos &&
        now - this.lastClickTime < this.doubleClickThreshold) {
      const dx = pos.x - this.lastClickPos.x;
      const dy = pos.y - this.lastClickPos.y;
      if (Math.abs(dx) < 5 && Math.abs(dy) < 5) {
        // 双击 → 按类型全选
        this._handleDoubleClick(pos);
        this.lastClickTime = 0;
        return;
      }
    }

    this.lastClickTime = now;
    this.lastClickPos = pos;

    // ─── 检测Shift键 ──────────────────
    this.shiftHeld = e.shiftKey;
    this.ctrlHeld = e.ctrlKey || e.metaKey;

    // ─── 开始记录框选区域 ─────────────
    this.isDragging = true;
    this.dragStart = { x: e.clientX, y: e.clientY };
    this.dragEnd = null;
  }

  /**
   * 鼠标移动 - 更新框选区域
   * @param {MouseEvent} e
   */
  _onMouseMove(e) {
    if (!this.isDragging) return;
    this.dragEnd = { x: e.clientX, y: e.clientY };
  }

  /**
   * 鼠标抬起 - 完成选中操作
   * @param {MouseEvent} e
   */
  _onMouseUp(e) {
    if (e.button !== 0) return;
    if (!this.isDragging) return;
    this.isDragging = false;

    const endPos = { x: e.clientX, y: e.clientY };

    // ─── 判断是点击还是框选 ──────────
    if (this.dragStart) {
      const dx = Math.abs(endPos.x - this.dragStart.x);
      const dy = Math.abs(endPos.y - this.dragStart.y);

      if (dx < 5 && dy < 5) {
        // 点击选中（或加选/减选）
        this._handleClick(this.dragStart, this.shiftHeld);
      } else {
        // 框选
        this._handleBoxSelect(this.dragStart, endPos, this.shiftHeld);
      }
    }

    this.dragStart = null;
    this.dragEnd = null;
  }

  /**
   * 双击 - 选择同类型的所有单位
   * @param {MouseEvent} e
   */
  _onDoubleClick(e) {
    this._handleDoubleClick({ x: e.clientX, y: e.clientY });
  }

  // ═══════════════════════════════════════
  // 键盘事件处理
  // ═══════════════════════════════════════

  /**
   * 键盘按下
   * @param {KeyboardEvent} e
   */
  _onKeyDown(e) {
    // ─── 编队存储: Ctrl + 1~9 ─────────
    if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '9') {
      e.preventDefault();
      const groupIndex = parseInt(e.key) - 1;
      this.storeControlGroup(groupIndex);
      return;
    }

    // ─── 编队召回: 1~9（无Ctrl） ──────
    if (!e.ctrlKey && !e.metaKey && !e.altKey &&
        e.key >= '1' && e.key <= '9') {
      const groupIndex = parseInt(e.key) - 1;
      this.recallControlGroup(groupIndex);
      return;
    }

    // ─── 双击数字键: 编队召回并居中 ──
    // （由重复按键检测实现，此处简化为直接召回+居中）

    // ─── Esc: 取消选择 ────────────────
    if (e.key === 'Escape') {
      this.deselectAll();
      return;
    }

    // ─── Shift状态跟踪 ────────────────
    if (e.key === 'Shift') {
      this.shiftHeld = true;
    }
    if (e.key === 'Control' || e.key === 'Meta') {
      this.ctrlHeld = true;
    }
  }

  /**
   * 键盘抬起
   * @param {KeyboardEvent} e
   */
  _onKeyUp(e) {
    if (e.key === 'Shift') {
      this.shiftHeld = false;
    }
    if (e.key === 'Control' || e.key === 'Meta') {
      this.ctrlHeld = false;
    }
  }

  // ═══════════════════════════════════════
  // 选择逻辑
  // ═══════════════════════════════════════

  /**
   * 单击选中最近的己方单位
   * @param {Object} screenPos - 屏幕坐标 {x, y}
   * @param {boolean} addToSelection - 是否追加到已有选中（Shift）
   */
  _handleClick(screenPos, addToSelection = false) {
    const gm = this.gameManager;
    const units = gm.units.filter(u => u.alive);

    if (!addToSelection) {
      // 清除之前的选中
      this.deselectAll();
    }

    // 将屏幕坐标转为世界坐标（简化版：遍历所有单位，找屏幕投影最近的）
    // 注意：完整版需要Three.js raycaster，这里先做简化逻辑
    let closestUnit = null;
    let closestDist = Infinity;

    for (const unit of units) {
      // 简化：直接用世界坐标的2D距离作为判定
      // 实际项目中应使用摄像机投影后的屏幕坐标
      const screenDist = this._worldToScreenDist(unit.position, screenPos);
      if (screenDist < closestDist) {
        closestDist = screenDist;
        closestUnit = unit;
      }
    }

    // 选中阈值（像素）
    if (closestUnit && closestDist < 30) {
      if (addToSelection) {
        // 已选中则取消，未选中则加入
        const idx = this.selectedUnits.indexOf(closestUnit);
        if (idx >= 0) {
          closestUnit.selected = false;
          this.selectedUnits.splice(idx, 1);
        } else {
          closestUnit.selected = true;
          this.selectedUnits.push(closestUnit);
        }
      } else {
        closestUnit.selected = true;
        this.selectedUnits = [closestUnit];
      }
    }

    this.updateSelectionUI();
  }

  /**
   * 框选 - 选中矩形区域内的所有己方单位
   * @param {Object} start - 框选起点 {x, y}（屏幕坐标）
   * @param {Object} end - 框选终点 {x, y}
   * @param {boolean} addToSelection - 是否追加
   */
  _handleBoxSelect(start, end, addToSelection = false) {
    const gm = this.gameManager;

    if (!addToSelection) {
      this.deselectAll();
    }

    // 计算屏幕矩形（确保min/max正确）
    const minX = Math.min(start.x, end.x);
    const maxX = Math.max(start.x, end.x);
    const minY = Math.min(start.y, end.y);
    const maxY = Math.max(start.y, end.y);

    // 遍历所有己方单位，检查是否在框选区域内
    for (const unit of gm.units) {
      if (!unit.alive) continue;

      // 简化：用世界坐标映射到屏幕坐标来判断
      // 实际项目中需要 Three.js raycaster 进行精确的屏幕空间判断
      const screenPos = this._worldToScreen(unit.position);

      if (screenPos.x >= minX && screenPos.x <= maxX &&
          screenPos.y >= minY && screenPos.y <= maxY) {
        if (!unit.selected) {
          unit.selected = true;
          this.selectedUnits.push(unit);
        }
      }
    }

    this.updateSelectionUI();
  }

  /**
   * 双击同类型全选
   * 选中屏幕上可见的所有同类型己方单位
   * @param {Object} screenPos - 双击位置
   */
  _handleDoubleClick(screenPos) {
    const gm = this.gameManager;

    // 先找到双击位置下的单位类型
    let targetType = null;
    let closestDist = Infinity;

    for (const unit of gm.units) {
      if (!unit.alive) continue;
      const dist = this._worldToScreenDist(unit.position, screenPos);
      if (dist < closestDist) {
        closestDist = dist;
        targetType = unit.type;
      }
    }

    if (!targetType || closestDist > 30) return;

    // 清除旧选择
    this.deselectAll();

    // 选择所有同类型己方单位
    for (const unit of gm.units) {
      if (!unit.alive) continue;
      if (unit.type === targetType) {
        unit.selected = true;
        this.selectedUnits.push(unit);
      }
    }

    console.log(`[Selection] 双击全选: ${targetType}, 共${this.selectedUnits.length}个`);
    this.updateSelectionUI();
  }

  // ═══════════════════════════════════════
  // 编队系统
  // ═══════════════════════════════════════

  /**
   * 存储当前选中单位为编队
   * @param {number} groupIndex - 编队索引 (0~8)
   */
  storeControlGroup(groupIndex) {
    if (groupIndex < 0 || groupIndex > 8) return;

    this.controlGroups[groupIndex] = this.selectedUnits.map(u => u.id);
    console.log(`[Selection] 编队${groupIndex + 1}已存储: ${this.controlGroups[groupIndex].length}个单位`);
  }

  /**
   * 召回编队（选中编队中的所有存活单位）
   * @param {number} groupIndex - 编队索引 (0~8)
   */
  recallControlGroup(groupIndex) {
    if (groupIndex < 0 || groupIndex > 8) return;

    const gm = this.gameManager;
    const groupIds = this.controlGroups[groupIndex];

    if (!groupIds || groupIds.length === 0) {
      console.log(`[Selection] 编队${groupIndex + 1}为空`);
      return;
    }

    // 先清除旧选择
    this.deselectAll();

    // 选择编队中存活的单位
    for (const unit of gm.units) {
      if (!unit.alive) continue;
      if (groupIds.includes(unit.id)) {
        unit.selected = true;
        this.selectedUnits.push(unit);
      }
    }

    // 更新编队（移除已死亡的单位）
    this.controlGroups[groupIndex] = this.selectedUnits.map(u => u.id);

    console.log(`[Selection] 召回编队${groupIndex + 1}: ${this.selectedUnits.length}个单位`);
    this.updateSelectionUI();
  }

  // ═══════════════════════════════════════
  // 公共方法
  // ═══════════════════════════════════════

  /**
   * 取消所有选择
   */
  deselectAll() {
    for (const unit of this.selectedUnits) {
      unit.selected = false;
    }
    this.selectedUnits = [];
    eventBus.emit(EVENTS.DESELECT, {});
  }

  /**
   * 程序化选中指定单位（供AI、编队召回等调用）
   * @param {Array} units - 要选中的单位数组
   * @param {boolean} addToSelection - 是否追加
   */
  selectUnits(units, addToSelection = false) {
    if (!addToSelection) {
      this.deselectAll();
    }

    for (const unit of units) {
      if (!unit.alive || unit.selected) continue;
      unit.selected = true;
      this.selectedUnits.push(unit);
    }

    this.updateSelectionUI();
  }

  /**
   * 获取当前选中单位列表的副本
   * @returns {Array}
   */
  getSelectedUnits() {
    return [...this.selectedUnits];
  }

  /**
   * 获取选中单位数量
   * @returns {number}
   */
  getSelectedCount() {
    return this.selectedUnits.length;
  }

  // ═══════════════════════════════════════
  // UI通知
  // ═══════════════════════════════════════

  /**
   * 通知UI更新选中信息
   * 通过EventBus广播当前选中单位列表
   */
  updateSelectionUI() {
    if (this.selectedUnits.length === 0) {
      eventBus.emit(EVENTS.DESELECT, {});
    } else {
      eventBus.emit(EVENTS.SELECT_UNITS, this.selectedUnits);
    }
  }

  // ═══════════════════════════════════════
  // 辅助方法
  // ═══════════════════════════════════════

  /**
   * 获取框选矩形（供渲染层绘制选择框）
   * @returns {Object|null} {start, end} 或 null
   */
  getDragRect() {
    if (!this.isDragging || !this.dragStart || !this.dragEnd) return null;
    return { start: this.dragStart, end: this.dragEnd };
  }

  /**
   * 简化的世界坐标→屏幕坐标映射
   * 实际项目中需要Three.js摄像机投影
   * @param {Object} worldPos - 世界坐标 {x, y, z}
   * @returns {Object} 屏幕坐标 {x, y}
   */
  _worldToScreen(worldPos) {
    // 简化实现：直接用x,z作为屏幕坐标的x,y
    // 实际项目需要摄像机投影矩阵
    const scale = 20; // 缩放因子
    return {
      x: worldPos.x * scale + window.innerWidth / 2,
      y: (worldPos.z || 0) * scale + window.innerHeight / 2,
    };
  }

  /**
   * 计算世界坐标投影到屏幕后与屏幕点的距离
   * @param {Object} worldPos - 世界坐标
   * @param {Object} screenPos - 屏幕坐标
   * @returns {number} 屏幕空间距离
   */
  _worldToScreenDist(worldPos, screenPos) {
    const projected = this._worldToScreen(worldPos);
    const dx = projected.x - screenPos.x;
    const dy = projected.y - screenPos.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
