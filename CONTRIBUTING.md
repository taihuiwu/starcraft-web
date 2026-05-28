# 🤝 贡献指南

感谢你对 StarCraft Web 的关注！我们欢迎各种形式的贡献。

## 🚀 快速开始

### 开发环境搭建

```bash
# 1. Fork 并克隆仓库
git clone https://github.com/your-username/starcraft-web.git
cd starcraft-web

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev
```

### 运行测试

```bash
# 运行全部测试
for f in tests/test_*.js; do node "$f"; done

# 运行单个测试
node tests/test_combat.js
```

### 语法检查

```bash
# 检查所有 JS/MJS 文件语法
find src server electron -name '*.js' -o -name '*.mjs' | while read f; do
  node --check "$f" 2>&1 | grep -v "^$" && echo "FAIL: $f"
done
```

## 📝 提交规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

| 前缀 | 说明 | 示例 |
|------|------|------|
| `feat:` | 新功能 | `feat: 添加飞龙单位` |
| `fix:` | Bug 修复 | `fix: 修复寻路卡顿问题` |
| `docs:` | 文档更新 | `docs: 更新 API 文档` |
| `test:` | 测试相关 | `test: 添加 AI 决策树测试` |
| `refactor:` | 代码重构 | `refactor: 优化碰撞检测` |
| `chore:` | 构建/工具 | `chore: 更新依赖版本` |
| `perf:` | 性能优化 | `perf: 实施 LOD 渲染` |
| `style:` | 代码格式 | `style: 统一缩进风格` |

## 🌿 分支策略

- `master` — 稳定版本
- `develop` — 开发分支
- `feature/*` — 功能分支
- `fix/*` — 修复分支

## 📋 代码规范

### JavaScript
- 使用 ES Module（`import/export`）
- 函数和变量使用 camelCase
- 类名使用 PascalCase
- 常量使用 UPPER_SNAKE_CASE
- 每个文件保持单一职责
- 优先使用 `const`，需要时使用 `let`，避免 `var`

### Vue 组件
- 使用 `<script setup>` 语法
- Props 使用 camelCase 声明
- 组件文件名使用 PascalCase

### 提交前检查
1. 确保代码无语法错误：`node --check src/xxx.js`
2. 运行相关测试确保通过
3. 新功能需附带测试用例

## 🏗️ 项目模块

如果你想参与开发，以下是各模块的入口和说明：

| 模块 | 入口文件 | 说明 |
|------|----------|------|
| 渲染引擎 | `src/engine/Renderer.js` | Three.js 封装、场景管理 |
| 摄像机 | `src/engine/Camera.js` | RTS 摄像机控制器 |
| 游戏主逻辑 | `src/game/GameManager.js` | 游戏循环、状态管理 |
| 战斗系统 | `src/game/CombatSystem.js` | 伤害计算、武器类型 |
| 寻路 | `src/game/Pathfinding.js` | A* 算法 |
| AI | `src/game/AI/AIController.js` | AI 决策与控制 |
| 种族数据 | `src/races/*/` | 兵种/建筑/科技定义 |
| UI 组件 | `src/ui/components/` | Vue 3 界面组件 |
| 联机通信 | `src/network/` | WebSocket 客户端 |
| 服务器 | `server/index.js` | Node.js 游戏服务器 |
| 桌面版 | `electron/main.mjs` | Electron 主进程 |

## 🐛 报告问题

提交 Issue 时请包含：
- 问题描述
- 复现步骤
- 期望行为 vs 实际行为
- 浏览器/系统信息
- 截图或控制台日志

## 🎯 当前急需

- [ ] 更多 AI 行为模式（空投、扩张策略）
- [ ] 空中单位战斗逻辑
- [ ] 多人游戏稳定性优化
- [ ] 移动端手势交互增强
- [ ] 教程/新手引导系统
- [ ] 3D 模型替换（程序化占位 → 真实模型）
- [ ] 音效资源替换
- [ ] 地图编辑器撤销/重做功能

## 📄 许可证

贡献的代码将在 MIT License 下发布。
