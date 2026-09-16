import assert from 'node:assert/strict';
import test from 'node:test';
import type { ProjectState, RoofDirection } from '@/types';
import { buildModel } from './index.ts';
import { floorLayout } from './framing/floor.ts';
import { computePricing, createDefaultPrices } from './pricing/index.ts';
import { cross } from './geometry.ts';
import { createDefaultProject, normalizeProject, PROJECT_TEMPLATES } from '../store/defaults.ts';

function withFloor(patch: Partial<ProjectState['params']['floor']> = {}, base = createDefaultProject()): ProjectState {
  return { ...base, params: { ...base.params, floor: { ...base.params.floor, enabled: true, ...patch } } };
}

test('floor is off by default and older projects load without one', () => {
  const model = buildModel(createDefaultProject());
  assert.equal(model.framing.floor, undefined);
  assert.ok(!model.framing.members.some((m) => m.category === 'joist' || m.category === 'bearer'));
  const legacy = normalizeProject({ params: { length: 5000 } });
  assert.equal(legacy.params.floor.enabled, false);
});

test('joists span the short side at no more than the max spacing, on bearers', () => {
  const project = withFloor({ maxJoistSpacing: 600, maxBearerSpacing: 1500 });
  const layout = floorLayout(project.params)!;
  // 6 m × 3 m frame: joists run across the width (Z), bearers along the length
  assert.equal(layout.joistAxis, 'z');
  assert.ok(layout.joistSpacing <= 600);
  assert.ok(layout.bearerSpacing <= 1500);
  const model = buildModel(project);
  const joists = model.framing.members.filter((m) => m.category === 'joist');
  const bearers = model.framing.members.filter((m) => m.category === 'bearer');
  assert.equal(joists.length, layout.joistOffsets.length);
  assert.ok(bearers.length >= 3);
  // joists sit on top of the bearers, the deck on top of the joists
  assert.equal(joists[0].start.y, project.params.floor.bearer.height + project.params.floor.joist.height / 2);
  assert.equal(model.framing.floor!.topHeight, 100 + 120 + 28);
  assert.ok(model.framing.floor!.supportCount > 0);
  assert.ok(model.framing.floor!.crossings >= joists.length * 2);
});

test('slab support lays sleepers directly on pads without bearers', () => {
  const model = buildModel(withFloor({ support: 'slab' }));
  assert.ok(!model.framing.members.some((m) => m.category === 'bearer'));
  const sleeper = model.framing.members.find((m) => m.category === 'joist')!;
  assert.equal(sleeper.start.y, 60);
  assert.equal(model.framing.floor!.topHeight, 120 + 28);
  assert.ok(model.connections.hardware.some((h) => h.id === 'floor-pad'));
});

test('floor timber and deck are cut around an interior free post', () => {
  const base = withFloor({ support: 'slab', maxJoistSpacing: 600 });
  const layout = floorLayout(base.params)!;
  // the world map mirrors X for the default roof direction
  const x = base.params.length - layout.joistOffsets[3];
  const project = { ...base, freePosts: [{ id: 'p1', x, z: 1500 }] };
  const joists = buildModel(project).framing.members.filter((m) => m.category === 'joist' && Math.abs(m.start.x - x) < 1);
  assert.equal(joists.length, 2);
  const deck = buildModel(project).framing.panels.find((p) => p.kind === 'floor')!;
  assert.equal(deck.outline!.holes.length, 1);
  assert.ok(deck.areaM2 < buildModel(base).framing.panels.find((p) => p.kind === 'floor')!.areaM2);
});

test('the deck extrudes upwards in world space for every roof direction', () => {
  for (const dir of ['rear', 'front', 'left', 'right'] as RoofDirection[]) {
    const base = withFloor();
    const deck = buildModel({ ...base, params: { ...base.params, roofDirection: dir } }).framing.panels.find((p) => p.kind === 'floor')!;
    assert.ok(cross(deck.direction, deck.up).y > 0, dir);
  }
});

test('floor statics check joists and bearers and flag an overloaded floor', () => {
  const ok = buildModel(withFloor()).statics.checks;
  assert.ok(ok.some((c) => c.id === 'floor-joist'));
  assert.ok(ok.some((c) => c.id === 'floor-bearer'));
  const weak = buildModel(withFloor({ joist: { width: 40, height: 60 }, maxBearerSpacing: 3000, liveLoad: 5 })).statics.checks.find((c) => c.id === 'floor-joist')!;
  assert.equal(weak.status, 'fail');
  assert.ok(weak.recommendation);
});

test('pricing covers the floor, doors & windows, fitting kits and roof accessories', () => {
  const shed = PROJECT_TEMPLATES.find((t) => t.id === 'garden-shed')!.build();
  const project = { ...shed, params: { ...shed.params, loads: { ...shed.params.loads, roofCovering: 'roof-tiles' as const } } };
  const model = buildModel(project);
  const pricing = computePricing(model.bom, model.connections, createDefaultPrices(), project.params.loads.roofCovering);
  const ids = [...pricing.timberLines, ...pricing.otherLines, ...pricing.fixtureLines, ...pricing.hardwareLines].map((l) => l.id);
  for (const id of ['flooring-spruce-boards', 'timber-joist-60x120', 'timber-bearer-100x100', 'fixture-door-boarded-875', 'fixture-window-turntilt-800x800', 'hardware-door-fitting-kit', 'hardware-window-fitting-kit', 'hardware-floor-footing', 'hardware-floor-screws', 'material-roof-battens', 'material-counter-battens', 'material-underlay-breathable', 'material-roof-trim', 'material-floor-dpc']) {
    assert.ok(ids.includes(id), `missing ${id}`);
  }
  const all = [...pricing.timberLines, ...pricing.otherLines, ...pricing.fixtureLines, ...pricing.hardwareLines];
  const unpriced = all.filter((l) => l.unitPrice <= 0).map((l) => l.id);
  assert.deepEqual(unpriced, []);
  assert.equal(pricing.grandTotal, Math.round((pricing.materialTotal + pricing.fixtureTotal + pricing.hardwareTotal) * 100) / 100);
});

test('every hardware item and material a project can produce has a default price', () => {
  const shed = PROJECT_TEMPLATES.find((t) => t.id === 'garden-shed')!.build();
  const variants: ProjectState[] = [];
  for (const connectionMode of ['hardware', 'traditional'] as const) {
    for (const roofCovering of ['trapezoidal-sheet', 'polycarbonate', 'bitumen-shingles', 'roof-tiles', 'green-roof'] as const) {
      for (const support of ['slab', 'bearers'] as const) {
        for (const decking of ['spruce-boards', 'osb', 'larch-decking'] as const) {
          variants.push({
            ...shed,
            pavedAreas: [{ id: 'a', label: 'Drive', points: [{ x: 0, z: 0 }, { x: 3000, z: 0 }, { x: 3000, z: 5000 }, { x: 0, z: 5000 }], stoneLength: 200, stoneWidth: 100, jointWidth: 3, stoneThickness: 80, pattern: 'stack', color: '#999' }],
            walls: { ...shed.walls, left: { ...shed.walls.left, openings: [{ id: 'c', type: 'window', x: 500, y: 900, width: 730, height: 610 }] } },
            params: { ...shed.params, connectionMode, loads: { ...shed.params.loads, roofCovering }, floor: { ...shed.params.floor, support, decking } },
          });
        }
      }
    }
  }
  const prices = createDefaultPrices();
  for (const project of variants) {
    const model = buildModel(project);
    const pricing = computePricing(model.bom, model.connections, prices, project.params.loads.roofCovering);
    const all = [...pricing.timberLines, ...pricing.otherLines, ...pricing.fixtureLines, ...pricing.hardwareLines];
    const unpriced = all.filter((l) => l.unitPrice <= 0).map((l) => l.id);
    assert.deepEqual(unpriced, [], `${project.params.connectionMode} / ${project.params.loads.roofCovering} / ${project.params.floor.support} / ${project.params.floor.decking}`);
    assert.ok(pricing.fixtureLines.some((l) => l.id === 'fixture-custom-window' && l.unit === 'm²'));
    assert.ok(pricing.otherLines.some((l) => l.priceRef.kind === 'material' && l.priceRef.priceKey === 'paving-stones'));
  }
});

test('a door in a floored building gets a threshold flush with the finished floor, filling the plate gap', () => {
  const shed = PROJECT_TEMPLATES.find((t) => t.id === 'garden-shed')!.build();
  const door = { id: 'd', type: 'door' as const, x: 800, y: 0, width: 1010, height: 2130 };
  const base: ProjectState = { ...shed, walls: { ...shed.walls, front: { ...shed.walls.front, closed: true, openings: [door] } } };
  const withoutFloor = buildModel({ ...base, params: { ...base.params, floor: { ...base.params.floor, enabled: false } } });
  assert.ok(!withoutFloor.framing.members.some((m) => m.nameDe === 'Türschwelle'));

  const project = withFloor({}, base);
  const model = buildModel(project);
  const thresholds = model.framing.members.filter((m) => m.nameDe === 'Türschwelle');
  assert.equal(thresholds.length, 1);
  const deckTop = floorLayout(project.params)!.deckTop;
  assert.equal(thresholds[0].length, door.width);
  assert.equal(thresholds[0].section.height, Math.round(deckTop));
  assert.equal(thresholds[0].section.width, project.params.timber.stud.height);
  assert.ok(Math.abs(thresholds[0].start.y - Math.round(deckTop) / 2) < 1e-6);
});
