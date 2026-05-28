// ═══════════════════════════════════════════════════════════════
// StarCraft Web - 环境系统
// 程序化天空、云层、粒子天气（雨、雪）
// ═══════════════════════════════════════════════════════════════

import * as THREE from 'three';

// ═══════════════════════════════════════════════
// 程序化天空着色器
// ═══════════════════════════════════════════════

/**
 * 程序化天空着色器
 * 根据时间生成日夜渐变天空
 */
const SkyShader = {
  uniforms: {
    uSunPosition: { value: new THREE.Vector3(0.5, 1.0, 0.3) },
    uDayColor: { value: new THREE.Color(0x4488cc) },
    uSunsetColor: { value: new THREE.Color(0xff7744) },
    uNightColor: { value: new THREE.Color(0x0a0a2e) },
    uSunColor: { value: new THREE.Color(0xffffdd) },
    uDayFactor: { value: 1.0 },
  },
  vertexShader: /* glsl */ `
    varying vec3 vWorldPosition;
    void main() {
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform vec3 uSunPosition;
    uniform vec3 uDayColor;
    uniform vec3 uSunsetColor;
    uniform vec3 uNightColor;
    uniform vec3 uSunColor;
    uniform float uDayFactor;

    varying vec3 vWorldPosition;

    void main() {
      vec3 dir = normalize(vWorldPosition);
      float y = dir.y;

      // 天空颜色渐变
      vec3 skyColor = mix(uNightColor, uDayColor, uDayFactor);

      // 日落/日出效果（太阳接近地平线时偏暖色）
      float sunHeight = normalize(uSunPosition).y;
      float sunsetFactor = (1.0 - abs(sunHeight)) * uDayFactor;
      skyColor = mix(skyColor, uSunsetColor, sunsetFactor * 0.6);

      // 天顶到地平线的渐变
      float horizonBlend = 1.0 - max(y, 0.0);
      horizonBlend = pow(horizonBlend, 2.0);
      vec3 horizonColor = mix(skyColor, uSunsetColor * 0.5, sunsetFactor * 0.3);
      skyColor = mix(skyColor, horizonColor, horizonBlend);

      // 太阳光晕
      float sunDot = max(dot(dir, normalize(uSunPosition)), 0.0);
      float sunDisc = smoothstep(0.999, 0.9999, sunDot);
      float sunHalo = pow(sunDot, 32.0) * uDayFactor;
      float sunGlow = pow(sunDot, 4.0) * 0.3 * sunsetFactor;

      skyColor += uSunColor * sunDisc * uDayFactor;
      skyColor += uSunColor * sunHalo * 0.5;
      skyColor += uSunsetColor * sunGlow;

      gl_FragColor = vec4(skyColor, 1.0);
    }
  `,
};

// ═══════════════════════════════════════════════
// 云层着色器
// ═══════════════════════════════════════════════

/**
 * 云层片段着色器
 * 使用多层噪声生成程序化云朵
 */
const CloudFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;

  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
      value += amplitude * noise(p);
      p *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    vec2 uv = vUv;
    uv += uTime * 0.005; // 云层缓慢漂移

    float cloud = fbm(uv * 3.0);
    cloud = smoothstep(0.3, 0.7, cloud);

    vec3 cloudColor = vec3(1.0);
    float alpha = cloud * uOpacity;

    gl_FragColor = vec4(cloudColor, alpha);
  }
`;

// ═══════════════════════════════════════════════
// EnvironmentSystem 主类
// ═══════════════════════════════════════════════

/**
 * 环境系统
 * 管理程序化天空、云层和粒子天气效果
 *
 * @example
 * const env = new EnvironmentSystem(scene);
 * env.setWeather('rain');
 * env.setTimeOfDay(8);
 * // 在渲染循环中:
 * env.update(delta);
 */
export class EnvironmentSystem {
  /**
   * @param {THREE.Scene} scene - Three.js场景
   * @param {object} [options] - 环境配置
   * @param {number} [options.skySize=500] - 天空球半径
   * @param {number} [options.cloudCount=50] - 云层数量
   * @param {number} [options.particleCount=5000] - 天气粒子数
   */
  constructor(scene, options = {}) {
    /** @type {THREE.Scene} */
    this.scene = scene;

    /** @type {string} 当前天气类型: 'clear', 'cloudy', 'rain', 'snow', 'fog' */
    this._weather = 'clear';

    /** @type {number} 当前时间 (0-24) */
    this._timeOfDay = 10;

    /** @type {number} 累积时间 */
    this._elapsed = 0;

    /** @type {THREE.Group} 天空球容器 */
    this.skyGroup = null;

    /** @type {THREE.Group} 云层容器 */
    this.cloudGroup = null;

    /** @type {THREE.Points} 天气粒子 */
    this._weatherParticles = null;

    /** @type {Float32Array} 天气粒子速度数据 */
    this._weatherVelocities = null;

    // 初始化各子系统
    this._createSky(options.skySize ?? 500);
    this._createClouds(options.cloudCount ?? 50);
    this._createWeatherParticles(options.particleCount ?? 5000);

    console.log('[EnvironmentSystem] 环境系统初始化完成');
  }

  /**
   * 创建天空球
   *
   * @param {number} radius - 天空球半径
   * @private
   */
  _createSky(radius) {
    this.skyGroup = new THREE.Group();
    this.skyGroup.name = 'sky';

    const geometry = new THREE.SphereGeometry(radius, 32, 16);
    this._skyMaterial = new THREE.ShaderMaterial({
      uniforms: { ...SkyShader.uniforms },
      vertexShader: SkyShader.vertexShader,
      fragmentShader: SkyShader.fragmentShader,
      side: THREE.BackSide,
      depthWrite: false,
    });

    const skyMesh = new THREE.Mesh(geometry, this._skyMaterial);
    this.skyGroup.add(skyMesh);
    this.scene.add(this.skyGroup);
  }

  /**
   * 创建云层系统
   * 多个半透明面片在天空中漂浮
   *
   * @param {number} count - 云层数量
   * @private
   */
  _createClouds(count) {
    this.cloudGroup = new THREE.Group();
    this.cloudGroup.name = 'clouds';

    const cloudGeometry = new THREE.PlaneGeometry(80, 80);
    cloudGeometry.rotateX(-Math.PI / 2);

    this._cloudMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0.0 },
        uOpacity: { value: 0.5 },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: CloudFragmentShader,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this._clouds = [];
    for (let i = 0; i < count; i++) {
      const cloud = new THREE.Mesh(cloudGeometry.clone(), this._cloudMaterial.clone());
      const angle = Math.random() * Math.PI * 2;
      const dist = 50 + Math.random() * 200;
      cloud.position.set(
        Math.cos(angle) * dist,
        60 + Math.random() * 40,
        Math.sin(angle) * dist
      );
      cloud.rotation.y = Math.random() * Math.PI;
      cloud.scale.setScalar(0.5 + Math.random() * 1.5);

      this.cloudGroup.add(cloud);
      this._clouds.push({
        mesh: cloud,
        speed: 0.5 + Math.random() * 1.5,
        baseX: cloud.position.x,
        baseZ: cloud.position.z,
      });
    }

    this.scene.add(this.cloudGroup);
  }

  /**
   * 创建天气粒子系统
   * 用于雨滴和雪花渲染
   *
   * @param {number} count - 粒子数量
   * @private
   */
  _createWeatherParticles(count) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    this._weatherVelocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 200;
      positions[i * 3 + 1] = Math.random() * 80;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 200;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    this._weatherMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.15,
      transparent: true,
      opacity: 0.0,
      blending: THREE.NormalBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this._weatherParticles = new THREE.Points(geometry, this._weatherMaterial);
    this._weatherParticles.visible = false;
    this.scene.add(this._weatherParticles);
  }

  /**
   * 设置天气类型
   *
   * @param {string} type - 天气类型: 'clear', 'cloudy', 'rain', 'snow', 'fog'
   */
  setWeather(type) {
    const validTypes = ['clear', 'cloudy', 'rain', 'snow', 'fog'];
    if (!validTypes.includes(type)) {
      console.warn('[EnvironmentSystem] 无效天气类型:', type);
      return;
    }

    const prevWeather = this._weather;
    this._weather = type;

    // 更新云层可见性和不透明度
    this._updateCloudWeather(type);

    // 更新天气粒子
    this._updateWeatherParticles(type);

    // 更新雾效
    this._updateFog(type);

    console.log('[EnvironmentSystem] 天气切换:', prevWeather, '->', type);
  }

  /**
   * 根据天气类型调整云层
   *
   * @param {string} type - 天气类型
   * @private
   */
  _updateCloudWeather(type) {
    const opacityMap = {
      clear: 0.2,
      cloudy: 0.7,
      rain: 0.85,
      snow: 0.6,
      fog: 0.4,
    };

    for (const cloud of this._clouds) {
      cloud.mesh.material.uniforms.uOpacity.value = opacityMap[type] ?? 0.5;
    }
  }

  /**
   * 根据天气类型更新粒子
   *
   * @param {string} type - 天气类型
   * @private
   */
  _updateWeatherParticles(type) {
    const isRain = type === 'rain';
    const isSnow = type === 'snow';

    if (isRain || isSnow) {
      this._weatherParticles.visible = true;
      this._weatherMaterial.opacity = isRain ? 0.6 : 0.8;
      this._weatherMaterial.size = isRain ? 0.1 : 0.4;
      this._weatherMaterial.color.setHex(isRain ? 0xaaccff : 0xffffff);

      // 设置速度
      const count = this._weatherVelocities.length / 3;
      for (let i = 0; i < count; i++) {
        if (isRain) {
          // 雨：快速下落
          this._weatherVelocities[i * 3] = (Math.random() - 0.5) * 0.5;
          this._weatherVelocities[i * 3 + 1] = -(20 + Math.random() * 30);
          this._weatherVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
        } else {
          // 雪：缓慢飘落
          this._weatherVelocities[i * 3] = (Math.random() - 0.5) * 2;
          this._weatherVelocities[i * 3 + 1] = -(2 + Math.random() * 3);
          this._weatherVelocities[i * 3 + 2] = (Math.random() - 0.5) * 2;
        }
      }
    } else {
      this._weatherParticles.visible = false;
    }
  }

  /**
   * 根据天气类型调整场景雾效
   *
   * @param {string} type - 天气类型
   * @private
   */
  _updateFog(type) {
    if (!this.scene.fog) return;

    const fogConfigs = {
      clear: { color: 0x88aacc, density: 0.002 },
      cloudy: { color: 0x7799bb, density: 0.003 },
      rain: { color: 0x667788, density: 0.005 },
      snow: { color: 0x99aabb, density: 0.004 },
      fog: { color: 0x889999, density: 0.01 },
    };

    const config = fogConfigs[type] || fogConfigs.clear;
    this.scene.fog.color.setHex(config.color);
    this.scene.fog.density = config.density;
  }

  /**
   * 每帧更新环境系统
   * 更新云层漂浮、天空旋转和天气粒子动画
   *
   * @param {number} delta - 帧间隔（秒）
   */
  update(delta) {
    this._elapsed += delta;

    // 更新天空着色器时间
    if (this._skyMaterial) {
      this._skyMaterial.uniforms.uDayFactor.value = this._getDayFactor();
      // 计算太阳方向
      const sunAngle = ((this._timeOfDay - 6) / 12) * Math.PI;
      const sunY = Math.sin(sunAngle);
      const sunX = Math.cos(sunAngle);
      this._skyMaterial.uniforms.uSunPosition.value.set(sunX, Math.max(sunY, 0.01), 0.3);
    }

    // 更新云层
    this._updateClouds(delta);

    // 更新天气粒子
    if (this._weatherParticles.visible) {
      this._updateWeatherAnimation(delta);
    }
  }

  /**
   * 计算白天因子 (0=夜晚, 1=白天)
   *
   * @returns {number} 白天因子
   * @private
   */
  _getDayFactor() {
    const h = this._timeOfDay;
    if (h >= 7 && h <= 17) return 1.0;
    if (h >= 5 && h < 7) return (h - 5) / 2;
    if (h > 17 && h <= 19) return 1 - (h - 17) / 2;
    return 0.0;
  }

  /**
   * 更新云层漂浮动画
   *
   * @param {number} delta - 帧间隔（秒）
   * @private
   */
  _updateClouds(delta) {
    for (const cloud of this._clouds) {
      cloud.mesh.position.x = cloud.baseX + Math.sin(this._elapsed * 0.01 * cloud.speed) * 20;
      cloud.mesh.position.z = cloud.baseZ + this._elapsed * cloud.speed * 0.5;
      cloud.mesh.material.uniforms.uTime.value = this._elapsed;

      // 云层超出范围后循环
      if (cloud.mesh.position.z > 250) {
        cloud.mesh.position.z -= 500;
      }
    }
  }

  /**
   * 更新天气粒子动画
   *
   * @param {number} delta - 帧间隔（秒）
   * @private
   */
  _updateWeatherAnimation(delta) {
    const pos = this._weatherParticles.geometry.getAttribute('position');
    const vel = this._weatherVelocities;
    const count = pos.count;

    for (let i = 0; i < count; i++) {
      pos.array[i * 3] += vel[i * 3] * delta;
      pos.array[i * 3 + 1] += vel[i * 3 + 1] * delta;
      pos.array[i * 3 + 2] += vel[i * 3 + 2] * delta;

      // 粒子落地/出界后重置到顶部
      if (pos.array[i * 3 + 1] < 0) {
        pos.array[i * 3] = (Math.random() - 0.5) * 200;
        pos.array[i * 3 + 1] = 60 + Math.random() * 20;
        pos.array[i * 3 + 2] = (Math.random() - 0.5) * 200;
      }
    }

    pos.needsUpdate = true;
  }

  /**
   * 设置当前时间（用于天空渲染）
   *
   * @param {number} hours - 时间 (0-24)
   */
  setTimeOfDay(hours) {
    this._timeOfDay = ((hours % 24) + 24) % 24;
  }

  /**
   * 设置天空颜色
   *
   * @param {object} colors - 颜色配置
   * @param {number} [colors.day] - 白天天空颜色
   * @param {number} [colors.sunset] - 日落颜色
   * @param {number} [colors.night] - 夜晚颜色
   * @param {number} [colors.sun] - 太阳颜色
   */
  setSkyColors(colors) {
    if (colors.day !== undefined) this._skyMaterial.uniforms.uDayColor.value.setHex(colors.day);
    if (colors.sunset !== undefined) this._skyMaterial.uniforms.uSunsetColor.value.setHex(colors.sunset);
    if (colors.night !== undefined) this._skyMaterial.uniforms.uNightColor.value.setHex(colors.night);
    if (colors.sun !== undefined) this._skyMaterial.uniforms.uSunColor.value.setHex(colors.sun);
  }

  /**
   * 销毁环境系统，释放所有GPU资源
   */
  dispose() {
    // 销毁天空
    if (this.skyGroup) {
      this.scene.remove(this.skyGroup);
      this.skyGroup.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      });
    }

    // 销毁云层
    if (this.cloudGroup) {
      this.scene.remove(this.cloudGroup);
      this.cloudGroup.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      });
    }

    // 销毁天气粒子
    if (this._weatherParticles) {
      this.scene.remove(this._weatherParticles);
      this._weatherParticles.geometry.dispose();
      this._weatherMaterial.dispose();
    }

    this._clouds = null;
    console.log('[EnvironmentSystem] 环境系统已销毁');
  }
}

export { SkyShader, CloudFragmentShader };
