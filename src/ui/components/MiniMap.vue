<!-- ═══════════════════════════════════════════════
  StarCraft Web - 小地图组件
  左下角200×200像素小地图
  Canvas 2D绘制：绿色=友方，红色=敌方，白色=中立
  支持点击移动视野框、右键发出移动命令
═══════════════════════════════════════════════ -->
<template>
  <div class="minimap-container sc-panel" v-if="visible">
    <!-- 小地图Canvas -->
    <canvas
      ref="canvasRef"
      class="minimap-canvas"
      :width="size"
      :height="size"
      @click="handleClick"
      @contextmenu.prevent="handleRightClick"
    ></canvas>

    <!-- 视野框（用CSS绘制，性能更好） -->
    <div
      class="viewport-rect"
      :style="viewportStyle"
    ></div>
  </div>
</template>

<script setup>
/**
 * MiniMap - 小地图组件
 * 
 * 功能：
 * - 使用Canvas 2D绘制地图缩略图（地形 + 单位/建筑）
 * - 友方单位显示绿色，敌方红色，中立白色
 * - 鼠标左键点击移动摄像机视野
 * - 鼠标右键点击发出移动命令到该位置
 * - 用矩形框表示当前摄像机视野范围
 * 
 * 地图数据通过props传入，Canvas每帧重绘
 */
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { eventBus } from '../../shared/EventBus.js';
import { EVENTS, GAME, TEAM_COLORS } from '../../shared/Constants.js';

// ─── Props定义 ─────────────────────────────
const props = defineProps({
  /** 是否显示小地图 */
  visible: { type: Boolean, default: true },
  /** 小地图尺寸（像素） */
  size: { type: Number, default: 200 },
  /** 地图大小（网格数） */
  mapSize: { type: Number, default: GAME.MAP_SIZE },
  /** 地形数据（二维数组，0-1表示高度） */
  terrain: { type: Array, default: () => [] },
  /** 友方单位列表 [{x, z, type, team}] */
  friendlyUnits: { type: Array, default: () => [] },
  /** 敌方单位列表 [{x, z, type, team}] */
  enemyUnits: { type: Array, default: () => [] },
  /** 中立单位列表 [{x, z, type}] */
  neutralUnits: { type: Array, default: () => [] },
  /** 友方建筑列表 [{x, z, type, team}] */
  friendlyBuildings: { type: Array, default: () => [] },
  /** 敌方建筑列表 [{x, z, type, team}] */
  enemyBuildings: { type: Array, default: () => [] },
  /** 摄像机位置 {x, z}（世界坐标） */
  cameraPos: { type: Object, default: () => ({ x: 0, z: 0 }) },
  /** 摄像机视野范围（世界坐标单位） */
  cameraViewSize: { type: Number, default: 20 },
  /** 玩家队伍号 */
  playerTeam: { type: Number, default: 1 },
});

// ─── Emits定义 ─────────────────────────────
const emit = defineEmits([
  /** 小地图点击移动视野 */
  'minimap-click',
  /** 小地图右键发出命令 */
  'minimap-right-click',
]);

// ─── Canvas引用 ─────────────────────────────
const canvasRef = ref(null);
let canvasCtx = null;

// ─── 缩放比例 ──────────────────────────────
/**
 * 像素/网格比例：小地图总像素 / 地图网格数
 * 例如：200px / 128格 = 1.5625 px/grid
 */
const scale = computed(() => props.size / props.mapSize);

// ─── 视野框样式 ─────────────────────────────
/**
 * 将摄像机位置和视野范围转换为小地图上的矩形框
 * 视野框居中显示在小地图上对应的位置
 */
const viewportStyle = computed(() => {
  const s = scale.value;
  const halfView = props.cameraViewSize / 2;

  // 摄像机位置转换为小地图像素坐标
  const x = (props.cameraPos.x - halfView) * s;
  const z = (props.cameraPos.z - halfView) * s;
  const w = props.cameraViewSize * s;
  const h = props.cameraViewSize * s;

  return {
    left: `${x}px`,
    top: `${z}px`,
    width: `${w}px`,
    height: `${h}px`,
  };
});

// ─── Canvas绘制 ─────────────────────────────
/**
 * 绘制地形底图
 * 使用暗色背景，根据地形高度绘制不同亮度的色块
 */
function drawTerrain() {
  if (!canvasCtx || !props.terrain.length) return;

  const s = scale.value;
  const ctx = canvasCtx;

  // 清空画布
  ctx.fillStyle = '#0a0c12';
  ctx.fillRect(0, 0, props.size, props.size);

  // 绘制地形
  for (let z = 0; z < props.mapSize; z++) {
    if (!props.terrain[z]) continue;
    for (let x = 0; x < props.mapSize; x++) {
      const height = props.terrain[z]?.[x] ?? 0;
      // 根据高度决定颜色深浅
      const brightness = Math.floor(20 + height * 40);
      ctx.fillStyle = `rgb(${brightness}, ${brightness + 5}, ${brightness})`;
      ctx.fillRect(x * s, z * s, Math.ceil(s), Math.ceil(s));
    }
  }
}

/**
 * 绘制建筑标记
 * 友方建筑：绿色，敌方建筑：红色
 * 建筑比单位大，用较大的方块表示
 */
function drawBuildings(buildings, color) {
  if (!canvasCtx) return;

  const s = scale.value;
  const ctx = canvasCtx;
  const buildingSize = Math.max(s * 1.5, 3); // 建筑标记最小3px

  ctx.fillStyle = color;

  buildings.forEach(b => {
    const px = b.x * s;
    const pz = b.z * s;
    ctx.fillRect(
      px - buildingSize / 2,
      pz - buildingSize / 2,
      buildingSize,
      buildingSize
    );
  });
}

/**
 * 绘制单位标记
 * 友方：亮绿色，敌方：红色
 * 单位用小圆点或方块表示
 */
function drawUnits(units, color) {
  if (!canvasCtx) return;

  const s = scale.value;
  const ctx = canvasCtx;
  const unitSize = Math.max(s * 0.8, 2); // 单位标记最小2px

  ctx.fillStyle = color;

  units.forEach(u => {
    const px = u.x * s;
    const pz = u.z * s;
    ctx.fillRect(
      px - unitSize / 2,
      pz - unitSize / 2,
      unitSize,
      unitSize
    );
  });
}

/**
 * 主绘制函数
 * 按顺序绘制：地形 → 友方建筑 → 敌方建筑 → 友方单位 → 敌方单位
 */
function draw() {
  if (!canvasCtx) return;

  drawTerrain();

  // 绘制建筑（先画建筑，因为建筑较大）
  drawBuildings(props.friendlyBuildings, '#00cc44'); // 友方建筑：绿色
  drawBuildings(props.enemyBuildings, '#cc2200');    // 敌方建筑：红色

  // 绘制单位
  drawUnits(props.friendlyUnits, '#44ff44');   // 友方单位：亮绿色
  drawUnits(props.enemyUnits, '#ff4444');       // 敌方单位：亮红色
  drawUnits(props.neutralUnits, '#cccccc');     // 中立：灰色
}

// ─── 鼠标事件处理 ──────────────────────────
/**
 * 左键点击小地图：移动摄像机视野到点击位置
 * 将小地图像素坐标转换为世界坐标
 */
function handleClick(event) {
  const rect = canvasRef.value.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const z = event.clientY - rect.top;

  // 转换为世界坐标
  const worldX = x / scale.value;
  const worldZ = z / scale.value;

  emit('minimap-click', { x: worldX, z: worldZ });

  // 同时发送EventBus事件供其他系统使用
  eventBus.emit(EVENTS.MINIMAP_CLICK, { x: worldX, z: worldZ });
}

/**
 * 右键点击小地图：发出移动命令到该位置
 * 与主界面右键命令行为一致
 */
function handleRightClick(event) {
  const rect = canvasRef.value.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const z = event.clientY - rect.top;

  // 转换为世界坐标
  const worldX = x / scale.value;
  const worldZ = z / scale.value;

  emit('minimap-right-click', { x: worldX, z: worldZ });
}

// ─── 生命周期 ───────────────────────────────
onMounted(async () => {
  await nextTick();
  if (canvasRef.value) {
    canvasCtx = canvasRef.value.getContext('2d');
    draw();
  }
});

// ─── 监听数据变化重绘 ─────────────────────
// 使用防抖避免频繁重绘
let drawTimer = null;

function scheduleRedraw() {
  if (drawTimer) cancelAnimationFrame(drawTimer);
  drawTimer = requestAnimationFrame(draw);
}

watch(
  () => [props.terrain, props.friendlyUnits, props.enemyUnits,
         props.friendlyBuildings, props.enemyBuildings],
  scheduleRedraw,
  { deep: true }
);

// 地形数据变化时也重绘
watch(() => props.terrain, scheduleRedraw, { deep: true });

onUnmounted(() => {
  if (drawTimer) cancelAnimationFrame(drawTimer);
});
</script>

<style scoped>
/* ─── 小地图容器 ───────────────────────────── */
.minimap-container {
  position: relative;
  width: var(--sc-minimap-size);
  height: var(--sc-minimap-size);
  background: #0a0c12;
  border: 2px solid var(--sc-border-gold);
  box-shadow:
    inset 0 0 20px rgba(0, 0, 0, 0.8),
    0 0 12px rgba(139, 115, 48, 0.4);
  overflow: hidden;
  cursor: crosshair;
  pointer-events: auto;
}

/* ─── Canvas画布 ──────────────────────────── */
.minimap-canvas {
  display: block;
  width: 100%;
  height: 100%;
  image-rendering: pixelated; /* 像素风渲染，避免模糊 */
}

/* ─── 视野框 ───────────────────────────────── */
.viewport-rect {
  position: absolute;
  border: 1.5px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 0 4px rgba(255, 255, 255, 0.4);
  pointer-events: none;
  z-index: 2;
}

/* ─── 移动端适配 ───────────────────────────── */
@media (max-width: 768px) {
  .minimap-container {
    width: 140px;
    height: 140px;
  }
}

@media (max-width: 480px) {
  .minimap-container {
    width: 100px;
    height: 100px;
  }
}
</style>
