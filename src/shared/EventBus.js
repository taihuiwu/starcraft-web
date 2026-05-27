// ═══════════════════════════════════════════
// StarCraft Web - 事件总线
// 基于发布-订阅模式的游戏事件系统
// ═══════════════════════════════════════════

class EventBus {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this.listeners = new Map();
    /** @type {Map<string, Set<Function>>} 一次性监听器 */
    this.onceListeners = new Map();
  }

  /**
   * 注册事件监听器
   * @param {string} event - 事件名
   * @param {Function} callback - 回调函数
   * @returns {Function} 取消注册函数
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);

    // 返回取消函数
    return () => this.off(event, callback);
  }

  /**
   * 注册一次性事件监听器
   * @param {string} event
   * @param {Function} callback
   */
  once(event, callback) {
    if (!this.onceListeners.has(event)) {
      this.onceListeners.set(event, new Set());
    }
    this.onceListeners.get(event).add(callback);
  }

  /**
   * 移除事件监听器
   * @param {string} event
   * @param {Function} callback
   */
  off(event, callback) {
    const listeners = this.listeners.get(event);
    if (listeners) listeners.delete(callback);

    const once = this.onceListeners.get(event);
    if (once) once.delete(callback);
  }

  /**
   * 触发事件
   * @param {string} event - 事件名
   * @param {*} data - 事件数据
   */
  emit(event, data) {
    // 常规监听器
    const listeners = this.listeners.get(event);
    if (listeners) {
      for (const cb of listeners) {
        try {
          cb(data);
        } catch (err) {
          console.error(`[EventBus] Error in listener for "${event}":`, err);
        }
      }
    }

    // 一次性监听器
    const once = this.onceListeners.get(event);
    if (once) {
      for (const cb of once) {
        try {
          cb(data);
        } catch (err) {
          console.error(`[EventBus] Error in once-listener for "${event}":`, err);
        }
      }
      once.clear();
    }
  }

  /**
   * 清除指定事件的所有监听器
   * @param {string} event
   */
  clear(event) {
    this.listeners.delete(event);
    this.onceListeners.delete(event);
  }

  /**
   * 清除所有监听器
   */
  clearAll() {
    this.listeners.clear();
    this.onceListeners.clear();
  }
}

// 全局单例
export const eventBus = new EventBus();
export default eventBus;
