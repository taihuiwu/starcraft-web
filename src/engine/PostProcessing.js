// ═══════════════════════════════════════════════════════════════
// StarCraft Web - 后处理管线
// EffectComposer 后处理链、Bloom、Vignette、色彩校正
// ═══════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

// ═══════════════════════════════════════════════
// Vignette Shader
// ═══════════════════════════════════════════════

/**
 * Vignette 暗角效果着色器
 * 在画面边缘产生渐变暗化效果
 */
const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    offset: { value: 1.0 },
    darkness: { value: 1.0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float offset;
    uniform float darkness;
    varying vec2 vUv;
    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec2 uv = (vUv - vec2(0.5)) * vec2(offset);
      float vignette = 1.0 - dot(uv, uv);
      vignette = clamp(pow(vignette, darkness), 0.0, 1.0);
      gl_FragColor = vec4(texel.rgb * vignette, texel.a);
    }
  `,
};

// ═══════════════════════════════════════════════
// Color Correction Shader
// ═══════════════════════════════════════════════

/**
 * 色彩校正着色器
 * 支持亮度、对比度、饱和度和色调偏移调节
 */
const ColorCorrectionShader = {
  uniforms: {
    tDiffuse: { value: null },
    brightness: { value: 0.0 },
    contrast: { value: 1.0 },
    saturation: { value: 1.0 },
    hueShift: { value: 0.0 },
    gamma: { value: 1.0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float brightness;
    uniform float contrast;
    uniform float saturation;
    uniform float hueShift;
    uniform float gamma;
    varying vec2 vUv;

    vec3 rgb2hsv(vec3 c) {
      vec4 K = vec4(0.0, -1.0/3.0, 2.0/3.0, -1.0);
      vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
      vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
      float d = q.x - min(q.w, q.y);
      float e = 1.0e-10;
      return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
    }

    vec3 hsv2rgb(vec3 c) {
      vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
      vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
      return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);

      // 亮度
      vec3 color = texel.rgb + brightness;

      // 亮度到对比度
      color = (color - 0.5) * contrast + 0.5;

      // 色调偏移
      vec3 hsv = rgb2hsv(color);
      hsv.x = fract(hsv.x + hueShift);
      color = hsv2rgb(hsv);

      // 饱和度
      float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
      color = mix(vec3(luminance), color, saturation);

      // Gamma校正
      color = pow(max(color, vec3(0.0)), vec3(1.0 / gamma));

      gl_FragColor = vec4(color, texel.a);
    }
  `,
};

// ═══════════════════════════════════════════════
// PostProcessor 主类
// ═══════════════════════════════════════════════

/**
 * 后处理管线管理器
 * 封装 Three.js EffectComposer，提供便捷的后处理效果链
 *
 * @example
 * const pp = new PostProcessor(renderer, scene, camera);
 * pp.addBloom({ strength: 0.8, radius: 0.4, threshold: 0.85 });
 * pp.addVignette({ offset: 1.0, darkness: 1.2 });
 * pp.addColorCorrection({ brightness: 0.05, contrast: 1.1 });
 * // 在渲染循环中:
 * pp.render(delta);
 */
export class PostProcessor {
  /**
   * @param {THREE.WebGLRenderer} renderer - Three.js WebGL渲染器
   * @param {THREE.Scene} scene - 主场景
   * @param {THREE.Camera} camera - 相机
   */
  constructor(renderer, scene, camera) {
    /** @type {THREE.WebGLRenderer} */
    this.renderer = renderer;
    /** @type {THREE.Scene} */
    this.scene = scene;
    /** @type {THREE.Camera} */
    this.camera = camera;

    /** @type {EffectComposer} Three.js后处理合成器 */
    this.composer = new EffectComposer(renderer);

    // 添加默认的渲染通道
    const renderPass = new RenderPass(scene, camera);
    this.composer.addPass(renderPass);
    this._renderPass = renderPass;

    /** @type {ShaderPass[]} 所有自定义后处理通道引用 */
    this._customPasses = [];

    /** @type {boolean} 是否启用后处理 */
    this.enabled = true;

    console.log('[PostProcessor] 后处理管线初始化完成');
  }

  /**
   * 添加 Bloom 泛光效果
   * 模拟高亮区域的光晕扩散
   *
   * @param {object} [options] - Bloom 配置
   * @param {number} [options.strength=1.5] - 泛光强度
   * @param {number} [options.radius=0.4] - 泛光半径
   * @param {number} [options.threshold=0.85] - 亮度阈值（超过才产生泛光）
   * @returns {UnrealBloomPass} 创建的Bloom通道实例
   */
  addBloom(options = {}) {
    const strength = options.strength ?? 1.5;
    const radius = options.radius ?? 0.4;
    const threshold = options.threshold ?? 0.85;

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(this.renderer.domElement.width, this.renderer.domElement.height),
      strength,
      radius,
      threshold
    );

    this.composer.addPass(bloomPass);
    this._customPasses.push(bloomPass);

    console.log('[PostProcessor] Bloom效果已添加', { strength, radius, threshold });
    return bloomPass;
  }

  /**
   * 添加 Vignette 暗角效果
   * 在画面边缘产生渐变暗化
   *
   * @param {object} [options] - Vignette 配置
   * @param {number} [options.offset=1.0] - 暗角偏移量
   * @param {number} [options.darkness=1.0] - 暗角暗度
   * @returns {ShaderPass} 创建的Vignette通道实例
   */
  addVignette(options = {}) {
    const offset = options.offset ?? 1.0;
    const darkness = options.darkness ?? 1.0;

    const vignettePass = new ShaderPass(VignetteShader);
    vignettePass.uniforms.offset.value = offset;
    vignettePass.uniforms.darkness.value = darkness;

    this.composer.addPass(vignettePass);
    this._customPasses.push(vignettePass);

    console.log('[PostProcessor] Vignette暗角已添加', { offset, darkness });
    return vignettePass;
  }

  /**
   * 添加色彩校正效果
   * 支持亮度、对比度、饱和度、色调偏移和Gamma校正
   *
   * @param {object} [options] - 色彩校正配置
   * @param {number} [options.brightness=0.0] - 亮度偏移 (-1 ~ 1)
   * @param {number} [options.contrast=1.0] - 对比度 (0 ~ 3)
   * @param {number} [options.saturation=1.0] - 饱和度 (0 ~ 3)
   * @param {number} [options.hueShift=0.0] - 色调偏移 (0 ~ 1)
   * @param {number} [options.gamma=1.0] - Gamma校正 (0.1 ~ 3)
   * @returns {ShaderPass} 创建的色彩校正通道实例
   */
  addColorCorrection(options = {}) {
    const pass = new ShaderPass(ColorCorrectionShader);
    pass.uniforms.brightness.value = options.brightness ?? 0.0;
    pass.uniforms.contrast.value = options.contrast ?? 1.0;
    pass.uniforms.saturation.value = options.saturation ?? 1.0;
    pass.uniforms.hueShift.value = options.hueShift ?? 0.0;
    pass.uniforms.gamma.value = options.gamma ?? 1.0;

    this.composer.addPass(pass);
    this._customPasses.push(pass);

    console.log('[PostProcessor] 色彩校正已添加', options);
    return pass;
  }

  /**
   * 添加自定义 ShaderPass
   *
   * @param {object} shader - Three.js Shader 对象（包含 uniforms、vertexShader、fragmentShader）
   * @param {object} [uniformValues] - 要设置的 uniform 值
   * @returns {ShaderPass} 创建的通道实例
   */
  addPass(shader, uniformValues) {
    const pass = new ShaderPass(shader);
    if (uniformValues) {
      for (const key of Object.keys(uniformValues)) {
        if (pass.uniforms[key]) {
          pass.uniforms[key].value = uniformValues[key];
        }
      }
    }
    this.composer.addPass(pass);
    this._customPasses.push(pass);
    return pass;
  }

  /**
   * 执行后处理渲染
   * 在渲染循环中替代 renderer.render() 调用
   *
   * @param {number} [delta=0] - 帧间隔（秒），部分效果需要
   */
  render(delta) {
    if (!this.enabled) {
      this.renderer.render(this.scene, this.camera);
      return;
    }
    void delta; // 预留帧间隔参数，供未来动画效果使用
    this.composer.render();
  }

  /**
   * 响应窗口尺寸变化
   * 更新后处理合成器和所有通道的尺寸
   *
   * @param {number} width - 新宽度
   * @param {number} height - 新高度
   */
  resize(width, height) {
    this.composer.setSize(width, height);
    // 更新所有通道的尺寸
    for (const pass of this._customPasses) {
      if (pass.setSize) {
        pass.setSize(width, height);
      }
    }
    console.log('[PostProcessor] 后处理尺寸更新:', width, 'x', height);
  }

  /**
   * 销毁后处理管线，释放所有GPU资源
   */
  dispose() {
    this.composer.dispose();
    for (const pass of this._customPasses) {
      if (pass.dispose) {
        pass.dispose();
      }
    }
    this._customPasses = [];
    console.log('[PostProcessor] 后处理管线已销毁');
  }
}

export { VignetteShader, ColorCorrectionShader };
