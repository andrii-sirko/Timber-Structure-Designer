import assert from 'node:assert/strict';
import test from 'node:test';
import type { Member, ProjectState, RoofDirection, RoofScheme, WallId } from '../types/index.ts';
import { createDefaultProject } from '../store/defaults.ts';
import { buildFraming, computeAllWallFrames, wallExtent } from './index.ts';
import { wallBays } from './framing/index.ts';

const DIRS: RoofDirection[] = ['rear', 'front', 'left', 'right'];
const SCHEMES: RoofScheme[] = ['classic', 'sloped-purlins'];

function project(dir: RoofDirection, scheme: RoofScheme): ProjectState {
  const p = createDefaultProject();
  p.params = { ...p.params, length: 6000, width: 4000, roofDirection: dir, roofScheme: scheme };
  for (const id of Object.keys(p.walls) as WallId[]) p.walls[id] = { id, closed: false, openings: [] };
  p.partitions = [];
  return p;
}

const wallMembers = (members: Member[], id: WallId): Member[] => members.filter((m) => m.wallId === id);
const along = (id: WallId, m: Member): number => (id === 'front' || id === 'rear' ? m.start.x : m.start.z);

test('wallExtent clamps, snaps and keeps the minimum length', () => {
  assert.deepEqual(wallExtent({}, 5000), { start: 0, end: 5000 });
  assert.deepEqual(wallExtent({ start: 1234, end: 3456 }, 5000), { start: 1230, end: 3460 });
  assert.deepEqual(wallExtent({ start: 4900 }, 5000), { start: 4700, end: 5000 });
  assert.deepEqual(wallExtent({ start: 2000, end: 2100 }, 5000), { start: 2000, end: 2300 });
});

test('a shortened wall is framed and clad only over its closed stretch, in every orientation', () => {
  for (const scheme of SCHEMES) {
    for (const dir of DIRS) {
      for (const id of ['front', 'left'] as WallId[]) {
        const p = project(dir, scheme);
        const span = id === 'front' ? p.params.length : p.params.width;
        p.walls[id] = { id, closed: true, openings: [], start: 1000, end: span - 700 };
        const framing = buildFraming(p);
        const members = wallMembers(framing.members, id);
        const where = `${scheme}/${dir}/${id}`;
        assert.ok(members.length > 0, where);
        for (const m of members.filter((mm) => mm.category === 'stud')) {
          const u = along(id, m);
          assert.ok(u > 1000 - 1 && u < span - 700 + 1, `${where}: stud at ${u}`);
        }
        const ends = members.filter((m) => m.group === 'End stud (Eckständer)').map((m) => Math.round(along(id, m)));
        assert.ok(ends.length === 2, `${where}: end studs ${ends}`);

        const frame = computeAllWallFrames(p)[id];
        assert.deepEqual(frame.extent, { start: 1000, end: span - 700 }, where);
        const bays = wallBays(frame);
        assert.ok(bays[0]?.startStud && bays.at(-1)?.endStud, where);
        const panel = framing.panels.find((pn) => pn.wallId === id && pn.kind === 'cladding');
        assert.ok(panel, where);
        const us = (panel?.outline?.outer ?? []).map((pt) => pt.u);
        assert.equal(Math.max(...us) - Math.min(...us), span - 1700, `${where}: cladding width`);
      }
    }
  }
});

test('openings on a shortened wall are kept inside its closed stretch', () => {
  const p = project('rear', 'classic');
  p.walls.front = { id: 'front', closed: true, openings: [], start: 3000 };
  const frame = computeAllWallFrames(p).front;
  for (const bay of wallBays(frame)) assert.ok(bay.start >= 3000, `bay starts at ${bay.start}`);
});
