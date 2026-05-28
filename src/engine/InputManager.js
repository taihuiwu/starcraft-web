// ═══════════════════════════════════════════════════════════════
// StarCraft Web - 统一输入管理器
// 合并键盘+鼠标+触控输入到统一接口，输入缓冲，快捷键映射
// ═══════════════════════════════════════════════════════════════

/**
 * 输入事件类型
 * @enum {string}
 */
export const INPUT_TYPE = {
  KEY_DOWN: 'keydown',
  KEY_UP: 'keyup',
  MOUSE_DOWN: 'mousedown',
  MOUSE_UP: 'mouseup',
  MOUSE_MOVE: 'mousemove',
  MOUSE_WHEEL: 'wheel',
  TOUCH_START: 'touchstart',
  TOUCH_MOVE: 'touchmove',
  TOUCH_END: 'touchend',
};

/**
 * 默认快捷键映射
 */
const DEFAULT_BINDINGS = {
  moveUp: 'KeyW',
  moveDown: 'KeyS',
  moveLeft: 'KeyA',
  moveRight: 'KeyD',
  attack: 'KeyA',
  stop: 'S',
  hold: 'H',
  patrol: 'P',
  selectAll: 'Space',
  pause: 'Escape',
  build: 'B',
  cancel: 'Escape',
  ability1: 'Q',
  ability2: 'W',
  ability3: 'E',
  ability4: 'R',
  group1: 'Digit1',
  group2: 'Digit2',
  group3: 'Digit3',
  group4: 'Digit4',
  group5: 'Digit5',
};

/**
 * 输入缓冲条目
 */
class InputEntry {
  /**
   * @param {string} type - INPUT_TYPE
   * @param {object} data - 事件数据
   * @param {number} timestamp
   */
  constructor(type, data, timestamp) {
    /** @type {string} */
    this.type = type;
    /** @type {object} */
    this.data = data;
    /** @type {number} */
    this.timestamp = timestamp;
  }
}

/**
 * 统一输入管理器
 * 将键盘、鼠标、触控事件统一为一致的接口
 * 提供输入缓冲队列和快捷键映射
 */
export class InputManager {
  /**
   * @param {HTMLElement} domElement - 事件绑定的目标元素
   */
  constructor(domElement) {
    /** @type {HTMLElement} */
    this._domElement = domElement;

    /** @type {Map<string, Set<Function>>} 键盘按键回调 */
    this._keyCallbacks = new Map();

    /** @type {Map<number, Set<Function>>} 鼠标按键回调 */
    this._mouseCallbacks = new Map();

    /** @type {Set<Function>} 触控开始回调 */
    this._touchStartCallbacks = new Set();

    /** @type {Set<Function>} 触控移动回调 */
    this._touchMoveCallbacks = new Set();

    /** @type {Set<Function>} 触控结束回调 */
    this._touchEndCallbacks = new Set();

    /** @type {Set<Function>} 鼠标移动回调 */
    this._mouseMoveCallbacks = new Set();

    /** @type {Set<Function>} 鼠标滚轮回调 */
    this._wheelCallbacks = new Set();

    /** @type {InputEntry[]} 输入缓冲队列 */
    this._buffer = [];

    /** 缓冲区最大长度 */
    this._maxBufferSize = 64;

    /** @type {Map<string, string>} action → keyCode 映射 */
    this._keyBindings = new Map(Object.entries(DEFAULT_BINDINGS));

    /** @type {Map<string, Set<Function>>} action 回调 */
    this._actionCallbacks = new Map();

    /** @type {Set<string>} 当前按下的键 */
    this._pressedKeys = new Set();

    /** @type {Set<number>} 当前按下的鼠标键 */
    this._pressedMouseButtons = new Set();

    /** 是否启用 */
    this._enabled = true;

    /** @type {Function[]} 全局预处理回调 */
    this._preprocessors = [];

    this._bindEvents();
  }

  // ─── 事件绑定 ───

  _bindEvents() {
    const el = this._domElement;

    // 键盘
    el.addEventListener('keydown', this._onKeyDown.bind(this));
    el.addEventListener('keyup', this._onKeyUp.bind(this));

    // 鼠标
    el.addEventListener('mousedown', this._onMouseDown.bind(this));
    el.addEventListener('mouseup', this._onMouseUp.bind(this));
    el.addEventListener('mousemove', this._onMouseMove.bind(this));
    el.addEventListener('wheel', this._onWheel.bind(this), { passive: false });

    // 触控
    el.addEventListener('touchstart', this._onTouchStart.bind(this), { passive: false });
    el.addEventListener('touchmove', this._onTouchMove.bind(this), { passive: false });
    el.addEventListener('touchend', this._onTouchEnd.bind(this), { passive: false });
    el.addEventListener('touchcancel', this._onTouchEnd.bind(this), { passive: false });

    // 防止右键菜单
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  _onKeyDown(e) {
    if (!this._enabled) return;

    // 阻止浏览器快捷键干扰（游戏内按键）
    if (e.code === 'Space' || e.code === 'Tab') {
      e.preventDefault();
    }

    this._pressedKeys.add(e.code);

    // 触发按键回调
    const cbs = this._keyCallbacks.get(e.code);
    if (cbs) {
      for (const cb of cbs) {
        try { cb(e); } catch (err) { console.error('[InputManager] Key callback error:', err); }
      }
    }

    // 检查 action 映射
    for (const [action, key] of this._keyBindings) {
      if (key === e.code) {
        const actionCbs = this._actionCallbacks.get(action);
        if (actionCbs) {
          for (const cb of actionCbs) {
            try { cb({ action, event: e }); } catch (err) { console.error('[InputManager] Action callback error:', err); }
          }
        }
      }
    }

    // 输入缓冲
    this._buffer.push(new InputEntry(INPUT_TYPE.KEY_DOWN, {
      code: e.code,
      key: e.key,
      shift: e.shiftKey,
      ctrl: e.ctrlKey,
      alt: e.altKey,
    }, performance.now()));

    this._trimBuffer();
  }

  _onKeyUp(e) {
    if (!this._enabled) return;
    this._pressedKeys.delete(e.code);

    const cbs = this._keyCallbacks.get(e.code + ':up');
    if (cbs) {
      for (const cb of cbs) {
        try { cb(e); } catch (err) { console.error('[InputManager] Key up callback error:', err); }
      }
    }

    this._buffer.push(new InputEntry(INPUT_TYPE.KEY_UP, { code: e.code }, performance.now()));
    this._trimBuffer();
  }

  _onMouseDown(e) {
    if (!this._enabled) return;
    e.preventDefault();

    this._pressedMouseButtons.add(e.button);

    const cbs = this._mouseCallbacks.get(e.button);
    if (cbs) {
      for (const cb of cbs) {
        try { cb(e); } catch (err) { console.error('[InputManager] Mouse callback error:', err); }
      }
    }

    this._buffer.push(new InputEntry(INPUT_TYPE.MOUSE_DOWN, {
      button: e.button,
      x: e.clientX,
      y: e.clientY,
    }, performance.now()));

    this._trimBuffer();
  }

  _onMouseUp(e) {
    if (!this._enabled) return;
    this._pressedMouseButtons.delete(e.button);

    this._buffer.push(new InputEntry(INPUT_TYPE.MOUSE_UP, {
      button: e.button,
      x: e.clientX,
      y: e.clientY,
    }, performance.now()));

    this._trimBuffer();
  }

  _onMouseMove(e) {
    if (!this._enabled) return;

    for (const cb of this._mouseMoveCallbacks) {
      try { cb(e); } catch (err) { console.error('[InputManager] Mouse move callback error:', err); }
    }
  }

  _onWheel(e) {
    if (!this._enabled) return;
    e.preventDefault();

    for (const cb of this._wheelCallbacks) {
      try { cb(e); } catch (err) { console.error('[InputManager] Wheel callback error:', err); }
    }

    this._buffer.push(new InputEntry(INPUT_TYPE.MOUSE_WHEEL, {
      deltaY: e.deltaY,
      deltaMode: e.deltaMode,
    }, performance.now()));

    this._trimBuffer();
  }

  _onTouchStart(e) {
    if (!this._enabled) return;
    e.preventDefault();

    for (const cb of this._touchStartCallbacks) {
      try { cb(e); } catch (err) { console.error('[InputManager] Touch start callback error:', err); }
    }

    const touches = [];
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      touches.push({ id: t.identifier, x: t.clientX, y: t.clientY });
    }
    this._buffer.push(new InputEntry(INPUT_TYPE.TOUCH_START, { touches }, performance.now()));
    this._trimBuffer();
  }

  _onTouchMove(e) {
    if (!this._enabled) return;
    e.preventDefault();

    for (const cb of this._touchMoveCallbacks) {
      try { cb(e); } catch (err) { console.error('[InputManager] Touch move callback error:', err); }
    }
  }

  _onTouchEnd(e) {
    if (!this._enabled) return;
    e.preventDefault();

    for (const cb of this._touchEndCallbacks) {
      try { cb(e); } catch (err) { console.error('[InputManager] Touch end callback error:', err); }
    }

    const touches = [];
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      touches.push({ id: t.identifier, x: t.clientX, y: t.clientY });
    }
    this._buffer.push(new InputEntry(INPUT_TYPE.TOUCH_END, { touches }, performance.now()));
    this._trimBuffer();
  }

  _trimBuffer() {
    while (this._buffer.length > this._maxBufferSize) {
      this._buffer.shift();
    }
  }

  // ─── 公开 API ───

  /**
   * 注册键盘按键回调
   * @param {string} key - keyCode (e.g. 'KeyW', 'Space')
   * @param {Function} callback
   * @returns {Function} 取消注册函数
   */
  onKeyDown(key, callback) {
    if (!this._keyCallbacks.has(key)) {
      this._keyCallbacks.set(key, new Set());
    }
    this._keyCallbacks.get(key).add(callback);
    return () => this._keyCallbacks.get(key)?.delete(callback);
  }

  /**
   * 注册鼠标按键回调
   * @param {number} button - 0=左键, 1=中键, 2=右键
   * @param {Function} callback
   * @returns {Function} 取消注册函数
   */
  onMouseDown(button, callback) {
    if (!this._mouseCallbacks.has(button)) {
      this._mouseCallbacks.set(button, new Set());
    }
    this._mouseCallbacks.get(button).add(callback);
    return () => this._mouseCallbacks.get(button)?.delete(callback);
  }

  /**
   * 注册鼠标移动回调
   * @param {Function} callback
   * @returns {Function}
   */
  onMouseMove(callback) {
    this._mouseMoveCallbacks.add(callback);
    return () => this._mouseMoveCallbacks.delete(callback);
  }

  /**
   * 注册鼠标滚轮回调
   * @param {Function} callback
   * @returns {Function}
   */
  onWheel(callback) {
    this._wheelCallbacks.add(callback);
    return () => this._wheelCallbacks.delete(callback);
  }

  /**
   * 注册触控开始回调
   * @param {Function} callback
   * @returns {Function}
   */
  onTouchStart(callback) {
    this._touchStartCallbacks.add(callback);
    return () => this._touchStartCallbacks.delete(callback);
  }

  /**
   * 注册触控移动回调
   * @param {Function} callback
   * @returns {Function}
   */
  onTouchMove(callback) {
    this._touchMoveCallbacks.add(callback);
    return () => this._touchMoveCallbacks.delete(callback);
  }

  /**
   * 注册触控结束回调
   * @param {Function} callback
   * @returns {Function}
   */
  onTouchEnd(callback) {
    this._touchEndCallbacks.add(callback);
    return () => this._touchEndCallbacks.delete(callback);
  }

  /**
   * 获取缓冲的输入事件
   * @param {number} [maxAge=100] - 最大时间窗口 (ms)
   * @returns {InputEntry[]}
   */
  getBufferedInputs(maxAge = 100) {
    const now = performance.now();
    return this._buffer.filter((e) => now - e.timestamp <= maxAge);
  }

  /**
   * 清空输入缓冲
   */
  clearBuffer() {
    this._buffer.length = 0;
  }

  /**
   * 设置快捷键映射
   * @param {string} action - 动作名称
   * @param {string} key - keyCode (e.g. 'KeyQ')
   */
  setKeyBinding(action, key) {
    this._keyBindings.set(action, key);
  }

  /**
   * 注册 action 回调
   * @param {string} action - 动作名称 (需先 setKeyBinding)
   * @param {Function} callback
   * @returns {Function}
   */
  onAction(action, callback) {
    if (!this._actionCallbacks.has(action)) {
      this._actionCallbacks.set(action, new Set());
    }
    this._actionCallbacks.get(action).add(callback);
    return () => this._actionCallbacks.get(action)?.delete(callback);
  }

  /**
   * 获取当前按下的所有键
   * @returns {Set<string>}
   */
  getPressedKeys() {
    return new Set(this._pressedKeys);
  }

  /**
   * 检查某键是否按下
   * @param {string} key
   * @returns {boolean}
   */
  isKeyDown(key) {
    return this._pressedKeys.has(key);
  }

  /**
   * 检查某鼠标键是否按下
   * @param {number} button
   * @returns {boolean}
   */
  isMouseDown(button) {
    return this._pressedMouseButtons.has(button);
  }

  /** 启用输入处理 */
  enable() {
    this._enabled = true;
  }

  /** 禁用输入处理 */
  disable() {
    this._enabled = false;
    this._pressedKeys.clear();
    this._pressedMouseButtons.clear();
  }

  /** 销毁并清理所有事件监听 */
  destroy() {
    this.disable();
    this._keyCallbacks.clear();
    this._mouseCallbacks.clear();
    this._touchStartCallbacks.clear();
    this._touchMoveCallbacks.clear();
    this._touchEndCallbacks.clear();
    this._mouseMoveCallbacks.clear();
    this._wheelCallbacks.clear();
    this._actionCallbacks.clear();
    this._buffer.length = 0;
    this._preprocessors.length = 0;
  }
}
