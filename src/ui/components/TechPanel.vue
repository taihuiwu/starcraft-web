<!-- ═══════════════════════════════════════════════
  StarCraft Web - 科技面板组件
  点击Forge/Academy等建筑时弹出
  显示可升级项目网格，已研究/可研究/锁定三种状态
═══════════════════════════════════════════════ -->
<template>
  <div class="tech-panel sc-panel fade-in" v-if="visible">
    <!-- 面板标题 -->
    <div class="tech-header">
      <span class="panel-title text-gold">{{ buildingName }} - 研究</span>
      <button class="close-btn" @click="$emit('close')">✕</button>
    </div>

    <!-- 升级项目网格 -->
    <div class="tech-grid">
      <div
        v-for="(tech, index) in techItems"
        :key="tech?.id || index"
        class="tech-cell"
        :class="{
          locked: !canResearch(tech),
          completed: isCompleted(tech),
          researching: isResearching(tech),
          available: canResearch(tech) && !isCompleted(tech),
        }"
        @click="handleTechClick(tech, index)"
        @mouseenter="hoveredTech = tech"
        @mouseleave="hoveredTech = null"
      >
        <!-- 图标 -->
        <div class="tech-icon">{{ getTechIcon(tech) }}</div>
        <!-- 名称 -->
        <div class="tech-name">{{ tech?.name || '' }}</div>
        <!-- 等级显示 -->
        <div class="tech-level" v-if="tech?.level">
          Lv.{{ tech.level }}
        </div>
        <!-- 状态标记 -->
        <div class="tech-status" v-if="tech">
          <span v-if="isCompleted(tech)" class="status-completed">✓</span>
          <span v-else-if="isResearching(tech)" class="status-researching">⟳</span>
          <span v-else-if="!canResearch(tech)" class="status-locked">🔒</span>
        </div>
        <!-- 进度条 -->
        <div class="tech-progress" v-if="isResearching(tech)">
          <div
            class="progress-fill"
            :style="{ width: getTechProgress(tech) + '%' }"
          ></div>
        </div>
      </div>
    </div>

    <!-- 工具提示 -->
    <div class="tech-tooltip" v-if="hoveredTech">
      <div class="tooltip-name text-gold">{{ hoveredTech.name }}</div>
      <div class="tooltip-name-en text-dim">{{ hoveredTech.nameEn }}</div>
      <div class="tooltip-cost" v-if="hoveredTech.cost">
        <span v-if="hoveredTech.cost.minerals" class="text-mineral">
          💎 {{ hoveredTech.cost.minerals }}
        </span>
        <span v-if="hoveredTech.cost.gas" class="text-gas" style="margin-left:8px;">
          🧪 {{ hoveredTech.cost.gas }}
        </span>
      </div>
      <div class="tooltip-effect text-orange" v-if="hoveredTech.effect">
        {{ getEffectDescription(hoveredTech) }}
      </div>
      <div class="tooltip-time text-dim" v-if="hoveredTech.researchTime">
        研究时间：{{ Math.ceil(hoveredTech.researchTime) }}秒
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * TechPanel - 科技面板组件
 * 
 * 当玩家点击具有研究功能的建筑（如Forge、Academy等）时弹出
 * 显示该建筑提供的所有可升级项目
 * 
 * 状态：
 * - 已研究：绿色边框，显示✓
 * - 可研究：金色边框，可点击
 * - 锁定：灰色边框，显示🔒（缺资源或前置条件不满足）
 */
import { ref, computed } from 'vue';
import { eventBus } from '../../shared/EventBus.js';
import { EVENTS } from '../../shared/Constants.js';

// ─── Props定义 ─────────────────────────────
const props = defineProps({
  /** 是否显示科技面板 */
  visible: { type: Boolean, default: false },
  /** 当前建筑名称 */
  buildingName: { type: String, default: '' },
  /** 该建筑提供的科技列表 */
  techItems: { type: Array, default: () => [] },
  /** 已完成的科技ID列表 */
  completedTech: { type: Array, default: () => [] },
  /** 正在研究的科技 [{id, progress, total}] */
  researchingTech: { type: Array, default: () => [] },
  /** 当前资源 */
  resources: { type: Object, default: () => ({ minerals: 0, gas: 0 }) },
});

// ─── Emits定义 ─────────────────────────────
const emit = defineEmits([
  /** 关闭科技面板 */
  'close',
  /** 点击研究科技 */
  'research-click',
]);

// ─── 状态 ──────────────────────────────────
const hoveredTech = ref(null);

// ─── 方法 ──────────────────────────────────
/**
 * 获取科技图标
 */
function getTechIcon(tech) {
  if (!tech) return '';
  const icons = {
    infantry_weapons: '⚔', infantry_armor: '🛡',
    vehicle_weapons: '💥', vehicle_plating: '🔰',
    ship_weapons: '🚀', ship_plating: '🛡',
    stimpack: '💉', lock_on: '🔒', siege_tech: '🎯',
    spider_mines: '💣', cloaking_field: '👻',
    defensive_matrix: '🛡', irradiate: '☢',
    emp_shockwave: '⚡', yamato_gun: '💥',
    melee_attack: '⚔', ranged_attack: '🏹',
    ground_carapace: '🛡', flyer_attack: '🦇',
    flyer_carapace: '🛡', metabolic_boost: '⚡',
    adrenal_glands: '💪', underground: '🕳',
    ground_weapons: '⚔', ground_armor: '🛡',
    plasma_shields: '🛡', air_weapons: '🚀',
    air_armor: '🛡', leg_enhancements: '🦵',
    psionic_storm: '⚡', blink: '✨',
    recall: '🌀', stasis_field: '❄',
  };

  // 尝试匹配ID的前缀
  for (const [key, icon] of Object.entries(icons)) {
    if (tech.id?.includes(key)) return icon;
  }
  return '🔬';
}

/**
 * 判断科技是否已完成研究
 */
function isCompleted(tech) {
  if (!tech) return false;
  return props.completedTech.includes(tech.id);
}

/**
 * 判断科技是否正在研究中
 */
function isResearching(tech) {
  if (!tech) return false;
  return props.researchingTech.some(t => t.id === tech.id);
}

/**
 * 判断科技是否可研究
 * 条件：资源足够 + 前置条件满足 + 未完成
 */
function canResearch(tech) {
  if (!tech) return false;
  if (isCompleted(tech)) return false;

  // 资源检查
  if (tech.cost) {
    if (props.resources.minerals < (tech.cost.minerals || 0)) return false;
    if (props.resources.gas < (tech.cost.gas || 0)) return false;
  }

  // 前置科技检查
  if (tech.requires) {
    for (const req of tech.requires) {
      if (!props.completedTech.includes(req)) return false;
    }
  }

  return true;
}

/**
 * 获取研究进度百分比
 */
function getTechProgress(tech) {
  if (!tech) return 0;
  const item = props.researchingTech.find(t => t.id === tech.id);
  if (item && item.total > 0) {
    return (item.progress / item.total) * 100;
  }
  return 0;
}

/**
 * 获取科技效果描述
 */
function getEffectDescription(tech) {
  if (!tech) return '';
  if (tech.effect) {
    if (tech.effect.description) return tech.effect.description;
    if (tech.effect.damageBonus) return `伤害 +${tech.effect.damageBonus}`;
    if (tech.effect.armorBonus) return `护甲 +${tech.effect.armorBonus}`;
    if (tech.effect.speedBonus) return `速度 +${tech.effect.speedBonus}`;
    if (tech.effect.sightBonus) return `视野 +${tech.effect.sightBonus}`;
    if (tech.effect.energyBonus) return `最大能量 +${tech.effect.energyBonus}`;
  }
  return tech.nameEn || '';
}

/**
 * 处理科技点击事件
 */
function handleTechClick(tech, index) {
  if (!tech || !canResearch(tech)) return;

  emit('research-click', { tech, index });
  eventBus.emit(EVENTS.TECH_START, { techId: tech.id });
}
</script>

<style scoped>
/* ─── 科技面板整体 ─────────────────────────── */
.tech-panel {
  position: absolute;
  bottom: 150px;
  right: 290px;
  width: 320px;
  background: var(--sc-bg-panel);
  border: 1px solid var(--sc-border-gold);
  box-shadow:
    inset 0 0 20px rgba(0, 0, 0, 0.5),
    0 0 16px rgba(139, 115, 48, 0.4);
  padding: 6px;
  z-index: 20;
  pointer-events: auto;
}

/* ─── 面板标题 ─────────────────────────────── */
.tech-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 6px;
  border-bottom: 1px solid var(--sc-border-gold);
  margin-bottom: 6px;
}

.panel-title {
  font-size: 12px;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.close-btn {
  width: 20px;
  height: 20px;
  background: rgba(200, 50, 50, 0.3);
  border: 1px solid rgba(200, 50, 50, 0.5);
  color: #ff6666;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.1s ease;
}

.close-btn:hover {
  background: rgba(200, 50, 50, 0.6);
  border-color: #ff4444;
}

/* ─── 升级项目网格 ─────────────────────────── */
.tech-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 3px;
}

.tech-cell {
  aspect-ratio: 1;
  background: rgba(20, 25, 35, 0.9);
  border: 1px solid var(--sc-border-dim);
  cursor: pointer;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
  overflow: hidden;
}

/* 可研究状态 */
.tech-cell.available:hover {
  border-color: var(--sc-border-highlight);
  background: var(--sc-bg-hover);
  box-shadow: 0 0 8px rgba(196, 160, 64, 0.4);
}

/* 已完成状态 */
.tech-cell.completed {
  border-color: #00cc44;
  background: rgba(0, 204, 68, 0.1);
}

/* 研究中状态 */
.tech-cell.researching {
  border-color: var(--sc-text-orange);
  animation: building-pulse 1.2s ease-in-out infinite;
}

/* 锁定状态 */
.tech-cell.locked {
  opacity: 0.4;
  cursor: not-allowed;
  filter: grayscale(0.5);
}

/* ─── 格子内容 ─────────────────────────────── */
.tech-icon {
  font-size: 20px;
  line-height: 1;
}

.tech-name {
  font-size: 7px;
  color: var(--sc-text-white);
  text-align: center;
  margin-top: 1px;
  line-height: 1.1;
}

.tech-level {
  font-size: 8px;
  color: var(--sc-text-gold);
  font-weight: bold;
}

/* ─── 状态标记 ─────────────────────────────── */
.tech-status {
  position: absolute;
  top: 1px;
  right: 2px;
  font-size: 10px;
}

.status-completed { color: #00cc44; }
.status-researching { color: var(--sc-text-orange); animation: spin 2s linear infinite; }
.status-locked { color: var(--sc-text-gray); }

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* ─── 进度条 ───────────────────────────────── */
.tech-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: rgba(0, 0, 0, 0.6);
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #e0a020, #c08010);
  transition: width 0.3s ease;
}

/* ─── 工具提示 ─────────────────────────────── */
.tech-tooltip {
  margin-top: 6px;
  padding: 6px 8px;
  background: rgba(10, 12, 18, 0.95);
  border: 1px solid var(--sc-border-gold);
  border-radius: 2px;
  font-size: 11px;
}

.tooltip-name {
  font-size: 13px;
  font-weight: bold;
}

.tooltip-name-en {
  font-size: 10px;
}

.tooltip-cost {
  margin-top: 2px;
}

.tooltip-effect {
  margin-top: 3px;
  font-size: 10px;
}

.tooltip-time {
  margin-top: 2px;
  font-size: 10px;
}
</style>
