// ═══════════════════════════════════════════
// StarCraft Web - 游戏主循环管理器 (GameManager)
// 负责初始化场景、启动主循环、协调所有子系统
// ═══════════════════════════════════════════

import { GAME, EVENTS } from '../shared/Constants.js';
import { eventBus } from '../shared/EventBus.js';
import ResourceManager from './ResourceManager.js';
import BuildingSystem from './BuildingSystem.js';
import CombatSystem from './CombatSystem.js';
import TechTree from './TechTree.js';

export default class GameManager {
  constructor() {
    // ─── 游戏状态 ────────────────────────
    /** @type {boolean} 游戏是否正在运行 */
    this.running = false;
    /** @type {boolean} 游戏是否暂停 */
    this.paused = false;
    /** @type {string} 玩家选择的种族 */
    this.playerRace = null;
    /** @type {number} 当前帧的时间戳 */
    this.lastTimestamp = 0;
    /** @type {number} requestAnimationFrame的ID，用于取消 */
    this.rafId = null;
    /** @type {number} 累计的游戏时间（tick数） */
    this.gameTickTime = 0;
    /** @type {number} 帧率计算用 - 帧计数器 */
    this.frameCount = 0;
    /** @type {number} 帧率计算用 - 上次FPS更新时间 */
    this.fpsLastTime = 0;
    /** @type {number} 当前FPS */
    this.fps = 0;

    // ─── 实体数组 ────────────────────────
    /** @type {Array} 所有存活单位 */
    this.units = [];
    /** @type {Array} 所有存活建筑 */
    this.buildings = [];
    /** @type {Array} 所有活跃弹道/投射物 */
    this.projectiles = [];
    /** @type {Array} 粒子特效队列 */
    this.particles = [];

    // ─── 单位ID分配器 ────────────────────
    /** @type {number} 下一个可用的单位/建筑ID */
    this.nextUnitId = 1;

    // ─── 子系统引用 ──────────────────────
    /** @type {ResourceManager} 资源管理器 */
    this.resourceManager = new ResourceManager(this);
    /** @type {BuildingSystem} 建筑系统 */
    this.buildingSystem = new BuildingSystem(this);
    /** @type {CombatSystem} 战斗系统 */
    this.combatSystem = new CombatSystem(this);
    /** @type {TechTree} 科技树 */
    this.techTree = new TechTree(this);

    // ─── 渲染器引用（由引擎层注入） ────
    /** @type {Object|null} Three.js场景 */
    this.scene = null;
    /** @type {Object|null} Three.js渲染器 */
    this.renderer = null;
    /** @type {Object|null} RTS摄像机 */
    this.camera = null;

    // ─── Vue3响应式状态引用（由main.js注入） ──
    /** @type {Object|null} */
    this.gameState = null;
  }

  // ═══════════════════════════════════════
  // 初始化
  // ═══════════════════════════════════════

  /**
   * 初始化游戏场景
   * @param {HTMLCanvasElement} canvas - 渲染画布
   * @param {string} playerRace - 玩家种族 ('terran' | 'zerg' | 'protoss')
   */
  async init(canvas, playerRace, engineRefs = {}) {
    console.log(`[GameManager] 初始化游戏 - 种族: ${playerRace}`);
    this.playerRace = playerRace;

    // ─── 使用外部注入的引擎引用（来自main.js的引擎层） ──
    if (engineRefs.scene && engineRefs.renderer && engineRefs.camera) {
      this.scene = engineRefs.scene;
      this.renderer = engineRefs.renderer;
      this.camera = engineRefs.camera;
      console.log('[GameManager] 使用外部引擎引用');
    } else {
      // ─── 初始化Three.js（延迟加载，避免非浏览器环境报错） ──
      try {
        const THREE = await import('three');

        // 创建场景
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a2e);

        // 创建渲染器
        this.renderer = new THREE.WebGLRenderer({
          canvas,
          antialias: true,
          alpha: false,
        });
        this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;

        // 创建RTS摄像机（正交投影）
        const aspect = canvas.clientWidth / canvas.clientHeight;
        const frustumSize = 30;
        this.camera = new THREE.OrthographicCamera(
          -frustumSize * aspect / 2,
          frustumSize * aspect / 2,
          frustumSize / 2,
          -frustumSize / 2,
          0.1,
          1000
        );
        this.camera.position.set(20, 30, 20);
        this.camera.lookAt(0, 0, 0);

        // 环境光照
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        // 平行光（模拟太阳）
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(50, 80, 30);
        dirLight.castShadow = true;
        this.scene.add(dirLight);

        // 简易地面网格
        const gridHelper = new THREE.GridHelper(GAME.MAP_SIZE, GAME.MAP_SIZE, 0x444444, 0x222222);
        this.scene.add(gridHelper);

        // 地面平面
        const groundGeom = new THREE.PlaneGeometry(GAME.MAP_SIZE, GAME.MAP_SIZE);
        const groundMat = new THREE.MeshLambertMaterial({ color: 0x2d5a1b });
        const ground = new THREE.Mesh(groundGeom, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.01;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // 窗口大小自适应
        window.addEventListener('resize', () => this._onResize(canvas));

        console.log('[GameManager] Three.js场景初始化完成');
      } catch (err) {
        console.warn('[GameManager] Three.js未安装，以纯逻辑模式运行:', err.message);
      }
    }

    // ─── 初始化子系统 ──────────────────
    this.resourceManager.init();
    this.buildingSystem.init();
    this.techTree.init();
    this.combatSystem.init();

    // ─── 监听事件 ─────────────────────
    eventBus.on(EVENTS.UNIT_DIED, (data) => this._onUnitDied(data));
    eventBus.on(EVENTS.BUILD_COMPLETE, (data) => this._onBuildingComplete(data));

    // 发射初始化完成事件
    eventBus.emit(EVENTS.GAME_START, { race: playerRace });
    console.log('[GameManager] 所有子系统初始化完成');
  }

  // ═══════════════════════════════════════
  // 游戏流程控制
  // ═══════════════════════════════════════

  /**
   * 启动游戏主循环
   */
  start() {
    if (this.running) return;
    this.running = true;
    this.paused = false;
    this.lastTimestamp = performance.now();
    this.fpsLastTime = this.lastTimestamp;
    this.frameCount = 0;

    console.log('[GameManager] 游戏开始');
    eventBus.emit(EVENTS.GAME_START, { race: this.playerRace });

    // 启动requestAnimationFrame循环
    this.gameLoop(this.lastTimestamp);
  }

  /**
   * 暂停游戏
   */
  pause() {
    if (!this.running || this.paused) return;
    this.paused = true;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    console.log('[GameManager] 游戏暂停');
    eventBus.emit(EVENTS.GAME_PAUSE, {});
  }

  /**
   * 恢复游戏
   */
  resume() {
    if (!this.running || !this.paused) return;
    this.paused = false;
    this.lastTimestamp = performance.now();
    console.log('[GameManager] 游戏恢复');
    eventBus.emit(EVENTS.GAME_RESUME, {});
    this.gameLoop(this.lastTimestamp);
  }

  /**
   * 重置游戏到初始状态
   */
  reset() {
    // 停止主循环
    this.running = false;
    this.paused = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    // 清空实体
    this.units = [];
    this.buildings = [];
    this.projectiles = [];
    this.particles = [];
    this.nextUnitId = 1;
    this.gameTickTime = 0;

    // 重置子系统
    this.resourceManager.reset();
    this.buildingSystem.reset();
    this.combatSystem.reset();
    this.techTree.reset();

    // 清除事件监听
    eventBus.clearAll();

    console.log('[GameManager] 游戏已重置');
  }

  // ═══════════════════════════════════════
  // 主循环
  // ═══════════════════════════════════════

  /**
   * requestAnimationFrame 主循环
   * 计算帧间隔时间deltaTime，分发游戏tick
   * @param {number} timestamp - 当前帧时间戳（由RAF传入）
   */
  gameLoop(timestamp) {
    // 保存RAF ID以便暂停时取消
    this.rafId = requestAnimationFrame((t) => this.gameLoop(t));

    // 计算deltaTime（秒），限制最大值防止跳帧
    const rawDt = (timestamp - this.lastTimestamp) / 1000;
    const dt = Math.min(rawDt, 0.1); // 最大100ms，防止Tab切换后巨大deltaTime
    this.lastTimestamp = timestamp;

    // ─── FPS计算 ──────────────────────
    this.frameCount++;
    if (timestamp - this.fpsLastTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.fpsLastTime = timestamp;
    }

    // ─── 暂停时跳过逻辑更新，但允许渲染 ──
    if (!this.paused) {
      this.update(dt);
    }

    // ─── 渲染（即使暂停也渲染，保持画面） ──
    this._render();

    // ─── 发射tick事件 ─────────────────
    eventBus.emit(EVENTS.TICK, {
      dt,
      time: this.gameTickTime,
      fps: this.fps,
      tick: Math.floor(this.gameTickTime),
    });
  }

  /**
   * 游戏逻辑更新（每帧调用）
   * 按SC1固定tick率累积时间，达到一个tick则执行一次逻辑更新
   * @param {number} delta - 帧间隔时间（秒）
   */
  update(delta) {
    // SC1使用24tick/秒的固定逻辑帧率
    // 将实际时间转换为游戏tick
    const tickInterval = 1 / GAME.TICK_RATE;
    this._tickAccumulator = (this._tickAccumulator || 0) + delta;

    // 固定步长更新：确保逻辑帧率恒定
    while (this._tickAccumulator >= tickInterval) {
      this._tickAccumulator -= tickInterval;
      this._fixedUpdate(tickInterval);
    }
  }

  /**
   * 固定步长逻辑更新（一个游戏tick）
   * 按顺序调用各子系统：资源→建造→生产→科技→AI→战斗→粒子
   * @param {number} dt - 固定tick间隔（秒）
   */
  _fixedUpdate(dt) {
    this.gameTickTime += GAME.TICK_RATE * dt; // 累积tick数

    // 1. 资源采集结算
    this.resourceManager.update(dt);

    // 2. 建造进度推进
    this.buildingSystem.update(dt);

    // 3. 单位生产队列（预留给UnitProducer模块）
    // this.unitProducer.update(dt);

    // 4. 科技研发进度
    this.techTree.update(dt);

    // 5. AI决策（每4帧执行一次，降低性能消耗）
    const tick = Math.floor(this.gameTickTime);
    if (tick % 4 === 0) {
      // this.aiController.update(dt);
    }

    // 6. 寻路更新（预留给Pathfinding模块）
    // this.pathfinding.update(dt);

    // 7. 战斗计算
    this.combatSystem.update(dt);

    // 8. 弹道/投射物更新
    this._updateProjectiles(dt);

    // 9. 粒子特效更新
    this._updateParticles(dt);

    // 10. 清理已死亡实体
    this._cleanupEntities();
  }

  // ═══════════════════════════════════════
  // 实体管理
  // ═══════════════════════════════════════

  /**
   * 创建单位实例
   * @param {Object} unitDef - 单位定义（从种族数据中获取）
   * @param {Object} position - 位置 {x, y, z}
   * @param {number} team - 队伍编号 (1-8)
   * @returns {Object} 创建的单位实例
   */
  spawnUnit(unitDef, position, team) {
    const unit = {
      id: this.nextUnitId++,
      // ── 基本属性 ──
      type: unitDef.id,
      name: unitDef.name,
      race: unitDef.race,
      team,
      // ── 位置与移动 ──
      position: { ...position },
      targetPosition: null,      // 移动目标点
      velocity: { x: 0, y: 0, z: 0 },
      facing: 0,                  // 朝向角度（弧度）
      // ── 生命值 ──
      hp: unitDef.hp,
      maxHp: unitDef.hp,
      shield: unitDef.shield || 0,
      maxShield: unitDef.shield || 0,
      armor: unitDef.armor || 0,
      // ── 战斗属性 ──
      attack: unitDef.attack ? { ...unitDef.attack } : null,
      attackCooldown: 0,          // 当前攻击冷却（秒）
      attackTarget: null,         // 当前攻击目标ID
      // ── 状态标记 ──
      alive: true,
      selected: false,
      speed: unitDef.speed || 2,
      // ── 命令队列 ──
      commandQueue: [],           // shift排队的命令
      currentCommand: null,       // 当前正在执行的命令
      // ── 生产属性 ──
      buildTime: unitDef.buildTime || 24,
      // ── 技能 ──
      abilities: unitDef.abilities || [],
      // ── 3D模型引用 ──
      mesh: null,                 // 由渲染层设置
      // ── 体型（影响伤害计算） ──
      unitSize: unitDef.unitSize || 'medium',
    };

    this.units.push(unit);
    eventBus.emit(EVENTS.UNIT_CREATED, { unit, team });
    console.log(`[GameManager] 生成单位: ${unitDef.name} (队伍${team}, ID:${unit.id})`);
    return unit;
  }

  /**
   * 创建建筑实例
   * @param {Object} buildingDef - 建筑定义
   * @param {Object} position - 位置 {x, y, z}
   * @param {number} team - 队伍编号
   * @returns {Object} 创建的建筑实例
   */
  spawnBuilding(buildingDef, position, team) {
    const building = {
      id: this.nextUnitId++,
      // ── 基本属性 ──
      type: buildingDef.id,
      name: buildingDef.name,
      race: buildingDef.race,
      team,
      // ── 位置与尺寸 ──
      position: { ...position },
      size: buildingDef.size || { w: 2, h: 2 }, // 占地格数
      // ── 生命值 ──
      hp: buildingDef.hp,
      maxHp: buildingDef.hp,
      shield: buildingDef.shield || 0,
      maxShield: buildingDef.shield || 0,
      armor: buildingDef.armor || 0,
      // ── 建造状态 ──
      buildProgress: 0,           // 建造进度 0~1
      isComplete: false,          // 是否建造完成
      isBuilding: true,           // 是否正在建造中
      // ── 功能属性 ──
      producesUnits: buildingDef.producesUnits || [], // 可生产单位类型
      providesSupply: buildingDef.providesSupply || 0, // 提供人口
      canResearch: buildingDef.canResearch || [],       // 可研究科技
      // ── 状态 ──
      alive: true,
      selected: false,
      // ── 3D模型引用 ──
      mesh: null,
      // ── 产卵地（虫族） ──
      requiresCreep: buildingDef.requiresCreep || false,
      hasCreep: false,
    };

    this.buildings.push(building);
    eventBus.emit(EVENTS.BUILD_START, { building, team });
    console.log(`[GameManager] 放置建筑: ${buildingDef.name} (队伍${team}, ID:${building.id})`);
    return building;
  }

  /**
   * 获取指定圆形范围内的所有单位
   * @param {Object} pos - 中心点 {x, y, z}
   * @param {number} radius - 搜索半径
   * @param {number} [teamFilter] - 可选：仅返回指定队伍的单位
   * @returns {Array} 范围内的单位数组
   */
  getUnitsInRadius(pos, radius, teamFilter = null) {
    const radiusSq = radius * radius; // 避免每帧开方，用平方比较
    const result = [];

    for (let i = 0; i < this.units.length; i++) {
      const unit = this.units[i];
      if (!unit.alive) continue;
      if (teamFilter !== null && unit.team !== teamFilter) continue;

      const dx = unit.position.x - pos.x;
      const dz = unit.position.z - pos.z;
      const distSq = dx * dx + dz * dz;

      if (distSq <= radiusSq) {
        result.push(unit);
      }
    }

    return result;
  }

  /**
   * 根据ID获取单位
   * @param {number} unitId
   * @returns {Object|null}
   */
  getUnitById(unitId) {
    return this.units.find(u => u.id === unitId && u.alive) || null;
  }

  /**
   * 根据ID获取建筑
   * @param {number} buildingId
   * @returns {Object|null}
   */
  getBuildingById(buildingId) {
    return this.buildings.find(b => b.id === buildingId && b.alive) || null;
  }

  // ═══════════════════════════════════════
  // 投射物与粒子
  // ═══════════════════════════════════════

  /**
   * 发射投射物（导弹、子弹等）
   * @param {Object} config - 投射物配置
   */
  spawnProjectile(config) {
    const projectile = {
      id: this.nextUnitId++,
      position: { ...config.origin },
      target: config.target,           // 目标单位ID
      targetPosition: { ...config.targetPosition },
      speed: config.speed || 10,
      damage: config.damage || 0,
      attackType: config.attackType || 'normal',
      team: config.team,
      alive: true,
      mesh: null,
      trail: [],                       // 轨迹点
      maxLifetime: config.maxLifetime || 3, // 最大存活秒数
      lifetime: 0,
    };

    this.projectiles.push(projectile);
    eventBus.emit(EVENTS.PROJECTILE_FIRED, projectile);
    return projectile;
  }

  /**
   * 更新所有投射物位置
   * @param {number} dt - 帧间隔
   */
  _updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      if (!proj.alive) continue;

      proj.lifetime += dt;
      if (proj.lifetime >= proj.maxLifetime) {
        proj.alive = false;
        continue;
      }

      // 追踪目标或飞向目标点
      let targetPos = proj.targetPosition;
      if (proj.target) {
        const targetUnit = this.getUnitById(proj.target);
        if (targetUnit && targetUnit.alive) {
          targetPos = targetUnit.position;
          proj.targetPosition = { ...targetPos };
        }
      }

      // 朝目标移动
      const dx = targetPos.x - proj.position.x;
      const dy = (targetPos.y || 0) - (proj.position.y || 0);
      const dz = targetPos.z - proj.position.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist < 0.5) {
        // 命中目标
        proj.alive = false;
        if (proj.target) {
          const targetUnit = this.getUnitById(proj.target);
          if (targetUnit && targetUnit.alive) {
            this.combatSystem.applyDamage(targetUnit, proj.damage, proj.attackType);
          }
        }
      } else {
        // 移动投射物
        const moveSpeed = proj.speed * dt;
        proj.position.x += (dx / dist) * moveSpeed;
        proj.position.y += (dy / dist) * moveSpeed;
        proj.position.z += (dz / dist) * moveSpeed;

        // 记录轨迹
        proj.trail.push({ ...proj.position });
        if (proj.trail.length > 20) proj.trail.shift();
      }
    }
  }

  /**
   * 更新所有粒子特效
   * @param {number} dt
   */
  _updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.lifetime += dt;
      p.alpha = 1 - (p.lifetime / p.maxLifetime);
      p.position.x += p.velocity.x * dt;
      p.position.y += p.velocity.y * dt;
      p.position.z += p.velocity.z * dt;

      if (p.lifetime >= p.maxLifetime) {
        this.particles.splice(i, 1);
      }
    }
  }

  /**
   * 创建爆炸粒子特效
   * @param {Object} position - 位置
   * @param {number} count - 粒子数量
   * @param {number} color - 颜色（十六进制）
   */
  spawnExplosion(position, count = 20, color = 0xff6600) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      this.particles.push({
        position: { ...position },
        velocity: {
          x: Math.cos(angle) * speed,
          y: 2 + Math.random() * 4,
          z: Math.sin(angle) * speed,
        },
        color,
        size: 0.1 + Math.random() * 0.3,
        lifetime: 0,
        maxLifetime: 0.5 + Math.random() * 1.0,
        alpha: 1,
      });
    }
  }

  // ═══════════════════════════════════════
  // 内部方法
  // ═══════════════════════════════════════

  /**
   * 清理已死亡的实体（从数组中移除）
   */
  _cleanupEntities() {
    // 清理死亡单位
    this.units = this.units.filter(u => u.alive);
    // 清理死亡建筑
    this.buildings = this.buildings.filter(b => b.alive);
    // 清理已消失的投射物
    this.projectiles = this.projectiles.filter(p => p.alive);
  }

  /**
   * 单位死亡事件处理
   * @param {Object} data - { unit }
   */
  _onUnitDied(data) {
    const { unit } = data;
    unit.alive = false;
    unit.selected = false;
    console.log(`[GameManager] 单位死亡: ${unit.name} (ID:${unit.id})`);

    // 产生死亡特效
    this.spawnExplosion(unit.position, 15, 0xff0000);

    // 从3D场景中移除模型
    if (unit.mesh && this.scene) {
      this.scene.remove(unit.mesh);
    }

    // 释放人口
    this.resourceManager.releaseSupply(unit.team, 1);
  }

  /**
   * 建筑建造完成事件处理
   * @param {Object} data - { building }
   */
  _onBuildingComplete(data) {
    const { building } = data;
    console.log(`[GameManager] 建筑完成: ${building.name} (ID:${building.id})`);

    // 提供人口
    if (building.providesSupply > 0) {
      this.resourceManager.addSupplyMax(building.team, building.providesSupply);
    }
  }

  /**
   * 渲染一帧
   */
  _render() {
    if (!this.renderer || !this.scene || !this.camera) return;
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * 窗口大小变化处理
   * @param {HTMLCanvasElement} canvas
   */
  _onResize(canvas) {
    if (!this.renderer || !this.camera) return;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    this.renderer.setSize(width, height);

    // 更新正交摄像机
    const aspect = width / height;
    const frustumSize = 30;
    this.camera.left = -frustumSize * aspect / 2;
    this.camera.right = frustumSize * aspect / 2;
    this.camera.top = frustumSize / 2;
    this.camera.bottom = -frustumSize / 2;
    this.camera.updateProjectionMatrix();
  }
}
