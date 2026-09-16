import assert from 'node:assert/strict';
import test from 'node:test';
import { END_STUD_GROUP } from './partitionDrag.ts';
import { wallExtentCursor, wallExtentDragModeAt, wallExtentDragPatch, wallExtentGrabOffset, wallExtentMemberMode, wallRunCoord } from './wallExtentDrag.ts';

// World right wall at x = 6000, running from the rear corner towards -z (flipped start corner)
const flipped = { origin: { x: 6000, y: 0, z: 3000 }, u: { x: 0, y: 0, z: -1 }, extent: { start: 0, end: 3000 } };
const front = { origin: { x: 0, y: 0, z: 0 }, u: { x: 1, y: 0, z: 0 }, extent: { start: 1000, end: 5000 } };

test('run coordinate follows the wall direction from its start corner', () => {
  assert.equal(wallRunCoord(front, { x: 2500, z: -80 }), 2500);
  assert.equal(wallRunCoord(flipped, { x: 6050, z: 2400 }), 600);
});

test('grabbing near an end of the closed stretch resizes that end, the middle does nothing', () => {
  assert.equal(wallExtentDragModeAt(front, { x: 1200, z: 0 }), 'start');
  assert.equal(wallExtentDragModeAt(front, { x: 4800, z: 0 }), 'end');
  assert.equal(wallExtentDragModeAt(front, { x: 3000, z: 0 }), null);
  assert.equal(wallExtentDragModeAt(flipped, { x: 6000, z: 2900 }), 'start');
  assert.equal(wallExtentDragModeAt(flipped, { x: 6000, z: 100 }), 'end');
});

test('only end studs resize from the frame', () => {
  const stud = (group: string, x: number) => ({ wallId: 'front' as const, group, start: { x, y: 0, z: 0 } });
  assert.equal(wallExtentMemberMode(stud(END_STUD_GROUP, 1030), front), 'start');
  assert.equal(wallExtentMemberMode(stud(END_STUD_GROUP, 4970), front), 'end');
  assert.equal(wallExtentMemberMode(stud('Stud (Ständer)', 1030), front), null);
  assert.equal(wallExtentMemberMode({ group: END_STUD_GROUP, start: { x: 1030, y: 0, z: 0 } }, front), null);
});

test('the dragged end follows the pointer without jumping, snapped to 10 mm', () => {
  const grab = wallExtentGrabOffset(front, 'end', { x: 4880, z: 0 });
  assert.equal(grab, -120);
  assert.deepEqual(wallExtentDragPatch(front, 'end', { x: 3880, z: 0 }, grab), { end: 4000 });
  assert.deepEqual(wallExtentDragPatch(flipped, 'start', { x: 6000, z: 2196 }, 0), { start: 800 });
});

test('cursor points along the wall', () => {
  assert.equal(wallExtentCursor(front.u), 'ew-resize');
  assert.equal(wallExtentCursor(flipped.u), 'ns-resize');
});
