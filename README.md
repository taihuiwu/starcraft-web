# ⭐ StarCraft Web

> 基于浏览器的经典即时战略游戏复刻，支持多人联机、战役模式和桌面版。

## ✨ 功能亮点

- 🎮 经典三大种族（人族/虫族/神族），完整单位和建筑体系
- 🗺️ 实时战略核心玩法：采矿、建造、训练、科技升级
- 🤖 AI 决策树 + 微操系统
- 🌐 WebSocket 多人联机（大厅/房间/同步）
- 🎨 Three.js 高画质渲染：PBR光照/水面/草地/后处理
- 📱 移动端触控适配
- 🔊 完整音效系统
- 🏰 战役系统
- ⚡ 性能优化：LOD/四叉树/实例化/WebWorker
- 🖥️ Electron 桌面版（Windows/macOS/Linux）

## 🛠️ 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Three.js | r160 | 3D 渲染引擎 |
| Vue 3 | 3.x | UI 框架 |
| Vite | 5.x | 构建工具 |
| Electron | latest | 桌面版打包 |
| Vitest | 1.x | 测试框架 |

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

浏览器访问 http://localhost:5173

## 🖥️ 桌面版构建

```bash
# Windows
npm run electron:build:win

# macOS
npm run electron:build:mac

# Linux
npm run electron:build:linux
```

## 🎯 功能列表

| 模块 | 说明 |
|------|------|
| **引擎核心** | 游戏主循环、资源管理、渲染管线 |
| **游戏逻辑** | A*寻路、战斗系统、科技树、单位控制 |
| **AI系统** | 行为决策树、微操算法、经济调度 |
| **多人联机** | WebSocket通信、房间管理、状态同步 |
| **UI系统** | HUD、建造面板、小地图、单位信息 |
| **画质系统** | 后处理、PBR光照、水面、草地、天气 |
| **音效系统** | 单位语音、战斗音效、环境音 |
| **战役系统** | 关卡定义、脚本事件、胜利条件 |
| **存档系统** | 游戏保存/加载、序列化 |
| **编辑器** | 地图编辑、单位放置 |
| **桌面版** | Electron打包、跨平台支持 |

## 🏗️ 项目架构

```
┌─────────────────────────────────────────────┐
│                  StarCraft Web              │
├──────────┬──────────┬──────────┬────────────┤
│  Engine  │   Game   │ Network  │  Desktop   │
│ ──────── │ ──────── │ ──────── │ ────────── │
│ Renderer │ Units    │ WS Client│ Electron   │
│ Loop     │ AI       │ Lobby    │ Preload    │
│ Resource │ Combat   │ Sync     │            │
│ Camera   │ Tech     │ Protocol │            │
│ PostProc │ Save     │          │            │
│ Water    │ Maps     │          │            │
│ Grass    │ Campaign │          │            │
├──────────┴──────────┴──────────┴────────────┤
│          Vue 3 UI (HUD/Panels/MiniMap)      │
├─────────────────────────────────────────────┤
│           Shared Utils / Worker Pool        │
└─────────────────────────────────────────────┘
         ↕ WebSocket ↕
┌─────────────────────────────────────────────┐
│          Node.js Game Server                │
│   (Protocol / RoomManager / GameSync)       │
└─────────────────────────────────────────────┘
```

## 🎮 操作指南

### 鼠标操作
| 操作 | 功能 |
|------|------|
| 左键点击 | 选择单位/建筑 |
| 右键点击 | 移动/攻击/采集 |
| 框选 | 多选单位 |
| 拖拽中键 | 旋转视角 |
| 滚轮 | 缩放 |

### 键盘快捷键
| 快捷键 | 功能 |
|--------|------|
| `B` | 打开建造面板 |
| `T` | 打开科技面板 |
| `M` | 切换小地图 |
| `ESC` | 取消选择/关闭面板 |
| `1-9` | 编组单位 |
| `Space` | 跳转到主基地 |
| `F1-F3` | 切换视角预设 |

## 📁 项目目录结构

```
starcraft-web/
├── src/
│   ├── engine/        # 渲染引擎（Three.js）
│   ├── game/          # 游戏逻辑
│   │   ├── AI/        # 人工智能
│   │   ├── campaign/  # 战役系统
│   │   ├── maps/      # 地图数据
│   │   └── save/      # 存档系统
│   ├── ui/            # Vue 3 界面
│   │   └── components/# UI组件
│   ├── audio/         # 音效系统
│   ├── network/       # 网络通信
│   ├── shared/        # 公共工具
│   ├── worker/        # WebWorker
│   ├── races/         # 种族定义
│   └── editor/        # 地图编辑器
├── server/            # 游戏服务器
├── electron/          # 桌面版入口
├── tests/             # 测试文件
├── docs/              # 设计文档
└── package.json
```

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
- `chore:` 构建/工具相关

## 📄 许可证

[MIT License](./LICENSE) © 2026
