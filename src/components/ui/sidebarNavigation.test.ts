import assert from 'node:assert/strict';
import test from 'node:test';
import { SIDEBAR_TABS } from './sidebarNavigation.ts';

test('sidebar navigation keeps the primary design tasks in a predictable order', () => {
  assert.deepEqual(
    SIDEBAR_TABS.map((tab) => tab.id),
    ['dimensions', 'roof', 'walls', 'structure', 'site'],
  );
});
