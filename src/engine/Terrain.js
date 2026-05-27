// ═══════════════════════════════════════════════════════════════
// StarCraft Web - 地形系统
// Perlin噪声高度图 + 多层混合贴图 + 水面 + 可通行性网格
// ═══════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { GAME } from '../shared/Constants.js';
import { clamp, lerp } from '../shared/MathUtils.js';

// ═══════════════════════════════════════════════
// Perlin 噪声实现（简化版经典Perlin）
// ═══════════════════════════════════════════════

/**
 * Perlin 噪声类
 * 使用梯度插值生成连续平滑的随机噪声
 */
class PerlinNoise {
  /**
   * @param {number} [seed] - 随机种子（可选）
   */
  constructor(seed) {
    // 排列表：256个随机整数，双倍后避免越界
    this.perm = new Uint8Array(512);
    const p = new Uint8Array(256);

    // 用种子初始化排列表
    const rng = this._seededRandom(seed || Math.random() * 65536);
    for (let i = 0; i < 256; i++) p[i] = i;
    // Fisher-Yates 洗牌
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    // 复制一遍
    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];

    // 梯度向量（2D用）
    this.grads = [
      [1, 1], [-1, 1], [1, -1], [-1, -1],
      [1, 0], [-1, 0], [0, 1], [0, -1],
    ];
  }

  /**
   * 简易伪随机数生成器（确保相同种子产生相同噪声）
   * @param {number} seed
   * @returns {Function} 返回 [0,1) 的随机数
   * @private
   */
  _seededRandom(seed) {
    let s = seed;
    return () => {
      s = (s * 16807 + 0) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  /**
   * 柏林噪声平滑函数（5次多项式）
   * @param {number} t - [0,1] 范围的值
   * @returns {number} 平滑插值权重
   * @private
   */
  _fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  /**
   * 计算二维Perlin噪声值
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   * @returns {number} 噪声值（约在 -1 ~ 1 范围）
   */
  noise2D(x, y) {
    // 所在网格坐标
    const xi = Math.floor(x) & 255;
    const yi = Math.floor(y) & 255;
    // 网格内偏移
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    // 平滑插值因子
    const u = this._fade(xf);
    const v = this._fade(yf);

    // 四个角的梯度哈希
    const aa = this.perm[this.perm[xi] + yi];
    const ab = this.perm[this.perm[xi] + yi + 1];
    const ba = this.perm[this.perm[xi + 1] + yi];
    const bb = this.perm[this.perm[xi + 1] + yi + 1];

    // 计算四个角的点积
    const dot = (hash, dx, dy) => {
      const g = this.grads[hash & 7];
      return g[0] * dx + g[1] * dy;
    };

    // 双线性插值
    const x1 = lerp(dot(aa, xf, yf), dot(ba, xf - 1, yf), u);
    const x2 = lerp(dot(ab, xf, yf - 1), dot(bb, xf - 1, yf - 1), u);
    return lerp(x1, x2, v);
  }

  /**
   * 分形叠加噪声（分形布朗运动 fBm）
   * 多个频率叠加，产生自然的地形起伏
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   * @param {number} [octaves=6] - 叠加层数
   * @param {number} [persistence=0.5] - 振幅衰减系数
   * @param {number} [lacunarity=2.0] - 频率倍增系数
   * @returns {number}
   */
  fbm(x, y, octaves = 6, persistence = 0.5, lacunarity = 2.0) {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      value += amplitude * this.noise2D(x * frequency, y * frequency);
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }

    // 归一化到 [0, 1]
    return (value / maxValue + 1) * 0.5;
  }
}

// ═══════════════════════════════════════════════
// 地形系统主类
// ═══════════════════════════════════════════════

/**
 * 地形系统
 * 管理地形网格生成、高度查询、可通行性网格
 */
export class Terrain {
  /**
   * @param {THREE.Scene} scene - Three.js场景（用于添加地形Mesh）
   * @param {object} [options] - 配置选项
   * @param {number} [options.size=128] - 地形网格尺寸（格子数）
   * @param {number} [options.tileSize=1] - 每格世界单位大小
   * @param {number} [options.heightScale=15] - 高度缩放
   * @param {number} [options.waterLevel=0.3] - 水面高度（归一化值0-1）
   */
  constructor(scene, options = {}) {
    this.scene = scene;

    // ─── 地形参数 ───
    this.size = options.size || GAME.MAP_SIZE;
    this.tileSize = options.tileSize || GAME.TILE_SIZE;
    this.heightScale = options.heightScale || 15;
    this.waterLevel = options.waterLevel ?? 0.3;

    // ─── 数据存储 ───
    /** 高度数据二维数组 [z][x] */
    this.heightData = null;
    /** 可通行性网格：true=可通行，false=不可通行 */
    this.walkableGrid = null;

    // ─── Three.js对象引用 ───
    /** 地形Mesh */
    this.terrainMesh = null;
    /** 水面Mesh */
    this.waterMesh = null;

    // ─── Perlin噪声生成器 ───
    this._noise = new PerlinNoise(42);

    // ─── 水面动画时间 ───
    this._waterTime = 0;

    console.log('[Terrain] 地形系统初始化', `尺寸=${this.size}x${this.tileSize}`);
  }

  // ═══════════════════════════════════════════════
  // 地形生成
  // ═══════════════════════════════════════════════

  /**
   * 生成完整地形（高度图 + 网格 + 水面 + 可通行性）
   * @param {number} [size] - 地形尺寸（可覆盖默认值）
   * @param {number} [heightScale] - 高度缩放（可覆盖默认值）
   */
  generateTerrain(size, heightScale) {
    if (size !== undefined) this.size = size;
    if (heightScale !== undefined) this.heightScale = heightScale;

    console.log('[Terrain] 开始生成地形...', this.size, 'x', this.size);

    // 1. 生成高度图
    this.heightData = this._generateHeightMap(this.size);

    // 2. 创建地形Mesh
    this.terrainMesh = this.createTerrainMesh(this.heightData);
    this.scene.add(this.terrainMesh);

    // 3. 创建水面
    this.waterMesh = this._createWaterPlane();
    this.scene.add(this.waterMesh);

    // 4. 初始化可通行性网格
    this._initWalkableGrid();

    console.log('[Terrain] 地形生成完成');
  }

  /**
   * 生成Perlin噪声高度图
   * @param {number} size - 网格尺寸
   * @returns {Float32Array[]} 二维高度数据 [z][x]，值范围 [0, 1]
   * @private
   */
  _generateHeightMap(size) {
    const data = [];
    const scale = 0.02; // 噪声采样频率（越小越平缓）
    const seedOffset = Math.random() * 1000; // 每次生成略有不同

    for (let z = 0; z < size; z++) {
      data[z] = new Float32Array(size);
      for (let x = 0; x < size; x++) {
        // 使用fBm叠加多层噪声
        let h = this._noise.fbm(
          (x + seedOffset) * scale,
          (z + seedOffset) * scale,
          6,   // 6层叠加
          0.5, // 振幅衰减
          2.0  // 频率倍增
        );

        // 地图边缘渐降到水面以下（防止边界地形突兀）
        const edgeDist = Math.min(x, z, size - 1 - x, size - 1 - z) / (size * 0.1);
        const edgeFade = clamp(edgeDist, 0, 1);
        h *= edgeFade;

        data[z][x] = clamp(h, 0, 1);
      }
    }

    return data;
  }

  /**
   * 根据高度数据创建地形Mesh
   * @param {Float32Array[]} heightData - 高度数据二维数组
   * @returns {THREE.Mesh} 地形网格
   */
  createTerrainMesh(heightData) {
    const size = heightData.length;
    const worldSize = size * this.tileSize;

    // 创建平面几何体（细分=1格对应1顶点）
    const geometry = new THREE.PlaneGeometry(
      worldSize, worldSize,
      size - 1, size - 1
    );

    // 旋转平面使其水平（PlaneGeometry默认在XY平面）
    geometry.rotateX(-Math.PI / 2);

    // 获取位置属性，逐顶点设置高度
    const posAttr = geometry.getAttribute('position');
    const count = posAttr.count;

    // 根据高度计算颜色（用于顶点着色混合）
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const x = Math.round(posAttr.getX(i) + worldSize / 2);
      const z = Math.round(posAttr.getZ(i) + worldSize / 2);
      const gx = clamp(x, 0, size - 1);
      const gz = clamp(z, 0, size - 1);
      const h = heightData[gz][gx];

      // 设置Y坐标为地形高度
      posAttr.setY(i, h * this.heightScale);

      // 根据高度混合颜色
      const color = this._getTerrainColor(h);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    // 添加顶点颜色属性
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals(); // 重新计算法线

    // 地形材质：使用顶点颜色
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.9,
      metalness: 0.0,
      flatShading: false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true; // 接收阴影
    mesh.castShadow = false;   // 地形本身不投射阴影
    mesh.name = 'terrain';

    return mesh;
  }

  /**
   * 根据高度值确定地形颜色
   * 高度分层：水面以下=深蓝，低处=沙滩/泥土，中处=草地，高处=岩石，极高=雪
   * @param {number} h - 归一化高度 [0, 1]
   * @returns {{r:number, g:number, b:number}}
   * @private
   */
  _getTerrainColor(h) {
    // 颜色分层点
    if (h < this.waterLevel * 0.8) {
      // 深水区 - 深蓝
      return { r: 0.15, g: 0.25, b: 0.45 };
    } else if (h < this.waterLevel) {
      // 浅水区 - 浅蓝
      return { r: 0.2, g: 0.4, b: 0.6 };
    } else if (h < this.waterLevel + 0.05) {
      // 沙滩/泥土 - 棕色
      return { r: 0.6, g: 0.5, b: 0.3 };
    } else if (h < 0.5) {
      // 草地 - 绿色（深浅渐变）
      const t = (h - this.waterLevel - 0.05) / (0.5 - this.waterLevel - 0.05);
      return { r: lerp(0.3, 0.25, t), g: lerp(0.55, 0.5, t), b: lerp(0.15, 0.1, t) };
    } else if (h < 0.75) {
      // 岩石 - 灰色
      const t = (h - 0.5) / 0.25;
      return { r: lerp(0.35, 0.5, t), g: lerp(0.32, 0.47, t), b: lerp(0.28, 0.43, t) };
    } else {
      // 雪顶 - 白色（渐变）
      const t = (h - 0.75) / 0.25;
      return { r: lerp(0.5, 0.9, t), g: lerp(0.47, 0.9, t), b: lerp(0.43, 0.92, t) };
    }
  }

  /**
   * 创建水面平面
   * 半透明蓝色，轻微波动动画
   * @returns {THREE.Mesh}
   * @private
   */
  _createWaterPlane() {
    const worldSize = this.size * this.tileSize;

    const geometry = new THREE.PlaneGeometry(worldSize, worldSize, 64, 64);
    geometry.rotateX(-Math.PI / 2);

    // 水面材质：半透明蓝色 + 基础光泽
    const material = new THREE.MeshStandardMaterial({
      color: 0x1a6090,
      transparent: true,
      opacity: 0.6,
      roughness: 0.1,
      metalness: 0.3,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    // 水面高度 = 水位线对应的世界高度
    mesh.position.y = this.waterLevel * this.heightScale + 0.2;
    mesh.receiveShadow = true;
    mesh.name = 'water';

    return mesh;
  }

  /**
   * 初始化可通行性网格
   * 高度低于水面 = 不可通行
   * @private
   */
  _initWalkableGrid() {
    this.walkableGrid = [];
    for (let z = 0; z < this.size; z++) {
      this.walkableGrid[z] = new Uint8Array(this.size);
      for (let x = 0; x < this.size; x++) {
        // 水面以下的格子不可通行
        this.walkableGrid[z][x] = this.heightData[z][x] >= this.waterLevel ? 1 : 0;
      }
    }
  }

  // ═══════════════════════════════════════════════
  // 每帧更新（水面动画）
  // ═══════════════════════════════════════════════

  /**
   * 每帧更新地形（主要是水面波动动画）
   * @param {number} dt - 帧间隔（秒）
   */
  update(dt) {
    if (!this.waterMesh) return;

    this._waterTime += dt;

    // 水面顶点波动动画
    const geometry = this.waterMesh.geometry;
    const posAttr = geometry.getAttribute('position');
    const count = posAttr.count;
    const worldSize = this.size * this.tileSize;

    for (let i = 0; i < count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);

      // 多层正弦波叠加，模拟水面波纹
      const wave1 = Math.sin(x * 0.3 + this._waterTime * 1.5) * 0.15;
      const wave2 = Math.sin(z * 0.4 + this._waterTime * 1.2) * 0.1;
      const wave3 = Math.sin((x + z) * 0.2 + this._waterTime * 0.8) * 0.08;

      posAttr.setY(i, wave1 + wave2 + wave3);
    }

    posAttr.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  // ═══════════════════════════════════════════════
  // 高度查询
  // ═══════════════════════════════════════════════

  /**
   * 获取世界坐标处的地形高度
   * 使用双线性插值实现亚格精度
   * @param {number} x - 世界X坐标
   * @param {number} z - 世界Z坐标
   * @returns {number} 地形高度（世界单位）
   */
  getTerrainHeight(x, z) {
    if (!this.heightData) return 0;

    // 转换为网格坐标
    const gx = x / this.tileSize;
    const gz = z / this.tileSize;

    // 整数部分和小数部分
    const ix = Math.floor(gx);
    const iz = Math.floor(gz);
    const fx = gx - ix;
    const fz = gz - iz;

    // 边界检查
    if (ix < 0 || ix >= this.size - 1 || iz < 0 || iz >= this.size - 1) {
      return 0;
    }

    // 四个角的高度
    const h00 = this.heightData[iz][ix];
    const h10 = this.heightData[iz][ix + 1];
    const h01 = this.heightData[iz + 1][ix];
    const h11 = this.heightData[iz + 1][ix + 1];

    // 双线性插值
    const h = lerp(
      lerp(h00, h10, fx),
      lerp(h01, h11, fx),
      fz
    );

    return h * this.heightScale;
  }

  // ═══════════════════════════════════════════════
  // 可通行性查询
  // ═══════════════════════════════════════════════

  /**
   * 查询某个格子是否可通行
   * @param {number} gx - 网格X坐标
   * @param {number} gz - 网格Z坐标
   * @returns {boolean} true=可通行
   */
  isWalkable(gx, gz) {
    if (!this.walkableGrid) return false;
    if (gx < 0 || gx >= this.size || gz < 0 || gz >= this.size) return false;
    return this.walkableGrid[gz][gx] === 1;
  }

  /**
   * 标记某个格子为不可通行（建筑放置时调用）
   * @param {number} gx - 网格X坐标
   * @param {number} gz - 网格Z坐标
   */
  setUnwalkable(gx, gz) {
    if (!this.walkableGrid) return;
    if (gx < 0 || gx >= this.size || gz < 0 || gz >= this.size) return;
    this.walkableGrid[gz][gx] = 0;
  }

  /**
   * 标记某个格子为可通行（建筑拆除时调用）
   * @param {number} gx - 网格X坐标
   * @param {number} gz - 网格Z坐标
   */
  setWalkable(gx, gz) {
    if (!this.walkableGrid) return;
    if (gx < 0 || gx >= this.size || gz < 0 || gz >= this.size) return;
    this.walkableGrid[gz][gx] = 1;
  }

  /**
   * 批量标记区域为不可通行（建筑占地范围）
   * @param {number} gx - 网格X起始坐标
   * @param {number} gz - 网格Z起始坐标
   * @param {number} w - 宽度（格子数）
   * @param {number} h - 高度（格子数）
   */
  setAreaUnwalkable(gx, gz, w, h) {
    for (let dz = 0; dz < h; dz++) {
      for (let dx = 0; dx < w; dx++) {
        this.setUnwalkable(gx + dx, gz + dz);
      }
    }
  }

  /**
   * 批量标记区域为可通行
   * @param {number} gx - 网格X起始坐标
   * @param {number} gz - 网格Z起始坐标
   * @param {number} w - 宽度
   * @param {number} h - 高度
   */
  setAreaWalkable(gx, gz, w, h) {
    for (let dz = 0; dz < h; dz++) {
      for (let dx = 0; dx < w; dx++) {
        this.setWalkable(gx + dx, gz + dz);
      }
    }
  }

  /**
   * 获取地形网格的Three.js对象
   * @returns {THREE.Mesh}
   */
  getMesh() {
    return this.terrainMesh;
  }

  /**
   * 获取水面网格
   * @returns {THREE.Mesh}
   */
  getWaterMesh() {
    return this.waterMesh;
  }

  /**
   * 资源释放
   */
  dispose() {
    if (this.terrainMesh) {
      this.terrainMesh.geometry.dispose();
      this.terrainMesh.material.dispose();
      this.scene.remove(this.terrainMesh);
    }
    if (this.waterMesh) {
      this.waterMesh.geometry.dispose();
      this.waterMesh.material.dispose();
      this.scene.remove(this.waterMesh);
    }
    console.log('[Terrain] 已销毁');
  }
}

export default Terrain;
