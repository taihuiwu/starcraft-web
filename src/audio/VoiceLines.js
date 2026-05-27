// ═══════════════════════════════════════════════════════════════
// StarCraft Web - 单位语音提示生成器 (VoiceLines)
// 程序化生成不同种族的单位响应语音
// 每个种族有独特的音色特征和音调组合
// ═══════════════════════════════════════════════════════════════

/**
 * 种族音色特征：
 * - 人族 (Terran)：电子/机械音色 → 方波 + 频率调制
 * - 虫族 (Zerg)：有机/黏液音色 → 低频 + 噪声调制
 * - 神族 (Protoss)：空灵/共鸣音色 → 正弦波 + 延迟和声
 */

/**
 * VoiceLines - 单位语音生成器
 *
 * 设计理念：
 * - 每个语音由多个短促音调组合而成，模拟语言的节奏
 * - 不同种族使用不同波形和谐波结构
 * - 语音事件类型：confirm（确认）、select（选中）、attack（攻击）、lowhp（低血量）
 */
export class VoiceLines {
  /**
   * @param {AudioContext} ctx - Web Audio API 上下文
   */
  constructor(ctx) {
    /** @type {AudioContext} */
    this.ctx = ctx;
    /** @type {number} */
    this.sampleRate = ctx.sampleRate;
  }

  // ═══════════════════════════════════════════════════════════
  // 辅助方法
  // ═══════════════════════════════════════════════════════════

  /**
   * 创建空白 AudioBuffer
   * @param {number} duration - 时长（秒）
   * @param {number} [channels=1] - 声道数
   * @returns {AudioBuffer}
   */
  _createBuffer(duration, channels = 1) {
    return this.ctx.createBuffer(channels, this.sampleRate * duration, this.sampleRate);
  }

  /**
   * 生成人族机械音色
   * 特征：方波基音 + 低频振幅调制（机械颤音）
   * @param {number} freq - 基本频率
   * @param {number} duration - 时长
   * @param {number} [volume=0.3] - 音量
   * @returns {AudioBuffer}
   */
  _terranVoice(freq, duration, volume = 0.3) {
    const buffer = this._createBuffer(duration);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / this.sampleRate;
      const progress = i / data.length;

      // ADSR 包络
      let env = 1;
      if (progress < 0.03) env = progress / 0.03;
      else if (progress > 0.85) env = (1 - progress) / 0.15;

      // 方波基音（机械感）
      const square = Math.sin(2 * Math.PI * freq * t) > 0 ? 1 : -1;
      // 低频振幅调制（机械颤音，模拟伺服电机声）
      const tremolo = 0.5 + 0.5 * Math.sin(2 * Math.PI * 15 * t);
      // 轻微的频率偏移（增加机械不稳定性）
      const freqMod = freq * (1 + 0.02 * Math.sin(2 * Math.PI * 5 * t));

      data[i] = square * tremolo * env * volume;
    }
    return buffer;
  }

  /**
   * 生成虫族有机音色
   * 特征：锯齿波基音 + 噪声调制 + 低频涌动（黏液感）
   * @param {number} freq - 基本频率
   * @param {number} duration - 时长
   * @param {number} [volume=0.3] - 音量
   * @returns {AudioBuffer}
   */
  _zergVoice(freq, duration, volume = 0.3) {
    const buffer = this._createBuffer(duration);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < data.length; i++) {
      const t = i / this.sampleRate;
      const progress = i / data.length;

      // ADSR 包络（起音稍慢，更有"蠕动"感）
      let env = 1;
      if (progress < 0.05) env = progress / 0.05;
      else if (progress > 0.8) env = (1 - progress) / 0.2;

      // 锯齿波基音（粗糙感）
      const saw = 2 * (freq * t % 1) - 1;
      // 低频涌动（3-5Hz，有机蠕动感）
      const organic = Math.sin(2 * Math.PI * 4 * t + Math.sin(2 * Math.PI * 1.5 * t) * 3);
      // 噪声成分（黏液/嘶嘶声）
      const noise = (Math.random() * 2 - 1) * 0.15;
      // 频率波动（不稳定的生物音）
      const freqVar = freq * (1 + 0.05 * Math.sin(2 * Math.PI * 3 * t));

      const sawMod = 2 * (freqVar * t % 1) - 1;
      data[i] = (sawMod * 0.5 + organic * 0.2 + noise) * env * volume;
    }
    return buffer;
  }

  /**
   * 生成神族空灵音色
   * 特征：正弦波 + 泛音 + 延迟回声（共鸣/灵能感）
   * @param {number} freq - 基本频率
   * @param {number} duration - 时长
   * @param {number} [volume=0.3] - 音量
   * @returns {AudioBuffer}
   */
  _protossVoice(freq, duration, volume = 0.3) {
    const buffer = this._createBuffer(duration);
    const data = buffer.getChannelData(0);
    const delay = Math.floor(0.015 * this.sampleRate); // 15ms 延迟

    for (let i = 0; i < data.length; i++) {
      const t = i / this.sampleRate;
      const progress = i / data.length;

      // 柔和包络
      let env = 1;
      if (progress < 0.08) env = progress / 0.08;
      else if (progress > 0.75) env = (1 - progress) / 0.25;

      // 基音：纯净正弦波
      const fundamental = Math.sin(2 * Math.PI * freq * t);
      // 泛音：高八度 + 大三度（空灵和声）
      const harmonic1 = Math.sin(2 * Math.PI * freq * 2 * t) * 0.3;
      const harmonic2 = Math.sin(2 * Math.PI * freq * 1.26 * t) * 0.2;
      // 低频呼吸感
      const breath = 0.7 + 0.3 * Math.sin(2 * Math.PI * 0.5 * t);

      // 延迟/回声效果
      const delayed = i >= delay ? data[i - delay] * 0.3 : 0;

      data[i] = (fundamental * 0.5 + harmonic1 + harmonic2 + delayed) * env * breath * volume;
    }
    return buffer;
  }

  /**
   * 生成音调序列（快速连续的音调，模拟说话节奏）
   * @param {number[]} freqs - 频率数组
   * @param {number} noteDuration - 每个音调的时长（秒）
   * @param {Function} voiceGenerator - 种族音色生成函数
   * @returns {AudioBuffer}
   */
  _generateToneSequence(freqs, noteDuration, voiceGenerator) {
    const totalDuration = freqs.length * noteDuration + 0.05;
    const buffer = this._createBuffer(totalDuration);
    const data = buffer.getChannelData(0);

    for (let n = 0; n < freqs.length; n++) {
      const freq = freqs[n];
      const singleNote = voiceGenerator.call(this, freq, noteDuration, 0.25);
      const noteData = singleNote.getChannelData(0);
      const startSample = Math.floor(n * noteDuration * this.sampleRate);

      for (let i = 0; i < noteData.length && startSample + i < data.length; i++) {
        data[startSample + i] = noteData[i];
      }
    }

    return buffer;
  }

  // ═══════════════════════════════════════════════════════════
  // 人族语音
  // ═══════════════════════════════════════════════════════════

  /**
   * 人族确认音 - 收到命令时的反馈
   * 短促的双音调："Roger that" 风格
   * @returns {AudioBuffer}
   */
  terran_confirm() {
    return this._generateToneSequence(
      [400, 500],      // 两个上升音调
      0.08,            // 每个音调80ms
      this._terranVoice
    );
  }

  /**
   * 人族选中音 - 点击单位时的响应
   * 稍长的三音调："Reporting" 风格
   * @returns {AudioBuffer}
   */
  terran_select() {
    return this._generateToneSequence(
      [350, 450, 500], // 三音上升
      0.06,
      this._terranVoice
    );
  }

  /**
   * 人族攻击音 - 开始战斗的呐喊
   * 高亢有力的双音
   * @returns {AudioBuffer}
   */
  terran_attack() {
    return this._generateToneSequence(
      [500, 600, 550], // 先升后降
      0.07,
      this._terranVoice
    );
  }

  /**
   * 人族低血量警报 - 紧急的重复音调
   * @returns {AudioBuffer}
   */
  terran_lowhp() {
    return this._generateToneSequence(
      [600, 400, 600, 400, 600], // 交替高低
      0.05,
      this._terranVoice
    );
  }

  // ═══════════════════════════════════════════════════════════
  // 虫族语音
  // ═══════════════════════════════════════════════════════════

  /**
   * 虫族确认音 - 低沉的嘶吼
   * @returns {AudioBuffer}
   */
  zerg_confirm() {
    return this._generateToneSequence(
      [200, 180],      // 低沉下降
      0.1,
      this._zergVoice
    );
  }

  /**
   * 虫族选中音 - 生物响应声
   * @returns {AudioBuffer}
   */
  zerg_select() {
    return this._generateToneSequence(
      [180, 220, 200], // 波动
      0.08,
      this._zergVoice
    );
  }

  /**
   * 虫族攻击音 - 愤怒的嘶吼
   * @returns {AudioBuffer}
   */
  zerg_attack() {
    return this._generateToneSequence(
      [250, 300, 280, 320], // 上升并波动
      0.06,
      this._zergVoice
    );
  }

  /**
   * 虫族低血量警报 - 痛苦的呻吟
   * @returns {AudioBuffer}
   */
  zerg_lowhp() {
    return this._generateToneSequence(
      [150, 120, 150, 100], // 交替低沉
      0.08,
      this._zergVoice
    );
  }

  // ═══════════════════════════════════════════════════════════
  // 神族语音
  // ═══════════════════════════════════════════════════════════

  /**
   * 神族确认音 - 空灵的和声回应
   * @returns {AudioBuffer}
   */
  protoss_confirm() {
    return this._generateToneSequence(
      [440, 550],      // 大三度上行（庄严感）
      0.1,
      this._protossVoice
    );
  }

  /**
   * 神族选中音 - 共鸣的提示
   * @returns {AudioBuffer}
   */
  protoss_select() {
    return this._generateToneSequence(
      [500, 600, 500], // 对称音调（灵能回响）
      0.08,
      this._protossVoice
    );
  }

  /**
   * 神族攻击音 - 灵能呐喊
   * @returns {AudioBuffer}
   */
  protoss_attack() {
    return this._generateToneSequence(
      [550, 700, 650], // 高亢有力
      0.07,
      this._protossVoice
    );
  }

  /**
   * 神族低血量警报 - 共鸣衰减
   * @returns {AudioBuffer}
   */
  protoss_lowhp() {
    return this._generateToneSequence(
      [400, 350, 300, 350, 300], // 下降波动
      0.06,
      this._protossVoice
    );
  }

  // ═══════════════════════════════════════════════════════════
  // 通用语音生成接口
  // ═══════════════════════════════════════════════════════════

  /**
   * 根据种族和语音类型获取对应的语音
   * @param {string} race - 种族 ('terran', 'zerg', 'protoss')
   * @param {string} voiceType - 语音类型 ('confirm', 'select', 'attack', 'lowhp')
   * @returns {AudioBuffer|null}
   */
  getVoice(race, voiceType) {
    const key = `${race}_${voiceType}`;
    if (typeof this[key] === 'function') {
      return this[key]();
    }
    console.warn(`[VoiceLines] 未知语音: ${key}`);
    return null;
  }

  /**
   * 批量预生成所有语音缓冲区并返回
   * 用于 AudioManager 的预加载
   * @returns {Map<string, AudioBuffer>}
   */
  generateAll() {
    const voices = new Map();
    const races = ['terran', 'zerg', 'protoss'];
    const types = ['confirm', 'select', 'attack', 'lowhp'];

    for (const race of races) {
      for (const type of types) {
        const key = `${race}_${type}`;
        voices.set(key, this[key]());
      }
    }

    return voices;
  }
}

export default VoiceLines;
