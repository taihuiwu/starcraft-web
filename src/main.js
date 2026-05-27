// ═══════════════════════════════════════════════
// StarCraft Web - 主入口文件
// 初始化游戏引擎 + Vue3 UI层
// ═══════════════════════════════════════════════

import { createApp } from 'vue';
import App from './ui/App.vue';
import { eventBus } from './shared/EventBus.js';
import { GAME, EVENTS, RACE } from './shared/Constants.js';

// 导入游戏引擎模块
import GameManager from './game/GameManager.js';
import ResourceManager from './game/ResourceManager.js';
import Selection from './game/Selection.js';
import CommandSystem from './game/CommandSystem.js';
import CombatSystem from './game/CombatSystem.js';
import TechTree from './game/TechTree.js';
import BuildingSystem from './game/BuildingSystem.js';

// 导入全局样式
import './ui/styles/game.css';

// ─── 创建Vue3应用实例 ──────────────────────
const app = createApp(App);

// ─── 挂载到 #app ───────────────────────────
app.mount('#app');

// ─── 初始化游戏管理器 ──────────────────────
const gameManager = new GameManager();

// ─── 监听引擎初始化事件 ────────────────────
// 当UI层的App.vue发出 engine:init 事件时，初始化游戏引擎
eventBus.on('engine:init', ({ canvas, race }) => {
  console.log('[Main] Initializing game engine with race:', race);
  gameManager.init(canvas, race);
  gameManager.start();
});

// ─── 注册事件监听（引擎 → UI同步） ─────────
// 资源变化同步到UI
eventBus.on(EVENTS.RESOURCE_CHANGED, (data) => {
  // 资源变化由UI层的App.vue通过EventBus监听处理
});

// ─── 格式化时间全局方法 ────────────────────
app.config.globalProperties.formatTime = (ticks) => {
  const totalSeconds = Math.floor(ticks / GAME.TICK_RATE);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
};

// ─── 全局错误处理 ──────────────────────────
app.config.errorHandler = (err, instance, info) => {
  console.error('[Vue Error]', err);
  console.error('[Component]', instance);
  console.error('[Info]', info);
};

// ─── 导出供外部访问 ────────────────────────
export {
  eventBus,
  GameManager,
  ResourceManager,
  Selection,
  CommandSystem,
  CombatSystem,
  TechTree,
  BuildingSystem,
};
