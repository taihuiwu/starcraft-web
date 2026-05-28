# ⭐ StarCraft Web

> 基于浏览器的经典即时战略游戏复刻 —— Three.js + Vue3 构建的 3D 网页版星际争霸，支持多人联机、战役模式和桌面版。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Version](https://img.shields.io/badge/version-0.1.0-green.svg)](./package.json)

---

## ✨ 功能亮点

- 🎮 **经典三大种族** — 人族 (Terran) / 虫族 (Zerg) / 神族 (Protoss)，完整单位和建筑体系
- ⚔️ **完整 RTS 玩法** — 采矿、建造、训练、科技升级、侦察、扩张
- 🗺️ **多张对战地图** — Lost Temple、Fighting Spirit 等经典地图 + Python 密码地图
- 🤖 **智能 AI 系统** — 行为决策树 + 单位微操 + 经济调度 + 编队管理
- 🌐 **WebSocket 多人联机** — 大厅匹配、房间管理、状态同步
- 🎨 **高画质 3D 渲染** — PBR 光照、高级水面、动态草地、天气系统、后处理特效
- 🏔️ **精美地形** — 高度图地形、水体动画、草地摇摆、粒子特效
- 🏰 **战役系统** — 三族独立战役脚本、关卡定义、胜利条件
- 💾 **存档系统** — 游戏保存/加载、自动存档、序列化
- 🔊 **完整音效** — Web Audio API 程序化音效：BGM、单位语音、战斗音效、空间音频
- 📱 **移动端适配** — 触控手势识别、响应式 HUD、滑动面板
- ⚡ **性能优化** — LOD、四叉树空间分区、实例化渲染、WebWorker、性能监控
- 🖥️ **Electron 桌面版** — 支持 Windows / macOS / Linux，原生菜单 + IPC 通信
- 🗺️ **地图编辑器** — 可视化地图编辑、单位放置

## 🛠️ 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| [Three.js](https://threejs.org/) | r160 | 3D 渲染引擎 — 场景、模型、粒子、后处理 |
| [Vue 3](https://vuejs.org/) | 3.x | UI 框架 — HUD、面板、组件化界面 |
| [Vite](https://vitejs.dev/) | 5.x | 构建工具 — HMR、ESBuild、Tree-shaking |
| [Electron](https://www.electronjs.org/) | 33.x | 桌面应用打包 — 跨平台原生支持 |
| [Vitest](https://vitest.dev/) | 1.x | 单元测试框架 |
| [WebSocket](https://developer.mozilla.org/zh-CN/docs/Web/API/WebSocket) | — | 实时多人联机通信 |
| Web Workers | — | 后台线程 — 寻路、AI 计算 |

## 🚀 快速开始

### 环境要求

- **Node.js** ≥ 18
- **npm** ≥ 9

### 安装 & 运行

```bash
# 1. 克隆仓库
git clone https://github.com/your-username/starcraft-web.git
cd starcraft-web

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev
```

浏览器访问 **http://localhost:5173**，选择种族即可开始游戏。

### 联机服务器

```bash
# 启动游戏服务器（端口 8080）
npm run server

# 开发模式（自动重载）
npm run server:dev
```

## 🖥️ Electron 桌面版

```bash
# 开发模式（Vite + Electron 同时启动）
npm run electron:dev

# 构建 Windows 安装包 (NSIS + Portable)
npm run electron:build:win

# 构建 macOS 安装包 (DMG + ZIP)
npm run electron:build:mac

# 构建 Linux 安装包 (AppImage + DEB)
npm run electron:build:linux

# 一次性构建全平台
npm run electron:build:all
```

构建产物输出到 `release/` 目录。

## 🏗️ 项目架构

```
┌─────────────────────────────────────────────────────────────┐
│                     StarCraft Web v0.1.0                    │
├─────────────┬─────────────┬─────────────┬───────────────────┤
│   Engine    │    Game     │  Network    │    Desktop        │
│ ─────────── │ ─────────── │ ─────────── │ ──────────────── │
│ Renderer    │ GameManager │ WS Client   │ Electron Main    │
│ Camera      │ Units       │ Lobby       │ IPC Bridge       │
│ Terrain     │ AI System   │ Sync        │ Native Menu      │
│ Particles   │ Combat      │ Protocol    │ Auto Updater     │
│ PostProcess │ Pathfinding │ Room Mgr    │                  │
│ Water       │ Tech Tree   │             │                  │
│ Grass       │ Buildings   │             │                  │
│ LOD         │ Selection   │             │                  │
│ Quadtree    │ Campaign    │             │                  │
│ Instanced   │ Save/Load   │             │                  │
├─────────────┴─────────────┴─────────────┴───────────────────┤
│              Vue 3 UI (HUD / Panels / MiniMap)              │
├─────────────────────────────────────────────────────────────┤
│        Shared Utils / EventBus / WebWorker Pool             │
└─────────────────────────────────────────────────────────────┘
           ↕ WebSocket ↕
┌─────────────────────────────────────────────────────────────┐
│              Node.js Game Server (Port 8080)                │
│       Protocol / RoomManager / GameSync / NetworkPlayer     │
└─────────────────────────────────────────────────────────────┘
```

### 📁 目录结构

```
starcraft-web/
├── src/
│   ├── engine/            # 渲染引擎（Three.js）
│   │   ├── Renderer.js        # 渲染器封装
│   │   ├── Camera.js          # RTS 摄像机控制器
│   │   ├── Terrain.js         # 地形生成与渲染
│   │   ├── Water.js           # 高级水面系统
│   │   ├── GrassSystem.js     # 草地渲染
│   │   ├── Particles.js       # 粒子特效
│   │   ├── PostProcessing.js  # 后处理特效
│   │   ├── LODSystem.js       # Level of Detail
│   │   ├── Quadtree.js        # 四叉树空间分区
│   │   ├── InstancedMeshPool.js # 实例化渲染池
│   │   └── ...
│   ├── game/              # 游戏逻辑
│   │   ├── GameManager.js     # 游戏主管理器
│   │   ├── CommandSystem.js   # 单位命令系统
│   │   ├── CombatSystem.js    # 战斗系统
│   │   ├── TechTree.js        # 科技树
│   │   ├── BuildingSystem.js  # 建筑系统
│   │   ├── Selection.js       # 单位选择
│   │   ├── Pathfinding.js     # A* 寻路
│   │   ├── AI/                # 人工智能
│   │   ├── campaign/          # 战役系统
│   │   ├── maps/              # 地图数据
│   │   └── save/              # 存档系统
│   ├── ui/                # Vue 3 界面
│   │   ├── App.vue            # 根组件
│   │   ├── main.js            # UI 入口
│   │   └── components/        # UI 组件
│   │       ├── GameHUD.vue        # 游戏 HUD
│   │       ├── BuildPanel.vue     # 建造面板
│   │       ├── TechPanel.vue      # 科技面板
│   │       ├── MiniMap.vue        # 小地图
│   │       ├── UnitInfo.vue       # 单位信息
│   │       ├── ResourceBar.vue    # 资源栏
│   │       └── MainMenu.vue       # 主菜单
│   ├── audio/             # 音效系统
│   ├── network/           # 网络通信（客户端）
│   ├── mobile/            # 移动端适配
│   ├── races/             # 种族定义（三族兵种/建筑/科技）
│   ├── shared/            # 公共工具（EventBus/Constants/MathUtils）
│   ├── worker/            # WebWorker（寻路/AI 后台计算）
│   └── editor/            # 地图编辑器
├── server/                # Node.js 游戏服务器
│   ├── index.js               # 服务器入口
│   ├── Protocol.js            # 通信协议
│   ├── RoomManager.js         # 房间管理
│   ├── GameSync.js            # 状态同步
│   └── NetworkPlayer.js       # 网络玩家
├── electron/              # Electron 桌面版
│   ├── main.mjs               # 主进程
│   └── preload.mjs            # 预加载脚本
├── tests/                 # 单元测试
├── docs/                  # 设计文档
├── public/                # 静态资源
├── index.html             # 入口 HTML
├── package.json
└── vite.config.js
```

## 🎮 操作指南

### 鼠标操作

| 操作 | 功能 |
|------|------|
| 左键点击 | 选择单位/建筑 |
| 右键点击 | 移动 / 攻击 / 采集 |
| 框选（左键拖拽） | 多选单位 |
| 中键拖拽 | 旋转视角 |
| 滚轮 | 缩放视角 |
| 双击单位 | 选中同类单位 |

### 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| `B` | 打开建造面板 |
| `T` | 打开科技面板 |
| `M` | 切换小地图 |
| `ESC` | 取消选择 / 关闭面板 |
| `Space` | 跳转到主基地 |
| `F1` | 视角预设 1 |
| `F2` | 视角预设 2 |
| `F3` | 视角预设 3 |
| `1` - `9` | 切换编组 |
| `Ctrl+数字` | 将选中单位编组 |
| `Ctrl+G` | 编队移动（阵型） |

### 触控操作（移动端）

| 手势 | 功能 |
|------|------|
| 点击 | 选择单位 |
| 长按 | 详细信息 |
| 双指捏合 | 缩放视角 |
| 滑动 | 平移地图 |
| 四向滑动 | 切换面板 |

## 📊 已完成功能清单

| 模块 | 功能 | 状态 |
|------|------|------|
| **引擎核心** | Three.js 渲染管线 | ✅ |
| | 游戏主循环 (60fps) | ✅ |
| | RTS 摄像机控制 (WASD/拖拽/缩放) | ✅ |
| | 地形生成 (高度图) | ✅ |
| | 水面动画 (顶点着色器) | ✅ |
| | 草地系统 (风力摇摆) | ✅ |
| | 粒子特效 (爆炸/建造/收集) | ✅ |
| | 后处理 (泛光/Bloom/SSAO) | ✅ |
| | LOD 渲染 | ✅ |
| | 四叉树空间分区 | ✅ |
| | 实例化渲染池 | ✅ |
| | WebWorker 后台计算 | ✅ |
| | 性能监控 (FPS/Memory) | ✅ |
| **游戏逻辑** | A* 寻路 (缓存优化) | ✅ |
| | 战斗系统 (伤害类型/护甲/护盾) | ✅ |
| | 资源管理 (矿石/气矿/人口) | ✅ |
| | 科技树系统 | ✅ |
| | 建筑系统 (建造/取消) | ✅ |
| | 单位选择 (单选/框选/编组) | ✅ |
| | 命令系统 (移动/攻击/采集/巡逻) | ✅ |
| | 编队阵型 | ✅ |
| | 战争迷雾 | ✅ |
| **种族数据** | 人族 (Terran) — 兵种/建筑/科技 | ✅ |
| | 虫族 (Zerg) — 兵种/建筑/科技 | ✅ |
| | 神族 (Protoss) — 兵种/建筑/科技 | ✅ |
| **AI 系统** | 行为决策树 | ✅ |
| | 单位微操 AI | ✅ |
| | 智能经济调度 | ✅ |
| | 编队管理 | ✅ |
| **多人联机** | WebSocket 通信 | ✅ |
| | 大厅匹配系统 | ✅ |
| | 房间管理 | ✅ |
| | 游戏状态同步 | ✅ |
| **UI 系统** | Vue 3 HUD | ✅ |
| | 建造面板 | ✅ |
| | 科技面板 | ✅ |
| | 小地图 | ✅ |
| | 单位信息面板 | ✅ |
| | 资源栏 | ✅ |
| | 主菜单 | ✅ |
| **音效系统** | Web Audio API 引擎 | ✅ |
| | BGM 背景音乐 | ✅ |
| | 单位语音 | ✅ |
| | 战斗音效 | ✅ |
| | 空间音效 | ✅ |
| **战役系统** | 三族独立战役 | ✅ |
| | 关卡脚本引擎 | ✅ |
| | 胜利/失败条件 | ✅ |
| **存档系统** | 游戏保存/加载 | ✅ |
| | 自动存档 | ✅ |
| | 序列化/反序列化 | ✅ |
| **地图系统** | Lost Temple | ✅ |
| | Fighting Spirit | ✅ |
| | 地图编辑器 | ✅ |
| **移动端** | 触控手势识别 | ✅ |
| | 触控控制 | ✅ |
| | 响应式 HUD | ✅ |
| **桌面版** | Electron 打包 (Win/Mac/Linux) | ✅ |
| | IPC 通信 | ✅ |
| | 原生菜单 | ✅ |

## ⚠️ 已知问题

1. **3D 模型缺失** — 目前使用几何体占位，尚未加载真实星际争霸 3D 模型
2. **多人同步延迟** — 网络延迟高时可能出现单位位置不同步
3. **AI 决策深度有限** — 高级战术（如空投、扩张策略）尚未实现
4. **空中单位** — 空军战斗逻辑待完善
5. **存档兼容性** — 不同版本间存档格式可能不兼容
6. **移动端性能** — 低端移动设备可能出现帧率下降
7. **浏览器兼容** — 最低要求 Chrome 90+ / Firefox 88+ / Safari 14+
8. **地图编辑器** — 功能较为基础，缺少撤销/重做和高级编辑工具
9. **音效资源** — 程序化音效与原版差异较大，待替换为真实音效

## 📝 测试

```bash
# 运行所有测试
for f in tests/test_*.js; do node "$f"; done

# 测试覆盖
# ├── test_combat.js     — 战斗系统（伤害类型/护甲/护盾/武器加成）27 tests
# ├── test_eventbus.js   — 事件总线（发布/订阅/生命周期）         13 tests
# ├── test_mathutils.js  — 数学工具（距离/插值/碰撞/坐标转换）    40 tests
# ├── test_pathfinding.js— A* 寻路（路径/障碍/缓存）             12 tests
# └── test_resources.js  — 资源系统（采集/消耗/人口/回收）        26 tests
```

**当前测试结果：118 tests passed, 0 failures** ✅

## 🤝 贡献指南

请查看 [CONTRIBUTING.md](./CONTRIBUTING.md) 了解详细贡献流程。

**快速摘要：**
1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: 添加惊天功能'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

**Commit 规范：**
- `feat:` 新功能
- `fix:` 修复 Bug
- `docs:` 文档更新
- `test:` 测试相关
- `refactor:` 代码重构
- `chore:` 构建/工具相关
- `perf:` 性能优化

## 📄 许可证

[MIT License](./LICENSE) © 2026 StarCraft Web Contributors
