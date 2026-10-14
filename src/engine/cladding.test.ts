import assert from 'node:assert/strict';
import test from 'node:test';
import type { ProjectState, RoofDirection, WallCladding } from '@/types';
import { buildModel } from './index.ts';
import { claddingBoards } from './framing/cladding.ts';
import { stockBoardsFor } from './bom/index.ts';
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

test('the BOM counts cladding boards and their running metres per board width', () => {
  const model = buildModel(withCladding({ orientation: 'horizontal', boardWidth: 100, gap: 0 }));
  const sheathing = model.bom.lines.filter((l) => l.category === 'sheathing');
  const narrow = sheathing.find((l) => l.label.startsWith('Wall cladding boards 20 × 100 mm'))!;
  const front = model.framing.panels.find((p) => p.kind === 'cladding' && p.wallId === 'front')!;
  const boards = claddingBoards(front.outline!.outer, front.outline!.holes, front.cladding!);
  assert.equal(narrow.count, boards.length);
  // closed boarding: running metres × board width ≈ the wall face (sloped tops add a little)
  assert.ok(Math.abs(narrow.totalLengthM * 0.1 - narrow.areaM2!) < narrow.areaM2! * 0.1, `${narrow.totalLengthM} m vs ${narrow.areaM2} m²`);
  assert.ok(sheathing.some((l) => l.label.startsWith('Wall cladding boards 20 × 120 mm') && l.count > 0 && l.totalLengthM > 0), 'other walls keep the default 120 mm boards');
  assert.equal(model.bom.totalLengthM, model.bom.lines.reduce((s, l) => s + (l.section ? l.totalLengthM : 0), 0));
  assert.ok(hasTranslation(narrow.label, 'uk'));
});

test('cladding pieces are packed into 4 m and 6 m stock boards', () => {
  // 1.9 m pieces: two per 4 m board (with the cut allowance), three per 6 m board
  assert.deepEqual(stockBoardsFor([1900, 1900, 1900, 1900, 1900, 1900], 4000), { lengthMm: 4000, count: 3, wastePct: 5 });
  assert.equal(stockBoardsFor([1900, 1900, 1900, 1900, 1900, 1900], 6000).count, 2);
  // a 7 m piece is joined: one full 4 m board + 3 m, and the short piece fits the 1 m left of the 3 m cut
  assert.equal(stockBoardsFor([7000, 900], 4000).count, 2);
  assert.equal(stockBoardsFor([], 6000).count, 0);
  const line = buildModel(shed()).bom.lines.find((l) => l.category === 'sheathing')!;
  assert.deepEqual(line.stockBoards?.map((o) => o.lengthMm), [4000, 6000]);
  for (const o of line.stockBoards!) assert.ok(o.count * o.lengthMm >= line.totalLengthM * 1000, `${o.lengthMm}: enough length bought`);
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

test('a door in a slat screen is cut out of the slats and framed with jambs and a header rail', () => {
  for (const orientation of ['horizontal', 'vertical'] as const) {
    const p = withScreen('left', { orientation, boardWidth: 70, gap: 20 });
    const door = { id: 'd', type: 'door' as const, x: 1000, y: 0, width: 900, height: 2000, hinge: 'left' as const, swing: 'out' as const };
    p.walls.left = { ...p.walls.left, openings: [door] };
    const model = buildModel(p);
    const panel = model.framing.panels.find((q) => q.kind === 'cladding' && q.wallId === 'left')!;
    for (const b of panel.boards!) {
      const inside = b.every((q) => q.u >= door.x - 0.1 && q.u <= door.x + door.width + 0.1 && q.v <= door.height + 0.1);
      assert.ok(!inside, `${orientation}: no slat across the door`);
    }
    const battens = model.framing.members.filter((m) => m.wallId === 'left' && m.category === 'batten');
    // world Z of a member along the left wall = its u
    const at = (u: number) => battens.filter((m) => m.direction.y === 1 && Math.abs(m.start.z - u) < 1);
    const half = p.params.build.screenBatten.width / 2; // battens: width along the wall
    assert.equal(at(door.x - half).length, 1, `${orientation}: jamb left of the door`);
    assert.equal(at(door.x + door.width + half).length, 1, `${orientation}: jamb right of the door`);
    const rails = battens.filter((m) => m.direction.y === 0);
    assert.ok(rails.some((m) => Math.abs(m.start.y - (door.height + half)) < 1), `${orientation}: header rail`);
    const bottom = rails.filter((m) => m.group.startsWith('Screen bottom rail'));
    for (const m of bottom) {
      const [a, b] = [m.start.z, m.start.z + m.direction.z * m.length].sort((x, y) => x - y);
      assert.ok(b <= door.x + 0.5 || a >= door.x + door.width - 0.5, `${orientation}: bottom rail open at the door`);
    }
    assert.ok(model.bom.fixtures.length === 1, 'the door is on the shopping list');
    assert.deepEqual(model.framing.warnings.filter((w) => w.wallId === 'left').map((w) => w.message), [], `${orientation}: the door fits the screen`);
  }
});
