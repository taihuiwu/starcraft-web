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

// ── 对称模式 ──
export const SYMMETRY_MODE = {
  NONE: 'none',
  VERTICAL: 'vertical',   // 垂直镜像（左右对称，轴在 X 中线）
  HORIZONTAL: 'horizontal', // 水平镜像（上下对称，轴在 Z 中线）
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

    // ── 对称绘制 ──
    this.symmetryMode = SYMMETRY_MODE.NONE;

    // ── 拖拽状态 ──
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartZ = 0;
    this.lastMouseGridX = -1;
    this.lastMouseGridZ = -1;

    // ── 选区状态 ──
    this.selection = null;       // { x1, z1, x2, z2 }  归一化为 x1<=x2, z1<=z2
    this.selectionStart = null;  // 拖拽起始格坐标
    this.isSelecting = false;    // 正在框选
    this.isMovingSelection = false; // 正在移动选区内容
    this.moveSelectionOffset = { x: 0, z: 0 }; // 移动偏移

    // ── 剪贴板 ──
    this.clipboard = null; // { terrainData, heightData, width, height }

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
  dispose() {
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

  // ═══════════════════════════════════════
  // 对称绘制
  // ═══════════════════════════════════════

  /**
   * 设置对称模式
   * @param {string} mode - SYMMETRY_MODE枚举值
   */
  setSymmetryMode(mode) {
    this.symmetryMode = mode;
    this.markDirty();
  }

  /**
   * 根据对称模式获取镜像坐标
   * @param {number} gx - 原始X坐标
   * @param {number} gz - 原始Z坐标
   * @returns {{ x: number, z: number }|null} 镜像坐标，如不需要镜像返回null
   */
  _getMirrorCoord(gx, gz) {
    if (this.symmetryMode === SYMMETRY_MODE.VERTICAL) {
      const axis = this.mapData.width / 2;
      const mx = Math.floor(2 * axis - gx - 1);
      if (mx === gx) return null; // 在轴上，不需要重复
      if (mx >= 0 && mx < this.mapData.width) {
        return { x: mx, z: gz };
      }
    } else if (this.symmetryMode === SYMMETRY_MODE.HORIZONTAL) {
      const axis = this.mapData.height / 2;
      const mz = Math.floor(2 * axis - gz - 1);
      if (mz === gz) return null;
      if (mz >= 0 && mz < this.mapData.height) {
        return { x: gx, z: mz };
      }
    }
    return null;
  }

  // ═══════════════════════════════════════
  // 选区操作
  // ═══════════════════════════════════════

  /**
   * 清除选区
   */
  clearSelection() {
    this.selection = null;
    this.selectionStart = null;
    this.isSelecting = false;
    this.isMovingSelection = false;
    this.markDirty();
  }

  /**
   * 获取选区范围（归一化）
   * @returns {{ x1, z1, x2, z2, width, height }|null}
   */
  getSelectionRect() {
    if (!this.selection) return null;
    const x1 = Math.max(0, Math.min(this.selection.x1, this.selection.x2));
    const z1 = Math.max(0, Math.min(this.selection.z1, this.selection.z2));
    const x2 = Math.min(this.mapData.width - 1, Math.max(this.selection.x1, this.selection.x2));
    const z2 = Math.min(this.mapData.height - 1, Math.max(this.selection.z1, this.selection.z2));
    return {
      x1, z1, x2, z2,
      width: x2 - x1 + 1,
      height: z2 - z1 + 1,
    };
  }

  /**
   * 复制选区内容到剪贴板
   * @returns {boolean} 是否成功
   */
  copySelection() {
    const rect = this.getSelectionRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return false;

    const terrainData = [];
    const heightData = [];
    for (let dz = 0; dz < rect.height; dz++) {
      const tRow = [];
      const hRow = [];
      for (let dx = 0; dx < rect.width; dx++) {
        tRow.push(this.mapData.getTerrain(rect.x1 + dx, rect.z1 + dz));
        hRow.push(this.mapData.getHeight(rect.x1 + dx, rect.z1 + dz));
      }
      terrainData.push(tRow);
      heightData.push(hRow);
    }

    this.clipboard = {
      terrainData,
      heightData,
      width: rect.width,
      height: rect.height,
      sourceX: rect.x1,
      sourceZ: rect.z1,
    };
    return true;
  }

  /**
   * 将剪贴板内容粘贴到指定位置
   * @param {number} destX - 目标左上角X
   * @param {number} destZ - 目标左上角Z
   * @param {boolean} [clearSource=false] - 是否清空源区域（剪切效果）
   * @returns {boolean} 是否成功
   */
  pasteClipboard(destX, destZ, clearSource = false) {
    if (!this.clipboard) return false;
    this.pushUndo();

    const { terrainData, heightData, width, height, sourceX, sourceZ } = this.clipboard;

    // 清空源区域（剪切效果）
    if (clearSource) {
      for (let dz = 0; dz < height; dz++) {
        for (let dx = 0; dx < width; dx++) {
          const sx = sourceX + dx;
          const sz = sourceZ + dz;
          if (sx < this.mapData.width && sz < this.mapData.height) {
            this.mapData.setTerrain(sx, sz, TERRAIN.GRASS);
            this.mapData.setHeight(sx, sz, 0);
          }
        }
      }
    }

    // 粘贴到新位置
    for (let dz = 0; dz < height; dz++) {
      for (let dx = 0; dx < width; dx++) {
        const tx = destX + dx;
        const tz = destZ + dz;
        if (tx >= 0 && tx < this.mapData.width && tz >= 0 && tz < this.mapData.height) {
          this.mapData.setTerrain(tx, tz, terrainData[dz][dx]);
          this.mapData.setHeight(tx, tz, heightData[dz][dx]);
        }
      }
    }

    this.markDirty();
    this.onMapChange(this.mapData);
    return true;
  }

  /**
   * 移动选区内容（拖拽过程中实时移动）
   * @param {number} offsetX - X偏移格数
   * @param {number} offsetZ - Z偏移格数
   */
  moveSelectionBy(offsetX, offsetZ) {
    const rect = this.getSelectionRect();
    if (!rect) return;

    this.pushUndo();

    // 1. 读取原选区数据
    const terrainData = [];
    const heightData = [];
    for (let dz = 0; dz < rect.height; dz++) {
      const tRow = [];
      const hRow = [];
      for (let dx = 0; dx < rect.width; dx++) {
        tRow.push(this.mapData.getTerrain(rect.x1 + dx, rect.z1 + dz));
        hRow.push(this.mapData.getHeight(rect.x1 + dx, rect.z1 + dz));
      }
      terrainData.push(tRow);
      heightData.push(hRow);
    }

    // 2. 清空原区域
    for (let dz = 0; dz < rect.height; dz++) {
      for (let dx = 0; dx < rect.width; dx++) {
        const sx = rect.x1 + dx;
        const sz = rect.z1 + dz;
        if (sx < this.mapData.width && sz < this.mapData.height) {
          this.mapData.setTerrain(sx, sz, TERRAIN.GRASS);
          this.mapData.setHeight(sx, sz, 0);
        }
      }
    }

    // 3. 写入新位置
    const newX1 = rect.x1 + offsetX;
    const newZ1 = rect.z1 + offsetZ;
    for (let dz = 0; dz < rect.height; dz++) {
      for (let dx = 0; dx < rect.width; dx++) {
        const tx = newX1 + dx;
        const tz = newZ1 + dz;
        if (tx >= 0 && tx < this.mapData.width && tz >= 0 && tz < this.mapData.height) {
          this.mapData.setTerrain(tx, tz, terrainData[dz][dx]);
          this.mapData.setHeight(tx, tz, heightData[dz][dx]);
        }
      }
    }

    // 4. 更新选区位置
    this.selection = { x1: newX1, z1: newZ1, x2: newX1 + rect.width - 1, z2: newZ1 + rect.height - 1 };

    this.markDirty();
    this.onMapChange(this.mapData);
  }

  // ═══════════════════════════════════════
  // 地形全局替换
  // ═══════════════════════════════════════

  /**
   * 全局替换地形类型
   * @param {number} fromType - 要替换的TERRAIN类型
   * @param {number} toType - 替换为的TERRAIN类型
   * @returns {number} 替换的格数
   */
  replaceTerrain(fromType, toType) {
    this.pushUndo();
    let count = 0;
    for (let gz = 0; gz < this.mapData.height; gz++) {
      for (let gx = 0; gx < this.mapData.width; gx++) {
        if (this.mapData.terrain[gz][gx] === fromType) {
          this.mapData.terrain[gz][gx] = toType;
          count++;
        }
      }
    }
    this.markDirty();
    this.onMapChange(this.mapData);
    return count;
  }

  /**
   * 在选区内替换地形类型
   * @param {number} fromType
   * @param {number} toType
   * @returns {number} 替换的格数
   */
  replaceTerrainInSelection(fromType, toType) {
    const rect = this.getSelectionRect();
    if (!rect) return 0;
    this.pushUndo();
    let count = 0;
    for (let dz = 0; dz < rect.height; dz++) {
      for (let dx = 0; dx < rect.width; dx++) {
        const gx = rect.x1 + dx;
        const gz = rect.z1 + dz;
        if (this.mapData.terrain[gz][gx] === fromType) {
          this.mapData.terrain[gz][gx] = toType;
          count++;
        }
      }
    }
    this.markDirty();
    this.onMapChange(this.mapData);
    return count;
  }

  // ═══════════════════════════════════════
  // 地图缩略图导出
  // ═══════════════════════════════════════

  /**
   * 将整个地图渲染到一个离线Canvas并导出为PNG data URL
   * @param {number} [thumbWidth=256] - 缩略图宽度像素
   * @returns {string} data:image/png;base64 URL
   */
  exportThumbnail(thumbWidth = 256) {
    const W = this.mapData.width;
    const H = this.mapData.height;
    const scale = thumbWidth / W;
    const thumbHeight = Math.floor(H * scale);

    const offCanvas = document.createElement('canvas');
    offCanvas.width = thumbWidth;
    offCanvas.height = thumbHeight;
    const offCtx = offCanvas.getContext('2d');

    // 逐格绘制地形
    for (let gz = 0; gz < H; gz++) {
      for (let gx = 0; gx < W; gx++) {
        const terrain = this.mapData.getTerrain(gx, gz);
        const height = this.mapData.getHeight(gx, gz);
        offCtx.fillStyle = TERRAIN_PROPS[terrain]?.color || '#333';
        if (height > 0) {
          offCtx.globalAlpha = 0.7 + height * 0.3;
        } else {
          offCtx.globalAlpha = 1.0;
        }
        offCtx.fillRect(gx * scale, gz * scale, scale + 0.5, scale + 0.5);
      }
    }
    offCtx.globalAlpha = 1.0;

    // 绘制资源点
    for (const rn of this.mapData.resourceNodes) {
      offCtx.fillStyle = rn.type === RESOURCE_TYPE.MINERAL ? '#4488ff' : '#44aa44';
      offCtx.fillRect(rn.x * scale - 1, rn.z * scale - 1, 3, 3);
    }

    // 绘制出生点
    for (const sp of this.mapData.spawnPoints) {
      offCtx.fillStyle = sp.team === 1 ? '#0066ff' : '#ff3333';
      offCtx.beginPath();
      offCtx.arc(sp.x * scale, sp.z * scale, 3, 0, Math.PI * 2);
      offCtx.fill();
    }

    return offCanvas.toDataURL('image/png');
  }

  /**
   * 下载地图缩略图为PNG文件（浏览器环境）
   * @param {string} [filename]
   * @param {number} [thumbWidth=256]
   */
  downloadThumbnail(filename, thumbWidth = 256) {
    const dataURL = this.exportThumbnail(thumbWidth);
    const a = document.createElement('a');
    a.href = dataURL;
    a.download = filename || `${this.mapData.name}_thumbnail.png`;
    a.click();
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

      if (this.currentTool === EDITOR_TOOL.SELECT) {
        // 选区模式：检查是否点击在已有选区内部 → 拖拽移动
        if (this.selection) {
          const rect = this.getSelectionRect();
          if (rect && grid.x >= rect.x1 && grid.x <= rect.x2 && grid.z >= rect.z1 && grid.z <= rect.z2) {
            this.isMovingSelection = true;
            this.selectionStart = { x: grid.x, z: grid.z };
            this.moveSelectionOffset = { x: 0, z: 0 };
            return;
          }
        }
        // 否则开始框选
        this.clearSelection();
        this.isSelecting = true;
        this.selectionStart = { x: grid.x, z: grid.z };
        this.selection = { x1: grid.x, z1: grid.z, x2: grid.x, z2: grid.z };
        this.markDirty();
      } else {
        this.pushUndo();
        this._applyTool(grid.x, grid.z);
      }
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

    // 选区拖拽（框选过程）
    if (this.isSelecting && grid) {
      this.selection.x2 = grid.x;
      this.selection.z2 = grid.z;
      this.markDirty();
    }

    // 移动选区内容
    if (this.isMovingSelection && grid) {
      const dx = grid.x - this.selectionStart.x;
      const dz = grid.z - this.selectionStart.z;
      if (dx !== this.moveSelectionOffset.x || dz !== this.moveSelectionOffset.z) {
        this.moveSelectionOffset = { x: dx, z: dz };
        // 先撤销上一步移动，再执行新的移动
        this.undo();
        this.moveSelectionBy(dx, dz);
      }
      this.markDirty();
    }

    if (grid && (grid.x !== this.lastMouseGridX || grid.z !== this.lastMouseGridZ)) {
      this.lastMouseGridX = grid.x;
      this.lastMouseGridZ = grid.z;
      this.markDirty();
    }

    // 左键拖拽时持续绘制
    if (e.buttons === 1 && this.currentTool !== EDITOR_TOOL.SELECT) {
      if (grid) {
        this._applyTool(grid.x, grid.z);
      }
    }
  }

  _handleMouseUp(e) {
    if (this.isMovingSelection) {
      this.isMovingSelection = false;
    }
    this.isSelecting = false;
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
    // 对称绘制：在应用工具后，对镜像坐标也执行相同操作
    this._applyToolAt(gx, gz);
    const mirror = this._getMirrorCoord(gx, gz);
    if (mirror) {
      this._applyToolAt(mirror.x, mirror.z);
    }
  }

  /**
   * 在指定坐标应用当前工具（不含对称逻辑）
   * @private
   */
  _applyToolAt(gx, gz) {
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

    // ── 绘制选区 ──
    if (this.selection) {
      const rect = this.getSelectionRect();
      if (rect) {
        const topLeft = this.gridToScreen(rect.x1, rect.z1);
        const sz = rect.width * tileSize;
        const sh = rect.height * tileSize;
        // 半透明填充
        ctx.fillStyle = 'rgba(100, 180, 255, 0.15)';
        ctx.fillRect(topLeft.x, topLeft.y, sz, sh);
        // 虚线边框
        ctx.strokeStyle = 'rgba(100, 180, 255, 0.9)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(topLeft.x, topLeft.y, sz, sh);
        ctx.setLineDash([]);
        // 尺寸标注
        ctx.fillStyle = 'rgba(100, 180, 255, 0.9)';
        ctx.font = `${Math.max(10, Math.floor(tileSize * 0.35))}px Arial`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`${rect.width}×${rect.height}`, topLeft.x + 2, topLeft.y - 2);
      }
    }

    // ── 对称轴指示线 ──
    if (this.symmetryMode === SYMMETRY_MODE.VERTICAL) {
      const axisX = this.mapData.width / 2;
      const screen = this.gridToScreen(axisX, startGz);
      ctx.strokeStyle = 'rgba(255, 255, 100, 0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      ctx.moveTo(screen.x, 0);
      ctx.lineTo(screen.x, canvas.height);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (this.symmetryMode === SYMMETRY_MODE.HORIZONTAL) {
      const axisZ = this.mapData.height / 2;
      const screen = this.gridToScreen(startGx, axisZ);
      ctx.strokeStyle = 'rgba(255, 255, 100, 0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      ctx.moveTo(0, screen.y);
      ctx.lineTo(canvas.width, screen.y);
      ctx.stroke();
      ctx.setLineDash([]);
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
