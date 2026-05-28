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
  /** ── 插值/外推配置 ── */
  /** 插值延迟（ms）— 渲染落后实时多少毫秒进行插值 */
  interpolationDelay: 100,
  /** 插值缓冲区最大快照数 */
  interpolationBufferSize: 30,
  /** 是否默认启用插值 */
  interpolationEnabled: true,
  /** 是否默认启用外推 */
  extrapolationEnabled: true,
  /** 最大外推时间（ms）— 超过此时间不再外推，防止误差过大 */
  maxExtrapolationTime: 500,
  /** 速度平滑系数（0-1），越大越灵敏 */
  velocitySmoothing: 0.3,
  /** ── 延迟补偿配置 ── */
  /** 是否启用延迟补偿 */
  delayCompensationEnabled: true,
  /** 状态历史缓冲大小（帧数） */
  stateHistorySize: 120,
  /** 最大回溯时间（ms） */
  maxLookbackTime: 500,
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
// ── 快速深拷贝（模块级工具函数，供插值/外推类共用） ──
function _fastClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    const arr = new Array(obj.length);
    for (let i = 0; i < obj.length; i++) arr[i] = _fastClone(obj[i]);
    return arr;
  }
  const keys = Object.keys(obj);
  const result = {};
  for (let i = 0; i < keys.length; i++) {
    result[keys[i]] = _fastClone(obj[keys[i]]);
  }
  return result;
}

// ═══════════════════════════════════════════
// 插值缓冲区
// ═══════════════════════════════════════════

/**
 * 插值缓冲区 - 存储远端快照并在渲染时进行线性插值
 *
 * 工作原理:
 * 1. 收到远端快照后放入环形缓冲区（按时间戳排序）
 * 2. 渲染时，取 renderTime - interpolationDelay 对应的两个相邻快照
 * 3. 在两者之间做线性插值（lerp），实现平滑过渡
 *
 * 渲染比实时落后 interpolationDelay 毫秒，以此换取位置平滑度
 *
 * @example
 * const buf = new InterpolationBuffer({ interpolationDelay: 100 });
 * buf.addSnapshot(snapshotA, timestampA);
 * buf.addSnapshot(snapshotB, timestampB);
 * const smoothState = buf.getInterpolatedState(Date.now());
 */
class InterpolationBuffer {
  /**
   * @param {object} config
   * @param {boolean} [config.interpolationEnabled=true]
   * @param {number}  [config.interpolationDelay=100]  延迟(ms)
   * @param {number}  [config.maxBufferSize=30]        缓冲大小
   */
  constructor(config = {}) {
    /** @type {boolean} 是否启用 */
    this.interpolationEnabled = config.interpolationEnabled !== false;
    /** @type {number} 插值延迟(ms) */
    this.interpolationDelay = config.interpolationDelay || SYNC_CONFIG.interpolationDelay;
    /** @type {number} 最大缓冲大小 */
    this.maxBufferSize = config.maxBufferSize || SYNC_CONFIG.interpolationBufferSize;
    /** @type {Array<{timestamp: number, snapshot: object}>} 缓冲区 */
    this.buffer = [];
  }

  /**
   * 添加快照到缓冲区
   * @param {object} snapshot - 服务器快照
   * @param {number} [timestamp] - 快照时间戳(ms)，默认 Date.now()
   */
  addSnapshot(snapshot, timestamp = Date.now()) {
    if (!this.interpolationEnabled || !snapshot) return;

    this.buffer.push({ timestamp, snapshot });

    // 按时间戳排序（保证顺序）
    if (this.buffer.length >= 2 &&
        this.buffer[this.buffer.length - 1].timestamp < this.buffer[this.buffer.length - 2].timestamp) {
      this.buffer.sort((a, b) => a.timestamp - b.timestamp);
    }

    // 裁剪超过最大大小
    while (this.buffer.length > this.maxBufferSize) {
      this.buffer.shift();
    }
  }

  /**
   * 获取插值后的游戏状态
   * @param {number} renderTime - 当前渲染时间戳(ms)
   * @returns {object|null} 插值后的快照状态
   */
  getInterpolatedState(renderTime) {
    if (!this.interpolationEnabled || this.buffer.length === 0) return null;

    // 只有一个快照时直接返回
    if (this.buffer.length === 1) return this.buffer[0].snapshot;

    const targetTime = renderTime - this.interpolationDelay;
    const bracket = this._findBracketingSnapshots(targetTime);

    if (!bracket) {
      // 目标时间超出缓冲范围，返回最近的快照
      return this.buffer[this.buffer.length - 1].snapshot;
    }

    const { before, after } = bracket;
    const dt = after.timestamp - before.timestamp;
    if (dt <= 0) return after.snapshot;

    // alpha: 0 = 完全在 before，1 = 完全在 after
    const alpha = Math.max(0, Math.min(1, (targetTime - before.timestamp) / dt));
    return this._interpolateSnapshots(before.snapshot, after.snapshot, alpha);
  }

  /**
   * 查找包围目标时间的两个快照
   * @private
   * @param {number} targetTime
   * @returns {{before: object, after: object}|null}
   */
  _findBracketingSnapshots(targetTime) {
    let before = null;
    let afterIdx = -1;

    for (let i = 0; i < this.buffer.length; i++) {
      if (this.buffer[i].timestamp <= targetTime) {
        before = this.buffer[i];
      } else if (afterIdx === -1) {
        afterIdx = i;
      }
    }

    if (before && afterIdx !== -1) {
      return { before, after: this.buffer[afterIdx] };
    }

    // 目标时间在所有快照之前 → 用最早的两个
    if (afterIdx !== -1 && afterIdx >= 1) {
      return { before: this.buffer[afterIdx - 1], after: this.buffer[afterIdx] };
    }

    return null;
  }

  /**
   * 线性插值两个快照
   * @private
   */
  _interpolateSnapshots(snapA, snapB, alpha) {
    if (!snapA || !snapA.state) return snapB;
    if (!snapB || !snapB.state) return snapA;

    const result = _fastClone(snapA);

    // 插值单位位置和属性
    const unitsA = snapA.state.units || [];
    const unitsBMap = new Map();
    for (const u of (snapB.state.units || [])) {
      unitsBMap.set(u.id, u);
    }

    const resultUnits = result.state.units || [];
    for (let i = 0; i < resultUnits.length; i++) {
      const uA = resultUnits[i];
      const uB = unitsBMap.get(uA.id);
      if (!uB) continue;

      // 插值位置
      if (uA.position && uB.position) {
        resultUnits[i] = {
          ...uA,
          position: {
            x: uA.position.x + (uB.position.x - uA.position.x) * alpha,
            z: uA.position.z + (uB.position.z - uA.position.z) * alpha,
          },
        };
      }
      // 插值血量/护盾（可选，使过渡更平滑）
      if (uA.hp !== undefined && uB.hp !== undefined) {
        resultUnits[i] = resultUnits[i] || { ...uA };
        resultUnits[i].hp = uA.hp + (uB.hp - uA.hp) * alpha;
      }
      if (uA.shield !== undefined && uB.shield !== undefined) {
        resultUnits[i] = resultUnits[i] || { ...uA };
        resultUnits[i].shield = uA.shield + (uB.shield - uA.shield) * alpha;
      }
    }

    return result;
  }

  /**
   * 清空缓冲区
   */
  clear() {
    this.buffer.length = 0;
  }

  /**
   * 获取缓冲区信息
   * @returns {object}
   */
  getDebugInfo() {
    return {
      enabled: this.interpolationEnabled,
      delay: this.interpolationDelay,
      bufferSize: this.buffer.length,
      maxBufferSize: this.maxBufferSize,
    };
  }
}

// ═══════════════════════════════════════════
// 外推引擎
// ═══════════════════════════════════════════

/**
 * 外推引擎 - 在快照间隔期间根据速度和方向预测单位位置
 *
 * 工作原理:
 * 1. 维护最近两次快照，计算每个单位的速度向量 (vx, vz)
 * 2. 渲染时，用 lastSnapshot + velocity × dt 预测当前位置
 * 3. 速度带平滑（EMA），防止抖动
 * 4. 外推时间有上限，超过后停止外推并回退到最近快照位置
 *
 * 适用场景: 延迟较低但快照间隔较长，或插值缓冲尚未填满时
 *
 * @example
 * const engine = new ExtrapolationEngine({ maxExtrapolationTime: 300 });
 * engine.updateSnapshot(snapshotA, timestampA);
 * engine.updateSnapshot(snapshotB, timestampB);
 * const predicted = engine.getExtrapolatedState(Date.now());
 */
class ExtrapolationEngine {
  /**
   * @param {object} config
   * @param {boolean} [config.extrapolationEnabled=true]
   * @param {number}  [config.maxExtrapolationTime=500]  最大外推时间(ms)
   * @param {number}  [config.velocitySmoothing=0.3]     速度EMA平滑系数(0-1)
   */
  constructor(config = {}) {
    /** @type {boolean} 是否启用 */
    this.enabled = config.extrapolationEnabled !== false;
    /** @type {number} 最大外推时间(ms) */
    this.maxExtrapolationTime = config.maxExtrapolationTime || SYNC_CONFIG.maxExtrapolationTime;
    /** @type {number} 速度平滑系数 */
    this.velocitySmoothing = config.velocitySmoothing || SYNC_CONFIG.velocitySmoothing;

    /** @type {{snapshot: object, timestamp: number}|null} 前一快照 */
    this.previousSnapshot = null;
    /** @type {{snapshot: object, timestamp: number}|null} 当前快照 */
    this.currentSnapshot = null;
    /** @type {Map<number, {vx: number, vz: number, timestamp: number}>} 单位速度缓存 */
    this.velocityCache = new Map();
  }

  /**
   * 更新快照（每次收到新快照时调用）
   * @param {object} snapshot - 服务器快照
   * @param {number} [timestamp] - 时间戳(ms)
   */
  updateSnapshot(snapshot, timestamp = Date.now()) {
    if (!snapshot) return;

    this.previousSnapshot = this.currentSnapshot;
    this.currentSnapshot = { snapshot, timestamp };

    // 有前后两个快照时更新速度
    if (this.previousSnapshot) {
      this._updateVelocities(this.previousSnapshot, this.currentSnapshot);
    }
  }

  /**
   * 获取外推后的游戏状态
   * @param {number} renderTime - 当前渲染时间戳(ms)
   * @returns {object|null} 外推后的快照状态
   */
  getExtrapolatedState(renderTime) {
    if (!this.enabled || !this.currentSnapshot) return null;

    const dtSeconds = (renderTime - this.currentSnapshot.timestamp) / 1000;

    // 如果 renderTime 比快照时间还早，直接返回快照
    if (dtSeconds <= 0) return this.currentSnapshot.snapshot;

    // 裁剪外推时间
    const maxDt = this.maxExtrapolationTime / 1000;
    const clampedDt = Math.min(dtSeconds, maxDt);

    const snapshot = this.currentSnapshot.snapshot;
    if (!snapshot || !snapshot.state) return snapshot;

    // 计算衰减因子：外推时间越长，信心越低，速度越衰减
    const decay = 1 - (clampedDt / maxDt) * 0.5; // 50% 衰减在最大时间点

    const result = _fastClone(snapshot);
    const resultUnits = result.state.units || [];

    for (let i = 0; i < resultUnits.length; i++) {
      const u = resultUnits[i];
      const vel = this.velocityCache.get(u.id);
      if (vel && u.position) {
        resultUnits[i] = {
          ...u,
          position: {
            x: u.position.x + vel.vx * clampedDt * decay,
            z: u.position.z + vel.vz * clampedDt * decay,
          },
        };
      }
    }

    return result;
  }

  /**
   * 基于前后快照更新所有单位的速度
   * @private
   */
  _updateVelocities(prev, curr) {
    const dt = (curr.timestamp - prev.timestamp) / 1000;
    if (dt <= 0) return;

    // 建立前一帧单位映射
    const prevUnitsMap = new Map();
    for (const u of (prev.snapshot.state?.units || [])) {
      prevUnitsMap.set(u.id, u);
    }

    // 更新每个单位的速度
    for (const u of (curr.snapshot.state?.units || [])) {
      const prevU = prevUnitsMap.get(u.id);
      if (!prevU || !prevU.position || !u.position) continue;

      const rawVx = (u.position.x - prevU.position.x) / dt;
      const rawVz = (u.position.z - prevU.position.z) / dt;

      const cached = this.velocityCache.get(u.id);
      if (cached) {
        // 指数移动平均平滑
        const s = this.velocitySmoothing;
        cached.vx = cached.vx + (rawVx - cached.vx) * s;
        cached.vz = cached.vz + (rawVz - cached.vz) * s;
        cached.timestamp = curr.timestamp;
      } else {
        this.velocityCache.set(u.id, {
          vx: rawVx,
          vz: rawVz,
          timestamp: curr.timestamp,
        });
      }
    }

    // 清理不再存在的单位速度缓存
    const currIds = new Set();
    for (const u of (curr.snapshot.state?.units || [])) {
      currIds.add(u.id);
    }
    for (const [id] of this.velocityCache) {
      if (!currIds.has(id)) {
        this.velocityCache.delete(id);
      }
    }
  }

  /**
   * 清空状态
   */
  clear() {
    this.previousSnapshot = null;
    this.currentSnapshot = null;
    this.velocityCache.clear();
  }

  /**
   * 获取调试信息
   * @returns {object}
   */
  getDebugInfo() {
    return {
      enabled: this.enabled,
      maxExtrapolationTime: this.maxExtrapolationTime,
      velocitySmoothing: this.velocitySmoothing,
      cachedUnitCount: this.velocityCache.size,
      hasSnapshot: !!this.currentSnapshot,
    };
  }
}

// ═══════════════════════════════════════════
// 延迟补偿
// ═══════════════════════════════════════════

/**
 * 延迟补偿器 - 保存历史状态，支持回溯到任意时间点
 *
 * 典型用途:
 * - 玩家 A 在 t0 发起攻击，但因为网络延迟，服务器在 t0+latency 才收到
 * - 此时目标可能已经移动了 latency 的距离
 * - 延迟补偿器回溯到 t0 时的状态，用那时的位置做命中判定
 *
 * @example
 * const dc = new DelayCompensation({ maxLookbackTime: 500 });
 * dc.addState(snapshot, Date.now());
 * // 500ms 后仍可查询 500ms 前的状态
 * const pastState = dc.getCompensatedState(500); // 回溯 500ms
 */
class DelayCompensation {
  /**
   * @param {object} config
   * @param {boolean} [config.delayCompensationEnabled=true]
   * @param {number}  [config.stateHistorySize=120]      历史缓冲大小
   * @param {number}  [config.maxLookbackTime=500]       最大回溯时间(ms)
   */
  constructor(config = {}) {
    /** @type {boolean} 是否启用 */
    this.enabled = config.delayCompensationEnabled !== false;
    /** @type {number} 最大缓冲大小 */
    this.maxBufferSize = config.stateHistorySize || SYNC_CONFIG.stateHistorySize;
    /** @type {number} 最大回溯时间(ms) */
    this.maxLookbackTime = config.maxLookbackTime || SYNC_CONFIG.maxLookbackTime;

    /** @type {Array<{timestamp: number, state: object}>} 历史状态缓冲 */
    this.stateHistory = [];
  }

  /**
   * 记录当前状态
   * @param {object} state - 游戏状态
   * @param {number} [timestamp] - 时间戳(ms)
   */
  addState(state, timestamp = Date.now()) {
    if (!this.enabled || !state) return;

    this.stateHistory.push({
      timestamp,
      state: _fastClone(state),
    });

    // 裁剪超过最大大小
    while (this.stateHistory.length > this.maxBufferSize) {
      this.stateHistory.shift();
    }
  }

  /**
   * 获取指定时间点的状态（通过插值回溯）
   * @param {number} targetTime - 目标时间戳(ms)
   * @returns {object|null} 回溯到的状态
   */
  getStateAtTime(targetTime) {
    if (!this.enabled || this.stateHistory.length === 0) return null;

    // 检查是否超出最大回溯范围
    const oldestTime = this.stateHistory[0].timestamp;
    if (targetTime < oldestTime) {
      // 超出回溯范围，返回最早的状态
      return this.stateHistory[0].state;
    }

    // 查找包围目标时间的两个状态
    let before = null;
    let afterIdx = -1;
    for (let i = 0; i < this.stateHistory.length; i++) {
      if (this.stateHistory[i].timestamp <= targetTime) {
        before = this.stateHistory[i];
      } else if (afterIdx === -1) {
        afterIdx = i;
      }
    }

    // 没有找到前后状态
    if (before === null && afterIdx === -1) return null;
    if (before === null) return this.stateHistory[afterIdx].state;
    if (afterIdx === -1) return before.state;

    const after = this.stateHistory[afterIdx];
    if (before === after) return before.state;

    const dt = after.timestamp - before.timestamp;
    if (dt <= 0) return after.state;

    const alpha = Math.max(0, Math.min(1, (targetTime - before.timestamp) / dt));
    return this._interpolateState(before.state, after.state, alpha);
  }

  /**
   * 获取延迟补偿状态 —— 回溯 playerLatency 毫秒
   * @param {number} playerLatency - 玩家延迟(ms)
   * @returns {object|null}
   */
  getCompensatedState(playerLatency) {
    const lookback = Math.min(playerLatency, this.maxLookbackTime);
    const targetTime = Date.now() - lookback;
    return this.getStateAtTime(targetTime);
  }

  /**
   * 线性插值两个状态
   * @private
   */
  _interpolateState(stateA, stateB, alpha) {
    if (!stateA) return stateB;
    if (!stateB) return stateA;

    const result = _fastClone(stateA);

    // 插值单位
    const unitsBMap = new Map();
    for (const u of (stateB.units || [])) {
      unitsBMap.set(u.id, u);
    }

    if (result.units) {
      for (let i = 0; i < result.units.length; i++) {
        const uA = result.units[i];
        const uB = unitsBMap.get(uA.id);
        if (!uB) continue;

        if (uA.position && uB.position) {
          result.units[i] = {
            ...uA,
            position: {
              x: uA.position.x + (uB.position.x - uA.position.x) * alpha,
              z: uA.position.z + (uB.position.z - uA.position.z) * alpha,
            },
          };
        }
        if (uA.hp !== undefined && uB.hp !== undefined) {
          result.units[i] = result.units[i] || { ...uA };
          result.units[i].hp = uA.hp + (uB.hp - uA.hp) * alpha;
        }
        if (uA.shield !== undefined && uB.shield !== undefined) {
          result.units[i] = result.units[i] || { ...uA };
          result.units[i].shield = uA.shield + (uB.shield - uA.shield) * alpha;
        }
      }
    }

    // 插值资源（简单数值插值）
    if (stateA.resources && stateB.resources) {
      const resA = stateA.resources;
      const resB = stateB.resources;
      const resKeys = new Set([...Object.keys(resA), ...Object.keys(resB)]);
      const res = {};
      for (const k of resKeys) {
        if (typeof resA[k] === 'number' && typeof resB[k] === 'number') {
          res[k] = resA[k] + (resB[k] - resA[k]) * alpha;
        } else {
          res[k] = resB[k] !== undefined ? resB[k] : resA[k];
        }
      }
      result.resources = res;
    }

    return result;
  }

  /**
   * 清空历史
   */
  clear() {
    this.stateHistory.length = 0;
  }

  /**
   * 获取调试信息
   * @returns {object}
   */
  getDebugInfo() {
    const now = Date.now();
    return {
      enabled: this.enabled,
      historySize: this.stateHistory.length,
      maxBufferSize: this.maxBufferSize,
      maxLookbackTime: this.maxLookbackTime,
      oldestEntry: this.stateHistory.length > 0
        ? now - this.stateHistory[0].timestamp + 'ms ago'
        : 'N/A',
    };
  }
}


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
    /** @type {Map<string, Set<Function>>} 事件回调 */
    this.listeners = new Map();
    // ── 插值/外推组件 ──
    /** @type {InterpolationBuffer} 远端单位插值缓冲区 */
    this.interpolationBuffer = new InterpolationBuffer({
      interpolationEnabled: options.interpolationEnabled !== false,
      interpolationDelay: options.interpolationDelay || SYNC_CONFIG.interpolationDelay,
      maxBufferSize: options.interpolationBufferSize || SYNC_CONFIG.interpolationBufferSize,
    });

    /** @type {ExtrapolationEngine} 远端单位外推引擎 */
    this.extrapolationEngine = new ExtrapolationEngine({
      extrapolationEnabled: options.extrapolationEnabled !== false,
      maxExtrapolationTime: options.maxExtrapolationTime || SYNC_CONFIG.maxExtrapolationTime,
      velocitySmoothing: options.velocitySmoothing || SYNC_CONFIG.velocitySmoothing,
    });

    /** @type {DelayCompensation} 延迟补偿器 */
    this.delayCompensation = new DelayCompensation({
      delayCompensationEnabled: options.delayCompensationEnabled !== false,
      stateHistorySize: options.stateHistorySize || SYNC_CONFIG.stateHistorySize,
      maxLookbackTime: options.maxLookbackTime || SYNC_CONFIG.maxLookbackTime,
    });

    // ── 延迟适应计时器 ──
    /** @private @type {number} 延迟自适应检查间隔累计 */
    this._latencyAdaptTimer = 0;
    /** @private @type {number} 上次自适应的延迟值(ms) */
    this._lastAdaptedLatency = -1;

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
    // ── 缓冲快照用于插值、外推和延迟补偿 ──
    if (snapshot) {
      const snapshotTimestamp = snapshot.timestamp || Date.now();
      this.interpolationBuffer.addSnapshot(snapshot, snapshotTimestamp);
      this.extrapolationEngine.updateSnapshot(snapshot, snapshotTimestamp);
      this.delayCompensation.addState(snapshot.state, snapshotTimestamp);
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

    // ── 更新插值/外推状态 ──
    this._updateInterpolation(delta);
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
  // 插值/外推/延迟补偿
  // ═══════════════════════════════════════════

  /**
   * 获取当前插值/外推后的游戏状态（用于渲染）
   *
   * 渲染循环应调用此方法而非直接读 gameState：
   * - 远端单位位置会经过插值平滑，消除位置跳变
   * - 如果插值缓冲不足，自动回退到外推预测
   * - 本地玩家单位不受影响，仍使用客户端预测
   *
   * @param {number} [renderTime] - 渲染时间戳(ms)，默认 Date.now()
   * @returns {object|null} 平滑后的游戏状态
   */
  getInterpolatedState(renderTime) {
    const now = renderTime || Date.now();

    // 优先使用插值（最平滑）
    const interpolated = this.interpolationBuffer.getInterpolatedState(now);
    if (interpolated) return interpolated;

    // 插值不可用时回退到外推（有延迟补偿效果）
    return this.extrapolationEngine.getExtrapolatedState(now);
  }

  /**
   * 获取延迟补偿后的游戏状态（用于命中判定）
   *
   * 当玩家 A 发起攻击时，因为网络延迟，服务器收到命令时目标可能已移动。
   * 此方法回溯到攻击命令发出时的历史状态，用那时的位置做判定。
   *
   * @param {number} [playerLatency] - 玩家延迟(ms)，默认使用本地估计值
   * @returns {object|null} 回溯到的历史状态
   */
  getCompensatedState(playerLatency) {
    const latency = playerLatency !== undefined ? playerLatency : this.serverLatency;
    return this.delayCompensation.getCompensatedState(latency);
  }

  /**
   * 获取指定时间点的历史状态
   * @param {number} timestamp - 目标时间戳(ms)
   * @returns {object|null} 该时间点的游戏状态
   */
  getStateAtTime(timestamp) {
    return this.delayCompensation.getStateAtTime(timestamp);
  }

  /**
   * 动态配置网络同步参数
   *
   * 可在运行时调用以适应网络条件变化，例如：
   * - 检测到延迟升高时增大插值延迟
   * - 检测到丢包时增大外推时间上限
   *
   * @param {object} config - 配置参数（只传需要修改的字段）
   * @param {boolean} [config.interpolationEnabled] - 启用/禁用插值
   * @param {number}  [config.interpolationDelay] - 插值延迟(ms)
   * @param {number}  [config.interpolationBufferSize] - 插值缓冲区大小
   * @param {boolean} [config.extrapolationEnabled] - 启用/禁用外推
   * @param {number}  [config.maxExtrapolationTime] - 最大外推时间(ms)
   * @param {number}  [config.velocitySmoothing] - 速度平滑系数(0-1)
   * @param {boolean} [config.delayCompensationEnabled] - 启用/禁用延迟补偿
   * @param {number}  [config.stateHistorySize] - 状态历史缓冲大小
   * @param {number}  [config.maxLookbackTime] - 最大回溯时间(ms)
   */
  configureNetworkConditions(config) {
    if (!config) return;

    // 插值配置
    if (config.interpolationEnabled !== undefined) {
      this.interpolationBuffer.interpolationEnabled = config.interpolationEnabled;
    }
    if (config.interpolationDelay !== undefined) {
      this.interpolationBuffer.interpolationDelay = config.interpolationDelay;
    }
    if (config.interpolationBufferSize !== undefined) {
      this.interpolationBuffer.maxBufferSize = config.interpolationBufferSize;
    }

    // 外推配置
    if (config.extrapolationEnabled !== undefined) {
      this.extrapolationEngine.enabled = config.extrapolationEnabled;
    }
    if (config.maxExtrapolationTime !== undefined) {
      this.extrapolationEngine.maxExtrapolationTime = config.maxExtrapolationTime;
    }
    if (config.velocitySmoothing !== undefined) {
      this.extrapolationEngine.velocitySmoothing = config.velocitySmoothing;
    }

    // 延迟补偿配置
    if (config.delayCompensationEnabled !== undefined) {
      this.delayCompensation.enabled = config.delayCompensationEnabled;
    }
    if (config.stateHistorySize !== undefined) {
      this.delayCompensation.maxBufferSize = config.stateHistorySize;
    }
    if (config.maxLookbackTime !== undefined) {
      this.delayCompensation.maxLookbackTime = config.maxLookbackTime;
    }

    eventBus.emit('sync:config_changed', config);
  }

  /**
   * 根据当前网络延迟自动调整插值/外推参数
   *
   * 预设策略:
   * - <50ms:  低延迟 → 小插值延迟，禁用外推
   * - 50-150: 中延迟 → 适度插值，轻度外推
   * - 150-300: 高延迟 → 大插值延迟，中度外推
   * - >300:   极高延迟 → 最大插值延迟，最大外推
   *
   * 由 _updateInterpolation 自动调用（每秒一次），也可手动触发
   *
   * @param {number} latency - 当前延迟(ms)
   */
  adaptToLatency(latency) {
    if (latency < 50) {
      // 低延迟: 减少插值延迟，禁用外推
      this.configureNetworkConditions({
        interpolationDelay: 50,
        extrapolationEnabled: false,
      });
    } else if (latency < 150) {
      // 中等延迟: 适度插值
      this.configureNetworkConditions({
        interpolationDelay: 100,
        extrapolationEnabled: true,
        maxExtrapolationTime: 200,
      });
    } else if (latency < 300) {
      // 高延迟: 增加插值延迟
      this.configureNetworkConditions({
        interpolationDelay: 200,
        extrapolationEnabled: true,
        maxExtrapolationTime: 400,
      });
    } else {
      // 非常高延迟: 最大插值
      this.configureNetworkConditions({
        interpolationDelay: 300,
        extrapolationEnabled: true,
        maxExtrapolationTime: 500,
      });
    }
  }

  /**
   * 获取所有网络同步组件的调试信息
   * @returns {object}
   */
  getNetworkSyncInfo() {
    return {
      interpolation: this.interpolationBuffer.getDebugInfo(),
      extrapolation: this.extrapolationEngine.getDebugInfo(),
      delayCompensation: this.delayCompensation.getDebugInfo(),
    };
  }

  /**
   * 更新插值/外推状态（每帧由 update 调用）
   * @private
   * @param {number} delta - 帧间隔（秒）
   */
  _updateInterpolation(delta) {
    // 根据延迟自适应调整参数（每秒检查一次）
    if (this.serverLatency > 0) {
      this._latencyAdaptTimer += delta;
      if (this._latencyAdaptTimer >= 1.0) {
        this._latencyAdaptTimer = 0;
        // 只在延迟变化超过 20% 时才重新适应，避免频繁切换
        const latencyDiff = Math.abs(this.serverLatency - this._lastAdaptedLatency);
        if (this._lastAdaptedLatency < 0 || latencyDiff > this._lastAdaptedLatency * 0.2) {
          this.adaptToLatency(this.serverLatency);
          this._lastAdaptedLatency = this.serverLatency;
        }
      }
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
      // ── 插值/外推/延迟补偿信息 ──
      interpolation: this.interpolationBuffer.getDebugInfo(),
      extrapolation: this.extrapolationEngine.getDebugInfo(),
      delayCompensation: this.delayCompensation.getDebugInfo(),
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
    // ── 清理插值/外推/延迟补偿组件 ──
    this.interpolationBuffer.clear();
    this.extrapolationEngine.clear();
    this.delayCompensation.clear();
  }
}

export { SYNC_MSG, SYNC_CONFIG, SnapshotCompressor, InterpolationBuffer, ExtrapolationEngine, DelayCompensation };
export default SyncManager;
