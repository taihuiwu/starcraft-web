// ═══════════════════════════════════════════════════════════════
// StarCraft Web - 音频总管理器 (AudioManager)
// 基于 Web Audio API 的完整音频管理系统
// 功能：音量控制、音频池、空间音效、淡入淡出、事件驱动
// ═══════════════════════════════════════════════════════════════

import { eventBus } from '../shared/EventBus.js';
import { EVENTS } from '../shared/Constants.js';
import { SoundEffects } from './SoundEffects.js';
import { MusicGenerator } from './Music.js';
import { VoiceLines } from './VoiceLines.js';

/**
 * 音频类别枚举
 * 用于区分不同类型的音频，便于独立音量控制
 */
export const AUDIO_CATEGORY = {
  SFX: 'sfx',         // 游戏音效（爆炸、射击等）
  MUSIC: 'music',     // 背景音乐
  VOICE: 'voice',     // 单位语音
  UI: 'ui',           // UI交互音效
};

/**
 * AudioManager - 音频总管理器
 * 
 * 核心职责：
 * 1. 管理 AudioContext 生命周期
 * 2. 提供分层音量控制（主音量 → 分类音量 → 空间音量）
 * 3. 音频池管理：预加载音效Buffer，播放时复用SourceNode
 * 4. 空间音效：根据声源3D位置计算音量衰减和声道平衡
 * 5. 背景音乐淡入淡出交叉切换
 * 6. 事件驱动：监听游戏事件自动播放对应音效
 */
class AudioManagerClass {
  constructor() {
    /** @type {AudioContext|null} Web Audio API 上下文 */
    this.ctx = null;

    // ─── 音量节点（信号链：source → categoryGain → masterGain → destination）───
    /** @type {GainNode|null} 主音量节点（最终输出前） */
    this.masterGain = null;
    /** @type {GainNode|null} 音效音量节点 */
    this.sfxGain = null;
    /** @type {GainNode|null} 音乐音量节点 */
    this.musicGain = null;
    /** @type {GainNode|null} 语音音量节点 */
    this.voiceGain = null;
    /** @type {GainNode|null} UI音效音量节点 */
    this.uiGain = null;

    // ─── 音量值（0.0 ~ 1.0）───
    this.volumes = {
      master: 0.8,
      sfx: 0.8,
      music: 0.5,
      voice: 0.7,
      ui: 0.6,
    };

    // ─── 音频池：预加载的AudioBuffer缓存 ───
    /** @type {Map<string, AudioBuffer>} 音效名称 → 缓冲区映射 */
    this.bufferPool = new Map();
    /** @type {number} 池最大容量（防止内存溢出） */
    this.poolMaxSize = 200;

    // ─── 活跃播放实例追踪 ───
    /** @type {Set<AudioBufferSourceNode>} 当前正在播放的音效节点 */
    this.activeSFX = new Set();
    /** @type {AudioBufferSourceNode|null} 当前背景音乐节点 */
    this.currentMusic = null;
    /** @type {string} 当前播放的音乐名称 */
    this.currentMusicName = '';
    /** @type {AudioBufferSourceNode|null} 上一首背景音乐（用于交叉淡出） */
    this.prevMusic = null;
    /** @type {number} 最大同时播放音效数（防止爆音） */
    this.maxConcurrentSFX = 24;

    // ─── 空间音频参数 ───
    /** @type {number} 声源最大听距（超过此距离完全听不到） */
    this.maxDistance = 50;
    /** @type {number} 衰减最小距离（小于此距离音量不变） */
    this.minDistance = 5;
    /** @type {number} 摄像机X坐标（由外部更新） */
    this.cameraX = 0;
    /** @type {number} 摄像机Y坐标（由外部更新） */
    this.cameraY = 0;

    // ─── 音效生成器实例 ───
    /** @type {SoundEffects} */
    this.sfxGen = null;
    /** @type {MusicGenerator} */
    this.musicGen = null;
    /** @type {VoiceLines} */
    this.voiceGen = null;

    // ─── 暂停状态 ───
    /** @type {boolean} */
    this.paused = false;

    // ─── 已注册的事件取消函数 ───
    /** @type {Function[]} */
    this._unsubscribers = [];
  }

  // ═══════════════════════════════════════════════════════════
  // 初始化
  // ═══════════════════════════════════════════════════════════

  /**
   * 初始化音频系统
   * 必须在用户首次交互后调用（浏览器要求用户手势才能创建AudioContext）
   */
  init() {
    if (this.ctx) return; // 防止重复初始化

    // 创建 AudioContext（兼容 WebKit 前缀）
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioCtx();

    // 构建音频信号链：source → categoryGain → masterGain → destination
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    this.masterGain.gain.value = this.volumes.master;

    // 各分类音量节点（并行连接到 masterGain）
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.connect(this.masterGain);
    this.sfxGain.gain.value = this.volumes.sfx;

    this.musicGain = this.ctx.createGain();
    this.musicGain.connect(this.masterGain);
    this.musicGain.gain.value = this.volumes.music;

    this.voiceGain = this.ctx.createGain();
    this.voiceGain.connect(this.masterGain);
    this.voiceGain.gain.value = this.volumes.voice;

    this.uiGain = this.ctx.createGain();
    this.uiGain.connect(this.masterGain);
    this.uiGain.gain.value = this.volumes.ui;

    // 初始化生成器
    this.sfxGen = new SoundEffects(this.ctx);
    this.musicGen = new MusicGenerator(this.ctx);
    this.voiceGen = new VoiceLines(this.ctx);

    // 注册游戏事件监听
    this._bindEvents();

    console.log('[AudioManager] 音频系统初始化完成');
  }

  /**
   * 恢复音频上下文（处理浏览器自动暂停策略）
   * 在用户点击等交互时调用
   */
  async resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 音量控制
  // ═══════════════════════════════════════════════════════════

  /**
   * 设置主音量
   * @param {number} value - 0.0 ~ 1.0
   */
  setMasterVolume(value) {
    this.volumes.master = Math.max(0, Math.min(1, value));
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.volumes.master, this.ctx.currentTime);
    }
  }

  /**
   * 设置音效音量
   * @param {number} value - 0.0 ~ 1.0
   */
  setSFXVolume(value) {
    this.volumes.sfx = Math.max(0, Math.min(1, value));
    if (this.sfxGain) {
      this.sfxGain.gain.setValueAtTime(this.volumes.sfx, this.ctx.currentTime);
    }
  }

  /**
   * 设置音乐音量
   * @param {number} value - 0.0 ~ 1.0
   */
  setMusicVolume(value) {
    this.volumes.music = Math.max(0, Math.min(1, value));
    if (this.musicGain) {
      this.musicGain.gain.setValueAtTime(this.volumes.music, this.ctx.currentTime);
    }
  }

  /**
   * 设置语音音量
   * @param {number} value - 0.0 ~ 1.0
   */
  setVoiceVolume(value) {
    this.volumes.voice = Math.max(0, Math.min(1, value));
    if (this.voiceGain) {
      this.voiceGain.gain.setValueAtTime(this.volumes.voice, this.ctx.currentTime);
    }
  }

  /**
   * 设置UI音效音量
   * @param {number} value - 0.0 ~ 1.0
   */
  setUIVolume(value) {
    this.volumes.ui = Math.max(0, Math.min(1, value));
    if (this.uiGain) {
      this.uiGain.gain.setValueAtTime(this.volumes.ui, this.ctx.currentTime);
    }
  }

  /**
   * 获取各分类的实际最终音量（主音量 × 分类音量）
   * @param {string} category - 音频类别
   * @returns {number} 最终音量值
   */
  getEffectiveVolume(category) {
    const categoryGain = this.volumes[category] || 0;
    return this.volumes.master * categoryGain;
  }

  // ═══════════════════════════════════════════════════════════
  // 音频池管理
  // ═══════════════════════════════════════════════════════════

  /**
   * 获取音频缓冲区（优先从池中获取，否则实时生成）
   * @param {string} name - 音效/音乐名称
   * @returns {AudioBuffer|null} 音频缓冲区
   */
  getBuffer(name) {
    // 从缓存池中查找
    if (this.bufferPool.has(name)) {
      return this.bufferPool.get(name);
    }

    // 实时生成并缓存
    const buffer = this._generateBuffer(name);
    if (buffer) {
      // 池满时清理最旧的条目
      if (this.bufferPool.size >= this.poolMaxSize) {
        const oldestKey = this.bufferPool.keys().next().value;
        this.bufferPool.delete(oldestKey);
      }
      this.bufferPool.set(name, buffer);
    }
    return buffer;
  }

  /**
   * 根据名称生成对应的AudioBuffer
   * @param {string} name - 音效名称
   * @returns {AudioBuffer|null}
   * @private
   */
  _generateBuffer(name) {
    if (!this.ctx) return null;

    // 检查是否是音效
    if (this.sfxGen && typeof this.sfxGen[name] === 'function') {
      return this.sfxGen[name]();
    }
    // 检查是否是音乐
    if (this.musicGen && typeof this.musicGen[name] === 'function') {
      return this.musicGen[name]();
    }
    // 检查是否是语音
    if (this.voiceGen && typeof this.voiceGen[name] === 'function') {
      return this.voiceGen[name]();
    }

    console.warn(`[AudioManager] 未知音频: "${name}"`);
    return null;
  }

  /**
   * 批量预加载音频（避免游戏进行中卡顿）
   * @param {string[]} names - 音效名称数组
   */
  preload(names) {
    if (!this.ctx) return;
    for (const name of names) {
      if (!this.bufferPool.has(name)) {
        this.getBuffer(name);
      }
    }
    console.log(`[AudioManager] 预加载 ${names.length} 个音频`);
  }

  /**
   * 清空音频池（释放内存）
   */
  clearPool() {
    this.bufferPool.clear();
  }

  // ═══════════════════════════════════════════════════════════
  // 播放接口
  // ═══════════════════════════════════════════════════════════

  /**
   * 播放游戏音效
   * @param {string} name - 音效名称（如 'gunshot', 'explosion'）
   * @param {Object} [options] - 播放选项
   * @param {number} [options.volume=1.0] - 额外音量乘数
   * @param {number} [options.pan=0] - 声道平衡（-1=左, 0=居中, 1=右）
   * @param {number} [options.sourceX] - 声源世界X坐标（空间音效用）
   * @param {number} [options.sourceY] - 声源世界Y坐标（空间音效用）
   * @param {boolean} [options.loop=false] - 是否循环
   * @returns {AudioBufferSourceNode|null} 播放节点
   */
  playSFX(name, options = {}) {
    if (!this.ctx || this.paused) return null;

    // 并发数限制，防止同时播放过多音效
    if (this.activeSFX.size >= this.maxConcurrentSFX) {
      return null;
    }

    const buffer = this.getBuffer(name);
    if (!buffer) return null;

    return this._playBuffer(buffer, this.sfxGain, options);
  }

  /**
   * 播放背景音乐（自动交叉淡出旧音乐）
   * @param {string} name - 音乐名称
   * @param {number} [fadeIn=2.0] - 淡入时间（秒）
   * @param {number} [fadeOut=2.0] - 淡出时间（秒）
   */
  playMusic(name, fadeIn = 2.0, fadeOut = 2.0) {
    if (!this.ctx) return;
    if (name === this.currentMusicName) return; // 避免重复播放同一音乐

    const buffer = this.getBuffer(name);
    if (!buffer) return;

    // 淡出当前音乐
    if (this.currentMusic) {
      this._fadeOut(this.currentMusic, fadeOut, () => {
        try { this.currentMusic.stop(); } catch (e) { /* 已停止 */ }
        this.currentMusic = null;
      });
    }

    // 创建新音乐节点
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true; // 背景音乐循环播放
    source.connect(this.musicGain);

    // 淡入新音乐
    this._fadeIn(source, fadeIn);
    source.start();

    this.prevMusic = this.currentMusic;
    this.currentMusic = source;
    this.currentMusicName = name;

    console.log(`[AudioManager] 播放背景音乐: ${name}`);
  }

  /**
   * 播放单位语音
   * @param {string} name - 语音名称
   * @param {Object} [options] - 播放选项（同 playSFX）
   * @returns {AudioBufferSourceNode|null}
   */
  playVoice(name, options = {}) {
    if (!this.ctx || this.paused) return null;

    const buffer = this.getBuffer(name);
    if (!buffer) return null;

    return this._playBuffer(buffer, this.voiceGain, options);
  }

  /**
   * 播放UI音效
   * @param {string} name - UI音效名称
   * @param {Object} [options] - 播放选项
   * @returns {AudioBufferSourceNode|null}
   */
  playUI(name, options = {}) {
    if (!this.ctx || this.paused) return null;

    const buffer = this.getBuffer(name);
    if (!buffer) return null;

    return this._playBuffer(buffer, this.uiGain, options);
  }

  // ═══════════════════════════════════════════════════════════
  // 内部播放方法
  // ═══════════════════════════════════════════════════════════

  /**
   * 播放音频缓冲区（通用方法）
   * @param {AudioBuffer} buffer - 音频缓冲区
   * @param {GainNode} categoryGain - 连接到的分类音量节点
   * @param {Object} options - 播放选项
   * @returns {AudioBufferSourceNode}
   * @private
   */
  _playBuffer(buffer, categoryGain, options = {}) {
    const {
      volume = 1.0,
      pan = 0,
      sourceX = null,
      sourceY = null,
      loop = false,
    } = options;

    // 创建播放节点
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;

    // 创建单个音效的音量控制节点
    const gainNode = this.ctx.createGain();
    let finalVolume = volume;

    // 如果提供了世界坐标，计算空间音效
    if (sourceX !== null && sourceY !== null) {
      const spatial = this._calculateSpatialAudio(sourceX, sourceY);
      finalVolume *= spatial.volume;
      // 创建声相节点（左右声道平衡）
      const panner = this.ctx.createStereoPanner();
      panner.pan.value = spatial.pan;
      source.connect(gainNode);
      gainNode.connect(panner);
      panner.connect(categoryGain);
    } else {
      source.connect(gainNode);
      gainNode.connect(categoryGain);
    }

    gainNode.gain.value = finalVolume;

    // 监听播放结束，从活跃集合中移除
    source.onended = () => {
      this.activeSFX.delete(source);
    };

    source.start();
    this.activeSFX.add(source);

    return source;
  }

  // ═══════════════════════════════════════════════════════════
  // 空间音效
  // ═══════════════════════════════════════════════════════════

  /**
   * 更新摄像机位置（由渲染系统每帧调用）
   * @param {number} x - 摄像机X坐标
   * @param {number} y - 摄像机Y坐标
   */
  updateCameraPosition(x, y) {
    this.cameraX = x;
    this.cameraY = y;
  }

  /**
   * 根据声源与摄像机的位置计算空间音效参数
   * @param {number} sourceX - 声源X坐标
   * @param {number} sourceY - 声源Y坐标
   * @returns {{ volume: number, pan: number }} 音量衰减系数和声道平衡
   * @private
   */
  _calculateSpatialAudio(sourceX, sourceY) {
    // 计算距离
    const dx = sourceX - this.cameraX;
    const dy = sourceY - this.cameraY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // 音量衰减：minDistance内保持满音量，之后线性衰减到maxDistance时为0
    let volume = 1.0;
    if (distance > this.maxDistance) {
      volume = 0;
    } else if (distance > this.minDistance) {
      volume = 1.0 - (distance - this.minDistance) / (this.maxDistance - this.minDistance);
    }

    // 声道平衡：基于声源在屏幕中的水平偏移
    // -1 表示全左，1 表示全右
    const normalizedX = Math.max(-1, Math.min(1, dx / this.maxDistance));

    return { volume, pan: normalizedX };
  }

  // ═══════════════════════════════════════════════════════════
  // 淡入淡出
  // ═══════════════════════════════════════════════════════════

  /**
   * 淡入效果
   * @param {AudioBufferSourceNode} source - 音源节点
   * @param {number} duration - 淡入时长（秒）
   * @private
   */
  _fadeIn(source, duration) {
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(1, this.ctx.currentTime + duration);
    source.disconnect();
    source.connect(gain);
    gain.connect(this.musicGain);
  }

  /**
   * 淡出效果
   * @param {AudioBufferSourceNode} source - 音源节点
   * @param {number} duration - 淡出时长（秒）
   * @param {Function} [onComplete] - 淡出完成回调
   * @private
   */
  _fadeOut(source, duration, onComplete) {
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(1, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + duration);
    source.disconnect();
    source.connect(gain);
    gain.connect(this.musicGain);

    if (onComplete) {
      setTimeout(onComplete, duration * 1000);
    }
  }

  /**
   * 交叉淡出切换音乐
   * @param {string} newMusicName - 新音乐名称
   * @param {number} [crossfadeTime=2.0] - 交叉淡出时长（秒）
   */
  crossfadeMusic(newMusicName, crossfadeTime = 2.0) {
    if (newMusicName === this.currentMusicName) return;

    const newBuffer = this.getBuffer(newMusicName);
    if (!newBuffer) return;

    const now = this.ctx.currentTime;

    // 创建新音乐源
    const newSource = this.ctx.createBufferSource();
    newSource.buffer = newBuffer;
    newSource.loop = true;

    // 为新音乐创建增益节点（从0淡入）
    const newGain = this.ctx.createGain();
    newGain.gain.setValueAtTime(0, now);
    newGain.gain.linearRampToValueAtTime(1, now + crossfadeTime);
    newSource.connect(newGain);
    newGain.connect(this.musicGain);
    newSource.start(now);

    // 旧音乐淡出
    if (this.currentMusic) {
      const oldSource = this.currentMusic;
      // 需要在旧音乐的输出路径上插入淡出gain节点
      // 由于旧音乐已连接到 musicGain，我们断开并重新连接
      try {
        oldSource.disconnect();
        const oldGain = this.ctx.createGain();
        oldGain.gain.setValueAtTime(1, now);
        oldGain.gain.linearRampToValueAtTime(0, now + crossfadeTime);
        oldSource.connect(oldGain);
        oldGain.connect(this.musicGain);
        setTimeout(() => {
          try { oldSource.stop(); } catch (e) { /* 已停止 */ }
        }, crossfadeTime * 1000);
      } catch (e) {
        // 旧音乐可能已经停止
      }
    }

    this.prevMusic = this.currentMusic;
    this.currentMusic = newSource;
    this.currentMusicName = newMusicName;
  }

  // ═══════════════════════════════════════════════════════════
  // 播放控制
  // ═══════════════════════════════════════════════════════════

  /**
   * 停止所有音效播放
   */
  stopAllSFX() {
    for (const source of this.activeSFX) {
      try { source.stop(); } catch (e) { /* 已停止 */ }
    }
    this.activeSFX.clear();
  }

  /**
   * 停止背景音乐
   * @param {number} [fadeOut=1.0] - 淡出时间
   */
  stopMusic(fadeOut = 1.0) {
    if (this.currentMusic) {
      this._fadeOut(this.currentMusic, fadeOut, () => {
        try { this.currentMusic.stop(); } catch (e) { /* */ }
        this.currentMusic = null;
        this.currentMusicName = '';
      });
    }
  }

  /**
   * 暂停整个音频系统
   */
  pause() {
    if (this.paused) return;
    this.paused = true;

    if (this.ctx && this.ctx.state === 'running') {
      this.ctx.suspend();
    }

    console.log('[AudioManager] 音频系统已暂停');
  }

  /**
   * 恢复音频系统
   */
  unpause() {
    if (!this.paused) return;
    this.paused = false;

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    console.log('[AudioManager] 音频系统已恢复');
  }

  /**
   * 静音/取消静音
   * @param {boolean} [mute=true]
   */
  mute(mute = true) {
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(
        mute ? 0 : this.volumes.master,
        this.ctx.currentTime
      );
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 事件驱动集成
  // ═══════════════════════════════════════════════════════════

  /**
   * 注册游戏事件监听，自动播放对应音效
   * @private
   */
  _bindEvents() {
    // 单位被选中
    this._unsubscribers.push(
      eventBus.on(EVENTS.SELECT_UNITS, (data) => {
        this.playSFX('select');
      })
    );

    // 命令下达
    this._unsubscribers.push(
      eventBus.on(EVENTS.COMMAND_ISSUED, (data) => {
        const cmd = data?.command;
        if (cmd === 'attack') {
          this.playSFX('attack_confirm');
        } else if (cmd === 'move') {
          this.playSFX('move_confirm');
        }
      })
    );

    // 单位死亡
    this._unsubscribers.push(
      eventBus.on(EVENTS.UNIT_DIED, (data) => {
        if (data?.position) {
          this.playSFX('unit_death', {
            sourceX: data.position.x,
            sourceY: data.position.y,
          });
        } else {
          this.playSFX('unit_death');
        }
      })
    );

    // 单位受伤
    this._unsubscribers.push(
      eventBus.on(EVENTS.UNIT_DAMAGE, (data) => {
        if (data?.position) {
          // 根据攻击类型选择不同音效
          if (data.isProjectile) {
            this.playSFX('gunshot', {
              sourceX: data.position.x,
              sourceY: data.position.y,
            });
          } else {
            this.playSFX('explosion', {
              sourceX: data.position.x,
              sourceY: data.position.y,
              volume: 0.5,
            });
          }
        }
      })
    );

    // 单位治疗
    this._unsubscribers.push(
      eventBus.on(EVENTS.UNIT_HEALED, (data) => {
        this.playSFX('heal', {
          sourceX: data?.position?.x,
          sourceY: data?.position?.y,
        });
      })
    );

    // 开始建造
    this._unsubscribers.push(
      eventBus.on(EVENTS.BUILD_START, () => {
        this.playSFX('build_start');
      })
    );

    // 建造完成
    this._unsubscribers.push(
      eventBus.on(EVENTS.BUILD_COMPLETE, () => {
        this.playSFX('building_complete');
      })
    );

    // 科技研发完成
    this._unsubscribers.push(
      eventBus.on(EVENTS.TECH_COMPLETE, () => {
        this.playSFX('research_complete');
      })
    );

    // 游戏暂停/恢复
    this._unsubscribers.push(
      eventBus.on(EVENTS.GAME_PAUSE, () => this.pause())
    );
    this._unsubscribers.push(
      eventBus.on(EVENTS.GAME_RESUME, () => this.unpause())
    );

    // 游戏结束
    this._unsubscribers.push(
      eventBus.on(EVENTS.GAME_OVER, (data) => {
        if (data?.victory) {
          this.crossfadeMusic('victory_music');
          this.playSFX('victory');
        } else {
          this.crossfadeMusic('defeat_music');
          this.playSFX('defeat');
        }
      })
    );
  }

  /**
   * 取消所有事件监听
   */
  unbindEvents() {
    for (const unsub of this._unsubscribers) {
      unsub();
    }
    this._unsubscribers = [];
  }

  /**
   * 完全销毁音频系统，释放所有资源
   */
  destroy() {
    this.stopAllSFX();
    this.stopMusic(0);
    this.unbindEvents();
    this.clearPool();

    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }

    this.masterGain = null;
    this.sfxGain = null;
    this.musicGain = null;
    this.voiceGain = null;
    this.uiGain = null;

    console.log('[AudioManager] 音频系统已销毁');
  }
}

// 导出全局单例
export const audioManager = new AudioManagerClass();
export default audioManager;
