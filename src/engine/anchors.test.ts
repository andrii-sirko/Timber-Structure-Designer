import assert from 'node:assert/strict';
import test from 'node:test';
import { buildModel } from './index.ts';
import { endStudBrackets, isBottomPlate, plateAnchorOffsets, plateAnchors, PLATE_ANCHOR_SPACING, postBases } from './joinery/anchors.ts';
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

test('end studs of shortened walls and partitions stand on an anchored bottom plate', () => {
  const project = createDefaultProject();
  project.walls.front = { ...project.walls.front, closed: true, start: 1000, end: project.params.length - 700 };
  project.walls.left = { ...project.walls.left, closed: true, end: project.params.width - 800 };
  const members = buildModel(project).framing.members;
  const plates = members.filter(isBottomPlate);
  const anchors = plateAnchors(members);
  const endStuds = members.filter((m) => m.nameDe === 'Eckständer');
  assert.ok(endStuds.filter((s) => s.wallId).length >= 3);
  for (const stud of endStuds) {
    const carrier = plates.find((p) => {
      if (p.wallId !== stud.wallId || p.partitionId !== stud.partitionId) return false;
      const along = dot(sub(stud.start, p.start), normalize(p.direction));
      return along - stud.section.height / 2 >= -1e-6 && along + stud.section.height / 2 <= p.length + 1e-6;
    });
    assert.ok(carrier, `${stud.name} has no bottom plate under it`);
    const nearest = Math.min(...anchors.filter((a) => a.plateId === carrier.id).map((a) => Math.hypot(a.position.x - stud.start.x, a.position.z - stud.start.z)));
    assert.ok(nearest < 250, `${stud.name}: nearest anchor ${Math.round(nearest)} mm away`);
  }
});

test('free end studs of shortened outer walls get an angle bracket on their open face, counted in the BOM', () => {
  const project = createDefaultProject();
  project.walls.front = { ...project.walls.front, closed: true, start: 1000, end: project.params.length - 700 };
  project.walls.left = { ...project.walls.left, closed: true, end: project.params.width - 800 };
  const model = buildModel(project);
  const members = model.framing.members;
  const endStuds = members.filter((m) => m.nameDe === 'Eckständer' && m.wallId && !m.partitionId);
  const brackets = endStudBrackets(members);
  assert.equal(brackets.length, endStuds.length);
  assert.ok(brackets.length >= 3);
  for (const b of brackets) {
    const stud = members.find((m) => m.id === b.studId)!;
    const plate = members.find((p) => isBottomPlate(p) && p.wallId === stud.wallId && !p.partitionId)!;
    // on the stud face, on the slab under the plate, pointing away from the stud centre
    assert.ok(Math.abs(Math.hypot(b.position.x - stud.start.x, b.position.z - stud.start.z) - stud.section.height / 2) < 1e-6);
    assert.ok(Math.abs(b.position.y - (plate.start.y - plate.section.height / 2)) < 1e-6);
    assert.ok((b.position.x - stud.start.x) * b.outward.x + (b.position.z - stud.start.z) * b.outward.z > 0);
  }
  assert.equal(model.connections.hardware.find((h) => h.id === 'end-stud-bracket')?.quantity, brackets.length);
  assert.equal(endStudBrackets(buildModel(createDefaultProject()).framing.members).length, 0);
});
