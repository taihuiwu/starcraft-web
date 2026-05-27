// ═══════════════════════════════════════════════════════════════
// StarCraft Web - 可运行3D场景 Demo
// 地形 / 单位 / 建筑 / 摄像机控制 / 基础交互
// ═══════════════════════════════════════════════════════════════
import * as THREE from 'three';

// ─── 常量 ───────────────────────────────────────────────────
const MAP_SIZE = 80;
const GRID = 40;
const RACES = {
  TERRAN: { name: 'Terran', color: 0x4488ff, label: '人族' },
  ZERG:   { name: 'Zerg',   color: 0xff4444, label: '虫族' },
  PROTOSS:{ name: 'Protoss',color: 0xffdd44, label: '神族' },
};

// ─── 1. 渲染器 ──────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(0x1a1a2e);
document.getElementById('app').appendChild(renderer.domElement);

// ─── 2. 场景 ────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x1a1a2e, 0.008);

// ─── 3. 摄像机 ──────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(40, 50, 40);
camera.lookAt(0, 0, 0);

// ─── 4. 光源 ────────────────────────────────────────────────
const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(30, 50, 20);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048, 2048);
dirLight.shadow.camera.left = -60;
dirLight.shadow.camera.right = 60;
dirLight.shadow.camera.top = 60;
dirLight.shadow.camera.bottom = -60;
scene.add(dirLight);

const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x362a28, 0.4);
scene.add(hemiLight);

// ─── 5. 地形 ────────────────────────────────────────────────
function createTerrain() {
  const geo = new THREE.PlaneGeometry(MAP_SIZE, MAP_SIZE, GRID, GRID);
  geo.rotateX(-Math.PI / 2);

  const posAttr = geo.attributes.position;
  const colors = [];

  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const z = posAttr.getZ(i);

    // 高度起伏
    const h = Math.sin(x * 0.15) * Math.cos(z * 0.15) * 3
            + Math.sin(x * 0.05 + z * 0.07) * 2
            + Math.random() * 0.3;
    posAttr.setY(i, h);

    // 颜色随高度变化
    const green = Math.max(0, Math.min(1, 0.3 + h * 0.03));
    const brown = Math.max(0, 0.15 - h * 0.01);
    colors.push(brown * 0.5, green, brown * 0.3);
  }

  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.85,
    metalness: 0.05,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.name = 'terrain';
  scene.add(mesh);
  return mesh;
}

// 地图边界线
function createBorderLines() {
  const half = MAP_SIZE / 2;
  const pts = [
    new THREE.Vector3(-half, 0.1, -half),
    new THREE.Vector3( half, 0.1, -half),
    new THREE.Vector3( half, 0.1,  half),
    new THREE.Vector3(-half, 0.1,  half),
    new THREE.Vector3(-half, 0.1, -half),
  ];
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffff00, linewidth: 2 }));
  scene.add(line);
}

// 网格线
function createGrid() {
  const half = MAP_SIZE / 2;
  const step = MAP_SIZE / GRID;
  const points = [];
  for (let i = 0; i <= GRID; i++) {
    const p = -half + i * step;
    points.push(new THREE.Vector3(p, 0.05, -half), new THREE.Vector3(p, 0.05, half));
    points.push(new THREE.Vector3(-half, 0.05, p), new THREE.Vector3(half, 0.05, p));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const line = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.3 }));
  scene.add(line);
}

createTerrain();
createBorderLines();
createGrid();

// ─── 6. 单位（彩色方块） ──────────────────────────────────
const units = [];

function createUnit(race, x, z, label) {
  const info = RACES[race];
  const size = 0.6 + Math.random() * 0.3;
  const geo = new THREE.BoxGeometry(size, size * 1.5, size);
  const mat = new THREE.MeshStandardMaterial({
    color: info.color,
    roughness: 0.4,
    metalness: 0.3,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, size * 0.75, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData = { race, label, type: 'unit' };
  scene.add(mesh);
  units.push(mesh);
  return mesh;
}

// 人族单位
createUnit('TERRAN', -15, -10, 'Marine');
createUnit('TERRAN', -14, -12, 'Marine');
createUnit('TERRAN', -16, -11, 'Marine');
createUnit('TERRAN', -17, -13, 'Medic');
createUnit('TERRAN', -13, -14, 'Tank');

// 虫族单位
createUnit('ZERG', 15, 10, 'Zergling');
createUnit('ZERG', 16, 12, 'Zergling');
createUnit('ZERG', 17, 11, 'Zergling');
createUnit('ZERG', 14, 13, 'Hydralisk');
createUnit('ZERG', 18, 14, 'Ultralisk');

// 神族单位
createUnit('PROTOSS', 0, 15, 'Zealot');
createUnit('PROTOSS', 1, 17, 'Zealot');
createUnit('PROTOSS', -1, 16, 'Stalker');
createUnit('PROTOSS', 2, 18, 'Archon');

// ─── 7. 建筑 ────────────────────────────────────────────────
const buildings = [];

function createBuilding(race, x, z, w, h, d, name) {
  const info = RACES[race];
  const group = new THREE.Group();

  // 主体
  const bodyGeo = new THREE.BoxGeometry(w, h, d);
  const bodyMat = new THREE.MeshStandardMaterial({
    color: info.color,
    roughness: 0.5,
    metalness: 0.4,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = h / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // 顶部装饰
  const topGeo = new THREE.BoxGeometry(w * 0.6, h * 0.3, d * 0.6);
  const topMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(info.color).multiplyScalar(0.7),
    roughness: 0.3,
    metalness: 0.5,
  });
  const top = new THREE.Mesh(topGeo, topMat);
  top.position.y = h + h * 0.15;
  top.castShadow = true;
  group.add(top);

  // 底座
  const baseGeo = new THREE.BoxGeometry(w * 1.1, 0.3, d * 1.1);
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.8 });
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.y = 0.15;
  base.receiveShadow = true;
  group.add(base);

  group.position.set(x, 0, z);
  group.userData = { race, name, type: 'building' };
  scene.add(group);
  buildings.push(group);
  return group;
}

// 人族建筑
createBuilding('TERRAN', -25, -20, 5, 4, 5, 'Command Center');
createBuilding('TERRAN', -20, -25, 3, 2.5, 3, 'Supply Depot');
createBuilding('TERRAN', -22, -18, 2.5, 3, 2.5, 'Barracks');

// 虫族建筑
createBuilding('ZERG', 20, 18, 5, 3.5, 5, 'Hatchery');
createBuilding('ZERG', 25, 22, 3, 2, 3, 'Spawning Pool');
createBuilding('ZERG', 23, 15, 2.5, 2.5, 2.5, 'Extractor');

// 神族建筑
createBuilding('PROTOSS', -5, 25, 4.5, 4, 4.5, 'Nexus');
createBuilding('PROTOSS', 5, 28, 2.5, 3.5, 2.5, 'Gateway');
createBuilding('PROTOSS', -2, 30, 2, 2, 2, 'Pylon');

// ─── 8. RTS 摄像机控制 ─────────────────────────────────────
const camState = {
  target: new THREE.Vector3(0, 0, 0),
  distance: 55,
  angle: Math.PI / 4,
  azimuth: Math.PI / 4,
  minDist: 10,
  maxDist: 120,
  moveSpeed: 0.8,
  rotateSpeed: 0.003,
  zoomSpeed: 3,
  isDragging: false,
  isRotating: false,
  lastMouse: { x: 0, y: 0 },
};

function updateCamera() {
  const x = camState.target.x + camState.distance * Math.sin(camState.azimuth) * Math.cos(camState.angle);
  const y = camState.target.y + camState.distance * Math.sin(camState.angle);
  const z = camState.target.z + camState.distance * Math.cos(camState.azimuth) * Math.cos(camState.angle);
  camera.position.set(x, y, z);
  camera.lookAt(camState.target);
}

updateCamera();

// 键盘状态
const keys = {};
window.addEventListener('keydown', (e) => { keys[e.key.toLowerCase()] = true; });
window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

// 鼠标事件
const canvas = renderer.domElement;

canvas.addEventListener('mousedown', (e) => {
  if (e.button === 2 || e.button === 1) {
    camState.isRotating = true;
    camState.lastMouse.x = e.clientX;
    camState.lastMouse.y = e.clientY;
    e.preventDefault();
  }
});

canvas.addEventListener('mousemove', (e) => {
  if (camState.isRotating) {
    const dx = e.clientX - camState.lastMouse.x;
    const dy = e.clientY - camState.lastMouse.y;
    camState.azimuth -= dx * camState.rotateSpeed;
    camState.angle = Math.max(0.2, Math.min(1.4, camState.angle + dy * camState.rotateSpeed));
    camState.lastMouse.x = e.clientX;
    camState.lastMouse.y = e.clientY;
    updateCamera();
  }

  // 框选 - 按住左键拖动
  if (e.buttons === 1 && selectionState.selecting) {
    selectionState.currentX = e.clientX;
    selectionState.currentY = e.clientY;
  }
});

canvas.addEventListener('mouseup', (e) => {
  if (e.button === 2 || e.button === 1) {
    camState.isRotating = false;
  }
  if (e.button === 0 && selectionState.selecting) {
    finishSelection();
  }
});

canvas.addEventListener('wheel', (e) => {
  camState.distance = Math.max(camState.minDist, Math.min(camState.maxDist, camState.distance + e.deltaY * camState.zoomSpeed * 0.01));
  updateCamera();
  e.preventDefault();
}, { passive: false });

canvas.addEventListener('contextmenu', (e) => e.preventDefault());

// ─── 9. 框选系统 ────────────────────────────────────────────
const selectionState = {
  selecting: false,
  startX: 0, startY: 0,
  currentX: 0, currentY: 0,
  selectedUnits: [],
};

const selectionBox = document.createElement('div');
selectionBox.style.cssText = 'position:fixed;border:2px solid #0f0;background:rgba(0,255,0,0.15);pointer-events:none;display:none;z-index:100;';
document.body.appendChild(selectionBox);

canvas.addEventListener('mousedown', (e) => {
  if (e.button === 0) {
    selectionState.selecting = true;
    selectionState.startX = e.clientX;
    selectionState.startY = e.clientY;
    selectionState.currentX = e.clientX;
    selectionState.currentY = e.clientY;
    selectionBox.style.display = 'block';
    selectionBox.style.left = e.clientX + 'px';
    selectionBox.style.top = e.clientY + 'px';
    selectionBox.style.width = '0px';
    selectionBox.style.height = '0px';
  }
});

function finishSelection() {
  selectionState.selecting = false;
  selectionBox.style.display = 'none';

  const x1 = Math.min(selectionState.startX, selectionState.currentX);
  const y1 = Math.min(selectionState.startY, selectionState.currentY);
  const x2 = Math.max(selectionState.startX, selectionState.currentX);
  const y2 = Math.max(selectionState.startY, selectionState.currentY);

  // 如果框太小，视为点击
  if ((x2 - x1) < 5 && (y2 - y1) < 5) {
    // 取消所有选中
    selectionState.selectedUnits.forEach(u => {
      u.children.forEach(c => { if (c.material && c.material.emissive) c.material.emissive.set(0x000000); });
    });
    selectionState.selectedUnits = [];
    return;
  }

  // 投影到屏幕空间检查哪些单位在框内
  const tempVec = new THREE.Vector3();
  selectionState.selectedUnits = [];

  units.forEach((unit) => {
    tempVec.copy(unit.position);
    tempVec.project(camera);

    const sx = (tempVec.x + 1) / 2 * window.innerWidth;
    const sy = (-tempVec.y + 1) / 2 * window.innerHeight;

    if (sx >= x1 && sx <= x2 && sy >= y1 && sy <= y2) {
      selectionState.selectedUnits.push(unit);
    }
  });

  // 高亮选中单位
  selectionState.selectedUnits.forEach(u => {
    u.children.forEach(c => {
      if (c.material && c.material.emissive) c.material.emissive.set(0x003300);
    });
  });

  console.log(`[StarCraft] Selected ${selectionState.selectedUnits.length} units`);
}

// ─── 10. 右键放置标记 ──────────────────────────────────────
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const markers = [];

canvas.addEventListener('click', (e) => {
  if (e.button !== 0) return;

  // 仅左键点击（非框选）
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  // 查找地形交点
  const terrain = scene.getObjectByName('terrain');
  if (!terrain) return;

  const hits = raycaster.intersectObject(terrain);
  if (hits.length > 0) {
    const point = hits[0].point;

    // 创建一个半透明的绿色标记圈
    const markerGeo = new THREE.RingGeometry(0.5, 0.8, 16);
    markerGeo.rotateX(-Math.PI / 2);
    const markerMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
    const marker = new THREE.Mesh(markerGeo, markerMat);
    marker.position.set(point.x, 0.15, point.z);
    scene.add(marker);
    markers.push(marker);

    // 移动选中的单位到点击位置（视觉模拟）
    if (selectionState.selectedUnits.length > 0) {
      selectionState.selectedUnits.forEach((unit, i) => {
        const angle = (i / selectionState.selectedUnits.length) * Math.PI * 2;
        const targetX = point.x + Math.cos(angle) * 1.5;
        const targetZ = point.z + Math.sin(angle) * 1.5;
        // 简单动画移动
        animateMove(unit, targetX, targetZ);
      });
    }

    console.log(`[StarCraft] Move command at (${point.x.toFixed(1)}, ${point.z.toFixed(1)})`);
  }
});

function animateMove(obj, tx, tz) {
  const startX = obj.position.x;
  const startZ = obj.position.z;
  const duration = 800;
  const startTime = performance.now();

  function step(now) {
    const t = Math.min(1, (now - startTime) / duration);
    const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    obj.position.x = startX + (tx - startX) * ease;
    obj.position.z = startZ + (tz - startZ) * ease;
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ─── 11. UI 覆盖层 ─────────────────────────────────────────
const uiOverlay = document.createElement('div');
uiOverlay.style.cssText = 'position:fixed;top:0;left:0;right:0;pointer-events:none;font-family:monospace;color:#0f0;z-index:50;padding:10px;';
uiOverlay.innerHTML = `
  <div style="display:flex;justify-content:space-between;">
    <div>
      <div style="font-size:20px;font-weight:bold;text-shadow:0 0 10px #0f0;">⚔ StarCraft Web 3D</div>
      <div style="font-size:12px;color:#888;">WASD移动 | 鼠标中键/右键旋转 | 滚轮缩放 | 左键框选 | 右键地面移动</div>
    </div>
    <div id="unit-info" style="text-align:right;font-size:13px;"></div>
  </div>
`;
document.body.appendChild(uiOverlay);

// ─── 12. 资源栏 ─────────────────────────────────────────────
const resourceBar = document.createElement('div');
resourceBar.style.cssText = 'position:fixed;bottom:10px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.8);border:1px solid #444;padding:8px 20px;border-radius:6px;color:#fff;font-family:monospace;font-size:13px;z-index:50;display:flex;gap:20px;pointer-events:none;';
resourceBar.innerHTML = `
  <span>💎 Minerals: 500</span>
  <span>⚗ Gas: 200</span>
  <span>👥 Supply: 24/36</span>
  <span style="color:#4488ff;">Blue: Human</span>
  <span style="color:#ff4444;">Red: Zerg</span>
  <span style="color:#ffdd44;">Yellow: Protoss</span>
`;
document.body.appendChild(resourceBar);

// ─── 13. 渲染循环 ───────────────────────────────────────────
let lastTime = performance.now();
let frameCount = 0;

function animate(now) {
  requestAnimationFrame(animate);

  const dt = (now - lastTime) / 1000;
  lastTime = now;
  frameCount++;

  // WASD / 方向键移动
  const speed = camState.moveSpeed * (keys['shift'] ? 2.5 : 1);
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();
  const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();

  if (keys['w'] || keys['arrowup'])    camState.target.add(forward.clone().multiplyScalar(speed));
  if (keys['s'] || keys['arrowdown'])  camState.target.add(forward.clone().multiplyScalar(-speed));
  if (keys['a'] || keys['arrowleft'])  camState.target.add(right.clone().multiplyScalar(-speed));
  if (keys['d'] || keys['arrowright']) camState.target.add(right.clone().multiplyScalar(speed));

  // 限制目标在地图范围内
  const half = MAP_SIZE / 2 - 5;
  camState.target.x = Math.max(-half, Math.min(half, camState.target.x));
  camState.target.z = Math.max(-half, Math.min(half, camState.target.z));

  updateCamera();

  // 单位微微浮动
  units.forEach((u, i) => {
    u.position.y = u.userData._baseY || (u.userData._baseY = u.position.y)
                   + Math.sin(now * 0.002 + i) * 0.05;
    u.rotation.y = Math.sin(now * 0.001 + i * 0.5) * 0.1;
  });

  // 标记淡出
  markers.forEach((m, i) => {
    if (m.material.opacity > 0) {
      m.material.opacity -= 0.005;
      if (m.material.opacity <= 0) {
        scene.remove(m);
        markers.splice(i, 1);
      }
    }
  });

  // 更新单位信息
  if (selectionState.selectedUnits.length > 0) {
    const info = selectionState.selectedUnits[0].userData;
    document.getElementById('unit-info').innerHTML =
      `<div style="color:${new THREE.Color(RACES[info.race].color).getStyle()};">` +
      `● ${RACES[info.race].label} - ${info.label}</div>` +
      `<div>Selected: ${selectionState.selectedUnits.length} units</div>`;
  } else {
    document.getElementById('unit-info').innerHTML = '';
  }

  renderer.render(scene, camera);
}

// ─── 14. 窗口大小调整 ──────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── 启动 ──────────────────────────────────────────────────
console.log('⭐ StarCraft Web loaded! 3D scene ready.');
console.log('Controls: WASD=move, Mouse Middle/Right=rotate, Scroll=zoom, Left drag=select, Right click ground=move');

requestAnimationFrame(animate);
