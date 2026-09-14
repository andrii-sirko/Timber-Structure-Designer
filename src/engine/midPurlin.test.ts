import assert from 'node:assert/strict';
import test from 'node:test';
import { createDefaultProject } from '../store/defaults.ts';
import { buildFraming } from './index.ts';
import { applyMidPurlinOverrides, computeRoofLines, midPurlinBounds } from './framing/roofLines.ts';

function params(overrides: Partial<ReturnType<typeof createDefaultProject>['params']> = {}) {
  const p = createDefaultProject();
  p.params = { ...p.params, width: 9000, maxRafterLength: 6000, ...overrides };
  return p;
}

test('classic: automatic mid purlin is replaced by a manual position', () => {
  const auto = computeRoofLines(params().params);
  assert.equal(auto.midPurlinZ.length, 1);
  const manual = computeRoofLines(params({ midPurlinPositions: [3500] }).params);
  assert.deepEqual(manual.midPurlinZ, [3500]);
  assert.equal(manual.purlins[1].z, 3500);
});

test('manual position is clamped clear of the eave purlins and within the rafter length', () => {
  const p = params({ midPurlinPositions: [50] }).params;
  const b = midPurlinBounds(p);
  const { cos } = computeRoofLines(p);
  const reach = p.maxRafterLength * cos;
  const lo = Math.round(Math.max(b.lo, p.width + p.overhangs.rear - reach));
  const hi = Math.round(Math.min(b.hi, -p.overhangs.front + reach));
  assert.ok(lo > b.lo && hi < b.hi, 'the rafter length is the binding limit on a 9 m roof');
  assert.deepEqual(computeRoofLines(p).midPurlinZ, [lo]);
  assert.deepEqual(computeRoofLines({ ...p, midPurlinPositions: [99999] }).midPurlinZ, [hi]);
});

test('null keeps the automatic split; neighbours keep their order', () => {
  assert.deepEqual(applyMidPurlinOverrides([3000, 6000], [null, 3100], { lo: 500, hi: 8500, minGap: 220 }), [3000, 3220]);
  assert.deepEqual(applyMidPurlinOverrides([3000, 6000], [7000, null], { lo: 500, hi: 8500, minGap: 220 }), [5780, 6000]);
  assert.deepEqual(applyMidPurlinOverrides([3000], undefined, { lo: 500, hi: 8500, minGap: 220 }), [3000]);
});

test('manual position is clamped so no rafter piece exceeds the max rafter length', () => {
  const span = { start: -200, end: 9000, maxPiece: 6000 };
  assert.deepEqual(applyMidPurlinOverrides([4400], [2110], { lo: 500, hi: 8500, minGap: 220 }, span), [3000]);
  assert.deepEqual(applyMidPurlinOverrides([4400], [7000], { lo: 500, hi: 8500, minGap: 220 }, span), [5800]);
  assert.deepEqual(applyMidPurlinOverrides([4400], [4000], { lo: 500, hi: 8500, minGap: 220 }, span), [4000]);
  // the length limit is dropped when it cannot be met, the row still stays inside the bounds
  assert.deepEqual(applyMidPurlinOverrides([4400], [50], { lo: 500, hi: 8500, minGap: 220 }, { ...span, maxPiece: 2000 }), [500]);

  const sloped = params({ roofScheme: 'sloped-purlins', width: 5700, length: 8800, midPurlinPositions: [2110] }).params;
  const roof = computeRoofLines(sloped);
  assert.deepEqual(roof.midPurlinX, [8800 + sloped.overhangs.right - 6000]);
  const framing = buildFraming({ ...params(), params: sloped });
  assert.ok(framing.warnings.every((w) => !w.message.includes('exceeds the max rafter length')));

  const classic = params({ midPurlinPositions: [1000] }).params;
  const lines = computeRoofLines(classic);
  const rear = classic.width + classic.overhangs.rear;
  assert.ok((rear - lines.midPurlinZ[0]) / lines.cos <= 6000 + 1);
});

test('framing: mid purlin members and their posts follow the manual position', () => {
  const framing = buildFraming(params({ midPurlinPositions: [3500] }));
  const mid = framing.members.filter((m) => m.purlinRow === 'mid0');
  assert.ok(mid.length >= 1);
  for (const m of mid) assert.equal(m.start.z, 3500);
  const row = framing.grid.rows.find((r) => r.key === 'mid0');
  assert.equal(row?.offset, 3500);
  const posts = framing.members.filter((m) => m.category === 'post' && m.id.startsWith('mid0:'));
  assert.ok(posts.length >= 2);
  for (const p of posts) assert.equal(p.start.z, 3500);
});

test('sloped purlins: manual position moves the mid row along X', () => {
  const p = params({ roofScheme: 'sloped-purlins', width: 4000, length: 9000, midPurlinPositions: [4000] }).params;
  assert.deepEqual(computeRoofLines(p).midPurlinX, [4000]);
});

test('drag ruler: distances from the mid purlin to both neighbouring rows, rotated with the roof direction', async () => {
  const { midPurlinRuler } = await import('./purlinDrag.ts');
  const project = params({ midPurlinPositions: [3500] });
  const rear = buildFraming(project);
  const segs = midPurlinRuler(0, rear.grid, project.params);
  assert.equal(segs.length, 2);
  assert.equal(segs[0].label, `front ${3500 - 60} mm`);
  assert.equal(segs[1].label, `rear ${9000 - 60 - 3500} mm`);
  assert.equal(segs[0].b.z, 3500);
  assert.ok(segs[0].a.y > 2000, 'ruler sits at purlin height');
  // roof sloping towards the left wall: the rafters span the world length (canonical width = L),
  // the ruler runs along world X
  const left = { ...project, params: { ...project.params, roofDirection: 'left' as const } };
  const segsL = midPurlinRuler(0, buildFraming(left).grid, left.params);
  assert.equal(segsL[0].label, segs[0].label);
  assert.equal(segsL[1].label, `rear ${project.params.length - 60 - 3500} mm`);
  assert.equal(segsL[0].a.z, segsL[0].b.z, 'ruler runs along world X');
  assert.notEqual(segsL[0].a.x, segsL[0].b.x);
  assert.equal(midPurlinRuler(7, rear.grid, project.params).length, 0);
});
