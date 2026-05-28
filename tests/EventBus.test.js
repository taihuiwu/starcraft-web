// ═══════════════════════════════════════════
// StarCraft Web - EventBus 单元测试
// ═══════════════════════════════════════════

import { describe, it, expect } from 'vitest';
import { EventBus } from '../src/shared/EventBus.js';

describe('EventBus', () => {
  // ── on/emit/off 基本功能 ─────────────────
  describe('on/emit/off', () => {
    it('emit fires listener', () => {
      const bus = new EventBus();
      let received = null;
      bus.on('test', (data) => { received = data; });
      bus.emit('test', 'hello');
      expect(received).toBe('hello');
    });

    it('multiple listeners for same event', () => {
      const bus = new EventBus();
      const calls = [];
      bus.on('test', () => calls.push('a'));
      bus.on('test', () => calls.push('b'));
      bus.emit('test');
      expect(calls).toEqual(['a', 'b']);
    });

    it('off removes specific listener', () => {
      const bus = new EventBus();
      const calls = [];
      const cb = () => calls.push('a');
      bus.on('test', cb);
      bus.on('test', () => calls.push('b'));
      bus.off('test', cb);
      bus.emit('test');
      expect(calls).toEqual(['b']);
    });

    it('on returns unsubscribe function', () => {
      const bus = new EventBus();
      let called = false;
      const unsub = bus.on('test', () => { called = true; });
      unsub();
      bus.emit('test');
      expect(called).toBe(false);
    });

    it('emit with no listeners → no error', () => {
      const bus = new EventBus();
      bus.emit('nonexistent', 'data');
      // No error means success
      expect(true).toBeTruthy();
    });

    it('different events are independent', () => {
      const bus = new EventBus();
      let aCalled = false, bCalled = false;
      bus.on('eventA', () => { aCalled = true; });
      bus.on('eventB', () => { bCalled = true; });
      bus.emit('eventA');
      expect(aCalled).toBe(true);
      expect(bCalled).toBe(false);
    });
  });

  // ── once 一次性监听 ──────────────────────
  describe('once', () => {
    it('once listener fires only once', () => {
      const bus = new EventBus();
      let count = 0;
      bus.once('test', () => { count++; });
      bus.emit('test');
      bus.emit('test');
      bus.emit('test');
      expect(count).toBe(1);
    });

    it('once receives data', () => {
      const bus = new EventBus();
      let received = null;
      bus.once('test', (data) => { received = data; });
      bus.emit('test', 42);
      expect(received).toBe(42);
    });

    it('once and on can coexist', () => {
      const bus = new EventBus();
      let onceCount = 0, onCount = 0;
      bus.once('test', () => { onceCount++; });
      bus.on('test', () => { onCount++; });
      bus.emit('test');
      bus.emit('test');
      expect(onceCount).toBe(1);
      expect(onCount).toBe(2);
    });
  });

  // ── clearAll 清除 ────────────────────────
  describe('clearAll', () => {
    it('clearAll removes all listeners', () => {
      const bus = new EventBus();
      let called = false;
      bus.on('test', () => { called = true; });
      bus.once('test', () => { called = true; });
      bus.clearAll();
      bus.emit('test');
      expect(called).toBe(false);
    });

    it('clear removes specific event listeners', () => {
      const bus = new EventBus();
      let aCalled = false, bCalled = false;
      bus.on('eventA', () => { aCalled = true; });
      bus.on('eventB', () => { bCalled = true; });
      bus.clear('eventA');
      bus.emit('eventA');
      bus.emit('eventB');
      expect(aCalled).toBe(false);
      expect(bCalled).toBe(true);
    });
  });

  // ── 错误处理 ─────────────────────────────
  describe('error handling', () => {
    it('error in listener propagates (no automatic catch)', () => {
      const bus = new EventBus();
      bus.on('test', () => { throw new Error('boom'); });
      expect(() => bus.emit('test')).toThrow('boom');
    });

    it('onError callback captures listener errors', () => {
      const bus = new EventBus();
      const errors = [];
      bus.onError((err) => errors.push(err));
      bus.on('test', () => { throw new Error('boom1'); });
      bus.on('test', () => { throw new Error('boom2'); });
      bus.emit('test');
      expect(errors).toHaveLength(2);
      expect(errors[0].message).toBe('boom1');
    });
  });
});
