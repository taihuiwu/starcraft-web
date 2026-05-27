// ═══════════════════════════════════════════
// StarCraft Web - 数学工具函数
// ═══════════════════════════════════════════

/**
 * 两点间距离（2D，忽略Y轴）
 */
export function distance2D(a, b) {
  const dx = a.x - b.x;
  const dz = (a.z !== undefined ? a.z : a.y) - (b.z !== undefined ? b.z : b.y);
  return Math.sqrt(dx * dx + dz * dz);
}

/**
 * 两点间距离（3D）
 */
export function distance3D(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * 两点间距离的平方（避免开方，用于比较）
 */
export function distanceSq2D(a, b) {
  const dx = a.x - b.x;
  const dz = (a.z !== undefined ? a.z : a.y) - (b.z !== undefined ? b.z : b.y);
  return dx * dx + dz * dz;
}

/**
 * 线性插值
 */
export function lerp(a, b, t) {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

/**
 * 限制值在范围内
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * 角度转弧度
 */
export function degToRad(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * 弧度转角度
 */
export function radToDeg(radians) {
  return radians * (180 / Math.PI);
}

/**
 * 朝向目标的角度（2D，返回弧度）
 */
export function angleToTarget(from, to) {
  const dx = to.x - from.x;
  const dz = (to.z !== undefined ? to.z : 0) - (from.z !== undefined ? from.z : 0);
  return Math.atan2(dz, dx);
}

/**
 * 格式化坐标为地图格子坐标
 */
export function worldToGrid(x, z, tileSize = 1) {
  return {
    gx: Math.floor(x / tileSize),
    gz: Math.floor(z / tileSize),
  };
}

/**
 * 格子坐标转世界坐标（格子中心点）
 */
export function gridToWorld(gx, gz, tileSize = 1) {
  return {
    x: gx * tileSize + tileSize / 2,
    z: gz * tileSize + tileSize / 2,
  };
}

/**
 * 随机整数 [min, max]
 */
export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 随机浮点 [min, max)
 */
export function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * 2D向量归一化
 */
export function normalize2D(x, z) {
  const len = Math.sqrt(x * x + z * z);
  if (len === 0) return { x: 0, z: 0 };
  return { x: x / len, z: z / len };
}

/**
 * 检测两个圆形碰撞（2D）
 */
export function circleCollision(posA, radiusA, posB, radiusB) {
  const dist = distance2D(posA, posB);
  return dist < radiusA + radiusB;
}

/**
 * 计算包围盒（AABB）
 */
export function computeAABB(points) {
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  for (const p of points) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
    minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z);
  }

  return { min: { x: minX, y: minY, z: minZ }, max: { x: maxX, y: maxY, z: maxZ } };
}
