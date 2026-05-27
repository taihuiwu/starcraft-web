// ═══════════════════════════════════════════
// StarCraft Web - AI建造顺序模板
// 每种族3套预定义建造顺序 + 动态调整
// ═══════════════════════════════════════════

import { RACE } from '../../shared/Constants.js';

// ── 建造动作类型 ──
export const ACTION_TYPE = {
  BUILD_BUILDING: 'build_building',   // 建造建筑
  TRAIN_UNIT: 'train_unit',           // 训练单位
  UPGRADE: 'upgrade',                 // 研发科技
  SCOUT: 'scout',                     // 侦察
  EXPAND: 'expand',                   // 开矿
  ATTACK: 'attack',                   // 发动攻击
  DEFEND: 'defend',                   // 防守
  SET_RALLY: 'set_rally',            // 设置集结点
};

// ── 人族建造顺序 ──
const TERRAN_ORDERS = {
  // 标准生化部队开局
  bio_standard: {
    id: 'terran_bio_standard',
    name: '人族标准生化',
    nameEn: 'Terran Bio Standard',
    difficulty: 'normal',
    description: 'BB→BE→BS→BA→VF→VS 标准生化流',
    steps: [
      { action: ACTION_TYPE.TRAIN_UNIT, unit: 'scv', count: 2, condition: 'always' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'supply_depot', condition: 'minerals >= 100' },
      { action: ACTION_TYPE.TRAIN_UNIT, unit: 'scv', count: 2, condition: 'always' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'barracks', condition: 'minerals >= 150' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'refinery', condition: 'minerals >= 100' },
      { action: ACTION_TYPE.TRAIN_UNIT, unit: 'scv', count: 4, condition: 'always' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'engineering_bay', condition: 'minerals >= 125' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'supply_depot', condition: 'minerals >= 100 && supply_used >= supply_total - 4' },
      { action: ACTION_TYPE.TRAIN_UNIT, unit: 'marine', count: 4, condition: 'always' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'academy', condition: 'minerals >= 150' },
      { action: ACTION_TYPE.TRAIN_UNIT, unit: 'marine', count: 4, condition: 'always' },
      { action: ACTION_TYPE.UPGRADE, tech: 'stimpack', condition: 'academy_done && minerals >= 100 && gas >= 100' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'supply_depot', condition: 'minerals >= 100 && supply_used >= supply_total - 4' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'factory', condition: 'minerals >= 200 && gas >= 100' },
      { action: ACTION_TYPE.TRAIN_UNIT, unit: 'marine', count: 6, condition: 'always' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'supply_depot', condition: 'minerals >= 100' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'barracks', condition: 'minerals >= 150' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'starport', condition: 'minerals >= 150 && gas >= 100' },
      { action: ACTION_TYPE.UPGRADE, tech: 'infantry_weapons_1', condition: 'engineering_bay_done && minerals >= 100 && gas >= 100' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'science_facility', condition: 'minerals >= 100 && gas >= 150' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'armory', condition: 'minerals >= 100 && gas >= 100' },
      { action: ACTION_TYPE.EXPAND, condition: 'minerals >= 400 && workers >= 18' },
      { action: ACTION_TYPE.ATTACK, unitCount: 20, condition: 'army_count >= 20 && stimpack_done' },
    ],
  },

  // 机械化开局
  mech_standard: {
    id: 'terran_mech_standard',
    name: '人族机械化',
    nameEn: 'Terran Mech Standard',
    difficulty: 'normal',
    description: '快速出重工厂+坦克机械化流',
    steps: [
      { action: ACTION_TYPE.TRAIN_UNIT, unit: 'scv', count: 2, condition: 'always' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'supply_depot', condition: 'minerals >= 100' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'barracks', condition: 'minerals >= 150' },
      { action: ACTION_TYPE.TRAIN_UNIT, unit: 'scv', count: 3, condition: 'always' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'refinery', condition: 'minerals >= 100' },
      { action: ACTION_TYPE.TRAIN_UNIT, unit: 'scv', count: 3, condition: 'always' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'factory', condition: 'minerals >= 200 && gas >= 100' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'supply_depot', condition: 'minerals >= 100' },
      { action: ACTION_TYPE.TRAIN_UNIT, unit: 'marine', count: 2, condition: 'always' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'factory', condition: 'minerals >= 200 && gas >= 100' },
      { action: ACTION_TYPE.UPGRADE, tech: 'siege_tech', condition: 'factory_done && minerals >= 150 && gas >= 150' },
      { action: ACTION_TYPE.TRAIN_UNIT, unit: 'siege_tank', count: 2, condition: 'factory_done' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'supply_depot', condition: 'minerals >= 100' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'armory', condition: 'minerals >= 100 && gas >= 100' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'factory', condition: 'minerals >= 200 && gas >= 100' },
      { action: ACTION_TYPE.TRAIN_UNIT, unit: 'goliath', count: 3, condition: 'armory_done' },
      { action: ACTION_TYPE.UPGRADE, tech: 'vehicle_weapons_1', condition: 'armory_done && minerals >= 100 && gas >= 100' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'supply_depot', condition: 'minerals >= 100' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'starport', condition: 'minerals >= 150 && gas >= 100' },
      { action: ACTION_TYPE.EXPAND, condition: 'minerals >= 400 && workers >= 20' },
      { action: ACTION_TYPE.TRAIN_UNIT, unit: 'science_vessel', count: 1, condition: 'science_facility_done' },
      { action: ACTION_TYPE.ATTACK, unitCount: 15, condition: 'army_count >= 15 && siege_tech_done' },
    ],
  },

  // 隐飞速推
  air_rush: {
    id: 'terran_air_rush',
    name: '人族速空军',
    nameEn: 'Terran Air Rush',
    difficulty: 'hard',
    description: '快速出星港+隐飞/女武神压制',
    steps: [
      { action: ACTION_TYPE.TRAIN_UNIT, unit: 'scv', count: 2, condition: 'always' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'supply_depot', condition: 'minerals >= 100' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'barracks', condition: 'minerals >= 150' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'refinery', condition: 'minerals >= 100' },
      { action: ACTION_TYPE.TRAIN_UNIT, unit: 'scv', count: 5, condition: 'always' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'factory', condition: 'minerals >= 200 && gas >= 100' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'supply_depot', condition: 'minerals >= 100' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'starport', condition: 'minerals >= 150 && gas >= 100' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'supply_depot', condition: 'minerals >= 100' },
      { action: ACTION_TYPE.TRAIN_UNIT, unit: 'wraith', count: 4, condition: 'starport_done' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'science_facility', condition: 'minerals >= 100 && gas >= 150' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'armory', condition: 'minerals >= 100 && gas >= 100' },
      { action: ACTION_TYPE.TRAIN_UNIT, unit: 'wraith', count: 4, condition: 'starport_done' },
      { action: ACTION_TYPE.UPGRADE, tech: 'cloaking_field', condition: 'covert_ops_done && minerals >= 100 && gas >= 100' },
      { action: ACTION_TYPE.EXPAND, condition: 'minerals >= 400 && workers >= 16' },
      { action: ACTION_TYPE.ATTACK, unitCount: 8, condition: 'army_count >= 8 && cloaking_field_done' },
    ],
  },
};

// ── 虫族建造顺序 ──
const ZERG_ORDERS = {
  // 标准狗速开
  ling_speed: {
    id: 'zerg_ling_speed',
    name: '虫族狗速开',
    nameEn: 'Zerg Speedling',
    difficulty: 'normal',
    description: 'HS→BS→BE→BV→HQ→HC 速代谢爆发',
    steps: [
      { action: ACTION_TYPE.TRAIN_UNIT, unit: 'drone', count: 3, condition: 'always' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'spawning_pool', condition: 'minerals >= 200 && drones >= 4' },
      { action: ACTION_TYPE.TRAIN_UNIT, unit: 'drone', count: 2, condition: 'always' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'extractor', condition: 'minerals >= 50 && pool_done' },
      { action: ACTION_TYPE.UPGRADE, tech: 'metabolic_boost', condition: 'pool_done && minerals >= 100 && gas >= 100' },
      { action: ACTION_TYPE.TRAIN_UNIT, unit: 'zergling', count: 6, condition: 'pool_done' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'hatchery', condition: 'minerals >= 300', location: 'natural' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'evolution_chamber', condition: 'minerals >= 75' },
      { action: ACTION_TYPE.TRAIN_UNIT, unit: 'zergling', count: 8, condition: 'pool_done' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'hydralisk_den', condition: 'minerals >= 200 && gas >= 100' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'lair', condition: 'minerals >= 150 && gas >= 100' },
      { action: ACTION_TYPE.UPGRADE, tech: 'melee_attacks_1', condition: 'evo_chamber_done && minerals >= 100 && gas >= 100' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'spire', condition: 'minerals >= 200 && gas >= 150 && lair_done' },
      { action: ACTION_TYPE.TRAIN_UNIT, unit: 'hydralisk', count: 6, condition: 'hydra_den_done' },
      { action: ACTION_TYPE.EXPAND, condition: 'minerals >= 300 && drones >= 20' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'hatchery', condition: 'minerals >= 300', location: 'third' },
      { action: ACTION_TYPE.TRAIN_UNIT, unit: 'mutalisk', count: 6, condition: 'spire_done' },
      { action: ACTION_TYPE.ATTACK, unitCount: 20, condition: 'army_count >= 20' },
    ],
  },

  // 刺蛇防御流
  hydra_defense: {
    id: 'zerg_hydra_defense',
    name: '虫族刺蛇防御',
    nameEn: 'Zerg Hydra Defense',
    difficulty: 'normal',
    description: 'HS→BE→HD→BC→BV→HQ 稳定刺蛇流',
    steps: [
      { action: ACTION_TYPE.TRAIN_UNIT, unit: 'drone', count: 4, condition: 'always' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'spawning_pool', condition: 'minerals >= 200 && drones >= 5' },
      { action: ACTION_TYPE.TRAIN_UNIT, unit: 'drone', count: 3, condition: 'always' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'extractor', condition: 'minerals >= 50' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'hatchery', condition: 'minerals >= 300', location: 'natural' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'hydralisk_den', condition: 'minerals >= 200 && gas >= 100' },
      { action: ACTION_TYPE.TRAIN_UNIT, unit: 'overlord', count: 1, condition: 'supply_used >= supply_total - 2' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'evolution_chamber', condition: 'minerals >= 75' },
      { action: ACTION_TYPE.TRAIN_UNIT, unit: 'hydralisk', count: 8, condition: 'hydra_den_done' },
      { action: ACTION_TYPE.UPGRADE, tech: 'muscular_augments', condition: 'hydra_den_done && minerals >= 150 && gas >= 150' },
      { action: ACTION_TYPE.UPGRADE, tech: 'missile_attacks_1', condition: 'evo_done && minerals >= 100 && gas >= 100' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'lair', condition: 'minerals >= 150 && gas >= 100' },
      { action: ACTION_TYPE.TRAIN_UNIT, unit: 'hydralisk', count: 8, condition: 'hydra_den_done' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'creep_colony', condition: 'minerals >= 75', count: 2 },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'spire', condition: 'minerals >= 200 && gas >= 150 && lair_done' },
      { action: ACTION_TYPE.EXPAND, condition: 'minerals >= 300 && drones >= 22' },
      { action: ACTION_TYPE.ATTACK, unitCount: 24, condition: 'army_count >= 24 && muscular_augments_done' },
    ],
  },

  // 飞龙骚扰
  muta_harass: {
    id: 'zerg_muta_harass',
    name: '虫族飞龙骚扰',
    nameEn: 'Zerg Muta Harass',
    difficulty: 'hard',
    description: '快速飞龙塔→飞龙群骚扰',
    steps: [
      { action: ACTION_TYPE.TRAIN_UNIT, unit: 'drone', count: 3, condition: 'always' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'spawning_pool', condition: 'minerals >= 200 && drones >= 4' },
      { action: ACTION_TYPE.TRAIN_UNIT, unit: 'drone', count: 2, condition: 'always' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'extractor', condition: 'minerals >= 50' },
      { action: ACTION_TYPE.TRAIN_UNIT, unit: 'zergling', count: 4, condition: 'pool_done' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'lair', condition: 'minerals >= 150 && gas >= 100' },
      { action: ACTION_TYPE.TRAIN_UNIT, unit: 'overlord', count: 1, condition: 'supply_used >= supply_total - 2' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'spire', condition: 'minerals >= 200 && gas >= 150 && lair_done' },
      { action: ACTION_TYPE.TRAIN_UNIT, unit: 'zergling', count: 4, condition: 'pool_done' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'hatchery', condition: 'minerals >= 300', location: 'natural' },
      { action: ACTION_TYPE.TRAIN_UNIT, unit: 'mutalisk', count: 9, condition: 'spire_done' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'evolution_chamber', condition: 'minerals >= 75' },
      { action: ACTION_TYPE.UPGRADE, tech: 'flyer_attacks_1', condition: 'spire_done && minerals >= 100 && gas >= 100' },
      { action: ACTION_TYPE.EXPAND, condition: 'minerals >= 300 && drones >= 18' },
      { action: ACTION_TYPE.ATTACK, unitCount: 12, condition: 'army_count >= 12 && mutalisk_count >= 9' },
    ],
  },
};

// ── 神族建造顺序 ──
const PROTOSS_ORDERS = {
  // 标准龙骑开局
  dragoon_standard: {
    id: 'protoss_dragoon_standard',
    name: '神族标准龙骑',
    nameEn: 'Protoss Dragoon Standard',
    difficulty: 'normal',
    description: 'PY→AC→GN→VO→TC→SF 标准龙骑流',
    steps: [
      { action: ACTION_TYPE.TRAIN_UNIT, unit: 'probe', count: 2, condition: 'always' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'pylon', condition: 'minerals >= 100' },
      { action: ACTION_TYPE.TRAIN_UNIT, unit: 'probe', count: 3, condition: 'always' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'gateway', condition: 'minerals >= 150' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'assimilator', condition: 'minerals >= 100' },
      { action: ACTION_TYPE.TRAIN_UNIT, unit: 'probe', count: 4, condition: 'always' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'cybernetics_core', condition: 'minerals >= 200' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'pylon', condition: 'minerals >= 100' },
      { action: ACTION_TYPE.TRAIN_UNIT, unit: 'zealot', count: 2, condition: 'gateway_done' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'gateway', condition: 'minerals >= 150' },
      { action: ACTION_TYPE.UPGRADE, tech: 'singularity_charge', condition: 'cyber_done && minerals >= 150 && gas >= 150' },
      { action: ACTION_TYPE.TRAIN_UNIT, unit: 'dragoon', count: 4, condition: 'cyber_done' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'pylon', condition: 'minerals >= 100' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'citadel_of_adun', condition: 'minerals >= 150 && gas >= 100' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'forge', condition: 'minerals >= 150' },
      { action: ACTION_TYPE.TRAIN_UNIT, unit: 'dragoon', count: 4, condition: 'cyber_done' },
      { action: ACTION_TYPE.UPGRADE, tech: 'ground_weapons_1', condition: 'forge_done && minerals >= 100 && gas >= 100' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'templar_archives', condition: 'minerals >= 150 && gas >= 150 && citadel_done' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'stargate', condition: 'minerals >= 150 && gas >= 100' },
      { action: ACTION_TYPE.EXPAND, condition: 'minerals >= 400 && workers >= 22' },
      { action: ACTION_TYPE.TRAIN_UNIT, unit: 'high_templar', count: 2, condition: 'archives_done' },
      { action: ACTION_TYPE.ATTACK, unitCount: 18, condition: 'army_count >= 18' },
    ],
  },

  // 狂热者提速
  zealot_speed: {
    id: 'protoss_zealot_speed',
    name: '神族提速叉',
    nameEn: 'Protoss Speed Zealot',
    difficulty: 'normal',
    description: 'PY→AC→GN→CI→TC→VP 快速提速叉',
    steps: [
      { action: ACTION_TYPE.TRAIN_UNIT, unit: 'probe', count: 2, condition: 'always' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'pylon', condition: 'minerals >= 100' },
      { action: ACTION_TYPE.TRAIN_UNIT, unit: 'probe', count: 2, condition: 'always' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'gateway', condition: 'minerals >= 150' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'gateway', condition: 'minerals >= 150' },
      { action: ACTION_TYPE.TRAIN_UNIT, unit: 'zealot', count: 4, condition: 'gateway_done' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'assimilator', condition: 'minerals >= 100' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'pylon', condition: 'minerals >= 100' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'cybernetics_core', condition: 'minerals >= 200' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'citadel_of_adun', condition: 'minerals >= 150 && gas >= 100' },
      { action: ACTION_TYPE.UPGRADE, tech: 'leg_enhancements', condition: 'citadel_done && minerals >= 200 && gas >= 200' },
      { action: ACTION_TYPE.TRAIN_UNIT, unit: 'zealot', count: 8, condition: 'gateway_done' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'forge', condition: 'minerals >= 150' },
      { action: ACTION_TYPE.UPGRADE, tech: 'ground_weapons_1', condition: 'forge_done && minerals >= 100 && gas >= 100' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'gateway', condition: 'minerals >= 150' },
      { action: ACTION_TYPE.EXPAND, condition: 'minerals >= 400 && workers >= 20' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'pylon', condition: 'minerals >= 100' },
      { action: ACTION_TYPE.TRAIN_UNIT, unit: 'zealot', count: 6, condition: 'gateway_done' },
      { action: ACTION_TYPE.ATTACK, unitCount: 16, condition: 'army_count >= 16 && leg_enhancements_done' },
    ],
  },

  // 海盗航母流
  carrier_rush: {
    id: 'protoss_carrier_rush',
    name: '神族航母流',
    nameEn: 'Protoss Carrier Rush',
    difficulty: 'hard',
    description: 'PY→AC→SG→FB→CV 快速出航母',
    steps: [
      { action: ACTION_TYPE.TRAIN_UNIT, unit: 'probe', count: 2, condition: 'always' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'pylon', condition: 'minerals >= 100' },
      { action: ACTION_TYPE.TRAIN_UNIT, unit: 'probe', count: 3, condition: 'always' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'gateway', condition: 'minerals >= 150' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'assimilator', condition: 'minerals >= 100' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'pylon', condition: 'minerals >= 100' },
      { action: ACTION_TYPE.TRAIN_UNIT, unit: 'zealot', count: 2, condition: 'gateway_done' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'cybernetics_core', condition: 'minerals >= 200' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'stargate', condition: 'minerals >= 150 && gas >= 100' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'forge', condition: 'minerals >= 150' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'pylon', condition: 'minerals >= 100' },
      { action: ACTION_TYPE.TRAIN_UNIT, unit: 'corsair', count: 2, condition: 'stargate_done' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'fleet_beacon', condition: 'minerals >= 300 && gas >= 200 && stargate_done' },
      { action: ACTION_TYPE.EXPAND, condition: 'minerals >= 400 && workers >= 20' },
      { action: ACTION_TYPE.BUILD_BUILDING, building: 'gateway', condition: 'minerals >= 150' },
      { action: ACTION_TYPE.TRAIN_UNIT, unit: 'carrier', count: 2, condition: 'fleet_beacon_done' },
      { action: ACTION_TYPE.UPGRADE, tech: 'carrier_capacity', condition: 'fleet_beacon_done && minerals >= 100 && gas >= 100' },
      { action: ACTION_TYPE.UPGRADE, tech: 'air_weapons_1', condition: 'cyber_done && minerals >= 100 && gas >= 100' },
      { action: ACTION_TYPE.TRAIN_UNIT, unit: 'carrier', count: 2, condition: 'fleet_beacon_done' },
      { action: ACTION_TYPE.ATTACK, unitCount: 4, condition: 'carrier_count >= 4 && carrier_capacity_done' },
    ],
  },
};

// ═══════════════════════════════════════════
// 建造顺序管理器
// ═══════════════════════════════════════════

const ALL_ORDERS = {
  [RACE.TERRAN]: TERRAN_ORDERS,
  [RACE.ZERG]: ZERG_ORDERS,
  [RACE.PROTOSS]: PROTOSS_ORDERS,
};

export class BuildOrderManager {
  constructor(race, opponentRace = null, mapType = null) {
    this.race = race;
    this.opponentRace = opponentRace;
    this.mapType = mapType;
    this.orders = ALL_ORDERS[race] || {};
    this.currentIndex = 0;
    this.currentOrder = null;
  }

  /**
   * 选择合适的建造顺序
   * @param {string} [difficulty='normal'] - 难度等级
   * @returns {object} 建造顺序对象
   */
  selectOrder(difficulty = 'normal') {
    const available = Object.values(this.orders);
    if (available.length === 0) return null;

    // 根据对手种族选择针对性策略
    if (this.opponentRace === RACE.ZERG) {
      // 对虫族：优先AOE（坦克/电兵/蝎子）
      const preferred = available.find(o => o.id.includes('mech') || o.id.includes('hydra'));
      if (preferred) { this.currentOrder = preferred; return preferred; }
    }
    if (this.opponentRace === RACE.PROTOSS) {
      // 对神族：坦克/飞龙/狂热
      const preferred = available.find(o => o.id.includes('bio') || o.id.includes('muta'));
      if (preferred) { this.currentOrder = preferred; return preferred; }
    }
    if (this.opponentRace === RACE.TERRAN) {
      // 对人族：机械化/刺蛇/提速叉
      const preferred = available.find(o => o.id.includes('mech') || o.id.includes('zealot'));
      if (preferred) { this.currentOrder = preferred; return preferred; }
    }

    // 默认选最简单的/难度匹配的
    const matched = available.filter(o => o.difficulty === difficulty);
    this.currentOrder = matched.length > 0 ? matched[0] : available[0];
    return this.currentOrder;
  }

  /**
   * 获取当前应执行的建造步骤
   * @param {object} gameState - 游戏状态快照
   * @returns {object|null} 当前步骤
   */
  getNextStep(gameState) {
    if (!this.currentOrder) this.selectOrder();
    const steps = this.currentOrder?.steps;
    if (!steps) return null;

    for (let i = this.currentIndex; i < steps.length; i++) {
      const step = steps[i];
      if (this._evaluateCondition(step.condition, gameState)) {
        this.currentIndex = i + 1;
        return step;
      }
    }
    return null;
  }

  /**
   * 动态跳过无法执行的步骤
   */
  skipStep() {
    this.currentIndex++;
  }

  /**
   * 重置建造顺序
   */
  reset() {
    this.currentIndex = 0;
  }

  // ── 条件求值器 ──
  _evaluateCondition(condition, state) {
    if (!condition || condition === 'always') return true;

    try {
      // 安全的条件替换
      let expr = condition;
      const replacements = {
        'minerals': state.minerals || 0,
        'gas': state.gas || 0,
        'supply_used': state.supplyUsed || 0,
        'supply_total': state.supplyTotal || 0,
        'workers': state.workers || 0,
        'army_count': state.armyCount || 0,
        'mutalisk_count': state.mutaliskCount || 0,
        'carrier_count': state.carrierCount || 0,
        'pool_done': !!state.buildingsDone?.spawning_pool,
        'hydra_den_done': !!state.buildingsDone?.hydralisk_den,
        'spire_done': !!state.buildingsDone?.spire,
        'lair_done': !!state.buildingsDone?.lair,
        'hive_done': !!state.buildingsDone?.hive,
        'evo_done': !!state.buildingsDone?.evolution_chamber,
        'evo_chamber_done': !!state.buildingsDone?.evolution_chamber,
        'factory_done': !!state.buildingsDone?.factory,
        'starport_done': !!state.buildingsDone?.starport,
        'academy_done': !!state.buildingsDone?.academy,
        'engineering_bay_done': !!state.buildingsDone?.engineering_bay,
        'science_facility_done': !!state.buildingsDone?.science_facility,
        'armory_done': !!state.buildingsDone?.armory,
        'covert_ops_done': !!state.buildingsDone?.covert_ops,
        'gateway_done': !!state.buildingsDone?.gateway,
        'cyber_done': !!state.buildingsDone?.cybernetics_core,
        'citadel_done': !!state.buildingsDone?.citadel_of_adun,
        'archives_done': !!state.buildingsDone?.templar_archives,
        'forge_done': !!state.buildingsDone?.forge,
        'stargate_done': !!state.buildingsDone?.stargate,
        'fleet_beacon_done': !!state.buildingsDone?.fleet_beacon,
        'stimpack_done': !!state.techDone?.stimpack,
        'metabolic_boost_done': !!state.techDone?.metabolic_boost,
        'siege_tech_done': !!state.techDone?.siege_tech,
        'cloaking_field_done': !!state.techDone?.cloaking_field,
        'muscular_augments_done': !!state.techDone?.muscular_augments,
        'leg_enhancements_done': !!state.techDone?.leg_enhancements,
        'carrier_capacity_done': !!state.techDone?.carrier_capacity,
        'singularity_charge_done': !!state.techDone?.singularity_charge,
      };

      for (const [key, value] of Object.entries(replacements)) {
        expr = expr.replace(new RegExp(`\\b${key}\\b`, 'g'), JSON.stringify(value));
      }

      return new Function(`return (${expr})`)();
    } catch {
      return false;
    }
  }

  /**
   * 获取所有可用的建造顺序（供UI显示）
   */
  getAvailableOrders() {
    return Object.values(this.orders);
  }
}

// ── 导出所有建造顺序数据 ──
export const BUILD_ORDERS = {
  [RACE.TERRAN]: TERRAN_ORDERS,
  [RACE.ZERG]: ZERG_ORDERS,
  [RACE.PROTOSS]: PROTOSS_ORDERS,
};

export default BuildOrderManager;
