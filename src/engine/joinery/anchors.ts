import type { Member, Vec3 } from '@/types';
import { add, cross, dot, normalize, scale, sub } from '../geometry';

/** Maximum distance between frame anchors along a bottom plate (mm). */
export const PLATE_ANCHOR_SPACING = 800;
/** Distance of the first / last anchor from a plate end (mm). */
export const PLATE_ANCHOR_END = 150;
/** Clearance kept between an anchor and the face of a stud standing on the plate (mm). */
const STUD_CLEARANCE = 25;

export interface PlateAnchor {
  /** Centre of the anchor head on the top face of the plate (mm) */
  position: Vec3;
  plateId: string;
}

export interface PostBase {
  postId: string;
  /** Centre of the post foot (mm) */
  position: Vec3;
  /** Horizontal axis the side flanges face along (post section width) */
  flangeAxis: Vec3;
  /** Horizontal axis across the flanges (post section height) */
  depthAxis: Vec3;
  width: number;
  depth: number;
}

export const isBottomPlate = (m: Member): boolean => m.category === 'plate' && m.nameDe === 'Schwelle';

/** Evenly spaced anchor offsets along a plate: ends inset, at most PLATE_ANCHOR_SPACING apart, at least two. */
export function plateAnchorOffsets(length: number): number[] {
  const end = Math.min(PLATE_ANCHOR_END, length / 4);
  const run = length - 2 * end;
  const n = Math.max(2, Math.ceil(run / PLATE_ANCHOR_SPACING) + 1);
  return Array.from({ length: n }, (_, i) => end + (run * i) / (n - 1));
}

/** Moves an offset out of the stud footprints, to the nearest free side still on the plate. */
function clearOfStuds(offset: number, blocked: [number, number][], length: number): number {
  const hit = blocked.find(([a, b]) => offset > a && offset < b);
  if (!hit) return offset;
  const candidates = [hit[0], hit[1]].filter((c) => c >= 30 && c <= length - 30 && !blocked.some(([a, b]) => c > a && c < b));
  if (candidates.length === 0) return offset;
  return candidates.reduce((best, c) => (Math.abs(c - offset) < Math.abs(best - offset) ? c : best));
}

/** Frame anchors (Rahmendübel) on every bottom plate, placed between the studs standing on it. */
export function plateAnchors(members: Member[]): PlateAnchor[] {
  const studs = members.filter((m) => m.category === 'stud');
  const out: PlateAnchor[] = [];
  for (const plate of members.filter(isBottomPlate)) {
    const dir = normalize(plate.direction);
    const top = add(plate.start, scale(normalize(plate.up), plate.section.height / 2));
    const blocked: [number, number][] = studs
      .filter((s) => s.wallId === plate.wallId && s.partitionId === plate.partitionId)
      .map((s) => {
        const rel = sub(s.start, plate.start);
        const along = dot(rel, dir);
        const half = s.section.height / 2 + STUD_CLEARANCE;
        return [along - half, along + half] as [number, number];
      })
      .filter(([a, b]) => b > 0 && a < plate.length);
    for (const offset of plateAnchorOffsets(plate.length)) {
      out.push({ plateId: plate.id, position: add(top, scale(dir, clearOfStuds(offset, blocked, plate.length))) });
    }
  }
  return out;
}

/** Post bases (Pfostenträger) under every post standing on the base. In a closed wall the U-flanges face the wall normal so they clear the bottom plates. */
export function postBases(members: Member[]): PostBase[] {
  const wallDirection = new Map<string, Vec3>();
  for (const plate of members.filter(isBottomPlate)) if (plate.wallId && !wallDirection.has(plate.wallId)) wallDirection.set(plate.wallId, normalize(plate.direction));
  return members
    .filter((m) => m.category === 'post' && Math.abs(m.start.y) < 1)
    .map((m) => {
      const across = normalize(cross(m.direction, m.up));
      const along = normalize(m.up);
      const wall = m.wallId ? wallDirection.get(m.wallId) : undefined;
      // flanges on the faces pointing along `across` unless that is the wall direction
      const turn = wall !== undefined && Math.abs(dot(wall, across)) > 0.5;
      return {
        postId: m.id,
        position: m.start,
        flangeAxis: turn ? along : across,
        depthAxis: turn ? across : along,
        width: turn ? m.section.height : m.section.width,
        depth: turn ? m.section.width : m.section.height,
      };
    });
}
