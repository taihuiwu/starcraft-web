// ═══════════════════════════════════════════
// StarCraft Web - Lost Temple 预制地图
// 经典1v1对战地图 128×128
// ═══════════════════════════════════════════

import MapData, { TERRAIN, RESOURCE_TYPE } from '../MapData.js';

/**
 * 生成Lost Temple地图
 * 经典星际争霸1v1地图：中部高地，四角矿脉
 * @returns {MapData}
 */
export function createLostTemple() {
  const W = 128;
  const H = 128;
  const map = new MapData({ width: W, height: H, name: 'Lost Temple', author: 'Blizzard' });

  // ── 填充基础草地 ──
  for (let gz = 0; gz < H; gz++) {
    for (let gx = 0; gx < W; gx++) {
      map.setTerrain(gx, gz, TERRAIN.GRASS);
    }
  }

  // ── 地图边缘岩石边框 ──
  for (let i = 0; i < W; i++) {
    map.setTerrain(i, 0, TERRAIN.ROCK);
    map.setTerrain(i, 1, TERRAIN.ROCK);
    map.setTerrain(i, H - 1, TERRAIN.ROCK);
    map.setTerrain(i, H - 2, TERRAIN.ROCK);
  }
  for (let i = 0; i < H; i++) {
    map.setTerrain(0, i, TERRAIN.ROCK);
    map.setTerrain(1, i, TERRAIN.ROCK);
    map.setTerrain(W - 1, i, TERRAIN.ROCK);
    map.setTerrain(W - 2, i, TERRAIN.ROCK);
  }

  // ── 中央高地平台 ──
  const center = { x: 64, z: 64 };
  for (let gz = 48; gz < 80; gz++) {
    for (let gx = 48; gx < 80; gx++) {
      map.setTerrain(gx, gz, TERRAIN.HIGH);
      map.setHeight(gx, gz, 1.0);
    }
  }

  // ── 四个方向的坡道 ──
  // 上坡道
  for (let gz = 44; gz < 48; gz++) {
    for (let gx = 62; gx < 66; gx++) {
      map.setTerrain(gx, gz, TERRAIN.RAMP);
    }
  }
  // 下坡道
  for (let gz = 80; gz < 84; gz++) {
    for (let gx = 62; gx < 66; gx++) {
      map.setTerrain(gx, gz, TERRAIN.RAMP);
    }
  }
  // 左坡道
  for (let gz = 62; gz < 66; gz++) {
    for (let gx = 44; gx < 48; gx++) {
      map.setTerrain(gx, gz, TERRAIN.RAMP);
    }
  }
  // 右坡道
  for (let gz = 62; gz < 66; gz++) {
    for (let gx = 80; gx < 84; gx++) {
      map.setTerrain(gx, gz, TERRAIN.RAMP);
    }
  }

  // ── 四角岩石障碍 ──
  const rockAreas = [
    { x: 10, z: 10, w: 8, h: 8 },
    { x: 110, z: 10, w: 8, h: 8 },
    { x: 10, z: 110, w: 8, h: 8 },
    { x: 110, z: 110, w: 8, h: 8 },
  ];
  for (const area of rockAreas) {
    for (let gz = area.z; gz < area.z + area.h; gz++) {
      for (let gx = area.x; gx < area.x + area.w; gx++) {
        map.setTerrain(gx, gz, TERRAIN.ROCK);
      }
    }
  }

  // ── 水域点缀 ──
  const waterAreas = [
    { x: 20, z: 20, w: 6, h: 10 },
    { x: 100, z: 20, w: 6, h: 10 },
    { x: 20, z: 98, w: 6, h: 10 },
    { x: 100, z: 98, w: 6, h: 10 },
  ];
  for (const area of waterAreas) {
    for (let gz = area.z; gz < area.z + area.h && gz < H; gz++) {
      for (let gx = area.x; gx < area.x + area.w && gx < W; gx++) {
        map.setTerrain(gx, gz, TERRAIN.WATER);
      }
    }
  }

  // ── 中央高地资源（少量） ──
  map.addResourceNode({ x: 56, z: 56, type: RESOURCE_TYPE.MINERAL, amount: 500 });
  map.addResourceNode({ x: 72, z: 56, type: RESOURCE_TYPE.MINERAL, amount: 500 });
  map.addResourceNode({ x: 56, z: 72, type: RESOURCE_TYPE.GAS, amount: 1000 });
  map.addResourceNode({ x: 72, z: 72, type: RESOURCE_TYPE.GAS, amount: 1000 });

  // ── 出生点：左上(P1蓝) 和 右下(P2红) ──
  map.addSpawnPoint(16, 16, 1);
  map.addSpawnPoint(112, 112, 2);

  // ── 主矿资源（出生点附近） ──
  // P1 主矿
  map.addResourceNode({ x: 16, z: 24, type: RESOURCE_TYPE.MINERAL, amount: 1500 });
  map.addResourceNode({ x: 20, z: 24, type: RESOURCE_TYPE.MINERAL, amount: 1500 });
  map.addResourceNode({ x: 24, z: 24, type: RESOURCE_TYPE.MINERAL, amount: 1500 });
  map.addResourceNode({ x: 16, z: 28, type: RESOURCE_TYPE.MINERAL, amount: 1500 });
  map.addResourceNode({ x: 20, z: 28, type: RESOURCE_TYPE.MINERAL, amount: 1500 });
  map.addResourceNode({ x: 10, z: 18, type: RESOURCE_TYPE.GAS, amount: 2500 });

  // P2 主矿
  map.addResourceNode({ x: 104, z: 100, type: RESOURCE_TYPE.MINERAL, amount: 1500 });
  map.addResourceNode({ x: 108, z: 100, type: RESOURCE_TYPE.MINERAL, amount: 1500 });
  map.addResourceNode({ x: 112, z: 100, type: RESOURCE_TYPE.MINERAL, amount: 1500 });
  map.addResourceNode({ x: 104, z: 104, type: RESOURCE_TYPE.MINERAL, amount: 1500 });
  map.addResourceNode({ x: 108, z: 104, type: RESOURCE_TYPE.MINERAL, amount: 1500 });
  map.addResourceNode({ x: 118, z: 110, type: RESOURCE_TYPE.GAS, amount: 2500 });

  // ── 二矿资源 ──
  // P1 二矿
  map.addResourceNode({ x: 36, z: 40, type: RESOURCE_TYPE.MINERAL, amount: 1500 });
  map.addResourceNode({ x: 40, z: 40, type: RESOURCE_TYPE.MINERAL, amount: 1500 });
  map.addResourceNode({ x: 44, z: 40, type: RESOURCE_TYPE.MINERAL, amount: 1500 });
  map.addResourceNode({ x: 30, z: 44, type: RESOURCE_TYPE.GAS, amount: 2500 });

  // P2 二矿
  map.addResourceNode({ x: 84, z: 84, type: RESOURCE_TYPE.MINERAL, amount: 1500 });
  map.addResourceNode({ x: 88, z: 84, type: RESOURCE_TYPE.MINERAL, amount: 1500 });
  map.addResourceNode({ x: 92, z: 84, type: RESOURCE_TYPE.MINERAL, amount: 1500 });
  map.addResourceNode({ x: 98, z: 84, type: RESOURCE_TYPE.GAS, amount: 2500 });

  return map;
}

export default createLostTemple;
