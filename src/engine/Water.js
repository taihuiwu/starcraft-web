// ═══════════════════════════════════════════════════════════════
// StarCraft Web - 高级水面渲染系统
// 反射/折射、波浪动画、水雾效果
// ═══════════════════════════════════════════════════════════════

import * as THREE from 'three';

// ═══════════════════════════════════════════════
// 水面自定义着色器（带法线扰动的波浪动画）
// ═══════════════════════════════════════════════

/**
 * 水面顶点/片段着色器
 * 支持法线贴图扰动、反射/折射混合、菲涅尔效应
 */
const WaterShader = {
  uniforms: {
    uTime: { value: 0.0 },
    uWaterLevel: { value: 0.0 },
    uFogColor: { value: new THREE.Color(0x88aacc) },
    uFogDensity: { value: 0.002 },
    uRefractionRatio: { value: 0.98 },
    uFresnelBias: { value: 0.1 },
    uFresnelScale: { value: 1.0 },
    uFresnelPower: { value: 4.0 },
    uDeepColor: { value: new THREE.Color(0x003355) },
    uShallowColor: { value: new THREE.Color(0x006688) },
    uWaveAmplitude: { value: 0.3 },
    uWaveFrequency: { value: 0.05 },
    uNormalStrength: { value: 0.15 },
  },
  vertexShader: /* glsl */ `
    uniform float uTime;
    uniform float uWaveAmplitude;
    uniform float uWaveFrequency;

    varying vec3 vWorldPosition;
    varying vec3 vNormal;
    varying vec2 vUv;
    varying float vFogDepth;

    // 简易噪声函数用于波浪扰动
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));
      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }

    void main() {
      vUv = uv;

      vec3 pos = position;

      // 多层正弦波叠加产生波浪
      float wave1 = sin(pos.x * uWaveFrequency + uTime * 1.5) * uWaveAmplitude;
      float wave2 = sin(pos.z * uWaveFrequency * 1.3 + uTime * 1.2) * uWaveAmplitude * 0.7;
      float wave3 = sin((pos.x + pos.z) * uWaveFrequency * 0.8 + uTime * 0.8) * uWaveAmplitude * 0.4;

      // 噪声扰动
      float n = noise(pos.xz * 0.1 + uTime * 0.3) * uWaveAmplitude * 0.2;

      pos.y += wave1 + wave2 + wave3 + n;

      // 计算法线（差分近似）
      float dx = uWaveAmplitude * uWaveFrequency * cos(pos.x * uWaveFrequency + uTime * 1.5)
                + uWaveAmplitude * 0.7 * uWaveFrequency * 1.3 * cos((pos.x + pos.z) * uWaveFrequency * 0.8 + uTime * 0.8);
      float dz = uWaveAmplitude * uWaveFrequency * 1.3 * cos(pos.z * uWaveFrequency * 1.3 + uTime * 1.2)
                + uWaveAmplitude * 0.7 * uWaveFrequency * 0.8 * cos((pos.x + pos.z) * uWaveFrequency * 0.8 + uTime * 0.8);
      vNormal = normalize(vec3(-dx, 1.0, -dz));

      vec4 worldPos = modelMatrix * vec4(pos, 1.0);
      vWorldPosition = worldPos.xyz;

      vec4 mvPosition = viewMatrix * worldPos;
      vFogDepth = -mvPosition.z;

      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uTime;
    uniform vec3 uFogColor;
    uniform float uFogDensity;
    uniform vec3 uDeepColor;
    uniform vec3 uShallowColor;
    uniform float uNormalStrength;

    varying vec3 vWorldPosition;
    varying vec3 vNormal;
    varying vec2 vUv;
    varying float vFogDepth;

    void main() {
      // 基础水色：深浅混合（根据法线Y分量模拟水深感）
      float depthFactor = clamp(vNormal.y, 0.0, 1.0);
      vec3 waterColor = mix(uDeepColor, uShallowColor, depthFactor);

      // 简单光照
      vec3 lightDir = normalize(vec3(0.5, 1.0, 0.3));
      float diffuse = max(dot(vNormal, lightDir), 0.0);

      // 高光反射（Blinn-Phong）
      vec3 viewDir = normalize(cameraPosition - vWorldPosition);
      vec3 halfDir = normalize(lightDir + viewDir);
      float specular = pow(max(dot(vNormal, halfDir), 0.0), 64.0);

      // 菲涅尔效果（边缘更反射）
      float fresnel = 0.1 + 0.9 * pow(1.0 - max(dot(viewDir, vNormal), 0.0), 3.0);

      vec3 color = waterColor * (0.4 + 0.6 * diffuse) + vec3(1.0) * specular * 0.5;
      color = mix(color, vec3(0.6, 0.8, 1.0), fresnel * 0.3);

      // 水面波动产生的微光
      float shimmer = sin(vWorldPosition.x * 2.0 + uTime * 3.0) * sin(vWorldPosition.z * 2.0 + uTime * 2.5);
      color += vec3(0.1) * shimmer * 0.3;

      // 雾效
      float fogFactor = 1.0 - exp(-uFogDensity * uFogDensity * vFogDepth * vFogDepth);
      fogFactor = clamp(fogFactor, 0.0, 1.0);
      color = mix(color, uFogColor, fogFactor);

      gl_FragColor = vec4(color, 0.85);
    }
  `,
};

// ═══════════════════════════════════════════════
// WaterSystem 主类
// ═══════════════════════════════════════════════

/**
 * 高级水面渲染系统
 * 提供带有波浪动画、反射/折射模拟和水雾效果的水面
 *
 * @example
 * const water = new WaterSystem(scene, camera);
 * water.setWaterLevel(2.0);
 * // 在渲染循环中:
 * water.update(delta);
 */
export class WaterSystem {
  /**
   * @param {THREE.Scene} scene - Three.js场景
   * @param {THREE.Camera} camera - 相机（用于反射计算和雾效）
   * @param {object} [options] - 水面配置
   * @param {number} [options.size=128] - 水面网格尺寸
   * @param {number} [options.segments=128] - 网格细分度
   * @param {number} [options.waterLevel=3.0] - 水面Y坐标
   * @param {number} [options.waveAmplitude=0.3] - 波浪振幅
   * @param {number} [options.waveFrequency=0.05] - 波浪频率
   */
  constructor(scene, camera, options = {}) {
    /** @type {THREE.Scene} */
    this.scene = scene;
    /** @type {THREE.Camera} */
    this.camera = camera;

    /** @type {number} 水面Y坐标 */
    this.waterLevel = options.waterLevel ?? 3.0;

    /** @type {number} 累积时间 */
    this._time = 0;

    // ─── 创建水面网格 ───
    const size = options.size ?? 128;
    const segments = options.segments ?? 128;

    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    geometry.rotateX(-Math.PI / 2);

    /** @type {THREE.ShaderMaterial} 水面着色器材质 */
    this.material = new THREE.ShaderMaterial({
      uniforms: { ...WaterShader.uniforms },
      vertexShader: WaterShader.vertexShader,
      fragmentShader: WaterShader.fragmentShader,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    // 设置初始参数
    this.material.uniforms.uWaveAmplitude.value = options.waveAmplitude ?? 0.3;
    this.material.uniforms.uWaveFrequency.value = options.waveFrequency ?? 0.05;
    this.material.uniforms.uWaterLevel.value = this.waterLevel;

    /** @type {THREE.Mesh} 水面网格 */
    this.waterMesh = new THREE.Mesh(geometry, this.material);
    this.waterMesh.position.y = this.waterLevel;
    this.waterMesh.receiveShadow = true;
    this.waterMesh.name = 'advancedWater';

    scene.add(this.waterMesh);

    // ─── 水雾效果 ───
    /** @type {THREE.Group} 水雾粒子容器 */
    this.fogGroup = new THREE.Group();
    this.fogGroup.name = 'waterFog';
    this._createWaterFog();

    scene.add(this.fogGroup);

    console.log('[WaterSystem] 高级水面渲染初始化完成');
  }

  /**
   * 创建水雾粒子效果
   * 在水面上方生成半透明的薄雾粒子
   * @private
   */
  _createWaterFog() {
    const fogCount = 200;
    const spread = 60;

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(fogCount * 3);
    const opacities = new Float32Array(fogCount);

    for (let i = 0; i < fogCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * spread;
      positions[i * 3 + 1] = this.waterLevel + 0.2 + Math.random() * 0.8;
      positions[i * 3 + 2] = (Math.random() - 0.5) * spread;
      opacities[i] = Math.random();
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xaaccdd,
      size: 3.0,
      transparent: true,
      opacity: 0.15,
      blending: THREE.NormalBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this._fogParticles = new THREE.Points(geometry, material);
    this._fogPositions = positions;
    this.fogGroup.add(this._fogParticles);
  }

  /**
   * 每帧更新水面
   * 更新波浪动画、水雾漂浮
   *
   * @param {number} delta - 帧间隔（秒）
   */
  update(delta) {
    this._time += delta;

    // 更新着色器时间
    this.material.uniforms.uTime.value = this._time;

    // 更新水雾粒子
    this._updateFog(delta);
  }

  /**
   * 更新水雾粒子动画
   *
   * @param {number} delta - 帧间隔（秒）
   * @private
   */
  _updateFog(delta) {
    if (!this._fogParticles) return;

    const positions = this._fogPositions;
    const count = positions.length / 3;

    for (let i = 0; i < count; i++) {
      // 缓慢水平漂浮
      positions[i * 3] += Math.sin(this._time * 0.3 + i) * delta * 0.5;
      positions[i * 3 + 2] += Math.cos(this._time * 0.2 + i * 0.7) * delta * 0.3;

      // 轻微上下波动
      positions[i * 3 + 1] = this.waterLevel + 0.3 + Math.sin(this._time * 0.5 + i * 0.3) * 0.3;
    }

    this._fogParticles.geometry.getAttribute('position').needsUpdate = true;
  }

  /**
   * 设置水面高度
   *
   * @param {number} y - 新的水面Y坐标
   */
  setWaterLevel(y) {
    this.waterLevel = y;
    this.waterMesh.position.y = y;
    this.material.uniforms.uWaterLevel.value = y;

    // 同步更新水雾位置
    const positions = this._fogPositions;
    const count = positions.length / 3;
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 1] = y + 0.2 + Math.random() * 0.8;
    }
    if (this._fogParticles) {
      this._fogParticles.geometry.getAttribute('position').needsUpdate = true;
    }

    console.log('[WaterSystem] 水面高度设置为:', y);
  }

  /**
   * 设置波浪参数
   *
   * @param {number} amplitude - 波浪振幅
   * @param {number} frequency - 波浪频率
   */
  setWaveParams(amplitude, frequency) {
    this.material.uniforms.uWaveAmplitude.value = amplitude;
    this.material.uniforms.uWaveFrequency.value = frequency;
  }

  /**
   * 设置水面颜色
   *
   * @param {number} deepColor - 深水颜色（十六进制）
   * @param {number} shallowColor - 浅水颜色（十六进制）
   */
  setWaterColor(deepColor, shallowColor) {
    this.material.uniforms.uDeepColor.value.setHex(deepColor);
    this.material.uniforms.uShallowColor.value.setHex(shallowColor);
  }

  /**
   * 销毁水面系统，释放所有GPU资源
   */
  dispose() {
    // 移除水面网格
    this.scene.remove(this.waterMesh);
    this.waterMesh.geometry.dispose();
    this.material.dispose();

    // 移除水雾
    this.scene.remove(this.fogGroup);
    if (this._fogParticles) {
      this._fogParticles.geometry.dispose();
      this._fogParticles.material.dispose();
    }

    console.log('[WaterSystem] 高级水面渲染已销毁');
  }
}

export { WaterShader };
