# 🔍 安全+架构审查报告 - StarCraft Web v0.1.0

**审查时间**: 2026-05-28
**审查范围**: 88个JS源文件, 9个Vue组件, 6个服务端文件, 5个测试文件
**项目规模**: 33,447行代码, 118个测试（全部通过）

---

## 安全发现

### 🔴 Critical（严重）

#### 1. `new Function()` 动态代码执行 - `src/game/AI/BuildOrder.js:437`
```javascript
return new Function(`return (${expr})`)();
```
- **问题**: 将建造顺序条件表达式通过 `new Function()` 动态执行。虽然当前 `expr` 来自内部硬编码的建造顺序数据（非用户输入），但这是一个危险的代码模式
- **风险**: 如果未来条件表达式来自用户配置或网络数据，将直接导致代码注入
- **修复建议**: 将条件表达式替换为安全的表达式解析器（如使用 `Function` 白名单验证，或改用 `if/else` 条件链）

### 🟠 High（高）

#### 2. WebSocket 服务器无认证机制 - `server/index.js`
- **问题**: WebSocket连接无任何身份验证/授权机制。任何能连接到端口的人都可以：
  - 创建/加入房间
  - 发送游戏命令
  - 房主名称可被任意客户端覆盖（`handleCreateRoom` 中 `if (hostName) player.name = hostName`）
- **风险**: 房间劫持、玩家冒充、拒绝服务攻击
- **修复建议**: 
  - 添加基于token的简单认证
  - 验证玩家名称长度和字符
  - 对maxPlayers等设置进行服务器端校验

#### 3. 重连机制无身份验证 - `server/index.js:452-518`
- **问题**: 重连只需要提供 `originalPlayerId` 和 `roomId`，而 `originalPlayerId` 可以从WebSocket连接消息中获得
- **风险**: 任何人可以伪造 `originalPlayerId` 来劫持其他玩家的连接
- **修复建议**: 使用一次性重连token（断线时生成，重连时验证）

#### 4. `InputManager.js` 事件监听器内存泄漏
- **问题**: `_bindEvents()` 中使用 `this._onKeyDown.bind(this)` 创建匿名函数，`destroy()` 方法无法调用 `removeEventListener` 清理
- **影响**: 每次创建InputManager实例都会泄漏事件监听器，长时间运行或频繁创建/销毁会导致内存持续增长
- **修复建议**: 在构造函数中预绑定方法并存储引用，如：
  ```javascript
  this._boundKeyDown = this._onKeyDown.bind(this);
  el.addEventListener('keydown', this._boundKeyDown);
  ```

### 🟡 Medium（中等）

#### 5. `TouchUI.js` 事件监听器无法移除
- **问题**: `GestureRecognizer.bind()` 中使用 `this._onStart.bind(this)` 添加事件监听器，但没有存储绑定后的引用，`destroy()` 只调用 `container.remove()`
- **影响**: 虽然容器移除后监听器会失效，但闭包引用仍可能阻止GC
- **修复建议**: 存储绑定引用并在destroy中移除

#### 6. 玩家名称无输入验证 - `server/index.js:93,241,275`
- **问题**: 玩家名称直接从URL查询参数或客户端消息中获取，无长度限制、字符过滤
- **风险**: 恶意玩家可以设置超长名称、包含特殊字符的名称，影响日志可读性和UI显示
- **修复建议**: 限制名称长度（如1-20字符），过滤非打印字符

#### 7. 聊天消息仅截断无内容过滤 - `server/index.js:430`
```javascript
const truncated = message.slice(0, 200);
```
- **问题**: 聊天消息只做了长度截断，没有过滤特殊字符
- **风险**: 虽然Vue默认对模板插值进行转义，但如果其他客户端以不同方式渲染消息，可能存在XSS
- **修复建议**: 添加基本的消息内容清理（过滤控制字符等）

#### 8. 无速率限制 - `server/index.js`
- **问题**: 没有对任何WebSocket消息类型进行速率限制
- **风险**: 恶意客户端可以高频发送消息导致服务器负载过高
- **修复建议**: 对游戏命令、聊天消息等添加每秒/每帧的速率限制

### 🟢 Low（低）

#### 9. `innerHTML` 使用 - `src/demo.js:444,458,520,525`
- **问题**: demo.js中使用`innerHTML`插入HTML内容
- **风险**: 低（demo文件是独立的演示脚本，内容来自硬编码常量），但如果将来被复用需注意
- **修复建议**: 改用DOM API或模板字符串配合textContent

#### 10. 无CORS配置 - `server/index.js`
- **问题**: HTTP健康检查端点没有设置CORS头
- **影响**: 如果需要跨域访问API，浏览器会阻止
- **修复建议**: 根据部署需求添加适当的CORS头

#### 11. 服务器监听所有网络接口
- **问题**: `server.listen(PORT)` 默认监听 `0.0.0.0`
- **风险**: 在开发/测试环境中可能暴露给不应访问的网络
- **修复建议**: 默认监听 `127.0.0.1`，通过环境变量控制

---

## 架构发现

### 🏗️ 模块耦合分析

#### ✅ 优点
- **模块分层清晰**: `engine/`, `game/`, `network/`, `mobile/`, `audio/`, `ui/`, `shared/` 模块边界明确
- **EventBus解耦**: 游戏引擎层和UI层通过EventBus通信，避免直接依赖
- **常量集中管理**: `Constants.js` 统一定义事件名、游戏参数、伤害表等

#### ⚠️ 问题

**1. GameManager上帝类** - `src/game/GameManager.js` (715行)
- 职责过多：初始化所有子系统、管理实体数组、驱动主循环、处理单位创建/销毁
- 与几乎所有游戏子系统直接交互
- **建议**: 拆分为 `GameLoop`（循环控制）、`EntityManager`（实体管理）、`GameInitializer`（初始化）

**2. demo.js与主应用重复**
- `demo.js` (542行) 是独立的演示脚本，与 `main.js` + `App.vue` 有大量功能重叠
- 包含自己的渲染循环、UI覆盖层、单位管理
- **建议**: 删除或重构为测试/开发工具

**3. 双重WebSocket架构**
- `src/network/WebSocketClient.js` 是通用WebSocket客户端
- `server/index.js` 是独立的服务器实现
- 客户端和服务器的消息协议定义不完全一致（服务器用 `./Protocol.js`，客户端用自定义事件系统）
- **建议**: 统一协议定义，共享常量

### 🔄 EventBus 使用模式

#### ✅ 优点
- 事件命名规范：使用 `domain:action` 格式（如 `game:start`, `resource:changed`）
- App.vue中正确注册和清理事件监听（使用cleanupFns数组）
- `on()` 返回取消函数，设计良好

#### ⚠️ 问题

**1. 无事件验证**
```javascript
// EventBus.js - emit方法不验证数据类型
emit(event, data) {
    // 直接触发，无schema验证
}
```
- **建议**: 添加开发模式下的事件类型验证

**2. 事件命名不一致**
- 部分事件用冒号分隔: `game:start`, `resource:changed`
- 部分用下划线: `save:game_saved`, `ui:build_click`
- **建议**: 统一为 `domain:action` 格式

**3. 全局单例模式**
```javascript
export const eventBus = new EventBus();
export default eventBus;
```
- 所有模块共享同一个EventBus实例
- **优势**: 简单直接
- **风险**: 难以测试隔离、可能导致事件冲突
- **建议**: 考虑依赖注入模式用于测试

### 🔧 错误处理模式

#### ✅ 优点
- 服务器端消息处理有try/catch包裹
- EventBus监听器执行有try/catch保护
- 序列化/反序列化有完善的错误处理
- 渲染引擎初始化有try/catch降级处理

#### ⚠️ 问题

**1. 静默失败模式**
- `GameSync.removePlayer()` 中:
  ```javascript
  return true; // 实际项目中应检查NetworkPlayer的state
  ```
  注释表明这是简化实现
- 多处 `catch {}` 空catch块（如 BuildOrder.js）
- **建议**: 至少在开发模式下记录警告日志

**2. 无全局错误边界**
- WebWorker错误处理有限
- **建议**: 添加 `window.onerror` 和 `unhandledrejection` 处理

### 🗑️ 资源清理

#### ✅ 优点（做得好的）
- Three.js GPU资源正确释放:
  - `Renderer.dispose()`: 遍历场景对象释放geometry/material
  - `Terrain.dispose()`: 释放地形和水体mesh
  - `Lighting.dispose()`: 释放shadow map和光源
  - `Models.dispose()`: 释放模型和InstancedMeshPool
  - `Particles.dispose()`: 释放粒子系统
  - `PostProcessing.dispose()`: 释放合成器和pass
  - `Animation.dispose()`: 释放动画资源
  - `InstancedMeshPool.dispose()`: 释放实例化mesh
- Vue组件正确清理EventBus监听（App.vue, EditorUI.vue）
- WebSocketClient有完善的destroy()方法（清除心跳、重连、监听器）

#### ⚠️ 问题

**1. InputManager事件泄漏**（已在安全发现中详述）
- destroy()清除回调Map但不移除DOM事件监听器

**2. TouchUI GestureListener清理不完整**
- `GestureRecognizer.destroy()` 只移除DOM元素，不清理内部事件监听器引用

**3. GameSync定时器未在所有路径清理**
- `GameSync.start()` 启动setInterval，但stop()只在正常路径调用
- 异常退出时可能泄漏定时器

### 📦 依赖图分析

**潜在循环依赖风险**:
- `GameManager` → `ResourceManager`, `BuildingSystem`, `CombatSystem`, `TechTree`
- 这些子系统之间通过EventBus通信，避免了直接循环引用 ✅
- 但 `GameSerializer` 直接访问 `GameManager` 的内部状态（units, buildings, resourceManager等），耦合度高

---

## 代码质量

### 🔍 DRY违反

**1. HP百分比计算重复**
- `UnitInfo.vue` 中 `getHpPercent()`, `hpPercent`, `getMiniHpClass()`, `hpBarClass` 存在逻辑重复
- `App.vue` 中事件监听的清理模式在多个组件中重复

**2. 序列化/反序列化代码重复**
- `GameSerializer.js` 中 `_serializeUnits` 和 `_deserializeUnits` 的字段列表几乎镜像
- 增量存档的 `_diffArrays` 和 `_diffObjects` 可以泛化

**3. 事件监听注册模式重复**
- 多个模块中 `addEventListener + .bind(this)` + `removeEventListener` 模式重复出现
- 可提取为 `EventBinding` 工具类

### 💀 死代码检测

**1. `isValidClientMessage()` 未使用**
- `Protocol.js` 导出了 `isValidClientMessage()` 但 `server/index.js` 中未调用
- 消息路由直接使用 switch/case，未调用此验证函数

**2. `demo.js` 中多处未使用的变量**
- 部分动画参数和UI状态变量定义后未使用

**3. `GameSync.getMissedFrames()` 返回空数组**
```javascript
getMissedFrames(playerId) {
    return []; // 简化实现：依赖快照恢复
}
```
- 是未完成的实现

### 📏 类型一致性

**1. 混合使用字符串和枚举**
```javascript
// NetworkPlayer.js
this.state = PLAYER_STATE_CONNECTED; // 使用枚举常量
// server/index.js:599
p.state = 'in_game'; // 直接使用字符串
```
- 同一属性在不同位置使用不同的表示方式

**2. 帧号类型不一致**
- 服务器端 `GameSync` 中帧号是 `number`
- 客户端网络消息中帧号也应该是 `number`，但未做类型校验

**3. ID类型混用**
- 玩家ID: `p_` + 32位hex（服务器生成）
- 房间ID: 6位大写字母+数字
- 单位ID: 自增整数
- **建议**: 统一ID格式规范

### 📝 命名规范

#### ✅ 优点
- 类名使用PascalCase（`GameManager`, `EventBus`）
- 方法名使用camelCase
- 常量使用UPPER_SNAKE_CASE（`TICK_RATE`, `FRAME_TIMEOUT`）
- 事件名使用 `domain:action` 格式

#### ⚠️ 问题
- 部分私有方法前缀不一致: `_onMouseDown` vs `_handleMouseDown`
- 事件名混合使用冒号和下划线

### 📚 JSDoc覆盖

#### ✅ 优点
- 服务器端文件（`NetworkPlayer.js`, `RoomManager.js`, `GameSync.js`, `Protocol.js`）JSDoc覆盖良好
- 关键类和方法都有 `@param`, `@returns` 注释
- Vue组件的props定义有注释

#### ⚠️ 问题
- 客户端 `WebSocketClient.js` 部分私有方法缺少JSDoc
- `Constants.js` 中部分枚举值缺少描述
- 内部方法（以 `_` 开头的）JSDoc覆盖不完整

---

## 修复建议优先级

### P0 - 立即修复（阻塞发布）
1. **InputManager事件泄漏**: 预绑定方法引用，确保destroy()能正确移除事件监听器
2. **`new Function()` 安全隐患**: 替换为安全的条件评估机制

### P1 - 高优先级（下一迭代）
3. **WebSocket认证**: 添加简单的token认证机制
4. **重连安全**: 使用一次性重连token
5. **玩家名称验证**: 服务端校验名称长度和字符
6. **消息速率限制**: 添加基础的速率限制

### P2 - 中优先级（计划中）
7. **GameManager拆分**: 降低职责集中度
8. **统一协议定义**: 客户端和服务器共享消息类型常量
9. **事件命名规范化**: 统一为 `domain:action` 格式
10. **TouchUI事件清理**: 完善destroy()中的清理逻辑
11. **删除或重构demo.js**: 消除与主应用的重复

### P3 - 低优先级（技术债务）
12. **开发模式事件验证**: EventBus添加schema验证
13. **HP计算去重**: 提取公共工具函数
14. **JSDoc补全**: 完善私有方法的文档
15. **类型一致性**: 统一ID格式和状态表示方式
16. **全局错误边界**: 添加window.onerror处理
17. **空catch块处理**: 开发模式下记录警告
18. **服务器监听地址**: 默认绑定127.0.0.1

---

## 总结

| 维度 | 评分 | 说明 |
|------|------|------|
| 安全性 | ⭐⭐⭐☆☆ | 基本安全措施到位（JSON解析保护、消息长度限制），但缺少认证和授权 |
| 架构设计 | ⭐⭐⭐⭐☆ | 模块分层清晰，EventBus解耦合理，但GameManager职责过重 |
| 代码质量 | ⭐⭐⭐⭐☆ | 命名规范、JSDoc覆盖良好，但存在DRY违反和死代码 |
| 资源管理 | ⭐⭐⭐⭐☆ | Three.js GPU资源释放完善，但InputManager有事件泄漏 |
| 错误处理 | ⭐⭐⭐☆☆ | 关键路径有try/catch，但存在静默失败和未完成实现 |

**总体评价**: 项目架构设计合理，代码质量较好。主要风险点集中在WebSocket安全和InputManager内存泄漏。建议优先修复P0和P1级别的问题。
