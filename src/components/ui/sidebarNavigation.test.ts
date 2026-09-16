import assert from 'node:assert/strict';
import test from 'node:test';
import { focusContains, focusFallbacks, settingsTargetFor, SIDEBAR_TABS } from './sidebarNavigation.ts';

test('sidebar navigation keeps the primary design tasks in a predictable order', () => {
  assert.deepEqual(
    SIDEBAR_TABS.map((tab) => tab.id),
    ['dimensions', 'roof', 'walls', 'structure', 'site'],
  );
});

test('double-clicked objects open the sidebar tab and section holding their settings', () => {
  assert.deepEqual(settingsTargetFor({ kind: 'vehicle', id: 'v1' }), { tab: 'site', focus: 'vehicles/v1' });
  assert.deepEqual(settingsTargetFor({ kind: 'pavedArea', id: 'p1' }), { tab: 'site', focus: 'paving/p1' });
  assert.deepEqual(settingsTargetFor({ kind: 'opening', id: 'o1' }), { tab: 'walls', focus: 'walls/o1' });
  assert.deepEqual(settingsTargetFor({ kind: 'panel', panelKind: 'roof' }), { tab: 'roof', focus: 'roof' });
  assert.deepEqual(settingsTargetFor({ kind: 'panel', panelKind: 'cladding', wallKey: 'front' }), { tab: 'walls', focus: 'walls' });
  assert.deepEqual(settingsTargetFor({ kind: 'member', category: 'rafter' }), { tab: 'roof', focus: 'roof' });
  assert.deepEqual(settingsTargetFor({ kind: 'member', category: 'post', freePostId: 'fp1' }), { tab: 'dimensions', focus: 'posts/fp1' });
  assert.deepEqual(settingsTargetFor({ kind: 'member', category: 'post' }), { tab: 'dimensions', focus: 'posts' });
  assert.deepEqual(settingsTargetFor({ kind: 'member', category: 'stud', wallKey: 'left' }), { tab: 'walls', focus: 'walls' });
  assert.deepEqual(settingsTargetFor({ kind: 'member', category: 'brace' }), { tab: 'structure', focus: 'framing' });
  assert.deepEqual(settingsTargetFor({ kind: 'member', category: 'joist' }), { tab: 'structure', focus: 'floor' });
  assert.deepEqual(settingsTargetFor({ kind: 'panel', panelKind: 'floor' }), { tab: 'structure', focus: 'floor' });
});

test('a focus path opens its enclosing section but not unrelated ones', () => {
  assert.equal(focusContains('vehicles', 'vehicles/v1'), true);
  assert.equal(focusContains('vehicles/v1', 'vehicles/v1'), true);
  assert.equal(focusContains('vehicles', 'vehicles'), true);
  assert.equal(focusContains('vehicle', 'vehicles/v1'), false);
  assert.equal(focusContains('paving', 'vehicles/v1'), false);
});

test('focus falls back to the enclosing section when the object card is not rendered', () => {
  assert.deepEqual(focusFallbacks('walls/o1'), ['walls/o1', 'walls']);
  assert.deepEqual(focusFallbacks('roof'), ['roof']);
});
