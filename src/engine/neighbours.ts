/**
 * Neighbour distance analysis.
 *
 * Every member is approximated by its oriented bounding box (OBB) in world space:
 * the profile's (u, v) extent along `direction` / `up`, and the section width along
 * `direction × up`. For a pair of boxes we compute the clear gap (face to face) plus
 * the axis distance, which is what matters on site — stud and rafter spacing is given
 * centre to centre, clearances are given as clear openings ("lichte Weite").
 */
import type { Member, Millimeters, NeighbourLink, Vec3 } from '@/types';
import { cross, dot, len, normalize, sub } from './geometry';

export interface Obb {
  centre: Vec3;
  /** Orthonormal axes: [along length, along section height, along section width] */
  axes: [Vec3, Vec3, Vec3];
  /** Half sizes along the matching axes (mm) */
  half: [number, number, number];
}

export function memberObb(member: Member): Obb {
  const d = normalize(member.direction);
  const up = normalize(member.up);
  const n = normalize(cross(d, up));
  let uMin = Infinity;
  let uMax = -Infinity;
  let vMin = Infinity;
  let vMax = -Infinity;
  for (const p of member.profile) {
    if (p.u < uMin) uMin = p.u;
    if (p.u > uMax) uMax = p.u;
    if (p.v < vMin) vMin = p.v;
    if (p.v > vMax) vMax = p.v;
  }
  if (!Number.isFinite(uMin)) {
    uMin = 0;
    uMax = member.length;
    vMin = 0;
    vMax = member.section.height;
  }
  const cu = (uMin + uMax) / 2;
  const cv = (vMin + vMax) / 2;
  return {
    centre: {
      x: member.start.x + d.x * cu + up.x * cv,
      y: member.start.y + d.y * cu + up.y * cv,
      z: member.start.z + d.z * cu + up.z * cv,
    },
    axes: [d, up, n],
    half: [(uMax - uMin) / 2, (vMax - vMin) / 2, member.section.width / 2],
  };
}

/** Closest point to `p` inside (or on) the box. */
function closestPointOnObb(box: Obb, p: Vec3): Vec3 {
  const rel = sub(p, box.centre);
  let out = { ...box.centre };
  for (let i = 0; i < 3; i++) {
    const axis = box.axes[i];
    const h = box.half[i];
    const t = Math.max(-h, Math.min(h, dot(rel, axis)));
    out = { x: out.x + axis.x * t, y: out.y + axis.y * t, z: out.z + axis.z * t };
  }
  return out;
}

/**
 * Closest pair of points between two boxes by alternating projection — it converges
 * to the true nearest points for disjoint convex bodies and returns coincident points
 * when they touch or overlap.
 */
export function obbClosestPoints(a: Obb, b: Obb): { a: Vec3; b: Vec3; gap: number } {
  let pb = b.centre;
  let pa = closestPointOnObb(a, pb);
  let gap = Infinity;
  for (let i = 0; i < 24; i++) {
    pb = closestPointOnObb(b, pa);
    pa = closestPointOnObb(a, pb);
    const next = len(sub(pb, pa));
    if (Math.abs(gap - next) < 0.05) {
      gap = next;
      break;
    }
    gap = next;
  }
  return { a: pa, b: pb, gap };
}

/** Perpendicular distance between the two member axes when they run parallel. */
function parallelAxisDistance(a: Obb, b: Obb): number {
  const delta = sub(b.centre, a.centre);
  const along = dot(delta, a.axes[0]);
  const perp = { x: delta.x - a.axes[0].x * along, y: delta.y - a.axes[0].y * along, z: delta.z - a.axes[0].z * along };
  return len(perp);
}

export interface NeighbourOptions {
  /** Only report neighbours whose clear gap is at most this (mm) */
  radius: Millimeters;
  /** Cap the number of reported neighbours (nearest first) */
  limit: number;
  /** Restrict to members that touch the selected one (gap ≈ 0) */
  touchingOnly?: boolean;
}

export const NEIGHBOUR_DEFAULTS: NeighbourOptions = { radius: 1200, limit: 8 };

/** Nearest neighbours of `memberId`, sorted by clear gap then centre distance. */
export function findNeighbours(members: Member[], memberId: string, options: NeighbourOptions): NeighbourLink[] {
  const subject = members.find((m) => m.id === memberId);
  if (!subject) return [];
  const box = memberObb(subject);
  const links: NeighbourLink[] = [];

  for (const other of members) {
    if (other.id === memberId) continue;
    const otherBox = memberObb(other);
    const centreDistance = len(sub(otherBox.centre, box.centre));
    // cheap reject: bounding spheres cannot be closer than this
    const reach = len({ x: box.half[0], y: box.half[1], z: box.half[2] }) + len({ x: otherBox.half[0], y: otherBox.half[1], z: otherBox.half[2] });
    if (centreDistance - reach > options.radius) continue;

    const near = obbClosestPoints(box, otherBox);
    if (near.gap > options.radius) continue;
    if (options.touchingOnly && near.gap > 1) continue;

    const parallel = Math.abs(dot(box.axes[0], otherBox.axes[0])) > 0.999;
    links.push({
      memberId: other.id,
      name: other.name,
      nameDe: other.nameDe,
      category: other.category,
      gap: Math.round(near.gap),
      axisDistance: Math.round(parallel ? parallelAxisDistance(box, otherBox) : centreDistance),
      parallel,
      a: near.a,
      b: near.b,
    });
  }

  const byGap = (x: NeighbourLink, y: NeighbourLink): number => x.gap - y.gap || x.axisDistance - y.axisDistance;
  links.sort(byGap);

  // Members that touch the subject (joints) can easily fill every slot, yet the number a
  // carpenter looks for first is the spacing to the parallel members either side — reserve
  // slots for the two closest of those before filling the rest by gap.
  const parallelPicks = links
    .filter((l) => l.parallel)
    .sort((x, y) => x.axisDistance - y.axisDistance)
    .slice(0, Math.min(2, options.limit));
  const picked = new Set(parallelPicks.map((l) => l.memberId));
  for (const link of links) {
    if (picked.size >= options.limit) break;
    picked.add(link.memberId);
  }
  return links.filter((l) => picked.has(l.memberId)).sort(byGap);
}

export interface StudSpacing {
  memberId: string;
  name: string;
  /** -1 towards the wall start, +1 towards the wall end (the stud's `up` axis) */
  side: -1 | 1;
  /** Clear gap face to face along the wall (mm) */
  clear: Millimeters;
  /** Centre-to-centre spacing along the wall (mm) */
  centres: Millimeters;
  /** Face of the stud and face of the neighbour the gap is measured between (mm, world) */
  a: Vec3;
  b: Vec3;
}

/** Half size of a box projected onto `axis`. */
const reachAlong = (box: Obb, axis: Vec3): number => box.axes.reduce((sum, a, i) => sum + Math.abs(dot(a, axis)) * box.half[i], 0);

/**
 * The nearest upright member on either side of a stud, measured along its wall: studs, king and
 * jack studs, end studs and posts that stand in the same wall plane and share part of its height.
 */
export function studSpacing(members: Member[], studId: string): StudSpacing[] {
  const stud = members.find((m) => m.id === studId);
  if (!stud) return [];
  const box = memberObb(stud);
  const [vertical, along, across] = box.axes;
  const bottom = box.centre.y - box.half[0];
  const top = box.centre.y + box.half[0];
  const best = new Map<-1 | 1, StudSpacing>();

  for (const other of members) {
    if (other.id === studId) continue;
    const otherBox = memberObb(other);
    if (Math.abs(dot(otherBox.axes[0], vertical)) < 0.999) continue;
    const delta = sub(otherBox.centre, box.centre);
    // same wall plane: the two boxes overlap across the wall
    if (Math.abs(dot(delta, across)) > box.half[2] + reachAlong(otherBox, across)) continue;
    // share part of the height
    const oReach = reachAlong(otherBox, vertical);
    const overlapBottom = Math.max(bottom, otherBox.centre.y - oReach);
    const overlapTop = Math.min(top, otherBox.centre.y + oReach);
    if (overlapTop - overlapBottom < 1) continue;

    const offset = dot(delta, along);
    const clear = Math.abs(offset) - box.half[1] - reachAlong(otherBox, along);
    if (clear < -1) continue;
    const side: -1 | 1 = offset < 0 ? -1 : 1;
    const current = best.get(side);
    if (current && current.clear <= clear) continue;

    const y = Math.min(Math.max(box.centre.y, overlapBottom), overlapTop);
    const face = (distance: number): Vec3 => ({ x: box.centre.x + along.x * distance, y, z: box.centre.z + along.z * distance });
    best.set(side, {
      memberId: other.id,
      name: other.name,
      side,
      clear: Math.max(0, Math.round(clear)),
      centres: Math.round(Math.abs(offset)),
      a: face(side * box.half[1]),
      b: face(side * (box.half[1] + Math.max(0, clear))),
    });
  }
  return [best.get(-1), best.get(1)].filter((s): s is StudSpacing => Boolean(s));
}
