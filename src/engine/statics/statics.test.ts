import assert from 'node:assert/strict';
import test from 'node:test';
import { createDefaultProject } from '../../store/defaults.ts';
import { buildFraming } from '../index.ts';
import { autoFixStatics } from './autofix.ts';
import { bracedPurlinSpan, computeStatics, freePostTributary } from './index.ts';
import { gustSpeedToPressure, pressureToGustSpeed } from './materials.ts';
import type { ProjectState, StaticsCheck, StructureParams } from '../../types/index.ts';

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

test('pinned post bases: knee braces carry the wind along the rows, nothing holds the frame across', () => {
  const s = statics(project());
  const x = s.checks.find((c) => c.id === 'bracing-x')!;
  const z = s.checks.find((c) => c.id === 'bracing-z')!;
  assert.ok(x.element.startsWith('Knee braces'));
  assert.ok(z.element.startsWith('No bracing'));
  assert.equal(z.status, 'fail');
  assert.match(z.detail, /pinned/);
  assert.ok(s.checks.some((c) => c.id === 'brace-post-x'), 'the brace bending of the posts is checked');
  const off = statics(project({ braces: false }));
  assert.ok(off.checks.find((c) => c.id === 'bracing-x')!.element.startsWith('No bracing'));
  // knee braces shorten the in-row buckling length
  const inRow = (c: StaticsCheck) => Number(/in row (\d+)/.exec(c.detail)![1]);
  assert.ok(inRow(byId(project({ braces: false }), 'post-front')) > inRow(byId(project(), 'post-front')));
});

test('a rail on an open side carries knee braces across the rows', () => {
  const p = project();
  p.walls.left = { ...p.walls.left, rail: true };
  p.walls.right = { ...p.walls.right, rail: true };
  const z = byId(p, 'bracing-z');
  assert.ok(z.element.startsWith('Knee braces'), z.element);
  assert.ok(buildFraming(p).members.some((m) => m.group.startsWith('Side rail')));
});

test('board cladding alone is no shear wall; crossed straps make it one', () => {
  // without knee braces (a closed wall's rail would carry them across)
  const boards = byId(project({ braces: false }, { left: true }), 'bracing-z');
  assert.ok(boards.element.startsWith('No bracing'));
  assert.match(boards.detail, /not a shear wall/);
  const p = project({ braces: false }, { left: true });
  p.walls.left = { ...p.walls.left, bracing: 'strap' };
  const strapped = byId(p, 'bracing-z');
  assert.ok(strapped.element.startsWith('Braced wall'));
  assert.match(strapped.detail, /Windrispenband/);
});

test('wind pressure scales the lateral checks and a hurricane fails the structure', () => {
  const calm = statics(project({ loads: { ...createDefaultProject().params.loads, windLoad: 0 } }));
  const storm = statics(project({ loads: { ...createDefaultProject().params.loads, windLoad: gustSpeedToPressure(220) } }));
  assert.ok(storm.checks.find((c) => c.id === 'bracing-x')!.utilisation > calm.checks.find((c) => c.id === 'bracing-x')!.utilisation);
  assert.equal(storm.status, 'fail');
  assert.ok(storm.loads.windPressure > 30); // ½·1.25·220² ≈ 30 kN/m²
});

test('collapse gust speed is where the first check reaches 100 %', () => {
  // closed side wall: the default carport has no bracing across (Z)
  const s = statics(project({}, { left: true }));
  assert.ok(s.collapseGustSpeed !== undefined && s.collapseGustSpeed > 20 && s.collapseGustSpeed < 150, String(s.collapseGustSpeed));
  const at = statics(project({ loads: { ...createDefaultProject().params.loads, windLoad: gustSpeedToPressure(s.collapseGustSpeed! + 1) } }, { left: true }));
  // joints and footings are sized afterwards and stay out of the collapse search
  const member = (c: StaticsCheck) => c.kind !== 'uplift' && c.kind !== 'connection' && c.kind !== 'foundation';
  assert.ok(at.checks.some((c) => member(c) && c.utilisation >= 1));
  const below = statics(project({ loads: { ...createDefaultProject().params.loads, windLoad: gustSpeedToPressure(s.collapseGustSpeed! - 1) } }, { left: true }));
  assert.ok(below.checks.every((c) => !member(c) || c.utilisation < 1));
});

test('uplift is checked link by link from the sheet to the concrete', () => {
  const s = statics(project());
  const ids = s.checks.filter((c) => c.kind === 'uplift').map((c) => c.id);
  assert.deepEqual(ids, ['uplift-sheet', 'uplift-rafter', 'uplift-purlin', 'uplift-post', 'uplift-foundation']);
});

test('light roofs pull on the purlin–post joint, heavy ones keep it in compression', () => {
  const light = byId(project({ loads: { ...createDefaultProject().params.loads, roofCovering: 'polycarbonate' } }), 'uplift-purlin');
  const heavy = byId(project({ loads: { ...createDefaultProject().params.loads, roofCovering: 'roof-tiles' } }), 'uplift-purlin');
  assert.ok(light.loadUls > 0);
  assert.equal(heavy.loadUls, 0);
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

// Default carport: purlin rows at z = 60 / 2940 with posts at x = 60, 3000, 5940; rafters every 790 mm, one at x = 3000.
function withFreePosts(...points: [number, number][]): ProjectState {
  const p = project({ braces: false }); // no knee brace credit: spans are the raw post distances
  p.freePosts = points.map(([x, z], i) => ({ id: `f${i}`, x, z }));
  return p;
}

test('free posts under a purlin shorten its span and carry part of it', () => {
  const bare = byId(project({ braces: false }), 'purlin-front');
  const p = withFreePosts([1530, 60], [4470, 60]);
  const s = statics(p);
  const purlin = s.checks.find((c) => c.id === 'purlin-front')!;
  assert.equal(bare.span, 2940);
  assert.equal(purlin.span, 1470);
  assert.ok(purlin.utilisation < bare.utilisation);
  const post = s.checks.find((c) => c.id === 'post-free-f0')!;
  assert.equal(post.element, 'Free post 1');
  assert.ok(post.loadUls > 0);
  assert.match(post.detail, /carries 1\.84 m of purlin/); // 0.625 × (1470 + 1470)
  // the rear purlin is untouched
  assert.equal(s.checks.find((c) => c.id === 'purlin-rear')!.span, 2940);
});

test('a free post under a rafter is checked for the rafter reaction', () => {
  const s = statics(withFreePosts([3000, 1500]));
  const post = s.checks.find((c) => c.id === 'post-free-f0')!;
  assert.ok(post.loadUls > 0);
  assert.match(post.detail, /carries 1\.42 m² of roof/); // 0.79 m × 0.625 × (1440 + 1440)
});

test('a free post between two rafters carries nothing and is flagged', () => {
  const s = statics(withFreePosts([3400, 1500]));
  assert.equal(s.checks.find((c) => c.id === 'post-free-f0'), undefined);
  const flag = s.checks.find((c) => c.id === 'free-post-f0')!;
  assert.equal(flag.status, 'warning');
  assert.match(flag.detail, /nearest rafter axis \d+ mm away/);
});

test('freePostTributary: continuous-beam share inside, full overhang at the ends', () => {
  assert.equal(freePostTributary(1000, [0, 1000, 3000], -500, 3500), 0.625 * 1000 + 0.625 * 2000);
  assert.equal(freePostTributary(3000, [0, 3000], -500, 3500), 0.625 * 3000 + 500);
});

test('post bases are pinned: H anchors take the uplift with their bolts, adjustable bases need an ETA', () => {
  const light = { ...createDefaultProject().params.loads, roofCovering: 'polycarbonate' as const };
  const h = byId(project({ loads: { ...light, postBase: 'h-anchor' } }), 'uplift-post');
  assert.match(h.detail, /M12 bolts/);
  const adjustable = byId(project({ loads: { ...light, postBase: 'adjustable' } }), 'uplift-post');
  if (adjustable.loadUls > 0) assert.equal(adjustable.status, 'warning');
  // the bracing does not depend on the base: both leave the unbraced direction as a mechanism
  for (const postBase of ['h-anchor', 'adjustable'] as const) assert.equal(byId(project({ loads: { ...light, postBase } }), 'bracing-z').status, 'fail');
});

test('H post anchors need a foundation deep enough to cast them in', () => {
  const shallow = byId(project({ loads: { ...createDefaultProject().params.loads, postBase: 'h-anchor', postFootingDepth: 300 } }), 'uplift-foundation');
  assert.equal(shallow.status, 'fail');
  assert.match(shallow.recommendation ?? '', /at least 450 mm deep/);
});
