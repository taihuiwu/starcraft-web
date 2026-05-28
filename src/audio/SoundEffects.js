// ═══════════════════════════════════════════════════════════════
// StarCraft Web - 高级程序化音效生成器 (SoundEffects)
// 使用 Web Audio API 高级合成技术：
//   - ADSR包络系统
//   - FM/PM合成
//   - 波表（Waveshaping）失真
//   - 多层滤波器
//   - 粉红/棕色噪声
// 在运行时程序化生成所有游戏音效，无需外部音频文件
// 音效风格：模拟星际争霸原版的金属感/科幻感/战争感
// ═══════════════════════════════════════════════════════════════

/**
 * SoundEffects - 高级音效合成器
 *
 * 设计理念：
 * - 每个音效函数返回 AudioBuffer（可离线渲染后缓存复用）
 * - 使用多层振荡器叠加 + 滤波器 + 包络产生丰富的音色
 * - FM合成产生金属质感（星际争霸特色）
 * - Waveshaping产生温暖的过载失真
 * - 所有音效离线渲染到 AudioBuffer，播放时零CPU开销
 */
export class SoundEffects {
  /**
   * @param {AudioContext} ctx - Web Audio API 上下文
   */
  constructor(ctx) {
    /** @type {AudioContext} */
    this.ctx = ctx;
    /** @type {number} 默认采样率 */
    this.sampleRate = ctx.sampleRate;
  }

  // ═══════════════════════════════════════════════════════════
  // 基础波形生成器
  // ═══════════════════════════════════════════════════════════

  /**
   * 生成指定波形的采样值
   * @param {number} phase - 相位 (0~2π)
   * @param {string} type - 波形类型
   * @returns {number} -1.0 ~ 1.0
   */
  _waveform(phase, type) {
    const p = phase % (2 * Math.PI);
    switch (type) {
      case 'sine': return Math.sin(p);
      case 'square': return Math.sin(p) > 0 ? 1 : -1;
      case 'sawtooth': return 2 * (p / (2 * Math.PI)) - 1;
      case 'triangle': return 2 * Math.abs(2 * (p / (2 * Math.PI)) - 1) - 1;
      case 'pulse25': return Math.sin(p) > 0.25 ? 1 : -1; // 25%占空比脉冲
      case 'pulse10': return Math.sin(p) > 0.6 ? 1 : -1;  // 10%占空比脉冲
      case 'half_rect': return Math.max(0, Math.sin(p)) * 2 - 1; // 半波整流
      case 'exp_saw': { // 指数锯齿（更亮）
        const t = p / (2 * Math.PI);
        return Math.pow(t, 0.3) * 2 - 1;
      }
      default: return Math.sin(p);
    }
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
   * 生成白噪声缓冲区
   * @param {number} duration - 时长（秒）
   * @returns {AudioBuffer}
   */
  _whiteNoise(duration) {
    const buffer = this._createBuffer(duration);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  /**
   * 生成粉红噪声缓冲区（低频更多，更自然）
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
   * 生成棕色噪声缓冲区（更低沉，适合爆炸低频层）
   * @param {number} duration
   * @returns {AudioBuffer}
   */
  _brownNoise(duration) {
    const buffer = this._createBuffer(duration);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + (0.02 * white)) / 1.02;
      data[i] = last * 3.5; // 放大
    }
    return buffer;
  }

  /**
   * 将波形渲染到 AudioBuffer
   * @param {number} duration - 时长
   * @param {number|Function} freq - 频率(Hz) 或 频率函数 f(t)
   * @param {string} [waveType='sine'] - 波形类型
   * @param {Function} [envelopeFn] - 包络函数 (t, duration) => gain
   * @returns {AudioBuffer}
   */
  _toneBuffer(duration, freq, waveType = 'sine', envelopeFn = null) {
    const buffer = this._createBuffer(duration);
    const data = buffer.getChannelData(0);
    const len = data.length;
    let phase = 0;

    for (let i = 0; i < len; i++) {
      const t = i / this.sampleRate;
      const f = typeof freq === 'function' ? freq(t) : freq;
      phase += (2 * Math.PI * f) / this.sampleRate;
      let sample = this._waveform(phase, waveType);
      if (envelopeFn) {
        sample *= envelopeFn(t, duration);
      }
      data[i] = sample;
    }
    return buffer;
  }

  /**
   * ADSR包络函数
   * @param {number} attack - 攻击时间(秒)
   * @param {number} decay - 衰减时间(秒)
   * @param {number} sustain - 持续电平(0~1)
   * @param {number} release - 释放时间(秒)
   * @param {number} duration - 总时长(秒)
   * @returns {Function} (t) => gain
   */
  _adsr(attack, decay, sustain, release, duration) {
    const sustainStart = attack + decay;
    const releaseStart = duration - release;
    return (t) => {
      if (t < attack) {
        return t / attack; // Attack: 0→1
      } else if (t < sustainStart) {
        // Decay: 1→sustain
        const decayProgress = (t - attack) / decay;
        return 1 - (1 - sustain) * decayProgress;
      } else if (t < releaseStart) {
        return sustain; // Sustain
      } else {
        // Release: sustain→0
        const releaseProgress = (t - releaseStart) / release;
        return sustain * (1 - releaseProgress);
      }
    };
  }

  /**
   * 简单的指数衰减包络
   * @param {number} decay - 衰减系数
   * @returns {Function} (t) => gain
   */
  _expDecay(decay) {
    return (t) => Math.exp(-decay * t);
  }

  /**
   * 拱形包络（先升后降）
   * @param {number} duration
   * @returns {Function}
   */
  _arcEnvelope(duration) {
    return (t) => Math.sin(Math.PI * t / duration);
  }

  /**
   * 对 AudioBuffer 应用包络函数
   * @param {AudioBuffer} buffer
   * @param {Function} envelopeFn - (t) => gain
   * @returns {AudioBuffer}
   */
  _applyEnvelope(buffer, envelopeFn) {
    const out = this._createBuffer(buffer.duration, buffer.numberOfChannels);
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const src = buffer.getChannelData(ch);
      const dst = out.getChannelData(ch);
      for (let i = 0; i < src.length; i++) {
        const t = i / this.sampleRate;
        dst[i] = src[i] * envelopeFn(t);
      }
    }
    return out;
  }

  /**
   * 混合多个AudioBuffer
   * @param {...AudioBuffer} buffers - 要混合的buffer
   * @returns {AudioBuffer}
   */
  _mixBuffers(...buffers) {
    if (buffers.length === 0) return this._createBuffer(0.1);
    let maxLen = 0;
    let maxCh = 1;
    for (const b of buffers) {
      maxLen = Math.max(maxLen, b.length);
      maxCh = Math.max(maxCh, b.numberOfChannels);
    }
    const out = this.ctx.createBuffer(maxCh, maxLen, this.sampleRate);
    const outData = out.getChannelData(0);

    for (const b of buffers) {
      const data = b.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        outData[i] += data[i];
      }
    }

    // Soft clip to prevent harsh digital clipping
    for (let i = 0; i < outData.length; i++) {
      // tanh soft clipping
      outData[i] = Math.tanh(outData[i] * 1.2);
    }

    return out;
  }

  /**
   * 带权重的混合
   * @param {Array<{buffer: AudioBuffer, gain: number}>} layers
   * @returns {AudioBuffer}
   */
  _mixLayers(layers) {
    if (layers.length === 0) return this._createBuffer(0.1);
    let maxLen = 0;
    for (const l of layers) maxLen = Math.max(maxLen, l.buffer.length);
    const out = this._createBuffer(layers[0].buffer.duration);
    const outData = out.getChannelData(0);

    for (const { buffer, gain } of layers) {
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        outData[i] += data[i] * gain;
      }
    }

    // Soft clip
    for (let i = 0; i < outData.length; i++) {
      outData[i] = Math.tanh(outData[i]);
    }

    return out;
  }

  /**
   * 简单的低通滤波器（时域卷积，用于离线处理）
   * @param {AudioBuffer} buffer
   * @param {number} cutoff - 截止频率(Hz)，越低越闷
   * @returns {AudioBuffer}
   */
  _lowpass(buffer, cutoff) {
    const rc = 1.0 / (2 * Math.PI * cutoff);
    const dt = 1.0 / this.sampleRate;
    const alpha = dt / (rc + dt);

    const out = this._createBuffer(buffer.duration, buffer.numberOfChannels);
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const src = buffer.getChannelData(ch);
      const dst = out.getChannelData(ch);
      let prev = 0;
      for (let i = 0; i < src.length; i++) {
        prev = prev + alpha * (src[i] - prev);
        dst[i] = prev;
      }
    }
    return out;
  }

  /**
   * 高通滤波器
   * @param {AudioBuffer} buffer
   * @param {number} cutoff
   * @returns {AudioBuffer}
   */
  _highpass(buffer, cutoff) {
    const rc = 1.0 / (2 * Math.PI * cutoff);
    const dt = 1.0 / this.sampleRate;
    const alpha = rc / (rc + dt);

    const out = this._createBuffer(buffer.duration, buffer.numberOfChannels);
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const src = buffer.getChannelData(ch);
      const dst = out.getChannelData(ch);
      let prevIn = 0;
      let prevOut = 0;
      for (let i = 0; i < src.length; i++) {
        const out_val = alpha * (prevOut + src[i] - prevIn);
        prevIn = src[i];
        prevOut = out_val;
        dst[i] = out_val;
      }
    }
    return out;
  }

  /**
   * Waveshaping失真（产生温暖的过载/饱和感）
   * @param {AudioBuffer} buffer
   * @param {number} amount - 失真量(0~10)
   * @returns {AudioBuffer}
   */
  _distort(buffer, amount = 3) {
    const out = this._createBuffer(buffer.duration, buffer.numberOfChannels);
    for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
      const src = buffer.getChannelData(ch);
      const dst = out.getChannelData(ch);
      for (let i = 0; i < src.length; i++) {
        // Soft clip using tanh waveshaper
        dst[i] = Math.tanh(src[i] * amount);
      }
    }
    return out;
  }

  /**
   * 时间拉伸/压缩效果（简单版本，改变播放速率）
   * @param {AudioBuffer} buffer
   * @param {number} rate - 速率(>1加速，<1减速)
   * @returns {AudioBuffer}
   */
  _timeStretch(buffer, rate) {
    const newDuration = buffer.duration / rate;
    const newLen = Math.floor(buffer.length / rate);
    const out = this.ctx.createBuffer(1, newLen, this.sampleRate);
    const src = buffer.getChannelData(0);
    const dst = out.getChannelData(0);
    for (let i = 0; i < newLen; i++) {
      const srcIdx = i * rate;
      const idx = Math.floor(srcIdx);
      const frac = srcIdx - idx;
      if (idx + 1 < src.length) {
        dst[i] = src[idx] * (1 - frac) + src[idx + 1] * frac;
      } else {
        dst[i] = src[idx] || 0;
      }
    }
    return out;
  }

  // ═══════════════════════════════════════════════════════════
  // 战斗音效
  // ═══════════════════════════════════════════════════════════

  /**
   * 枪击音效 - 机枪/Gauss步枪射击
   * 多层合成：瞬态尖锐打击 + 噪声尾巴 + 低频冲击
   * 模拟星际争霸机枪兵的步枪声
   * @returns {AudioBuffer}
   */
  gunshot() {
    const duration = 0.12;

    // 层1：瞬态打击 — 极短的方波脉冲（模拟火药爆裂）
    const attack = this._toneBuffer(0.015, 1800, 'square', this._expDecay(200));

    // 层2：主体冲击 — 锯齿波快速下滑
    const body = this._toneBuffer(0.06, (t) => {
      return 1200 - t * 15000; // 1200Hz → 300Hz 快速下滑
    }, 'sawtooth', this._expDecay(30));

    // 层3：噪声尾巴 — 粉红噪声衰减（弹壳声）
    const noise = this._pinkNoise(0.08);
    const noiseEnv = this._applyEnvelope(noise, this._expDecay(25));

    // 层4：低频冲击
    const sub = this._toneBuffer(0.04, 80, 'sine', this._expDecay(50));

    return this._mixLayers([
      { buffer: attack, gain: 0.5 },
      { buffer: body, gain: 0.6 },
      { buffer: noiseEnv, gain: 0.7 },
      { buffer: sub, gain: 0.8 },
    ]);
  }

  /**
   * 爆炸音效 - 坦克炮击/建筑爆炸
   * 四层合成：亚低频冲击 + 棕色噪声 + 粉红噪声碎片 + 高频碎裂
   * @returns {AudioBuffer}
   */
  explosion() {
    const duration = 1.2;

    // 层1：亚低频冲击 — 60Hz → 15Hz 超低频下扫
    const subBass = this._toneBuffer(0.6, (t) => 60 - t * 75, 'sine', this._expDecay(4));

    // 层2：棕色噪声主体 — 低沉的隆隆声
    const brown = this._brownNoise(0.8);
    const brownEnv = this._applyEnvelope(brown, this._expDecay(3));

    // 层3：粉红噪声碎片 — 冲击波的中频部分
    const pink = this._pinkNoise(0.5);
    const pinkEnv = this._applyEnvelope(pink, this._expDecay(5));

    // 层4：白噪声高频尾焰 — 碎片飞散
    const white = this._whiteNoise(0.3);
    const whiteEnv = this._applyEnvelope(white, this._expDecay(8));
    const whiteFiltered = this._lowpass(this._highpass(whiteEnv, 2000), 8000);

    // 层5：低通滤波后的噪声增加厚度
    const thick = this._lowpass(pinkEnv, 300);

    return this._mixLayers([
      { buffer: subBass, gain: 1.0 },
      { buffer: brownEnv, gain: 0.8 },
      { buffer: pinkEnv, gain: 0.5 },
      { buffer: whiteFiltered, gain: 0.3 },
      { buffer: thick, gain: 0.4 },
    ]);
  }

  /**
   * 激光/光束音效 - Ghost的等离子步枪 / 科技武器
   * FM合成 + 频率扫描 + 共振滤波
   * @returns {AudioBuffer}
   */
  laser() {
    const duration = 0.35;

    // FM合成：载波频率下滑 + 调制频率产生金属感
    const buffer = this._createBuffer(duration);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / this.sampleRate;
      const progress = i / data.length;

      // 载波频率：2000Hz → 200Hz 下扫
      const carrierFreq = 2000 - 1800 * progress;
      // 调制频率：固定的比率产生金属泛音
      const modFreq = carrierFreq * 2.5;
      // 调制深度：随时间减小
      const modDepth = 800 * (1 - progress * 0.7);

      // FM合成
      const modSignal = Math.sin(2 * Math.PI * modFreq * t);
      const carrier = Math.sin(2 * Math.PI * carrierFreq * t + modDepth * modSignal / modFreq);

      // 包络：快速攻击 + 中等衰减
      const env = Math.exp(-6 * t) * (t < 0.01 ? t / 0.01 : 1);

      // 额外泛音层
      const harmonic = Math.sin(2 * Math.PI * carrierFreq * 1.5 * t) * 0.2;

      data[i] = (carrier + harmonic) * env * 0.5;
    }

    // 加一点噪声增加"嘶嘶"感
    const noise = this._whiteNoise(duration);
    const noiseEnv = this._applyEnvelope(noise, this._expDecay(15));
    const filteredNoise = this._highpass(noiseEnv, 4000);

    return this._mixLayers([
      { buffer, gain: 1.0 },
      { buffer: filteredNoise, gain: 0.15 },
    ]);
  }

  /**
   * 护盾被击中音效 - Protoss护盾受击
   * 金属FM合成 + 快速调频 = "嗡"的电子碰撞声
   * @returns {AudioBuffer}
   */
  shield_hit() {
    const duration = 0.3;
    const buffer = this._createBuffer(duration);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / this.sampleRate;
      const env = Math.exp(-10 * t);

      // 主FM合成 — 高频金属感
      const carrier = 1200 + 400 * Math.sin(2 * Math.PI * 25 * t);
      const modulator = Math.sin(2 * Math.PI * carrier * 2.0 * t + 3.0 * Math.sin(2 * Math.PI * 15 * t));
      const main = modulator * env;

      // 高频闪烁层 — 模拟能量闪烁
      const flicker = Math.sin(2 * Math.PI * 3200 * t) * Math.sin(2 * Math.PI * 80 * t) * env * 0.3;

      // 中频共鸣
      const resonance = Math.sin(2 * Math.PI * 600 * t) * env * 0.2 * Math.exp(-15 * t);

      data[i] = (main * 0.5 + flicker + resonance) * 0.6;
    }

    return this._distort(buffer, 1.5);
  }

  /**
   * 导弹发射音效
   * 呼啸声 + 尾焰噪声
   * @returns {AudioBuffer}
   */
  missile_launch() {
    const duration = 0.5;

    // 呼啸声：频率上升
    const whoosh = this._toneBuffer(0.4, (t) => 200 + 800 * (t / 0.4), 'sawtooth',
      this._adsr(0.02, 0.1, 0.6, 0.2, 0.4));

    // 尾焰噪声
    const flame = this._whiteNoise(0.3);
    const flameEnv = this._applyEnvelope(flame, this._adsr(0.01, 0.05, 0.5, 0.2, 0.3));
    const flameFiltered = this._lowpass(flameEnv, 2000);

    // 低频推力
    const thrust = this._toneBuffer(0.4, 50, 'sine', this._adsr(0.01, 0.1, 0.7, 0.2, 0.4));

    return this._mixLayers([
      { buffer: whoosh, gain: 0.5 },
      { buffer: flameFiltered, gain: 0.4 },
      { buffer: thrust, gain: 0.6 },
    ]);
  }

  // ═══════════════════════════════════════════════════════════
  // 建造/科技音效
  // ═══════════════════════════════════════════════════════════

  /**
   * 建造完成音效 - 明亮的上行和弦
   * 星际争霸风格：机械感的确认音
   * @returns {AudioBuffer}
   */
  building_complete() {
    const duration = 0.8;
    const buffer = this._createBuffer(duration);
    const data = buffer.getChannelData(0);

    // 上升和弦：C4 → E4 → G4 → C5，每音用不同波形
    const notes = [
      { freq: 261.63, wave: 'square', dur: 0.15 },   // C4
      { freq: 329.63, wave: 'sawtooth', dur: 0.15 },  // E4
      { freq: 392.00, wave: 'square', dur: 0.15 },    // G4
      { freq: 523.25, wave: 'sawtooth', dur: 0.25 },  // C5（稍长）
    ];

    let time = 0;
    for (const note of notes) {
      const startSample = Math.floor(time * this.sampleRate);
      const endSample = Math.floor((time + note.dur) * this.sampleRate);
      let phase = 0;

      for (let i = startSample; i < endSample && i < data.length; i++) {
        const t = (i - startSample) / this.sampleRate;
        const progress = (i - startSample) / (endSample - startSample);
        phase += (2 * Math.PI * note.freq) / this.sampleRate;

        // ADSR: 快速攻击、短衰减、中等持续、短释放
        let env;
        if (t < 0.005) env = t / 0.005;
        else if (t < 0.03) env = 1 - 0.3 * ((t - 0.005) / 0.025);
        else if (t < note.dur - 0.02) env = 0.7;
        else env = 0.7 * (1 - (t - (note.dur - 0.02)) / 0.02);

        // 基波 + 泛音（增加亮度）
        const fundamental = this._waveform(phase, note.wave);
        const harmonic2 = this._waveform(phase * 2, 'sine') * 0.3;

        data[i] += (fundamental + harmonic2) * env * 0.25;
      }
      time += note.dur;
    }

    // 加一层噪声冲击
    const click = this._whiteNoise(0.02);
    const clickEnv = this._applyEnvelope(click, this._expDecay(100));
    const clickData = clickEnv.getChannelData(0);
    for (let i = 0; i < clickData.length && i < data.length; i++) {
      data[i] += clickData[i] * 0.1;
    }

    // Soft clip
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.tanh(data[i] * 1.5);
    }

    return buffer;
  }

  /**
   * 开始建造音效 - 机械启动声
   * 锯齿波频率上升 + 金属噪声
   * @returns {AudioBuffer}
   */
  build_start() {
    const duration = 0.4;

    // 主音：锯齿波频率上升
    const main = this._toneBuffer(duration, (t) => 80 + 600 * Math.pow(t / duration, 0.7),
      'sawtooth', this._adsr(0.01, 0.08, 0.5, 0.15, duration));

    // 金属噪声层
    const metal = this._pinkNoise(0.15);
    const metalEnv = this._applyEnvelope(metal, this._expDecay(15));
    const metalFilt = this._highpass(metalEnv, 3000);

    // 低频机械轰鸣
    const rumble = this._toneBuffer(duration, 45, 'sine',
      this._adsr(0.02, 0.1, 0.3, 0.2, duration));

    return this._mixLayers([
      { buffer: main, gain: 0.6 },
      { buffer: metalFilt, gain: 0.2 },
      { buffer: rumble, gain: 0.3 },
    ]);
  }

  /**
   * 研发完成音效 - 明亮和弦 + 扩散尾音
   * @returns {AudioBuffer}
   */
  research_complete() {
    const duration = 1.0;
    const buffer = this._createBuffer(duration);
    const data = buffer.getChannelData(0);

    // C大三和弦 + 八度：C5, E5, G5, C6
    const chordFreqs = [523.25, 659.25, 783.99, 1046.5];
    const chordDuration = 0.6;
    const chordEnvelope = this._adsr(0.01, 0.15, 0.4, 0.3, chordDuration);

    for (let i = 0; i < Math.floor(chordDuration * this.sampleRate) && i < data.length; i++) {
      const t = i / this.sampleRate;
      const env = chordEnvelope(t);
      let sample = 0;
      for (let j = 0; j < chordFreqs.length; j++) {
        // 每个音符用不同波形增加丰富度
        const wave = j % 2 === 0 ? 'sawtooth' : 'square';
        sample += this._waveform(2 * Math.PI * chordFreqs[j] * t, wave) * 0.3;
      }
      data[i] = (sample / chordFreqs.length) * env * 0.4;
    }

    // 尾音：正弦波延迟衰减
    const tail = this._toneBuffer(0.4, 1046.5, 'sine', this._expDecay(4));
    const tailData = tail.getChannelData(0);
    const tailStart = Math.floor(0.3 * this.sampleRate);
    for (let i = 0; i < tailData.length; i++) {
      const idx = tailStart + i;
      if (idx < data.length) {
        data[idx] += tailData[i] * 0.2;
      }
    }

    // Soft clip
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.tanh(data[i] * 1.3);
    }

    return buffer;
  }

  /**
   * 资源采集完成音效 - 明亮的金属叮声
   * @returns {AudioBuffer}
   */
  resource_collect() {
    const duration = 0.2;
    const buffer = this._createBuffer(duration);
    const data = buffer.getChannelData(0);

    // 双音：金属质感的FM合成
    for (let i = 0; i < data.length; i++) {
      const t = i / this.sampleRate;
      const env = Math.exp(-18 * t);

      // 高音FM
      const high = Math.sin(2 * Math.PI * 2500 * t + 2.0 * Math.sin(2 * Math.PI * 4000 * t));

      // 低音基频
      const low = Math.sin(2 * Math.PI * 1500 * t) * 0.5;

      // 瞬态点击
      const click = t < 0.003 ? Math.sin(2 * Math.PI * 8000 * t) : 0;

      data[i] = (high * 0.4 + low + click * 0.3) * env * 0.35;
    }

    return buffer;
  }

  // ═══════════════════════════════════════════════════════════
  // 单位相关音效
  // ═══════════════════════════════════════════════════════════

  /**
   * 单位死亡音效 - 惨烈的爆炸 + 下降音调
   * @returns {AudioBuffer}
   */
  unit_death() {
    const duration = 0.7;

    // 下降音调：FM合成，产生金属感
    const buffer = this._createBuffer(duration);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / this.sampleRate;
      const progress = i / data.length;

      // 频率下滑
      const freq = 500 - 420 * progress;
      // FM调制增加金属感
      const modDepth = 300 * (1 - progress);
      const modSignal = Math.sin(2 * Math.PI * freq * 2 * t);
      const carrier = Math.sin(2 * Math.PI * freq * t + modDepth * modSignal / freq);

      const env = Math.exp(-4 * t);

      // 略带失真的音色
      data[i] = Math.tanh(carrier * 2) * env * 0.4;
    }

    // 爆炸噪声层
    const noise = this._whiteNoise(0.4);
    const noiseEnv = this._applyEnvelope(noise, this._expDecay(4));

    // 低频冲击
    const sub = this._toneBuffer(0.3, 40, 'sine', this._expDecay(6));

    return this._mixLayers([
      { buffer, gain: 1.0 },
      { buffer: noiseEnv, gain: 0.5 },
      { buffer: sub, gain: 0.6 },
    ]);
  }

  /**
   * 治疗音效 - 柔和的Pad音色
   * 多个正弦波和声 + 轻微的合唱效果
   * @returns {AudioBuffer}
   */
  heal() {
    const duration = 0.8;
    const buffer = this._createBuffer(duration);
    const data = buffer.getChannelData(0);

    // 和声：C4, E4, G4（大三和弦）
    const freqs = [261.63, 329.63, 392.00];
    const envelope = this._adsr(0.1, 0.1, 0.6, 0.3, duration);

    for (let i = 0; i < data.length; i++) {
      const t = i / this.sampleRate;
      const env = envelope(t);
      let sample = 0;

      for (let j = 0; j < freqs.length; j++) {
        // 轻微的频率偏移产生合唱/Pad效果
        const detune = 1 + (j * 0.003); // ±0.3% 微偏调
        sample += Math.sin(2 * Math.PI * freqs[j] * detune * t);
      }

      // 高八度泛音（柔和）
      sample += Math.sin(2 * Math.PI * 523.25 * t) * 0.15;
      sample += Math.sin(2 * Math.PI * 659.25 * t) * 0.1;

      // 低通滤波效果（柔和化）
      data[i] = (sample / (freqs.length + 0.25)) * env * 0.25;
    }

    // 低通滤波使音色更柔和
    return this._lowpass(buffer, 2000);
  }

  /**
   * 护盾恢复音效 - Protoss护盾充能
   * @returns {AudioBuffer}
   */
  shield_recharge() {
    const duration = 0.6;
    const buffer = this._createBuffer(duration);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / this.sampleRate;
      const progress = i / data.length;

      // 上升的FM合成音
      const freq = 300 + 400 * progress;
      const mod = Math.sin(2 * Math.PI * freq * 3 * t) * 2;
      const carrier = Math.sin(2 * Math.PI * freq * t + mod);

      // ADSR-like envelope
      const env = this._adsr(0.05, 0.1, 0.5, 0.2, duration)(t);

      // 能量闪烁
      const flicker = Math.sin(2 * Math.PI * 2000 * t) * Math.sin(2 * Math.PI * 12 * t) * 0.15;

      data[i] = (carrier * 0.4 + flicker) * env * 0.3;
    }

    return this._lowpass(buffer, 3000);
  }

  /**
   * 雷达扫描音效
   * @returns {AudioBuffer}
   */
  scan() {
    const duration = 0.6;
    const buffer = this._createBuffer(duration);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / this.sampleRate;
      const progress = i / data.length;

      // 频率扫描：低→高→低
      const freq = 400 + 200 * Math.sin(Math.PI * progress);
      const env = Math.sin(Math.PI * progress) * Math.exp(-2 * t);

      // 正弦波 + 轻微失真
      const sig = Math.sin(2 * Math.PI * freq * t);
      data[i] = Math.tanh(sig * 1.5) * env * 0.3;
    }

    return buffer;
  }

  // ═══════════════════════════════════════════════════════════
  // UI交互音效
  // ═══════════════════════════════════════════════════════════

  /**
   * UI点击反馈音效 - 短促清脆的确认音
   * @returns {AudioBuffer}
   */
  click() {
    const duration = 0.06;
    const buffer = this._createBuffer(duration);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / this.sampleRate;
      const env = Math.exp(-40 * t);

      // 方波 + 正弦泛音（清脆但不刺耳）
      const square = Math.sin(2 * Math.PI * 880 * t) > 0 ? 0.5 : -0.5;
      const sine = Math.sin(2 * Math.PI * 1760 * t) * 0.3;

      data[i] = (square + sine) * env * 0.35;
    }

    return buffer;
  }

  /**
   * 警报/被攻击音效 - 急促的双音交替 + 金属层
   * @returns {AudioBuffer}
   */
  alert() {
    const duration = 0.6;
    const buffer = this._createBuffer(duration);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / this.sampleRate;
      const env = this._arcEnvelope(duration)(t);

      // 交替两个频率（比之前的更丰富）
      const freq = (Math.floor(t * 12) % 2 === 0) ? 520 : 780;

      // 方波 + 泛音
      const square = Math.sin(2 * Math.PI * freq * t) > 0 ? 0.4 : -0.4;
      const harmonic = Math.sin(2 * Math.PI * freq * 2 * t) * 0.15;

      // 低频警告底音
      const warning = Math.sin(2 * Math.PI * 200 * t) * 0.1 * Math.sin(2 * Math.PI * 3 * t);

      data[i] = (square + harmonic + warning) * env * 0.4;
    }

    return buffer;
  }

  /**
   * 选中单位反馈音 - 星际争霸风格的确认音
   * 明亮的FM合成音
   * @returns {AudioBuffer}
   */
  select() {
    const duration = 0.1;
    const buffer = this._createBuffer(duration);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / this.sampleRate;
      const env = Math.exp(-20 * t);

      // FM合成的明亮确认音
      const mod = Math.sin(2 * Math.PI * 1800 * t) * 1.5;
      const carrier = Math.sin(2 * Math.PI * 880 * t + mod);

      // 加一点高频点击
      const click = t < 0.002 ? Math.sin(2 * Math.PI * 4000 * t) : 0;

      data[i] = (carrier * 0.5 + click * 0.3) * env * 0.4;
    }

    return buffer;
  }

  /**
   * 移动确认音效 - 短促的下降音
   * @returns {AudioBuffer}
   */
  move_confirm() {
    const duration = 0.12;
    const buffer = this._createBuffer(duration);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / this.sampleRate;
      const progress = i / data.length;
      const env = Math.exp(-15 * t);

      // 频率下滑：500→300
      const freq = 500 - 200 * progress;
      // 方波 + 正弦
      const square = Math.sin(2 * Math.PI * freq * t) > 0 ? 0.4 : -0.4;
      const sine = Math.sin(2 * Math.PI * freq * t) * 0.3;

      data[i] = (square + sine) * env * 0.35;
    }

    return buffer;
  }

  /**
   * 攻击确认音效 - 有力的上升音
   * @returns {AudioBuffer}
   */
  attack_confirm() {
    const duration = 0.15;
    const buffer = this._createBuffer(duration);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / this.sampleRate;
      const progress = i / data.length;
      const env = Math.exp(-10 * t);

      // 频率上升：300→600
      const freq = 300 + 300 * progress;
      const square = Math.sin(2 * Math.PI * freq * t) > 0 ? 0.45 : -0.45;
      const saw = 2 * (freq * t % 1) - 1;

      data[i] = (square * 0.5 + saw * 0.3) * env * 0.35;
    }

    return buffer;
  }

  /**
   * 建造面板打开/关闭音效
   * @returns {AudioBuffer}
   */
  panel_open() {
    const duration = 0.15;
    const buffer = this._createBuffer(duration);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / this.sampleRate;
      const progress = i / data.length;
      const env = Math.exp(-12 * t);

      const freq = 300 + 500 * progress;
      data[i] = Math.sin(2 * Math.PI * freq * t) * env * 0.3;
    }

    return buffer;
  }

  /**
   * 按钮悬停音效 - 极短的高频tick
   * @returns {AudioBuffer}
   */
  hover_tick() {
    const duration = 0.03;
    return this._toneBuffer(duration, 2000, 'sine', this._expDecay(80));
  }

  // ═══════════════════════════════════════════════════════════
  // 游戏结果音效
  // ═══════════════════════════════════════════════════════════

  /**
   * 胜利音效 - 明亮的上行音阶 + 胜利号角
   * @returns {AudioBuffer}
   */
  victory() {
    const duration = 1.5;
    const buffer = this._createBuffer(duration);
    const data = buffer.getChannelData(0);

    // C大调上行音阶：C4 D4 E4 F4 G4 A4 B4 C5
    const notes = [
      261.63, 293.66, 329.63, 349.23,
      392.00, 440.00, 493.88, 523.25,
    ];
    const noteDur = 0.15;
    const envelope = this._adsr(0.005, 0.03, 0.6, 0.05, noteDur);

    for (let i = 0; i < data.length; i++) {
      const t = i / this.sampleRate;
      const noteIndex = Math.min(Math.floor(t / noteDur), notes.length - 1);
      const freq = notes[noteIndex];
      const localT = t - noteIndex * noteDur;
      const env = envelope(localT);

      // 混合方波（明亮）+ 正弦（温暖）+ 泛音
      const square = this._waveform(2 * Math.PI * freq * t, 'square') * 0.35;
      const sine = Math.sin(2 * Math.PI * freq * t) * 0.3;
      const harm2 = Math.sin(2 * Math.PI * freq * 2 * t) * 0.1;

      data[i] = (square + sine + harm2) * env;
    }

    // 最后一个音符延长为号角
    const hornStart = notes.length * noteDur;
    const hornDuration = 0.5;
    for (let i = 0; i < hornDuration * this.sampleRate; i++) {
      const t = i / this.sampleRate;
      const idx = Math.floor(hornStart * this.sampleRate) + i;
      if (idx >= data.length) break;

      const env = Math.exp(-2.5 * t) * 0.5;
      // 号角音色：方波 + 泛音
      const horn = this._waveform(2 * Math.PI * 523.25 * t, 'square') * 0.3
        + Math.sin(2 * Math.PI * 523.25 * t) * 0.2
        + Math.sin(2 * Math.PI * 1046.5 * t) * 0.1;

      data[idx] += horn * env;
    }

    // Soft clip
    for (let i = 0; i < data.length; i++) {
      data[i] = Math.tanh(data[i] * 1.2);
    }

    return buffer;
  }

  /**
   * 失败音效 - 悲伤的下行音阶
   * @returns {AudioBuffer}
   */
  defeat() {
    const duration = 1.5;
    const buffer = this._createBuffer(duration);
    const data = buffer.getChannelData(0);

    // 小调下行：A4 G4 F4 E4 D4 C4
    const notes = [440.00, 392.00, 349.23, 329.63, 293.66, 261.63];
    const noteDur = 0.2;
    const envelope = this._adsr(0.005, 0.05, 0.4, 0.1, noteDur);

    for (let i = 0; i < data.length; i++) {
      const t = i / this.sampleRate;
      const noteIndex = Math.min(Math.floor(t / noteDur), notes.length - 1);
      const freq = notes[noteIndex];
      const localT = t - noteIndex * noteDur;
      const env = envelope(localT);

      // 柔和的三角波 + 正弦（悲伤感）
      const triangle = this._waveform(2 * Math.PI * freq * t, 'triangle') * 0.35;
      const sine = Math.sin(2 * Math.PI * freq * t) * 0.3;

      data[i] = (triangle + sine) * env * 0.8;
    }

    // 低沉的尾音：小三度下行
    const tailStart = notes.length * noteDur;
    for (let i = 0; i < 0.4 * this.sampleRate; i++) {
      const t = i / this.sampleRate;
      const idx = Math.floor(tailStart * this.sampleRate) + i;
      if (idx >= data.length) break;

      const env = Math.exp(-3 * t) * 0.3;
      data[idx] += Math.sin(2 * Math.PI * 220 * t) * env;
    }

    // 低通滤波使其更沉闷
    const filtered = this._lowpass(buffer, 3000);
    return filtered;
  }

  // ═══════════════════════════════════════════════════════════
  // 环境/特效音效
  // ═══════════════════════════════════════════════════════════

  /**
   * 选中框绘制音效
   * @returns {AudioBuffer}
   */
  selection_box() {
    const duration = 0.05;
    const buffer = this._createBuffer(duration);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / this.sampleRate;
      const env = Math.exp(-50 * t);
      data[i] = Math.sin(2 * Math.PI * 1500 * t) * env * 0.2;
    }

    return buffer;
  }

  /**
   * 基地受损警报
   * @returns {AudioBuffer}
   */
  base_under_attack() {
    const duration = 0.8;
    const buffer = this._createBuffer(duration);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / this.sampleRate;
      const progress = i / data.length;
      const env = this._arcEnvelope(duration)(t);

      // 三音交替警报
      const noteIdx = Math.floor(t * 8) % 3;
      const freqs = [440, 554, 660];
      const freq = freqs[noteIdx];

      const square = this._waveform(2 * Math.PI * freq * t, 'square') * 0.3;
      const sine = Math.sin(2 * Math.PI * freq * t) * 0.2;

      data[i] = (square + sine) * env * 0.4;
    }

    return buffer;
  }

  /**
   * 传送/召回音效 - Protoss recall
   * @returns {AudioBuffer}
   */
  recall() {
    const duration = 0.6;
    const buffer = this._createBuffer(duration);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / this.sampleRate;
      const progress = i / data.length;

      // 上升的FM音
      const freq = 200 + 800 * progress;
      const mod = Math.sin(2 * Math.PI * freq * 3 * t) * 3;
      const carrier = Math.sin(2 * Math.PI * freq * t + mod);

      // 能量聚集效果：振幅先增后减
      const energyEnv = Math.sin(Math.PI * progress) * Math.exp(-2 * t);

      // 噪声层
      const noise = Math.sin(2 * Math.PI * 6000 * t) * Math.sin(2 * Math.PI * 50 * t) * 0.1;

      data[i] = (carrier * 0.4 + noise) * energyEnv * 0.4;
    }

    return this._lowpass(buffer, 4000);
  }

  /**
   * EMP冲击音效 - Ghost的EMP震荡波
   * @returns {AudioBuffer}
   */
  emp() {
    const duration = 0.5;

    // 白噪声冲击
    const noise = this._whiteNoise(0.15);
    const noiseEnv = this._applyEnvelope(noise, this._expDecay(15));
    const noiseFilt = this._lowpass(noiseEnv, 3000);

    // 电磁脉冲：极低频振荡
    const pulse = this._toneBuffer(0.4, (t) => 30 + 20 * Math.sin(2 * Math.PI * 8 * t),
      'sine', this._expDecay(5));

    // 高频残余
    const residual = this._toneBuffer(0.3, 4000, 'sine', this._expDecay(10));

    return this._mixLayers([
      { buffer: noiseFilt, gain: 0.6 },
      { buffer: pulse, gain: 0.8 },
      { buffer: residual, gain: 0.1 },
    ]);
  }

  /**
   * 力场音效 - Sentry的Force Field
   * @returns {AudioBuffer}
   */
  force_field() {
    const duration = 0.4;
    const buffer = this._createBuffer(duration);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / this.sampleRate;
      const progress = i / data.length;

      // 能量嗡鸣
      const hum = Math.sin(2 * Math.PI * 300 * t) * 0.3;

      // 高频能量
      const energy = Math.sin(2 * Math.PI * 2000 * t + 5 * Math.sin(2 * Math.PI * 10 * t));

      // 包络
      const env = Math.sin(Math.PI * progress) * 0.8 + 0.2 * Math.exp(-5 * t);

      data[i] = (hum + energy * 0.2) * env * 0.3;
    }

    return this._lowpass(buffer, 2500);
  }
}

export default SoundEffects;
