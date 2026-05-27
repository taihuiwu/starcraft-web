// ═══════════════════════════════════════════
// StarCraft Web - 自动存档系统 (AutoSave)
// 定时自动存档、保留最近N个自动存档、
// 游戏崩溃恢复检测
// ═══════════════════════════════════════════

import { eventBus } from '../../shared/EventBus.js';
import { EVENTS } from '../../shared/Constants.js';

/**
 * 自动存档在localStorage中的元数据键名
 */
const AUTO_SAVE_META_KEY = 'starcraft_autosave_meta';

/**
 * 崩溃恢复标记的键名
 */
const CRASH_RECOVERY_KEY = 'starcraft_crash_recovery';

/**
 * 默认配置
 */
const DEFAULT_CONFIG = {
  /** 自动存档间隔（秒），默认5分钟 */
  interval: 300,

  /** 最多保留的自动存档数量 */
  maxSlots: 3,

  /** 是否启用崩溃恢复检测 */
  crashRecovery: true,

  /** 游戏运行超过多少秒后才开始自动存档（避免频繁小存档） */
  minPlayTime: 60,
};

export default class AutoSave {
  /**
   * @param {import('../GameManager.js').default} gameManager - 游戏管理器
   * @param {import('./SaveManager.js').default} saveManager - 存档管理器
   * @param {Object} [config] - 配置选项
   */
  constructor(gameManager, saveManager, config = {}) {
    /** @type {import('../GameManager.js').default} */
    this.gameManager = gameManager;

    /** @type {import('./SaveManager.js').default} */
    this.saveManager = saveManager;

    /** @type {Object} 配置 */
    this.config = { ...DEFAULT_CONFIG, ...config };

    /** @type {number} 定时器ID（用于清除） */
    this._timerId = null;

    /** @type {number} 距离上次自动存档的秒数 */
    this._secondsSinceLastSave = 0;

    /** @type {boolean} 自动存档是否已启用 */
    this.enabled = false;

    /** @type {number} 游戏开始以来的总秒数 */
    this._playTime = 0;

    /** @type {number} 当前自动存档轮次 */
    this._currentSlot = 0;

    // 加载自动存档元数据
    this._loadMeta();
  }

  // ═══════════════════════════════════════
  // 生命周期控制
  // ═══════════════════════════════════════

  /**
   * 启动自动存档
   */
  start() {
    if (this.enabled) return;

    this.enabled = true;
    this._secondsSinceLastSave = 0;
    this._playTime = 0;

    // 记录游戏开始（崩溃恢复用）
    if (this.config.crashRecovery) {
      this._setCrashRecovery(true);
    }

    // 监听游戏tick事件来计时
    this._tickUnsub = eventBus.on(EVENTS.TICK, (data) => {
      this._onTick(data.dt || 0);
    });

    console.log(`[AutoSave] 自动存档已启动，间隔: ${this.config.interval}秒`);
  }

  /**
   * 停止自动存档
   */
  stop() {
    if (!this.enabled) return;

    this.enabled = false;

    // 清除崩溃恢复标记
    if (this.config.crashRecovery) {
      this._setCrashRecovery(false);
    }

    // 取消事件监听
    if (this._tickUnsub) {
      this._tickUnsub();
      this._tickUnsub = null;
    }

    console.log('[AutoSave] 自动存档已停止');
  }

  /**
   * 重置自动存档状态
   */
  reset() {
    this.stop();
    this._secondsSinceLastSave = 0;
    this._playTime = 0;
    this._currentSlot = 0;
  }

  // ═══════════════════════════════════════
  // 核心逻辑
  // ═══════════════════════════════════════

  /**
   * 游戏tick回调，累积时间并触发自动存档
   * @param {number} dt - 帧间隔时间（秒）
   */
  _onTick(dt) {
    if (!this.enabled) return;

    this._playTime += dt;
    this._secondsSinceLastSave += dt;

    // 检查是否达到最小游戏时间要求
    if (this._playTime < this.config.minPlayTime) return;

    // 检查是否到达自动存档间隔
    if (this._secondsSinceLastSave >= this.config.interval) {
      this._performAutoSave();
      this._secondsSinceLastSave = 0;
    }
  }

  /**
   * 执行自动存档
   */
  _performAutoSave() {
    const gm = this.gameManager;

    // 游戏未运行或暂停时不存档
    if (!gm.running || gm.paused) return;

    // 生成轮转的槽位ID
    const slotId = this._getNextAutoSaveSlot();

    console.log(`[AutoSave] 执行自动存档 → ${slotId}`);

    // 执行保存
    const success = this.saveManager.saveGame(slotId, {
      name: `自动存档 #${this._currentSlot + 1}`,
      isAutoSave: true,
    });

    if (success) {
      this._currentSlot = (this._currentSlot + 1) % this.config.maxSlots;
      this._saveMeta();

      eventBus.emit('autosave:completed', {
        slotId,
        slot: this._currentSlot,
        total: this.config.maxSlots,
      });
    } else {
      eventBus.emit('autosave:failed', { slotId });
    }
  }

  /**
   * 获取下一个自动存档槽位ID
   * @returns {string}
   */
  _getNextAutoSaveSlot() {
    return `auto_save_${this._currentSlot}`;
  }

  // ═══════════════════════════════════════
  // 崩溃恢复
  // ═══════════════════════════════════════

  /**
   * 检测是否存在未完成的游戏（崩溃恢复）
   * @returns {Object|null} 恢复数据或null
   */
  checkCrashRecovery() {
    try {
      const raw = localStorage.getItem(CRASH_RECOVERY_KEY);
      if (!raw) return null;

      const data = JSON.parse(raw);

      if (data.active && data.timestamp) {
        // 查找最近的自动存档
        const lastAutoSave = this._findLatestAutoSave();

        if (lastAutoSave) {
          console.log('[AutoSave] 🔴 检测到崩溃恢复数据');
          return {
            hasRecovery: true,
            lastSave: lastAutoSave,
            crashTime: data.timestamp,
            playTime: data.playTime || 0,
          };
        }
      }

      return null;
    } catch (err) {
      console.warn('[AutoSave] 崩溃恢复检测失败:', err);
      return null;
    }
  }

  /**
   * 执行崩溃恢复
   * @returns {boolean} 是否成功恢复
   */
  recoverFromCrash() {
    const recovery = this.checkCrashRecovery();
    if (!recovery || !recovery.lastSave) return false;

    const success = this.saveManager.loadGame(recovery.lastSave.slotId);

    if (success) {
      // 清除崩溃恢复标记
      this._setCrashRecovery(false);
      console.log('[AutoSave] ✅ 崩溃恢复成功');
      eventBus.emit('autosave:recovered', { slotId: recovery.lastSave.slotId });
    }

    return success;
  }

  /**
   * 查找最新的自动存档
   * @returns {Object|null}
   */
  _findLatestAutoSave() {
    const saveList = this.saveManager.getSaveList();
    return saveList.find((s) => s.isAutoSave) || null;
  }

  /**
   * 设置崩溃恢复标记
   * @param {boolean} active
   */
  _setCrashRecovery(active) {
    try {
      if (active) {
        localStorage.setItem(CRASH_RECOVERY_KEY, JSON.stringify({
          active: true,
          timestamp: Date.now(),
          playTime: this._playTime,
        }));
      } else {
        localStorage.removeItem(CRASH_RECOVERY_KEY);
      }
    } catch (err) {
      console.warn('[AutoSave] 崩溃恢复标记操作失败:', err);
    }
  }

  // ═══════════════════════════════════════
  // 元数据管理
  // ═══════════════════════════════════════

  /**
   * 保存自动存档元数据
   */
  _saveMeta() {
    try {
      const meta = {
        currentSlot: this._currentSlot,
        totalSlots: this.config.maxSlots,
        interval: this.config.interval,
        lastSaveTime: Date.now(),
        playTime: this._playTime,
      };
      localStorage.setItem(AUTO_SAVE_META_KEY, JSON.stringify(meta));
    } catch (err) {
      console.warn('[AutoSave] 元数据保存失败:', err);
    }
  }

  /**
   * 加载自动存档元数据
   */
  _loadMeta() {
    try {
      const raw = localStorage.getItem(AUTO_SAVE_META_KEY);
      if (raw) {
        const meta = JSON.parse(raw);
        this._currentSlot = meta.currentSlot || 0;
      }
    } catch (err) {
      console.warn('[AutoSave] 元数据加载失败:', err);
    }
  }

  // ═══════════════════════════════════════
  // 配置管理
  // ═══════════════════════════════════════

  /**
   * 更新自动存档配置
   * @param {Object} newConfig - 新配置（部分更新）
   */
  updateConfig(newConfig) {
    Object.assign(this.config, newConfig);
    console.log('[AutoSave] 配置已更新:', newConfig);
  }

  /**
   * 手动触发一次自动存档
   */
  triggerManualAutoSave() {
    this._performAutoSave();
  }

  /**
   * 获取自动存档状态
   * @returns {Object}
   */
  getStatus() {
    return {
      enabled: this.enabled,
      interval: this.config.interval,
      maxSlots: this.config.maxSlots,
      currentSlot: this._currentSlot,
      secondsSinceLastSave: Math.floor(this._secondsSinceLastSave),
      nextSaveIn: Math.max(0, this.config.interval - Math.floor(this._secondsSinceLastSave)),
      playTime: Math.floor(this._playTime),
      hasCrashRecovery: !!this.checkCrashRecovery(),
    };
  }
}
