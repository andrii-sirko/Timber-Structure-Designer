import assert from 'node:assert/strict';
import test from 'node:test';
import { clampFreePost, freePostIdOf, freePostMemberId, freePostTop, generateFreePosts } from './freePosts.ts';
import { computePostGrid } from './framing/structure.ts';
import { computeRoofLines } from './framing/roofLines.ts';
import { buildFraming } from './framing/index.ts';
import { createDefaultProject, DEFAULT_PARAMS } from '../store/defaults.ts';

const params = structuredClone(DEFAULT_PARAMS);

test('free post member ids round-trip through the prefix', () => {
  assert.equal(freePostMemberId('abc'), 'free:abc');
  assert.equal(freePostIdOf('free:abc'), 'abc');
  assert.equal(freePostIdOf('front:2'), null);
});

test('clamps a free post axis under the roof (footprint + overhangs) by half a post width', () => {
  const o = params.overhangs;
  const half = params.timber.post.width / 2;
  assert.deepEqual(clampFreePost({ x: -5000, z: 90000 }, params), { x: -o.right + half, z: params.width + o.rear - half });
  assert.deepEqual(clampFreePost({ x: -5000, z: 90000 }, params, 'canonical'), { x: -o.left + half, z: params.width + o.rear - half });
  assert.deepEqual(clampFreePost({ x: 99999, z: -99999 }, params), { x: params.length + o.left - half, z: -o.front + half });
  assert.deepEqual(clampFreePost({ x: 2500, z: 1500 }, params), { x: 2500, z: 1500 });
});

test('a free post clear of the purlin rows reaches the rafter underside, cut to the slope', () => {
  const roof = computeRoofLines(params);
  const grid = computePostGrid(params, {}, roof);
  const top = freePostTop({ x: 2500, z: 1500 }, params, roof, grid);
  assert.equal(top.underPurlin, false);
  assert.equal(top.sloped, true);
  assert.ok(Math.abs(top.centreHeight - roof.bottomAt(1500)) < 1e-9);
});

test('a free post under a purlin row stops at the purlin underside with a square cut', () => {
  const roof = computeRoofLines(params);
  const grid = computePostGrid(params, {}, roof);
  const top = freePostTop({ x: 1500, z: roof.frontPurlinZ }, params, roof, grid);
  assert.equal(top.underPurlin, true);
  assert.equal(top.sloped, false);
  assert.equal(top.centreHeight, roof.purlinTopAt(roof.frontPurlinZ) - params.timber.beam.height);
});

test('generates one post member per free post', () => {
  const roof = computeRoofLines(params);
  const grid = computePostGrid(params, {}, roof);
  const members = generateFreePosts(params, roof, grid, [{ id: 'a', x: 2500, z: 1500 }]);
  assert.equal(members.length, 1);
  assert.equal(members[0].id, 'free:a');
  assert.equal(members[0].category, 'post');
  assert.deepEqual(members[0].start, { x: 2500, y: 0, z: 1500 });
});

test('free posts stay at their world position when the roof direction changes', () => {
  const project = { ...createDefaultProject(), freePosts: [{ id: 'a', x: 1000, z: 500 }] };
  for (const roofDirection of ['rear', 'front', 'left', 'right'] as const) {
    const framing = buildFraming({ ...project, params: { ...project.params, roofDirection } });
    const post = framing.members.find((m) => m.id === 'free:a');
    assert.ok(post, `free post missing for roof direction ${roofDirection}`);
    assert.ok(Math.abs(post.start.x - 1000) < 1e-6 && Math.abs(post.start.z - 500) < 1e-6, `moved for ${roofDirection}`);
  }
});
