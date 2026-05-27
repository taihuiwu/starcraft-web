# 完整伤害矩阵 (Damage Matrix)

> **文档版本**: v1.0  
> **数据来源**: src/shared/Constants.js DAMAGE_TABLE + 各兵种 attack 定义  
> **更新日期**: 2026-05-27

---

## 一、攻击类型 × 体型伤害百分比

| 攻击类型 | 小型(Small) | 中型(Medium) | 大型(Large) |
|---------|------------|-------------|-------------|
| **普通(Normal)** | **100%** | **100%** | **100%** |
| **爆炸(Explosive)** | 25% | 50% | **100%** |
| **冲击(Concussive)** | **100%** | 50% | 25% |

### 核心公式
```
最终伤害 = 基础攻击力 × 体型系数 - 目标护甲
最终伤害 = max(最终伤害, 1)  // 最低保底1点伤害
```

---

## 二、全兵种体型分类

### 人族 (Terran)
| 体型 | 兵种 |
|------|------|
| 小型 | SCV, Marine, Firebat, Medic, Ghost, Wraith |
| 中型 | Vulture, Nuclear Missile |
| 大型 | Siege Tank, Goliath, Valkyrie, Battlecruiser, Science Vessel, Dropship |

### 虫族 (Zerg)
| 体型 | 兵种 |
|------|------|
| 小型 | Drone, Zergling, Infested Terran, Scourge |
| 中型 | Hydralisk, Lurker, Mutalisk, Queen, Defiler |
| 大型 | Overlord, Guardian, Devourer, Ultralisk |

### 神族 (Protoss)
| 体型 | 兵种 |
|------|------|
| 小型 | Probe, High Templar, Observer |
| 中型 | Zealot, Dark Templar, Corsair |
| 大型 | Dragoon, Archon, Reaver, Shuttle, Scout, Carrier, Arbiter |

---

## 三、全兵种对全兵种伤害矩阵（无护甲/升级，考虑体型系数）

### 3.1 攻击者 → 防御者（实际伤害百分比）

> 下表读法：行是攻击者，列是防御者体型。数值 = 基础攻击力 × 体型系数

| 攻击者 | 攻击类型 | vs 小型 | vs 中型 | vs 大型 |
|--------|---------|--------|--------|--------|
| **SCV** | 普通 | 5 | 5 | 5 |
| **Marine** | 普通 | 6 | 6 | 6 |
| **Firebat** | 普通(溅射) | 8 | 8 | 8 |
| **Ghost** | 冲击 | 10 | 5 | 2.5 |
| **Vulture** | 冲击 | 20 | 10 | 5 |
| **Siege Tank** | 爆炸(溅射) | 7.5 | 15 | 30 |
| **Siege Tank(攻城)** | 爆炸(溅射) | 17.5 | 35 | 70 |
| **Goliath** | 普通 | 20 | 20 | 20 |
| **Goliath(对空)** | 爆炸 | 10 | 20 | 40 |
| **Wraith(对地)** | 普通 | 8 | 8 | 8 |
| **Wraith(对空)** | 爆炸 | 10 | 20 | 40 |
| **Valkyrie** | 爆炸×8 | 12 | 24 | 48 |
| **Battlecruiser(地)** | 普通×8 | 200 | 200 | 200 |
| **Battlecruiser(空)** | 爆炸 | 2.5 | 5 | 10 |
| **Nuclear Missile** | 普通(溅射6.0) | 300 | 300 | 300 |
| **Drone** | 普通 | 5 | 5 | 5 |
| **Zergling** | 普通 | 5 | 5 | 5 |
| **Hydralisk** | 爆炸 | 3 | 6 | 12 |
| **Lurker** | 爆炸(穿透) | 5 | 10 | 20 |
| **Ultralisk** | 普通(溅射) | 20 | 20 | 20 |
| **Infested Terran** | 普通(溅射) | 500 | 500 | 500 |
| **Mutalisk** | 冲击(弹射) | 9 | 4.5 | 2.25 |
| **Guardian** | 爆炸 | 5 | 10 | 20 |
| **Devourer** | 爆炸(纯对空) | 3.75 | 7.5 | 15 |
| **Scourge** | 爆炸(对空自爆) | 27.5 | 55 | 110 |
| **Probe** | 普通 | 5 | 5 | 5 |
| **Zealot** | 普通 | 16 | 16 | 16 |
| **Dragoon** | 爆炸 | 6.25 | 12.5 | 25 |
| **High Templar** | 冲击 | 10 | 5 | 2.5 |
| **Dark Templar** | 普通 | 40 | 40 | 40 |
| **Archon** | 爆炸(溅射) | 7.5 | 15 | 30 |
| **Reaver** | 爆炸(溅射) | 25 | 50 | 100 |
| **Corsair** | 爆炸×9(纯对空) | 11.25 | 22.5 | 45 |
| **Scout(对地)** | 普通 | 8 | 8 | 8 |
| **Scout(对空)** | 爆炸 | 7 | 14 | 28 |
| **Carrier(拦截机)** | 普通×4~8 | 24~48 | 24~48 | 24~48 |
| **Arbiter** | 普通(溅射) | 10 | 10 | 10 |

---

## 四、SC1原版兵种克制关系

### 4.1 经典克制链（石头剪刀布）

```
┌─────────────────────────────────────────────────┐
│              克制关系环                          │
│                                                 │
│   狂热者(Zealot) ──克制──▶ 机枪兵(Marine)       │
│        │                      │                 │
│      被克制                被克制               │
│        │                      │                 │
│   龙骑(Dragoon) ◀──克制── 火焰兵(Firebat)       │
│        │                      │                 │
│      被克制                被克制               │
│        │                      │                 │
│   攻城坦克(Siege Tank) ◀──克制── 跳虫(Zergling)  │
│        │                                      │
│      被克制                                   │
│        │                                      │
│   飞龙(Mutalisk) ◀──克制── 科学球(EMP)/女武神    │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 4.2 详细克制关系

| 被克制方 | 克制方 | 原因 |
|---------|--------|------|
| Marine (小型) | Zealot(冲击100%小)、Mutalisk(冲击100%小) | 小型被冲击全额伤害 |
| Firebat (小型) | Zealot、Mutalisk | 同上，但Firebat溅射能反打跳虫 |
| Zergling (小型) | Firebat(溅射全额)、Siege Tank(溅射) | 溅射攻击克制密集小兵 |
| Hydralisk (中型) | Siege Tank(爆炸100%中=50%)、Battlecruiser | 爆炸对中型50%仍可观 |
| Ultralisk (大型) | Siege Tank(爆炸100%)、Reaver(溅射) | 大型被爆炸全额伤害 |
| Mutalisk (中型) | Valkyrie(溅射)、Corsair(溅射)、Scourge | 空对空溅射克制飞龙群 |
| Dragoon (大型) | Zealot(近战)、Vulture(高机动包夹) | 大型被冲击25%但龙骑怕近身 |
| Zealot (中型) | Siege Tank(溅射)、Lurker(穿透)、Defiler(暗雾+跳虫) | 中型被爆炸50%，但近身极强 |
| Battlecruiser (大型) | Scourge(110×2=220)、Valkyrie(溅射×8)、Devourer(酸孢) | 大型被爆炸全额 |
| Siege Tank (大型) | Vulture(高速绕后)、Wraith(对空不能打)、Dark Templar(隐形) | 坦克怕近身和隐形 |

---

## 五、最佳目标列表 (Best Targets)

每个兵种应该优先攻击谁：

| 兵种 | 最佳目标 | 原因 |
|------|---------|------|
| **Marine** | Zergling, Mutalisk, Scourge | 普通攻击对所有体型100%，小型目标HP低 |
| **Firebat** | Zergling, Drone, Probes | 溅射对密集小体型全额伤害 |
| **Siege Tank** | Zealot, Dragoon, Ultralisk, Hydralisk群 | 爆炸溅射对中大型高额伤害 |
| **Vulture** | Dragoon(冲击25%大型但高速包夹), Zergling(蜘蛛雷125) | 高机动控制+地雷 |
| **Goliath** | Battlecruiser, Carrier, Mutalisk | 对空爆炸全额大型伤害 |
| **Wraith** | Battlecruiser, Carrier(对空爆炸) | 隐形偷袭大型空军 |
| **Valkyrie** | Mutalisk, Guardian(空对空溅射) | 8发导弹溅射克密集空军 |
| **Ghost** | Science Vessel(锁定)、Drone(小体型冲击100%) | 锁定机械、核弹大面积 |
| **Battlecruiser** | 任意(8束激光普攻) | 高血量高输出综合单位 |
| **Zergling** | Marine, Ghost, High Templar, Probe | 小型冲击100%、近身包夹 |
| **Hydralisk** | Wraith, Mutalisk(对空爆炸), Dragoon(中型50%) | 远程对空对地双用 |
| **Lurker** | Marine群, Zealot群(穿透直线) | 直线穿透对密集地面 |
| **Mutalisk** | Marine, High Templar, Science Vessel(冲击100%小) | 弹射骚扰脆皮 |
| **Guardian** | Siege Tank, Goliath(8射程超远) | 超远射程对地轰炸 |
| **Devourer** | Battlecruiser, Carrier(酸孢增伤) | 纯对空+debuff |
| **Scourge** | Battlecruiser, Carrier(自爆110×2=220) | 极高性价比换高级空军 |
| **Ultralisk** | Marine群, Zealot群(溅射) | 高HP高护甲近战坦克 |
| **Defiler** | 全军(暗雾/瘟疫) | 区域辅助改变战局 |
| **Zealot** | Marine, Zergling(普通全额), Probe | 高血量近战碾压小体型 |
| **Dragoon** | Siege Tank, Ultralisk, Battlecruiser(爆炸100%大) | 远程爆炸对大型全额 |
| **High Templar** | Marine群, Zergling群, Hydralisk群(灵能风暴) | AOE清群 |
| **Dark Templar** | 无反隐单位、Drone、SCV(隐形偷袭) | 永久隐形高伤害 |
| **Archon** | Zergling群, Marine群(溅射) | 350护盾+溅射AOE |
| **Reaver** | Marine群, Zealot群, Dragoon(圣甲虫100溅射) | 超高溅射伤害 |
| **Corsair** | Mutalisk群(溅射×9) | 9发溅射对空AOE |
| **Carrier** | 任意(拦截机自动) | 远距离安全输出 |
| **Arbiter** | 全军(静滞/召回) | 战略级辅助 |

---

## 六、最大威胁列表 (Biggest Threats)

每个兵种最怕谁：

| 兵种 | 最大威胁 | 原因 |
|------|---------|------|
| **Marine** | Siege Tank(溅射), Mutalisk(冲击100%) | 小型被冲击全额，密集被溅射 |
| **Firebat** | Dragoon(射程), Siege Tank(射程) | 近战步兵怕远程 |
| **Siege Tank** | Vulture(绕后), Dark Templar(隐形), Wraith(空对地) | 攻城模式不可移动 |
| **Goliath** | Zealot(近身), Dark Templar | 对地攻击力一般 |
| **Wraith** | Corsair(溅射), Valkyrie(溅射) | 小型被溅射群秒 |
| **Battlecruiser** | Scourge(220自爆), Goliath(对空40×2) | 大型被爆炸全额 |
| **Valkyrie** | Dark Templar(近身无对地), Zealot | 纯对空被近身 |
| **Zergling** | Firebat(溅射), Siege Tank(溅射), Lurker | 密集小体型怕AOE |
| **Hydralisk** | Siege Tank(溅射), Battlecruiser | 中型被溅射50% |
| **Mutalisk** | Valkyrie(溅射×8), Corsair(溅射×9), Scourge | 空对空溅射群秒 |
| **Ultralisk** | Siege Tank(爆炸100%), Reaver(溅射100%) | 大型被爆炸全额 |
| **Guardian** | Wraith(隐形对空), Goliath, Valkyrie | 慢速无对空能力 |
| **Devourer** | Goliath(对空), Dark Templar(近身) | 无对地能力 |
| **Zealot** | Siege Tank(溅射), Lurker(穿透), Vulture(高速) | 近战怕射程+AOE |
| **Dragoon** | Zealot(近身), Dark Templar(隐形) | 大型怕近身包夹 |
| **High Templar** | Dark Templar(隐形), Vulture(高速), Mutalisk | 脆皮法系怕近身 |
| **Archon** | Reaver(溅射), Siege Tank(溅射) | 350护盾被集中火力 |
| **Reaver** | Dark Templar(隐形), Wraith(空对地), 高速单位 | 慢速无自卫 |
| **Carrier** | Corsair(干扰网), Devourer(酸孢), Goliath | 拦截机可被清 |
| **Corsair** | Goliath(对空40), Dragoon(对空) | 纯对空怕被正面 |

---

## 七、实际伤害计算示例

### 示例1：Marine vs Zergling
```
Marine: 攻击力6, 普通攻击, 攻速15tick(1.6次/秒)
Zergling: HP 35, 护甲 0, 小型

实际伤害 = 6 × 1.0(普通对小型) - 0(护甲) = 6
击杀时间 = 35 / 6 = 5.83次攻击 ≈ 3.64秒
DPS = 6 × (24/15) = 9.6
```

### 示例2：Siege Tank(攻城) vs Dragoon
```
Siege Tank(攻城): 攻击力70, 爆炸攻击, 溅射2.0
Dragoon: HP 100 + Shield 80 = 180, 护甲 1, 大型

实际伤害 = 70 × 1.0(爆炸对大型) - 1(护甲) = 69
击杀时间 = 180 / 69 = 2.61次攻击 ≈ 2.61秒(每65tick)
攻城坦克DPS = 70 × (24/65) = 25.85
```

### 示例3：Scourge vs Battlecruiser
```
Scourge(×2): 每只110伤害, 爆炸攻击, 自爆
Battlecruiser: HP 300, 护甲 3, 大型

实际伤害 = (110 × 1.0 - 3) × 2 = 107 × 2 = 214
Battlecruiser剩余HP = 300 - 214 = 86
Scourge成本: 50矿/150气(2只)
Battlecruiser成本: 400矿/300气
→ Scourge极具性价比！
```

### 示例4：Mutalisk vs Marine
```
Mutalisk: 攻击力9, 冲击攻击, 弹射3次(每次递减1/3)
Marine: HP 40, 护甲 0, 小型

第1击(Marine1): 9 × 1.0(冲击对小型) - 0 = 9
第1击(Marine2): 9 × 0.67(弹射2) - 0 = 6
第1击(Marine3): 9 × 0.33(弹射3) - 0 = 3

一次攻击可同时伤害3个Marine！
DPS = 9 × (24/18) = 12 (对主目标)
```

### 示例5：Reaver vs Marine群
```
Reaver: 攻击力100, 爆炸攻击, 溅射2.0
Marine: HP 40, 护甲 0, 小型

实际伤害 = 100 × 0.25(爆炸对小型) - 0 = 25
溅射2.0范围内可命中约4-6个Marine
→ 每发圣甲虫可秒杀1个Marine并伤害周围4-5个
→ Reaver是Marine群的终极克星
```
