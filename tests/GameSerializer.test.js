// ═══════════════════════════════════════════
// StarCraft Web - 存档序列化/迁移测试
// 测试版本迁移、压缩、损坏恢复等功能
// ═══════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest';
import GameSerializer from '../src/game/save/GameSerializer.js';

// ═══════════════════════════════════════
// 辅助函数
// ═══════════════════════════════════════

/**
 * 创建模拟的游戏管理器
 */
function createMockGameManager(overrides = {}) {
  return {
    gameTickTime: 120,
    playerRace: 'terran',
    nextUnitId: 10,
    units: [],
    buildings: [],
    resourceManager: { resources: { minerals: 500, gas: 200 } },
    techTree: { playerTechs: {} },
    fogOfWar: null,
    campaignManager: null,
    _getUnitDef: () => null,
    _getBuildingDef: () => null,
    ...overrides,
  };
}

/**
 * 创建v1格式的存档数据（缺少shield字段）
 */
function createV1SaveData() {
  return {
    version: 1,
    gameTime: 240,
    playerRace: 'terran',
    nextUnitId: 5,
    units: [
      {
        id: 1,
        type: 'marine',
        name: 'Marine',
        race: 'terran',
        team: 0,
        pos: [10, 0, 20],
        hp: 40,
        maxHp: 40,
        // 注意：v1缺少 shield, maxShield 字段
      },
    ],
    buildings: [
      {
        id: 100,
        type: 'command_center',
        name: 'Command Center',
        race: 'terran',
        team: 0,
        pos: [0, 0, 0],
        hp: 1500,
        maxHp: 1500,
        buildProgress: 1,
        isComplete: true,
      },
    ],
    resources: { minerals: 800, gas: 300 },
    tech: {},
  };
}

/**
 * 创建当前版本的存档数据
 */
function createCurrentVersionSaveData() {
  return {
    version: 2,
    gameTime: 600,
    playerRace: 'protoss',
    nextUnitId: 20,
    units: [
      {
        id: 1,
        type: 'zealot',
        name: 'Zealot',
        race: 'protoss',
        team: 0,
        pos: [5, 0, 15],
        hp: 100,
        maxHp: 100,
        shield: 50,
        maxShield: 50,
      },
    ],
    buildings: [],
    resources: { minerals: 1000, gas: 500 },
    tech: {},
  };
}

// ═══════════════════════════════════════
// 版本迁移测试
// ═══════════════════════════════════════

describe('GameSerializer - 版本迁移', () => {
  let serializer;

  beforeEach(() => {
    serializer = new GameSerializer();
  });

  describe('静态方法', () => {
    it('应返回正确的当前版本号', () => {
      expect(GameSerializer.getSaveVersion()).toBe(2);
    });

    it('应返回正确的最低支持版本', () => {
      expect(GameSerializer.getMinSupportedVersion()).toBe(1);
    });
  });

  describe('v1 → v2 迁移', () => {
    it('应正确迁移v1存档到v2（添加shield字段）', () => {
      const v1Data = createV1SaveData();
      const migrated = serializer._migrateVersion(v1Data);

      expect(migrated.version).toBe(2);
      expect(migrated.units[0].shield).toBe(0);
      expect(migrated.units[0].maxShield).toBe(0);
    });

    it('应保留v1存档中的其他数据', () => {
      const v1Data = createV1SaveData();
      const migrated = serializer._migrateVersion(v1Data);

      expect(migrated.gameTime).toBe(240);
      expect(migrated.playerRace).toBe('terran');
      expect(migrated.units.length).toBe(1);
      expect(migrated.units[0].type).toBe('marine');
      expect(migrated.units[0].hp).toBe(40);
    });

    it('v2存档不需要迁移', () => {
      const v2Data = createCurrentVersionSaveData();
      const result = serializer._migrateVersion(v2Data);

      expect(result).toBe(v2Data); // 应返回原始对象引用
      expect(result.version).toBe(2);
    });
  });

  describe('版本边界检查', () => {
    it('低于最低支持版本的存档应抛出错误', () => {
      const ancientData = { version: 0, gameTime: 100, playerRace: 'terran', units: [], buildings: [] };
      expect(() => serializer._migrateVersion(ancientData)).toThrow('存档版本过低');
    });

    it('高于当前版本的存档应标记为未来版本并尝试兼容加载', () => {
      const futureData = {
        version: 99,
        gameTime: 100,
        playerRace: 'terran',
        units: [],
        buildings: [],
      };
      const result = serializer._migrateVersion(futureData);

      expect(result._futureVersion).toBe(true);
      expect(result.version).toBe(99); // 保留原始版本号
    });

    it('缺少版本号的存档应默认为v1', () => {
      const noVersionData = {
        gameTime: 100,
        playerRace: 'terran',
        units: [],
        buildings: [],
      };
      const result = serializer._migrateVersion(noVersionData);

      expect(result.version).toBe(2); // 从v1迁移到v2
      // v1→v2迁移会添加shield字段
      expect(result.units).toBeDefined();
    });
  });

  describe('canMigrate 静态方法', () => {
    it('v1可迁移到v2', () => {
      expect(GameSerializer.canMigrate(1)).toBe(true);
    });

    it('v2（当前版本）不需要迁移', () => {
      expect(GameSerializer.canMigrate(2)).toBe(true);
    });

    it('v0无法迁移', () => {
      expect(GameSerializer.canMigrate(0)).toBe(false);
    });

    it('未来版本无法迁移', () => {
      expect(GameSerializer.canMigrate(99)).toBe(false);
    });
  });
});

// ═══════════════════════════════════════
// 存档校验测试
// ═══════════════════════════════════════

describe('GameSerializer - 存档校验', () => {
  let serializer;

  beforeEach(() => {
    serializer = new GameSerializer();
  });

  it('有效存档应通过校验', () => {
    const validData = createCurrentVersionSaveData();
    const result = serializer.validateSaveData(validData);

    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('缺少必需字段的存档应报错', () => {
    const incompleteData = { units: [], buildings: [] };
    const result = serializer.validateSaveData(incompleteData);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.includes('version'))).toBe(true);
    expect(result.errors.some((e) => e.includes('gameTime'))).toBe(true);
    expect(result.errors.some((e) => e.includes('playerRace'))).toBe(true);
  });

  it('应能自动修复数值类型错误', () => {
    const badTypeData = {
      version: '2', // 字符串而非数字
      gameTime: '600', // 字符串而非数字
      playerRace: 'terran',
      units: [],
      buildings: [],
    };
    const result = serializer.validateSaveData(badTypeData);

    expect(badTypeData.version).toBe(2);
    expect(badTypeData.gameTime).toBe(600);
  });

  it('非对象数据应报错', () => {
    const result = serializer.validateSaveData(null);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('不是有效的对象');
  });
});

// ═══════════════════════════════════════
// 字段默认值填充测试
// ═══════════════════════════════════════

describe('GameSerializer - 字段默认值', () => {
  let serializer;

  beforeEach(() => {
    serializer = new GameSerializer();
  });

  it('应为缺失字段填充默认值', () => {
    const incompleteUnit = {
      id: 1,
      type: 'marine',
    };
    const data = {
      version: 1,
      gameTime: 100,
      playerRace: 'terran',
      units: [incompleteUnit],
      buildings: [],
    };

    const result = serializer._applyFieldDefaults(data);

    expect(result.units[0].shield).toBe(0);
    expect(result.units[0].maxShield).toBe(0);
    expect(result.units[0].armor).toBe(0);
    expect(result.units[0].selected).toBe(false);
    expect(result.units[0].speed).toBe(2);
    expect(result.units[0].animState).toBe('idle');
    // 原有字段应保留
    expect(result.units[0].id).toBe(1);
    expect(result.units[0].type).toBe('marine');
  });

  it('应确保基础元数据存在', () => {
    const emptyData = {};
    const result = serializer._applyFieldDefaults(emptyData);

    expect(result.version).toBe(GameSerializer.getSaveVersion());
    expect(result.gameTime).toBe(0);
    expect(result.playerRace).toBe('terran');
    expect(Array.isArray(result.units)).toBe(true);
    expect(Array.isArray(result.buildings)).toBe(true);
  });
});

// ═══════════════════════════════════════
// 压缩/解压缩测试
// ═══════════════════════════════════════

describe('GameSerializer - 压缩', () => {
  let serializer;

  beforeEach(() => {
    serializer = new GameSerializer();
    serializer.enableCompression = true;
  });

  it('应正确压缩和解压缩数据', () => {
    // 使用足够大的数据以超过压缩阈值
    const largeData = {
      ...createCurrentVersionSaveData(),
      units: Array.from({ length: 50 }, (_, i) => ({
        id: i,
        type: 'marine',
        name: 'Marine',
        race: 'terran',
        team: 0,
        pos: [i * 10, 0, i * 5],
        hp: 40,
        maxHp: 40,
        shield: 0,
        maxShield: 0,
        facing: 0,
        animState: 'idle',
      })),
    };
    const original = JSON.stringify(largeData);
    const compressed = serializer.compress(original);
    // 压缩后应带 SCZ: 前缀
    // 压缩后应带 SCZ: 前缀
    expect(compressed.startsWith('SCZ:')).toBe(true);

    // 解压缩后应恢复原始数据
    const decompressed = serializer._tryDecompress(compressed);
    expect(decompressed).toBe(original);
  });

  it('小数据不应压缩', () => {
    const small = '{"version":2}';
    const result = serializer.compress(small);
    expect(result).toBe(small); // 原样返回
  });

  it('禁用压缩时不应压缩', () => {
    serializer.enableCompression = false;
    const largeData = 'x'.repeat(1000);
    const result = serializer.compress(largeData);
    expect(result).toBe(largeData);
  });

  it('非压缩数据应原样返回', () => {
    const plain = '{"version":2,"gameTime":100}';
    const result = serializer._tryDecompress(plain);
    expect(result).toBe(plain);
  });

  it('损坏的压缩数据应优雅降级', () => {
    const corrupted = 'SCZ:not_valid_base64!!!';
    const result = serializer._tryDecompress(corrupted);
    expect(result).toBe(corrupted); // 返回原始数据
  });
});

// ═══════════════════════════════════════
// 完整序列化/反序列化测试
// ═══════════════════════════════════════

describe('GameSerializer - 完整序列化/反序列化', () => {
  let serializer;

  beforeEach(() => {
    serializer = new GameSerializer();
  });

  it('应正确序列化和反序列化游戏状态', () => {
    const gm = createMockGameManager({
      units: [
        {
          id: 1,
          type: 'marine',
          name: 'Marine',
          race: 'terran',
          team: 0,
          position: { x: 10, y: 0, z: 20 },
          hp: 40,
          maxHp: 40,
          shield: 0,
          maxShield: 0,
          alive: true,
        },
      ],
    });

    const json = serializer.serialize(gm);
    const parsed = JSON.parse(json);

    expect(parsed.version).toBe(GameSerializer.getSaveVersion());
    expect(parsed.units.length).toBe(1);
    expect(parsed.units[0].type).toBe('marine');

    // 反序列化
    const newGm = createMockGameManager();
    const success = serializer.deserialize(json, newGm);

    expect(success).toBe(true);
    expect(newGm.gameTickTime).toBe(120);
    expect(newGm.units.length).toBe(1);
    expect(newGm.units[0].type).toBe('marine');
  });

  it('应正确加载v1存档并自动迁移', () => {
    const v1Data = createV1SaveData();
    const json = JSON.stringify(v1Data);

    const gm = createMockGameManager();
    const success = serializer.deserialize(json, gm);

    expect(success).toBe(true);
    expect(gm.units.length).toBe(1);
    expect(gm.units[0].shield).toBe(0); // v1→v2迁移添加的默认值
    expect(gm.units[0].maxShield).toBe(0);
  });

  it('无效JSON应返回false', () => {
    const gm = createMockGameManager();
    const success = serializer.deserialize('not valid json', gm);
    expect(success).toBe(false);
  });

  it('压缩的存档应正确加载', () => {
    const gm = createMockGameManager();
    const json = serializer.serialize(gm);
    const compressed = serializer.compress(json);

    const newGm = createMockGameManager();
    const success = serializer.deserialize(compressed, newGm);

    expect(success).toBe(true);
  });
});
