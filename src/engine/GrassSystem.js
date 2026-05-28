// ═══════════════════════════════════════════════════════════════
// StarCraft Web - 草地系统
// InstancedMesh 大量草叶渲染、风场动画、地形高度匹配
// ═══════════════════════════════════════════════════════════════

import * as THREE from 'three';

// ═══════════════════════════════════════════════
// 草叶着色器（自定义风场动画）
// ═══════════════════════════════════════════════

/**
 * 草叶顶点着色器
 * 实现基于风场的弯曲动画，根部固定、顶部摇摆
 */
const GrassVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uWindStrength;
  uniform vec2 uWindDirection;

  attribute vec3 instanceOffset;
  attribute float instanceScale;
  attribute float instanceRotation;

  varying vec3 vWorldPosition;
  varying float vHeightFactor;
  varying vec3 vNormal;

  // 简易2D噪声
  float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    // 旋转变换
    float cosR = cos(instanceRotation);
    float sinR = sin(instanceRotation);
    vec3 pos = position;

    // 应用实例旋转
    vec3 rotated = vec3(
      pos.x * cosR - pos.z * sinR,
      pos.y,
      pos.x * sinR + pos.z * cosR
    );

    // 风场动画（根部固定，越高弯曲越大）
    float heightFactor = pos.y; // Y分量作为高度因子
    vHeightFactor = heightFactor;

    // 多层风场扰动
    float windPhase = uTime * 2.0 + instanceOffset.x * 0.5 + instanceOffset.z * 0.3;
    float windX = sin(windPhase) * uWindStrength * heightFactor;
    float windZ = cos(windPhase * 0.7) * uWindStrength * 0.5 * heightFactor;

    // 添加噪波变化
    float noiseOffset = hash21(instanceOffset.xz * 0.1) * 6.28;
    windX += sin(windPhase + noiseOffset) * uWindStrength * 0.3 * heightFactor;
    windZ += cos(windPhase * 1.3 + noiseOffset) * uWindStrength * 0.2 * heightFactor;

    rotated.x += windX;
    rotated.z += windZ;

    // 应用实例偏移和缩放
    rotated *= instanceScale;
    rotated += instanceOffset;

    vec4 worldPos = modelMatrix * vec4(rotated, 1.0);
    vWorldPosition = worldPos.xyz;

    // 法线变换（简化：假设均匀缩放）
    vNormal = normalize((modelMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);

    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

/**
 * 草叶片段着色器
 * 基于高度的绿色渐变 + 简单光照
 */
const GrassFragmentShader = /* glsl */ `
  uniform vec3 uBaseColor;
  uniform vec3 uTipColor;

  varying vec3 vWorldPosition;
  varying float vHeightFactor;
  varying vec3 vNormal;

  void main() {
    // 基于高度的颜色渐变（底部深绿到顶部浅绿）
    vec3 color = mix(uBaseColor, uTipColor, vHeightFactor);

    // 简单光照
    vec3 lightDir = normalize(vec3(0.5, 1.0, 0.3));
    float diffuse = max(dot(vNormal, lightDir), 0.0) * 0.6 + 0.4;
    color *= diffuse;

    gl_FragColor = vec4(color, 1.0);
  }
`;

// ═══════════════════════════════════════════════
// GrassSystem 主类
// ═══════════════════════════════════════════════

/**
 * 草地渲染系统
 * 使用 InstancedMesh 高效渲染大量草叶
 * 支持风场动画和地形高度匹配
 *
 * @example
 * const grass = new GrassSystem(scene, terrain);
 * grass.generatePatch(new THREE.Vector3(0, 0, 0), 20);
 * // 在渲染循环中:
 * grass.update(delta);
 */
export class GrassSystem {
  /**
   * @param {THREE.Scene} scene - Three.js场景
   * @param {object} terrain - 地形对象（需要 getTerrainHeight(x, z) 方法）
   * @param {object} [options] - 草地配置
   * @param {number} [options.maxBlades=50000] - 最大草叶数
   * @param {number} [options.bladeWidth=0.05] - 草叶宽度
   * @param {number} [options.bladeHeight=0.4] - 草叶高度
   * @param {number} [options.density=3.0] - 草叶密度（每单位面积）
   * @param {number} [options.windStrength=0.3] - 风力强度
   * @param {number} [options.minHeight=0.35] - 地形高度下限（低于此不生成草）
   * @param {number} [options.maxHeight=0.6] - 地形高度上限（高于此不生成草）
   */
  constructor(scene, terrain, options = {}) {
    /** @type {THREE.Scene} */
    this.scene = scene;
    /** @type {object} 地形对象引用 */
    this.terrain = terrain;

    /** @type {number} 最大草叶数 */
    this.maxBlades = options.maxBlades ?? 50000;
    /** @type {number} 草叶宽度 */
    this.bladeWidth = options.bladeWidth ?? 0.05;
    /** @type {number} 草叶高度 */
    this.bladeHeight = options.bladeHeight ?? 0.4;
    /** @type {number} 草叶密度 */
    this.density = options.density ?? 3.0;
    /** @type {number} 风力强度 */
    this.windStrength = options.windStrength ?? 0.3;
    /** @type {number} 生成草的地形高度下限（归一化值） */
    this.minHeight = options.minHeight ?? 0.35;
    /** @type {number} 生成草的地形高度上限（归一化值） */
    this.maxHeight = options.maxHeight ?? 0.6;

    /** @type {THREE.Vector2} 风向 */
    this.windDirection = new THREE.Vector2(1.0, 0.5).normalize();

    /** @type {number} 累积时间 */
    this._time = 0;

    /** @type {THREE.InstancedMesh} 实例化草叶网格 */
    this.instancedMesh = null;

    /** @type {Float32Array} 实例偏移数据 */
    this._instanceOffsets = null;

    /** @type {Float32Array} 实例缩放数据 */
    this._instanceScales = null;

    /** @type {Float32Array} 实例旋转数据 */
    this._instanceRotations = null;

    /** @type {number} 当前已生成的草叶数量 */
    this._bladeCount = 0;

    this._initMesh();

    console.log('[GrassSystem] 草地系统初始化完成', { maxBlades: this.maxBlades });
  }

  /**
   * 初始化 InstancedMesh 和着色器材质
   * @private
   */
  _initMesh() {
    // 创建草叶几何体：一个窄三角形
    const geometry = new THREE.BufferGeometry();
    const halfW = this.bladeWidth * 0.5;
    const h = this.bladeHeight;

    // 草叶顶点：底部两个角 + 顶部一个尖角
    const vertices = new Float32Array([
      -halfW, 0, 0,
       halfW, 0, 0,
       0, h, 0,
    ]);
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.computeVertexNormals();

    // 实例化属性
    this._instanceOffsets = new Float32Array(this.maxBlades * 3);
    this._instanceScales = new Float32Array(this.maxBlades);
    this._instanceRotations = new Float32Array(this.maxBlades);

    // 创建着色器材质
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0.0 },
        uWindStrength: { value: this.windStrength },
        uWindDirection: { value: this.windDirection },
        uBaseColor: { value: new THREE.Color(0x1a5c0a) },
        uTipColor: { value: new THREE.Color(0x5ab830) },
      },
      vertexShader: GrassVertexShader,
      fragmentShader: GrassFragmentShader,
      side: THREE.DoubleSide,
    });

    // 创建 InstancedMesh
    this.instancedMesh = new THREE.InstancedMesh(geometry, this.material, this.maxBlades);
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.instancedMesh.frustumCulled = false;
    this.instancedMesh.name = 'grassField';

    // 设置实例属性
    this.instancedMesh.geometry.setAttribute(
      'instanceOffset',
      new THREE.InstancedBufferAttribute(this._instanceOffsets, 3)
    );
    this.instancedMesh.geometry.setAttribute(
      'instanceScale',
      new THREE.InstancedBufferAttribute(this._instanceScales, 1)
    );
    this.instancedMesh.geometry.setAttribute(
      'instanceRotation',
      new THREE.InstancedBufferAttribute(this._instanceRotations, 1)
    );

    this.instancedMesh.count = 0; // 初始不渲染
    this.scene.add(this.instancedMesh);
  }

  /**
   * 在指定中心和半径范围内生成草叶补丁
   * 会根据地形高度和水位线过滤生成区域
   *
   * @param {THREE.Vector3} center - 补丁中心世界坐标
   * @param {number} radius - 补丁半径
   */
  generatePatch(center, radius) {
    if (!this.terrain || !this.terrain.heightData) {
      console.warn('[GrassSystem] 地形数据不可用，无法生成草地');
      return { success: false, placed: 0 };
    }

    const area = Math.PI * radius * radius;
    const bladeCount = Math.min(
      Math.floor(area * this.density),
      this.maxBlades - this._bladeCount
    );

    if (bladeCount <= 0) {
      console.warn('[GrassSystem] 已达最大草叶数上限:', this.maxBlades);
      return { success: false, placed: 0 };
    }

    const heightScale = this.terrain.heightScale || 15;
    const tileSize = this.terrain.tileSize || 1;
    const mapSize = this.terrain.size || 128;
    const waterLevelNorm = this.terrain.waterLevel || 0.3;

    let placed = 0;
    let attempts = 0;
    const maxAttempts = bladeCount * 3; // 防止无限循环

    while (placed < bladeCount && attempts < maxAttempts) {
      attempts++;

      // 随机位置（圆形区域内均匀分布）
      const angle = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * radius;
      const x = center.x + Math.cos(angle) * r;
      const z = center.z + Math.sin(angle) * r;

      // 转换为地形网格坐标
      const gx = Math.floor(x / tileSize + mapSize * 0.5);
      const gz = Math.floor(z / tileSize + mapSize * 0.5);

      // 边界检查
      if (gx < 0 || gx >= mapSize || gz < 0 || gz >= mapSize) continue;

      // 获取归一化地形高度
      const heightNorm = this.terrain.heightData[gz][gx];

      // 过滤：只在水面以上、适宜高度范围内生成
      if (heightNorm < waterLevelNorm + 0.05) continue;
      if (heightNorm < this.minHeight || heightNorm > this.maxHeight) continue;

      const idx = this._bladeCount + placed;

      // 设置实例偏移（世界坐标，Y由地形高度决定）
      const terrainY = heightNorm * heightScale;
      this._instanceOffsets[idx * 3] = x;
      this._instanceOffsets[idx * 3 + 1] = terrainY;
      this._instanceOffsets[idx * 3 + 2] = z;

      // 随机缩放（0.6-1.2倍）
      this._instanceScales[idx] = 0.6 + Math.random() * 0.6;

      // 随机旋转
      this._instanceRotations[idx] = Math.random() * Math.PI * 2;

      placed++;
    }

    this._bladeCount += placed;
    this.instancedMesh.count = this._bladeCount;

    // 更新实例属性
    this.instancedMesh.geometry.getAttribute('instanceOffset').needsUpdate = true;
    this.instancedMesh.geometry.getAttribute('instanceScale').needsUpdate = true;
    this.instancedMesh.geometry.getAttribute('instanceRotation').needsUpdate = true;

    console.log('[GrassSystem] 生成草叶:', placed, '总计:', this._bladeCount);
    return { success: true, placed };
  }

  /**
   * 在整个地图范围内生成草地
   *
   * @param {number} [padding=5] - 地图边缘留空
   */
  generateFullMap(padding) {
    if (!this.terrain || !this.terrain.size) return;
    const mapSizeUnits = this.terrain.size * (this.terrain.tileSize || 1);
    const p = padding ?? 5;
    const center = new THREE.Vector3(0, 0, 0);
    const radius = (mapSizeUnits * 0.5) - p;
    this.generatePatch(center, radius);
  }

  /**
   * 每帧更新草地动画
   * 更新风场时间和着色器参数
   *
   * @param {number} delta - 帧间隔（秒）
   */
  update(delta) {
    this._time += delta;
    this.material.uniforms.uTime.value = this._time;
    this.material.uniforms.uWindStrength.value = this.windStrength;
    this.material.uniforms.uWindDirection.value.copy(this.windDirection);
  }

  /**
   * 设置风力参数
   *
   * @param {number} strength - 风力强度 (0-1)
   * @param {THREE.Vector2} [direction] - 风向
   */
  setWind(strength, direction) {
    this.windStrength = strength;
    this.material.uniforms.uWindStrength.value = strength;
    if (direction) {
      this.windDirection.copy(direction).normalize();
      this.material.uniforms.uWindDirection.value.copy(this.windDirection);
    }
  }

  /**
   * 设置草的颜色
   *
   * @param {number} baseColor - 底部颜色（十六进制）
   * @param {number} tipColor - 顶部颜色（十六进制）
   */
  setColor(baseColor, tipColor) {
    this.material.uniforms.uBaseColor.value.setHex(baseColor);
    this.material.uniforms.uTipColor.value.setHex(tipColor);
  }

  /**
   * 销毁草地系统，释放所有GPU资源
   */
  dispose() {
    this.scene.remove(this.instancedMesh);
    this.instancedMesh.geometry.dispose();
    this.material.dispose();

    this._instanceOffsets = null;
    this._instanceScales = null;
    this._instanceRotations = null;
    this._bladeCount = 0;

    console.log('[GrassSystem] 草地系统已销毁');
  }
}

export { GrassVertexShader, GrassFragmentShader };
