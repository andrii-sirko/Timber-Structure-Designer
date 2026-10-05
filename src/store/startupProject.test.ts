import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStartupProject } from './defaults.ts';
import { buildModel } from '../engine/index.ts';

test('startup project keeps its custom carport layout through normalisation', () => {
  const p = createStartupProject();
  assert.equal(p.params.length, 8750);
  assert.equal(p.params.width, 5800);
  assert.equal(p.params.roofScheme, 'sloped-purlins');
  assert.deepEqual(p.params.midPurlinPositions, [3770, 7010]);
  assert.deepEqual(p.params.lockedSections, ['post']);
  assert.equal(p.walls.rear.end, 7430);
  assert.equal(p.vehicles.length, 9);
  assert.ok(p.vehicles.every((v) => v.modelId !== 'vw-golf'));
  assert.equal(Object.keys(p.postOverrides).length, 5);
  assert.ok(buildModel(p).cutList.length > 0);
});
