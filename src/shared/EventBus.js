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
    /** @type {Function|null} 可选的全局错误处理回调 */
    this._onError = null;
  }

  /**
   * 设置可选的全局错误处理回调（用于调试）
   * @param {Function|null} callback - 接收 (event, error) 参数的回调
   */
  onError(callback) {
    this._onError = callback;
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
    const listeners = this.listeners.get(event);
    if (listeners) {
      for (const cb of listeners) {
        cb(data);
      }
    }

    const once = this.onceListeners.get(event);
    if (once) {
      for (const cb of once) {
        cb(data);
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
export { EventBus };
export default eventBus;
