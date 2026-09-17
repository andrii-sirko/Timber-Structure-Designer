import assert from 'node:assert/strict';
import test from 'node:test';
import type { Member } from '@/types';
import { studSpacing } from './neighbours.ts';
import { rectProfile, X_AXIS, Y_AXIS } from './geometry.ts';

/** Upright timber of a front wall running along X, 60 mm along the wall, 120 mm deep. */
const upright = (id: string, x: number, height = 2400, bottom = 60, z = 0, alongWall = 60): Member => ({
  id,
  category: 'stud',
  name: id,
  nameDe: id,
  group: 'Stud (Ständer)',
  section: { width: 120, height: alongWall },
  length: height,
  start: { x, y: bottom, z },
  direction: Y_AXIS,
  up: X_AXIS,
  cuts: { start: 0, end: 0 },
  profile: rectProfile(height, alongWall),
});

const plate: Member = { ...upright('plate', 3000), category: 'plate', direction: X_AXIS, up: Y_AXIS, start: { x: 0, y: 30, z: 0 }, length: 6000, profile: rectProfile(6000, 60) };

test('reports the nearest upright on each side with clear gap and centre spacing', () => {
  const members = [upright('far', 0), upright('left', 600), upright('subject', 1200), upright('right', 1800), plate];
  const result = studSpacing(members, 'subject');

  assert.deepEqual(
    result.map((s) => [s.memberId, s.side, s.clear, s.centres]),
    [
      ['left', -1, 540, 600],
      ['right', 1, 540, 600],
    ],
  );
  assert.equal(result[0].a.x, 1170);
  assert.equal(result[0].b.x, 630);
});

test('ignores uprights in another wall plane or above the stud', () => {
  const members = [upright('subject', 1200, 1000), upright('otherWall', 1500, 2400, 60, 3000), upright('cripple', 900, 600, 1800), upright('right', 2000)];
  assert.deepEqual(studSpacing(members, 'subject').map((s) => s.memberId), ['right']);
});

test('measures to the face of a wider post', () => {
  const members = [upright('subject', 1000), upright('post', 1500, 2400, 0, 0, 120)];
  const [link] = studSpacing(members, 'subject');
  assert.equal(link.clear, 410);
  assert.equal(link.centres, 500);
});
