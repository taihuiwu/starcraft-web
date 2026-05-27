// ═══════════════════════════════════════════════════════════════
// StarCraft Web - 三族数据统一导出
// ═══════════════════════════════════════════════════════════════

// ─── 人族 (Terran) ──────────────────────────
export { TERRAN_UNITS, TERRAN_WORKERS, TERRAN_INFANTRY, TERRAN_VEHICLES, TERRAN_AIRCRAFT } from './terran/units.js';
export { TERRAN_BUILDINGS, TERRAN_PRIMARY, TERRAN_PRODUCTION, TERRAN_DEFENSE, TERRAN_TECH as TERRAN_BUILDING_TECH } from './terran/buildings.js';
export { TERRAN_TECH, TERRAN_WEAPON_UPGRADES, TERRAN_ARMOR_UPGRADES, TERRAN_ABILITY_UPGRADES, TERRAN_TECH_ARRAY } from './terran/tech.js';

// ─── 虫族 (Zerg) ────────────────────────────
export { ZERG_UNITS, ZERG_WORKERS, ZERG_GROUND, ZERG_AIR, ZERG_CASTERS } from './zerg/units.js';
export { ZERG_BUILDINGS, ZERG_PRIMARY, ZERG_DEFENSE, ZERG_TECH as ZERG_BUILDING_TECH, ZERG_BUILDINGS_ARRAY } from './zerg/buildings.js';
export { ZERG_TECH, ZERG_WEAPON_UPGRADES, ZERG_ARMOR_UPGRADES, ZERG_ABILITY_UPGRADES, ZERG_TECH_ARRAY } from './zerg/tech.js';

// ─── 神族 (Protoss) ─────────────────────────
export { PROTOSS_UNITS, PROTOSS_WORKERS, PROTOSS_GROUND, PROTOSS_AIR, PROTOSS_CASTERS } from './protoss/units.js';
export { PROTOSS_BUILDINGS, PROTOSS_PRIMARY, PROTOSS_PRODUCTION, PROTOSS_DEFENSE, PROTOSS_TECH as PROTOSS_BUILDING_TECH } from './protoss/buildings.js';
export { PROTOSS_TECH, PROTOSS_WEAPON_UPGRADES, PROTOSS_ARMOR_UPGRADES, PROTOSS_ABILITY_UPGRADES, PROTOSS_TECH_ARRAY } from './protoss/tech.js';
