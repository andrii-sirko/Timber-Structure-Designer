import assert from 'node:assert/strict';
import test from 'node:test';
import type { StateStorage } from 'zustand/middleware';
import { filterWrites } from './filteredStorage.ts';

function memoryStorage() {
  const writes: [string, string][] = [];
  const storage: StateStorage = {
    getItem: () => null,
    setItem: (name, value) => {
      writes.push([name, value]);
    },
    removeItem: () => {},
  };
  return { storage, writes };
}

test('an unchanged value is not written again', () => {
  const { storage, writes } = memoryStorage();
  const filtered = filterWrites(storage, () => false);
  filtered.setItem('k', 'a');
  filtered.setItem('k', 'a');
  filtered.setItem('k', 'b');
  filtered.setItem('k', 'b');
  assert.deepEqual(writes, [['k', 'a'], ['k', 'b']]);
});

test('writes are skipped while paused; the first write after the pause saves the final value', () => {
  const { storage, writes } = memoryStorage();
  let dragging = true;
  const filtered = filterWrites(storage, () => dragging);
  for (let i = 1; i <= 30; i++) filtered.setItem('k', `v${i}`);
  assert.equal(writes.length, 0);
  dragging = false;
  filtered.setItem('k', 'v30');
  assert.deepEqual(writes, [['k', 'v30']]);
});

test('after remove, the same value is written again', () => {
  const { storage, writes } = memoryStorage();
  const filtered = filterWrites(storage, () => false);
  filtered.setItem('k', 'a');
  filtered.removeItem('k');
  filtered.setItem('k', 'a');
  assert.equal(writes.length, 2);
});
