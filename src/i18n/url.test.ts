import { test } from 'node:test';
import assert from 'node:assert/strict';
import { langFromPath, pathWithLang } from './core';

test('langFromPath reads the first path segment', () => {
  assert.equal(langFromPath('/de'), 'de');
  assert.equal(langFromPath('/PL/'), 'pl');
  assert.equal(langFromPath('/ua'), 'uk');
  assert.equal(langFromPath('/uk/x'), 'uk');
  assert.equal(langFromPath('/'), undefined);
  assert.equal(langFromPath('/fr'), undefined);
});

test('pathWithLang replaces or prepends the language segment', () => {
  assert.equal(pathWithLang('/', 'de'), '/de');
  assert.equal(pathWithLang('/de', 'pl'), '/pl');
  assert.equal(pathWithLang('/ua/', 'en'), '/en');
  assert.equal(pathWithLang('/de/x', 'uk'), '/uk/x');
});
