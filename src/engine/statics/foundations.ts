import type { FootingShape, SoilType, StaticsCheck, StaticsStatus, TimberSection } from '@/types';

/**
 * Post footing checks in the soil (simplified, no site investigation):
 *  - bearing: design pressure under the footing vs. the tabulated design bearing resistance
 *    σ_R,d of DIN 1054:2010 Annex A (Tables A 6.1 / A 6.6: non-cohesive, clayey-silty soil)
 *  - frost: German practice needs the footing base ≥ 800 mm below ground
 * Post bases are pinned, so the footing takes no moment.
 * Settlement, groundwater and slopes are not covered – they need a soil report.
 */

const GAMMA_G = 1.35;
/** Unit weight of plain concrete (kN/m³) */
const CONCRETE_WEIGHT = 24;
/** Frost-free founding depth in Germany (mm) */
export const FROST_DEPTH = 800;
const OK_LIMIT = 0.85;

interface SoilProps {
  label: string;
  /** σ_R,d (kN/m²) at founding depths 0.5 / 1.0 / 1.5 / 2.0 m, footing width ≥ 0.5 m */
  bearing: [number, number, number, number];
}

export const SOILS: Record<SoilType, SoilProps> = {
  'non-cohesive': { label: 'sand / gravel, medium dense', bearing: [280, 380, 480, 560] },
  'cohesive-stiff': { label: 'clayey silt / clay, stiff', bearing: [120, 140, 160, 180] },
  'cohesive-semi-firm': { label: 'clayey silt / clay, semi-firm', bearing: [170, 210, 250, 280] },
};

/** Design bearing resistance σ_R,d (kN/m²) at a founding depth (mm), interpolated in the table. */
export function bearingResistance(soil: SoilType, depth: number): number {
  const t = SOILS[soil].bearing;
  const x = Math.min(Math.max(depth / 1000, 0.5), 2) * 2 - 1; // 0 … 3
  const i = Math.min(Math.floor(x), 2);
  return t[i] + (x - i) * (t[i + 1] - t[i]);
}

const fmt = (v: number, d = 1): string => v.toFixed(d);
const pct = (v: number): string => `${Math.round(v * 100)} %`;
const kn = (v: number): string => `${fmt(v, 1)} kN`;
const statusOf = (util: number): StaticsStatus => (util > 1 ? 'fail' : util > OK_LIMIT ? 'warning' : 'ok');

export interface FoundationInput {
  soil: SoilType;
  /** Footing depth / size (side or Ø, mm); 0 = posts stand on a slab or bare anchors */
  depth: number;
  diameter: number;
  shape: FootingShape;
  post: TimberSection;
  /** Most loaded post: design axial force G + S (kN) */
  worstPost: { label: string; Nd: number };
}

export function foundationChecks(input: FoundationInput): StaticsCheck[] {
  const { soil, depth, diameter, post, worstPost, shape } = input;
  if (depth <= 0 || diameter <= 0) return [];
  const soilProps = SOILS[soil];
  const D = diameter / 1000;
  const L = depth / 1000;
  const areaOf = (size: number) => (shape === 'round' ? (Math.PI * size * size) / 4 : size * size);
  const area = areaOf(D);
  const name = (size: number) => (shape === 'round' ? `Ø${Math.round(size)}` : `${Math.round(size)} × ${Math.round(size)}`);
  const Gf = CONCRETE_WEIGHT * area * L;
  const Nd = worstPost.Nd + GAMMA_G * Gf;
  const sigma = Nd / area;
  const sigmaRd = bearingResistance(soil, depth);
  const util = sigma / sigmaRd;
  const shallow = depth < FROST_DEPTH;
  const status: StaticsStatus = shallow && statusOf(util) === 'ok' ? 'warning' : statusOf(util);
  // Smallest diameter (50 mm steps) that brings the pressure down to the status limit
  const needed = (() => {
    for (let d = Math.ceil(diameter / 50) * 50 + 50; d <= 1000; d += 50) {
      const a = areaOf(d / 1000);
      if ((worstPost.Nd + GAMMA_G * CONCRETE_WEIGHT * a * L) / a <= OK_LIMIT * sigmaRd) return d;
    }
    return undefined;
  })();
  const recommendation = [
    util > OK_LIMIT ? (needed ? `Enlarge the footings to ${name(needed)} mm (or found deeper).` : 'Use a strip foundation or a slab – a single footing up to 1000 mm is not enough.') : '',
    shallow ? `Found at least ${FROST_DEPTH} mm deep (frost-free).` : '',
  ]
    .filter(Boolean)
    .join(' ');
  return [
    {
      id: 'foundation-bearing',
      kind: 'foundation',
      element: 'Post footing – soil pressure',
      elementDe: 'Punktfundament – Sohldruck',
      section: post,
      span: Math.round(depth),
      loadUls: Nd,
      loadSls: 0,
      stressUtil: util,
      deflectionUtil: 0,
      deflection: 0,
      deflectionLimit: 0,
      utilisation: util,
      status,
      recommendation: recommendation || undefined,
      detail: `${worstPost.label}: N_d = ${kn(worstPost.Nd)} + 1.35 × footing ${name(diameter)} × ${Math.round(depth)} mm ${kn(Gf)} = ${kn(Nd)} on ${fmt(area, 3)} m²: σ_d = ${Math.round(sigma)} ≤ σ_R,d = ${Math.round(sigmaRd)} kN/m² (${soilProps.label}, DIN 1054 Annex A) (${pct(util)}).${diameter < 500 ? ' The table values are given for footings ≥ 0.5 m wide – have the soil confirmed on site.' : ''}`,
    },
  ];
}
