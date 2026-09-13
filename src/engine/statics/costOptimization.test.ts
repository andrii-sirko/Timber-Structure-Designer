import assert from 'node:assert/strict';
import test from 'node:test';
import { findSmallestValidSection } from './costOptimizationHelpers.ts';

interface Section {
  width: number;
  height: number;
}

test('finds the smallest lower section that still passes the statics predicate', () => {
  const result = findSmallestValidSection<Section>(
    { width: 80, height: 280 },
    [80, 100, 120, 140, 160, 180, 200, 220, 240, 260, 280],
    (section) => section.height >= 200,
  );

  assert.deepEqual(result, { width: 80, height: 200 });
});

test('keeps the current section when no smaller section passes', () => {
  const current = { width: 80, height: 120 };
  const result = findSmallestValidSection<Section>(
    current,
    [80, 100, 120],
    () => false,
  );

  assert.deepEqual(result, current);
});
