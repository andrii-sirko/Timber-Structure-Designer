import assert from 'node:assert/strict';
import test from 'node:test';
import type { ProjectState, RoofDirection, WallCladding } from '@/types';
import { buildModel } from './index.ts';
import { claddingBoards } from './framing/cladding.ts';
import { normalizeProject, PROJECT_TEMPLATES } from '../store/defaults.ts';
import { hasTranslation } from '../i18n/core.ts';

const shed = (): ProjectState => PROJECT_TEMPLATES.find((tpl) => tpl.id === 'garden-shed')!.build();

function withCladding(cladding: WallCladding, dir: RoofDirection = 'rear'): ProjectState {
  const p = shed();
  p.params.roofDirection = dir;
  p.walls = { ...p.walls, front: { ...p.walls.front, cladding } };
  return p;
}

const square = [
  { u: 0, v: 0 },
  { u: 1000, v: 0 },
  { u: 1000, v: 1000 },
  { u: 0, v: 1000 },
];

test('spaced vertical boards are laid board + gap from the start edge', () => {
  const boards = claddingBoards(square, [], { orientation: 'vertical', boardWidth: 100, gap: 50 });
  // starts at 0, 150, …, 900 → 7 boards, the last one 100 wide
  assert.equal(boards.length, 7);
  const lefts = boards.map((b) => Math.min(...b.map((p) => p.u)));
  assert.deepEqual(lefts, [0, 150, 300, 450, 600, 750, 900]);
});

test('horizontal boards are cut around an opening and to a sloped top', () => {
  const sloped = [
    { u: 0, v: 0 },
    { u: 1000, v: 0 },
    { u: 1000, v: 800 },
    { u: 0, v: 1000 },
  ];
  const hole = [
    { u: 300, v: 0 },
    { u: 700, v: 0 },
    { u: 700, v: 500 },
    { u: 300, v: 500 },
  ];
  const boards = claddingBoards(sloped, [hole], { orientation: 'horizontal', boardWidth: 100, gap: 100 });
  for (const b of boards) {
    for (const p of b) {
      assert.ok(p.v <= 1000 - p.u * 0.2 + 0.1, 'board stays under the sloped top');
      assert.ok(!(p.u > 300.1 && p.u < 699.9 && p.v < 499.9), 'no board inside the opening');
    }
  }
  // the bottom rows are split in two by the door
  const bottomRow = boards.filter((b) => Math.min(...b.map((p) => p.v)) === 0);
  assert.equal(bottomRow.length, 2);
});

test('a wall without a gap keeps one closed cladding sheet', () => {
  const model = buildModel(shed());
  const front = model.framing.panels.find((p) => p.kind === 'cladding' && p.wallId === 'front');
  assert.ok(front);
  assert.equal(front.boards, undefined);
});

test('a gap turns the wall cladding into separate boards on every roof direction, area = board area', () => {
  for (const dir of ['rear', 'front', 'left', 'right'] as RoofDirection[]) {
    const closed = buildModel(withCladding({ orientation: 'horizontal', boardWidth: 100, gap: 0 }, dir));
    const open = buildModel(withCladding({ orientation: 'horizontal', boardWidth: 100, gap: 100 }, dir));
    const c = closed.framing.panels.find((p) => p.kind === 'cladding' && p.wallId === 'front')!;
    const o = open.framing.panels.find((p) => p.kind === 'cladding' && p.wallId === 'front')!;
    assert.ok(o.boards && o.boards.length > 5, dir);
    assert.ok(o.areaM2 < c.areaM2 * 0.6 && o.areaM2 > c.areaM2 * 0.4, `${dir}: half the wall is boards`);
    assert.equal(o.cladding?.orientation, 'horizontal');
  }
});

test('the cladding layout survives save / load and is clamped', () => {
  const saved = JSON.parse(JSON.stringify(withCladding({ orientation: 'horizontal', boardWidth: 9999, gap: 30 })));
  const loaded = normalizeProject(saved);
  assert.deepEqual(loaded.walls.front.cladding, { orientation: 'horizontal', boardWidth: 300, gap: 30 });
  assert.equal(loaded.walls.rear.cladding, undefined);
});

const carport = (): ProjectState => PROJECT_TEMPLATES.find((tpl) => tpl.id === 'carport-single')!.build();

function withScreen(id: 'left' | 'front', cladding?: WallCladding, dir: RoofDirection = 'rear'): ProjectState {
  const p = carport();
  p.params.roofDirection = dir;
  p.walls = { ...p.walls, [id]: { ...p.walls[id], closed: false, screen: true, ...(cladding ? { cladding } : {}) } };
  return p;
}

test('a slat screen in an open bay stands on wall posts with a rail and battens, no studs', () => {
  for (const dir of ['rear', 'front', 'left', 'right'] as RoofDirection[]) {
    const open = buildModel(carport());
    const model = buildModel(withScreen('left', undefined, dir));
    const own = model.framing.members.filter((m) => m.wallId === 'left');
    assert.ok(!own.some((m) => m.category === 'stud' || m.category === 'plate'), `${dir}: no studs or plates`);
    assert.ok(own.some((m) => m.group.startsWith('Screen bottom rail')), `${dir}: bottom rail`);
    assert.ok(own.some((m) => m.group.startsWith('Screen batten')), `${dir}: battens carry the horizontal slats`);
    const posts = (m: typeof model) => m.framing.members.filter((x) => x.category === 'post').length;
    assert.ok(posts(model) >= posts(open), `${dir}: intermediate posts under the screen`);
    const panel = model.framing.panels.find((p) => p.kind === 'cladding' && p.wallId === 'left');
    assert.ok(panel?.boards && panel.boards.length > 10, `${dir}: separate slats`);
    assert.equal(panel.cladding?.orientation, 'horizontal', 'default screen: horizontal slats');
    assert.ok(Math.min(...panel.boards.flat().map((q) => q.v)) >= 50, 'slats stay clear of the ground');
    assert.equal(model.framing.insulation, undefined);
  }
});

test('vertical screen slats are carried by rails instead of battens', () => {
  const model = buildModel(withScreen('front', { orientation: 'vertical', boardWidth: 45, gap: 20 }));
  const own = model.framing.members.filter((m) => m.wallId === 'front' && m.category === 'batten');
  assert.ok(own.some((m) => m.group.startsWith('Screen rail')));
  assert.ok(!own.some((m) => m.group.startsWith('Screen batten')));
});

test('a screen catches wind and blocks vehicles, unlike an open bay', () => {
  const open = buildModel(carport());
  const screened = buildModel(withScreen('left'));
  // wind across the left wall blows along X
  const bracingX = (m: typeof open) => m.statics.checks.find((c) => c.id === 'bracing-x')!.loadUls;
  assert.ok(bracingX(screened) > bracingX(open) * 2, 'wind on the screen loads the bracing');
  const p = withScreen('left');
  p.vehicles = [{ id: 'v', modelId: p.vehicles[0]?.modelId ?? 'vw-golf', x: 0, z: p.params.width / 2, rotationDeg: 0, color: '#fff' }];
  const fit = buildModel(p).vehicles.find((f) => f.vehicleId === 'v');
  assert.ok(fit?.wallCollisions.includes('left'));
});

test('screen settings survive save / load, a closed wall drops the screen flag', () => {
  const loaded = normalizeProject(JSON.parse(JSON.stringify(withScreen('left'))));
  assert.equal(loaded.walls.left.screen, true);
  const closed = withScreen('left');
  closed.walls.left.closed = true;
  assert.equal(normalizeProject(JSON.parse(JSON.stringify(closed))).walls.left.screen, undefined);
});

test('screen texts are translated', () => {
  const model = buildModel(withScreen('front', { orientation: 'vertical', boardWidth: 45, gap: 20 }));
  const texts = new Set([...model.bom.lines.map((l) => l.label), ...model.framing.members.filter((m) => m.category === 'batten').map((m) => m.group)]);
  for (const text of texts) for (const lang of ['uk', 'de', 'pl'] as const) assert.ok(hasTranslation(text, lang), `${text} → ${lang}`);
});
