import type { GroundPoint, PavedArea, PavedAreaSummary, PavingPattern, PavingSummary, ProjectState, StructureParams } from '@/types';

export const PAVING_COLORS = ['#9ca3af', '#a8a29e', '#b45309', '#78716c', '#64748b', '#d6d3d1', '#7f1d1d', '#374151'] as const;

export const PAVING_PATTERNS: { id: PavingPattern; label: string }[] = [
  { id: 'stretcher', label: 'Stretcher bond (Läuferverband)' },
  { id: 'stack', label: 'Stack bond (Reihenverband)' },
  { id: 'herringbone', label: 'Herringbone (Fischgrät)' },
];

export const PAVING_DEFAULTS = { stoneLength: 300, stoneWidth: 100, jointWidth: 3, stoneThickness: 80 } as const;

/** Vertices closer than this (mm) are treated as coincident. */
const EPS = 1e-6;

/** Signed area of a polygon in mm² (positive = counter-clockwise in the X/Z plane). */
export function polygonSignedAreaMm2(points: readonly GroundPoint[]): number {
  let sum = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += a.x * b.z - b.x * a.z;
  }
  return sum / 2;
}

/** Absolute plan area in m². */
export function polygonAreaM2(points: readonly GroundPoint[]): number {
  if (points.length < 3) return 0;
  return Math.abs(polygonSignedAreaMm2(points)) / 1e6;
}

export function polygonPerimeterM(points: readonly GroundPoint[]): number {
  if (points.length < 2) return 0;
  let sum = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += Math.hypot(b.x - a.x, b.z - a.z);
  }
  return sum / 1000;
}

export function polygonBounds(points: readonly GroundPoint[]): PavedAreaSummary['bounds'] {
  if (points.length === 0) return { minX: 0, maxX: 0, minZ: 0, maxZ: 0 };
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minZ = Math.min(minZ, p.z);
    maxZ = Math.max(maxZ, p.z);
  }
  return { minX, maxX, minZ, maxZ };
}

function orient(a: GroundPoint, b: GroundPoint, c: GroundPoint): number {
  return (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
}

function segmentsCross(p1: GroundPoint, p2: GroundPoint, q1: GroundPoint, q2: GroundPoint): boolean {
  const d1 = orient(q1, q2, p1);
  const d2 = orient(q1, q2, p2);
  const d3 = orient(p1, p2, q1);
  const d4 = orient(p1, p2, q2);
  return ((d1 > EPS && d2 < -EPS) || (d1 < -EPS && d2 > EPS)) && ((d3 > EPS && d4 < -EPS) || (d3 < -EPS && d4 > EPS));
}

/** True when two non-adjacent edges of the polygon cross. */
export function isSelfIntersecting(points: readonly GroundPoint[]): boolean {
  const n = points.length;
  if (n < 4) return false;
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      // skip shared-vertex neighbours (including the closing edge)
      if (j === i + 1 || (i === 0 && j === n - 1)) continue;
      if (segmentsCross(points[i], points[(i + 1) % n], points[j], points[(j + 1) % n])) return true;
    }
  }
  return false;
}

/** Number of stones needed to cover `areaM2` when each stone plus its joint occupies one module. */
export function estimateStoneCount(areaM2: number, area: Pick<PavedArea, 'stoneLength' | 'stoneWidth' | 'jointWidth'>): number {
  const moduleM2 = ((area.stoneLength + area.jointWidth) * (area.stoneWidth + area.jointWidth)) / 1e6;
  if (moduleM2 <= 0) return 0;
  return Math.ceil(areaM2 / moduleM2);
}

export function summarizePavedArea(area: PavedArea): PavedAreaSummary {
  const areaM2 = polygonAreaM2(area.points);
  return {
    id: area.id,
    label: area.label,
    areaM2,
    perimeterM: polygonPerimeterM(area.points),
    stoneCount: estimateStoneCount(areaM2, area),
    selfIntersecting: isSelfIntersecting(area.points),
    bounds: polygonBounds(area.points),
  };
}

export function summarizePaving(project: Pick<ProjectState, 'pavedAreas'>): PavingSummary {
  const areas = project.pavedAreas.map(summarizePavedArea);
  return {
    areas,
    totalAreaM2: areas.reduce((s, a) => s + a.areaM2, 0),
    totalStoneCount: areas.reduce((s, a) => s + a.stoneCount, 0),
  };
}

/** Rectangle covering the roof plan (post frame + overhangs) – the natural first floor for a carport. */
export function defaultPavedArea(params: StructureParams, id: string, label: string, color: string): PavedArea {
  const o = params.overhangs;
  return {
    id,
    label,
    points: [
      { x: -o.left, z: -o.front },
      { x: params.length + o.right, z: -o.front },
      { x: params.length + o.right, z: params.width + o.rear },
      { x: -o.left, z: params.width + o.rear },
    ],
    ...PAVING_DEFAULTS,
    pattern: 'stretcher',
    color,
  };
}

/** Midpoint of edge `index` → `index + 1` (wrapping), where a new vertex is inserted. */
export function edgeMidpoint(points: readonly GroundPoint[], index: number): GroundPoint {
  const a = points[index];
  const b = points[(index + 1) % points.length];
  return { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
}

/**
 * Move a whole edge (`index` → `index + 1`, wrapping) perpendicular to itself.
 * The drag vector (dx, dz) is projected onto the edge normal, so the side stays parallel to
 * its original position. `snap` (mm) rounds the offset distance; 0 disables snapping.
 */
export function offsetEdge(points: readonly GroundPoint[], index: number, dx: number, dz: number, snap = 0): GroundPoint[] {
  const n = points.length;
  if (n < 2) return points.slice();
  const a = points[index];
  const b = points[(index + 1) % n];
  const ex = b.x - a.x;
  const ez = b.z - a.z;
  const len = Math.hypot(ex, ez);
  if (len === 0) return points.slice();
  const nx = -ez / len;
  const nz = ex / len;
  let dist = dx * nx + dz * nz;
  if (snap > 0) dist = Math.round(dist / snap) * snap;
  const ox = nx * dist;
  const oz = nz * dist;
  return points.map((p, i) => (i === index || i === (index + 1) % n ? { x: Math.round(p.x + ox), z: Math.round(p.z + oz) } : p));
}

export function insertVertex(points: readonly GroundPoint[], afterIndex: number, point = edgeMidpoint(points, afterIndex)): GroundPoint[] {
  const next = points.slice();
  next.splice(afterIndex + 1, 0, point);
  return next;
}

/** Scale the polygon about its min corner so its bounding box becomes `width` × `depth` (mm). */
export function resizePolygon(points: readonly GroundPoint[], width: number, depth: number): GroundPoint[] {
  const b = polygonBounds(points);
  const w = b.maxX - b.minX;
  const d = b.maxZ - b.minZ;
  const sx = w > 0 ? width / w : 1;
  const sz = d > 0 ? depth / d : 1;
  return points.map((p) => ({ x: Math.round(b.minX + (p.x - b.minX) * sx), z: Math.round(b.minZ + (p.z - b.minZ) * sz) }));
}

export function translatePolygon(points: readonly GroundPoint[], dx: number, dz: number): GroundPoint[] {
  return points.map((p) => ({ x: p.x + dx, z: p.z + dz }));
}
