import assert from 'node:assert/strict';
import test from 'node:test';
import type { ProjectState, RoofDirection, WallId } from '../types/index.ts';
import { WALL_IDS } from '../types/index.ts';
import { createDefaultProject } from '../store/defaults.ts';
import { buildModel, computeAllWallFrames } from './index.ts';
import { canonicalizeProject, canonicalWall, relabelSides, wallFlipped, worldWall } from './orientation.ts';

const DIRS: RoofDirection[] = ['rear', 'front', 'left', 'right'];

function project(dir: RoofDirection): ProjectState {
  const p = createDefaultProject();
  p.params = { ...p.params, length: 6000, width: 3000, frontHeight: 2600, rearHeight: 2250, roofDirection: dir, overhangs: { front: 300, rear: 400, left: 100, right: 200 } };
  p.walls.front = { id: 'front', closed: true, openings: [{ id: 'd', type: 'door', x: 500, y: 0, width: 900, height: 1800 }] };
  p.walls.rear = { id: 'rear', closed: true, openings: [] };
  p.vehicles = [{ id: 'v', modelId: 'vw-golf', x: 3000, z: 1500, rotationDeg: 0, color: '#000' }];
  return p;
}

const near = (a: number, b: number, tol = 1) => Math.abs(a - b) <= tol;

test('canonical wall mapping is a bijection and the low eave is always the canonical rear', () => {
  for (const dir of DIRS) {
    assert.equal(canonicalWall(dir, dir), 'rear');
    for (const w of WALL_IDS) assert.equal(worldWall(dir, canonicalWall(dir, w)), w);
  }
});

test('member count and roof geometry do not depend on the direction', () => {
  // no openings: with a door the stud layout legitimately differs between the high and the low wall
  const plain = (dir: RoofDirection): ProjectState => {
    const p = project(dir);
    // open carport: closed walls would move to other canonical walls with the direction
    p.walls.front = { id: 'front', closed: false, openings: [] };
    p.walls.rear = { id: 'rear', closed: false, openings: [] };
    // symmetric overhangs: the ridge / eave heights are measured at the overhang tips
    p.params = { ...p.params, overhangs: { front: 250, rear: 250, left: 250, right: 250 } };
    return p;
  };
  // a side-sloping 6000 × 3000 structure is the classic layout of a 3000 × 6000 one, rotated by 90°
  const reference = (dir: RoofDirection): ProjectState => {
    const p = plain('rear');
    if (dir === 'left' || dir === 'right') p.params = { ...p.params, length: 3000, width: 6000 };
    return p;
  };
  for (const dir of DIRS) {
    const base = buildModel(reference(dir));
    const m = buildModel(plain(dir));
    assert.equal(m.framing.members.length, base.framing.members.length, dir);
    assert.deepEqual(m.framing.roof, base.framing.roof, dir);
    assert.equal(m.statics.status, base.statics.status, dir);
    assert.equal(m.cutList.length, base.cutList.length, dir);
  }
});

test('the roof slopes down towards the chosen world wall', () => {
  for (const dir of DIRS) {
    const m = buildModel(project(dir));
    const bh = m.framing.members.find((x) => x.category === 'beam')!.section.height;
    const lowPosts = m.framing.members.filter((x) => x.category === 'post' && x.wallId === dir);
    const highPosts = m.framing.members.filter((x) => x.category === 'post' && x.wallId === worldWall(dir, 'front'));
    assert.ok(lowPosts.length >= 2 && highPosts.length >= 2, dir);
    for (const p of lowPosts) assert.equal(p.length, 2250 - bh, `${dir} low post`);
    for (const p of highPosts) assert.equal(p.length, 2600 - bh, `${dir} high post`);
    // posts stand on the correct world edge
    const edge = (w: WallId, p: { start: { x: number; z: number } }) =>
      w === 'front' ? p.start.z : w === 'rear' ? 3000 - p.start.z : w === 'left' ? p.start.x : 6000 - p.start.x;
    for (const p of lowPosts) assert.ok(near(edge(dir, p), 60), `${dir} low post on edge (${p.start.x}, ${p.start.z})`);
    // rafters run across the slope
    const rafter = m.framing.members.find((x) => x.category === 'rafter')!;
    const alongX = Math.abs(rafter.direction.x) > 0.5;
    assert.equal(alongX, dir === 'left' || dir === 'right', `${dir} rafter axis`);
    // labels name the world wall
    for (const p of lowPosts) assert.ok(p.name.includes(dir), `${dir}: ${p.name}`);
  }
});

test('an opening on the world front wall stays at its world position', () => {
  for (const dir of DIRS) {
    const m = buildModel(project(dir));
    const header = m.framing.members.find((x) => x.category === 'header' && x.wallId === 'front');
    assert.ok(header, `${dir} header`);
    const mid = { x: header.start.x + (header.direction.x * header.length) / 2, z: header.start.z + (header.direction.z * header.length) / 2 };
    assert.ok(near(mid.x, 500 + 450, 200), `${dir} header x=${mid.x}`);
    assert.ok(near(mid.z, 60, 120), `${dir} header z=${mid.z}`);
  }
});

test('world wall frames keep the world start-corner convention', () => {
  for (const dir of DIRS) {
    const frames = computeAllWallFrames(project(dir));
    assert.deepEqual(frames.front.origin, { x: 0, y: 0, z: 0 }, dir);
    assert.deepEqual(frames.front.u, { x: 1, y: 0, z: 0 }, dir);
    assert.deepEqual(frames.rear.origin, { x: 0, y: 0, z: 3000 }, dir);
    assert.deepEqual(frames.left.origin, { x: 0, y: 0, z: 0 }, dir);
    assert.deepEqual(frames.left.u, { x: 0, y: 0, z: 1 }, dir);
    assert.deepEqual(frames.right.origin, { x: 6000, y: 0, z: 0 }, dir);
    assert.equal(frames.front.length, 6000, dir);
    assert.equal(frames.left.length, 3000, dir);
    // post positions along u are sorted ascending after any mirroring
    for (const w of WALL_IDS) {
      const u = frames[w].postU;
      for (let i = 1; i < u.length; i++) assert.ok(u[i] > u[i - 1], `${dir} ${w} postU sorted`);
    }
    const w = frames.front.toWorld(1000, 500);
    assert.ok(near(w.x, 1000) && near(w.y, 500), `${dir} toWorld`);
  }
});

test('canonicalisation mirrors opening offsets exactly when a wall is flipped', () => {
  for (const dir of DIRS) {
    const c = canonicalizeProject(project(dir));
    const cw = canonicalWall(dir, 'front');
    const door = c.walls[cw].openings[0];
    assert.equal(door.x, wallFlipped(dir, 'front') ? 6000 - 500 - 900 : 500, dir);
  }
});

test('a vehicle centred under the roof is covered in every direction', () => {
  for (const dir of DIRS) {
    const m = buildModel(project(dir));
    assert.equal(m.vehicles[0].covered, true, dir);
  }
});

test('relabelSides swaps side words in both languages and keeps case', () => {
  assert.equal(relabelSides('Post front 1 / Pfosten vorne', 'left'), 'Post right 1 / Pfosten rechts');
  assert.equal(relabelSides('Purlin rear (Pfette hinten), left rail', 'front'), 'Purlin front (Pfette vorne), right rail');
  assert.equal(relabelSides('Post front', 'rear'), 'Post front');
});
