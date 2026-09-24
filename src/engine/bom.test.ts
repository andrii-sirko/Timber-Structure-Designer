import assert from 'node:assert/strict';
import test from 'node:test';
import type { MemberCategory } from '../types/index.ts';
import { PROJECT_TEMPLATES } from '../store/defaults.ts';
import { buildModel } from './index.ts';
import { collectFixtures, collectMaterials } from './bom/index.ts';
import { buildFramingCanonical, canonicalProject } from './framing/index.ts';
import { memberVolumeM3 } from './geometry.ts';

const MEMBER_ORDER: MemberCategory[] = ['post', 'beam', 'rafter', 'brace', 'stud', 'plate', 'header', 'sill', 'bearer', 'joist'];
const near = (actual: number, expected: number, eps = 1e-9) => assert.ok(Math.abs(actual - expected) < eps, `${actual} ≠ ${expected}`);

for (const tpl of PROJECT_TEMPLATES) {
  test(`${tpl.id}: every member is counted once in the BOM, in metres and m³`, () => {
    const { framing, bom } = buildModel(tpl.build());
    const memberLines = bom.lines.filter((l) => MEMBER_ORDER.includes(l.category as MemberCategory));
    assert.equal(memberLines.reduce((s, l) => s + l.count, 0), framing.members.length);
    near(memberLines.reduce((s, l) => s + l.totalLengthM, 0), framing.members.reduce((s, m) => s + m.length / 1000, 0));
    near(memberLines.reduce((s, l) => s + l.volumeM3, 0), framing.members.reduce((s, m) => s + memberVolumeM3(m.section, m.length), 0));
    near(bom.totalVolumeM3, bom.lines.reduce((s, l) => s + l.volumeM3, 0));
    near(bom.totalMassKg, bom.lines.reduce((s, l) => s + l.massKg, 0));
  });

  test(`${tpl.id}: BOM member lines are unique per category and section, posts first`, () => {
    const { bom } = buildModel(tpl.build());
    const memberLines = bom.lines.filter((l) => MEMBER_ORDER.includes(l.category as MemberCategory));
    const keys = memberLines.map((l) => `${l.category}|${l.section?.width}x${l.section?.height}`);
    assert.equal(new Set(keys).size, keys.length);
    const order = memberLines.map((l) => MEMBER_ORDER.indexOf(l.category as MemberCategory));
    assert.deepEqual(order, [...order].sort((a, b) => a - b));
  });

  test(`${tpl.id}: the cut list covers every member exactly once, numbered 1..n`, () => {
    const { framing, cutList } = buildModel(tpl.build());
    const ids = cutList.flatMap((c) => c.memberIds);
    assert.equal(cutList.reduce((s, c) => s + c.quantity, 0), framing.members.length);
    assert.equal(new Set(ids).size, framing.members.length);
    assert.deepEqual(cutList.map((c) => c.pos), cutList.map((_, i) => i + 1));
    for (const c of cutList) assert.equal(c.quantity, c.memberIds.length);
  });

  test(`${tpl.id}: materials use whole pieces, centimetre-rounded m/m² and no duplicates`, () => {
    const project = canonicalProject(tpl.build());
    const materials = collectMaterials(project, buildFramingCanonical(project));
    assert.equal(new Set(materials.map((m) => m.id)).size, materials.length);
    for (const m of materials) {
      assert.ok(m.quantity > 0, m.id);
      if (m.unit === 'pcs') assert.ok(Number.isInteger(m.quantity), m.id);
      else near(m.quantity, Math.round(m.quantity * 100) / 100);
    }
  });
}

test('roof edge trim is the roof perimeter in metres plus 10 %', () => {
  const project = canonicalProject(PROJECT_TEMPLATES[0].build());
  const framing = buildFramingCanonical(project);
  const roof = framing.panels.find((p) => p.kind === 'roof');
  assert.ok(roof?.size);
  const [a, b] = roof.size;
  const trim = collectMaterials(project, framing).find((m) => m.id === 'roof-trim');
  assert.equal(trim?.quantity, Math.round(((2 * (a + b)) / 1000) * 1.1 * 100) / 100);
});

test('fixtures list doors and windows on closed walls only, never passages', () => {
  const project = PROJECT_TEMPLATES.find((t) => t.id === 'garden-shed')!.build();
  const onClosed = Object.values(project.walls).filter((w) => w.closed).flatMap((w) => w.openings).filter((o) => o.type !== 'passage');
  assert.ok(onClosed.length > 0);
  assert.deepEqual(collectFixtures(project).map((f) => f.openingId).sort(), onClosed.map((o) => o.id).sort());

  const wallId = Object.values(project.walls).find((w) => w.openings.length > 0)!.id;
  const opened = { ...project, walls: { ...project.walls, [wallId]: { ...project.walls[wallId], closed: false } } };
  assert.ok(collectFixtures(opened).every((f) => !project.walls[wallId].openings.some((o) => o.id === f.openingId)));
  const passage = { ...project, walls: { ...project.walls, [wallId]: { ...project.walls[wallId], openings: project.walls[wallId].openings.map((o) => ({ ...o, type: 'passage' as const })) } } };
  assert.equal(collectFixtures(passage).length, collectFixtures(opened).length);
});
