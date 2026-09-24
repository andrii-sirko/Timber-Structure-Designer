import assert from 'node:assert/strict';
import test from 'node:test';
import type { BomResult, PricingLine } from '../types/index.ts';
import { PROJECT_TEMPLATES } from '../store/defaults.ts';
import { buildModel } from './index.ts';
import { computePricing, createDefaultPrices, normalizePrices, timberM3RateFromPerMeter, timberPricePerMeter } from './pricing/index.ts';

const round2 = (n: number) => Math.round(n * 100) / 100;
const sum = (lines: PricingLine[]) => round2(lines.reduce((s, l) => s + l.lineTotal, 0));

test('timber is quoted per running metre from the EUR/m³ rate (120×120 post at 915 €/m³ ≈ 13.18 €/m)', () => {
  const prices = createDefaultPrices();
  assert.equal(timberPricePerMeter('post', { width: 120, height: 120 }, prices), 13.18);
  const rate = timberM3RateFromPerMeter({ width: 120, height: 120 }, 13.176);
  assert.ok(Math.abs(rate - 915) < 1e-9);
  assert.equal(timberM3RateFromPerMeter({ width: 0, height: 120 }, 10), 0);
});

for (const tpl of PROJECT_TEMPLATES) {
  test(`${tpl.id}: totals add up and every line is quantity × unit price`, () => {
    const project = tpl.build();
    const model = buildModel(project);
    const p = computePricing(model.bom, model.connections, createDefaultPrices(), project.params.loads.roofCovering);
    const all = [...p.timberLines, ...p.otherLines, ...p.fixtureLines, ...p.hardwareLines];
    assert.ok(all.length > 0);
    for (const l of all) {
      assert.ok(l.unitPrice >= 0 && l.quantity >= 0, l.id);
      // quantities are shown rounded to 0.01, so the total may differ by half a cent per unit
      assert.ok(Math.abs(l.lineTotal - l.quantity * l.unitPrice) <= 0.005 * l.unitPrice + 0.005, `${l.id}: ${l.lineTotal} vs ${l.quantity} × ${l.unitPrice}`);
    }
    assert.equal(p.materialTotal, round2(sum(p.timberLines) + sum(p.otherLines)));
    assert.equal(p.fixtureTotal, sum(p.fixtureLines));
    assert.equal(p.hardwareTotal, sum(p.hardwareLines));
    assert.equal(p.grandTotal, round2(p.materialTotal + p.fixtureTotal + p.hardwareTotal));
    assert.ok(p.grandTotal > 0);
  });

  test(`${tpl.id}: every BOM member length is priced`, () => {
    const project = tpl.build();
    const model = buildModel(project);
    const p = computePricing(model.bom, model.connections, createDefaultPrices(), project.params.loads.roofCovering);
    const timberMetres = p.timberLines.filter((l) => l.unit === 'm').reduce((s, l) => s + l.quantity, 0);
    const bomMetres = model.bom.lines.filter((l) => l.section).reduce((s, l) => s + round2(l.totalLengthM), 0);
    assert.ok(Math.abs(timberMetres - bomMetres) < 1e-9);
  });
}

test('doubling the timber rates doubles the timber member cost and nothing else', () => {
  const project = PROJECT_TEMPLATES[0].build();
  const model = buildModel(project);
  const base = createDefaultPrices();
  const doubled = { ...base, timberPerM3: Object.fromEntries(Object.entries(base.timberPerM3).map(([k, v]) => [k, v * 2])) as typeof base.timberPerM3 };
  const a = computePricing(model.bom, model.connections, base, project.params.loads.roofCovering);
  const b = computePricing(model.bom, model.connections, doubled, project.params.loads.roofCovering);
  const members = (lines: PricingLine[]) => lines.filter((l) => l.priceRef.kind === 'timber');
  // the per-metre price is rounded to the cent before multiplying, so allow 1 ct per metre
  const metres = members(a.timberLines).reduce((s, l) => s + l.quantity, 0);
  assert.ok(Math.abs(sum(members(b.timberLines)) - 2 * sum(members(a.timberLines))) <= 0.01 * metres + 0.01);
  assert.equal(b.hardwareTotal, a.hardwareTotal);
  assert.equal(b.fixtureTotal, a.fixtureTotal);
  assert.equal(sum(b.otherLines), sum(a.otherLines));
});

test('custom-size fixtures are priced per m² of frame and merged per type', () => {
  const model = buildModel(PROJECT_TEMPLATES.find((t) => t.id === 'garden-shed')!.build());
  const sample = model.bom.fixtures[0];
  assert.ok(sample);
  const custom = (openingId: string, w: number, h: number) => ({ ...sample, openingId, type: 'window' as const, preset: undefined, frameWidth: w, frameHeight: h });
  const bom: BomResult = { ...model.bom, lines: [], materials: [], fixtures: [custom('a', 1000, 1000), custom('b', 500, 1200)] };
  const p = computePricing(bom, { ...model.connections, hardware: [], joinery: [] }, createDefaultPrices(), 'trapezoidal-sheet');
  assert.equal(p.fixtureLines.length, 1);
  const [line] = p.fixtureLines;
  assert.equal(line.unit, 'm²');
  assert.equal(line.quantity, 1.6);
  assert.equal(line.lineTotal, round2(1.6 * createDefaultPrices().fixturePrice['custom-window']));
});

test('saved prices are merged onto current defaults; junk falls back to defaults', () => {
  const defaults = createDefaultPrices();
  assert.deepEqual(normalizePrices(null), defaults);
  assert.deepEqual(normalizePrices('nope'), defaults);
  const merged = normalizePrices({ timberPerM3: { post: 1000 }, claddingBoardPerM2: 'x', roofDeckPerM2: 20 });
  assert.equal(merged.timberPerM3.post, 1000);
  assert.equal(merged.timberPerM3.beam, defaults.timberPerM3.beam);
  assert.equal(merged.claddingBoardPerM2, defaults.claddingBoardPerM2);
  assert.equal(merged.roofDeckPerM2, 20);
  assert.deepEqual(merged.hardwarePerUnit, defaults.hardwarePerUnit);
});
