// ═══════════════════════════════════════════════════════════════
// StarCraft Web - 动画系统
// 程序化动画：死亡/攻击/移动/建造 + 骨骼动画桥接
// ═══════════════════════════════════════════════════════════════

import * as THREE from 'three';
import { lerp, clamp } from '../shared/MathUtils.js';

// ═══════════════════════════════════════════════
// 动画状态定义
// ═══════════════════════════════════════════════

/**
 * 动画类型枚举
 */
export const ANIM_TYPE = {
  IDLE: 'idle',
  DEATH: 'death',
  ATTACK: 'attack',
  MOVE: 'move',
  BUILD: 'build',
  HURT: 'hurt',
};

/**
 * 动画播放状态
 */
const ANIM_STATE = {
  STOPPED: 0,
  PLAYING: 1,
  FINISHED: 2,
};

/**
 * 单个动画实例
 * 封装了动画的播放控制和更新逻辑
 */
class AnimInstance {
  /**
   * @param {object} unit - 关联的单位对象（需包含 mesh 属性）
   * @param {string} animName - 动画名称
   * @param {Function} updateFn - 更新回调 (instance, delta) => void
   * @param {number} duration - 动画持续时间（秒），0表示持续
   * @param {boolean} [loop=false] - 是否循环
   * @param {Function} [onComplete] - 动画完成回调
   */
  constructor(unit, animName, updateFn, duration, loop = false, onComplete = null) {
    this.unit = unit;
    this.animName = animName;
    this._updateFn = updateFn;
    this.duration = duration;
    this.loop = loop;
    this.onComplete = onComplete;

    this.state = ANIM_STATE.PLAYING;
    this.time = 0;       // 当前播放时间
    this.progress = 0;   // 归一化进度 [0, 1]
  }

  /**
   * 更新动画
   * @param {number} delta - 帧间隔（秒）
  * @returns {boolean} 是否已完成
 */
  update(delta) {
    if (this.state !== ANIM_STATE.PLAYING) return true;

    this.time += delta;

    if (this.duration > 0) {
      this.progress = clamp(this.time / this.duration, 0, 1);

      if (this.time >= this.duration) {
        if (this.loop) {
          // 循环：重置时间
          this.time %= this.duration;
          this.progress = this.time / this.duration;
        } else {
          // 非循环：标记完成
          this.state = ANIM_STATE.FINISHED;
          if (this.onComplete) this.onComplete(this);
          return true;
        }
      }
    }

    // 调用具体动画的更新逻辑
    this._updateFn(this, delta);
    return false;
  }
}

// ═══════════════════════════════════════════════
// 动画系统主类
// ═══════════════════════════════════════════════

/**
 * 动画系统
 * 管理所有单位的动画播放，支持程序化动画和骨骼动画
 */
export class AnimationSystem {
  constructor() {
    /** @type {Map<object, AnimInstance[]>} unit → 动画实例列表 */
    this._unitAnims = new Map();

    /** 动画参数配置 */
    this.config = {
      // 死亡动画
      death: {
        duration: 1.2,     // 持续时间（秒）
        fallSpeed: 2.0,    // 倒下速度
        fadeSpeed: 1.5,    // 淡出速度
      },
      // 攻击动画
      attack: {
        duration: 0.4,     // 单次攻击动画时长
        recoil: 0.15,      // 后坐力位移量
        windUp: 0.1,       // 挥动/蓄力时间
      },
      // 移动动画
      move: {
        bobHeight: 0.06,   // 上下摆动幅度
        bobSpeed: 8.0,     // 摆动频率
        leanAngle: 0.1,    // 前倾角度
      },
      // 建造动画
      build: {
        duration: 0.6,     // 单次建造动作时长
        armSwing: 0.3,     // 手臂摆动幅度
      },
    };

    console.log('[AnimationSystem] 动画系统初始化完成');
  }

  // ═══════════════════════════════════════════════
  // 动画播放API
  // ═══════════════════════════════════════════════

  /**
   * 播放指定动画
   * 同一单位只能有一个同类型动画在播放（新的会替换旧的）
   *
   * @param {object} unit - 单位对象（需包含 mesh: THREE.Object3D）
   * @param {string} animName - 动画名称
   *   - 'death': 死亡动画（缩小+倒下+淡出）
   *   - 'attack': 攻击动画（挥动/射击后坐力）
   *   - 'move': 移动动画（行走摆动）
   *   - 'build': 建造动画（手臂运动）
   *   - 'idle': 待机动画（轻微呼吸摆动）
   * @param {Function} [onComplete] - 动画完成回调
   * @returns {AnimInstance|null} 动画实例
   */
  playAnimation(unit, animName, onComplete = null) {
    if (!unit || !unit.mesh) {
      console.warn('[AnimationSystem] 单位缺少mesh属性');
      return null;
    }

    // 停止同类型的旧动画
    this._stopAnimByType(unit, animName);

    // 根据动画名称创建对应的动画实例
    let instance = null;

    switch (animName) {
      case 'death':
        instance = this._createDeathAnimation(unit, onComplete);
        break;
      case 'attack':
        instance = this._createAttackAnimation(unit, onComplete);
        break;
      case 'move':
        instance = this._createMoveAnimation(unit);
        break;
      case 'build':
        instance = this._createBuildAnimation(unit);
        break;
      case 'idle':
        instance = this._createIdleAnimation(unit);
        break;
      default:
        console.warn(`[AnimationSystem] 未知动画: "${animName}"`);
        return null;
    }

    // 注册到单位的动画列表
    if (!this._unitAnims.has(unit)) {
      this._unitAnims.set(unit, []);
    }
    this._unitAnims.get(unit).push(instance);

    return instance;
  }

  /**
   * 停止指定单位的所有动画
   * @param {object} unit
   */
  stopAll(unit) {
    const anims = this._unitAnims.get(unit);
    if (anims) {
      for (const anim of anims) {
        anim.state = ANIM_STATE.STOPPED;
      }
      this._unitAnims.delete(unit);
    }
  }

  /**
   * 停止指定单位的指定类型动画
   * @private
   */
  _stopAnimByType(unit, animName) {
    const anims = this._unitAnims.get(unit);
    if (!anims) return;

    for (let i = anims.length - 1; i >= 0; i--) {
      if (anims[i].animName === animName) {
        anims[i].state = ANIM_STATE.STOPPED;
        anims.splice(i, 1);
      }
    }
  }

  // ═══════════════════════════════════════════════
  // 每帧更新
  // ═══════════════════════════════════════════════

  /**
   * 每帧更新所有活跃动画
   * @param {number} delta - 帧间隔（秒）
 */
  update(delta) {
    for (const [unit, anims] of this._unitAnims) {
      // 从后往前遍历，方便移除已完成的动画
      for (let i = anims.length - 1; i >= 0; i--) {
        const anim = anims[i];
        const finished = anim.update(delta);

        if (finished) {
          anims.splice(i, 1);
        }
      }

      // 如果该单位所有动画都完成了，清理引用
      if (anims.length === 0) {
        this._unitAnims.delete(unit);
      }
    }
  }

  // ═══════════════════════════════════════════════
  // 程序化动画创建
  // ═══════════════════════════════════════════════

  /**
   * 创建死亡动画
   * 效果：缩小 → 向一侧倒下 → 淡出透明 → 隐藏
   * @private
   */
  _createDeathAnimation(unit, onComplete) {
    const mesh = unit.mesh;
    const cfg = this.config.death;
    const originalScale = mesh.scale.clone();
    const originalRotation = mesh.rotation.clone();
    const originalY = mesh.position.y;

    return new AnimInstance(unit, 'death', (inst, _dt) => {
      const p = inst.progress;

      // 阶段1：缩小（0-30%）
      if (p < 0.3) {
        const t = p / 0.3;
        const s = lerp(1.0, 0.7, t);
        mesh.scale.set(originalScale.x * s, originalScale.y * s, originalScale.z * s);
      }

      // 阶段2：倒下（20-70%）
      if (p > 0.2 && p < 0.7) {
        const t = (p - 0.2) / 0.5;
        mesh.rotation.x = lerp(0, -Math.PI / 2, t); // 向前倒下
        // 稍微降低位置（倒下时重心下降）
        mesh.position.y = originalY + lerp(0, -0.3, t);
      }

      // 阶段3：淡出（60-100%）
      if (p > 0.6) {
        const t = (p - 0.6) / 0.4;
        mesh.traverse((obj) => {
          if (obj.isMesh && obj.material) {
            const mat = obj.material;
            if (mat.transparent === false) {
              mat.transparent = true;
            }
            mat.opacity = lerp(1.0, 0.0, t);
          }
        });
      }

      // 阶段4：完全结束后隐藏
      if (p >= 1.0) {
        mesh.visible = false;
        // 恢复透明度（方便后续复用）
        mesh.traverse((obj) => {
          if (obj.isMesh && obj.material) {
            obj.material.opacity = 1.0;
          }
        });
      }
    }, cfg.duration, false, (inst) => {
      if (onComplete) onComplete(inst);
    });
  }

  /**
   * 创建攻击动画
   * 效果：蓄力 → 后坐力反弹 → 恢复
   * @private
   */
  _createAttackAnimation(unit, onComplete) {
    const mesh = unit.mesh;
    const cfg = this.config.attack;
    const originalPos = mesh.position.clone();
    const originalRot = mesh.rotation.y;

    return new AnimInstance(unit, 'attack', (inst, _dt) => {
      const p = inst.progress;

      if (p < 0.2) {
        // 蓄力阶段：微微后仰
        const t = p / 0.2;
        mesh.position.z = originalPos.z + lerp(0, -cfg.recoil * 0.3, t);
        mesh.rotation.y = originalRot + lerp(0, -0.05, t);
      } else if (p < 0.5) {
        // 射击/挥击：快速后坐力
        const t = (p - 0.2) / 0.3;
        mesh.position.z = originalPos.z + lerp(-cfg.recoil * 0.3, cfg.recoil, t);
        mesh.rotation.y = originalRot + lerp(-0.05, 0.08, t);
      } else {
        // 恢复：弹回原位
        const t = (p - 0.5) / 0.5;
        mesh.position.z = lerp(originalPos.z + cfg.recoil, originalPos.z, t);
        mesh.rotation.y = lerp(originalRot + 0.08, originalRot, t);
      }
    }, cfg.duration, false, (inst) => {
      // 确保完全恢复
      mesh.position.copy(originalPos);
      mesh.rotation.y = originalRot;
      if (onComplete) onComplete(inst);
    });
  }

  /**
   * 创建移动动画
   * 效果：上下摆动 + 轻微前倾（持续循环）
   * @private
   */
  _createMoveAnimation(unit) {
    const mesh = unit.mesh;
    const cfg = this.config.move;
    const originalY = mesh.position.y;

    return new AnimInstance(unit, 'move', (inst, _dt) => {
      // 基于时间的正弦波摆动
      const t = inst.time * cfg.bobSpeed;
      const bob = Math.sin(t) * cfg.bobHeight;
      mesh.position.y = originalY + Math.abs(bob); // 只向上弹，不向下陷

      // 根据移动方向前倾（如果有方向数据）
      if (unit.velocity) {
        const vel = unit.velocity;
        if (Math.abs(vel.x) > 0.01 || Math.abs(vel.z) > 0.01) {
          const angle = Math.atan2(vel.x, vel.z);
          // 只影响rotation.x表示前倾
          mesh.rotation.x = lerp(mesh.rotation.x, -cfg.leanAngle, 0.1);
          // Y轴朝向移动方向
          mesh.rotation.y = angle;
        }
      }
    }, 0, true); // 持续循环
  }

  /**
   * 创建建造动画
   * 效果：有节奏的手臂/工具摆动
   * @private
   */
  _createBuildAnimation(unit) {
    const mesh = unit.mesh;
    const cfg = this.config.build;

    // 找到可能的"手臂"子对象（通过名字查找）
    let arm = null;
    mesh.traverse((obj) => {
      if (obj.isMesh && (obj.name === 'arm' || obj.name === 'tool')) {
        arm = obj;
      }
    });

    const originalRotZ = arm ? arm.rotation.z : 0;

    return new AnimInstance(unit, 'build', (inst, _dt) => {
      const t = inst.time * 6; // 摆动频率

      if (arm) {
        // 手臂来回摆动
        arm.rotation.z = originalRotZ + Math.sin(t) * cfg.armSwing;
      }

      // 整体微微晃动（模拟用力）
      mesh.position.y += Math.sin(t * 2) * 0.002;
    }, 0, true); // 持续循环
  }

  /**
   * 创建待机动画
   * 效果：轻微的呼吸/浮动摆动
   * @private
   */
  _createIdleAnimation(unit) {
    const mesh = unit.mesh;
    const originalY = mesh.position.y;

    return new AnimInstance(unit, 'idle', (inst, _dt) => {
      // 缓慢的呼吸摆动
      const t = inst.time * 1.5;
      mesh.position.y = originalY + Math.sin(t) * 0.02;
    }, 0, true); // 持续循环
  }

  // ═══════════════════════════════════════════════
  // 骨骼动画支持（如果模型有AnimationMixer）
  // ═══════════════════════════════════════════════

  /**
   * 播放骨骼动画（适用于加载了glTF模型的单位）
   * @param {THREE.AnimationMixer} mixer - 动画混合器
   * @param {Array} clips - 动画剪辑数组
   * @param {string} animName - 要播放的动画名
   * @param {boolean} [loop=true] - 是否循环
   */
  playSkeletalAnimation(mixer, clips, animName, loop = true) {
    const clip = clips.find((c) => c.name === animName);
    if (!clip) {
      console.warn(`[AnimationSystem] 找不到骨骼动画: "${animName}"`);
      return null;
    }

    const action = mixer.clipAction(clip);
    action.reset();
    action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce);
    action.clampWhenFinished = true;
    action.play();

    return action;
  }

  /**
   * 更新所有骨骼动画混合器
   * 需要外部在主循环中调用
   * @param {THREE.AnimationMixer[]} mixers - 所有活跃的混合器
   * @param {number} delta - 帧间隔
  */
  updateMixers(mixers, delta) {
    for (const mixer of mixers) {
      mixer.update(delta);
    }
  }

  // ═══════════════════════════════════════════════
  // 工具方法
  // ═══════════════════════════════════════════════

  /**
   * 检查单位是否正在播放指定类型的动画
   * @param {object} unit
   * @param {string} animName
   * @returns {boolean}
   */
  isPlaying(unit, animName) {
    const anims = this._unitAnims.get(unit);
    if (!anims) return false;
    return anims.some((a) => a.animName === animName && a.state === ANIM_STATE.PLAYING);
  }

  /**
   * 获取单位当前活跃的动画数量
   * @param {object} unit
   * @returns {number}
   */
  getActiveCount(unit) {
    const anims = this._unitAnims.get(unit);
    return anims ? anims.length : 0;
  }

  /**
   * 获取全局活跃动画总数
   * @returns {number}
   */
  getTotalActiveCount() {
    let count = 0;
    for (const anims of this._unitAnims.values()) {
      count += anims.length;
    }
    return count;
  }

  /**
   * 重置动画系统的单位引用
   * 当单位被销毁时调用
   * @param {object} unit
   */
  removeUnit(unit) {
    this.stopAll(unit);
  }

  /**
   * 释放所有资源
   */
  dispose() {
    this._unitAnims.clear();
    console.log('[AnimationSystem] 已销毁');
  }
}

export default AnimationSystem;
