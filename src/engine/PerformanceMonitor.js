// ═══════════════════════════════════════════════════════════════
// StarCraft Web - 性能监控系统
// FPS 计算（滑动窗口）、Draw calls 跟踪、内存监控、GPU 时间
// ═══════════════════════════════════════════════════════════════

/**
 * 性能监控系统
 * 跟踪 FPS、draw calls、内存使用、GPU 时间，
 * 并在性能低于阈值时触发警告回调。
 */
export class PerformanceMonitor {
  /**
   * @param {object} renderer - Three.js WebGLRenderer 或 Renderer 封装类
   */
  constructor(renderer) {
    /** @type {object} 渲染器引用 */
    this._renderer = renderer;

    // ─── FPS 计算 ───
    /** 滑动窗口最大容量 */
    this._maxSamples = 60;

    /**
     * 环形缓冲区（替代数组 shift 操作，O(1) 写入）
     * @type {Float64Array}
     */
    this._ringBuffer = new Float64Array(this._maxSamples);

    /** 环形缓冲写入指针 */
    this._ringHead = 0;

    /** 环形缓冲有效数据量 */
    this._ringCount = 0;

    /** 上一帧时间戳 */
    this._lastTime = 0;

    /** 当前 FPS（滑动窗口平均） */
    this._fps = 0;

    // ─── Draw calls ───
    /** 当前帧 draw calls */
    this._drawCalls = 0;

    /** 历史 draw calls（滑动窗口平均） */
    this._avgDrawCalls = 0;

    // ─── 内存监控 ───
    /**
     * 内存使用快照
     * @type {{ usedJSHeapSize: number, totalJSHeapSize: number, jsHeapSizeLimit: number } | null}
     */
    this._memory = null;

    // ─── GPU 时间 ───
    /** @type {WebGLQuery|null} GPU 时间查询对象 */
    this._gpuTimeQuery = null;

    /** GPU 时间扩展 */
    this._gpuExt = null;

    /** GPU 帧时间（毫秒） */
    this._gpuTime = 0;

    /** GPU 查询是否可用 */
    this._gpuQuerySupported = false;

    // ─── 警告阈值 ───
    /**
     * 性能警告阈值
     * @type {{ fps: number, drawCalls: number, memoryMB: number }}
     */
    this.thresholds = {
      fps: 30,
      drawCalls: 1000,
      memoryMB: 512,
    };

    /** 警告回调函数列表 */
    this._warningCallbacks = [];

    // ─── 帧统计 ───
    /** 总帧数 */
    this._totalFrames = 0;

    /** 上次报告时间 */
    this._reportTime = 0;

    // ─── 自动降级机制 ───
    /**
     * 连续低帧率检测状态
     * 追踪 FPS 持续低于阈值的时长，超过阈值持续时间后自动降低画质
     */
    this._autoDowngrade = {
      /** 是否启用自动降级 */
      enabled: false,
      /** 降级回调 (newQualityLevel) => void */
      callback: null,
      /** 连续低 FPS 的起始时间（毫秒），0 表示未处于低 FPS 状态 */
      lowFpsStartTime: 0,
      /** 触发降级所需的持续低 FPS 时间（毫秒），默认 5000ms (5秒) */
      downgradeThresholdMs: 5000,
      /** 降级冷却期（毫秒），避免频繁降级/升级循环 */
      cooldownMs: 10000,
      /** 上次降级的时间戳 */
      lastDowngradeTime: 0,
      /** 当前画质等级（外部同步设置） */
      currentQualityLevel: -1,
      /** 降级回调列表 (qualityLevel) => void */
      onDowngrade: [],
    };

    // ─── 初始化 ───
    this._initGPUTimer();
  }

  /**
   * 初始化 GPU 计时查询
   * @private
   */
  _initGPUTimer() {
    try {
      const gl = this._getGLContext();
      if (gl) {
        this._gpuExt = gl.getExtension('EXT_disjoint_timer_query_webgl2') ||
          gl.getExtension('EXT_disjoint_timer_query');
        this._gpuQuerySupported = !!this._gpuExt;
      }
    } catch (_e) {
      this._gpuQuerySupported = false;
    }
  }

  /**
   * 获取 WebGL 渲染上下文
   * @returns {WebGLRenderingContext | WebGL2RenderingContext | null}
   * @private
   */
  _getGLContext() {
    // 如果 renderer 是 Renderer 封装类
    if (this._renderer && typeof this._renderer.getRenderer === 'function') {
      return this._renderer.getRenderer().getContext();
    }
    // 如果 renderer 是原生 WebGLRenderer
    if (this._renderer && typeof this._renderer.getContext === 'function') {
      return this._renderer.getContext();
    }
    return null;
  }

  /**
   * 开始一帧的性能计时
   * 应在帧开始时调用
   */
  startFrame() {
    // 记录帧开始时间
    this._frameStartTime = performance.now();

    // 启动 GPU 时间查询
    if (this._gpuQuerySupported && this._gpuExt) {
      try {
        const gl = this._getGLContext();
        if (gl) {
          this._gpuTimeQuery = this._gpuExt.createQueryEXT();
          this._gpuExt.beginQueryEXT(this._gpuExt.TIME_ELAPSED_EXT, this._gpuTimeQuery);
        }
      } catch (_e) {
        this._gpuTimeQuery = null;
      }
    }
  }

  /**
   * 结束一帧的性能计时并收集数据
   * 应在帧渲染完成后调用
   */
  endFrame() {
    const now = performance.now();
    const frameTime = now - this._frameStartTime;

    // ─── 更新帧时间窗口（环形缓冲 O(1)） ───
    this._ringBuffer[this._ringHead] = frameTime;
    this._ringHead = (this._ringHead + 1) % this._maxSamples;
    if (this._ringCount < this._maxSamples) this._ringCount++;

    // ─── 计算 FPS ───
    if (this._ringCount > 0) {
      let sum = 0;
      for (let i = 0; i < this._ringCount; i++) {
        sum += this._ringBuffer[i];
      }
      const avgFrameTime = sum / this._ringCount;
      this._fps = avgFrameTime > 0 ? 1000 / avgFrameTime : 0;
    }

    // ─── Draw calls ───
    const threeRenderer = this._getThreeRenderer();
    if (threeRenderer && threeRenderer.info) {
      this._drawCalls = threeRenderer.info.render.calls || 0;
    }

    // ─── 内存监控 ───
    this._updateMemory();

    // ─── GPU 时间 ───
    this._updateGPUTime();

    // ─── 帧计数 ───
    this._totalFrames++;

    // ─── 检查警告 ───
    this._checkWarnings();

    // 更新时间戳
    this._lastTime = now;
  }

  /**
   * 获取底层 Three.js WebGLRenderer
   * @returns {object | null}
   * @private
   */
  _getThreeRenderer() {
    if (this._renderer && typeof this._renderer.getRenderer === 'function') {
      return this._renderer.getRenderer();
    }
    return this._renderer;
  }

  /**
   * 更新内存使用数据
   * @private
   */
  _updateMemory() {
    // performance.memory 仅在部分浏览器中可用（Chrome/Edge）
    if (typeof performance !== 'undefined' && performance.memory) {
      this._memory = {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
      };
    } else {
      this._memory = null;
    }
  }

  /**
   * 读取 GPU 时间查询结果
   * @private
   */
  _updateGPUTime() {
    if (!this._gpuQuerySupported || !this._gpuExt || !this._gpuTimeQuery) return;

    try {
      const gl = this._getGLContext();
      if (!gl) return;

      // 检查查询是否完成
      const available = this._gpuExt.getParameterEXT(
        this._gpuExt.GPU_DISJOINT_EXT
      );

      if (!available) {
        const available2 = gl.getQueryParameterEXT(
          this._gpuTimeQuery,
          gl.QUERY_RESULT_AVAILABLE_EXT
        );
        if (available2) {
          const nanoseconds = this._gpuExt.getQueryObjectEXT(
            this._gpuTimeQuery,
            this._gpuExt.QUERY_RESULT_EXT
          );
          this._gpuTime = nanoseconds / 1000000; // 纳秒 → 毫秒
          this._gpuTimeQuery = null;
        }
      }
    } catch (_e) {
      this._gpuTime = 0;
    }
  }

  /**
   * 检查是否低于性能阈值，触发警告回调
   * @private
   */
  _checkWarnings() {
    const stats = this.getStats();

    if (stats.fps > 0 && stats.fps < this.thresholds.fps) {
      this._emitWarning('fps', stats.fps, this.thresholds.fps);
    }

    if (stats.drawCalls > this.thresholds.drawCalls) {
      this._emitWarning('drawCalls', stats.drawCalls, this.thresholds.drawCalls);
    }

    if (stats.memoryMB > this.thresholds.memoryMB) {
      this._emitWarning('memoryMB', stats.memoryMB, this.thresholds.memoryMB);
    }

    // ─── 自动降级检测 ───
    this._checkAutoDowngrade(stats);
  }

  /**
   * 检查是否需要自动降低画质等级
   * 当 FPS 连续低于阈值超过指定时间（默认5秒）时触发降级
   * @param {{ fps: number }} stats - 性能统计数据
   * @private
   */
  _checkAutoDowngrade(stats) {
    const ad = this._autoDowngrade;
    if (!ad.enabled || !ad.callback) return;

    const now = performance.now();

    // 检查冷却期
    if (ad.lastDowngradeTime > 0 && (now - ad.lastDowngradeTime) < ad.cooldownMs) {
      return; // 冷却期内不降级
    }

    const isLowFps = stats.fps > 0 && stats.fps < this.thresholds.fps;

    if (isLowFps) {
      // FPS 低于阈值
      if (ad.lowFpsStartTime === 0) {
        // 刚进入低 FPS 状态，记录起始时间
        ad.lowFpsStartTime = now;
      }

      const lowFpsDuration = now - ad.lowFpsStartTime;

      // 超过持续时间阈值 → 触发降级
      if (lowFpsDuration >= ad.downgradeThresholdMs) {
        this._triggerAutoDowngrade();
      }
    } else {
      // FPS 恢复正常，重置计时器
      ad.lowFpsStartTime = 0;
    }
  }

  /**
   * 执行自动降级操作
   * @private
   */
  _triggerAutoDowngrade() {
    const ad = this._autoDowngrade;
    const newLevel = ad.currentQualityLevel + 1;

    // 已经是最低等级（POTATO = 4），无法继续降级
    if (newLevel > 4) {
      console.warn('[PerformanceMonitor] 已处于最低画质等级，无法继续自动降级');
      return;
    }

    ad.currentQualityLevel = newLevel;
    ad.lastDowngradeTime = performance.now();
    ad.lowFpsStartTime = 0;

    console.warn(
      `[PerformanceMonitor] 自动降级: FPS 持续低于 ${this.thresholds.fps}` +
      ` 超过 ${ad.downgradeThresholdMs / 1000}s, 画质等级 → ${newLevel}`
    );

    // 调用降级回调
    if (typeof ad.callback === 'function') {
      try {
        ad.callback(newLevel);
      } catch (err) {
        console.error('[PerformanceMonitor] 自动降级回调执行失败:', err);
      }
    }

    // 触发降级事件监听器
    for (const listener of ad.onDowngrade) {
      try {
        listener(newLevel);
      } catch (err) {
        console.error('[PerformanceMonitor] 降级监听器执行失败:', err);
      }
    }
  }

  // ─── 自动降级 API ───

  /**
   * 启用自动降级机制
   * 当 FPS 连续低于阈值超过指定时间时，自动降低画质等级
   * @param {Function} callback - 降级回调 (newQualityLevel: number) => void
   * @param {object} [options] - 配置选项
   * @param {number} [options.downgradeThresholdMs=5000] - 触发降级的持续低FPS时间（毫秒）
   * @param {number} [options.cooldownMs=10000] - 降级冷却期（毫秒）
   * @param {number} [options.fpsThreshold=30] - FPS 低阈值
   */
  enableAutoDowngrade(callback, options = {}) {
    const ad = this._autoDowngrade;
    ad.enabled = true;
    ad.callback = callback;
    if (options.downgradeThresholdMs !== undefined) {
      ad.downgradeThresholdMs = options.downgradeThresholdMs;
    }
    if (options.cooldownMs !== undefined) {
      ad.cooldownMs = options.cooldownMs;
    }
    if (options.fpsThreshold !== undefined) {
      this.thresholds.fps = options.fpsThreshold;
    }
    console.log('[PerformanceMonitor] 自动降级已启用', options);
  }

  /**
   * 禁用自动降级机制
   */
  disableAutoDowngrade() {
    this._autoDowngrade.enabled = false;
    this._autoDowngrade.callback = null;
    this._autoDowngrade.lowFpsStartTime = 0;
    console.log('[PerformanceMonitor] 自动降级已禁用');
  }

  /**
   * 同步当前画质等级（由 ResponsiveCanvas 等外部系统调用）
   * @param {number} level - 当前画质等级
   */
  setQualityLevel(level) {
    this._autoDowngrade.currentQualityLevel = level;
  }

  /**
   * 注册降级事件监听器
   * @param {Function} listener - (newQualityLevel: number) => void
   */
  onDowngrade(listener) {
    if (typeof listener === 'function') {
      this._autoDowngrade.onDowngrade.push(listener);
    }
  }

  /**
   * 移除降级事件监听器
   * @param {Function} listener
   */
  offDowngrade(listener) {
    const idx = this._autoDowngrade.onDowngrade.indexOf(listener);
    if (idx !== -1) this._autoDowngrade.onDowngrade.splice(idx, 1);
  }

  /**
   * 触发性能警告
   * @param {string} type - 警告类型
   * @param {number} current - 当前值
   * @param {number} threshold - 阈值
   * @private
   */
  _emitWarning(type, current, threshold) {
    for (let i = 0; i < this._warningCallbacks.length; i++) {
      this._warningCallbacks[i]({ type, current, threshold });
    }
  }

  /**
   * 获取完整的性能统计数据
   * @returns {{
   *   fps: number,
   *   frameTime: number,
   *   drawCalls: number,
   *   memoryMB: number,
   *   totalMemoryMB: number,
   *   gpuTime: number,
   *   totalFrames: number,
   * }}
   */
  getStats() {
    let avgFrameTime = 0;
    if (this._ringCount > 0) {
      let sum = 0;
      for (let i = 0; i < this._ringCount; i++) {
        sum += this._ringBuffer[i];
      }
      avgFrameTime = sum / this._ringCount;
    }

    return {
      fps: Math.round(this._fps * 10) / 10,
      frameTime: Math.round(avgFrameTime * 100) / 100,
      drawCalls: this._drawCalls,
      memoryMB: this._memory
        ? Math.round(this._memory.usedJSHeapSize / 1048576)
        : 0,
      totalMemoryMB: this._memory
        ? Math.round(this._memory.totalJSHeapSize / 1048576)
        : 0,
      gpuTime: Math.round(this._gpuTime * 100) / 100,
      totalFrames: this._totalFrames,
    };
  }

  /**
   * 获取当前 FPS
   * @returns {number}
   */
  getFPS() {
    return this._fps;
  }

  /**
   * 检查当前 FPS 是否低于目标值
   * @param {number} [fps=30] - 目标 FPS
   * @returns {boolean} true 表示当前 FPS 低于目标
   */
  isBelowTarget(fps = 30) {
    return this._fps > 0 && this._fps < fps;
  }

  /**
   * 注册性能警告回调
   * @param {function({type: string, current: number, threshold: number}): void} callback
   */
  onWarning(callback) {
    if (typeof callback === 'function') {
      this._warningCallbacks.push(callback);
    }
  }

  /**
   * 获取可读的性能报告文本
   * @returns {string}
   */
  getReport() {
    const s = this.getStats();
    const lines = [
      '═══ 性能报告 ═══',
      `FPS:       ${s.fps} (帧时间: ${s.frameTime}ms)`,
      `DrawCalls: ${s.drawCalls}`,
      `GPU Time:  ${s.gpuTime}ms`,
      `JS Heap:   ${s.memoryMB}MB / ${s.totalMemoryMB}MB`,
      `总帧数:    ${s.totalFrames}`,
      '════════════════',
    ];
    return lines.join('\n');
  }

  /**
   * 重置所有统计数据
   */
  reset() {
    this._ringHead = 0;
    this._ringCount = 0;
    this._fps = 0;
    this._drawCalls = 0;
    this._memory = null;
    this._gpuTime = 0;
    this._totalFrames = 0;
    this._lastTime = 0;

    // 重置自动降级状态（但不重置配置）
    this._autoDowngrade.lowFpsStartTime = 0;
    this._autoDowngrade.lastDowngradeTime = 0;
  }

  /**
   * 销毁性能监控器
   */
  dispose() {
    this.disableAutoDowngrade();
    this._autoDowngrade.onDowngrade.length = 0;
    this._warningCallbacks.length = 0;
    this.reset();

    // 清理 GPU 查询
    if (this._gpuTimeQuery && this._gpuExt) {
      try {
        this._gpuExt.deleteQueryEXT(this._gpuTimeQuery);
      } catch (_e) { /* 忽略清理错误 */ }
      this._gpuTimeQuery = null;
    }
  }
}

export default PerformanceMonitor;
