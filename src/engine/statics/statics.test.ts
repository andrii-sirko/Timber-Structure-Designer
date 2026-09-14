import assert from 'node:assert/strict';
import test from 'node:test';
import { createDefaultProject } from '../../store/defaults.ts';
import { buildFraming } from '../index.ts';
import { autoFixStatics } from './autofix.ts';
import { bracedPurlinSpan, computeStatics } from './index.ts';
import { gustSpeedToPressure, pressureToGustSpeed } from './materials.ts';
import type { ProjectState, StructureParams } from '../../types/index.ts';

function project(overrides: Partial<StructureParams> = {}, walls: Partial<Record<'front' | 'rear' | 'left' | 'right', boolean>> = {}): ProjectState {
  const p = createDefaultProject();
  p.params = { ...p.params, ...overrides, loads: { ...p.params.loads, ...(overrides.loads ?? {}) } };
  for (const [id, closed] of Object.entries(walls)) p.walls[id as 'front'].closed = closed;
  return p;
}

function statics(p: ProjectState) {
  return computeStatics(p, buildFraming(p));
}

const byId = (p: ProjectState, id: string) => statics(p).checks.find((c) => c.id === id)!;

test('knee braces shorten the governing purlin span', () => {
  const braced = byId(project({ braces: true, braceLeg: 600 }), 'purlin-front');
  const bare = byId(project({ braces: false }), 'purlin-front');
  assert.ok(braced.span < bare.span, `${braced.span} < ${bare.span}`);
  assert.equal(bare.span - braced.span, 600); // half of each of the two 600 mm legs
  assert.ok(braced.utilisation < bare.utilisation);
});

test('bracedPurlinSpan credits only braces leaning into the bay', () => {
  const r = bracedPurlinSpan([0, 3000, 6000], [{ postIndex: 0, side: 1 }, { postIndex: 1, side: -1 }], 600);
  assert.deepEqual(r, { span: 3000, braces: 0, rawSpan: 3000 }); // bay 1–2 has no braces, so it governs
  const both = bracedPurlinSpan([0, 3000], [{ postIndex: 0, side: 1 }, { postIndex: 1, side: -1 }], 600);
  assert.deepEqual(both, { span: 2400, braces: 2, rawSpan: 3000 });
});

test('knee braces provide the lateral system along the purlin rows, posts sway across', () => {
  const s = statics(project());
  const x = s.checks.find((c) => c.id === 'bracing-x')!;
  const z = s.checks.find((c) => c.id === 'bracing-z')!;
  assert.ok(x.element.startsWith('Knee braces'));
  assert.ok(z.element.startsWith('Sway posts'));
  assert.ok(x.utilisation > 0 && z.utilisation > 0);
  const off = statics(project({ braces: false }));
  assert.ok(off.checks.find((c) => c.id === 'bracing-x')!.element.startsWith('Sway posts'));
  // with the transverse direction held by a boarded wall, knee braces shorten the in-row buckling length
  const postBraced = byId(project({}, { left: true }), 'post-front');
  const postFree = byId(project({ braces: false }, { left: true }), 'post-front');
  assert.ok(postFree.span > postBraced.span);
  assert.ok(postFree.utilisation > postBraced.utilisation);
});

test('a closed wall in the plane acts as a shear wall', () => {
  const z = byId(project({}, { left: true }), 'bracing-z');
  assert.ok(z.element.startsWith('Boarded wall'));
  assert.equal(z.status, 'ok');
});

test('wind pressure scales the lateral checks and a hurricane fails the structure', () => {
  const calm = statics(project({ loads: { ...createDefaultProject().params.loads, windLoad: 0 } }));
  const storm = statics(project({ loads: { ...createDefaultProject().params.loads, windLoad: gustSpeedToPressure(220) } }));
  assert.ok(storm.checks.find((c) => c.id === 'bracing-x')!.utilisation > calm.checks.find((c) => c.id === 'bracing-x')!.utilisation);
  assert.equal(storm.status, 'fail');
  assert.ok(storm.loads.windPressure > 30); // ½·1.25·220² ≈ 30 kN/m²
});

test('collapse gust speed is where the first check reaches 100 %', () => {
  const s = statics(project());
  assert.ok(s.collapseGustSpeed !== undefined && s.collapseGustSpeed > 20 && s.collapseGustSpeed < 150, String(s.collapseGustSpeed));
  const at = statics(project({ loads: { ...createDefaultProject().params.loads, windLoad: gustSpeedToPressure(s.collapseGustSpeed! + 1) } }));
  assert.ok(at.checks.some((c) => c.kind !== 'uplift' && c.utilisation >= 1));
  const below = statics(project({ loads: { ...createDefaultProject().params.loads, windLoad: gustSpeedToPressure(s.collapseGustSpeed! - 1) } }));
  assert.ok(below.checks.every((c) => c.kind === 'uplift' || c.utilisation < 1));
});

test('uplift is an advisory: it never drives the overall status', () => {
  const s = statics(project());
  assert.equal(s.checks.find((c) => c.id === 'uplift')!.status, 'warning');
  assert.equal(s.status, 'ok');
});

test('light roofs report net uplift that needs tension anchors', () => {
  const light = byId(project({ loads: { ...createDefaultProject().params.loads, roofCovering: 'polycarbonate' } }), 'uplift');
  const heavy = byId(project({ loads: { ...createDefaultProject().params.loads, roofCovering: 'roof-tiles' } }), 'uplift');
  assert.equal(light.status, 'warning');
  assert.match(light.recommendation ?? '', /tension/);
  assert.equal(heavy.status, 'ok');
});

test('gust speed ↔ pressure round-trips', () => {
  assert.ok(Math.abs(pressureToGustSpeed(gustSpeedToPressure(36)) - 36) < 1e-9);
  assert.ok(Math.abs(gustSpeedToPressure(32.2) - 0.65) < 0.01);
});

test('auto-fix can resolve a failing knee brace check', () => {
  const p = project(
    {
      braceLeg: 1000,
      connectionMode: 'traditional',
      timber: { ...createDefaultProject().params.timber, brace: { width: 40, height: 60 } },
      loads: { ...createDefaultProject().params.loads, windLoad: 2.0 },
    },
    { left: true },
  );
  const before = statics(p);
  assert.notEqual(before.checks.find((c) => c.id === 'bracing-x')!.status, 'ok');
  const fixed = autoFixStatics(p);
  assert.equal(fixed.status, 'ok', fixed.unresolved.join(', '));
  assert.ok(fixed.changes.some((c) => c.label.startsWith('Knee braces')));
});
