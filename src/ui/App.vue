<!-- ═══════════════════════════════════════════════
  StarCraft Web - Vue3 主应用组件
  包含游戏画布容器和所有UI覆盖层
  管理游戏状态（菜单/游戏中/暂停/结束）
  引入所有子组件
  全局快捷键监听（ESC暂停，F10菜单）
═══════════════════════════════════════════════ -->
<template>
  <div id="game-root" class="game-root">
    <!-- 游戏画布容器（Three.js渲染目标） -->
    <canvas ref="gameCanvas" id="game-canvas" class="game-canvas"></canvas>

    <!-- 主菜单 / 暂停菜单 / 游戏结束画面 -->
    <MainMenu
      :visible="showMenu"
      :mode="menuMode"
      :gameResult="gameResult"
      :gameStats="gameStats"
      @start-game="handleStartGame"
      @resume="handleResume"
      @restart="handleRestart"
      @quit="handleQuit"
    />

    <!-- 游戏内HUD（资源栏 + 小地图 + 建造栏 + 单位信息） -->
    <GameHUD
      ref="gameHUD"
      :visible="gameState.running && !gameState.paused"
      :resources="currentResources"
      :playerRace="gameState.playerRace"
      :gameTime="gameState.gameTime"
      :fps="gameState.fps"
      :showFps="showFps"
      :selectedUnits="gameState.selectedUnits"
      :selectedBuilding="selectedBuilding"
      :selectedUnit="selectedUnit"
      :availableBuildings="availableBuildings"
      :availableUnits="availableUnits"
      :availableTech="availableTech"
      :ownedBuildings="ownedBuildings"
      :completedTech="completedTech"
      :buildQueue="buildQueue"
      :terrain="terrainData"
      :friendlyUnits="friendlyUnits"
      :enemyUnits="enemyUnits"
      :neutralUnits="neutralUnits"
      :friendlyBuildings="friendlyBuildings"
      :enemyBuildings="enemyBuildings"
      :cameraPos="cameraPos"
      :cameraViewSize="cameraViewSize"
      :playerTeam="1"
      @minimap-click="handleMinimapClick"
      @minimap-right-click="handleMinimapRightClick"
      @build-click="handleBuildClick"
      @ability-click="handleAbilityClick"
      @research-click="handleResearchClick"
    />

    <!-- FPS显示（调试用） -->
    <div class="fps-display" v-if="showFps && gameState.running">
      FPS: {{ gameState.fps }}
    </div>
  </div>
</template>

<script setup>
/**
 * App.vue - StarCraft Web 主应用组件
 * 
 * 核心职责：
 * 1. 管理游戏状态机：menu → playing → paused → gameover → menu
 * 2. 初始化Three.js游戏引擎
 * 3. 维护游戏数据（资源、单位、建筑等）供UI绑定
 * 4. 监听全局快捷键（ESC暂停/继续，F10显示FPS）
 * 5. 连接EventBus，同步游戏事件到UI状态
 */
import { ref, reactive, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { eventBus } from '../shared/EventBus.js';
import { GAME, EVENTS, RACE } from '../shared/Constants.js';
import MainMenu from './components/MainMenu.vue';
import GameHUD from './components/GameHUD.vue';

// ─── 游戏画布引用 ──────────────────────────
const gameCanvas = ref(null);
const gameHUD = ref(null);

// ─── 游戏状态机 ────────────────────────────
/**
 * 游戏阶段：
 * - menu: 主菜单（默认）
 * - playing: 游戏进行中
 * - paused: 暂停
 * - gameover: 游戏结束
 */
const gameState = reactive({
  running: false,
  paused: false,
  playerRace: RACE.TERRAN,
  gameTime: 0,
  fps: 0,
  selectedUnits: [],
});

// ─── UI相关状态 ─────────────────────────────
const showFps = ref(false);
const gameResult = ref('victory');
const gameStats = ref(null);
const selectedBuilding = ref(null);
const selectedUnit = ref(null);
const availableBuildings = ref([]);
const availableUnits = ref([]);
const availableTech = ref([]);
const ownedBuildings = ref([]);
const completedTech = ref([]);
const buildQueue = ref([]);
const terrainData = ref([]);
const friendlyUnits = ref([]);
const enemyUnits = ref([]);
const neutralUnits = ref([]);
const friendlyBuildings = ref([]);
const enemyBuildings = ref([]);
const cameraPos = ref({ x: 0, z: 0 });
const cameraViewSize = ref(20);

// ─── 当前资源（玩家1） ─────────────────────
const currentResources = computed(() => ({
  minerals: gameState.resources?.minerals ?? GAME.STARTING_MINERALS,
  gas: gameState.resources?.gas ?? GAME.STARTING_GAS,
  supply: gameState.resources?.supply ?? 0,
  supplyMax: gameState.resources?.supplyMax ?? 10,
}));

// 初始化资源数据
gameState.resources = {
  minerals: GAME.STARTING_MINERALS,
  gas: GAME.STARTING_GAS,
  supply: 0,
  supplyMax: 10,
};

// ─── 菜单状态 ──────────────────────────────
const showMenu = computed(() => {
  return !gameState.running || gameState.paused || menuMode.value === 'gameover';
});

const menuMode = computed(() => {
  if (gameState.paused) return 'pause';
  if (menuModeValue.value === 'gameover') return 'gameover';
  return 'menu';
});

const menuModeValue = ref('menu');

// ─── 事件监听注册 ──────────────────────────
const cleanupFns = [];

/**
 * 注册所有EventBus事件监听器
 * 同步游戏引擎数据到UI响应式状态
 */
function registerEventListeners() {
  // 资源变化
  cleanupFns.push(eventBus.on(EVENTS.RESOURCE_CHANGED, (data) => {
    if (data.team === 1) {
      gameState.resources = { ...data.resources };
    }
  }));

  // 人口变化
  cleanupFns.push(eventBus.on(EVENTS.SUPPLY_CHANGED, (data) => {
    if (data.team === 1) {
      gameState.resources.supply = data.supply;
      gameState.resources.supplyMax = data.supplyMax;
    }
  }));

  // 单位选择
  cleanupFns.push(eventBus.on(EVENTS.SELECT_UNITS, (units) => {
    gameState.selectedUnits = units.map(u => ({
      id: u.id,
      type: u.type,
      name: u.name,
      nameEn: u.nameEn,
      hp: u.hp,
      maxHp: u.maxHp,
      shield: u.shield || 0,
      maxShield: u.maxShield || 0,
      armor: u.armor || 0,
      speed: u.speed || 0,
      attack: u.attack,
      abilities: u.abilities || [],
      team: u.team,
    }));

    // 如果选中的是建筑，更新建筑信息
    if (units.length === 1 && units[0].type?.includes('building')) {
      selectedBuilding.value = units[0];
      selectedUnit.value = null;
    } else if (units.length === 1) {
      selectedUnit.value = units[0];
      selectedBuilding.value = null;
    } else {
      selectedBuilding.value = null;
      selectedUnit.value = null;
    }
  }));

  // 取消选择
  cleanupFns.push(eventBus.on(EVENTS.DESELECT, () => {
    gameState.selectedUnits = [];
    selectedBuilding.value = null;
    selectedUnit.value = null;
  }));

  // 游戏tick（更新时间、FPS等）
  cleanupFns.push(eventBus.on(EVENTS.TICK, (tickData) => {
    gameState.gameTime = tickData.time || 0;
    gameState.fps = tickData.fps || 0;
  }));

  // 游戏开始
  cleanupFns.push(eventBus.on(EVENTS.GAME_START, () => {
    gameState.running = true;
    gameState.paused = false;
    menuModeValue.value = 'menu';
  }));

  // 游戏暂停
  cleanupFns.push(eventBus.on(EVENTS.GAME_PAUSE, () => {
    gameState.paused = true;
  }));

  // 游戏恢复
  cleanupFns.push(eventBus.on(EVENTS.GAME_RESUME, () => {
    gameState.paused = false;
  }));

  // 游戏结束
  cleanupFns.push(eventBus.on(EVENTS.GAME_OVER, (data) => {
    gameState.running = false;
    gameResult.value = data?.result || 'victory';
    gameStats.value = data?.stats || null;
    menuModeValue.value = 'gameover';
  }));

  // 建筑建造完成
  cleanupFns.push(eventBus.on(EVENTS.BUILD_COMPLETE, (data) => {
    if (data?.building) {
      ownedBuildings.value.push(data.building);
    }
  }));

  // 科技研究完成
  cleanupFns.push(eventBus.on(EVENTS.TECH_COMPLETE, (data) => {
    if (data?.techId) {
      completedTech.value.push(data.techId);
    }
  }));

  // 摄像机移动
  cleanupFns.push(eventBus.on(EVENTS.CAMERA_MOVE, (data) => {
    if (data) {
      cameraPos.value = { x: data.x || 0, z: data.z || 0 };
      if (data.viewSize) cameraViewSize.value = data.viewSize;
    }
  }));
}

// ─── 快捷键监听 ────────────────────────────
/**
 * 全局快捷键处理
 * ESC: 暂停/继续
 * F10: 切换FPS显示
 */
function handleKeydown(event) {
  switch (event.key) {
    case 'Escape':
      event.preventDefault();
      if (gameState.running && !gameState.paused) {
        // 暂停游戏
        gameState.paused = true;
        eventBus.emit(EVENTS.GAME_PAUSE);
      } else if (gameState.paused) {
        // 继续游戏
        handleResume();
      }
      break;

    case 'F10':
      event.preventDefault();
      showFps.value = !showFps.value;
      break;
  }
}

// ─── 游戏控制方法 ──────────────────────────
/**
 * 开始新游戏
 * @param {Object} options - { race, difficulty }
 */
function handleStartGame(options) {
  gameState.playerRace = options?.race || RACE.TERRAN;
  gameState.running = true;
  gameState.paused = false;
  menuModeValue.value = 'menu';

  // 重置游戏数据
  ownedBuildings.value = [];
  completedTech.value = [];
  buildQueue.value = [];
  gameState.selectedUnits = [];
  gameState.gameTime = 0;

  // 触发游戏开始事件
  eventBus.emit(EVENTS.GAME_START, {
    race: gameState.playerRace,
    difficulty: options?.difficulty || 'normal',
  });

  // 初始化游戏引擎
  nextTick(() => {
    initGameEngine();
  });
}

/**
 * 初始化游戏引擎
 * 将canvas传递给引擎层
 */
function initGameEngine() {
  if (!gameCanvas.value) return;

  // 触发canvas就绪事件，让引擎层初始化
  eventBus.emit('engine:init', {
    canvas: gameCanvas.value,
    race: gameState.playerRace,
  });
}

/**
 * 继续游戏
 */
function handleResume() {
  gameState.paused = false;
  eventBus.emit(EVENTS.GAME_RESUME);
}

/**
 * 重新开始
 */
function handleRestart() {
  gameState.running = false;
  gameState.paused = false;
  menuModeValue.value = 'menu';
  // 延迟后重新显示菜单
  nextTick(() => {
    showMenu.value && (menuModeValue.value = 'menu');
  });
}

/**
 * 返回主菜单
 */
function handleQuit() {
  gameState.running = false;
  gameState.paused = false;
  gameState.selectedUnits = [];
  menuModeValue.value = 'menu';
  eventBus.emit(EVENTS.GAME_OVER, { result: 'quit' });
}

// ─── HUD事件处理 ───────────────────────────
function handleMinimapClick(data) {
  eventBus.emit(EVENTS.CAMERA_MOVE, data);
}

function handleMinimapRightClick(data) {
  eventBus.emit(EVENTS.COMMAND_ISSUED, {
    command: 'move',
    target: data,
  });
}

function handleBuildClick(data) {
  eventBus.emit(EVENTS.BUILD_PANEL_CLICK, data);
}

function handleAbilityClick(ability) {
  eventBus.emit(EVENTS.COMMAND_ISSUED, {
    command: 'cast',
    ability: ability,
  });
}

function handleResearchClick(data) {
  eventBus.emit(EVENTS.TECH_START, { techId: data.tech?.id });
}

// ─── 生命周期 ───────────────────────────────
onMounted(() => {
  // 注册事件监听
  registerEventListeners();

  // 注册全局快捷键
  window.addEventListener('keydown', handleKeydown);

  console.log('[App] StarCraft Web UI initialized');
});

onUnmounted(() => {
  // 清理事件监听
  cleanupFns.forEach(fn => fn());
  cleanupFns.length = 0;

  // 移除快捷键监听
  window.removeEventListener('keydown', handleKeydown);

  console.log('[App] StarCraft Web UI cleaned up');
});
</script>

<style scoped>
/* ─── 游戏根容器 ───────────────────────────── */
.game-root {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
  background: #000;
}

/* ─── 游戏画布 ─────────────────────────────── */
.game-canvas {
  width: 100%;
  height: 100%;
  display: block;
  position: absolute;
  top: 0;
  left: 0;
}

/* ─── FPS调试显示 ──────────────────────────── */
.fps-display {
  position: fixed;
  top: 50px;
  left: 10px;
  color: #00ff00;
  font-family: monospace;
  font-size: 12px;
  z-index: 999;
  pointer-events: none;
  text-shadow: 0 0 2px rgba(0, 255, 0, 0.5);
}
</style>
