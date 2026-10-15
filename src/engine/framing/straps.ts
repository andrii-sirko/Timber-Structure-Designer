import type { PostGrid, StructureParams, Wall, WallId } from '@/types';
import { wallExtent } from './wallFrame';

/** Windrispenband 40 × 2 mm, S250GD+Z: gross area, net area across two Ø5 mm holes (mm²). */
export const STRAP = { width: 40, thickness: 2, fy: 250, fu: 330, netArea: (40 - 2 * 5) * 2 } as const;
/** Kammnagel 4.0 × 40 mm through the strap into the timber. */
export const STRAP_NAIL = { d: 4, length: 40, fu: 600 } as const;
/** Steepest useful diagonal: crosses are kept at least this steep (°). */
const MIN_STRAP_ANGLE = 40;

export interface StrapCross {
  /** Start / end along the wall (mm) */
  start: number;
  end: number;
  height: number;
  /** One diagonal (mm) */
  diagonal: number;
  angleDeg: number;
}

export interface WallStraps {
  wallId: WallId;
  crosses: StrapCross[];
  /** Strap length incl. 2 × 150 mm wrap / anchoring per diagonal (mm) */
  totalLength: number;
}

/** Height of a wall's frame (mm, average for the sloped side walls). */
export function wallFrameHeight(id: WallId, params: StructureParams): number {
  const beam = params.timber.beam.height;
  if (id === 'front') return params.frontHeight - beam;
  if (id === 'rear') return params.rearHeight - beam;
  return (params.frontHeight + params.rearHeight) / 2 - beam;
}

/**
 * Crossed steel straps (Windrispenband) on a closed wall braced with 'strap': the wall is split
 * into stretches free of doors and windows, each filled with crosses no flatter than 40°.
 */
export function wallStraps(id: WallId, wall: Wall, params: StructureParams): WallStraps | undefined {
  if (!wall.closed || wall.bracing !== 'strap') return undefined;
  const length = id === 'front' || id === 'rear' ? params.length : params.width;
  const ext = wallExtent(wall, length);
  const h = wallFrameHeight(id, params);
  const margin = params.timber.stud.width * 2;
  const blocked = wall.openings.map((o) => [o.x - margin, o.x + o.width + margin] as const).sort((a, b) => a[0] - b[0]);
  const free: [number, number][] = [];
  let cursor = ext.start;
  for (const [a, b] of blocked) {
    if (a > cursor) free.push([cursor, Math.min(a, ext.end)]);
    cursor = Math.max(cursor, b);
  }
  if (cursor < ext.end) free.push([cursor, ext.end]);
  const maxWidth = h / Math.tan((MIN_STRAP_ANGLE * Math.PI) / 180);
  const crosses: StrapCross[] = [];
  for (const [a, b] of free) {
    const width = b - a;
    if (width < 0.35 * h) continue; // too narrow for a useful diagonal
    const n = Math.max(1, Math.ceil(width / maxWidth));
    const w = width / n;
    for (let k = 0; k < n; k++) {
      const diagonal = Math.hypot(w, h);
      crosses.push({ start: a + k * w, end: a + (k + 1) * w, height: h, diagonal, angleDeg: (Math.atan2(h, w) * 180) / Math.PI });
    }
  }
  const totalLength = crosses.reduce((sum, c) => sum + 2 * (c.diagonal + 300), 0);
  return { wallId: id, crosses, totalLength };
}

/** Design tension resistance of one strap (kN, EN 1993-1-3: gross yield / net fracture). */
export function strapTensionRd(): number {
  return Math.min((STRAP.width * STRAP.thickness * STRAP.fy) / 1.0, (0.9 * STRAP.netArea * STRAP.fu) / 1.25) / 1000;
}

/**
 * Characteristic shear capacity of one Kammnagel through a thin steel plate (EN 1995-1-1 eq. 8.9,
 * t ≤ 0.5 d, rope effect ignored), N.
 */
export function strapNailCapacity(rhok: number): number {
  const { d, length, fu } = STRAP_NAIL;
  const fh = 0.082 * rhok * d ** -0.3;
  const My = 0.3 * fu * d ** 2.6;
  const t1 = length - STRAP.thickness;
  return Math.min(0.4 * fh * t1 * d, 1.15 * Math.sqrt(2 * My * fh * d));
}

/**
 * Bays of the strap crosses in the roof plane of a roof braced by walls of direction `axis` on one
 * line: the span (x for 'z', z for 'x') is cut at the purlin rows of that direction and every piece
 * longer than 1.5 × the depth is split again, so each cross stays roughly square (plan mm).
 */
export function roofStrapBays(axis: 'x' | 'z', params: StructureParams, grid: PostGrid): { start: number; end: number }[] {
  const span = axis === 'z' ? params.length : params.width;
  const depth = axis === 'z' ? params.width : params.length;
  const cuts = [...new Set(grid.rows.filter((r) => r.axis === axis && r.offset > 200 && r.offset < span - 200).map((r) => r.offset))].sort((a, b) => a - b);
  const edges = [0, ...cuts, span];
  const bays: { start: number; end: number }[] = [];
  for (let i = 1; i < edges.length; i++) {
    const len = edges[i] - edges[i - 1];
    const n = len > 1.5 * depth ? Math.ceil(len / depth) : 1;
    for (let k = 0; k < n; k++) bays.push({ start: edges[i - 1] + (k * len) / n, end: edges[i - 1] + ((k + 1) * len) / n });
  }
  return bays;
}
