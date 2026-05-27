# StarCraft Web - 测试报告 & 代码质量检查

> 生成时间: 2026-05-27
> 测试运行环境: Node.js v26, ES Module 项目

---

## 1. 语法检查

对全部 **31个** JS 源文件执行 `node --check` 语法检查：

| 状态 | 说明 |
|------|------|
| ✅ 通过 | 31/31 文件语法正确，0 个错误 |

所有文件语法检查均通过，无需修复。

---

## 2. 单元测试结果

### 总览

| 指标 | 数量 |
|------|------|
| 测试总数 | **118** |
| 通过 | **118** |
| 失败 | **0** |
| 测试文件 | 5 个 |

### 各测试文件详情

#### `tests/test_mathutils.js` — 数学工具 (40 个测试)

| 分组 | 测试项 | 结果 |
|------|--------|------|
| distance2D | 同点/水平/垂直/3-4-5三角/z属性 | ✅ 5/5 |
| distance3D | 同点/3D距离 | ✅ 2/2 |
| distanceSq2D | 平方距离 | ✅ 1/1 |
| lerp | 边界值/中点/夹紧 | ✅ 5/5 |
| clamp | 范围内/低于最小/高于最大/边界 | ✅ 5/5 |
| normalize2D | 水平/垂直/对角/零向量 | ✅ 4/4 |
| circleCollision | 重叠/接触/远离/包含 | ✅ 4/4 |
| worldToGrid | 原点/小数/自定义tileSize | ✅ 3/3 |
| gridToWorld | 原点/格子/自定义tileSize | ✅ 3/3 |
| degToRad/radToDeg | 90°/π/2/往返 | ✅ 3/3 |
| angleToTarget | 右方/上方 | ✅ 2/2 |
| computeAABB | 多点包围盒 | ✅ 1/1 |
| randomInt/Float | 范围验证 | ✅ 2/2 |

#### `tests/test_eventbus.js` — 事件总线 (13 个测试)

| 分组 | 测试项 | 结果 |
|------|--------|------|
| on/emit/off | 触发/多监听器/移除/解绑/无监听器/事件独立 | ✅ 6/6 |
| once | 只触发一次/传递数据/与on共存 | ✅ 3/3 |
| clearAll | 清除所有/清除指定事件 | ✅ 2/2 |
| 错误处理 | 监听器异常不中断其他/once异常不影响on | ✅ 2/2 |

#### `tests/test_resources.js` — 资源系统 (26 个测试)

| 分组 | 测试项 | 结果 |
|------|--------|------|
| 初始化 | 8队初始化/获取资源/自动创建 | ✅ 3/3 |
| addResource | 增加矿物/增加瓦斯/触发事件 | ✅ 3/3 |
| spend | 矿物成功/不足失败/瓦斯/人口/超限/组合花费 | ✅ 6/6 |
| canAfford | 充足/不足/瓦斯/人口/空花费 | ✅ 5/5 |
| supply管理 | 增加/释放/不小于0/上限增/上限MAX | ✅ 5/5 |
| refund | 默认75%/自定义比例 | ✅ 2/2 |
| mineral patches | 注册矿脉/气泉 | ✅ 2/2 |

#### `tests/test_pathfinding.js` — A*寻路 (12 个测试)

| 分组 | 测试项 | 结果 |
|------|--------|------|
| 直线路径 | 水平/垂直/同点 | ✅ 3/3 |
| 避障 | 绕水平墙/绕竖墙/绕方块 | ✅ 3/3 |
| 无效路径 | 完全堵死→null/起点不可达/终点不可达 | ✅ 3/3 |
| 缓存 | 缓存命中/清除缓存 | ✅ 2/2 |
| setWalkable | 修改地形影响路径 | ✅ 1/1 |

#### `tests/test_combat.js` — 伤害计算 (27 个测试)

| 分组 | 测试项 | 结果 |
|------|--------|------|
| Normal攻击 | vs小/中/大体型 | ✅ 3/3 |
| Explosive攻击 | vs小(25%)/中(50%)/大(100%) | ✅ 3/3 |
| Concussive攻击 | vs小(100%)/中(50%)/大(25%) | ✅ 3/3 |
| 护甲减免 | 普通-2甲/爆炸-中-1甲/冲击-大-1甲/完全格挡/高甲/最低伤害 | ✅ 6/6 |
| 护盾扣减 | 全吸收/部分/无盾/击杀/双空/0伤/已死/负伤 | ✅ 8/8 |
| DAMAGE_TABLE | 完整性/Normal全1.0/Explosive系数/Concussive系数 | ✅ 4/4 |

---

## 3. 代码质量检查

### 3.1 未使用的 Import

| 文件 | 未使用导入 | 严重程度 |
|------|-----------|---------|
| `src/main.js:9` | `RACE` — 导入后从未在文件中使用 | ⚠️ 低 |

**说明**: `main.js` 中 `RACE` 仅被导入但未直接使用（可能预留给未来功能），建议移除或加注释说明。

### 3.2 硬编码魔法数字

| 文件:行号 | 魔法数字 | 应使用常量 | 严重程度 |
|-----------|---------|-----------|---------|
| `CombatSystem.js:74` | `24` | `GAME.TICK_RATE` | 🔴 中 |
| `BuildingSystem.js:173` | `const tickRate = 24` | `GAME.TICK_RATE` | 🔴 中 |
| `TechTree.js:300` | `const tickRate = 24` | `GAME.TICK_RATE` | 🔴 中 |
| `GameManager.js:396` | `buildTime \|\| 24` | `GAME.TICK_RATE` | ⚠️ 低 |
| `ui/main.js:24` | `const GAME_TICK_RATE = 24` | `GAME.TICK_RATE` from Constants | 🔴 中 |

**分析**: `GAME.TICK_RATE = 24` 已在 `Constants.js` 中定义，但 `CombatSystem`、`BuildingSystem`、`TechTree` 三个核心系统文件均直接硬编码 `24` 而非引用常量。这增加了维护风险——若修改 TICK_RATE 常量值，这些文件不会同步更新。

### 3.3 事件监听器泄漏

| 文件 | 问题 | 严重程度 |
|------|------|---------|
| `Selection.js:67-74` | 注册了 6 个 window 事件监听（mousedown/mousemove/mouseup/dblclick/keydown/keyup），**无 removeEventListener** | 🔴 高 |
| `CommandSystem.js:31-36` | 注册了 keydown/keyup 监听，**无 removeEventListener** | 🔴 中 |
| `GameManager.js:148` | 使用箭头函数注册 resize 监听，**无法移除**（无引用保存） | ⚠️ 低 |

**对比**: `Camera.js` 和 `Renderer.js` 正确保存了监听器引用并在 `dispose()` 方法中移除。`App.vue` 也在 `onUnmounted` 中正确清理。

**建议**: 为 `Selection` 和 `CommandSystem` 添加 `dispose()` 方法，在游戏重置时调用。

### 3.4 内存管理

| 检查项 | 状态 | 说明 |
|--------|------|------|
| GameManager 单位数组 | ✅ 良好 | `_cleanupEntities()` 每 tick 过滤死亡实体 |
| 投射物轨迹 | ✅ 良好 | `proj.trail` 限制 20 个点上限 |
| 粒子特效 | ✅ 良好 | 超时后 splice 移除 |
| Pathfinding 节点池 | ✅ 良好 | 对象池模式，`releaseNode` 回收 |
| Pathfinding 缓存 | ✅ 良好 | LRU 策略限制 cacheSize |
| `eventBus.clearAll()` | ⚠️ 注意 | `GameManager.reset()` 调用 `clearAll()` 会清除全局事件总线所有监听器，可能影响其他系统 |

### 3.5 其他观察

| 项目 | 状态 | 说明 |
|------|------|------|
| ES Module 一致性 | ✅ | 全部使用 import/export，项目 type: module |
| 常量集中管理 | ✅ | `Constants.js` 统一定义所有枚举和配置 |
| 代码注释 | ✅ | 每个文件/类/方法都有中文注释 |
| 错误处理 | ✅ | EventBus 的 emit 有 try-catch 保护 |
| 事件解耦 | ✅ | 使用 EventBus 发布-订阅模式，系统间低耦合 |

---

## 4. 修复情况

### 已修复
- ✅ 3 个测试用例的断言错误（路径测试障碍物设计、资源测试初始值）
- ✅ 所有 118 个测试现在全部通过

### 建议后续修复（未自动修复，需人工确认）
1. **魔法数字**: 将 `CombatSystem`、`BuildingSystem`、`TechTree`、`ui/main.js` 中的硬编码 `24` 替换为 `GAME.TICK_RATE`
2. **事件监听泄漏**: 为 `Selection` 和 `CommandSystem` 添加 `dispose()` 方法
3. **未使用导入**: 移除 `main.js` 中未使用的 `RACE` 导入
4. **全局事件总线**: 考虑为每个 GameManager 实例创建独立的 EventBus 实例，避免 reset 时影响全局

---

## 5. 文件清单

### 新增文件
| 文件 | 行数 | 说明 |
|------|------|------|
| `tests/test_mathutils.js` | ~180 | MathUtils 单元测试 (40 tests) |
| `tests/test_eventbus.js` | ~170 | EventBus 单元测试 (13 tests) |
| `tests/test_resources.js` | ~200 | ResourceManager 单元测试 (26 tests) |
| `tests/test_pathfinding.js` | ~170 | Pathfinding A* 单元测试 (12 tests) |
| `tests/test_combat.js` | ~220 | CombatSystem 伤害计算测试 (27 tests) |
| `docs/TEST_REPORT.md` | 本文件 | 测试报告 |

### 修改文件
| 文件 | 修改内容 |
|------|---------|
| `tests/test_mathutils.js` | 修复路径测试障碍物设计（留缺口） |
| `tests/test_resources.js` | 修复 combined spend 测试的初始资源值 |
