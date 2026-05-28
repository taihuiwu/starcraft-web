// ═══════════════════════════════════════════
// StarCraft Web - 预制地图索引
// ═══════════════════════════════════════════

import { createLostTemple } from './lost_temple.js';
import { createFightingSpirit } from './fighting_spirit.js';
import { createPythonPassword } from './python_password.js';

/**
 * 预制地图注册表
 * 每个地图提供一个生成函数，返回MapData实例
 */
export const PRESET_MAPS = [
  {
    id: 'lost_temple',
    name: 'Lost Temple',
    description: '经典1v1地图，中央高地，四角矿脉',
    size: '128×128',
    players: 2,
    creator: createLostTemple,
  },
  {
    id: 'fighting_spirit',
    name: 'Fighting Spirit',
    description: '经典4人对战地图，菱形中央高地',
    size: '128×128',
    players: 4,
    creator: createFightingSpirit,
  },
  {
    id: 'python_password',
    name: 'Python Password',
    description: '趣味蛇形迷宫地图，中央大蛇造型',
    size: '128×128',
    players: 2,
    creator: createPythonPassword,
  },
];

/**
 * 根据ID获取地图
 * @param {string} mapId
 * @returns {MapData|null}
 */
export function getPresetMap(mapId) {
  const preset = PRESET_MAPS.find(m => m.id === mapId);
  if (!preset) return null;
  return preset.creator();
}

/**
 * 获取所有预制地图信息
 * @returns {Array}
 */
export function getPresetMapList() {
  return PRESET_MAPS.map(m => ({
    id: m.id,
    name: m.name,
    description: m.description,
    size: m.size,
    players: m.players,
  }));
}

export { createLostTemple, createFightingSpirit, createPythonPassword };
