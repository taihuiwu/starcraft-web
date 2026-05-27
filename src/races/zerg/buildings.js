// ═══════════════════════════════════════════
// StarCraft Web - 虫族 (Zerg) 全部建筑定义
// 数值参考SC1原版
// ═══════════════════════════════════════════

import { RACE, ATTACK_TYPE } from '../../shared/Constants.js';

/**
 * 虫族建筑完整定义
 * 虫族建筑需要在菌毯上建造
 * 部分建筑由其他建筑变异而来（如Hive由Lair变异）
 */

export const ZERG_BUILDINGS = {
  // ═══════════════════════════════════════════
  // Hatchery 孵化场
  // ═══════════════════════════════════════════
  hatchery: {
    id: 'hatchery',
    name: '孵化场',
    nameEn: 'Hatchery',
    race: RACE.ZERG,
    type: 'building',
    category: 'primary',
    cost: { minerals: 300, gas: 0 },
    buildTime: 100,
    hp: 1250,
    armor: 1,
    shield: 0,
    size: { x: 4, z: 4 },
    sightRange: 11,
    supplyProvided: 1,       // 1人口
    supplyDepot: false,
    requiresCreep: true,     // 需要菌毯
    produces: ['larva'],     // 产生幼虫
    larvaSpawnRate: 36,      // 每36秒产生1只幼虫（最多3只）
    techTree: {
      requires: [],
      unlocks: ['spawning_pool', 'extractor'],
    },
    abilities: ['train_units', 'research_overlord_speed'],
    abilities_desc: {
      train_units: '消耗幼虫孵化各种虫族单位',
    },
    canMorphTo: ['lair'],    // 可变异为Lair
    model: 'hatchery.glb',
    animations: { idle: 'idle', build: 'build', train: 'train', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Lair 虫穴（由Hatchery变异）
  // ═══════════════════════════════════════════
  lair: {
    id: 'lair',
    name: '虫穴',
    nameEn: 'Lair',
    race: RACE.ZERG,
    type: 'building',
    category: 'primary',
    morphFrom: 'hatchery',
    cost: { minerals: 150, gas: 100 },
    buildTime: 100,
    hp: 1800,
    armor: 1,
    shield: 0,
    size: { x: 4, z: 4 },
    sightRange: 11,
    supplyProvided: 1,
    requiresCreep: true,
    produces: ['larva'],
    larvaSpawnRate: 30,      // 稍快
    techTree: {
      requires: ['hatchery'],
      unlocks: ['spire', 'queens_nest', 'nydus_canal'],
    },
    canMorphTo: ['hive'],
    model: 'lair.glb',
    animations: { idle: 'idle', build: 'build', train: 'train', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Hive 蜂巢（由Lair变异，最终形态）
  // ═══════════════════════════════════════════
  hive: {
    id: 'hive',
    name: '蜂巢',
    nameEn: 'Hive',
    race: RACE.ZERG,
    type: 'building',
    category: 'primary',
    morphFrom: 'lair',
    cost: { minerals: 200, gas: 150 },
    buildTime: 100,
    hp: 2500,
    armor: 1,
    shield: 0,
    size: { x: 4, z: 4 },
    sightRange: 11,
    supplyProvided: 1,
    requiresCreep: true,
    produces: ['larva'],
    larvaSpawnRate: 25,      // 最快
    techTree: {
      requires: ['lair'],
      unlocks: ['greater_spire', 'defiler_mound', 'ultralisk_cavern'],
    },
    model: 'hive.glb',
    animations: { idle: 'idle', build: 'build', train: 'train', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Extractor 萃取场
  // ═══════════════════════════════════════════
  extractor: {
    id: 'extractor',
    name: '萃取场',
    nameEn: 'Extractor',
    race: RACE.ZERG,
    type: 'building',
    category: 'resource',
    cost: { minerals: 50, gas: 0 },
    buildTime: 30,
    hp: 450,
    armor: 1,
    shield: 0,
    size: { x: 3, z: 3 },
    sightRange: 5,
    requiresCreep: true,
    produces: [],
    resourceType: 'gas',
    harvestRate: 1.031,
    maxHarvesters: 3,
    techTree: {
      requires: ['hatchery'],
      unlocks: [],
    },
    model: 'extractor.glb',
    animations: { idle: 'idle', build: 'build', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Spawning Pool 分裂池
  // ═══════════════════════════════════════════
  spawning_pool: {
    id: 'spawning_pool',
    name: '分裂池',
    nameEn: 'Spawning Pool',
    race: RACE.ZERG,
    type: 'building',
    category: 'tech',
    cost: { minerals: 200, gas: 0 },
    buildTime: 60,
    hp: 600,
    armor: 1,
    shield: 0,
    size: { x: 3, z: 3 },
    sightRange: 8,
    requiresCreep: true,
    produces: [],
    techTree: {
      requires: ['hatchery'],
      unlocks: [],
    },
    upgrades: ['metabolic_boost', 'adrenal_glands'],
    model: 'spawning_pool.glb',
    animations: { idle: 'idle', build: 'build', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Hydralisk Den 刺蛇巢
  // ═══════════════════════════════════════════
  hydralisk_den: {
    id: 'hydralisk_den',
    name: '刺蛇巢',
    nameEn: 'Hydralisk Den',
    race: RACE.ZERG,
    type: 'building',
    category: 'tech',
    cost: { minerals: 200, gas: 100 },
    buildTime: 40,
    hp: 800,
    armor: 1,
    shield: 0,
    size: { x: 3, z: 3 },
    sightRange: 8,
    requiresCreep: true,
    produces: [],
    techTree: {
      requires: ['spawning_pool'],
      unlocks: [],
    },
    upgrades: ['muscular_augments', 'grooved_spines', 'lurker_aspect'],
    model: 'hydralisk_den.glb',
    animations: { idle: 'idle', build: 'build', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Evolution Chamber 进化室
  // ═══════════════════════════════════════════
  evolution_chamber: {
    id: 'evolution_chamber',
    name: '进化室',
    nameEn: 'Evolution Chamber',
    race: RACE.ZERG,
    type: 'building',
    category: 'upgrade',
    cost: { minerals: 75, gas: 0 },
    buildTime: 40,
    hp: 750,
    armor: 1,
    shield: 0,
    size: { x: 3, z: 3 },
    sightRange: 8,
    requiresCreep: true,
    produces: [],
    techTree: {
      requires: ['spawning_pool'],
      unlocks: [],
    },
    upgrades: [
      'melee_attacks_1', 'melee_attacks_2', 'melee_attacks_3',
      'missile_attacks_1', 'missile_attacks_2', 'missile_attacks_3',
      'carapace_1', 'carapace_2', 'carapace_3',
    ],
    model: 'evolution_chamber.glb',
    animations: { idle: 'idle', build: 'build', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Spire 飞龙塔
  // ═══════════════════════════════════════════
  spire: {
    id: 'spire',
    name: '飞龙塔',
    nameEn: 'Spire',
    race: RACE.ZERG,
    type: 'building',
    category: 'tech',
    cost: { minerals: 200, gas: 150 },
    buildTime: 70,
    hp: 600,
    armor: 1,
    shield: 0,
    size: { x: 2, z: 3 },
    sightRange: 8,
    requiresCreep: true,
    requiresLair: true,       // 需要Lair
    produces: [],
    techTree: {
      requires: ['lair'],
      unlocks: [],
    },
    upgrades: ['flyer_attacks_1', 'flyer_attacks_2', 'flyer_attacks_3',
               'flyer_carapace_1', 'flyer_carapace_2', 'flyer_carapace_3'],
    canMorphTo: ['greater_spire'],
    model: 'spire.glb',
    animations: { idle: 'idle', build: 'build', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Greater Spire 大飞龙塔（由Spire变异）
  // ═══════════════════════════════════════════
  greater_spire: {
    id: 'greater_spire',
    name: '大飞龙塔',
    nameEn: 'Greater Spire',
    race: RACE.ZERG,
    type: 'building',
    category: 'tech',
    morphFrom: 'spire',
    cost: { minerals: 100, gas: 150 },
    buildTime: 70,
    hp: 800,
    armor: 1,
    shield: 0,
    size: { x: 2, z: 3 },
    sightRange: 8,
    requiresCreep: true,
    requiresHive: true,        // 需要Hive
    produces: [],
    techTree: {
      requires: ['spire', 'hive'],
      unlocks: [],
    },
    upgrades: ['flyer_attacks_1', 'flyer_attacks_2', 'flyer_attacks_3',
               'flyer_carapace_1', 'flyer_carapace_2', 'flyer_carapace_3'],
    model: 'greater_spire.glb',
    animations: { idle: 'idle', build: 'build', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Queen's Nest 皇后巢
  // ═══════════════════════════════════════════
  queens_nest: {
    id: 'queens_nest',
    name: '皇后巢',
    nameEn: "Queen's Nest",
    race: RACE.ZERG,
    type: 'building',
    category: 'tech',
    cost: { minerals: 150, gas: 100 },
    buildTime: 60,
    hp: 600,
    armor: 1,
    shield: 0,
    size: { x: 3, z: 3 },
    sightRange: 8,
    requiresCreep: true,
    requiresLair: true,
    produces: [],
    techTree: {
      requires: ['lair'],
      unlocks: [],
    },
    upgrades: [],
    abilities_granted: ['ensnare', 'spawn_broodling', 'parasite'],
    model: 'queens_nest.glb',
    animations: { idle: 'idle', build: 'build', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Defiler Mound 蝎子巢
  // ═══════════════════════════════════════════
  defiler_mound: {
    id: 'defiler_mound',
    name: '蝎子巢',
    nameEn: 'Defiler Mound',
    race: RACE.ZERG,
    type: 'building',
    category: 'tech',
    cost: { minerals: 100, gas: 200 },
    buildTime: 60,
    hp: 600,
    armor: 1,
    shield: 0,
    size: { x: 3, z: 3 },
    sightRange: 8,
    requiresCreep: true,
    requiresHive: true,
    produces: [],
    techTree: {
      requires: ['hive'],
      unlocks: [],
    },
    upgrades: ['consume'],
    abilities_granted: ['dark_swarm', 'plague', 'consume'],
    model: 'defiler_mound.glb',
    animations: { idle: 'idle', build: 'build', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Ultralisk Cavern 雷兽巢
  // ═══════════════════════════════════════════
  ultralisk_cavern: {
    id: 'ultralisk_cavern',
    name: '雷兽巢',
    nameEn: 'Ultralisk Cavern',
    race: RACE.ZERG,
    type: 'building',
    category: 'tech',
    cost: { minerals: 150, gas: 200 },
    buildTime: 60,
    hp: 600,
    armor: 1,
    shield: 0,
    size: { x: 3, z: 3 },
    sightRange: 8,
    requiresCreep: true,
    requiresHive: true,
    produces: [],
    techTree: {
      requires: ['hive'],
      unlocks: [],
    },
    upgrades: ['anabolic_synthesis', 'chitinous_plating'],
    model: 'ultralisk_cavern.glb',
    animations: { idle: 'idle', build: 'build', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Creep Colony 菌毯堡（可变异为防御建筑）
  // ═══════════════════════════════════════════
  creep_colony: {
    id: 'creep_colony',
    name: '菌毯堡',
    nameEn: 'Creep Colony',
    race: RACE.ZERG,
    type: 'building',
    category: 'defense',
    cost: { minerals: 75, gas: 0 },
    buildTime: 30,
    hp: 400,
    armor: 0,
    shield: 0,
    size: { x: 2, z: 2 },
    sightRange: 5,
    requiresCreep: true,
    produces: [],
    techTree: {
      requires: ['spawning_pool'],
      unlocks: [],
    },
    canMorphTo: ['sunken_colony', 'spore_colony'],
    model: 'creep_colony.glb',
    animations: { idle: 'idle', build: 'build', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Sunken Colony 地刺堡（由Creep Colony变异）
  // ═══════════════════════════════════════════
  sunken_colony: {
    id: 'sunken_colony',
    name: '地刺堡',
    nameEn: 'Sunken Colony',
    race: RACE.ZERG,
    type: 'building',
    category: 'defense',
    morphFrom: 'creep_colony',
    cost: { minerals: 50, gas: 0 },
    buildTime: 20,
    hp: 300,
    armor: 0,
    shield: 0,
    size: { x: 2, z: 2 },
    sightRange: 8,
    requiresCreep: true,
    produces: [],
    attack: {
      damage: 20,
      range: 7,
      speed: 22,
      type: ATTACK_TYPE.NORMAL,
      antiGroundOnly: true,
    },
    techTree: {
      requires: ['creep_colony', 'spawning_pool'],
      unlocks: [],
    },
    model: 'sunken_colony.glb',
    animations: { idle: 'idle', build: 'build', attack: 'attack', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Spore Colony 刺孢堡（由Creep Colony变异）
  // ═══════════════════════════════════════════
  spore_colony: {
    id: 'spore_colony',
    name: '刺孢堡',
    nameEn: 'Spore Colony',
    race: RACE.ZERG,
    type: 'building',
    category: 'defense',
    morphFrom: 'creep_colony',
    cost: { minerals: 50, gas: 0 },
    buildTime: 20,
    hp: 400,
    armor: 0,
    shield: 0,
    size: { x: 2, z: 2 },
    sightRange: 8,
    requiresCreep: true,
    produces: [],
    attack: {
      damage: 15,
      range: 7,
      speed: 18,
      type: ATTACK_TYPE.EXPLOSIVE,
      antiAirOnly: true,
    },
    detection: true,
    detectionRange: 7,
    techTree: {
      requires: ['creep_colony'],
      unlocks: [],
    },
    model: 'spore_colony.glb',
    animations: { idle: 'idle', build: 'build', attack: 'attack', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Nydus Canal 坑道网络
  // ═══════════════════════════════════════════
  nydus_canal: {
    id: 'nydus_canal',
    name: '坑道网络',
    nameEn: 'Nydus Canal',
    race: RACE.ZERG,
    type: 'building',
    category: 'special',
    cost: { minerals: 150, gas: 0 },
    buildTime: 30,
    hp: 250,
    armor: 0,
    shield: 0,
    size: { x: 2, z: 2 },
    sightRange: 5,
    requiresCreep: true,
    produces: [],
    techTree: {
      requires: ['lair'],
      unlocks: [],
    },
    abilities: ['transport'],
    abilities_desc: {
      transport: '连接任意两个坑道网络入口，地面单位可快速传送',
    },
    model: 'nydus_canal.glb',
    animations: { idle: 'idle', build: 'build', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Overlord Transport (Upgrade from Overlord)
  // ═══════════════════════════════════════════
  // 注意：Ventral Sacs是Overlord的升级，不是建筑
  // 这里仅作为建筑解锁说明

  // ═══════════════════════════════════════════
  // Greater Spire tech requirements
  // ═══════════════════════════════════════════
};

// ── 按分类导出 ──
export const ZERG_PRIMARY = Object.values(ZERG_BUILDINGS).filter(b => b.category === 'primary');
export const ZERG_DEFENSE = Object.values(ZERG_BUILDINGS).filter(b => b.category === 'defense');
export const ZERG_TECH = Object.values(ZERG_BUILDINGS).filter(b => b.category === 'tech');
export const ZERG_BUILDINGS_ARRAY = Object.values(ZERG_BUILDINGS);

export default ZERG_BUILDINGS;
