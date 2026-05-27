<!-- ═══════════════════════════════════════════════
  StarCraft Web - 顶部资源面板
  显示：水晶(蓝)、瓦斯(绿)、人口(白/红)、游戏时间
  SC1风格金属边框
═══════════════════════════════════════════════ -->
<template>
  <div class="resource-bar sc-panel" v-if="visible">
    <!-- 水晶资源 -->
    <div class="resource-item" :class="{ 'resource-bounce': mineralsBounce }">
      <span class="resource-icon mineral-icon">💎</span>
      <span class="resource-value text-mineral">{{ formatNumber(minerals) }}</span>
    </div>

    <!-- 瓦斯资源 -->
    <div class="resource-item" :class="{ 'resource-bounce': gasBounce }">
      <span class="resource-icon gas-icon">🧪</span>
      <span class="resource-value text-gas">{{ formatNumber(gas) }}</span>
    </div>

    <!-- 人口显示 -->
    <div class="resource-item" :class="{ 'supply-warning': supplyWarning }">
      <span class="resource-icon supply-icon">👥</span>
      <span class="resource-value" :class="supplyWarning ? 'text-danger' : 'text-white'">
        {{ supply }}/{{ supplyMax }}
      </span>
    </div>

    <!-- 分隔线 -->
    <div class="separator"></div>

    <!-- 游戏时间 -->
    <div class="resource-item time-display">
      <span class="resource-icon">⏱</span>
      <span class="resource-value text-gold">{{ formattedTime }}</span>
    </div>

    <!-- FPS显示 -->
    <div class="resource-item fps-display" v-if="showFps">
      <span class="resource-value text-dim">{{ fps }}</span>
    </div>
  </div>
</template>

<script setup>
/**
 * ResourceBar - 顶部资源面板组件
 * 
 * 显示玩家当前资源状态，包含：
 * - 水晶（minerals）：蓝色显示
 * - 瓦斯（gas）：绿色显示
 * - 人口（supply）：白/红色显示，接近上限时变红警告
 * - 游戏时间：格式化为 分:秒
 * - FPS：可选显示
 */
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { eventBus } from '../../shared/EventBus.js';
import { EVENTS, GAME } from '../../shared/Constants.js';

// ─── Props定义 ─────────────────────────────
const props = defineProps({
  /** 是否显示资源栏 */
  visible: { type: Boolean, default: true },
  /** 水晶数量 */
  minerals: { type: Number, default: GAME.STARTING_MINERALS },
  /** 瓦斯数量 */
  gas: { type: Number, default: GAME.STARTING_GAS },
  /** 当前人口 */
  supply: { type: Number, default: 0 },
  /** 人口上限 */
  supplyMax: { type: Number, default: 10 },
  /** 游戏时间（tick数） */
  gameTime: { type: Number, default: 0 },
  /** FPS值 */
  fps: { type: Number, default: 0 },
  /** 是否显示FPS */
  showFps: { type: Boolean, default: false },
});

// ─── 弹跳动画状态 ──────────────────────────
const mineralsBounce = ref(false);
const gasBounce = ref(false);

/**
 * 监听资源变化，触发弹跳动画
 * 当资源值改变时，对应的图标会有一个弹跳效果
 */
watch(() => props.minerals, (newVal, oldVal) => {
  if (newVal !== oldVal && newVal > oldVal) {
    mineralsBounce.value = true;
    setTimeout(() => { mineralsBounce.value = false; }, 300);
  }
});

watch(() => props.gas, (newVal, oldVal) => {
  if (newVal !== oldVal && newVal > oldVal) {
    gasBounce.value = true;
    setTimeout(() => { gasBounce.value = false; }, 300);
  }
});

// ─── 人口警告计算 ──────────────────────────
/**
 * 人口接近上限时（剩余空间 <= 2 或 已满）显示红色警告
 * 与SC1原版行为一致
 */
const supplyWarning = computed(() => {
  return props.supply >= props.supplyMax - 2;
});

// ─── 时间格式化 ─────────────────────────────
/**
 * 将游戏tick数转换为 分:秒 格式
 * SC1使用24 tick/s，但此处统一用tick_rate转换
 */
const formattedTime = computed(() => {
  const totalSeconds = Math.floor(props.gameTime / GAME.TICK_RATE);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
});

// ─── 工具函数 ───────────────────────────────
/**
 * 格式化数字，超过1000显示为 x.xK
 * @param {number} num - 要格式化的数字
 * @returns {string} 格式化后的字符串
 */
function formatNumber(num) {
  if (num >= 10000) return (num / 1000).toFixed(1) + 'K';
  return String(num);
}

// ─── EventBus监听 ──────────────────────────
// 监听资源变化事件，可用于额外的UI反馈
let cleanupFns = [];

onMounted(() => {
  const unsub1 = onMounted(() => {
    cleanupFns.push(eventBus.on(EVENTS.SUPPLY_CHANGED, (data) => {
      // 人口变化时可以做额外处理（如音效）
    }));
  });
});

onUnmounted(() => {
  cleanupFns.forEach(fn => fn());
});
</script>

<style scoped>
/* ─── 资源栏整体布局 ──────────────────────── */
.resource-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 6px 14px;
  background: var(--sc-bg-dark);
  border: 1px solid var(--sc-border-gold);
  box-shadow:
    inset 0 -1px 0 rgba(139, 115, 48, 0.3),
    0 2px 8px rgba(0, 0, 0, 0.6);
  font-size: 14px;
  font-family: var(--sc-font), var(--sc-font-cn);
  user-select: none;
  pointer-events: auto;
  z-index: 10;
}

/* ─── 单个资源项 ───────────────────────────── */
.resource-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border-radius: 2px;
  transition: transform 0.15s ease;
}

/* ─── 资源图标 ─────────────────────────────── */
.resource-icon {
  font-size: 16px;
  line-height: 1;
}

.mineral-icon {
  filter: drop-shadow(0 0 3px rgba(68, 136, 255, 0.5));
}

.gas-icon {
  filter: drop-shadow(0 0 3px rgba(0, 204, 68, 0.5));
}

.supply-icon {
  filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.3));
}

/* ─── 资源数值 ─────────────────────────────── */
.resource-value {
  font-weight: bold;
  font-size: 14px;
  min-width: 30px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

/* ─── 人口警告状态 ─────────────────────────── */
.supply-warning {
  animation: supply-warning-flash 0.8s ease-in-out infinite;
}

@keyframes supply-warning-flash {
  0%, 100% { background: transparent; }
  50% { background: rgba(204, 34, 0, 0.2); }
}

/* ─── 分隔线 ───────────────────────────────── */
.separator {
  width: 1px;
  height: 20px;
  background: linear-gradient(
    180deg,
    transparent 0%,
    var(--sc-border-gold) 30%,
    var(--sc-border-gold) 70%,
    transparent 100%
  );
  margin: 0 4px;
}

/* ─── 时间显示 ─────────────────────────────── */
.time-display {
  margin-left: auto;
}

.time-display .resource-value {
  min-width: 50px;
  font-size: 15px;
}

/* ─── FPS显示 ──────────────────────────────── */
.fps-display {
  font-size: 11px;
}

.fps-display .resource-value {
  min-width: auto;
}

/* ─── 移动端适配 ───────────────────────────── */
@media (max-width: 768px) {
  .resource-bar {
    gap: 10px;
    padding: 4px 10px;
    font-size: 12px;
  }

  .resource-icon {
    font-size: 14px;
  }

  .resource-value {
    font-size: 12px;
  }
}
</style>
