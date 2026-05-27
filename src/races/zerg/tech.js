// ═══════════════════════════════════════════
// StarCraft Web - 虫族 (Zerg) 科技树定义
// 包含所有升级、变异解锁
// ═══════════════════════════════════════════

import { RACE } from '../../shared/Constants.js';

export const ZERG_TECH = {
  // ═══════════════════════════════════════════
  // 近战武器升级 (Evolution Chamber)
  // ═══════════════════════════════════════════
  melee_attacks_1: {
    id: 'melee_attacks_1',
    name: '近战攻击 I',
    nameEn: 'Melee Attacks 1',
    race: RACE.ZERG,
    upgradeType: 'weapon',
    cost: { minerals: 100, gas: 100 },
    researchTime: 160,
    level: 1,
    effect: { damageBonus: 1 },
    affects: ['zergling', 'ultralisk', 'defiler'],
    prerequisite: 'evolution_chamber',
  },
  melee_attacks_2: {
    id: 'melee_attacks_2',
    name: '近战攻击 II',
    nameEn: 'Melee Attacks 2',
    race: RACE.ZERG,
    upgradeType: 'weapon',
    cost: { minerals: 150, gas: 150 },
    researchTime: 190,
    level: 2,
    effect: { damageBonus: 2 },
    affects: ['zergling', 'ultralisk'],
    prerequisite: 'evolution_chamber',
    requires: ['melee_attacks_1'],
  },
  melee_attacks_3: {
    id: 'melee_attacks_3',
    name: '近战攻击 III',
    nameEn: 'Melee Attacks 3',
    race: RACE.ZERG,
    upgradeType: 'weapon',
    cost: { minerals: 200, gas: 200 },
    researchTime: 220,
    level: 3,
    effect: { damageBonus: 3 },
    affects: ['zergling', 'ultralisk'],
    prerequisite: 'evolution_chamber',
    requires: ['melee_attacks_2'],
  },

  // ═══════════════════════════════════════════
  // 远程武器升级 (Evolution Chamber)
  // ═══════════════════════════════════════════
  missile_attacks_1: {
    id: 'missile_attacks_1',
    name: '远程攻击 I',
    nameEn: 'Missile Attacks 1',
    race: RACE.ZERG,
    upgradeType: 'weapon',
    cost: { minerals: 100, gas: 100 },
    researchTime: 160,
    level: 1,
    effect: { damageBonus: 1 },
    affects: ['hydralisk', 'lurker'],
    prerequisite: 'evolution_chamber',
  },
  missile_attacks_2: {
    id: 'missile_attacks_2',
    name: '远程攻击 II',
    nameEn: 'Missile Attacks 2',
    race: RACE.ZERG,
    upgradeType: 'weapon',
    cost: { minerals: 150, gas: 150 },
    researchTime: 190,
    level: 2,
    effect: { damageBonus: 2 },
    affects: ['hydralisk', 'lurker'],
    prerequisite: 'evolution_chamber',
    requires: ['missile_attacks_1'],
  },
  missile_attacks_3: {
    id: 'missile_attacks_3',
    name: '远程攻击 III',
    nameEn: 'Missile Attacks 3',
    race: RACE.ZERG,
    upgradeType: 'weapon',
    cost: { minerals: 200, gas: 200 },
    researchTime: 220,
    level: 3,
    effect: { damageBonus: 3 },
    affects: ['hydralisk', 'lurker'],
    prerequisite: 'evolution_chamber',
    requires: ['missile_attacks_2'],
  },

  // ═══════════════════════════════════════════
  // 甲壳升级 (Evolution Chamber)
  // ═══════════════════════════════════════════
  carapace_1: {
    id: 'carapace_1',
    name: '甲壳 I',
    nameEn: 'Carapace 1',
    race: RACE.ZERG,
    upgradeType: 'armor',
    cost: { minerals: 100, gas: 100 },
    researchTime: 160,
    level: 1,
    effect: { armorBonus: 1 },
    affects: ['zergling', 'hydralisk', 'lurker', 'ultralisk', 'defiler', 'queen', 'drone'],
    prerequisite: 'evolution_chamber',
  },
  carapace_2: {
    id: 'carapace_2',
    name: '甲壳 II',
    nameEn: 'Carapace 2',
    race: RACE.ZERG,
    upgradeType: 'armor',
    cost: { minerals: 150, gas: 150 },
    researchTime: 190,
    level: 2,
    effect: { armorBonus: 2 },
    affects: ['zergling', 'hydralisk', 'lurker', 'ultralisk', 'defiler', 'queen', 'drone'],
    prerequisite: 'evolution_chamber',
    requires: ['carapace_1'],
  },
  carapace_3: {
    id: 'carapace_3',
    name: '甲壳 III',
    nameEn: 'Carapace 3',
    race: RACE.ZERG,
    upgradeType: 'armor',
    cost: { minerals: 200, gas: 200 },
    researchTime: 220,
    level: 3,
    effect: { armorBonus: 3 },
    affects: ['zergling', 'hydralisk', 'lurker', 'ultralisk', 'defiler', 'queen', 'drone'],
    prerequisite: 'evolution_chamber',
    requires: ['carapace_2'],
  },

  // ═══════════════════════════════════════════
  // 飞行武器升级 (Spire)
  // ═══════════════════════════════════════════
  flyer_attacks_1: {
    id: 'flyer_attacks_1',
    name: '飞行攻击 I',
    nameEn: 'Flyer Attacks 1',
    race: RACE.ZERG,
    upgradeType: 'weapon',
    cost: { minerals: 100, gas: 100 },
    researchTime: 160,
    level: 1,
    effect: { damageBonus: 1 },
    affects: ['mutalisk', 'guardian', 'devourer'],
    prerequisite: 'spire',
  },
  flyer_attacks_2: {
    id: 'flyer_attacks_2',
    name: '飞行攻击 II',
    nameEn: 'Flyer Attacks 2',
    race: RACE.ZERG,
    upgradeType: 'weapon',
    cost: { minerals: 150, gas: 150 },
    researchTime: 190,
    level: 2,
    effect: { damageBonus: 2 },
    affects: ['mutalisk', 'guardian', 'devourer'],
    prerequisite: 'spire',
    requires: ['flyer_attacks_1'],
  },
  flyer_attacks_3: {
    id: 'flyer_attacks_3',
    name: '飞行攻击 III',
    nameEn: 'Flyer Attacks 3',
    race: RACE.ZERG,
    upgradeType: 'weapon',
    cost: { minerals: 200, gas: 200 },
    researchTime: 220,
    level: 3,
    effect: { damageBonus: 3 },
    affects: ['mutalisk', 'guardian', 'devourer'],
    prerequisite: 'spire',
    requires: ['flyer_attacks_2'],
  },

  // ═══════════════════════════════════════════
  // 飞行甲壳升级 (Spire)
  // ═══════════════════════════════════════════
  flyer_carapace_1: {
    id: 'flyer_carapace_1',
    name: '飞行甲壳 I',
    nameEn: 'Flyer Carapace 1',
    race: RACE.ZERG,
    upgradeType: 'armor',
    cost: { minerals: 100, gas: 100 },
    researchTime: 160,
    level: 1,
    effect: { armorBonus: 1 },
    affects: ['mutalisk', 'guardian', 'devourer', 'overlord'],
    prerequisite: 'spire',
  },
  flyer_carapace_2: {
    id: 'flyer_carapace_2',
    name: '飞行甲壳 II',
    nameEn: 'Flyer Carapace 2',
    race: RACE.ZERG,
    upgradeType: 'armor',
    cost: { minerals: 150, gas: 150 },
    researchTime: 190,
    level: 2,
    effect: { armorBonus: 2 },
    affects: ['mutalisk', 'guardian', 'devourer', 'overlord'],
    prerequisite: 'spire',
    requires: ['flyer_carapace_1'],
  },
  flyer_carapace_3: {
    id: 'flyer_carapace_3',
    name: '飞行甲壳 III',
    nameEn: 'Flyer Carapace 3',
    race: RACE.ZERG,
    upgradeType: 'armor',
    cost: { minerals: 200, gas: 200 },
    researchTime: 220,
    level: 3,
    effect: { armorBonus: 3 },
    affects: ['mutalisk', 'guardian', 'devourer', 'overlord'],
    prerequisite: 'spire',
    requires: ['flyer_carapace_2'],
  },

  // ═══════════════════════════════════════════
  // 单位能力科技
  // ═══════════════════════════════════════════
  metabolic_boost: {
    id: 'metabolic_boost',
    name: '代谢爆发',
    nameEn: 'Metabolic Boost',
    race: RACE.ZERG,
    upgradeType: 'ability',
    cost: { minerals: 100, gas: 100 },
    researchTime: 100,
    effect: {
      speedBonus: 1.13,  // 速度从5.49提升到6.62
    },
    affects: ['zergling'],
    prerequisite: 'spawning_pool',
  },

  adrenal_glands: {
    id: 'adrenal_glands',
    name: '肾上腺素',
    nameEn: 'Adrenal Glands',
    race: RACE.ZERG,
    upgradeType: 'ability',
    cost: { minerals: 200, gas: 200 },
    researchTime: 150,
    effect: {
      attackSpeedBonus: 0.33,  // 攻击速度+33%
    },
    affects: ['zergling'],
    prerequisite: 'spawning_pool',
    requiresHive: true,      // 需要Hive
  },

  muscular_augments: {
    id: 'muscular_augments',
    name: '肌肉增强',
    nameEn: 'Muscular Augments',
    race: RACE.ZERG,
    upgradeType: 'ability',
    cost: { minerals: 150, gas: 150 },
    researchTime: 120,
    effect: {
      speedBonus: 0.68,  // 速度从2.13提升到2.81
    },
    affects: ['hydralisk'],
    prerequisite: 'hydralisk_den',
  },

  grooved_spines: {
    id: 'grooved_spines',
    name: '沟槽脊刺',
    nameEn: 'Grooved Spines',
    race: RACE.ZERG,
    upgradeType: 'ability',
    cost: { minerals: 150, gas: 150 },
    researchTime: 120,
    effect: {
      rangeBonus: 1,  // 射程从4提升到5
    },
    affects: ['hydralisk'],
    prerequisite: 'hydralisk_den',
  },

  lurker_aspect: {
    id: 'lurker_aspect',
    name: '潜伏者突变',
    nameEn: 'Lurker Aspect',
    race: RACE.ZERG,
    upgradeType: 'ability',
    cost: { minerals: 150, gas: 150 },
    researchTime: 120,
    effect: {
      ability: 'morph_lurker',
      description: '刺蛇可变异为潜伏者（需Lair）',
    },
    affects: ['hydralisk'],
    prerequisite: 'hydralisk_den',
    requiresLair: true,
  },

  pneumatized_carapace: {
    id: 'pneumatized_carapace',
    name: '气化甲壳',
    nameEn: 'Pneumatized Carapace',
    race: RACE.ZERG,
    upgradeType: 'ability',
    cost: { minerals: 150, gas: 150 },
    researchTime: 120,
    effect: {
      speedBonus: 0.51,  // 速度从0.82提升到1.33
      sightBonus: 3,
    },
    affects: ['overlord'],
    prerequisite: 'hatchery',
  },

  ventral_sacs: {
    id: 'ventral_sacs',
    name: '腹囊',
    nameEn: 'Ventral Sacs',
    race: RACE.ZERG,
    upgradeType: 'ability',
    cost: { minerals: 200, gas: 200 },
    researchTime: 120,
    effect: {
      ability: 'overlord_transport',
      description: '领主可装载4个地面单位并空投',
    },
    affects: ['overlord'],
    prerequisite: 'hatchery',
    requiresLair: true,
  },

  antennae: {
    id: 'antennae',
    name: '触角',
    nameEn: 'Antennae',
    race: RACE.ZERG,
    upgradeType: 'ability',
    cost: { minerals: 100, gas: 100 },
    researchTime: 120,
    effect: {
      sightBonus: 4,  // 视野从11提升到15
    },
    affects: ['overlord'],
    prerequisite: 'lair',
  },

  anabolic_synthesis: {
    id: 'anabolic_synthesis',
    name: '新陈代谢',
    nameEn: 'Anabolic Synthesis',
    race: RACE.ZERG,
    upgradeType: 'ability',
    cost: { minerals: 200, gas: 200 },
    researchTime: 150,
    effect: {
      speedBonus: 0.53,  // 速度从2.13提升到2.66
    },
    affects: ['ultralisk'],
    prerequisite: 'ultralisk_cavern',
  },

  chitinous_plating: {
    id: 'chitinous_plating',
    name: '角质甲壳',
    nameEn: 'Chitinous Plating',
    race: RACE.ZERG,
    upgradeType: 'ability',
    cost: { minerals: 200, gas: 200 },
    researchTime: 150,
    effect: {
      armorBonus: 2,  // 额外+2护甲
    },
    affects: ['ultralisk'],
    prerequisite: 'ultralisk_cavern',
  },

  consume: {
    id: 'consume',
    name: '吞噬',
    nameEn: 'Consume',
    race: RACE.ZERG,
    upgradeType: 'ability',
    cost: { minerals: 100, gas: 100 },
    researchTime: 80,
    effect: {
      ability: 'consume',
      description: '吞噬一个友方生物单位恢复50能量',
    },
    affects: ['defiler'],
    prerequisite: 'defiler_mound',
  },

  ensnare: {
    id: 'ensnare',
    name: '诱捕',
    nameEn: 'Ensnare',
    race: RACE.ZERG,
    upgradeType: 'ability',
    cost: { minerals: 100, gas: 100 },
    researchTime: 100,
    effect: {
      ability: 'ensnare',
      description: '使范围内敌方单位移动速度和攻击速度降低50%',
    },
    affects: ['queen'],
    prerequisite: 'queens_nest',
  },

  spawn_broodling: {
    id: 'spawn_broodling',
    name: '孵化虫群',
    nameEn: 'Spawn Broodling',
    race: RACE.ZERG,
    upgradeType: 'ability',
    cost: { minerals: 100, gas: 100 },
    researchTime: 100,
    effect: {
      ability: 'spawn_broodling',
      description: '消灭一个敌方地面生物单位并产生2只跳虫',
    },
    affects: ['queen'],
    prerequisite: 'queens_nest',
  },

  dark_swarm: {
    id: 'dark_swarm',
    name: '暗雾',
    nameEn: 'Dark Swarm',
    race: RACE.ZERG,
    upgradeType: 'ability',
    cost: { minerals: 100, gas: 100 },
    researchTime: 80,
    effect: {
      ability: 'dark_swarm',
      description: '区域内友方地面单位免疫远程伤害',
    },
    affects: ['defiler'],
    prerequisite: 'defiler_mound',
  },

  plague: {
    id: 'plague',
    name: '瘟疫',
    nameEn: 'Plague',
    race: RACE.ZERG,
    upgradeType: 'ability',
    cost: { minerals: 100, gas: 100 },
    researchTime: 80,
    effect: {
      ability: 'plague',
      description: '对范围内敌方单位每秒造成逐渐衰减的伤害（上限293）',
    },
    affects: ['defiler'],
    prerequisite: 'defiler_mound',
  },
};

// ── 按类型导出 ──
export const ZERG_WEAPON_UPGRADES = Object.values(ZERG_TECH).filter(t => t.upgradeType === 'weapon');
export const ZERG_ARMOR_UPGRADES = Object.values(ZERG_TECH).filter(t => t.upgradeType === 'armor');
export const ZERG_ABILITY_UPGRADES = Object.values(ZERG_TECH).filter(t => t.upgradeType === 'ability');
export const ZERG_TECH_ARRAY = Object.values(ZERG_TECH);

export default ZERG_TECH;
