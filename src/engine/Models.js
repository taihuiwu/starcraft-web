// ═══════════════════════════════════════════════════════════════
// StarCraft Web - 3D模型管理系统
// 模型加载 / 占位几何体 / InstancedMesh批量渲染 / 队伍颜色 / 选中高亮
// ═══════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { TEAM_COLORS } from '../shared/Constants.js';

// ═══════════════════════════════════════════════
// glTF加载器（延迟加载，避免硬依赖）
// ═══════════════════════════════════════════════

/**
 * 动态加载GLTFLoader
 * @returns {Promise<{GLTFLoader: Function}>}
 */
async function getGLTFLoader() {
  const module = await import('three/examples/jsm/loaders/GLTFLoader.js');
  return module.GLTFLoader;
}

/**
 * 动态加载RGBELoader（HDR环境贴图）
 * @returns {Promise<{RGBELoader: Function}>}
 */
async function getRGBELoader() {
  const module = await import('three/examples/jsm/loaders/RGBELoader.js');
  return module.RGBELoader;
}

// ═══════════════════════════════════════════════
// 模型管理器主类
// ═══════════════════════════════════════════════

/**
 * 3D模型管理器
 * 负责加载、缓存、实例化管理所有3D模型
 */
export class ModelManager {
  constructor() {
    /** @type {Map<string, THREE.Group>} 已加载模型缓存（URL → Group） */
    this._modelCache = new Map();

    /** @type {Map<string, InstancedMeshPool>} 实例化渲染池 */
    this._instancedPools = new Map();

    /** @type {THREE.GLTFLoader|null} glTF加载器实例 */
    this._gltfLoader = null;

    /** @type {Set<THREE.Mesh>} 当前高亮选中的Mesh */
    this._highlightedMeshes = new Set();

    console.log('[ModelManager] 模型管理器初始化完成');
  }

  // ═══════════════════════════════════════════════
  // glTF 模型加载
  // ═══════════════════════════════════════════════

  /**
   * 从URL加载glTF/GLB模型
   * @param {string} url - 模型文件路径
   * @returns {Promise<THREE.Group>} 加载完成的模型Group
   */
  async loadModel(url) {
    // 检查缓存
    if (this._modelCache.has(url)) {
      console.log('[ModelManager] 从缓存加载:', url);
      return this._modelCache.get(url).clone();
    }

    // 延迟初始化加载器
    if (!this._gltfLoader) {
      const GLTFLoader = await getGLTFLoader();
      this._gltfLoader = new GLTFLoader();
    }

    console.log('[ModelManager] 开始加载模型:', url);

    return new Promise((resolve, reject) => {
      this._gltfLoader.load(
        url,
        (gltf) => {
          const model = gltf.scene;

          // 启用阴影
          model.traverse((obj) => {
            if (obj.isMesh) {
              obj.castShadow = true;
              obj.receiveShadow = true;
            }
          });

          // 缓存原始模型
          this._modelCache.set(url, model);

          // 返回克隆副本（避免修改原始缓存）
          resolve(model.clone());
        },
        (progress) => {
          // 加载进度（可选：触发事件）
          // console.log(`加载进度: ${(progress.loaded / progress.total * 100).toFixed(1)}%`);
        },
        (error) => {
          console.error('[ModelManager] 模型加载失败:', url, error);
          reject(error);
        }
      );
    });
  }

  // ═══════════════════════════════════════════════
  // 占位模型生成（开发阶段替代真实模型）
  // ═══════════════════════════════════════════════

  /**
   * 根据单位类型创建占位几何体模型
   * 使用简单的几何体组合，不同单位用不同颜色/形状区分
   *
   * @param {string} unitType - 单位类型标识
   *   - 'tank': 坦克 = 绿色底盘 + 炮管
   *   - 'marine': 步兵 = 小方块身体 + 球形头
   *   - 'building': 建筑 = 大方块组合
   *   - 'worker': 工人 = 小方块 + 钻头
   *   - 'aircraft': 飞行器 = 扁平三角 + 机翼
   * @param {number} [teamId=1] - 队伍ID（影响颜色）
   * @returns {THREE.Group} 生成的占位模型Group
   */
  createPlaceholderModel(unitType, teamId = 1) {
    const group = new THREE.Group();
    group.userData.unitType = unitType;

    const teamColor = TEAM_COLORS[teamId] || TEAM_COLORS[1];

    switch (unitType) {
      case 'tank':
        this._createTankPlaceholder(group, teamColor);
        break;

      case 'marine':
      case 'marine_medic':
      case 'firebat':
      case 'ghost':
        this._createInfantryPlaceholder(group, teamColor);
        break;

      case 'building':
      case 'command_center':
      case 'barracks':
      case 'factory':
      case 'starport':
        this._createBuildingPlaceholder(group, teamColor);
        break;

      case 'worker':
      case 'scv':
      case 'drone':
        this._createWorkerPlaceholder(group, teamColor);
        break;

      case 'aircraft':
      case 'wraith':
      case 'valkyrie':
      case 'battlecruiser':
        this._createAircraftPlaceholder(group, teamColor);
        break;

      default:
        // 默认：简单方块
        this._createGenericPlaceholder(group, teamColor);
        break;
    }

    return group;
  }

  /**
   * 创建坦克占位模型
   * 底盘(Box) + 炮塔(Box) + 炮管(Cylinder)
   * @private
   */
  _createTankPlaceholder(group, color) {
    // 底盘（扁平绿色方块）
    const bodyGeo = new THREE.BoxGeometry(1.2, 0.4, 0.8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3a7a3a });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.3;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // 履带（两个深灰色长方体）
    const trackGeo = new THREE.BoxGeometry(1.3, 0.25, 0.2);
    const trackMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const trackL = new THREE.Mesh(trackGeo, trackMat);
    trackL.position.set(0, 0.12, -0.35);
    group.add(trackL);
    const trackR = trackL.clone();
    trackR.position.z = 0.35;
    group.add(trackR);

    // 炮塔（小方块在底盘上方）
    const turretGeo = new THREE.BoxGeometry(0.5, 0.25, 0.5);
    const turretMat = new THREE.MeshStandardMaterial({ color: 0x4a8a4a });
    const turret = new THREE.Mesh(turretGeo, turretMat);
    turret.position.y = 0.625;
    turret.castShadow = true;
    group.add(turret);

    // 炮管（圆柱体）
    const barrelGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.8, 8);
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const barrel = new THREE.Mesh(barrelGeo, barrelMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.625, 0.65);
    barrel.castShadow = true;
    group.add(barrel);

    // 队伍色标记条
    this._addTeamStripe(group, color, 1.0);
  }

  /**
   * 创建步兵占位模型
   * 身体(Box) + 头(Sphere) + 腿(Cylinder x2)
   * @private
   */
  _createInfantryPlaceholder(group, color) {
    // 身体（小方块）
    const bodyGeo = new THREE.BoxGeometry(0.3, 0.4, 0.2);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x888888 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.5;
    body.castShadow = true;
    group.add(body);

    // 头（球体）
    const headGeo = new THREE.SphereGeometry(0.12, 8, 8);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xddccaa }); // 皮肤色
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 0.82;
    head.castShadow = true;
    group.add(head);

    // 头盔（半球体）
    const helmetGeo = new THREE.SphereGeometry(0.14, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2);
    const helmetMat = new THREE.MeshStandardMaterial({ color: 0x446644 });
    const helmet = new THREE.Mesh(helmetGeo, helmetMat);
    helmet.position.y = 0.86;
    group.add(helmet);

    // 左腿
    const legGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.35, 6);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x555555 });
    const legL = new THREE.Mesh(legGeo, legMat);
    legL.position.set(-0.08, 0.18, 0);
    group.add(legL);
    const legR = legL.clone();
    legR.position.x = 0.08;
    group.add(legR);

    // 步枪（简单的长条）
    const gunGeo = new THREE.BoxGeometry(0.04, 0.04, 0.4);
    const gunMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const gun = new THREE.Mesh(gunGeo, gunMat);
    gun.position.set(0.2, 0.45, 0.15);
    group.add(gun);

    // 队伍色标记
    this._addTeamStripe(group, color, 0.7);
  }

  /**
   * 创建建筑占位模型
   * 大方块主体 + 侧面结构 + 天线
   * @private
   */
  _createBuildingPlaceholder(group, color) {
    // 主体建筑
    const mainGeo = new THREE.BoxGeometry(2.0, 1.5, 2.0);
    const mainMat = new THREE.MeshStandardMaterial({ color: 0x667788 });
    const main = new THREE.Mesh(mainGeo, mainMat);
    main.position.y = 0.75;
    main.castShadow = true;
    main.receiveShadow = true;
    group.add(main);

    // 屋顶（扁平块）
    const roofGeo = new THREE.BoxGeometry(2.2, 0.15, 2.2);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x556677 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 1.55;
    group.add(roof);

    // 侧面突出结构（类似机库/车间）
    const sideGeo = new THREE.BoxGeometry(0.8, 1.0, 1.5);
    const sideMat = new THREE.MeshStandardMaterial({ color: 0x778899 });
    const side = new THREE.Mesh(sideGeo, sideMat);
    side.position.set(1.3, 0.5, 0);
    side.castShadow = true;
    group.add(side);

    // 天线/烟囱
    const antennaGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.2, 6);
    const antennaMat = new THREE.MeshStandardMaterial({ color: 0x999999 });
    const antenna = new THREE.Mesh(antennaGeo, antennaMat);
    antenna.position.set(-0.7, 2.1, -0.7);
    group.add(antenna);

    // 队伍色涂装（大范围标记）
    this._addTeamStripe(group, color, 2.0);
  }

  /**
   * 创建工人单位占位模型
   * 小方块 + 机械臂
   * @private
   */
  _createWorkerPlaceholder(group, color) {
    // 身体
    const bodyGeo = new THREE.BoxGeometry(0.25, 0.3, 0.2);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x8899aa });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.35;
    body.castShadow = true;
    group.add(body);

    // 头部
    const headGeo = new THREE.SphereGeometry(0.08, 6, 6);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xddccaa });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 0.6;
    group.add(head);

    // 钻头/工具臂
    const armGeo = new THREE.CylinderGeometry(0.02, 0.04, 0.3, 6);
    const armMat = new THREE.MeshStandardMaterial({ color: 0x555555 });
    const arm = new THREE.Mesh(armGeo, armMat);
    arm.rotation.z = Math.PI / 3;
    arm.position.set(0.2, 0.4, 0);
    group.add(arm);

    // 履带底座
    const baseGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.1, 8);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.1;
    group.add(base);

    // 队伍色标记
    this._addTeamStripe(group, color, 0.5);
  }

  /**
   * 创建飞行器占位模型
   * 扁平三角形主体 + 机翼
   * @private
   */
  _createAircraftPlaceholder(group, color) {
    // 主体（锥形）
    const bodyGeo = new THREE.ConeGeometry(0.3, 1.2, 4);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x8899aa });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.rotation.x = -Math.PI / 2;
    body.castShadow = true;
    group.add(body);

    // 左机翼
    const wingGeo = new THREE.BoxGeometry(1.2, 0.04, 0.3);
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x778899 });
    const wingL = new THREE.Mesh(wingGeo, wingMat);
    wingL.position.set(-0.6, 0, 0.1);
    wingL.rotation.z = -0.1;
    group.add(wingL);

    // 右机翼
    const wingR = wingL.clone();
    wingR.position.x = 0.6;
    wingR.rotation.z = 0.1;
    group.add(wingR);

    // 尾翼
    const tailGeo = new THREE.BoxGeometry(0.04, 0.4, 0.3);
    const tail = new THREE.Mesh(tailGeo, wingMat);
    tail.position.set(0, 0.2, -0.5);
    group.add(tail);

    // 队伍色
    this._addTeamStripe(group, color, 0.8);
  }

  /**
   * 创建通用占位模型（默认颜色方块）
   * @private
   */
  _createGenericPlaceholder(group, color) {
    const geo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const mat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 0.25;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);

    this._addTeamStripe(group, color, 0.5);
  }

  /**
   * 在模型上添加队伍颜色标记条
   * @param {THREE.Group} group - 模型Group
   * @param {number} color - 队伍颜色（十六进制）
   * @param {number} scale - 标记条大小倍率
   * @private
   */
  _addTeamStripe(group, color, scale) {
    const geo = new THREE.BoxGeometry(0.08 * scale, 0.04, 0.5 * scale);
    const mat = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.3,
    });
    const stripe = new THREE.Mesh(geo, mat);
    stripe.position.y = 0.7;
    stripe.userData.isTeamColor = true; // 标记为队伍色部件
    group.add(stripe);
  }

  // ═══════════════════════════════════════════════
  // 队伍颜色
  // ═══════════════════════════════════════════════

  /**
   * 设置模型的队伍颜色
   * 遍历子对象，找到标记为 isTeamColor 的部件并替换颜色
   * @param {THREE.Object3D} model - 模型对象
   * @param {number} color - 颜色值（十六进制）
   */
  setTeamColor(model, color) {
    model.traverse((obj) => {
      if (obj.isMesh && obj.userData.isTeamColor) {
        obj.material.color.setHex(color);
        obj.material.emissive.setHex(color);
      }
    });
  }

  // ═══════════════════════════════════════════════
  // InstancedMesh 实例化渲染池
  // ═══════════════════════════════════════════════

  /**
   * 获取或创建同类单位的InstancedMesh池
   * 用于批量渲染大量相同类型单位（性能优化）
   *
   * @param {string} poolName - 池名称（如 'marine', 'tank'）
   * @param {THREE.BufferGeometry} geometry - 共享几何体
   * @param {THREE.Material} material - 共享材质
   * @param {number} [maxCount=500] - 最大实例数
   * @returns {InstancedMeshPool}
   */
  getOrCreatePool(poolName, geometry, material, maxCount = 500) {
    if (this._instancedPools.has(poolName)) {
      return this._instancedPools.get(poolName);
    }

    const pool = new InstancedMeshPool(poolName, geometry, material, maxCount);
    this._instancedPools.set(poolName, pool);

    console.log(`[ModelManager] 创建实例化池 "${poolName}" 最大数=${maxCount}`);
    return pool;
  }

  /**
   * 获取指定名称的实例化池
   * @param {string} poolName
   * @returns {InstancedMeshPool|null}
   */
  getPool(poolName) {
    return this._instancedPools.get(poolName) || null;
  }

  // ═══════════════════════════════════════════════
  // 选中高亮效果
  // ═══════════════════════════════════════════════

  /**
   * 为单位添加选中高亮效果
   * 通过添加一个略微放大的半透明轮廓（模拟发光边缘）
   *
   * @param {THREE.Object3D} mesh - 要高亮的Mesh/Group
   * @param {number} [highlightColor=0x00ff00] - 高亮颜色
   */
  highlightUnit(mesh, highlightColor = 0x00ff00) {
    // 防止重复高亮
    if (this._highlightedMeshes.has(mesh)) return;

    // 为每个子Mesh添加高亮轮廓
    const highlights = [];

    mesh.traverse((obj) => {
      if (obj.isMesh && obj.geometry) {
        // 创建轮廓Mesh（使用相同几何体，稍大一点）
        const outlineMat = new THREE.MeshBasicMaterial({
          color: highlightColor,
          transparent: true,
          opacity: 0.25,
          side: THREE.BackSide, // 渲染背面实现轮廓效果
          depthWrite: false,
        });

        const outline = new THREE.Mesh(obj.geometry.clone(), outlineMat);
        outline.scale.multiplyScalar(1.08); // 略微放大
        outline.position.copy(obj.position);
        outline.rotation.copy(obj.rotation);
        outline.userData._highlightOutline = true;

        mesh.add(outline);
        highlights.push(outline);
      }
    });

    // 在mesh上记录高亮信息（用于移除）
    mesh.userData._highlights = highlights;
    this._highlightedMeshes.add(mesh);
  }

  /**
   * 移除单位的选中高亮效果
   * @param {THREE.Object3D} mesh - 要取消高亮的Mesh/Group
   */
  unhighlightUnit(mesh) {
    if (!this._highlightedMeshes.has(mesh)) return;

    const highlights = mesh.userData._highlights || [];
    for (const outline of highlights) {
      if (outline.parent) outline.parent.remove(outline);
      outline.geometry.dispose();
      outline.material.dispose();
    }

    mesh.userData._highlights = [];
    this._highlightedMeshes.delete(mesh);
  }

  /**
   * 清除所有高亮
   */
  clearAllHighlights() {
    for (const mesh of [...this._highlightedMeshes]) {
      this.unhighlightUnit(mesh);
    }
  }

  // ═══════════════════════════════════════════════
  // 资源释放
  // ═══════════════════════════════════════════════

  /**
   * 释放所有已缓存的模型和实例化池
   */
  dispose() {
    // 清除模型缓存
    for (const [, model] of this._modelCache) {
      model.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
    }
    this._modelCache.clear();

    // 清除实例化池
    for (const [, pool] of this._instancedPools) {
      pool.dispose();
    }
    this._instancedPools.clear();

    // 清除高亮
    this.clearAllHighlights();

    console.log('[ModelManager] 已销毁');
  }
}

// ═══════════════════════════════════════════════
// InstancedMesh 实例化渲染池
// ═══════════════════════════════════════════════

/**
 * InstancedMesh 实例化渲染池
 * 管理同类单位的批量渲染，每个实例有独立的变换矩阵和颜色
 */
export class InstancedMeshPool {
  /**
   * @param {string} name - 池名称
   * @param {THREE.BufferGeometry} geometry - 共享几何体
   * @param {THREE.Material} material - 共享材质
   * @param {number} maxCount - 最大实例数
   */
  constructor(name, geometry, material, maxCount) {
    this.name = name;
    this.maxCount = maxCount;

    /** InstancedMesh 实例 */
    this.instancedMesh = new THREE.InstancedMesh(geometry, material, maxCount);
    this.instancedMesh.count = 0; // 初始无实例
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    /** 实例颜色（可选，用于队伍着色） */
    this.instancedMesh.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(maxCount * 3), 3
    );

    /** @type {Map<number, number>} entityId → instanceIndex 映射 */
    this._entityMap = new Map();

    /** 下一个可用的实例索引 */
    this._nextIndex = 0;

    // 临时变换对象（避免GC）
    this._dummy = new THREE.Object3D();
    this._color = new THREE.Color();

    console.log(`[InstancedMeshPool] "${name}" 创建, max=${maxCount}`);
  }

  /**
   * 添加一个实例
   * @param {number} entityId - 单位实体ID
   * @param {THREE.Vector3} position - 世界位置
   * @param {number} [rotation=0] - Y轴旋转（弧度）
   * @param {THREE.Vector3} [scale] - 缩放
   * @returns {number} 实例索引（-1表示池已满）
   */
  addInstance(entityId, position, rotation = 0, scale) {
    if (this._entityMap.has(entityId)) return this._entityMap.get(entityId);
    if (this._nextIndex >= this.maxCount) {
      console.warn(`[InstancedMeshPool] "${this.name}" 池已满!`);
      return -1;
    }

    const idx = this._nextIndex++;
    this._entityMap.set(entityId, idx);

    // 设置变换矩阵
    this._dummy.position.copy(position);
    this._dummy.rotation.y = rotation;
    if (scale) {
      this._dummy.scale.copy(scale);
    }
    this._dummy.updateMatrix();
    this.instancedMesh.setMatrixAt(idx, this._dummy.matrix);

    // 更新实例计数
    this.instancedMesh.count = this._nextIndex;
    this.instancedMesh.instanceMatrix.needsUpdate = true;

    return idx;
  }

  /**
   * 更新实例的位置和旋转
   * @param {number} entityId - 单位实体ID
   * @param {THREE.Vector3} position - 新位置
   * @param {number} [rotation=0] - 新旋转
   * @param {THREE.Vector3} [scale] - 新缩放
   */
  updateInstance(entityId, position, rotation = 0, scale) {
    const idx = this._entityMap.get(entityId);
    if (idx === undefined) return;

    this._dummy.position.copy(position);
    this._dummy.rotation.y = rotation;
    if (scale) {
      this._dummy.scale.copy(scale);
    }
    this._dummy.updateMatrix();
    this.instancedMesh.setMatrixAt(idx, this._dummy.matrix);
    this.instancedMesh.instanceMatrix.needsUpdate = true;
  }

  /**
   * 移除一个实例
   * 使用"交换删除"策略：将最后一个实例移到被删除的位置
   * @param {number} entityId - 单位实体ID
   */
  removeInstance(entityId) {
    const idx = this._entityMap.get(entityId);
    if (idx === undefined) return;

    // 如果不是最后一个，将最后一个移到这里
    const lastIdx = this._nextIndex - 1;
    if (idx !== lastIdx) {
      this.instancedMesh.copyMatrixAt(lastIdx, idx);

      // 更新被移动实例的映射
      for (const [eid, eidx] of this._entityMap) {
        if (eidx === lastIdx) {
          this._entityMap.set(eid, idx);
          break;
        }
      }
    }

    this._entityMap.delete(entityId);
    this._nextIndex--;
    this.instancedMesh.count = this._nextIndex;
    this.instancedMesh.instanceMatrix.needsUpdate = true;
  }

  /**
   * 设置实例颜色
   * @param {number} entityId - 单位实体ID
   * @param {number} color - 颜色值（十六进制）
   */
  setInstanceColor(entityId, color) {
    const idx = this._entityMap.get(entityId);
    if (idx === undefined) return;

    this._color.setHex(color);
    this.instancedMesh.setColorAt(idx, this._color);
    if (this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor.needsUpdate = true;
    }
  }

  /**
   * 获取当前实例数量
   * @returns {number}
   */
  getCount() {
    return this._nextIndex;
  }

  /**
   * 释放资源
   */
  dispose() {
    this.instancedMesh.geometry.dispose();
    this.instancedMesh.material.dispose();
    if (this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor = null;
    }
    this._entityMap.clear();
    console.log(`[InstancedMeshPool] "${this.name}" 已销毁`);
  }
}

export default ModelManager;
