// ═══════════════════════════════════════════
// StarCraft Web - 状态同步管理器
// 客户端预测 + 服务器确认 + 输入延迟补偿
// ═══════════════════════════════════════════

import { eventBus } from '../shared/EventBus.js';

// ── 同步消息类型 ──
/** @enum {string} */
const SYNC_MSG = {
  INPUT: 'sync:input',
  SNAPSHOT: 'sync:snapshot',
  STATE_DIFF: 'sync:state_diff',
  CONFIRM: 'sync:confirm',
  RECONCILE: 'sync:reconcile',
  PING: 'sync:ping',
  PONG: 'sync:pong',
  REQUEST_STATE: 'sync:request_state',
};

// ── 同步配置 ──
/** @type {object} */
const SYNC_CONFIG = {
  /** 快照发送间隔（秒） */
  snapshotInterval: 0.1,
  /** 最大输入缓冲大小 */
  maxInputBuffer: 256,
  /** 最大预测偏差容忍度 */
  maxPredictionError: 0.1,
  /** 状态压缩阈值（超过此值的数值使用差分编码） */
  compressionThreshold: 100,
};

/**
 * @typedef {Object} GameInput
 * @property {number} seq - 输入序号
 * @property {number} playerId - 玩家 ID
 * @property {string} type - 输入类型 ('move', 'attack', 'build', etc.)
 * @property {object} data - 输入数据
 * @property {number} timestamp - 输入时间戳
 * @property {number} frame - 预测帧号
 */

/**
 * @typedef {Object} StateSnapshot
 * @property {number} frame - 帧号
 * @property {number} timestamp - 服务器时间戳
 * @property {object} state - 完整游戏状态
 * @property {number} checksum - 状态校验和
 */

/**
 * @typedef {Object} StateDiff
 * @property {number} frame - 帧号
 * @property {object} diff - 状态差异（只包含变化的部分）
 * @property {number} baseFrame - 基于哪个帧的差异
 * @property {number} checksum - 差分后状态校验和
 */

// ═══════════════════════════════════════════
// 状态压缩器
// ═══════════════════════════════════════════

/**
 * 状态快照压缩器 - 对游戏状态进行差分编码和压缩
 */
class SnapshotCompressor {
  constructor() {
    /** @type {StateSnapshot|null} 上一个完整快照 */
    this.lastSnapshot = null;
    /** @type {number} 压缩计数器 */
    this.compressedCount = 0;
    /** @type {number} 非压缩计数器 */
    this.fullCount = 0;
  }

  /**
   * 压缩状态为差分数据
   * @param {StateSnapshot} snapshot - 当前完整快照
   * @returns {{ isDiff: boolean, data: StateSnapshot|StateDiff }} 压缩结果
   */
  compress(snapshot) {
    if (!this.lastSnapshot) {
      // 第一次，发送完整快照
      this.lastSnapshot = this._deepClone(snapshot);
      this.fullCount++;
      return { isDiff: false, data: snapshot };
    }

    const diff = this._computeDiff(this.lastSnapshot, snapshot);

    if (Object.keys(diff).length === 0) {
      // 无变化
      return { isDiff: true, data: { frame: snapshot.frame, diff: {}, baseFrame: this.lastSnapshot.frame, checksum: snapshot.checksum } };
    }

    // 差分数据是否足够小以值得压缩
    const fullSize = this._estimateSize(snapshot.state);
    const diffSize = this._estimateSize(diff);

    if (diffSize < fullSize * 0.5) {
      // 使用差分
      this.compressedCount++;
      return {
        isDiff: true,
        data: {
          frame: snapshot.frame,
          diff,
          baseFrame: this.lastSnapshot.frame,
          checksum: snapshot.checksum,
        },
      };
    }

    // 差分太大，发送完整快照
    this.fullCount++;
    this.lastSnapshot = this._deepClone(snapshot);
    return { isDiff: false, data: snapshot };
  }

  /**
   * 解压差分数据到完整状态
   * @param {StateSnapshot|StateDiff} data - 压缩数据
   * @param {StateSnapshot} baseState - 基准状态（用于差分解码）
   * @returns {StateSnapshot} 完整状态
   */
  decompress(data, baseState) {
    if (!data || typeof data !== 'object') return baseState;

    // 完整快照
    if (data.state !== undefined && data.diff === undefined) {
      this.lastSnapshot = this._deepClone(data);
      return data;
    }

    // 差分数据
    if (data.diff !== undefined) {
      const merged = this._mergeDiff(baseState.state, data.diff);
      const result = {
        frame: data.frame,
        timestamp: Date.now(),
        state: merged,
        checksum: data.checksum,
      };
      this.lastSnapshot = this._deepClone(result);
      return result;
    }

    return baseState;
  }

  /**
   * 计算两个状态之间的差异
   * @private
   */
  _computeDiff(base, current) {
    const diff = {};
    const baseState = base.state || {};
    const currentState = current.state || {};

    const allKeys = new Set([...Object.keys(baseState), ...Object.keys(currentState)]);

    for (const key of allKeys) {
      const baseVal = baseState[key];
      const currVal = currentState[key];

      if (baseVal === currVal) continue;
      if (typeof baseVal === 'object' && typeof currVal === 'object' && baseVal !== null && currVal !== null) {
        const subDiff = this._computeDiff(
          { state: baseVal },
          { state: currVal }
        );
        if (Object.keys(subDiff).length > 0) {
          diff[key] = subDiff;
        }
      } else if (baseVal !== currVal) {
        diff[key] = currVal;
      }
    }

    return diff;
  }

  /**
   * 合并差分到基准状态
   * @private
   */
  _mergeDiff(base, diff) {
    const result = { ...base };

    for (const key of Object.keys(diff)) {
      if (typeof diff[key] === 'object' && diff[key] !== null &&
          typeof base[key] === 'object' && base[key] !== null) {
        result[key] = this._mergeDiff(base[key], diff[key]);
      } else {
        result[key] = diff[key];
      }
    }

    return result;
  }

  /**
   * 估算对象大小
   * @private
   */
  _estimateSize(obj) {
    // 快速估算: 对象约30字节/属性，数组约20字节/元素，字符串按长度
    if (obj === null || obj === undefined) return 0;
    if (typeof obj !== 'object') return String(obj).length;
    if (Array.isArray(obj)) {
      let sum = 2; // []
      for (let i = 0; i < obj.length; i++) sum += this._estimateSize(obj[i]) + 1;
      return sum;
    }
    let sum = 2; // {}
    const keys = Object.keys(obj);
    for (let i = 0; i < keys.length; i++) {
      sum += keys[i].length + 20 + this._estimateSize(obj[keys[i]]);
    }
    return sum;
  }

  /**
   * 深拷贝
   * @private
   */
  _deepClone(obj) {
    if (typeof structuredClone === 'function') {
      try { return structuredClone(obj); } catch (_e) { /* fall through */ }
    }
    return this._fastClone(obj);
  }

  /**
   * 快速递归深拷贝 - 跳过函数和循环引用
   * @private
   */
  _fastClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) {
      const arr = new Array(obj.length);
      for (let i = 0; i < obj.length; i++) arr[i] = this._fastClone(obj[i]);
      return arr;
    }
    const keys = Object.keys(obj);
    const result = {};
    for (let i = 0; i < keys.length; i++) {
      result[keys[i]] = this._fastClone(obj[keys[i]]);
    }
    return result;
  }
}

// ═══════════════════════════════════════════
// 同步管理器
// ═══════════════════════════════════════════

/**
 * 状态同步管理器 - 处理客户端预测、服务器确认和状态同步
 *
 * 同步流程:
 * 1. 客户端发送输入到服务器 (sendInput)
 * 2. 客户端本地预测应用输入
 * 3. 服务器处理输入并广播确认
 * 4. 客户端收到确认后进行 reconciliation（调和）
 * 5. 如果预测正确，无需修正；否则回滚到服务器状态并重新模拟
 *
 * @example
 * const sync = new SyncManager(wsClient, gameState);
 * // 发送输入
 * sync.sendInput({ type: 'move', unitId: 1, target: { x: 10, z: 20 } });
 * // 接收服务器快照
 * wsClient.on('sync:snapshot', (data) => sync.applySnapshot(data));
 */
export class SyncManager {
  /**
   * @param {object} wsClient - WebSocketClient 实例
   * @param {object} gameState - 游戏状态对象
   * @param {object} [options] - 配置选项
   * @param {number} [options.playerId] - 本地玩家 ID
   * @param {number} [options.inputDelay=2] - 输入延迟帧数
   */
  constructor(wsClient, gameState, options = {}) {
    /** @type {object} WebSocket 客户端 */
    this.wsClient = wsClient;

    /** @type {object} 游戏状态引用 */
    this.gameState = gameState;

    /** @type {number} 玩家 ID */
    this.playerId = options.playerId || 0;

    // ── 配置 ──
    /** @type {number} 输入延迟帧数 */
    this.inputDelay = options.inputDelay || 2;
    /** @type {number} 快照发送间隔 */
    this.snapshotInterval = SYNC_CONFIG.snapshotInterval;

    // ── 帧和序号 ──
    /** @type {number} 当前本地帧号 */
    this.currentFrame = 0;
    /** @type {number} 最后确认的服务器帧号 */
    this.lastConfirmedFrame = 0;
    /** @type {number} 输入序号 */
    this.inputSeq = 0;

    // ── 输入缓冲 ──
    /** @type {GameInput[]} 待确认的输入缓冲区 */
    this.inputBuffer = [];
    /** @type {GameInput[]} 输入延迟缓冲区 */
    this.inputDelayBuffer = [];

    // ── 状态快照 ──
    /** @type {StateSnapshot|null} 上一个完整快照 */
    this.lastSnapshot = null;
    /** @type {Map<number, StateSnapshot>} 帧号到快照的映射 */
    this.frameSnapshots = new Map();

    // ── 压缩器 ──
    /** @type {SnapshotCompressor} 状态压缩器 */
    this.compressor = new SnapshotCompressor();

    // ── 延迟补偿 ──
    /** @type {number} 服务器延迟估计（毫秒） */
    this.serverLatency = 0;
    /** @type {number[]} 延迟采样缓冲 */
    this.latencyBuffer = [];

    // ── 计时器 ──
    /** @type {number} 快照发送计时器 */
    this.snapshotTimer = 0;
    /** @type {number} Ping 计时器 */
    this.pingTimer = 0;
    /** @type {number} Ping 发送时间 */
    this.lastPingTime = 0;

    // ── 校验和缓存 ──
    /** @private @type {object|null} 上次哈希的状态引用 */
    this._lastChecksumState = null;
    /** @private @type {number} 缓存的校验和 */
    this._cachedChecksum = 0;

    // ── 断线重连 ──
    /** @private @type {boolean} 是否正在重连 */
    this._reconnecting = false;
    /** @private @type {number} 重连尝试次数 */
    this._reconnectAttempts = 0;
    /** @private @type {number} 最大重连次数 */
    this._reconnectMaxAttempts = 10;
    /** @private @type {number} 基础重连延迟 (ms) */
    this._reconnectBaseDelay = 1000;
    /** @private @type {number} 最大重连延迟 (ms) */
    this._reconnectMaxDelay = 30000;
    /** @private @type {number|null} 重连定时器 */
    this._reconnectTimer = null;

    // ── 统计 ──
    /** @type {number} 预测命中次数 */
    this.predictionHits = 0;
    /** @type {number} 预测错误次数 */
    this.predictionErrors = 0;
    /** @type {number} 回滚次数 */
    this.reconciliations = 0;

    // ── 事件回调 ──
    /** @type {Map<string, Set<Function>>} 事件回调 */
    this.listeners = new Map();

    // 注册 WebSocket 消息处理
    this._setupListeners();
    this._setupReconnection();
  }

  // ═══════════════════════════════════════════
  // 输入发送
  // ═══════════════════════════════════════════

  /**
   * 发送玩家输入到服务器
   * @param {object} inputData - 输入数据 { type, unitId, target, ... }
   * @returns {GameInput} 创建的输入对象
   */
  sendInput(inputData) {
    /** @type {GameInput} */
    const input = {
      seq: ++this.inputSeq,
      playerId: this.playerId,
      type: inputData.type,
      data: inputData,
      timestamp: Date.now(),
      frame: this.currentFrame + this.inputDelay,
    };

    // 添加到延迟缓冲区
    this.inputDelayBuffer.push(input);

    // 超过延迟帧数后发送
    if (this.inputDelayBuffer.length > this.inputDelay) {
      const readyInput = this.inputDelayBuffer.shift();
      this._sendInputToServer(readyInput);

      // 添加到待确认缓冲
      this.inputBuffer.push(readyInput);

      // 限制缓冲大小
      if (this.inputBuffer.length > SYNC_CONFIG.maxInputBuffer) {
        this.inputBuffer.shift();
      }
    }

    // 同时本地预测应用
    this._predictInput(input);

    return input;
  }

  /**
   * 发送输入到服务器
   * @private
   */
  _sendInputToServer(input) {
    if (this.wsClient && this.wsClient.isConnected()) {
      this.wsClient.send(SYNC_MSG.INPUT, input);
    }
  }

  /**
   * 本地预测应用输入
   * @private
   */
  _predictInput(input) {
    eventBus.emit('game:predict_input', {
      playerId: input.playerId,
      input: input.data,
      frame: input.frame,
    });
  }

  // ═══════════════════════════════════════════
  // 快照应用
  // ═══════════════════════════════════════════

  /**
   * 应用服务器发来的状态快照
   * @param {StateSnapshot|StateDiff} snapshotData - 快照数据
   */
  applySnapshot(snapshotData) {
    if (!snapshotData) return;

    let snapshot;

    // 判断是完整快照还是差分数据
    if (snapshotData.state !== undefined && snapshotData.diff === undefined) {
      // 完整快照
      snapshot = snapshotData;
      this.lastSnapshot = snapshot;
      this.frameSnapshots.set(snapshot.frame, snapshot);
    } else if (snapshotData.diff !== undefined) {
      // 差分数据 - 需要找到基准状态
      const baseSnapshot = this.frameSnapshots.get(snapshotData.baseFrame) || this.lastSnapshot;
      if (baseSnapshot) {
        snapshot = this.compressor.decompress(snapshotData, baseSnapshot);
        this.frameSnapshots.set(snapshot.frame, snapshot);
      } else {
        // 找不到基准状态，请求完整快照
        this.wsClient.send(SYNC_MSG.PING, { requestFull: true });
        return;
      }
    }

    // 更新帧号
    if (snapshot && snapshot.frame > this.lastConfirmedFrame) {
      this.lastConfirmedFrame = snapshot.frame;
    }

    // 调和本地状态
    this.reconcile(snapshot);
  }

  // ═══════════════════════════════════════════
  // 状态调和
  // ═══════════════════════════════════════════

  /**
   * 调和本地状态与服务器确认状态
   * @param {StateSnapshot} serverState - 服务器确认的状态
   */
  reconcile(serverState) {
    if (!serverState || !serverState.state) return;

    this.reconciliations++;

    // 清除已确认帧之前的输入缓冲
    this.inputBuffer = this.inputBuffer.filter(
      input => input.frame > serverState.frame
    );

    // 比较本地状态与服务器状态
    const error = this._computeStateError(serverState.state);

    if (error > SYNC_CONFIG.maxPredictionError) {
      // 预测错误过大，需要回滚
      this.predictionErrors++;

      // 应用服务器状态
      eventBus.emit('game:server_state', {
        state: serverState.state,
        frame: serverState.frame,
      });

      // 重新模拟已确认帧之后的输入
      const futureInputs = this.inputBuffer.filter(
        input => input.frame > serverState.frame
      );

      eventBus.emit('game:replay_inputs', {
        inputs: futureInputs,
        fromFrame: serverState.frame,
      });
    } else {
      this.predictionHits++;
    }

    // 清理过旧的快照缓存
    this._cleanupSnapshots();
  }

  // ═══════════════════════════════════════════
  // 延迟补偿
  // ═══════════════════════════════════════════

  /**
   * 获取估计的服务器延迟
   * @returns {number} 延迟（毫秒）
   */
  getLatency() {
    return this.serverLatency;
  }

  /**
   * 更新延迟估计
   * @private
   */
  _updateLatency(rtt) {
    this.serverLatency = rtt / 2;

    this.latencyBuffer.push(this.serverLatency);
    if (this.latencyBuffer.length > 20) {
      this.latencyBuffer.shift();
    }

    // 使用滑动平均
    this.serverLatency = this.latencyBuffer.reduce((a, b) => a + b, 0) / this.latencyBuffer.length;
  }

  /**
   * 获取基于延迟的输入帧补偿
   * @returns {number} 补偿帧数
   */
  getLatencyCompensation() {
    const avgTickRate = 24; // 24 ticks/sec
    return Math.round(this.serverLatency / 1000 * avgTickRate);
  }

  // ═══════════════════════════════════════════
  // 主更新循环
  // ═══════════════════════════════════════════

  /**
   * 同步管理器主更新（每帧调用）
   * @param {number} delta - 帧间隔（秒）
   */
  update(delta) {
    this.currentFrame++;
    this.snapshotTimer += delta;
    this.pingTimer += delta;

    // 发送快照到服务器（非主客户端模式）
    if (this.snapshotTimer >= this.snapshotInterval) {
      this.snapshotTimer = 0;
      this._sendSnapshot();
    }

    // 发送 ping（每 2 秒）
    if (this.pingTimer >= 2.0) {
      this.pingTimer = 0;
      this._sendPing();
    }
  }

  // ═══════════════════════════════════════════
  // 消息处理
  // ═══════════════════════════════════════════

  /**
   * 设置 WebSocket 消息监听
   * @private
   */
  _setupListeners() {
    // 服务器确认
    this.wsClient.on(SYNC_MSG.CONFIRM, (data) => {
      this._handleConfirm(data);
    });

    // 状态快照
    this.wsClient.on(SYNC_MSG.SNAPSHOT, (data) => {
      this.applySnapshot(data);
    });

    // 状态差分
    this.wsClient.on(SYNC_MSG.STATE_DIFF, (data) => {
      this.applySnapshot(data);
    });

    // 服务器调和请求
    this.wsClient.on(SYNC_MSG.RECONCILE, (data) => {
      if (data.state) {
        this.reconcile({ frame: data.frame, state: data.state });
      }
    });

    // Pong 响应
    this.wsClient.on(SYNC_MSG.PONG, (data) => {
      if (data && data.timestamp) {
        const rtt = Date.now() - data.timestamp;
        this._updateLatency(rtt);
      }
    });

    // 服务器推送完整状态 (重连后)
    this.wsClient.on(SYNC_MSG.SNAPSHOT, (data) => {
      if (data && data.state && this._reconnecting) {
        this._onReconnectSuccess();
      }
    });
  }

  /**
   * 处理服务器确认
   * @private
   */
  _handleConfirm(data) {
    if (!data) return;

    const { seq, frame, state } = data;

    // 从缓冲中移除已确认的输入
    this.inputBuffer = this.inputBuffer.filter(input => input.seq > seq);

    // 如果服务器返回了状态，进行调和
    if (state) {
      this.applySnapshot({ frame, state, timestamp: Date.now() });
    }
  }

  // ═══════════════════════════════════════════
  // 快照发送
  // ═══════════════════════════════════════════

  /**
   * 发送当前状态快照
   * @private
   */
  _sendSnapshot() {
    if (!this.wsClient || !this.wsClient.isConnected()) return;
    if (!this.gameState) return;

    const state = typeof this.gameState === 'function'
      ? this.gameState(this.playerId)
      : this.gameState;

    const snapshot = {
      frame: this.currentFrame,
      timestamp: Date.now(),
      state: this._extractSyncableState(state),
      checksum: this._computeChecksum(state),
    };

    // 压缩
    const compressed = this.compressor.compress(snapshot);

    this.wsClient.send(
      compressed.isDiff ? SYNC_MSG.STATE_DIFF : SYNC_MSG.SNAPSHOT,
      compressed.data
    );
  }

  /**
   * 发送 Ping
   * @private
   */
  _sendPing() {
    if (!this.wsClient || !this.wsClient.isConnected()) return;
    this.lastPingTime = Date.now();
    this.wsClient.send(SYNC_MSG.PING, { timestamp: this.lastPingTime });
  }

  // ═══════════════════════════════════════════
  // 断线重连
  // ═══════════════════════════════════════════

  /**
   * 设置 WebSocket 断线重连监听
   * @private
   */
  _setupReconnection() {
    if (!this.wsClient) return;

    this.wsClient.on('close', () => {
      this._scheduleReconnect();
    });

    this.wsClient.on('error', (_err) => {
      // error 后通常紧跟 close，由 close 处理重连
    });

    this.wsClient.on('open', () => {
      if (this._reconnecting) {
        this._onReconnectSuccess();
      }
    });
  }

  /**
   * 调度重连尝试 (指数退避)
   * @private
   */
  _scheduleReconnect() {
    if (this._reconnecting) return;
    if (this._reconnectAttempts >= this._reconnectMaxAttempts) {
      eventBus.emit('sync:reconnect_failed', {
        attempts: this._reconnectAttempts,
      });
      return;
    }

    this._reconnecting = true;
    const delay = Math.min(
      this._reconnectBaseDelay * Math.pow(2, this._reconnectAttempts),
      this._reconnectMaxDelay
    );
    this._reconnectAttempts++;

    eventBus.emit('sync:reconnecting', {
      attempt: this._reconnectAttempts,
      maxAttempts: this._reconnectMaxAttempts,
      delayMs: delay,
    });

    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null;
      this._attemptReconnect();
    }, delay);
  }

  /**
   * 执行重连
   * @private
   */
  _attemptReconnect() {
    if (!this.wsClient) return;
    try {
      if (typeof this.wsClient.connect === 'function') {
        this.wsClient.connect();
      } else if (typeof this.wsClient.reconnect === 'function') {
        this.wsClient.reconnect();
      }
    } catch (_e) {
      // 连接失败，close 事件会再次触发 _scheduleReconnect
    }
  }

  /**
   * 重连成功后处理
   * @private
   */
  _onReconnectSuccess() {
    this._reconnecting = false;
    this._reconnectAttempts = 0;
    this._cachedChecksum = 0;
    this._lastChecksumState = null;

    // 请求完整状态快照
    if (this.wsClient && this.wsClient.isConnected()) {
      this.wsClient.send(SYNC_MSG.REQUEST_STATE, {
        lastFrame: this.lastConfirmedFrame,
        playerId: this.playerId,
      });
    }

    eventBus.emit('sync:reconnected', {
      frame: this.lastConfirmedFrame,
    });
  }

  /**
   * 取消进行中的重连
   */
  cancelReconnect() {
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
    this._reconnecting = false;
    this._reconnectAttempts = 0;
  }

  // ═══════════════════════════════════════════
  // 辅助方法
  // ═══════════════════════════════════════════

  /**
   * 提取需要同步的状态字段
   * @private
   */
  _extractSyncableState(state) {
    if (!state) return {};

    return {
      units: (state.units || []).map(u => ({
        id: u.id,
        playerId: u.playerId,
        type: u.type,
        position: u.position,
        hp: u.hp,
        shield: u.shield,
        state: u.state,
        target: u.target,
      })),
      buildings: (state.buildings || []).map(b => ({
        id: b.id,
        playerId: b.playerId,
        type: b.type,
        position: b.position,
        hp: b.hp,
        progress: b.progress,
        isComplete: b.isComplete,
      })),
      resources: state.resources || {},
      gameTime: state.gameTime || 0,
    };
  }

  /**
   * 计算状态校验和
   * @private
   */
  _computeChecksum(state) {
    try {
      // FNV-1a 增量哈希 - 仅在状态变化时重新计算
      if (state === this._lastChecksumState) return this._cachedChecksum;
      this._lastChecksumState = state;

      const units = state.units || [];
      const buildings = state.buildings || [];
      const resources = state.resources || {};

      let hash = 0x811c9dc5; // FNV offset basis
      const FNV_PRIME = 0x01000193;

      // 哈希单位
      for (let i = 0; i < units.length; i++) {
        const u = units[i];
        hash ^= u.id;
        hash = Math.imul(hash, FNV_PRIME);
        hash ^= u.hp || 0;
        hash = Math.imul(hash, FNV_PRIME);
        const pos = u.position;
        if (pos) {
          hash ^= (pos.x * 1000 | 0);
          hash = Math.imul(hash, FNV_PRIME);
          hash ^= (pos.z * 1000 | 0);
          hash = Math.imul(hash, FNV_PRIME);
        }
      }
      // 哈希建筑
      for (let i = 0; i < buildings.length; i++) {
        const b = buildings[i];
        hash ^= b.id;
        hash = Math.imul(hash, FNV_PRIME);
        hash ^= b.hp || 0;
        hash = Math.imul(hash, FNV_PRIME);
      }
      // 哈希资源
      const resKeys = Object.keys(resources);
      for (let i = 0; i < resKeys.length; i++) {
        for (let j = 0; j < resKeys[i].length; j++) {
          hash ^= resKeys[i].charCodeAt(j);
          hash = Math.imul(hash, FNV_PRIME);
        }
        hash ^= resources[resKeys[i]] || 0;
        hash = Math.imul(hash, FNV_PRIME);
      }
      // 哈希游戏时间
      hash ^= (state.gameTime * 1000 | 0);
      hash = Math.imul(hash, FNV_PRIME);

      this._cachedChecksum = hash | 0;
      return this._cachedChecksum;
    } catch (_e) {
      return 0;
    }
  }

  /**
   * 计算本地状态与服务器状态的误差
   * @private
   */
  _computeStateError(serverState) {
    if (!this.gameState) return 0;

    const localState = typeof this.gameState === 'function'
      ? this.gameState(this.playerId)
      : this.gameState;

    if (!localState || !serverState) return 0;

    // 比较单位位置
    const localUnits = localState.units || [];
    const serverUnits = serverState.units || [];
    let totalError = 0;
    let count = 0;

    // 将 serverUnits 转为 Map 实现 O(n) 查找
    const serverUnitMap = new Map();
    for (let i = 0; i < serverUnits.length; i++) {
      serverUnitMap.set(serverUnits[i].id, serverUnits[i]);
    }

    for (const localUnit of localUnits) {
      const serverUnit = serverUnitMap.get(localUnit.id);
      if (serverUnit && localUnit.position && serverUnit.position) {
        const dx = (localUnit.position.x || 0) - (serverUnit.position.x || 0);
        const dz = (localUnit.position.z || 0) - (serverUnit.position.z || 0);
        totalError += Math.sqrt(dx * dx + dz * dz);
        count++;
      }
    }

    return count > 0 ? totalError / count : 0;
  }

  /**
   * 清理过旧的快照缓存
   * @private
   */
  _cleanupSnapshots() {
    const cutoffFrame = this.lastConfirmedFrame - 120; // 保留 5 秒
    const keysToDelete = [];
    for (const [frame] of this.frameSnapshots) {
      if (frame < cutoffFrame) {
        keysToDelete.push(frame);
      }
    }
    for (const frame of keysToDelete) {
      this.frameSnapshots.delete(frame);
    }
  }

  // ═══════════════════════════════════════════
  // 事件系统
  // ═══════════════════════════════════════════

  /**
   * 注册事件监听器
   * @param {string} event - 事件名
   * @param {Function} callback - 回调函数
   * @returns {Function} 取消监听函数
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  /**
   * 移除事件监听器
   * @param {string} event - 事件名
   * @param {Function} callback - 回调函数
   */
  off(event, callback) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  // ═══════════════════════════════════════════
  // 调试信息
  // ═══════════════════════════════════════════

  /**
   * 获取同步状态信息（调试用）
   * @returns {object}
   */
  getStats() {
    return {
      currentFrame: this.currentFrame,
      lastConfirmedFrame: this.lastConfirmedFrame,
      inputBuffer: this.inputBuffer.length,
      predictionHits: this.predictionHits,
      predictionErrors: this.predictionErrors,
      reconciliations: this.reconciliations,
      predictionAccuracy: this.predictionHits + this.predictionErrors > 0
        ? (this.predictionHits / (this.predictionHits + this.predictionErrors) * 100).toFixed(1) + '%'
        : 'N/A',
      serverLatency: Math.round(this.serverLatency) + 'ms',
      latencyCompensation: this.getLatencyCompensation() + ' frames',
      compressionRatio: this.compressor.compressedCount + '/' +
        (this.compressor.compressedCount + this.compressor.fullCount),
      reconnecting: this._reconnecting,
      reconnectAttempts: this._reconnectAttempts,
    };
  }

  /**
   * 销毁同步管理器
   */
  dispose() {
    this.cancelReconnect();
    this.inputBuffer = [];
    this.inputDelayBuffer = [];
    this.frameSnapshots.clear();
    this.latencyBuffer = [];
    this.listeners.clear();
    this._lastChecksumState = null;
    this._cachedChecksum = 0;
  }
}

export { SYNC_MSG, SYNC_CONFIG, SnapshotCompressor };
export default SyncManager;
