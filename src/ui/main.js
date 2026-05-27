// ═══════════════════════════════════════════════
// StarCraft Web - Vue3 应用入口（UI层）
// 初始化Vue应用、挂载到 #app，导入全局样式
// ═══════════════════════════════════════════════

import { createApp } from 'vue';
import App from './App.vue';

// 导入全局样式
import './styles/game.css';

/**
 * 创建Vue3应用实例
 * 使用Composition API (<script setup>)组件
 */
const app = createApp(App);

// ─── 全局属性配置 ──────────────────────────
/**
 * 格式化游戏时间（tick → 分:秒）
 * 所有组件可通过 this.formatTime() 或 $root.formatTime() 访问
 */
app.config.globalProperties.formatTime = (ticks) => {
  const GAME_TICK_RATE = 24; // 与 Constants.js 中一致
  const totalSeconds = Math.floor(ticks / GAME_TICK_RATE);
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

// ─── 挂载应用 ──────────────────────────────
app.mount('#app');

console.log('[StarCraft Web] Vue3 UI layer initialized');

// ─── 导出供外部访问 ────────────────────────
export { app };
