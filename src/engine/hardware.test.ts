import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import type { DerivedModel, ProjectState, RoofDirection, Vec3 } from '@/types';
import { WALL_IDS } from '@/types';
import { normalizeProject } from '../store/defaults.ts';
import { buildModel } from './index.ts';
import { wallStraps } from './framing/straps.ts';
import { plateBottomLevel } from './build.ts';

/**
 * The hardware layout the 3D view draws must match what the statics size and the connections list:
 * as many straps, hold-downs, brackets and rafter anchors as are counted, in the right places.
 */
const load = (name: string) => JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8')).project as ProjectState;

/** The carport without knee braces: OSB storage corner, slat screen, hold-downs and roof straps (see statics/fittings.test.ts). */
function storageCarport(patch?: (p: ProjectState) => void): ProjectState {
  const p = structuredClone(load('carport-after'));
  p.params.braces = false;
  p.params.build.screenBattenSpacing = 550;
  p.params.build.roofStraps = true;
  p.walls.right = { ...p.walls.right, bracing: 'panels', holdDowns: true };
  p.walls.front = { ...p.walls.front, end: 1750, bracing: 'panels', panelNailSpacing: 50, holdDowns: true };
  p.walls.rear = { ...p.walls.rear, end: 1750, bracing: 'panels', panelNailSpacing: 50, holdDowns: true, screenPart: { start: 1750, end: 7430, cladding: { orientation: 'horizontal', boardWidth: 68, gap: 25 } } };
  patch?.(p);
  return normalizeProject(p);
}

const quantity = (model: DerivedModel, id: string): number => model.connections.hardware.find((h) => h.id === id)?.quantity ?? 0;
const inPlan = (p: Vec3, project: ProjectState, margin = 1) =>
  p.x >= -margin && p.x <= project.params.length + margin && p.z >= -margin && p.z <= project.params.width + margin;

test('hardware: roof strap crosses as many as the statics fit, on the rafter tops between the outer posts', () => {
  const project = storageCarport();
  const model = buildModel(project);
  const fitting = model.statics.checks.flatMap((c) => c.fittings ?? []).find((f) => f.kind === 'roof-straps');
  assert.ok(fitting && fitting.kind === 'roof-straps');
  assert.equal(fitting.bays.length * 2, fitting.diagonals);
  const roofStraps = model.hardware.straps.filter((s) => s.plane === 'roof');
  assert.equal(roofStraps.length, fitting.diagonals * fitting.strapsPerDiagonal);
  const rafters = model.framing.members.filter((m) => m.category === 'rafter');
  for (const s of roofStraps) {
    assert.ok(inPlan(s.a, project, 60) && inPlan(s.b, project, 60), 'inside the footprint');
    assert.ok(s.normal.y > 0.9, 'lies on the roof plane');
    // above the rafters, below the covering
    for (const p of [s.a, s.b]) assert.ok(p.y > Math.min(...rafters.map((r) => r.start.y)), 'above the rafters');
  }
  // the diagonals reach over the whole depth of the roof
  const zs = roofStraps.flatMap((s) => [s.a.z, s.b.z]);
  assert.ok(Math.max(...zs) - Math.min(...zs) > project.params.width - 400);
  // without the build setting there is nothing to draw
  assert.equal(buildModel(storageCarport((p) => (p.params.build.roofStraps = false))).hardware.straps.filter((s) => s.plane === 'roof').length, 0);
});

test('hardware: one hold-down at each end of every braced stretch, at the foot of an end stud', () => {
  const project = storageCarport();
  const model = buildModel(project);
  assert.equal(model.hardware.holdDowns.length, quantity(model, 'hold-down'));
  // storage corner: right wall, front and rear 0–1750 – one stretch each
  assert.equal(model.hardware.holdDowns.length, 6);
  const studs = new Map(model.framing.members.filter((m) => m.category === 'stud').map((m) => [m.id, m]));
  for (const h of model.hardware.holdDowns) {
    assert.equal(h.position.y, plateBottomLevel(project.params));
    assert.equal(h.hostIds.length, 1);
    const stud = studs.get(h.hostIds[0]);
    assert.ok(stud, 'fixed to a stud');
    assert.ok(Math.hypot(stud.start.x - h.position.x, stud.start.z - h.position.z) < project.params.timber.stud.height, 'on that stud');
    assert.ok(Math.abs(h.inward.y) < 1e-9 && Math.abs(Math.hypot(h.inward.x, h.inward.z) - 1) < 1e-9);
  }
  assert.equal(buildModel(storageCarport((p) => (['front', 'rear', 'right'] as const).forEach((id) => delete p.walls[id].holdDowns))).hardware.holdDowns.length, 0);
});

test('hardware: purlin brackets and rafter anchors as counted in the connections', () => {
  const model = buildModel(storageCarport());
  assert.ok(model.hardware.brackets.length > 0);
  assert.equal(model.hardware.brackets.length, quantity(model, 'bracket'));
  assert.equal(model.hardware.rafterAnchors.length, quantity(model, 'rafter-anchor'));
  const purlins = new Map(model.framing.members.filter((m) => m.group.startsWith('Purlin')).map((m) => [m.id, m]));
  for (const b of model.hardware.brackets) {
    const purlin = purlins.get(b.hostIds[0]);
    assert.ok(purlin, 'fixed to a purlin');
    // purlin underside plumb above the bracket corner (purlins may follow the slope)
    const horiz = Math.hypot(purlin.direction.x, purlin.direction.z);
    const t = ((b.position.x - purlin.start.x) * purlin.direction.x + (b.position.z - purlin.start.z) * purlin.direction.z) / horiz ** 2;
    const underside = purlin.start.y + purlin.direction.y * t - purlin.section.height / 2 / purlin.up.y;
    assert.ok(Math.abs(underside - b.position.y) < 1, 'under the purlin');
  }
  // one per bearing alternating left / right, or one on each flank
  const one = buildModel(storageCarport((p) => (p.params.build.rafterAnchorsPerBearing = 1)));
  const two = buildModel(storageCarport((p) => (p.params.build.rafterAnchorsPerBearing = 2)));
  assert.equal(one.hardware.rafterAnchors.length, quantity(one, 'rafter-anchor'));
  assert.equal(two.hardware.rafterAnchors.length, quantity(two, 'rafter-anchor'));
  assert.equal(two.hardware.rafterAnchors.length, 2 * one.hardware.rafterAnchors.length);
  const [first, ...rest] = one.hardware.rafterAnchors;
  assert.ok(rest.some((r) => r.flank.x * first.flank.x + r.flank.z * first.flank.z < -0.5), 'alternating flanks');
  // other connectors are not drawn as brackets
  assert.equal(buildModel(storageCarport((p) => (p.params.build.purlinPostConnector = 'screws'))).hardware.brackets.length, 0);
  assert.equal(buildModel(storageCarport((p) => (p.params.connectionMode = 'traditional'))).hardware.rafterAnchors.length, 0);
});

test('hardware: roof trims along the edges of the covering, as long as listed', () => {
  const model = buildModel(storageCarport());
  const roof = model.framing.panels.find((p) => p.kind === 'roof')!;
  const [a, b] = roof.size!;
  const length = (t: { start: Vec3; end: Vec3 }) => Math.hypot(t.end.x - t.start.x, t.end.y - t.start.y, t.end.z - t.start.z);
  const kinds = model.hardware.trims.map((t) => t.kind).sort();
  assert.deepEqual(kinds, ['eave', 'top', 'verge', 'verge']);
  for (const t of model.hardware.trims) assert.ok(Math.abs(length(t) - (t.kind === 'verge' ? b : a)) < 1, t.kind);
  const eave = model.hardware.trims.find((t) => t.kind === 'eave')!;
  const top = model.hardware.trims.find((t) => t.kind === 'top')!;
  assert.ok(eave.start.y < top.start.y, 'the eave is the low edge');
});

test('hardware: a footing under every post, the curb under the closed walls', () => {
  const carport = buildModel(storageCarport());
  assert.equal(carport.hardware.footings.length, carport.framing.members.filter((m) => m.category === 'post').length);
  assert.equal(carport.hardware.curbs.length, 0);
  for (const f of carport.hardware.footings) assert.ok(f.height > 0 && f.size > 0);
  const shedProject = normalizeProject(load('garden-shed-after'));
  const shed = buildModel(shedProject);
  const closed = WALL_IDS.filter((id) => shedProject.walls[id].closed);
  assert.equal(shed.hardware.curbs.length, closed.length);
  for (const c of shed.hardware.curbs) assert.equal(c.top.y, shedProject.params.build.curbTop);
});

test('hardware: wall strap crosses on the outer stud faces of strap-braced walls', () => {
  const project = normalizeProject(load('garden-shed-after'));
  const model = buildModel(project);
  const strapWalls = WALL_IDS.filter((id) => project.walls[id].closed && project.walls[id].bracing === 'strap');
  assert.ok(strapWalls.length > 0, 'the fixture has strap walls');
  // canonical and world ids coincide for the default roof direction
  assert.equal(project.params.roofDirection, 'rear');
  const crosses = strapWalls.reduce((n, id) => n + (wallStraps(id, project.walls[id], project.params)?.crosses.length ?? 0), 0);
  const wallRuns = model.hardware.straps.filter((s) => s.plane === 'wall');
  assert.equal(wallRuns.length, 2 * crosses);
  for (const s of wallRuns) {
    // vertical plane: the normal is horizontal and both ends sit on that plane
    assert.ok(Math.abs(s.normal.y) < 1e-9);
    const offset = (s.a.x - s.b.x) * s.normal.x + (s.a.z - s.b.z) * s.normal.z;
    assert.ok(Math.abs(offset) < 1e-6, 'both ends on the wall face');
    assert.ok(Math.abs(s.a.y - s.b.y) > 1000, 'a diagonal');
  }
});

for (const dir of ['front', 'left', 'right'] as RoofDirection[]) {
  test(`hardware: rotated with the roof (${dir}) the parts stay on the structure`, () => {
    const project = storageCarport((p) => (p.params.roofDirection = dir));
    const model = buildModel(project);
    const posts = model.framing.members.filter((m) => m.category === 'post');
    for (const f of model.hardware.footings) assert.ok(posts.some((p) => Math.abs(p.start.x - f.top.x) < 1 && Math.abs(p.start.z - f.top.z) < 1), 'footing under a post');
    for (const s of model.hardware.straps) assert.ok(inPlan(s.a, project, 60) && inPlan(s.b, project, 60), 'strap on the footprint');
    for (const h of model.hardware.holdDowns) assert.ok(inPlan(h.position, project, 200), 'hold-down on the footprint');
    assert.equal(model.hardware.rafterAnchors.length, quantity(model, 'rafter-anchor'));
    assert.equal(model.hardware.brackets.length, quantity(model, 'bracket'));
  });
}
