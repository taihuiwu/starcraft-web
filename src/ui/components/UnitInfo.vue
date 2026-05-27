<!-- ═══════════════════════════════════════════════
  StarCraft Web - 底部单位信息面板
  单选：大图标、名称、HP/护盾条、攻击力、护甲、速度
  多选：单位图标网格（最多12格）
  HP条颜色区分：绿(>50%) / 黄(25-50%) / 红(<25%)
═══════════════════════════════════════════════ -->
<template>
  <div class="unit-info sc-panel" v-if="visible">
    <!-- 单个单位选中时的详细信息 -->
    <div v-if="selectedUnits.length === 1" class="single-unit-info">
      <!-- 左侧大图标 -->
      <div class="unit-portrait">
        <div class="portrait-icon">{{ getUnitIcon(selectedUnits[0]) }}</div>
      </div>

      <!-- 右侧信息区域 -->
      <div class="unit-details">
        <!-- 单位名称 -->
        <div class="unit-name text-gold">{{ selectedUnits[0].name }}</div>
        <div class="unit-name-en text-dim">{{ selectedUnits[0].nameEn || '' }}</div>

        <!-- HP条 -->
        <div class="stat-row">
          <span class="stat-label">HP</span>
          <div class="sc-progress-bar" :class="hpBarClass">
            <div class="fill" :style="{ width: hpPercent + '%' }"></div>
          </div>
          <span class="stat-value text-white">{{ selectedUnits[0].hp }}/{{ selectedUnits[0].maxHp }}</span>
        </div>

        <!-- 护盾条（神族单位） -->
        <div class="stat-row" v-if="selectedUnits[0].maxShield > 0">
          <span class="stat-label text-mineral">🛡</span>
          <div class="sc-progress-bar shield">
            <div class="fill" :style="{ width: shieldPercent + '%' }"></div>
          </div>
          <span class="stat-value text-mineral">
            {{ selectedUnits[0].shield || 0 }}/{{ selectedUnits[0].maxShield }}
          </span>
        </div>

        <!-- 战斗属性 -->
        <div class="stats-grid">
          <div class="stat-item" v-if="selectedUnits[0].attack?.damage > 0">
            <span class="stat-label">⚔ 攻击</span>
            <span class="stat-value text-orange">{{ selectedUnits[0].attack.damage }}</span>
          </div>
          <div class="stat-item" v-if="selectedUnits[0].attack?.range">
            <span class="stat-label">📏 射程</span>
            <span class="stat-value">{{ selectedUnits[0].attack.range }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">🛡 护甲</span>
            <span class="stat-value">{{ selectedUnits[0].armor }}</span>
          </div>
          <div class="stat-item" v-if="selectedUnits[0].speed">
            <span class="stat-label">🏃 速度</span>
            <span class="stat-value">{{ selectedUnits[0].speed }}</span>
          </div>
        </div>

        <!-- 攻击类型标签 -->
        <div class="attack-type-badge" v-if="selectedUnits[0].attack?.type">
          <span class="badge" :class="'badge-' + selectedUnits[0].attack.type">
            {{ getAttackTypeName(selectedUnits[0].attack.type) }}
          </span>
        </div>
      </div>

      <!-- 技能按钮区域 -->
      <div class="unit-abilities" v-if="selectedUnits[0].abilities?.length">
        <button
          v-for="ability in selectedUnits[0].abilities"
          :key="ability"
          class="ability-btn"
          @click="handleAbilityClick(ability)"
          :title="getAbilityDesc(ability)"
        >
          {{ getAbilityIcon(ability) }}
        </button>
      </div>
    </div>

    <!-- 多个单位选中时的图标网格 -->
    <div v-else-if="selectedUnits.length > 1" class="multi-unit-info">
      <div class="multi-header text-gold">
        已选中 {{ selectedUnits.length }} 个单位
      </div>
      <div class="unit-grid">
        <div
          v-for="(unit, index) in selectedUnits.slice(0, 12)"
          :key="unit.id || index"
          class="unit-grid-cell"
          :class="{ selected: selectedGridIndex === index }"
          @click="selectedGridIndex = index"
        >
          <div class="grid-icon">{{ getUnitIcon(unit) }}</div>
          <!-- 微型HP条 -->
          <div class="mini-hp-bar">
            <div
              class="mini-hp-fill"
              :class="getMiniHpClass(unit)"
              :style="{ width: getHpPercent(unit) + '%' }"
            ></div>
          </div>
        </div>
      </div>

      <!-- 点击格子后显示该单位详情 -->
      <div class="selected-detail" v-if="selectedGridIndex !== null && selectedUnits[selectedGridIndex]">
        <span class="text-gold">{{ selectedUnits[selectedGridIndex].name }}</span>
        <span class="text-white" style="margin-left:8px;">
          HP: {{ selectedUnits[selectedGridIndex].hp }}/{{ selectedUnits[selectedGridIndex].maxHp }}
        </span>
      </div>
    </div>

    <!-- 无选中单位时的空状态 -->
    <div v-else class="no-selection">
      <span class="text-dim">选择一个单位查看详情</span>
    </div>
  </div>
</template>

<script setup>
/**
 * UnitInfo - 底部单位信息面板组件
 * 
 * 功能：
 * - 单选模式：显示选中单位的详细信息（大图标、HP条、攻击/护甲属性）
 * - 多选模式：显示单位图标网格（最多12格），点击可查看详情
 * - HP条颜色动态变化：绿色(>50%) / 黄色(25-50%) / 红色(<25%)
 * - 护盾条：蓝色（神族单位）
 * - 攻击类型标签：普通/爆炸/冲击
 * - 技能按钮：显示单位特殊技能
 */
import { ref, computed } from 'vue';
import { eventBus } from '../../shared/EventBus.js';
import { EVENTS, ATTACK_TYPE } from '../../shared/Constants.js';

// ─── Props定义 ─────────────────────────────
const props = defineProps({
  /** 是否显示单位信息面板 */
  visible: { type: Boolean, default: true },
  /** 选中的单位列表 */
  selectedUnits: { type: Array, default: () => [] },
});

// ─── Emits定义 ─────────────────────────────
const emit = defineEmits([
  /** 技能按钮点击 */
  'ability-click',
]);

// ─── 状态 ──────────────────────────────────
/** 多选模式下当前选中的格子索引 */
const selectedGridIndex = ref(null);

// ─── 计算属性 ──────────────────────────────
/**
 * 当前选中单位的HP百分比
 */
const hpPercent = computed(() => {
  if (!props.selectedUnits.length) return 0;
  const unit = props.selectedUnits[0];
  return (unit.hp / unit.maxHp) * 100;
});

/**
 * HP条颜色CSS类
 * 绿色(>50%) / 黄色(25-50%) / 红色(<25%)
 */
const hpBarClass = computed(() => {
  const pct = hpPercent.value;
  if (pct > 50) return 'hp-green';
  if (pct > 25) return 'hp-yellow';
  return 'hp-red';
});

/**
 * 护盾百分比（神族单位）
 */
const shieldPercent = computed(() => {
  if (!props.selectedUnits.length) return 0;
  const unit = props.selectedUnits[0];
  if (!unit.maxShield) return 0;
  return ((unit.shield || 0) / unit.maxShield) * 100;
});

// ─── 方法 ──────────────────────────────────
/**
 * 获取单位图标（emoji）
 * 根据单位类型返回对应的emoji图标
 */
function getUnitIcon(unit) {
  if (!unit) return '❓';

  // 根据单位ID匹配图标
  const ICON_MAP = {
    scv: '👷', marine: '🔫', firebat: '🔥', medic: '💊', ghost: '👻',
    vulture: '🏍', siege_tank: '🛡', goliath: '🤖', wraith: '✈',
    valkyrie: '🚀', battlecruiser: '🛸', science_vessel: '🔬', dropship: '🚁',
    drone: '🐝', zergling: '🦎', overlord: '🪐', hydralisk: '🐍',
    lurker: '🐛', mutalisk: '🦇', scourge: '💥', guardian: '🐉',
    devourer: '🦑', queen: '👑', defiler: '💀', ultralisk: '🦏',
    probe: '👷', zealot: '⚔', dragoon: '🕷', high_templar: '⚡',
    dark_templar: '🗡', archon: '💫', reaver: '🐛', observer: '👁',
    shuttle: '🚀', corsair: '🚀', scout: '✈', carrier: '🛸',
    arbiter: '🌀', dark_archon: '🔴',
  };

  return ICON_MAP[unit.type || unit.id] || '⚔';
}

/**
 * 获取HP百分比
 */
function getHpPercent(unit) {
  if (!unit || !unit.maxHp) return 0;
  return (unit.hp / unit.maxHp) * 100;
}

/**
 * 获取微型HP条CSS类
 */
function getMiniHpClass(unit) {
  const pct = getHpPercent(unit);
  if (pct > 50) return 'hp-green';
  if (pct > 25) return 'hp-yellow';
  return 'hp-red';
}

/**
 * 获取攻击类型中文名
 */
function getAttackTypeName(type) {
  const names = {
    [ATTACK_TYPE.NORMAL]: '普通攻击',
    [ATTACK_TYPE.EXPLOSIVE]: '爆炸伤害',
    [ATTACK_TYPE.CONCUSSIVE]: '冲击伤害',
  };
  return names[type] || type;
}

/**
 * 获取技能图标
 */
function getAbilityIcon(ability) {
  const icons = {
    stimpack: '💉', lock_on: '🔒', siege_mode: '🎯',
    spider_mines: '💣', cloaking: '👻', yamato_gun: '💥',
    defensive_matrix: '🛡', irradiate: '☢', emp_shockwave: '⚡',
    heal: '💊', restoration: '✨', optical_flare: '💫',
    recall: '🌀', psionic_storm: '⚡', blink: '✨',
  };
  return icons[ability] || '⚡';
}

/**
 * 获取技能描述
 */
function getAbilityDesc(ability) {
  const descs = {
    stimpack: '兴奋剂：消耗10HP，提升攻击和移动速度',
    lock_on: '锁定：锁定敌方机械单位10秒',
    siege_mode: '攻城模式：切换为高伤害远程攻击',
    spider_mines: '蜘蛛雷：放置地雷造成范围伤害',
    cloaking: '隐形：持续消耗能量进入隐形状态',
    yamato_gun: '大和炮：对单体造成260点伤害',
    defensive_matrix: '防御矩阵：添加吸收650伤害的护盾',
    irradiate: '辐射：对目标造成持续毒素伤害',
    emp_shockwave: 'EMP：消除范围护盾并耗尽能量',
    heal: '治疗：自动治疗友方受伤单位',
    restoration: '净化：消除友方负面效果',
    optical_flare: '闪光弹：致盲敌方单位',
    recall: '召回：传送友方单位到仲裁者位置',
    psionic_storm: '灵能风暴：范围持续伤害',
    blink: '闪烁：短距离瞬间传送',
  };
  return descs[ability] || ability;
}

/**
 * 处理技能按钮点击
 */
function handleAbilityClick(ability) {
  emit('ability-click', ability);
  eventBus.emit(EVENTS.COMMAND_ISSUED, {
    command: 'cast',
    ability: ability,
  });
}

// ─── 监听选中单位变化，重置格子选择 ───────
import { watch } from 'vue';
watch(() => props.selectedUnits, () => {
  selectedGridIndex.value = null;
});
</script>

<style scoped>
/* ─── 单位信息面板整体 ─────────────────────── */
.unit-info {
  display: flex;
  flex-direction: column;
  background: var(--sc-bg-panel);
  border: 1px solid var(--sc-border-gold);
  box-shadow:
    inset 0 0 20px rgba(0, 0, 0, 0.5),
    0 0 8px rgba(139, 115, 48, 0.3);
  padding: 6px 10px;
  pointer-events: auto;
  min-height: 100px;
  max-height: 140px;
}

/* ─── 单个单位信息布局 ─────────────────────── */
.single-unit-info {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

/* ─── 单位头像/图标 ────────────────────────── */
.unit-portrait {
  width: 72px;
  height: 72px;
  background: rgba(10, 15, 25, 0.8);
  border: 2px solid var(--sc-border-gold);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.portrait-icon {
  font-size: 36px;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
}

/* ─── 单位详情区域 ─────────────────────────── */
.unit-details {
  flex: 1;
  min-width: 0;
}

.unit-name {
  font-size: 14px;
  font-weight: bold;
}

.unit-name-en {
  font-size: 10px;
  margin-bottom: 4px;
}

/* ─── 属性行 ───────────────────────────────── */
.stat-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 3px;
}

.stat-label {
  font-size: 10px;
  color: var(--sc-text-gray);
  min-width: 20px;
}

.stat-row .sc-progress-bar {
  flex: 1;
  height: 5px;
  max-width: 120px;
}

.stat-value {
  font-size: 11px;
  font-weight: bold;
  min-width: 45px;
  text-align: right;
}

/* ─── 属性网格 ─────────────────────────────── */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
  margin-top: 4px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
}

.stat-item .stat-label {
  font-size: 9px;
  min-width: auto;
}

.stat-item .stat-value {
  font-size: 12px;
  min-width: auto;
  text-align: center;
}

/* ─── 攻击类型标签 ─────────────────────────── */
.attack-type-badge {
  margin-top: 4px;
}

.badge {
  display: inline-block;
  padding: 1px 6px;
  font-size: 9px;
  border-radius: 2px;
  font-weight: bold;
  text-transform: uppercase;
}

.badge-normal {
  background: rgba(200, 200, 200, 0.2);
  border: 1px solid rgba(200, 200, 200, 0.4);
  color: #ccc;
}

.badge-explosive {
  background: rgba(255, 100, 0, 0.2);
  border: 1px solid rgba(255, 100, 0, 0.4);
  color: #ff8844;
}

.badge-concussive {
  background: rgba(100, 150, 255, 0.2);
  border: 1px solid rgba(100, 150, 255, 0.4);
  color: #6699ff;
}

/* ─── 技能按钮区域 ─────────────────────────── */
.unit-abilities {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex-shrink: 0;
}

.ability-btn {
  width: 36px;
  height: 36px;
  background: linear-gradient(180deg, rgba(40, 50, 70, 0.9), rgba(20, 25, 40, 0.9));
  border: 1px solid var(--sc-border-gold);
  color: var(--sc-text-gold);
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.ability-btn:hover {
  background: var(--sc-bg-hover);
  border-color: var(--sc-border-highlight);
  box-shadow: 0 0 8px rgba(196, 160, 64, 0.4);
}

.ability-btn:active {
  transform: scale(0.95);
}

/* ─── 多选单位信息 ─────────────────────────── */
.multi-unit-info {
  width: 100%;
}

.multi-header {
  font-size: 12px;
  margin-bottom: 6px;
}

/* ─── 单位图标网格 ─────────────────────────── */
.unit-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 2px;
}

.unit-grid-cell {
  aspect-ratio: 1;
  background: rgba(20, 25, 35, 0.9);
  border: 1px solid var(--sc-border-dim);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.1s ease;
  position: relative;
}

.unit-grid-cell:hover {
  border-color: var(--sc-border-gold);
  background: var(--sc-bg-hover);
}

.unit-grid-cell.selected {
  border-color: var(--sc-border-highlight);
  box-shadow: 0 0 6px rgba(196, 160, 64, 0.5);
}

.grid-icon {
  font-size: 16px;
  line-height: 1;
}

/* ─── 微型HP条 ─────────────────────────────── */
.mini-hp-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: rgba(0, 0, 0, 0.6);
}

.mini-hp-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.mini-hp-fill.hp-green { background: #00cc44; }
.mini-hp-fill.hp-yellow { background: #cccc00; }
.mini-hp-fill.hp-red { background: #cc2200; }

/* ─── 选中格子详情 ─────────────────────────── */
.selected-detail {
  margin-top: 4px;
  font-size: 11px;
  padding: 2px 4px;
  background: rgba(10, 12, 18, 0.6);
  border-radius: 2px;
}

/* ─── 空状态 ───────────────────────────────── */
.no-selection {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 12px;
}
</style>
