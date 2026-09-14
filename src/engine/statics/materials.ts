import type { RoofCovering, StrengthClass } from '@/types';

/**
 * Characteristic strength & stiffness values (N/mm²) per EN 338 (solid timber)
 * and EN 14080 (glulam). Density in kg/m³ (mean).
 */
export interface MaterialProps {
  label: string;
  /** Characteristic bending strength f_m,k */
  fmk: number;
  /** Characteristic compression parallel to grain f_c,0,k */
  fc0k: number;
  /** Characteristic shear strength f_v,k */
  fvk: number;
  /** Mean modulus of elasticity E_0,mean */
  e0mean: number;
  /** 5 % modulus of elasticity E_0,05 */
  e005: number;
  /** Mean density ρ_mean */
  density: number;
  /** Partial safety factor γ_M */
  gammaM: number;
  /** Straightness factor β_c for buckling (0.2 solid, 0.1 glulam) */
  betaC: number;
}

export const MATERIALS: Record<StrengthClass, MaterialProps> = {
  C16: { label: 'C16 solid softwood', fmk: 16, fc0k: 17, fvk: 3.2, e0mean: 8000, e005: 5400, density: 370, gammaM: 1.3, betaC: 0.2 },
  C24: { label: 'C24 solid softwood', fmk: 24, fc0k: 21, fvk: 4.0, e0mean: 11000, e005: 7400, density: 420, gammaM: 1.3, betaC: 0.2 },
  C30: { label: 'C30 solid softwood', fmk: 30, fc0k: 23, fvk: 4.0, e0mean: 12000, e005: 8000, density: 460, gammaM: 1.3, betaC: 0.2 },
  GL24h: { label: 'GL24h glulam', fmk: 24, fc0k: 24, fvk: 3.5, e0mean: 11500, e005: 9600, density: 420, gammaM: 1.25, betaC: 0.1 },
  GL28c: { label: 'GL28c glulam', fmk: 28, fc0k: 24, fvk: 3.5, e0mean: 12500, e005: 10400, density: 420, gammaM: 1.25, betaC: 0.1 },
};

export const STRENGTH_CLASSES: StrengthClass[] = ['C16', 'C24', 'C30', 'GL24h', 'GL28c'];

/**
 * Dead load of the roof covering incl. deck/battens in kN/m² of roof surface.
 * Rafter self-weight is added separately by the statics engine.
 */
export const ROOF_COVERING_LOAD: Record<RoofCovering, { label: string; labelDe: string; load: number; thickness: number }> = {
  'trapezoidal-sheet': { label: 'Trapezoidal steel sheet', labelDe: 'Trapezblech', load: 0.15, thickness: 40 },
  polycarbonate: { label: 'Polycarbonate panels', labelDe: 'Stegplatten', load: 0.1, thickness: 30 },
  'bitumen-shingles': { label: 'Bitumen shingles on OSB', labelDe: 'Bitumenschindeln auf OSB', load: 0.35, thickness: 45 },
  'roof-tiles': { label: 'Concrete / clay tiles', labelDe: 'Dachziegel', load: 0.75, thickness: 90 },
  'green-roof': { label: 'Extensive green roof', labelDe: 'Extensive Dachbegrünung', load: 1.5, thickness: 140 },
};

/** k_mod for solid timber / glulam, medium-term action (snow) per service class. */
export const KMOD_BY_SERVICE_CLASS: Record<1 | 2 | 3, number> = { 1: 0.8, 2: 0.8, 3: 0.65 };

/** k_mod for short-term actions (wind, or any combination containing wind) per service class. */
export const KMOD_SHORT_BY_SERVICE_CLASS: Record<1 | 2 | 3, number> = { 1: 0.9, 2: 0.9, 3: 0.7 };

/** k_def per service class (solid timber / glulam). */
export const KDEF_BY_SERVICE_CLASS: Record<1 | 2 | 3, number> = { 1: 0.6, 2: 0.8, 3: 2.0 };

/** Snow load shape coefficient μ1 for monopitch roofs (EN 1991-1-3, 5.3.2). */
export function snowShapeCoefficient(pitchDeg: number): number {
  if (pitchDeg <= 30) return 0.8;
  if (pitchDeg >= 60) return 0;
  return (0.8 * (60 - pitchDeg)) / 30;
}

export const SNOW_ZONE_PRESETS: { label: string; value: number }[] = [
  { label: 'Zone 1 (0.65 kN/m²)', value: 0.65 },
  { label: 'Zone 1a (0.81 kN/m²)', value: 0.81 },
  { label: 'Zone 2 (0.85 kN/m²)', value: 0.85 },
  { label: 'Zone 2a (1.06 kN/m²)', value: 1.06 },
  { label: 'Zone 3 (1.10 kN/m²)', value: 1.1 },
  { label: 'Alpine (2.00 kN/m²)', value: 2.0 },
];

export const AIR_DENSITY = 1.25; // kg/m³

/** Peak velocity pressure (kN/m²) of a gust speed (m/s): q = ½·ρ·v². */
export function gustSpeedToPressure(v: number): number {
  return (0.5 * AIR_DENSITY * v * v) / 1000;
}

/** Gust speed (m/s) that produces a peak velocity pressure (kN/m²). */
export function pressureToGustSpeed(q: number): number {
  return Math.sqrt((2 * Math.max(q, 0) * 1000) / AIR_DENSITY);
}

/** DIN EN 1991-1-4/NA simplified q_p for h ≤ 10 m (inland values). */
export const WIND_ZONE_PRESETS: { label: string; value: number }[] = [
  { label: 'Zone 1 (0.50 kN/m²)', value: 0.5 },
  { label: 'Zone 2 inland (0.65 kN/m²)', value: 0.65 },
  { label: 'Zone 2 coast (0.85 kN/m²)', value: 0.85 },
  { label: 'Zone 3 inland (0.80 kN/m²)', value: 0.8 },
  { label: 'Zone 3 coast (1.05 kN/m²)', value: 1.05 },
  { label: 'Zone 4 (0.95 kN/m²)', value: 0.95 },
  { label: 'Zone 4 coast (1.25 kN/m²)', value: 1.25 },
];

/**
 * Overall force coefficients for a monopitch canopy with free flow underneath (EN 1991-1-4
 * Table 7.6, blockage φ = 0): downward (pressure) and upward (suction) values by pitch.
 */
export function canopyForceCoefficients(pitchDeg: number): { down: number; up: number } {
  const table: [number, number, number][] = [
    [0, 0.2, -0.5],
    [5, 0.4, -0.7],
    [10, 0.5, -0.9],
    [15, 0.7, -1.1],
    [20, 0.8, -1.3],
    [25, 1.0, -1.6],
    [30, 1.2, -1.8],
  ];
  const a = Math.min(Math.max(Math.abs(pitchDeg), 0), 30);
  for (let i = 1; i < table.length; i++) {
    const [a0, d0, u0] = table[i - 1];
    const [a1, d1, u1] = table[i];
    if (a <= a1) {
      const t = (a - a0) / (a1 - a0);
      return { down: d0 + t * (d1 - d0), up: u0 + t * (u1 - u0) };
    }
  }
  return { down: 1.2, up: -1.8 };
}

/** Net pressure coefficient on a wall face (windward + leeward / free-standing wall) */
export const WALL_FORCE_COEFFICIENT = 1.3;
/** Friction coefficient of the roof surface (rough) */
export const ROOF_FRICTION_COEFFICIENT = 0.02;
