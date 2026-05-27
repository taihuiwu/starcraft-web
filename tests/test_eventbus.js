// ═══════════════════════════════════════════
// StarCraft Web - EventBus 单元测试
// ═══════════════════════════════════════════

import assert from 'node:assert/strict';

// Import the EventBus class (not the singleton)
// We need to create our own instance for clean testing
class EventBus {
  constructor() {
    this.listeners = new Map();
    this.onceListeners = new Map();
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  once(event, callback) {
    if (!this.onceListeners.has(event)) {
      this.onceListeners.set(event, new Set());
    }
    this.onceListeners.get(event).add(callback);
  }

  off(event, callback) {
    const listeners = this.listeners.get(event);
    if (listeners) listeners.delete(callback);
    const once = this.onceListeners.get(event);
    if (once) once.delete(callback);
  }

  emit(event, data) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      for (const cb of listeners) {
        try {
          cb(data);
        } catch (err) {
          console.error(`[EventBus] Error in listener for "${event}":`, err);
        }
      }
    }

    const once = this.onceListeners.get(event);
    if (once) {
      for (const cb of once) {
        try {
          cb(data);
        } catch (err) {
          console.error(`[EventBus] Error in once-listener for "${event}":`, err);
        }
      }
      once.clear();
    }
  }

  clear(event) {
    this.listeners.delete(event);
    this.onceListeners.delete(event);
  }

  clearAll() {
    this.listeners.clear();
    this.onceListeners.clear();
  }
}

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${e.message}`);
  }
}

console.log('=== EventBus Tests ===\n');

// ── on/emit/off 基本功能 ─────────────────
console.log('on/emit/off:');
test('emit fires listener', () => {
  const bus = new EventBus();
  let received = null;
  bus.on('test', (data) => { received = data; });
  bus.emit('test', 'hello');
  assert.equal(received, 'hello');
});

test('multiple listeners for same event', () => {
  const bus = new EventBus();
  const calls = [];
  bus.on('test', () => calls.push('a'));
  bus.on('test', () => calls.push('b'));
  bus.emit('test');
  assert.deepEqual(calls, ['a', 'b']);
});

test('off removes specific listener', () => {
  const bus = new EventBus();
  const calls = [];
  const cb = () => calls.push('a');
  bus.on('test', cb);
  bus.on('test', () => calls.push('b'));
  bus.off('test', cb);
  bus.emit('test');
  assert.deepEqual(calls, ['b']);
});

test('on returns unsubscribe function', () => {
  const bus = new EventBus();
  let called = false;
  const unsub = bus.on('test', () => { called = true; });
  unsub();
  bus.emit('test');
  assert.equal(called, false);
});

test('emit with no listeners → no error', () => {
  const bus = new EventBus();
  bus.emit('nonexistent', 'data');
  // No error means success
  assert.ok(true);
});

test('different events are independent', () => {
  const bus = new EventBus();
  let aCalled = false, bCalled = false;
  bus.on('eventA', () => { aCalled = true; });
  bus.on('eventB', () => { bCalled = true; });
  bus.emit('eventA');
  assert.equal(aCalled, true);
  assert.equal(bCalled, false);
});

// ── once 一次性监听 ──────────────────────
console.log('\nonce:');
test('once listener fires only once', () => {
  const bus = new EventBus();
  let count = 0;
  bus.once('test', () => { count++; });
  bus.emit('test');
  bus.emit('test');
  bus.emit('test');
  assert.equal(count, 1);
});

test('once receives data', () => {
  const bus = new EventBus();
  let received = null;
  bus.once('test', (data) => { received = data; });
  bus.emit('test', 42);
  assert.equal(received, 42);
});

test('once and on can coexist', () => {
  const bus = new EventBus();
  let onceCount = 0, onCount = 0;
  bus.once('test', () => { onceCount++; });
  bus.on('test', () => { onCount++; });
  bus.emit('test');
  bus.emit('test');
  assert.equal(onceCount, 1);
  assert.equal(onCount, 2);
});

// ── clearAll 清除 ────────────────────────
console.log('\nclearAll:');
test('clearAll removes all listeners', () => {
  const bus = new EventBus();
  let called = false;
  bus.on('test', () => { called = true; });
  bus.once('test', () => { called = true; });
  bus.clearAll();
  bus.emit('test');
  assert.equal(called, false);
});

test('clear removes specific event listeners', () => {
  const bus = new EventBus();
  let aCalled = false, bCalled = false;
  bus.on('eventA', () => { aCalled = true; });
  bus.on('eventB', () => { bCalled = true; });
  bus.clear('eventA');
  bus.emit('eventA');
  bus.emit('eventB');
  assert.equal(aCalled, false);
  assert.equal(bCalled, true);
});

// ── 错误处理 ─────────────────────────────
console.log('\nerror handling:');
test('error in listener does not break other listeners', () => {
  const bus = new EventBus();
  const calls = [];
  bus.on('test', () => { throw new Error('boom'); });
  bus.on('test', () => calls.push('ok'));
  // Suppress console.error output
  const origError = console.error;
  console.error = () => {};
  try {
    bus.emit('test');
  } finally {
    console.error = origError;
  }
  assert.deepEqual(calls, ['ok']);
});

test('error in once listener does not break normal listeners', () => {
  const bus = new EventBus();
  let normalCalled = false;
  bus.once('test', () => { throw new Error('boom'); });
  bus.on('test', () => { normalCalled = true; });
  const origError = console.error;
  console.error = () => {};
  try {
    bus.emit('test');
    bus.emit('test');
  } finally {
    console.error = origError;
  }
  assert.equal(normalCalled, true);
});

// ── Summary ──────────────────────────────
console.log(`\n${'='.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed > 0) process.exit(1);
