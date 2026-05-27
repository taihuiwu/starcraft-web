// ═══════════════════════════════════════════
// StarCraft Web - Vue3 应用入口
// 初始化游戏引擎、UI、事件总线，挂载到 #app
// ═══════════════════════════════════════════

import { createApp, reactive, ref } from 'vue';
import { eventBus } from './shared/EventBus.js';
import { GAME, EVENTS, RACE } from './shared/Constants.js';
import GameManager from './game/GameManager.js';
import ResourceManager from './game/ResourceManager.js';
import Selection from './game/Selection.js';
import CommandSystem from './game/CommandSystem.js';
import CombatSystem from './game/CombatSystem.js';
import TechTree from './game/TechTree.js';
import BuildingSystem from './game/BuildingSystem.js';

// ─── Vue3 应用实例 ────────────────────────
const app = createApp({
  setup() {
    // ─── 响应式游戏状态（供UI层绑定） ───
    const gameState = reactive({
      running: false,
      paused: false,
      playerRace: RACE.TERRAN,
      // 资源面板数据
      resources: {
        1: { minerals: GAME.STARTING_MINERALS, gas: GAME.STARTING_GAS, supply: 0, supplyMax: 10 },
        2: { minerals: GAME.STARTING_MINERALS, gas: GAME.STARTING_GAS, supply: 0, supplyMax: 10 },
      },
      // 选中单位信息
      selectedUnits: [],
      // 游戏时间
      gameTime: 0,
      fps: 0,
    });

    // ─── 创建游戏管理器实例 ──────────────
    const gameManager = new GameManager();
    gameManager.gameState = gameState;

    // ─── 注册事件监听，同步游戏状态到UI ──
    eventBus.on(EVENTS.RESOURCE_CHANGED, (data) => {
      if (gameState.resources[data.team]) {
        gameState.resources[data.team] = { ...data.resources };
      }
    });

    eventBus.on(EVENTS.SELECT_UNITS, (units) => {
      gameState.selectedUnits = units.map(u => ({
        id: u.id,
        type: u.type,
        name: u.name,
        hp: u.hp,
        maxHp: u.maxHp,
        shield: u.shield,
        maxShield: u.maxShield,
        team: u.team,
      }));
    });

    eventBus.on(EVENTS.DESELECT, () => {
      gameState.selectedUnits = [];
    });

    eventBus.on(EVENTS.TICK, (tickData) => {
      gameState.gameTime = tickData.time;
      gameState.fps = tickData.fps;
    });

    eventBus.on(EVENTS.GAME_START, () => {
      gameState.running = true;
      gameState.paused = false;
    });

    eventBus.on(EVENTS.GAME_PAUSE, () => {
      gameState.paused = true;
    });

    eventBus.on(EVENTS.GAME_RESUME, () => {
      gameState.paused = false;
    });

    // ─── 游戏启动方法 ────────────────────
    const startGame = (canvas, race = RACE.TERRAN) => {
      gameState.playerRace = race;
      gameManager.init(canvas, race);
      gameManager.start();
    };

    // ─── 返回模板数据 ────────────────────
    return {
      gameState,
      startGame,
      gameManager,
    };
  },
  // ─── 模板：游戏画布 + HUD overlay ────
  template: `
    <div id="game-root" style="width:100vw;height:100vh;position:relative;">
      <canvas ref="gameCanvas" id="game-canvas"
        style="width:100%;height:100%;display:block;"></canvas>
      <div id="game-hud" style="position:absolute;top:0;left:0;width:100%;pointer-events:none;">
        <!-- 顶部资源栏 -->
        <div id="resource-bar"
          style="display:flex;gap:20px;padding:8px 16px;background:rgba(0,0,0,0.7);color:#fff;font-size:14px;pointer-events:auto;">
          <span>💰 水晶: {{ gameState.resources[1]?.minerals ?? 0 }}</span>
          <span>🧪 瓦斯: {{ gameState.resources[1]?.gas ?? 0 }}</span>
          <span>👥 人口: {{ gameState.resources[1]?.supply ?? 0 }}/{{ gameState.resources[1]?.supplyMax ?? 0 }}</span>
          <span style="margin-left:auto;">⏱ {{ formatTime(gameState.gameTime) }}</span>
          <span>FPS: {{ gameState.fps }}</span>
        </div>
      </div>
    </div>
  `,
});

// ─── 格式化游戏时间（tick → 分:秒） ─────
app.config.globalProperties.formatTime = (ticks) => {
  const seconds = Math.floor(ticks / GAME.TICK_RATE);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
};

// ─── 挂载到 #app ──────────────────────
app.mount('#app');

// ─── 导出供外部访问 ──────────────────
export { eventBus, GameManager, ResourceManager, Selection, CommandSystem, CombatSystem, TechTree, BuildingSystem };
