// ═══════════════════════════════════════════════════════════════
// StarCraft Web - 粒子特效系统
// 爆炸/火焰/烟雾/激光/闪光/建造/护盾/治疗 等视觉特效
// ═══════════════════════════════════════════════════════════════

import * as THREE from 'three';

/**
 * 单个粒子特效实例
 * 封装一组粒子的创建、更新和销毁逻辑
 */
class ParticleEffect {
  /**
   * @param {THREE.Object3D} root - 粒子根对象
   * @param {Function} updateFn - 每帧更新回调 (effect, dt) => void
   * @param {number} duration - 特效持续时间（秒），0表示持续存在
   * @param {boolean} looping - 是否循环播放
   */
  constructor(root, updateFn, duration = 1.0, looping = false) {
    this.root = root;
    this._updateFn = updateFn;
    this.duration = duration;
    this.looping = looping;
    this.age = 0;          // 已存活时间
    this.alive = true;     // 是否存活
  }

  /**
   * 更新特效
   * @param {number} dt - 帧间隔（秒）
   */
  update(dt) {
    if (!this.alive) return;
    this.age += dt;
    // 调用具体特效的更新逻辑
    this._updateFn(this, dt);
    // 非循环特效超过生命周期则标记死亡
    if (!this.looping && this.age >= this.duration) {
      this.alive = false;
    }
  }
}

/**
 * 粒子特效系统
 * 管理所有活跃粒子特效的生命周期
 */
export class ParticleSystem {
  /**
   * @param {object} rendererInterface - 需要提供 addParticle/removeParticle 接口的对象
   */
  constructor(rendererInterface) {
    /** 粒子根对象容器（独立Scene中的根节点） */
    this._renderer = rendererInterface;

    /** @type {ParticleEffect[]} 所有活跃特效 */
    this._effects = [];

    // 重用的临时向量（避免GC）
    this._tmpVec3 = new THREE.Vector3();

    console.log('[ParticleSystem] 粒子系统初始化完成');
  }

  // ═══════════════════════════════════════════════
  // 特效工厂方法
  // ═══════════════════════════════════════════════

  /**
   * 爆炸特效：橙红色粒子向外扩散 + 烟雾粒子上升
   * @param {THREE.Vector3} position - 爆炸中心位置
   * @param {number} [size=1.0] - 爆炸规模
   * @returns {ParticleEffect} 特效实例
   */
  Explosion(position, size = 1.0) {
    const root = new THREE.Group();
    root.position.copy(position);

    const particleCount = Math.floor(80 * size);
    const spreadRadius = 3.0 * size;
    const lifetime = 1.0 + size * 0.3;

    // ─── 火焰粒子（橙红色向外扩散） ───
    const fireGeometry = new THREE.BufferGeometry();
    const firePositions = new Float32Array(particleCount * 3);
    const fireVelocities = new Float32Array(particleCount * 3); // 速度分量
    const fireColors = new Float32Array(particleCount * 3);
    const fireSizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      // 初始位置在中心
      firePositions[i * 3] = 0;
      firePositions[i * 3 + 1] = 0;
      firePositions[i * 3 + 2] = 0;

      // 随机扩散方向
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = (2 + Math.random() * 4) * size;
      fireVelocities[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
      fireVelocities[i * 3 + 1] = Math.abs(Math.cos(phi)) * speed * 1.5; // 向上偏多
      fireVelocities[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * speed;

      // 橙红色渐变
      const t = Math.random();
      fireColors[i * 3] = 1.0;                                  // R
      fireColors[i * 3 + 1] = lerp(0.2, 0.8, t);               // G
      fireColors[i * 3 + 2] = lerp(0.0, 0.1, t);               // B

      fireSizes[i] = (0.3 + Math.random() * 0.5) * size;
    }

    fireGeometry.setAttribute('position', new THREE.BufferAttribute(firePositions, 3));
    fireGeometry.setAttribute('color', new THREE.BufferAttribute(fireColors, 3));
    fireGeometry.setAttribute('size', new THREE.BufferAttribute(fireSizes, 1));

    const fireMaterial = new THREE.PointsMaterial({
      size: 0.5 * size,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    const firePoints = new THREE.Points(fireGeometry, fireMaterial);
    root.add(firePoints);

    // ─── 烟雾粒子（灰色上升） ───
    const smokeCount = Math.floor(30 * size);
    const smokeGeometry = new THREE.BufferGeometry();
    const smokePositions = new Float32Array(smokeCount * 3);
    const smokeVelocities = new Float32Array(smokeCount * 3);

    for (let i = 0; i < smokeCount; i++) {
      smokePositions[i * 3] = (Math.random() - 0.5) * 2 * size;
      smokePositions[i * 3 + 1] = Math.random() * 2;
      smokePositions[i * 3 + 2] = (Math.random() - 0.5) * 2 * size;

      smokeVelocities[i * 3] = (Math.random() - 0.5) * 0.5;
      smokeVelocities[i * 3 + 1] = 1 + Math.random() * 2;
      smokeVelocities[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
    }

    smokeGeometry.setAttribute('position', new THREE.BufferAttribute(smokePositions, 3));

    const smokeMaterial = new THREE.PointsMaterial({
      color: 0x555555,
      size: 1.0 * size,
      transparent: true,
      opacity: 0.6,
      blending: THREE.NormalBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    const smokePoints = new THREE.Points(smokeGeometry, smokeMaterial);
    root.add(smokePoints);

    this._renderer.addParticle(root);

    // 更新逻辑
    const effect = new ParticleEffect(root, (self, dt) => {
      const progress = self.age / self.duration;

      // 更新火焰粒子
      const fPos = fireGeometry.getAttribute('position');
      for (let i = 0; i < particleCount; i++) {
        fPos.array[i * 3] += fireVelocities[i * 3] * dt;
        fPos.array[i * 3 + 1] += fireVelocities[i * 3 + 1] * dt;
        fPos.array[i * 3 + 2] += fireVelocities[i * 3 + 2] * dt;
        // 减速（空气阻力）
        fireVelocities[i * 3] *= 0.98;
        fireVelocities[i * 3 + 1] *= 0.98;
        fireVelocities[i * 3 + 2] *= 0.98;
      }
      fPos.needsUpdate = true;
      fireMaterial.opacity = 1 - progress;
      fireMaterial.size = 0.5 * size * (1 - progress * 0.5);

      // 更新烟雾粒子
      const sPos = smokeGeometry.getAttribute('position');
      for (let i = 0; i < smokeCount; i++) {
        sPos.array[i * 3] += smokeVelocities[i * 3] * dt;
        sPos.array[i * 3 + 1] += smokeVelocities[i * 3 + 1] * dt;
        sPos.array[i * 3 + 2] += smokeVelocities[i * 3 + 2] * dt;
      }
      sPos.needsUpdate = true;
      smokeMaterial.opacity = 0.6 * (1 - progress);

    }, lifetime, false);

    this._effects.push(effect);
    return effect;
  }

  /**
   * 持续火焰特效
   * @param {THREE.Vector3} position - 火焰位置
   * @returns {ParticleEffect}
   */
  Fire(position) {
    const root = new THREE.Group();
    root.position.copy(position);

    const count = 40;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const lifetimes = new Float32Array(count); // 每个粒子的剩余生命
    const maxLifetimes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      this._initFireParticle(i, positions, velocities, lifetimes, maxLifetimes);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xff6600,
      size: 0.4,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    const points = new THREE.Points(geometry, material);
    root.add(points);
    this._renderer.addParticle(root);

    const effect = new ParticleEffect(root, (self, dt) => {
      const pos = geometry.getAttribute('position');
      for (let i = 0; i < count; i++) {
        lifetimes[i] -= dt;
        if (lifetimes[i] <= 0) {
          // 重置粒子
          this._initFireParticle(i, positions, velocities, lifetimes, maxLifetimes);
        } else {
          pos.array[i * 3] += velocities[i * 3] * dt;
          pos.array[i * 3 + 1] += velocities[i * 3 + 1] * dt;
          pos.array[i * 3 + 2] += velocities[i * 3 + 2] * dt;
        }
      }
      pos.needsUpdate = true;
    }, 0, true); // 持续循环

    this._effects.push(effect);
    return effect;
  }

  /**
   * 初始化单个火焰粒子的位置和速度
   * @private
   */
  _initFireParticle(i, positions, velocities, lifetimes, maxLifetimes) {
    positions[i * 3] = (Math.random() - 0.5) * 0.5;
    positions[i * 3 + 1] = Math.random() * 0.3;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 0.5;

    velocities[i * 3] = (Math.random() - 0.5) * 0.3;
    velocities[i * 3 + 1] = 1.5 + Math.random() * 2;
    velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.3;

    const life = 0.3 + Math.random() * 0.4;
    lifetimes[i] = life;
    maxLifetimes[i] = life;
  }

  /**
   * 烟雾特效（灰色粒子上升）
   * @param {THREE.Vector3} position - 烟雾位置
   * @returns {ParticleEffect}
   */
  Smoke(position) {
    const root = new THREE.Group();
    root.position.copy(position);

    const count = 30;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const lifetimes = new Float32Array(count);
    const maxLifetimes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      this._initSmokeParticle(i, positions, velocities, lifetimes, maxLifetimes);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x666666,
      size: 0.8,
      transparent: true,
      opacity: 0.5,
      blending: THREE.NormalBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    const points = new THREE.Points(geometry, material);
    root.add(points);
    this._renderer.addParticle(root);

    const effect = new ParticleEffect(root, (self, dt) => {
      const pos = geometry.getAttribute('position');
      for (let i = 0; i < count; i++) {
        lifetimes[i] -= dt;
        if (lifetimes[i] <= 0) {
          this._initSmokeParticle(i, positions, velocities, lifetimes, maxLifetimes);
        } else {
          pos.array[i * 3] += velocities[i * 3] * dt;
          pos.array[i * 3 + 1] += velocities[i * 3 + 1] * dt;
          pos.array[i * 3 + 2] += velocities[i * 3 + 2] * dt;
          // 减速扩散
          velocities[i * 3] *= 0.995;
          velocities[i * 3 + 2] *= 0.995;
        }
      }
      pos.needsUpdate = true;
    }, 0, true);

    this._effects.push(effect);
    return effect;
  }

  /** @private */
  _initSmokeParticle(i, positions, velocities, lifetimes, maxLifetimes) {
    positions[i * 3] = (Math.random() - 0.5) * 0.8;
    positions[i * 3 + 1] = Math.random() * 0.5;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 0.8;

    velocities[i * 3] = (Math.random() - 0.5) * 0.2;
    velocities[i * 3 + 1] = 0.8 + Math.random() * 1.2;
    velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.2;

    const life = 1.0 + Math.random() * 1.5;
    lifetimes[i] = life;
    maxLifetimes[i] = life;
  }

  /**
   * 激光/光束特效（贝塞尔曲线路径）
   * @param {THREE.Vector3} from - 起点
   * @param {THREE.Vector3} to - 终点
   * @param {number} [color=0xff0000] - 光束颜色
   * @returns {ParticleEffect}
   */
  LaserBeam(from, to, color = 0xff0000) {
    const root = new THREE.Group();

    // 计算中点（向上弯曲作为贝塞尔控制点）
    const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
    mid.y += from.distanceTo(to) * 0.1; // 轻微弧度

    // 使用TubeGeometry沿贝塞尔曲线生成光束
    const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
    const geometry = new THREE.TubeGeometry(curve, 16, 0.08, 6, false);

    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
    });

    const mesh = new THREE.Mesh(geometry, material);
    root.add(mesh);
    this._renderer.addParticle(root);

    const lifetime = 0.2; // 激光闪烁一帧即消

    const effect = new ParticleEffect(root, (self, dt) => {
      const progress = self.age / self.duration;
      material.opacity = 1 - progress;
      // 缩短光束表示衰减
      root.scale.set(1, 1 - progress * 0.3, 1);
    }, lifetime, false);

    this._effects.push(effect);
    return effect;
  }

  /**
   * 枪口闪光特效
   * @param {THREE.Vector3} position - 闪光位置
   * @param {THREE.Vector3} direction - 射击方向
   * @returns {ParticleEffect}
   */
  MuzzleFlash(position, direction) {
    const root = new THREE.Group();
    root.position.copy(position);

    // 使用一个四边形面片模拟闪光
    const flashGeo = new THREE.PlaneGeometry(0.6, 0.6);
    const flashMat = new THREE.MeshBasicMaterial({
      color: 0xffff88,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const flash = new THREE.Mesh(flashGeo, flashMat);
    // 朝向射击方向
    root.lookAt(position.clone().add(direction));
    root.add(flash);

    // 添加几颗小粒子
    const sparkCount = 8;
    const sparkGeo = new THREE.BufferGeometry();
    const sparkPositions = new Float32Array(sparkCount * 3);
    const sparkVelocities = new Float32Array(sparkCount * 3);

    for (let i = 0; i < sparkCount; i++) {
      sparkPositions[i * 3] = 0;
      sparkPositions[i * 3 + 1] = 0;
      sparkPositions[i * 3 + 2] = 0;

      const spread = 0.5;
      sparkVelocities[i * 3] = (Math.random() - 0.5) * spread + direction.x * 3;
      sparkVelocities[i * 3 + 1] = (Math.random() - 0.5) * spread;
      sparkVelocities[i * 3 + 2] = (Math.random() - 0.5) * spread + direction.z * 3;
    }

    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
    const sparkMat = new THREE.PointsMaterial({
      color: 0xffcc44,
      size: 0.15,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const sparks = new THREE.Points(sparkGeo, sparkMat);
    root.add(sparks);

    this._renderer.addParticle(root);

    const effect = new ParticleEffect(root, (self, dt) => {
      const progress = self.age / self.duration;
      flashMat.opacity = 1 - progress;
      flash.scale.setScalar(1 + progress * 2);

      // 更新火花
      const sPos = sparkGeo.getAttribute('position');
      for (let i = 0; i < sparkCount; i++) {
        sPos.array[i * 3] += sparkVelocities[i * 3] * dt;
        sPos.array[i * 3 + 1] += sparkVelocities[i * 3 + 1] * dt;
        sPos.array[i * 3 + 2] += sparkVelocities[i * 3 + 2] * dt;
      }
      sPos.needsUpdate = true;
      sparkMat.opacity = 1 - progress;
    }, 0.15, false);

    this._effects.push(effect);
    return effect;
  }

  /**
   * 建造特效（蓝色上升粒子）
   * @param {THREE.Vector3} position - 建造位置
   * @returns {ParticleEffect}
   */
  BuildEffect(position) {
    const root = new THREE.Group();
    root.position.copy(position);

    const count = 60;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      // 粒子从底部环绕位置向上升起
      const angle = (i / count) * Math.PI * 2;
      const radius = 0.8 + Math.random() * 0.5;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.random() * 3; // 起始高度在0-3之间
      positions[i * 3 + 2] = Math.sin(angle) * radius;

      velocities[i * 3] = Math.cos(angle) * 0.1;
      velocities[i * 3 + 1] = 1.0 + Math.random() * 2.0;
      velocities[i * 3 + 2] = Math.sin(angle) * 0.1;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x44aaff,
      size: 0.2,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    const points = new THREE.Points(geometry, material);
    root.add(points);
    this._renderer.addParticle(root);

    const effect = new ParticleEffect(root, (self, dt) => {
      const pos = geometry.getAttribute('position');
      for (let i = 0; i < count; i++) {
        pos.array[i * 3] += velocities[i * 3] * dt;
        pos.array[i * 3 + 1] += velocities[i * 3 + 1] * dt;
        pos.array[i * 3 + 2] += velocities[i * 3 + 2] * dt;

        // 超出范围则重置到底部
        if (pos.array[i * 3 + 1] > 4) {
          const angle = Math.random() * Math.PI * 2;
          const radius = 0.8 + Math.random() * 0.5;
          pos.array[i * 3] = Math.cos(angle) * radius;
          pos.array[i * 3 + 1] = 0;
          pos.array[i * 3 + 2] = Math.sin(angle) * radius;
        }
      }
      pos.needsUpdate = true;
    }, 0, true); // 持续循环（外部手动销毁）

    this._effects.push(effect);
    return effect;
  }

  /**
   * 神族护盾被击中特效（蓝色闪光）
   * @param {THREE.Vector3} position - 击中位置
   * @returns {ParticleEffect}
   */
  ShieldHit(position) {
    const root = new THREE.Group();
    root.position.copy(position);

    // 闪光环
    const ringGeo = new THREE.RingGeometry(0.1, 0.5, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x4488ff,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2; // 平放
    root.add(ring);

    // 粒子爆散
    const sparkCount = 20;
    const sparkGeo = new THREE.BufferGeometry();
    const sparkPositions = new Float32Array(sparkCount * 3);
    const sparkVelocities = new Float32Array(sparkCount * 3);

    for (let i = 0; i < sparkCount; i++) {
      sparkPositions[i * 3] = 0;
      sparkPositions[i * 3 + 1] = 0;
      sparkPositions[i * 3 + 2] = 0;

      const theta = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 3;
      sparkVelocities[i * 3] = Math.cos(theta) * speed;
      sparkVelocities[i * 3 + 1] = (Math.random() - 0.3) * speed;
      sparkVelocities[i * 3 + 2] = Math.sin(theta) * speed;
    }

    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
    const sparkMat = new THREE.PointsMaterial({
      color: 0x66bbff,
      size: 0.15,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const sparks = new THREE.Points(sparkGeo, sparkMat);
    root.add(sparks);

    this._renderer.addParticle(root);

    const effect = new ParticleEffect(root, (self, dt) => {
      const progress = self.age / self.duration;

      // 扩散环
      ring.scale.setScalar(1 + progress * 3);
      ringMat.opacity = 0.9 * (1 - progress);

      // 粒子运动
      const sPos = sparkGeo.getAttribute('position');
      for (let i = 0; i < sparkCount; i++) {
        sPos.array[i * 3] += sparkVelocities[i * 3] * dt;
        sPos.array[i * 3 + 1] += sparkVelocities[i * 3 + 1] * dt;
        sPos.array[i * 3 + 2] += sparkVelocities[i * 3 + 2] * dt;
        sparkVelocities[i * 3 + 1] -= 3 * dt; // 重力
      }
      sPos.needsUpdate = true;
      sparkMat.opacity = 1 - progress;
    }, 0.5, false);

    this._effects.push(effect);
    return effect;
  }

  /**
   * 治疗光束特效（绿色持续光束）
   * @param {THREE.Vector3} from - 治疗者位置
   * @param {THREE.Vector3} to - 被治疗者位置
   * @returns {ParticleEffect}
   */
  HealingBeam(from, to) {
    const root = new THREE.Group();

    // 主光束
    const beamCount = 20;
    const beamGeo = new THREE.BufferGeometry();
    const beamPositions = new Float32Array(beamCount * 3);
    const beamSizes = new Float32Array(beamCount);

    for (let i = 0; i < beamCount; i++) {
      const t = i / (beamCount - 1);
      // 沿直线插值位置（添加轻微偏移产生抖动）
      beamPositions[i * 3] = lerp(from.x, to.x, t) + (Math.random() - 0.5) * 0.1;
      beamPositions[i * 3 + 1] = lerp(from.y, to.y, t) + (Math.random() - 0.5) * 0.1;
      beamPositions[i * 3 + 2] = lerp(from.z, to.z, t) + (Math.random() - 0.5) * 0.1;
      beamSizes[i] = 0.2;
    }

    beamGeo.setAttribute('position', new THREE.BufferAttribute(beamPositions, 3));

    const beamMat = new THREE.PointsMaterial({
      color: 0x44ff44,
      size: 0.15,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    const beamPoints = new THREE.Points(beamGeo, beamMat);
    root.add(beamPoints);
    this._renderer.addParticle(root);

    const effect = new ParticleEffect(root, (self, dt) => {
      const pos = beamGeo.getAttribute('position');
      for (let i = 0; i < beamCount; i++) {
        const t = i / (beamCount - 1);
        // 动态更新位置并添加抖动
        pos.array[i * 3] = lerp(from.x, to.x, t) + (Math.sin(self.age * 10 + i) * 0.05);
        pos.array[i * 3 + 1] = lerp(from.y, to.y, t) + (Math.cos(self.age * 8 + i) * 0.05);
        pos.array[i * 3 + 2] = lerp(from.z, to.z, t) + (Math.sin(self.age * 12 + i * 0.5) * 0.05);
      }
      pos.needsUpdate = true;

      // 脉动效果
      beamMat.size = 0.12 + Math.sin(self.age * 15) * 0.03;
    }, 0, true); // 持续循环

    this._effects.push(effect);
    return effect;
  }

  // ═══════════════════════════════════════════════
  // 更新与管理
  // ═══════════════════════════════════════════════

  /**
   * 每帧更新所有活跃粒子特效
   * @param {number} dt - 帧间隔（秒）
   */
  update(dt) {
    // 从后往前遍历，方便删除
    for (let i = this._effects.length - 1; i >= 0; i--) {
      const effect = this._effects[i];
      effect.update(dt);

      // 如果特效已死亡，移除并释放资源
      if (!effect.alive) {
        this._destroyEffect(effect, i);
      }
    }
  }

  /**
   * 销毁单个特效并释放资源
   * @param {ParticleEffect} effect - 要销毁的特效
   * @param {number} index - 在数组中的索引
   * @private
   */
  _destroyEffect(effect, index) {
    // 从场景移除
    this._renderer.removeParticle(effect.root);

    // 递归释放几何体和材质
    effect.root.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });

    // 从活跃列表移除
    this._effects.splice(index, 1);
  }

  /**
   * 停止并销毁指定特效
   * @param {ParticleEffect} effect - 要停止的特效
   */
  stopEffect(effect) {
    effect.alive = false;
  }

  /**
   * 停止所有特效
   */
  stopAll() {
    for (const effect of this._effects) {
      effect.alive = false;
    }
  }

  /**
   * 获取当前活跃特效数量
   * @returns {number}
   */
  getActiveCount() {
    return this._effects.length;
  }

  /**
   * 释放所有资源
   */
  dispose() {
    while (this._effects.length > 0) {
      this._destroyEffect(this._effects[0], 0);
    }
    console.log('[ParticleSystem] 已销毁');
  }
}

// ═══════════════════════════════════════════════
// 工具函数
// ═══════════════════════════════════════════════

/**
 * 线性插值
 * @param {number} a - 起始值
 * @param {number} b - 结束值
 * @param {number} t - 插值因子 [0, 1]
 * @returns {number}
 */
function lerp(a, b, t) {
  return a + (b - a) * t;
}

export default ParticleSystem;
