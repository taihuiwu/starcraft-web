// ═══════════════════════════════════════════════════════════════
// StarCraft Web - 音频系统统一导出 (index.js)
// 整合所有音频模块，提供统一的使用入口
// ═══════════════════════════════════════════════════════════════

// ─── 核心管理器 ───
export { audioManager, AudioManagerClass, AUDIO_CATEGORY } from './AudioManager.js';

// ─── 音效生成器 ───
export { SoundEffects } from './SoundEffects.js';

// ─── 音乐生成器 ───
export { MusicGenerator } from './Music.js';

// ─── 语音生成器 ───
export { VoiceLines } from './VoiceLines.js';

// ═══════════════════════════════════════════════════════════
// 使用示例（在游戏主循环或其他模块中）：
//
// import { audioManager } from './audio/index.js';
//
// // 初始化（在用户首次交互后调用）
// // audioManager.init();
//
// // 播放音效
// audioManager.playSFX('gunshot', { sourceX: 100, sourceY: 200 });
//
// // 播放背景音乐
// audioManager.playMusic('terran_theme');
// audioManager.crossfadeMusic('battle_music', 2.0);
//
// // 播放单位语音
// audioManager.playVoice('terran_confirm');
//
// // 音量控制
// audioManager.setMasterVolume(0.8);
// audioManager.setMusicVolume(0.5);
//
// // 暂停/恢复
// audioManager.pause();
// audioManager.unpause();
//
// // 更新摄像机位置（空间音效）
// audioManager.updateCameraPosition(camX, camY);
//
// // 预加载音频（减少运行时卡顿）
// audioManager.preload([
//   'gunshot', 'explosion', 'laser', 'shield_hit',
//   'terran_theme', 'battle_music', 'victory_music'
// ]);
// ═══════════════════════════════════════════════════════════
