import assert from 'node:assert/strict';
import test from 'node:test';
import { END_STUD_GROUP, partitionDragCursor, partitionDragMode, partitionDragModeAt, partitionDragPatch, partitionGrabOffset } from './partitionDrag.ts';

const along = { id: 'p1', axis: 'x' as const, offset: 1500, start: 500, end: 4500 };
const across = { id: 'p2', axis: 'z' as const, offset: 3000, start: 300, end: 2700 };

const member = (partitionId: string, group: string, start: { x: number; z: number }) => ({ partitionId, group, start: { ...start, y: 0 } });

test('body members move the wall, end studs resize it at their end', () => {
  assert.equal(partitionDragMode(member('p1', 'Stud (Ständer)', { x: 2000, z: 1500 }), along), 'move');
  assert.equal(partitionDragMode(member('p1', 'Top plate (Rähm)', { x: 500, z: 1500 }), along), 'move');
  assert.equal(partitionDragMode(member('p1', END_STUD_GROUP, { x: 530, z: 1500 }), along), 'start');
  assert.equal(partitionDragMode(member('p1', END_STUD_GROUP, { x: 4470, z: 1500 }), along), 'end');
  assert.equal(partitionDragMode(member('p2', END_STUD_GROUP, { x: 3000, z: 2670 }), across), 'end');
  assert.equal(partitionDragMode(member('other', END_STUD_GROUP, { x: 530, z: 1500 }), along), null);
});

test('grabbing any piece within 300 mm of an end resizes that end, elsewhere moves', () => {
  assert.equal(partitionDragModeAt(along, { x: 700, z: 1500 }), 'start');
  assert.equal(partitionDragModeAt(along, { x: 4300, z: 1500 }), 'end');
  assert.equal(partitionDragModeAt(along, { x: 2500, z: 1500 }), 'move');
  assert.equal(partitionDragModeAt({ axis: 'z', start: 1000, end: 1600 }, { x: 0, z: 1250 }), 'move');
  assert.equal(partitionDragModeAt({ axis: 'z', start: 1000, end: 1600 }, { x: 0, z: 1150 }), 'start');
  const plate = member('p1', 'Top plate (Rähm)', { x: 500, z: 1500 });
  assert.equal(partitionDragMode(plate, along, { x: 4400, z: 1500 }), 'end');
  assert.equal(partitionDragMode(plate, along, { x: 2000, z: 1500 }), 'move');
  assert.equal(partitionDragMode(member('p1', END_STUD_GROUP, { x: 530, z: 1500 }), along, { x: 2000, z: 1500 }), 'start');
});

test('moving tracks the pointer across the wall with the grab offset removed, snapped to 10 mm', () => {
  const grab = partitionGrabOffset(along, 'move', { x: 2000, z: 1540 });
  assert.equal(grab, 40);
  assert.deepEqual(partitionDragPatch(along, 'move', { x: 2000, z: 1540 }, grab), { offset: 1500 });
  assert.deepEqual(partitionDragPatch(along, 'move', { x: 2100, z: 2043 }, grab), { offset: 2000 });
  const grabZ = partitionGrabOffset(across, 'move', { x: 2980, z: 1000 });
  assert.deepEqual(partitionDragPatch(across, 'move', { x: 3480, z: 1200 }, grabZ), { offset: 3500 });
});

test('resizing tracks the pointer along the wall and keeps the minimum length', () => {
  const grab = partitionGrabOffset(along, 'start', { x: 530, z: 1500 });
  assert.equal(grab, 30);
  assert.deepEqual(partitionDragPatch(along, 'start', { x: 1034, z: 1500 }, grab), { start: 1000 });
  assert.deepEqual(partitionDragPatch(along, 'start', { x: 4900, z: 1500 }, grab), { start: 4300 });
  assert.deepEqual(partitionDragPatch(along, 'end', { x: 5200, z: 1500 }, 0), { end: 5200 });
  assert.deepEqual(partitionDragPatch(along, 'end', { x: 100, z: 1500 }, 0), { end: 700 });
  assert.deepEqual(partitionDragPatch(across, 'end', { x: 3000, z: 2995 }, 0), { end: 3000 });
});

test('cursor points across the wall for moves and along it for resizes', () => {
  assert.equal(partitionDragCursor('move', 'x'), 'ns-resize');
  assert.equal(partitionDragCursor('move', 'z'), 'ew-resize');
  assert.equal(partitionDragCursor('start', 'x'), 'ew-resize');
  assert.equal(partitionDragCursor('end', 'z'), 'ns-resize');
});
