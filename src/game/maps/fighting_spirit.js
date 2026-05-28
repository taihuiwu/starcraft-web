// ═══════════════════════════════════════════
// StarCraft Web - Fighting Spirit 预制地图
// 经典4人对战地图 128×128
// ═══════════════════════════════════════════

import MapData, { TERRAIN, RESOURCE_TYPE } from '../MapData.js';

/**
 * 生成Fighting Spirit地图
 * 经典四人对战地图：四角出生点，中心开阔
 * @returns {MapData}
 */
export function createFightingSpirit() {
  const W = 128;
  const H = 128;
  const map = new MapData({ width: W, height: H, name: 'Fighting Spirit', author: 'Blizzard' });

  // ── 填充基础地形 ──
  for (let gz = 0; gz < H; gz++) {
    for (let gx = 0; gx < W; gx++) {
      map.setTerrain(gx, gz, TERRAIN.GRASS);
    }
  }

  // ── 地图边缘 ──
  for (let i = 0; i < W; i++) {
    map.setTerrain(i, 0, TERRAIN.ROCK);
    map.setTerrain(i, H - 1, TERRAIN.ROCK);
  }
  for (let i = 0; i < H; i++) {
    map.setTerrain(0, i, TERRAIN.ROCK);
    map.setTerrain(W - 1, i, TERRAIN.ROCK);
  }

  // ── 中央菱形高地 ──
  for (let gz = 40; gz < 88; gz++) {
    for (let gx = 40; gx < 88; gx++) {
      const dx = gx - 64;
      const dz = gz - 64;
      // 菱形高地（曼哈顿距离 < 24）
      if (Math.abs(dx) + Math.abs(dz) < 24) {
        map.setTerrain(gx, gz, TERRAIN.HIGH);
        map.setHeight(gx, gz, 1.0);
      }
    }
  }

  // ── 菱形高地边缘坡道（四方向） ──
  // 上方坡道
  for (let gz = 36; gz < 40; gz++) {
    for (let gx = 62; gx < 66; gx++) {
      map.setTerrain(gx, gz, TERRAIN.RAMP);
    }
  }
  // 下方坡道
  for (let gz = 88; gz < 92; gz++) {
    for (let gx = 62; gx < 66; gx++) {
      map.setTerrain(gx, gz, TERRAIN.RAMP);
    }
  }
  // 左方坡道
  for (let gz = 62; gz < 66; gz++) {
    for (let gx = 36; gx < 40; gx++) {
      map.setTerrain(gx, gz, TERRAIN.RAMP);
    }
  }
  // 右方坡道
  for (let gz = 62; gz < 66; gz++) {
    for (let gx = 88; gx < 92; gx++) {
      map.setTerrain(gx, gz, TERRAIN.RAMP);
    }
  }

  // ── 四角出生点周围的岩石屏障 ──
  // 左上
  for (let gz = 6; gz < 14; gz++) {
    for (let gx = 22; gx < 26; gx++) {
      map.setTerrain(gx, gz, TERRAIN.ROCK);
    }
  }
  // 右上
  for (let gz = 6; gz < 14; gz++) {
    for (let gx = 100; gx < 104; gx++) {
      map.setTerrain(gx, gz, TERRAIN.ROCK);
    }
  }
  // 左下
  for (let gz = 114; gz < 122; gz++) {
    for (let gx = 22; gx < 26; gx++) {
      map.setTerrain(gx, gz, TERRAIN.ROCK);
    }
  }
  // 右下
  for (let gz = 114; gz < 122; gz++) {
    for (let gx = 100; gx < 104; gx++) {
      map.setTerrain(gx, gz, TERRAIN.ROCK);
    }
  }

  // ── 水域（四条对角线方向的水道） ──
  for (let i = 0; i < 16; i++) {
    // 左上水道
    map.setTerrain(18 + i, 18 + i, TERRAIN.WATER);
    map.setTerrain(18 + i, 19 + i, TERRAIN.WATER);
    // 右上水道
    map.setTerrain(110 - i, 18 + i, TERRAIN.WATER);
    map.setTerrain(110 - i, 19 + i, TERRAIN.WATER);
    // 左下水道
    map.setTerrain(18 + i, 110 - i, TERRAIN.WATER);
    map.setTerrain(18 + i, 109 - i, TERRAIN.WATER);
    // 右下水道
    map.setTerrain(110 - i, 110 - i, TERRAIN.WATER);
    map.setTerrain(110 - i, 109 - i, TERRAIN.WATER);
  }

  // ── 四个出生点 ──
  map.addSpawnPoint(16, 16, 1);   // 左上
  map.addSpawnPoint(112, 16, 2);  // 右上
  map.addSpawnPoint(16, 112, 3);  // 左下
  map.addSpawnPoint(112, 112, 4); // 右下

  // ── P1 主矿 ──
  map.addResourceNode({ x: 20, z: 22, type: RESOURCE_TYPE.MINERAL, amount: 1500 });
  map.addResourceNode({ x: 24, z: 22, type: RESOURCE_TYPE.MINERAL, amount: 1500 });
  map.addResourceNode({ x: 28, z: 22, type: RESOURCE_TYPE.MINERAL, amount: 1500 });
  map.addResourceNode({ x: 20, z: 26, type: RESOURCE_TYPE.MINERAL, amount: 1500 });
  map.addResourceNode({ x: 24, z: 26, type: RESOURCE_TYPE.MINERAL, amount: 1500 });
  map.addResourceNode({ x: 12, z: 14, type: RESOURCE_TYPE.GAS, amount: 2500 });

  // ── P2 主矿 ──
  map.addResourceNode({ x: 100, z: 22, type: RESOURCE_TYPE.MINERAL, amount: 1500 });
  map.addResourceNode({ x: 104, z: 22, type: RESOURCE_TYPE.MINERAL, amount: 1500 });
  map.addResourceNode({ x: 108, z: 22, type: RESOURCE_TYPE.MINERAL, amount: 1500 });
  map.addResourceNode({ x: 100, z: 26, type: RESOURCE_TYPE.MINERAL, amount: 1500 });
  map.addResourceNode({ x: 104, z: 26, type: RESOURCE_TYPE.MINERAL, amount: 1500 });
  map.addResourceNode({ x: 116, z: 14, type: RESOURCE_TYPE.GAS, amount: 2500 });

  // ── P3 主矿 ──
  map.addResourceNode({ x: 20, z: 100, type: RESOURCE_TYPE.MINERAL, amount: 1500 });
  map.addResourceNode({ x: 24, z: 100, type: RESOURCE_TYPE.MINERAL, amount: 1500 });
  map.addResourceNode({ x: 28, z: 100, type: RESOURCE_TYPE.MINERAL, amount: 1500 });
  map.addResourceNode({ x: 20, z: 104, type: RESOURCE_TYPE.MINERAL, amount: 1500 });
  map.addResourceNode({ x: 24, z: 104, type: RESOURCE_TYPE.MINERAL, amount: 1500 });
  map.addResourceNode({ x: 12, z: 114, type: RESOURCE_TYPE.GAS, amount: 2500 });

  // ── P4 主矿 ──
  map.addResourceNode({ x: 100, z: 100, type: RESOURCE_TYPE.MINERAL, amount: 1500 });
  map.addResourceNode({ x: 104, z: 100, type: RESOURCE_TYPE.MINERAL, amount: 1500 });
  map.addResourceNode({ x: 108, z: 100, type: RESOURCE_TYPE.MINERAL, amount: 1500 });
  map.addResourceNode({ x: 100, z: 104, type: RESOURCE_TYPE.MINERAL, amount: 1500 });
  map.addResourceNode({ x: 104, z: 104, type: RESOURCE_TYPE.MINERAL, amount: 1500 });
  map.addResourceNode({ x: 116, z: 114, type: RESOURCE_TYPE.GAS, amount: 2500 });

  // ── 中央高地资源 ──
  map.addResourceNode({ x: 58, z: 58, type: RESOURCE_TYPE.MINERAL, amount: 1000 });
  map.addResourceNode({ x: 70, z: 58, type: RESOURCE_TYPE.MINERAL, amount: 1000 });
  map.addResourceNode({ x: 58, z: 70, type: RESOURCE_TYPE.GAS, amount: 1500 });
  map.addResourceNode({ x: 70, z: 70, type: RESOURCE_TYPE.GAS, amount: 1500 });

  return map;
}

export default createFightingSpirit;
