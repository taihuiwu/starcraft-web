<!-- ═══════════════════════════════════════════════
  StarCraft Web - 地图编辑器UI组件
  Vue3组件，包含工具栏、属性面板、预览画布
═══════════════════════════════════════════════ -->
<template>
  <div class="editor-root" v-if="visible">
    <!-- 顶部工具栏 -->
    <div class="editor-toolbar">
      <div class="toolbar-left">
        <button class="sc-btn toolbar-btn" @click="$emit('close')" title="返回主菜单">
          ← 返回
        </button>
        <span class="toolbar-title">🗺️ 地图编辑器</span>
        <span class="toolbar-map-name">{{ mapName }}</span>
      </div>
      <div class="toolbar-center">
        <button class="sc-btn toolbar-btn" :class="{ active: activeTool === 'terrain_paint' }"
          @click="setTool('terrain_paint')" title="地形笔刷">🖌️ 笔刷</button>
        <button class="sc-btn toolbar-btn" :class="{ active: activeTool === 'terrain_erase' }"
          @click="setTool('terrain_erase')" title="擦除">🧹 擦除</button>
        <button class="sc-btn toolbar-btn" :class="{ active: activeTool === 'height_edit' }"
          @click="setTool('height_edit')" title="高度编辑">⛰️ 高度</button>
        <button class="sc-btn toolbar-btn" :class="{ active: activeTool === 'resource_place' }"
          @click="setTool('resource_place')" title="放置资源">💎 资源</button>
        <button class="sc-btn toolbar-btn" :class="{ active: activeTool === 'spawn_place' }"
          @click="setTool('spawn_place')" title="放置出生点">🏁 出生点</button>
        <button class="sc-btn toolbar-btn" :class="{ active: activeTool === 'unit_place' }"
          @click="setTool('unit_place')" title="放置单位">🧑 单位</button>
        <button class="sc-btn toolbar-btn" :class="{ active: activeTool === 'building_place' }"
          @click="setTool('building_place')" title="放置建筑">🏗️ 建筑</button>
      </div>
      <div class="toolbar-right">
        <button class="sc-btn toolbar-btn" @click="handleUndo" :disabled="!canUndo" title="撤销 Ctrl+Z">↩️</button>
        <button class="sc-btn toolbar-btn" @click="handleRedo" :disabled="!canRedo" title="重做 Ctrl+Y">↪️</button>
        <button class="sc-btn toolbar-btn save-btn" @click="handleSave" title="保存地图">💾 保存</button>
        <button class="sc-btn toolbar-btn" @click="handleExport" title="导出游戏数据">📤 导出</button>
      </div>
    </div>

    <div class="editor-body">
      <!-- 左侧面板：地形/笔刷设置 -->
      <div class="editor-panel left-panel">
        <div class="panel-section">
          <div class="section-title">地形类型</div>
          <div class="terrain-grid">
            <button
              v-for="t in terrainTypes"
              :key="t.id"
              class="terrain-btn"
              :class="{ selected: selectedTerrain === t.id }"
              :style="{ backgroundColor: t.color }"
              @click="selectTerrain(t.id)"
              :title="t.name"
            >
              <span class="terrain-label">{{ t.name }}</span>
            </button>
          </div>
        </div>

        <div class="panel-section" v-if="activeTool === 'resource_place'">
          <div class="section-title">资源类型</div>
          <div class="resource-options">
            <button class="sc-btn res-btn" :class="{ active: selectedResource === 'mineral' }"
              @click="selectedResource = 'mineral'">💎 水晶矿</button>
            <button class="sc-btn res-btn" :class="{ active: selectedResource === 'gas' }"
              @click="selectedResource = 'gas'">🟢 瓦斯</button>
          </div>
        </div>

        <div class="panel-section" v-if="activeTool === 'unit_place' || activeTool === 'building_place'">
          <div class="section-title">队伍</div>
          <div class="team-options">
            <button
              v-for="t in 4"
              :key="t"
              class="team-btn"
              :class="{ active: selectedTeam === t }"
              :style="{ borderColor: teamColors[t] }"
              @click="selectedTeam = t"
            >P{{ t }}</button>
          </div>
        </div>

        <div class="panel-section">
          <div class="section-title">笔刷大小: {{ brushSize }}</div>
          <input
            type="range"
            min="1"
            max="10"
            :value="brushSize"
            @input="brushSize = Number($event.target.value)"
            class="brush-slider"
          />
        </div>

        <div class="panel-section">
          <div class="section-title">地图大小</div>
          <div class="size-options">
            <button class="sc-btn size-btn" @click="handleNewMap(64, 64)">64×64</button>
            <button class="sc-btn size-btn" @click="handleNewMap(128, 128)">128×128</button>
            <button class="sc-btn size-btn" @click="handleNewMap(256, 256)">256×256</button>
          </div>
        </div>

        <div class="panel-section">
          <div class="section-title">预制地图</div>
          <div class="preset-list">
            <button
              v-for="pm in presetMaps"
              :key="pm.id"
              class="sc-btn preset-btn"
              @click="handleLoadPreset(pm.id)"
            >
              {{ pm.name }} ({{ pm.size }})
            </button>
          </div>
        </div>

        <div class="panel-section">
          <button class="sc-btn full-width" @click="handleValidate">✅ 验证地图</button>
          <button class="sc-btn full-width" @click="handleLoadFile">📂 加载文件</button>
        </div>

        <!-- 验证结果 -->
        <div class="panel-section validation-result" v-if="validationResult">
          <div :class="['validation-badge', validationResult.valid ? 'valid' : 'invalid']">
            {{ validationResult.valid ? '✅ 地图合法' : '❌ 地图无效' }}
          </div>
          <div v-for="(err, i) in validationResult.errors" :key="'e'+i" class="error-msg">{{ err }}</div>
          <div v-for="(warn, i) in validationResult.warnings" :key="'w'+i" class="warn-msg">{{ warn }}</div>
        </div>
      </div>

      <!-- 中央画布 -->
      <div class="editor-canvas-container" ref="canvasContainer">
        <canvas
          ref="editorCanvas"
          class="editor-canvas"
          @contextmenu.prevent
        ></canvas>
        <!-- 坐标显示 -->
        <div class="coord-display" v-if="hoverCoord">
          X:{{ hoverCoord.x }} Z:{{ hoverCoord.z }}
        </div>
      </div>

      <!-- 右侧面板：属性/信息 -->
      <div class="editor-panel right-panel">
        <div class="panel-section">
          <div class="section-title">地图属性</div>
          <div class="prop-row">
            <span class="prop-label">名称:</span>
            <input class="prop-input" v-model="mapName" />
          </div>
          <div class="prop-row">
            <span class="prop-label">作者:</span>
            <input class="prop-input" v-model="mapAuthor" />
          </div>
          <div class="prop-row">
            <span class="prop-label">尺寸:</span>
            <span class="prop-value">{{ mapWidth }}×{{ mapHeight }}</span>
          </div>
          <div class="prop-row">
            <span class="prop-label">出生点:</span>
            <span class="prop-value">{{ spawnCount }}</span>
          </div>
          <div class="prop-row">
            <span class="prop-label">资源点:</span>
            <span class="prop-value">{{ resourceCount }}</span>
          </div>
        </div>

        <div class="panel-section">
          <div class="section-title">统计信息</div>
          <div class="stat-row" v-for="(stat, i) in terrainStats" :key="i">
            <span class="stat-dot" :style="{ backgroundColor: stat.color }"></span>
            <span class="stat-name">{{ stat.name }}</span>
            <span class="stat-count">{{ stat.count }}</span>
          </div>
        </div>

        <div class="panel-section">
          <div class="section-title">快捷键</div>
          <div class="shortcut-list">
            <div class="shortcut-item"><kbd>Ctrl+Z</kbd> 撤销</div>
            <div class="shortcut-item"><kbd>Ctrl+Y</kbd> 重做</div>
            <div class="shortcut-item"><kbd>Ctrl+S</kbd> 保存</div>
            <div class="shortcut-item"><kbd>右键拖拽</kbd> 移动画布</div>
            <div class="shortcut-item"><kbd>滚轮</kbd> 缩放</div>
            <div class="shortcut-item"><kbd>[ ]</kbd> 笔刷大小</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { MapEditor, EDITOR_TOOL } from '../editor/MapEditor.js';
import { TERRAIN, TERRAIN_PROPS } from '../game/MapData.js';
import { getPresetMapList, getPresetMap } from '../game/maps/index.js';

// ── Props/Emits ──
const props = defineProps({
  visible: { type: Boolean, default: false },
});

const emit = defineEmits(['close', 'map-loaded']);

// ── 状态 ──
const editorCanvas = ref(null);
const canvasContainer = ref(null);
let editor = null;

const mapName = ref('未命名地图');
const mapAuthor = ref('作者');
const mapWidth = ref(128);
const mapHeight = ref(128);
const activeTool = ref('terrain_paint');
const selectedTerrain = ref(TERRAIN.GRASS);
const selectedResource = ref('mineral');
const selectedTeam = ref(1);
const brushSize = ref(2);
const canUndo = ref(false);
const canRedo = ref(false);
const hoverCoord = ref(null);
const validationResult = ref(null);

const spawnCount = computed(() => editor?.mapData?.spawnPoints?.length || 0);
const resourceCount = computed(() => editor?.mapData?.resourceNodes?.length || 0);

const terrainStats = computed(() => {
  if (!editor?.mapData) return [];
  const counts = {};
  const W = editor.mapData.width;
  const H = editor.mapData.height;
  for (let gz = 0; gz < H; gz++) {
    for (let gx = 0; gx < W; gx++) {
      const t = editor.mapData.terrain[gz][gx];
      counts[t] = (counts[t] || 0) + 1;
    }
  }
  return Object.entries(counts).map(([type, count]) => ({
    name: TERRAIN_PROPS[type]?.name || '未知',
    color: TERRAIN_PROPS[type]?.color || '#666',
    count,
  }));
});

const terrainTypes = [
  { id: TERRAIN.GRASS, name: '草地', color: '#3a7d2a' },
  { id: TERRAIN.DIRT, name: '泥土', color: '#8b7355' },
  { id: TERRAIN.ROCK, name: '岩石', color: '#6b6b6b' },
  { id: TERRAIN.WATER, name: '水域', color: '#2255aa' },
  { id: TERRAIN.HIGH, name: '高地', color: '#5a8a3a' },
  { id: TERRAIN.RAMP, name: '坡道', color: '#6a9a4a' },
];

const teamColors = { 1: '#4488ff', 2: '#ff4444', 3: '#44ff44', 4: '#ffff44' };
const presetMaps = getPresetMapList();

// ── 方法 ──
function setTool(tool) {
  activeTool.value = tool;
  editor?.setTool(tool);
}

function selectTerrain(terrainId) {
  selectedTerrain.value = terrainId;
  editor?.setTerrainType(terrainId);
}

function handleUndo() {
  editor?.undo();
  updateUndoRedo();
}

function handleRedo() {
  editor?.redo();
  updateUndoRedo();
}

function updateUndoRedo() {
  canUndo.value = editor?.undoStack?.length > 0;
  canRedo.value = editor?.redoStack?.length > 0;
}

function handleSave() {
  if (!editor) return;
  editor.downloadMap(`${mapName.value}.scmap`);
}

function handleExport() {
  if (!editor) return;
  const data = editor.mapData.exportForGame();
  const json = JSON.stringify(data);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${mapName.value}_game.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function handleNewMap(w, h) {
  editor?.newMap(w, h, mapName.value);
  mapWidth.value = w;
  mapHeight.value = h;
  updateStats();
}

function handleLoadPreset(mapId) {
  const mapData = getPresetMap(mapId);
  if (mapData && editor) {
    editor.loadMap(mapData);
    mapName.value = mapData.name;
    mapWidth.value = mapData.width;
    mapHeight.value = mapData.height;
    updateStats();
  }
}

function handleValidate() {
  if (!editor) return;
  validationResult.value = editor.validateCurrentMap();
}

function handleLoadFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.scmap,.json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        editor?.loadFromJSON(ev.target.result);
        updateStats();
      } catch (err) {
        alert('加载失败: ' + err.message);
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

function updateStats() {
  if (!editor?.mapData) return;
  mapWidth.value = editor.mapData.width;
  mapHeight.value = editor.mapData.height;
}

// ── 监听属性变化同步到编辑器 ──
watch(brushSize, (val) => editor?.setBrushSize(val));
watch(selectedResource, (val) => { if (editor) editor.currentResourceType = val; });
watch(selectedTeam, (val) => { if (editor) editor.selectedTeam = val; });

// ── 键盘快捷键 ──
function handleKeydown(e) {
  if (!props.visible) return;
  if (e.ctrlKey && e.key === 'z') { e.preventDefault(); handleUndo(); }
  if (e.ctrlKey && e.key === 'y') { e.preventDefault(); handleRedo(); }
  if (e.ctrlKey && e.key === 's') { e.preventDefault(); handleSave(); }
  if (e.key === '[') { brushSize.value = Math.max(1, brushSize.value - 1); }
  if (e.key === ']') { brushSize.value = Math.min(10, brushSize.value + 1); }
}

// ── 生命周期 ──
watch(() => props.visible, async (val) => {
  if (val) {
    await nextTick();
    if (editorCanvas.value && !editor) {
      editor = new MapEditor(editorCanvas.value, {
        onMapChange: () => updateStats(),
        onToolChange: () => updateUndoRedo(),
      });
      editor.canvas.width = canvasContainer.value?.clientWidth || 800;
      editor.canvas.height = canvasContainer.value?.clientHeight || 600;
      editor.markDirty();
      updateStats();
    } else if (editor) {
      editor.markDirty();
    }
  }
});

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
  editor?.destroy();
  editor = null;
});
</script>

<style scoped>
.editor-root {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: #0a0c1a;
  display: flex;
  flex-direction: column;
  z-index: 200;
}

/* ── 工具栏 ── */
.editor-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 12px;
  background: linear-gradient(180deg, #1a2040 0%, #12182e 100%);
  border-bottom: 1px solid #3a4060;
  height: 42px;
  flex-shrink: 0;
}

.toolbar-left, .toolbar-center, .toolbar-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.toolbar-title {
  color: #d4a843;
  font-size: 14px;
  font-weight: bold;
}

.toolbar-map-name {
  color: #888;
  font-size: 12px;
  margin-left: 8px;
}

.toolbar-btn {
  padding: 4px 10px;
  font-size: 12px;
  white-space: nowrap;
}

.toolbar-btn.active {
  background: rgba(196, 160, 64, 0.3);
  border-color: #d4a843;
  color: #d4a843;
}

.toolbar-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.save-btn {
  border-color: #4a8;
  color: #4a8;
}

/* ── 主体 ── */
.editor-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* ── 面板 ── */
.editor-panel {
  width: 220px;
  background: rgba(15, 18, 30, 0.95);
  border-right: 1px solid #2a3050;
  overflow-y: auto;
  flex-shrink: 0;
  padding: 8px;
}

.right-panel {
  border-right: none;
  border-left: 1px solid #2a3050;
}

.panel-section {
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #2a3050;
}

.section-title {
  color: #d4a843;
  font-size: 12px;
  font-weight: bold;
  margin-bottom: 6px;
  letter-spacing: 1px;
}

/* ── 地形按钮 ── */
.terrain-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
}

.terrain-btn {
  width: 100%;
  height: 36px;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.terrain-btn:hover {
  border-color: #d4a843;
}

.terrain-btn.selected {
  border-color: #fff;
  box-shadow: 0 0 8px rgba(255, 255, 255, 0.3);
}

.terrain-label {
  font-size: 10px;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0,0,0,0.8);
}

/* ── 资源/队伍选项 ── */
.resource-options, .team-options, .size-options, .preset-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.res-btn, .size-btn, .preset-btn {
  padding: 4px 8px;
  font-size: 11px;
}

.res-btn.active {
  background: rgba(196, 160, 64, 0.3);
  border-color: #d4a843;
}

.team-btn {
  width: 36px;
  height: 28px;
  background: rgba(20, 25, 40, 0.8);
  border: 2px solid #444;
  color: #fff;
  font-size: 11px;
  cursor: pointer;
}

.team-btn.active {
  background: rgba(196, 160, 64, 0.3);
}

/* ── 滑块 ── */
.brush-slider {
  width: 100%;
  accent-color: #d4a843;
}

/* ── 画布 ── */
.editor-canvas-container {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: #111;
}

.editor-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.coord-display {
  position: absolute;
  bottom: 8px;
  left: 8px;
  background: rgba(0, 0, 0, 0.7);
  color: #0f0;
  font-family: monospace;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 3px;
  pointer-events: none;
}

/* ── 属性/统计 ── */
.prop-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.prop-label {
  color: #888;
  font-size: 12px;
}

.prop-value {
  color: #ccc;
  font-size: 12px;
}

.prop-input {
  background: rgba(20, 25, 40, 0.8);
  border: 1px solid #444;
  color: #fff;
  padding: 2px 6px;
  font-size: 12px;
  width: 100px;
  text-align: right;
}

.stat-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 2px;
  font-size: 11px;
}

.stat-dot {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  flex-shrink: 0;
}

.stat-name {
  color: #aaa;
  flex: 1;
}

.stat-count {
  color: #d4a843;
  font-family: monospace;
}

/* ── 验证结果 ── */
.validation-result {
  border-top: 1px solid #3a4060;
  padding-top: 8px;
}

.validation-badge {
  padding: 4px 8px;
  text-align: center;
  font-size: 12px;
  font-weight: bold;
  border-radius: 4px;
  margin-bottom: 4px;
}

.validation-badge.valid {
  background: rgba(40, 180, 60, 0.3);
  color: #4a4;
}

.validation-badge.invalid {
  background: rgba(220, 40, 40, 0.3);
  color: #f44;
}

.error-msg {
  color: #f44;
  font-size: 11px;
  padding: 2px 0;
}

.warn-msg {
  color: #fa0;
  font-size: 11px;
  padding: 2px 0;
}

/* ── 快捷键 ── */
.shortcut-list {
  font-size: 11px;
  color: #888;
}

.shortcut-item {
  margin-bottom: 2px;
}

kbd {
  background: rgba(30, 35, 50, 0.9);
  border: 1px solid #555;
  padding: 1px 4px;
  border-radius: 2px;
  font-family: monospace;
  font-size: 10px;
  color: #ccc;
}

/* ── 通用按钮 ── */
.full-width {
  width: 100%;
  margin-bottom: 4px;
}
</style>
