<!-- ═══════════════════════════════════════════════
  StarCraft Web - 主菜单组件
  游戏标题、单人游戏(种族选择)、自定义对战
  暂停菜单叠加层、游戏结束画面
  星空/星云背景动画（CSS实现）
═══════════════════════════════════════════════ -->
<template>
  <!-- 星空背景 -->
  <div class="starfield" v-if="visible">
    <div class="stars"></div>
    <div class="nebula nebula-1"></div>
    <div class="nebula nebula-2"></div>
    <div class="nebula nebula-3"></div>
  </div>

  <!-- 主菜单 -->
  <div class="main-menu" v-if="visible && mode === 'menu'">
    <!-- 游戏标题 -->
    <div class="title-section">
      <h1 class="game-title">
        <span class="title-star">★</span>
        STARCRAFT
        <span class="title-star">★</span>
      </h1>
      <div class="game-subtitle">WEB EDITION</div>
      <div class="title-divider"></div>
    </div>

    <!-- 菜单按钮 -->
    <div class="menu-buttons">
      <button class="sc-btn menu-btn" @click="handleSinglePlayer">
        <span class="btn-icon">🎮</span>
        <span class="btn-text">单人游戏</span>
      </button>
      <button class="sc-btn menu-btn" @click="handleCustomGame">
        <span class="btn-icon">⚔</span>
        <span class="btn-text">自定义对战</span>
      </button>
      <button class="sc-btn menu-btn" @click="handleSettings">
        <span class="btn-icon">⚙</span>
        <span class="btn-text">游戏设置</span>
      </button>
    </div>

    <!-- 种族选择（单人游戏展开） -->
    <div class="race-selection fade-in" v-if="showRaceSelect">
      <div class="section-title text-gold">选择种族</div>
      <div class="race-options">
        <button
          v-for="race in races"
          :key="race.id"
          class="race-btn"
          :class="{ selected: selectedRace === race.id }"
          @click="selectedRace = race.id"
        >
          <div class="race-icon">{{ race.icon }}</div>
          <div class="race-name">{{ race.name }}</div>
          <div class="race-desc text-dim">{{ race.desc }}</div>
        </button>
      </div>

      <!-- AI难度选择 -->
      <div class="difficulty-section" v-if="showDifficultySelect">
        <div class="section-title text-gold" style="font-size:12px;">AI难度</div>
        <div class="difficulty-options">
          <button
            v-for="diff in difficulties"
            :key="diff.id"
            class="sc-btn diff-btn"
            :class="{ active: selectedDifficulty === diff.id }"
            @click="selectedDifficulty = diff.id"
          >
            {{ diff.name }}
          </button>
        </div>
      </div>

      <!-- 开始游戏按钮 -->
      <button class="sc-btn start-btn" @click="startGame">
        开始游戏
      </button>
    </div>
  </div>

  <!-- 暂停菜单叠加层 -->
  <div class="pause-overlay" v-if="visible && mode === 'pause'">
    <div class="pause-menu sc-panel">
      <div class="pause-title text-gold">游戏暂停</div>
      <div class="pause-buttons">
        <button class="sc-btn pause-btn" @click="$emit('resume')">
          <span class="btn-icon">▶</span>
          继续游戏
        </button>
        <button class="sc-btn pause-btn" @click="$emit('restart')">
          <span class="btn-icon">🔄</span>
          重新开始
        </button>
        <button class="sc-btn pause-btn" @click="$emit('quit')">
          <span class="btn-icon">🏠</span>
          返回菜单
        </button>
      </div>
      <div class="pause-hint text-dim">按 ESC 继续</div>
    </div>
  </div>

  <!-- 游戏结束画面 -->
  <div class="gameover-overlay" v-if="visible && mode === 'gameover'">
    <div class="gameover-content">
      <!-- 胜利/失败标题 -->
      <div
        class="gameover-title"
        :class="gameResult === 'victory' ? 'victory' : 'defeat'"
      >
        {{ gameResult === 'victory' ? '🏆 胜利！' : '💀 失败！' }}
      </div>

      <!-- 游戏统计 -->
      <div class="gameover-stats sc-panel" v-if="gameStats">
        <div class="stat-row">
          <span class="stat-label text-dim">游戏时间</span>
          <span class="stat-value text-gold">{{ formatTime(gameStats.time) }}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label text-dim">水晶采集</span>
          <span class="stat-value text-mineral">{{ gameStats.mineralsGathered || 0 }}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label text-dim">瓦斯采集</span>
          <span class="stat-value text-gas">{{ gameStats.gasGathered || 0 }}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label text-dim">单位击杀</span>
          <span class="stat-value text-orange">{{ gameStats.kills || 0 }}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label text-dim">单位损失</span>
          <span class="stat-value text-danger">{{ gameStats.losses || 0 }}</span>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="gameover-buttons">
        <button class="sc-btn" @click="$emit('restart')">再来一局</button>
        <button class="sc-btn" @click="$emit('quit')">返回菜单</button>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * MainMenu - 主菜单组件
 * 
 * 包含三个模式：
 * 1. menu - 主菜单：游戏标题、单人/自定义/设置按钮
 * 2. pause - 暂停菜单：继续/重新开始/返回菜单
 * 3. gameover - 游戏结束：胜利/失败动画 + 统计数据
 * 
 * 背景使用纯CSS实现星空/星云动画效果
 */
import { ref } from 'vue';
import { GAME, RACE } from '../../shared/Constants.js';

// ─── Props定义 ─────────────────────────────
const props = defineProps({
  /** 是否显示菜单 */
  visible: { type: Boolean, default: true },
  /** 菜单模式：'menu' | 'pause' | 'gameover' */
  mode: { type: String, default: 'menu' },
  /** 游戏结果：'victory' | 'defeat' */
  gameResult: { type: String, default: 'victory' },
  /** 游戏统计数据 */
  gameStats: { type: Object, default: null },
});

// ─── Emits定义 ─────────────────────────────
const emit = defineEmits([
  /** 开始游戏 */
  'start-game',
  /** 继续游戏 */
  'resume',
  /** 重新开始 */
  'restart',
  /** 返回菜单 */
  'quit',
]);

// ─── 状态 ──────────────────────────────────
const showRaceSelect = ref(false);
const showDifficultySelect = ref(false);
const selectedRace = ref(RACE.TERRAN);
const selectedDifficulty = ref('normal');

// ─── 数据 ──────────────────────────────────
/** 种族选项 */
const races = [
  {
    id: RACE.TERRAN,
    name: '人族 Terran',
    icon: '🏭',
    desc: '坚韧的钢铁战士，擅长机械化部队和空投战术',
  },
  {
    id: RACE.ZERG,
    name: '虫族 Zerg',
    icon: '🐛',
    desc: '恐怖的异虫群落，以数量和进化取胜',
  },
  {
    id: RACE.PROTOSS,
    name: '神族 Protoss',
    icon: '⚡',
    desc: '高等文明的灵能战士，拥有强大的护盾和科技',
  },
];

/** AI难度选项 */
const difficulties = [
  { id: 'easy', name: '简单' },
  { id: 'normal', name: '普通' },
  { id: 'hard', name: '困难' },
  { id: 'insane', name: '疯狂' },
];

// ─── 方法 ──────────────────────────────────
/**
 * 处理单人游戏按钮点击
 * 展开种族选择面板
 */
function handleSinglePlayer() {
  showRaceSelect.value = true;
  showDifficultySelect.value = true;
}

/**
 * 处理自定义对战按钮点击
 */
function handleCustomGame() {
  showRaceSelect.value = true;
  showDifficultySelect.value = true;
}

/**
 * 处理游戏设置按钮点击
 */
function handleSettings() {
  // TODO: 打开设置面板
}

/**
 * 开始游戏
 * 发送start-game事件，携带种族和难度
 */
function startGame() {
  emit('start-game', {
    race: selectedRace.value,
    difficulty: selectedDifficulty.value,
  });
}

/**
 * 格式化游戏时间
 * @param {number} ticks - tick数
 * @returns {string} 分:秒格式
 */
function formatTime(ticks) {
  if (!ticks) return '0:00';
  const seconds = Math.floor(ticks / GAME.TICK_RATE);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}
</script>

<style scoped>
/* ─── 星空背景 ─────────────────────────────── */
.starfield {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(
    ellipse at center,
    #0a0c1a 0%,
    #050610 50%,
    #020308 100%
  );
  z-index: 0;
  overflow: hidden;
}

/* 星星层 */
.stars {
  position: absolute;
  width: 100%;
  height: 100%;
  background-image:
    radial-gradient(1px 1px at 10% 20%, rgba(255, 255, 255, 0.8), transparent),
    radial-gradient(1px 1px at 30% 50%, rgba(255, 255, 255, 0.6), transparent),
    radial-gradient(1px 1px at 50% 10%, rgba(255, 255, 255, 0.7), transparent),
    radial-gradient(1px 1px at 70% 40%, rgba(255, 255, 255, 0.5), transparent),
    radial-gradient(1px 1px at 90% 60%, rgba(255, 255, 255, 0.8), transparent),
    radial-gradient(1px 1px at 20% 80%, rgba(255, 255, 255, 0.6), transparent),
    radial-gradient(1px 1px at 60% 90%, rgba(255, 255, 255, 0.7), transparent),
    radial-gradient(1px 1px at 80% 15%, rgba(255, 255, 255, 0.5), transparent),
    radial-gradient(2px 2px at 15% 45%, rgba(200, 220, 255, 0.9), transparent),
    radial-gradient(2px 2px at 85% 35%, rgba(255, 220, 200, 0.9), transparent),
    radial-gradient(1px 1px at 45% 75%, rgba(255, 255, 255, 0.6), transparent),
    radial-gradient(1px 1px at 25% 95%, rgba(255, 255, 255, 0.5), transparent),
    radial-gradient(1px 1px at 65% 25%, rgba(255, 255, 255, 0.7), transparent),
    radial-gradient(1px 1px at 5% 55%, rgba(255, 255, 255, 0.6), transparent),
    radial-gradient(1px 1px at 95% 85%, rgba(255, 255, 255, 0.5), transparent),
    radial-gradient(1px 1px at 35% 5%, rgba(255, 255, 255, 0.8), transparent),
    radial-gradient(1px 1px at 55% 65%, rgba(255, 255, 255, 0.4), transparent),
    radial-gradient(1px 1px at 75% 55%, rgba(255, 255, 255, 0.6), transparent);
  animation: twinkle 4s ease-in-out infinite;
}

/* 星云 */
.nebula {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.15;
  animation: float-nebula 20s ease-in-out infinite;
}

.nebula-1 {
  width: 400px;
  height: 300px;
  background: radial-gradient(ellipse, rgba(100, 50, 200, 0.6), transparent);
  top: 10%;
  left: 5%;
  animation-delay: 0s;
}

.nebula-2 {
  width: 500px;
  height: 400px;
  background: radial-gradient(ellipse, rgba(50, 100, 200, 0.5), transparent);
  top: 30%;
  right: 10%;
  animation-delay: -7s;
}

.nebula-3 {
  width: 350px;
  height: 250px;
  background: radial-gradient(ellipse, rgba(200, 80, 50, 0.4), transparent);
  bottom: 15%;
  left: 30%;
  animation-delay: -14s;
}

/* ─── 主菜单 ───────────────────────────────── */
.main-menu {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 100;
  gap: 30px;
  pointer-events: auto;
}

/* ─── 标题区域 ─────────────────────────────── */
.title-section {
  text-align: center;
}

.game-title {
  font-size: 48px;
  font-weight: bold;
  font-family: var(--sc-font);
  color: transparent;
  background: linear-gradient(
    180deg,
    #f0c050 0%,
    #d4a843 30%,
    #b08030 60%,
    #8b7330 100%
  );
  background-clip: text;
  -webkit-background-clip: text;
  text-shadow: none;
  letter-spacing: 8px;
  margin: 0;
  line-height: 1.2;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
}

.title-star {
  font-size: 32px;
  color: #d4a843;
  vertical-align: middle;
}

.game-subtitle {
  font-size: 18px;
  color: var(--sc-text-gray);
  letter-spacing: 12px;
  margin-top: 4px;
  font-family: var(--sc-font);
}

.title-divider {
  width: 300px;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    var(--sc-border-gold) 30%,
    var(--sc-border-highlight) 50%,
    var(--sc-border-gold) 70%,
    transparent 100%
  );
  margin: 16px auto 0;
}

/* ─── 菜单按钮 ─────────────────────────────── */
.menu-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 280px;
}

.menu-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 24px;
  font-size: 16px;
  text-transform: none;
  letter-spacing: 2px;
}

.btn-icon {
  font-size: 20px;
}

.btn-text {
  flex: 1;
}

/* ─── 种族选择 ─────────────────────────────── */
.race-selection {
  margin-top: 10px;
}

.section-title {
  font-size: 14px;
  text-align: center;
  margin-bottom: 10px;
  letter-spacing: 2px;
}

.race-options {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.race-btn {
  width: 160px;
  padding: 16px 12px;
  background: rgba(15, 18, 28, 0.9);
  border: 2px solid var(--sc-border-dim);
  cursor: pointer;
  text-align: center;
  transition: all 0.2s ease;
  color: var(--sc-text-white);
}

.race-btn:hover {
  border-color: var(--sc-border-gold);
  background: rgba(30, 40, 60, 0.9);
}

.race-btn.selected {
  border-color: var(--sc-border-highlight);
  background: rgba(40, 55, 80, 0.9);
  box-shadow: 0 0 12px rgba(196, 160, 64, 0.4);
}

.race-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.race-name {
  font-size: 13px;
  font-weight: bold;
  margin-bottom: 4px;
}

.race-desc {
  font-size: 10px;
  line-height: 1.3;
}

/* ─── 难度选择 ─────────────────────────────── */
.difficulty-section {
  margin-top: 12px;
  text-align: center;
}

.difficulty-options {
  display: flex;
  gap: 6px;
  justify-content: center;
  margin-top: 6px;
}

.diff-btn {
  padding: 6px 14px;
  font-size: 11px;
}

.diff-btn.active {
  background: var(--sc-bg-active);
  border-color: var(--sc-border-highlight);
  color: var(--sc-text-gold-bright);
}

/* ─── 开始游戏按钮 ─────────────────────────── */
.start-btn {
  margin-top: 16px;
  padding: 12px 40px;
  font-size: 16px;
  letter-spacing: 3px;
  background: linear-gradient(180deg, rgba(139, 115, 48, 0.4), rgba(80, 60, 20, 0.6));
  border-color: var(--sc-border-highlight);
  color: var(--sc-text-gold-bright);
  text-transform: uppercase;
  display: block;
  margin-left: auto;
  margin-right: auto;
}

.start-btn:hover {
  background: linear-gradient(180deg, rgba(196, 160, 64, 0.5), rgba(139, 115, 48, 0.6));
  box-shadow: 0 0 20px rgba(196, 160, 64, 0.4);
}

/* ─── 暂停菜单 ─────────────────────────────── */
.pause-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  pointer-events: auto;
}

.pause-menu {
  padding: 24px 32px;
  text-align: center;
  min-width: 280px;
}

.pause-title {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 20px;
  letter-spacing: 4px;
}

.pause-buttons {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pause-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 20px;
  font-size: 14px;
  text-transform: none;
}

.pause-hint {
  margin-top: 16px;
  font-size: 11px;
}

/* ─── 游戏结束画面 ─────────────────────────── */
.gameover-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  pointer-events: auto;
}

.gameover-content {
  text-align: center;
}

.gameover-title {
  font-size: 56px;
  font-weight: bold;
  margin-bottom: 24px;
  font-family: var(--sc-font);
}

.gameover-title.victory {
  color: #ffd700;
  animation: victory-glow 2s ease-in-out infinite;
}

.gameover-title.defeat {
  color: #cc2200;
  animation: defeat-flicker 1.5s ease-in-out infinite;
}

.gameover-stats {
  padding: 16px 24px;
  margin-bottom: 20px;
  min-width: 280px;
  text-align: left;
}

.gameover-stats .stat-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  border-bottom: 1px solid rgba(139, 115, 48, 0.2);
}

.gameover-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.gameover-buttons .sc-btn {
  padding: 10px 24px;
  font-size: 14px;
}

/* ─── 移动端适配 ───────────────────────────── */
@media (max-width: 768px) {
  .game-title {
    font-size: 28px;
    letter-spacing: 4px;
  }

  .game-subtitle {
    font-size: 12px;
    letter-spacing: 6px;
  }

  .race-options {
    flex-direction: column;
    align-items: center;
  }

  .race-btn {
    width: 200px;
  }

  .menu-buttons {
    min-width: 240px;
  }

  .gameover-title {
    font-size: 36px;
  }
}
</style>
