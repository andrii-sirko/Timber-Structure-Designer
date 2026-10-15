import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import type { ProjectState, RoofDirection } from '@/types';
import { normalizeProject } from '../store/defaults.ts';
import { buildModel } from './index.ts';
import { screenPartExtent } from './framing/wallFrame.ts';

/**
 * A closed wall that stops part-way may continue as a slat screen: the carport's storage corner
 * is closed (rear 0–1750 mm) and the rest of the rear wall up to 7430 mm is open slats.
 */
const raw = JSON.parse(readFileSync(new URL('./fixtures/carport-after.json', import.meta.url), 'utf8')).project;

function carport(patch?: (p: ProjectState) => void): ProjectState {
  const p = structuredClone(raw) as ProjectState;
  p.walls.rear = { ...p.walls.rear, end: 1750, screenPart: { start: 1750, end: 7430 } };
  patch?.(p);
  return normalizeProject(p);
}

test('screen part: clamped beside the closed stretch, dropped when it would overlap it', () => {
  const wall = { closed: true, start: 0, end: 1750, screenPart: { start: 1000, end: 7430 } };
  assert.deepEqual(screenPartExtent(wall, 8750), { start: 1750, end: 7430 });
  assert.deepEqual(screenPartExtent({ ...wall, start: 5000, end: 8750, screenPart: { start: 0, end: 6000 } }, 8750), { start: 0, end: 5000 });
  assert.equal(screenPartExtent({ ...wall, screenPart: { start: 0, end: 1700 } }, 8750), null, 'entirely inside the closed stretch');
  assert.equal(screenPartExtent({ ...wall, closed: false }, 8750), null, 'only closed walls have one');
});

test('screen part: battens, a slat panel of its own and the closed stretch unchanged', () => {
  const { framing } = buildModel(carport());
  const rear = framing.members.filter((m) => m.wallId === 'rear');
  const studs = rear.filter((m) => m.category === 'stud');
  const battens = rear.filter((m) => m.category === 'batten');
  assert.ok(studs.length > 0 && studs.every((m) => m.start.x < 1750 + 100), 'studs only in the closed stretch');
  assert.ok(battens.some((m) => m.group.startsWith('Screen batten')), 'screen battens');
  assert.ok(battens.every((m) => m.start.x > 1750 - 100 && m.start.x < 7430 + 100), 'battens only in the screen stretch');
  const panels = framing.panels.filter((x) => x.wallId === 'rear');
  assert.equal(panels.length, 2);
  const screen = panels.find((x) => x.screen)!;
  assert.equal(screen.id, 'cladding-rear-screen');
  assert.ok(screen.boards && screen.boards.length > 0 && screen.cladding!.gap > 0, 'open slats');
  assert.ok(!panels.find((x) => !x.screen)!.screen);
});

test('screen part: catches the board share of the wind and gets its own batten check', () => {
  const closedOnly = buildModel(carport((p) => delete p.walls.rear.screenPart)).statics;
  const withScreen = buildModel(carport()).statics;
  const fullyClosed = buildModel(carport((p) => (p.walls.rear = { ...p.walls.rear, end: 7430, screenPart: undefined }))).statics;
  const z = (s: typeof withScreen) => s.checks.find((c) => c.id === 'bracing-z')!.loadSls;
  assert.ok(z(closedOnly) < z(withScreen) && z(withScreen) < z(fullyClosed), `${z(closedOnly)} < ${z(withScreen)} < ${z(fullyClosed)}`);
  const battens = withScreen.checks.find((c) => c.id === 'studs-rear-screen');
  assert.ok(battens && /Screen battens/.test(battens.element));
  assert.ok(withScreen.checks.some((c) => c.id === 'studs-rear'), 'the closed stretch keeps its stud check');
});

test('screen part: same layout for every roof direction', () => {
  const dirs: RoofDirection[] = ['rear', 'front', 'left', 'right'];
  const counts = dirs.map((dir) => {
    const { framing } = buildModel(carport((p) => (p.params.roofDirection = dir)));
    const screen = framing.panels.find((x) => x.screen);
    assert.ok(screen, `${dir}: screen panel`);
    return framing.members.filter((m) => m.category === 'batten' && m.wallId === screen.wallId).length;
  });
  assert.ok(counts.every((n) => n > 0), counts.join(','));
});

test('screen part: kept by normalize on closed walls only', () => {
  assert.deepEqual(carport().walls.rear.screenPart, { start: 1750, end: 7430 });
  const open = carport((p) => (p.walls.rear.closed = false));
  assert.equal(open.walls.rear.screenPart, undefined);
});

test('OSB sheathing: a panel on the outer stud faces of every sheet-panel wall, in the BOM', () => {
  const model = buildModel(carport((p) => (p.walls.rear.bracing = 'panels')));
  const sheathing = model.framing.panels.filter((x) => x.kind === 'sheathing');
  assert.deepEqual(sheathing.map((x) => x.wallId), ['rear']);
  const [osb] = sheathing;
  assert.ok(osb.areaM2 > 3 && osb.areaM2 < 5, `closed stretch only: ${osb.areaM2} m²`);
  // rear wall faces +Z: the sheet lies inside the cladding (z = width) and on the studs' outer faces
  const studs = model.framing.members.filter((m) => m.wallId === 'rear' && m.category === 'stud');
  const studOuter = Math.max(...studs.map((m) => m.start.z)) + 40;
  assert.ok(osb.anchor.z <= studOuter + 1 && osb.anchor.z + osb.outline!.thickness <= raw.params.width, `${osb.anchor.z}`);
  const line = model.bom.materials.find((m) => m.id === 'osb-sheathing');
  assert.ok(line && Math.abs(line.quantity - osb.areaM2 * 1.1) < 0.01, `${line?.quantity}`);
  assert.ok(!buildModel(carport()).framing.panels.some((x) => x.kind === 'sheathing'), 'no OSB without sheet-panel bracing');
});
