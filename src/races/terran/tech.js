// ═══════════════════════════════════════════
// StarCraft Web - 人族 (Terran) 科技树定义
// 包含所有升级、附属建筑解锁
// ═══════════════════════════════════════════

import { RACE } from '../../shared/Constants.js';

/**
 * 人族科技/升级完整定义
 * upgradeType: 'weapon' | 'armor' | 'ability' | 'special'
 * affects: 受影响的单位类型
 */

export const TERRAN_TECH = {
  // ═══════════════════════════════════════════
  // 步兵武器升级 (Engineering Bay)
  // ═══════════════════════════════════════════
  infantry_weapons_1: {
    id: 'infantry_weapons_1',
    name: '步兵武器 I',
    nameEn: 'Infantry Weapons 1',
    race: RACE.TERRAN,
    upgradeType: 'weapon',
    cost: { minerals: 100, gas: 100 },
    researchTime: 160,     // 秒
    level: 1,
    effect: { damageBonus: 1 },
    affects: ['marine', 'firebat', 'ghost', 'medic'],
    prerequisite: 'engineering_bay',
    model: 'upgrade_infantry_weapon.glb',
  },
  infantry_weapons_2: {
    id: 'infantry_weapons_2',
    name: '步兵武器 II',
    nameEn: 'Infantry Weapons 2',
    race: RACE.TERRAN,
    upgradeType: 'weapon',
    cost: { minerals: 150, gas: 150 },
    researchTime: 190,
    level: 2,
    effect: { damageBonus: 2 },
    affects: ['marine', 'firebat', 'ghost'],
    prerequisite: 'engineering_bay',
    requires: ['infantry_weapons_1'],
    model: 'upgrade_infantry_weapon.glb',
  },
  infantry_weapons_3: {
    id: 'infantry_weapons_3',
    name: '步兵武器 III',
    nameEn: 'Infantry Weapons 3',
    race: RACE.TERRAN,
    upgradeType: 'weapon',
    cost: { minerals: 200, gas: 200 },
    researchTime: 220,
    level: 3,
    effect: { damageBonus: 3 },
    affects: ['marine', 'firebat', 'ghost'],
    prerequisite: 'engineering_bay',
    requires: ['infantry_weapons_2'],
    model: 'upgrade_infantry_weapon.glb',
  },

  // ═══════════════════════════════════════════
  // 步兵护甲升级 (Engineering Bay)
  // ═══════════════════════════════════════════
  infantry_armor_1: {
    id: 'infantry_armor_1',
    name: '步兵护甲 I',
    nameEn: 'Infantry Armor 1',
    race: RACE.TERRAN,
    upgradeType: 'armor',
    cost: { minerals: 100, gas: 100 },
    researchTime: 160,
    level: 1,
    effect: { armorBonus: 1 },
    affects: ['marine', 'firebat', 'ghost', 'medic'],
    prerequisite: 'engineering_bay',
    model: 'upgrade_infantry_armor.glb',
  },
  infantry_armor_2: {
    id: 'infantry_armor_2',
    name: '步兵护甲 II',
    nameEn: 'Infantry Armor 2',
    race: RACE.TERRAN,
    upgradeType: 'armor',
    cost: { minerals: 150, gas: 150 },
    researchTime: 190,
    level: 2,
    effect: { armorBonus: 2 },
    affects: ['marine', 'firebat', 'ghost', 'medic'],
    prerequisite: 'engineering_bay',
    requires: ['infantry_armor_1'],
    model: 'upgrade_infantry_armor.glb',
  },
  infantry_armor_3: {
    id: 'infantry_armor_3',
    name: '步兵护甲 III',
    nameEn: 'Infantry Armor 3',
    race: RACE.TERRAN,
    upgradeType: 'armor',
    cost: { minerals: 200, gas: 200 },
    researchTime: 220,
    level: 3,
    effect: { armorBonus: 3 },
    affects: ['marine', 'firebat', 'ghost', 'medic'],
    prerequisite: 'engineering_bay',
    requires: ['infantry_armor_2'],
    model: 'upgrade_infantry_armor.glb',
  },

  // ═══════════════════════════════════════════
  // 载具武器升级 (Armory)
  // ═══════════════════════════════════════════
  vehicle_weapons_1: {
    id: 'vehicle_weapons_1',
    name: '载具武器 I',
    nameEn: 'Vehicle Weapons 1',
    race: RACE.TERRAN,
    upgradeType: 'weapon',
    cost: { minerals: 100, gas: 100 },
    researchTime: 160,
    level: 1,
    effect: { damageBonus: 2 },
    affects: ['vulture', 'siege_tank', 'goliath'],
    prerequisite: 'armory',
    model: 'upgrade_vehicle_weapon.glb',
  },
  vehicle_weapons_2: {
    id: 'vehicle_weapons_2',
    name: '载具武器 II',
    nameEn: 'Vehicle Weapons 2',
    race: RACE.TERRAN,
    upgradeType: 'weapon',
    cost: { minerals: 150, gas: 150 },
    researchTime: 190,
    level: 2,
    effect: { damageBonus: 4 },
    affects: ['vulture', 'siege_tank', 'goliath'],
    prerequisite: 'armory',
    requires: ['vehicle_weapons_1'],
    model: 'upgrade_vehicle_weapon.glb',
  },
  vehicle_weapons_3: {
    id: 'vehicle_weapons_3',
    name: '载具武器 III',
    nameEn: 'Vehicle Weapons 3',
    race: RACE.TERRAN,
    upgradeType: 'weapon',
    cost: { minerals: 200, gas: 200 },
    researchTime: 220,
    level: 3,
    effect: { damageBonus: 6 },
    affects: ['vulture', 'siege_tank', 'goliath'],
    prerequisite: 'armory',
    requires: ['vehicle_weapons_2'],
    model: 'upgrade_vehicle_weapon.glb',
  },

  // ═══════════════════════════════════════════
  // 载具护甲升级 (Armory)
  // ═══════════════════════════════════════════
  vehicle_plating_1: {
    id: 'vehicle_plating_1',
    name: '载具护甲 I',
    nameEn: 'Vehicle Plating 1',
    race: RACE.TERRAN,
    upgradeType: 'armor',
    cost: { minerals: 100, gas: 100 },
    researchTime: 160,
    level: 1,
    effect: { armorBonus: 1 },
    affects: ['vulture', 'siege_tank', 'goliath'],
    prerequisite: 'armory',
    model: 'upgrade_vehicle_plating.glb',
  },
  vehicle_plating_2: {
    id: 'vehicle_plating_2',
    name: '载具护甲 II',
    nameEn: 'Vehicle Plating 2',
    race: RACE.TERRAN,
    upgradeType: 'armor',
    cost: { minerals: 150, gas: 150 },
    researchTime: 190,
    level: 2,
    effect: { armorBonus: 2 },
    affects: ['vulture', 'siege_tank', 'goliath'],
    prerequisite: 'armory',
    requires: ['vehicle_plating_1'],
    model: 'upgrade_vehicle_plating.glb',
  },
  vehicle_plating_3: {
    id: 'vehicle_plating_3',
    name: '载具护甲 III',
    nameEn: 'Vehicle Plating 3',
    race: RACE.TERRAN,
    upgradeType: 'armor',
    cost: { minerals: 200, gas: 200 },
    researchTime: 220,
    level: 3,
    effect: { armorBonus: 3 },
    affects: ['vulture', 'siege_tank', 'goliath'],
    prerequisite: 'armory',
    requires: ['vehicle_plating_2'],
    model: 'upgrade_vehicle_plating.glb',
  },

  // ═══════════════════════════════════════════
  // 舰船武器升级 (Armory)
  // ═══════════════════════════════════════════
  ship_weapons_1: {
    id: 'ship_weapons_1',
    name: '舰船武器 I',
    nameEn: 'Ship Weapons 1',
    race: RACE.TERRAN,
    upgradeType: 'weapon',
    cost: { minerals: 100, gas: 100 },
    researchTime: 160,
    level: 1,
    effect: { damageBonus: 2 },
    affects: ['wraith', 'valkyrie', 'battlecruiser', 'science_vessel'],
    prerequisite: 'armory',
    requiresStarport: true,
    model: 'upgrade_ship_weapon.glb',
  },
  ship_weapons_2: {
    id: 'ship_weapons_2',
    name: '舰船武器 II',
    nameEn: 'Ship Weapons 2',
    race: RACE.TERRAN,
    upgradeType: 'weapon',
    cost: { minerals: 150, gas: 150 },
    researchTime: 190,
    level: 2,
    effect: { damageBonus: 4 },
    affects: ['wraith', 'valkyrie', 'battlecruiser'],
    prerequisite: 'armory',
    requires: ['ship_weapons_1'],
    model: 'upgrade_ship_weapon.glb',
  },
  ship_weapons_3: {
    id: 'ship_weapons_3',
    name: '舰船武器 III',
    nameEn: 'Ship Weapons 3',
    race: RACE.TERRAN,
    upgradeType: 'weapon',
    cost: { minerals: 200, gas: 200 },
    researchTime: 220,
    level: 3,
    effect: { damageBonus: 6 },
    affects: ['wraith', 'valkyrie', 'battlecruiser'],
    prerequisite: 'armory',
    requires: ['ship_weapons_2'],
    model: 'upgrade_ship_weapon.glb',
  },

  // ═══════════════════════════════════════════
  // 舰船护甲升级 (Armory)
  // ═══════════════════════════════════════════
  ship_plating_1: {
    id: 'ship_plating_1',
    name: '舰船护甲 I',
    nameEn: 'Ship Plating 1',
    race: RACE.TERRAN,
    upgradeType: 'armor',
    cost: { minerals: 100, gas: 100 },
    researchTime: 160,
    level: 1,
    effect: { armorBonus: 1 },
    affects: ['wraith', 'valkyrie', 'battlecruiser', 'science_vessel'],
    prerequisite: 'armory',
    model: 'upgrade_ship_plating.glb',
  },
  ship_plating_2: {
    id: 'ship_plating_2',
    name: '舰船护甲 II',
    nameEn: 'Ship Plating 2',
    race: RACE.TERRAN,
    upgradeType: 'armor',
    cost: { minerals: 150, gas: 150 },
    researchTime: 190,
    level: 2,
    effect: { armorBonus: 2 },
    affects: ['wraith', 'valkyrie', 'battlecruiser', 'science_vessel'],
    prerequisite: 'armory',
    requires: ['ship_plating_1'],
    model: 'upgrade_ship_plating.glb',
  },
  ship_plating_3: {
    id: 'ship_plating_3',
    name: '舰船护甲 III',
    nameEn: 'Ship Plating 3',
    race: RACE.TERRAN,
    upgradeType: 'armor',
    cost: { minerals: 200, gas: 200 },
    researchTime: 220,
    level: 3,
    effect: { armorBonus: 3 },
    affects: ['wraith', 'valkyrie', 'battlecruiser', 'science_vessel'],
    prerequisite: 'armory',
    requires: ['ship_plating_2'],
    model: 'upgrade_ship_plating.glb',
  },

  // ═══════════════════════════════════════════
  // 单位能力科技 (Academy / Factory / Starport)
  // ═══════════════════════════════════════════
  stimpack: {
    id: 'stimpack',
    name: '兴奋剂',
    nameEn: 'Stim Pack',
    race: RACE.TERRAN,
    upgradeType: 'ability',
    cost: { minerals: 100, gas: 100 },
    researchTime: 120,
    effect: {
      ability: 'stimpack',
      description: '消耗10HP，攻击速度+23%，移动速度+23%，持续16秒',
    },
    affects: ['marine', 'firebat'],
    prerequisite: 'academy',
    model: 'upgrade_stimpack.glb',
  },

  lock_on: {
    id: 'lock_on',
    name: '锁定',
    nameEn: 'Lockdown',
    race: RACE.TERRAN,
    upgradeType: 'ability',
    cost: { minerals: 100, gas: 100 },
    researchTime: 120,
    effect: {
      ability: 'lockdown',
      description: '锁定敌方机械单位10秒（消耗100能量）',
    },
    affects: ['ghost'],
    prerequisite: 'academy',
    model: 'upgrade_lockdown.glb',
  },

  ocular_implants: {
    id: 'ocular_implants',
    name: '光学植入体',
    nameEn: 'Ocular Implants',
    race: RACE.TERRAN,
    upgradeType: 'ability',
    cost: { minerals: 100, gas: 100 },
    researchTime: 120,
    effect: {
      sightBonus: 4,  // 视野+4
    },
    affects: ['ghost'],
    prerequisite: 'academy',
    model: 'upgrade_ocular_implants.glb',
  },

  moebius_reactor: {
    id: 'moebius_reactor',
    name: '莫比乌斯反应堆',
    nameEn: 'Moebius Reactor',
    race: RACE.TERRAN,
    upgradeType: 'ability',
    cost: { minerals: 100, gas: 100 },
    researchTime: 120,
    effect: {
      energyBonus: 50,  // 最大能量+50
    },
    affects: ['ghost'],
    prerequisite: 'academy',
    model: 'upgrade_moebius_reactor.glb',
  },

  siege_tech: {
    id: 'siege_tech',
    name: '攻城科技',
    nameEn: 'Siege Tech',
    race: RACE.TERRAN,
    upgradeType: 'ability',
    cost: { minerals: 150, gas: 150 },
    researchTime: 120,
    effect: {
      ability: 'siege_mode',
      description: '解锁攻城模式（不可移动，射程12，伤害70，大范围溅射）',
    },
    affects: ['siege_tank'],
    prerequisite: 'machine_shop',
    model: 'upgrade_siege_tech.glb',
  },

  spider_mines: {
    id: 'spider_mines',
    name: '蜘蛛雷',
    nameEn: 'Spider Mines',
    race: RACE.TERRAN,
    upgradeType: 'ability',
    cost: { minerals: 100, gas: 100 },
    researchTime: 120,
    effect: {
      ability: 'spider_mines',
      description: '可放置蜘蛛雷（125伤害，最大3颗）',
    },
    affects: ['vulture'],
    prerequisite: 'machine_shop',
    model: 'upgrade_spider_mines.glb',
  },

  vulture_speed: {
    id: 'vulture_speed',
    name: '秃鹫速度',
    nameEn: 'Ion Thrusters',
    race: RACE.TERRAN,
    upgradeType: 'ability',
    cost: { minerals: 100, gas: 100 },
    researchTime: 120,
    effect: {
      speedBonus: 1.0,  // 速度+1.0
    },
    affects: ['vulture'],
    prerequisite: 'machine_shop',
    model: 'upgrade_vulture_speed.glb',
  },

  cloaking_field: {
    id: 'cloaking_field',
    name: '隐形力场',
    nameEn: 'Cloaking Field',
    race: RACE.TERRAN,
    upgradeType: 'ability',
    cost: { minerals: 100, gas: 100 },
    researchTime: 150,
    effect: {
      ability: 'cloaking',
      description: '解锁隐形能力（持续消耗能量）',
    },
    affects: ['wraith'],
    prerequisite: 'control_tower',
    model: 'upgrade_cloaking_field.glb',
  },

  defensive_matrix: {
    id: 'defensive_matrix',
    name: '防御矩阵',
    nameEn: 'Defensive Matrix',
    race: RACE.TERRAN,
    upgradeType: 'ability',
    cost: { minerals: 100, gas: 100 },
    researchTime: 100,
    effect: {
      ability: 'defensive_matrix',
      description: '为友方单位添加650HP防护罩（消耗100能量）',
    },
    affects: ['science_vessel'],
    prerequisite: 'science_facility',
    model: 'upgrade_defensive_matrix.glb',
  },

  irradiate: {
    id: 'irradiate',
    name: '辐射',
    nameEn: 'Irradiate',
    race: RACE.TERRAN,
    upgradeType: 'ability',
    cost: { minerals: 100, gas: 100 },
    researchTime: 100,
    effect: {
      ability: 'irradiate',
      description: '对目标及周围生物单位每秒25伤害，持续20秒（消耗75能量）',
    },
    affects: ['science_vessel'],
    prerequisite: 'science_facility',
    model: 'upgrade_irradiate.glb',
  },

  emp_shockwave: {
    id: 'emp_shockwave',
    name: 'EMP冲击波',
    nameEn: 'EMP Shockwave',
    race: RACE.TERRAN,
    upgradeType: 'ability',
    cost: { minerals: 100, gas: 100 },
    researchTime: 100,
    effect: {
      ability: 'emp_shockwave',
      description: '消除范围内所有护盾并耗尽能量（射程8，消耗150能量）',
    },
    affects: ['science_vessel'],
    prerequisite: 'science_facility',
    model: 'upgrade_emp_shockwave.glb',
  },

  yamato_gun: {
    id: 'yamato_gun',
    name: '大和炮',
    nameEn: 'Yamato Gun',
    race: RACE.TERRAN,
    upgradeType: 'ability',
    cost: { minerals: 100, gas: 100 },
    researchTime: 120,
    effect: {
      ability: 'yamato_gun',
      description: '对单体造成260点伤害（射程10，消耗200能量）',
    },
    affects: ['battlecruiser'],
    prerequisite: 'physics_lab',
    model: 'upgrade_yamato_gun.glb',
  },

  // ── SCV修理速度/效率升级 ──
  scv_repair_rate: {
    id: 'scv_repair_rate',
    name: 'SCV修理效率',
    nameEn: 'SCV Repair Rate',
    race: RACE.TERRAN,
    upgradeType: 'special',
    cost: { minerals: 100, gas: 100 },
    researchTime: 100,
    effect: {
      repairSpeedBonus: 0.5,  // 修理速度+50%
    },
    affects: ['scv'],
    prerequisite: 'engineering_bay',
    model: 'upgrade_repair.glb',
  },
};

// ── 按类型导出 ──
export const TERRAN_WEAPON_UPGRADES = Object.values(TERRAN_TECH).filter(t => t.upgradeType === 'weapon');
export const TERRAN_ARMOR_UPGRADES = Object.values(TERRAN_TECH).filter(t => t.upgradeType === 'armor');
export const TERRAN_ABILITY_UPGRADES = Object.values(TERRAN_TECH).filter(t => t.upgradeType === 'ability');
export const TERRAN_TECH_ARRAY = Object.values(TERRAN_TECH);

export default TERRAN_TECH;
