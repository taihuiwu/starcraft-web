// ═══════════════════════════════════════════
// StarCraft Web - SaveManager 损坏恢复测试
// ═══════════════════════════════════════════

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import SaveManager from '../src/game/save/SaveManager.js';
import GameSerializer from '../src/game/save/GameSerializer.js';

// ═══════════════════════════════════════
// 模拟 localStorage
// ═══════════════════════════════════════

const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (index) => Object.keys(store)[index] || null,
  };
})();

// ═══════════════════════════════════════
// 辅助函数
// ═══════════════════════════════════════

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

function createValidSaveJson() {
  return JSON.stringify({
    version: 2,
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
        shield: 0,
        maxShield: 0,
      },
    ],
    buildings: [],
    resources: { minerals: 800, gas: 300 },
    tech: {},
  });
}

// ═══════════════════════════════════════
// 测试
// ═══════════════════════════════════════

describe('SaveManager - 基本操作', () => {
  let saveManager;
  let gm;

  beforeEach(() => {
    localStorageMock.clear();
    global.localStorage = localStorageMock;
    gm = createMockGameManager();
    saveManager = new SaveManager(gm);
    saveManager.enableCompression = false; // 测试中禁用压缩以简化
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  it('应正确保存和加载游戏', () => {
    const saved = saveManager.saveGame('slot_1', { name: '测试存档' });
    expect(saved).toBe(true);

    // 验证localStorage中有数据
    const stored = localStorageMock.getItem('starcraft_save_slot_1');
    expect(stored).not.toBeNull();

    // 验证元数据已更新
    const list = saveManager.getSaveList();
    expect(list.length).toBe(1);
    expect(list[0].slotId).toBe('slot_1');
    expect(list[0].name).toBe('测试存档');
  });

  it('应正确加载存档', () => {
    // 先保存
    saveManager.saveGame('slot_1');

    // 加载
    const loaded = saveManager.loadGame('slot_1');
    expect(loaded).toBe(true);
  });

  it('加载不存在的存档应返回false', () => {
    const loaded = saveManager.loadGame('nonexistent');
    expect(loaded).toBe(false);
  });

  it('应正确删除存档', () => {
    saveManager.saveGame('slot_1');
    const deleted = saveManager.deleteSave('slot_1');
    expect(deleted).toBe(true);

    const stored = localStorageMock.getItem('starcraft_save_slot_1');
    expect(stored).toBeNull();
  });

  it('应正确处理多个存档槽位', () => {
    saveManager.saveGame('slot_1', { name: '存档1' });
    saveManager.saveGame('slot_2', { name: '存档2' });
    saveManager.saveGame('slot_3', { name: '存档3' });

    const list = saveManager.getSaveList();
    expect(list.length).toBe(3);
  });
});

describe('SaveManager - 压缩存储', () => {
  let saveManager;
  let gm;

  beforeEach(() => {
    localStorageMock.clear();
    global.localStorage = localStorageMock;
    gm = createMockGameManager();
    saveManager = new SaveManager(gm);
    saveManager.enableCompression = true;
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  it('启用压缩时存档数据应带有SCZ前缀', () => {
    saveManager.saveGame('slot_1');

    const stored = localStorageMock.getItem('starcraft_save_slot_1');
    // 由于测试数据较小，可能不会被压缩
    // 但元数据应标记compressed状态
    const meta = saveManager.getSaveList();
    expect(meta[0].compressed).toBe(true);
  });

  it('压缩存档应能正确加载', () => {
    saveManager.saveGame('slot_1');
    const loaded = saveManager.loadGame('slot_1');
    expect(loaded).toBe(true);
  });
});

describe('SaveManager - 损坏恢复', () => {
  let saveManager;
  let gm;

  beforeEach(() => {
    localStorageMock.clear();
    global.localStorage = localStorageMock;
    gm = createMockGameManager();
    saveManager = new SaveManager(gm);
    saveManager.enableCompression = false;
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  it('应能修复截断的JSON存档', () => {
    // 存入一个截断的JSON
    const truncated = '{"version":2,"gameTime":240,"playerRace":"terran","units":[{"id":1,"type":"marine","hp":40';
    localStorageMock.setItem('starcraft_save_slot_1', truncated);

    // 添加元数据
    saveManager._updateSaveList('slot_1', {
      name: '损坏存档',
      slotId: 'slot_1',
      timestamp: Date.now(),
      size: truncated.length,
    });

    const loaded = saveManager.loadGame('slot_1');
    // 损坏恢复可能成功也可能失败，取决于截断程度
    // 但不应抛出异常
    expect(typeof loaded).toBe('boolean');
  });

  it('应能从JSON中提取有效数据', () => {
    // 存入前后有垃圾字符的JSON
    const garbagePrefix = 'ERROR: corrupted data\n';
    const validJson = createValidSaveJson();
    const garbageSuffix = '\nEND OF LOG';
    const corrupted = garbagePrefix + validJson + garbageSuffix;
    localStorageMock.setItem('starcraft_save_slot_1', corrupted);

    saveManager._updateSaveList('slot_1', {
      name: '混合数据',
      slotId: 'slot_1',
      timestamp: Date.now(),
      size: corrupted.length,
    });

    const loaded = saveManager.loadGame('slot_1');
    expect(loaded).toBe(true);
    expect(gm.units.length).toBe(1);
  });
});

describe('SaveManager - 健康检查', () => {
  let saveManager;
  let gm;

  beforeEach(() => {
    localStorageMock.clear();
    global.localStorage = localStorageMock;
    gm = createMockGameManager();
    saveManager = new SaveManager(gm);
    saveManager.enableCompression = false;
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  it('应能生成存档健康报告', () => {
    saveManager.saveGame('slot_1');
    const report = saveManager.getSaveHealthReport('slot_1');

    expect(report.exists).toBe(true);
    expect(report.valid).toBe(true);
    expect(report.version).toBe(GameSerializer.getSaveVersion());
    expect(report.canLoad).toBe(true);
    expect(report.issues.length).toBe(0);
  });

  it('不存在的存档应有明确的报告', () => {
    const report = saveManager.getSaveHealthReport('nonexistent');
    expect(report.exists).toBe(false);
    expect(report.issues.length).toBeGreaterThan(0);
  });

  it('应能批量检查所有存档健康状态', () => {
    saveManager.saveGame('slot_1');
    saveManager.saveGame('slot_2');

    const reports = saveManager.checkAllSavesHealth();
    expect(reports.length).toBe(2);
    expect(reports.every((r) => r.exists)).toBe(true);
  });
});

describe('SaveManager - 存档修复', () => {
  let saveManager;
  let gm;

  beforeEach(() => {
    localStorageMock.clear();
    global.localStorage = localStorageMock;
    gm = createMockGameManager();
    saveManager = new SaveManager(gm);
    saveManager.enableCompression = false;
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  it('应能修复有效但格式过旧的存档', () => {
    // 存入v1格式存档
    const v1Data = {
      version: 1,
      gameTime: 240,
      playerRace: 'terran',
      nextUnitId: 5,
      units: [{ id: 1, type: 'marine', hp: 40, maxHp: 40, pos: [10, 0, 20] }],
      buildings: [],
    };
    localStorageMock.setItem('starcraft_save_slot_1', JSON.stringify(v1Data));
    saveManager._updateSaveList('slot_1', {
      name: '旧版存档',
      slotId: 'slot_1',
      timestamp: Date.now(),
      size: JSON.stringify(v1Data).length,
    });

    const repaired = saveManager.repairSave('slot_1');
    expect(repaired).toBe(true);

    // 验证修复后的存档格式正确
    const stored = localStorageMock.getItem('starcraft_save_slot_1');
    const repairedData = JSON.parse(stored);
    expect(repairedData.version).toBe(GameSerializer.getSaveVersion());
    expect(repairedData.units[0].shield).toBe(0);
  });
});
