// ═══════════════════════════════════════════
// StarCraft Web - 神族 (Protoss) 科技树定义
// 包含所有升级、能力解锁
// ═══════════════════════════════════════════

import { RACE } from '../../shared/Constants.js';

export const PROTOSS_TECH = {
  // ═══════════════════════════════════════════
  // 地面武器升级 (Forge)
  // ═══════════════════════════════════════════
  ground_weapons_1: {
    id: 'ground_weapons_1',
    name: '地面武器 I',
    nameEn: 'Ground Weapons 1',
    race: RACE.PROTOSS,
    upgradeType: 'weapon',
    cost: { minerals: 100, gas: 100 },
    researchTime: 160,
    level: 1,
    effect: { damageBonus: 1 },
    affects: ['zealot', 'dragoon', 'archon'],
    prerequisite: 'forge',
  },
  ground_weapons_2: {
    id: 'ground_weapons_2',
    name: '地面武器 II',
    nameEn: 'Ground Weapons 2',
    race: RACE.PROTOSS,
    upgradeType: 'weapon',
    cost: { minerals: 150, gas: 150 },
    researchTime: 190,
    level: 2,
    effect: { damageBonus: 2 },
    affects: ['zealot', 'dragoon', 'archon'],
    prerequisite: 'forge',
    requires: ['ground_weapons_1'],
  },
  ground_weapons_3: {
    id: 'ground_weapons_3',
    name: '地面武器 III',
    nameEn: 'Ground Weapons 3',
    race: RACE.PROTOSS,
    upgradeType: 'weapon',
    cost: { minerals: 200, gas: 200 },
    researchTime: 220,
    level: 3,
    effect: { damageBonus: 3 },
    affects: ['zealot', 'dragoon', 'archon'],
    prerequisite: 'forge',
    requires: ['ground_weapons_2'],
  },

  // ═══════════════════════════════════════════
  // 地面护甲升级 (Forge)
  // ═══════════════════════════════════════════
  ground_armor_1: {
    id: 'ground_armor_1',
    name: '地面护甲 I',
    nameEn: 'Ground Armor 1',
    race: RACE.PROTOSS,
    upgradeType: 'armor',
    cost: { minerals: 100, gas: 100 },
    researchTime: 160,
    level: 1,
    effect: { armorBonus: 1 },
    affects: ['zealot', 'dragoon', 'reaver', 'archon'],
    prerequisite: 'forge',
  },
  ground_armor_2: {
    id: 'ground_armor_2',
    name: '地面护甲 II',
    nameEn: 'Ground Armor 2',
    race: RACE.PROTOSS,
    upgradeType: 'armor',
    cost: { minerals: 150, gas: 150 },
    researchTime: 190,
    level: 2,
    effect: { armorBonus: 2 },
    affects: ['zealot', 'dragoon', 'reaver', 'archon'],
    prerequisite: 'forge',
    requires: ['ground_armor_1'],
  },
  ground_armor_3: {
    id: 'ground_armor_3',
    name: '地面护甲 III',
    nameEn: 'Ground Armor 3',
    race: RACE.PROTOSS,
    upgradeType: 'armor',
    cost: { minerals: 200, gas: 200 },
    researchTime: 220,
    level: 3,
    effect: { armorBonus: 3 },
    affects: ['zealot', 'dragoon', 'reaver', 'archon'],
    prerequisite: 'forge',
    requires: ['ground_armor_2'],
  },

  // ═══════════════════════════════════════════
  // 护盾升级 (Forge) - 全种族有效
  // ═══════════════════════════════════════════
  shields_1: {
    id: 'shields_1',
    name: '护盾 I',
    nameEn: 'Shields 1',
    race: RACE.PROTOSS,
    upgradeType: 'armor',
    cost: { minerals: 100, gas: 100 },
    researchTime: 160,
    level: 1,
    effect: { shieldBonus: 1 },
    affects: ['all_protoss'],   // 所有神族单位
    prerequisite: 'forge',
  },
  shields_2: {
    id: 'shields_2',
    name: '护盾 II',
    nameEn: 'Shields 2',
    race: RACE.PROTOSS,
    upgradeType: 'armor',
    cost: { minerals: 150, gas: 150 },
    researchTime: 190,
    level: 2,
    effect: { shieldBonus: 2 },
    affects: ['all_protoss'],
    prerequisite: 'forge',
    requires: ['shields_1'],
  },
  shields_3: {
    id: 'shields_3',
    name: '护盾 III',
    nameEn: 'Shields 3',
    race: RACE.PROTOSS,
    upgradeType: 'armor',
    cost: { minerals: 200, gas: 200 },
    researchTime: 220,
    level: 3,
    effect: { shieldBonus: 3 },
    affects: ['all_protoss'],
    prerequisite: 'forge',
    requires: ['shields_2'],
  },

  // ═══════════════════════════════════════════
  // 空军武器升级 (Cybernetics Core)
  // ═══════════════════════════════════════════
  air_weapons_1: {
    id: 'air_weapons_1',
    name: '空军武器 I',
    nameEn: 'Air Weapons 1',
    race: RACE.PROTOSS,
    upgradeType: 'weapon',
    cost: { minerals: 100, gas: 100 },
    researchTime: 160,
    level: 1,
    effect: { damageBonus: 1 },
    affects: ['corsair', 'scout', 'carrier', 'arbiter', 'interceptor'],
    prerequisite: 'cybernetics_core',
  },
  air_weapons_2: {
    id: 'air_weapons_2',
    name: '空军武器 II',
    nameEn: 'Air Weapons 2',
    race: RACE.PROTOSS,
    upgradeType: 'weapon',
    cost: { minerals: 150, gas: 150 },
    researchTime: 190,
    level: 2,
    effect: { damageBonus: 2 },
    affects: ['corsair', 'scout', 'carrier', 'arbiter', 'interceptor'],
    prerequisite: 'cybernetics_core',
    requires: ['air_weapons_1'],
  },
  air_weapons_3: {
    id: 'air_weapons_3',
    name: '空军武器 III',
    nameEn: 'Air Weapons 3',
    race: RACE.PROTOSS,
    upgradeType: 'weapon',
    cost: { minerals: 200, gas: 200 },
    researchTime: 220,
    level: 3,
    effect: { damageBonus: 3 },
    affects: ['corsair', 'scout', 'carrier', 'arbiter', 'interceptor'],
    prerequisite: 'cybernetics_core',
    requires: ['air_weapons_2'],
  },

  // ═══════════════════════════════════════════
  // 空军护甲升级 (Cybernetics Core)
  // ═══════════════════════════════════════════
  air_armor_1: {
    id: 'air_armor_1',
    name: '空军护甲 I',
    nameEn: 'Air Armor 1',
    race: RACE.PROTOSS,
    upgradeType: 'armor',
    cost: { minerals: 100, gas: 100 },
    researchTime: 160,
    level: 1,
    effect: { armorBonus: 1 },
    affects: ['corsair', 'scout', 'carrier', 'arbiter'],
    prerequisite: 'cybernetics_core',
  },
  air_armor_2: {
    id: 'air_armor_2',
    name: '空军护甲 II',
    nameEn: 'Air Armor 2',
    race: RACE.PROTOSS,
    upgradeType: 'armor',
    cost: { minerals: 150, gas: 150 },
    researchTime: 190,
    level: 2,
    effect: { armorBonus: 2 },
    affects: ['corsair', 'scout', 'carrier', 'arbiter'],
    prerequisite: 'cybernetics_core',
    requires: ['air_armor_1'],
  },
  air_armor_3: {
    id: 'air_armor_3',
    name: '空军护甲 III',
    nameEn: 'Air Armor 3',
    race: RACE.PROTOSS,
    upgradeType: 'armor',
    cost: { minerals: 200, gas: 200 },
    researchTime: 220,
    level: 3,
    effect: { armorBonus: 3 },
    affects: ['corsair', 'scout', 'carrier', 'arbiter'],
    prerequisite: 'cybernetics_core',
    requires: ['air_armor_2'],
  },

  // ═══════════════════════════════════════════
  // 单位能力科技
  // ═══════════════════════════════════════════
  singularity_charge: {
    id: 'singularity_charge',
    name: '奇异电荷',
    nameEn: 'Singularity Charge',
    race: RACE.PROTOSS,
    upgradeType: 'ability',
    cost: { minerals: 150, gas: 150 },
    researchTime: 120,
    effect: {
      rangeBonus: 1,  // 射程从5提升到6
    },
    affects: ['dragoon'],
    prerequisite: 'cybernetics_core',
  },

  leg_enhancements: {
    id: 'leg_enhancements',
    name: '腿部增强',
    nameEn: 'Leg Enhancements',
    race: RACE.PROTOSS,
    upgradeType: 'ability',
    cost: { minerals: 200, gas: 200 },
    researchTime: 150,
    effect: {
      speedBonus: 0.75,  // 速度从2.25提升到3.00
    },
    affects: ['zealot'],
    prerequisite: 'citadel_of_adun',
  },

  psionic_storm: {
    id: 'psionic_storm',
    name: '灵能风暴',
    nameEn: 'Psionic Storm',
    race: RACE.PROTOSS,
    upgradeType: 'ability',
    cost: { minerals: 200, gas: 200 },
    researchTime: 120,
    effect: {
      ability: 'psionic_storm',
      description: '在区域内每秒造成约112伤害，持续约6秒（消耗75能量）',
    },
    affects: ['high_templar'],
    prerequisite: 'templar_archives',
  },

  hallucination: {
    id: 'hallucination',
    name: '幻象',
    nameEn: 'Hallucination',
    race: RACE.PROTOSS,
    upgradeType: 'ability',
    cost: { minerals: 100, gas: 100 },
    researchTime: 80,
    effect: {
      ability: 'hallucination',
      description: '产生2个幻象，无伤害但可承受伤害和吸引火力（消耗100能量）',
    },
    affects: ['high_templar'],
    prerequisite: 'templar_archives',
  },

  khaydarin_amulet: {
    id: 'khaydarin_amulet',
    name: '凯达林护身符',
    nameEn: 'Khaydarin Amulet',
    race: RACE.PROTOSS,
    upgradeType: 'ability',
    cost: { minerals: 150, gas: 150 },
    researchTime: 100,
    effect: {
      energyBonus: 50,  // 最大能量+50
    },
    affects: ['high_templar'],
    prerequisite: 'templar_archives',
  },

  carrier_capacity: {
    id: 'carrier_capacity',
    name: '航母容量',
    nameEn: 'Carrier Capacity',
    race: RACE.PROTOSS,
    upgradeType: 'ability',
    cost: { minerals: 100, gas: 100 },
    researchTime: 100,
    effect: {
      interceptorCount: 4,  // 拦截机从4增加到8
    },
    affects: ['carrier'],
    prerequisite: 'fleet_beacon',
  },

  argus_jewel: {
    id: 'argus_jewel',
    name: '阿格斯之石',
    nameEn: 'Argus Jewel',
    race: RACE.PROTOSS,
    upgradeType: 'ability',
    cost: { minerals: 100, gas: 100 },
    researchTime: 100,
    effect: {
      energyBonus: 50,  // 最大能量+50
    },
    affects: ['arbiter'],
    prerequisite: 'arbiter_tribunal',
  },

  disruption_web: {
    id: 'disruption_web',
    name: '干扰网',
    nameEn: 'Disruption Web',
    race: RACE.PROTOSS,
    upgradeType: 'ability',
    cost: { minerals: 200, gas: 200 },
    researchTime: 100,
    effect: {
      ability: 'disruption_web',
      description: '在区域内使敌方地面单位无法攻击（消耗125能量）',
    },
    affects: ['corsair'],
    prerequisite: 'fleet_beacon',
  },

  stasis_field: {
    id: 'stasis_field',
    name: '静滞力场',
    nameEn: 'Stasis Field',
    race: RACE.PROTOSS,
    upgradeType: 'ability',
    cost: { minerals: 100, gas: 100 },
    researchTime: 100,
    effect: {
      ability: 'stasis_field',
      description: '冻结范围内所有敌方单位10秒（消耗150能量）',
    },
    affects: ['arbiter'],
    prerequisite: 'arbiter_tribunal',
  },

  recall: {
    id: 'recall',
    name: '召回',
    nameEn: 'Recall',
    race: RACE.PROTOSS,
    upgradeType: 'ability',
    cost: { minerals: 100, gas: 100 },
    researchTime: 100,
    effect: {
      ability: 'recall',
      description: '将远处的友方单位传送到仲裁者位置（消耗150能量）',
    },
    affects: ['arbiter'],
    prerequisite: 'arbiter_tribunal',
  },

  scarab_damage: {
    id: 'scarab_damage',
    name: '圣甲虫伤害',
    nameEn: 'Scarab Damage',
    race: RACE.PROTOSS,
    upgradeType: 'weapon',
    cost: { minerals: 100, gas: 100 },
    researchTime: 100,
    level: 1,
    effect: { damageBonus: 25 },  // 圣甲虫伤害100→125
    affects: ['reaver'],
    prerequisite: 'robotics_support_bay',
  },

  scarab_capacity: {
    id: 'scarab_capacity',
    name: '圣甲虫容量',
    nameEn: 'Scarab Capacity',
    race: RACE.PROTOSS,
    upgradeType: 'ability',
    cost: { minerals: 100, gas: 100 },
    researchTime: 100,
    effect: {
      maxScarabs: 10,  // 最大圣甲虫数5→10
    },
    affects: ['reaver'],
    prerequisite: 'robotics_support_bay',
  },

  gravitic_drive: {
    id: 'gravitic_drive',
    name: '引力驱动',
    nameEn: 'Gravitic Drive',
    race: RACE.PROTOSS,
    upgradeType: 'ability',
    cost: { minerals: 100, gas: 100 },
    researchTime: 100,
    effect: {
      speedBonus: 1.25,  // 速度大幅提升
    },
    affects: ['shuttle'],
    prerequisite: 'robotics_support_bay',
  },

  gravitic_boosters: {
    id: 'gravitic_boosters',
    name: '引力加速器',
    nameEn: 'Gravitic Boosters',
    race: RACE.PROTOSS,
    upgradeType: 'ability',
    cost: { minerals: 100, gas: 100 },
    researchTime: 100,
    effect: {
      speedBonus: 1.0,
      sightBonus: 3,
    },
    affects: ['observer'],
    prerequisite: 'observatory',
  },

  warp_gate: {
    id: 'warp_gate',
    name: '折跃门',
    nameEn: 'Warp Gate',
    race: RACE.PROTOSS,
    upgradeType: 'ability',
    cost: { minerals: 50, gas: 50 },
    researchTime: 60,
    effect: {
      ability: 'warp_gate',
      description: '传送门变形为折跃门，可快速在能量场内传送单位（冷却时间制）',
    },
    affects: ['gateway'],
    prerequisite: 'gateway',
  },
};

// ── 按类型导出 ──
export const PROTOSS_WEAPON_UPGRADES = Object.values(PROTOSS_TECH).filter(t => t.upgradeType === 'weapon');
export const PROTOSS_ARMOR_UPGRADES = Object.values(PROTOSS_TECH).filter(t => t.upgradeType === 'armor');
export const PROTOSS_ABILITY_UPGRADES = Object.values(PROTOSS_TECH).filter(t => t.upgradeType === 'ability');
export const PROTOSS_TECH_ARRAY = Object.values(PROTOSS_TECH);

export default PROTOSS_TECH;
