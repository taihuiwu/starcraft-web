# 兵种克制关系图 (Counter Chart)

> **文档版本**: v1.0  
> **数据来源**: 基于UNIT_STATS.md + DAMAGE_MATRIX.md综合分析  
> **更新日期**: 2026-05-27

---

## 一、全兵种克制矩阵

### 读法说明
- ✅ = 优势对局（克制）
- ⚔️ = 55开（基本均衡）
- ❌ = 劣势对局（被克制）
- 🎯 = 最佳击杀效率

---

### 1.1 人族兵种克制表

| 兵种 | 克制谁(✅) | 被谁克制(❌) | 最佳用途 |
|------|----------|-------------|---------|
| **SCV** | — | 所有战斗单位 | 采矿、修理、建造 |
| **Marine** | Zergling(stim), Scourge, 小体型单位 | Zealot, Siege Tank, Mutalisk, Lurker | 基础步兵主力 |
| **Firebat** | Zergling(溅射), Hydralisk(近身) | Dragoon(射程), Siege Tank(射程) | 反密集小兵 |
| **Medic** | — (辅助单位) | Dark Templar, 被优先击杀 | 治疗核心步兵 |
| **Ghost** | Science Vessel(锁定), 高价值机械 | Mutalisk, Vulture(高速), Zergling | 锁定/核弹/隐形 |
| **Vulture** | Dragoon(包夹), Hydralisk(地雷) | Siege Tank(被溅射), Zergling(近身) | 机动控制+蜘蛛雷 |
| **Siege Tank** | Zealot(溅射), Hydralisk群, Ultralisk | Vulture(绕后), DT(隐形), Wraith(空) | 区域控制+火力核心 |
| **Goliath** | Battlecruiser, Carrier, Mutalisk(对空) | Zealot(近身), Dark Templar | 防空主力 |
| **Wraith** | Battlecruiser(隐形偷袭), Guardian | Corsair(溅射), Valkyrie(溅射) | 隐形偷袭大型空军 |
| **Valkyrie** | Mutalisk群(溅射×8), Guardian | Dark Templar(无对地), Goliath(对空) | 空对空AOE |
| **Battlecruiser** | 几乎所有(大和炮260) | Scourge(220自爆), Goliath(40×2) | 终极综合单位 |
| **Science Vessel** | Archon(辐射秒杀), HT(辐射) | Dark Templar(隐形偷袭), Corsair | 反隐+辅助核心 |
| **Dropship** | — (运输单位) | 所有对空单位 | 空投突袭 |

---

### 1.2 虫族兵种克制表

| 兵种 | 克制谁(✅) | 被谁克制(❌) | 最佳用途 |
|------|----------|-------------|---------|
| **Drone** | — | 所有战斗单位 | 采矿、建造 |
| **Overlord** | — | 所有对空单位 | 提供人口、反隐(需升级) |
| **Zergling** | Marine(stim前), Ghost, HT, Probes | Firebat(溅射), Siege Tank(溅射), Lurker | 早期rush+包夹 |
| **Hydralisk** | Wraith(对空), Mutalisk(对空), Dragoon(近身) | Siege Tank(溅射), Battlecruiser | 中距离主力 |
| **Lurker** | Marine群(穿透), Zealot群(穿透), Dragoon | Siege Tank(射程), Wraith(空), 反隐单位 | 区域封锁 |
| **Mutalisk** | Marine(冲击100%), Ghost, HT, Science Vessel | Valkyrie(溅射), Corsair(溅射), Scourge | 骚扰+弹射AOE |
| **Guardian** | Siege Tank(射程8>12?不,8<12), Goliath(超远轰炸) | Wraith(隐形), Goliath(对空), Valkyrie | 超远对地轰炸 |
| **Devourer** | Battlecruiser(酸孢), Carrier(酸孢) | Goliath(对空), Corsair(溅射) | 纯对空+debuff |
| **Scourge** | Battlecruiser(110×2=220), Carrier, BC | Corsair(溅射), Science Vessel(辐射) | 极高性价比对空 |
| **Queen** | 无直接战斗价值 | 所有战斗单位 | 诱捕/孵化/寄生 |
| **Defiler** | 所有远程单位(暗雾), 群体(瘟疫) | 被近身时脆弱, EMP消除能量 | 战略级辅助 |
| **Ultralisk** | Marine群(溅射), Zealot群(溅射) | Siege Tank(爆炸100%), Reaver(溅射) | 终极近战坦克 |
| **Infested Terran** | 密集建筑群(500溅射) | 在到达前被击杀 | 战术核弹替代品 |

---

### 1.3 神族兵种克制表

| 兵种 | 克制谁(✅) | 被谁克制(❌) | 最佳用途 |
|------|----------|-------------|---------|
| **Probe** | — | 所有战斗单位 | 采矿、建造 |
| **Zealot** | Marine(冲击100%中型=50%, 但HP碾压), Ghost, HT | Siege Tank(溅射), Lurker(穿透), Vulture(高速) | 近战坦克 |
| **Dragoon** | Siege Tank(射程5), Ultralisk(爆炸100%大), BC(对空) | Zealot(近身), Dark Templar(隐形) | 中距离主力 |
| **High Templar** | Marine群, Zergling群, Hydra群(灵能风暴) | Dark Templar(隐形), Vulture(高速), Mutalisk | AOE法师 |
| **Dark Templar** | 无反隐单位(永久隐形), SCV/Drone(偷袭) | Science Vessel(反隐), Observer(反隐) | 隐形刺客 |
| **Archon** | Zergling群(溅射), Marine群(溅射), 小体型群 | Reaver(溅射), Siege Tank(溅射), EMP | 终极近战AOE |
| **Reaver** | Marine群, Zealot群, Dragoon(圣甲虫100溅射) | Dark Templar(隐形), Wraith(空对地), 高速单位 | 超高爆发AOE |
| **Observer** | 所有隐形单位(反隐) | 任何对空单位(脆弱) | 反隐侦察 |
| **Shuttle** | — (运输单位) | 所有对空单位 | 空投金甲虫/DT |
| **Corsair** | Mutalisk群(溅射×9), Scourge | Goliath(对空40), Dragoon(对空) | 空对空AOE |
| **Scout** | 通用(但性价比极低) | 几乎所有空军 | ❌ 不推荐使用 |
| **Carrier** | 任意(拦截机远程攻击), 地面群 | Devourer(酸孢), Goliath(对空) | 终极空军 |
| **Arbiter** | 全军(静滞/召回/隐形) | Science Vessel(EMP), 被优先击杀 | 战略辅助 |

---

## 二、天敌对照表 (Nemesis Chart)

每个兵种的「天敌」——最应该躲避或优先击杀的敌方单位：

| 兵种 | 天敌1 | 天敌2 | 天敌3 | 应对策略 |
|------|-------|-------|-------|---------|
| Marine | Siege Tank | Mutalisk | Lurker | 保持移动，不要密集 |
| Firebat | Dragoon | Siege Tank | Guardian | 利用地形近身 |
| Siege Tank | Dark Templar | Vulture | Wraith | 配合反隐+防空 |
| Goliath | Zealot | Dark Templar | Dragoon | 保持距离 |
| Wraith | Corsair | Valkyrie | Science Vessel(反隐) | 避免正面对抗 |
| Battlecruiser | Scourge | Goliath | Devourer | 配合防空+EMP |
| Zergling | Firebat | Siege Tank | Lurker | 避免AOE区域 |
| Hydralisk | Siege Tank | Battlecruiser | Archon | 保持散开 |
| Mutalisk | Valkyrie | Corsair | Science Vessel | 避免空对空集群 |
| Guardian | Wraith | Goliath | Valkyrie | 配合Devourer护航 |
| Ultralisk | Siege Tank | Reaver | Dragoon(远程) | 配合暗雾推进 |
| Zealot | Siege Tank | Lurker | Vulture(高速) | 升级腿部后冲击 |
| Dragoon | Zealot(近身) | Dark Templar | Vulture(高速) | 保持距离阵型 |
| High Templar | Dark Templar | Vulture | Mutalisk | 保护好法师 |
| Archon | Reaver | Siege Tank | EMP | 避免AOE集中火力 |
| Reaver | Dark Templar | Wraith | Vulture(高速) | 配合运输机操作 |
| Carrier | Devourer(酸孢) | Goliath | Corsair(干扰网) | 保持距离+拦截机 |

---

## 三、最佳反制方式表

每个兵种被克制后，应该出什么来反制：

| 被克制单位 | 推荐反制单位 | 理由 |
|-----------|-------------|------|
| Marine群 | Siege Tank, Lurker, Defiler(暗雾) | AOE溅射/穿透克密集 |
| Mutalisk群 | Valkyrie, Corsair, Scourge | 溅射空对空 |
| Zealot群 | Siege Tank(溅射), Lurker(穿透), Vulture(高速) | 远程AOE+机动 |
| Dragoon群 | Zealot(近身包夹), Dark Templar(隐形) | 近身克远程 |
| Siege Tank | Dark Templar(隐形), Vulture(绕后), Wraith(空) | 近身+隐形 |
| Battlecruiser | Scourge(自爆), Goliath(对空) | 高爆发对空 |
| Carrier | Corsair(干扰网), Devourer(酸孢), Goliath | 反制拦截机 |
| Ultralisk | Siege Tank(爆炸100%), Reaver(溅射) | 远程AOE |
| Defiler | Science Vessel(EMP消能), Ghost(锁定) | 消除能量 |
| Dark Templar | Science Vessel(反隐), Observer(反隐), Missile Turret | 反隐形 |

---

## 四、兵种组合推荐

### 4.1 人族经典组合

| 组合名称 | 组成 | 适用场景 | 协同原理 |
|---------|------|---------|---------|
| **MM组合** | Marine + Medic | 前期压制 | 兴奋剂+治疗=持续高DPS |
| **机械化** | Siege Tank + Vulture + Goliath | 中期阵地战 | 坦克控制+地雷封锁+防空 |
| **科技球组合** | Siege Tank + Science Vessel + Goliath | 中后期全面 | EMP反盾+辐射+火力+防空 |
| **大和编队** | Battlecruiser + Science Vessel + Valkyrie | 后期决战 | 大和炮+辐射+防空护航 |
| **空投组合** | Dropship + Siege Tank + Marine | 骚扰经济线 | 高地架坦克轰炸 |

### 4.2 虫族经典组合

| 组合名称 | 组成 | 适用场景 | 协同原理 |
|---------|------|---------|---------|
| **狗蛇流** | Zergling + Hydralisk | 前期压制 | 速度快+远程火力 |
| **潜伏封锁** | Lurker + Hydralisk | 中期防守 | 地刺封锁路口+刺蛇防空 |
| **飞龙骚扰** | Mutalisk(11+) | 中期骚扰 | 弹射骚扰经济线 |
| **暗雾虫潮** | Defiler + Zergling + Ultralisk | 后期决战 | 暗雾+跳虫近身+雷兽坦克 |
| **守护者轰炸** | Guardian + Devourer + Overlord | 后期远程轰炸 | 守护者对地+吞噬者防空 |
| **蝎子跳虫** | Defiler + Zergling(30+) | 后期阵地 | 暗雾保护+跳虫近身碾压 |

### 4.3 神族经典组合

| 组合名称 | 组成 | 适用场景 | 协同原理 |
|---------|------|---------|---------|
| **龙骑推进** | Dragoon + Zealot + Shuttle | 中期推进 | 狂热者前排+龙骑后排+运输机保护 |
| **金甲虫空投** | Shuttle + Reaver(×2) | 中期骚扰 | 超高爆发矿区屠杀 |
| **圣堂武士组合** | High Templar + Zealot + Dragoon | 中后期决战 | 灵能风暴清群+狂热者抗线+龙骑输出 |
| **执政官海** | Archon(×6+) + Zealot | 后期决战 | 350护盾坦克+狂热者前排 |
| **航母编队** | Carrier(×6+) + Corsair + Arbiter | 后期终极 | 拦截机远程+海盗防空+仲裁隐形/召回 |
| **仲裁者组合** | Arbiter + Carrier + High Templar | 后期终极 | 隐形+召回+灵能风暴=无敌组合 |

### 4.4 跨种族通用反制组合

| 面对敌方 | 推荐反制组合 | 理由 |
|---------|-------------|------|
| 大量Zergling | Firebat + Marine(Stim) + Medic | 溅射克密集小兵 |
| 大量Mutalisk | Valkyrie + Goliath + Science Vessel | 溅射+反隐+辐射 |
| 大量Zealot | Siege Tank + Lurker | 溅射/穿透克近战 |
| 大量Dragoon | Zealot(近身) + Dark Templar(隐形) | 近身+隐形 |
| Battlecruiser海 | Scourge + Goliath + Devourer | 高爆发对空 |
| Carrier海 | Corsair(干扰网) + Devourer(酸孢) + Goliath | 反制拦截机 |
| 仲裁者+航母 | Science Vessel(EMP) + Goliath + Wraith | EMP消除护盾+对空 |
| 蝎子+暗雾 | Science Vessel(EMP消能) + Ghost(锁定) | 消除能量让暗雾消失 |

---

## 五、克制关系可视化

### 5.1 三族核心克制环

```
                    ┌──────────────┐
                    │  人族(Terran) │
                    │              │
                    │ Tank/Science │
                    │    Vessel    │
                    └──────┬───────┘
                           │
                     EMP克制护盾
                     辐射克制生物
                           │
              ┌────────────▼────────────┐
              │                         │
    ┌─────────▼─────────┐    ┌──────────▼────────┐
    │  虫族(Zerg)       │    │  神族(Protoss)     │
    │                   │    │                    │
    │ Defiler(暗雾)     │    │ HT(灵能风暴)       │
    │ Lurker(穿透)      │    │ Archon(溅射)       │
    │ Ultra(坦克)       │    │ Reaver(圣甲虫)     │
    └─────────┬─────────┘    └──────────┬─────────┘
              │                         │
              │  暗雾克制远程            │  仲裁者召回
              │  数量压制               │  航母远程
              └────────────┬────────────┘
                           │
                    神族空军优势
                    (后期航母+仲裁者)
```

### 5.2 体型-攻击类型克制关系

```
小型单位 ──被冲击全额克制──▶ 冲击型攻击者
   │                           │
   │ Marine, Zergling,         │ Ghost, Vulture,
   │ Zergling, Probe, HT       │ Mutalisk, High Templar
   │                           │
   ▼                           ▼
中型单位 ──被爆炸50%克制──▶ 爆炸型攻击者
   │                           │
   │ Hydralisk, Lurker,        │ Siege Tank, Dragoon,
   │ Zealot, DT, Corsair       │ Reaver, Archon, Hydra
   │                           │
   ▼                           ▼
大型单位 ──被爆炸100%克制──▶ 爆炸型攻击者(全额!)
                               │
                               │ Siege Tank(核心),
                               │ Goliath(对空),
                               │ Dragoon(对空),
                               │ Devourer(酸孢)
```
