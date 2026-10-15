import type { StructureParams, Wall, WallId } from '@/types';
import { wallExtent } from '../framing/wallFrame';
import { wallFrameHeight, wallStraps } from '../framing/straps';
import { SHEATHING_THICKNESS } from '../framing/walls';

/**
 * Shear walls under a rigid roof diaphragm: every braced wall is a spring along its own line, the
 * wind of each direction is shared by stiffness and its eccentricity to the centre of stiffness
 * is taken as a torsion couple by all braced walls of both directions.
 */

export type Axis = 'x' | 'z';

/** Default nail spacing along the panel edges of an OSB shear wall (mm). */
export const DEFAULT_PANEL_NAIL_SPACING = 75;
/** Ring-shank nail fixing the OSB sheets: d × length (mm). */
export const PANEL_NAIL = { d: 2.8, length: 60, fu: 600 } as const;
/** OSB/3 sheet thickness assumed for sheet-panel walls (mm) and its characteristic density (kg/m³). */
export const OSB = { thickness: SHEATHING_THICKNESS, rhok: 550 } as const;
/** Self-weight of a framed, sheathed and clad wall (kN/m²), credited against the hold-down tension. */
const WALL_SELF_WEIGHT = 0.25;

export interface Segment {
  start: number;
  end: number;
  /** EN 1995-1-1 9.2.4.2 (4): c_i = b_i / b_0 for b_i < b_0 = h / 2, else 1 */
  c: number;
}

export interface ShearWallElement {
  id: WallId;
  /** Direction the wall resists */
  axis: Axis;
  bracing: 'strap' | 'panels';
  /** Plan coordinate of the wall line across `axis` (z for front/rear, x for left/right), mm */
  pos: number;
  /** Braced stretches along the wall (mm, wall u axis) */
  segments: Segment[];
  /** Effective braced length Σ c_i·b_i (m) – also the stiffness of the wall */
  length: number;
  /** Frame height (mm) */
  height: number;
}

/** Nail spacing of a sheet-panel wall (mm), the default when unset or out of range. */
export function panelNailSpacing(wall: Wall): number {
  const s = wall.panelNailSpacing;
  return typeof s === 'number' && Number.isFinite(s) && s >= 25 && s <= 300 ? s : DEFAULT_PANEL_NAIL_SPACING;
}

/**
 * Stretches of a closed wall that brace it: the closed extent minus its openings. Sheet panels count
 * only on stretches at least h / 4 wide (EN 1995-1-1 9.2.4.2 (5)); straps on their crosses.
 */
export function bracedSegments(id: WallId, wall: Wall, params: StructureParams): Segment[] {
  const h = wallFrameHeight(id, params);
  if (wall.bracing === 'strap') {
    return (wallStraps(id, wall, params)?.crosses ?? []).map((c) => ({ start: c.start, end: c.end, c: 1 }));
  }
  const span = id === 'front' || id === 'rear' ? params.length : params.width;
  const ext = wallExtent(wall, span);
  const blocked = wall.openings.map((o) => [o.x, o.x + o.width] as const).sort((a, b) => a[0] - b[0]);
  const free: [number, number][] = [];
  let cursor = ext.start;
  for (const [a, b] of blocked) {
    if (a > cursor) free.push([cursor, Math.min(a, ext.end)]);
    cursor = Math.max(cursor, b);
  }
  if (cursor < ext.end) free.push([cursor, ext.end]);
  return free.filter(([a, b]) => b - a >= h / 4).map(([a, b]) => ({ start: a, end: b, c: Math.min(1, (b - a) / (h / 2)) }));
}

export function shearWallElement(id: WallId, wall: Wall, params: StructureParams): ShearWallElement | undefined {
  if (!wall.closed || (wall.bracing !== 'strap' && wall.bracing !== 'panels')) return undefined;
  const segments = bracedSegments(id, wall, params);
  const axis: Axis = id === 'front' || id === 'rear' ? 'x' : 'z';
  const pos = id === 'front' || id === 'left' ? 0 : id === 'rear' ? params.width : params.length;
  return { id, axis, bracing: wall.bracing, pos, segments, length: segments.reduce((s, g) => s + g.c * (g.end - g.start), 0) / 1000, height: wallFrameHeight(id, params) };
}

export interface LateralLoad {
  axis: Axis;
  /** Design force (kN) */
  H: number;
  /** Plan coordinate of its line of action across `axis` (x for a load along z), mm */
  at: number;
}

export interface WallShare {
  /** Share of the load of its own direction (kN) */
  direct: number;
  /** Force from the torsion couple (kN, signed against `direct`) */
  torsion: number;
  /** Design force: never less than the direct share (relief from torsion is not credited) */
  total: number;
}

export interface TorsionResult {
  /** Centre of stiffness across the load direction (mm), undefined without walls of that direction */
  centre?: number;
  /** Eccentricity of the load to the centre of stiffness (mm) */
  e: number;
  /** Torsion moment (kNm) */
  Mt: number;
  /** No pair of wall lines can take the moment */
  unresisted: boolean;
}

export interface Distribution {
  /** Per wall and per load direction */
  shares: Partial<Record<WallId, Partial<Record<Axis, WallShare>>>>;
  torsion: Partial<Record<Axis, TorsionResult>>;
}

/** Rigid-diaphragm distribution of the lateral loads over the shear walls (stiffness ∝ braced length). */
export function distributeLateral(walls: ShearWallElement[], loads: LateralLoad[]): Distribution {
  const along = (a: Axis) => walls.filter((w) => w.axis === a && w.length > 0);
  const centreOf = (a: Axis): number | undefined => {
    const ws = along(a);
    const k = ws.reduce((s, w) => s + w.length, 0);
    return k > 0 ? ws.reduce((s, w) => s + w.length * w.pos, 0) / k : undefined;
  };
  const centre: Record<Axis, number | undefined> = { x: centreOf('x'), z: centreOf('z') };
  const J = walls.reduce((s, w) => (w.length > 0 ? s + w.length * ((w.pos - (centre[w.axis] ?? 0)) / 1000) ** 2 : s), 0);
  const out: Distribution = { shares: {}, torsion: {} };
  for (const load of loads) {
    const own = along(load.axis);
    const kOwn = own.reduce((s, w) => s + w.length, 0);
    const c = centre[load.axis];
    if (kOwn <= 0 || c === undefined) continue;
    const e = load.at - c;
    const Mt = (load.H * e) / 1000;
    const unresisted = J <= 1e-9 && Math.abs(Mt) > 1e-6 * Math.max(load.H, 1);
    out.torsion[load.axis] = { centre: c, e, Mt, unresisted };
    for (const w of walls) {
      if (w.length <= 0) continue;
      const direct = w.axis === load.axis ? (load.H * w.length) / kOwn : 0;
      const torsion = J > 1e-9 ? (Mt * w.length * ((w.pos - (centre[w.axis] ?? 0)) / 1000)) / J : 0;
      const total = Math.max(Math.abs(direct + torsion), Math.abs(direct));
      (out.shares[w.id] ??= {})[load.axis] = { direct, torsion, total };
    }
  }
  return out;
}

/**
 * Lateral design capacity of one OSB-to-timber ring-shank nail in single shear (kN):
 * Johansen (EN 1995-1-1 eq. 8.6) with the panel embedment of eq. 8.22, rope effect ≤ 50 %.
 */
export function panelNailCapacity(rhok: number, kmodTimber: number, serviceClass: 1 | 2 | 3): { Rk: number; Rd: number; kmod: number } {
  const { d, length, fu } = PANEL_NAIL;
  const t1 = OSB.thickness;
  const t2 = length - t1;
  const fh1 = 65 * d ** -0.7 * t1 ** 0.1;
  const fh2 = 0.082 * rhok * d ** -0.3;
  const beta = fh2 / fh1;
  const My = 0.3 * fu * d ** 2.6;
  const Fax = Math.min(20e-6 * rhok ** 2 * d * t2, 70e-6 * OSB.rhok ** 2 * (2 * d) ** 2);
  const r = t2 / t1;
  const a = fh1 * t1 * d;
  const b = fh2 * t2 * d;
  const c = (a / (1 + beta)) * (Math.sqrt(beta + 2 * beta ** 2 * (1 + r + r ** 2) + beta ** 3 * r ** 2) - beta * (1 + r));
  const dd = ((1.05 * a) / (2 + beta)) * (Math.sqrt(2 * beta * (1 + beta) + (4 * beta * (2 + beta) * My) / (fh1 * d * t1 ** 2)) - beta);
  const ee = ((1.05 * fh1 * t2 * d) / (1 + 2 * beta)) * (Math.sqrt(2 * beta ** 2 * (1 + beta) + (4 * beta * (1 + 2 * beta) * My) / (fh1 * d * t2 ** 2)) - beta);
  const ff = 1.15 * Math.sqrt((2 * beta) / (1 + beta)) * Math.sqrt(2 * My * fh1 * d);
  const rope = (j: number) => j + Math.min(Fax / 4, 0.5 * j);
  const Rk = Math.min(a, b, rope(c), rope(dd), rope(ee), rope(ff)) / 1000;
  // panel-to-timber connection: k_mod = √(k_mod,timber · k_mod,OSB/3), short-term action
  const kmodOsb = serviceClass === 1 ? 0.9 : serviceClass === 2 ? 0.7 : 0.4;
  const kmod = Math.sqrt(kmodTimber * kmodOsb);
  return { Rk, Rd: (kmod * Rk) / 1.3, kmod };
}

/**
 * Tension at the end of a braced stretch (kN): the overturning F_i·h / b_i of its share of the wall
 * force, less 0.9 × half the stretch's self-weight (the roof is not credited: wind suction).
 */
export function holdDownTension(force: number, wall: ShearWallElement): number {
  let T = 0;
  for (const g of wall.segments) {
    const b = g.end - g.start;
    const Fi = (force * (g.c * b)) / 1000 / Math.max(wall.length, 1e-9);
    const G = 0.9 * 0.5 * WALL_SELF_WEIGHT * (b / 1000) * (wall.height / 1000);
    T = Math.max(T, (Fi * wall.height) / b - G);
  }
  return Math.max(T, 0);
}
