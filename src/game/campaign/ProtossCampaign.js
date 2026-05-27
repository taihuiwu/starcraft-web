// ═══════════════════════════════════════════
// StarCraft Web - 神族战役数据 (ProtossCampaign)
// 5个关卡：从流亡到夺回艾尔
// 以神族视角叙述，涵盖护盾、仲裁者、航母等特色
// ═══════════════════════════════════════════

export const PROTOSS_CAMPAIGN = {
  id: 'protoss',
  name: '神族战役',
  nameEn: 'Protoss Campaign',
  subtitle: '艾尔的遗产',
  description: '作为神族指挥官，你将带领族人夺回被虫族侵占的家园。护盾、灵能和远古科技是你最强的武器。',
  icon: '⚡',
  difficulty: 'normal',

  globalRewards: {
    units: ['dark_archon'],
    techs: ['khaydarin_amulet'],
  },

  missions: [
    // ─────────────────────────────────
    // 关卡1：流亡者（基础教学）
    // ─────────────────────────────────
    {
      id: 'protoss_01',
      name: '流亡者',
      subtitle: '异星的希望',
      description: '你的舰队迫降在这颗未知的星球上。探机已经就位，但你需要建立基地来保护幸存者。',
      difficulty: 'easy',
      estimatedTime: 600,

      map: {
        name: '流亡之地',
        size: 64,
        terrain: 'temple',
        features: [
          { type: 'minerals', pos: [12, 18], amount: 5000 },
          { type: 'minerals', pos: [15, 20], amount: 5000 },
          { type: 'gas', pos: [18, 16], amount: 2500 },
        ],
      },

      startingResources: { minerals: 100, gas: 0 },

      initialUnits: [
        { type: 'probe', pos: [10, 20], team: 1 },
        { type: 'probe', pos: [11, 20], team: 1 },
        { type: 'probe', pos: [12, 20], team: 1 },
        { type: 'zealot', pos: [10, 16], team: 1 },
        { type: 'zealot', pos: [11, 16], team: 1 },
      ],

      initialBuildings: [
        { type: 'nexus', pos: [10, 22], team: 1, complete: true },
      ],

      aiConfig: null,
      cameraStart: [10, 18],

      scoring: { timeLimit: 300, maxLoss: 0, threeStarScore: 1200, twoStarScore: 800 },
      rewards: { units: ['dragoon'], techs: ['singularity_charge'] },

      script: [
        { type: 'dialog', speaker: 'Zeratul', portrait: 'zeratul',
          text: '年轻的指挥官，我们的舰队在与虫族的战斗中受损严重。' },
        { type: 'dialog', speaker: 'Zeratul', portrait: 'zeratul',
          text: '在这颗星球上重新建立我们的基地。水晶矿是构建能量场的基础。' },
        { type: 'camera_move', pos: [15, 18], duration: 2 },
        { type: 'dialog', speaker: 'Zeratul', portrait: 'zeratul',
          text: '派遣探机去采集水晶矿。它们是神族建筑的能量来源。' },
        { type: 'objective', id: 'gather_minerals', text: '采集100水晶矿',
          condition: 'resource_collected',
          conditionParams: { resource: 'minerals', amount: 100, team: 1 } },
        { type: 'objective', id: 'build_gateway', text: '建造传送门',
          condition: 'building_completed',
          conditionParams: { buildingType: 'gateway', team: 1 }, optional: true },
        { type: 'trigger',
          condition: { type: 'resource_collected', resource: 'minerals', amount: 100, team: 1 },
          then: [
            { type: 'dialog', speaker: 'Zeratul', portrait: 'zeratul',
              text: '很好。现在建造传送门来训练狂热者。' },
          ] },
        { type: 'trigger',
          condition: { type: 'building_completed', buildingType: 'gateway', team: 1 },
          then: [
            { type: 'dialog', speaker: 'Zeratul', portrait: 'zeratul',
              text: '传送门已就绪。你可以在这里训练狂热者——神族最忠诚的战士。' },
            { type: 'objective', id: 'train_zealots', text: '训练4个狂热者',
              condition: 'unit_count',
              conditionParams: { unitType: 'zealot', team: 1, minCount: 4 } },
          ] },
        { type: 'trigger',
          condition: { type: 'unit_count', unitType: 'zealot', team: 1, minCount: 4 },
          then: [
            { type: 'dialog', speaker: 'Zeratul', portrait: 'zeratul',
              text: '很好，神族的力量正在恢复。继续壮大你的部队。' },
            { type: 'victory_condition', condition: 'time_elapsed', params: { seconds: 120 } },
          ] },
      ],
    },

    // ─────────────────────────────────
    // 关卡2：护盾之光（防御战）
    // ─────────────────────────────────
    {
      id: 'protoss_02',
      name: '护盾之光',
      subtitle: '光子炮的守护',
      description: '虫族发现了你的基地！建造光子炮防御阵地，用护盾和光子炮击退虫群的进攻。',
      difficulty: 'normal',
      estimatedTime: 900,

      map: {
        name: '能量之塔',
        size: 80,
        terrain: 'temple',
        features: [
          { type: 'minerals', pos: [18, 55], amount: 8000 },
          { type: 'minerals', pos: [21, 58], amount: 8000 },
          { type: 'gas', pos: [24, 52], amount: 4000 },
        ],
      },

      startingResources: { minerals: 200, gas: 0 },

      initialUnits: [
        { type: 'probe', pos: [18, 58], team: 1 },
        { type: 'probe', pos: [19, 58], team: 1 },
        { type: 'probe', pos: [20, 58], team: 1 },
        { type: 'zealot', pos: [18, 54], team: 1 },
        { type: 'zealot', pos: [19, 54], team: 1 },
        { type: 'zealot', pos: [20, 54], team: 1 },
      ],

      initialBuildings: [
        { type: 'nexus', pos: [20, 60], team: 1, complete: true },
        { type: 'pylon', pos: [16, 58], team: 1, complete: true },
        { type: 'gateway', pos: [24, 60], team: 1, complete: true },
      ],

      aiConfig: {
        team: 2,
        race: 'zerg',
        difficulty: 'easy',
        aggression: 'medium',
        attackWaves: [
          { time: 60, units: [{ type: 'zergling', count: 8 }] },
          { time: 180, units: [{ type: 'zergling', count: 12 }, { type: 'hydralisk', count: 3 }] },
          { time: 360, units: [{ type: 'zergling', count: 15 }, { type: 'hydralisk', count: 6 }, { type: 'ultralisk', count: 1 }] },
        ],
      },

      cameraStart: [18, 55],

      scoring: { timeLimit: 600, maxLoss: 10, threeStarScore: 1500, twoStarScore: 1000 },
      rewards: { units: ['high_templar'], techs: ['psionic_storm'] },

      script: [
        { type: 'dialog', speaker: 'Zeratul', portrait: 'zeratul',
          text: '虫族的侦查者发现了我们的位置。它们来了！' },
        { type: 'dialog', speaker: 'Zeratul', portrait: 'zeratul',
          text: '建造光子炮来防御基地。在水晶塔的能量场内才能建造建筑。' },
        { type: 'objective', id: 'build_cannons', text: '建造3个光子炮',
          condition: 'unit_count',
          conditionParams: { unitType: 'photon_cannon', team: 1, minCount: 3 } },
        { type: 'objective', id: 'defend_nexus', text: '保护基地核心',
          condition: 'building_completed',
          conditionParams: { buildingType: 'nexus', team: 1 } },
        { type: 'timer', duration: 55, then: [
          { type: 'dialog', speaker: 'Zeratul', portrait: 'zeratul',
            text: '第一波虫群即将到来！' },
          { type: 'spawn', unit: 'zergling', pos: [40, 40], team: 2, count: 8 },
        ] },
        { type: 'timer', duration: 175, then: [
          { type: 'dialog', speaker: 'Zeratul', portrait: 'zeratul',
            text: '更多Hydralisk加入了战斗。它们的远程攻击很危险！' },
          { type: 'spawn', unit: 'zergling', pos: [42, 38], team: 2, count: 12 },
          { type: 'spawn', unit: 'hydralisk', pos: [38, 42], team: 2, count: 3 },
        ] },
        { type: 'timer', duration: 355, then: [
          { type: 'dialog', speaker: 'Zeratul', portrait: 'zeratul',
            text: '巨型雷兽！护盾可以抵挡它们的攻击，但不要掉以轻心！' },
          { type: 'spawn', unit: 'ultralisk', pos: [40, 40], team: 2, count: 1 },
          { type: 'spawn', unit: 'zergling', pos: [38, 38], team: 2, count: 15 },
          { type: 'spawn', unit: 'hydralisk', pos: [42, 42], team: 2, count: 6 },
          { type: 'reinforcement', text: '增援部队传送到达！', units: [
            { type: 'zealot', pos: [16, 56], team: 1 },
            { type: 'zealot', pos: [17, 56], team: 1 },
            { type: 'zealot', pos: [18, 56], team: 1 },
            { type: 'dragoon', pos: [19, 56], team: 1 },
          ] },
        ] },
        { type: 'defeat_condition', condition: 'building_destroyed',
          params: { buildingType: 'nexus', team: 1 } },
      ],
    },

    // ─────────────────────────────────
    // 关卡3：仲裁者（高级单位战）
    // ─────────────────────────────────
    {
      id: 'protoss_03',
      name: '仲裁者',
      subtitle: '时空的力量',
      description: '仲裁者被神族议会授予了操控时空的能力。利用仲裁者的召回和冰冻技能来对抗人族的机械化部队。',
      difficulty: 'hard',
      estimatedTime: 1200,

      map: {
        name: '时空裂隙',
        size: 96,
        terrain: 'ice',
        features: [
          { type: 'minerals', pos: [15, 75], amount: 8000 },
          { type: 'minerals', pos: [18, 78], amount: 8000 },
          { type: 'gas', pos: [20, 72], amount: 5000 },
          { type: 'minerals', pos: [70, 30], amount: 12000 },
          { type: 'gas', pos: [75, 25], amount: 6000 },
        ],
      },

      startingResources: { minerals: 300, gas: 150 },

      initialUnits: [
        { type: 'probe', pos: [14, 76], team: 1 },
        { type: 'probe', pos: [15, 76], team: 1 },
        { type: 'probe', pos: [16, 76], team: 1 },
        { type: 'zealot', pos: [14, 72], team: 1 },
        { type: 'zealot', pos: [15, 72], team: 1 },
        { type: 'dragoon', pos: [16, 72], team: 1 },
        { type: 'dragoon', pos: [17, 72], team: 1 },
        { type: 'high_templar', pos: [18, 72], team: 1 },
      ],

      initialBuildings: [
        { type: 'nexus', pos: [15, 80], team: 1, complete: true },
        { type: 'pylon', pos: [11, 78], team: 1, complete: true },
        { type: 'gateway', pos: [19, 80], team: 1, complete: true },
        { type: 'cybernetics_core', pos: [11, 82], team: 1, complete: true },
        { type: 'forge', pos: [22, 80], team: 1, complete: true },
      ],

      aiConfig: {
        team: 2,
        race: 'terran',
        difficulty: 'normal',
        aggression: 'high',
        basePosition: [70, 30],
        attackWaves: [
          { time: 120, units: [{ type: 'marine', count: 6 }, { type: 'firebat', count: 2 }] },
          { time: 300, units: [{ type: 'marine', count: 8 }, { type: 'siege_tank', count: 2 }, { type: 'goliath', count: 3 }] },
          { time: 600, units: [{ type: 'marine', count: 10 }, { type: 'siege_tank', count: 4 }, { type: 'wraith', count: 3 }] },
        ],
      },

      cameraStart: [15, 75],

      scoring: { timeLimit: 900, maxLoss: 12, threeStarScore: 2000, twoStarScore: 1400 },
      rewards: { units: ['arbiter'], techs: ['recall'] },

      script: [
        { type: 'dialog', speaker: 'Zeratul', portrait: 'zeratul',
          text: '仲裁者已经准备就绪。她们拥有操控时空的神圣力量。' },
        { type: 'dialog', speaker: 'Zeratul', portrait: 'zeratul',
          text: '冰冻力场可以冻结敌方单位，召回可以将友军传送到仲裁者身边。' },
        { type: 'objective', id: 'build_army', text: '建立至少20个战斗单位',
          condition: 'unit_count',
          conditionParams: { team: 1, minCount: 20 } },
        { type: 'objective', id: 'destroy_terran', text: '摧毁人族基地',
          condition: 'building_destroyed',
          conditionParams: { buildingType: 'command_center', team: 2 } },
        { type: 'timer', duration: 115, then: [
          { type: 'dialog', speaker: 'Zeratul', portrait: 'zeratul',
            text: '人族的侦察队发现了我们。准备迎战！' },
          { type: 'spawn', unit: 'marine', pos: [40, 50], team: 2, count: 6 },
          { type: 'spawn', unit: 'firebat', pos: [42, 52], team: 2, count: 2 },
        ] },
        { type: 'timer', duration: 295, then: [
          { type: 'dialog', speaker: 'Zeratul', portrait: 'zeratul',
            text: '人族的机械化部队来了！用仲裁者的冰冻力场对付坦克！' },
          { type: 'spawn', unit: 'marine', pos: [50, 40], team: 2, count: 8 },
          { type: 'spawn', unit: 'siege_tank', pos: [55, 38], team: 2, count: 2 },
          { type: 'spawn', unit: 'goliath', pos: [52, 42], team: 2, count: 3 },
        ] },
        { type: 'timer', duration: 595, then: [
          { type: 'dialog', speaker: 'Zeratul', portrait: 'zeratul',
            text: '人族派出了空中单位！Dragoon的对空攻击至关重要！' },
          { type: 'spawn', unit: 'wraith', pos: [60, 30], team: 2, count: 3 },
          { type: 'spawn', unit: 'siege_tank', pos: [58, 35], team: 2, count: 4 },
          { type: 'reinforcement', text: '仲裁者增援到达！', units: [
            { type: 'arbiter', pos: [15, 70], team: 1 },
            { type: 'carrier', pos: [18, 70], team: 1 },
          ] },
        ] },
        { type: 'defeat_condition', condition: 'building_destroyed',
          params: { buildingType: 'nexus', team: 1 } },
      ],
    },

    // ─────────────────────────────────
    // 关卡4：暗影之刃（黑暗圣堂武士）
    // ─────────────────────────────────
    {
      id: 'protoss_04',
      name: '暗影之刃',
      subtitle: '黑暗中的利刃',
      description: '黑暗圣堂武士Zeratul将亲自率领隐形单位执行斩首任务。利用黑暗圣堂武士的隐形能力，暗杀敌方关键目标。',
      difficulty: 'hard',
      estimatedTime: 900,

      map: {
        name: '黑暗深渊',
        size: 80,
        terrain: 'space_platform',
        features: [
          { type: 'minerals', pos: [12, 65], amount: 6000 },
          { type: 'gas', pos: [15, 62], amount: 3000 },
          { type: 'minerals', pos: [60, 20], amount: 10000 },
        ],
      },

      startingResources: { minerals: 250, gas: 100 },

      initialUnits: [
        { type: 'dark Templar', pos: [10, 66], team: 1 },
        { type: 'dark Templar', pos: [11, 66], team: 1 },
        { type: 'zealot', pos: [12, 66], team: 1 },
        { type: 'zealot', pos: [13, 66], team: 1 },
        { type: 'high_templar', pos: [14, 66], team: 1 },
        { type: 'probe', pos: [12, 68], team: 1 },
      ],

      initialBuildings: [
        { type: 'nexus', pos: [12, 70], team: 1, complete: true },
        { type: 'pylon', pos: [8, 68], team: 1, complete: true },
        { type: 'gateway', pos: [16, 70], team: 1, complete: true },
        { type: 'citadel_of_adun', pos: [8, 72], team: 1, complete: true },
        { type: 'templar_archives', pos: [16, 72], team: 1, complete: true },
      ],

      aiConfig: {
        team: 2,
        race: 'terran',
        difficulty: 'normal',
        aggression: 'medium',
        defense: true,
        basePosition: [60, 20],
      },

      cameraStart: [10, 65],

      scoring: { timeLimit: 600, maxLoss: 6, threeStarScore: 1800, twoStarScore: 1200 },
      rewards: { units: ['dark_archon'], techs: ['maelstrom'] },

      script: [
        { type: 'dialog', speaker: 'Zeratul', portrait: 'zeratul',
          text: '暗影之刃将切入敌人心脏。黑暗圣堂武士的隐形能力是我们的优势。' },
        { type: 'dialog', speaker: 'Zeratul', portrait: 'zeratul',
          text: '人族的防空塔和科学球可以侦测隐形单位。优先摧毁它们。' },
        { type: 'objective', id: 'destroy_turrets', text: '摧毁敌方防空塔',
          condition: 'building_destroyed',
          conditionParams: { buildingType: 'turret', team: 2 } },
        { type: 'objective', id: 'destroy_command', text: '摧毁人族指挥中心',
          condition: 'building_destroyed',
          conditionParams: { buildingType: 'command_center', team: 2 } },
        { type: 'dialog', speaker: 'Zeratul', portrait: 'zeratul',
          text: '黑暗圣堂武士可以永久隐形。利用这一点来渗透敌方防线。' },
        { type: 'spawn', unit: 'turret', pos: [45, 35], team: 2, count: 3 },
        { type: 'spawn', unit: 'marine', pos: [50, 30], team: 2, count: 6 },
        { type: 'spawn', unit: 'turret', pos: [58, 22], team: 2, count: 2 },
        { type: 'trigger',
          condition: { type: 'building_destroyed', buildingType: 'turret', team: 2 },
          then: [
            { type: 'dialog', speaker: 'Zeratul', portrait: 'zeratul',
              text: '防空塔已被摧毁。我们的黑暗圣堂武士现在可以安全行动了。' },
          ] },
        { type: 'trigger',
          condition: { type: 'building_destroyed', buildingType: 'command_center', team: 2 },
          then: [
            { type: 'dialog', speaker: 'Zeratul', portrait: 'zeratul',
              text: '斩首行动成功！人族指挥中心已被摧毁。' },
          ] },
        { type: 'timer', duration: 300, then: [
          { type: 'dialog', speaker: 'Zeratul', portrait: 'zeratul',
            text: '人族派出了科学球来侦测我们的隐形单位！' },
          { type: 'spawn', unit: 'science_vessel', pos: [55, 25], team: 2, count: 2 },
          { type: 'spawn', unit: 'marine', pos: [58, 28], team: 2, count: 8 },
        ] },
        { type: 'defeat_condition', condition: 'building_destroyed',
          params: { buildingType: 'nexus', team: 1 } },
      ],
    },

    // ─────────────────────────────────
    // 关卡5：夺回艾尔（终极决战）
    // ─────────────────────────────────
    {
      id: 'protoss_05',
      name: '夺回艾尔',
      subtitle: '艾尔的黎明',
      description: '最终之战！夺回被虫族侵占的家园艾尔。集结所有神族力量——狂热者、龙骑士、仲裁者、航母——发起最后的冲锋！',
      difficulty: 'very_hard',
      estimatedTime: 1800,

      map: {
        name: '艾尔圣域',
        size: 128,
        terrain: 'temple',
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
        { type: 'probe', pos: [22, 100], team: 1 },
        { type: 'probe', pos: [23, 100], team: 1 },
        { type: 'probe', pos: [24, 100], team: 1 },
        { type: 'zealot', pos: [22, 96], team: 1 },
        { type: 'zealot', pos: [23, 96], team: 1 },
        { type: 'zealot', pos: [24, 96], team: 1 },
        { type: 'dragoon', pos: [25, 96], team: 1 },
        { type: 'dragoon', pos: [26, 96], team: 1 },
        { type: 'high_templar', pos: [27, 96], team: 1 },
        { type: 'dark Templar', pos: [28, 96], team: 1 },
        { type: 'arbiter', pos: [25, 94], team: 1 },
        { type: 'carrier', pos: [27, 94], team: 1 },
      ],

      initialBuildings: [
        { type: 'nexus', pos: [25, 105], team: 1, complete: true },
        { type: 'pylon', pos: [20, 103], team: 1, complete: true },
        { type: 'pylon', pos: [30, 103], team: 1, complete: true },
        { type: 'gateway', pos: [20, 105], team: 1, complete: true },
        { type: 'gateway', pos: [30, 105], team: 1, complete: true },
        { type: 'stargate', pos: [25, 108], team: 1, complete: true },
        { type: 'forge', pos: [35, 105], team: 1, complete: true },
        { type: 'citadel_of_adun', pos: [15, 105], team: 1, complete: true },
        { type: 'templar_archives', pos: [15, 108], team: 1, complete: true },
      ],

      aiConfig: {
        team: 2,
        race: 'zerg',
        difficulty: 'hard',
        aggression: 'extreme',
        basePosition: [95, 25],
        attackWaves: [
          { time: 60, units: [{ type: 'zergling', count: 20 }, { type: 'hydralisk', count: 8 }] },
          { time: 240, units: [{ type: 'zergling', count: 25 }, { type: 'hydralisk', count: 12 }, { type: 'mutalisk', count: 8 }] },
          { time: 480, units: [{ type: 'ultralisk', count: 3 }, { type: 'lurker', count: 5 }, { type: 'defiler', count: 2 }] },
          { time: 780, units: [{ type: 'brood_lord', count: 3 }, { type: 'ultralisk', count: 5 }, { type: 'guardian', count: 4 }] },
        ],
      },

      cameraStart: [25, 100],

      scoring: { timeLimit: 1200, maxLoss: 40, threeStarScore: 3000, twoStarScore: 2000 },
      rewards: { units: ['mothership'], techs: ['time_warp'] },

      script: [
        { type: 'dialog', speaker: 'Zeratul', portrait: 'zeratul',
          text: '这是我们的家园。艾尔的圣光照耀着每一寸土地。' },
        { type: 'dialog', speaker: 'Zeratul', portrait: 'zeratul',
          text: '虫族玷污了这片圣地。现在，我们将把它净化。' },
        { type: 'dialog', speaker: 'Artanis', portrait: 'artanis',
          text: '所有神族战士听令！为了艾尔！为了荣耀！' },
        { type: 'objective', id: 'build_forces', text: '建立至少35个战斗单位',
          condition: 'unit_count',
          conditionParams: { team: 1, minCount: 35 } },
        { type: 'objective', id: 'destroy_hatchery', text: '摧毁虫族主巢',
          condition: 'building_destroyed',
          conditionParams: { buildingType: 'hatchery', team: 2 } },
        { type: 'timer', duration: 55, then: [
          { type: 'dialog', speaker: 'Artanis', portrait: 'artanis',
            text: '虫群来了！准备迎战！' },
          { type: 'spawn', unit: 'zergling', pos: [80, 50], team: 2, count: 20 },
          { type: 'spawn', unit: 'hydralisk', pos: [75, 45], team: 2, count: 8 },
        ] },
        { type: 'timer', duration: 235, then: [
          { type: 'dialog', speaker: 'Zeratul', portrait: 'zeratul',
            text: '飞龙群来袭！Dragoon的对空火力是关键！' },
          { type: 'spawn', unit: 'mutalisk', pos: [85, 40], team: 2, count: 8 },
          { type: 'spawn', unit: 'zergling', pos: [78, 48], team: 2, count: 25 },
          { type: 'spawn', unit: 'hydralisk', pos: [80, 42], team: 2, count: 12 },
        ] },
        { type: 'timer', duration: 475, then: [
          { type: 'dialog', speaker: 'Artanis', portrait: 'artanis',
            text: '巨型雷兽和潜伏者！用仲裁者的冰冻力场冻结它们！' },
          { type: 'spawn', unit: 'ultralisk', pos: [82, 45], team: 2, count: 3 },
          { type: 'spawn', unit: 'lurker', pos: [78, 40], team: 2, count: 5 },
          { type: 'spawn', unit: 'defiler', pos: [85, 38], team: 2, count: 2 },
          { type: 'reinforcement', text: '航母编队增援到达！', units: [
            { type: 'carrier', pos: [22, 92], team: 1 },
            { type: 'carrier', pos: [25, 92], team: 1 },
            { type: 'arbiter', pos: [28, 92], team: 1 },
          ] },
        ] },
        { type: 'timer', duration: 775, then: [
          { type: 'dialog', speaker: 'Zeratul', portrait: 'zeratul',
            text: '这是虫群最后的挣扎。为了艾尔——冲锋！' },
          { type: 'spawn', unit: 'brood_lord', pos: [88, 30], team: 2, count: 3 },
          { type: 'spawn', unit: 'ultralisk', pos: [85, 35], team: 2, count: 5 },
          { type: 'spawn', unit: 'guardian', pos: [90, 28], team: 2, count: 4 },
          { type: 'spawn', unit: 'zergling', pos: [82, 42], team: 2, count: 30 },
        ] },
        { type: 'defeat_condition', condition: 'building_destroyed',
          params: { buildingType: 'nexus', team: 1 } },
      ],
    },
  ],
};
