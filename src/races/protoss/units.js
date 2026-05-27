// ═══════════════════════════════════════════
// StarCraft Web - 神族 (Protoss) 全部兵种定义
// 数值参考SC1原版
// ═══════════════════════════════════════════

import { RACE, UNIT_SIZE, ATTACK_TYPE } from '../../shared/Constants.js';

/**
 * 神族单位完整定义
 * 神族单位拥有护盾（shield），护盾优先被扣减
 * Archon由两个Templar合并而成
 */

export const PROTOSS_UNITS = {
  // ═══════════════════════════════════════════
  // Probe 探机
  // ═══════════════════════════════════════════
  probe: {
    id: 'probe',
    name: '探机',
    nameEn: 'Probe',
    race: RACE.PROTOSS,
    type: 'unit',
    category: 'worker',
    cost: { minerals: 50, gas: 0, supply: 1 },
    buildTime: 20,
    hp: 20,
    armor: 0,
    shield: 20,            // 护盾20
    attack: {
      damage: 5,
      range: 0.1,          // 近战
      speed: 30,
      type: ATTACK_TYPE.NORMAL,
    },
    abilities: ['build', 'gather'],
    abilities_desc: {
      build: '在能量场内建造建筑',
      gather: '采集资源',
    },
    prerequisites: [],
    buildFrom: 'nexus',
    size: UNIT_SIZE.SMALL,
    speed: 2.81,
    cargo: 0,
    detectionRange: 5,
    sightRange: 8,
    model: 'probe.glb',
    animations: { idle: 'idle', walk: 'walk', attack: 'attack', death: 'death', build: 'build', harvest: 'harvest' },
  },

  // ═══════════════════════════════════════════
  // Zealot 狂热者
  // ═══════════════════════════════════════════
  zealot: {
    id: 'zealot',
    name: '狂热者',
    nameEn: 'Zealot',
    race: RACE.PROTOSS,
    type: 'unit',
    category: 'ground',
    cost: { minerals: 100, gas: 0, supply: 2 },
    buildTime: 40,
    hp: 100,
    armor: 1,
    shield: 60,
    attack: {
      damage: 16,
      range: 0,             // 近战（双刀各8伤害）
      speed: 22,
      type: ATTACK_TYPE.NORMAL,
    },
    abilities: [],
    prerequisites: ['gateway'],
    buildFrom: 'gateway',
    size: UNIT_SIZE.MEDIUM,
    speed: 2.25,
    speedUpgraded: 3.00,    // 腿部增强升级后
    cargo: 0,
    detectionRange: 5,
    sightRange: 7,
    model: 'zealot.glb',
    animations: { idle: 'idle', walk: 'walk', attack: 'attack', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Dragoon 龙骑兵
  // ═══════════════════════════════════════════
  dragoon: {
    id: 'dragoon',
    name: '龙骑兵',
    nameEn: 'Dragoon',
    race: RACE.PROTOSS,
    type: 'unit',
    category: 'ground',
    cost: { minerals: 125, gas: 50, supply: 2 },
    buildTime: 50,
    hp: 100,
    armor: 1,
    shield: 80,
    attack: {
      damage: 25,
      range: 5,
      speed: 30,
      type: ATTACK_TYPE.EXPLOSIVE,
      // 对空攻击
      antiAir: {
        damage: 25,
        range: 6,
        speed: 30,
        type: ATTACK_TYPE.EXPLOSIVE,
        requires: 'singularity_charge',
      },
    },
    abilities: [],
    prerequisites: ['gateway', 'cybernetics_core'],
    buildFrom: 'gateway',
    size: UNIT_SIZE.LARGE,
    speed: 1.88,
    cargo: 0,
    detectionRange: 5,
    sightRange: 8,
    model: 'dragoon.glb',
    animations: { idle: 'idle', walk: 'walk', attack: 'attack', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // High Templar 高级圣堂武士
  // ═══════════════════════════════════════════
  high_templar: {
    id: 'high_templar',
    name: '高级圣堂武士',
    nameEn: 'High Templar',
    race: RACE.PROTOSS,
    type: 'unit',
    category: 'caster',
    cost: { minerals: 50, gas: 150, supply: 2 },
    buildTime: 50,
    hp: 40,
    armor: 0,
    shield: 40,
    attack: {
      damage: 10,
      range: 7,
      speed: 30,
      type: ATTACK_TYPE.CONCUSSIVE,
    },
    abilities: ['psionic_storm', 'hallucination', 'archon_merge'],
    abilities_desc: {
      psionic_storm: '在区域内每秒造成约112点伤害，持续约6秒（消耗75能量）',
      hallucination: '产生2个幻象（消耗100能量，幻象无伤害但可承受伤害）',
      archon_merge: '与另一个圣堂武士合并为执政官',
    },
    energy: { max: 200, regenRate: 0.5625 },
    prerequisites: ['gateway', 'citadel_of_adun', 'templar_archives'],
    buildFrom: 'gateway',
    size: UNIT_SIZE.SMALL,
    speed: 1.83,
    cargo: 0,
    detectionRange: 5,
    sightRange: 8,
    canMergeTo: ['archon'],
    model: 'high_templar.glb',
    animations: { idle: 'idle', walk: 'walk', attack: 'attack', cast: 'cast', death: 'death', merge: 'merge' },
  },

  // ═══════════════════════════════════════════
  // Dark Templar 暗黑圣堂武士
  // ═══════════════════════════════════════════
  dark_templar: {
    id: 'dark_templar',
    name: '暗黑圣堂武士',
    nameEn: 'Dark Templar',
    race: RACE.PROTOSS,
    type: 'unit',
    category: 'ground',
    cost: { minerals: 125, gas: 100, supply: 2 },
    buildTime: 50,
    hp: 80,
    armor: 1,
    shield: 40,
    attack: {
      damage: 40,
      range: 0,             // 近战
      speed: 30,
      type: ATTACK_TYPE.NORMAL,
    },
    abilities: ['cloak'],
    abilities_desc: {
      cloak: '永久隐形（需被反隐形单位发现）',
    },
    prerequisites: ['gateway', 'citadel_of_adun', 'templar_archives'],
    buildFrom: 'gateway',
    size: UNIT_SIZE.MEDIUM,
    speed: 2.88,
    cloakable: true,         // 永久隐形
    cargo: 0,
    detectionRange: 5,
    sightRange: 7,
    canMergeTo: ['archon'],
    model: 'dark_templar.glb',
    animations: { idle: 'idle', walk: 'walk', attack: 'attack', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Archon 执政官（由两个Templar合并）
  // ═══════════════════════════════════════════
  archon: {
    id: 'archon',
    name: '执政官',
    nameEn: 'Archon',
    race: RACE.PROTOSS,
    type: 'unit',
    category: 'ground',
    mergedFrom: ['high_templar', 'dark_templar'],  // 两个模板中任选2个
    cost: { minerals: 0, gas: 0, supply: 4 },      // 消耗2个模板（已计人口）
    buildTime: 20,          // 合并时间
    hp: 10,
    armor: 0,
    shield: 350,            // 几乎全是护盾
    attack: {
      damage: 30,
      range: 2,
      speed: 18,
      type: ATTACK_TYPE.EXPLOSIVE,
      splash: 1.5,          // 溅射伤害
    },
    abilities: [],
    prerequisites: [],
    buildFrom: 'merge',
    size: UNIT_SIZE.LARGE,
    speed: 2.13,
    cargo: 0,
    detectionRange: 5,
    sightRange: 8,
    model: 'archon.glb',
    animations: { idle: 'idle', walk: 'walk', attack: 'attack', death: 'death', merge: 'merge' },
  },

  // ═══════════════════════════════════════════
  // Reaver 金甲虫
  // ═══════════════════════════════════════════
  reaver: {
    id: 'reaver',
    name: '金甲虫',
    nameEn: 'Reaver',
    race: RACE.PROTOSS,
    type: 'unit',
    category: 'ground',
    cost: { minerals: 200, gas: 100, supply: 4 },
    buildTime: 70,
    hp: 100,
    armor: 0,
    shield: 80,
    attack: {
      damage: 100,          // 圣甲虫伤害
      range: 8,
      speed: 60,            // 攻速很慢
      type: ATTACK_TYPE.EXPLOSIVE,
      splash: 2.0,
      projectile: true,     // 发射圣甲虫（可被拦截）
    },
    abilities: ['build_scarab'],
    abilities_desc: {
      build_scarab: '制造圣甲虫（每次15矿物，最多5发）',
    },
    scarabAmmo: 0,
    maxScarabs: 5,
    prerequisites: ['robotics_facility', 'robotics_support_bay'],
    buildFrom: 'robotics_facility',
    size: UNIT_SIZE.LARGE,
    speed: 0.67,            // 非常慢
    cargo: 0,
    detectionRange: 5,
    sightRange: 8,
    model: 'reaver.glb',
    animations: { idle: 'idle', walk: 'crawl', attack: 'attack', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Observer 观察者
  // ═══════════════════════════════════════════
  observer: {
    id: 'observer',
    name: '观察者',
    nameEn: 'Observer',
    race: RACE.PROTOSS,
    type: 'unit',
    category: 'air',
    cost: { minerals: 25, gas: 75, supply: 1 },
    buildTime: 40,
    hp: 40,
    armor: 0,
    shield: 20,
    attack: {
      damage: 0,
      range: 0,
      speed: 0,
      type: null,
    },
    abilities: ['cloaking'],
    abilities_desc: {
      cloaking: '永久隐形飞行单位',
    },
    prerequisites: ['robotics_facility', 'observatory'],
    buildFrom: 'robotics_facility',
    size: UNIT_SIZE.SMALL,
    speed: 2.81,
    isFlying: true,
    cloakable: true,
    detection: true,         // 反隐形
    detectionRange: 9,
    sightRange: 10,
    model: 'observer.glb',
    animations: { idle: 'idle', walk: 'fly', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Shuttle 运输机
  // ═══════════════════════════════════════════
  shuttle: {
    id: 'shuttle',
    name: '运输机',
    nameEn: 'Shuttle',
    race: RACE.PROTOSS,
    type: 'unit',
    category: 'air',
    cost: { minerals: 200, gas: 0, supply: 2 },
    buildTime: 40,
    hp: 80,
    armor: 0,
    shield: 60,
    attack: {
      damage: 0,
      range: 0,
      speed: 0,
      type: null,
    },
    abilities: ['load', 'unload'],
    abilities_desc: {
      load: '装载最多8个地面单位',
      unload: '卸载装载的单位',
    },
    cargo: 8,
    prerequisites: ['robotics_facility'],
    buildFrom: 'robotics_facility',
    size: UNIT_SIZE.LARGE,
    speed: 3.58,
    isFlying: true,
    detectionRange: 5,
    sightRange: 8,
    model: 'shuttle.glb',
    animations: { idle: 'idle', walk: 'fly', load: 'load', unload: 'unload', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Corsair 海盗船
  // ═══════════════════════════════════════════
  corsair: {
    id: 'corsair',
    name: '海盗船',
    nameEn: 'Corsair',
    race: RACE.PROTOSS,
    type: 'unit',
    category: 'air',
    cost: { minerals: 100, gas: 100, supply: 2 },
    buildTime: 40,
    hp: 100,
    armor: 0,
    shield: 80,
    attack: {
      damage: 5,
      range: 4,
      speed: 8,             // 极快攻速
      type: ATTACK_TYPE.EXPLOSIVE,
      splash: 3.0,          // 对空溅射
      antiAirOnly: true,
      hitCount: 9,          // 每次攻击发射9发
    },
    abilities: ['disruption_web'],
    abilities_desc: {
      disruption_web: '在区域内使敌方地面单位无法攻击（消耗125能量，需Fleet Beacon科技）',
    },
    energy: { max: 200, regenRate: 0.5625 },
    prerequisites: ['stargate'],
    buildFrom: 'stargate',
    size: UNIT_SIZE.MEDIUM,
    speed: 3.58,
    isFlying: true,
    cargo: 0,
    detectionRange: 5,
    sightRange: 8,
    model: 'corsair.glb',
    animations: { idle: 'idle', walk: 'fly', attack: 'attack', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Scout 侦察机
  // ═══════════════════════════════════════════
  scout: {
    id: 'scout',
    name: '侦察机',
    nameEn: 'Scout',
    race: RACE.PROTOSS,
    type: 'unit',
    category: 'air',
    cost: { minerals: 275, gas: 175, supply: 3 },
    buildTime: 80,
    hp: 150,
    armor: 0,
    shield: 100,
    attack: {
      damage: 8,
      range: 5,
      speed: 22,
      type: ATTACK_TYPE.NORMAL,
      // 对空武器
      antiAir: {
        damage: 28,
        range: 6,
        speed: 30,
        type: ATTACK_TYPE.EXPLOSIVE,
      },
    },
    abilities: [],
    prerequisites: ['stargate'],
    buildFrom: 'stargate',
    size: UNIT_SIZE.LARGE,
    speed: 3.13,
    isFlying: true,
    cargo: 0,
    detectionRange: 5,
    sightRange: 10,
    model: 'scout.glb',
    animations: { idle: 'idle', walk: 'fly', attack: 'attack', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Carrier 航母
  // ═══════════════════════════════════════════
  carrier: {
    id: 'carrier',
    name: '航母',
    nameEn: 'Carrier',
    race: RACE.PROTOSS,
    type: 'unit',
    category: 'air',
    cost: { minerals: 350, gas: 250, supply: 6 },
    buildTime: 140,
    hp: 300,
    armor: 4,
    shield: 150,
    attack: {
      damage: 6,            // 单个拦截机伤害
      range: 8,
      speed: 18,
      type: ATTACK_TYPE.NORMAL,
      interceptors: 4,      // 基础拦截机数量
      interceptorsUpgraded: 8, // 升级后
      interceptorDamage: 6, // 每个拦截机伤害
    },
    abilities: ['launch_interceptors'],
    abilities_desc: {
      launch_interceptors: '释放拦截机自动攻击（最多8架）',
    },
    interceptorCost: { minerals: 25, gas: 0 },  // 每架拦截机补给费
    prerequisites: ['stargate', 'fleet_beacon'],
    buildFrom: 'stargate',
    size: UNIT_SIZE.LARGE,
    speed: 1.58,
    isFlying: true,
    cargo: 0,
    detectionRange: 5,
    sightRange: 11,
    model: 'carrier.glb',
    animations: { idle: 'idle', walk: 'fly', attack: 'attack', death: 'death', launch: 'launch' },
  },

  // ═══════════════════════════════════════════
  // Arbiter 仲裁者
  // ═══════════════════════════════════════════
  arbiter: {
    id: 'arbiter',
    name: '仲裁者',
    nameEn: 'Arbiter',
    race: RACE.PROTOSS,
    type: 'unit',
    category: 'air',
    cost: { minerals: 100, gas: 350, supply: 4 },
    buildTime: 100,
    hp: 200,
    armor: 1,
    shield: 150,
    attack: {
      damage: 10,
      range: 5,
      speed: 45,
      type: ATTACK_TYPE.NORMAL,
      splash: 1.0,
    },
    abilities: ['stasis_field', 'recall', 'passive_cloak'],
    abilities_desc: {
      stasis_field: '冻结范围内所有敌方单位10秒（消耗150能量）',
      recall: '将远处的友方单位传送到仲裁者位置（消耗150能量）',
      passive_cloak: '被动使周围友方单位隐形',
    },
    energy: { max: 200, regenRate: 0.5625 },
    prerequisites: ['stargate', 'citadel_of_adun', 'fleet_beacon'],
    buildFrom: 'stargate',
    size: UNIT_SIZE.LARGE,
    speed: 2.58,
    isFlying: true,
    detectionRange: 5,
    sightRange: 9,
    model: 'arbiter.glb',
    animations: { idle: 'idle', walk: 'fly', attack: 'attack', cast: 'cast', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Interceptor 拦截机（航母子单位，特殊）
  // ═══════════════════════════════════════════
  interceptor: {
    id: 'interceptor',
    name: '拦截机',
    nameEn: 'Interceptor',
    race: RACE.PROTOSS,
    type: 'unit',
    category: 'special',
    cost: { minerals: 25, gas: 0, supply: 0 },
    buildTime: 5,
    hp: 40,
    armor: 0,
    shield: 0,
    attack: {
      damage: 6,
      range: 0.5,
      speed: 18,
      type: ATTACK_TYPE.NORMAL,
    },
    abilities: [],
    prerequisites: [],
    buildFrom: 'carrier',
    size: UNIT_SIZE.SMALL,
    speed: 5.0,
    isFlying: true,
    isSubUnit: true,        // 子单位，不由玩家直接控制
    detectionRange: 0,
    sightRange: 3,
    model: 'interceptor.glb',
    animations: { idle: 'idle', walk: 'fly', attack: 'attack', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Scarab 圣甲虫（金甲虫弹药，特殊）
  // ═══════════════════════════════════════════
  scarab: {
    id: 'scarab',
    name: '圣甲虫',
    nameEn: 'Scarab',
    race: RACE.PROTOSS,
    type: 'unit',
    category: 'special',
    cost: { minerals: 15, gas: 0, supply: 0 },
    buildTime: 4,
    hp: 10,
    armor: 0,
    shield: 0,
    attack: {
      damage: 100,
      range: 0,
      speed: 999,
      type: ATTACK_TYPE.EXPLOSIVE,
      splash: 2.0,
      suicide: true,        // 碰撞后消失
    },
    abilities: [],
    prerequisites: [],
    buildFrom: 'reaver',
    size: UNIT_SIZE.SMALL,
    speed: 6.0,
    isSubUnit: true,
    detectionRange: 0,
    sightRange: 3,
    model: 'scarab.glb',
    animations: { idle: 'idle', walk: 'crawl', attack: 'attack', death: 'death' },
  },
};

// ── 按分类导出 ──
export const PROTOSS_WORKERS = Object.values(PROTOSS_UNITS).filter(u => u.category === 'worker');
export const PROTOSS_GROUND = Object.values(PROTOSS_UNITS).filter(u => u.category === 'ground');
export const PROTOSS_AIR = Object.values(PROTOSS_UNITS).filter(u => u.category === 'air');
export const PROTOSS_CASTERS = Object.values(PROTOSS_UNITS).filter(u => u.category === 'caster');
export const PROTOSS_UNITS_ARRAY = Object.values(PROTOSS_UNITS);

export default PROTOSS_UNITS;
