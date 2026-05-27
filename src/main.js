// ═══════════════════════════════════════════════
// StarCraft Web - 主入口文件
// 初始化游戏引擎 + Vue3 UI层
// ═══════════════════════════════════════════════

import { createApp } from 'vue';
import App from './ui/App.vue';
import { eventBus } from './shared/EventBus.js';
import { GAME, EVENTS, RACE } from './shared/Constants.js';

// ─── 导入引擎层模块 ──────────────────────
import { Renderer } from './engine/Renderer.js';
import { RTSControls } from './engine/Camera.js';
import { Terrain } from './engine/Terrain.js';
import { ParticleSystem } from './engine/Particles.js';
import { ModelManager } from './engine/Models.js';
import { AnimationSystem } from './engine/Animation.js';

// ─── 导入游戏层模块 ──────────────────────
import GameManager from './game/GameManager.js';
import ResourceManager from './game/ResourceManager.js';
import Selection from './game/Selection.js';
import CommandSystem from './game/CommandSystem.js';
import CombatSystem from './game/CombatSystem.js';
import TechTree from './game/TechTree.js';
import BuildingSystem from './game/BuildingSystem.js';
import { Pathfinding } from './game/Pathfinding.js';
import { AIController } from './game/AI/AIController.js';

// ─── 导入全局样式 ──────────────────────────
import './ui/styles/game.css';

// ─── 创建Vue3应用实例 ──────────────────────
const app = createApp(App);

// ─── 挂载到 #app ───────────────────────────
app.mount('#app');

// ─── 引擎层实例（延迟初始化） ──────────────
/** @type {Renderer|null} */ let rendererInstance = null;
/** @type {RTSControls|null} */ let cameraControls = null;
/** @type {Terrain|null} */ let terrainInstance = null;
/** @type {ParticleSystem|null} */ let particleSystem = null;
/** @type {ModelManager|null} */ let modelManager = null;
/** @type {AnimationSystem|null} */ let animationSystem = null;
/** @type {Pathfinding|null} */ let pathfinding = null;

// ─── 初始化游戏管理器 ──────────────────────
const gameManager = new GameManager();

// ─── 监听引擎初始化事件 ────────────────────
// 当UI层的App.vue发出 engine:init 事件时，初始化游戏引擎
eventBus.on('engine:init', async ({ canvas, race }) => {
  console.log('[Main] Initializing game engine with race:', race);

  // ─── 1. 初始化Renderer（Three.js渲染器） ──
  // Renderer需要一个容器元素，将canvas的父元素作为容器
  try {
    const container = canvas.parentElement || canvas;
    rendererInstance = new Renderer(container, {
      fov: 50,
      near: 0.1,
      far: 500,
    });
    console.log('[Main] Renderer初始化完成');
  } catch (err) {
    console.warn('[Main] Renderer初始化失败，使用GameManager内置渲染:', err.message);
  }

  // ─── 2. 初始化Camera（RTS摄像机控制器） ──
  if (rendererInstance) {
    try {
      const threeCamera = rendererInstance.getCamera();
      cameraControls = new RTSControls(threeCamera, canvas);
      console.log('[Main] RTSControls初始化完成');
    } catch (err) {
      console.warn('[Main] RTSControls初始化失败:', err.message);
    }
  }

  // ─── 3. 初始化Terrain（地形系统） ────────
  if (rendererInstance) {
    try {
      const scene = rendererInstance.getScene();
      terrainInstance = new Terrain(scene);
      terrainInstance.generateTerrain();
      console.log('[Main] Terrain初始化完成');
    } catch (err) {
      console.warn('[Main] Terrain初始化失败:', err.message);
    }
  }

  // ─── 4. 初始化Particles（粒子特效系统） ──
  if (rendererInstance) {
    try {
      particleSystem = new ParticleSystem(rendererInstance);
      console.log('[Main] ParticleSystem初始化完成');
    } catch (err) {
      console.warn('[Main] ParticleSystem初始化失败:', err.message);
    }
  }

  // ─── 5. 初始化Models（3D模型管理器） ─────
  try {
    modelManager = new ModelManager();
    console.log('[Main] ModelManager初始化完成');
  } catch (err) {
    console.warn('[Main] ModelManager初始化失败:', err.message);
  }

  // ─── 6. 初始化Animation（动画系统） ──────
  try {
    animationSystem = new AnimationSystem();
    console.log('[Main] AnimationSystem初始化完成');
  } catch (err) {
    console.warn('[Main] AnimationSystem初始化失败:', err.message);
  }

  // ─── 7. 初始化Pathfinding（寻路系统） ────
  try {
    if (terrainInstance && terrainInstance.walkableGrid) {
      pathfinding = new Pathfinding(
        GAME.MAP_SIZE, GAME.MAP_SIZE,
        terrainInstance.walkableGrid
      );
      console.log('[Main] Pathfinding初始化完成');
    }
  } catch (err) {
    console.warn('[Main] Pathfinding初始化失败:', err.message);
  }

  // ─── 8. 将Canvas传给Renderer，将Scene传给Camera ──
  // Engine层已通过Renderer内部管理Scene和Camera

  // ─── 9. 初始化GameManager（传入引擎引用） ──
  const engineRefs = {};
  if (rendererInstance) {
    engineRefs.scene = rendererInstance.getScene();
    engineRefs.renderer = rendererInstance.getRenderer();
    engineRefs.camera = rendererInstance.getCamera();
  }

  await gameManager.init(canvas, race, engineRefs);

  // ─── 10. 注入额外子系统到GameManager ──────
  gameManager.selection = new Selection(gameManager);
  gameManager.commandSystem = new CommandSystem(gameManager);
  gameManager.pathfinding = pathfinding;
  gameManager.modelManager = modelManager;
  gameManager.animationSystem = animationSystem;
  gameManager.particleSystem = particleSystem;
  gameManager.cameraControls = cameraControls;
  gameManager.terrain = terrainInstance;

  // ─── 11. 启动游戏主循环 ─────────────────
  gameManager.start();
});

// ─── 增强游戏主循环（集成引擎层更新） ────
// 监听tick事件，在渲染前更新引擎层
eventBus.on(EVENTS.TICK, (tickData) => {
  const dt = tickData.dt || 0;

  // 更新摄像机控制器
  if (cameraControls) {
    cameraControls.update(dt);
  }

  // 更新地形动画（水面波动）
  if (terrainInstance) {
    terrainInstance.update(dt);
  }

  // 更新粒子系统
  if (particleSystem) {
    particleSystem.update(dt);
  }

  // 更新动画系统
  if (animationSystem) {
    animationSystem.update(dt);
  }
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
  gameManager,
  GameManager,
  ResourceManager,
  Selection,
  CommandSystem,
  CombatSystem,
  TechTree,
  BuildingSystem,
  Pathfinding,
  AIController,
  Renderer,
  RTSControls,
  Terrain,
  ParticleSystem,
  ModelManager,
  AnimationSystem,
};
