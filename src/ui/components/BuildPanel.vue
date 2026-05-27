<!-- ═══════════════════════════════════════════════
  StarCraft Web - 建造栏组件（复刻SC1原版）
  右侧建造栏：建筑面板/单位生产面板/科技升级面板
  3×5=15个格子网格布局
  支持人族/虫族/神族不同图标集
═══════════════════════════════════════════════ -->
<template>
  <div class="build-panel sc-panel" v-if="visible">
    <!-- 面板标题栏 -->
    <div class="panel-header">
      <span class="panel-title text-gold">{{ panelTitle }}</span>
      <!-- 面板切换按钮 -->
      <div class="panel-tabs">
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'build' }"
          @click="activeTab = 'build'"
          title="建造建筑"
        >🏗</button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'unit' }"
          @click="activeTab = 'unit'"
          title="训练单位"
        >⚔</button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'tech' }"
          @click="activeTab = 'tech'"
          title="研究科技"
        >🔬</button>
      </div>
    </div>

    <!-- 3×5 格子网格 -->
    <div class="build-grid">
      <div
        v-for="(item, index) in currentItems"
        :key="item?.id || index"
        class="sc-grid-cell"
        :class="{
          disabled: !isBuildable(item),
          building: item && buildQueue.some(q => q.id === item.id),
        }"
        @click="handleItemClick(item, index)"
        @mouseenter="hoveredItem = item"
        @mouseleave="hoveredItem = null"
        :title="item ? `${item.name} (${item.nameEn || ''})` : '空'"
      >
        <!-- 图标显示 -->
        <div class="cell-icon" v-if="item">
          {{ getItemIcon(item) }}
        </div>
        <!-- 名称显示 -->
        <div class="cell-name" v-if="item">
          {{ item.name }}
        </div>
        <!-- 资源消耗 -->
        <div class="cell-cost" v-if="item && item.cost">
          <span v-if="item.cost.minerals" class="cost-mineral">
            💎{{ item.cost.minerals }}
          </span>
          <span v-if="item.cost.gas" class="cost-gas">
            🧪{{ item.cost.gas }}
          </span>
        </div>
        <!-- 生产/建造进度条覆盖 -->
        <div class="cell-progress" v-if="getProgress(item) > 0">
          <div class="progress-fill" :style="{ width: getProgress(item) + '%' }"></div>
        </div>
      </div>
    </div>

    <!-- 工具提示信息 -->
    <div class="tooltip" v-if="hoveredItem && hoveredItem.cost">
      <div class="tooltip-name text-gold">{{ hoveredItem.name }}</div>
      <div class="tooltip-name-en text-dim">{{ hoveredItem.nameEn }}</div>
      <div class="tooltip-cost">
        <span v-if="hoveredItem.cost.minerals" class="text-mineral">
          💎 {{ hoveredItem.cost.minerals }}
        </span>
        <span v-if="hoveredItem.cost.gas" class="text-gas" style="margin-left:8px;">
          🧪 {{ hoveredItem.cost.gas }}
        </span>
        <span v-if="hoveredItem.cost.supply" class="text-white" style="margin-left:8px;">
          👥 {{ hoveredItem.cost.supply }}
        </span>
      </div>
      <div class="tooltip-desc text-gray" v-if="hoveredItem.desc">
        {{ hoveredItem.desc }}
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * BuildPanel - 建造栏组件
 * 
 * 最重要的UI组件之一，复刻SC1原版的建造面板：
 * - 建筑面板：展示可建造的建筑列表
 * - 单位生产面板：展示可训练的单位列表
 * - 科技升级面板：展示可研究的升级列表
 * 
 * 每个格子显示：图标(emoji)、名称、资源消耗
 * 不满足条件时格子变灰（缺资源/缺前置建筑）
 * 正在建造/生产时显示进度条覆盖
 */
import { ref, computed, watch } from 'vue';
import { eventBus } from '../../shared/EventBus.js';
import { EVENTS, RACE } from '../../shared/Constants.js';

// ─── Props定义 ─────────────────────────────
const props = defineProps({
  /** 是否显示建造栏 */
  visible: { type: Boolean, default: true },
  /** 当前玩家种族 */
  playerRace: { type: String, default: RACE.TERRAN },
  /** 当前选中的建筑（用于显示可生产单位） */
  selectedBuilding: { type: Object, default: null },
  /** 当前选中的单位（用于显示可建造建筑） */
  selectedUnit: { type: Object, default: null },
  /** 可建造建筑列表 */
  availableBuildings: { type: Array, default: () => [] },
  /** 可训练单位列表 */
  availableUnits: { type: Array, default: () => [] },
  /** 可研究科技列表 */
  availableTech: { type: Array, default: () => [] },
  /** 已拥有的建筑（用于判断前置条件） */
  ownedBuildings: { type: Array, default: () => [] },
  /** 已完成的科技 */
  completedTech: { type: Array, default: () => [] },
  /** 生产队列 [{id, progress, total}] */
  buildQueue: { type: Array, default: () => [] },
  /** 当前资源 {minerals, gas, supply, supplyMax} */
  resources: { type: Object, default: () => ({ minerals: 50, gas: 0, supply: 0, supplyMax: 10 }) },
});

// ─── Emits定义 ─────────────────────────────
const emit = defineEmits([
  /** 格子点击事件 */
  'build-click',
  /** 面板切换 */
  'panel-switch',
]);

// ─── 状态 ──────────────────────────────────
/** 当前激活的面板标签 */
const activeTab = ref('build');
/** 鼠标悬停的项目 */
const hoveredItem = ref(null);

// ─── 种族图标集 ─────────────────────────────
/**
 * 为每个种族的建筑、单位、科技定义emoji图标
 * SC1原版使用位图，这里用emoji代替
 */
const RACE_ICONS = {
  [RACE.TERRAN]: {
    // 建筑图标
    building: {
      command_center: '🏢',
      supply_depot: '🏠',
      refinery: '⛽',
      barracks: '🏭',
      engineering_bay: '🔧',
      academy: '🎓',
      factory: '⚙',
      machine_shop: '🔩',
      starport: '🚀',
      control_tower: '📡',
      science_facility: '🔬',
      covert_ops: '🕵',
      physics_lab: '⚛',
      missile_turret: '🎯',
      bunker: '🛡',
      armory: '🔨',
      ghost_academy: '👻',
      fusion_core: '💫',
    },
    // 单位图标
    unit: {
      scv: '👷',
      marine: '🔫',
      firebat: '🔥',
      medic: '💊',
      ghost: '👻',
      vulture: '🏍',
      siege_tank: '🛡',
      goliath: '🤖',
      wraith: '✈',
      valkyrie: '🚀',
      battlecruiser: '🛸',
      science_vessel: '🔬',
      dropship: '🚁',
    },
    // 科技图标
    tech: {
      infantry_weapons: '⚔',
      infantry_armor: '🛡',
      vehicle_weapons: '💥',
      vehicle_plating: '🔰',
      ship_weapons: '🚀',
      ship_plating: '🛡',
      stimpack: '💉',
      lock_on: '🔒',
      siege_tech: '🎯',
      spider_mines: '💣',
      cloaking_field: '👻',
      defensive_matrix: '🛡',
      irradiate: '☢',
      emp_shockwave: '⚡',
      yamato_gun: '💥',
    },
  },
  [RACE.ZERG]: {
    building: {
      hatchery: '🥚',
      extractor: '⛽',
      spawning_pool: ' pool',
      creep_colony: '🟣',
      spine_colony: '⚔',
      spore_colony: '🟣',
      hydralisk_den: '🐍',
      lair: '🏛',
      hive: '👑',
      infestation_pit: '🦠',
      nydus_canal: '🕳',
      evolution_chamber: '🧬',
      greater_spire: '🗼',
      defiler_mound: '💀',
      ultralisk_cavern: '🦏',
    },
    unit: {
      drone: '🐝',
      zergling: '🦎',
      overlord: '🪐',
      hydralisk: '🐍',
      lurker: '🐛',
      mutalisk: '🦇',
      scourge: '💥',
      guardian: '🐉',
      devourer: '🦑',
      queen: '👑',
      defiler: '💀',
      ultralisk: '🦏',
      infested_terran: '☢',
    },
    tech: {
      melee_attack: '⚔',
      ranged_attack: '🏹',
      ground_carapace: '🛡',
      flyer_attack: '🦇',
      flyer_carapace: '🛡',
      metabolic_boost: '⚡',
      adrenal_glands: '💪',
      underground: '🕳',
      flyer_speed: '💨',
    },
  },
  [RACE.PROTOSS]: {
    building: {
      nexus: '🏛',
      pylon: '⚡',
      assimilator: '⛽',
      gateway: '🚪',
      forge: '🔨',
      cybernetics_core: '🧠',
      photon_cannon: '🎯',
      shield_battery: '🛡',
      citadel_of_adun: '🏛',
      templar_archives: '⚡',
      observatory: '🔭',
      stargate: '⭐',
      fleet_beacon: '📡',
      arbiters_tribunal: '🌀',
      robotics_facility: '🤖',
      robotics_support: '🔧',
      science_facility: '🔬',
    },
    unit: {
      probe: '👷',
      zealot: '⚔',
      dragoon: '🕷',
      high_templar: '⚡',
      dark_templar: '🗡',
      archon: '💫',
      reaver: '🐛',
      observer: '👁',
      shuttle: '🚀',
      corsair: '🚀',
      scout: '✈',
      carrier: '🛸',
      arbiter: '🌀',
      dark_archon: '🔴',
    },
    tech: {
      ground_weapons: '⚔',
      ground_armor: '🛡',
      plasma_shields: '🛡',
      air_weapons: '🚀',
      air_armor: '🛡',
      leg_enhancements: '🦵',
      psionic_storm: '⚡',
      blink: '✨',
      recall: '🌀',
      stasis_field: '❄',
    },
  },
};

// ─── 计算属性 ──────────────────────────────
/**
 * 当前面板标题
 */
const panelTitle = computed(() => {
  switch (activeTab.value) {
    case 'build': return '建造建筑';
    case 'unit': return '训练单位';
    case 'tech': return '研究科技';
    default: return '';
  }
});

/**
 * 当前面板的项目列表
 * 根据选择的建筑或单位显示不同的项目
 */
const currentItems = computed(() => {
  let items = [];

  switch (activeTab.value) {
    case 'build':
      // 建筑面板：显示可建造的建筑
      items = props.availableBuildings.slice(0, 15); // 最多15个格子
      break;
    case 'unit':
      // 单位面板：显示选中建筑可训练的单位
      if (props.selectedBuilding?.produces) {
        items = props.availableUnits.filter(u =>
          props.selectedBuilding.produces.includes(u.id)
        ).slice(0, 15);
      } else {
        // 没有选中建筑时显示所有可训练单位
        items = props.availableUnits.slice(0, 15);
      }
      break;
    case 'tech':
      // 科技面板：显示可研究的升级
      items = props.availableTech.slice(0, 15);
      break;
  }

  // 填充到15个格子（3×5网格）
  while (items.length < 15) {
    items.push(null);
  }

  return items;
});

// ─── 方法 ──────────────────────────────────
/**
 * 获取项目图标
 * 根据种族和项目类型返回对应的emoji
 */
function getItemIcon(item) {
  if (!item) return '';

  const icons = RACE_ICONS[props.playerRace] || RACE_ICONS[RACE.TERRAN];

  if (item.type === 'building' || item.category === 'building' ||
      item.category === 'primary' || item.category === 'production' ||
      item.category === 'defense' || item.category === 'resource' ||
      item.category === 'supply' || item.category === 'tech' ||
      item.category === 'upgrade' || item.category === 'addon') {
    return icons.building?.[item.id] || '🏢';
  }

  if (item.type === 'unit' || item.category === 'unit' ||
      item.category === 'worker' || item.category === 'infantry' ||
      item.category === 'vehicle' || item.category === 'air') {
    return icons.unit?.[item.id] || '⚔';
  }

  // 科技
  if (item.upgradeType) {
    // 匹配科技名称的关键词
    const key = Object.keys(icons.tech).find(k => item.id.includes(k));
    return icons.tech?.[key] || '🔬';
  }

  return '📦';
}

/**
 * 判断项目是否可建造/训练/研究
 * 条件：资源足够 + 前置条件满足
 */
function isBuildable(item) {
  if (!item) return false;

  // 资源检查
  if (item.cost) {
    if (props.resources.minerals < (item.cost.minerals || 0)) return false;
    if (props.resources.gas < (item.cost.gas || 0)) return false;
    if (item.cost.supply &&
        props.resources.supply + item.cost.supply > props.resources.supplyMax) {
      return false;
    }
  }

  // 前置建筑检查
  if (item.prerequisites || item.techTree?.requires) {
    const reqs = item.prerequisites || item.techTree.requires || [];
    for (const req of reqs) {
      if (!props.ownedBuildings.some(b => b.id === req)) return false;
    }
  }

  // 前置科技检查
  if (item.requires) {
    for (const req of item.requires) {
      if (!props.completedTech.includes(req)) return false;
    }
  }

  return true;
}

/**
 * 获取项目的生产进度
 * @returns {number} 进度百分比 0-100
 */
function getProgress(item) {
  if (!item) return 0;

  const queueItem = props.buildQueue.find(q => q.id === item.id);
  if (queueItem && queueItem.total > 0) {
    return (queueItem.progress / queueItem.total) * 100;
  }
  return 0;
}

/**
 * 处理格子点击事件
 * 校验条件后发送BUILD_PANEL_CLICK事件
 */
function handleItemClick(item, index) {
  if (!item || !isBuildable(item)) return;

  // 发送事件
  const eventData = {
    tab: activeTab.value,
    item: item,
    index: index,
    race: props.playerRace,
  };

  emit('build-click', eventData);
  eventBus.emit(EVENTS.BUILD_PANEL_CLICK, eventData);
}

// ─── 监听标签切换 ──────────────────────────
watch(activeTab, (newTab) => {
  emit('panel-switch', newTab);
});
</script>

<style scoped>
/* ─── 建造面板整体布局 ────────────────────── */
.build-panel {
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: var(--sc-bg-panel);
  border: 1px solid var(--sc-border-gold);
  box-shadow:
    inset 0 0 20px rgba(0, 0, 0, 0.5),
    0 0 12px rgba(139, 115, 48, 0.3);
  padding: 4px;
  pointer-events: auto;
  width: 240px;
}

/* ─── 面板标题栏 ───────────────────────────── */
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px;
  border-bottom: 1px solid var(--sc-border-gold);
}

.panel-title {
  font-size: 12px;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* ─── 标签切换按钮 ─────────────────────────── */
.panel-tabs {
  display: flex;
  gap: 2px;
}

.tab-btn {
  width: 28px;
  height: 24px;
  background: rgba(20, 25, 35, 0.8);
  border: 1px solid var(--sc-border-dim);
  color: var(--sc-text-gray);
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.1s ease;
  border-radius: 2px;
}

.tab-btn:hover {
  background: var(--sc-bg-hover);
  border-color: var(--sc-border-gold);
  color: var(--sc-text-gold);
}

.tab-btn.active {
  background: var(--sc-bg-active);
  border-color: var(--sc-border-highlight);
  color: var(--sc-text-gold-bright);
  box-shadow: 0 0 6px rgba(196, 160, 64, 0.3);
}

/* ─── 建造网格（3×5） ──────────────────────── */
.build-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 2px;
  aspect-ratio: 5/3;
}

/* ─── 格子内部元素 ─────────────────────────── */
.cell-icon {
  font-size: 20px;
  line-height: 1;
  margin-bottom: 2px;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5));
}

.cell-name {
  font-size: 8px;
  color: var(--sc-text-white);
  text-align: center;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.cell-cost {
  font-size: 7px;
  display: flex;
  gap: 4px;
  justify-content: center;
  margin-top: 1px;
}

.cost-mineral { color: var(--sc-mineral-blue); }
.cost-gas { color: var(--sc-gas-green); }

/* ─── 进度条覆盖层 ─────────────────────────── */
.cell-progress {
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
  position: relative;
}

.progress-fill::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 50%;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.3), transparent);
}

/* ─── 工具提示 ─────────────────────────────── */
.tooltip {
  padding: 6px 8px;
  background: rgba(10, 12, 18, 0.95);
  border: 1px solid var(--sc-border-gold);
  border-radius: 2px;
  font-size: 11px;
  min-height: 40px;
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

.tooltip-desc {
  margin-top: 4px;
  font-size: 10px;
  line-height: 1.3;
}

/* ─── 移动端适配 ───────────────────────────── */
@media (max-width: 768px) {
  .build-panel {
    width: 180px;
    padding: 3px;
  }

  .cell-icon {
    font-size: 16px;
  }

  .cell-name {
    font-size: 7px;
  }
}
</style>
