import type { GroundSlope, StructureParams } from '@/types';
import { canonicalToWorldMap, isSideDirection } from './orientation';

export const GROUND_SLOPE_DEFAULTS: GroundSlope = { percent: 0, direction: 0 };

/** Steepest fall accepted (%) – paving is laid at 1–2.5 %, anything above is a slope, not a fall. */
export const MAX_GROUND_SLOPE = 15;

/** Fall directions offered in the UI (plan azimuth, see `GroundSlope.direction`). */
export const GROUND_SLOPE_DIRECTIONS: { deg: number; label: string }[] = [
  { deg: 0, label: 'Towards the front' },
  { deg: 45, label: 'Front right' },
  { deg: 90, label: 'Towards the right' },
  { deg: 135, label: 'Rear right' },
  { deg: 180, label: 'Towards the rear' },
  { deg: 225, label: 'Rear left' },
  { deg: 270, label: 'Towards the left' },
  { deg: 315, label: 'Front left' },
];

export function sanitizeGroundSlope(input: unknown): GroundSlope {
  const g = (input && typeof input === 'object' ? input : {}) as Partial<GroundSlope>;
  const percent = typeof g.percent === 'number' && Number.isFinite(g.percent) ? Math.min(Math.max(g.percent, 0), MAX_GROUND_SLOPE) : 0;
  const direction = typeof g.direction === 'number' && Number.isFinite(g.direction) ? ((g.direction % 360) + 360) % 360 : 0;
  return { percent, direction };
}

export const slopePercentToDeg = (percent: number): number => (Math.atan(percent / 100) * 180) / Math.PI;
export const slopeDegToPercent = (deg: number): number => Math.tan((deg * Math.PI) / 180) * 100;

/**
 * Ground level as a linear function of WORLD plan coordinates (mm): y = gx·x + gz·z + g0.
 * The highest corner of the footprint L × W sits at 0, every other point is ≤ 0.
 */
export interface GroundPlane {
  gx: number;
  gz: number;
  g0: number;
  /** Height difference across the footprint (mm, ≥ 0) */
  drop: number;
}

export function worldGroundPlane(slope: GroundSlope | undefined, L: number, W: number): GroundPlane {
  const s = (slope?.percent ?? 0) / 100;
  if (s <= 0) return { gx: 0, gz: 0, g0: 0, drop: 0 };
  const th = ((slope?.direction ?? 0) * Math.PI) / 180;
  // world sides: front = −Z, rear = +Z, left = +X, right = −X
  const vx = -Math.sin(th);
  const vz = -Math.cos(th);
  const corners = [0, vx * L, vz * W, vx * L + vz * W];
  const dMin = Math.min(...corners);
  const dMax = Math.max(...corners);
  return { gx: -s * vx, gz: -s * vz, g0: s * dMin, drop: s * (dMax - dMin) };
}

export const groundAt = (g: GroundPlane, x: number, z: number): number => (g.gx === 0 && g.gz === 0 ? 0 : g.gx * x + g.gz * z + g.g0);

/** World dimensions of a (canonical or world) params object. */
function worldDims(params: StructureParams, canonical: boolean): { L: number; W: number } {
  return canonical && isSideDirection(params.roofDirection) ? { L: params.width, W: params.length } : { L: params.length, W: params.width };
}

/** Ground plane in the frame of `params`: pass `canonical` for engine (canonical) params. */
export function groundPlaneOf(params: StructureParams, canonical: boolean): GroundPlane {
  const { L, W } = worldDims(params, canonical);
  const g = worldGroundPlane(params.groundSlope, L, W);
  if (!canonical || g.drop === 0) return g;
  // y = gx·(a·x + b·z + tx) + gz·(c·x + d·z + tz) + g0
  const m = canonicalToWorldMap(params.roofDirection, L, W);
  return { gx: g.gx * m.a + g.gz * m.c, gz: g.gx * m.b + g.gz * m.d, g0: g.gx * m.tx + g.gz * m.tz + g.g0, drop: g.drop };
}
