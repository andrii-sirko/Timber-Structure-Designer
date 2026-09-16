import assert from 'node:assert/strict';
import test from 'node:test';
import { postEdgeDistances } from './postDrag.ts';

test('postEdgeDistances measures clear distances from the post faces to each footprint edge', () => {
  const d = postEdgeDistances({ minX: 940, maxX: 1060, minZ: 1940, maxZ: 2060 }, { length: 6000, width: 4000 });
  assert.deepEqual(d, { left: 940, right: 4940, front: 1940, rear: 1940 });
});
