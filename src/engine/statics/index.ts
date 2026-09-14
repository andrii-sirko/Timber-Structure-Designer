import type { FramingResult, PostRow, ProjectState, StaticsCheck, StaticsResult, StaticsStatus, TimberSection, WallId } from '@/types';
import { sanitizeParams } from '../framing';
import { braceLayout, rowPostTop, type BracePlacement } from '../framing/structure';
import { computeRoofLines, type RoofLines } from '../framing/roofLines';
import { sectionLabel } from '../geometry';
import {
  canopyForceCoefficients,
  KDEF_BY_SERVICE_CLASS,
  KMOD_BY_SERVICE_CLASS,
  KMOD_SHORT_BY_SERVICE_CLASS,
  MATERIALS,
  pressureToGustSpeed,
  ROOF_COVERING_LOAD,
  ROOF_FRICTION_COEFFICIENT,
  snowShapeCoefficient,
  WALL_FORCE_COEFFICIENT,
  type MaterialProps,
} from './materials';

/**
 * Simplified structural verification following Eurocode 5 (EN 1995-1-1) principles:
 *  - ULS bending & shear with k_mod / γ_M design strengths, three load combinations
 *    (snow leading, wind leading, snow leading + accompanying wind)
 *  - SLS deflection with k_def creep (w_inst ≤ L/300, w_fin ≤ L/200, cantilevers 2a)
 *  - Post buckling with the EC5 k_c reduction, buckling lengths per direction from the
 *    actual bracing system (knee braces / boarded walls / sway posts)
 *  - Lateral stability per direction: knee braces as compression struts, boarded walls as
 *    shear walls, or posts as cantilevers with combined compression + bending
 *  - Roof uplift (canopy suction) vs. dead load → net anchor tension per post
 * Connections, fire, foundations and second-order effects are NOT covered – this is a
 * pre-design tool, not a replacement for a structural engineer's calculation.
 */

const GAMMA_G = 1.35;
const GAMMA_G_FAVOURABLE = 1.0;
const GAMMA_Q = 1.5;
const PSI0_SNOW = 0.5;
const PSI0_WIND = 0.6;
/** Notional horizontal load (initial sway) as a fraction of the vertical design load */
const NOTIONAL_SWAY = 0.01;
/** Fraction of a knee brace's horizontal leg credited as purlin support (elastic support) */
const BRACE_SPAN_CREDIT = 0.5;
const G_ACCEL = 9.81;
const SQRT2 = Math.SQRT2;
export const STANDARD_DEPTHS = [80, 100, 120, 140, 160, 180, 200, 220, 240, 260, 280, 300, 320, 360];
export const BRACE_SECTIONS: TimberSection[] = [
  { width: 60, height: 80 },
  { width: 80, height: 80 },
  { width: 80, height: 100 },
  { width: 100, height: 100 },
  { width: 100, height: 120 },
  { width: 120, height: 120 },
  { width: 120, height: 140 },
];
export const OK_LIMIT = 0.85;

interface BeamLoads {
  /** Characteristic permanent line load (kN/m = N/mm) */
  qG: number;
  /** Characteristic snow line load */
  qS: number;
  /** Characteristic wind (pressure, downwards / perpendicular) line load */
  qW: number;
}

interface BeamInput extends BeamLoads {
  section: TimberSection;
  /** Effective span between supports (mm) */
  span: number;
  /** Longest cantilever beyond a support (mm) */
  cantilever: number;
}

interface Combo {
  label: string;
  qd: number;
  kmod: number;
}

interface BeamOutput {
  stressUtil: number;
  shearUtil: number;
  wInst: number;
  wFin: number;
  wLimit: number;
  deflectionUtil: number;
  utilisation: number;
  sigma: number;
  fmd: number;
  Md: number;
  qd: number;
  governing: string;
}

interface Kmods {
  medium: number;
  short: number;
  kdef: number;
}

/** ULS combinations of a member under G, snow and wind pressure (EN 1990 6.10). */
function combos(l: BeamLoads, k: Kmods): Combo[] {
  const out: Combo[] = [{ label: 'G + S', qd: GAMMA_G * l.qG + GAMMA_Q * l.qS, kmod: k.medium }];
  if (l.qW > 0) {
    out.push({ label: 'G + W + ψ₀S', qd: GAMMA_G * l.qG + GAMMA_Q * l.qW + GAMMA_Q * PSI0_SNOW * l.qS, kmod: k.short });
    out.push({ label: 'G + S + ψ₀W', qd: GAMMA_G * l.qG + GAMMA_Q * l.qS + GAMMA_Q * PSI0_WIND * l.qW, kmod: k.short });
  }
  return out;
}

/** Characteristic variable line load for the SLS combination (worst of the two leading actions). */
function slsVariable(l: BeamLoads): number {
  return Math.max(l.qS + PSI0_WIND * l.qW, l.qW + PSI0_SNOW * l.qS);
}

function checkBeam(input: BeamInput, mat: MaterialProps, k: Kmods): BeamOutput {
  const { width: b, height: h } = input.section;
  const Wel = (b * h * h) / 6;
  const I = (b * h * h * h) / 12;
  const L = Math.max(input.span, 1);
  const a = input.cantilever;
  const fvd = (kmod: number) => (kmod * mat.fvk) / mat.gammaM;

  let best: { stressUtil: number; shearUtil: number; sigma: number; fmd: number; Md: number; qd: number; governing: string } | undefined;
  for (const c of combos(input, k)) {
    const Mspan = (c.qd * L * L) / 8;
    const Mcant = (c.qd * a * a) / 2;
    const Md = Math.max(Mspan, Mcant);
    const sigma = Md / Wel;
    const fmd = (c.kmod * mat.fmk) / mat.gammaM;
    const stressUtil = sigma / fmd;
    const Vd = Math.max((c.qd * L) / 2, c.qd * a);
    const tau = (1.5 * Vd) / (0.67 * b * h);
    const shearUtil = tau / fvd(c.kmod);
    if (!best || Math.max(stressUtil, shearUtil) > Math.max(best.stressUtil, best.shearUtil)) {
      best = { stressUtil, shearUtil, sigma, fmd, Md, qd: c.qd, governing: c.label };
    }
  }
  const res = best!;

  // Deflection: span field (simply supported) and cantilever tip of an overhanging beam
  const kSpan = (5 * L ** 4) / (384 * mat.e0mean * I);
  const kCant = a > 0 ? Math.max(0, (a * (4 * a * a * L - L * L * L + 3 * a * a * a)) / (24 * mat.e0mean * I)) : 0;
  const qQ = slsVariable(input);
  const wSpanG = input.qG * kSpan;
  const wSpanQ = qQ * kSpan;
  const wCantG = input.qG * kCant;
  const wCantQ = qQ * kCant;
  const spanInst = wSpanG + wSpanQ;
  const spanFin = wSpanG * (1 + k.kdef) + wSpanQ;
  const cantInst = wCantG + wCantQ;
  const cantFin = wCantG * (1 + k.kdef) + wCantQ;
  const spanUtil = Math.max(spanInst / (L / 300), spanFin / (L / 200));
  const cantUtil = a > 0 ? Math.max(cantInst / ((2 * a) / 300), cantFin / ((2 * a) / 200)) : 0;
  const cantGoverns = cantUtil > spanUtil;
  const wInst = cantGoverns ? cantInst : spanInst;
  const wFin = cantGoverns ? cantFin : spanFin;
  const wLimit = cantGoverns ? (2 * a) / 200 : L / 200;
  const deflectionUtil = Math.max(spanUtil, cantUtil);

  return {
    ...res,
    wInst,
    wFin,
    wLimit,
    deflectionUtil,
    utilisation: Math.max(res.stressUtil, res.shearUtil, deflectionUtil),
  };
}

interface ColumnOutput {
  fcd: number;
  kc: number;
  lambda: number;
}

/** EC5 6.3.2 buckling reduction k_c of a pin-ended strut with effective length L_ef about its weak axis. */
function columnCurve(section: TimberSection, Lef: number, mat: MaterialProps, kmod: number): ColumnOutput {
  const { width: b, height: h } = section;
  const fcd = (kmod * mat.fc0k) / mat.gammaM;
  const i = Math.min(b, h) / Math.sqrt(12);
  const lambda = Math.max(Lef, 1) / i;
  const lambdaRel = (lambda / Math.PI) * Math.sqrt(mat.fc0k / mat.e005);
  let kc = 1;
  if (lambdaRel > 0.3) {
    const kk = 0.5 * (1 + mat.betaC * (lambdaRel - 0.3) + lambdaRel * lambdaRel);
    kc = Math.min(1, 1 / (kk + Math.sqrt(Math.max(kk * kk - lambdaRel * lambdaRel, 0))));
  }
  return { fcd, kc, lambda };
}

function statusOf(util: number): StaticsStatus {
  if (util > 1) return 'fail';
  if (util > OK_LIMIT) return 'warning';
  return 'ok';
}

function worst(statuses: StaticsStatus[]): StaticsStatus {
  if (statuses.includes('fail')) return 'fail';
  if (statuses.includes('warning')) return 'warning';
  return 'ok';
}

const fmt = (v: number, d = 1): string => v.toFixed(d);
const pct = (v: number): string => `${Math.round(v * 100)} %`;
const kn = (v: number): string => `${fmt(v, 1)} kN`;

/** Governing purlin span / cantilever from the posts actually present in a row. */
export function purlinSupports(postX: number[], start: number, end: number): { span: number; cantilever: number; posts: number } {
  const xs = [...postX].sort((a, b) => a - b);
  if (xs.length < 2) {
    // 0 or 1 post: nothing spans between supports – treat the whole purlin as the span so
    // the check fails loudly instead of reporting the nominal grid spacing.
    return { span: Math.max(end - start, 300), cantilever: 0, posts: xs.length };
  }
  let span = 300;
  for (let i = 1; i < xs.length; i++) span = Math.max(span, xs[i] - xs[i - 1]);
  const cantilever = Math.max(0, xs[0] - start, end - xs[xs.length - 1]);
  return { span, cantilever, posts: xs.length };
}

/**
 * Governing purlin span after crediting the knee braces: every brace leaning into a bay
 * shortens it by `BRACE_SPAN_CREDIT × leg` (the brace acts as an elastic support). Returns the
 * widest effective bay and how many braces support it.
 */
export function bracedPurlinSpan(
  positions: number[],
  braces: { postIndex: number; side: number }[],
  leg: number,
): { span: number; braces: number; rawSpan: number } {
  const sorted = positions.map((pos, index) => ({ pos, index })).sort((a, b) => a.pos - b.pos);
  const has = (postIndex: number, side: number) => braces.some((b) => b.postIndex === postIndex && b.side === side);
  let best = { span: 300, braces: 0, rawSpan: 300 };
  for (let i = 1; i < sorted.length; i++) {
    const raw = sorted[i].pos - sorted[i - 1].pos;
    const n = (has(sorted[i - 1].index, 1) ? 1 : 0) + (has(sorted[i].index, -1) ? 1 : 0);
    const span = Math.max(300, raw - n * BRACE_SPAN_CREDIT * leg);
    if (span > best.span) best = { span, braces: n, rawSpan: raw };
  }
  return best;
}

type Axis = 'x' | 'z';
const OTHER: Record<Axis, Axis> = { x: 'z', z: 'x' };
const AXIS_LABEL: Record<Axis, string> = { x: 'along the length (X)', z: 'across (Z)' };
const WALLS_ALONG: Record<Axis, WallId[]> = { x: ['front', 'rear'], z: ['left', 'right'] };

interface LateralSystem {
  axis: Axis;
  /** Rows whose purlins run along this axis (their knee braces act in this direction) */
  rows: PostRow[];
  /** Active knee braces per braced row: min over both load senses */
  bracedRows: { row: PostRow; active: number }[];
  /** Closed (boarded) outer walls in the plane of this axis */
  shearWalls: WallId[];
  kind: 'braces' | 'wall' | 'sway';
}

interface Context {
  project: ProjectState;
  params: ReturnType<typeof sanitizeParams>;
  framing: FramingResult;
  roofLines: RoofLines;
  mat: MaterialProps;
  k: Kmods;
  cos: number;
  tan: number;
  density: number;
  deadLoad: number;
  snowLoadRoof: number;
  spacingM: number;
  slopedPurlins: boolean;
  rowOffsets: number[];
  rowIds: string[];
  braces: BracePlacement[];
  braceLeg: number;
  lateral: Record<Axis, LateralSystem>;
  /** Plan area incl. overhangs (m²) */
  planArea: number;
  /** Plumb height of the exposed roof edge band (mm) */
  edgeBand: number;
  totalPosts: number;
  /** Face areas (m²) of every outer wall, plumb */
  faceArea: Record<WallId, number>;
  canopy: { down: number; up: number };
}

function buildContext(project: ProjectState, framing: FramingResult): Context {
  const params = sanitizeParams(project.params);
  const { timber, loads, overhangs } = params;
  const mat = MATERIALS[timber.strengthClass];
  const k: Kmods = {
    medium: KMOD_BY_SERVICE_CLASS[loads.serviceClass],
    short: KMOD_SHORT_BY_SERVICE_CLASS[loads.serviceClass],
    kdef: KDEF_BY_SERVICE_CLASS[loads.serviceClass],
  };
  const roof = framing.roof;
  const roofLines = computeRoofLines(params);
  const cos = Math.cos(roof.pitchRad);
  const tan = Math.tan(roof.pitchRad);
  const density = (mat.density * G_ACCEL) / 1000; // kN/m³

  const covering = ROOF_COVERING_LOAD[loads.roofCovering];
  const spacingM = Math.max(roof.rafterSpacing, 1) / 1000;
  const rafterSelf = (density * (timber.rafter.width / 1000) * (timber.rafter.height / 1000)) / spacingM; // kN/m² surface
  const deadLoad = (covering.load + rafterSelf) / cos; // kN/m² plan
  const snowLoadRoof = snowShapeCoefficient(roof.pitchDeg) * loads.snowLoad;

  const grid = framing.grid;
  const braces = braceLayout(params, roofLines, grid);
  const braceLeg = Math.max(300, params.braceLeg);
  const hardware = params.connectionMode === 'hardware';

  const lateral = {} as Record<Axis, LateralSystem>;
  for (const axis of ['x', 'z'] as Axis[]) {
    const rows = grid.rows.filter((r) => r.axis === axis);
    const bracedRows: LateralSystem['bracedRows'] = [];
    for (const row of rows) {
      const rowBraces = braces.filter((b) => b.rowKey === row.key);
      // Load sense +: braces leaning towards − go into compression, the others into tension
      // (tension only counts with mechanical connectors – a tenon cannot pull).
      const active = (sense: number) => rowBraces.filter((b) => b.side === -sense).length + (hardware ? rowBraces.filter((b) => b.side === sense).length : 0);
      const n = Math.min(active(1), active(-1));
      if (n > 0) bracedRows.push({ row, active: n });
    }
    const shearWalls = WALLS_ALONG[axis].filter((id) => project.walls[id]?.closed);
    const kind: LateralSystem['kind'] = bracedRows.length > 0 ? 'braces' : shearWalls.length > 0 ? 'wall' : 'sway';
    lateral[axis] = { axis, rows, bracedRows, shearWalls, kind };
  }

  const lengthM = (params.length + overhangs.left + overhangs.right) / 1000;
  const widthM = (params.width + overhangs.front + overhangs.rear) / 1000;
  const avgHeight = (params.frontHeight + params.rearHeight) / 2;
  const faceArea: Record<WallId, number> = {
    front: (params.length * params.frontHeight) / 1e6,
    rear: (params.length * params.rearHeight) / 1e6,
    left: (params.width * avgHeight) / 1e6,
    right: (params.width * avgHeight) / 1e6,
  };
  const totalPosts = grid.rows.reduce((n, r) => n + r.positions.length, 0) + Object.values(grid.wallPosts).reduce((n, w) => n + (w?.positions.length ?? 0), 0);

  return {
    project,
    params,
    framing,
    roofLines,
    mat,
    k,
    cos,
    tan,
    density,
    deadLoad,
    snowLoadRoof,
    spacingM,
    slopedPurlins: grid.scheme === 'sloped-purlins',
    rowOffsets: grid.rows.map((r) => r.offset),
    rowIds: grid.rows.map((r) => (r.wallId ? `purlin-${r.wallId}` : `purlin-mid-${r.index ?? 0}`)),
    braces,
    braceLeg,
    lateral,
    planArea: lengthM * widthM,
    edgeBand: roofLines.rafterPlumbHeight + covering.thickness + timber.beam.height,
    totalPosts: Math.max(totalPosts, 1),
    faceArea,
    canopy: canopyForceCoefficients(roof.pitchDeg),
  };
}

/** Characteristic horizontal wind force (kN) on the structure along `axis` for velocity pressure q (kN/m²). */
function windForce(ctx: Context, axis: Axis, q: number): number {
  const { params, faceArea, edgeBand, planArea, canopy, tan } = ctx;
  const facing = WALLS_ALONG[OTHER[axis]]; // walls standing across the wind direction
  const closed = facing.filter((id) => ctx.project.walls[id]?.closed);
  const o = params.overhangs;
  const extent = axis === 'x' ? params.width + o.front + o.rear : params.length + o.left + o.right;
  const faceM2 = closed.length > 0 ? Math.max(...closed.map((id) => faceArea[id])) : (edgeBand * extent) / 1e6;
  let F = WALL_FORCE_COEFFICIENT * q * faceM2 + ROOF_FRICTION_COEFFICIENT * q * planArea;
  // component of the roof normal force along the slope (canonical slope runs along Z)
  if (axis === 'z') F += Math.max(canopy.down, -canopy.up) * q * planArea * tan;
  return F;
}

function computeChecks(ctx: Context, q: number): StaticsCheck[] {
  const { project, params, framing, roofLines, mat, k, cos, deadLoad, snowLoadRoof, spacingM, slopedPurlins, rowOffsets, rowIds } = ctx;
  const { timber, overhangs, loads } = params;
  const roof = framing.roof;
  const grid = framing.grid;
  const pw = timber.post.width;
  const checks: StaticsCheck[] = [];
  const windDown = ctx.canopy.down * q; // kN/m² plan (vertical component of the roof pressure)
  const windUp = -ctx.canopy.up * q; // kN/m² plan suction
  const kmodShort = k.short;

  // ── Rafters ─────────────────────────────────────────────────────────────
  {
    let horizontalSpan = 500;
    for (let i = 1; i < rowOffsets.length; i++) horizontalSpan = Math.max(horizontalSpan, rowOffsets[i] - rowOffsets[i - 1] - pw);
    const span = slopedPurlins ? horizontalSpan : horizontalSpan / cos;
    const nMid = rowOffsets.length - 2;
    const cantilever = slopedPurlins ? Math.max(overhangs.left, overhangs.right) : Math.max(overhangs.front, overhangs.rear) / cos;
    const factor = slopedPurlins ? 1 : cos * cos;
    const loadsR: BeamLoads = { qG: deadLoad * spacingM * factor, qS: snowLoadRoof * spacingM * factor, qW: windDown * spacingM };
    const res = checkBeam({ section: timber.rafter, span, cantilever, ...loadsR }, mat, k);
    const status = statusOf(res.utilisation);
    let recommendation: string | undefined;
    if (status !== 'ok') {
      const better = STANDARD_DEPTHS.find(
        (h) => h > timber.rafter.height && checkBeam({ section: { width: timber.rafter.width, height: h }, span, cantilever, ...loadsR }, mat, k).utilisation <= OK_LIMIT,
      );
      recommendation = better
        ? `Increase rafters to ${timber.rafter.width}×${better} mm, or reduce rafter spacing / the max rafter length (adds a mid purlin).`
        : 'Reduce the max rafter length to add an intermediate purlin row and halve the rafter span.';
    }
    checks.push({
      id: 'rafter',
      kind: 'vertical',
      element: 'Rafter',
      elementDe: 'Sparren',
      section: timber.rafter,
      span: Math.round(span),
      loadUls: res.qd,
      loadSls: loadsR.qG + slsVariable(loadsR),
      stressUtil: res.stressUtil,
      deflectionUtil: res.deflectionUtil,
      deflection: res.wFin,
      deflectionLimit: res.wLimit,
      utilisation: res.utilisation,
      status,
      recommendation,
      detail: `${nMid > 0 ? `Supported on ${nMid + 2} purlin rows, governing bay treated as simply supported (conservative)` : 'Simply supported on both purlins'}, span ${fmt(span / 1000, 2)} m (${slopedPurlins ? 'level' : 'sloped'}), spacing ${roof.rafterSpacing} mm, cantilever ${Math.round(cantilever)} mm. Governing ${res.governing}: σ_m,d = ${fmt(res.sigma)} ≤ f_m,d = ${fmt(res.fmd)} N/mm² (${pct(res.stressUtil)}), shear ${pct(res.shearUtil)}, w_fin = ${fmt(res.wFin)} mm ≤ ${fmt(res.wLimit)} mm.`,
    });
  }

  // ── Purlins ─────────────────────────────────────────────────────────────
  const purlinSelf = ctx.density * (timber.beam.width / 1000) * (timber.beam.height / 1000);
  const purlinStart = slopedPurlins ? -overhangs.front : -overhangs.left;
  const purlinEnd = slopedPurlins ? params.width + overhangs.rear : params.length + overhangs.right;
  const half = (i: number, j: number): number => (rowOffsets[j] - rowOffsets[i]) / 2;
  const last = rowOffsets.length - 1;
  const eaveOverhang = (wallId: string | undefined): number =>
    wallId === 'front' ? overhangs.front : wallId === 'rear' ? overhangs.rear : wallId === 'left' ? overhangs.left : wallId === 'right' ? overhangs.right : 0;
  const purlinRows = grid.rows.map((row, idx) => ({
    id: rowIds[idx],
    label: row.name,
    labelDe: row.nameDe,
    trib: (idx > 0 ? half(idx - 1, idx) : 0) + (idx < last ? half(idx, idx + 1) : 0) + eaveOverhang(row.wallId),
    supports: purlinSupports(row.positions, purlinStart, purlinEnd),
    braced: bracedPurlinSpan(
      row.positions,
      ctx.braces.filter((b) => b.rowKey === row.key),
      ctx.braceLeg,
    ),
    row,
  }));
  const spanFactor = slopedPurlins ? 1 / cos : 1;
  const loadFactor = slopedPurlins ? cos * cos : 1;
  const purlinLoads = purlinRows.map((row) => {
    const tribM = row.trib / 1000;
    const qvG = deadLoad * tribM + purlinSelf;
    const qvS = snowLoadRoof * tribM;
    const qvW = windDown * tribM;
    const qvUp = windUp * tribM;
    return { row, qvG, qvS, qvW, qvUp, beam: { qG: qvG * loadFactor, qS: qvS * loadFactor, qW: qvW * loadFactor } as BeamLoads };
  });
  for (const { row, beam } of purlinLoads) {
    const { cantilever: gapCantilever, posts } = row.supports;
    const gap = posts >= 2 ? row.braced.span : row.supports.span;
    const purlinSpan = gap * spanFactor;
    const purlinCantilever = gapCantilever * spanFactor;
    const res = checkBeam({ section: timber.beam, span: purlinSpan, cantilever: purlinCantilever, ...beam }, mat, k);
    const unsupported = posts < 2;
    const status = unsupported ? 'fail' : statusOf(res.utilisation);
    let recommendation: string | undefined;
    if (unsupported) {
      recommendation = `${row.label} rests on ${posts} post${posts === 1 ? '' : 's'} – a purlin row needs at least two posts.`;
    } else if (status !== 'ok') {
      const better = STANDARD_DEPTHS.find(
        (h) => h > timber.beam.height && checkBeam({ section: { width: timber.beam.width, height: h }, span: purlinSpan, cantilever: purlinCantilever, ...beam }, mat, k).utilisation <= OK_LIMIT,
      );
      recommendation = better
        ? `Increase purlins to ${timber.beam.width}×${better} mm, reduce the max. post spacing${params.braces ? '' : ' or enable knee braces'}.`
        : 'Reduce the maximum post spacing (add posts).';
    }
    const braceNote =
      posts >= 2 && row.braced.braces > 0
        ? ` (${fmt(row.braced.rawSpan / 1000, 2)} m between posts, ${row.braced.braces} knee brace${row.braced.braces > 1 ? 's' : ''} credited with ${Math.round(BRACE_SPAN_CREDIT * 100)} % of the ${ctx.braceLeg} mm leg)`
        : '';
    checks.push({
      id: row.id,
      kind: 'vertical',
      element: row.label,
      elementDe: row.labelDe,
      section: timber.beam,
      span: Math.round(purlinSpan),
      loadUls: res.qd,
      loadSls: beam.qG + slsVariable(beam),
      stressUtil: res.stressUtil,
      deflectionUtil: res.deflectionUtil,
      deflection: res.wFin,
      deflectionLimit: res.wLimit,
      utilisation: res.utilisation,
      status,
      recommendation,
      detail: `${unsupported ? `Only ${posts} post in this row – no supported span. ` : ''}Governing span ${fmt(purlinSpan / 1000, 2)} m${slopedPurlins ? ' (sloped)' : ''}${braceNote}, ${posts} posts, simply supported (conservative), tributary width ${fmt(row.trib / 1000, 2)} m, end cantilever ${Math.round(purlinCantilever)} mm. Governing ${res.governing}: σ_m,d = ${fmt(res.sigma)} ≤ ${fmt(res.fmd)} N/mm² (${pct(res.stressUtil)}), w_fin = ${fmt(res.wFin)} mm ≤ ${fmt(res.wLimit)} mm.`,
    });
  }

  // ── Lateral system: horizontal design forces per direction ───────────────
  const planArea = ctx.planArea;
  const verticalDesign = {
    snow: GAMMA_G * deadLoad + GAMMA_Q * snowLoadRoof,
    windLead: GAMMA_G * deadLoad + GAMMA_Q * windDown + GAMMA_Q * PSI0_SNOW * snowLoadRoof,
    snowLead: GAMMA_G * deadLoad + GAMMA_Q * snowLoadRoof + GAMMA_Q * PSI0_WIND * windDown,
  };
  const horizontal = (axis: Axis) => {
    const Wk = windForce(ctx, axis, q);
    return {
      Wk,
      windLead: GAMMA_Q * Wk + NOTIONAL_SWAY * verticalDesign.windLead * planArea,
      snowLead: GAMMA_Q * PSI0_WIND * Wk + NOTIONAL_SWAY * verticalDesign.snowLead * planArea,
    };
  };
  const H: Record<Axis, ReturnType<typeof horizontal>> = { x: horizontal('x'), z: horizontal('z') };

  /** Effective buckling length of a post in direction `axis` (sway frames double the height). */
  const bucklingLength = (axis: Axis, height: number, rowAxis: Axis, rowBraced: boolean): number => {
    if (ctx.lateral[axis].kind === 'sway') return 2 * height;
    if (axis === rowAxis && rowBraced && (params.braceDirection === 'both' || params.connectionMode === 'hardware')) return Math.max(height - ctx.braceLeg, 500);
    return height;
  };

  // ── Posts (the tallest post of each row governs: buckling length + tributary) ──
  const Wpost = (Math.min(pw, timber.post.height) ** 2 * Math.max(pw, timber.post.height)) / 6;
  const Apost = pw * timber.post.height;
  const postRows = purlinLoads.map((load) => {
    const row = load.row.row;
    const tallest = row.positions.length > 0 ? Math.max(...row.positions.map((pos) => rowPostTop(row, roofLines, params, pos))) : rowPostTop(row, roofLines, params, pw / 2);
    return {
      id: load.row.id.replace('purlin', 'post'),
      label: row.name.replace('Purlin', 'Post'),
      labelDe: row.nameDe === 'Mittelpfette' ? 'Pfosten mitte' : row.nameDe.replace('Pfette', 'Pfosten'),
      height: tallest,
      rowAxis: row.axis,
      rowBraced: ctx.lateral[row.axis].bracedRows.some((b) => b.row.key === row.key),
      load,
    };
  });
  const swayUtil: Record<Axis, { util: number; detail: string; element: string }> = {
    x: { util: 0, detail: '', element: '' },
    z: { util: 0, detail: '', element: '' },
  };
  for (const row of postRows) {
    const { span: gap, cantilever: gapCantilever } = row.load.row.supports;
    const spanM = (gap + gapCantilever) / 1000;
    const { qvG, qvS, qvW } = row.load;
    const Nsnow = (GAMMA_G * qvG + GAMMA_Q * qvS) * spanM;
    const Nk = (qvG + qvS) * spanM;
    const Lrow = bucklingLength(row.rowAxis, row.height, row.rowAxis, row.rowBraced);
    const Lperp = bucklingLength(OTHER[row.rowAxis], row.height, row.rowAxis, row.rowBraced);
    const Lef = Math.max(Lrow, Lperp);
    const col = columnCurve(timber.post, Lef, mat, k.medium);
    const sigma = (Nsnow * 1000) / Apost;
    let utilisation = sigma / (col.kc * col.fcd);
    let governing = 'G + S';
    const combined: string[] = [];

    // Sway directions: the post is a cantilever from a moment-fixed base and carries the wind moment
    for (const axis of ['x', 'z'] as Axis[]) {
      if (ctx.lateral[axis].kind !== 'sway') continue;
      const colShort = columnCurve(timber.post, Lef, mat, kmodShort);
      const fmdShort = (kmodShort * mat.fmk) / mat.gammaM;
      const cases = [
        { label: 'G + W + ψ₀S', N: (GAMMA_G * qvG + GAMMA_Q * qvW + GAMMA_Q * PSI0_SNOW * qvS) * spanM, Hd: H[axis].windLead },
        { label: 'G + S + ψ₀W', N: (GAMMA_G * qvG + GAMMA_Q * qvS + GAMMA_Q * PSI0_WIND * qvW) * spanM, Hd: H[axis].snowLead },
      ];
      for (const c of cases) {
        const Hpost = c.Hd / ctx.totalPosts;
        const Md = Hpost * row.height; // kN·mm
        const sigmaC = (c.N * 1000) / Apost;
        const sigmaM = (Md * 1000) / Wpost;
        const util = sigmaC / (colShort.kc * colShort.fcd) + sigmaM / fmdShort;
        if (util > utilisation) {
          utilisation = util;
          governing = `${c.label} ${AXIS_LABEL[axis]}`;
        }
        if (util > swayUtil[axis].util) {
          swayUtil[axis] = {
            util,
            element: row.label,
            detail: `${row.label}: H_d = ${kn(Hpost)} per post (${ctx.totalPosts} posts share ${kn(c.Hd)} incl. ${Math.round(NOTIONAL_SWAY * 100)} % notional sway), M_d = ${fmt(Md / 1000, 2)} kNm at the base, N_d = ${kn(c.N)}. σ_c/(k_c·f_c,0,d) + σ_m/f_m,d = ${fmt(sigmaC / (colShort.kc * colShort.fcd), 2)} + ${fmt(sigmaM / fmdShort, 2)} = ${pct(util)} (${c.label}, k_mod ${kmodShort}).`,
          };
        }
        combined.push(`${c.label}: ${pct(util)}`);
      }
    }

    const status = statusOf(utilisation);
    let recommendation: string | undefined;
    if (status !== 'ok') {
      const better = [120, 140, 160, 180, 200, 220, 240].find((s) => {
        if (s <= Math.min(timber.post.width, timber.post.height)) return false;
        const sec = { width: s, height: s };
        const c = columnCurve(sec, Lef, mat, k.medium);
        return (Nsnow * 1000) / (s * s) / (c.kc * c.fcd) <= OK_LIMIT * 0.7; // leave room for the sway bending
      });
      const sway = (['x', 'z'] as Axis[]).filter((a) => ctx.lateral[a].kind === 'sway');
      recommendation = better ? `Use ${better}×${better} mm posts or add posts to reduce the load per post.` : 'Add posts to reduce the load per post.';
      if (sway.length > 0) recommendation += ` Bracing ${sway.map((a) => AXIS_LABEL[a]).join(' and ')} (knee braces / a boarded wall) halves the buckling length and removes the wind moment.`;
    }
    checks.push({
      id: row.id,
      kind: 'vertical',
      element: row.label,
      elementDe: row.labelDe,
      section: timber.post,
      span: Math.round(Lef),
      loadUls: Nsnow,
      loadSls: Nk,
      stressUtil: utilisation,
      deflectionUtil: 0,
      deflection: 0,
      deflectionLimit: 0,
      utilisation,
      status,
      recommendation,
      detail: `N_d = ${kn(Nsnow)} (G + S), buckling length ${Math.round(Lef)} mm (in row ${Math.round(Lrow)} / across ${Math.round(Lperp)} mm; λ = ${fmt(col.lambda, 0)}, k_c = ${fmt(col.kc, 2)}). σ_c,0,d = ${fmt(sigma, 2)} ≤ k_c·f_c,0,d = ${fmt(col.kc * col.fcd, 2)} N/mm² (${pct(sigma / (col.kc * col.fcd))}).${combined.length ? ` With wind moment ${combined.join(', ')}.` : ''} Governing ${governing}.`,
    });
  }

  // ── Bracing per direction ────────────────────────────────────────────────
  const braceSection = timber.brace;
  const braceAxisLength = ctx.braceLeg * SQRT2;
  for (const axis of ['x', 'z'] as Axis[]) {
    const sys = ctx.lateral[axis];
    const Hd = Math.max(H[axis].windLead, H[axis].snowLead);
    const base = {
      id: `bracing-${axis}`,
      kind: 'lateral' as const,
      loadUls: Hd,
      loadSls: H[axis].Wk,
      deflectionUtil: 0,
      deflection: 0,
      deflectionLimit: 0,
    };
    if (sys.kind === 'braces') {
      const Hrow = Hd / sys.bracedRows.length;
      let worstRow = sys.bracedRows[0];
      for (const r of sys.bracedRows) if (r.active < worstRow.active) worstRow = r;
      const Nbrace = (Hrow / worstRow.active) * SQRT2;
      const col = columnCurve(braceSection, braceAxisLength, mat, kmodShort);
      const sigma = (Nbrace * 1000) / (braceSection.width * braceSection.height);
      const utilisation = sigma / (col.kc * col.fcd);
      const status = statusOf(utilisation);
      const better = status !== 'ok' ? BRACE_SECTIONS.find((s) => s.width * s.height > braceSection.width * braceSection.height && (Nbrace * 1000) / (s.width * s.height) / (columnCurve(s, braceAxisLength, mat, kmodShort).kc * col.fcd) <= OK_LIMIT) : undefined;
      checks.push({
        ...base,
        element: `Knee braces ${AXIS_LABEL[axis]}`,
        elementDe: 'Kopfbänder',
        section: braceSection,
        span: Math.round(braceAxisLength),
        stressUtil: utilisation,
        utilisation,
        status,
        recommendation:
          status !== 'ok'
            ? better
              ? `Use ${sectionLabel(better)} knee braces, add posts (more braces per row)${params.connectionMode === 'hardware' ? '' : ' or use mechanical connectors so the tension braces also act'}.`
              : `Add posts (more braces per row)${params.braceDirection === 'both' ? '' : ' or set the brace direction to both sides'}.`
            : undefined,
        detail: `Wind ${AXIS_LABEL[axis]}: W_k = ${kn(H[axis].Wk)}, H_d = ${kn(Hd)} (incl. ${Math.round(NOTIONAL_SWAY * 100)} % notional sway) shared by ${sys.bracedRows.length} braced row${sys.bracedRows.length > 1 ? 's' : ''}; ${worstRow.row.name} has ${worstRow.active} active brace${worstRow.active > 1 ? 's' : ''} per load sense${params.connectionMode === 'hardware' ? ' (tension braces count – mechanical connectors)' : ' (compression only – tenon joints)'}. Strut N_d = ${kn(Nbrace)}, L_ef = ${Math.round(braceAxisLength)} mm, k_c = ${fmt(col.kc, 2)}: σ_c,0,d = ${fmt(sigma, 2)} ≤ ${fmt(col.kc * col.fcd, 2)} N/mm² (${pct(utilisation)}). Brace-to-post / purlin joints not verified.`,
      });
    } else if (sys.kind === 'wall') {
      const wallArea = sys.shearWalls.reduce((a, id) => a + ctx.faceArea[id], 0);
      const shear = Hd / Math.max(wallArea, 0.1); // kN/m² of boarded wall face
      checks.push({
        ...base,
        element: `Boarded wall ${AXIS_LABEL[axis]}`,
        elementDe: 'Wandscheibe',
        section: timber.stud,
        span: Math.round(sys.shearWalls.reduce((m, id) => Math.max(m, id === 'front' || id === 'rear' ? params.length : params.width), 0)),
        stressUtil: 0,
        utilisation: 0,
        status: 'ok',
        detail: `Wind ${AXIS_LABEL[axis]}: W_k = ${kn(H[axis].Wk)}, H_d = ${kn(Hd)} resisted by the closed ${sys.shearWalls.join(' + ')} wall${sys.shearWalls.length > 1 ? 's' : ''} as shear wall${sys.shearWalls.length > 1 ? 's' : ''} (${fmt(shear, 2)} kN/m² of boarding). Board / panel fixing not verified – use ≥ 18 mm boarding or OSB nailed at ≤ 150 mm.`,
      });
    } else {
      const s = swayUtil[axis];
      const status = statusOf(s.util);
      const canBrace = sys.rows.length > 0;
      checks.push({
        ...base,
        element: `Sway posts ${AXIS_LABEL[axis]}`,
        elementDe: 'Eingespannte Pfosten',
        section: timber.post,
        span: Math.round(Math.max(...postRows.map((r) => r.height))),
        stressUtil: s.util,
        utilisation: s.util,
        status,
        recommendation:
          status !== 'ok'
            ? canBrace
              ? 'Enable knee braces in this direction (or close a wall in this plane), or use larger posts.'
              : 'Close a wall in this plane (shear wall) or use larger posts.'
            : `Requires moment-fixed post bases (H-anchors ≥ 600 mm embedded or cast-in steel shoes) – ${kn(Hd / ctx.totalPosts)} shear and ${fmt((Hd / ctx.totalPosts) * (Math.max(...postRows.map((r) => r.height)) / 1000), 2)} kNm per base.`,
        detail: `Wind ${AXIS_LABEL[axis]}: W_k = ${kn(H[axis].Wk)}, H_d = ${kn(Hd)}. No knee braces or boarded wall act in this direction – the posts cantilever from their bases (buckling length 2·h). ${s.detail}`,
      });
    }
  }

  // ── Headers over openings (non-loadbearing infill walls) ─────────────────
  const claddingLoad = 0.15; // kN/m² boards incl. battens
  for (const member of framing.members) {
    if (member.category !== 'header' || (!member.wallId && !member.partitionId)) continue;
    const host = member.wallId ? project.walls[member.wallId] : project.partitions.find((p) => p.id === member.partitionId);
    const opening = host?.openings.find((o) => member.notes?.includes(`${o.width} mm`) && member.name.includes(o.label ?? ''));
    const wallTop = member.wallId === 'front' ? params.frontHeight : member.wallId === 'rear' ? params.rearHeight : (params.frontHeight + params.rearHeight) / 2;
    const heightAbove = Math.max(wallTop - (member.start.y + member.section.height / 2), 200) / 1000;
    const clearSpan = Math.max(member.length - 2 * timber.stud.width, 300);
    const hl: BeamLoads = {
      qG: claddingLoad * heightAbove + ctx.density * (timber.stud.width / 1000) * (timber.stud.height / 1000) * 2 + 0.2,
      qS: 0.5, // nominal incidental load (e.g. snow sliding onto the wall top, occupants leaning)
      qW: 0,
    };
    const res = checkBeam({ section: member.section, span: clearSpan, cantilever: 0, ...hl }, mat, k);
    const status = statusOf(res.utilisation);
    checks.push({
      id: `header-${member.id}`,
      kind: 'vertical',
      element: `Header ${opening?.label ?? ''} (${member.wallId ?? 'partition'})`.replace('  ', ' '),
      elementDe: 'Sturz',
      section: member.section,
      span: Math.round(clearSpan),
      loadUls: res.qd,
      loadSls: hl.qG + hl.qS,
      stressUtil: res.stressUtil,
      deflectionUtil: res.deflectionUtil,
      deflection: res.wFin,
      deflectionLimit: res.wLimit,
      utilisation: res.utilisation,
      status,
      recommendation: status !== 'ok' ? 'Use a deeper header (Sturz) or a doubled header section.' : undefined,
      detail: `Infill wall header – carries wall self-weight above the opening plus a nominal 0.5 kN/m. Clear span ${clearSpan} mm, section ${sectionLabel(member.section)}. σ = ${fmt(res.sigma)} N/mm² (${pct(res.stressUtil)}), w_fin = ${fmt(res.wFin)} mm ≤ ${fmt(res.wLimit)} mm.`,
    });
  }

  // ── Roof uplift → anchor tension ─────────────────────────────────────────
  {
    // Post self-weight (kN) hangs on the anchor too: section area × tallest post of the row.
    const postSelf = (height: number): number => (ctx.density * Apost * height) / 1e9;
    let worstRow = purlinLoads[0];
    let worstUtil = 0;
    let worstNet = 0;
    let worstG = 0;
    let worstPostG = 0;
    for (const post of postRows) {
      const load = post.load;
      const { span: gap, cantilever: gapCantilever } = load.row.supports;
      const spanM = (gap + gapCantilever) / 1000;
      const up = GAMMA_Q * load.qvUp * spanM;
      const roofG = load.qvG * spanM;
      const postG = postSelf(post.height);
      const down = GAMMA_G_FAVOURABLE * (roofG + postG);
      const util = down > 0 ? up / down : 0;
      if (util > worstUtil) {
        worstUtil = util;
        worstRow = load;
        worstNet = up - down;
        worstG = down;
        worstPostG = postG;
      }
    }
    const spanM = (worstRow.row.supports.span + worstRow.row.supports.cantilever) / 1000;
    checks.push({
      id: 'uplift',
      kind: 'uplift',
      element: 'Roof uplift / anchoring',
      elementDe: 'Abhebesicherung',
      section: timber.post,
      span: Math.round(spanM * 1000),
      loadUls: GAMMA_Q * worstRow.qvUp * spanM,
      loadSls: worstRow.qvUp * spanM,
      stressUtil: worstUtil,
      deflectionUtil: 0,
      deflection: 0,
      deflectionLimit: 0,
      utilisation: worstUtil,
      status: worstUtil > 1 ? 'warning' : 'ok',
      recommendation:
        worstUtil > 1
          ? `Every post anchor and purlin-to-post joint must resist ${kn(worstNet)} tension (net uplift). Use tension-rated post shoes and screw / bolt the purlins and rafters down.`
          : undefined,
      detail: `Canopy suction c_f = ${fmt(ctx.canopy.up, 2)} → ${fmt(windUp, 2)} kN/m² plan (q_p = ${fmt(q, 2)} kN/m²). ${worstRow.row.label}: uplift 1.5·W = ${kn(GAMMA_Q * worstRow.qvUp * spanM)} vs. dead load 1.0·G = ${kn(worstG)} per post (roof + purlin ${kn(GAMMA_G_FAVOURABLE * worstRow.qvG * spanM)}, post ${kn(GAMMA_G_FAVOURABLE * worstPostG)}) (${pct(worstUtil)}). ${worstUtil > 1 ? `Net ${kn(worstNet)} tension per post.` : 'Dead load holds the roof down; anchors take shear only.'} Light coverings (${ROOF_COVERING_LOAD[loads.roofCovering].label}) are governed by uplift, not snow.`,
    });
  }

  return checks;
}

/** Peak velocity pressure (kN/m²) at which the first non-uplift check exceeds 100 %. */
function collapsePressure(ctx: Context, q0: number): { q: number; element: string } | undefined {
  const worstUtil = (q: number) => {
    const checks = computeChecks(ctx, q).filter((c) => c.kind !== 'uplift');
    return checks.reduce((m, c) => (c.utilisation > m.utilisation ? c : m), checks[0]);
  };
  if (worstUtil(0).utilisation >= 1) return undefined;
  let lo = 0;
  let hi = Math.max(q0, 0.5);
  let atHi = worstUtil(hi);
  while (atHi.utilisation < 1) {
    lo = hi;
    hi *= 2;
    if (hi > 200) return undefined; // > 560 m/s – nothing realistic
    atHi = worstUtil(hi);
  }
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    const at = worstUtil(mid);
    if (at.utilisation >= 1) {
      hi = mid;
      atHi = at;
    } else lo = mid;
  }
  return { q: hi, element: atHi.element };
}

export function computeStatics(project: ProjectState, framing: FramingResult): StaticsResult {
  const ctx = buildContext(project, framing);
  const q = Math.max(Number.isFinite(ctx.params.loads.windLoad) ? ctx.params.loads.windLoad : 0.65, 0);
  const checks = computeChecks(ctx, q);
  const collapse = collapsePressure(ctx, q);
  const { deadLoad, snowLoadRoof } = ctx;
  return {
    // The uplift check is an anchoring advisory (hardware choice), not a member failure
    status: worst(checks.filter((c) => c.kind !== 'uplift').map((c) => c.status)),
    checks,
    loads: {
      deadLoad,
      snowLoadRoof,
      totalCharacteristic: deadLoad + snowLoadRoof,
      totalDesign: GAMMA_G * deadLoad + GAMMA_Q * snowLoadRoof,
      kmod: ctx.k.medium,
      kdef: ctx.k.kdef,
      windPressure: q,
      gustSpeed: pressureToGustSpeed(q),
      windForce: { x: windForce(ctx, 'x', q), z: windForce(ctx, 'z', q) },
      upliftPressure: -ctx.canopy.up * q,
    },
    collapseGustSpeed: collapse ? pressureToGustSpeed(collapse.q) : undefined,
    collapseElement: collapse?.element,
  };
}
