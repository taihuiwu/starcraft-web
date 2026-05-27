// ═══════════════════════════════════════════════════════════════
// StarCraft Web - RTS 摄像机控制器
// 支持：拖拽平移、滚轮缩放、键盘移动、边缘滚动、旋转、聚焦、跟随
// ═══════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { clamp, lerp } from '../shared/MathUtils.js';
import { EVENTS } from '../shared/Constants.js';
import eventBus from '../shared/EventBus.js';

/**
 * RTS 摄像机控制器
 * 采用「先绕目标点旋转，再移动」的方式控制视角
 *
 * 坐标逻辑：
 *  - angle: 摄像机在水平面的旋转角度（弧度）
 *  - distance: 摄像机到目标点的直线距离
 *  - targetPosition: 摄像机注视的目标世界坐标
 *  - height: 摄像机离地高度（由distance和俯角推算）
 */
export class RTSControls {
  /**
   * @param {THREE.PerspectiveCamera} camera - Three.js 摄像机
   * @param {HTMLElement} domElement - 事件监听的DOM元素（通常为canvas）
   */
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;

    // ─────────────── 摄像机状态 ───────────────
    /** 摄像机注视的世界坐标点 */
    this.targetPosition = new THREE.Vector3(0, 0, 0);
    /** 水平旋转角度（弧度），Q/E键控制 */
    this.angle = Math.PI / 4; // 默认45度
    /** 摄像机到目标点的距离（也影响缩放层级） */
    this.distance = 40;
    /** 俯角（弧度）—— 固定值，模拟经典RTS俯视视角 */
    this.pitch = Math.PI / 3; // 60度俯角

    // ─────────────── 约束范围 ───────────────
    this.minDistance = 5;    // 最近缩放距离
    this.maxDistance = 120;  // 最远缩放距离
    this.minPitch = Math.PI / 6;   // 最大俯角（30度，近乎平视）
    this.maxPitch = Math.PI / 2.2; // 最小俯角（近乎垂直俯视）
    this.rotateSpeed = 1.5; // Q/E旋转速度
    this.zoomSpeed = 2.0;   // 滚轮缩放速度
    this.panSpeed = 30.0;   // 键盘/拖拽平移速度
    this.smoothSpeed = 8.0; // 平滑跟随插值速度

    // ─────────────── 地图边界限制 ───────────────
    /** 地图世界坐标的边界范围（矩形） */
    this.mapBounds = { minX: -64, maxX: 64, minZ: -64, maxZ: 64 };

    // ─────────────── 输入状态 ───────────────
    /** 鼠标是否按下（右键/中键拖拽） */
    this._isDragging = false;
    /** 拖拽时的上一帧鼠标位置 */
    this._lastMouseX = 0;
    this._lastMouseY = 0;

    /** 键盘状态映射 */
    this._keys = {
      forward: false,  // W / ↑
      backward: false, // S / ↓
      left: false,     // A / ←
      right: false,    // D / →
      rotateLeft: false,  // Q
      rotateRight: false, // E
    };

    // 边缘滚动
    this._mouseClientX = 0;
    this._mouseClientY = 0;
    this.edgeScrollThreshold = 20; // 屏幕边缘像素阈值
    this.edgeScrollSpeed = 20.0;   // 边缘滚动速度
    this.enableEdgeScroll = true;  // 是否启用边缘滚动

    // 平滑跟随
    this._followTarget = null;   // 跟随目标的Vector3
    this._followSmooth = true;   // 是否平滑跟随

    // ─────────────── 绑定事件监听 ───────────────
    this._bindEvents();

    // ─────────────── 初始化位置 ───────────────
    this._updateCameraPosition();

    console.log('[RTSControls] 摄像机控制器初始化完成');
  }

  // ═══════════════════════════════════════════════
  // 事件绑定
  // ═══════════════════════════════════════════════

  /**
   * 绑定所有输入事件
   * @private
   */
  _bindEvents() {
    // 鼠标事件
    this.domElement.addEventListener('mousedown', this._onMouseDown.bind(this));
    this.domElement.addEventListener('mousemove', this._onMouseMove.bind(this));
    this.domElement.addEventListener('mouseup', this._onMouseUp.bind(this));
    this.domElement.addEventListener('wheel', this._onWheel.bind(this), { passive: false });
    // 阻止右键菜单
    this.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

    // 键盘事件
    window.addEventListener('keydown', this._onKeyDown.bind(this));
    window.addEventListener('keyup', this._onKeyUp.bind(this));
  }

  // ─────────── 鼠标按下 ───────────
  /** @private */
  _onMouseDown(e) {
    // 右键(2) 或 中键(1) 开始拖拽平移
    if (e.button === 2 || e.button === 1) {
      this._isDragging = true;
      this._lastMouseX = e.clientX;
      this._lastMouseY = e.clientY;
    }
  }

  // ─────────── 鼠标移动 ───────────
  /** @private */
  _onMouseMove(e) {
    // 记录鼠标位置（用于边缘滚动检测）
    this._mouseClientX = e.clientX;
    this._mouseClientY = e.clientY;

    if (!this._isDragging) return;

    const dx = e.clientX - this._lastMouseX;
    const dy = e.clientY - this._lastMouseY;

    this._lastMouseX = e.clientX;
    this._lastMouseY = e.clientY;

    // 拖拽平移：沿摄像机平面移动目标点
    this._panByMouse(dx, dy);
  }

  // ─────────── 鼠标释放 ───────────
  /** @private */
  _onMouseUp(e) {
    if (e.button === 2 || e.button === 1) {
      this._isDragging = false;
    }
  }

  // ─────────── 滚轮缩放 ───────────
  /** @private */
  _onWheel(e) {
    e.preventDefault();
    // 滚轮向下（deltaY>0）= 缩远，向上 = 缩近
    const delta = e.deltaY > 0 ? 1 : -1;
    this.distance += delta * this.zoomSpeed;
    this.distance = clamp(this.distance, this.minDistance, this.maxDistance);
  }

  // ─────────── 键盘按下 ───────────
  /** @private */
  _onKeyDown(e) {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp':    this._keys.forward = true; break;
      case 'KeyS': case 'ArrowDown':  this._keys.backward = true; break;
      case 'KeyA': case 'ArrowLeft':  this._keys.left = true; break;
      case 'KeyD': case 'ArrowRight': this._keys.right = true; break;
      case 'KeyQ': this._keys.rotateLeft = true; break;
      case 'KeyE': this._keys.rotateRight = true; break;
    }
  }

  // ─────────── 键盘释放 ───────────
  /** @private */
  _onKeyUp(e) {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp':    this._keys.forward = false; break;
      case 'KeyS': case 'ArrowDown':  this._keys.backward = false; break;
      case 'KeyA': case 'ArrowLeft':  this._keys.left = false; break;
      case 'KeyD': case 'ArrowRight': this._keys.right = false; break;
      case 'KeyQ': this._keys.rotateLeft = false; break;
      case 'KeyE': this._keys.rotateRight = false; break;
    }
  }

  // ═══════════════════════════════════════════════
  // 鼠标拖拽平移（沿相机平面）
  // ═══════════════════════════════════════════════

  /**
   * 根据鼠标偏移量平移摄像机目标点
   * @param {number} dx - 鼠标X偏移
   * @param {number} dy - 鼠标Y偏移
   * @private
   */
  _panByMouse(dx, dy) {
    // 计算摄像机前方和右方的水平投影
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    // 将鼠标偏移映射到世界坐标的移动量
    const panScale = this.distance * 0.002; // 距离越远，拖拽灵敏度越高
    this.targetPosition.addScaledVector(right, -dx * panScale);
    this.targetPosition.addScaledVector(forward, dy * panScale);

    // 限制在地图边界内
    this._clampToMapBounds();
  }

  // ═══════════════════════════════════════════════
  // 每帧更新
  // ═══════════════════════════════════════════════

  /**
   * 每帧调用，更新摄像机位置
   * @param {number} dt - 帧间隔时间（秒）
   */
  update(dt) {
    // ─── Q/E 旋转 ───
    if (this._keys.rotateLeft) {
      this.angle += this.rotateSpeed * dt;
    }
    if (this._keys.rotateRight) {
      this.angle -= this.rotateSpeed * dt;
    }

    // ─── WASD/方向键 平移 ───
    const forward = new THREE.Vector3(
      Math.sin(this.angle),
      0,
      Math.cos(this.angle)
    );
    const right = new THREE.Vector3(
      Math.cos(this.angle),
      0,
      -Math.sin(this.angle)
    );

    let moveDir = new THREE.Vector3(0, 0, 0);

    if (this._keys.forward)  moveDir.add(forward);
    if (this._keys.backward) moveDir.sub(forward);
    if (this._keys.left)     moveDir.sub(right);
    if (this._keys.right)    moveDir.add(right);

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      this.targetPosition.addScaledVector(moveDir, this.panSpeed * dt);
      this._clampToMapBounds();
    }

    // ─── 边缘滚动 ───
    if (this.enableEdgeScroll && !this._isDragging) {
      this._handleEdgeScroll(dt);
    }

    // ─── 平滑跟随 ───
    if (this._followTarget) {
      const target = this._followTarget;
      if (this._followSmooth) {
        // 使用插值平滑跟随
        this.targetPosition.lerp(target, 1 - Math.exp(-this.smoothSpeed * dt));
      } else {
        this.targetPosition.copy(target);
      }
      this._clampToMapBounds();
    }

    // ─── 根据 angle / distance / pitch 计算摄像机最终位置 ───
    this._updateCameraPosition();
  }

  /**
   * 根据当前 angle、distance、pitch 计算并设置摄像机世界坐标
   * @private
   */
  _updateCameraPosition() {
    const x = this.targetPosition.x + this.distance * Math.cos(this.pitch) * Math.sin(this.angle);
    const y = this.targetPosition.y + this.distance * Math.sin(this.pitch);
    const z = this.targetPosition.z + this.distance * Math.cos(this.pitch) * Math.cos(this.angle);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.targetPosition);
  }

  /**
   * 边缘滚动处理
   * 当鼠标靠近屏幕边缘时，自动向该方向平移摄像机
   * @param {number} dt - 帧间隔
   * @private
   */
  _handleEdgeScroll(dt) {
    const w = this.domElement.clientWidth || window.innerWidth;
    const h = this.domElement.clientHeight || window.innerHeight;
    const mx = this._mouseClientX;
    const my = this._mouseClientY;
    const th = this.edgeScrollThreshold;

    let edgeX = 0;
    let edgeZ = 0;

    if (mx < th) edgeX = -1;       // 左边缘 → 向左平移
    else if (mx > w - th) edgeX = 1; // 右边缘 → 向右平移

    if (my < th) edgeZ = -1;       // 上边缘 → 向前平移
    else if (my > h - th) edgeZ = 1; // 下边缘 → 向后平移

    if (edgeX !== 0 || edgeZ !== 0) {
      // 转换到摄像机坐标系
      const forward = new THREE.Vector3(Math.sin(this.angle), 0, Math.cos(this.angle));
      const right = new THREE.Vector3(Math.cos(this.angle), 0, -Math.sin(this.angle));

      this.targetPosition.addScaledVector(right, edgeX * this.edgeScrollSpeed * dt);
      this.targetPosition.addScaledVector(forward, edgeZ * this.edgeScrollSpeed * dt);

      this._clampToMapBounds();
    }
  }

  // ═══════════════════════════════════════════════
  // 公共API
  // ═══════════════════════════════════════════════

  /**
   * 镜头跳转到指定世界坐标（无平滑过渡）
   * @param {THREE.Vector3|{x:number,y:number,z:number}} position - 目标位置
   */
  focusOn(position) {
    this.targetPosition.set(position.x, 0, position.z);
    this._followTarget = null; // 取消跟随
    this._clampToMapBounds();
    this._updateCameraPosition();

    eventBus.emit(EVENTS.CAMERA_MOVE, { target: this.targetPosition.clone() });
  }

  /**
   * 获取摄像机射线（用于鼠标拾取地形或单位）
   * @returns {THREE.Ray}
   */
  getCameraRay() {
    const raycaster = new THREE.Raycaster();
    // 从鼠标NDC坐标发射射线
    const rect = this.domElement.getBoundingClientRect();
    const ndcX = ((this._mouseClientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((this._mouseClientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    return raycaster.ray;
  }

  /**
   * 平滑跟随指定目标位置
   * @param {THREE.Vector3|null} position - 要跟随的位置，传null取消跟随
   * @param {boolean} [smooth=true] - 是否平滑过渡
   */
  smoothFollow(position, smooth = true) {
    this._followTarget = position ? position.clone() : null;
    this._followSmooth = smooth;
  }

  /**
   * 设置地图边界范围
   * @param {{minX:number, maxX:number, minZ:number, maxZ:number}} bounds
   */
  setMapBounds(bounds) {
    this.mapBounds = { ...bounds };
  }

  /**
   * 将目标点限制在地图边界内
   * @private
   */
  _clampToMapBounds() {
    const mb = this.mapBounds;
    this.targetPosition.x = clamp(this.targetPosition.x, mb.minX, mb.maxX);
    this.targetPosition.z = clamp(this.targetPosition.z, mb.minZ, mb.maxZ);
  }

  /**
   * 获取当前摄像机注视的世界坐标
   * @returns {THREE.Vector3}
   */
  getTargetPosition() {
    return this.targetPosition.clone();
  }

  /**
   * 销毁，移除所有事件监听
   */
  dispose() {
    // 鼠标事件
    this.domElement.removeEventListener('mousedown', this._onMouseDown);
    this.domElement.removeEventListener('mousemove', this._onMouseMove);
    this.domElement.removeEventListener('mouseup', this._onMouseUp);
    this.domElement.removeEventListener('wheel', this._onWheel);

    // 键盘事件
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);

    console.log('[RTSControls] 已销毁');
  }
}

export default RTSControls;
