// ═══════════════════════════════════════════
// StarCraft Web - WebSocket 联机客户端
// 支持 Node.js ws 库 + 浏览器 WebSocket API 双模式
// ═══════════════════════════════════════════

/**
 * @typedef {Object} WSMessage
 * @property {string} type - 消息类型
 * @property {*} data - 消息数据
 * @property {number} [timestamp] - 时间戳
 * @property {string} [id] - 消息唯一 ID
 */

/**
 * 连接状态枚举
 * @enum {string}
 */
const ConnectionState = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
};

/**
 * 检测运行环境
 * @returns {'node'|'browser'}
 */
function getEnvironment() {
  if (typeof WebSocket !== 'undefined' && typeof process === 'undefined') {
    return 'browser';
  }
  if (typeof globalThis !== 'undefined' && typeof globalThis.WebSocket !== 'undefined') {
    return 'browser';
  }
  return 'node';
}

// ═══════════════════════════════════════════
// WebSocket 双模式客户端
// ═══════════════════════════════════════════

/**
 * WebSocket 联机客户端 - 支持 Node.js 和浏览器双模式
 *
 * 功能:
 * - 连接管理 (connect / disconnect / reconnect with exponential backoff)
 * - 消息序列化/反序列化 (JSON)
 * - 心跳检测
 * - 事件回调系统
 *
 * @example
 * const client = new WebSocketClient('ws://localhost:8080');
 * client.on('game:state', (data) => console.log(data));
 * client.connect();
 * client.send('player:move', { x: 10, z: 20 });
 */
export class WebSocketClient {
  /**
   * @param {string} url - WebSocket 服务器地址
   * @param {object} [options] - 配置选项
   * @param {number} [options.heartbeatInterval=30000] - 心跳间隔（毫秒）
   * @param {number} [options.heartbeatTimeout=10000] - 心跳超时（毫秒）
   * @param {number} [options.reconnectBaseDelay=1000] - 重连基础延迟（毫秒）
   * @param {number} [options.reconnectMaxDelay=30000] - 重连最大延迟（毫秒）
   * @param {number} [options.maxReconnectAttempts=10] - 最大重连次数
   */
  constructor(url, options = {}) {
    /** @type {string} 服务器地址 */
    this.url = url;

    // 配置
    /** @type {number} 心跳间隔 */
    this.heartbeatInterval = options.heartbeatInterval || 30000;
    /** @type {number} 心跳超时 */
    this.heartbeatTimeout = options.heartbeatTimeout || 10000;
    /** @type {number} 重连基础延迟 */
    this.reconnectBaseDelay = options.reconnectBaseDelay || 1000;
    /** @type {number} 重连最大延迟 */
    this.reconnectMaxDelay = options.reconnectMaxDelay || 30000;
    /** @type {number} 最大重连次数 */
    this.maxReconnectAttempts = options.maxReconnectAttempts || 10;

    // ── 连接状态 ──
    /** @type {string} 连接状态 */
    this.state = ConnectionState.DISCONNECTED;
    /** @type {object|null} 底层 WebSocket 实例 */
    this.socket = null;
    /** @type {'node'|'browser'} 运行环境 */
    this.environment = getEnvironment();

    // ── 事件系统 ──
    /** @type {Map<string, Set<Function>>} 事件回调 */
    this.listeners = new Map();

    // ── 心跳 ──
    /** @type {number|null} 心跳定时器 ID */
    this.heartbeatTimer = null;
    /** @type {number|null} 心跳超时定时器 ID */
    this.heartbeatTimeoutTimer = null;
    /** @type {boolean} 是否收到上次心跳 pong */
    this.heartbeatAck = true;

    // ── 重连 ──
    /** @type {number} 当前重连次数 */
    this.reconnectAttempts = 0;
    /** @type {number|null} 重连定时器 ID */
    this.reconnectTimer = null;
    /** @type {boolean} 是否手动断开（不自动重连） */
    this.manualDisconnect = false;

    // ── 消息队列（断开连接时缓存待发消息）──
    /** @type {WSMessage[]} 待发消息队列 */
    this.pendingMessages = [];

    // ── 消息 ID 计数 ──
    /** @type {number} 消息序号 */
    this.messageSeq = 0;
  }

  // ═══════════════════════════════════════════
  // 连接管理
  // ═══════════════════════════════════════════

  /**
   * 连接到服务器
   * @returns {Promise<void>} 连接成功/失败的 Promise
   */
  connect() {
    return new Promise((resolve, reject) => {
      if (this.state === ConnectionState.CONNECTED || this.state === ConnectionState.CONNECTING) {
        resolve();
        return;
      }

      this.manualDisconnect = false;
      this.state = ConnectionState.CONNECTING;

      try {
        if (this.environment === 'browser') {
          this._connectBrowser(resolve, reject);
        } else {
          this._connectNode(resolve, reject);
        }
      } catch (err) {
        this.state = ConnectionState.DISCONNECTED;
        reject(err);
      }
    });
  }

  /**
   * 浏览器模式连接
   * @private
   */
  _connectBrowser(resolve, reject) {
    const WS = typeof WebSocket !== 'undefined' ? WebSocket : globalThis.WebSocket;
    this.socket = new WS(this.url);

    this.socket.onopen = () => {
      this._onConnected();
      resolve();
    };

    this.socket.onmessage = (event) => {
      this._onMessage(event.data);
    };

    this.socket.onclose = (event) => {
      this._onDisconnected(event.code, event.reason);
    };

    this.socket.onerror = (err) => {
      if (this.state === ConnectionState.CONNECTING) {
        reject(err);
      }
      this._emit('error', { error: err });
    };
  }

  /**
   * Node.js 模式连接 (使用 ws 库)
   * @private
   */
  _connectNode(resolve, reject) {
    // 动态导入 ws 库
    import('ws').then(({ default: WebSocket }) => {
      this.socket = new WebSocket(this.url);

      this.socket.on('open', () => {
        this._onConnected();
        resolve();
      });

      this.socket.on('message', (data) => {
        this._onMessage(data.toString());
      });

      this.socket.on('close', (code, reason) => {
        this._onDisconnected(code, reason.toString());
      });

      this.socket.on('error', (err) => {
        if (this.state === ConnectionState.CONNECTING) {
          reject(err);
        }
        this._emit('error', { error: err });
      });
    }).catch(reject);
  }

  /**
   * 连接成功后的初始化
   * @private
   */
  _onConnected() {
    this.state = ConnectionState.CONNECTED;
    this.reconnectAttempts = 0;
    this.heartbeatAck = true;

    // 启动心跳
    this._startHeartbeat();

    // 发送缓存的消息
    this._flushPendingMessages();

    this._emit('connected', { url: this.url });
  }

  /**
   * 断开连接处理
   * @private
   * @param {number} code - 关闭码
   * @param {string} reason - 关闭原因
   */
  _onDisconnected(code, reason) {
    const wasConnected = this.state === ConnectionState.CONNECTED;
    this.state = ConnectionState.DISCONNECTED;

    // 停止心跳
    this._stopHeartbeat();

    this._emit('disconnected', { code, reason, wasConnected });

    // 自动重连（非手动断开时）
    if (!this.manualDisconnect && wasConnected) {
      this._scheduleReconnect();
    }
  }

  /**
   * 断开连接
   * @param {number} [code=1000] - 关闭码
   * @param {string} [reason=''] - 关闭原因
   */
  disconnect(code = 1000, reason = '') {
    this.manualDisconnect = true;
    this._stopHeartbeat();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      if (this.state === ConnectionState.CONNECTED ||
          this.state === ConnectionState.CONNECTING) {
        try {
          this.socket.close(code, reason);
        } catch (_e) {
          // 忽略关闭错误
        }
      }
      this.socket = null;
    }

    this.state = ConnectionState.DISCONNECTED;
    this._emit('disconnected', { code, reason, wasConnected: true });
  }

  /**
   * 检查是否已连接
   * @returns {boolean}
   */
  isConnected() {
    return this.state === ConnectionState.CONNECTED;
  }

  // ═══════════════════════════════════════════
  // 消息收发
  // ═══════════════════════════════════════════

  /**
   * 发送消息
   * @param {string} type - 消息类型
   * @param {*} data - 消息数据
   * @returns {boolean} 是否发送成功
   */
  send(type, data) {
    const message = this._serialize({ type, data });

    if (!this.isConnected()) {
      // 缓存未发送的消息
      this.pendingMessages.push({ type, data });
      return false;
    }

    try {
      if (this.environment === 'browser') {
        this.socket.send(message);
      } else {
        this.socket.send(message);
      }
      return true;
    } catch (err) {
      this._emit('error', { error: err, message: { type, data } });
      return false;
    }
  }

  /**
   * 注册事件监听器
   * @param {string} type - 消息类型或事件名
   * @param {Function} callback - 回调函数
   * @returns {Function} 取消监听函数
   */
  on(type, callback) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type).add(callback);

    return () => this.off(type, callback);
  }

  /**
   * 移除事件监听器
   * @param {string} type - 消息类型或事件名
   * @param {Function} callback - 回调函数
   */
  off(type, callback) {
    const listeners = this.listeners.get(type);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  /**
   * 触发事件
   * @private
   * @param {string} type - 事件名
   * @param {*} data - 事件数据
   */
  _emit(type, data) {
    const listeners = this.listeners.get(type);
    if (listeners) {
      for (const cb of listeners) {
        try {
          cb(data);
        } catch (err) {
          console.error(`[WebSocketClient] Error in listener for "${type}":`, err);
        }
      }
    }
  }

  // ═══════════════════════════════════════════
  // 消息序列化/反序列化
  // ═══════════════════════════════════════════

  /**
   * 序列化消息为 JSON 字符串
   * @private
   * @param {WSMessage} message - 消息对象
   * @returns {string} JSON 字符串
   */
  _serialize(message) {
    const msg = {
      ...message,
      id: `${++this.messageSeq}`,
      timestamp: Date.now(),
    };
    return JSON.stringify(msg);
  }

  /**
   * 反序列化 JSON 字符串为消息对象
   * @private
   * @param {string} raw - 原始字符串
   * @returns {WSMessage|null} 消息对象
   */
  _deserialize(raw) {
    try {
      return JSON.parse(raw);
    } catch (err) {
      console.error('[WebSocketClient] Failed to parse message:', err);
      return null;
    }
  }

  /**
   * 处理收到的消息
   * @private
   * @param {string} rawData - 原始消息数据
   */
  _onMessage(rawData) {
    const message = this._deserialize(rawData);
    if (!message) return;

    const { type, data } = message;

    // 处理心跳 pong
    if (type === 'pong') {
      this.heartbeatAck = true;
      if (this.heartbeatTimeoutTimer) {
        clearTimeout(this.heartbeatTimeoutTimer);
        this.heartbeatTimeoutTimer = null;
      }
      return;
    }

    // 触发对应类型的事件回调
    this._emit(type, data);

    // 触发通配符 '*'
    this._emit('*', { type, data, message });
  }

  // ═══════════════════════════════════════════
  // 心跳检测
  // ═══════════════════════════════════════════

  /**
   * 启动心跳定时器
   * @private
   */
  _startHeartbeat() {
    this._stopHeartbeat();
    this.heartbeatAck = true;

    this.heartbeatTimer = setInterval(() => {
      if (!this.heartbeatAck) {
        // 上次 ping 未收到 pong，认为连接断开
        console.warn('[WebSocketClient] Heartbeat timeout, reconnecting...');
        this.socket.close(4000, 'heartbeat timeout');
        return;
      }

      this.heartbeatAck = false;

      // 发送 ping
      try {
        const pingMsg = this._serialize({ type: 'ping', data: null });
        if (this.environment === 'browser') {
          this.socket.send(pingMsg);
        } else {
          this.socket.send(pingMsg);
        }
      } catch (_e) {
        // 发送失败，连接可能已断
        return;
      }

      // 设置 pong 超时检测
      this.heartbeatTimeoutTimer = setTimeout(() => {
        if (!this.heartbeatAck) {
          console.warn('[WebSocketClient] Pong timeout');
          this.socket.close(4001, 'pong timeout');
        }
      }, this.heartbeatTimeout);
    }, this.heartbeatInterval);
  }

  /**
   * 停止心跳定时器
   * @private
   */
  _stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
    }
  }

  // ═══════════════════════════════════════════
  // 重连机制
  // ═══════════════════════════════════════════

  /**
   * 安排重连（指数退避策略）
   * @private
   */
  _scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocketClient] Max reconnect attempts reached');
      this._emit('reconnect_failed', { attempts: this.reconnectAttempts });
      return;
    }

    this.state = ConnectionState.RECONNECTING;
    this.reconnectAttempts++;

    // 指数退避: delay = baseDelay * 2^(attempts-1), 附加随机抖动
    const delay = Math.min(
      this.reconnectBaseDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.reconnectMaxDelay
    );
    const jitter = delay * 0.1 * Math.random();
    const totalDelay = Math.round(delay + jitter);

    this._emit('reconnecting', {
      attempt: this.reconnectAttempts,
      delay: totalDelay,
    });

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(() => {
        // 连接失败，会在 _onDisconnected 中再次安排重连
      });
    }, totalDelay);
  }

  /**
   * 发送缓存的待发消息
   * @private
   */
  _flushPendingMessages() {
    while (this.pendingMessages.length > 0) {
      const msg = this.pendingMessages.shift();
      this.send(msg.type, msg.data);
    }
  }

  // ═══════════════════════════════════════════
  // 资源清理
  // ═══════════════════════════════════════════

  /**
   * 完全销毁客户端，释放所有资源
   */
  destroy() {
    this.disconnect(1000, 'destroy');
    this.listeners.clear();
    this.pendingMessages = [];
  }
}

export { ConnectionState, getEnvironment };
export default WebSocketClient;
