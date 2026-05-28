// ═══════════════════════════════════════════
// StarCraft Web - LODSystem 单元测试
// ═══════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import { LODSystem, LOD_LEVEL } from '../src/engine/LODSystem.js';

/**
 * Create a mock Three.js object with position and visible/scale
 */
function mockObject(x = 0, y = 0, z = 0) {
  return {
    position: { x, y, z },
    visible: false,
    scale: {
      _scalar: 1,
      setScalar(s) { this._scalar = s; },
    },
  };
}

/**
 * Create a mock camera
 */
function mockCamera(x = 0, y = 0, z = 0) {
  return {
    position: { x, y, z },
  };
}

/**
 * Create 3 mock LOD levels for an object at given position
 */
function mockLODLevels(x = 0, y = 0, z = 0) {
  return [
    mockObject(x, y, z), // HIGH
    mockObject(x, y, z), // MEDIUM
    mockObject(x, y, z), // LOW
  ];
}

describe('LODSystem', () => {
  describe('constructor', () => {
    it('initializes with camera', () => {
      const cam = mockCamera();
      const lod = new LODSystem(cam);
      expect(lod.camera).toBe(cam);
      expect(lod.getCount()).toBe(0);
    });

    it('default distance thresholds', () => {
      const lod = new LODSystem(mockCamera());
      expect(lod.distances.high).toBe(30);
      expect(lod.distances.medium).toBe(80);
      expect(lod.distances.low).toBe(150);
    });
  });

  describe('addObject', () => {
    it('adds object and returns index', () => {
      const lod = new LODSystem(mockCamera());
      const ref = mockObject();
      const levels = mockLODLevels();
      const idx = lod.addObject(ref, levels);
      expect(idx).toBe(0);
      expect(lod.getCount()).toBe(1);
    });

    it('sets initial visibility to HIGH', () => {
      const lod = new LODSystem(mockCamera());
      const levels = mockLODLevels();
      lod.addObject(mockObject(), levels);
      expect(levels[LOD_LEVEL.HIGH].visible).toBe(true);
      expect(levels[LOD_LEVEL.MEDIUM].visible).toBe(false);
      expect(levels[LOD_LEVEL.LOW].visible).toBe(false);
    });

    it('multiple objects get sequential indices', () => {
      const lod = new LODSystem(mockCamera());
      const idx0 = lod.addObject(mockObject(), mockLODLevels());
      const idx1 = lod.addObject(mockObject(), mockLODLevels());
      expect(idx0).toBe(0);
      expect(idx1).toBe(1);
      expect(lod.getCount()).toBe(2);
    });
  });

  describe('removeObject', () => {
    it('removes object by reference', () => {
      const lod = new LODSystem(mockCamera());
      const ref = mockObject();
      lod.addObject(ref, mockLODLevels());
      expect(lod.getCount()).toBe(1);
      lod.removeObject(ref);
      expect(lod.getCount()).toBe(0);
    });

    it('removing non-existing object does not error', () => {
      const lod = new LODSystem(mockCamera());
      lod.addObject(mockObject(), mockLODLevels());
      lod.removeObject(mockObject()); // different reference
      expect(lod.getCount()).toBe(1);
    });
  });

  describe('update - distance-based LOD switching', () => {
    it('stays HIGH when close to camera', () => {
      const cam = mockCamera(0, 0, 0);
      const lod = new LODSystem(cam);
      const levels = mockLODLevels(5, 0, 5); // distance ≈ 7.07
      const ref = { position: { x: 5, y: 0, z: 5 } };
      lod.addObject(ref, levels);
      lod.update(0.1);
      // distance 7.07 < 30 → HIGH
      expect(levels[LOD_LEVEL.HIGH].visible).toBe(true);
      expect(levels[LOD_LEVEL.MEDIUM].visible).toBe(false);
      expect(levels[LOD_LEVEL.LOW].visible).toBe(false);
    });

    it('switches to MEDIUM when medium distance', () => {
      const cam = mockCamera(0, 0, 0);
      const lod = new LODSystem(cam);
      const levels = mockLODLevels(50, 0, 0); // distance = 50
      const ref = { position: { x: 50, y: 0, z: 0 } };
      lod.addObject(ref, levels);
      // Update enough times for transition to complete
      for (let i = 0; i < 20; i++) {
        lod.update(0.2);
      }
      expect(levels[LOD_LEVEL.HIGH].visible).toBe(false);
      expect(levels[LOD_LEVEL.MEDIUM].visible).toBe(true);
      expect(levels[LOD_LEVEL.LOW].visible).toBe(false);
    });

    it('switches to LOW when far from camera', () => {
      const cam = mockCamera(0, 0, 0);
      const lod = new LODSystem(cam);
      const levels = mockLODLevels(100, 0, 0); // distance = 100
      const ref = { position: { x: 100, y: 0, z: 0 } };
      lod.addObject(ref, levels);
      for (let i = 0; i < 20; i++) {
        lod.update(0.2);
      }
      expect(levels[LOD_LEVEL.HIGH].visible).toBe(false);
      expect(levels[LOD_LEVEL.MEDIUM].visible).toBe(false);
      expect(levels[LOD_LEVEL.LOW].visible).toBe(true);
    });

    it('transition is smooth over multiple frames', () => {
      const cam = mockCamera(0, 0, 0);
      const lod = new LODSystem(cam);
      const levels = mockLODLevels(50, 0, 0);
      const ref = { position: { x: 50, y: 0, z: 0 } };
      lod.addObject(ref, levels);
      // First update: starts transition
      lod.update(0.1);
      // Both old and new should be visible during transition
      expect(levels[LOD_LEVEL.HIGH].visible).toBe(true);
      expect(levels[LOD_LEVEL.MEDIUM].visible).toBe(true);
    });

    it('handles multiple objects independently', () => {
      const cam = mockCamera(0, 0, 0);
      const lod = new LODSystem(cam);
      const levels1 = mockLODLevels(5, 0, 5);   // close → HIGH
      const levels2 = mockLODLevels(100, 0, 0);  // far → LOW
      const ref1 = { position: { x: 5, y: 0, z: 5 } };
      const ref2 = { position: { x: 100, y: 0, z: 0 } };
      lod.addObject(ref1, levels1);
      lod.addObject(ref2, levels2);
      for (let i = 0; i < 20; i++) {
        lod.update(0.2);
      }
      expect(levels1[LOD_LEVEL.HIGH].visible).toBe(true);
      expect(levels2[LOD_LEVEL.LOW].visible).toBe(true);
    });

    it('uses XZ plane distance (ignores Y)', () => {
      const cam = mockCamera(0, 1000, 0); // very high Y
      const lod = new LODSystem(cam);
      const levels = mockLODLevels(5, 0, 5); // close in XZ, far in Y
      const ref = { position: { x: 5, y: 0, z: 5 } };
      lod.addObject(ref, levels);
      lod.update(0.1);
      // distance in XZ ≈ 7.07 < 30 → HIGH (Y ignored)
      expect(levels[LOD_LEVEL.HIGH].visible).toBe(true);
    });
  });

  describe('setDistances', () => {
    it('updates distance thresholds', () => {
      const lod = new LODSystem(mockCamera());
      lod.setDistances(20, 60, 120);
      expect(lod.distances.high).toBe(20);
      expect(lod.distances.medium).toBe(60);
      expect(lod.distances.low).toBe(120);
    });
  });

  describe('clear', () => {
    it('removes all objects', () => {
      const lod = new LODSystem(mockCamera());
      lod.addObject(mockObject(), mockLODLevels());
      lod.addObject(mockObject(), mockLODLevels());
      expect(lod.getCount()).toBe(2);
      lod.clear();
      expect(lod.getCount()).toBe(0);
    });
  });

  describe('dispose', () => {
    it('clears objects and nulls camera', () => {
      const lod = new LODSystem(mockCamera());
      lod.addObject(mockObject(), mockLODLevels());
      lod.dispose();
      expect(lod.getCount()).toBe(0);
      expect(lod.camera).toBeNull();
    });

    it('update after dispose does not error', () => {
      const lod = new LODSystem(mockCamera());
      lod.dispose();
      expect(() => lod.update(0.1)).not.toThrow();
    });
  });
});
