// ═══════════════════════════════════════════
// StarCraft Web - 人族 (Terran) 全部兵种定义
// 数值参考SC1原版，微调平衡
// ═══════════════════════════════════════════

import { RACE, UNIT_SIZE, ATTACK_TYPE } from '../../shared/Constants.js';

/**
 * 人族单位完整定义
 * 攻击速度单位：tick（24fps，即每N个tick攻击一次）
 * 范围单位：格
 * 速度单位：格/秒
 */

export const TERRAN_UNITS = {
  // ═══════════════════════════════════════════
  // SCV 工程车
  // ═══════════════════════════════════════════
  scv: {
    id: 'scv',
    name: '工程车',
    nameEn: 'SCV',
    race: RACE.TERRAN,
    type: 'unit',
    category: 'worker',
    cost: { minerals: 50, gas: 0, supply: 1 },
    buildTime: 20,      // 秒
    hp: 60,
    armor: 0,
    shield: 0,
    attack: {
      damage: 5,
      range: 0.1,      // 近战
      speed: 30,        // 每30tick攻击一次
      type: ATTACK_TYPE.NORMAL,
      vsArmor: null,
    },
    abilities: ['repair', 'build'],
    abilities_desc: {
      repair: '修理受损建筑和机械单位',
      build: '建造建筑',
    },
    prerequisites: ['command_center'],
    buildFrom: 'command_center',
    size: UNIT_SIZE.SMALL,
    speed: 2.81,
    cargo: 0,
    detectionRange: 5,
    sightRange: 7,
    model: 'scv.glb',
    animations: { idle: 'idle', walk: 'walk', attack: 'attack', death: 'death', build: 'build' },
  },

  // ═══════════════════════════════════════════
  // Marine 机枪兵
  // ═══════════════════════════════════════════
  marine: {
    id: 'marine',
    name: '机枪兵',
    nameEn: 'Marine',
    race: RACE.TERRAN,
    type: 'unit',
    category: 'infantry',
    cost: { minerals: 50, gas: 0, supply: 1 },
    buildTime: 24,
    hp: 40,
    armor: 0,
    shield: 0,
    attack: {
      damage: 6,
      range: 4,
      speed: 15,
      type: ATTACK_TYPE.NORMAL,
    },
    abilities: ['stimpack'],
    abilities_desc: {
      stimpack: '消耗10HP，提升攻击速度和移动速度23%，持续约16秒',
    },
    prerequisites: ['barracks'],
    buildFrom: 'barracks',
    size: UNIT_SIZE.SMALL,
    speed: 2.13,
    cargo: 0,
    detectionRange: 5,
    sightRange: 7,
    model: 'marine.glb',
    animations: { idle: 'idle', walk: 'walk', attack: 'attack', death: 'death', stim: 'stim' },
  },

  // ═══════════════════════════════════════════
  // Firebat 火焰兵
  // ═══════════════════════════════════════════
  firebat: {
    id: 'firebat',
    name: '火焰兵',
    nameEn: 'Firebat',
    race: RACE.TERRAN,
    type: 'unit',
    category: 'infantry',
    cost: { minerals: 50, gas: 0, supply: 1 },
    buildTime: 24,
    hp: 50,
    armor: 1,
    shield: 0,
    attack: {
      damage: 8,
      range: 2,
      speed: 22,
      type: ATTACK_TYPE.NORMAL,
      splash: 1.5,       // 范围溅射半径
      splashTargets: 3,  // 最多命中3个目标
    },
    abilities: ['stimpack'],
    prerequisites: ['barracks', 'academy'],
    buildFrom: 'barracks',
    size: UNIT_SIZE.SMALL,
    speed: 2.13,
    cargo: 0,
    detectionRange: 5,
    sightRange: 7,
    model: 'firebat.glb',
    animations: { idle: 'idle', walk: 'walk', attack: 'attack', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Medic 医疗兵
  // ═══════════════════════════════════════════
  medic: {
    id: 'medic',
    name: '医疗兵',
    nameEn: 'Medic',
    race: RACE.TERRAN,
    type: 'unit',
    category: 'infantry',
    cost: { minerals: 50, gas: 25, supply: 2 },
    buildTime: 50,
    hp: 60,
    armor: 1,
    shield: 0,
    attack: {
      damage: 0,
      range: 0,
      speed: 0,
      type: null,
    },
    abilities: ['heal', 'restoration', 'optical_flare'],
    abilities_desc: {
      heal: '自动治疗受伤的生化单位（每秒恢复最多7HP，消耗能量）',
      restoration: '消除友方单位的负面效果（消耗50能量）',
      optical_flare: '致盲敌方单位，使其视野降为1（消耗100能量）',
    },
    energy: { max: 200, regenRate: 0.5625 }, // 每秒恢复能量
    prerequisites: ['barracks', 'academy'],
    buildFrom: 'barracks',
    size: UNIT_SIZE.SMALL,
    speed: 2.13,
    cargo: 0,
    detectionRange: 5,
    sightRange: 8,
    model: 'medic.glb',
    animations: { idle: 'idle', walk: 'walk', heal: 'heal', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Ghost 幽灵特工
  // ═══════════════════════════════════════════
  ghost: {
    id: 'ghost',
    name: '幽灵特工',
    nameEn: 'Ghost',
    race: RACE.TERRAN,
    type: 'unit',
    category: 'infantry',
    cost: { minerals: 25, gas: 100, supply: 2 },
    buildTime: 60,
    hp: 100,
    armor: 1,
    shield: 0,
    attack: {
      damage: 10,
      range: 7,
      speed: 22,
      type: ATTACK_TYPE.CONCUSSIVE,
    },
    abilities: ['lockdown', 'nuclear_strike', 'cloaking'],
    abilities_desc: {
      lockdown: '锁定敌方机械单位10秒（消耗100能量）',
      nuclear_strike: '发射核弹（需Nuclear Silo，消耗200能量）',
      cloaking: '隐形（持续消耗能量，需Ocular Implants）',
    },
    energy: { max: 200, regenRate: 0.5625 },
    prerequisites: ['barracks', 'academy', 'science_facility'],
    buildFrom: 'barracks',
    size: UNIT_SIZE.SMALL,
    speed: 2.13,
    cargo: 0,
    detectionRange: 5,
    sightRange: 10,
    cloakable: true,
    model: 'ghost.glb',
    animations: { idle: 'idle', walk: 'walk', attack: 'attack', death: 'death', cloak: 'cloak' },
  },

  // ═══════════════════════════════════════════
  // Vulture 秃鹫车
  // ═══════════════════════════════════════════
  vulture: {
    id: 'vulture',
    name: '秃鹫车',
    nameEn: 'Vulture',
    race: RACE.TERRAN,
    type: 'unit',
    category: 'vehicle',
    cost: { minerals: 75, gas: 0, supply: 1 },
    buildTime: 30,
    hp: 80,
    armor: 0,
    shield: 0,
    attack: {
      damage: 20,
      range: 5,
      speed: 22,
      type: ATTACK_TYPE.CONCUSSIVE,
    },
    abilities: ['spider_mines'],
    abilities_desc: {
      spider_mines: '放置蜘蛛雷，对踩到的敌方单位造成125点爆炸伤害（需升级）',
    },
    cargo: 0, // 可装载蜘蛛雷
    prerequisites: ['factory'],
    buildFrom: 'factory',
    size: UNIT_SIZE.MEDIUM,
    speed: 4.13,       // 非常快
    detectionRange: 5,
    sightRange: 8,
    model: 'vulture.glb',
    animations: { idle: 'idle', walk: 'walk', attack: 'attack', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Siege Tank 攻城坦克
  // ═══════════════════════════════════════════
  siege_tank: {
    id: 'siege_tank',
    name: '攻城坦克',
    nameEn: 'Siege Tank',
    race: RACE.TERRAN,
    type: 'unit',
    category: 'vehicle',
    cost: { minerals: 150, gas: 100, supply: 2 },
    buildTime: 50,
    hp: 150,
    armor: 1,
    shield: 0,
    attack: {
      damage: 30,
      range: 7,
      speed: 37,        // 攻击间隔较长
      type: ATTACK_TYPE.EXPLOSIVE,
      splash: 1.0,
      // 攻城模式属性
      siegeMode: {
        damage: 70,
        range: 12,      // 超远射程
        speed: 65,      // 攻城模式攻速较慢
        type: ATTACK_TYPE.EXPLOSIVE,
        splash: 2.0,    // 大范围溅射
      },
    },
    abilities: ['siege_mode'],
    abilities_desc: {
      siege_mode: '切换攻城模式（不可移动，射程和伤害大幅提升）',
    },
    prerequisites: ['factory'],
    buildFrom: 'factory',
    size: UNIT_SIZE.LARGE,
    speed: 1.78,
    detectionRange: 5,
    sightRange: 10,
    model: 'siege_tank.glb',
    animations: { idle: 'idle', walk: 'walk', attack: 'attack', death: 'death', siege: 'siege' },
  },

  // ═══════════════════════════════════════════
  // Goliath 巨人
  // ═══════════════════════════════════════════
  goliath: {
    id: 'goliath',
    name: '巨人',
    nameEn: 'Goliath',
    race: RACE.TERRAN,
    type: 'unit',
    category: 'vehicle',
    cost: { minerals: 100, gas: 50, supply: 2 },
    buildTime: 40,
    hp: 125,
    armor: 1,
    shield: 0,
    attack: {
      damage: 20,
      range: 5,
      speed: 30,
      type: ATTACK_TYPE.NORMAL,
      // 对空武器
      antiAir: {
        damage: 20,
        range: 6,
        speed: 22,
        type: ATTACK_TYPE.EXPLOSIVE,
        missiles: 2,   // 双导弹
      },
    },
    abilities: [],
    prerequisites: ['factory', 'armory'],
    buildFrom: 'factory',
    size: UNIT_SIZE.LARGE,
    speed: 1.88,
    detectionRange: 5,
    sightRange: 8,
    model: 'goliath.glb',
    animations: { idle: 'idle', walk: 'walk', attack: 'attack', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Wraith 幽灵战机
  // ═══════════════════════════════════════════
  wraith: {
    id: 'wraith',
    name: '幽灵战机',
    nameEn: 'Wraith',
    race: RACE.TERRAN,
    type: 'unit',
    category: 'air',
    cost: { minerals: 150, gas: 100, supply: 2 },
    buildTime: 60,
    hp: 120,
    armor: 0,
    shield: 0,
    attack: {
      damage: 8,
      range: 5,
      speed: 22,
      type: ATTACK_TYPE.NORMAL,
      // 对空双导弹
      antiAir: {
        damage: 20,
        range: 5,
        speed: 30,
        type: ATTACK_TYPE.EXPLOSIVE,
        missiles: 2,
      },
    },
    abilities: ['cloaking'],
    abilities_desc: {
      cloaking: '隐形（持续消耗能量，需Cloaking Field科技）',
    },
    energy: { max: 200, regenRate: 0.5625 },
    prerequisites: ['starport'],
    buildFrom: 'starport',
    size: UNIT_SIZE.SMALL,
    speed: 3.58,
    isFlying: true,
    detectionRange: 5,
    sightRange: 8,
    cloakable: true,
    model: 'wraith.glb',
    animations: { idle: 'idle', walk: 'fly', attack: 'attack', death: 'death', cloak: 'cloak' },
  },

  // ═══════════════════════════════════════════
  // Valkyrie 女武神
  // ═══════════════════════════════════════════
  valkyrie: {
    id: 'valkyrie',
    name: '女武神',
    nameEn: 'Valkyrie',
    race: RACE.TERRAN,
    type: 'unit',
    category: 'air',
    cost: { minerals: 250, gas: 125, supply: 3 },
    buildTime: 70,
    hp: 200,
    armor: 1,
    shield: 0,
    attack: {
      damage: 6,
      range: 6,
      speed: 30,
      type: ATTACK_TYPE.EXPLOSIVE,
      antiAirOnly: true,     // 只能对空
      splash: 2.0,           // 大范围溅射
      missiles: 8,           // 8发导弹齐射
      burstCooldown: 90,     // 齐射后冷却
    },
    abilities: [],
    prerequisites: ['starport', 'armory'],
    buildFrom: 'starport',
    size: UNIT_SIZE.LARGE,
    speed: 3.13,
    isFlying: true,
    detectionRange: 5,
    sightRange: 8,
    model: 'valkyrie.glb',
    animations: { idle: 'idle', walk: 'fly', attack: 'attack', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Battlecruiser 战列巡洋舰
  // ═══════════════════════════════════════════
  battlecruiser: {
    id: 'battlecruiser',
    name: '战列巡洋舰',
    nameEn: 'Battlecruiser',
    race: RACE.TERRAN,
    type: 'unit',
    category: 'air',
    cost: { minerals: 400, gas: 300, supply: 6 },
    buildTime: 100,
    hp: 300,
    armor: 3,
    shield: 0,
    attack: {
      damage: 25,
      range: 6,
      speed: 22,
      type: ATTACK_TYPE.NORMAL,
      // 对地激光
      ground: {
        damage: 25,
        range: 6,
        speed: 22,
        type: ATTACK_TYPE.NORMAL,
        beams: 8,     // 8束激光
      },
      // 对空导弹
      antiAir: {
        damage: 10,
        range: 6,
        speed: 30,
        type: ATTACK_TYPE.EXPLOSIVE,
      },
    },
    abilities: ['yamato_gun'],
    abilities_desc: {
      yamato_gun: '大和炮：对单体造成260点伤害（消耗200能量，需Covert Ops科技）',
    },
    energy: { max: 200, regenRate: 0.5625 },
    prerequisites: ['starport', 'science_facility', 'control_tower'],
    buildFrom: 'starport',
    size: UNIT_SIZE.LARGE,
    speed: 1.58,       // 非常慢
    isFlying: true,
    detectionRange: 5,
    sightRange: 11,
    model: 'battlecruiser.glb',
    animations: { idle: 'idle', walk: 'fly', attack: 'attack', death: 'death', yamato: 'yamato' },
  },

  // ═══════════════════════════════════════════
  // Science Vessel 科学球
  // ═══════════════════════════════════════════
  science_vessel: {
    id: 'science_vessel',
    name: '科学球',
    nameEn: 'Science Vessel',
    race: RACE.TERRAN,
    type: 'unit',
    category: 'air',
    cost: { minerals: 100, gas: 225, supply: 2 },
    buildTime: 80,
    hp: 200,
    armor: 1,
    shield: 0,
    attack: {
      damage: 0,
      range: 0,
      speed: 0,
      type: null,
    },
    abilities: ['defensive_matrix', 'irradiate', 'emp_shockwave'],
    abilities_desc: {
      defensive_matrix: '为友方单位添加吸收650伤害的防护罩（消耗100能量）',
      irradiate: '对目标及周围生物单位每秒造成25点伤害，持续20秒（消耗75能量）',
      emp_shockwave: '消除范围内所有单位的护盾并耗尽能量（消耗150能量，射程8）',
    },
    energy: { max: 200, regenRate: 0.5625 },
    prerequisites: ['starport', 'science_facility'],
    buildFrom: 'starport',
    size: UNIT_SIZE.LARGE,
    speed: 2.47,
    isFlying: true,
    detection: true,    // 反隐形单位
    detectionRange: 10,
    sightRange: 10,
    model: 'science_vessel.glb',
    animations: { idle: 'idle', walk: 'fly', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Dropship 运输机
  // ═══════════════════════════════════════════
  dropship: {
    id: 'dropship',
    name: '运输机',
    nameEn: 'Dropship',
    race: RACE.TERRAN,
    type: 'unit',
    category: 'air',
    cost: { minerals: 100, gas: 100, supply: 2 },
    buildTime: 40,
    hp: 100,
    armor: 0,
    shield: 0,
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
    prerequisites: ['starport'],
    buildFrom: 'starport',
    size: UNIT_SIZE.LARGE,
    speed: 2.47,
    isFlying: true,
    detectionRange: 5,
    sightRange: 8,
    model: 'dropship.glb',
    animations: { idle: 'idle', walk: 'fly', load: 'load', unload: 'unload', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Nuclear Missile 核弹（特殊单位）
  // ═══════════════════════════════════════════
  nuclear_missile: {
    id: 'nuclear_missile',
    name: '核弹',
    nameEn: 'Nuclear Missile',
    race: RACE.TERRAN,
    type: 'unit',
    category: 'special',
    cost: { minerals: 200, gas: 200, supply: 0 },
    buildTime: 60,
    hp: 50,
    armor: 0,
    shield: 0,
    attack: {
      damage: 300,       // 爆炸中心
      range: 0,
      speed: 0,
      type: ATTACK_TYPE.NORMAL,
      splash: 6.0,       // 超大范围溅射
    },
    abilities: ['nuclear_launch'],
    abilities_desc: {
      nuclear_launch: '核弹发射（需Ghost引导，60秒倒计时）',
    },
    prerequisites: ['nuclear_silo'],
    buildFrom: 'nuclear_silo',
    size: UNIT_SIZE.MEDIUM,
    speed: 0,
    isFlying: false,
    detectionRange: 0,
    sightRange: 5,
    model: 'nuclear_missile.glb',
    animations: { idle: 'idle', launch: 'launch', death: 'death' },
  },
};

// ── 按分类导出的单位列表 ──
export const TERRAN_WORKERS = Object.values(TERRAN_UNITS).filter(u => u.category === 'worker');
export const TERRAN_INFANTRY = Object.values(TERRAN_UNITS).filter(u => u.category === 'infantry');
export const TERRAN_VEHICLES = Object.values(TERRAN_UNITS).filter(u => u.category === 'vehicle');
export const TERRAN_AIRCRAFT = Object.values(TERRAN_UNITS).filter(u => u.category === 'air');
export const TERRAN_UNITS_ARRAY = Object.values(TERRAN_UNITS);

export default TERRAN_UNITS;
