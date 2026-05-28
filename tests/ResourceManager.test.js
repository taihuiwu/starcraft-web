// ═══════════════════════════════════════════
// StarCraft Web - ResourceManager 单元测试
// ═══════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import { GAME, RESOURCE, EVENTS } from '../src/shared/Constants.js';
import { eventBus } from '../src/shared/EventBus.js';

// Mock GameManager (ResourceManager only stores a reference, doesn't call it in basic ops)
class MockGameManager {
  constructor() {
    this.units = [];
    this.buildings = [];
  }
}

// Import ResourceManager
import ResourceManager from '../src/game/ResourceManager.js';

function createRM() {
  const rm = new ResourceManager(new MockGameManager());
  rm.init();
  return rm;
}

describe('ResourceManager', () => {
  // ── 初始化 ───────────────────────────────
  describe('initialization', () => {
    it('init creates players 1-8', () => {
      const rm = createRM();
      for (let t = 1; t <= 8; t++) {
        expect(rm.players[t]).toBeTruthy();
        expect(rm.players[t].minerals).toBe(GAME.STARTING_MINERALS);
        expect(rm.players[t].gas).toBe(GAME.STARTING_GAS);
        expect(rm.players[t].supply).toBe(0);
        expect(rm.players[t].supplyMax).toBe(GAME.STARTING_SUPPLY);
      }
    });

    it('getResources returns existing player data', () => {
      const rm = createRM();
      const res = rm.getResources(1);
      expect(res.minerals).toBe(GAME.STARTING_MINERALS);
    });

    it('getResources auto-creates unknown team', () => {
      const rm = createRM();
      const res = rm.getResources(99);
      expect(res.minerals).toBe(0);
      expect(res.gas).toBe(0);
    });
  });

  // ── addResource ──────────────────────────
  describe('addResource', () => {
    it('add minerals', () => {
      const rm = createRM();
      rm.addResource(1, RESOURCE.MINERALS, 100);
      expect(rm.players[1].minerals).toBe(GAME.STARTING_MINERALS + 100);
    });

    it('add gas', () => {
      const rm = createRM();
      rm.addResource(1, RESOURCE.GAS, 50);
      expect(rm.players[1].gas).toBe(50);
    });

    it('addResource emits event', () => {
      const rm = createRM();
      let eventFired = false;
      const unsub = eventBus.on(EVENTS.RESOURCE_CHANGED, () => { eventFired = true; });
      rm.addResource(1, RESOURCE.MINERALS, 10);
      unsub();
      eventBus.clearAll();
      expect(eventFired).toBe(true);
    });
  });

  // ── spend ────────────────────────────────
  describe('spend', () => {
    it('spend minerals succeeds when affordable', () => {
      const rm = createRM();
      const result = rm.spend(1, { minerals: 50 });
      expect(result).toBe(true);
      expect(rm.players[1].minerals).toBe(GAME.STARTING_MINERALS - 50);
    });

    it('spend minerals fails when insufficient', () => {
      const rm = createRM();
      const result = rm.spend(1, { minerals: 9999 });
      expect(result).toBe(false);
      expect(rm.players[1].minerals).toBe(GAME.STARTING_MINERALS); // unchanged
    });

    it('spend gas succeeds', () => {
      const rm = createRM();
      rm.addResource(1, RESOURCE.GAS, 100);
      const result = rm.spend(1, { gas: 30 });
      expect(result).toBe(true);
      expect(rm.players[1].gas).toBe(70);
    });

    it('spend supply succeeds within cap', () => {
      const rm = createRM();
      const result = rm.spend(1, { supply: 5 });
      expect(result).toBe(true);
      expect(rm.players[1].supply).toBe(5);
    });

    it('spend supply fails when over cap', () => {
      const rm = createRM();
      const result = rm.spend(1, { supply: 999 });
      expect(result).toBe(false);
      expect(rm.players[1].supply).toBe(0);
    });

    it('spend combined cost', () => {
      const rm = createRM();
      rm.addResource(1, RESOURCE.MINERALS, 100);
      rm.addResource(1, RESOURCE.GAS, 100);
      const result = rm.spend(1, { minerals: 100, gas: 50, supply: 2 });
      expect(result).toBe(true);
      expect(rm.players[1].minerals).toBe(GAME.STARTING_MINERALS + 100 - 100);
      expect(rm.players[1].gas).toBe(50);
      expect(rm.players[1].supply).toBe(2);
    });
  });

  // ── canAfford ────────────────────────────
  describe('canAfford', () => {
    it('canAfford with enough resources', () => {
      const rm = createRM();
      expect(rm.canAfford(1, { minerals: 50 })).toBe(true);
    });

    it('canAfford with insufficient resources', () => {
      const rm = createRM();
      expect(rm.canAfford(1, { minerals: 9999 })).toBe(false);
    });

    it('canAfford gas-only cost', () => {
      const rm = createRM();
      rm.addResource(1, RESOURCE.GAS, 50);
      expect(rm.canAfford(1, { gas: 30 })).toBe(true);
      expect(rm.canAfford(1, { gas: 60 })).toBe(false);
    });

    it('canAfford supply within cap', () => {
      const rm = createRM();
      expect(rm.canAfford(1, { supply: GAME.STARTING_SUPPLY })).toBe(true);
      expect(rm.canAfford(1, { supply: GAME.STARTING_SUPPLY + 1 })).toBe(false);
    });

    it('canAfford empty cost → true', () => {
      const rm = createRM();
      expect(rm.canAfford(1, {})).toBe(true);
    });
  });

  // ── supply management ────────────────────
  describe('supply management', () => {
    it('addSupply increases supply', () => {
      const rm = createRM();
      rm.addSupply(1, 3);
      expect(rm.players[1].supply).toBe(3);
    });

    it('releaseSupply decreases supply', () => {
      const rm = createRM();
      rm.addSupply(1, 5);
      rm.releaseSupply(1, 2);
      expect(rm.players[1].supply).toBe(3);
    });

    it('releaseSupply cannot go below 0', () => {
      const rm = createRM();
      rm.addSupply(1, 2);
      rm.releaseSupply(1, 10);
      expect(rm.players[1].supply).toBe(0);
    });

    it('addSupplyMax increases cap', () => {
      const rm = createRM();
      rm.addSupplyMax(1, 8);
      expect(rm.players[1].supplyMax).toBe(GAME.STARTING_SUPPLY + 8);
    });

    it('addSupplyMax capped at MAX_SUPPLY', () => {
      const rm = createRM();
      rm.addSupplyMax(1, 9999);
      expect(rm.players[1].supplyMax).toBe(GAME.MAX_SUPPLY);
    });
  });

  // ── refund ───────────────────────────────
  describe('refund', () => {
    it('refund returns 75% by default', () => {
      const rm = createRM();
      rm.refund(1, { minerals: 100, gas: 40 });
      expect(rm.players[1].minerals).toBe(GAME.STARTING_MINERALS + 75);
      expect(rm.players[1].gas).toBe(30); // 40 * 0.75 = 30
    });

    it('refund custom rate', () => {
      const rm = createRM();
      rm.refund(1, { minerals: 100 }, 0.5);
      expect(rm.players[1].minerals).toBe(GAME.STARTING_MINERALS + 50);
    });
  });

  // ── mineral patches ──────────────────────
  describe('mineral patches', () => {
    it('registerMineralPatch', () => {
      const rm = createRM();
      const patch = rm.registerMineralPatch({ position: { x: 10, z: 10 } });
      expect(patch.amount).toBe(1500);
      expect(patch.yieldPerTick).toBe(7);
    });

    it('registerGasGeyser', () => {
      const rm = createRM();
      const geyser = rm.registerGasGeyser({ position: { x: 20, z: 20 } });
      expect(geyser.amount).toBe(2500);
      expect(geyser.yieldPerTick).toBe(8);
    });
  });
});
