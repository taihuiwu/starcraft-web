// ═══════════════════════════════════════════
// StarCraft Web - 地图编辑器核心 (MapEditor)
// Canvas 2D俯视图编辑器，支持地形绘制、单位放置、保存/加载
// ═══════════════════════════════════════════

import MapData, { TERRAIN, TERRAIN_PROPS, RESOURCE_TYPE, MAP_SIZES, validateMap } from '../game/MapData.js';

// ── 工具类型 ──
export const EDITOR_TOOL = {
  TERRAIN_PAINT: 'terrain_paint',
  TERRAIN_ERASE: 'terrain_erase',
  UNIT_PLACE: 'unit_place',
  BUILDING_PLACE: 'building_place',
  RESOURCE_PLACE: 'resource_place',
  SPAWN_PLACE: 'spawn_place',
  HEIGHT_EDIT: 'height_edit',
  SELECT: 'select',
};

/**
 * MapEditor - 地图编辑器核心逻辑
 * 管理画布渲染、编辑工具、撤销/重做、保存/加载
 */
export class MapEditor {
  /**
   * @param {HTMLCanvasElement} canvas - 编辑器画布
   * @param {Object} [options]
   * @param {Function} [options.onMapChange] - 地图变更回调
   * @param {Function} [options.onToolChange] - 工具变更回调
   */
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onMapChange = options.onMapChange || (() => {});
    this.onToolChange = options.onToolChange || (() => {});

    // ── 地图数据 ──
    this.mapData = new MapData({ width: 128, height: 128 });

    // ── 视图状态 ──
    this.viewX = 0;        // 视口左上角X（格坐标）
    this.viewZ = 0;        // 视口左上角Z
    this.zoom = 1.0;       // 缩放比例
    this.tileDisplaySize = 32; // 基础格子像素大小

    // ── 编辑状态 ──
    this.currentTool = EDITOR_TOOL.TERRAIN_PAINT;
    this.currentTerrainType = TERRAIN.GRASS;
    this.currentResourceType = RESOURCE_TYPE.MINERAL;
    this.brushSize = 2;    // 笔刷半径
    this.selectedTeam = 1;

    // ── 拖拽状态 ──
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartZ = 0;
    this.lastMouseGridX = -1;
    this.lastMouseGridZ = -1;

    // ── 撤销/重做 ──
    this.undoStack = [];
    this.redoStack = [];
    this.maxUndoSteps = 50;

    // ── 事件绑定 ──
    this._bindEvents();

    // ── 动画帧 ──
    this._rafId = null;
    this._dirty = true;

    // 启动渲染循环
    this._startRenderLoop();
  }

  // ═══════════════════════════════════════
  // 初始化与销毁
  // ═══════════════════════════════════════

  /**
   * 创建新地图
   * @param {number} width
   * @param {number} height
   * @param {string} [name]
   */
  newMap(width, height, name = '未命名地图') {
    this.pushUndo();
    this.mapData = new MapData({ width, height, name });
    this.viewX = 0;
    this.viewZ = 0;
    this.markDirty();
    this.onMapChange(this.mapData);
  }

  /**
   * 加载MapData实例
   * @param {MapData} mapData
   */
  loadMap(mapData) {
    this.pushUndo();
    this.mapData = mapData;
    this.viewX = 0;
    this.viewZ = 0;
    this.markDirty();
    this.onMapChange(this.mapData);
  }

  /**
   * 销毁编辑器
   */
  destroy() {
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
    }
    this._unbindEvents();
  }

  // ═══════════════════════════════════════
  // 工具管理
  // ═══════════════════════════════════════

  /**
   * 设置当前工具
   * @param {string} tool - EDITOR_TOOL枚举值
   */
  setTool(tool) {
    this.currentTool = tool;
    this.onToolChange(tool);
    this.canvas.style.cursor = tool === EDITOR_TOOL.SELECT ? 'default' : 'crosshair';
  }

  /**
   * 设置地形笔刷类型
   * @param {number} terrainType - TERRAIN枚举值
   */
  setTerrainType(terrainType) {
    this.currentTerrainType = terrainType;
  }

  /**
   * 设置笔刷大小
   * @param {number} size
   */
  setBrushSize(size) {
    this.brushSize = Math.max(1, Math.min(10, size));
  }

  // ═══════════════════════════════════════
  // 撤销/重做
  // ═══════════════════════════════════════

  /**
   * 推送当前状态到撤销栈
   */
  pushUndo() {
    const snapshot = this.mapData.toJSON();
    this.undoStack.push(snapshot);
    if (this.undoStack.length > this.maxUndoSteps) {
      this.undoStack.shift();
    }
    // 新操作清空重做栈
    this.redoStack = [];
  }

  /**
   * 撤销操作
   */
  undo() {
    if (this.undoStack.length === 0) return;

    // 保存当前状态到重做栈
    this.redoStack.push(this.mapData.toJSON());

    // 恢复上一个状态
    const snapshot = this.undoStack.pop();
    this.mapData = MapData.fromJSON(snapshot);
    this.markDirty();
    this.onMapChange(this.mapData);
  }

  /**
   * 重做操作
   */
  redo() {
    if (this.redoStack.length === 0) return;

    // 保存当前状态到撤销栈
    this.undoStack.push(this.mapData.toJSON());

    // 恢复重做栈顶状态
    const snapshot = this.redoStack.pop();
    this.mapData = MapData.fromJSON(snapshot);
    this.markDirty();
    this.onMapChange(this.mapData);
  }

  // ═══════════════════════════════════════
  // 保存/加载
  // ═══════════════════════════════════════

  /**
   * 保存地图到JSON字符串
   * @returns {string}
   */
  saveMap() {
    return this.mapData.serialize();
  }

  /**
   * 从JSON字符串加载地图
   * @param {string} jsonStr
   */
  loadFromJSON(jsonStr) {
    const mapData = MapData.deserialize(jsonStr);
    this.loadMap(mapData);
  }

  /**
   * 下载地图文件（浏览器环境）
   * @param {string} [filename]
   */
  downloadMap(filename) {
    const json = this.mapData.serialize();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `${this.mapData.name}.scmap`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * 验证当前地图
   * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
   */
  validateCurrentMap() {
    return validateMap(this.mapData);
  }

  // ═══════════════════════════════════════
  // 事件处理
  // ═══════════════════════════════════════

  _bindEvents() {
    this._onMouseDown = this._handleMouseDown.bind(this);
    this._onMouseMove = this._handleMouseMove.bind(this);
    this._onMouseUp = this._handleMouseUp.bind(this);
    this._onWheel = this._handleWheel.bind(this);
    this._onContextMenu = (e) => e.preventDefault();

    this.canvas.addEventListener('mousedown', this._onMouseDown);
    this.canvas.addEventListener('mousemove', this._onMouseMove);
    this.canvas.addEventListener('mouseup', this._onMouseUp);
    this.canvas.addEventListener('wheel', this._onWheel);
    this.canvas.addEventListener('contextmenu', this._onContextMenu);
  }

  _unbindEvents() {
    this.canvas.removeEventListener('mousedown', this._onMouseDown);
    this.canvas.removeEventListener('mousemove', this._onMouseMove);
    this.canvas.removeEventListener('mouseup', this._onMouseUp);
    this.canvas.removeEventListener('wheel', this._onWheel);
    this.canvas.removeEventListener('contextmenu', this._onContextMenu);
  }

  _handleMouseDown(e) {
    if (e.button === 2 || e.button === 1) {
      // 右键或中键：开始拖拽视口
      this.isDragging = true;
      this.dragStartX = e.clientX;
      this.dragStartZ = e.clientY;
      return;
    }

    if (e.button === 0) {
      // 左键：编辑
      const grid = this.screenToGrid(e.clientX, e.clientY);
      if (!grid) return;

      this.pushUndo();
      this._applyTool(grid.x, grid.z);
    }
  }

  _handleMouseMove(e) {
    if (this.isDragging) {
      const dx = (e.clientX - this.dragStartX) / (this.tileDisplaySize * this.zoom);
      const dz = (e.clientY - this.dragStartZ) / (this.tileDisplaySize * this.zoom);
      this.viewX -= dx;
      this.viewZ -= dz;
      this.dragStartX = e.clientX;
      this.dragStartZ = e.clientY;
      this.clampView();
      this.markDirty();
      return;
    }

    const grid = this.screenToGrid(e.clientX, e.clientY);
    if (grid && (grid.x !== this.lastMouseGridX || grid.z !== this.lastMouseGridZ)) {
      this.lastMouseGridX = grid.x;
      this.lastMouseGridZ = grid.z;
      this.markDirty();
    }

    // 左键拖拽时持续绘制
    if (e.buttons === 1) {
      if (grid) {
        this._applyTool(grid.x, grid.z);
      }
    }
  }

  _handleMouseUp(e) {
    this.isDragging = false;
  }

  _handleWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    this.zoom = Math.max(0.25, Math.min(4.0, this.zoom * delta));
    this.clampView();
    this.markDirty();
  }

  // ═══════════════════════════════════════
  // 坐标转换
  // ═══════════════════════════════════════

  /**
   * 屏幕坐标转网格坐标
   * @param {number} screenX
   * @param {number} screenY
   * @returns {{x: number, z: number}|null}
   */
  screenToGrid(screenX, screenY) {
    const rect = this.canvas.getBoundingClientRect();
    const canvasX = screenX - rect.left;
    const canvasY = screenY - rect.top;

    const tileSize = this.tileDisplaySize * this.zoom;
    const gx = Math.floor(this.viewX + canvasX / tileSize);
    const gz = Math.floor(this.viewZ + canvasY / tileSize);

    if (gx < 0 || gx >= this.mapData.width || gz < 0 || gz >= this.mapData.height) {
      return null;
    }
    return { x: gx, z: gz };
  }

  /**
   * 网格坐标转屏幕坐标
   * @param {number} gx
   * @param {number} gz
   * @returns {{x: number, y: number}}
   */
  gridToScreen(gx, gz) {
    const tileSize = this.tileDisplaySize * this.zoom;
    return {
      x: (gx - this.viewX) * tileSize,
      y: (gz - this.viewZ) * tileSize,
    };
  }

  clampView() {
    const tilesX = this.canvas.width / (this.tileDisplaySize * this.zoom);
    const tilesZ = this.canvas.height / (this.tileDisplaySize * this.zoom);
    this.viewX = Math.max(0, Math.min(this.mapData.width - tilesX, this.viewX));
    this.viewZ = Math.max(0, Math.min(this.mapData.height - tilesZ, this.viewZ));
  }

  // ═══════════════════════════════════════
  // 工具应用
  // ═══════════════════════════════════════

  _applyTool(gx, gz) {
    switch (this.currentTool) {
      case EDITOR_TOOL.TERRAIN_PAINT:
        this.mapData.paintTerrain(gx, gz, this.brushSize, this.currentTerrainType);
        break;

      case EDITOR_TOOL.TERRAIN_ERASE:
        this.mapData.paintTerrain(gx, gz, this.brushSize, TERRAIN.GRASS);
        break;

      case EDITOR_TOOL.UNIT_PLACE:
        this.mapData.units.push({
          x: gx,
          z: gz,
          type: 'marine',
          team: this.selectedTeam,
        });
        break;

      case EDITOR_TOOL.BUILDING_PLACE:
        this.mapData.buildings.push({
          x: gx,
          z: gz,
          type: 'command_center',
          team: this.selectedTeam,
        });
        break;

      case EDITOR_TOOL.RESOURCE_PLACE:
        this.mapData.addResourceNode({
          x: gx,
          z: gz,
          type: this.currentResourceType,
        });
        break;

      case EDITOR_TOOL.SPAWN_PLACE:
        this.mapData.addSpawnPoint(gx, gz, this.selectedTeam);
        break;

      case EDITOR_TOOL.HEIGHT_EDIT: {
        const currentHeight = this.mapData.getHeight(gx, gz);
        this.mapData.setHeight(gx, gz, Math.min(1, currentHeight + 0.1));
        if (currentHeight > 0.3) {
          this.mapData.setTerrain(gx, gz, TERRAIN.HIGH);
        }
        break;
      }
    }

    this.markDirty();
    this.onMapChange(this.mapData);
  }

  // ═══════════════════════════════════════
  // 渲染
  // ═══════════════════════════════════════

  markDirty() {
    this._dirty = true;
  }

  _startRenderLoop() {
    const loop = () => {
      if (this._dirty) {
        this._render();
        this._dirty = false;
      }
      this._rafId = requestAnimationFrame(loop);
    };
    this._rafId = requestAnimationFrame(loop);
  }

  _render() {
    const { ctx, canvas } = this;
    const tileSize = this.tileDisplaySize * this.zoom;
    const W = this.mapData.width;
    const H = this.mapData.height;

    // 计算可见范围
    const startGx = Math.max(0, Math.floor(this.viewX));
    const startGz = Math.max(0, Math.floor(this.viewZ));
    const endGx = Math.min(W, Math.ceil(this.viewX + canvas.width / tileSize) + 1);
    const endGz = Math.min(H, Math.ceil(this.viewZ + canvas.height / tileSize) + 1);

    // 清除画布
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // ── 绘制地形 ──
    for (let gz = startGz; gz < endGz; gz++) {
      for (let gx = startGx; gx < endGx; gx++) {
        const screen = this.gridToScreen(gx, gz);
        const terrain = this.mapData.getTerrain(gx, gz);
        const height = this.mapData.getHeight(gx, gz);

        // 基础颜色
        ctx.fillStyle = TERRAIN_PROPS[terrain]?.color || '#333';

        // 高度影响亮度
        if (height > 0) {
          ctx.globalAlpha = 0.7 + height * 0.3;
        } else {
          ctx.globalAlpha = 1.0;
        }

        ctx.fillRect(screen.x, screen.y, tileSize + 0.5, tileSize + 0.5);
      }
    }

    ctx.globalAlpha = 1.0;

    // ── 绘制网格线 ──
    if (this.zoom >= 0.5) {
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 0.5;
      for (let gx = startGx; gx <= endGx; gx++) {
        const screen = this.gridToScreen(gx, startGz);
        ctx.beginPath();
        ctx.moveTo(screen.x, 0);
        ctx.lineTo(screen.x, canvas.height);
        ctx.stroke();
      }
      for (let gz = startGz; gz <= endGz; gz++) {
        const screen = this.gridToScreen(startGx, gz);
        ctx.beginPath();
        ctx.moveTo(0, screen.y);
        ctx.lineTo(canvas.width, screen.y);
        ctx.stroke();
      }
    }

    // ── 绘制资源点 ──
    for (const rn of this.mapData.resourceNodes) {
      const screen = this.gridToScreen(rn.x, rn.z);
      const size = tileSize * 0.6;

      if (rn.type === RESOURCE_TYPE.MINERAL) {
        ctx.fillStyle = '#4488ff';
        ctx.fillRect(screen.x + (tileSize - size) / 2, screen.y + (tileSize - size) / 2, size, size);
        // 水晶标记
        ctx.fillStyle = '#88ccff';
        ctx.beginPath();
        ctx.arc(screen.x + tileSize / 2, screen.y + tileSize / 2, size * 0.3, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#44aa44';
        ctx.beginPath();
        ctx.arc(screen.x + tileSize / 2, screen.y + tileSize / 2, size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#88ff88';
        ctx.beginPath();
        ctx.arc(screen.x + tileSize / 2, screen.y + tileSize / 2, size * 0.25, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ── 绘制出生点 ──
    for (const sp of this.mapData.spawnPoints) {
      const screen = this.gridToScreen(sp.x, sp.z);
      ctx.fillStyle = sp.team === 1 ? '#0066ff' : '#ff3333';
      ctx.beginPath();
      ctx.arc(screen.x + tileSize / 2, screen.y + tileSize / 2, tileSize * 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // 队伍编号
      ctx.fillStyle = '#fff';
      ctx.font = `${Math.floor(tileSize * 0.5)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(sp.team), screen.x + tileSize / 2, screen.y + tileSize / 2);
    }

    // ── 绘制放置的单位 ──
    for (const unit of this.mapData.units) {
      const screen = this.gridToScreen(unit.x, unit.z);
      ctx.fillStyle = unit.team === 1 ? '#4488ff' : '#ff4444';
      ctx.fillRect(screen.x + tileSize * 0.2, screen.y + tileSize * 0.2, tileSize * 0.6, tileSize * 0.6);
    }

    // ── 绘制放置的建筑 ──
    for (const bld of this.mapData.buildings) {
      const screen = this.gridToScreen(bld.x, bld.z);
      ctx.fillStyle = bld.team === 1 ? '#2266cc' : '#cc2222';
      ctx.fillRect(screen.x + tileSize * 0.1, screen.y + tileSize * 0.1, tileSize * 0.8, tileSize * 0.8);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.strokeRect(screen.x + tileSize * 0.1, screen.y + tileSize * 0.1, tileSize * 0.8, tileSize * 0.8);
    }

    // ── 笔刷预览 ──
    if (this.lastMouseGridX >= 0 && this.lastMouseGridZ >= 0) {
      const screen = this.gridToScreen(this.lastMouseGridX, this.lastMouseGridZ);
      ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
      ctx.lineWidth = 2;

      if (this.brushSize > 1) {
        const brushScreen = this.gridToScreen(
          this.lastMouseGridX - this.brushSize + 1,
          this.lastMouseGridZ - this.brushSize + 1
        );
        const brushSize = (this.brushSize * 2 - 1) * tileSize;
        ctx.strokeRect(brushScreen.x, brushScreen.y, brushSize, brushSize);
      } else {
        ctx.strokeRect(screen.x, screen.y, tileSize, tileSize);
      }
    }
  }
}

export default MapEditor;
