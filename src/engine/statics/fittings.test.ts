import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import type { ProjectState } from '@/types';
import { normalizeProject } from '../../store/defaults.ts';
import { hasTranslation } from '../../i18n/core.ts';
import { buildModel } from '../index.ts';

/**
 * The carport without knee braces: a closed OSB storage corner (right wall, front and rear
 * 0–1750 mm) with the rest of the rear wall as slat screen. It passes once the OSB is nailed at
 * 50 mm, the braced walls have hold-downs and the roof plane gets strap crosses – and those are
 * fitted, listed and priced, not just recommended.
 */
const raw = JSON.parse(readFileSync(new URL('../fixtures/carport-after.json', import.meta.url), 'utf8')).project;

function storageCarport(patch?: (p: ProjectState) => void): ProjectState {
  const p = structuredClone(raw) as ProjectState;
  p.params.braces = false;
  p.params.build.screenBattenSpacing = 550;
  p.params.build.roofStraps = true;
  p.walls.right = { ...p.walls.right, bracing: 'panels', holdDowns: true };
  p.walls.front = { ...p.walls.front, end: 1750, bracing: 'panels', panelNailSpacing: 50, holdDowns: true };
  p.walls.rear = { ...p.walls.rear, end: 1750, bracing: 'panels', panelNailSpacing: 50, holdDowns: true, screenPart: { start: 1750, end: 7430, cladding: { orientation: 'horizontal', boardWidth: 68, gap: 25 } } };
  patch?.(p);
  return normalizeProject(p);
}

test('fittings: the storage carport passes with OSB at 50 mm, hold-downs and roof straps', () => {
  const { statics } = buildModel(storageCarport());
  const bad = statics.checks.filter((c) => c.status !== 'ok');
  assert.deepEqual(bad.map((c) => `${c.id} ${c.status}`), []);
  const roof = statics.checks.find((c) => c.id === 'roof-diaphragm-z')!;
  assert.equal(roof.recommendation, undefined);
  assert.match(roof.detail, /Fitted: \d+ strap crosses/);
});

test('fittings: missing hold-downs or roof straps stay a requirement', () => {
  const noHoldDowns = buildModel(storageCarport((p) => (['front', 'rear', 'right'] as const).forEach((id) => delete p.walls[id].holdDowns))).statics;
  const x = noHoldDowns.checks.find((c) => c.id === 'bracing-x')!;
  assert.equal(x.status, 'warning');
  assert.match(x.recommendation ?? '', /hold-down/);
  const noStraps = buildModel(storageCarport((p) => (p.params.build.roofStraps = false))).statics;
  assert.equal(noStraps.checks.find((c) => c.id === 'roof-diaphragm-z')!.status, 'warning');
});

test('fittings: hold-downs and roof straps are listed in the connections', () => {
  const fitted = buildModel(storageCarport()).connections.hardware;
  const plain = buildModel(storageCarport((p) => (p.params.build.roofStraps = false))).connections.hardware;
  const holdDown = fitted.find((h) => h.id === 'hold-down');
  assert.ok(holdDown && holdDown.quantity >= 4, 'two per anchored braced wall');
  assert.match(holdDown.spec, /T_d ≥ \d+\.\d kN/);
  const strap = fitted.find((h) => h.id === 'wind-strap');
  assert.ok(strap && strap.quantity > 20, `roof straps: ${strap?.quantity} m`);
  assert.equal(plain.find((h) => h.id === 'wind-strap'), undefined, 'no straps without the roof crosses (the walls are OSB)');
});

test('fittings: new texts are translated', () => {
  const { statics, connections } = buildModel(storageCarport());
  const texts = [
    ...statics.checks.filter((c) => /^(bracing|roof-diaphragm)/.test(c.id)).map((c) => c.detail),
    ...connections.hardware.filter((h) => h.id === 'hold-down').flatMap((h) => [h.name, h.spec, h.note ?? '']),
  ];
  for (const lang of ['uk', 'de', 'pl'] as const) for (const text of texts) assert.ok(hasTranslation(text, lang), `${lang}: ${text.slice(0, 120)}`);
});
