// ═══════════════════════════════════════════
// StarCraft Web - 人族 (Terran) 全部建筑定义
// 数值参考SC1原版
// ═══════════════════════════════════════════

import { RACE } from '../../shared/Constants.js';

/**
 * 人族建筑完整定义
 * size: {x, z} 格子尺寸
 * sightRange: 建筑视野
 * supplyProvided: 提供的人口
 */

export const TERRAN_BUILDINGS = {
  // ═══════════════════════════════════════════
  // Command Center 指挥中心
  // ═══════════════════════════════════════════
  command_center: {
    id: 'command_center',
    name: '指挥中心',
    nameEn: 'Command Center',
    race: RACE.TERRAN,
    type: 'building',
    category: 'primary',
    cost: { minerals: 400, gas: 0 },
    buildTime: 100,
    hp: 1500,
    armor: 3,
    shield: 0,
    size: { x: 4, z: 4 },
    sightRange: 11,
    supplyProvided: 0,
    supplyDepot: false,
    produces: ['scv'],
    producesRate: 20,  // SCV训练时间
    techTree: {
      requires: [],
      unlocks: ['supply_depot', 'barracks', 'refinery'],
    },
    abilities: ['lift_off', 'land', 'load_scf'],
    abilities_desc: {
      lift_off: '起飞（可移动到新位置降落）',
      land: '降落到指定位置',
    },
    addOns: ['comsat_station', 'nuclear_silo'],
    model: 'command_center.glb',
    animations: { idle: 'idle', build: 'build', lift: 'lift', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Supply Depot 补给站
  // ═══════════════════════════════════════════
  supply_depot: {
    id: 'supply_depot',
    name: '补给站',
    nameEn: 'Supply Depot',
    race: RACE.TERRAN,
    type: 'building',
    category: 'supply',
    cost: { minerals: 100, gas: 0 },
    buildTime: 30,
    hp: 500,
    armor: 1,
    shield: 0,
    size: { x: 2, z: 2 },
    sightRange: 8,
    supplyProvided: 8,
    supplyDepot: true,
    produces: [],
    techTree: {
      requires: ['command_center'],
      unlocks: [],
    },
    abilities: ['raise', 'lower'],
    abilities_desc: {
      raise: '升起补给站阻挡地面通行',
      lower: '降下补给站允许通行',
    },
    model: 'supply_depot.glb',
    animations: { idle: 'idle', build: 'build', raise: 'raise', lower: 'lower', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Refinery 精炼厂
  // ═══════════════════════════════════════════
  refinery: {
    id: 'refinery',
    name: '精炼厂',
    nameEn: 'Refinery',
    race: RACE.TERRAN,
    type: 'building',
    category: 'resource',
    cost: { minerals: 100, gas: 0 },
    buildTime: 30,
    hp: 750,
    armor: 1,
    shield: 0,
    size: { x: 2, z: 2 },
    sightRange: 5,
    supplyProvided: 0,
    produces: [],
    techTree: {
      requires: ['command_center'],
      unlocks: [],
    },
    resourceType: 'gas',
    harvestRate: 1.031,   // 每tick采集瓦斯速率
    maxHarvesters: 3,
    model: 'refinery.glb',
    animations: { idle: 'idle', build: 'build', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Barracks 兵营
  // ═══════════════════════════════════════════
  barracks: {
    id: 'barracks',
    name: '兵营',
    nameEn: 'Barracks',
    race: RACE.TERRAN,
    type: 'building',
    category: 'production',
    cost: { minerals: 150, gas: 0 },
    buildTime: 60,
    hp: 1000,
    armor: 1,
    shield: 0,
    size: { x: 3, z: 3 },
    sightRange: 8,
    supplyProvided: 0,
    produces: ['marine', 'firebat', 'medic', 'ghost'],
    producesQueue: 5,      // 最大队列长度
    techTree: {
      requires: ['command_center'],
      unlocks: ['engineering_bay', 'academy'],
    },
    abilities: ['lift_off', 'land'],
    addOns: ['machine_shop'],
    model: 'barracks.glb',
    animations: { idle: 'idle', build: 'build', train: 'train', lift: 'lift', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Engineering Bay 工程湾
  // ═══════════════════════════════════════════
  engineering_bay: {
    id: 'engineering_bay',
    name: '工程湾',
    nameEn: 'Engineering Bay',
    race: RACE.TERRAN,
    type: 'building',
    category: 'upgrade',
    cost: { minerals: 125, gas: 0 },
    buildTime: 45,
    hp: 850,
    armor: 1,
    shield: 0,
    size: { x: 3, z: 3 },
    sightRange: 8,
    supplyProvided: 0,
    produces: [],
    techTree: {
      requires: ['barracks'],
      unlocks: ['missile_turret'],
    },
    upgrades: ['infantry_weapons_1', 'infantry_weapons_2', 'infantry_weapons_3',
               'infantry_armor_1', 'infantry_armor_2', 'infantry_armor_3'],
    model: 'engineering_bay.glb',
    animations: { idle: 'idle', build: 'build', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Academy 学院
  // ═══════════════════════════════════════════
  academy: {
    id: 'academy',
    name: '学院',
    nameEn: 'Academy',
    race: RACE.TERRAN,
    type: 'building',
    category: 'tech',
    cost: { minerals: 150, gas: 0 },
    buildTime: 40,
    hp: 600,
    armor: 1,
    shield: 0,
    size: { x: 3, z: 3 },
    sightRange: 8,
    supplyProvided: 0,
    produces: [],
    techTree: {
      requires: ['barracks'],
      unlocks: [],
    },
    upgrades: ['stimpack', 'ocular_implants', 'moebius_reactor'],
    abilities_granted: ['lockdown', 'nuclear_strike'],
    model: 'academy.glb',
    animations: { idle: 'idle', build: 'build', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Factory 重工厂
  // ═══════════════════════════════════════════
  factory: {
    id: 'factory',
    name: '重工厂',
    nameEn: 'Factory',
    race: RACE.TERRAN,
    type: 'building',
    category: 'production',
    cost: { minerals: 200, gas: 100 },
    buildTime: 60,
    hp: 1250,
    armor: 1,
    shield: 0,
    size: { x: 4, z: 3 },
    sightRange: 8,
    supplyProvided: 0,
    produces: ['vulture', 'siege_tank', 'goliath'],
    producesQueue: 5,
    techTree: {
      requires: ['barracks'],
      unlocks: ['starport', 'armory'],
    },
    abilities: ['lift_off', 'land'],
    addOns: ['machine_shop'],
    model: 'factory.glb',
    animations: { idle: 'idle', build: 'build', train: 'train', lift: 'lift', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Machine Shop 附属建筑（重工厂附属）
  // ═══════════════════════════════════════════
  machine_shop: {
    id: 'machine_shop',
    name: '机械研究所',
    nameEn: 'Machine Shop',
    race: RACE.TERRAN,
    type: 'building',
    category: 'addon',
    cost: { minerals: 50, gas: 25 },
    buildTime: 20,
    hp: 500,
    armor: 0,
    shield: 0,
    size: { x: 2, z: 2 },
    sightRange: 5,
    supplyProvided: 0,
    produces: [],
    isAddOn: true,
    attachTo: 'factory',
    techTree: {
      requires: ['factory'],
      unlocks: [],
    },
    upgrades: ['siege_tech', 'spider_mines', 'vulture_speed'],
    model: 'machine_shop.glb',
    animations: { idle: 'idle', build: 'build', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Starport 星港
  // ═══════════════════════════════════════════
  starport: {
    id: 'starport',
    name: '星港',
    nameEn: 'Starport',
    race: RACE.TERRAN,
    type: 'building',
    category: 'production',
    cost: { minerals: 150, gas: 100 },
    buildTime: 70,
    hp: 1300,
    armor: 1,
    shield: 0,
    size: { x: 4, z: 3 },
    sightRange: 8,
    supplyProvided: 0,
    produces: ['wraith', 'valkyrie', 'dropship', 'science_vessel', 'battlecruiser'],
    producesQueue: 5,
    techTree: {
      requires: ['factory'],
      unlocks: ['science_facility'],
    },
    abilities: ['lift_off', 'land'],
    addOns: ['control_tower'],
    model: 'starport.glb',
    animations: { idle: 'idle', build: 'build', train: 'train', lift: 'lift', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Control Tower 控制塔（星港附属）
  // ═══════════════════════════════════════════
  control_tower: {
    id: 'control_tower',
    name: '控制塔',
    nameEn: 'Control Tower',
    race: RACE.TERRAN,
    type: 'building',
    category: 'addon',
    cost: { minerals: 50, gas: 50 },
    buildTime: 25,
    hp: 500,
    armor: 0,
    shield: 0,
    size: { x: 2, z: 2 },
    sightRange: 5,
    supplyProvided: 0,
    produces: [],
    isAddOn: true,
    attachTo: 'starport',
    techTree: {
      requires: ['starport'],
      unlocks: [],
    },
    upgrades: ['cloaking_field'],
    model: 'control_tower.glb',
    animations: { idle: 'idle', build: 'build', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Science Facility 科学设施
  // ═══════════════════════════════════════════
  science_facility: {
    id: 'science_facility',
    name: '科学设施',
    nameEn: 'Science Facility',
    race: RACE.TERRAN,
    type: 'building',
    category: 'tech',
    cost: { minerals: 100, gas: 150 },
    buildTime: 60,
    hp: 850,
    armor: 1,
    shield: 0,
    size: { x: 3, z: 3 },
    sightRange: 8,
    supplyProvided: 0,
    produces: [],
    techTree: {
      requires: ['starport'],
      unlocks: [],
    },
    upgrades: ['emp_shockwave', 'yamato_gun'],
    addOns: ['covert_ops', 'physics_lab'],
    model: 'science_facility.glb',
    animations: { idle: 'idle', build: 'build', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Covert Ops 隐秘行动处（科学设施附属）
  // ═══════════════════════════════════════════
  covert_ops: {
    id: 'covert_ops',
    name: '隐秘行动处',
    nameEn: 'Covert Ops',
    race: RACE.TERRAN,
    type: 'building',
    category: 'addon',
    cost: { minerals: 50, gas: 50 },
    buildTime: 25,
    hp: 400,
    armor: 0,
    shield: 0,
    size: { x: 2, z: 2 },
    sightRange: 5,
    isAddOn: true,
    attachTo: 'science_facility',
    techTree: { requires: ['science_facility'], unlocks: [] },
    upgrades: ['cloaking_field', 'lockdown'],
    model: 'covert_ops.glb',
    animations: { idle: 'idle', build: 'build', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Physics Lab 物理实验室（科学设施附属）
  // ═══════════════════════════════════════════
  physics_lab: {
    id: 'physics_lab',
    name: '物理实验室',
    nameEn: 'Physics Lab',
    race: RACE.TERRAN,
    type: 'building',
    category: 'addon',
    cost: { minerals: 50, gas: 50 },
    buildTime: 25,
    hp: 400,
    armor: 0,
    shield: 0,
    size: { x: 2, z: 2 },
    sightRange: 5,
    isAddOn: true,
    attachTo: 'science_facility',
    techTree: { requires: ['science_facility'], unlocks: [] },
    upgrades: ['yamato_gun', 'ap_m_rounds'],
    model: 'physics_lab.glb',
    animations: { idle: 'idle', build: 'build', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Missile Turret 导弹塔
  // ═══════════════════════════════════════════
  missile_turret: {
    id: 'missile_turret',
    name: '导弹塔',
    nameEn: 'Missile Turret',
    race: RACE.TERRAN,
    type: 'building',
    category: 'defense',
    cost: { minerals: 75, gas: 0 },
    buildTime: 30,
    hp: 200,
    armor: 0,
    shield: 0,
    size: { x: 2, z: 2 },
    sightRange: 8,
    supplyProvided: 0,
    produces: [],
    attack: {
      damage: 20,
      range: 7,
      speed: 22,
      type: 'explosive',
      antiAirOnly: true,
    },
    detection: true,
    detectionRange: 10,
    techTree: {
      requires: ['engineering_bay'],
      unlocks: [],
    },
    model: 'missile_turret.glb',
    animations: { idle: 'idle', build: 'build', attack: 'attack', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Bunker 地堡
  // ═══════════════════════════════════════════
  bunker: {
    id: 'bunker',
    name: '地堡',
    nameEn: 'Bunker',
    race: RACE.TERRAN,
    type: 'building',
    category: 'defense',
    cost: { minerals: 100, gas: 0 },
    buildTime: 30,
    hp: 400,
    armor: 1,
    shield: 0,
    size: { x: 3, z: 3 },
    sightRange: 8,
    supplyProvided: 0,
    produces: [],
    garrisonCapacity: 4,   // 可驻扎4个步兵
    techTree: {
      requires: ['barracks'],
      unlocks: [],
    },
    abilities: ['load', 'unload'],
    abilities_desc: {
      load: '让步兵进入地堡',
      unload: '让步兵离开地堡',
    },
    model: 'bunker.glb',
    animations: { idle: 'idle', build: 'build', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Armory 军械库
  // ═══════════════════════════════════════════
  armory: {
    id: 'armory',
    name: '军械库',
    nameEn: 'Armory',
    race: RACE.TERRAN,
    type: 'building',
    category: 'upgrade',
    cost: { minerals: 100, gas: 100 },
    buildTime: 60,
    hp: 750,
    armor: 1,
    shield: 0,
    size: { x: 3, z: 3 },
    sightRange: 8,
    supplyProvided: 0,
    produces: [],
    techTree: {
      requires: ['factory'],
      unlocks: [],
    },
    upgrades: [
      'vehicle_weapons_1', 'vehicle_weapons_2', 'vehicle_weapons_3',
      'vehicle_plating_1', 'vehicle_plating_2', 'vehicle_plating_3',
      'ship_weapons_1', 'ship_weapons_2', 'ship_weapons_3',
      'ship_plating_1', 'ship_plating_2', 'ship_plating_3',
    ],
    model: 'armory.glb',
    animations: { idle: 'idle', build: 'build', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Comsat Station 通讯卫星（指挥中心附属）
  // ═══════════════════════════════════════════
  comsat_station: {
    id: 'comsat_station',
    name: '通讯卫星',
    nameEn: 'Comsat Station',
    race: RACE.TERRAN,
    type: 'building',
    category: 'addon',
    cost: { minerals: 50, gas: 50 },
    buildTime: 30,
    hp: 500,
    armor: 0,
    shield: 0,
    size: { x: 2, z: 2 },
    sightRange: 10,
    isAddOn: true,
    attachTo: 'command_center',
    detection: true,
    techTree: {
      requires: ['academy', 'command_center'],
      unlocks: [],
    },
    abilities: ['scanner_sweep'],
    abilities_desc: {
      scanner_sweep: '扫描地图任意位置，揭示隐形单位和战争迷雾（消耗50能量）',
    },
    energy: { max: 200, regenRate: 0.5625 },
    model: 'comsat_station.glb',
    animations: { idle: 'idle', build: 'build', scan: 'scan', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Nuclear Silo 核弹发射井（指挥中心附属）
  // ═══════════════════════════════════════════
  nuclear_silo: {
    id: 'nuclear_silo',
    name: '核弹发射井',
    nameEn: 'Nuclear Silo',
    race: RACE.TERRAN,
    type: 'building',
    category: 'addon',
    cost: { minerals: 50, gas: 50 },
    buildTime: 30,
    hp: 600,
    armor: 0,
    shield: 0,
    size: { x: 2, z: 2 },
    sightRange: 5,
    isAddOn: true,
    attachTo: 'command_center',
    techTree: {
      requires: ['academy', 'science_facility', 'command_center'],
      unlocks: [],
    },
    produces: ['nuclear_missile'],
    model: 'nuclear_silo.glb',
    animations: { idle: 'idle', build: 'build', launch: 'launch', death: 'death' },
  },
};

// ── 按分类导出 ──
export const TERRAN_PRIMARY = Object.values(TERRAN_BUILDINGS).filter(b => b.category === 'primary');
export const TERRAN_PRODUCTION = Object.values(TERRAN_BUILDINGS).filter(b => b.category === 'production');
export const TERRAN_DEFENSE = Object.values(TERRAN_BUILDINGS).filter(b => b.category === 'defense');
export const TERRAN_TECH = Object.values(TERRAN_BUILDINGS).filter(b => b.category === 'tech');
export const TERRAN_ADDONS = Object.values(TERRAN_BUILDINGS).filter(b => b.category === 'addon');
export const TERRAN_BUILDINGS_ARRAY = Object.values(TERRAN_BUILDINGS);

export default TERRAN_BUILDINGS;
