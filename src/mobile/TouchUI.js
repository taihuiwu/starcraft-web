// ═══════════════════════════════════════════════════════════════
// StarCraft Web - 触控UI适配
// 响应式HUD、触控按钮、滑动手势面板、手势识别
// ═══════════════════════════════════════════════════════════════

/**
 * 手势类型枚举
 */
export const GESTURE_TYPE = {
  TAP: 'tap',
  DOUBLE_TAP: 'double-tap',
  LONG_PRESS: 'long-press',
  SWIPE: 'swipe',
  PINCH: 'pinch',
};

/**
 * 手势识别器
 * 从原始触摸事件中识别 tap、double-tap、long-press、swipe、pinch
 */
class GestureRecognizer {
  constructor() {
    /** @type {Map<string, Function[]>} 手势回调映射 */
    this._listeners = new Map();
    /** 触摸起始状态 */
    this._startState = null;
    /** 上次 tap 时间 (用于 double-tap) */
    this._lastTapTime = 0;
    /** 长按定时器 */
    this._longPressTimer = null;
    /** 是否已触发长按 */
    this._longPressFired = false;
    /** 长按延迟 (ms) */
    this._longPressDelay = 500;
    /** swipe 最小距离 (px) */
    this._swipeThreshold = 50;
    /** pinch 初始距离 */
    this._pinchDist = 0;
  }

  /**
   * 绑定到触摸容器
   * @param {HTMLElement} el
   */
  bind(el) {
    this._el = el;
    el.addEventListener('touchstart', this._onStart.bind(this), { passive: false });
    el.addEventListener('touchmove', this._onMove.bind(this), { passive: false });
    el.addEventListener('touchend', this._onEnd.bind(this), { passive: false });
    el.addEventListener('touchcancel', this._onEnd.bind(this), { passive: false });
  }

  _onStart(e) {
    e.preventDefault();
    if (e.touches.length === 2) {
      // pinch start
      this._pinchDist = this._getTouchDist(e.touches[0], e.touches[1]);
      return;
    }
    if (e.touches.length !== 1) return;

    const t = e.touches[0];
    this._startState = { x: t.clientX, y: t.clientY, time: Date.now() };
    this._longPressFired = false;

    this._longPressTimer = setTimeout(() => {
      this._longPressFired = true;
      this._emit(GESTURE_TYPE.LONG_PRESS, { x: t.clientX, y: t.clientY });
    }, this._longPressDelay);
  }

  _onMove(e) {
    e.preventDefault();
    if (e.touches.length === 2 && this._pinchDist > 0) {
      const newDist = this._getTouchDist(e.touches[0], e.touches[1]);
      const scale = newDist / this._pinchDist;
      this._emit(GESTURE_TYPE.PINCH, { scale });
      return;
    }
    // 移动超过阈值则取消长按
    if (e.touches.length === 1 && this._startState) {
      const t = e.touches[0];
      const dx = t.clientX - this._startState.x;
      const dy = t.clientY - this._startState.y;
      if (Math.sqrt(dx * dx + dy * dy) > 10) {
        this._cancelLongPress();
      }
    }
  }

  _onEnd(e) {
    this._cancelLongPress();

    // pinch 结束
    if (e.touches.length < 2) {
      this._pinchDist = 0;
    }

    if (!this._startState || e.changedTouches.length === 0) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - this._startState.x;
    const dy = t.clientY - this._startState.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const elapsed = Date.now() - this._startState.time;

    // swipe
    if (dist > this._swipeThreshold) {
      const angle = Math.atan2(dy, dx);
      let direction = 'right';
      if (angle < -2.7 || angle > 2.7) direction = 'right';
      else if (angle > -0.4 && angle < 0.4) direction = 'right';
      else if (angle > 0.4 && angle < 1.2) direction = 'down';
      else if (angle > 1.9 || angle < -1.9) direction = 'left';
      else direction = 'up';
      this._emit(GESTURE_TYPE.SWIPE, { direction, dx, dy, distance: dist });
    } else if (dist < 15 && elapsed < 300 && !this._longPressFired) {
      // tap or double-tap
      const now = Date.now();
      if (now - this._lastTapTime < 300) {
        this._emit(GESTURE_TYPE.DOUBLE_TAP, { x: t.clientX, y: t.clientY });
        this._lastTapTime = 0;
      } else {
        this._lastTapTime = now;
        // 延迟发射 tap，等待可能的 double-tap
        setTimeout(() => {
          if (this._lastTapTime === now) {
            this._emit(GESTURE_TYPE.TAP, { x: t.clientX, y: t.clientY });
          }
        }, 310);
      }
    }

    this._startState = null;
  }

  _cancelLongPress() {
    if (this._longPressTimer) {
      clearTimeout(this._longPressTimer);
      this._longPressTimer = null;
    }
  }

  _getTouchDist(a, b) {
    const dx = a.clientX - b.clientX;
    const dy = a.clientY - b.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * 注册手势回调
   * @param {string} type - GESTURE_TYPE
   * @param {Function} callback
   */
  on(type, callback) {
    if (!this._listeners.has(type)) {
      this._listeners.set(type, []);
    }
    this._listeners.get(type).push(callback);
  }

  _emit(type, data) {
    const cbs = this._listeners.get(type);
    if (!cbs) return;
    for (const cb of cbs) {
      try { cb(data); } catch (err) {
        console.error(`[GestureRecognizer] Error in "${type}" callback:`, err);
      }
    }
  }
}

/**
 * 滑动面板组件
 * 可从屏幕边缘滑出的面板（建造菜单、科技树等）
 */
class SlidePanel {
  /**
   * @param {object} options
   * @param {HTMLElement} options.parent
   * @param {string} options.title
   * @param {string} options.side - 'left' | 'right' | 'bottom'
   */
  constructor({ parent, title, side = 'bottom' }) {
    this.side = side;
    this._visible = false;

    this.container = document.createElement('div');
    this.container.className = `sc-slide-panel sc-slide-panel--${side}`;
    Object.assign(this.container.style, {
      position: 'fixed',
      background: 'rgba(10,15,30,0.92)',
      border: '1px solid rgba(100,180,255,0.3)',
      zIndex: '9999',
      transition: 'transform 0.3s ease',
      overflow: 'hidden',
      touchAction: 'none',
    });

    if (side === 'bottom') {
      Object.assign(this.container.style, {
        left: '0', right: '0', bottom: '0',
        maxHeight: '50vh',
        borderRadius: '16px 16px 0 0',
        transform: 'translateY(100%)',
      });
    } else if (side === 'left') {
      Object.assign(this.container.style, {
        left: '0', top: '0', bottom: '0',
        width: '280px',
        transform: 'translateX(-100%)',
      });
    } else {
      Object.assign(this.container.style, {
        right: '0', top: '0', bottom: '0',
        width: '280px',
        transform: 'translateX(100%)',
      });
    }

    // 标题栏
    const header = document.createElement('div');
    Object.assign(header.style, {
      padding: '12px 16px',
      borderBottom: '1px solid rgba(100,180,255,0.2)',
      color: '#e0e8f0',
      fontSize: '16px',
      fontWeight: 'bold',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    });
    header.textContent = title;

    const closeBtn = document.createElement('span');
    closeBtn.textContent = '✕';
    Object.assign(closeBtn.style, {
      cursor: 'pointer',
      padding: '4px 8px',
      fontSize: '20px',
      color: '#aaa',
      minWidth: '44px',
      minHeight: '44px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    });
    closeBtn.addEventListener('click', () => this.hide());
    closeBtn.addEventListener('touchend', (e) => { e.preventDefault(); this.hide(); });
    header.appendChild(closeBtn);

    // 内容区
    this.content = document.createElement('div');
    Object.assign(this.content.style, {
      padding: '12px',
      overflowY: 'auto',
      maxHeight: 'calc(50vh - 48px)',
    });

    this.container.appendChild(header);
    this.container.appendChild(this.content);
    parent.appendChild(this.container);
  }

  /** 显示面板 (带滑入动画) */
  show() {
    this._visible = true;
    if (this.side === 'bottom') {
      this.container.style.transform = 'translateY(0)';
    } else if (this.side === 'left') {
      this.container.style.transform = 'translateX(0)';
    } else {
      this.container.style.transform = 'translateX(0)';
    }
  }

  /** 隐藏面板 */
  hide() {
    this._visible = false;
    if (this.side === 'bottom') {
      this.container.style.transform = 'translateY(100%)';
    } else if (this.side === 'left') {
      this.container.style.transform = 'translateX(-100%)';
    } else {
      this.container.style.transform = 'translateX(100%)';
    }
  }

  /** 获取内容容器，外部可向其添加子元素 */
  getContentElement() {
    return this.content;
  }

  dispose() {
    this.container.remove();
  }
}

/**
 * 触控UI适配
 * 管理响应式HUD、触控按钮、滑动面板和手势识别
 */
export class TouchUI {
  /**
   * @param {HTMLElement} container - 根容器
   */
  constructor(container) {
    /** @type {HTMLElement} */
    this._container = container;

    /** @type {GestureRecognizer} */
    this._gestureRecognizer = new GestureRecognizer();
    this._gestureRecognizer.bind(container);

    /** @type {Map<string, SlidePanel>} 已注册的面板 */
    this._panels = new Map();

    /** @type {boolean} 是否显示 */
    this._visible = true;

    /** @type {HTMLElement|null} HUD根元素 */
    this._hudRoot = null;

    this._initHUD();
    this._injectStyles();
  }

  _initHUD() {
    this._hudRoot = document.createElement('div');
    this._hudRoot.className = 'sc-touch-hud';
    Object.assign(this._hudRoot.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      pointerEvents: 'none',
      zIndex: '9998',
    });

    // 最小触控区域: 所有交互元素 >= 44px
    const style = document.createElement('style');
    style.textContent = `
      .sc-touch-hud * { box-sizing: border-box; }
      .sc-touch-btn {
        min-width: 44px;
        min-height: 44px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 8px 12px;
        border-radius: 8px;
        background: rgba(30,60,120,0.7);
        border: 1px solid rgba(100,180,255,0.4);
        color: #e0e8f0;
        font-size: 14px;
        cursor: pointer;
        touch-action: manipulation;
        user-select: none;
        pointer-events: auto;
        transition: background 0.15s;
      }
      .sc-touch-btn:active {
        background: rgba(60,120,220,0.8);
      }
      .sc-touch-hud--hidden { display: none !important; }
      @media (max-width: 480px) {
        .sc-touch-btn { min-width: 48px; min-height: 48px; font-size: 16px; padding: 10px 14px; }
      }
    `;
    this._hudRoot.appendChild(style);
    this._container.appendChild(this._hudRoot);
  }

  _injectStyles() {
    if (document.getElementById('sc-mobile-styles')) return;
    const style = document.createElement('style');
    style.id = 'sc-mobile-styles';
    style.textContent = `
      @media (max-width: 768px) {
        .sc-minimap { width: 120px !important; height: 120px !important; }
        .sc-resource-bar { font-size: 12px !important; }
        .sc-unit-panel { font-size: 12px !important; }
      }
    `;
    document.head.appendChild(style);
  }

  // ─── 公开 API ───

  /** 显示 HUD */
  show() {
    this._visible = true;
    if (this._hudRoot) this._hudRoot.classList.remove('sc-touch-hud--hidden');
  }

  /** 隐藏 HUD */
  hide() {
    this._visible = false;
    if (this._hudRoot) this._hudRoot.classList.add('sc-touch-hud--hidden');
  }

  /**
   * 注册手势回调
   * @param {string} type - GESTURE_TYPE 中的值
   * @param {Function} callback
   */
  onGesture(type, callback) {
    this._gestureRecognizer.on(type, callback);
  }

  /**
   * 创建或获取滑动面板
   * @param {string} panel - 面板名称
   * @param {object} options - SlidePanel 配置
   * @returns {SlidePanel}
   */
  createPanel(panel, options = {}) {
    if (this._panels.has(panel)) return this._panels.get(panel);
    const p = new SlidePanel({
      parent: this._container,
      title: options.title || panel,
      side: options.side || 'bottom',
    });
    this._panels.set(panel, p);
    return p;
  }

  /**
   * 设置面板可见性
   * @param {string} panel - 面板名称
   * @param {boolean} visible
   */
  setPanelVisible(panel, visible) {
    const p = this._panels.get(panel);
    if (!p) return;
    if (visible) p.show();
    else p.hide();
  }

  /**
   * 创建触控按钮
   * @param {string} label
   * @param {Function} onClick
   * @param {object} [style] - 额外样式
   * @returns {HTMLElement}
   */
  createButton(label, onClick, style = {}) {
    const btn = document.createElement('div');
    btn.className = 'sc-touch-btn';
    btn.textContent = label;
    Object.assign(btn.style, style);

    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      try { onClick(); } catch (err) { console.error('[TouchUI] Button error:', err); }
    }, { passive: false });

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      try { onClick(); } catch (err) { console.error('[TouchUI] Button error:', err); }
    });

    if (this._hudRoot) this._hudRoot.appendChild(btn);
    return btn;
  }

  /** 销毁并清理 */
  dispose() {
    for (const [, p] of this._panels) p.dispose();
    this._panels.clear();
    if (this._hudRoot) this._hudRoot.remove();
  }
}
