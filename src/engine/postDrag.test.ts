import assert from 'node:assert/strict';
import test from 'node:test';
import { postEdgeDistances, postNeighbourDistances } from './postDrag.ts';

test('postEdgeDistances measures clear distances from the post faces to each footprint edge', () => {
  const d = postEdgeDistances({ minX: 940, maxX: 1060, minZ: 1940, maxZ: 2060 }, { length: 6000, width: 4000 });
  assert.deepEqual(d, { left: 940, right: 4940, front: 1940, rear: 1940 });
});

test('postNeighbourDistances measures to the nearest post or end stud on the same axis and falls back to the edge', () => {
  const bounds = { length: 8750, width: 5700 };
  const post = { minX: 3000, maxX: 3160, minZ: 0, maxZ: 160 };
  const others = [
    { minX: 0, maxX: 160, minZ: 0, maxZ: 160, kind: 'post' as const }, // same row, left
    { minX: 1000, maxX: 1160, minZ: 0, maxZ: 160, kind: 'post' as const }, // same row, left and nearer
    { minX: 8590, maxX: 8750, minZ: 0, maxZ: 160, kind: 'post' as const }, // same row, right
    { minX: 6000, maxX: 6060, minZ: 50, maxZ: 110, kind: 'stud' as const }, // end stud on the row, nearer than the right post
    { minX: 3000, maxX: 3160, minZ: 5540, maxZ: 5700, kind: 'post' as const }, // same column, rear
    { minX: 5000, maxX: 5160, minZ: 2770, maxZ: 2930, kind: 'post' as const }, // off both axes
  ];
  assert.deepEqual(postNeighbourDistances(post, others, bounds), {
    left: { distance: 1840, to: 'post' },
    right: { distance: 2840, to: 'stud' },
    front: { distance: 0, to: 'edge' },
    rear: { distance: 5380, to: 'post' },
  });
});
