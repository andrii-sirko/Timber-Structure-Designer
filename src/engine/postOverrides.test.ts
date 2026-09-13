import assert from 'node:assert/strict';
import test from 'node:test';
import { resolvePostPositions } from './postOverrides.ts';
import { canDragMember, canMovePost, partitionDragAxis, partitionEdgeDistances } from './postDrag.ts';

test('resolves moved and removed posts while preserving row order', () => {
  const result = resolvePostPositions([60, 3000, 5940], {
    'front:1': { position: 4200 },
    'front:2': { removed: true },
  });

  assert.deepEqual(result, [
    { key: 'front:0', position: 60 },
    { key: 'front:1', position: 4200 },
  ]);
});

test('clamps moved posts to the supplied row bounds', () => {
  const result = resolvePostPositions([60, 3000, 5940], { 'front:1': { position: -500 } }, { min: 60, max: 5940 });

  assert.deepEqual(result[1], { key: 'front:1', position: 60 });
});

test('does not move a post until pointer down activates dragging', () => {
  assert.equal(canMovePost(false), false);
  assert.equal(canMovePost(true), true);
});

test('allows interior partition end studs to act as drag handles', () => {
  assert.equal(canDragMember({ category: 'stud', partitionId: 'partition-1', group: 'End stud (Eckständer)' }), true);
  assert.equal(canDragMember({ category: 'stud', partitionId: 'partition-1', group: 'Stud (Ständer)' }), false);
  assert.equal(canDragMember({ category: 'post', group: 'Post (Pfosten)' }), true);
});

test('projects pointer movement onto the partition offset axis', () => {
  assert.equal(partitionDragAxis('x', { x: 900, z: 1450 }), 1450);
  assert.equal(partitionDragAxis('z', { x: 900, z: 1450 }), 900);
});

test('reports clear distances from an interior partition to the enclosing edges', () => {
  assert.deepEqual(
    partitionEdgeDistances({ axis: 'x', offset: 2000 }, { length: 6000, width: 5000 }, 120),
    { first: 1940, second: 2940 },
  );
  assert.deepEqual(
    partitionEdgeDistances({ axis: 'z', offset: 2500 }, { length: 6000, width: 5000 }, 120),
    { first: 2440, second: 3440 },
  );
});
