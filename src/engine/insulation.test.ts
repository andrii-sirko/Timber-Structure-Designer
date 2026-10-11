import assert from 'node:assert/strict';
import test from 'node:test';
import type { ProjectState } from '@/types';
import { buildModel } from './index.ts';
import { insulationThermal } from './framing/insulation.ts';
import { computePricing, createDefaultPrices } from './pricing/index.ts';
import { createDefaultProject, normalizeProject, PROJECT_TEMPLATES } from '../store/defaults.ts';

const shed = (): ProjectState => PROJECT_TEMPLATES.find((tpl) => tpl.id === 'garden-shed')!.build();

function insulated(patch: Partial<ProjectState['params']['insulation']> = {}, base = shed()): ProjectState {
  return { ...base, params: { ...base.params, insulation: { ...base.params.insulation, enabled: true, ...patch } } };
}

test('insulation is off by default and older projects load without it', () => {
  const model = buildModel(shed());
  assert.equal(model.framing.insulation, undefined);
  assert.ok(!model.framing.panels.some((p) => p.kind === 'insulation'));
  const legacy = normalizeProject({ params: { length: 5000 } });
  assert.equal(legacy.params.insulation.enabled, false);
  assert.equal(legacy.params.insulation.walls.material, 'mineral-wool');
});

test('closed walls, roof and floor each get an insulation panel and an R value', () => {
  const model = buildModel(insulated());
  const elements = model.framing.insulation!.elements;
  assert.deepEqual(elements.map((e) => e.part), ['walls', 'roof', 'floor']);
  assert.equal(model.framing.panels.filter((p) => p.kind === 'insulation' && p.insulation?.part === 'walls').length, 4);
  for (const e of elements) {
    assert.ok(e.areaM2 > 0);
    assert.ok(e.rTotal > 0 && e.rTotal < e.rInsulation + 1, `${e.part}: R ${e.rTotal}`);
    assert.ok(Math.abs(e.uValue * e.rTotal - 1) < 0.02);
  }
  // the floor area matches the deck, the roof covers the 4 × 3 m footprint on the slope
  assert.equal(elements[2].areaM2, model.framing.floor!.areaM2);
  assert.ok(elements[1].areaM2 > 12 && elements[1].areaM2 < 12.5);
});

test('door and window openings are cut out of the wall insulation', () => {
  const model = buildModel(insulated());
  const front = model.framing.panels.find((p) => p.id.startsWith('insulation-') && p.wallId === 'front')!;
  assert.equal(front.outline!.holes.length, 1);
  const cladding = model.framing.panels.find((p) => p.kind === 'cladding' && p.wallId === 'front')!;
  assert.ok(front.areaM2 <= cladding.areaM2);
});

test('thickness 0 skips an element and the floor needs the timber floor', () => {
  const base = shed();
  base.params.floor.enabled = false;
  const model = buildModel(insulated({ walls: { material: 'mineral-wool', thickness: 0 } }, base));
  assert.deepEqual(model.framing.insulation!.elements.map((e) => e.part), ['roof']);
});

test('R follows the parallel path method: thicker and better insulation helps, timber bridging hurts', () => {
  const wool = insulationThermal('walls', { material: 'mineral-wool', thickness: 120 }, 120, 0, 10);
  // 0.12 / 0.035 + 2 × 0.13
  assert.equal(wool.rInsulation, 3.43);
  assert.equal(wool.rTotal, 3.69);
  const bridged = insulationThermal('walls', { material: 'mineral-wool', thickness: 120 }, 120, 0.1, 10);
  assert.ok(bridged.rTotal < wool.rTotal);
  const pir = insulationThermal('walls', { material: 'pir', thickness: 120 }, 120, 0.1, 10);
  assert.ok(pir.rTotal > bridged.rTotal);
  // insulation deeper than the studs continues over the timber path
  const deep = insulationThermal('walls', { material: 'mineral-wool', thickness: 200 }, 120, 0.1, 10);
  assert.ok(deep.rTotal > bridged.rTotal + 1.5);
});

test('insulation deeper than the studs warns', () => {
  const model = buildModel(insulated({ walls: { material: 'mineral-wool', thickness: 200 } }));
  assert.ok(model.framing.warnings.some((w) => w.message.startsWith('Wall insulation 200 mm is deeper than the 120 mm studs')));
});

test('insulation, membranes and tape are priced in the estimate, per m³ for the insulation', () => {
  const project = insulated({ walls: { material: 'wood-fibre', thickness: 120 } });
  const model = buildModel(project);
  const walls = model.framing.insulation!.elements.find((e) => e.part === 'walls')!;
  const item = model.bom.materials.find((m) => m.id === 'insulation-wood-fibre-walls')!;
  assert.equal(item.unit, 'm³');
  assert.ok(Math.abs(item.quantity - walls.areaM2 * 0.12 * 1.05) < 0.002);
  for (const id of ['vapour-barrier', 'vapour-tape', 'wind-membrane']) assert.ok(model.bom.materials.some((m) => m.id === id), id);
  const pricing = computePricing(model.bom, model.connections, createDefaultPrices(), project.params.loads.roofCovering);
  const line = pricing.otherLines.find((l) => l.id === 'material-insulation-wood-fibre-walls')!;
  assert.equal(line.unitPrice, createDefaultPrices().materialPerUnit['insulation-wood-fibre']);
  assert.ok(line.lineTotal > 0);
  const off = buildModel(shed());
  assert.ok(computePricing(off.bom, off.connections, createDefaultPrices(), 'bitumen-shingles').grandTotal < pricing.grandTotal);
});

test('insulation panels stay in place for every roof direction', () => {
  for (const dir of ['rear', 'front', 'left', 'right'] as const) {
    const base = insulated();
    base.params.roofDirection = dir;
    const model = buildModel(base);
    const floor = model.framing.panels.find((p) => p.id === 'insulation-floor')!;
    const deck = model.framing.panels.find((p) => p.kind === 'floor')!;
    // the floor insulation sits right under the deck, extruded upwards to its underside
    assert.equal(floor.anchor.y + floor.outline!.thickness, deck.anchor.y, dir);
  }
  assert.ok(createDefaultProject());
});
