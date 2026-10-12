import type { Member, Opening, ProfilePoint, WallCladding } from '@/types';
import { cutProfile, nextId, profileArea, rectProfile, Y_AXIS } from '../geometry';
import type { RoofLines } from './roofLines';
import { wallBays, type WallFrame } from './wallFrame';

/** Board layout of a wall that has none set: closed vertical boarding, as the walls always had. */
export const DEFAULT_WALL_CLADDING: WallCladding = { orientation: 'vertical', boardWidth: 120, gap: 0 };

/** Slat screen of an open bay that has no layout yet: horizontal slats with open gaps. */
export const DEFAULT_SCREEN_CLADDING: WallCladding = { orientation: 'horizontal', boardWidth: 70, gap: 20 };

/** Slat screens stop this far above the ground (mm), like their bottom rail. */
export const SCREEN_GROUND_GAP = 50;

/** Screen battens and rails, 40 mm deep behind the slats × 60 mm */
const BATTEN = { depth: 40, width: 60 } as const;
/** Width of a screen jamb or header rail – what an opening in a slat screen needs around it (mm) */
export const SCREEN_BATTEN_WIDTH = BATTEN.width;
/** Largest free span of a 20 mm slat between its supports (mm) */
const MAX_SLAT_SPAN = 800;
/** Largest vertical distance between the rails carrying vertical slats (mm) */
const MAX_RAIL_SPACING = 1200;

export const CLADDING_LIMITS = {
  boardWidth: [40, 300],
  gap: [0, 200],
} as const;

/** Pieces narrower than this (mm) are left out – a sliver at a cut-out or a sloped top is not fitted. */
const MIN_PIECE = 15;

interface Rect {
  u0: number;
  u1: number;
  v0: number;
  v1: number;
}

export function resolveCladding(cladding: Partial<WallCladding> | undefined, base: WallCladding = DEFAULT_WALL_CLADDING): WallCladding {
  const c = { ...base, ...cladding };
  const clamp = (x: number, [lo, hi]: readonly [number, number], fallback: number) => (Number.isFinite(x) ? Math.min(Math.max(x, lo), hi) : fallback);
  return {
    orientation: c.orientation === 'horizontal' ? 'horizontal' : 'vertical',
    boardWidth: clamp(c.boardWidth, CLADDING_LIMITS.boardWidth, DEFAULT_WALL_CLADDING.boardWidth),
    gap: clamp(c.gap, CLADDING_LIMITS.gap, 0),
  };
}

export function resolveScreenCladding(cladding: Partial<WallCladding> | undefined): WallCladding {
  return resolveCladding(cladding, DEFAULT_SCREEN_CLADDING);
}

/**
 * Sub-frame of a slat screen in an open bay (no studs, no plate): a bottom rail between the posts
 * SCREEN_GROUND_GAP above the ground (open at doors), a batten frame around every opening, then
 *  - horizontal slats: vertical battens so no slat spans more than MAX_SLAT_SPAN, plus one at
 *    each end of a screen that stops inside a bay;
 *  - vertical slats: further rails up to the purlin / side rail so the rails are ≤ MAX_RAIL_SPACING apart.
 * The slats are screwed to the posts, the battens and the purlin or side rail above.
 * Battens sit flush with the outer post face, the slats in front of them.
 */
export function screenBattens(frame: WallFrame, cladding: WallCladding, openings: Opening[], roof: RoofLines): Member[] {
  const members: Member[] = [];
  const ref = { wallId: frame.wallId, partitionId: frame.partitionId };
  const n = -BATTEN.depth / 2;
  const pitch = frame.sloped ? roof.pitchDeg : 0;
  const railTop = SCREEN_GROUND_GAP + BATTEN.width;

  const rail = (uA: number, uB: number, vCentre: number, name: string): void => {
    const length = uB - uA;
    if (length < 50) return;
    members.push({
      id: nextId('batten'),
      category: 'batten',
      name: `${name} ${frame.label}`,
      nameDe: 'Riegel',
      group: name === 'Screen bottom rail' ? 'Screen bottom rail (Riegel)' : 'Screen rail (Riegel)',
      section: { width: BATTEN.depth, height: BATTEN.width },
      length: Math.round(length),
      start: frame.toWorld(uA, vCentre, n),
      direction: frame.u,
      up: Y_AXIS,
      cuts: { start: 0, end: 0 },
      profile: rectProfile(length, BATTEN.width),
      ...ref,
    });
  };
  const batten = (u: number): void => {
    const axis = frame.studTopAt(u) - railTop;
    if (axis < 100) return;
    members.push({
      id: nextId('batten'),
      category: 'batten',
      name: `Screen batten ${frame.label}`,
      nameDe: 'Traglatte',
      group: 'Screen batten (Traglatte)',
      section: { width: BATTEN.depth, height: BATTEN.width },
      length: Math.round(axis + (BATTEN.width / 2) * (frame.sloped ? roof.tan : 0)),
      start: frame.toWorld(u, railTop, n),
      direction: Y_AXIS,
      up: frame.u,
      cuts: { start: 0, end: round1(Math.abs(pitch)) },
      profile: frame.sloped ? cutProfile(axis, BATTEN.width, 0, -pitch) : rectProfile(axis, BATTEN.width),
      ...ref,
      notes: frame.sloped ? 'Top cut to roof slope' : undefined,
    });
  };

  // A rail run from uA to uB with the stretches in `cuts` left out
  const railAround = (uA: number, uB: number, vCentre: number, name: string, cuts: [number, number][]): void => {
    let cursor = uA;
    for (const [a, b] of [...cuts].sort((x, y) => x[0] - y[0])) {
      rail(cursor, Math.min(a, uB), vCentre, name);
      cursor = Math.max(cursor, b);
    }
    rail(cursor, uB, vCentre, name);
  };

  for (const bay of wallBays(frame)) {
    const start = bay.startStud ? bay.start - frame.studWidth : bay.start;
    const end = bay.endStud ? bay.end + frame.studWidth : bay.end;
    const inBay = openings.filter((o) => {
      const c = o.x + o.width / 2;
      return c >= bay.start && c <= bay.end;
    });
    // Outside edges of the jambs either side of an opening
    const span = (o: Opening): [number, number] => [o.x - BATTEN.width, o.x + o.width + BATTEN.width];

    // Bottom rail: open at doors and passages; the jambs stand on its ends
    railAround(start, end, SCREEN_GROUND_GAP + BATTEN.width / 2, 'Screen bottom rail', inBay.filter((o) => o.y < railTop).map((o) => [o.x, o.x + o.width]));

    // Opening frame: full-height jambs, a header rail and, under windows, a sill rail
    for (const o of inBay) {
      const top = o.y + o.height;
      if (o.x - BATTEN.width >= start - 0.5) batten(o.x - BATTEN.width / 2);
      if (o.x + o.width + BATTEN.width <= end + 0.5) batten(o.x + o.width + BATTEN.width / 2);
      if (top + BATTEN.width <= Math.min(frame.studTopAt(o.x), frame.studTopAt(o.x + o.width))) rail(o.x, o.x + o.width, top + BATTEN.width / 2, 'Screen rail');
      if (o.y - BATTEN.width >= railTop) rail(o.x, o.x + o.width, o.y - BATTEN.width / 2, 'Screen rail');
    }

    if (cladding.orientation === 'horizontal') {
      // A screen ending inside a bay gets an end batten; otherwise the post carries the slat ends
      if (bay.startStud) batten(start + BATTEN.width / 2);
      if (bay.endStud) batten(end - BATTEN.width / 2);
      const from = bay.startStud ? start + BATTEN.width : start;
      const to = bay.endStud ? end - BATTEN.width : end;
      const k = Math.ceil((to - from) / MAX_SLAT_SPAN);
      for (let i = 1; i < k; i++) {
        const u = from + ((to - from) * i) / k;
        // the jambs already carry the slats around an opening
        if (!inBay.some((o) => u > span(o)[0] - BATTEN.width && u < span(o)[1] + BATTEN.width)) batten(u);
      }
    } else {
      const top = Math.min(frame.studTopAt(start), frame.studTopAt(end));
      const k = Math.ceil((top - railTop) / MAX_RAIL_SPACING);
      for (let i = 1; i < k; i++) {
        const v = railTop + ((top - railTop) * i) / k - BATTEN.width / 2;
        const cuts = inBay.filter((o) => v + BATTEN.width / 2 > o.y && v - BATTEN.width / 2 < o.y + o.height).map(span);
        railAround(start, end, v, 'Screen rail', cuts);
      }
    }
  }
  return members;
}

/** Rectangle minus another one: up to four pieces around the overlap. */
function subtract(r: Rect, h: Rect): Rect[] {
  const u0 = Math.max(r.u0, h.u0);
  const u1 = Math.min(r.u1, h.u1);
  const v0 = Math.max(r.v0, h.v0);
  const v1 = Math.min(r.v1, h.v1);
  if (u0 >= u1 || v0 >= v1) return [r];
  const out: Rect[] = [];
  if (r.u0 < u0) out.push({ ...r, u1: u0 });
  if (u1 < r.u1) out.push({ ...r, u0: u1 });
  if (r.v0 < v0) out.push({ u0, u1, v0: r.v0, v1: v0 });
  if (v1 < r.v1) out.push({ u0, u1, v0: v1, v1: r.v1 });
  return out;
}

/** Sutherland–Hodgman: clip a polygon to a CONVEX outline (any winding). */
function clipConvex(subject: ProfilePoint[], clip: ProfilePoint[]): ProfilePoint[] {
  const ccw = signedArea(clip) > 0;
  let out = subject;
  for (let i = 0; i < clip.length && out.length > 0; i++) {
    const a = clip[i];
    const b = clip[(i + 1) % clip.length];
    const side = (p: ProfilePoint) => ((b.u - a.u) * (p.v - a.v) - (b.v - a.v) * (p.u - a.u)) * (ccw ? 1 : -1);
    const input = out;
    out = [];
    for (let j = 0; j < input.length; j++) {
      const p = input[j];
      const q = input[(j + 1) % input.length];
      const sp = side(p);
      const sq = side(q);
      if (sp >= 0) out.push(p);
      if ((sp >= 0) !== (sq >= 0)) {
        const t = sp / (sp - sq);
        out.push({ u: p.u + (q.u - p.u) * t, v: p.v + (q.v - p.v) * t });
      }
    }
  }
  return out;
}

function signedArea(points: ProfilePoint[]): number {
  let a = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const q = points[(i + 1) % points.length];
    a += p.u * q.v - q.u * p.v;
  }
  return a / 2;
}

/**
 * Individual boards of a spaced (open) cladding: strips `boardWidth` wide with `gap` between them,
 * running along u (horizontal) or v (vertical), cut around the openings and to the wall outline.
 * Vertical boards start at the wall's start edge, horizontal ones at the bottom.
 * `outer` must be convex (the wall outline: flat bottom, flat or sloped top).
 */
export function claddingBoards(outer: ProfilePoint[], holes: ProfilePoint[][], cladding: WallCladding): ProfilePoint[][] {
  const us = outer.map((p) => p.u);
  const vs = outer.map((p) => p.v);
  const box: Rect = { u0: Math.min(...us), u1: Math.max(...us), v0: Math.min(...vs), v1: Math.max(...vs) };
  const holeRects: Rect[] = holes.map((h) => ({
    u0: Math.min(...h.map((p) => p.u)),
    u1: Math.max(...h.map((p) => p.u)),
    v0: Math.min(...h.map((p) => p.v)),
    v1: Math.max(...h.map((p) => p.v)),
  }));
  const { boardWidth: bw, gap } = cladding;
  const horizontal = cladding.orientation === 'horizontal';
  const [from, to] = horizontal ? [box.v0, box.v1] : [box.u0, box.u1];

  const boards: ProfilePoint[][] = [];
  for (let s = from; s < to - 0.5; s += bw + gap) {
    const e = Math.min(s + bw, to);
    let pieces: Rect[] = [horizontal ? { ...box, v0: s, v1: e } : { ...box, u0: s, u1: e }];
    for (const h of holeRects) pieces = pieces.flatMap((r) => subtract(r, h));
    for (const r of pieces) {
      if (r.u1 - r.u0 < MIN_PIECE || r.v1 - r.v0 < MIN_PIECE) continue;
      const poly = clipConvex(
        [
          { u: r.u0, v: r.v0 },
          { u: r.u1, v: r.v0 },
          { u: r.u1, v: r.v1 },
          { u: r.u0, v: r.v1 },
        ],
        outer,
      );
      if (poly.length >= 3 && Math.abs(signedArea(poly)) >= MIN_PIECE * MIN_PIECE) boards.push(poly.map((p) => ({ u: round1(p.u), v: round1(p.v) })));
    }
  }
  return boards;
}

/** Board face area in m² */
export function boardsArea(boards: ProfilePoint[][]): number {
  return boards.reduce((s, b) => s + profileArea(b) / 1e6, 0);
}

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}
