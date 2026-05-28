// ═══════════════════════════════════════════════════════════════
// StarCraft Web - Three.js 渲染器封装
// 管理Scene、Camera、Renderer、光照、后处理合成
// ═══════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { EVENTS } from '../shared/Constants.js';
import eventBus from '../shared/EventBus.js';

/**
 * 渲染器核心类
 * 职责：
 *  - 初始化 WebGLRenderer / Scene / PerspectiveCamera
 *  - 管理灯光（环境光 + 方向光 + 半球光）
 *  - 响应窗口尺寸变化
 *  - 管理场景中的 Mesh 增删
 *  - 提供 Raycaster 拾取接口
 *  - 独立管理粒子系统的 Scene（用于后期合成叠加）
 */
export class Renderer {
  /**
   * @param {HTMLElement} container - DOM 容器元素
   * @param {object} [options] - 可选配置
   * @param {number} [options.fov=50] - 摄像机视角
   * @param {number} [options.near=0.1] - 近裁剪面
   * @param {number} [options.far=500] - 远裁剪面
   */
  constructor(container, options = {}) {
    this.container = container;

    // ─────────────────────── 基础参数 ───────────────────────
    const fov = options.fov ?? 50;
    const near = options.near ?? 0.1;
    const far = options.far ?? 500;

    // 宽高比由容器尺寸决定
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // ─────────────────────── Scene ───────────────────────
    /** 主场景：地形、单位、建筑等游戏物体 */
    this.scene = new THREE.Scene();
    // 雾效：距离衰减，增加纵深感
    this.scene.fog = new THREE.FogExp2(0x88aacc, 0.002);

    // ─────────────────────── 粒子子场景 ───────────────────────
    /** 独立粒子Scene —— 后期合成时叠加到主场景之上 */
    this.particleScene = new THREE.Scene();

    // ─────────────────────── PerspectiveCamera ───────────────────────
    this.camera = new THREE.PerspectiveCamera(fov, width / height, near, far);
    // 默认RTS俯视角位置（会被Camera.js覆盖）
    this.camera.position.set(0, 30, 30);
    this.camera.lookAt(0, 0, 0);

    // ─────────────────────── WebGLRenderer ───────────────────────
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,           // 抗锯齿
      alpha: false,              // 不需要透明背景
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // 限制最大像素比

    // 阴影映射
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // 柔和阴影

    // 色调映射（电影级色调）
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    // 输出编码（sRGB色彩空间）
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // 将Canvas追加到容器
    container.appendChild(this.renderer.domElement);

    // ─────────────────────── Raycaster（射线拾取） ───────────────────────
    /** 射线拾取器 —— 用于鼠标点击选中单位 */
    this.raycaster = new THREE.Raycaster();
    /** 鼠标NDC坐标（-1 ~ +1） */
    this.mouseNDC = new THREE.Vector2();

    // ─────────────────────── 光照 ───────────────────────
    this._lights = {};
    this.setupLights();

    // ─────────────────────── 窗口事件监听 ───────────────────────
    this._onResize = this.resize.bind(this);
    window.addEventListener('resize', this._onResize);

    // ─────────────────────── 粒子相机（用于粒子子场景渲染） ───────────────────────
    // 粒子子场景使用与主场景相同的正交相机叠加
    this.particleCamera = this.camera; // 共享同一个透视相机

    console.log('[Renderer] 初始化完成', width, 'x', height);

    // ─────────────────────── WebGL 上下文丢失/恢复 ───────────────────────
    this._onContextLost = (e) => {
      e.preventDefault(); // 告诉浏览器我们想要恢复
      this._contextLost = true;
      console.warn('[Renderer] WebGL 上下文丢失');
      eventBus.emit(EVENTS.RENDERER_ERROR, { type: 'webgl_context_lost' });
    };

    this._onContextRestored = () => {
      this._contextLost = false;
      this._restoreContext();
      console.log('[Renderer] WebGL 上下文已恢复');
      eventBus.emit(EVENTS.RENDERER_ERROR, { type: 'webgl_context_restored' });
    };

    this.renderer.domElement.addEventListener('webglcontextlost', this._onContextLost);
    this.renderer.domElement.addEventListener('webglcontextrestored', this._onContextRestored);
  }

  // ═══════════════════════════════════════════════
  // 光照系统
  // ═══════════════════════════════════════════════

  /**
   * 设置场景灯光
   * 包含：环境光 + 平行方向光（投射阴影） + 半球光
   */
  setupLights() {
    // ─── 环境光 ───
    // 提供基础照明，避免阴影区域全黑
    const ambient = new THREE.AmbientLight(0x404060, 0.4);
    ambient.name = 'ambientLight';
    this.scene.add(ambient);
    this._lights.ambient = ambient;

    // ─── 平行方向光（模拟太阳） ───
    // 这是主要光源，负责产生阴影
    const dirLight = new THREE.DirectionalLight(0xffeedd, 1.2);
    dirLight.name = 'directionalLight';
    dirLight.position.set(50, 80, 30);
    dirLight.castShadow = true;

    // 阴影贴图参数（权衡质量与性能）
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 1;
    dirLight.shadow.camera.far = 200;

    // 平行光的正交投影范围（覆盖整个游戏地图）
    const shadowExtent = 100;
    dirLight.shadow.camera.left = -shadowExtent;
    dirLight.shadow.camera.right = shadowExtent;
    dirLight.shadow.camera.top = shadowExtent;
    dirLight.shadow.camera.bottom = -shadowExtent;

    // 阴影偏移，避免阴影瑕疵（shadow acne）
    dirLight.shadow.bias = -0.001;
    dirLight.shadow.normalBias = 0.02;

    this.scene.add(dirLight);
    this._lights.directional = dirLight;

    // ─── 半球光 ───
    // 模拟天空（顶部）和地面（底部）的间接光照
    // 天空色偏蓝，地面色偏暗绿，增强户外场景真实感
    const hemiLight = new THREE.HemisphereLight(
      0x87ceeb, // 天空色（浅蓝）
      0x3a5f0b, // 地面色（暗绿）
      0.3       // 强度（较低，仅提供间接照明）
    );
    hemiLight.name = 'hemisphereLight';
    this.scene.add(hemiLight);
    this._lights.hemisphere = hemiLight;

    console.log('[Renderer] 光照设置完成');
  }

  // ═══════════════════════════════════════════════
  // 窗口自适应
  // ═══════════════════════════════════════════════

  /**
   * 响应窗口大小变化，更新相机宽高比和渲染器尺寸
   */
  resize() {
    if (this._contextLost) return; // 上下文丢失时不更新

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    // 更新相机投影矩阵
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    // 更新渲染器尺寸
    this.renderer.setSize(width, height);

    console.log('[Renderer] 窗口尺寸更新:', width, 'x', height);
  }

  // ═══════════════════════════════════════════════
  // 每帧渲染
  // ═══════════════════════════════════════════════

  /**
   * 执行一帧渲染
   * 先渲染主场景，再叠加渲染粒子子场景
   */
  render() {
    if (this._contextLost) return; // 上下文丢失时不渲染

    // 1. 渲染主场景（地形、单位、建筑等）
    this.renderer.render(this.scene, this.camera);

    // 2. 渲染粒子子场景（叠加在主场景之上，仅在有粒子时执行）
    if (this.particleScene.children.length > 0) {
      const mainFog = this.scene.fog;
      this.scene.fog = null;

      this.renderer.autoClear = false;
      this.renderer.clearDepth();
      this.renderer.render(this.particleScene, this.particleCamera);

      this.renderer.autoClear = true;
      this.scene.fog = mainFog;
    }
  }

  // ═══════════════════════════════════════════════
  // 场景物体管理
  // ═══════════════════════════════════════════════

  /**
   * 添加Mesh到主场景
   * @param {THREE.Object3D} mesh - 要添加的3D对象
   */
  addMesh(mesh) {
    this.scene.add(mesh);
  }

  /**
   * 从主场景移除Mesh
   * @param {THREE.Object3D} mesh - 要移除的3D对象
   */
  removeMesh(mesh) {
    this.scene.remove(mesh);
  }

  /**
   * 添加粒子到独立的粒子子场景
   * @param {THREE.Object3D} particleObj - 粒子对象
   */
  addParticle(particleObj) {
    this.particleScene.add(particleObj);
  }

  /**
   * 从粒子子场景移除粒子
   * @param {THREE.Object3D} particleObj - 粒子对象
   */
  removeParticle(particleObj) {
    this.particleScene.remove(particleObj);
  }

  // ═══════════════════════════════════════════════
  // Raycaster 拾取
  // ═══════════════════════════════════════════════

  /**
   * 获取射线拾取器实例
   * 供外部系统（如 Selection.js）进行鼠标拾取
   * @returns {THREE.Raycaster}
   */
  getRaycaster() {
    return this.raycaster;
  }

  /**
   * 更新鼠标NDC坐标（由输入系统调用）
   * @param {number} clientX - 鼠标客户端X坐标
   * @param {number} clientY - 鼠标客户端Y坐标
   */
  updateMouseNDC(clientX, clientY) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouseNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }

  /**
   * 对场景中的物体进行射线检测
   * @param {THREE.Object3D[]} targets - 要检测的目标对象数组
   * @returns {THREE.Intersection[]} 交点数组
   */
  raycast(targets) {
    this.raycaster.setFromCamera(this.mouseNDC, this.camera);
    return this.raycaster.intersectObjects(targets, true); // recursive=true
  }

  // ═══════════════════════════════════════════════
  // 获取底层对象
  // ═══════════════════════════════════════════════

  /**
   * 获取主场景
   * @returns {THREE.Scene}
   */
  getScene() {
    return this.scene;
  }

  /**
   * 获取摄像机
   * @returns {THREE.PerspectiveCamera}
   */
  getCamera() {
    return this.camera;
  }

  /**
   * 获取底层WebGL渲染器
   * @returns {THREE.WebGLRenderer}
   */
  getRenderer() {
    return this.renderer;
  }

  /**
   * 获取方向光引用（外部可能需要动态调整光照方向）
   * @returns {THREE.DirectionalLight}
   */
  getDirectionalLight() {
    return this._lights.directional;
  }

  // ═══════════════════════════════════════════════
  // 资源释放
  // ═══════════════════════════════════════════════

  /**
   * WebGL 上下文恢复后的重新初始化
   * 重新创建渲染器的内部状态（阴影、色调映射等）
   */
  _restoreContext() {
    // 重新启用阴影映射
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 重新设置色调映射
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    // 重新设置输出色彩空间
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // 重新设置像素比
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    console.log('[Renderer] WebGL 上下文恢复完成');
  }

  /**
   * 销毁渲染器，释放所有GPU资源
   */
  dispose() {
    window.removeEventListener('resize', this._onResize);

    // 移除 WebGL 上下文事件监听
    this.renderer.domElement.removeEventListener('webglcontextlost', this._onContextLost);
    this.renderer.domElement.removeEventListener('webglcontextrestored', this._onContextRestored);

    this.renderer.dispose();
    this.scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });

    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }

    console.log('[Renderer] 已销毁');
  }
}

export default Renderer;
