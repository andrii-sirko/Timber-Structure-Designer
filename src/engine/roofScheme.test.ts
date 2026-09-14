import assert from 'node:assert/strict';
import test from 'node:test';
import type { Member, ProjectState, RoofDirection } from '../types/index.ts';
import { createDefaultProject } from '../store/defaults.ts';
import { buildFraming, buildModel, computeAllWallFrames } from './index.ts';

const DIRS: RoofDirection[] = ['rear', 'front', 'left', 'right'];

function project(dir: RoofDirection = 'rear', closed = false): ProjectState {
  const p = createDefaultProject();
  p.params = {
    ...p.params,
    length: 8300,
    width: 6300,
    frontHeight: 2750,
    rearHeight: 2550,
    roofDirection: dir,
    roofScheme: 'sloped-purlins',
    maxRafterLength: 6000,
    overhangs: { front: 300, rear: 400, left: 100, right: 200 },
  };
  if (closed) for (const id of ['front', 'rear', 'left', 'right'] as const) p.walls[id] = { id, closed: true, openings: [] };
  return p;
}

const near = (a: number, b: number, tol = 1) => Math.abs(a - b) <= tol;
const byCat = (members: Member[], cat: Member['category']) => members.filter((m) => m.category === cat);

test('sloped purlins: rafters are level along X, purlins slope along Z', () => {
  const framing = buildFraming(project());
  const rafters = byCat(framing.members, 'rafter');
  assert.ok(rafters.length > 2);
  for (const r of rafters) {
    assert.deepEqual(r.direction, { x: 1, y: 0, z: 0 });
    assert.deepEqual(r.up, { x: 0, y: 1, z: 0 });
  }
  const purlins = framing.members.filter((m) => m.group.startsWith('Purlin'));
  assert.ok(purlins.length >= 3, 'left, mid and right purlin (L + overhangs > max rafter length)');
  for (const p of purlins) {
    assert.ok(near(p.direction.x, 0, 1e-9));
    assert.ok(p.direction.z > 0.99 && p.direction.y < 0, 'runs down the slope towards +Z');
  }
  // no birdsmouth, split over the mid row
  assert.equal(framing.roof.birdsmouthDepth, 0);
  assert.equal(framing.roof.midPurlinCount, 1);
  assert.equal(framing.roof.rafterPieces, 2);
  assert.equal(framing.grid.scheme, 'sloped-purlins');
  assert.deepEqual(
    framing.grid.rows.map((r) => r.key),
    ['left', 'mid0', 'right'],
  );
});

test('sloped purlins: posts step down along each row and carry the purlin underside', () => {
  const p = project();
  const framing = buildFraming(p);
  const bh = p.params.timber.beam.height;
  const left = framing.grid.rows[0];
  assert.equal(left.axis, 'z');
  const posts = byCat(framing.members, 'post').filter((m) => left.keys.includes(m.id));
  assert.equal(posts.length, left.positions.length);
  assert.ok(posts.length >= 3);
  const sorted = [...posts].sort((a, b) => a.start.z - b.start.z);
  for (let i = 1; i < sorted.length; i++) assert.ok(sorted[i].profile[3].v <= sorted[i - 1].profile[3].v, 'lower towards the low eave');
  // front post top ≈ H1 − purlin plumb thickness
  const cos = Math.cos(framing.roof.pitchRad);
  const frontTop = Math.max(...sorted[0].profile.map((q) => q.u));
  assert.ok(near(frontTop, p.params.frontHeight - bh / cos, 2 + (p.params.timber.post.height / 2) * Math.tan(framing.roof.pitchRad)));
  // all posts sit on a row line (x = pw/2, mid, L − pw/2)
  const rowX = framing.grid.rows.map((r) => r.offset);
  for (const post of byCat(framing.members, 'post')) assert.ok(rowX.some((x) => near(x, post.start.x)), `post ${post.id} on a row`);
});

test('sloped purlins: knee braces stand in the row plane (along Z), not across the entry', () => {
  const framing = buildFraming(project());
  const braces = byCat(framing.members, 'brace');
  assert.ok(braces.length > 0);
  for (const b of braces) {
    assert.ok(near(b.direction.x, 0, 1e-9), 'no X component');
    assert.ok(near(Math.abs(b.direction.z), Math.SQRT1_2, 1e-6));
  }
});

test('sloped purlins: closed front / rear walls get a level rail between the rows, side walls none', () => {
  const framing = buildFraming(project('rear', true));
  const rails = framing.members.filter((m) => m.group.startsWith('Side rail'));
  assert.ok(rails.length >= 4, 'two bays per front / rear wall');
  for (const r of rails) {
    assert.deepEqual(r.direction, { x: 1, y: 0, z: 0 });
    assert.ok(r.wallId === 'front' || r.wallId === 'rear');
  }
  const frames = computeAllWallFrames(project('rear', true));
  assert.equal(frames.front.sloped, false);
  assert.equal(frames.left.sloped, true);
  assert.ok(frames.left.postU.length >= 3, 'left wall posts are the left row');
  assert.ok(frames.front.postU.length >= 3, 'front wall: left row, mid row, right row (+ infill posts)');
  assert.equal(framing.warnings.filter((w) => w.level === 'error').length, 0);
});

test('sloped purlins: mirrored directions give the same member set, statics and BOM run', () => {
  const count = (m: Member[]) => Object.fromEntries((['post', 'beam', 'rafter', 'brace'] as const).map((c) => [c, byCat(m, c).length]));
  // 'left' / 'right' swap L and W in the canonical frame, so only mirrored pairs are comparable
  const base = { rear: buildModel(project('rear')), left: buildModel(project('left')) };
  for (const dir of DIRS) {
    const model = buildModel(project(dir));
    const mirror = dir === 'rear' || dir === 'front' ? base.rear : base.left;
    assert.deepEqual(count(model.framing.members), count(mirror.framing.members), dir);
    assert.ok(model.statics.checks.some((c) => c.id === 'rafter'));
    assert.ok(model.statics.checks.some((c) => c.id.startsWith('purlin-')));
    assert.ok(model.statics.checks.some((c) => c.id.startsWith('post-')));
    assert.ok(model.bom.lines.length > 0);
    assert.ok(model.connections.hardware.length > 0);
  }
  // sloped purlins in world space for 'right': slope along world X, rows along X
  const right = buildModel(project('right'));
  for (const purlin of right.framing.members.filter((m) => m.group.startsWith('Purlin'))) {
    assert.ok(near(purlin.direction.z, 0, 1e-9));
    assert.ok(purlin.direction.x > 0.99);
  }
  for (const r of byCat(right.framing.members, 'rafter')) assert.ok(near(Math.abs(r.direction.z), 1, 1e-9));
});

test('classic scheme is unchanged in shape: rafters down the slope, purlins level along X', () => {
  const p = project();
  p.params = { ...p.params, roofScheme: 'classic' };
  const framing = buildFraming(p);
  for (const r of byCat(framing.members, 'rafter')) assert.ok(near(r.direction.x, 0, 1e-9) && r.direction.z > 0.99);
  for (const b of framing.members.filter((m) => m.group.startsWith('Purlin'))) assert.deepEqual(b.direction, { x: 1, y: 0, z: 0 });
  assert.deepEqual(
    framing.grid.rows.map((r) => r.key),
    ['front', 'mid0', 'rear'],
  );
  assert.ok(framing.roof.birdsmouthDepth > 0);
});
