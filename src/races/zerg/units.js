// ═══════════════════════════════════════════
// StarCraft Web - 虫族 (Zerg) 全部兵种定义
// 数值参考SC1原版
// ═══════════════════════════════════════════

import { RACE, UNIT_SIZE, ATTACK_TYPE } from '../../shared/Constants.js';

/**
 * 虫族单位完整定义
 * 注意：虫族建筑从幼虫孵化，部分单位由其他单位变异而来
 * cost.minerals/gas/food = 基础资源消耗（不含变异消耗）
 * morphFrom = 变异来源单位（如Lurker由Hydralisk变异）
 */

export const ZERG_UNITS = {
  // ═══════════════════════════════════════════
  // Drone 工蜂
  // ═══════════════════════════════════════════
  drone: {
    id: 'drone',
    name: '工蜂',
    nameEn: 'Drone',
    race: RACE.ZERG,
    type: 'unit',
    category: 'worker',
    cost: { minerals: 50, gas: 0, supply: 1 },
    buildTime: 20,
    hp: 40,
    armor: 0,
    shield: 0,
    attack: {
      damage: 5,
      range: 0.1,       // 近战
      speed: 30,
      type: ATTACK_TYPE.NORMAL,
    },
    abilities: ['build'],
    abilities_desc: {
      build: '消耗自身建造建筑（建筑完成后工蜂消失）',
    },
    prerequisites: ['hatchery'],
    buildFrom: 'hatchery',
    size: UNIT_SIZE.SMALL,
    speed: 2.81,
    cargo: 0,
    detectionRange: 5,
    sightRange: 7,
    model: 'drone.glb',
    animations: { idle: 'idle', walk: 'walk', attack: 'attack', death: 'death', build: 'build', harvest: 'harvest' },
  },

  // ═══════════════════════════════════════════
  // Overlord 领主（提供人口）
  // ═══════════════════════════════════════════
  overlord: {
    id: 'overlord',
    name: '领主',
    nameEn: 'Overlord',
    race: RACE.ZERG,
    type: 'unit',
    category: 'support',
    cost: { minerals: 100, gas: 0, supply: 0 },
    buildTime: 40,
    hp: 200,
    armor: 0,
    shield: 0,
    attack: {
      damage: 0,
      range: 0,
      speed: 0,
      type: null,
    },
    abilities: ['provide_supply', 'drop', 'generate_creep'],
    abilities_desc: {
      provide_supply: '提供8人口',
      drop: '可装载4个地面单位并空投（需Ventral Sacs科技）',
      generate_creep: '在周围生成菌毯',
    },
    providesSupply: 8,     // 提供8人口
    cargo: 0,               // 未升级前不能装载
    prerequisites: [],
    buildFrom: 'hatchery',
    size: UNIT_SIZE.LARGE,
    speed: 0.82,            // 非常慢
    isFlying: true,
    detectionRange: 5,
    sightRange: 11,         // 视野很大
    model: 'overlord.glb',
    animations: { idle: 'idle', walk: 'fly', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Zergling 跳虫
  // ═══════════════════════════════════════════
  zergling: {
    id: 'zergling',
    name: '跳虫',
    nameEn: 'Zergling',
    race: RACE.ZERG,
    type: 'unit',
    category: 'ground',
    cost: { minerals: 25, gas: 0, supply: 0.5 },  // 每次出2只
    trainCount: 2,           // 每次训练出2只
    buildTime: 28,
    hp: 35,
    armor: 0,
    shield: 0,
    attack: {
      damage: 5,
      range: 0,             // 近战
      speed: 8,             // 攻击非常快
      type: ATTACK_TYPE.NORMAL,
    },
    abilities: [],
    prerequisites: ['spawning_pool'],
    buildFrom: 'larva',
    size: UNIT_SIZE.SMALL,
    speed: 5.49,            // 基础速度很快
    speedUpgraded: 6.62,    // 代谢升级后
    cargo: 0,
    detectionRange: 5,
    sightRange: 5,
    model: 'zergling.glb',
    animations: { idle: 'idle', walk: 'walk', attack: 'attack', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Hydralisk 刺蛇
  // ═══════════════════════════════════════════
  hydralisk: {
    id: 'hydralisk',
    name: '刺蛇',
    nameEn: 'Hydralisk',
    race: RACE.ZERG,
    type: 'unit',
    category: 'ground',
    cost: { minerals: 75, gas: 25, supply: 2 },
    buildTime: 40,
    hp: 80,
    armor: 1,
    shield: 0,
    attack: {
      damage: 12,
      range: 4,
      speed: 18,
      type: ATTACK_TYPE.EXPLOSIVE,
      // 可升级到对空
      antiAir: {
        damage: 12,
        range: 5,
        speed: 18,
        type: ATTACK_TYPE.EXPLOSIVE,
        requires: 'muscular_augments',
      },
    },
    abilities: ['burrow'],
    abilities_desc: {
      burrow: '潜入地下（不可见，可作为Lurker变异的前提）',
    },
    prerequisites: ['hydralisk_den'],
    buildFrom: 'larva',
    size: UNIT_SIZE.MEDIUM,
    speed: 2.13,
    speedUpgraded: 2.81,    // 肌肉增强升级后
    cargo: 0,
    detectionRange: 5,
    sightRange: 7,
    canMorphTo: ['lurker'],
    model: 'hydralisk.glb',
    animations: { idle: 'idle', walk: 'walk', attack: 'attack', death: 'death', burrow: 'burrow' },
  },

  // ═══════════════════════════════════════════
  // Lurker 潜伏者（由Hydralisk变异）
  // ═══════════════════════════════════════════
  lurker: {
    id: 'lurker',
    name: '潜伏者',
    nameEn: 'Lurker',
    race: RACE.ZERG,
    type: 'unit',
    category: 'ground',
    morphFrom: 'hydralisk',
    cost: { minerals: 50, gas: 100, supply: 2 },
    buildTime: 40,
    hp: 125,
    armor: 1,
    shield: 0,
    attack: {
      damage: 20,
      range: 6,
      speed: 37,
      type: ATTACK_TYPE.EXPLOSIVE,
      splash: true,          // 直线穿透伤害
      canAttack: false,      // 默认不能攻击，必须burrow
      burrowedAttack: true,  // 潜地后才能攻击
    },
    abilities: ['burrow_attack'],
    abilities_desc: {
      burrow_attack: '潜地后释放地刺攻击直线上的敌人',
    },
    prerequisites: ['hydralisk_den', 'lurker_aspect'],
    buildFrom: 'hydralisk_morph',
    size: UNIT_SIZE.MEDIUM,
    speed: 1.13,
    cargo: 0,
    detectionRange: 5,
    sightRange: 7,
    model: 'lurker.glb',
    animations: { idle: 'idle', walk: 'walk', attack: 'attack', death: 'death', burrow: 'burrow' },
  },

  // ═══════════════════════════════════════════
  // Mutalisk 飞龙
  // ═══════════════════════════════════════════
  mutalisk: {
    id: 'mutalisk',
    name: '飞龙',
    nameEn: 'Mutalisk',
    race: RACE.ZERG,
    type: 'unit',
    category: 'air',
    cost: { minerals: 100, gas: 100, supply: 2 },
    buildTime: 50,
    hp: 120,
    armor: 0,
    shield: 0,
    attack: {
      damage: 9,
      range: 3,
      speed: 18,
      type: ATTACK_TYPE.CONCUSSIVE,
      bounce: 3,             // 弹射3次，每次递减1/3伤害
      bounceRange: 3.0,      // 弹射范围
    },
    abilities: [],
    prerequisites: ['spire'],
    buildFrom: 'larva',
    size: UNIT_SIZE.MEDIUM,
    speed: 4.13,
    isFlying: true,
    cargo: 0,
    detectionRange: 5,
    sightRange: 8,
    canMorphTo: ['guardian', 'devourer'],
    model: 'mutalisk.glb',
    animations: { idle: 'idle', walk: 'fly', attack: 'attack', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Guardian 守护者（由Mutalisk变异）
  // ═══════════════════════════════════════════
  guardian: {
    id: 'guardian',
    name: '守护者',
    nameEn: 'Guardian',
    race: RACE.ZERG,
    type: 'unit',
    category: 'air',
    morphFrom: 'mutalisk',
    cost: { minerals: 150, gas: 100, supply: 2 },
    buildTime: 40,
    hp: 80,
    armor: 0,
    shield: 0,
    attack: {
      damage: 20,
      range: 8,              // 超远射程
      speed: 30,
      type: ATTACK_TYPE.EXPLOSIVE,
      groundOnly: true,      // 只能攻击地面
    },
    abilities: [],
    prerequisites: ['greater_spire'],
    buildFrom: 'mutalisk_morph',
    size: UNIT_SIZE.LARGE,
    speed: 1.13,             // 非常慢
    isFlying: true,
    cargo: 0,
    detectionRange: 5,
    sightRange: 10,
    model: 'guardian.glb',
    animations: { idle: 'idle', walk: 'fly', attack: 'attack', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Devourer 吞噬者（由Mutalisk变异）
  // ═══════════════════════════════════════════
  devourer: {
    id: 'devourer',
    name: '吞噬者',
    nameEn: 'Devourer',
    race: RACE.ZERG,
    type: 'unit',
    category: 'air',
    morphFrom: 'mutalisk',
    cost: { minerals: 150, gas: 100, supply: 2 },
    buildTime: 40,
    hp: 100,
    armor: 1,
    shield: 0,
    attack: {
      damage: 15,
      range: 6,
      speed: 33,
      type: ATTACK_TYPE.EXPLOSIVE,
      antiAirOnly: true,     // 只能对空
      acidSpores: true,      // 附着酸性孢子，使目标受到额外伤害
    },
    abilities: ['acid_spores'],
    abilities_desc: {
      acid_spores: '攻击附着酸性孢子，使目标被攻击时额外受到伤害',
    },
    prerequisites: ['greater_spire'],
    buildFrom: 'mutalisk_morph',
    size: UNIT_SIZE.LARGE,
    speed: 3.13,
    isFlying: true,
    cargo: 0,
    detectionRange: 5,
    sightRange: 8,
    model: 'devourer.glb',
    animations: { idle: 'idle', walk: 'fly', attack: 'attack', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Scourge 自杀蝠
  // ═══════════════════════════════════════════
  scourge: {
    id: 'scourge',
    name: '自杀蝠',
    nameEn: 'Scourge',
    race: RACE.ZERG,
    type: 'unit',
    category: 'air',
    cost: { minerals: 25, gas: 75, supply: 0.5 },  // 每次出2只
    trainCount: 2,
    buildTime: 30,
    hp: 25,
    armor: 0,
    shield: 0,
    attack: {
      damage: 110,
      range: 0.1,            // 自杀式攻击
      speed: 999,            // 碰撞即死
      type: ATTACK_TYPE.EXPLOSIVE,
      suicide: true,         // 攻击后自身死亡
      antiAirOnly: true,
    },
    abilities: ['suicide_attack'],
    prerequisites: ['spire'],
    buildFrom: 'larva',
    size: UNIT_SIZE.SMALL,
    speed: 4.13,
    isFlying: true,
    cargo: 0,
    detectionRange: 5,
    sightRange: 5,
    model: 'scourge.glb',
    animations: { idle: 'idle', walk: 'fly', attack: 'attack', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Queen 皇后
  // ═══════════════════════════════════════════
  queen: {
    id: 'queen',
    name: '皇后',
    nameEn: 'Queen',
    race: RACE.ZERG,
    type: 'unit',
    category: 'caster',
    cost: { minerals: 100, gas: 100, supply: 2 },
    buildTime: 50,
    hp: 80,
    armor: 0,
    shield: 0,
    attack: {
      damage: 0,
      range: 0,
      speed: 0,
      type: null,
    },
    abilities: ['ensnare', 'spawn_broodling', 'parasite'],
    abilities_desc: {
      ensnare: '使范围内敌方单位移动速度降低50%，攻击速度降低50%，持续约30秒（消耗75能量）',
      spawn_broodling: '消灭一个敌方地面生物单位并产生2只跳虫（消耗150能量）',
      parasite: '寄生目标单位，可看到其周围视野（消耗75能量）',
    },
    energy: { max: 200, regenRate: 0.5625 },
    prerequisites: ['queens_nest'],
    buildFrom: 'larva',
    size: UNIT_SIZE.MEDIUM,
    speed: 3.13,
    isFlying: true,
    cargo: 0,
    detectionRange: 5,
    sightRange: 9,
    model: 'queen.glb',
    animations: { idle: 'idle', walk: 'fly', cast: 'cast', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Defiler 蝎子
  // ═══════════════════════════════════════════
  defiler: {
    id: 'defiler',
    name: '蝎子',
    nameEn: 'Defiler',
    race: RACE.ZERG,
    type: 'unit',
    category: 'caster',
    cost: { minerals: 50, gas: 150, supply: 2 },
    buildTime: 50,
    hp: 80,
    armor: 1,
    shield: 0,
    attack: {
      damage: 0,
      range: 0,
      speed: 0,
      type: null,
    },
    abilities: ['dark_swarm', 'plague', 'consume'],
    abilities_desc: {
      dark_swarm: '在区域内制造暗雾，区域内友方地面单位免疫远程伤害（消耗100能量）',
      plague: '对范围内敌方单位每秒造成293伤害（上限）逐渐衰减（消耗150能量）',
      consume: '吞噬一个友方生物单位恢复50能量',
    },
    energy: { max: 200, regenRate: 0.5625 },
    prerequisites: ['defiler_mound'],
    buildFrom: 'larva',
    size: UNIT_SIZE.MEDIUM,
    speed: 1.83,
    cargo: 0,
    detectionRange: 5,
    sightRange: 8,
    model: 'defiler.glb',
    animations: { idle: 'idle', walk: 'walk', cast: 'cast', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Ultralisk 雷兽
  // ═══════════════════════════════════════════
  ultralisk: {
    id: 'ultralisk',
    name: '雷兽',
    nameEn: 'Ultralisk',
    race: RACE.ZERG,
    type: 'unit',
    category: 'ground',
    cost: { minerals: 200, gas: 200, supply: 4 },
    buildTime: 100,
    hp: 400,
    armor: 6,               // 高护甲
    shield: 0,
    attack: {
      damage: 20,
      range: 0,             // 近战
      speed: 15,
      type: ATTACK_TYPE.NORMAL,
      splash: 1.5,          // 范围伤害
    },
    abilities: ['burrow'],
    prerequisites: ['ultralisk_cavern'],
    buildFrom: 'larva',
    size: UNIT_SIZE.LARGE,
    speed: 2.13,
    speedUpgraded: 2.66,    // 新陈代谢升级后
    cargo: 0,
    detectionRange: 5,
    sightRange: 7,
    model: 'ultralisk.glb',
    animations: { idle: 'idle', walk: 'walk', attack: 'attack', death: 'death', burrow: 'burrow' },
  },

  // ═══════════════════════════════════════════
  // Infested Terran 被感染人族
  // ═══════════════════════════════════════════
  infested_terran: {
    id: 'infested_terran',
    name: '被感染人族',
    nameEn: 'Infested Terran',
    race: RACE.ZERG,
    type: 'unit',
    category: 'ground',
    cost: { minerals: 100, gas: 0, supply: 1 },
    buildTime: 40,
    hp: 60,
    armor: 0,
    shield: 0,
    attack: {
      damage: 500,          // 超高爆炸伤害
      range: 0,
      speed: 999,
      type: ATTACK_TYPE.NORMAL,
      suicide: true,        // 自杀式攻击
      splash: 2.5,
    },
    abilities: ['suicide_detonate'],
    abilities_desc: {
      suicide_detonate: '冲向敌人自爆，对范围内造成500点伤害',
    },
    prerequisites: ['hive', 'infested_command_center'],
    buildFrom: 'infested_command_center',
    size: UNIT_SIZE.SMALL,
    speed: 1.78,
    cargo: 0,
    detectionRange: 5,
    sightRange: 5,
    model: 'infested_terran.glb',
    animations: { idle: 'idle', walk: 'walk', attack: 'attack', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Larva 幼虫（特殊单位）
  // ═══════════════════════════════════════════
  larva: {
    id: 'larva',
    name: '幼虫',
    nameEn: 'Larva',
    race: RACE.ZERG,
    type: 'unit',
    category: 'special',
    cost: { minerals: 0, gas: 0, supply: 0 },
    buildTime: 0,
    hp: 25,
    armor: 0,
    shield: 0,
    attack: { damage: 0, range: 0, speed: 0, type: null },
    abilities: ['morph'],
    abilities_desc: {
      morph: '变异为其他虫族单位（消耗幼虫+对应资源）',
    },
    prerequisites: [],
    buildFrom: 'hatchery',
    size: UNIT_SIZE.SMALL,
    speed: 1.0,
    cargo: 0,
    detectionRange: 0,
    sightRange: 4,
    model: 'larva.glb',
    animations: { idle: 'idle', walk: 'crawl', death: 'death' },
  },
};

// ── 按分类导出 ──
export const ZERG_WORKERS = Object.values(ZERG_UNITS).filter(u => u.category === 'worker');
export const ZERG_GROUND = Object.values(ZERG_UNITS).filter(u => u.category === 'ground');
export const ZERG_AIR = Object.values(ZERG_UNITS).filter(u => u.category === 'air');
export const ZERG_CASTERS = Object.values(ZERG_UNITS).filter(u => u.category === 'caster');
export const ZERG_UNITS_ARRAY = Object.values(ZERG_UNITS);

export default ZERG_UNITS;
