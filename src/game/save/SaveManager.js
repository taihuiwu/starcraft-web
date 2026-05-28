// ═══════════════════════════════════════════
// StarCraft Web - 存档管理器 (SaveManager)
// 管理游戏存档的保存、加载、删除、导入导出
// 使用localStorage持久化，支持多存档槽位
// ═══════════════════════════════════════════

import { eventBus } from '../../shared/EventBus.js';
import GameSerializer from './GameSerializer.js';

/**
 * localStorage中存档数据的键名前缀
 */
const SAVE_KEY_PREFIX = 'starcraft_save_';

/**
 * 存档列表元数据的键名
 */
const SAVE_LIST_KEY = 'starcraft_save_list';

/**
 * 最大存档槽位数量
 */
const MAX_SLOTS = 10;

/**
 * 单个存档的最大大小限制（字节，约2MB）
 */
const MAX_SAVE_SIZE = 2 * 1024 * 1024;

export default class SaveManager {
  /**
   * @param {import('../GameManager.js').default} gameManager - 游戏管理器引用
   */
  constructor(gameManager) {
    /** @type {import('../GameManager.js').default} */
    this.gameManager = gameManager;

    /** @type {GameSerializer} 序列化器 */
    this.serializer = new GameSerializer();

    /** @type {boolean} 是否启用增量存档 */
    this.useDeltaSave = false;

    /** @type {number} 存档计数器（用于区分同一槽位的多次保存） */
    this._saveCounter = 0;

    /** @type {boolean} 是否启用压缩存储 */
    this.enableCompression = true;

    /** @type {Map<string, string>} 已损坏存档的备份映射 */
    this._corruptionBackup = new Map();

    console.log('[SaveManager] 存档管理器初始化完成');
  }

  // ═══════════════════════════════════════
  // 核心存档操作
  // ═══════════════════════════════════════

  /**
   * 保存游戏到指定槽位
   * @param {string} slotId - 存档槽位ID（如'slot_1', 'auto_save'）
   * @param {Object} [options] - 保存选项
   * @param {string} [options.name] - 存档名称
   * @param {boolean} [options.isAutoSave] - 是否为自动存档
   * @returns {boolean} 是否保存成功
   */
  saveGame(slotId, options = {}) {
    const gm = this.gameManager;

    try {
      // 序列化游戏状态
      const json = this.useDeltaSave ?
        this.serializer.serializeDelta(gm) :
        this.serializer.serialize(gm);

      // 压缩存档数据以节省localStorage空间
      const finalData = this.enableCompression ?
        this.serializer.compress(json) : json;

      // 检查大小限制
      if (finalData.length > MAX_SAVE_SIZE) {
        console.error(`[SaveManager] 存档数据超过大小限制: ${(finalData.length / 1024 / 1024).toFixed(1)}MB`);
        return false;
      }
      // 保存到localStorage
      const key = SAVE_KEY_PREFIX + slotId;
      localStorage.setItem(key, finalData);

      // 更新存档列表元数据
      this._updateSaveList(slotId, {
        name: options.name || this._generateSaveName(gm),
        race: gm.playerRace,
        gameTime: gm.gameTickTime,
        timestamp: Date.now(),
        size: finalData.length,
        compressed: this.enableCompression,
        isAutoSave: options.isAutoSave || false,
        slotId,
      });
      this._saveCounter++;
      const compressionInfo = this.enableCompression && json.length > finalData.length ?
        ` (压缩${(json.length / 1024).toFixed(1)}KB→${(finalData.length / 1024).toFixed(1)}KB)` : '';
      console.log(`[SaveManager] ✅ 保存成功: ${slotId} (${(finalData.length / 1024).toFixed(1)}KB${compressionInfo})`);
      // 发射存档事件
      eventBus.emit('save:game_saved', { slotId, size: finalData.length });
      return true;
    } catch (err) {
      console.error('[SaveManager] 保存失败:', err);
      return false;
    }
  }

  /**
   * 从指定槽位加载游戏
   * @param {string} slotId - 存档槽位ID
   * @returns {boolean} 是否加载成功
   */
  loadGame(slotId) {
    const gm = this.gameManager;

    try {
      const key = SAVE_KEY_PREFIX + slotId;
      const json = localStorage.getItem(key);

      if (!json) {
        console.warn(`[SaveManager] 存档不存在: ${slotId}`);
        return false;
      }

      // 反序列化并恢复游戏状态
      const success = this.serializer.deserialize(json, gm);

      if (success) {
        console.log(`[SaveManager] ✅ 加载成功: ${slotId}`);
        eventBus.emit('save:game_loaded', { slotId });
        return true;
      } else {
        console.warn(`[SaveManager] 加载失败: 存档数据损坏，尝试损坏恢复`);
        return this._attemptCorruptionRecovery(slotId, json, gm);
      }
    } catch (err) {
      console.error('[SaveManager] 加载失败:', err);
      return false;
    }
  }

  /**
   * 删除指定槽位的存档
   * @param {string} slotId - 存档槽位ID
   * @returns {boolean} 是否删除成功
   */
  deleteSave(slotId) {
    try {
      const key = SAVE_KEY_PREFIX + slotId;
      localStorage.removeItem(key);

      // 从列表中移除
      const list = this._getSaveListRaw();
      delete list[slotId];
      localStorage.setItem(SAVE_LIST_KEY, JSON.stringify(list));

      console.log(`[SaveManager] 已删除存档: ${slotId}`);
      eventBus.emit('save:game_deleted', { slotId });
      return true;
    } catch (err) {
      console.error('[SaveManager] 删除失败:', err);
      return false;
    }
  }

  /**
   * 获取所有存档列表
   * @returns {Array<Object>} 存档信息数组，按时间倒序排列
   */
  getSaveList() {
    const list = this._getSaveListRaw();

    return Object.values(list)
      .sort((a, b) => b.timestamp - a.timestamp)
      .map((item) => ({
        slotId: item.slotId,
        name: item.name,
        race: item.race,
        gameTime: item.gameTime,
        gameTimeFormatted: this._formatGameTime(item.gameTime),
        timestamp: item.timestamp,
        timeFormatted: this._formatTimestamp(item.timestamp),
        size: item.size,
        sizeFormatted: this._formatSize(item.size),
        isAutoSave: item.isAutoSave,
        compressed: item.compressed || false,
      }));
  }

  // ═══════════════════════════════════════
  // 自动存档
  // ═══════════════════════════════════════

  /**
   * 执行自动存档
   * @returns {boolean} 是否成功
   */
  autoSave() {
    return this.saveGame('auto_save', {
      name: '自动存档',
      isAutoSave: true,
    });
  }

  // ═══════════════════════════════════════
  // 导入导出
  // ═══════════════════════════════════════

  /**
   * 导出存档为JSON文件（浏览器下载）
   * @param {string} slotId - 存档槽位ID
   * @returns {boolean} 是否成功
   */
  exportSave(slotId) {
    try {
      const key = SAVE_KEY_PREFIX + slotId;
      const json = localStorage.getItem(key);

      if (!json) {
        console.warn(`[SaveManager] 无法导出，存档不存在: ${slotId}`);
        return false;
      }

      // 解析并添加导出元数据
      const saveData = JSON.parse(json);
      saveData._exportMeta = {
        exportTime: Date.now(),
        exportVersion: '1.0',
        gameName: 'StarCraft Web',
      };

      const exportJson = JSON.stringify(saveData, null, 2);

      // 创建Blob并触发下载
      const blob = new Blob([exportJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `starcraft_save_${slotId}_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log(`[SaveManager] 导出成功: ${slotId}`);
      return true;
    } catch (err) {
      console.error('[SaveManager] 导出失败:', err);
      return false;
    }
  }

  /**
   * 从JSON文件导入存档
   * @param {string} jsonContent - JSON文件内容
   * @param {string} [slotId] - 目标槽位ID（可选，默认自动生成）
   * @returns {boolean} 是否成功
   */
  importSave(jsonContent, slotId) {
    try {
      const saveData = JSON.parse(jsonContent);

      // 验证是否为有效的存档文件
      if (!saveData.version || !saveData.units || !saveData.buildings) {
        console.error('[SaveManager] 无效的存档文件格式');
        return false;
      }

      // 验证游戏名称（防止导入其他游戏的存档）
      if (saveData._exportMeta && saveData._exportMeta.gameName !== 'StarCraft Web') {
        console.error('[SaveManager] 存档来源不匹配');
        return false;
      }

      // 确定槽位ID
      const targetSlot = slotId || `imported_${Date.now()}`;

      // 保存到localStorage
      const cleanJson = JSON.stringify(saveData);
      const key = SAVE_KEY_PREFIX + targetSlot;
      localStorage.setItem(key, cleanJson);

      // 更新存档列表
      this._updateSaveList(targetSlot, {
        name: saveData._exportMeta ?
          `导入存档 (${new Date(saveData._exportMeta.exportTime).toLocaleDateString()})` :
          '导入存档',
        race: saveData.playerRace || 'terran',
        gameTime: saveData.gameTime || 0,
        timestamp: Date.now(),
        size: cleanJson.length,
        isAutoSave: false,
        slotId: targetSlot,
      });

      console.log(`[SaveManager] 导入成功: ${targetSlot}`);
      eventBus.emit('save:game_imported', { slotId: targetSlot });
      return true;
    } catch (err) {
      console.error('[SaveManager] 导入失败:', err);
      return false;
    }
  }

  /**
   * 从文件输入元素导入存档
   * @param {File} file - 用户选择的文件
   * @returns {Promise<boolean>} 是否成功
   */
  async importFromFile(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const success = this.importSave(e.target.result);
        resolve(success);
      };
      reader.onerror = () => {
        console.error('[SaveManager] 文件读取失败');
        resolve(false);
      };
      reader.readAsText(file);
    });
  }

  // ═══════════════════════════════════════
  // 存档验证与修复
  // ═══════════════════════════════════════

  /**
   * 验证存档是否完整有效
   * @param {string} slotId - 存档槽位ID
   * @returns {Object} { valid: boolean, errors: string[] }
   */
  validateSave(slotId) {
    const errors = [];

    try {
      const key = SAVE_KEY_PREFIX + slotId;
      const json = localStorage.getItem(key);

      if (!json) {
        return { valid: false, errors: ['存档不存在'] };
      }

      // 解压后解析（支持压缩格式）
      const decompressed = this.serializer._tryDecompress(json);
      const data = JSON.parse(decompressed);

      // 检查必要字段
      if (!data.version) errors.push('缺少版本号');
      if (!data.playerRace) errors.push('缺少玩家种族');
      if (!Array.isArray(data.units)) errors.push('单位数据格式错误');
      if (!Array.isArray(data.buildings)) errors.push('建筑数据格式错误');
      if (data.gameTime === undefined) errors.push('缺少游戏时间');

      // 检查单位数据完整性
      if (data.units) {
        for (const unit of data.units) {
          if (!unit.id && unit.id !== 0) errors.push(`单位缺少ID`);
          if (!unit.pos || unit.pos.length < 3) errors.push(`单位 ${unit.id} 位置数据不完整`);
          if (unit.hp === undefined) errors.push(`单位 ${unit.id} 缺少生命值`);
        }
      }

      return {
        valid: errors.length === 0,
        errors,
      };
    } catch (err) {
      return { valid: false, errors: ['存档解析失败: ' + err.message] };
    }
  }

  /**
   * 获取存档占用的总空间
   * @returns {Object} { used, available, percentage }
   */
  getStorageUsage() {
    let used = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(SAVE_KEY_PREFIX)) {
        used += localStorage.getItem(key).length * 2; // UTF-16编码，每字符2字节
      }
    }

    // localStorage通常限制5MB
    const available = 5 * 1024 * 1024;

    return {
      used,
      available,
      percentage: ((used / available) * 100).toFixed(1),
      usedFormatted: this._formatSize(used),
      availableFormatted: this._formatSize(available),
    };
  }

  // ═══════════════════════════════════════
  // 内部方法
  // ═══════════════════════════════════════

  /**
   * 获取存档列表原始数据
   * @returns {Object}
   */
  _getSaveListRaw() {
    try {
      const raw = localStorage.getItem(SAVE_LIST_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (err) {
      return {};
    }
  }

  /**
   * 更新存档列表元数据
   * @param {string} slotId
   * @param {Object} metaData
   */
  _updateSaveList(slotId, metaData) {
    const list = this._getSaveListRaw();
    list[slotId] = metaData;
    localStorage.setItem(SAVE_LIST_KEY, JSON.stringify(list));
  }

  /**
   * 生成默认存档名称
   * @param {GameManager} gm
   * @returns {string}
   */
  _generateSaveName(gm) {
    const raceNames = { terran: '人族', zerg: '虫族', protoss: '神族' };
    const raceName = raceNames[gm.playerRace] || gm.playerRace;
    const time = new Date().toLocaleTimeString('zh-CN');
    return `${raceName} - ${time}`;
  }

  /**
   * 格式化游戏时间
   * @param {number} ticks
   * @returns {string}
   */
  _formatGameTime(ticks) {
    const seconds = Math.floor(ticks / 24); // 24 ticks/second
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) {
      return `${hours}时${minutes % 60}分${seconds % 60}秒`;
    }
    return `${minutes}分${seconds % 60}秒`;
  }

  /**
   * 格式化时间戳
   * @param {number} timestamp
   * @returns {string}
   */
  _formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * 格式化文件大小
   * @param {number} bytes
   * @returns {string}
   */
  _formatSize(bytes) {
    if (bytes < 1024) return bytes + 'B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB';
    return (bytes / 1024 / 1024).toFixed(1) + 'MB';
  }

  // ═══════════════════════════════════════
  // 损坏恢复与修复
  // ═══════════════════════════════════════

  /**
   * 尝试损坏恢复：尝试各种策略修复并加载损坏的存档
   * @param {string} slotId - 槽位ID
   * @param {string} rawJson - 原始JSON字符串
   * @param {GameManager} gm - 游戏管理器
   * @returns {boolean} 是否恢复成功
   */
  _attemptCorruptionRecovery(slotId, rawJson, gm) {
    console.log(`[SaveManager] 开始损坏恢复: ${slotId}`);

    // 策略1: 尝试去除可能的尾部截断字符并修复JSON
    try {
      let cleaned = rawJson.trim();
      // 尝试补全被截断的JSON
      if (cleaned.endsWith(',') || cleaned.endsWith('{')) {
        cleaned = cleaned.slice(0, cleaned.lastIndexOf(',') > cleaned.lastIndexOf('{') ?
          cleaned.lastIndexOf(',') : cleaned.lastIndexOf('{'));
      }
      // 尝试补全括号
      const openBraces = (cleaned.match(/{/g) || []).length;
      const closeBraces = (cleaned.match(/}/g) || []).length;
      const openBrackets = (cleaned.match(/\[/g) || []).length;
      const closeBrackets = (cleaned.match(/]/g) || []).length;
      cleaned += '}'.repeat(Math.max(0, openBraces - closeBraces));
      cleaned += ']'.repeat(Math.max(0, openBrackets - closeBrackets));

      if (this.serializer.deserialize(cleaned, gm)) {
        console.log(`[SaveManager] ✅ 损坏恢复成功（JSON修复）: ${slotId}`);
        this._saveCorruptionBackup(slotId, rawJson);
        return true;
      }
    } catch (e) {
      // 策略1失败
    }

    // 策略2: 尝试提取JSON对象（忽略前后垃圾字符）
    try {
      const firstBrace = rawJson.indexOf('{');
      const lastBrace = rawJson.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        const extracted = rawJson.slice(firstBrace, lastBrace + 1);
        if (this.serializer.deserialize(extracted, gm)) {
          console.log(`[SaveManager] ✅ 损坏恢复成功（JSON提取）: ${slotId}`);
          this._saveCorruptionBackup(slotId, rawJson);
          return true;
        }
      }
    } catch (e) {
      // 策略2失败
    }

    // 所有策略失败
    console.error(`[SaveManager] ❌ 损坏恢复失败，存档无法修复: ${slotId}`);
    return false;
  }

  /**
   * 保存损坏存档的备份（用于后续分析）
   * @param {string} slotId
   * @param {string} rawData
   */
  _saveCorruptionBackup(slotId, rawData) {
    try {
      const backupKey = SAVE_KEY_PREFIX + slotId + '_corruption_backup';
      localStorage.setItem(backupKey, rawData.slice(0, 10000)); // 限制备份大小
      this._corruptionBackup.set(slotId, backupKey);
      console.log(`[SaveManager] 已保存损坏存档备份: ${slotId}`);
    } catch (err) {
      // 备份失败不影响主流程
    }
  }

  /**
   * 获取存档的健康状态报告
   * @param {string} slotId
   * @returns {Object} 健康报告
   */
  getSaveHealthReport(slotId) {
    const report = {
      slotId,
      exists: false,
      valid: false,
      version: null,
      size: 0,
      compressed: false,
      canLoad: false,
      issues: [],
    };

    try {
      const key = SAVE_KEY_PREFIX + slotId;
      const json = localStorage.getItem(key);

      if (!json) {
        report.issues.push('存档不存在');
        return report;
      }

      report.exists = true;
      report.size = json.length;

      // 检查是否压缩
      report.compressed = json.startsWith('SCZ:');

      // 尝试解析
      let data;
      try {
        const parsed = JSON.parse(this.serializer._tryDecompress(json));
        data = parsed;
      } catch (e) {
        report.issues.push('JSON解析失败: ' + e.message);
        return report;
      }

      // 校验
      const validation = this.serializer.validateSaveData(data);
      report.version = data.version || null;
      report.valid = validation.valid;
      report.issues.push(...validation.errors);

      // 检查是否可迁移
      if (data.version && data.version !== GameSerializer.getSaveVersion()) {
        report.issues.push(`版本不匹配: v${data.version} → v${GameSerializer.getSaveVersion()}`);
        report.canLoad = GameSerializer.canMigrate(data.version);
      } else {
        report.canLoad = true;
      }

      return report;
    } catch (err) {
      report.issues.push('检查失败: ' + err.message);
      return report;
    }
  }

  /**
   * 批量检查所有存档的健康状态
   * @returns {Array<Object>} 各存档健康报告
   */
  checkAllSavesHealth() {
    const list = this._getSaveListRaw();
    return Object.keys(list).map((slotId) => this.getSaveHealthReport(slotId));
  }

  /**
   * 修复指定存档（重新序列化并保存）
   * @param {string} slotId
   * @returns {boolean} 是否修复成功
   */
  repairSave(slotId) {
    try {
      const gm = this.gameManager;
      const key = SAVE_KEY_PREFIX + slotId;
      const json = localStorage.getItem(key);

      if (!json) {
        console.warn(`[SaveManager] 无法修复，存档不存在: ${slotId}`);
        return false;
      }

      // 尝试加载
      const loaded = this.serializer.deserialize(json, gm);
      if (!loaded) {
        console.error(`[SaveManager] 无法加载存档，无法修复: ${slotId}`);
        return false;
      }

      // 重新保存（使用当前版本格式）
      return this.saveGame(slotId, { name: '修复后的存档' });
    } catch (err) {
      console.error('[SaveManager] 修复失败:', err);
      return false;
    }
  }
}
