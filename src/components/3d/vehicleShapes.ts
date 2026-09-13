import type { VehicleBodyStyle } from '@/types';

/** Normalised side silhouettes: u = 0 front bumper … 1 rear bumper, v = 0 ground … 1 roof. */
export const SILHOUETTES: Record<VehicleBodyStyle, [number, number][]> = {
  city: [[0, 0.16], [0.02, 0.38], [0.08, 0.46], [0.26, 0.5], [0.34, 0.86], [0.44, 0.98], [0.8, 0.99], [0.92, 0.9], [0.97, 0.55], [1, 0.4], [0.99, 0.16]],
  compact: [[0, 0.15], [0.02, 0.36], [0.07, 0.44], [0.28, 0.49], [0.38, 0.85], [0.48, 0.97], [0.8, 0.98], [0.9, 0.86], [0.96, 0.55], [1, 0.4], [0.99, 0.15]],
  sedan: [[0, 0.15], [0.02, 0.36], [0.07, 0.44], [0.3, 0.49], [0.42, 0.84], [0.52, 0.96], [0.74, 0.97], [0.86, 0.82], [0.93, 0.52], [1, 0.48], [1, 0.36], [0.99, 0.15]],
  estate: [[0, 0.15], [0.02, 0.36], [0.07, 0.44], [0.3, 0.49], [0.42, 0.85], [0.52, 0.97], [0.9, 0.97], [0.97, 0.8], [1, 0.5], [1, 0.36], [0.99, 0.15]],
  suv: [[0, 0.16], [0.02, 0.42], [0.06, 0.55], [0.27, 0.6], [0.36, 0.9], [0.46, 0.99], [0.86, 0.99], [0.94, 0.88], [0.98, 0.55], [1, 0.4], [0.99, 0.16]],
  van: [[0, 0.16], [0.02, 0.45], [0.1, 0.58], [0.2, 0.92], [0.27, 1], [0.98, 1], [1, 0.8], [1, 0.3], [0.99, 0.16]],
  pickup: [[0, 0.16], [0.02, 0.42], [0.06, 0.55], [0.27, 0.6], [0.35, 0.9], [0.44, 0.99], [0.58, 0.99], [0.6, 0.62], [0.98, 0.62], [1, 0.45], [0.99, 0.16]],
  camper: [[0, 0.14], [0.02, 0.4], [0.1, 0.52], [0.18, 0.88], [0.26, 1], [0.99, 1], [1, 0.85], [1, 0.28], [0.99, 0.14]],
  motorcycle: [[0.02, 0.3], [0.1, 0.42], [0.3, 0.55], [0.42, 0.72], [0.52, 0.78], [0.62, 0.66], [0.75, 0.62], [0.98, 0.55], [1, 0.45], [0.9, 0.3], [0.6, 0.28], [0.4, 0.3]],
};

export interface WheelSpec {
  /** Axle positions as fractions of the length (from the front bumper) */
  front: number;
  rear: number;
  /** Wheel diameter as a fraction of the vehicle height */
  diameter: number;
  /** Tyre width as a fraction of the body width */
  width: number;
}

export const WHEELS: Record<VehicleBodyStyle, WheelSpec> = {
  city: { front: 0.17, rear: 0.82, diameter: 0.4, width: 0.12 },
  compact: { front: 0.17, rear: 0.8, diameter: 0.43, width: 0.13 },
  sedan: { front: 0.17, rear: 0.78, diameter: 0.45, width: 0.13 },
  estate: { front: 0.17, rear: 0.78, diameter: 0.44, width: 0.13 },
  suv: { front: 0.17, rear: 0.8, diameter: 0.42, width: 0.14 },
  van: { front: 0.17, rear: 0.78, diameter: 0.36, width: 0.12 },
  pickup: { front: 0.16, rear: 0.74, diameter: 0.4, width: 0.14 },
  camper: { front: 0.17, rear: 0.72, diameter: 0.3, width: 0.11 },
  motorcycle: { front: 0.15, rear: 0.85, diameter: 0.45, width: 0.15 },
};

/** Glass band (fractions of height) and how far along the length windows extend. */
export const GLASS: Partial<Record<VehicleBodyStyle, { vMin: number; vMax: number; uMax: number }>> = {
  city: { vMin: 0.52, vMax: 0.93, uMax: 1 },
  compact: { vMin: 0.52, vMax: 0.93, uMax: 1 },
  sedan: { vMin: 0.52, vMax: 0.93, uMax: 1 },
  estate: { vMin: 0.52, vMax: 0.93, uMax: 1 },
  suv: { vMin: 0.62, vMax: 0.94, uMax: 1 },
  van: { vMin: 0.58, vMax: 0.92, uMax: 1 },
  pickup: { vMin: 0.62, vMax: 0.94, uMax: 0.6 },
  camper: { vMin: 0.55, vMax: 0.9, uMax: 0.45 },
};

type Pt = [number, number];

function clipHalfPlane(poly: Pt[], inside: (p: Pt) => boolean, intersect: (a: Pt, b: Pt) => Pt): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const cur = poly[i];
    const prev = poly[(i + poly.length - 1) % poly.length];
    const curIn = inside(cur);
    const prevIn = inside(prev);
    if (curIn) {
      if (!prevIn) out.push(intersect(prev, cur));
      out.push(cur);
    } else if (prevIn) {
      out.push(intersect(prev, cur));
    }
  }
  return out;
}

/** Sutherland–Hodgman clip of a silhouette to a u/v box (normalised coordinates). */
export function clipSilhouette(poly: Pt[], uMin: number, uMax: number, vMin: number, vMax: number): Pt[] {
  const lerpAt = (a: Pt, b: Pt, axis: 0 | 1, value: number): Pt => {
    const t = (value - a[axis]) / (b[axis] - a[axis] || 1e-9);
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  };
  let out = clipHalfPlane(poly, (p) => p[1] >= vMin, (a, b) => lerpAt(a, b, 1, vMin));
  out = clipHalfPlane(out, (p) => p[1] <= vMax, (a, b) => lerpAt(a, b, 1, vMax));
  out = clipHalfPlane(out, (p) => p[0] >= uMin, (a, b) => lerpAt(a, b, 0, uMin));
  out = clipHalfPlane(out, (p) => p[0] <= uMax, (a, b) => lerpAt(a, b, 0, uMax));
  return out;
}
