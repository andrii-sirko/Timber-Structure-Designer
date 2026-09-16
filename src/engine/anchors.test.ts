import assert from 'node:assert/strict';
import test from 'node:test';
import { buildModel } from './index.ts';
import { isBottomPlate, plateAnchorOffsets, plateAnchors, PLATE_ANCHOR_SPACING, postBases } from './joinery/anchors.ts';
import { dot, normalize, sub } from './geometry.ts';
import { PROJECT_TEMPLATES, createDefaultProject } from '../store/defaults.ts';

test('plate anchor offsets: at least two, ends inset, never more than the max spacing apart', () => {
  assert.deepEqual(plateAnchorOffsets(300), [75, 225]);
  for (const length of [600, 1000, 2400, 5970]) {
    const offsets = plateAnchorOffsets(length);
    assert.ok(offsets.length >= 2);
    assert.equal(offsets[0], 150);
    assert.equal(offsets.at(-1), length - 150);
    for (let i = 1; i < offsets.length; i++) assert.ok(offsets[i] - offsets[i - 1] <= PLATE_ANCHOR_SPACING + 1e-6);
  }
});

test('frame anchors sit on the bottom plates and match the BOM count', () => {
  const projects = [createDefaultProject(), ...PROJECT_TEMPLATES.map((t) => t.build())];
  for (const project of projects) {
    const model = buildModel(project);
    const members = model.framing.members;
    const plates = members.filter(isBottomPlate);
    const anchors = plateAnchors(members);
    const bom = model.connections.hardware.find((h) => h.id === 'plate-anchor');
    assert.equal(bom?.quantity ?? 0, anchors.length);
    for (const a of anchors) {
      const plate = plates.find((p) => p.id === a.plateId)!;
      const along = dot(sub(a.position, plate.start), normalize(plate.direction));
      assert.ok(along > 0 && along < plate.length);
      assert.ok(Math.abs(a.position.y - plate.start.y - plate.section.height / 2) < 1e-6);
    }
  }
});

test('every post standing on the base gets a post base', () => {
  const model = buildModel(createDefaultProject());
  const posts = model.framing.members.filter((m) => m.category === 'post');
  assert.equal(postBases(model.framing.members).length, posts.length);
});
