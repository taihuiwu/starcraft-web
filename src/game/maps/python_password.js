// ═══════════════════════════════════════════
// StarCraft Web - Python Password 预制地图
// 趣味地图：蛇形迷宫 128×128
// ═══════════════════════════════════════════

import MapData, { TERRAIN, RESOURCE_TYPE } from '../MapData.js';

/**
 * 生成Python Password地图
 * 蛇形迷宫地图，中央有大蛇造型岩石
 * @returns {MapData}
 */
export function createPythonPassword() {
  const W = 128;
  const H = 128;
  const map = new MapData({ width: W, height: H, name: 'Python Password', author: 'Community' });

  // ── 填充基础泥土地形 ──
  for (let gz = 0; gz < H; gz++) {
    for (let gx = 0; gx < W; gx++) {
      map.setTerrain(gx, gz, TERRAIN.DIRT);
    }
  }

  // ── 地图边框 ──
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

  // ── 蛇形岩石路径（Python造型） ──
  // 蛇头（圆形，位于地图右上方）
  const headX = 90, headZ = 20;
  for (let gz = headZ - 6; gz <= headZ + 6; gz++) {
    for (let gx = headX - 6; gx <= headX + 6; gx++) {
      const dx = gx - headX;
      const dz = gz - headZ;
      if (dx * dx + dz * dz > 36) {
        // 蛇头轮廓
        map.setTerrain(gx, gz, TERRAIN.ROCK);
      }
    }
  }
  // 蛇眼（两个小空洞）
  map.setTerrain(headX - 2, headZ - 3, TERRAIN.DIRT);
  map.setTerrain(headX + 2, headZ - 3, TERRAIN.DIRT);

  // 蛇身蜿蜒路径
  const bodyPath = [];
  // 从蛇头向下蜿蜒
  for (let x = 80; x >= 10; x -= 2) {
    const wave = Math.sin((x - 10) * 0.15) * 10;
    bodyPath.push({ x: x, z: Math.floor(30 + wave) });
  }
  // 继续蜿蜒
  for (let x = 10; x <= 80; x += 2) {
    const wave = Math.sin((x - 10) * 0.15) * 10;
    bodyPath.push({ x: x, z: Math.floor(70 + wave) });
  }
  // 蛇尾
  for (let x = 80; x <= 110; x += 2) {
    const wave = Math.sin((x - 80) * 0.2) * 6;
    bodyPath.push({ x: x, z: Math.floor(100 + wave) });
  }

  // 绘制蛇身（双宽路径）
  for (const pt of bodyPath) {
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        const gx = pt.x + dx;
        const gz = pt.z + dz;
        if (gx >= 3 && gx < W - 3 && gz >= 3 && gz < H - 3) {
          map.setTerrain(gx, gz, TERRAIN.ROCK);
        }
      }
    }
  }

  // ── 蛇身内部开路（可通行通道） ──
  for (const pt of bodyPath) {
    map.setTerrain(pt.x, pt.z, TERRAIN.GRASS);
  }

  // ── 水域点缀（蛇身周围的水池） ──
  const pools = [
    { x: 50, z: 15, r: 4 },
    { x: 30, z: 50, r: 5 },
    { x: 70, z: 50, r: 5 },
    { x: 50, z: 90, r: 4 },
    { x: 90, z: 60, r: 3 },
    { x: 20, z: 80, r: 3 },
  ];
  for (const pool of pools) {
    for (let gz = pool.z - pool.r; gz <= pool.z + pool.r; gz++) {
      for (let gx = pool.x - pool.r; gx <= pool.x + pool.r; gx++) {
        const dx = gx - pool.x;
        const dz = gz - pool.z;
        if (dx * dx + dz * dz <= pool.r * pool.r) {
          map.setTerrain(gx, gz, TERRAIN.WATER);
        }
      }
    }
  }

  // ── 高地区域（蛇头顶部高台） ──
  for (let gz = headZ - 5; gz <= headZ - 2; gz++) {
    for (let gx = headX - 5; gx <= headX + 5; gx++) {
      if (map.getTerrain(gx, gz) !== TERRAIN.ROCK && map.getTerrain(gx, gz) !== TERRAIN.WATER) {
        map.setTerrain(gx, gz, TERRAIN.HIGH);
        map.setHeight(gx, gz, 1.0);
      }
    }
  }

  // ── 两个出生点 ──
  map.addSpawnPoint(20, 20, 1);    // 左上
  map.addSpawnPoint(108, 108, 2);  // 右下

  // ── P1 主矿 ──
  map.addResourceNode({ x: 10, z: 26, type: RESOURCE_TYPE.MINERAL, amount: 1500 });
  map.addResourceNode({ x: 14, z: 26, type: RESOURCE_TYPE.MINERAL, amount: 1500 });
  map.addResourceNode({ x: 18, z: 26, type: RESOURCE_TYPE.MINERAL, amount: 1500 });
  map.addResourceNode({ x: 10, z: 30, type: RESOURCE_TYPE.MINERAL, amount: 1500 });
  map.addResourceNode({ x: 14, z: 30, type: RESOURCE_TYPE.MINERAL, amount: 1500 });
  map.addResourceNode({ x: 26, z: 10, type: RESOURCE_TYPE.GAS, amount: 2500 });

  // ── P2 主矿 ──
  map.addResourceNode({ x: 100, z: 100, type: RESOURCE_TYPE.MINERAL, amount: 1500 });
  map.addResourceNode({ x: 104, z: 100, type: RESOURCE_TYPE.MINERAL, amount: 1500 });
  map.addResourceNode({ x: 108, z: 100, type: RESOURCE_TYPE.MINERAL, amount: 1500 });
  map.addResourceNode({ x: 100, z: 104, type: RESOURCE_TYPE.MINERAL, amount: 1500 });
  map.addResourceNode({ x: 104, z: 104, type: RESOURCE_TYPE.MINERAL, amount: 1500 });
  map.addResourceNode({ x: 118, z: 108, type: RESOURCE_TYPE.GAS, amount: 2500 });

  // ── 中央奖励资源 ──
  map.addResourceNode({ x: 60, z: 60, type: RESOURCE_TYPE.MINERAL, amount: 2000 });
  map.addResourceNode({ x: 66, z: 60, type: RESOURCE_TYPE.MINERAL, amount: 2000 });
  map.addResourceNode({ x: 63, z: 66, type: RESOURCE_TYPE.GAS, amount: 3000 });

  return map;
}

export default createPythonPassword;
