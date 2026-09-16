import type { FramingWarning, Member, MemberCategory, Opening, OpeningHost, Panel, ProfilePoint, StructureParams, Wall, WallId } from '@/types';
import { cutProfile, nextId, profileArea, rectProfile, Y_AXIS } from '../geometry';
import { floorLayout } from './floor';
import { headerHeight, validateOpenings } from './openings';
import type { RoofLines } from './roofLines';
import { wallBays, type WallFrame } from './wallFrame';

export const CLADDING_THICKNESS = 20;
const MIN_CRIPPLE = 80;

export interface WallBuild {
  members: Member[];
  panel?: Panel;
  warnings: FramingWarning[];
}

/**
 * Stud framing for a closed wall: bottom plate (Schwelle), studs (Ständer), king/jack studs,
 * headers (Sturz), window sills (Brüstungsriegel), cripples, plus the sloped side rail (Rähm)
 * on side walls and the cladding panel with cut-outs. Interior partitions additionally get
 * end studs and a top plate (Rähm) under the rafters.
 */
export function generateWallFraming(
  frame: WallFrame,
  wall: OpeningHost,
  walls: Record<WallId, Wall>,
  params: StructureParams,
  roof: RoofLines,
): WallBuild {
  const warnings = validateOpenings(frame, wall, params);
  if (!wall.closed) return { members: [], warnings };

  const { timber } = params;
  const sw = timber.stud.width; // along the wall
  const sd = timber.stud.height; // wall depth
  const sillTop = sw; // bottom plate laid flat
  const pitch = frame.sloped ? roof.pitchDeg : 0;
  const tan = frame.sloped ? roof.tan : 0;
  const members: Member[] = [];
  const wallLabel = frame.label;
  const isPartition = frame.kind === 'partition';
  const ref = { wallId: frame.wallId, partitionId: frame.partitionId };

  const stud = (
    u: number,
    vBottom: number,
    vTopCentre: number,
    name: string,
    nameDe: string,
    group: string,
    category: MemberCategory = 'stud',
  ): void => {
    const axis = vTopCentre - vBottom;
    if (axis < MIN_CRIPPLE) return;
    const profile = frame.sloped ? cutProfile(axis, sw, 0, -pitch) : rectProfile(axis, sw);
    members.push({
      id: nextId('stud'),
      category,
      name,
      nameDe,
      group,
      section: { width: sd, height: sw },
      length: Math.round(axis + (sw / 2) * tan),
      start: frame.toWorld(u, vBottom),
      direction: Y_AXIS,
      up: frame.u,
      cuts: { start: 0, end: round1(pitch) },
      profile,
      ...ref,
      notes: frame.sloped ? 'Top cut to roof slope' : undefined,
    });
  };

  const horizontal = (
    uStart: number,
    uEnd: number,
    vCentre: number,
    height: number,
    category: MemberCategory,
    name: string,
    nameDe: string,
    group: string,
    notes?: string,
  ): void => {
    const length = uEnd - uStart;
    if (length < 20) return;
    members.push({
      id: nextId(category),
      category,
      name,
      nameDe,
      group,
      section: { width: sd, height },
      length: Math.round(length),
      start: frame.toWorld(uStart, vCentre),
      direction: frame.u,
      up: Y_AXIS,
      cuts: { start: 0, end: 0 },
      profile: rectProfile(length, height),
      ...ref,
      notes,
    });
  };

  // Partition end studs (against the outer wall / post) and its top plate
  if (isPartition) {
    stud(sw / 2, sillTop, frame.studTopAt(sw / 2), `End stud ${wallLabel}`, 'Eckständer', 'End stud (Eckständer)');
    stud(frame.length - sw / 2, sillTop, frame.studTopAt(frame.length - sw / 2), `End stud ${wallLabel}`, 'Eckständer', 'End stud (Eckständer)');
    if (!frame.sloped) {
      horizontal(0, frame.length, frame.studTopAt(0) + sw / 2, sw, 'plate', `Top plate ${wallLabel}`, 'Rähm', 'Top plate (Rähm)', 'Under the rafters');
    } else {
      const axisLength = frame.length / roof.cos;
      members.push({
        id: nextId('plate'),
        category: 'plate',
        name: `Top plate ${wallLabel}`,
        nameDe: 'Rähm',
        group: 'Top plate (Rähm)',
        section: { width: sd, height: sw },
        length: Math.round(axisLength),
        start: frame.toWorld(0, frame.studTopAt(0) + sw / 2 / roof.cos),
        direction: { x: 0, y: -roof.sin, z: roof.cos },
        up: { x: 0, y: roof.cos, z: roof.sin },
        cuts: { start: round1(pitch), end: round1(pitch) },
        profile: cutProfile(axisLength, sw, pitch, -pitch),
        ...ref,
        notes: 'Sloped under the rafters',
      });
    }
  }

  const floor = floorLayout(params);
  const bays = wallBays(frame);
  for (const bay of bays) {
    const span = bay.end - bay.start;
    // End studs where a shortened outer wall stops inside a bay
    if (bay.startStud) stud(bay.start - sw / 2, sillTop, frame.studTopAt(bay.start - sw / 2), `End stud ${wallLabel}`, 'Eckständer', 'End stud (Eckständer)');
    if (bay.endStud) stud(bay.end + sw / 2, sillTop, frame.studTopAt(bay.end + sw / 2), `End stud ${wallLabel}`, 'Eckständer', 'End stud (Eckständer)');
    if (span < sw) continue;
    const openings = wall.openings
      .filter((o) => {
        const c = o.x + o.width / 2;
        return c >= bay.start && c <= bay.end;
      })
      .sort((a, b) => a.x - b.x);

    // Bottom plate – interrupted at doors / passages
    const cuts = openings.filter((o) => o.type !== 'window').map((o) => [o.x, o.x + o.width] as const);
    let cursor = bay.start;
    for (const [a, b] of cuts) {
      horizontal(cursor, Math.min(a, bay.end), sillTop / 2, sw, 'plate', `Bottom plate ${wallLabel}`, 'Schwelle', 'Bottom plate (Schwelle)');
      cursor = Math.max(cursor, b);
    }
    horizontal(cursor, bay.end, sillTop / 2, sw, 'plate', `Bottom plate ${wallLabel}`, 'Schwelle', 'Bottom plate (Schwelle)');
    // With a timber floor the plate gap would leave a hole through the wall: fill it up to the finished floor
    if (floor) {
      const top = Math.round(floor.deckTop);
      for (const [a, b] of cuts) {
        horizontal(Math.max(a, bay.start), Math.min(b, bay.end), top / 2, top, 'plate', `Door threshold ${wallLabel}`, 'Türschwelle', 'Door threshold (Türschwelle)', 'Top flush with the finished floor');
      }
    }

    // Regular stud grid
    const n = Math.max(1, Math.ceil(span / Math.max(params.maxStudSpacing, 200)));
    const spacing = span / n;
    const grid: number[] = [];
    for (let k = 1; k < n; k++) grid.push(bay.start + k * spacing);

    const blocked = (u: number): boolean =>
      openings.some((o) => u > o.x - 2 * sw - sw / 2 && u < o.x + o.width + 2 * sw + sw / 2);

    for (const u of grid) {
      if (blocked(u)) continue;
      stud(u, sillTop, frame.studTopAt(u), `Stud ${wallLabel}`, 'Ständer', 'Stud (Ständer)');
    }

    // Opening framing
    for (const o of openings) {
      frameOpening(o, bay, grid);
    }
  }

  function frameOpening(o: Opening, bay: { start: number; end: number }, grid: number[]): void {
    const label = o.label ?? (o.type === 'door' ? 'Door' : o.type === 'window' ? 'Window' : 'Passage');
    const left = o.x;
    const right = o.x + o.width;
    const top = o.y + o.height;
    const hasLeftRoom = left - 2 * sw >= bay.start - 0.5;
    const hasRightRoom = right + 2 * sw <= bay.end + 0.5;
    const hh = Math.min(headerHeight(o.width), frame.studTopAt(right) - top);
    if (hh < 60) {
      warnings.push({
        level: 'error',
        message: `${label} on ${wallLabel} wall: no room for the header – reduce the opening height.`,
        ...ref,
        openingId: o.id,
      });
    }

    // King studs (full height) and jack studs (to header underside)
    if (hasLeftRoom) {
      stud(left - 1.5 * sw, sillTop, frame.studTopAt(left - 1.5 * sw), `King stud ${label}`, 'Sturzpfosten', 'King stud (Sturzpfosten)');
    }
    if (hasRightRoom) {
      stud(right + 1.5 * sw, sillTop, frame.studTopAt(right + 1.5 * sw), `King stud ${label}`, 'Sturzpfosten', 'King stud (Sturzpfosten)');
    }
    if (left - sw >= bay.start - 0.5) {
      stud(left - sw / 2, sillTop, top, `Jack stud ${label}`, 'Kurzstiel', 'Jack stud (Kurzstiel)', 'stud');
    }
    if (right + sw <= bay.end + 0.5) {
      stud(right + sw / 2, sillTop, top, `Jack stud ${label}`, 'Kurzstiel', 'Jack stud (Kurzstiel)', 'stud');
    }

    // Header
    if (hh >= 60) {
      const hStart = Math.max(left - sw, bay.start);
      const hEnd = Math.min(right + sw, bay.end);
      horizontal(hStart, hEnd, top + hh / 2, hh, 'header', `Header ${label}`, 'Sturz', 'Header (Sturz)', `Over ${label} ${o.width} mm`);
      // Cripples above the header
      for (const u of grid) {
        if (u < left + sw / 2 || u > right - sw / 2) continue;
        stud(u, top + hh, frame.studTopAt(u), `Cripple ${label}`, 'Zwischenstiel', 'Cripple stud (Zwischenstiel)');
      }
    }

    // Window sill and cripples below
    if (o.type === 'window' && o.y - sw > sillTop) {
      horizontal(left, right, o.y - sw / 2, sw, 'sill', `Sill ${label}`, 'Brüstungsriegel', 'Window sill (Brüstungsriegel)');
      for (const u of grid) {
        if (u < left + sw / 2 || u > right - sw / 2) continue;
        stud(u, sillTop, o.y - sw, `Cripple below ${label}`, 'Zwischenstiel', 'Cripple stud (Zwischenstiel)');
      }
    }
  }

  // Rail (Rähm) on outer walls without a purlin – one piece per purlin bay.
  // classic: sloped along the side walls between the purlins; sloped-purlins: level along the
  // front / rear walls between the purlin rows.
  if (!isPartition && !frame.hasPurlin) {
    const bw = timber.beam.width;
    const bh = timber.beam.height;
    const rowU = frame.sloped ? roof.purlins.map((p) => p.z) : [frame.postU[0], ...roof.midPurlinX, frame.postU[frame.postU.length - 1]];
    for (let k = 0; k < rowU.length - 1; k++) {
      const uA = Math.max(rowU[k] + bw / 2, frame.extent.start);
      const uB = Math.min(rowU[k + 1] - bw / 2, frame.extent.end);
      if (uB - uA <= 100) continue;
      const name = rowU.length > 2 ? `Side rail ${wallLabel} (part ${k + 1})` : `Side rail ${wallLabel}`;
      if (!frame.sloped) {
        const length = uB - uA;
        members.push({
          id: nextId('rail'),
          category: 'beam',
          name,
          nameDe: 'Rähm',
          group: 'Side rail (Rähm)',
          section: { width: bw, height: bh },
          length: Math.round(length),
          start: frame.toWorld(uA, frame.studTopAt(uA) + bh / 2),
          direction: frame.u,
          up: Y_AXIS,
          cuts: { start: 0, end: 0 },
          profile: rectProfile(length, bh),
          ...ref,
          notes: 'Level under the rafters, between the purlin rows',
        });
        continue;
      }
      const axisLength = (uB - uA) / roof.cos;
      const startWorld = frame.toWorld(uA, roof.bottomAt(uA) - bh / 2 / roof.cos);
      members.push({
        id: nextId('rail'),
        category: 'beam',
        name,
        nameDe: 'Rähm',
        group: 'Side rail (Rähm)',
        section: { width: bw, height: bh },
        length: Math.round(axisLength),
        start: startWorld,
        direction: { x: 0, y: -roof.sin, z: roof.cos },
        up: { x: 0, y: roof.cos, z: roof.sin },
        cuts: { start: round1(pitch), end: round1(pitch) },
        profile: cutProfile(axisLength, bh, pitch, -pitch),
        ...ref,
        notes: 'Plumb cuts against purlins',
      });
    }
  }

  // Cladding panel
  const th = CLADDING_THICKNESS;
  let uStart = frame.extent.start;
  let uEnd = frame.extent.end;
  if (frame.sloped && !isPartition) {
    // Side cladding wraps the corner only where the front / rear wall actually reaches it
    const cornerU = frame.wallId === 'left' ? 0 : params.length;
    const reaches = (w: Wall): boolean => w.closed && (cornerU === 0 ? (w.start ?? 0) <= 0.5 : w.end === undefined || w.end >= params.length - 0.5);
    if (uStart <= 0.5 && reaches(walls.front)) uStart = -th;
    if (uEnd >= frame.length - 0.5 && reaches(walls.rear)) uEnd = frame.length + th;
  }
  const outer: ProfilePoint[] = [
    { u: uStart, v: 0 },
    { u: uEnd, v: 0 },
    { u: uEnd, v: frame.claddingTopAt(uEnd) - 5 },
    { u: uStart, v: frame.claddingTopAt(uStart) - 5 },
  ];
  const holes: ProfilePoint[][] = wall.openings.map((o) => [
    { u: o.x, v: o.y },
    { u: o.x + o.width, v: o.y },
    { u: o.x + o.width, v: o.y + o.height },
    { u: o.x, v: o.y + o.height },
  ]);
  const grossArea = profileArea(outer) / 1e6;
  const holeArea = holes.reduce((s, h) => s + profileArea(h) / 1e6, 0);
  const panel: Panel = {
    id: `cladding-${frame.id}`,
    kind: 'cladding',
    ...ref,
    anchor: frame.origin,
    direction: frame.u,
    up: frame.v,
    normal: frame.normal,
    outline: { outer, holes, thickness: th },
    areaM2: Math.max(grossArea - holeArea, 0),
  };

  return { members, panel, warnings };
}

function round1(value: number): number {
  return Math.round(Math.abs(value) * 10) / 10;
}
