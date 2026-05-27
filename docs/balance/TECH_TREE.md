# 三族科技树可视化 (Tech Tree)

> **文档版本**: v1.0  
> **数据来源**: src/races/{terran,zerg,protoss}/tech.js + buildings.js  
> **参考基准**: StarCraft: Brood War (SC1) 原版科技前置关系  
> **更新日期**: 2026-05-27

---

## 一、人族 (Terran) 科技树

```
Command Center (400矿, 100s建造)
├── SCV (50矿, 20s)
├── Comsat Station (50/50, 30s) — 扫描地图，揭示隐形
│   └── 需要 Academy
├── Nuclear Silo (50/50, 30s) — 生产核弹
│   └── 需要 Academy + Science Facility
│
├── Supply Depot (100矿, 30s) — +8人口
│
├── Refinery (100矿, 30s) — 瓦斯采集
│
└── Barracks (150矿, 60s)
    ├── Marine (50矿, 24s) ── 兴奋剂: 100/100, 120s, 攻速+23%/移速+23%
    ├── Firebat (50矿, 24s) ── 需要 Academy
    ├── Medic (50/25, 50s) ── 需要 Academy
    ├── Ghost (25/100, 60s) ── 需要 Academy + Science Facility
    │   ├── 锁定: 100/100, 120s, 锁定机械单位10秒
    │   ├── 光学植入体: 100/100, 120s, 视野+4
    │   └── 莫比乌斯反应堆: 100/100, 120s, 最大能量+50
    │
    ├── Engineering Bay (125矿, 45s)
    │   ├── 步兵武器 I/II/III (100/100, 150/150, 200/200) — 步兵攻击力+1/+2/+3
    │   ├── 步兵护甲 I/II/III (100/100, 150/150, 200/200) — 步兵护甲+1/+2/+3
    │   └── 解锁 Missile Turret (75矿, 30s)
    │
    ├── Academy (150矿, 40s)
    │   ├── 兴奋剂 (100/100, 120s) — Marine/Firebat 攻速+23%, 移速+23%
    │   ├── 锁定 (100/100, 120s) — Ghost 锁定机械单位
    │   ├── 光学植入体 (100/100, 120s) — Ghost 视野+4
    │   └── 莫比乌斯反应堆 (100/100, 120s) — Ghost 最大能量+50
    │
    ├── Bunker (100矿, 30s) — 驻扎4步兵
    │
    └── Factory (200/100, 60s)
        ├── Vulture (75矿, 30s)
        ├── Siege Tank (150/100, 50s)
        ├── Goliath (100/50, 40s) ── 需要 Armory
        │
        ├── Machine Shop (50/25, 20s)
        │   ├── 攻城科技 (150/150, 120s) — 解锁攻城模式
        │   ├── 蜘蛛雷 (100/100, 120s) — Vulture 放置地雷
        │   └── 秃鹫速度 (100/100, 120s) — Vulture 移速+1.0
        │
        ├── Armory (100/100, 60s)
        │   ├── 载具武器 I/II/III (100/100, 150/150, 200/200) — 攻击力+2/+4/+6
        │   ├── 载具护甲 I/II/III (100/100, 150/150, 200/200) — 护甲+1/+2/+3
        │   ├── 舰船武器 I/II/III (100/100, 150/150, 200/200) — 攻击力+2/+4/+6
        │   ├── 舰船护甲 I/II/III (100/100, 150/150, 200/200) — 护甲+1/+2/+3
        │   └── 解锁 Goliath、Valkyrie
        │
        └── Starport (150/100, 70s)
            ├── Wraith (150/100, 60s)
            ├── Valkyrie (250/125, 70s) ── 需要 Armory
            ├── Dropship (100/100, 40s)
            ├── Science Vessel (100/225, 80s) ── 需要 Science Facility
            ├── Battlecruiser (400/300, 100s) ── 需要 Science Facility + Control Tower
            │
            ├── Control Tower (50/50, 25s)
            │   └── 隐形力场 (100/100, 150s) — Wraith 解锁隐形
            │
            └── Science Facility (100/150, 60s)
                ├── 防御矩阵 (100/100, 100s) — Science Vessel
                ├── 辐射 (100/100, 100s) — Science Vessel
                ├── EMP冲击波 (100/100, 100s) — Science Vessel
                │
                ├── Covert Ops (50/50, 25s)
                │   └── 解锁 Nuclear Silo
                │
                └── Physics Lab (50/50, 25s)
                    ├── 大和炮 (100/100, 120s) — Battlecruiser 260伤害
                    └── 穿甲弹 (100/100, 120s) — Ghost
```

---

## 二、虫族 (Zerg) 科技树

```
Hatchery (300矿, 100s建造) — 需菌毯
├── Drone (50矿, 20s)
├── Overlord (100矿, 40s) — +8人口
├── 幼虫 → 变异其他单位
│
├── 气化甲壳 (150/150, 120s) — Overlord 移速+0.51, 视野+3
│
├── Extractor (50矿, 30s) — 瓦斯采集
│
├── Spawning Pool (200矿, 60s)
│   ├── Zergling (25矿/2只, 28s) — 代谢爆发前速度5.49
│   ├── 代谢爆发 (100/100, 100s) — Zergling 移速5.49→6.62
│   ├── 肾上腺素 (200/200, 150s) — Zergling 攻速+33% (需Hive)
│   ├── Creep Colony (75矿, 30s)
│   │   ├── Sunken Colony (50矿, 20s变异) — 对地防御
│   │   └── Spore Colony (50矿, 20s变异) — 对空+反隐
│   │
│   ├── Evolution Chamber (75矿, 40s)
│   │   ├── 近战攻击 I/II/III (100/100, 150/150, 200/200) — +1/+2/+3
│   │   ├── 远程攻击 I/II/III (100/100, 150/150, 200/200) — +1/+2/+3
│   │   └── 甲壳 I/II/III (100/100, 150/150, 200/200) — 护甲+1/+2/+3
│   │
│   └── Hydralisk Den (200/100, 40s)
│       ├── Hydralisk (75/25, 40s)
│       ├── 肌肉增强 (150/150, 120s) — Hydralisk 移速2.13→2.81
│       ├── 沟槽脊刺 (150/150, 120s) — Hydralisk 射程4→5
│       └── 潜伏者突变 (150/150, 120s) — 需Lair
│           └── Lurker (50/100变异, 40s) — 潜地直线穿透攻击
│
├── Lair (150/100, 100s变异) — 需Spawning Pool
│   ├── Spire (200/150, 70s)
│   │   ├── Mutalisk (100/100, 50s)
│   │   ├── Scourge (25/75/2只, 30s)
│   │   ├── 飞行攻击 I/II/III (100/100, 150/150, 200/200) — +1/+2/+3
│   │   ├── 飞行甲壳 I/II/III (100/100, 150/150, 200/200) — +1/+2/+3
│   │   └── Greater Spire (100/150, 70s变异) ── 需Hive
│   │       ├── Guardian (150/100变异, 40s) — 超远射程对地
│   │       └── Devourer (150/100变异, 40s) — 纯对空+酸性孢子
│   │
│   ├── Queen's Nest (150/100, 60s)
│   │   ├── Queen (100/100, 50s)
│   │   ├── 诱捕 (100/100, 100s) — 范围减速50%
│   │   └── 孵化虫群 (100/100, 100s) — 消灭生物单位产生2跳虫
│   │
│   ├── Nydus Canal (150矿, 30s) — 地面传送
│   ├── 腹囊 (200/200, 120s) — Overlord 装载4单位
│   └── 触角 (100/100, 120s) — Overlord 视野+4
│
└── Hive (200/150, 100s变异) — 需Lair + Queen's Nest
    ├── 肾上腺素 (200/200, 150s) — Zergling 攻速+33%
    ├── Defiler Mound (100/200, 60s)
    │   ├── Defiler (50/150, 50s)
    │   ├── 暗雾 (100/100, 80s) — 区域免疫远程伤害
    │   ├── 瘟疫 (100/100, 80s) — 范围持续伤害(上限293)
    │   └── 吞噬 (100/100, 80s) — 吃友军恢复50能量
    │
    ├── Ultralisk Cavern (150/200, 60s)
    │   ├── Ultralisk (200/200, 100s)
    │   ├── 新陈代谢 (200/200, 150s) — 移速2.13→2.66
    │   └── 角质甲壳 (200/200, 150s) — 额外+2护甲
    │
    ├── Greater Spire → Guardian, Devourer
    ├── Infested Command Center — 感染人族 (100矿, 40s)
    │   └── Infested Terran (100矿) — 自爆500伤害
    │
    └── Overlord Transport → 需Lair
```

---

## 三、神族 (Protoss) 科技树

```
Nexus (400矿, 100s建造) — 不需供电
├── Probe (50矿, 20s)
│
├── Pylon (100矿, 25s) — +8人口 + 能量场(半径8)
│   └── 所有其他建筑需要在能量场内建造
│
├── Assimilator (100矿, 40s) — 瓦斯采集
│
└── Gateway (150矿, 60s) — 需Pylon供电
    ├── Zealot (100矿, 40s)
    │   └── 腿部增强 (200/200, 150s) — 需 Citadel of Adun
    │       └── 移速2.25→3.00
    │
    ├── Dragoon (125/50, 50s) ── 需 Cybernetics Core
    │   └── 奇异电荷 (150/150, 120s) — 射程5→6
    │
    ├── High Templar (50/150, 50s) ── 需 Citadel + Templar Archives
    │   ├── 灵能风暴 (200/200, 120s) — 每秒112伤害，持续6秒
    │   ├── 幻象 (100/100, 80s) — 产生2个幻象
    │   └── 凯达林护身符 (150/150, 100s) — 最大能量+50
    │
    ├── Dark Templar (125/100, 50s) ── 需 Citadel + Templar Archives
    │   └── 永久隐形
    │
    ├── Archon 合并 — 2个Templar合并为1个执政官(20s)
    │
    ├── Warp Gate折跃门 (50/50, 60s) — 可在能量场传送单位
    │
    ├── Forge (150矿, 40s)
    │   ├── 地面武器 I/II/III (100/100, 150/150, 200/200) — +1/+2/+3
    │   ├── 地面护甲 I/II/III (100/100, 150/150, 200/200) — +1/+2/+3
    │   ├── 护盾 I/II/III (100/100, 150/150, 200/200) — +1/+2/+3
    │   └── Photon Cannon (150矿, 40s) — 对空对地+反隐
    │
    └── Cybernetics Core (200矿, 60s)
        ├── 空军武器 I/II/III (100/100, 150/150, 200/200) — +1/+2/+3
        ├── 空军护甲 I/II/III (100/100, 150/150, 200/200) — +1/+2/+3
        ├── 奇异电荷 (150/150, 120s) — Dragoon 射程+1
        │
        ├── Citadel of Adun (150/100, 60s)
        │   ├── 腿部增强 (200/200, 150s) — Zealot 移速+0.75
        │   ├── Templar Archives (150/150, 60s)
        │   │   ├── 灵能风暴 (200/200, 120s) — High Templar
        │   │   ├── 幻象 (100/100, 80s) — High Templar
        │   │   └── 凯达林护身符 (150/150, 100s) — HT 最大能量+50
        │   │
        │   └── Arbiter Tribunal (200/150, 60s) ── 需 Stargate
        │       ├── 静滞力场 (100/100, 100s) — 冻结敌方10秒
        │       ├── 召回 (100/100, 100s) — 传送友方单位
        │       └── 阿格斯之石 (100/100, 100s) — Arbiter 最大能量+50
        │
        ├── Stargate (150/100, 70s)
        │   ├── Corsair (100/100, 40s)
        │   ├── Scout (275/175, 80s)
        │   ├── Carrier (350/250, 140s) ── 需 Fleet Beacon
        │   │   ├── 航母容量 (100/100, 100s) — 拦截机4→8
        │   │   └── 拦截机 (25矿/架, 5s) — 自动补给
        │   ├── Arbiter (100/350, 100s) ── 需 Citadel + Fleet Beacon + Arbiter Tribunal
        │   │
        │   └── Fleet Beacon (300/200, 60s)
        │       ├── 航母容量 (100/100, 100s) — Carrier 拦截机4→8
        │       ├── 阿格斯之石 (100/100, 100s) — Arbiter 能量+50
        │       └── 干扰网 (200/200, 100s) — Corsair 区域沉默
        │
        └── Robotics Facility (200/100, 60s)
            ├── Observer (25/75, 40s) ── 需 Observatory
            │   └── 引力加速器 (100/100, 100s) — 移速+1.0, 视野+3
            ├── Shuttle (200矿, 40s)
            │   └── 引力驱动 (100/100, 100s) — 移速大幅提升
            ├── Reaver (200/100, 70s) ── 需 Robotics Support Bay
            │   ├── 圣甲虫伤害 (100/100, 100s) — 伤害100→125
            │   ├── 圣甲虫容量 (100/100, 100s) — 最大5→10
            │   └── 圣甲虫 (15矿/发) — 追踪型溅射弹药
            │
            ├── Robotics Support Bay (150/100, 40s) — 解锁 Reaver
            └── Observatory (150/50, 40s) — 解锁 Observer
```

---

## 四、科技路线时间线分析

### 4.1 人族常见科技路线

| 路线 | 建筑链 | 总时间(s) | 总矿/气 | 说明 |
|------|--------|----------|---------|------|
| 步兵Rush | CC→Barracks→Marine | ~84s | 450/0 | 最快攻击路线 |
| 快科技坦克 | CC→Barracks→Factory→Tank | ~224s | 1000/200 | 标准机械化开局 |
| 空军路线 | CC→Barracks→Factory→Starport→BC | ~370s | 1800/700 | 最慢但最强大军 |
| Ghost核弹 | CC→Barracks→Academy→SciFac→NukeSil | ~370s | 1050/450 | 战术核打击 |

### 4.2 虫族常见科技路线

| 路线 | 建筑链 | 总时间(s) | 总矿/气 | 说明 |
|------|--------|----------|---------|------|
| 跳虫快攻 | Hatch→Pool→Zergling | ~88s | 450/0 | 最快rush |
| 刺蛇流 | Hatch→Pool→Den→Hydra | ~168s | 825/100 | 中距离主力 |
| 飞龙骚扰 | Hatch→Pool→Lair→Spire→Muta | ~328s | 950/350 | 空中骚扰 |
| 潜伏者防守 | Hatch→Pool→Den→Lair→Lurker | ~368s | 825/350 | 区域控制 |

### 4.3 神族常见科技路线

| 路线 | 建筑链 | 总时间(s) | 总矿/气 | 说明 |
|------|--------|----------|---------|------|
| 狂热者Rush | Nexus→Pylon→Gateway→Zealot | ~125s | 750/0 | 快速近战 |
| 龙骑科技 | Nexus→Pylon→Gateway→Cyber→Dragoon | ~245s | 1125/50 | 标准远程 |
| 金甲虫空投 | Nexus→Pylon→Gateway→Cyber→Robo→Reaver | ~425s | 1675/350 | 高爆发骚扰 |
| 航母路线 | Nexus→Pylon→Gateway→Cyber→Stargate→FB→Carrier | ~535s | 2675/750 | 终极大军 |
