// ═══════════════════════════════════════════
// StarCraft Web - 人族战役数据 (TerranCampaign)
// 5个关卡：从基础教学到终极决战
// 故事线：Raynor视角，对抗Zerg入侵
// ═══════════════════════════════════════════

export const TERRAN_CAMPAIGN = {
  id: 'terran',
  name: '人族战役',
  nameEn: 'Terran Campaign',
  subtitle: '钢铁与火焰',
  description: '指挥官，带领人族部队抵抗虫族入侵。从新兵训练到终极决战，每一步都关乎人类的存亡。',
  icon: '🏗️',
  difficulty: 'normal',

  /** 战役整体奖励（通关后解锁） */
  globalRewards: {
    units: ['nuclear_missile'],
    techs: ['nuclear_launch'],
  },

  // ═══════════════════════════════════════
  // 关卡列表（共5关）
  // ═══════════════════════════════════════
  missions: [
    // ─────────────────────────────────
    // 关卡1：艾尔之子（基础教学）
    // ─────────────────────────────────
    {
      id: 'terran_01',
      name: '艾尔之子',
      subtitle: '新兵的第一课',
      description: '欢迎来到人族新兵训练营。在真正的战争来临之前，你需要学会最基本的基地建设和资源管理。',
      difficulty: 'easy',
      estimatedTime: 600,

      map: {
        name: '训练基地',
        size: 64,
        terrain: 'grassland',
        features: [
          { type: 'minerals', pos: [15, 20], amount: 5000 },
          { type: 'minerals', pos: [18, 22], amount: 5000 },
          { type: 'gas', pos: [20, 18], amount: 2500 },
        ],
      },

      startingResources: { minerals: 100, gas: 0 },

      initialUnits: [
        { type: 'scv', pos: [12, 15], team: 1 },
        { type: 'scv', pos: [13, 15], team: 1 },
        { type: 'scv', pos: [14, 15], team: 1 },
        { type: 'marine', pos: [12, 18], team: 1 },
        { type: 'marine', pos: [13, 18], team: 1 },
      ],

      initialBuildings: [
        { type: 'command_center', pos: [10, 15], team: 1, complete: true },
      ],

      aiConfig: null,
      cameraStart: [10, 15],

      scoring: { timeLimit: 300, maxLoss: 0, threeStarScore: 1200, twoStarScore: 800 },
      rewards: { units: ['medic'], techs: ['stimpack'] },

      script: [
        { type: 'dialog', speaker: 'Matt Horner', portrait: 'horner',
          text: '指挥官，欢迎来到人族训练基地。我是Matt Horner，你的副官。' },
        { type: 'dialog', speaker: 'Matt Horner', portrait: 'horner',
          text: '在进入真正的战场之前，你需要掌握基地建设的基本技能。' },
        { type: 'camera_move', pos: [18, 20], duration: 2 },
        { type: 'dialog', speaker: 'Matt Horner', portrait: 'horner',
          text: '水晶矿是你最基础的资源。用SCV去采集它们。' },
        { type: 'objective', id: 'gather_minerals', text: '采集100水晶矿',
          condition: 'resource_collected',
          conditionParams: { resource: 'minerals', amount: 100, team: 1 } },
        { type: 'objective', id: 'build_barracks', text: '建造一个兵营',
          condition: 'building_completed',
          conditionParams: { buildingType: 'barracks', team: 1 }, optional: true },
        { type: 'trigger',
          condition: { type: 'resource_collected', resource: 'minerals', amount: 100, team: 1 },
          then: [
            { type: 'dialog', speaker: 'Matt Horner', portrait: 'horner',
              text: '很好！现在建造一个兵营来训练步兵单位。' },
          ] },
        { type: 'trigger',
          condition: { type: 'building_completed', buildingType: 'barracks', team: 1 },
          then: [
            { type: 'dialog', speaker: 'Matt Horner', portrait: 'horner',
              text: '出色！兵营建造完成。你可以在兵营中训练机枪兵。' },
            { type: 'objective', id: 'train_marines', text: '训练4个机枪兵',
              condition: 'unit_count',
              conditionParams: { unitType: 'marine', team: 1, minCount: 4 } },
          ] },
        { type: 'trigger',
          condition: { type: 'unit_count', unitType: 'marine', team: 1, minCount: 4 },
          then: [
            { type: 'dialog', speaker: 'Matt Horner', portrait: 'horner',
              text: '太好了，你的部队已经初具规模。' },
            { type: 'dialog', speaker: 'Matt Horner', portrait: 'horner',
              text: '记住，一个优秀的指挥官永远要保证后勤补给。现在继续采集资源，建立完整的基地吧！' },
            { type: 'victory_condition', condition: 'time_elapsed', params: { seconds: 120 } },
          ] },
      ],
    },

    // ─────────────────────────────────
    // 关卡2：行动代号Nydus（虫族防御战）
    // ─────────────────────────────────
    {
      id: 'terran_02',
      name: '行动代号Nydus',
      subtitle: '虫潮来袭',
      description: '警报！Zerg通过Nydus管道在你基地附近发动了突袭！坚守阵地，消灭所有入侵的虫群！',
      difficulty: 'normal',
      estimatedTime: 900,

      map: {
        name: '荒漠前线',
        size: 96,
        terrain: 'desert',
        features: [
          { type: 'minerals', pos: [20, 25], amount: 8000 },
          { type: 'minerals', pos: [24, 28], amount: 8000 },
          { type: 'gas', pos: [22, 22], amount: 4000 },
        ],
      },

      startingResources: { minerals: 200, gas: 0 },

      initialUnits: [
        { type: 'marine', pos: [18, 25], team: 1 },
        { type: 'marine', pos: [19, 25], team: 1 },
        { type: 'marine', pos: [20, 25], team: 1 },
        { type: 'marine', pos: [21, 25], team: 1 },
        { type: 'scv', pos: [20, 30], team: 1 },
        { type: 'scv', pos: [21, 30], team: 1 },
        { type: 'scv', pos: [22, 30], team: 1 },
      ],

      initialBuildings: [
        { type: 'command_center', pos: [20, 30], team: 1, complete: true },
        { type: 'supply_depot', pos: [16, 28], team: 1, complete: true },
        { type: 'barracks', pos: [24, 28], team: 1, complete: true },
      ],

      aiConfig: {
        team: 2,
        race: 'zerg',
        difficulty: 'easy',
        aggression: 'medium',
        attackWaves: [
          { time: 60, units: [{ type: 'zergling', count: 6 }] },
          { time: 180, units: [{ type: 'zergling', count: 10 }, { type: 'hydralisk', count: 2 }] },
          { time: 300, units: [{ type: 'zergling', count: 12 }, { type: 'hydralisk', count: 4 }] },
          { time: 480, units: [{ type: 'zergling', count: 15 }, { type: 'hydralisk', count: 6 }, { type: 'ultralisk', count: 1 }] },
        ],
      },

      cameraStart: [20, 25],

      scoring: { timeLimit: 600, maxLoss: 15, threeStarScore: 1500, twoStarScore: 1000 },
      rewards: { units: ['firebat'], techs: ['armored_plating'] },

      script: [
        { type: 'dialog', speaker: 'Matt Horner', portrait: 'horner',
          text: '紧急警报！我们侦测到Zerg的Nydus管道正在基地北方展开！' },
        { type: 'dialog', speaker: 'Jim Raynor', portrait: 'raynor',
          text: '该死，虫子又来了。所有人准备战斗！' },
        { type: 'objective', id: 'defend_base', text: '保护你的基地不被摧毁',
          condition: 'building_completed',
          conditionParams: { buildingType: 'command_center', team: 1 } },
        { type: 'objective', id: 'kill_enemies', text: '消灭所有虫族入侵者',
          condition: 'enemy_eliminated',
          conditionParams: { enemyTeam: 2 } },
        { type: 'timer', duration: 55, then: [
          { type: 'dialog', speaker: 'Matt Horner', portrait: 'horner',
            text: '注意，雷达显示第一波虫群即将到达！' },
          { type: 'spawn', unit: 'zergling', pos: [20, 5], team: 2, count: 6 },
        ] },
        { type: 'timer', duration: 170, then: [
          { type: 'dialog', speaker: 'Matt Horner', portrait: 'horner',
            text: '更强大的Hydralisk加入了战斗！注意保护你的机枪兵！' },
          { type: 'spawn', unit: 'zergling', pos: [25, 5], team: 2, count: 10 },
          { type: 'spawn', unit: 'hydralisk', pos: [20, 3], team: 2, count: 2 },
        ] },
        { type: 'timer', duration: 290, then: [
          { type: 'dialog', speaker: 'Jim Raynor', portrait: 'raynor',
            text: '他们还没放弃？加强防线！' },
          { type: 'spawn', unit: 'zergling', pos: [15, 5], team: 2, count: 12 },
          { type: 'spawn', unit: 'hydralisk', pos: [20, 3], team: 2, count: 4 },
        ] },
        { type: 'timer', duration: 470, then: [
          { type: 'dialog', speaker: 'Matt Horner', portrait: 'horner',
            text: '天哪...巨型雷兽！所有火力集中攻击！' },
          { type: 'spawn', unit: 'ultralisk', pos: [20, 5], team: 2, count: 1 },
          { type: 'spawn', unit: 'zergling', pos: [18, 8], team: 2, count: 15 },
          { type: 'spawn', unit: 'hydralisk', pos: [22, 6], team: 2, count: 6 },
          { type: 'reinforcement', text: '增援部队到达！', units: [
            { type: 'marine', pos: [10, 25], team: 1 },
            { type: 'marine', pos: [11, 25], team: 1 },
            { type: 'marine', pos: [12, 25], team: 1 },
            { type: 'marine', pos: [13, 25], team: 1 },
            { type: 'firebat', pos: [10, 26], team: 1 },
          ] },
        ] },
        { type: 'defeat_condition', condition: 'building_destroyed',
          params: { buildingType: 'command_center', team: 1 } },
      ],
    },

    // ─────────────────────────────────
    // 关卡3：重逢（与Raynor汇合）
    // ─────────────────────────────────
    {
      id: 'terran_03',
      name: '重逢',
      subtitle: '叛军的集结',
      description: '与Jim Raynor的叛军汇合，穿越敌占区。你需要找到Raynor的据点，然后一起对抗帝国的围剿部队。',
      difficulty: 'normal',
      estimatedTime: 1200,

      map: {
        name: '荒芜之地',
        size: 96,
        terrain: 'wasteland',
        features: [
          { type: 'minerals', pos: [10, 45], amount: 6000 },
          { type: 'minerals', pos: [14, 48], amount: 6000 },
          { type: 'gas', pos: [12, 42], amount: 3000 },
          { type: 'minerals', pos: [70, 50], amount: 8000 },
          { type: 'gas', pos: [75, 55], amount: 4000 },
        ],
      },

      startingResources: { minerals: 150, gas: 0 },

      initialUnits: [
        { type: 'marine', pos: [8, 48], team: 1 },
        { type: 'marine', pos: [9, 48], team: 1 },
        { type: 'marine', pos: [10, 48], team: 1 },
        { type: 'firebat', pos: [11, 48], team: 1 },
        { type: 'scv', pos: [10, 50], team: 1 },
        { type: 'scv', pos: [11, 50], team: 1 },
      ],

      initialBuildings: [
        { type: 'command_center', pos: [10, 50], team: 1, complete: true },
        { type: 'barracks', pos: [14, 50], team: 1, complete: true },
      ],

      aiConfig: {
        team: 2,
        race: 'terran',
        difficulty: 'normal',
        aggression: 'medium',
        basePosition: [70, 50],
        attackWaves: [
          { time: 120, units: [{ type: 'marine', count: 4 }, { type: 'firebat', count: 2 }] },
          { time: 300, units: [{ type: 'marine', count: 6 }, { type: 'siege_tank', count: 1 }] },
          { time: 600, units: [{ type: 'marine', count: 8 }, { type: 'goliath', count: 2 }, { type: 'siege_tank', count: 2 }] },
        ],
      },

      cameraStart: [10, 48],

      scoring: { timeLimit: 900, maxLoss: 20, threeStarScore: 1800, twoStarScore: 1200 },
      rewards: { units: ['siege_tank'], techs: ['siege_mode'] },

      script: [
        { type: 'dialog', speaker: 'Jim Raynor', portrait: 'raynor',
          text: '这里是Raynor，收到吗？叛军基地在地图东侧。你需要穿越帝国的封锁线。' },
        { type: 'dialog', speaker: 'Matt Horner', portrait: 'horner',
          text: '明白，Raynor。我们会一路打过去与你汇合。' },
        { type: 'objective', id: 'reach_raynor', text: '移动部队到达Raynor的基地',
          condition: 'unit_arrived',
          conditionParams: { pos: [70, 50], radius: 5, team: 1 } },
        { type: 'objective', id: 'build_army', text: '建立至少12个战斗单位',
          condition: 'unit_count',
          conditionParams: { team: 1, minCount: 12 } },
        { type: 'timer', duration: 110, then: [
          { type: 'dialog', speaker: 'Matt Horner', portrait: 'horner',
            text: '帝国巡逻队发现了我们！准备战斗！' },
          { type: 'spawn', unit: 'marine', pos: [30, 45], team: 2, count: 4 },
          { type: 'spawn', unit: 'firebat', pos: [32, 47], team: 2, count: 2 },
        ] },
        { type: 'timer', duration: 290, then: [
          { type: 'dialog', speaker: 'Matt Horner', portrait: 'horner',
            text: '帝国坦克阵地！小心攻城坦克的远程炮火！' },
          { type: 'spawn', unit: 'marine', pos: [50, 48], team: 2, count: 6 },
          { type: 'spawn', unit: 'siege_tank', pos: [55, 50], team: 2, count: 1 },
        ] },
        { type: 'trigger',
          condition: { type: 'unit_arrived', pos: [70, 50], radius: 5, team: 1 },
          then: [
            { type: 'dialog', speaker: 'Jim Raynor', portrait: 'raynor',
              text: '终于等到你们了！叛军基地现在由你来指挥。' },
            { type: 'reinforcement', text: 'Raynor的叛军加入了你的部队！', units: [
              { type: 'marine', pos: [68, 48], team: 1 },
              { type: 'marine', pos: [69, 48], team: 1 },
              { type: 'marine', pos: [70, 48], team: 1 },
              { type: 'marine', pos: [71, 48], team: 1 },
              { type: 'firebat', pos: [72, 48], team: 1 },
              { type: 'medic', pos: [73, 48], team: 1 },
            ] },
            { type: 'objective', id: 'eliminate_empire', text: '消灭帝国所有部队',
              condition: 'enemy_eliminated',
              conditionParams: { enemyTeam: 2 } },
          ] },
        { type: 'defeat_condition', condition: 'building_destroyed',
          params: { buildingType: 'command_center', team: 1 } },
      ],
    },

    // ─────────────────────────────────
    // 关卡4：秘密行动（Ghost特种作战）
    // ─────────────────────────────────
    {
      id: 'terran_04',
      name: '秘密行动',
      subtitle: '幽灵的影子',
      description: '派遣Ghost特工潜入帝国核心设施，窃取机密情报。利用隐形单位和战术核弹完成这个不可能的任务。',
      difficulty: 'hard',
      estimatedTime: 900,

      map: {
        name: '帝国要塞',
        size: 80,
        terrain: 'space_platform',
        features: [
          { type: 'minerals', pos: [15, 60], amount: 5000 },
          { type: 'gas', pos: [18, 58], amount: 3000 },
        ],
      },

      startingResources: { minerals: 300, gas: 100 },

      initialUnits: [
        { type: 'ghost', pos: [12, 62], team: 1 },
        { type: 'ghost', pos: [13, 62], team: 1 },
        { type: 'marine', pos: [14, 62], team: 1 },
        { type: 'marine', pos: [15, 62], team: 1 },
        { type: 'medic', pos: [16, 62], team: 1 },
        { type: 'scv', pos: [15, 65], team: 1 },
      ],

      initialBuildings: [
        { type: 'command_center', pos: [15, 65], team: 1, complete: true },
        { type: 'barracks', pos: [19, 65], team: 1, complete: true },
        { type: 'academy', pos: [15, 68], team: 1, complete: true },
      ],

      aiConfig: {
        team: 2,
        race: 'terran',
        difficulty: 'hard',
        aggression: 'high',
        defense: true, // 敌方以防守为主
      },

      cameraStart: [12, 62],

      scoring: { timeLimit: 600, maxLoss: 8, threeStarScore: 2000, twoStarScore: 1400 },
      rewards: { units: ['wraith'], techs: ['cloaking_field'] },

      script: [
        { type: 'dialog', speaker: 'Jim Raynor', portrait: 'raynor',
          text: '这次任务需要隐秘行动。你的Ghost特工可以进入隐形状态。' },
        { type: 'dialog', speaker: 'Jim Raynor', portrait: 'raynor',
          text: '帝国的传感器塔可以探测隐形单位。找到并摧毁它们，然后用核弹摧毁指挥中心。' },
        { type: 'objective', id: 'destroy_sensors', text: '摧毁帝国的传感器塔',
          condition: 'building_destroyed',
          conditionParams: { buildingType: 'sensor_tower', team: 2 } },
        { type: 'objective', id: 'nuke_command', text: '用核弹摧毁帝国指挥中心',
          condition: 'building_destroyed',
          conditionParams: { buildingType: 'command_center', team: 2 } },
        { type: 'dialog', speaker: 'Jim Raynor', portrait: 'raynor',
          text: 'Ghost可以按Cloak键进入隐形状态。注意，隐形会消耗能量。' },
        { type: 'spawn', unit: 'sensor_tower', pos: [50, 30], team: 2, count: 1 },
        { type: 'spawn', unit: 'turret', pos: [48, 32], team: 2, count: 2 },
        { type: 'spawn', unit: 'marine', pos: [50, 28], team: 2, count: 6 },
        { type: 'trigger',
          condition: { type: 'building_destroyed', buildingType: 'sensor_tower', team: 2 },
          then: [
            { type: 'dialog', speaker: 'Jim Raynor', portrait: 'raynor',
              text: '传感器塔已被摧毁！现在Ghost可以安全隐形前进了。' },
          ] },
        { type: 'trigger',
          condition: { type: 'building_destroyed', buildingType: 'command_center', team: 2 },
          then: [
            { type: 'dialog', speaker: 'Jim Raynor', portrait: 'raynor',
              text: '核弹命中目标！帝国指挥中心被摧毁了！任务完成！' },
          ] },
        { type: 'defeat_condition', condition: 'building_destroyed',
          params: { buildingType: 'command_center', team: 1 } },
      ],
    },

    // ─────────────────────────────────
    // 关卡5：终极决战（全单位大决战）
    // ─────────────────────────────────
    {
      id: 'terran_05',
      name: '终极决战',
      subtitle: '最后的防线',
      description: '虫族大军压境！集合所有可用兵力，发起最后的反击。这是人类最后的机会——不成功，便成仁。',
      difficulty: 'very_hard',
      estimatedTime: 1800,

      map: {
        name: '末日战场',
        size: 128,
        terrain: 'volcanic',
        features: [
          { type: 'minerals', pos: [30, 90], amount: 10000 },
          { type: 'minerals', pos: [35, 95], amount: 10000 },
          { type: 'minerals', pos: [40, 92], amount: 10000 },
          { type: 'gas', pos: [32, 88], amount: 5000 },
          { type: 'gas', pos: [38, 90], amount: 5000 },
          { type: 'minerals', pos: [90, 20], amount: 15000 },
          { type: 'gas', pos: [95, 25], amount: 8000 },
        ],
      },

      startingResources: { minerals: 500, gas: 200 },

      initialUnits: [
        { type: 'marine', pos: [28, 92], team: 1 },
        { type: 'marine', pos: [29, 92], team: 1 },
        { type: 'marine', pos: [30, 92], team: 1 },
        { type: 'marine', pos: [31, 92], team: 1 },
        { type: 'firebat', pos: [28, 94], team: 1 },
        { type: 'firebat', pos: [29, 94], team: 1 },
        { type: 'medic', pos: [30, 94], team: 1 },
        { type: 'medic', pos: [31, 94], team: 1 },
        { type: 'goliath', pos: [32, 92], team: 1 },
        { type: 'scv', pos: [30, 97], team: 1 },
        { type: 'scv', pos: [31, 97], team: 1 },
        { type: 'scv', pos: [32, 97], team: 1 },
        { type: 'scv', pos: [33, 97], team: 1 },
      ],

      initialBuildings: [
        { type: 'command_center', pos: [30, 100], team: 1, complete: true },
        { type: 'barracks', pos: [25, 100], team: 1, complete: true },
        { type: 'factory', pos: [35, 100], team: 1, complete: true },
        { type: 'supply_depot', pos: [22, 100], team: 1, complete: true },
        { type: 'supply_depot', pos: [38, 100], team: 1, complete: true },
      ],

      aiConfig: {
        team: 2,
        race: 'zerg',
        difficulty: 'hard',
        aggression: 'extreme',
        basePosition: [90, 20],
        attackWaves: [
          { time: 60, units: [{ type: 'zergling', count: 20 }, { type: 'hydralisk', count: 5 }] },
          { time: 180, units: [{ type: 'zergling', count: 25 }, { type: 'hydralisk', count: 10 }, { type: 'mutalisk', count: 5 }] },
          { time: 360, units: [{ type: 'zergling', count: 30 }, { type: 'hydralisk', count: 15 }, { type: 'lurker', count: 5 }] },
          { time: 600, units: [{ type: 'ultralisk', count: 3 }, { type: 'defiler', count: 2 }, { type: 'zergling', count: 20 }] },
          { time: 900, units: [{ type: 'brood_lord', count: 2 }, { type: 'ultralisk', count: 5 }, { type: 'hydralisk', count: 20 }] },
        ],
      },

      cameraStart: [30, 92],

      scoring: { timeLimit: 1200, maxLoss: 40, threeStarScore: 3000, twoStarScore: 2000 },
      rewards: { units: ['battlecruiser'], techs: ['yamato_cannon'] },

      script: [
        { type: 'dialog', speaker: 'Jim Raynor', portrait: 'raynor',
          text: '这是最后的决战了，兄弟们。虫族的主力就在北方。' },
        { type: 'dialog', speaker: 'Matt Horner', portrait: 'horner',
          text: '所有可用的兵力都已经集结。Battlecruiser也已就位。' },
        { type: 'dialog', speaker: 'Jim Raynor', portrait: 'raynor',
          text: '我们没有退路。集合所有兵力，向北推进，摧毁虫族基地！' },
        { type: 'objective', id: 'build_forces', text: '建立至少30个战斗单位',
          condition: 'unit_count',
          conditionParams: { team: 1, minCount: 30 } },
        { type: 'objective', id: 'destroy_zerg', text: '摧毁虫族基地',
          condition: 'building_destroyed',
          conditionParams: { buildingType: 'hatchery', team: 2 } },
        { type: 'timer', duration: 55, then: [
          { type: 'dialog', speaker: 'Matt Horner', portrait: 'horner',
            text: '雷达侦测到大规模虫群移动！他们来了！' },
          { type: 'spawn', unit: 'zergling', pos: [85, 40], team: 2, count: 20 },
          { type: 'spawn', unit: 'hydralisk', pos: [80, 35], team: 2, count: 5 },
        ] },
        { type: 'timer', duration: 175, then: [
          { type: 'spawn', unit: 'mutalisk', pos: [85, 30], team: 2, count: 5 },
          { type: 'spawn', unit: 'zergling', pos: [82, 42], team: 2, count: 25 },
          { type: 'spawn', unit: 'hydralisk', pos: [78, 38], team: 2, count: 10 },
        ] },
        { type: 'timer', duration: 350, then: [
          { type: 'dialog', speaker: 'Matt Horner', portrait: 'horner',
            text: '他们派出了潜伏者！需要反隐形单位！' },
          { type: 'spawn', unit: 'lurker', pos: [80, 45], team: 2, count: 5 },
          { type: 'spawn', unit: 'zergling', pos: [85, 42], team: 2, count: 30 },
          { type: 'spawn', unit: 'hydralisk', pos: [82, 38], team: 2, count: 15 },
        ] },
        { type: 'timer', duration: 590, then: [
          { type: 'dialog', speaker: 'Jim Raynor', portrait: 'raynor',
            text: '巨型雷兽和蝎子！他们倾巢而出了！' },
          { type: 'spawn', unit: 'ultralisk', pos: [85, 40], team: 2, count: 3 },
          { type: 'spawn', unit: 'defiler', pos: [90, 35], team: 2, count: 2 },
          { type: 'reinforcement', text: 'Battlecruiser增援到达！', units: [
            { type: 'battlecruiser', pos: [30, 85], team: 1 },
            { type: 'battlecruiser', pos: [35, 85], team: 1 },
          ] },
        ] },
        { type: 'timer', duration: 890, then: [
          { type: 'dialog', speaker: 'Jim Raynor', portrait: 'raynor',
            text: '这是他们最后的力量了！全军突击！' },
          { type: 'spawn', unit: 'brood_lord', pos: [85, 30], team: 2, count: 2 },
          { type: 'spawn', unit: 'ultralisk', pos: [80, 40], team: 2, count: 5 },
          { type: 'spawn', unit: 'hydralisk', pos: [85, 35], team: 2, count: 20 },
        ] },
        { type: 'defeat_condition', condition: 'building_destroyed',
          params: { buildingType: 'command_center', team: 1 } },
      ],
    },
  ],
};
