# 3D网页版星际争霸 - 系统架构文档

> 版本: v0.1.0 | 日期: 2026-05-27

## 1. 项目概述

基于 Three.js + Vue3 的浏览器端3D星际争霸1复刻版。支持单人战役、AI对战，远期目标包含局域网P2P联机。

## 2. 技术栈

| 层级 | 技术 | 用途 |
|------|------|------|
| 3D渲染 | Three.js r160 | 场景、模型、特效、光照 |
| UI框架 | Vue3 + Vite | HUD、建造栏、菜单 |
| 游戏逻辑 | TypeScript | RTS核心规则、AI、寻路 |
| 并行计算 | WebWorker | 寻路、AI决策、物理碰撞 |
| 后端 | Node.js + WebSocket | 联机对战、房间管理 |
| 构建 | Vite | HMR、打包、资源管理 |

## 3. 目录结构

```
starcraft-web/
├── src/
│   ├── engine/           # 3D引擎层
│   │   ├── Renderer.js       # Three.js渲染器封装
│   │   ├── Camera.js         # RTS摄像机控制（缩放/旋转/平移）
│   │   ├── Terrain.js        # 地形系统（高度图+贴图）
│   │   ├── Models.js         # 单位3D模型加载管理
│   │   ├── Particles.js      # 粒子特效系统
│   │   ├── Animation.js      # 骨骼动画控制器
│   │   ├── Raycaster.js      # 鼠标拾取（选中单位）
│   │   └── Shader.js         # 自定义着色器
│   ├── game/             # 游戏逻辑层
│   │   ├── GameManager.js    # 游戏主循环
│   │   ├── ResourceManager.js # 水晶/瓦斯资源管理
│   │   ├── BuildingSystem.js  # 建筑建造系统
│   │   ├── UnitProducer.js    # 单位生产队列
│   │   ├── CombatSystem.js    # 战斗系统（伤害/护甲/克制）
│   │   ├── TechTree.js        # 科技树
│   │   ├── Pathfinding.js     # A*寻路（WebWorker）
│   │   ├── Selection.js       # 框选/编队系统
│   │   ├── CommandSystem.js   # 单位命令系统（移动/攻击/技能）
│   │   └── AI/
│   │       ├── AIController.js    # AI总控
│   │       ├── BuildOrder.js      # AI建造顺序
│   │       ├── ThreatMap.js       # 威胁评估
│   │       └── MicroManager.js    # 微操AI
│   ├── races/            # 种族数据定义
│   │   ├── terran/           # 人族
│   │   │   ├── units.js      # 兵种定义
│   │   │   ├── buildings.js  # 建筑定义
│   │   │   └── tech.js       # 科技树
│   │   ├── zerg/             # 虫族
│   │   │   ├── units.js
│   │   │   ├── buildings.js
│   │   │   └── tech.js
│   │   └── protoss/          # 神族
│   │       ├── units.js
│   │       ├── buildings.js
│   │       └── tech.js
│   ├── ui/               # Vue3 UI层
│   │   ├── App.vue           # 主组件
│   │   ├── components/
│   │   │   ├── GameHUD.vue       # 游戏内HUD
│   │   │   ├── BuildPanel.vue    # 侧边建造栏
│   │   │   ├── MiniMap.vue       # 小地图
│   │   │   ├── ResourceBar.vue   # 资源面板
│   │   │   ├── UnitInfo.vue      # 选中单位信息
│   │   │   ├── TechPanel.vue     # 科技面板
│   │   │   └── MainMenu.vue      # 主菜单
│   │   └── styles/
│   │       └── game.css          # 游戏UI样式
│   ├── shared/           # 共享工具
│   │   ├── Constants.js      # 常量定义
│   │   ├── EventBus.js       # 事件总线
│   │   └── MathUtils.js      # 数学工具
│   └── main.js           # 入口文件
├── server/               # 联机后端
│   ├── index.js              # WebSocket服务器
│   ├── RoomManager.js        # 房间管理
│   └── GameSync.js           # 游戏状态同步
├── public/
│   └── index.html            # HTML入口
├── tests/                # 测试
├── docs/                 # 文档
├── package.json
├── vite.config.js
└── index.html
```

## 4. 核心系统设计

### 4.1 游戏主循环
```
requestAnimationFrame loop:
  1. 输入处理（鼠标/键盘事件队列）
  2. 游戏逻辑更新（dt步进）
     ├── 资源采集结算
     ├── 建造进度更新
     ├── 单位生产队列
     ├── 科技研发进度
     ├── AI决策（每N帧）
     ├── 寻路计算（WebWorker异步）
     ├── 战斗计算（伤害/死亡）
     └── 粒子特效更新
  3. 渲染（Three.js scene.render）
  4. UI更新（Vue3 reactive响应）
```

### 4.2 数据流
```
User Input → CommandSystem → GameManager → 各子系统
                                        ↓
                              EventBus事件广播
                                        ↓
                    Engine(渲染) ← ← ← ← UI(面板更新)
```

### 4.3 种族数据模型
每个单位/建筑/科技 = 一个数据对象：
```javascript
{
  id: 'marine',
  name: '机枪兵',
  race: 'terran',
  type: 'unit',
  cost: { minerals: 50, gas: 0, supply: 1 },
  buildTime: 24, // 游戏tick
  hp: 40, armor: 0, shield: 0,
  attack: { damage: 6, range: 4, speed: 15, type: 'normal' },
  abilities: ['stimpack', 'siege_mode'],
  prerequisites: ['barracks', 'academy'],
  model: 'marine.glb',
  animations: { idle: 'idle', walk: 'walk', attack: 'attack', death: 'death' }
}
```

### 4.4 战斗公式（复刻SC1）
- 伤害 = 攻击力 × 克制系数 - 护甲
- 克制系数: normal=1, explosive=100%(大型)/50%(中型)/25%(小型), concussive=100%(小型)/50%(中型)/25%(大型)
- 护盾吸收: 盾优先扣减，护盾类型=灵能
- 攻击速度: 每N个tick攻击一次

## 5. 渲染管线

### 5.1 地形
- 128×128 地形网格（可配置）
- 高度图灰度纹理 + 多层混合贴图
- 可通行区域标记（用于寻路）

### 5.2 单位渲染
- InstancedMesh批量渲染同类单位（性能优化）
- LOD: 远距离简化模型
- 选中高亮: 发光轮廓着色器
- 血条: Billboard + HTML覆盖层

### 5.3 特效系统
- 粒子发射器: 爆炸/烟雾/火焰/光束
- 弹道轨迹: 贝塞尔曲线插值
- 建造动画: 渐进式模型显现
- 死亡特效: 碎裂 + 淡出

## 6. 性能目标
- 100+ 单位同时在场 ≥30fps
- 128×128 地形流畅渲染
- WebWorker寻路 <50ms/次
- 首屏加载 <3s（资源懒加载）
