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
    /**
     * 帧时间滑动窗口（毫秒）
     * @type {number[]}
     */
    this._frameTimes = [];

    /** 滑动窗口最大容量 */
    this._maxSamples = 60;

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

    // ─── 更新帧时间窗口 ───
    this._frameTimes.push(frameTime);
    if (this._frameTimes.length > this._maxSamples) {
      this._frameTimes.shift();
    }

    // ─── 计算 FPS ───
    if (this._frameTimes.length > 0) {
      let sum = 0;
      for (let i = 0; i < this._frameTimes.length; i++) {
        sum += this._frameTimes[i];
      }
      const avgFrameTime = sum / this._frameTimes.length;
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
    if (this._frameTimes.length > 0) {
      let sum = 0;
      for (let i = 0; i < this._frameTimes.length; i++) {
        sum += this._frameTimes[i];
      }
      avgFrameTime = sum / this._frameTimes.length;
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
    this._frameTimes.length = 0;
    this._fps = 0;
    this._drawCalls = 0;
    this._memory = null;
    this._gpuTime = 0;
    this._totalFrames = 0;
    this._lastTime = 0;
  }

  /**
   * 销毁性能监控器
   */
  dispose() {
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
