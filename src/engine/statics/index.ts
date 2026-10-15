import type { FramingResult, PostRow, ProjectState, StaticsCheck, StaticsFitting, StaticsResult, StaticsStatus, TimberSection, Wall, WallId } from '@/types';
import { DECKING, floorLayout, sanitizeParams, screenPartWall, wallExtent } from '../framing';
import { resolveScreenCladding } from '../framing/cladding';
import { braceLayout, rowPoint, rowPostTop, type BracePlacement } from '../framing/structure';
import { groundAt, groundPlaneOf } from '../groundSlope';
import { computeRoofLines, type RoofLines } from '../framing/roofLines';
import { clampFreePost, freePostRow, freePostTop } from '../freePosts';
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
import { upliftChainChecks } from './upliftChain';
import { studWindChecks } from './studs';
import { roofStrapBays, strapNailCapacity, strapTensionRd, wallStraps } from '../framing/straps';
import { connectionChecks } from './connections';
import { foundationChecks } from './foundations';
import { EXCEPTIONAL_SNOW_FACTOR, siteSnowLoad } from './siteLoads';
import { canopyLocalCoefficients, type CanopyZones } from './windZones';
import { distributeLateral, holdDownTension, panelNailCapacity, panelNailSpacing, shearWallElement, type LateralLoad, type WallShare } from './shearWalls';

/**
 * Simplified structural verification following Eurocode 5 (EN 1995-1-1) principles:
 *  - ULS bending & shear with k_mod / γ_M design strengths, three load combinations
 *    (snow leading, wind leading, snow leading + accompanying wind)
 *  - SLS deflection with k_def creep (w_inst ≤ L/300, w_fin ≤ L/200, cantilevers 2a)
 *  - Post buckling with the EC5 k_c reduction, buckling lengths per direction from the
 *    actual bracing system (knee braces / boarded walls / sway posts)
 *  - Lateral stability per direction: knee braces as compression struts, boarded walls as
 *    shear walls, or posts as cantilevers with combined compression + bending
 *  - Roof uplift (canopy suction) vs. dead load incl. concrete post footings → net anchor tension per post
 * Connections, fire, foundations and second-order effects are NOT covered – this is a
 * pre-design tool, not a replacement for a structural engineer's calculation.
 */

const GAMMA_G = 1.35;
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
  /** Instantaneous action (accidental snow) */
  instant: number;
  kdef: number;
  /** s_Ad / s_k of the accidental snow combination, 0 = not applicable */
  snowAccidental: number;
}

/** ULS combinations of a member under G, snow and wind pressure (EN 1990 6.10, accidental 6.11). */
function combos(l: BeamLoads, k: Kmods): Combo[] {
  const out: Combo[] = [{ label: 'G + S', qd: GAMMA_G * l.qG + GAMMA_Q * l.qS, kmod: k.medium }];
  if (k.snowAccidental > 0 && l.qS > 0) out.push({ label: 'G + S_Ad', qd: l.qG + k.snowAccidental * l.qS, kmod: k.instant });
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

/**
 * Length of a beam (mm) carried by an intermediate support at `at` among `supports`, the beam
 * running from `start` to `end`: 1.25 × half of each adjacent bay (inner support of a continuous
 * beam), or the full overhang where no further support follows.
 */
export function freePostTributary(at: number, supports: number[], start: number, end: number): number {
  const before = supports.filter((p) => p < at - 1);
  const after = supports.filter((p) => p > at + 1);
  const side = (others: number[], edge: number, nearest: (xs: number[]) => number) =>
    others.length > 0 ? 0.625 * Math.abs(at - nearest(others)) : Math.max(0, Math.abs(edge - at));
  return side(before, start, (xs) => Math.max(...xs)) + side(after, end, (xs) => Math.min(...xs));
}

type Axis = 'x' | 'z';
const OTHER: Record<Axis, Axis> = { x: 'z', z: 'x' };
const AXIS_LABEL: Record<Axis, string> = { x: 'along the length (X)', z: 'across (Z)' };
const WALLS_ALONG: Record<Axis, WallId[]> = { x: ['front', 'rear'], z: ['left', 'right'] };

/** A line of knee-braced posts acting in one direction: a purlin row, or the rail of an outer wall. */
interface BracedLine {
  key: string;
  label: string;
  /** Active knee braces per load sense (min over both senses) */
  active: number;
  /** Posts carrying braces in this line – they share the line's horizontal force (pinned bases) */
  posts: number;
  /** Purlin row the braced posts belong to (one per post for a wall line) */
  rowKeys: string[];
  /** Tallest braced post (mm) */
  height: number;
  wall?: WallId;
}

interface LateralSystem {
  axis: Axis;
  /** Rows whose purlins run along this axis (their knee braces act in this direction) */
  rows: PostRow[];
  /** Knee-braced lines in this direction */
  lines: BracedLine[];
  /** Closed outer walls in this plane that are braced (steel straps or sheet panels) – boards alone do not count */
  shearWalls: { id: WallId; bracing: 'strap' | 'panels' }[];
  /** Closed walls in this plane with board cladding only: no shear wall */
  unbracedWalls: WallId[];
  kind: 'braces' | 'wall' | 'sway';
}

interface FreePostSupport {
  id: string;
  /** 1-based number, as in the member name "Free post n" */
  n: number;
  /** Canonical plan position of the post axis */
  x: number;
  z: number;
  /** Purlin row the post stands under; undefined when it carries the rafters */
  row?: PostRow;
  /** Position along `row` (same coordinate as `row.positions`) */
  along: number;
  height: number;
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
  /** Characteristic ground snow load s_k (kN/m²) */
  groundSnow: number;
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
  freePosts: FreePostSupport[];
  /** Face areas (m²) of every outer wall, plumb */
  faceArea: Record<WallId, number>;
  canopy: { down: number; up: number };
  /** Local c_p,net for roof fixings (edge strips / interior) */
  local: CanopyZones;
}

function buildContext(project: ProjectState, framing: FramingResult): Context {
  const params = sanitizeParams(project.params);
  const { timber, loads, overhangs } = params;
  const mat = MATERIALS[timber.strengthClass];
  const k: Kmods = {
    medium: KMOD_BY_SERVICE_CLASS[loads.serviceClass],
    short: KMOD_SHORT_BY_SERVICE_CLASS[loads.serviceClass],
    instant: loads.serviceClass === 3 ? 0.9 : 1.1,
    kdef: KDEF_BY_SERVICE_CLASS[loads.serviceClass],
    snowAccidental: loads.exceptionalSnow ? EXCEPTIONAL_SNOW_FACTOR : 0,
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
  const groundSnow = siteSnowLoad(loads);
  const snowLoadRoof = snowShapeCoefficient(roof.pitchDeg) * groundSnow;

  const grid = framing.grid;
  const braces = braceLayout(params, roofLines, grid, project.walls);
  const braceLeg = Math.max(300, params.braceLeg);
  const hardware = params.connectionMode === 'hardware';

  const lateral = {} as Record<Axis, LateralSystem>;
  for (const axis of ['x', 'z'] as Axis[]) {
    const rows = grid.rows.filter((r) => r.axis === axis);
    const lines: BracedLine[] = [];
    // Load sense +: braces leaning towards − go into compression, the others into tension
    // (tension only counts with mechanical connectors – a tenon cannot pull).
    const addLine = (key: string, label: string, lineBraces: BracePlacement[], wall?: WallId): void => {
      const active = (sense: number) => lineBraces.filter((b) => b.side === -sense).length + (hardware ? lineBraces.filter((b) => b.side === sense).length : 0);
      const n = Math.min(active(1), active(-1));
      if (n <= 0) return;
      const postKeys = [...new Set(lineBraces.map((b) => `${b.rowKey}:${b.postIndex}`))];
      lines.push({ key, label, active: n, posts: postKeys.length, rowKeys: [...new Set(lineBraces.map((b) => b.rowKey))], height: Math.max(...lineBraces.map((b) => b.top)), wall });
    };
    for (const row of rows) addLine(row.key, row.name, braces.filter((b) => !b.wall && b.rowKey === row.key));
    for (const id of WALLS_ALONG[axis]) addLine(`wall-${id}`, `Rail ${id}`, braces.filter((b) => b.wall === id && b.axis === axis), id);
    const closedWalls = WALLS_ALONG[axis].filter((id) => project.walls[id]?.closed);
    const shearWalls = closedWalls.flatMap((id) => {
      const bracing = project.walls[id].bracing;
      return bracing === 'strap' || bracing === 'panels' ? [{ id, bracing }] : [];
    });
    const unbracedWalls = closedWalls.filter((id) => !shearWalls.some((w) => w.id === id));
    const kind: LateralSystem['kind'] = lines.length > 0 ? 'braces' : shearWalls.length > 0 ? 'wall' : 'sway';
    lateral[axis] = { axis, rows, lines, shearWalls, unbracedWalls, kind };
  }

  const lengthM = (params.length + overhangs.left + overhangs.right) / 1000;
  const widthM = (params.width + overhangs.front + overhangs.rear) / 1000;
  const avgHeight = (params.frontHeight + params.rearHeight) / 2;
  const faceArea: Record<WallId, number> = {
    front: ((params.length * params.frontHeight) / 1e6) * windShare(project.walls.front, params.length),
    rear: ((params.length * params.rearHeight) / 1e6) * windShare(project.walls.rear, params.length),
    left: ((params.width * avgHeight) / 1e6) * windShare(project.walls.left, params.width),
    right: ((params.width * avgHeight) / 1e6) * windShare(project.walls.right, params.width),
  };
  // post heights are measured from the (possibly falling) ground at each foot
  const ground = groundPlaneOf(params, true);
  const freePosts: FreePostSupport[] = project.freePosts.map((post, i) => {
    const p = clampFreePost(post, params, 'canonical');
    const row = freePostRow(p, params, grid);
    return { id: post.id, n: i + 1, x: p.x, z: p.z, row, along: row?.axis === 'z' ? p.z : p.x, height: freePostTop(p, params, roofLines, grid).centreHeight - groundAt(ground, p.x, p.z) };
  });
  const totalPosts =
    grid.rows.reduce((n, r) => n + r.positions.length, 0) + Object.values(grid.wallPosts).reduce((n, w) => n + (w?.positions.length ?? 0), 0) + freePosts.length;

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
    groundSnow,
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
    freePosts,
    faceArea,
    canopy: canopyForceCoefficients(roof.pitchDeg),
    local: canopyLocalCoefficients(roof.pitchDeg),
  };
}

/**
 * Share of a wall face that takes wind pressure: its closed stretch in full, a slat screen (of an
 * open wall, or beside a partly closed one) with the board share of its stretch, nothing open.
 */
function windShare(wall: Wall | undefined, span: number): number {
  if (!wall || span <= 0) return 0;
  const share = (ext: { start: number; end: number }) => (ext.end - ext.start) / span;
  const solidity = (w: Wall) => {
    const c = resolveScreenCladding(w.cladding);
    return c.boardWidth / (c.boardWidth + c.gap);
  };
  if (!wall.closed) return wall.screen ? share(wallExtent(wall, span)) * solidity(wall) : 0;
  const screen = screenPartWall(wall, span);
  return share(wallExtent(wall, span)) + (screen ? share(wallExtent(screen, span)) * solidity(screen) : 0);
}

/** Characteristic horizontal wind force (kN) on the structure along `axis` for velocity pressure q (kN/m²). */
function windForce(ctx: Context, axis: Axis, q: number): number {
  return windResultant(ctx, axis, q).F;
}

/**
 * Characteristic wind force along `axis` and the plan coordinate of its line of action across it
 * (x for wind along Z): the face of the governing wall at the centroid of its closed and slat
 * stretches, roof friction and the roof's normal force at the centre of the roof.
 */
function windResultant(ctx: Context, axis: Axis, q: number): { F: number; at: number; centre: number } {
  const { params, project, faceArea, edgeBand, planArea, canopy, tan } = ctx;
  const facing = WALLS_ALONG[OTHER[axis]]; // walls standing across the wind direction
  // Closed walls catch the full face, slat screens their board share of it
  const o = params.overhangs;
  const extent = axis === 'x' ? params.width + o.front + o.rear : params.length + o.left + o.right;
  const centre = axis === 'x' ? (params.width + o.rear - o.front) / 2 : (params.length + o.right - o.left) / 2;
  const governing = facing.filter((id) => faceArea[id] > 0).reduce<WallId | undefined>((g, id) => (g === undefined || faceArea[id] > faceArea[g] ? id : g), undefined);
  const faceM2 = governing ? faceArea[governing] : (edgeBand * extent) / 1e6;
  const faceAt = governing ? faceCentroid(project.walls[governing], axis === 'x' ? params.width : params.length) : centre;
  const Fface = WALL_FORCE_COEFFICIENT * q * faceM2;
  let Froof = ROOF_FRICTION_COEFFICIENT * q * planArea;
  // component of the roof normal force along the slope (canonical slope runs along Z)
  if (axis === 'z') Froof += Math.max(canopy.down, -canopy.up) * q * planArea * tan;
  const F = Fface + Froof;
  return { F, at: F > 0 ? (Fface * faceAt + Froof * centre) / F : centre, centre };
}

/** Centroid (mm along the wall) of the wind on a wall face: closed stretch in full, slat stretches by their board share. */
function faceCentroid(wall: Wall, span: number): number {
  const pieces: { ext: { start: number; end: number }; w: number }[] = [];
  const solidity = (w: Wall) => {
    const c = resolveScreenCladding(w.cladding);
    return c.boardWidth / (c.boardWidth + c.gap);
  };
  if (wall.closed) {
    pieces.push({ ext: wallExtent(wall, span), w: 1 });
    const screen = screenPartWall(wall, span);
    if (screen) pieces.push({ ext: wallExtent(screen, span), w: solidity(screen) });
  } else if (wall.screen) pieces.push({ ext: wallExtent(wall, span), w: solidity(wall) });
  const area = pieces.reduce((s, p) => s + p.w * (p.ext.end - p.ext.start), 0);
  return area > 0 ? pieces.reduce((s, p) => s + p.w * (p.ext.end - p.ext.start) * ((p.ext.start + p.ext.end) / 2), 0) / area : span / 2;
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

  // ── Roof sheet supports: battens across the fall line, or the level rafters themselves ──
  if (loads.roofCovering === 'trapezoidal-sheet') {
    const maxSpan = params.build.sheetMaxSpan;
    const battens = framing.members.filter((m) => m.group.startsWith('Roof batten'));
    if (battens.length > 0) {
      const rowsZ = [...new Set(battens.map((m) => Math.round(m.start.z)))].sort((a, b) => a - b);
      let gap = 0;
      for (let i = 1; i < rowsZ.length; i++) gap = Math.max(gap, (rowsZ[i] - rowsZ[i - 1]) / cos);
      const sec = battens[0].section; // laid flat: height = thickness
      const sb = gap / 1000;
      const selfW = ctx.density * (sec.width / 1000) * (sec.height / 1000);
      const bl: BeamLoads = { qG: ROOF_COVERING_LOAD[loads.roofCovering].load * sb + selfW, qS: snowLoadRoof * cos * sb, qW: windDown * sb };
      const res = checkBeam({ section: sec, span: roof.rafterSpacing, cantilever: 0, ...bl }, mat, k);
      const spanUtil = gap / maxSpan;
      // the span limit is a yes / no rule of the profile, the utilisation is the batten's bending
      const utilisation = res.utilisation;
      const status: StaticsStatus = spanUtil > 1.001 ? 'fail' : statusOf(utilisation);
      checks.push({
        id: 'roof-batten',
        kind: 'vertical',
        element: 'Roof battens',
        elementDe: 'Dachlattung',
        section: sec,
        span: Math.round(roof.rafterSpacing),
        loadUls: res.qd,
        loadSls: bl.qG + slsVariable(bl),
        stressUtil: res.stressUtil,
        deflectionUtil: res.deflectionUtil,
        deflection: res.wFin,
        deflectionLimit: res.wLimit,
        utilisation,
        status,
        recommendation: status !== 'ok' ? (spanUtil > 1.001 ? `Lay the battens at ≤ ${maxSpan} mm along the slope.` : 'Use deeper battens or reduce the rafter spacing.') : undefined,
        detail: `${rowsZ.length} rows ${sec.width}×${sec.height} mm across the fall line at ${Math.round(gap)} mm along the slope (sheet max. span ${maxSpan} mm, ${pct(spanUtil)}), spanning ${Math.round(roof.rafterSpacing)} mm between rafters. Governing ${res.governing}: σ_m,d = ${fmt(res.sigma)} ≤ f_m,d = ${fmt(res.fmd)} N/mm² (${pct(res.stressUtil)}), w_fin = ${fmt(res.wFin)} mm ≤ ${fmt(res.wLimit)} mm.`,
      });
    } else if (slopedPurlins) {
      // the level rafters run across the fall line and carry the sheet directly
      const spanUtil = roof.rafterSpacing / maxSpan;
      const status: StaticsStatus = spanUtil > 1.001 ? 'fail' : 'ok';
      checks.push({
        id: 'sheet-span',
        kind: 'vertical',
        element: 'Roof sheet span',
        elementDe: 'Stützweite Trapezblech',
        section: timber.rafter,
        span: Math.round(roof.rafterSpacing),
        loadUls: 0,
        loadSls: 0,
        stressUtil: spanUtil,
        deflectionUtil: 0,
        deflection: 0,
        deflectionLimit: 0,
        utilisation: spanUtil,
        status,
        recommendation: status !== 'ok' ? `Reduce the rafter spacing to ≤ ${maxSpan} mm.` : undefined,
        detail: `The level ${timber.rafter.width}×${timber.rafter.height} mm rafters run across the fall line and carry the sheet directly – no battens needed. Spacing ${Math.round(roof.rafterSpacing)} mm ≤ profile max. span ${maxSpan} mm (${pct(spanUtil)}).`,
      });
    }
  }

  // ── Purlins ─────────────────────────────────────────────────────────────
  const purlinSelf = ctx.density * (timber.beam.width / 1000) * (timber.beam.height / 1000);
  const purlinStart = slopedPurlins ? -overhangs.front : -overhangs.left;
  const purlinEnd = slopedPurlins ? params.width + overhangs.rear : params.length + overhangs.right;
  const half = (i: number, j: number): number => (rowOffsets[j] - rowOffsets[i]) / 2;
  const last = rowOffsets.length - 1;
  const eaveOverhang = (wallId: string | undefined): number =>
    wallId === 'front' ? overhangs.front : wallId === 'rear' ? overhangs.rear : wallId === 'left' ? overhangs.left : wallId === 'right' ? overhangs.right : 0;
  const purlinRows = grid.rows.map((row, idx) => {
    // free posts under the purlin support it like grid posts; they carry no knee braces, so the
    // brace indices (into row.positions) stay valid when they are appended
    const positions = [...row.positions, ...ctx.freePosts.filter((f) => f.row?.key === row.key).map((f) => f.along)];
    return {
      id: rowIds[idx],
      label: row.name,
      labelDe: row.nameDe,
      trib: (idx > 0 ? half(idx - 1, idx) : 0) + (idx < last ? half(idx, idx + 1) : 0) + eaveOverhang(row.wallId),
      positions,
      supports: purlinSupports(positions, purlinStart, purlinEnd),
      braced: bracedPurlinSpan(
        positions,
        ctx.braces.filter((b) => b.rowKey === row.key),
        ctx.braceLeg,
      ),
      row,
    };
  });
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
  /**
   * Purlin length (m) a post of the row carries: with two posts both are end supports (half the bay
   * plus the overhang); with more posts an inner support of the (spliced) purlin governs (one bay).
   */
  const postShareM = (supports: { span: number; cantilever: number; posts: number }): number =>
    (supports.posts >= 3 ? supports.span : supports.span / 2 + supports.cantilever) / 1000;

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

  /**
   * Effective buckling length of a post in direction `axis`. Post bases are pinned and the roof
   * holds the post tops (an unbraced direction is a mechanism, reported by the bracing check).
   */
  const bucklingLength = (axis: Axis, height: number, rowAxis: Axis, rowBraced: boolean): number => {
    if (axis === rowAxis && rowBraced && (params.braceDirection === 'both' || params.connectionMode === 'hardware')) return Math.max(height - ctx.braceLeg, 500);
    return height;
  };

  // ── Posts (the tallest post of each row governs: buckling length + tributary) ──
  const Wpost = (Math.min(pw, timber.post.height) ** 2 * Math.max(pw, timber.post.height)) / 6;
  const Apost = pw * timber.post.height;
  const ground = groundPlaneOf(params, true);
  const postRows = purlinLoads.map((load) => {
    const row = load.row.row;
    const postHeight = (pos: number): number => {
      const p = rowPoint(row, pos);
      return rowPostTop(row, roofLines, params, pos) - groundAt(ground, p.x, p.z);
    };
    const tallest = row.positions.length > 0 ? Math.max(...row.positions.map(postHeight)) : postHeight(pw / 2);
    return {
      id: load.row.id.replace('purlin', 'post'),
      label: row.name.replace('Purlin', 'Post'),
      labelDe: row.nameDe === 'Mittelpfette' ? 'Pfosten mitte' : row.nameDe.replace('Pfette', 'Pfosten'),
      height: tallest,
      rowAxis: row.axis,
      rowBraced: ctx.lateral[row.axis].lines.some((l) => l.key === row.key),
      load,
    };
  });
  /**
   * Post as a pinned strut under its characteristic axial loads (kN): buckling under G + S (and the
   * accidental snow). The bending from knee braces is checked with the bracing.
   */
  const checkPost = (post: {
    id: string;
    label: string;
    labelDe: string;
    height: number;
    Lrow: number;
    Lperp: number;
    N: { G: number; S: number; W: number };
    /** Sentence leading the detail (what the post carries) */
    lead?: string;
  }): StaticsCheck => {
    const { G, S } = post.N;
    const Nsnow = GAMMA_G * G + GAMMA_Q * S;
    const Nk = G + S;
    const { Lrow, Lperp } = post;
    const Lef = Math.max(Lrow, Lperp);
    const col = columnCurve(timber.post, Lef, mat, k.medium);
    const sigma = (Nsnow * 1000) / Apost;
    let utilisation = sigma / (col.kc * col.fcd);
    let governing = 'G + S';
    let accidental = '';
    if (k.snowAccidental > 0) {
      const colAcc = columnCurve(timber.post, Lef, mat, k.instant);
      const NAcc = G + k.snowAccidental * S;
      const util = (NAcc * 1000) / Apost / (colAcc.kc * colAcc.fcd);
      if (util > utilisation) {
        utilisation = util;
        governing = 'G + S_Ad';
      }
      accidental = ` Exceptional snow G + ${k.snowAccidental}·S: ${pct(util)}.`;
    }

    const status = statusOf(utilisation);
    let recommendation: string | undefined;
    if (status !== 'ok') {
      const better = [120, 140, 160, 180, 200, 220, 240].find((s) => {
        if (s <= Math.min(timber.post.width, timber.post.height)) return false;
        const sec = { width: s, height: s };
        const c = columnCurve(sec, Lef, mat, k.medium);
        return (Nsnow * 1000) / (s * s) / (c.kc * c.fcd) <= OK_LIMIT * 0.7; // leave room for the brace bending
      });
      recommendation = better ? `Use ${better}×${better} mm posts or add posts to reduce the load per post.` : 'Add posts to reduce the load per post.';
    }
    return {
      id: post.id,
      kind: 'vertical',
      element: post.label,
      elementDe: post.labelDe,
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
      detail: `${post.lead ? `${post.lead} ` : ''}N_d = ${kn(Nsnow)} (G + S), buckling length ${Math.round(Lef)} mm (in row ${Math.round(Lrow)} / across ${Math.round(Lperp)} mm; λ = ${fmt(col.lambda, 0)}, k_c = ${fmt(col.kc, 2)}). σ_c,0,d = ${fmt(sigma, 2)} ≤ k_c·f_c,0,d = ${fmt(col.kc * col.fcd, 2)} N/mm² (${pct(sigma / (col.kc * col.fcd))}).${accidental} Governing ${governing}.`,
    };
  };

  for (const row of postRows) {
    const spanM = postShareM(row.load.row.supports);
    const { qvG, qvS, qvW } = row.load;
    checks.push(
      checkPost({
        id: row.id,
        label: row.label,
        labelDe: row.labelDe,
        height: row.height,
        Lrow: bucklingLength(row.rowAxis, row.height, row.rowAxis, row.rowBraced),
        Lperp: bucklingLength(OTHER[row.rowAxis], row.height, row.rowAxis, row.rowBraced),
        N: { G: qvG * spanM, S: qvS * spanM, W: qvW * spanM },
      }),
    );
  }

  // ── Free posts: under a purlin they take its reaction, otherwise a rafter's ──
  const rafterAxis: Axis = slopedPurlins ? 'x' : 'z'; // direction the rafters run in plan
  const rafters = framing.members.filter((m) => m.category === 'rafter');
  const roofStart = slopedPurlins ? -overhangs.left : -overhangs.front;
  const roofEnd = slopedPurlins ? params.length + overhangs.right : params.width + overhangs.rear;
  for (const free of ctx.freePosts) {
    const label = `Free post ${free.n}`;
    const labelDe = `Freier Pfosten ${free.n}`;
    // a free post has no knee braces of its own
    const Lrow = bucklingLength(free.row?.axis ?? 'x', free.height, free.row?.axis ?? 'x', false);
    const Lperp = bucklingLength(OTHER[free.row?.axis ?? 'x'], free.height, free.row?.axis ?? 'x', false);
    if (free.row) {
      const load = purlinLoads.find((l) => l.row.row.key === free.row!.key)!;
      const L = freePostTributary(free.along, load.row.positions, purlinStart, purlinEnd);
      const lm = L / 1000;
      checks.push(
        checkPost({
          id: `post-free-${free.id}`,
          label,
          labelDe,
          height: free.height,
          Lrow,
          Lperp,
          N: { G: load.qvG * lm, S: load.qvS * lm, W: load.qvW * lm },
          lead: `Supports ${load.row.label}: carries ${fmt(lm, 2)} m of purlin (1.25 × half of each adjacent bay, the full overhang at a purlin end).`,
        }),
      );
      continue;
    }
    const across = rafterAxis === 'z' ? free.x : free.z; // plan coordinate across the rafters
    const along = rafterAxis === 'z' ? free.z : free.x;
    const lateralOf = (m: (typeof rafters)[number]) => (Math.abs(m.direction.x) > 0.5 ? m.start.z : m.start.x);
    const nearest = rafters.reduce((d, m) => Math.min(d, Math.abs(lateralOf(m) - across)), Infinity);
    if (!(nearest <= pw / 2)) {
      checks.push({
        id: `free-post-${free.id}`,
        kind: 'vertical',
        element: label,
        elementDe: labelDe,
        section: timber.post,
        span: Math.round(free.height),
        loadUls: 0,
        loadSls: 0,
        stressUtil: 0,
        deflectionUtil: 0,
        deflection: 0,
        deflectionLimit: 0,
        utilisation: 0,
        status: 'warning',
        recommendation: 'Move the post under a rafter or a purlin row, or add a header between the two rafters.',
        detail: Number.isFinite(nearest)
          ? `No rafter bears on this post (nearest rafter axis ${Math.round(nearest)} mm away) – it carries no roof load.`
          : 'No rafter bears on this post – it carries no roof load.',
      });
      continue;
    }
    const L = freePostTributary(along, rowOffsets, roofStart, roofEnd);
    const areaM2 = (L / 1000) * spacingM;
    checks.push(
      checkPost({
        id: `post-free-${free.id}`,
        label,
        labelDe,
        height: free.height,
        Lrow,
        Lperp,
        N: { G: deadLoad * areaM2, S: snowLoadRoof * areaM2, W: windDown * areaM2 },
        lead: `Supports a rafter: carries ${fmt(areaM2, 2)} m² of roof (${roof.rafterSpacing} mm rafter spacing × ${fmt(L / 1000, 2)} m: 1.25 × half of each adjacent rafter bay, the full overhang at an eave).`,
      }),
    );
  }

  // ── Bracing per direction (post bases are pinned: every direction needs knee braces or a braced wall) ──
  const braceSection = timber.brace;
  const braceAxisLength = ctx.braceLeg * SQRT2;
  const rhok = mat.rhok;
  /** Axial post loads (kN, characteristic) of a purlin row's most loaded post */
  const rowPostLoads = (rowKey: string): { G: number; S: number; W: number } => {
    const post = postRows.find((p) => p.load.row.row.key === rowKey);
    if (!post) return { G: 0, S: 0, W: 0 };
    const spanM = postShareM(post.load.row.supports);
    return { G: post.load.qvG * spanM, S: post.load.qvS * spanM, W: post.load.qvW * spanM };
  };
  // Shear walls share the wind by position under a rigid roof (centre of stiffness + torsion)
  const walls = (() => {
    const wallAxes = (['x', 'z'] as Axis[]).filter((a) => ctx.lateral[a].kind === 'wall');
    const elements = wallAxes.flatMap((a) => ctx.lateral[a].shearWalls.flatMap((sw) => shearWallElement(sw.id, project.walls[sw.id], params) ?? []));
    const loads: LateralLoad[] = wallAxes.map((axis) => {
      const Hd = Math.max(H[axis].windLead, H[axis].snowLead);
      const wind = (H[axis].windLead >= H[axis].snowLead ? GAMMA_Q : GAMMA_Q * PSI0_WIND) * H[axis].Wk;
      const r = windResultant(ctx, axis, q);
      return { axis, H: Hd, at: Hd > 0 ? (wind * r.at + (Hd - wind) * r.centre) / Hd : r.centre };
    });
    const dist = distributeLateral(elements, loads);
    /** Governing design force of a wall over both wind directions, and how it arises */
    const forceOf = (id: WallId): { F: number; how: string } => {
      let best = { F: 0, how: '' };
      for (const [a, sh] of Object.entries(dist.shares[id] ?? {}) as [Axis, WallShare][]) {
        if (sh.total <= best.F) continue;
        const how =
          sh.direct <= 0
            ? `torsion couple from the wind ${AXIS_LABEL[a]}`
            : Math.abs(sh.torsion) < 0.05
              ? `share ${kn(sh.direct)}`
              : `share ${kn(sh.direct)} ${sh.torsion >= 0 ? '+' : '−'} torsion ${kn(Math.abs(sh.torsion))}`;
        best = { F: sh.total, how };
      }
      return best;
    };
    return { elements, loads, dist, forceOf };
  })();
  const nail = panelNailCapacity(rhok, kmodShort, loads.serviceClass);
  /**
   * Walls of one direction on a single line: the roof spans to them as a cantilever diaphragm.
   * A deck of sheets is assumed to do it; a sheet or panel covering on purlins needs strap crosses.
   */
  const roofDiaphragmCheck = (axis: Axis, Hd: number): Omit<StaticsCheck, 'id' | 'kind' | 'loadUls' | 'loadSls' | 'deflectionUtil' | 'deflection' | 'deflectionLimit'> & { id: string } | undefined => {
    const own = walls.elements.filter((w) => w.axis === axis && w.length > 0);
    if (own.length === 0 || own.some((w) => w.pos !== own[0].pos)) return undefined;
    const covering = loads.roofCovering;
    if (covering === 'bitumen-shingles') return undefined;
    const span = axis === 'z' ? params.length : params.width; // the diaphragm cantilevers along the other axis
    const depth = axis === 'z' ? params.width : params.length;
    const wallAt = own[0].pos;
    const strapBays = roofStrapBays(axis, params, grid);
    const bays = strapBays.map((b) => b.end - b.start);
    const bay = wallAt <= span / 2 ? bays[0] : bays[bays.length - 1];
    // the roof slopes along Z: the depth of a Z diaphragm and the bay of an X diaphragm are sloped
    const bayPlane = axis === 'x' ? bay / cos : bay;
    const depthPlane = axis === 'z' ? depth / cos : depth;
    const diagonal = Math.hypot(bayPlane, depthPlane);
    const angle = (Math.atan2(depthPlane, bayPlane) * 180) / Math.PI;
    const T = (Hd * diagonal) / depth;
    const Rd = strapTensionRd();
    const nailRd = (kmodShort * strapNailCapacity(rhok)) / 1.3 / 1000;
    // one tension diagonal per cross carries the shear; side-by-side straps share it
    const straps = Math.max(1, Math.ceil(T / Rd));
    const nails = Math.max(4, Math.ceil(T / straps / nailRd));
    const chord = (Hd * span) / 2 / depth;
    const u = T / (straps * Rd);
    const side = own[0].id;
    // crosses in every bay from the wall line to the free end, one per bay
    const length = bays.reduce((sum, b) => sum + 2 * Math.hypot(axis === 'x' ? b / cos : b, depthPlane), 0) * straps;
    const fitted = params.build.roofStraps && straps <= 2;
    return {
      id: `roof-diaphragm-${axis}`,
      element: `Roof bracing ${AXIS_LABEL[axis]}`,
      elementDe: 'Dachverband (Windrispenband)',
      section: timber.rafter,
      span: Math.round(diagonal),
      stressUtil: u,
      utilisation: u,
      // a requirement until the straps are fitted (build setting), unbuildable beyond two straps per diagonal
      status: straps > 2 ? 'fail' : fitted ? statusOf(u) : 'warning',
      ...(fitted ? { fittings: [{ kind: 'roof-straps' as const, axis, bays: strapBays, diagonals: 2 * bays.length, strapsPerDiagonal: straps, length, nailsPerEnd: nails }] } : {}),
      recommendation: fitted
        ? undefined
        : straps > 2
          ? `Brace a wall at the other end so the roof spans between two wall lines – strap crosses would need ${straps} straps per diagonal.`
          : `Fit crossed Windrispenband 40 × 2 (${straps} per diagonal) under the roof covering in every bay from wall ${side} to the free end, nailed to each member it crosses, with ${nails} Kammnägel 4.0 × 40 per strap end and anchored into the top of that wall.`,
      detail: `The braced walls ${AXIS_LABEL[axis]} stand on one line (wall ${side}): the roof carries H_d = ${kn(Hd)} over ${fmt(span / 1000, 2)} m to it as a cantilever diaphragm. Roof covering: ${ROOF_COVERING_LOAD[covering].label} – no reliable diaphragm, so the roof plane needs strap crosses.${fitted ? ` Fitted: ${bays.length} strap crosses, ${fmt(length / 1000, 1)} m of strap.` : ''} Shear at the wall line V_d = ${kn(Hd)} (${fmt(Hd / (depth / 1000), 1)} kN/m over ${fmt(depth / 1000, 2)} m depth). Strap cross in the bay at the wall line ${fmt(bayPlane / 1000, 2)} × ${fmt(depthPlane / 1000, 2)} m (diagonal ${fmt(diagonal / 1000, 2)} m, ${fmt(angle, 0)}°): T_d = ${kn(T)} ≤ ${straps} × N_t,Rd = ${kn(straps * Rd)} (${pct(u)}). Nails: ${nails} Kammnägel 4.0 × 40 per strap end (F_v,Rd = ${kn(nailRd)} each). Chord force in the edge members N_d = ±${kn(chord)} (M_d = ${fmt((Hd * span) / 2 / 1000, 1)} kNm).`,
    };
  };
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
    const boardsNote = sys.unbracedWalls.length > 0 ? ` The board cladding of the ${sys.unbracedWalls.join(' + ')} wall${sys.unbracedWalls.length > 1 ? 's' : ''} is not a shear wall (no diagonal straps or sheet panels).` : '';
    if (sys.kind === 'braces') {
      // The roof shares the wind out by stiffness: every braced post takes the same shear
      const totalPosts = sys.lines.reduce((n, l) => n + l.posts, 0);
      const lineShare = (l: BracedLine) => (Hd * l.posts) / totalPosts;
      const braceForce = (l: BracedLine) => (lineShare(l) / l.active) * SQRT2;
      let worstLine = sys.lines[0];
      for (const l of sys.lines) if (braceForce(l) > braceForce(worstLine)) worstLine = l;
      const Nbrace = braceForce(worstLine);
      const col = columnCurve(braceSection, braceAxisLength, mat, kmodShort);
      const sigma = (Nbrace * 1000) / (braceSection.width * braceSection.height);
      const utilisation = sigma / (col.kc * col.fcd);
      const status = statusOf(utilisation);
      const better = status !== 'ok' ? BRACE_SECTIONS.find((s) => s.width * s.height > braceSection.width * braceSection.height && (Nbrace * 1000) / (s.width * s.height) / (columnCurve(s, braceAxisLength, mat, kmodShort).kc * col.fcd) <= OK_LIMIT) : undefined;
      const lineList = sys.lines.map((l) => `${l.label} (${l.active})`).join('; ');
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
        detail: `Wind ${AXIS_LABEL[axis]}: W_k = ${kn(H[axis].Wk)}, H_d = ${kn(Hd)} (incl. ${Math.round(NOTIONAL_SWAY * 100)} % notional sway) shared by ${totalPosts} braced posts in ${sys.lines.length} lines. Active braces per load sense: ${lineList}. ${params.connectionMode === 'hardware' ? 'Tension braces count too (mechanical connectors).' : 'Compression braces only (tenon joints).'} Strut N_d = ${kn(Nbrace)}, L_ef = ${Math.round(braceAxisLength)} mm, k_c = ${fmt(col.kc, 2)}: σ_c,0,d = ${fmt(sigma, 2)} ≤ ${fmt(col.kc * col.fcd, 2)} N/mm² (${pct(utilisation)}).${boardsNote}`,
      });

      // Post bending: the brace force enters the post at the brace foot; the pinned base takes the shear
      let worst = { util: 0, detail: '', line: worstLine, M: 0, N: 0 };
      const colPost = (Lef: number) => columnCurve(timber.post, Lef, mat, kmodShort);
      const fmdShort = (kmodShort * mat.fmk) / mat.gammaM;
      for (const line of sys.lines) {
        const Hline = lineShare(line);
        const V = Hline / line.posts; // shear per braced post at its pinned base
        const hJoint = Math.max(line.height - ctx.braceLeg, 300);
        const Md = V * hJoint; // kN·mm
        const braceV = Hline / line.active; // vertical component of one 45° brace force
        for (const rowKey of line.rowKeys) {
          const { G, S, W } = rowPostLoads(rowKey);
          const cases = [
            { label: 'G + W + ψ₀S', N: GAMMA_G * G + GAMMA_Q * W + GAMMA_Q * PSI0_SNOW * S, f: 1 },
            { label: 'G + S + ψ₀W', N: GAMMA_G * G + GAMMA_Q * S + GAMMA_Q * PSI0_WIND * W, f: H[axis].snowLead / Math.max(Hd, 1e-9) },
          ];
          for (const c of cases) {
            const N = c.N + braceV * c.f;
            const M = Md * c.f;
            const cp = colPost(hJoint);
            const sigmaC = (N * 1000) / Apost;
            const sigmaM = (M * 1000) / Wpost;
            const util = sigmaC / (cp.kc * cp.fcd) + sigmaM / fmdShort;
            if (util > worst.util) {
              worst = {
                util,
                line,
                M,
                N,
                detail: `${line.label}: H_d = ${kn(Hline)} on ${line.posts} braced post${line.posts > 1 ? 's' : ''} → V_d = ${kn(V * c.f)} at each pinned base, M_d = ${fmt(M / 1000, 2)} kNm at the brace foot (${Math.round(hJoint)} mm above the base), N_d = ${kn(N)} incl. the brace's vertical component (${c.label}). Interaction: σ_c/(k_c·f_c,0,d) + σ_m/f_m,d = ${fmt(sigmaC / (cp.kc * cp.fcd), 2)} + ${fmt(sigmaM / fmdShort, 2)} = ${pct(util)} (k_mod ${kmodShort}).`,
              };
            }
          }
        }
      }
      const postStatus = statusOf(worst.util);
      checks.push({
        ...base,
        id: `brace-post-${axis}`,
        kind: 'lateral',
        element: `Posts in brace bending ${AXIS_LABEL[axis]}`,
        elementDe: 'Pfosten mit Kopfband (Biegung)',
        section: timber.post,
        span: Math.round(Math.max(worst.line.height - ctx.braceLeg, 300)),
        loadUls: worst.N,
        stressUtil: worst.util,
        utilisation: worst.util,
        status: postStatus,
        recommendation: postStatus !== 'ok' ? 'Brace more posts in this direction (both sides of each post), shorten the post or use larger posts.' : undefined,
        detail: worst.detail,
      });
    } else if (sys.kind === 'wall') {
      const tor = walls.dist.torsion[axis];
      const load = walls.loads.find((l) => l.axis === axis)!;
      const coord = OTHER[axis];
      const parts: string[] = [];
      let utilisation = 0;
      let holdDownMissing = false;
      const recs: string[] = [];
      const fittings: StaticsFitting[] = [];
      for (const el of walls.elements.filter((w) => w.axis === axis)) {
        const { F, how } = walls.forceOf(el.id);
        const id = el.id;
        if (el.bracing === 'panels') {
          if (el.length <= 0) {
            utilisation = Math.max(utilisation, 9.99);
            recs.push(`Wall ${id} has no stretch of at least h/4 between openings for sheet panels – brace another wall or add knee braces.`);
            parts.push(`Wall ${id}: no stretch of at least h/4 between openings for sheet panels.`);
            continue;
          }
          const s = panelNailSpacing(project.walls[id]);
          const v = F / el.length;
          const fv = (nail.Rd * 1000) / s;
          const u = v / fv;
          const T = holdDownTension(F, el);
          utilisation = Math.max(utilisation, u);
          if (statusOf(u) !== 'ok') recs.push(`Wall ${id}: close the nail spacing (down to 50 mm), sheathe both faces or lengthen the braced stretch.`);
          const anchored = Boolean(project.walls[id]?.holdDowns);
          if (T > 0 && anchored) fittings.push({ kind: 'hold-down', wallId: id, count: 2 * el.segments.length, tension: T });
          else if (T > 0) {
            holdDownMissing = true;
            recs.push(`Anchor the end studs of every braced stretch of wall ${id} with a hold-down (Zuganker / hold-down angle bolted into the foundation) for T_d ≥ ${kn(T)}.`);
          }
          parts.push(
            `Wall ${id}: F_d = ${kn(F)} (${how}) on ${fmt(el.length, 2)} m braced length. OSB/3 15 mm, ring nails 2.8 × 60 at ${s} mm along the panel edges: F_f,Rd = ${fmt(nail.Rd, 2)} kN per nail (k_mod ${fmt(nail.kmod, 2)}), f_v,Rd = F_f,Rd/s = ${fmt(fv, 1)} kN/m against v_d = ${fmt(v, 1)} kN/m (${pct(u)}, EN 1995-1-1 9.2.4.2). Hold-down T_d = F_i·h/b_i − 0.9·G = ${kn(T)} at the stretch ends (h = ${Math.round(el.height)} mm).${T > 0 && project.walls[id]?.holdDowns ? ' Hold-downs fitted at both ends.' : ''}`,
          );
          continue;
        }
        const straps = wallStraps(id, project.walls[id], params);
        if (!straps || straps.crosses.length === 0) {
          utilisation = Math.max(utilisation, 9.99);
          recs.push(`Wall ${id} has no stretch free of openings for a strap cross – brace another wall or add knee braces.`);
          parts.push(`Wall ${id}: no room for a strap cross.`);
          continue;
        }
        const flattest = straps.crosses.reduce((m, c) => (c.angleDeg < m.angleDeg ? c : m));
        const cos = Math.cos((flattest.angleDeg * Math.PI) / 180);
        const T = F / (straps.crosses.length * cos); // one diagonal per cross in tension
        const Rd = strapTensionRd();
        const nailRd = (kmodShort * strapNailCapacity(rhok)) / 1.3 / 1000;
        const nails = Math.max(4, Math.ceil(T / nailRd));
        const holdDown = (F / straps.crosses.length) * (flattest.height / Math.max(flattest.end - flattest.start, 1));
        const u = T / Rd;
        utilisation = Math.max(utilisation, u);
        parts.push(
          `Wall ${id}: F_d = ${kn(F)} (${how}). Windrispenband 40 × 2 mm, ${straps.crosses.length} × cross (flattest ${fmt(flattest.angleDeg, 0)}°, diagonal ${fmt(flattest.diagonal / 1000, 2)} m): T_d = ${kn(T)} ≤ N_t,Rd = ${kn(Rd)} (${pct(u)}). Nails: ${nails} Kammnägel 4.0 × 40 per strap end (F_v,Rd = ${kn(nailRd)} each). Hold-down at the wall ends ${kn(holdDown)} – anchor the end studs into the base.`,
        );
      }
      let torsionNote = '';
      if (tor?.unresisted) {
        if (ctx.lateral[OTHER[axis]].kind === 'braces') torsionNote = ` The torsion M_t = ${fmt(Math.abs(tor.Mt), 1)} kNm goes into the knee braces ${AXIS_LABEL[OTHER[axis]]} (not checked here).`;
        else {
          utilisation = Math.max(utilisation, 9.99);
          recs.unshift(`Brace a wall ${AXIS_LABEL[OTHER[axis]]} as well: the braced walls ${AXIS_LABEL[axis]} stand on one line and cannot take the torsion.`);
          torsionNote = ` The braced walls stand on one line and nothing takes the torsion M_t = ${fmt(Math.abs(tor.Mt), 1)} kNm.`;
        }
      }
      const head = tor
        ? `Wind ${AXIS_LABEL[axis]}: W_k = ${kn(H[axis].Wk)}, H_d = ${kn(Hd)} acting at ${coord} = ${fmt(load.at / 1000, 2)} m, centre of stiffness at ${coord} = ${fmt((tor.centre ?? 0) / 1000, 2)} m: eccentricity ${fmt(Math.abs(tor.e) / 1000, 2)} m, torsion M_t = ${fmt(Math.abs(tor.Mt), 1)} kNm (rigid roof diaphragm, walls stiff in proportion to their braced length).`
        : `Wind ${AXIS_LABEL[axis]}: W_k = ${kn(H[axis].Wk)}, H_d = ${kn(Hd)} without a bracing system.`;
      // the wall lifts at its ends without hold-downs: a requirement at least
      const status = holdDownMissing ? worst([statusOf(utilisation), 'warning']) : statusOf(utilisation);
      checks.push({
        ...base,
        ...(fittings.length > 0 ? { fittings } : {}),
        element: `Braced wall ${AXIS_LABEL[axis]}`,
        elementDe: 'Wandscheibe',
        section: timber.stud,
        span: Math.round(sys.shearWalls.reduce((m, w) => Math.max(m, w.id === 'front' || w.id === 'rear' ? params.length : params.width), 0)),
        stressUtil: utilisation,
        utilisation,
        status,
        recommendation: recs.length > 0 ? recs.join(' ') : status !== 'ok' ? 'Brace a second wall in this plane or add knee braces.' : undefined,
        detail: `${head}${torsionNote} ${parts.join(' ')}${boardsNote}`,
      });
      const diaphragm = roofDiaphragmCheck(axis, Hd);
      if (diaphragm) checks.push({ ...base, ...diaphragm });
    } else {
      const canBrace = sys.rows.length > 0 || WALLS_ALONG[axis].some((id) => project.walls[id]?.closed || project.walls[id]?.screen || project.walls[id]?.rail);
      checks.push({
        ...base,
        element: `No bracing ${AXIS_LABEL[axis]}`,
        elementDe: 'Keine Aussteifung',
        section: timber.post,
        span: Math.round(Math.max(...postRows.map((r) => r.height))),
        stressUtil: 1,
        utilisation: 1,
        status: 'fail',
        recommendation: canBrace
          ? 'Add knee braces (Kopfbänder) in this direction, or brace a closed wall in this plane with crossed Windrispenband / sheet panels.'
          : 'Put a rail (Rähm) on an open side and brace it with knee braces, or close and brace a wall in this plane.',
        detail: `Wind ${AXIS_LABEL[axis]}: W_k = ${kn(H[axis].Wk)}, H_d = ${kn(Hd)} without a bracing system. The post bases are pinned (no fixity), so without knee braces or a braced wall the frame has no lateral stability in this direction.${boardsNote}`,
      });
    }
  }

  // ── Wall studs and screen battens in wind ───────────────────────────────
  checks.push(...studWindChecks(project, framing.members, q, mat, kmodShort));

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

  // ── Roof uplift: the load path from the sheet down to the concrete, link by link ─────────
  {
    const postSelf = (height: number): number => (ctx.density * Apost * height) / 1e9;
    const sheetOnBattens = !slopedPurlins; // rafters run down the slope: battens across carry the sheet
    const batten = params.build.battenSection;
    checks.push(
      ...upliftChainChecks({
        mat,
        kmodShort,
        mode: params.connectionMode,
        timber,
        build: params.build,
        postBase: loads.postBase ?? 'adjustable',
        q,
        local: ctx.local,
        canopyUp: ctx.canopy.up,
        coveringLoad: ROOF_COVERING_LOAD[loads.roofCovering].load,
        deadLoad,
        rafterSpacing: roof.rafterSpacing,
        rafterSeatHeight: timber.rafter.height - (slopedPurlins ? 0 : roof.birdsmouthDepth),
        sheetSupportDepth: sheetOnBattens ? Math.min(batten.width, batten.height) : timber.rafter.height,
        sheetSupportLabel: sheetOnBattens ? `${batten.width}×${batten.height} mm battens` : `${timber.rafter.width}×${timber.rafter.height} mm rafters`,
        bearings: purlinRows.map((row, idx) => ({ label: row.label, trib: row.trib, inner: idx > 0 && idx < last })),
        posts: postRows.map((post) => {
          const spanM = postShareM(post.load.row.supports);
          return { label: post.label, uplift: post.load.qvUp * spanM, roofDead: post.load.qvG * spanM, postDead: postSelf(post.height) };
        }),
        footingDepth: Math.max(0, loads.postFootingDepth ?? 0),
        footingSize: Math.max(0, loads.postFootingDiameter ?? 0),
      }),
    );
  }

  // ── Knee brace ends ─────────────────────────────────────────────────────
  checks.push(
    ...connectionChecks({
      mat,
      strengthClass: timber.strengthClass,
      kmodShort,
      mode: params.connectionMode,
      braceConnector: params.build.braceConnector,
      timber,
      braces: (['x', 'z'] as Axis[])
        .filter((axis) => ctx.lateral[axis].kind === 'braces')
        .map((axis) => {
          const sys = ctx.lateral[axis];
          const Hd = Math.max(H[axis].windLead, H[axis].snowLead);
          const totalPosts = sys.lines.reduce((n, l) => n + l.posts, 0);
          const Nd = Math.max(...sys.lines.map((l) => ((Hd * l.posts) / totalPosts / l.active) * SQRT2));
          return { key: axis, axis: AXIS_LABEL[axis], Nd };
        }),
    }),
  );

  return checks;
}

/** Peak velocity pressure (kN/m²) at which the first member check exceeds 100 % (uplift, joints and footings aside). */
function collapsePressure(ctx: Context, q0: number): { q: number; element: string } | undefined {
  const worstUtil = (q: number) => {
    const checks = computeChecks(ctx, q).filter((c) => c.kind !== 'uplift' && c.kind !== 'connection');
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

/**
 * Timber floor: joists (or sleepers between pads) and bearers as simply supported beams under
 * deck + self weight and the imposed floor load (medium-term, k_mod as for snow). Independent of
 * wind, so they are kept out of the collapse-gust search.
 */
function computeFloorChecks(ctx: Context): StaticsCheck[] {
  const layout = floorLayout(ctx.params);
  if (!layout) return [];
  const { settings } = layout;
  const { mat, k, density } = ctx;
  const deckLoad = (DECKING[settings.decking].thickness / 1000) * ((DECKING[settings.decking].density * G_ACCEL) / 1000); // kN/m²
  const selfWeight = (s: TimberSection): number => density * (s.width / 1000) * (s.height / 1000); // kN/m
  const bearers = settings.support === 'bearers';
  const checks: StaticsCheck[] = [];

  const push = (id: string, element: string, elementDe: string, sectionIn: TimberSection, span: number, loads: BeamLoads, detail: string, recommend: (better?: number) => string): void => {
    const res = checkBeam({ section: sectionIn, span, cantilever: 0, ...loads }, mat, k);
    const status = statusOf(res.utilisation);
    let recommendation: string | undefined;
    if (status !== 'ok') {
      const better = STANDARD_DEPTHS.find((h) => h > sectionIn.height && checkBeam({ section: { width: sectionIn.width, height: h }, span, cantilever: 0, ...loads }, mat, k).utilisation <= OK_LIMIT);
      recommendation = recommend(better);
    }
    checks.push({
      id,
      kind: 'vertical',
      element,
      elementDe,
      section: sectionIn,
      span: Math.round(span),
      loadUls: res.qd,
      loadSls: loads.qG + slsVariable(loads),
      stressUtil: res.stressUtil,
      deflectionUtil: res.deflectionUtil,
      deflection: res.wFin,
      deflectionLimit: res.wLimit,
      utilisation: res.utilisation,
      status,
      recommendation,
      detail: `${detail} Governing ${res.governing.replace('S', 'Q')}: σ_m,d = ${fmt(res.sigma)} ≤ f_m,d = ${fmt(res.fmd)} N/mm² (${pct(res.stressUtil)}), shear ${pct(res.shearUtil)}, w_fin = ${fmt(res.wFin)} mm ≤ ${fmt(res.wLimit)} mm.`,
    });
  };

  const joistSpacingM = Math.max(layout.joistSpacing, 1) / 1000;
  const joistLoads: BeamLoads = { qG: deckLoad * joistSpacingM + selfWeight(settings.joist), qS: settings.liveLoad * joistSpacingM, qW: 0 };
  push(
    'floor-joist',
    bearers ? 'Floor joist' : 'Sleeper',
    bearers ? 'Fußbodenbalken' : 'Lagerholz',
    settings.joist,
    layout.joistSpan,
    joistLoads,
    `${bearers ? 'Simply supported between bearers' : 'Simply supported between levelling pads'}, span ${fmt(layout.joistSpan / 1000, 2)} m, spacing ${layout.joistSpacing} mm, imposed load ${fmt(settings.liveLoad, 2)} kN/m².`,
    (better) =>
      better
        ? `Increase the floor ${bearers ? 'joists' : 'sleepers'} to ${settings.joist.width}×${better} mm, or reduce the ${bearers ? 'bearer' : 'pad'} spacing.`
        : `Reduce the ${bearers ? 'bearer' : 'pad'} spacing to shorten the span.`,
  );

  if (bearers) {
    const tributaryM = Math.max(layout.bearerSpacing, 1) / 1000;
    const bearerLoads: BeamLoads = {
      qG: (deckLoad + selfWeight(settings.joist) / joistSpacingM) * tributaryM + selfWeight(settings.bearer),
      qS: settings.liveLoad * tributaryM,
      qW: 0,
    };
    push(
      'floor-bearer',
      'Floor bearer',
      'Unterzug',
      settings.bearer,
      layout.bearerSpan,
      bearerLoads,
      `Simply supported between point foundations, span ${fmt(layout.bearerSpan / 1000, 2)} m, tributary width ${layout.bearerSpacing} mm.`,
      (better) => (better ? `Increase the bearers to ${settings.bearer.width}×${better} mm, or reduce the foundation spacing.` : 'Reduce the foundation spacing to shorten the bearer span.'),
    );
  }
  return checks;
}

/**
 * Post footings in the soil, from the forces of the member checks: the most loaded post (G + S)
 * gives the soil pressure. Post bases are pinned, so the footings take no moment.
 */
function computeFoundationChecks(ctx: Context, checks: StaticsCheck[]): StaticsCheck[] {
  const { loads, timber } = ctx.params;
  const posts = checks.filter((c) => c.kind === 'vertical' && c.id.startsWith('post-') && c.loadUls > 0);
  if (posts.length === 0) return [];
  const worstPost = posts.reduce((w, c) => (c.loadUls > w.loadUls ? c : w));
  return foundationChecks({
    soil: loads.soil ?? 'non-cohesive',
    depth: Math.max(0, loads.postFootingDepth ?? 0),
    diameter: Math.max(0, loads.postFootingDiameter ?? 0),
    shape: ctx.params.build.footingShape,
    post: timber.post,
    worstPost: { label: worstPost.element, Nd: worstPost.loadUls },
  });
}

/** Everything this pre-design leaves to the structural engineer, for the summary and the report. */
function notChecked(ctx: Context): string[] {
  const { loads, build } = ctx.params;
  const list = [
    'Soil bearing on site: table values of DIN 1054 without a soil investigation; settlement and groundwater are not checked.',
    'Connection details not modelled: purlin splices, headers and sills, stud and plate screws, cladding and trim fixings.',
    `Product values from ETAs taken as inputs, not verified: Sparrenpfettenanker R_k = ${build.rafterAnchorRk} kN, angle bracket R_k = ${build.angleBracketRk} kN${(loads.postBase ?? 'adjustable') === 'adjustable' ? ', adjustable post base and its anchor' : ''}.`,
    'The roof sheet as a diaphragm that shares the wind between the braced lines, and second-order effects.',
    'Fire resistance, snow drifts against higher neighbouring buildings, and accidental impact (vehicles).',
  ];
  if (Object.values(ctx.project.walls).some((w) => w.closed && (w.bracing === 'strap' || w.bracing === 'panels'))) {
    list.push('Hold-down anchors at the ends of braced walls: the tension is given, the anchor into the base is not designed.');
  }
  return list;
}

export function computeStatics(project: ProjectState, framing: FramingResult): StaticsResult {
  const ctx = buildContext(project, framing);
  const q = Math.max(Number.isFinite(ctx.params.loads.windLoad) ? ctx.params.loads.windLoad : 0.65, 0);
  const memberChecks = computeChecks(ctx, q);
  const checks = [...memberChecks, ...computeFloorChecks(ctx), ...computeFoundationChecks(ctx, memberChecks)];
  const collapse = collapsePressure(ctx, q);
  const { deadLoad, snowLoadRoof, params } = ctx;
  const { loads } = params;
  return {
    // Every row counts: members, bracing, the uplift chain, joints and footings
    status: worst(checks.map((c) => c.status)),
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
      groundSnowLoad: ctx.groundSnow,
      snowShape: snowShapeCoefficient(ctx.framing.roof.pitchDeg),
      exceptionalSnow: loads.exceptionalSnow ? EXCEPTIONAL_SNOW_FACTOR * ctx.groundSnow : undefined,
      canopyForce: ctx.canopy,
      canopyLocal: ctx.local,
    },
    collapseGustSpeed: collapse ? pressureToGustSpeed(collapse.q) : undefined,
    collapseElement: collapse?.element,
    notChecked: notChecked(ctx),
  };
}
