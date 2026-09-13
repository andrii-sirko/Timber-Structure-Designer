import assert from 'node:assert/strict';
import test from 'node:test';
import { canDeleteSelectedPartition } from './wallKeyboard.ts';

test('deletes a selected interior partition with Delete or Backspace', () => {
  assert.equal(canDeleteSelectedPartition('Delete', 'partition-1', null), true);
  assert.equal(canDeleteSelectedPartition('Backspace', 'partition-1', null), true);
});

test('does not delete when no partition is selected or an outer wall is selected', () => {
  assert.equal(canDeleteSelectedPartition('Delete', null, null), false);
  assert.equal(canDeleteSelectedPartition('Delete', 'front', null), false);
});

test('does not intercept keyboard deletion inside editable controls', () => {
  assert.equal(canDeleteSelectedPartition('Delete', 'partition-1', { tagName: 'INPUT' }), false);
  assert.equal(canDeleteSelectedPartition('Backspace', 'partition-1', { tagName: 'TEXTAREA' }), false);
  assert.equal(canDeleteSelectedPartition('Delete', 'partition-1', { isContentEditable: true }), false);
});
