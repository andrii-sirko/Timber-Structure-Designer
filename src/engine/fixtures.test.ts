import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { normalizeProject } from '../store/defaults.ts';
import { buildModel } from './index.ts';

/**
 * The three structures of the 13/10/2026 review (carport 8750 × 5800, entrance roof 4900 × 1840,
 * garden shed 6000 × 4000), configured to the spec: H post anchors, pinned bases, knee braces /
 * straps, curb, roofing screws. Every check row must be ok or a warning that names its reason, and
 * no part of the replaced options may be left in the lists.
 */
const load = (name: string) => normalizeProject(JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8')).project);
const STRUCTURES = ['carport-after', 'entrance-roof-after', 'garden-shed-after'] as const;

for (const name of STRUCTURES) {
  test(`${name}: every check is ok or a warning with its reason`, () => {
    const { statics } = buildModel(load(name));
    for (const c of statics.checks) {
      assert.notEqual(c.status, 'fail', `${c.id}: ${c.detail}`);
      if (c.status === 'warning') assert.ok(c.recommendation || /\(\d+ %\)/.test(c.detail), `${c.id} names no reason`);
    }
    assert.ok(statics.notChecked.length >= 5, 'the summary lists what is not checked');
    const ids = statics.checks.map((c) => c.id);
    for (const id of ['uplift-sheet', 'uplift-rafter', 'uplift-purlin', 'uplift-post', 'uplift-foundation']) assert.ok(ids.includes(id), `${name}: ${id}`);
    assert.ok(ids.includes('bracing-x') && ids.includes('bracing-z'));
  });

  test(`${name}: no parts of replaced options are left over`, () => {
    const { connections, bom } = buildModel(load(name));
    const hw = connections.hardware.map((h) => h.id);
    for (const gone of ['post-base', 'anchor']) assert.ok(!hw.includes(gone), `${name}: ${gone}`);
    assert.ok(hw.includes('post-base-h') || hw.includes('post-base-h-reinforced'), 'H post anchors');
    assert.ok(!connections.hardware.some((h) => /Rahmendübel|Bohrschrauben|Schwerlastanker|Pfostenträger/.test(h.nameDe)), 'no frame anchors, self-drilling screws, heavy-duty anchors or adjustable bases');
    const roofScrews = connections.hardware.find((h) => h.id === 'roof-screws')!;
    assert.match(roofScrews.spec, /6\.5 × 65/);
    const roofing = bom.lines.find((l) => l.category === 'roofing')!;
    assert.ok(roofing.sheets && roofing.sheets.count > 0, 'sheet list');
    assert.ok(bom.materials.some((m) => m.id === 'concrete' && /bags/.test(m.note ?? '')), 'concrete volume with bag count');
    assert.ok(bom.timberOrder.length > 0 && bom.timberOrder.every((o) => o.offcutPct >= 0), 'timber order in stock lengths');
  });
}

test('carport: knee braces in both directions, BGF and loose paving flagged, studs 60×80', () => {
  const model = buildModel(load('carport-after'));
  const { statics, framing } = model;
  assert.ok(statics.checks.find((c) => c.id === 'bracing-x')!.element.startsWith('Knee braces'));
  assert.ok(statics.checks.find((c) => c.id === 'bracing-z')!.element.startsWith('Knee braces'));
  assert.ok(framing.warnings.some((w) => /BbgBO §61/.test(w.message)));
  assert.ok(framing.warnings.some((w) => /loose paving/.test(w.message)));
  for (const m of framing.members.filter((x) => x.category === 'stud')) assert.deepEqual([m.section.width, m.section.height].sort(), [60, 80]);
  const posts = model.cutList.filter((c) => c.group.startsWith('Post'));
  for (const p of posts) assert.equal(p.orderLength, p.length + 80, 'order length = target + 80');
});

test('garden shed: straps in every wall, curb, door 1774 wide, single window, title from the plan', () => {
  const project = load('garden-shed-after');
  const model = buildModel(project);
  assert.equal(project.name, 'Garden shed 6 × 4 m');
  assert.ok(model.statics.checks.find((c) => c.id === 'bracing-x')!.element.startsWith('Braced wall'));
  assert.ok(model.connections.hardware.some((h) => h.id === 'wind-strap'));
  assert.ok(model.connections.hardware.some((h) => h.id === 'plate-anchor' && /7\.5 × 100/.test(h.spec)));
  assert.ok(model.bom.materials.some((m) => m.id === 'bitumen-r500'));
  const door = model.bom.fixtures.find((f) => f.type === 'door')!;
  assert.equal(door.roughWidth, 1774);
  assert.equal(door.frameWidth, 1750);
  const win = model.bom.fixtures.find((f) => f.type === 'window')!;
  assert.match(win.label, /^Turn-tilt window 1000×1000/);
  assert.equal(win.frameWidth, 1000);
  // walls stand on the curb: bottom plates at +150
  const plate = model.framing.members.find((m) => m.category === 'plate' && m.nameDe === 'Schwelle')!;
  assert.ok(Math.abs(plate.start.y - (150 + plate.section.height / 2)) < 1);
});

test('the original exports still load: stale window label and old rough sizes migrate', () => {
  const shed = load('garden-shed');
  const win = shed.walls.left.openings[0];
  assert.equal(win.label, 'Turn-tilt window 1000×1000 1');
  assert.equal(win.width, 1024);
  assert.equal(shed.walls.front.openings[0].width, 1774);
});
