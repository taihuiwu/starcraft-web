// ═══════════════════════════════════════════
// StarCraft Web - 神族 (Protoss) 全部建筑定义
// 数值参考SC1原版
// ═══════════════════════════════════════════

import { RACE, ATTACK_TYPE } from '../../shared/Constants.js';

/**
 * 神族建筑完整定义
 * 神族建筑需要Pylon能量场供电
 * 建筑拥有护盾，受损后自动恢复（在能量场内）
 */

export const PROTOSS_BUILDINGS = {
  // ═══════════════════════════════════════════
  // Nexus 星灵枢纽
  // ═══════════════════════════════════════════
  nexus: {
    id: 'nexus',
    name: '星灵枢纽',
    nameEn: 'Nexus',
    race: RACE.PROTOSS,
    type: 'building',
    category: 'primary',
    cost: { minerals: 400, gas: 0 },
    buildTime: 100,
    hp: 1000,
    armor: 1,
    shield: 500,
    shieldRegenRate: 0.015,   // 护盾缓慢恢复
    size: { x: 4, z: 4 },
    sightRange: 11,
    supplyProvided: 0,
    supplyDepot: false,
    powered: false,            // Nexus自身不需要供电
    produces: ['probe'],
    producesRate: 20,
    techTree: {
      requires: [],
      unlocks: ['pylon', 'assimilator'],
    },
    abilities: ['recall_unit'],
    abilities_desc: {
      recall_unit: '召回远处的探机（消耗能量）',
    },
    energy: { max: 200, regenRate: 0.5625 },
    model: 'nexus.glb',
    animations: { idle: 'idle', build: 'build', train: 'train', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Pylon 水晶塔（提供能量场和人口）
  // ═══════════════════════════════════════════
  pylon: {
    id: 'pylon',
    name: '水晶塔',
    nameEn: 'Pylon',
    race: RACE.PROTOSS,
    type: 'building',
    category: 'supply',
    cost: { minerals: 100, gas: 0 },
    buildTime: 25,
    hp: 300,
    armor: 0,
    shield: 300,
    size: { x: 2, z: 2 },
    sightRange: 8,
    supplyProvided: 8,
    supplyDepot: true,
    powered: false,           // 水晶塔自身不需要供电
    produces: [],
    powerRadius: 8,           // 能量场半径
    techTree: {
      requires: ['nexus'],
      unlocks: [],
    },
    model: 'pylon.glb',
    animations: { idle: 'idle', build: 'build', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Assimilator 气矿
  // ═══════════════════════════════════════════
  assimilator: {
    id: 'assimilator',
    name: '气矿',
    nameEn: 'Assimilator',
    race: RACE.PROTOSS,
    type: 'building',
    category: 'resource',
    cost: { minerals: 100, gas: 0 },
    buildTime: 40,
    hp: 450,
    armor: 1,
    shield: 450,
    size: { x: 3, z: 3 },
    sightRange: 5,
    powered: false,
    produces: [],
    resourceType: 'gas',
    harvestRate: 1.031,
    maxHarvesters: 3,
    techTree: {
      requires: ['nexus'],
      unlocks: [],
    },
    model: 'assimilator.glb',
    animations: { idle: 'idle', build: 'build', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Gateway 传送门
  // ═══════════════════════════════════════════
  gateway: {
    id: 'gateway',
    name: '传送门',
    nameEn: 'Gateway',
    race: RACE.PROTOSS,
    type: 'building',
    category: 'production',
    cost: { minerals: 150, gas: 0 },
    buildTime: 60,
    hp: 500,
    armor: 1,
    shield: 500,
    size: { x: 3, z: 3 },
    sightRange: 8,
    powered: true,            // 需要水晶塔供电
    produces: ['zealot', 'dragoon', 'high_templar', 'dark_templar'],
    producesQueue: 5,
    techTree: {
      requires: ['pylon'],
      unlocks: ['cybernetics_core', 'forge'],
    },
    canTransformTo: ['warp_gate'],  // 可变形为折跃门
    model: 'gateway.glb',
    animations: { idle: 'idle', build: 'build', train: 'train', transform: 'transform', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Cybernetics Core 控制核心
  // ═══════════════════════════════════════════
  cybernetics_core: {
    id: 'cybernetics_core',
    name: '控制核心',
    nameEn: 'Cybernetics Core',
    race: RACE.PROTOSS,
    type: 'building',
    category: 'tech',
    cost: { minerals: 200, gas: 0 },
    buildTime: 60,
    hp: 500,
    armor: 1,
    shield: 500,
    size: { x: 3, z: 3 },
    sightRange: 8,
    powered: true,
    produces: [],
    techTree: {
      requires: ['gateway'],
      unlocks: ['stargate', 'citadel_of_adun', 'robotics_facility'],
    },
    upgrades: ['air_weapons_1', 'air_weapons_2', 'air_weapons_3',
               'air_armor_1', 'air_armor_2', 'air_armor_3',
               'singularity_charge'],
    model: 'cybernetics_core.glb',
    animations: { idle: 'idle', build: 'build', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Forge 锻炉
  // ═══════════════════════════════════════════
  forge: {
    id: 'forge',
    name: '锻炉',
    nameEn: 'Forge',
    race: RACE.PROTOSS,
    type: 'building',
    category: 'upgrade',
    cost: { minerals: 150, gas: 0 },
    buildTime: 40,
    hp: 550,
    armor: 1,
    shield: 550,
    size: { x: 3, z: 3 },
    sightRange: 8,
    powered: true,
    produces: [],
    techTree: {
      requires: ['pylon'],
      unlocks: [],
    },
    upgrades: [
      'ground_weapons_1', 'ground_weapons_2', 'ground_weapons_3',
      'ground_armor_1', 'ground_armor_2', 'ground_armor_3',
      'shields_1', 'shields_2', 'shields_3',
    ],
    model: 'forge.glb',
    animations: { idle: 'idle', build: 'build', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Photon Cannon 光子炮台
  // ═══════════════════════════════════════════
  photon_cannon: {
    id: 'photon_cannon',
    name: '光子炮台',
    nameEn: 'Photon Cannon',
    race: RACE.PROTOSS,
    type: 'building',
    category: 'defense',
    cost: { minerals: 150, gas: 0 },
    buildTime: 40,
    hp: 100,
    armor: 0,
    shield: 100,
    size: { x: 2, z: 2 },
    sightRange: 8,
    powered: true,
    produces: [],
    attack: {
      damage: 20,
      range: 7,
      speed: 22,
      type: ATTACK_TYPE.EXPLOSIVE,
    },
    detection: true,
    detectionRange: 8,
    techTree: {
      requires: ['forge'],
      unlocks: [],
    },
    model: 'photon_cannon.glb',
    animations: { idle: 'idle', build: 'build', attack: 'attack', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Citadel of Adun 议会
  // ═══════════════════════════════════════════
  citadel_of_adun: {
    id: 'citadel_of_adun',
    name: '议会',
    nameEn: 'Citadel of Adun',
    race: RACE.PROTOSS,
    type: 'building',
    category: 'tech',
    cost: { minerals: 150, gas: 100 },
    buildTime: 60,
    hp: 700,
    armor: 1,
    shield: 700,
    size: { x: 3, z: 3 },
    sightRange: 8,
    powered: true,
    produces: [],
    techTree: {
      requires: ['cybernetics_core'],
      unlocks: ['templar_archives', 'arbiter_tribunal'],
    },
    upgrades: ['leg_enhancements'],
    model: 'citadel_of_adun.glb',
    animations: { idle: 'idle', build: 'build', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Templar Archives 圣堂文献
  // ═══════════════════════════════════════════
  templar_archives: {
    id: 'templar_archives',
    name: '圣堂文献',
    nameEn: 'Templar Archives',
    race: RACE.PROTOSS,
    type: 'building',
    category: 'tech',
    cost: { minerals: 150, gas: 150 },
    buildTime: 60,
    hp: 500,
    armor: 1,
    shield: 500,
    size: { x: 3, z: 3 },
    sightRange: 8,
    powered: true,
    produces: [],
    techTree: {
      requires: ['citadel_of_adun'],
      unlocks: [],
    },
    upgrades: ['psionic_storm', 'hallucination', 'khaydarin_amulet'],
    abilities_granted: ['psionic_storm', 'hallucination'],
    model: 'templar_archives.glb',
    animations: { idle: 'idle', build: 'build', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Stargate 星门
  // ═══════════════════════════════════════════
  stargate: {
    id: 'stargate',
    name: '星门',
    nameEn: 'Stargate',
    race: RACE.PROTOSS,
    type: 'building',
    category: 'production',
    cost: { minerals: 150, gas: 100 },
    buildTime: 70,
    hp: 600,
    armor: 1,
    shield: 600,
    size: { x: 4, z: 3 },
    sightRange: 8,
    powered: true,
    produces: ['corsair', 'scout', 'carrier', 'arbiter'],
    producesQueue: 5,
    techTree: {
      requires: ['cybernetics_core'],
      unlocks: ['fleet_beacon', 'arbiter_tribunal'],
    },
    model: 'stargate.glb',
    animations: { idle: 'idle', build: 'build', train: 'train', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Fleet Beacon 舰队信标
  // ═══════════════════════════════════════════
  fleet_beacon: {
    id: 'fleet_beacon',
    name: '舰队信标',
    nameEn: 'Fleet Beacon',
    race: RACE.PROTOSS,
    type: 'building',
    category: 'tech',
    cost: { minerals: 300, gas: 200 },
    buildTime: 60,
    hp: 500,
    armor: 1,
    shield: 500,
    size: { x: 3, z: 3 },
    sightRange: 8,
    powered: true,
    produces: [],
    techTree: {
      requires: ['stargate'],
      unlocks: [],
    },
    upgrades: ['carrier_capacity', 'argus_jewel', 'disruption_web'],
    model: 'fleet_beacon.glb',
    animations: { idle: 'idle', build: 'build', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Robotics Facility 机械台
  // ═══════════════════════════════════════════
  robotics_facility: {
    id: 'robotics_facility',
    name: '机械台',
    nameEn: 'Robotics Facility',
    race: RACE.PROTOSS,
    type: 'building',
    category: 'production',
    cost: { minerals: 200, gas: 100 },
    buildTime: 60,
    hp: 500,
    armor: 1,
    shield: 500,
    size: { x: 3, z: 3 },
    sightRange: 8,
    powered: true,
    produces: ['observer', 'shuttle', 'reaver'],
    producesQueue: 5,
    techTree: {
      requires: ['cybernetics_core'],
      unlocks: ['robotics_support_bay', 'observatory'],
    },
    model: 'robotics_facility.glb',
    animations: { idle: 'idle', build: 'build', train: 'train', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Robotics Support Bay 机械台支援
  // ═══════════════════════════════════════════
  robotics_support_bay: {
    id: 'robotics_support_bay',
    name: '机械台支援',
    nameEn: 'Robotics Support Bay',
    race: RACE.PROTOSS,
    type: 'building',
    category: 'tech',
    cost: { minerals: 150, gas: 100 },
    buildTime: 40,
    hp: 400,
    armor: 1,
    shield: 400,
    size: { x: 3, z: 3 },
    sightRange: 8,
    powered: true,
    produces: [],
    techTree: {
      requires: ['robotics_facility'],
      unlocks: [],
    },
    upgrades: ['scarab_damage', 'scarab_capacity', 'gravitic_drive'],
    model: 'robotics_support_bay.glb',
    animations: { idle: 'idle', build: 'build', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Observatory 观测站
  // ═══════════════════════════════════════════
  observatory: {
    id: 'observatory',
    name: '观测站',
    nameEn: 'Observatory',
    race: RACE.PROTOSS,
    type: 'building',
    category: 'tech',
    cost: { minerals: 150, gas: 50 },
    buildTime: 40,
    hp: 400,
    armor: 1,
    shield: 400,
    size: { x: 3, z: 3 },
    sightRange: 8,
    powered: true,
    produces: [],
    techTree: {
      requires: ['robotics_facility'],
      unlocks: [],
    },
    upgrades: ['gravitic_boosters'],
    model: 'observatory.glb',
    animations: { idle: 'idle', build: 'build', death: 'death' },
  },

  // ═══════════════════════════════════════════
  // Arbiter Tribunal 仲裁庭
  // ═══════════════════════════════════════════
  arbiter_tribunal: {
    id: 'arbiter_tribunal',
    name: '仲裁庭',
    nameEn: 'Arbiter Tribunal',
    race: RACE.PROTOSS,
    type: 'building',
    category: 'tech',
    cost: { minerals: 200, gas: 150 },
    buildTime: 60,
    hp: 500,
    armor: 1,
    shield: 500,
    size: { x: 3, z: 3 },
    sightRange: 8,
    powered: true,
    produces: [],
    techTree: {
      requires: ['citadel_of_adun', 'stargate'],
      unlocks: [],
    },
    upgrades: ['stasis_field', 'recall', 'argus_jewel'],
    model: 'arbiter_tribunal.glb',
    animations: { idle: 'idle', build: 'build', death: 'death' },
  },
};

// ── 按分类导出 ──
export const PROTOSS_PRIMARY = Object.values(PROTOSS_BUILDINGS).filter(b => b.category === 'primary');
export const PROTOSS_PRODUCTION = Object.values(PROTOSS_BUILDINGS).filter(b => b.category === 'production');
export const PROTOSS_DEFENSE = Object.values(PROTOSS_BUILDINGS).filter(b => b.category === 'defense');
export const PROTOSS_TECH = Object.values(PROTOSS_BUILDINGS).filter(b => b.category === 'tech');
export const PROTOSS_BUILDINGS_ARRAY = Object.values(PROTOSS_BUILDINGS);

export default PROTOSS_BUILDINGS;
