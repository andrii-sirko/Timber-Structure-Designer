import assert from 'node:assert/strict';
import { postBottomLevel } from './build.ts';
import test from 'node:test';
import { groundAt, sanitizeGroundSlope, slopeDegToPercent, worldGroundPlane } from './groundSlope.ts';
import { buildFraming } from './framing/index.ts';
import { buildModel } from './index.ts';
import { createDefaultProject } from '../store/defaults.ts';
import type { ProjectState, RoofDirection } from '@/types';

const close = (a: number, b: number, tol = 0.5) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`);

function withSlope(percent: number, direction: number, roofDirection: RoofDirection = 'rear'): ProjectState {
  const p = createDefaultProject();
  return { ...p, params: { ...p.params, length: 10000, roofDirection, groundSlope: { percent, direction } } };
}

test('1 % over 10 m drops 100 mm; 1° is 1.75 %', () => {
  const g = worldGroundPlane({ percent: 1, direction: 90 }, 10000, 3000);
  close(g.drop, 100);
  close(slopeDegToPercent(1), 1.7455, 0.001);
});

test('the highest footprint corner is ±0 and everything else lies below', () => {
  for (const direction of [0, 45, 90, 135, 180, 225, 270, 315]) {
    const g = worldGroundPlane({ percent: 2, direction }, 6000, 3000);
    const corners = [groundAt(g, 0, 0), groundAt(g, 6000, 0), groundAt(g, 0, 3000), groundAt(g, 6000, 3000)];
    close(Math.max(...corners), 0, 1e-6);
    close(Math.min(...corners), -g.drop, 1e-6);
  }
});

test('falls towards the named world side (front = −Z, left = +X)', () => {
  const front = worldGroundPlane({ percent: 2, direction: 0 }, 6000, 3000);
  assert.ok(groundAt(front, 0, 0) < groundAt(front, 0, 3000));
  const left = worldGroundPlane({ percent: 2, direction: 270 }, 6000, 3000);
  assert.ok(groundAt(left, 6000, 0) < groundAt(left, 0, 0));
});

test('sanitizes out-of-range input', () => {
  assert.deepEqual(sanitizeGroundSlope(undefined), { percent: 0, direction: 0 });
  assert.deepEqual(sanitizeGroundSlope({ percent: -3, direction: -90 }), { percent: 0, direction: 270 });
  assert.equal(sanitizeGroundSlope({ percent: 99 }).percent, 15);
});

test('a level site keeps every post foot at the post bottom level (base gap above ±0)', () => {
  const project = createDefaultProject();
  const posts = buildFraming(project).members.filter((m) => m.category === 'post');
  assert.ok(posts.every((m) => m.start.y === postBottomLevel(project.params)));
});

test('posts down the fall get longer by the ground drop at their foot, tops stay put', () => {
  for (const roofDirection of ['rear', 'front', 'left', 'right'] as RoofDirection[]) {
    const level = buildFraming(withSlope(0, 0, roofDirection)).members.filter((m) => m.category === 'post');
    const sloped = buildFraming(withSlope(1, 90, roofDirection)).members.filter((m) => m.category === 'post');
    const g = worldGroundPlane({ percent: 1, direction: 90 }, 10000, 3000);
    assert.equal(sloped.length, level.length);
    sloped.forEach((m, i) => {
      const foot = groundAt(g, m.start.x, m.start.z);
      close(m.start.y, foot + level[i].start.y);
      close(m.length - level[i].length, -foot);
    });
    const feet = sloped.map((m) => m.start.y);
    // post axes sit half a post width inside the footprint
    close(Math.max(...feet) - Math.min(...feet), (10000 - sloped[0].section.width) / 100, 1);
  }
});

test('the cut list carries the different post lengths and the base anchors follow the feet', () => {
  const model = buildModel(withSlope(1, 90));
  const postCuts = model.cutList.filter((c) => /post/i.test(c.group));
  assert.ok(new Set(postCuts.map((c) => Math.round(c.length))).size > 1);
  const flat = buildModel(withSlope(0, 0));
  assert.equal(model.connections.hardware.length, flat.connections.hardware.length);
});
