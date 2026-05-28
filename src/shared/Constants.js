// ═══════════════════════════════════════════
// StarCraft Web - 全局常量定义
// ═══════════════════════════════════════════

// 游戏基础参数
export const GAME = {
  TICK_RATE: 24,           // 每秒游戏tick数（SC1原始）
  MAP_SIZE: 128,           // 地形网格大小
  TILE_SIZE: 1,            // 每格单位大小
  MAX_SUPPLY: 200,         // 最大人口
  STARTING_MINERALS: 50,   // 初始水晶
  STARTING_GAS: 0,         // 初始瓦斯
  STARTING_SUPPLY: 10,     // 初始人口
};

// 资源类型
export const RESOURCE = {
  MINERALS: 'minerals',
  GAS: 'gas',
  SUPPLY: 'supply',
};

// 种族
export const RACE = {
  TERRAN: 'terran',
  ZERG: 'zerg',
  PROTOSS: 'protoss',
};

// 单位体型（影响伤害计算）
export const UNIT_SIZE = {
  SMALL: 'small',
  MEDIUM: 'medium',
  LARGE: 'large',
};

// 攻击类型（SC1三类）
export const ATTACK_TYPE = {
  NORMAL: 'normal',       // 普通（无减免）
  EXPLOSIVE: 'explosive', // 爆炸（对大100%, 中50%, 小25%）
  CONCUSSIVE: 'concussive', // 冲击（对小100%, 中50%, 大25%）
};

// 护甲类型
export const ARMOR_TYPE = {
  NORMAL: 'normal',
  POWERED: 'powered',     // 灵能护甲
  UNARMORED: 'unarmored', // 无甲
};

// 伤害克制系数表
export const DAMAGE_TABLE = {
  [ATTACK_TYPE.NORMAL]: {
    [UNIT_SIZE.SMALL]: 1.0,
    [UNIT_SIZE.MEDIUM]: 1.0,
    [UNIT_SIZE.LARGE]: 1.0,
  },
  [ATTACK_TYPE.EXPLOSIVE]: {
    [UNIT_SIZE.SMALL]: 0.25,
    [UNIT_SIZE.MEDIUM]: 0.5,
    [UNIT_SIZE.LARGE]: 1.0,
  },
  [ATTACK_TYPE.CONCUSSIVE]: {
    [UNIT_SIZE.SMALL]: 1.0,
    [UNIT_SIZE.MEDIUM]: 0.5,
    [UNIT_SIZE.LARGE]: 0.25,
  },
};

// 命令类型
export const COMMAND = {
  MOVE: 'move',
  ATTACK: 'attack',
  STOP: 'stop',
  HOLD: 'hold',
  PATROL: 'patrol',
  BUILD: 'build',
  GATHER: 'gather',
  RETURN_CARGO: 'return_cargo',
  CAST: 'cast',         // 施放技能
  RALLY: 'rally',       // 集结点
  LOAD: 'load',         // 装载
  UNLOAD: 'unload',     // 卸载
  MORPH: 'morph',       // 变形（虫族孵化）
  SIEGE: 'siege',       // 攻城模式
};

// AI状态
export const AI_STATE = {
  EARLY_BUILD: 'early_build',
  MID_BUILD: 'mid_build',
  LATE_BUILD: 'late_build',
  ATTACK: 'attack',
  DEFEND: 'defend',
  EXPAND: 'expand',
  SCOUT: 'scout',
};

// 颜色（渲染用）
export const TEAM_COLORS = {
  1: 0x0000ff, // 蓝色
  2: 0xff0000, // 红色
  3: 0x00ff00, // 绿色
  4: 0xffff00, // 黄色
  5: 0xff00ff, // 紫色
  6: 0x00ffff, // 青色
  7: 0xff8800, // 橙色
  8: 0x888888, // 灰色
};

// 事件名
export const EVENTS = {
  // 游戏事件
  GAME_START: 'game:start',
  GAME_PAUSE: 'game:pause',
  GAME_RESUME: 'game:resume',
  GAME_OVER: 'game:over',
  TICK: 'game:tick',

  // 选择事件
  SELECT_UNITS: 'select:units',
  DESELECT: 'select:deselect',
  ADD_TO_SELECTION: 'select:add',

  // 命令事件
  COMMAND_ISSUED: 'command:issued',
  COMMAND_COMPLETED: 'command:completed',

  // 资源事件
  RESOURCE_CHANGED: 'resource:changed',
  SUPPLY_CHANGED: 'supply:changed',

  // 建造事件
  BUILD_START: 'build:start',
  BUILD_COMPLETE: 'build:complete',
  BUILD_CANCELLED: 'build:cancelled',

  // 单位事件
  UNIT_CREATED: 'unit:created',
  UNIT_DIED: 'unit:died',
  UNIT_DAMAGE: 'unit:damage',
  UNIT_HEALED: 'unit:healed',

  // 战斗事件
  COMBAT_START: 'combat:start',
  COMBAT_END: 'combat:end',
  PROJECTILE_FIRED: 'combat:projectile',

  // 科技事件
  TECH_START: 'tech:start',
  TECH_COMPLETE: 'tech:complete',

  // UI事件
  CAMERA_MOVE: 'camera:move',
  MINIMAP_CLICK: 'minimap:click',
  BUILD_PANEL_CLICK: 'ui:build:click',

  // 渲染器事件
  RENDERER_ERROR: 'renderer:error',
};

// ─── 空军高度系统 ──────────────────────────
/** 飞行高度等级（Y轴偏移量，用于渲染和攻击判定） */
export const FLIGHT_HEIGHT = {
  GROUND: 0,          // 地面单位（isFlying=false）
  LOW_ALTITUDE: 2.0,  // 低空飞行（小型/中型飞行单位）
  HIGH_ALTITUDE: 4.0, // 高空飞行（大型飞行单位）
};

/** 单位体型到飞行高度的映射规则 */
export const AIR_HEIGHT_MAP = {
  [UNIT_SIZE.SMALL]: FLIGHT_HEIGHT.LOW_ALTITUDE,   // 小型→低空
  [UNIT_SIZE.MEDIUM]: FLIGHT_HEIGHT.LOW_ALTITUDE,  // 中型→低空
  [UNIT_SIZE.LARGE]: FLIGHT_HEIGHT.HIGH_ALTITUDE,  // 大型→高空
};

// ─── 飞行视觉特效颜色 ─────────────────────
export const AIR_EFFECT_COLORS = {
  MISSILE_AIR: 0xffaa00,    // 对空导弹（橙色尾焰）
  MISSILE_GROUND: 0xff4444, // 对地导弹（红色）
  LASER: 0x44ff44,          // 激光（绿色）
  CONCUSSIVE_AIR: 0x66aaff, // 冲击波对空（蓝色）
};
