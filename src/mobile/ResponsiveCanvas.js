// ═══════════════════════════════════════════════════════════════
// StarCraft Web - 响应式画布
// 自动像素比适配、屏幕旋转检测、低画质模式、内存降级
// ═══════════════════════════════════════════════════════════════

/**
 * 画质等级
 * @enum {number}
 */
export const QUALITY_LEVEL = {
  ULTRA: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
  POTATO: 4,
};

/** 各画质等级配置 */
const QUALITY_PRESETS = {
  [QUALITY_LEVEL.ULTRA]: { pixelRatio: 2, shadows: true, postProcessing: true, particles: 1.0, grass: true, water: 'high' },
  [QUALITY_LEVEL.HIGH]: { pixelRatio: 1.5, shadows: true, postProcessing: true, particles: 0.8, grass: true, water: 'medium' },
  [QUALITY_LEVEL.MEDIUM]: { pixelRatio: 1, shadows: false, postProcessing: false, particles: 0.5, grass: false, water: 'low' },
  [QUALITY_LEVEL.LOW]: { pixelRatio: 0.75, shadows: false, postProcessing: false, particles: 0.3, grass: false, water: 'low' },
  [QUALITY_LEVEL.POTATO]: { pixelRatio: 0.5, shadows: false, postProcessing: false, particles: 0.1, grass: false, water: 'off' },
};

/**
 * 设备信息
 */
class DeviceInfo {
  constructor() {
    /** 设备像素比 */
    this.pixelRatio = window.devicePixelRatio || 1;
    /** 屏幕宽度 */
    this.screenWidth = window.innerWidth;
    /** 屏幕高度 */
    this.screenHeight = window.innerHeight;
    /** 是否为移动设备 */
    this.isMobile = this._detectMobile();
    /** 是否为低端设备 */
    this.isLowEnd = this._detectLowEnd();
    /** WebGL 版本 (1 或 2) */
    this.webglVersion = this._detectWebGL();
    /** 可用内存 (MB, 估算) */
    this.estimatedRAM = this._estimateRAM();
    /** 当前方向 */
    this.orientation = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
  }

  _detectMobile() {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || '';
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)
      || ('ontouchstart' in window && (window.innerWidth <= 1024 || window.innerHeight <= 1024));
  }

  _detectLowEnd() {
    if (typeof navigator === 'undefined') return false;
    // 检测低端信号
    const cores = navigator.hardwareConcurrency || 2;
    if (cores <= 2) return true;
    // 设备内存 API (Chrome only)
    if (navigator.deviceMemory && navigator.deviceMemory < 4) return true;
    // 小屏幕 + 移动设备通常为低端
    if (this.isMobile && window.innerWidth < 480) return true;
    return false;
  }

  _detectWebGL() {
    if (typeof document === 'undefined') return 2;
    try {
      const canvas = document.createElement('canvas');
      const gl2 = canvas.getContext('webgl2');
      if (gl2) return 2;
      const gl1 = canvas.getContext('webgl');
      if (gl1) return 1;
    } catch (e) { /* ignore */ }
    return 0;
  }

  _estimateRAM() {
    if (navigator.deviceMemory) return navigator.deviceMemory * 1024;
    // 默认假设
    return this.isMobile ? 2048 : 8192;
  }
}

/**
 * 响应式画布
 * 自动适配设备像素比、检测旋转、根据设备能力选择画质
 */
export class ResponsiveCanvas {
  /**
   * @param {HTMLCanvasElement} canvas
   */
  constructor(canvas) {
    /** @type {HTMLCanvasElement} */
    this._canvas = canvas;

    /** @type {DeviceInfo} */
    this._deviceInfo = new DeviceInfo();

    /** 当前画质等级 */
    this._qualityLevel = this._deviceInfo.isLowEnd ? QUALITY_LEVEL.LOW : QUALITY_LEVEL.HIGH;

    /** @type {Function[]} resize 回调列表 */
    this._resizeCallbacks = [];

    /** 上次屏幕方向 */
    this._lastOrientation = this._deviceInfo.orientation;

    /** 自动选择画质 */
    this._autoSelectQuality();

    // 绑定事件
    this._onWindowResize = this._handleResize.bind(this);
    this._onOrientationChange = this._handleOrientationChange.bind(this);

    window.addEventListener('resize', this._onWindowResize);
    window.addEventListener('orientationchange', this._onOrientationChange);

    // 监听内存压力 (Chrome only)
    this._setupMemoryPressure();

    // 初始尺寸设置
    this.resize();
  }

  _autoSelectQuality() {
    const info = this._deviceInfo;
    if (info.estimatedRAM < 2048) {
      this._qualityLevel = QUALITY_LEVEL.POTATO;
    } else if (info.estimatedRAM < 4096 || (info.isMobile && info.pixelRatio > 2)) {
      this._qualityLevel = QUALITY_LEVEL.LOW;
    } else if (info.isLowEnd) {
      this._qualityLevel = QUALITY_LEVEL.MEDIUM;
    } else if (info.isMobile) {
      this._qualityLevel = QUALITY_LEVEL.MEDIUM;
    } else {
      this._qualityLevel = QUALITY_LEVEL.HIGH;
    }
  }

  _setupMemoryPressure() {
    if (typeof PerformanceObserver === 'undefined') return;
    try {
      // Chrome memory-pressure observer (experimental)
      if ('memory' in performance) {
        this._memoryCheckInterval = setInterval(() => {
          const mem = performance.memory;
          if (mem && mem.usedJSHeapSize > mem.jsHeapSizeLimit * 0.9) {
            this._downgradeQuality();
          }
        }, 5000);
      }
    } catch (e) { /* PerformanceObserver not supported */ }
  }

  _downgradeQuality() {
    if (this._qualityLevel < QUALITY_LEVEL.POTATO) {
      this._qualityLevel++;
      console.warn(`[ResponsiveCanvas] Memory pressure detected, quality downgraded to ${this._qualityLevel}`);
      this.resize();
    }
  }

  _handleResize() {
    // 延迟处理，避免频繁触发
    if (this._resizeTimer) cancelAnimationFrame(this._resizeTimer);
    this._resizeTimer = requestAnimationFrame(() => {
      this.resize();
    });
  }

  _handleOrientationChange() {
    // orientationchange 后 resize 事件会延迟触发
    setTimeout(() => {
      const newOrientation = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
      if (newOrientation !== this._lastOrientation) {
        this._lastOrientation = newOrientation;
        this._deviceInfo.orientation = newOrientation;
        this.resize();
      }
    }, 300);
  }

  // ─── 公开 API ───

  /**
   * 调整画布尺寸，应用当前画质等级
   */
  resize() {
    const info = this._deviceInfo;
    const preset = QUALITY_PRESETS[this._qualityLevel];
    const pr = Math.min(preset.pixelRatio, info.pixelRatio);

    const width = window.innerWidth;
    const height = window.innerHeight;

    this._canvas.width = Math.floor(width * pr);
    this._canvas.height = Math.floor(height * pr);
    this._canvas.style.width = `${width}px`;
    this._canvas.style.height = `${height}px`;

    // 通知所有监听器
    for (const cb of this._resizeCallbacks) {
      try {
        cb({ width, height, pixelRatio: pr, quality: this._qualityLevel });
      } catch (err) {
        console.error('[ResponsiveCanvas] Resize callback error:', err);
      }
    }
  }

  /**
   * 设置画质等级
   * @param {number} level - QUALITY_LEVEL 值
   */
  setQualityLevel(level) {
    if (level < QUALITY_LEVEL.ULTRA || level > QUALITY_LEVEL.POTATO) return;
    this._qualityLevel = level;
    this.resize();
  }

  /**
   * 获取当前画质配置
   * @returns {object}
   */
  getQualityPreset() {
    return { ...QUALITY_PRESETS[this._qualityLevel] };
  }

  /**
   * 获取设备信息
   * @returns {object}
   */
  getDeviceInfo() {
    return {
      pixelRatio: this._deviceInfo.pixelRatio,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      isMobile: this._deviceInfo.isMobile,
      isLowEnd: this._deviceInfo.isLowEnd,
      webglVersion: this._deviceInfo.webglVersion,
      estimatedRAM: this._deviceInfo.estimatedRAM,
      orientation: this._deviceInfo.orientation,
      currentQuality: this._qualityLevel,
    };
  }

  /**
   * 注册 resize 回调
   * @param {Function} callback - ({ width, height, pixelRatio, quality }) => void
   */
  onResize(callback) {
    this._resizeCallbacks.push(callback);
  }

  /**
   * 移除 resize 回调
   * @param {Function} callback
   */
  offResize(callback) {
    const idx = this._resizeCallbacks.indexOf(callback);
    if (idx !== -1) this._resizeCallbacks.splice(idx, 1);
  }

  /**
   * 销毁并清理事件监听
   */
  dispose() {
    window.removeEventListener('resize', this._onWindowResize);
    window.removeEventListener('orientationchange', this._onOrientationChange);
    if (this._memoryCheckInterval) clearInterval(this._memoryCheckInterval);
    if (this._resizeTimer) cancelAnimationFrame(this._resizeTimer);
    this._resizeCallbacks.length = 0;
  }
}
