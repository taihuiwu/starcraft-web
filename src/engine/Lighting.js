// ═══════════════════════════════════════════════════════════════
// StarCraft Web - 动态光照系统
// 日夜循环、方向光/环境光动态调整、阴影贴图配置
// ═══════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { clamp, lerp } from '../shared/MathUtils.js';

// ═══════════════════════════════════════════════
// 时间段颜色预设
// ═══════════════════════════════════════════════

/**
 * 不同时间段的光照参数预设
 * hours: 24小时制时间值
 * 太阳颜色、强度、环境色、环境强度、天空/地面半球光颜色
 */
const TIME_PRESETS = [
  { hours: 0,   sunColor: 0x1a1a3e, sunIntensity: 0.05, ambientColor: 0x0a0a1a, ambientIntensity: 0.15, skyColor: 0x0a0a2e, groundColor: 0x050508 },
  { hours: 4,   sunColor: 0x2a1a1a, sunIntensity: 0.1,  ambientColor: 0x1a1020, ambientIntensity: 0.2,  skyColor: 0x1a1030, groundColor: 0x0a0808 },
  { hours: 6,   sunColor: 0xff8844, sunIntensity: 0.6,  ambientColor: 0x3a2a20, ambientIntensity: 0.3,  skyColor: 0xff9966, groundColor: 0x2a1a10 },
  { hours: 8,   sunColor: 0xffeedd, sunIntensity: 1.2,  ambientColor: 0x404060, ambientIntensity: 0.4,  skyColor: 0x87ceeb, groundColor: 0x3a5f0b },
  { hours: 12,  sunColor: 0xffffff, sunIntensity: 1.5,  ambientColor: 0x505070, ambientIntensity: 0.5,  skyColor: 0x88ccff, groundColor: 0x4a7a1a },
  { hours: 16,  sunColor: 0xffeedd, sunIntensity: 1.2,  ambientColor: 0x404060, ambientIntensity: 0.4,  skyColor: 0x87ceeb, groundColor: 0x3a5f0b },
  { hours: 18,  sunColor: 0xff6633, sunIntensity: 0.6,  ambientColor: 0x3a2020, ambientIntensity: 0.3,  skyColor: 0xff7744, groundColor: 0x2a1510 },
  { hours: 20,  sunColor: 0x2a1a2a, sunIntensity: 0.1,  ambientColor: 0x1a1020, ambientIntensity: 0.2,  skyColor: 0x1a1030, groundColor: 0x0a0808 },
  { hours: 24,  sunColor: 0x1a1a3e, sunIntensity: 0.05, ambientColor: 0x0a0a1a, ambientIntensity: 0.15, skyColor: 0x0a0a2e, groundColor: 0x050508 },
];

/**
 * 在时间预设数组中插值获取指定小时的光照参数
 *
 * @param {number} hours - 当前时间 (0-24)
 * @returns {object} 插值后的光照参数
 */
function interpolatePreset(hours) {
  // 找到当前时间段的两个边界预设
  let lower = TIME_PRESETS[0];
  let upper = TIME_PRESETS[1];

  for (let i = 0; i < TIME_PRESETS.length - 1; i++) {
    if (hours >= TIME_PRESETS[i].hours && hours <= TIME_PRESETS[i + 1].hours) {
      lower = TIME_PRESETS[i];
      upper = TIME_PRESETS[i + 1];
      break;
    }
  }

  // 计算插值因子
  const range = upper.hours - lower.hours;
  const t = range > 0 ? (hours - lower.hours) / range : 0;

  // 插值颜色
  const lowerSun = new THREE.Color(lower.sunColor);
  const upperSun = new THREE.Color(upper.sunColor);
  const sunColor = lowerSun.clone().lerp(upperSun, t);

  const lowerAmbient = new THREE.Color(lower.ambientColor);
  const upperAmbient = new THREE.Color(upper.ambientColor);
  const ambientColor = lowerAmbient.clone().lerp(upperAmbient, t);

  const lowerSky = new THREE.Color(lower.skyColor);
  const upperSky = new THREE.Color(upper.skyColor);
  const skyColor = lowerSky.clone().lerp(upperSky, t);

  const lowerGround = new THREE.Color(lower.groundColor);
  const upperGround = new THREE.Color(upper.groundColor);
  const groundColor = lowerGround.clone().lerp(upperGround, t);

  return {
    sunColor,
    sunIntensity: lerp(lower.sunIntensity, upper.sunIntensity, t),
    ambientColor,
    ambientIntensity: lerp(lower.ambientIntensity, upper.ambientIntensity, t),
    skyColor,
    groundColor,
  };
}

// ═══════════════════════════════════════════════
// LightingSystem 主类
// ═══════════════════════════════════════════════

/**
 * 动态光照系统
 * 管理日夜循环、方向光/环境光/半球光的动态调整、阴影贴图配置
 *
 * @example
 * const lighting = new LightingSystem(scene);
 * lighting.setTimeOfDay(8); // 设置为早上8点
 * lighting.setShadowMapSize(4096); // 提高阴影质量
 * // 在渲染循环中:
 * lighting.update(delta);
 */
export class LightingSystem {
  /**
   * @param {THREE.Scene} scene - Three.js场景
   * @param {object} [options] - 可选配置
   * @param {number} [options.timeOfDay=10] - 初始时间（0-24小时）
   * @param {number} [options.timeSpeed=0] - 时间流速（0=静态，1=实时，60=1分钟=1小时）
   * @param {number} [options.shadowMapSize=2048] - 阴影贴图分辨率
   * @param {number} [options.shadowExtent=100] - 阴影投射范围
   */
  constructor(scene, options = {}) {
    /** @type {THREE.Scene} */
    this.scene = scene;

    /** @type {number} 当前时间（0-24小时制） */
    this.timeOfDay = options.timeOfDay ?? 10;

    /** @type {number} 时间流速倍率 */
    this.timeSpeed = options.timeSpeed ?? 0;

    /** @type {number} 当前太阳方位角度（弧度） */
    this.sunAngle = 0;

    // ─── 创建光源 ───

    /** @type {THREE.DirectionalLight} 方向光（太阳） */
    this.directionalLight = new THREE.DirectionalLight(0xffeedd, 1.2);
    this.directionalLight.name = 'dynamicSunLight';
    this.directionalLight.castShadow = true;

    // 阴影贴图配置
    const shadowSize = options.shadowMapSize ?? 2048;
    const shadowExtent = options.shadowExtent ?? 100;
    this._configureShadowMap(shadowSize, shadowExtent);

    scene.add(this.directionalLight);

    /** @type {THREE.AmbientLight} 环境光 */
    this.ambientLight = new THREE.AmbientLight(0x404060, 0.4);
    this.ambientLight.name = 'dynamicAmbientLight';
    scene.add(this.ambientLight);

    /** @type {THREE.HemisphereLight} 半球光（天空+地面间接照明） */
    this.hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x3a5f0b, 0.3);
    this.hemisphereLight.name = 'dynamicHemisphereLight';
    scene.add(this.hemisphereLight);

    // ─── 太阳位置计算参数 ───
    /** 太阳轨道半径（世界单位） */
    this.orbitRadius = 100;

    // 初始应用时间
    this._applyTimeOfDay();

    console.log('[LightingSystem] 动态光照系统初始化完成', { timeOfDay: this.timeOfDay });
  }

  /**
   * 配置阴影贴图参数
   *
   * @param {number} mapSize - 阴影贴图分辨率
   * @param {number} extent - 阴影投射范围
   * @private
   */
  _configureShadowMap(mapSize, extent) {
    const light = this.directionalLight;

    light.shadow.mapSize.width = mapSize;
    light.shadow.mapSize.height = mapSize;

    light.shadow.camera.near = 1;
    light.shadow.camera.far = this.orbitRadius * 3;
    light.shadow.camera.left = -extent;
    light.shadow.camera.right = extent;
    light.shadow.camera.top = extent;
    light.shadow.camera.bottom = -extent;

    // 阴影偏移，避免shadow acne
    light.shadow.bias = -0.001;
    light.shadow.normalBias = 0.02;
  }

  /**
   * 设置阴影贴图分辨率（运行时可调）
   *
   * @param {number} size - 阴影贴图尺寸（如 1024, 2048, 4096）
   */
  setShadowMapSize(size) {
    this.directionalLight.shadow.mapSize.width = size;
    this.directionalLight.shadow.mapSize.height = size;
    // 释放旧阴影贴图以触发重新生成
    if (this.directionalLight.shadow.map) {
      this.directionalLight.shadow.map.dispose();
      this.directionalLight.shadow.map = null;
    }
    console.log('[LightingSystem] 阴影贴图大小更新:', size);
  }

  /**
   * 设置当前时间（0-24小时制）
   *
   * @param {number} hours - 时间值（0=午夜，6=日出，12=正午，18=日落）
   */
  setTimeOfDay(hours) {
    this.timeOfDay = ((hours % 24) + 24) % 24;
    this._applyTimeOfDay();
  }

  /**
   * 根据当前 timeOfDay 更新所有光照参数
   * @private
   */
  _applyTimeOfDay() {
    const preset = interpolatePreset(this.timeOfDay);

    // 更新方向光颜色和强度
    this.directionalLight.color.copy(preset.sunColor);
    this.directionalLight.intensity = preset.sunIntensity;

    // 更新环境光
    this.ambientLight.color.copy(preset.ambientColor);
    this.ambientLight.intensity = preset.ambientIntensity;

    // 更新半球光
    this.hemisphereLight.color.copy(preset.skyColor);
    this.hemisphereLight.groundColor.copy(preset.groundColor);
    this.hemisphereLight.intensity = preset.sunIntensity * 0.3;

    // 计算太阳位置（弧度映射：6点=日出在东方，12点=正午在头顶，18点=日落在西方）
    // hours 0-24 映射到角度 -PI/2 到 3*PI/2
    const t = (this.timeOfDay - 6) / 12; // 6点为0, 18点为1
    this.sunAngle = t * Math.PI;

    const sunX = Math.cos(this.sunAngle) * this.orbitRadius;
    const sunY = Math.sin(this.sunAngle) * this.orbitRadius;
    this.directionalLight.position.set(sunX, Math.max(sunY, 1), 30);

    // 更新阴影相机
    this.directionalLight.shadow.camera.updateProjectionMatrix();
  }

  /**
   * 每帧更新光照系统
   * 处理时间流逝和光照动态变化
   *
   * @param {number} delta - 帧间隔（秒）
   */
  update(delta) {
    if (this.timeSpeed > 0) {
      // 根据时间流速推进时间
      this.timeOfDay += (delta * this.timeSpeed) / 3600 * 24;
      if (this.timeOfDay >= 24) this.timeOfDay -= 24;
      if (this.timeOfDay < 0) this.timeOfDay += 24;

      this._applyTimeOfDay();
    }
  }

  /**
   * 获取当前太阳方向（归一化向量）
   *
   * @returns {THREE.Vector3} 太阳方向（从场景原点指向太阳）
   */
  getSunDirection() {
    return this.directionalLight.position.clone().normalize();
  }

  /**
   * 获取当前环境光颜色
   *
   * @returns {THREE.Color} 环境光颜色
   */
  getAmbientColor() {
    return this.ambientLight.color.clone();
  }

  /**
   * 获取当前太阳颜色
   *
   * @returns {THREE.Color} 方向光颜色
   */
  getSunColor() {
    return this.directionalLight.color.clone();
  }

  /**
   * 销毁光照系统，从场景中移除所有光源并释放资源
   */
  dispose() {
    this.scene.remove(this.directionalLight);
    this.scene.remove(this.ambientLight);
    this.scene.remove(this.hemisphereLight);

    if (this.directionalLight.shadow.map) {
      this.directionalLight.shadow.map.dispose();
    }
    this.directionalLight.dispose();
    this.ambientLight.dispose();
    this.hemisphereLight.dispose();

    console.log('[LightingSystem] 动态光照系统已销毁');
  }
}

export { interpolatePreset, TIME_PRESETS };
