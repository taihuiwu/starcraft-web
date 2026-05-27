// ═══════════════════════════════════════════
// StarCraft Web - 虫族战役数据 (ZergCampaign)
// 5个关卡：从孵化到主宰虫群
// 以虫族视角叙述，涵盖孵化、进化、扩张等特色玩法
// ═══════════════════════════════════════════

export const ZERG_CAMPAIGN = {
  id: 'zerg',
  name: '虫族战役',
  nameEn: 'Zerg Campaign',
  subtitle: '虫群的意志',
  description: '你是虫群的指挥意识。从弱小的幼虫开始，不断孵化、进化、扩张，将整个星球变为虫巢。',
  icon: '🐛',
  difficulty: 'normal',

  globalRewards: {
    units: ['guardian'],
    techs: ['adrenal_glands'],
  },

  missions: [
    // ─────────────────────────────────
    // 关卡1：新生（孵化教学）
    // ─────────────────────────────────
    {
      id: 'zerg_01',
      name: '新生',
      subtitle: '破壳而出',
      description: '你刚刚降临这颗星球。孵化场已经就位，但你需要学习如何利用幼虫来扩张虫群。',
      difficulty: 'easy',
      estimatedTime: 600,

      map: {
        name: '虫族巢穴',
        size: 64,
        terrain: 'creep',
        features: [
          { type: 'minerals', pos: [12, 18], amount: 5000 },
          { type: 'minerals', pos: [15, 20], amount: 5000 },
          { type: 'gas', pos: [18, 16], amount: 2500 },
        ],
      },

      startingResources: { minerals: 100, gas: 0 },

      initialUnits: [
        { type: 'drone', pos: [10, 20], team: 1 },
        { type: 'drone', pos: [11, 20], team: 1 },
        { type: 'drone', pos: [12, 20], team: 1 },
        { type: 'overlord', pos: [10, 16], team: 1 },
      ],

      initialBuildings: [
        { type: 'hatchery', pos: [10, 22], team: 1, complete: true },
      ],

      aiConfig: null,
      cameraStart: [10, 20],

      scoring: { timeLimit: 300, maxLoss: 0, threeStarScore: 1200, twoStarScore: 800 },
      rewards: { units: ['hydralisk'], techs: ['metabolic_boost'] },

      script: [
        { type: 'dialog', speaker: '虫群意志', portrait: 'overmind',
          text: '你已经觉醒。这是你的第一个孵化场，幼虫是虫群的基础。' },
        { type: 'dialog', speaker: '虫群意志', portrait: 'overmind',
          text: '幼虫可以变异为任何虫族单位。用它们来扩展你的虫群。' },
        { type: 'camera_move', pos: [12, 18], duration: 2 },
        { type: 'dialog', speaker: '虫群意志', portrait: 'overmind',
          text: '水晶矿是进化的养料。派遣工蜂去采集它们。' },
        { type: 'objective', id: 'gather_minerals', text: '采集100水晶矿',
          condition: 'resource_collected',
          conditionParams: { resource: 'minerals', amount: 100, team: 1 } },
        { type: 'objective', id: 'build_spawning_pool', text: '建造分裂池',
          condition: 'building_completed',
          conditionParams: { buildingType: 'spawning_pool', team: 1 }, optional: true },
        { type: 'trigger',
          condition: { type: 'resource_collected', resource: 'minerals', amount: 100, team: 1 },
          then: [
            { type: 'dialog', speaker: '虫群意志', portrait: 'overmind',
              text: '足够的养料已收集。建造分裂池来解锁更多兵种。' },
          ] },
        { type: 'trigger',
          condition: { type: 'building_completed', buildingType: 'spawning_pool', team: 1 },
          then: [
            { type: 'dialog', speaker: '虫群意志', portrait: 'overmind',
              text: '分裂池已就绪。现在你可以孵化跳虫了——虫群最基本的战斗单位。' },
            { type: 'objective', id: 'spawn_zerglings', text: '孵化6只跳虫',
              condition: 'unit_count',
              conditionParams: { unitType: 'zergling', team: 1, minCount: 6 } },
          ] },
        { type: 'trigger',
          condition: { type: 'unit_count', unitType: 'zergling', team: 1, minCount: 6 },
          then: [
            { type: 'dialog', speaker: '虫群意志', portrait: 'overmind',
              text: '很好，虫群正在壮大。继续扩张，让这颗星球被虫群覆盖。' },
            { type: 'victory_condition', condition: 'time_elapsed', params: { seconds: 120 } },
          ] },
      ],
    },

    // ─────────────────────────────────
    // 关卡2：猎食（对抗人族前哨站）
    // ─────────────────────────────────
    {
      id: 'zerg_02',
      name: '猎食',
      subtitle: '吞噬一切',
      description: '人族在这颗星球上建立了前哨站。虫群需要食物来进化。摧毁人族基地，为虫群提供养分。',
      difficulty: 'normal',
      estimatedTime: 900,

      map: {
        name: '感染之地',
        size: 80,
        terrain: 'swamp',
        features: [
          { type: 'minerals', pos: [15, 60], amount: 8000 },
          { type: 'minerals', pos: [18, 62], amount: 8000 },
          { type: 'gas', pos: [20, 58], amount: 4000 },
          { type: 'minerals', pos: [60, 20], amount: 10000 },
        ],
      },

      startingResources: { minerals: 200, gas: 0 },

      initialUnits: [
        { type: 'drone', pos: [14, 62], team: 1 },
        { type: 'drone', pos: [15, 62], team: 1 },
        { type: 'drone', pos: [16, 62], team: 1 },
        { type: 'zergling', pos: [14, 58], team: 1 },
        { type: 'zergling', pos: [15, 58], team: 1 },
        { type: 'overlord', pos: [12, 58], team: 1 },
      ],

      initialBuildings: [
        { type: 'hatchery', pos: [15, 65], team: 1, complete: true },
        { type: 'spawning_pool', pos: [20, 65], team: 1, complete: true },
      ],

      aiConfig: {
        team: 2,
        race: 'terran',
        difficulty: 'easy',
        aggression: 'low',
        defense: true,
        basePosition: [60, 20],
      },

      cameraStart: [15, 60],

      scoring: { timeLimit: 600, maxLoss: 12, threeStarScore: 1400, twoStarScore: 900 },
      rewards: { units: ['mutalisk'], techs: ['flyer_attack_1'] },

      script: [
        { type: 'dialog', speaker: '虫群意志', portrait: 'overmind',
          text: '人族在北方建立了基地。他们的血肉将成为虫群进化的养分。' },
        { type: 'dialog', speaker: '虫群意志', portrait: 'overmind',
          text: '孵化足够多的跳虫，然后淹没他们。' },
        { type: 'objective', id: 'destroy_terran', text: '摧毁人族基地',
          condition: 'building_destroyed',
          conditionParams: { buildingType: 'command_center', team: 2 } },
        { type: 'objective', id: 'build_force', text: '孵化至少15个单位',
          condition: 'unit_count',
          conditionParams: { team: 1, minCount: 15 } },
        { type: 'dialog', speaker: '虫群意志', portrait: 'overmind',
          text: '去吧，虫群。将这片土地化为虫巢。' },
        { type: 'timer', duration: 120, then: [
          { type: 'dialog', speaker: '虫群意志', portrait: 'overmind',
            text: '人族派出了巡逻队。用跳虫撕碎他们。' },
          { type: 'spawn', unit: 'marine', pos: [45, 35], team: 2, count: 3 },
          { type: 'spawn', unit: 'firebat', pos: [47, 37], team: 2, count: 1 },
        ] },
        { type: 'timer', duration: 300, then: [
          { type: 'dialog', speaker: '虫群意志', portrait: 'overmind',
            text: '人族正在加强防御。你需要更强大的单位。' },
          { type: 'spawn', unit: 'marine', pos: [50, 30], team: 2, count: 6 },
          { type: 'spawn', unit: 'turret', pos: [58, 22], team: 2, count: 2 },
        ] },
        { type: 'defeat_condition', condition: 'building_destroyed',
          params: { buildingType: 'hatchery', team: 1 } },
      ],
    },

    // ─────────────────────────────────
    // 关卡3：进化（解锁飞龙）
    // ─────────────────────────────────
    {
      id: 'zerg_03',
      name: '进化',
      subtitle: '飞翔的猎手',
      description: '虫群发现了飞龙的进化路径。收集足够的瓦斯来解锁飞龙塔，让虫群获得制空权。',
      difficulty: 'normal',
      estimatedTime: 1200,

      map: {
        name: '进化熔炉',
        size: 80,
        terrain: 'creep',
        features: [
          { type: 'minerals', pos: [12, 55], amount: 6000 },
          { type: 'minerals', pos: [15, 58], amount: 6000 },
          { type: 'gas', pos: [18, 52], amount: 6000 },
          { type: 'minerals', pos: [60, 20], amount: 10000 },
          { type: 'gas', pos: [65, 25], amount: 5000 },
        ],
      },

      startingResources: { minerals: 250, gas: 50 },

      initialUnits: [
        { type: 'drone', pos: [10, 56], team: 1 },
        { type: 'drone', pos: [11, 56], team: 1 },
        { type: 'drone', pos: [12, 56], team: 1 },
        { type: 'drone', pos: [13, 56], team: 1 },
        { type: 'zergling', pos: [14, 52], team: 1 },
        { type: 'zergling', pos: [15, 52], team: 1 },
        { type: 'zergling', pos: [16, 52], team: 1 },
        { type: 'overlord', pos: [10, 50], team: 1 },
      ],

      initialBuildings: [
        { type: 'hatchery', pos: [12, 58], team: 1, complete: true },
        { type: 'spawning_pool', pos: [18, 58], team: 1, complete: true },
        { type: 'extractor', pos: [18, 52], team: 1, complete: true },
      ],

      aiConfig: {
        team: 2,
        race: 'terran',
        difficulty: 'normal',
        aggression: 'medium',
        basePosition: [60, 20],
        attackWaves: [
          { time: 180, units: [{ type: 'marine', count: 5 }, { type: 'medic', count: 2 }] },
          { time: 400, units: [{ type: 'marine', count: 8 }, { type: 'goliath', count: 2 }] },
        ],
      },

      cameraStart: [12, 55],

      scoring: { timeLimit: 900, maxLoss: 15, threeStarScore: 1600, twoStarScore: 1100 },
      rewards: { units: ['lurker'], techs: ['lurker_aspect'] },

      script: [
        { type: 'dialog', speaker: '虫群意志', portrait: 'overmind',
          text: '虫群的基因在不断进化。飞龙塔将赋予我们制空的能力。' },
        { type: 'dialog', speaker: '虫群意志', portrait: 'overmind',
          text: '收集足够的瓦斯，建造飞龙塔，然后将刺蛇变异为飞龙。' },
        { type: 'objective', id: 'build_spire', text: '建造飞龙塔',
          condition: 'building_completed',
          conditionParams: { buildingType: 'spire', team: 1 } },
        { type: 'objective', id: 'spawn_mutalisks', text: '变异5只飞龙',
          condition: 'unit_count',
          conditionParams: { unitType: 'mutalisk', team: 1, minCount: 5 } },
        { type: 'timer', duration: 170, then: [
          { type: 'dialog', speaker: '虫群意志', portrait: 'overmind',
            text: '人族的侦察机发现了我们。他们正在集结部队。' },
          { type: 'spawn', unit: 'marine', pos: [40, 35], team: 2, count: 5 },
          { type: 'spawn', unit: 'medic', pos: [42, 37], team: 2, count: 2 },
        ] },
        { type: 'trigger',
          condition: { type: 'building_completed', buildingType: 'spire', team: 1 },
          then: [
            { type: 'dialog', speaker: '虫群意志', portrait: 'overmind',
              text: '飞龙塔已建成！立即将刺蛇变异为飞龙。' },
          ] },
        { type: 'trigger',
          condition: { type: 'unit_count', unitType: 'mutalisk', team: 1, minCount: 5 },
          then: [
            { type: 'dialog', speaker: '虫群意志', portrait: 'overmind',
              text: '飞龙翱翔天际！现在发起总攻，摧毁人族基地！' },
            { type: 'objective', id: 'destroy_terran', text: '摧毁人族基地',
              condition: 'building_destroyed',
              conditionParams: { buildingType: 'command_center', team: 2 } },
          ] },
        { type: 'defeat_condition', condition: 'building_destroyed',
          params: { buildingType: 'hatchery', team: 1 } },
      ],
    },

    // ─────────────────────────────────
    // 关卡4：扩张（菌毯蔓延）
    // ─────────────────────────────────
    {
      id: 'zerg_04',
      name: '扩张',
      subtitle: '菌毯覆盖',
      description: '虫群需要更多的资源来壮大。在多个矿点建立分基地，将菌毯蔓延到整个地图。小心神族的进攻！',
      difficulty: 'hard',
      estimatedTime: 1500,

      map: {
        name: '菌毯世界',
        size: 96,
        terrain: 'swamp',
        features: [
          { type: 'minerals', pos: [15, 75], amount: 8000 },
          { type: 'minerals', pos: [18, 78], amount: 8000 },
          { type: 'gas', pos: [20, 72], amount: 4000 },
          { type: 'minerals', pos: [45, 50], amount: 8000 },
          { type: 'gas', pos: [50, 48], amount: 4000 },
          { type: 'minerals', pos: [75, 25], amount: 10000 },
          { type: 'gas', pos: [80, 22], amount: 5000 },
        ],
      },

      startingResources: { minerals: 300, gas: 50 },

      initialUnits: [
        { type: 'drone', pos: [13, 76], team: 1 },
        { type: 'drone', pos: [14, 76], team: 1 },
        { type: 'drone', pos: [15, 76], team: 1 },
        { type: 'drone', pos: [16, 76], team: 1 },
        { type: 'zergling', pos: [14, 72], team: 1 },
        { type: 'zergling', pos: [15, 72], team: 1 },
        { type: 'hydralisk', pos: [16, 72], team: 1 },
        { type: 'overlord', pos: [12, 72], team: 1 },
        { type: 'overlord', pos: [18, 72], team: 1 },
      ],

      initialBuildings: [
        { type: 'hatchery', pos: [15, 78], team: 1, complete: true },
        { type: 'spawning_pool', pos: [20, 78], team: 1, complete: true },
        { type: 'extractor', pos: [20, 72], team: 1, complete: true },
      ],

      aiConfig: {
        team: 2,
        race: 'protoss',
        difficulty: 'normal',
        aggression: 'medium',
        basePosition: [75, 25],
        attackWaves: [
          { time: 120, units: [{ type: 'zealot', count: 4 }, { type: 'dragoon', count: 2 }] },
          { time: 360, units: [{ type: 'zealot', count: 6 }, { type: 'dragoon', count: 4 }, { type: 'archon', count: 1 }] },
          { time: 600, units: [{ type: 'zealot', count: 8 }, { type: 'high_templar', count: 2 }, { type: 'carrier', count: 1 }] },
        ],
      },

      cameraStart: [15, 75],

      scoring: { timeLimit: 1200, maxLoss: 25, threeStarScore: 2000, twoStarScore: 1400 },
      rewards: { units: ['ultralisk'], techs: ['chitinous_plating'] },

      script: [
        { type: 'dialog', speaker: '虫群意志', portrait: 'overmind',
          text: '虫群需要更多的资源来壮大。在中间的矿点建立分基地。' },
        { type: 'dialog', speaker: '虫群意志', portrait: 'overmind',
          text: '神族在北方建立了基地。他们的灵能将成为虫群进化的催化剂。' },
        { type: 'objective', id: 'expand', text: '建立至少2个分基地',
          condition: 'unit_count',
          conditionParams: { unitType: 'hatchery', team: 1, minCount: 2 } },
        { type: 'objective', id: 'destroy_protoss', text: '摧毁神族基地',
          condition: 'building_destroyed',
          conditionParams: { buildingType: 'nexus', team: 2 } },
        { type: 'timer', duration: 115, then: [
          { type: 'dialog', speaker: '虫群意志', portrait: 'overmind',
            text: '神族的侦察兵发现了我们的扩张意图。他们来了！' },
          { type: 'spawn', unit: 'zealot', pos: [40, 40], team: 2, count: 4 },
          { type: 'spawn', unit: 'dragoon', pos: [42, 42], team: 2, count: 2 },
        ] },
        { type: 'timer', duration: 350, then: [
          { type: 'dialog', speaker: '虫群意志', portrait: 'overmind',
            text: '更强大的神族部队正在逼近！执政官的力量不容小觑。' },
          { type: 'spawn', unit: 'zealot', pos: [50, 35], team: 2, count: 6 },
          { type: 'spawn', unit: 'dragoon', pos: [48, 33], team: 2, count: 4 },
          { type: 'spawn', unit: 'archon', pos: [52, 37], team: 2, count: 1 },
        ] },
        { type: 'timer', duration: 590, then: [
          { type: 'dialog', speaker: '虫群意志', portrait: 'overmind',
            text: '航母！神族派出了他们的终极武器！' },
          { type: 'spawn', unit: 'carrier', pos: [60, 25], team: 2, count: 1 },
          { type: 'reinforcement', text: '虫群进化完成！', units: [
            { type: 'ultralisk', pos: [15, 70], team: 1 },
            { type: 'ultralisk', pos: [16, 70], team: 1 },
          ] },
        ] },
        { type: 'defeat_condition', condition: 'building_destroyed',
          params: { buildingType: 'hatchery', team: 1 } },
      ],
    },

    // ─────────────────────────────────
    // 关卡5：主宰（虫群的胜利）
    // ─────────────────────────────────
    {
      id: 'zerg_05',
      name: '主宰',
      subtitle: '虫群不可阻挡',
      description: '最终之战。虫群要征服这颗星球上最后的抵抗力量。集结所有进化形态，用虫海淹没一切敌人。',
      difficulty: 'very_hard',
      estimatedTime: 1800,

      map: {
        name: '末日虫巢',
        size: 128,
        terrain: 'creep',
        features: [
          { type: 'minerals', pos: [25, 100], amount: 10000 },
          { type: 'minerals', pos: [30, 103], amount: 10000 },
          { type: 'minerals', pos: [35, 98], amount: 10000 },
          { type: 'gas', pos: [28, 96], amount: 5000 },
          { type: 'gas', pos: [33, 95], amount: 5000 },
          { type: 'minerals', pos: [95, 25], amount: 15000 },
          { type: 'gas', pos: [100, 22], amount: 8000 },
        ],
      },

      startingResources: { minerals: 500, gas: 200 },

      initialUnits: [
        { type: 'drone', pos: [22, 100], team: 1 },
        { type: 'drone', pos: [23, 100], team: 1 },
        { type: 'drone', pos: [24, 100], team: 1 },
        { type: 'drone', pos: [25, 100], team: 1 },
        { type: 'zergling', pos: [22, 96], team: 1 },
        { type: 'zergling', pos: [23, 96], team: 1 },
        { type: 'hydralisk', pos: [24, 96], team: 1 },
        { type: 'hydralisk', pos: [25, 96], team: 1 },
        { type: 'mutalisk', pos: [26, 98], team: 1 },
        { type: 'overlord', pos: [20, 98], team: 1 },
        { type: 'overlord', pos: [28, 98], team: 1 },
      ],

      initialBuildings: [
        { type: 'hatchery', pos: [25, 105], team: 1, complete: true },
        { type: 'spawning_pool', pos: [30, 105], team: 1, complete: true },
        { type: 'extractor', pos: [28, 96], team: 1, complete: true },
        { type: 'spire', pos: [35, 105], team: 1, complete: true },
      ],

      aiConfig: {
        team: 2,
        race: 'mixed',
        difficulty: 'hard',
        aggression: 'extreme',
        basePosition: [95, 25],
        attackWaves: [
          { time: 60, units: [{ type: 'marine', count: 8 }, { type: 'firebat', count: 3 }, { type: 'zealot', count: 4 }] },
          { time: 240, units: [{ type: 'goliath', count: 4 }, { type: 'dragoon', count: 4 }, { type: 'mutalisk', count: 5 }] },
          { time: 480, units: [{ type: 'siege_tank', count: 3 }, { type: 'archon', count: 2 }, { type: 'ultralisk', count: 2 }] },
          { time: 780, units: [{ type: 'battlecruiser', count: 1 }, { type: 'carrier', count: 1 }, { type: 'brood_lord', count: 2 }] },
        ],
      },

      cameraStart: [25, 100],

      scoring: { timeLimit: 1200, maxLoss: 50, threeStarScore: 3000, twoStarScore: 2000 },
      rewards: { units: ['devourer'], techs: ['pyloclasm'] },

      script: [
        { type: 'dialog', speaker: '虫群意志', portrait: 'overmind',
          text: '虫群已经进化到极致。最后的敌人就在北方。' },
        { type: 'dialog', speaker: '虫群意志', portrait: 'overmind',
          text: '人族和神族联合了起来。但这毫无意义。虫群不可阻挡。' },
        { type: 'objective', id: 'build_army', text: '建立至少40个战斗单位',
          condition: 'unit_count',
          conditionParams: { team: 1, minCount: 40 } },
        { type: 'objective', id: 'destroy_enemies', text: '消灭所有敌方建筑',
          condition: 'building_destroyed',
          conditionParams: { team: 2 } },
        { type: 'timer', duration: 55, then: [
          { type: 'dialog', speaker: '虫群意志', portrait: 'overmind',
            text: '敌人的先遣部队已到达。消灭他们。' },
          { type: 'spawn', unit: 'marine', pos: [80, 50], team: 2, count: 8 },
          { type: 'spawn', unit: 'firebat', pos: [82, 52], team: 2, count: 3 },
          { type: 'spawn', unit: 'zealot', pos: [78, 48], team: 2, count: 4 },
        ] },
        { type: 'timer', duration: 235, then: [
          { type: 'spawn', unit: 'goliath', pos: [85, 40], team: 2, count: 4 },
          { type: 'spawn', unit: 'dragoon', pos: [82, 38], team: 2, count: 4 },
          { type: 'spawn', unit: 'mutalisk', pos: [88, 42], team: 2, count: 5 },
        ] },
        { type: 'timer', duration: 475, then: [
          { type: 'spawn', unit: 'siege_tank', pos: [90, 30], team: 2, count: 3 },
          { type: 'spawn', unit: 'archon', pos: [88, 28], team: 2, count: 2 },
          { type: 'spawn', unit: 'ultralisk', pos: [85, 32], team: 2, count: 2 },
          { type: 'dialog', speaker: '虫群意志', portrait: 'overmind',
            text: '强大的敌人出现了。但虫群的适应性是无限的。进化吧！' },
          { type: 'reinforcement', text: '虫群终极进化完成！', units: [
            { type: 'ultralisk', pos: [22, 94], team: 1 },
            { type: 'ultralisk', pos: [24, 94], team: 1 },
            { type: 'brood_lord', pos: [26, 94], team: 1 },
          ] },
        ] },
        { type: 'timer', duration: 775, then: [
          { type: 'dialog', speaker: '虫群意志', portrait: 'overmind',
            text: '他们动用了终极武器！但这正是虫群等待的时刻！' },
          { type: 'spawn', unit: 'battlecruiser', pos: [90, 25], team: 2, count: 1 },
          { type: 'spawn', unit: 'carrier', pos: [85, 20], team: 2, count: 1 },
          { type: 'spawn', unit: 'brood_lord', pos: [92, 28], team: 2, count: 2 },
        ] },
        { type: 'defeat_condition', condition: 'building_destroyed',
          params: { buildingType: 'hatchery', team: 1 } },
      ],
    },
  ],
};
