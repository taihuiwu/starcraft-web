// ═══════════════════════════════════════════════════════════════
// StarCraft Web - 程序化音效生成器 (SoundEffects)
// 使用 Web Audio API 的 OscillatorNode 和 AudioBuffer
// 在运行时程序化生成所有游戏音效，无需外部音频文件
// ═══════════════════════════════════════════════════════════════

/**
 * SoundEffects - 音效程序化生成器
 *
 * 设计理念：
 * - 每个音效函数返回 AudioBuffer（可缓存和复用）
 * - 使用 OscillatorNode（振荡器）生成不同波形
 * - 使用白噪声缓冲区模拟物理声效
 * - 所有音效在离线渲染到 AudioBuffer，播放时无需实时合成
 *
 * 音效风格：8-bit / chiptune / 复古电子游戏风格
 */
export class SoundEffects {
  /**
   * @param {AudioContext} ctx - Web Audio API 上下文
   */
  constructor(ctx) {
    /** @type {AudioContext} */
    this.ctx = ctx;
    /** @type {number} 默认采样率（通常跟随 ctx.sampleRate） */
    this.sampleRate = ctx.sampleRate;
  }

  // ═══════════════════════════════════════════════════════════
  // 辅助方法
  // ═══════════════════════════════════════════════════════════

  /**
   * 创建一个空白的 AudioBuffer
   * @param {number} duration - 时长（秒）
   * @param {number} [channels=1] - 声道数
   * @returns {AudioBuffer}
   */
  _createBuffer(duration, channels = 1) {
    return this.ctx.createBuffer(channels, this.sampleRate * duration, this.sampleRate);
  }

  /**
   * 生成白噪声缓冲区（用于爆炸、射击等音效）
   * @param {number} duration - 时长（秒）
   * @returns {AudioBuffer}
   */
  _whiteNoise(duration) {
    const buffer = this._createBuffer(duration);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1; // -1.0 ~ 1.0 均匀随机
    }
    return buffer;
  }

  /**
   * 生成粉红噪声缓冲区（低频更多的自然噪声）
   * @param {number} duration - 时长（秒）
   * @returns {AudioBuffer}
   */
  _pinkNoise(duration) {
    const buffer = this._createBuffer(duration);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
    return buffer;
  }

  /**
   * 将正弦波渲染到 AudioBuffer（用于简单音调音效）
   * @param {number} duration - 时长
   * @param {number} freq - 频率 (Hz)
   * @param {number} [freqEnd] - 结束频率（频率扫描用）
   * @param {string} [waveType='sine'] - 波形类型
   * @returns {AudioBuffer}
   */
  _toneBuffer(duration, freq, freqEnd = null, waveType = 'sine') {
    const buffer = this._createBuffer(duration);
    const data = buffer.getChannelData(0);
    const len = data.length;

    for (let i = 0; i < len; i++) {
      const t = i / this.sampleRate;
      const progress = i / len;

      // 频率扫描（用于激光等音效）
      let f = freq;
      if (freqEnd !== null) {
        f = freq + (freqEnd - freq) * progress;
      }

      // 累积相位（保证连续性）
      let sample;
      const phase = 2 * Math.PI * f * t;
      switch (waveType) {
        case 'square':
          sample = Math.sin(phase) > 0 ? 1 : -1;
          break;
        case 'sawtooth':
          sample = 2 * (f * t % 1) - 1;
          break;
        case 'triangle':
          sample = 2 * Math.abs(2 * (f * t % 1) - 1) - 1;
          break;
        default: // sine
          sample = Math.sin(phase);
      }
      data[i] = sample;
    }
    return buffer;
  }

  /**
   * 混合两个 AudioBuffer
   * @param {AudioBuffer} a
   * @param {AudioBuffer} b
   * @param {number} [gainB=1.0] - 第二个buffer的增益
   * @returns {AudioBuffer} 混合后的buffer
   */
  _mix(a, b, gainB = 1.0) {
    const len = Math.max(a.length, b.length);
    const buffer = this.ctx.createBuffer(
      Math.max(a.numberOfChannels, b.numberOfChannels),
      len,
      this.sampleRate
    );
    const outData = buffer.getChannelData(0);
    const dataA = a.getChannelData(0);
    const dataB = b.getChannelData(0);

    for (let i = 0; i < len; i++) {
      const sa = i < dataA.length ? dataA[i] : 0;
      const sb = i < dataB.length ? dataB[i] : 0;
      outData[i] = Math.max(-1, Math.min(1, sa + sb * gainB));
    }
    return buffer;
  }

  /**
   * 对 AudioBuffer 应用衰减包络
   * @param {AudioBuffer} buffer
   * @param {number} decay - 衰减系数（越大衰减越快）
   * @returns {AudioBuffer}
   */
  _envelope(buffer, decay = 5) {
    const out = this._createBuffer(buffer.duration, buffer.numberOfChannels);
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const src = buffer.getChannelData(ch);
      const dst = out.getChannelData(ch);
      for (let i = 0; i < src.length; i++) {
        const t = i / this.sampleRate;
        dst[i] = src[i] * Math.exp(-decay * t);
      }
    }
    return out;
  }

  // ═══════════════════════════════════════════════════════════
  // 战斗音效
  // ═══════════════════════════════════════════════════════════

  /**
   * 枪击音效 - 机枪射击
   * 短促的白噪声脉冲，模拟子弹发射的爆裂声
   * @returns {AudioBuffer}
   */
  gunshot() {
    const duration = 0.08; // 80毫秒极短脉冲
    const noise = this._whiteNoise(duration);
    return this._envelope(noise, 30); // 快速衰减
  }

  /**
   * 爆炸音效 - 低频隆隆 + 白噪声衰减
   * 两层叠加：低频正弦波（冲击感）+ 衰减白噪声（碎片感）
   * @returns {AudioBuffer}
   */
  explosion() {
    const duration = 0.8;
    // 低频冲击波：60Hz → 20Hz 下滑
    const bass = this._toneBuffer(duration, 60, 20, 'sine');
    const bassEnv = this._envelope(bass, 4);

    // 白噪声碎片声
    const noise = this._whiteNoise(duration);
    const noiseEnv = this._envelope(noise, 3);

    return this._mix(bassEnv, noiseEnv, 0.7);
  }

  /**
   * 激光/光束音效 - 快速频率扫描
   * 从高频到低频的快速下降，模拟科幻激光声
   * @returns {AudioBuffer}
   */
  laser() {
    const duration = 0.3;
    // 高频到低频扫描：2000Hz → 200Hz
    const sweep = this._toneBuffer(duration, 2000, 200, 'sawtooth');
    const env = this._envelope(sweep, 8);
    return env;
  }

  /**
   * 护盾被击中音效 - 电子碰撞声
   * 快速的频率调制，产生"嗡"的电子音
   * @returns {AudioBuffer}
   */
  shield_hit() {
    const duration = 0.25;
    const buffer = this._createBuffer(duration);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / this.sampleRate;
      const env = Math.exp(-12 * t); // 快速衰减
      // 频率调制：高频振荡
      const freq = 800 + 600 * Math.sin(2 * Math.PI * 20 * t);
      data[i] = env * Math.sin(2 * Math.PI * freq * t) * 0.6;
    }
    return buffer;
  }

  // ═══════════════════════════════════════════════════════════
  // 建造/科技音效
  // ═══════════════════════════════════════════════════════════

  /**
   * 建造完成音效 - 上升音调
   * 从低到高的方波序列，表示建造成功
   * @returns {AudioBuffer}
   */
  building_complete() {
    const duration = 0.6;
    const buffer = this._createBuffer(duration);
    const data = buffer.getChannelData(0);

    // 上升音阶：C4 → E4 → G4 → C5
    const notes = [261.63, 329.63, 392.00, 523.25];
    const noteDur = duration / notes.length;

    for (let i = 0; i < data.length; i++) {
      const t = i / this.sampleRate;
      const noteIndex = Math.min(Math.floor(t / noteDur), notes.length - 1);
      const freq = notes[noteIndex];
      const localT = t - noteIndex * noteDur;
      const env = Math.exp(-6 * localT);
      // 方波
      data[i] = (Math.sin(2 * Math.PI * freq * t) > 0 ? 0.5 : -0.5) * env;
    }
    return buffer;
  }

  /**
   * 开始建造音效 - 机械启动声
   * 短促的锯齿波脉冲，模拟机械开始运转
   * @returns {AudioBuffer}
   */
  build_start() {
    const duration = 0.3;
    const buffer = this._createBuffer(duration);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / this.sampleRate;
      const env = Math.exp(-8 * t);
      // 锯齿波 + 快速频率上升
      const freq = 100 + 400 * (i / data.length);
      const saw = 2 * (freq * t % 1) - 1;
      data[i] = saw * env * 0.5;
    }
    return buffer;
  }

  /**
   * 研发完成音效 - 悦耳的和弦
   * 三个音符同时响起，明亮的合成音色
   * @returns {AudioBuffer}
   */
  research_complete() {
    const duration = 0.8;
    const buffer = this._createBuffer(duration);
    const data = buffer.getChannelData(0);

    // C大三和弦：C5, E5, G5
    const freqs = [523.25, 659.25, 783.99];
    for (let i = 0; i < data.length; i++) {
      const t = i / this.sampleRate;
      const env = Math.exp(-3 * t);
      let sample = 0;
      for (const freq of freqs) {
        sample += Math.sin(2 * Math.PI * freq * t);
      }
      data[i] = (sample / freqs.length) * env * 0.5;
    }
    return buffer;
  }

  // ═══════════════════════════════════════════════════════════
  // 单位相关音效
  // ═══════════════════════════════════════════════════════════

  /**
   * 单位死亡音效 - 下降音调 + 噪声
   * 音调下降伴随噪声，模拟死亡/坠毁
   * @returns {AudioBuffer}
   */
  unit_death() {
    const duration = 0.5;
    // 下降音调：500Hz → 80Hz
    const tone = this._toneBuffer(duration, 500, 80, 'square');
    const toneEnv = this._envelope(tone, 4);

    // 噪声碎片
    const noise = this._whiteNoise(duration);
    const noiseEnv = this._envelope(noise, 5);

    return this._mix(toneEnv, noiseEnv, 0.4);
  }

  /**
   * 治疗音效 - 柔和的正弦波
   * 两个柔和的正弦音交替，产生舒缓感
   * @returns {AudioBuffer}
   */
  heal() {
    const duration = 0.6;
    const buffer = this._createBuffer(duration);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / this.sampleRate;
      const env = Math.sin(Math.PI * t / duration); // 拱形包络
      // 两个柔和正弦音交替
      const f1 = 440;
      const f2 = 554.37; // 大三度
      const mix = (Math.sin(2 * Math.PI * f1 * t) * 0.6
        + Math.sin(2 * Math.PI * f2 * t) * 0.4);
      data[i] = mix * env * 0.3;
    }
    return buffer;
  }

  /**
   * 资源采集音效 - 叮叮声
   * 快速的金属碰撞音，类似硬币声
   * @returns {AudioBuffer}
   */
  resource_collect() {
    const duration = 0.15;
    const buffer = this._createBuffer(duration);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / this.sampleRate;
      const env = Math.exp(-20 * t);
      // 高频正弦波 + 泛音
      data[i] = (
        Math.sin(2 * Math.PI * 2000 * t) * 0.5 +
        Math.sin(2 * Math.PI * 4000 * t) * 0.3 +
        Math.sin(2 * Math.PI * 6000 * t) * 0.2
      ) * env * 0.3;
    }
    return buffer;
  }

  // ═══════════════════════════════════════════════════════════
  // UI交互音效
  // ═══════════════════════════════════════════════════════════

  /**
   * UI点击反馈音效 - 短促的"嘟"声
   * @returns {AudioBuffer}
   */
  click() {
    const duration = 0.05;
    return this._toneBuffer(duration, 800, 800, 'square');
  }

  /**
   * 警报/被攻击音效 - 急促的双音交替
   * 两个频率快速交替，产生紧迫感
   * @returns {AudioBuffer}
   */
  alert() {
    const duration = 0.5;
    const buffer = this._createBuffer(duration);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / this.sampleRate;
      const env = Math.sin(Math.PI * t / duration); // 拱形包络
      // 交替两个频率
      const freq = (Math.floor(t * 10) % 2 === 0) ? 600 : 900;
      data[i] = Math.sin(2 * Math.PI * freq * t) * env * 0.4;
    }
    return buffer;
  }

  /**
   * 选中单位反馈音 - 短促的确认音
   * @returns {AudioBuffer}
   */
  select() {
    const duration = 0.08;
    const buffer = this._createBuffer(duration);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / this.sampleRate;
      const env = Math.exp(-15 * t);
      data[i] = Math.sin(2 * Math.PI * 660 * t) * env * 0.4;
    }
    return buffer;
  }

  /**
   * 移动确认音效 - 短促的下降音
   * @returns {AudioBuffer}
   */
  move_confirm() {
    const duration = 0.12;
    return this._toneBuffer(duration, 500, 350, 'square');
  }

  /**
   * 攻击确认音效 - 有力的上升音
   * @returns {AudioBuffer}
   */
  attack_confirm() {
    const duration = 0.15;
    return this._toneBuffer(duration, 300, 500, 'square');
  }

  // ═══════════════════════════════════════════════════════════
  // 游戏结果音效
  // ═══════════════════════════════════════════════════════════

  /**
   * 胜利音效 - 明亮的上行音阶
   * @returns {AudioBuffer}
   */
  victory() {
    const duration = 1.0;
    const buffer = this._createBuffer(duration);
    const data = buffer.getChannelData(0);

    // C大调上行音阶：C4 D4 E4 F4 G4 A4 B4 C5
    const notes = [
      261.63, 293.66, 329.63, 349.23,
      392.00, 440.00, 493.88, 523.25
    ];
    const noteDur = duration / notes.length;

    for (let i = 0; i < data.length; i++) {
      const t = i / this.sampleRate;
      const noteIndex = Math.min(Math.floor(t / noteDur), notes.length - 1);
      const freq = notes[noteIndex];
      const localT = t - noteIndex * noteDur;
      const env = Math.exp(-3 * localT);
      // 混合方波和正弦波（明亮的chiptune音色）
      const square = Math.sin(2 * Math.PI * freq * t) > 0 ? 0.4 : -0.4;
      const sine = Math.sin(2 * Math.PI * freq * t) * 0.3;
      data[i] = (square + sine) * env;
    }
    return buffer;
  }

  /**
   * 失败音效 - 悲伤的下行音阶
   * @returns {AudioBuffer}
   */
  defeat() {
    const duration = 1.2;
    const buffer = this._createBuffer(duration);
    const data = buffer.getChannelData(0);

    // 小调下行：A4 G4 F4 E4 D4 C4
    const notes = [440.00, 392.00, 349.23, 329.63, 293.66, 261.63];
    const noteDur = duration / notes.length;

    for (let i = 0; i < data.length; i++) {
      const t = i / this.sampleRate;
      const noteIndex = Math.min(Math.floor(t / noteDur), notes.length - 1);
      const freq = notes[noteIndex];
      const localT = t - noteIndex * noteDur;
      const env = Math.exp(-2.5 * localT); // 较慢衰减，更悲伤
      // 柔和的三角波音色
      const triangle = 2 * Math.abs(2 * (freq * t % 1) - 1) - 1;
      data[i] = triangle * env * 0.4;
    }
    return buffer;
  }
}

export default SoundEffects;
