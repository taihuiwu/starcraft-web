<!-- ═══════════════════════════════════════════════
  StarCraft Web - 游戏内HUD主布局
  全屏覆盖在Three.js画布上，pointer-events:none
  布局：顶部资源栏 + 左侧小地图 + 右侧建造栏 + 底部单位信息栏
═══════════════════════════════════════════════ -->
<template>
  <div class="game-hud" v-if="visible">
    <!-- 顶部资源栏 -->
    <div class="hud-top">
      <ResourceBar
        :visible="true"
        :minerals="resources.minerals"
        :gas="resources.gas"
        :supply="resources.supply"
        :supplyMax="resources.supplyMax"
        :gameTime="gameTime"
        :fps="fps"
        :showFps="showFps"
      />
    </div>

    <!-- 左侧小地图 -->
    <div class="hud-left">
      <MiniMap
        :visible="true"
        :size="minimapSize"
        :mapSize="mapSize"
        :terrain="terrain"
        :friendlyUnits="friendlyUnits"
        :enemyUnits="enemyUnits"
        :neutralUnits="neutralUnits"
        :friendlyBuildings="friendlyBuildings"
        :enemyBuildings="enemyBuildings"
        :cameraPos="cameraPos"
        :cameraViewSize="cameraViewSize"
        :playerTeam="playerTeam"
        @minimap-click="handleMinimapClick"
        @minimap-right-click="handleMinimapRightClick"
      />
    </div>

    <!-- 右侧建造栏 -->
    <div class="hud-right">
      <BuildPanel
        :visible="showBuildPanel"
        :playerRace="playerRace"
        :selectedBuilding="selectedBuilding"
        :selectedUnit="selectedUnit"
        :availableBuildings="availableBuildings"
        :availableUnits="availableUnits"
        :availableTech="availableTech"
        :ownedBuildings="ownedBuildings"
        :completedTech="completedTech"
        :buildQueue="buildQueue"
        :resources="resources"
        @build-click="handleBuildClick"
        @panel-switch="handlePanelSwitch"
      />
    </div>

    <!-- 底部单位信息栏 -->
    <div class="hud-bottom">
      <UnitInfo
        :visible="true"
        :selectedUnits="selectedUnits"
        @ability-click="handleAbilityClick"
      />
    </div>

    <!-- 科技面板（浮动弹窗） -->
    <TechPanel
      :visible="showTechPanel"
      :buildingName="techPanelBuildingName"
      :techItems="techPanelItems"
      :completedTech="completedTech"
      :researchingTech="researchingTech"
      :resources="resources"
      @close="showTechPanel = false"
      @research-click="handleResearchClick"
    />
  </div>
</template>

<script setup>
/**
 * GameHUD - 游戏内HUD主布局组件
 * 
 * 作为所有游戏内UI元素的容器：
 * - 全屏覆盖在Three.js画布上
 * - 使用pointer-events:none避免阻止游戏交互
 * - 子组件（面板/按钮）使用pointer-events:auto恢复交互
 * 
 * 布局参考SC1原版：
 * - 顶部：资源栏（水晶、瓦斯、人口、时间）
 * - 左下角：小地图
 * - 右侧：建造/生产/科技面板
 * - 底部：选中单位信息面板
 */
import { ref, computed } from 'vue';
import { eventBus } from '../../shared/EventBus.js';
import { EVENTS, GAME } from '../../shared/Constants.js';
import ResourceBar from './ResourceBar.vue';
import MiniMap from './MiniMap.vue';
import BuildPanel from './BuildPanel.vue';
import UnitInfo from './UnitInfo.vue';
import TechPanel from './TechPanel.vue';

// ─── Props定义 ─────────────────────────────
const props = defineProps({
  /** 是否显示HUD */
  visible: { type: Boolean, default: true },
  /** 游戏状态 */
  gameState: { type: Object, default: () => ({}) },
  /** 玩家资源 {minerals, gas, supply, supplyMax} */
  resources: { type: Object, default: () => ({
    minerals: GAME.STARTING_MINERALS,
    gas: GAME.STARTING_GAS,
    supply: 0,
    supplyMax: 10,
  })},
  /** 玩家种族 */
  playerRace: { type: String, default: 'terran' },
  /** 游戏时间（tick） */
  gameTime: { type: Number, default: 0 },
  /** FPS */
  fps: { type: Number, default: 0 },
  /** 是否显示FPS */
  showFps: { type: Boolean, default: false },
  /** 选中的单位列表 */
  selectedUnits: { type: Array, default: () => [] },
  /** 选中的建筑 */
  selectedBuilding: { type: Object, default: null },
  /** 选中的单位（单个，用于建造面板） */
  selectedUnit: { type: Object, default: null },
  /** 可建造建筑列表 */
  availableBuildings: { type: Array, default: () => [] },
  /** 可训练单位列表 */
  availableUnits: { type: Array, default: () => [] },
  /** 可研究科技列表 */
  availableTech: { type: Array, default: () => [] },
  /** 已拥有的建筑 */
  ownedBuildings: { type: Array, default: () => [] },
  /** 已完成的科技 */
  completedTech: { type: Array, default: () => [] },
  /** 生产队列 */
  buildQueue: { type: Array, default: () => [] },
  /** 小地图尺寸 */
  minimapSize: { type: Number, default: 200 },
  /** 地图大小 */
  mapSize: { type: Number, default: GAME.MAP_SIZE },
  /** 地形数据 */
  terrain: { type: Array, default: () => [] },
  /** 友方单位 */
  friendlyUnits: { type: Array, default: () => [] },
  /** 敌方单位 */
  enemyUnits: { type: Array, default: () => [] },
  /** 中立单位 */
  neutralUnits: { type: Array, default: () => [] },
  /** 友方建筑 */
  friendlyBuildings: { type: Array, default: () => [] },
  /** 敌方建筑 */
  enemyBuildings: { type: Array, default: () => [] },
  /** 摄像机位置 */
  cameraPos: { type: Object, default: () => ({ x: 0, z: 0 }) },
  /** 摄像机视野范围 */
  cameraViewSize: { type: Number, default: 20 },
  /** 玩家队伍号 */
  playerTeam: { type: Number, default: 1 },
});

// ─── Emits定义 ─────────────────────────────
const emit = defineEmits([
  /** 小地图点击 */
  'minimap-click',
  /** 小地图右键 */
  'minimap-right-click',
  /** 建造栏点击 */
  'build-click',
  /** 技能点击 */
  'ability-click',
  /** 科技研究 */
  'research-click',
]);

// ─── 状态 ──────────────────────────────────
/** 是否显示建造面板 */
const showBuildPanel = ref(true);
/** 是否显示科技面板 */
const showTechPanel = ref(false);
/** 科技面板所属建筑名称 */
const techPanelBuildingName = ref('');
/** 科技面板项目列表 */
const techPanelItems = ref([]);
/** 正在研究的科技 */
const researchingTech = ref([]);

// ─── 事件处理 ──────────────────────────────
/**
 * 小地图点击：移动摄像机视野
 */
function handleMinimapClick(data) {
  emit('minimap-click', data);
}

/**
 * 小地图右键：发出移动命令
 */
function handleMinimapRightClick(data) {
  emit('minimap-right-click', data);
}

/**
 * 建造栏点击：建造建筑/训练单位
 */
function handleBuildClick(data) {
  emit('build-click', data);
}

/**
 * 面板切换：显示/隐藏建造面板
 */
function handlePanelSwitch(tab) {
  showBuildPanel.value = true;
}

/**
 * 技能按钮点击
 */
function handleAbilityClick(ability) {
  emit('ability-click', ability);
}

/**
 * 科技研究点击
 */
function handleResearchClick(data) {
  emit('research-click', data);
}

// ─── 公开方法（供父组件调用） ──────────────
/**
 * 打开科技面板
 * @param {Object} building - 建筑对象
 * @param {Array} techItems - 该建筑的科技列表
 */
function openTechPanel(building, techItems) {
  techPanelBuildingName.value = building.name || '';
  techPanelItems.value = techItems || [];
  showTechPanel.value = true;
}

// 暴露方法给父组件
defineExpose({
  openTechPanel,
  showBuildPanel,
  showTechPanel,
});
</script>

<style scoped>
/* ─── HUD整体布局 ──────────────────────────── */
.game-hud {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none; /* 整体不阻止游戏交互 */
  z-index: 10;
  font-family: var(--sc-font), var(--sc-font-cn);
}

/* ─── 顶部区域 ─────────────────────────────── */
.hud-top {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  padding: var(--sc-hud-padding);
  z-index: 15;
}

/* ─── 左侧区域（小地图） ───────────────────── */
.hud-left {
  position: absolute;
  bottom: var(--sc-hud-padding);
  left: var(--sc-hud-padding);
  z-index: 15;
}

/* ─── 右侧区域（建造栏） ───────────────────── */
.hud-right {
  position: absolute;
  top: 50px;
  right: var(--sc-hud-padding);
  transform: translateY(0);
  z-index: 15;
}

/* ─── 底部区域（单位信息） ──────────────────── */
.hud-bottom {
  position: absolute;
  bottom: var(--sc-hud-padding);
  left: calc(var(--sc-minimap-size) + var(--sc-hud-padding) * 2 + 8px);
  right: calc(240px + var(--sc-hud-padding) * 2 + 8px);
  z-index: 15;
}

/* ─── 移动端适配 ───────────────────────────── */
@media (max-width: 768px) {
  .hud-bottom {
    left: calc(140px + var(--sc-hud-padding) * 2 + 8px);
    right: calc(180px + var(--sc-hud-padding) * 2 + 8px);
  }
}

@media (max-width: 480px) {
  .hud-bottom {
    left: calc(100px + var(--sc-hud-padding) * 2 + 4px);
    right: calc(160px + var(--sc-hud-padding) * 2 + 4px);
  }
}
</style>
