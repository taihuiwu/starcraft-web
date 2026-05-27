// ═══════════════════════════════════════════════════════════════
// StarCraft Web - 背景音乐生成器 (Music)
// 使用 Web Audio API 程序化生成 8-bit/chiptune 风格的 BGM
// 每个主题音乐根据种族特色设计不同的旋律、节奏和音色
// ═══════════════════════════════════════════════════════════════

/**
 * 音符频率映射表（科学音高记号）
 * 包含两个八度的常用音符
 */
const NOTE_FREQ = {
  'C2': 65.41, 'D2': 73.42, 'E2': 82.41, 'F2': 87.31, 'G2': 98.00, 'A2': 110.00, 'B2': 123.47,
  'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
  'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
  'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99, 'A5': 880.00, 'B5': 987.77,
  'C6': 1046.50,
  // 半音
  'Eb3': 155.56, 'Bb3': 233.08,
  'Ab3': 207.65, 'Eb4': 311.13, 'Bb4': 466.16, 'Ab4': 415.30,
  'F#4': 369.99, 'C#4': 277.18,
  // 休止符
  'REST': 0,
};

/**
 * MusicGenerator - 背景音乐程序化生成器
 *
 * 设计理念：
 * - 使用 OscillatorNode 生成基本波形（方波、三角波、锯齿波）
 * - 通过音符序列数组定义旋律，按节拍定时触发
 * - 每个种族主题有独特的旋律走向和节奏型
 * - 所有音乐渲染到 AudioBuffer 中，支持循环播放
 *
 * BPM（每分钟拍数）决定节奏快慢：
 * - 进行曲：120 BPM
 * - 战斗音乐：140+ BPM
 * - 菜单音乐：80 BPM
 */
export class MusicGenerator {
  /**
   * @param {AudioContext} ctx - Web Audio API 上下文
   */
  constructor(ctx) {
    /** @type {AudioContext} */
    this.ctx = ctx;
    this.sampleRate = ctx.sampleRate;
  }

  // ═══════════════════════════════════════════════════════════
  // 辅助方法
  // ═══════════════════════════════════════════════════════════

  /**
   * 创建空白 AudioBuffer
   * @param {number} duration - 时长（秒）
   * @param {number} [channels=2] - 声道数（立体声）
   * @returns {AudioBuffer}
   */
  _createBuffer(duration, channels = 2) {
    return this.ctx.createBuffer(channels, this.sampleRate * duration, this.sampleRate);
  }

  /**
   * 根据 BPM 计算一拍的时长（秒）
   * @param {number} bpm - 每分钟拍数
   * @returns {number} 每拍秒数
   */
  _beatDuration(bpm) {
    return 60 / bpm;
  }

  /**
   * 根据音符名获取频率
   * @param {string} noteName - 音符名（如 'C4', 'A3', 'REST'）
   * @returns {number} 频率 (Hz)，休止符返回 0
   */
  _freq(noteName) {
    return NOTE_FREQ[noteName] || 0;
  }

  /**
   * 将音符序列渲染到 AudioBuffer
   * 每个音符由 { note, duration (节拍数) } 定义
   *
   * @param {Array<{note: string, dur: number}>} sequence - 音符序列
   * @param {number} bpm - 节拍速度
   * @param {string} waveType - 波形类型 ('square', 'triangle', 'sawtooth', 'sine')
   * @param {number} volume - 音量 (0~1)
   * @param {number} [octaveShift=0] - 八度偏移（正数升高，负数降低）
   * @returns {AudioBuffer}
   */
  _renderSequence(sequence, bpm, waveType = 'square', volume = 0.3, octaveShift = 0) {
    const beatSec = this._beatDuration(bpm);
    let totalBeats = 0;
    for (const note of sequence) totalBeats += note.dur;
    const duration = totalBeats * beatSec + 0.1; // 额外留一点尾音

    const buffer = this._createBuffer(duration);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    const len = left.length;

    let timePos = 0; // 当前时间位置（秒）

    for (const { note, dur } of sequence) {
      const freq = this._freq(note);
      const noteDur = dur * beatSec;
      const sampleStart = Math.floor(timePos * this.sampleRate);
      const sampleEnd = Math.min(Math.floor((timePos + noteDur) * this.sampleRate), len);

      // 衰减包络：每个音符有起音和释音
      for (let i = sampleStart; i < sampleEnd; i++) {
        const localT = (i - sampleStart) / this.sampleRate;
        const progress = (i - sampleStart) / (sampleEnd - sampleStart);

        // ADSR 简化版：快速起音 + 持续 + 释音
        let env = 1;
        if (progress < 0.05) {
          env = progress / 0.05; // 起音 5%
        } else if (progress > 0.8) {
          env = (1 - progress) / 0.2; // 释音 20%
        }

        if (freq === 0) {
          // 休止符
          left[i] = 0;
          right[i] = 0;
        } else {
          const actualFreq = freq * Math.pow(2, octaveShift);
          const phase = 2 * Math.PI * actualFreq * localT;
          let sample = 0;
          switch (waveType) {
            case 'square':
              sample = Math.sin(phase) > 0 ? volume : -volume;
              break;
            case 'sawtooth':
              sample = (2 * (actualFreq * localT % 1) - 1) * volume;
              break;
            case 'triangle':
              sample = (2 * Math.abs(2 * (actualFreq * localT % 1) - 1) - 1) * volume;
              break;
            default: // sine
              sample = Math.sin(phase) * volume;
          }
          left[i] = sample * env;
          // 右声道轻微延迟（立体声宽度）
          const panOffset = Math.floor(0.001 * this.sampleRate); // 1ms 偏移
          right[i] = i + panOffset < len ? left[Math.min(i + panOffset, len - 1)] : left[i];
        }
      }

      timePos += noteDur;
    }

    return buffer;
  }

  /**
   * 渲染鼓点/节奏轨道
   * @param {number} totalBeats - 总拍数
   * @param {number} bpm - 节拍速度
   * @param {Array<{beat: number, type: string}>} hits - 打击点定义
   *   type: 'kick'（低音鼓）, 'snare'（军鼓）, 'hihat'（踩镲）
   * @returns {AudioBuffer}
   */
  _renderDrums(totalBeats, bpm, hits) {
    const beatSec = this._beatDuration(bpm);
    const duration = totalBeats * beatSec + 0.1;
    const buffer = this._createBuffer(duration);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    const len = left.length;

    for (const hit of hits) {
      const time = hit.beat * beatSec;
      const sampleStart = Math.floor(time * this.sampleRate);

      // 每种鼓点的音色参数不同
      let freq, decay, vol;
      switch (hit.type) {
        case 'kick':
          freq = 80; decay = 15; vol = 0.4; break;
        case 'snare':
          freq = 200; decay = 12; vol = 0.3; break;
        case 'hihat':
          freq = 800; decay = 30; vol = 0.15; break;
        default:
          freq = 100; decay = 10; vol = 0.2;
      }

      // 短促的噪声脉冲
      const hitDuration = 0.08; // 80ms
      const hitEnd = Math.min(sampleStart + Math.floor(hitDuration * this.sampleRate), len);
      for (let i = sampleStart; i < hitEnd; i++) {
        const localT = (i - sampleStart) / this.sampleRate;
        const env = Math.exp(-decay * localT);
        let sample;
        if (hit.type === 'kick') {
          // 低音鼓：正弦波
          sample = Math.sin(2 * Math.PI * freq * localT) * vol * env;
        } else {
          // 军鼓/踩镲：白噪声
          sample = (Math.random() * 2 - 1) * vol * env;
        }
        left[i] += sample;
        right[i] += sample;
      }
    }

    // 限制振幅防止削波
    for (let i = 0; i < len; i++) {
      left[i] = Math.max(-0.95, Math.min(0.95, left[i]));
      right[i] = Math.max(-0.95, Math.min(0.95, right[i]));
    }

    return buffer;
  }

  /**
   * 混合两个立体声音频缓冲区
   * @param {AudioBuffer} a
   * @param {AudioBuffer} b
   * @param {number} [gainB=1.0] - b的增益
   * @returns {AudioBuffer}
   */
  _mix(a, b, gainB = 1.0) {
    const len = Math.max(a.length, b.length);
    const buffer = this.ctx.createBuffer(2, len, this.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const out = buffer.getChannelData(ch);
      const srcA = a.numberOfChannels > ch ? a.getChannelData(ch) : a.getChannelData(0);
      const srcB = b.numberOfChannels > ch ? b.getChannelData(ch) : b.getChannelData(0);
      for (let i = 0; i < len; i++) {
        const sa = i < srcA.length ? srcA[i] : 0;
        const sb = i < srcB.length ? srcB[i] : 0;
        out[i] = Math.max(-0.95, Math.min(0.95, sa + sb * gainB));
      }
    }
    return buffer;
  }

  // ═══════════════════════════════════════════════════════════
  // 人族主题 - 进行曲风格
  // ═══════════════════════════════════════════════════════════

  /**
   * 人族主题音乐 (Terran Theme)
   * 风格：军事进行曲，4/4拍，有力的军鼓节奏
   * 旋律：英雄主义、坚定、庄严
   * BPM: 120
   * @returns {AudioBuffer}
   */
  terran_theme() {
    const bpm = 120;
    const totalBars = 8;
    const beatsPerBar = 4;
    const totalBeats = totalBars * beatsPerBar;

    // ─── 主旋律（方波，明亮有力）───
    const melody = [
      // 第一乐句（小节1-2）：坚定的开场
      { note: 'C4', dur: 1 }, { note: 'E4', dur: 1 },
      { note: 'G4', dur: 1 }, { note: 'C5', dur: 1 },
      // 第二乐句（小节3-4）：上行到高潮
      { note: 'B4', dur: 1 }, { note: 'A4', dur: 1 },
      { note: 'G4', dur: 2 },
      // 第三乐句（小节5-6）：回应
      { note: 'F4', dur: 1 }, { note: 'E4', dur: 1 },
      { note: 'D4', dur: 1 }, { note: 'E4', dur: 1 },
      // 第四乐句（小节7-8）：收束
      { note: 'G4', dur: 1 }, { note: 'F4', dur: 1 },
      { note: 'E4', dur: 1 }, { note: 'C4', dur: 1 },
    ];

    const melodyBuffer = this._renderSequence(melody, bpm, 'square', 0.25);

    // ─── 贝斯线（三角波，低沉稳重）───
    const bass = [
      { note: 'C3', dur: 1 }, { note: 'C3', dur: 1 },
      { note: 'G3', dur: 1 }, { note: 'G3', dur: 1 },
      { note: 'A3', dur: 1 }, { note: 'E3', dur: 1 },
      { note: 'F3', dur: 1 }, { note: 'G3', dur: 1 },
      { note: 'C3', dur: 1 }, { note: 'C3', dur: 1 },
      { note: 'G3', dur: 1 }, { note: 'G3', dur: 1 },
      { note: 'F3', dur: 1 }, { note: 'E3', dur: 1 },
      { note: 'C3', dur: 2 },
    ];
    const bassBuffer = this._renderSequence(bass, bpm, 'triangle', 0.2);

    // ─── 军鼓节奏 ───
    const drumHits = [];
    for (let beat = 0; beat < totalBeats; beat++) {
      drumHits.push({ beat, type: 'hihat' }); // 每拍踩镲
      if (beat % 2 === 1) {
        drumHits.push({ beat, type: 'snare' }); // 2、4拍军鼓
      }
      if (beat % 4 === 0) {
        drumHits.push({ beat, type: 'kick' }); // 每小节第一拍低音鼓
      }
    }
    const drumsBuffer = this._renderDrums(totalBeats, bpm, drumHits);

    // 混合所有轨道
    let result = this._mix(melodyBuffer, bassBuffer, 0.8);
    result = this._mix(result, drumsBuffer, 0.6);
    return result;
  }

  // ═══════════════════════════════════════════════════════════
  // 虫族主题 - 低沉不安
  // ═══════════════════════════════════════════════════════════

  /**
   * 虫族主题音乐 (Zerg Theme)
   * 风格：低沉、不安、有机感
   * 旋律：不规则音程，小调为主，制造压迫感
   * BPM: 100（稍慢，沉重）
   * @returns {AudioBuffer}
   */
  zerg_theme() {
    const bpm = 100;
    const totalBars = 8;
    const beatsPerBar = 4;
    const totalBeats = totalBars * beatsPerBar;

    // ─── 主旋律（锯齿波，粗糙不安）───
    const melody = [
      // 不安的小调下行
      { note: 'E4', dur: 1.5 }, { note: 'REST', dur: 0.5 },
      { note: 'D4', dur: 1 }, { note: 'C4', dur: 1 },
      { note: 'Ab3', dur: 2 },
      { note: 'G3', dur: 1 }, { note: 'Eb3', dur: 1 },
      { note: 'E3', dur: 1.5 }, { note: 'REST', dur: 0.5 },
      { note: 'F3', dur: 1 }, { note: 'G3', dur: 1 },
      { note: 'Ab3', dur: 2 },
      { note: 'E3', dur: 1 }, { note: 'E3', dur: 0.5 },
      { note: 'REST', dur: 0.5 }, { note: 'E3', dur: 1 },
      { note: 'REST', dur: 1 },
    ];
    const melodyBuffer = this._renderSequence(melody, bpm, 'sawtooth', 0.15);

    // ─── 低音（方波，黑暗沉重）───
    const bass = [
      { note: 'E2', dur: 2 }, { note: 'E2', dur: 2 },
      { note: 'Ab2', dur: 2 }, { note: 'E2', dur: 2 },
      { note: 'F2', dur: 2 }, { note: 'E2', dur: 2 },
      { note: 'Ab2', dur: 2 }, { note: 'E2', dur: 2 },
    ];
    const bassBuffer = this._renderSequence(bass, bpm, 'square', 0.2);

    // ─── 不规则节奏（模拟心跳/脉冲）───
    const drumHits = [];
    for (let beat = 0; beat < totalBeats; beat++) {
      // 不规则的低音鼓：不完全按照规律
      if (beat % 3 === 0 || beat % 5 === 0) {
        drumHits.push({ beat, type: 'kick' });
      }
      // 偶尔的高频滴答声
      if (beat % 4 === 2) {
        drumHits.push({ beat, type: 'hihat' });
      }
    }
    const drumsBuffer = this._renderDrums(totalBeats, bpm, drumHits);

    let result = this._mix(melodyBuffer, bassBuffer, 1.0);
    result = this._mix(result, drumsBuffer, 0.4);
    return result;
  }

  // ═══════════════════════════════════════════════════════════
  // 神族主题 - 空灵和弦
  // ═══════════════════════════════════════════════════════════

  /**
   * 神族主题音乐 (Protoss Theme)
   * 风格：空灵、庄严、和弦进行
   * 旋律：大调和弦进行，正弦波pad音色，回声效果
   * BPM: 90（庄重缓慢）
   * @returns {AudioBuffer}
   */
  protoss_theme() {
    const bpm = 90;
    const totalBars = 8;
    const beatsPerBar = 4;
    const totalBeats = totalBars * beatsPerBar;

    // ─── 和弦 pad（正弦波，空灵柔和）───
    // 每个和弦占2拍
    const chords = [
      // C大和弦
      [
        { note: 'C4', dur: 2 }, { note: 'E4', dur: 2 },
        { note: 'G4', dur: 2 }, { note: 'C5', dur: 2 },
      ],
      // Am和弦
      [
        { note: 'A3', dur: 2 }, { note: 'C4', dur: 2 },
        { note: 'E4', dur: 2 }, { note: 'A4', dur: 2 },
      ],
      // F大和弦
      [
        { note: 'F3', dur: 2 }, { note: 'A3', dur: 2 },
        { note: 'C4', dur: 2 }, { note: 'F4', dur: 2 },
      ],
      // G大和弦
      [
        { note: 'G3', dur: 2 }, { note: 'B3', dur: 2 },
        { note: 'D4', dur: 2 }, { note: 'G4', dur: 2 },
      ],
    ];

    // 渲染和弦 pad
    const beatSec = this._beatDuration(bpm);
    const totalBeatsCalc = totalBars * beatsPerBar;
    const duration = totalBeatsCalc * beatSec + 0.2;
    const buffer = this._createBuffer(duration);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    const len = left.length;

    let timePos = 0;
    for (let rep = 0; rep < 2; rep++) {
      for (const chord of chords) {
        for (const { note, dur } of chord) {
          const freq = this._freq(note);
          const noteDur = dur * beatSec;
          const sampleStart = Math.floor(timePos * this.sampleRate);
          const sampleEnd = Math.min(Math.floor((timePos + noteDur) * this.sampleRate), len);

          for (let i = sampleStart; i < sampleEnd; i++) {
            const localT = (i - sampleStart) / this.sampleRate;
            const progress = (i - sampleStart) / Math.max(1, sampleEnd - sampleStart);
            // 柔和的包络
            let env = 1;
            if (progress < 0.1) env = progress / 0.1;
            else if (progress > 0.85) env = (1 - progress) / 0.15;

            // 正弦波 + 轻微的合唱效果
            const chorus = Math.sin(2 * Math.PI * 2 * localT); // 2Hz 低频调制
            const sample = Math.sin(2 * Math.PI * freq * (1 + chorus * 0.003) * localT) * 0.12 * env;
            left[i] += sample;
            // 立体声：轻微相位差
            const sampleR = Math.sin(2 * Math.PI * freq * (1 + chorus * 0.005) * (localT + 0.002)) * 0.12 * env;
            right[i] += sampleR;
          }
          timePos += noteDur;
        }
      }
    }

    // 限制振幅
    for (let i = 0; i < len; i++) {
      left[i] = Math.max(-0.9, Math.min(0.9, left[i]));
      right[i] = Math.max(-0.9, Math.min(0.9, right[i]));
    }

    return buffer;
  }

  // ═══════════════════════════════════════════════════════════
  // 菜单/界面音乐
  // ═══════════════════════════════════════════════════════════

  /**
   * 主菜单音乐 - 舒缓放松
   * BPM: 80，三角波为主，柔和的旋律
   * @returns {AudioBuffer}
   */
  menu_music() {
    const bpm = 80;
    const melody = [
      { note: 'C4', dur: 2 }, { note: 'E4', dur: 1 }, { note: 'G4', dur: 1 },
      { note: 'A4', dur: 2 }, { note: 'G4', dur: 2 },
      { note: 'F4', dur: 2 }, { note: 'E4', dur: 1 }, { note: 'D4', dur: 1 },
      { note: 'C4', dur: 4 },
      { note: 'E4', dur: 2 }, { note: 'G4', dur: 1 }, { note: 'C5', dur: 1 },
      { note: 'B4', dur: 2 }, { note: 'A4', dur: 2 },
      { note: 'G4', dur: 2 }, { note: 'F4', dur: 1 }, { note: 'E4', dur: 1 },
      { note: 'D4', dur: 2 }, { note: 'C4', dur: 2 },
    ];
    const melodyBuf = this._renderSequence(melody, bpm, 'triangle', 0.2);

    const bass = [
      { note: 'C3', dur: 4 }, { note: 'A2', dur: 4 },
      { note: 'F2', dur: 4 }, { note: 'G2', dur: 4 },
      { note: 'C3', dur: 4 }, { note: 'E2', dur: 4 },
      { note: 'F2', dur: 4 }, { note: 'G2', dur: 4 },
    ];
    const bassBuf = this._renderSequence(bass, bpm, 'triangle', 0.12);

    return this._mix(melodyBuf, bassBuf, 0.6);
  }

  // ═══════════════════════════════════════════════════════════
  // 战斗音乐
  // ═══════════════════════════════════════════════════════════

  /**
   * 战斗音乐 - 快节奏紧张
   * BPM: 150，急促的旋律和密集的鼓点
   * @returns {AudioBuffer}
   */
  battle_music() {
    const bpm = 150;
    const totalBars = 8;
    const beatsPerBar = 4;
    const totalBeats = totalBars * beatsPerBar;

    // ─── 急促旋律 ───
    const melody = [
      { note: 'E4', dur: 0.5 }, { note: 'E4', dur: 0.5 }, { note: 'E4', dur: 0.5 }, { note: 'REST', dur: 0.5 },
      { note: 'D4', dur: 0.5 }, { note: 'E4', dur: 0.5 }, { note: 'G4', dur: 1 },
      { note: 'A4', dur: 0.5 }, { note: 'A4', dur: 0.5 }, { note: 'G4', dur: 0.5 }, { note: 'F4', dur: 0.5 },
      { note: 'E4', dur: 0.5 }, { note: 'D4', dur: 0.5 }, { note: 'C4', dur: 1 },
      { note: 'G4', dur: 0.5 }, { note: 'A4', dur: 0.5 }, { note: 'B4', dur: 0.5 }, { note: 'C5', dur: 0.5 },
      { note: 'B4', dur: 0.5 }, { note: 'A4', dur: 0.5 }, { note: 'G4', dur: 0.5 }, { note: 'F4', dur: 0.5 },
      { note: 'E4', dur: 0.5 }, { note: 'D4', dur: 0.5 }, { note: 'C4', dur: 0.5 }, { note: 'REST', dur: 0.5 },
      { note: 'C4', dur: 0.5 }, { note: 'E4', dur: 0.5 }, { note: 'G4', dur: 1 },
    ];
    const melodyBuf = this._renderSequence(melody, bpm, 'square', 0.2);

    // ─── 快速贝斯 ───
    const bass = [
      { note: 'E3', dur: 0.5 }, { note: 'REST', dur: 0.5 },
      { note: 'E3', dur: 0.5 }, { note: 'REST', dur: 0.5 },
      { note: 'C3', dur: 0.5 }, { note: 'REST', dur: 0.5 },
      { note: 'C3', dur: 0.5 }, { note: 'REST', dur: 0.5 },
      { note: 'F3', dur: 0.5 }, { note: 'REST', dur: 0.5 },
      { note: 'F3', dur: 0.5 }, { note: 'REST', dur: 0.5 },
      { note: 'G3', dur: 0.5 }, { note: 'REST', dur: 0.5 },
      { note: 'G3', dur: 0.5 }, { note: 'REST', dur: 0.5 },
      { note: 'E3', dur: 0.5 }, { note: 'REST', dur: 0.5 },
      { note: 'E3', dur: 0.5 }, { note: 'REST', dur: 0.5 },
      { note: 'D3', dur: 0.5 }, { note: 'REST', dur: 0.5 },
      { note: 'E3', dur: 0.5 }, { note: 'REST', dur: 0.5 },
    ];
    const bassBuf = this._renderSequence(bass, bpm, 'sawtooth', 0.18);

    // ─── 密集鼓点 ───
    const drumHits = [];
    for (let beat = 0; beat < totalBeats; beat++) {
      drumHits.push({ beat, type: 'hihat' });
      if (beat % 2 === 1) drumHits.push({ beat, type: 'snare' });
      if (beat % 4 === 0) drumHits.push({ beat, type: 'kick' });
    }
    const drumsBuf = this._renderDrums(totalBeats, bpm, drumHits);

    let result = this._mix(melodyBuf, bassBuf, 0.8);
    result = this._mix(result, drumsBuf, 0.5);
    return result;
  }

  // ═══════════════════════════════════════════════════════════
  // 结果音乐
  // ═══════════════════════════════════════════════════════════

  /**
   * 胜利音乐 - 上行音阶，明亮欢快
   * @returns {AudioBuffer}
   */
  victory_music() {
    const bpm = 130;
    const melody = [
      { note: 'C4', dur: 0.5 }, { note: 'D4', dur: 0.5 },
      { note: 'E4', dur: 0.5 }, { note: 'F4', dur: 0.5 },
      { note: 'G4', dur: 0.5 }, { note: 'A4', dur: 0.5 },
      { note: 'B4', dur: 0.5 }, { note: 'C5', dur: 1.5 },
      { note: 'REST', dur: 0.5 },
      { note: 'E5', dur: 1 }, { note: 'D5', dur: 0.5 }, { note: 'C5', dur: 0.5 },
      { note: 'G4', dur: 1 }, { note: 'C5', dur: 2 },
    ];
    const melodyBuf = this._renderSequence(melody, bpm, 'square', 0.25);

    const bass = [
      { note: 'C3', dur: 2 }, { note: 'F3', dur: 2 },
      { note: 'G3', dur: 2 }, { note: 'C3', dur: 2 },
      { note: 'E3', dur: 2 }, { note: 'F3', dur: 2 },
      { note: 'G3', dur: 2 }, { note: 'C3', dur: 2 },
    ];
    const bassBuf = this._renderSequence(bass, bpm, 'triangle', 0.15);

    return this._mix(melodyBuf, bassBuf, 0.6);
  }

  /**
   * 失败音乐 - 下行音阶，悲伤沉重
   * @returns {AudioBuffer}
   */
  defeat_music() {
    const bpm = 70; // 慢速，悲伤
    const melody = [
      { note: 'A4', dur: 2 }, { note: 'G4', dur: 2 },
      { note: 'F4', dur: 2 }, { note: 'E4', dur: 2 },
      { note: 'D4', dur: 2 }, { note: 'C4', dur: 2 },
      { note: 'REST', dur: 4 },
      { note: 'A3', dur: 4 }, { note: 'REST', dur: 4 },
    ];
    const melodyBuf = this._renderSequence(melody, bpm, 'triangle', 0.2);

    const bass = [
      { note: 'A2', dur: 4 }, { note: 'F2', dur: 4 },
      { note: 'D2', dur: 4 }, { note: 'E2', dur: 4 },
    ];
    const bassBuf = this._renderSequence(bass, bpm, 'triangle', 0.15);

    return this._mix(melodyBuf, bassBuf, 0.5);
  }
}

export default MusicGenerator;
