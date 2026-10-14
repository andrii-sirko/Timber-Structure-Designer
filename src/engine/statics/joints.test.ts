import assert from 'node:assert/strict';
import test from 'node:test';
import { createDefaultProject } from '../../store/defaults.ts';
import { buildFraming } from '../index.ts';
import { computeStatics } from './index.ts';
import { screwLateral, screwWithdrawal } from './connections.ts';
import { bearingResistance } from './foundations.ts';
import { groundSnowLoad, siteSnowLoad } from './siteLoads.ts';
import { canopyLocalCoefficients } from './windZones.ts';
import type { LoadSettings, ProjectState, StructureParams } from '../../types/index.ts';

const near = (actual: number, expected: number, tol: number, what = '') => assert.ok(Math.abs(actual - expected) <= tol, `${what} ${actual} ≉ ${expected}`);

function project(overrides: Partial<StructureParams> = {}, loads: Partial<LoadSettings> = {}): ProjectState {
  const p = createDefaultProject();
  p.params = { ...p.params, ...overrides, loads: { ...p.params.loads, ...loads } };
  return p;
}

const statics = (p: ProjectState) => computeStatics(p, buildFraming(p));

test('ground snow load follows the NA zone formulas and their minimum values', () => {
  assert.equal(groundSnowLoad('1', 0), 0.65);
  assert.equal(groundSnowLoad('2', 100), 0.85);
  near(groundSnowLoad('2', 500), 0.25 + 1.91 * (640 / 760) ** 2, 1e-9);
  near(groundSnowLoad('2a', 500), 1.25 * groundSnowLoad('2', 500), 1e-9);
  near(groundSnowLoad('3', 800), 0.31 + 2.91 * (940 / 760) ** 2, 1e-9);
  const typed = createDefaultProject().params.loads;
  assert.equal(siteSnowLoad({ ...typed, snowZone: undefined, snowLoad: 1.23 }), 1.23);
  assert.equal(siteSnowLoad({ ...typed, snowLoad: 1.23, snowZone: '2', altitude: 500 }), groundSnowLoad('2', 500));
});

test('local canopy coefficients match a published interpolation at 7.59°', () => {
  // φ = 0, linear interpolation between the 5° and 10° rows of EN 1991-1-4 Table 7.6
  const z = canopyLocalCoefficients(7.59);
  near(z.interior.up, -1.307, 0.002, 'A up');
  near(z.interior.down, 1.007, 0.002, 'A down');
  near(z.edge.up, -1.955, 0.002, 'edge up = zone C'); // C −1.955 sucks harder than B −1.855
  near(z.edge.down, 2.255, 0.002, 'edge down = zone B');
});

test('screw withdrawal follows EN 1995-1-1 eq. 8.38 / 8.39', () => {
  // f_ax,k = 0.52 · 8^-0.5 · 100^-0.1 · 350^0.8 ≈ 12.5 N/mm²  →  × 8 × 100 ≈ 10.0 kN
  near(screwWithdrawal(8, 100, 350), 10_020, 60);
  near(screwWithdrawal(8, 100, 350, 0), screwWithdrawal(8, 100, 350) / 1.2, 1e-6); // end grain
  assert.equal(screwWithdrawal(8, 40, 350), 0); // thread shorter than 6d carries nothing
  const lateral = screwLateral(8, 80, 110, 350);
  assert.ok(lateral > 2000 && lateral < 5000, String(lateral));
});

test('footing bearing interpolates the DIN 1054 table', () => {
  assert.equal(bearingResistance('non-cohesive', 500), 280);
  near(bearingResistance('non-cohesive', 800), 340, 1e-9);
  assert.equal(bearingResistance('non-cohesive', 3000), 560);
  assert.ok(bearingResistance('cohesive-stiff', 800) < bearingResistance('cohesive-semi-firm', 800));
});

test('every structure gets joint checks, footings only when there is a footing', () => {
  const s = statics(project());
  for (const id of ['uplift-sheet', 'uplift-rafter', 'uplift-purlin', 'uplift-post', 'uplift-foundation', 'conn-brace-x', 'foundation-bearing']) assert.ok(s.checks.some((c) => c.id === id), id);
  const bare = statics(project({}, { postFootingDepth: 0 }));
  assert.ok(!bare.checks.some((c) => c.kind === 'foundation'));
});

test('a shallow footing is flagged as not frost-free and a small one as overloaded', () => {
  const shallow = statics(project({}, { postFootingDepth: 500, postFootingDiameter: 600 })).checks.find((c) => c.id === 'foundation-bearing')!;
  assert.notEqual(shallow.status, 'ok');
  assert.match(shallow.recommendation ?? '', /frost-free/);
  const big = statics(project({}, { postFootingDepth: 900, postFootingDiameter: 600 })).checks.find((c) => c.id === 'foundation-bearing')!;
  const soft = statics(project({}, { postFootingDepth: 900, postFootingDiameter: 600, soil: 'cohesive-stiff' })).checks.find((c) => c.id === 'foundation-bearing')!;
  assert.ok(soft.utilisation > big.utilisation);
});

test('the purlin–post connector sets the resistance of link 3; screws must reach the post', () => {
  const light = { roofCovering: 'polycarbonate' as const };
  const of = (purlinPostConnector: 'angle-brackets' | 'screws' | 'strap', beam = { width: 120, height: 200 }) => {
    const p = project({ timber: { ...createDefaultProject().params.timber, beam } }, light);
    p.params.build = { ...p.params.build, purlinPostConnector };
    return statics(p).checks.find((c) => c.id === 'uplift-purlin')!;
  };
  assert.match(of('angle-brackets').detail, /angle brackets/);
  assert.match(of('strap').detail, /Lochband/);
  assert.match(of('screws').detail, /8 × 300 mm from the purlin top/);
  // a 320 mm purlin leaves an 8 × 300 screw nothing to grip in the post
  assert.match(of('screws', { width: 120, height: 320 }).detail, /do not reach the post/);
});

test('two rafter anchors per bearing halve the utilisation of link 2', () => {
  const one = project();
  const two = project();
  two.params.build = { ...two.params.build, rafterAnchorsPerBearing: 2 };
  const u1 = statics(one).checks.find((c) => c.id === 'uplift-rafter')!;
  const u2 = statics(two).checks.find((c) => c.id === 'uplift-rafter')!;
  assert.ok(Math.abs(u2.utilisation - u1.utilisation / 2) < 1e-9);
});

test('edge-zone suction governs the rafter bearings and stronger wind pulls harder', () => {
  const calm = statics(project({}, { windLoad: 0.5 })).checks.find((c) => c.id === 'uplift-rafter')!;
  const storm = statics(project({}, { windLoad: 1.25 })).checks.find((c) => c.id === 'uplift-rafter')!;
  assert.ok(storm.loadUls > calm.loadUls);
  assert.match(calm.detail, /edge/);
});

test('every link of the chain names its load, resistance and utilisation', () => {
  for (const c of statics(project()).checks.filter((x) => x.kind === 'uplift')) {
    assert.match(c.detail, /%\)/, c.id);
    assert.ok(Number.isFinite(c.utilisation), c.id);
  }
});

test('exceptional snow adds an accidental combination that can govern light roofs', () => {
  // light roof, heavy snow: (g + 2.3·s) / k_mod,instant 1.1 beats (1.35·g + 1.5·s) / k_mod,medium 0.8
  const heavySnow = { snowLoad: 2.0, snowZone: undefined, exceptionalSnow: false, roofCovering: 'trapezoidal-sheet' as const };
  const normal = statics(project({}, heavySnow)).checks.find((c) => c.id === 'rafter')!;
  const plain = statics(project({}, { ...heavySnow, exceptionalSnow: true }));
  const exceptional = plain.checks.find((c) => c.id === 'rafter')!;
  assert.ok(exceptional.stressUtil > normal.stressUtil, `${exceptional.stressUtil} > ${normal.stressUtil}`);
  assert.match(exceptional.detail, /G \+ S_Ad/);
  assert.match(plain.checks.find((c) => c.id === 'post-front')!.detail, /Exceptional snow/);
  near(plain.loads.exceptionalSnow!, 2.3 * 2.0, 1e-9);
});

test('the overall status is the worst of every row, joints and footings included', () => {
  for (const p of [project(), project({ connectionMode: 'traditional' }, { roofCovering: 'polycarbonate' })]) {
    const s = statics(p);
    const worst = s.checks.some((c) => c.status === 'fail') ? 'fail' : s.checks.some((c) => c.status === 'warning') ? 'warning' : 'ok';
    assert.equal(s.status, worst);
  }
});
