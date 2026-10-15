import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import type { ProjectState, StaticsCheck } from '@/types';
import { normalizeProject } from '../../store/defaults.ts';
import { buildModel } from '../index.ts';
import { distributeLateral, panelNailCapacity, shearWallElement, type ShearWallElement } from './shearWalls.ts';

/**
 * The carport without knee braces: an OSB storage box (right wall, front and rear 0–1750 mm) and an
 * open slat screen over the rest of the rear wall. Hand check: H_d,z ≈ 21.6 kN on the right wall,
 * torsion ≈ ±13 kN on the 1.75 m storage walls (≈ 7.6 kN/m, hold-down ≈ 20 kN), roof shear ≈ 22 kN.
 */
const raw = JSON.parse(readFileSync(new URL('../fixtures/carport-after.json', import.meta.url), 'utf8')).project;

function carport(patch?: (p: ProjectState) => void): ProjectState {
  const p = structuredClone(raw) as ProjectState;
  p.params.braces = false;
  p.walls.rear = { ...p.walls.rear, end: 1750, screenPart: { start: 1750, end: 7430 }, bracing: 'panels' };
  p.walls.front = { ...p.walls.front, bracing: 'panels' };
  p.walls.right = { ...p.walls.right, bracing: 'panels' };
  patch?.(p);
  return normalizeProject(p);
}

const checksOf = (p: ProjectState) => buildModel(p).statics.checks;
const check = (checks: StaticsCheck[], id: string) => checks.find((c) => c.id === id)!;
/** A number following `label` in a detail text, e.g. num(detail, 'Wall front: F_d = ') */
const num = (text: string, label: string): number => {
  const i = text.indexOf(label);
  assert.ok(i >= 0, `"${label}" in: ${text}`);
  return Number.parseFloat(text.slice(i + label.length));
};
const near = (actual: number, expected: number, tol: number, what: string) => assert.ok(Math.abs(actual - expected) <= tol, `${what}: ${actual} ≈ ${expected} ± ${tol}`);

test('shear walls: the carport storage box carries the wind by position, not by count', () => {
  const checks = checksOf(carport());
  const z = check(checks, 'bracing-z');
  near(z.loadUls, 21.6, 1.5, 'H_d,z');
  near(num(z.detail, 'Wall right: F_d = '), z.loadUls, 0.05, 'the lone right wall takes all of H_d,z');
  const x = check(checks, 'bracing-x');
  // the torsion of the eccentric wind across is a couple on the two 1.75 m storage walls
  const front = num(x.detail, 'Wall front: F_d = ');
  near(front, 13, 2, 'torsion force on the front storage wall');
  near(num(x.detail, 'Wall rear: F_d = '), front, 0.05, 'equal and opposite on the rear');
  assert.match(x.detail, /torsion couple from the wind across \(Z\)/);
  near(num(x.detail, 'against v_d = '), 7.6, 1, 'v_d on 1.75 m');
  near(num(x.detail, 'Hold-down T_d = F_i·h/b_i − 0.9·G = '), 20, 2, 'hold-down tension');
  assert.match(x.recommendation ?? '', /hold-down/);
});

test('shear walls: OSB per EN 1995-1-1 9.2.4.2 – 2.8 × 60 ring nails, closer spacing gives more capacity', () => {
  const nail = panelNailCapacity(350, 0.9, 2);
  near(nail.Rk, 0.75, 0.1, 'F_f,Rk of a 2.8 × 60 ring nail through 15 mm OSB into C24');
  const at = (s: number) => check(checksOf(carport((p) => (p.walls.front.panelNailSpacing = p.walls.rear.panelNailSpacing = s))), 'bracing-x');
  const wide = at(75);
  const close = at(50);
  assert.equal(wide.status, 'fail', '75 mm nailing does not carry the torsion couple on 1.75 m');
  near(close.utilisation, (wide.utilisation * 50) / 75, 0.01, 'utilisation ∝ spacing');
  assert.match(wide.detail, /at 75 mm along the panel edges/);
});

test('shear walls: braced length = closed extent minus openings, narrow stretches do not count', () => {
  const params = carport().params;
  const full = shearWallElement('right', { id: 'right', closed: true, openings: [], bracing: 'panels' }, params)!;
  near(full.length, params.width / 1000, 1e-6, 'whole wall');
  const door = shearWallElement('right', { id: 'right', closed: true, bracing: 'panels', openings: [{ id: 'd', type: 'door', x: 1000, y: 0, width: 1000, height: 2000 }] }, params)!;
  assert.equal(door.segments.length, 2);
  assert.ok(door.length < full.length - 0.9, `${door.length} < ${full.length} − door`);
  const sliver = shearWallElement('right', { id: 'right', closed: true, bracing: 'panels', openings: [{ id: 'd', type: 'door', x: 300, y: 0, width: 5300, height: 2000 }] }, params)!;
  assert.equal(sliver.segments.length, 0, 'stretches narrower than h/4 are no shear wall');
  const part = shearWallElement('front', { id: 'front', closed: true, openings: [], bracing: 'panels', start: 0, end: 1750 }, params)!;
  near(part.length, 1.75, 1e-6, 'only the closed stretch');
});

test('shear walls: rigid diaphragm – centred load on symmetric walls has no torsion, one end wall twists', () => {
  const wall = (id: ShearWallElement['id'], axis: 'x' | 'z', pos: number, length: number): ShearWallElement => ({ id, axis, bracing: 'panels', pos, segments: [], length, height: 2400 });
  const sym = distributeLateral([wall('left', 'z', 0, 5), wall('right', 'z', 8000, 5)], [{ axis: 'z', H: 20, at: 4000 }]);
  near(sym.shares.left!.z!.total, 10, 1e-9, 'half each');
  near(sym.torsion.z!.Mt, 0, 1e-9, 'no torsion');
  const end = distributeLateral([wall('right', 'z', 8000, 5), wall('front', 'x', 0, 2), wall('rear', 'x', 6000, 2)], [{ axis: 'z', H: 20, at: 4000 }]);
  near(end.shares.right!.z!.total, 20, 1e-9, 'the end wall takes the whole load');
  near(end.shares.front!.z!.total, (20 * 4) / 6, 1e-9, 'torsion couple H·e / W on the perpendicular walls');
  near(end.shares.rear!.z!.total, (20 * 4) / 6, 1e-9, 'and on the opposite one');
  const lone = distributeLateral([wall('right', 'z', 8000, 5)], [{ axis: 'z', H: 20, at: 4000 }]);
  assert.ok(lone.torsion.z!.unresisted, 'one wall line alone cannot take a torsion moment');
});

test('shear walls: without walls across, a single braced wall line fails on torsion', () => {
  const checks = checksOf(carport((p) => (p.walls.front.bracing = p.walls.rear.bracing = undefined)));
  const z = check(checks, 'bracing-z');
  assert.equal(z.status, 'fail');
  assert.match(z.detail, /nothing takes the torsion/);
});

test('roof diaphragm: a trapezoidal sheet roof needs strap crosses when the walls stand at one end', () => {
  const checks = checksOf(carport());
  const roof = check(checks, 'roof-diaphragm-z');
  assert.ok(roof, 'roof bracing check');
  assert.equal(roof.status, 'warning', 'not part of the model: always a requirement');
  near(num(roof.detail, 'Shear at the wall line V_d = '), 22, 1.5, 'roof shear at the storage edge');
  const T = num(roof.detail, 'T_d = ');
  assert.ok(T > num(roof.detail, 'V_d = '), 'the diagonal carries more than the shear');
  assert.match(roof.recommendation ?? '', /2 per diagonal/);
  assert.ok(!checks.some((c) => c.id === 'roof-diaphragm-x'), 'front + rear are two wall lines: no cantilever along X');
  // an OSB deck under shingles is the diaphragm itself
  const deck = checksOf(carport((p) => (p.params.loads = { ...p.params.loads, roofCovering: 'bitumen-shingles' })));
  assert.ok(!deck.some((c) => c.id.startsWith('roof-diaphragm')));
  // a braced wall at the other end too: the roof spans between two lines
  const both = checksOf(carport((p) => (p.walls.left = { id: 'left', closed: true, openings: [], bracing: 'panels' })));
  assert.ok(!both.some((c) => c.id.startsWith('roof-diaphragm')));
});
