// ═══════════════════════════════════════════════════════════════
// StarCraft Web - 移动端触控控制器
// 虚拟摇杆、手势识别、双指缩放、长按选择
// ═══════════════════════════════════════════════════════════════

/**
 * 虚拟摇杆组件
 * 左下角的半透明圆形控件，控制摄像机移动
 */
class VirtualJoystick {
  /**
   * @param {HTMLElement} parent - 父容器
   */
  constructor(parent) {
    /** @type {HTMLElement} 摇杆容器 */
    this.container = document.createElement('div');
    this.container.className = 'sc-joystick';
    Object.assign(this.container.style, {
      position: 'fixed',
      left: '20px',
      bottom: '20px',
      width: '120px',
      height: '120px',
      borderRadius: '50%',
      background: 'rgba(255,255,255,0.15)',
      border: '2px solid rgba(255,255,255,0.3)',
      zIndex: '10000',
      touchAction: 'none',
      display: 'none',
    });

    /** @type {HTMLElement} 摇杆头 */
    this.thumb = document.createElement('div');
    Object.assign(this.thumb.style, {
      position: 'absolute',
      left: '50%',
      top: '50%',
      width: '44px',
      height: '44px',
      borderRadius: '50%',
      background: 'rgba(255,255,255,0.5)',
      border: '2px solid rgba(255,255,255,0.7)',
      transform: 'translate(-50%, -50%)',
      pointerEvents: 'none',
    });
    this.container.appendChild(this.thumb);
    parent.appendChild(this.container);

    /** 摇杆中心坐标 */
    this._centerX = 0;
    this._centerY = 0;
    /** 当前偏移量 (-1 到 1) */
    this.dx = 0;
    this.dy = 0;
    /** 是否激活 */
    this._active = false;
    /** 活动触摸标识 */
    this._touchId = null;
    /** 摇杆最大半径 (px) */
    this._maxRadius = 50;

    this._bindEvents();
  }

  _bindEvents() {
    this.container.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (this._active) return;
      const touch = e.changedTouches[0];
      this._touchId = touch.identifier;
      this._active = true;
      const rect = this.container.getBoundingClientRect();
      this._centerX = rect.left + rect.width / 2;
      this._centerY = rect.top + rect.height / 2;
      this._updateThumb(touch.clientX, touch.clientY);
    }, { passive: false });

    this.container.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const touch of e.changedTouches) {
        if (touch.identifier === this._touchId) {
          this._updateThumb(touch.clientX, touch.clientY);
        }
      }
    }, { passive: false });

    const onEnd = (e) => {
      for (const touch of e.changedTouches) {
        if (touch.identifier === this._touchId) {
          this._reset();
        }
      }
    };
    this.container.addEventListener('touchend', onEnd);
    this.container.addEventListener('touchcancel', onEnd);
  }

  _updateThumb(x, y) {
    let dx = x - this._centerX;
    let dy = y - this._centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > this._maxRadius) {
      dx = (dx / dist) * this._maxRadius;
      dy = (dy / dist) * this._maxRadius;
    }
    this.dx = dx / this._maxRadius;
    this.dy = dy / this._maxRadius;
    this.thumb.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  }

  _reset() {
    this._active = false;
    this._touchId = null;
    this.dx = 0;
    this.dy = 0;
    this.thumb.style.transform = 'translate(-50%, -50%)';
  }

  show() { this.container.style.display = 'block'; }
  hide() { this.container.style.display = 'none'; this._reset(); }

  dispose() {
    this.container.remove();
  }
}

/**
 * 动作按钮组
 * 右下角的攻击/技能按钮
 */
class ActionButtons {
  /**
   * @param {HTMLElement} parent - 父容器
   */
  constructor(parent) {
    this.container = document.createElement('div');
    Object.assign(this.container.style, {
      position: 'fixed',
      right: '20px',
      bottom: '20px',
      display: 'none',
      flexDirection: 'column',
      gap: '10px',
      zIndex: '10000',
    });

    /** @type {Map<string, HTMLElement>} */
    this.buttons = new Map();
    this._callbacks = new Map();

    this._createButton('attack', '⚔', 'rgba(200,50,50,0.6)');
    this._createButton('stop', '■', 'rgba(100,100,100,0.6)');
    this._createButton('skill1', 'S1', 'rgba(50,120,200,0.6)');
    this._createButton('skill2', 'S2', 'rgba(50,200,120,0.6)');

    parent.appendChild(this.container);
  }

  _createButton(id, label, color) {
    const btn = document.createElement('div');
    Object.assign(btn.style, {
      width: '56px',
      height: '56px',
      borderRadius: '50%',
      background: color,
      border: '2px solid rgba(255,255,255,0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#fff',
      fontSize: '18px',
      fontWeight: 'bold',
      touchAction: 'none',
      cursor: 'pointer',
      userSelect: 'none',
    });
    btn.textContent = label;

    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      e.stopPropagation();
      btn.style.transform = 'scale(0.9)';
      const cb = this._callbacks.get(id);
      if (cb) cb();
    }, { passive: false });

    btn.addEventListener('touchend', (e) => {
      e.preventDefault();
      btn.style.transform = 'scale(1)';
    }, { passive: false });

    this.buttons.set(id, btn);
    this.container.appendChild(btn);
  }

  /**
   * 注册按钮回调
   * @param {string} id
   * @param {Function} callback
   */
  onButton(id, callback) {
    this._callbacks.set(id, callback);
  }

  show() { this.container.style.display = 'flex'; }
  hide() { this.container.style.display = 'none'; }

  dispose() {
    this.container.remove();
  }
}

/**
 * 移动端触控控制
 * 集成虚拟摇杆、动作按钮、手势识别
 */
export class MobileControls {
  /**
   * @param {object} camera - Three.js 摄像机或 RTSControls
   * @param {HTMLElement} domElement - 渲染画布/容器
   */
  constructor(camera, domElement) {
    /** @type {object} */
    this._camera = camera;
    /** @type {HTMLElement} */
    this._domElement = domElement;

    /** 是否启用 */
    this._enabled = false;
    /** 是否为移动设备 */
    this._isMobile = MobileControls.detectMobile();

    /** @type {VirtualJoystick} */
    this._joystick = null;
    /** @type {ActionButtons} */
    this._actionButtons = null;

    /** 摄像机移动速度 */
    this.moveSpeed = 20;
    /** 缩放速度 */
    this.zoomSpeed = 2;

    // ─── 手势状态 ───
    /** 当前触摸点 Map<identifier, {x, y}> */
    this._touches = new Map();
    /** 双指初始距离 */
    this._pinchStartDist = 0;
    /** 初始摄像机 zoom */
    this._pinchStartZoom = 1;
    /** 长按定时器 */
    this._longPressTimer = null;
    /** 长按触发时间 (ms) */
    this._longPressDelay = 500;
    /** 长按起始位置 */
    this._longPressStart = { x: 0, y: 0 };
    /** 长按是否触发 */
    this._longPressTriggered = false;
    /** 单指拖拽起始位置 */
    this._panStart = null;

    /** @type {Function[]} 长按选择回调 */
    this._onLongPress = [];
    /** @type {Function[]} 攻击命令回调 */
    this._onAttack = [];

    if (this._isMobile) {
      this._initUI();
      this._bindEvents();
    }
  }

  // ─── 静态方法 ───

  /**
   * 检测是否为移动设备
   * @returns {boolean}
   */
  static detectMobile() {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || '';
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isSmallScreen = window.innerWidth <= 1024 || window.innerHeight <= 1024;
    return isMobileUA || (hasTouch && isSmallScreen);
  }

  // ─── 初始化 ───

  _initUI() {
    const parent = document.body;
    this._joystick = new VirtualJoystick(parent);
    this._actionButtons = new ActionButtons(parent);
  }

  _bindEvents() {
    const el = this._domElement;
    el.addEventListener('touchstart', this._onTouchStart.bind(this), { passive: false });
    el.addEventListener('touchmove', this._onTouchMove.bind(this), { passive: false });
    el.addEventListener('touchend', this._onTouchEnd.bind(this), { passive: false });
    el.addEventListener('touchcancel', this._onTouchEnd.bind(this), { passive: false });
  }

  _onTouchStart(e) {
    if (!this._enabled) return;
    e.preventDefault();

    const el = this._domElement;
    const rect = el ? el.getBoundingClientRect() : null;

    for (const touch of e.changedTouches) {
      // 边界检查: 仅处理在 canvas 元素范围内的触摸
      if (rect && (touch.clientX < rect.left || touch.clientX > rect.right ||
                   touch.clientY < rect.top || touch.clientY > rect.bottom)) {
        continue;
      }
      this._touches.set(touch.identifier, { x: touch.clientX, y: touch.clientY });
    }

    // 双指缩放检测
    if (this._touches.size === 2) {
      this._startPinch();
      this._cancelLongPress();
      return;
    }

    // 单指: 长按检测 + 拖拽
    if (this._touches.size === 1) {
      const touch = e.changedTouches[0];
      this._panStart = { x: touch.clientX, y: touch.clientY };
      this._startLongPress(touch.clientX, touch.clientY);
    }
  }

  _onTouchMove(e) {
    if (!this._enabled) return;
    e.preventDefault();

    // 更新触摸位置
    for (const touch of e.changedTouches) {
      this._touches.set(touch.identifier, { x: touch.clientX, y: touch.clientY });
    }

    // 双指缩放
    if (this._touches.size === 2 && this._pinchStartDist > 0) {
      this._handlePinch();
      return;
    }

    // 单指拖拽/摇杆区域外的平移
    if (this._touches.size === 1 && this._panStart) {
      const touch = e.changedTouches[0];
      const dx = touch.clientX - this._panStart.x;
      const dy = touch.clientY - this._panStart.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // 超过阈值则取消长按
      if (dist > 10) {
        this._cancelLongPress();
      }

      // 如果不在摇杆区域，执行摄像机平移
      if (!this._isInJoystickZone(touch.clientX, touch.clientY) && dist > 15) {
        this._panCamera(-dx * 0.005, -dy * 0.005);
        this._panStart = { x: touch.clientX, y: touch.clientY };
      }
    }
  }

  _onTouchEnd(e) {
    if (!this._enabled) return;
    e.preventDefault();

    this._cancelLongPress();

    for (const touch of e.changedTouches) {
      this._touches.delete(touch.identifier);
    }

    // 重置缩放状态
    if (this._touches.size < 2) {
      this._pinchStartDist = 0;
    }

    if (this._touches.size === 0) {
      this._panStart = null;
    }
  }

  // ─── 双指缩放 ───

  _startPinch() {
    const pts = Array.from(this._touches.values());
    if (pts.length < 2) return;
    this._pinchStartDist = this._getDistance(pts[0], pts[1]);
    if (this._camera && typeof this._camera.getZoom === 'function') {
      this._pinchStartZoom = this._camera.getZoom();
    } else {
      this._pinchStartZoom = this._camera && this._camera.zoom ? this._camera.zoom : 1;
    }
  }

  _handlePinch() {
    const pts = Array.from(this._touches.values());
    if (pts.length < 2) return;
    const dist = this._getDistance(pts[0], pts[1]);
    const scale = dist / this._pinchStartDist;
    const newZoom = this._pinchStartZoom * scale;

    if (this._camera && typeof this._camera.setZoom === 'function') {
      this._camera.setZoom(Math.max(0.3, Math.min(3, newZoom)));
    } else if (this._camera && this._camera.zoom !== undefined) {
      this._camera.zoom = Math.max(0.3, Math.min(3, newZoom));
    }
  }

  _getDistance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // ─── 长按选择 ───

  _startLongPress(x, y) {
    this._longPressStart = { x, y };
    this._longPressTriggered = false;
    this._longPressTimer = setTimeout(() => {
      this._longPressTriggered = true;
      for (const cb of this._onLongPress) {
        try { cb({ x, y }); } catch (err) { console.error('[MobileControls] LongPress callback error:', err); }
      }
    }, this._longPressDelay);
  }

  _cancelLongPress() {
    if (this._longPressTimer) {
      clearTimeout(this._longPressTimer);
      this._longPressTimer = null;
    }
  }

  // ─── 摄像机控制 ───

  _panCamera(dx, dy) {
    if (!this._camera) return;
    if (typeof this._camera.pan === 'function') {
      this._camera.pan(dx, dy);
    } else if (this._camera.position) {
      this._camera.position.x += dx * this.moveSpeed;
      this._camera.position.z += dy * this.moveSpeed;
    }
  }

  _isInJoystickZone(x, y) {
    return x < 160 && y > window.innerHeight - 160;
  }

  // ─── 公开 API ───

  /** 是否为移动端 */
  isMobile() {
    return this._isMobile;
  }

  /**
   * 每帧更新
   * @param {number} delta - 帧时间 (秒)
   */
  update(delta) {
    if (!this._enabled || !this._isMobile) return;

    // 虚拟摇杆驱动摄像机移动
    if (this._joystick && (this._joystick.dx !== 0 || this._joystick.dy !== 0)) {
      const dx = this._joystick.dx * this.moveSpeed * delta;
      const dy = this._joystick.dy * this.moveSpeed * delta;
      this._panCamera(dx, dy);
    }
  }

  /** 启用触控控制 */
  enable() {
    this._enabled = true;
    if (this._joystick) this._joystick.show();
    if (this._actionButtons) this._actionButtons.show();
  }

  /** 禁用触控控制 */
  disable() {
    this._enabled = false;
    if (this._joystick) this._joystick.hide();
    if (this._actionButtons) this._actionButtons.hide();
    this._cancelLongPress();
    this._touches.clear();
  }

  /**
   * 注册长按选择回调
   * @param {Function} callback
   */
  onLongPress(callback) {
    this._onLongPress.push(callback);
  }

  /**
   * 注册攻击命令回调
   * @param {Function} callback
   */
  onAttack(callback) {
    this._onAttack.push(callback);
  }

  /**
   * 获取动作按钮引用
   * @returns {ActionButtons|null}
   */
  getActionButtons() {
    return this._actionButtons;
  }

  /** 销毁并清理资源 */
  dispose() {
    this.disable();
    if (this._joystick) { this._joystick.dispose(); this._joystick = null; }
    if (this._actionButtons) { this._actionButtons.dispose(); this._actionButtons = null; }
    this._onLongPress.length = 0;
    this._onAttack.length = 0;
  }
}
