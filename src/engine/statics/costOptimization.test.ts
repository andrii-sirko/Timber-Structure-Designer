import assert from 'node:assert/strict';
import test from 'node:test';
import { findSmallestValidSection } from './costOptimizationHelpers.ts';
import { autoFixStatics, costOptimizeStatics } from '@/engine';
import { createDefaultProject } from '@/store/defaults';

interface Section {
  width: number;
  height: number;
}

test('finds the smallest lower section that still passes the statics predicate', () => {
  const result = findSmallestValidSection<Section>(
    { width: 80, height: 280 },
    [80, 100, 120, 140, 160, 180, 200, 220, 240, 260, 280],
    (section) => section.height >= 200,
  );

  assert.deepEqual(result, { width: 80, height: 200 });
});

test('keeps the current section when no smaller section passes', () => {
  const current = { width: 80, height: 120 };
  const result = findSmallestValidSection<Section>(
    current,
    [80, 100, 120],
    () => false,
  );

  assert.deepEqual(result, current);
});

test('cost optimization keeps a locked post section and still shrinks the unlocked ones', () => {
  const project = createDefaultProject();
  project.params.timber = { ...project.params.timber, post: { width: 200, height: 200 }, rafter: { width: 80, height: 280 } };

  const free = costOptimizeStatics(project);
  assert.equal(free.status, 'ok');
  assert.ok(free.params.timber.post.width < 200);

  const pinned = costOptimizeStatics({ ...project, params: { ...project.params, lockedSections: ['post'] } });
  assert.equal(pinned.status, 'ok');
  assert.deepEqual(pinned.params.timber.post, { width: 200, height: 200 });
  assert.ok(pinned.params.timber.rafter.height < 280);
});

test('auto-fix leaves a locked post section alone', () => {
  const project = createDefaultProject();
  project.params.timber = { ...project.params.timber, post: { width: 80, height: 80 } };
  project.params.lockedSections = ['post'];
  project.params.loads = { ...project.params.loads, snowLoad: 2.5, windLoad: 1.2 };

  assert.deepEqual(autoFixStatics(project).params.timber.post, { width: 80, height: 80 });
});
