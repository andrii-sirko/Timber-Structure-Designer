import type { ConnectionMode, StaticsCheck, StaticsStatus, StrengthClass, TimberSpecs } from '@/types';
import type { MaterialProps } from './materials';
import type { CanopyZones } from './windZones';

/**
 * Joint checks with EN 1995-1-1 section 8 fastener rules for the fasteners the parts list names:
 *  - rafter bearings held down against local wind suction (edge zones B / C, interior zone A)
 *    by fully threaded screws in withdrawal (8.7.2)
 *  - purlin-to-post joints under net uplift (overall c_f, like the anchoring check)
 *  - knee brace ends: screws in lateral load (Johansen, 8.2.2) or the tenon shoulder in contact
 *    compression at 45° to the grain (6.2.2)
 * Hardware with an ETA instead of an EC5 rule (rafter anchors, angle brackets) is given as the
 * design resistance it must reach, with an equivalent screw solution that EC5 can verify.
 */

const GAMMA_M_CONNECTION = 1.3;
// Same partial factors and status limit as the member checks (index.ts)
const GAMMA_Q = 1.5;
const GAMMA_G_FAVOURABLE = 1.0;
const OK_LIMIT = 0.85;
/** Tensile strength of the screw wire assumed for the yield moment (N/mm², conservative) */
const SCREW_FU = 400;
/** Characteristic compression strength perpendicular to the grain f_c,90,k (EN 338 / EN 14080) */
const FC90K: Record<StrengthClass, number> = { C16: 2.2, C24: 2.5, C30: 2.7, GL24h: 2.5, GL28c: 2.5 };
/** Characteristic density ρ_k (kg/m³) for the fastener rules (EN 338 / EN 14080) */
const RHOK: Record<StrengthClass, number> = { C16: 310, C24: 350, C30: 380, GL24h: 385, GL28c: 390 };
const SCREW_DIAMETERS = [8, 10, 12];

const fmt = (v: number, d = 1): string => v.toFixed(d);
const pct = (v: number): string => `${Math.round(v * 100)} %`;
const kn = (v: number): string => `${fmt(v, 1)} kN`;
const statusOf = (util: number): StaticsStatus => (util > 1 ? 'fail' : util > OK_LIMIT ? 'warning' : 'ok');
const roundUp20 = (mm: number): number => Math.ceil(mm / 20) * 20;

/**
 * Characteristic withdrawal capacity (N) of one screw with a threaded length l_ef (mm) in timber of
 * characteristic density ρ_k, at α° between screw axis and grain (EN 1995-1-1 eq. 8.38 / 8.39).
 */
export function screwWithdrawal(d: number, lef: number, rhok: number, alphaDeg = 90): number {
  if (lef < 6 * d) return 0; // shorter thread is not load-bearing
  const fax = 0.52 * d ** -0.5 * lef ** -0.1 * rhok ** 0.8;
  const a = (alphaDeg * Math.PI) / 180;
  const kd = Math.min(d / 8, 1);
  return (fax * d * lef * kd) / (1.2 * Math.cos(a) ** 2 + Math.sin(a) ** 2);
}

/** Effective number of axially loaded screws in a group (EN 1995-1-1 8.7.2 (8)). */
const nEff = (n: number): number => n ** 0.9;

/**
 * Characteristic lateral capacity (N) of one fully threaded screw in single shear between two timber
 * members (EN 1995-1-1 eq. 8.6, β = 1): penetrations t1 (head side) / t2 (point side) in mm, the rope
 * effect limited to the Johansen part. Effective diameter 1.1 × core diameter (≈ 0.67 d).
 */
export function screwLateral(d: number, t1: number, t2: number, rhok: number): number {
  const def = 1.1 * 0.67 * d;
  const fh = def <= 6 ? 0.082 * rhok * def ** -0.3 : 0.082 * (1 - 0.01 * def) * rhok;
  const My = 0.3 * SCREW_FU * def ** 2.6;
  const rope = Math.min(screwWithdrawal(d, t1, rhok), screwWithdrawal(d, t2, rhok)) / 4;
  const r = t2 / t1;
  const a = fh * t1 * def;
  const b = fh * t2 * def;
  const c = (a / 2) * (Math.sqrt(1 + 2 * (1 + r + r * r) + r * r) - (1 + r));
  const dd = ((1.05 * a) / 3) * (Math.sqrt(4 + (12 * My) / (fh * def * t1 * t1)) - 1);
  const e = ((1.05 * b) / 3) * (Math.sqrt(4 + (12 * My) / (fh * def * t2 * t2)) - 1);
  const f = 1.15 * Math.sqrt(2 * My * fh * def);
  const withRope = (v: number) => v + Math.min(rope, v);
  return Math.min(a, b, withRope(c), withRope(dd), withRope(e), withRope(f));
}

export interface ScrewSolution {
  d: number;
  n: number;
  length: number;
  /** Design resistance of the n screws (kN) */
  Rd: number;
}

/**
 * Smallest screw group (diameter first, then count up to `maxN(d)`) whose design withdrawal
 * resistance reaches T_d (kN). `capacity(d)` returns the characteristic capacity of one screw (N)
 * and the screw length it assumes.
 */
function chooseScrews(Td: number, kmod: number, maxN: (d: number) => number, capacity: (d: number) => { F: number; length: number }): ScrewSolution | undefined {
  for (const d of SCREW_DIAMETERS) {
    const { F, length } = capacity(d);
    for (let n = 1; n <= maxN(d); n++) {
      const Rd = (kmod * nEff(n) * F) / GAMMA_M_CONNECTION / 1000;
      if (Rd * OK_LIMIT >= Td) return { d, n, length, Rd };
    }
  }
  return undefined;
}

const screwLabel = (s: ScrewSolution): string => `${s.n} × Ø${s.d} × ${s.length} mm`;

export interface BearingRow {
  label: string;
  /** Plan length of rafter (mm) bearing on this purlin row: half of each adjacent bay plus the eave overhang */
  trib: number;
  /** The rafters run on over this row (inner support of a continuous rafter, reaction × 1.25) */
  inner: boolean;
}

export interface PostJoint {
  label: string;
  /** Characteristic wind suction on the joint (kN) */
  uplift: number;
  /** Characteristic dead load of roof and purlin on the joint (kN) */
  dead: number;
}

export interface BraceAction {
  key: 'x' | 'z';
  /** Axis label as in the member checks */
  axis: string;
  /** Design axial force of the most loaded knee brace (kN) */
  Nd: number;
}

export interface ConnectionInput {
  mat: MaterialProps;
  strengthClass: StrengthClass;
  kmodShort: number;
  mode: ConnectionMode;
  timber: TimberSpecs;
  /** Peak velocity pressure (kN/m²) */
  q: number;
  local: CanopyZones;
  /** Characteristic dead load of the roof (kN/m² plan) */
  deadLoad: number;
  rafterSpacing: number;
  /** Rafter depth left at the bearing (mm), i.e. less the birdsmouth notch */
  rafterSeatHeight: number;
  /** Plan dimensions incl. overhangs (mm): along the eaves / along the verges */
  planLength: number;
  planWidth: number;
  bearings: BearingRow[];
  postJoints: PostJoint[];
  braces: BraceAction[];
}

export function connectionChecks(input: ConnectionInput): StaticsCheck[] {
  return [rafterBearingCheck(input), postJointCheck(input), ...input.braces.map((b) => braceJointCheck(input, b))].filter((c): c is StaticsCheck => !!c);
}

const blank = {
  loadSls: 0,
  deflectionUtil: 0,
  deflection: 0,
  deflectionLimit: 0,
};

function rafterBearingCheck(input: ConnectionInput): StaticsCheck | undefined {
  const { kmodShort, timber, q, local, deadLoad, rafterSpacing, rafterSeatHeight, bearings, mode } = input;
  const rhok = RHOK[input.strengthClass];
  if (bearings.length === 0) return undefined;
  const s = rafterSpacing / 1000;
  const tension = (c: number, row: BearingRow): number => {
    const area = s * (row.trib / 1000) * (row.inner ? 1.25 : 1);
    return GAMMA_Q * -c * q * area - GAMMA_G_FAVOURABLE * deadLoad * area;
  };
  const worstOf = (rows: BearingRow[], c: number) =>
    rows.reduce<{ T: number; row?: BearingRow }>((w, row) => (tension(c, row) > w.T ? { T: tension(c, row), row } : w), { T: -Infinity });
  // Every bearing on an eave purlin lies in an edge strip; on inner purlins only the verge rafters do
  const edge = worstOf(bearings, local.edge.up);
  const interior = worstOf(
    bearings.filter((b) => b.inner),
    local.interior.up,
  );
  const stripEave = input.planWidth / 10 / 1000;
  const stripVerge = input.planLength / 10 / 1000;
  const hr = Math.max(rafterSeatHeight, 40);
  const hb = timber.beam.height;
  // Fully threaded screw through the rafter into the purlin, both threads perpendicular to the grain
  const capacity = (d: number, length?: number) => {
    const embed = length !== undefined ? length - hr : Math.min(hb - 20, 15 * d);
    const F = Math.min(screwWithdrawal(d, hr, rhok), screwWithdrawal(d, Math.min(embed, hb - 20) - d, rhok));
    return { F, length: length ?? roundUp20(hr + embed) };
  };
  const maxN = (d: number) => (timber.rafter.width >= 8 * d ? (timber.beam.width >= 13 * d ? 2 : timber.beam.width >= 8 * d ? 1 : 0) : 0);
  const base = {
    id: 'conn-rafter',
    kind: 'connection' as const,
    element: 'Rafter bearing hold-down',
    elementDe: 'Sparrenbefestigung gegen Abheben',
    section: timber.rafter,
    ...blank,
  };
  const loads = `Local suction c_p,net = ${fmt(local.edge.up, 2)} in the edge strips (${fmt(stripVerge, 2)} m at the verges, ${fmt(stripEave, 2)} m at the eaves) and ${fmt(local.interior.up, 2)} inside, q_p = ${fmt(q, 2)} kN/m², rafter spacing ${rafterSpacing} mm, dead load 1.0·g = ${fmt(deadLoad, 2)} kN/m².`;
  if (edge.T <= 0) {
    return {
      ...base,
      span: 0,
      loadUls: 0,
      stressUtil: 0,
      utilisation: 0,
      status: 'ok',
      detail: `${loads} The dead load holds every rafter down – no tension at the bearings.`,
    };
  }
  const forEdge = chooseScrews(edge.T, kmodShort, maxN, (d) => capacity(d));
  const forInterior = interior.T > 0 ? chooseScrews(interior.T, kmodShort, maxN, (d) => capacity(d)) : undefined;
  const tensions = [
    `T_d = ${kn(edge.T)} per bearing in the edge strips (${edge.row!.label}).`,
    interior.row ? (interior.T > 0 ? `T_d = ${kn(interior.T)} per bearing inside (${interior.row.label}).` : `No tension at the inner bearings (${interior.row.label}).`) : '',
  ]
    .filter(Boolean)
    .join(' ');
  const solution = (sol: ScrewSolution | undefined): string =>
    sol ? `${screwLabel(sol)} fully threaded screws per bearing (R_d = ${kn(sol.Rd)})` : 'no screw pair fits – use rafter anchors or reduce the rafter spacing';
  const screwPlan = [`Edge strips: ${solution(forEdge)}.`, interior.row && interior.T > 0 ? `Inside: ${solution(forInterior)}.` : ''].filter(Boolean).join(' ');

  if (mode === 'traditional') {
    // Parts list: one 8 × 280 mm rafter screw per bearing
    const listed = capacity(8, 280);
    const Rd = (kmodShort * listed.F) / GAMMA_M_CONNECTION / 1000;
    const util = Rd > 0 ? edge.T / Rd : Infinity;
    const status = statusOf(util);
    return {
      ...base,
      span: 280,
      loadUls: edge.T,
      stressUtil: util,
      utilisation: Math.min(util, 9.99),
      status,
      recommendation: status !== 'ok' ? `One 8 × 280 mm screw per bearing is not enough. ${screwPlan}` : undefined,
      detail: `${loads} ${tensions} One Ø8 × 280 mm screw through the ${Math.round(hr)} mm rafter (at the seat) into the purlin: R_d = ${kn(Rd)} (EN 1995-1-1 8.7.2, k_mod ${kmodShort}) (${pct(util)}).`,
    };
  }
  const util = forEdge ? edge.T / forEdge.Rd : 1.01;
  return {
    ...base,
    span: forEdge?.length ?? 0,
    loadUls: edge.T,
    stressUtil: util,
    utilisation: util,
    status: forEdge ? 'ok' : 'warning',
    recommendation: `Rafter–purlin anchors must reach a design tension resistance R_d ≥ ${kn(edge.T)} in the edge strips${interior.T > 0 ? ` and ${kn(interior.T)} inside` : ''} (ETA values, nailed as specified) – or use screws. ${screwPlan}`,
    detail: `${loads} ${tensions}`,
  };
}

function postJointCheck(input: ConnectionInput): StaticsCheck | undefined {
  const { kmodShort, timber, postJoints, mode } = input;
  const rhok = RHOK[input.strengthClass];
  if (postJoints.length === 0) return undefined;
  const worst = postJoints.reduce((w, j) => {
    const T = GAMMA_Q * j.uplift - GAMMA_G_FAVOURABLE * j.dead;
    return T > w.T ? { T, joint: j } : w;
  }, { T: -Infinity, joint: postJoints[0] });
  const base = {
    id: 'conn-post',
    kind: 'connection' as const,
    element: 'Purlin–post joint (uplift)',
    elementDe: 'Anschluss Pfette–Pfosten (Zug)',
    section: timber.post,
    ...blank,
  };
  const loads = `${worst.joint.label}: uplift 1.5·W = ${kn(GAMMA_Q * worst.joint.uplift)} vs. roof + purlin 1.0·G = ${kn(worst.joint.dead)}.`;
  if (worst.T <= 0) {
    return { ...base, span: 0, loadUls: 0, stressUtil: 0, utilisation: 0, status: 'ok', detail: `${loads} The joint stays in compression.` };
  }
  const hb = timber.beam.height;
  const postMin = Math.min(timber.post.width, timber.post.height);
  // Screws from the purlin top into the post end grain (α = 0°: 1/1.2 of the side-grain value)
  const capacity = (d: number) => {
    const lef = 15 * d;
    return { F: Math.min(screwWithdrawal(d, hb, rhok), screwWithdrawal(d, lef, rhok, 0)), length: roundUp20(hb + lef + d) };
  };
  const maxN = (d: number) => {
    const room = Math.min(postMin, timber.beam.width);
    return room >= 13 * d ? 4 : room >= 8 * d ? 1 : 0;
  };
  const sol = chooseScrews(worst.T, kmodShort, maxN, capacity);
  const screws = sol ? `${screwLabel(sol)} fully threaded screws from the purlin top into the post (end grain, R_d = ${kn(sol.Rd)})` : undefined;
  const util = sol ? worst.T / sol.Rd : 1.01;
  if (mode === 'traditional') {
    return {
      ...base,
      span: sol?.length ?? 0,
      loadUls: worst.T,
      stressUtil: util,
      utilisation: util,
      status: 'warning',
      recommendation: `A pegged tenon is not a tension joint – net tension ${kn(worst.T)} per post. ${screws ? `Add ${screws}, or a steel strap on both sides.` : 'Add steel straps on both sides.'}`,
      detail: `${loads} Net tension T_d = ${kn(worst.T)} per joint.`,
    };
  }
  return {
    ...base,
    span: sol?.length ?? 0,
    loadUls: worst.T,
    stressUtil: util,
    utilisation: util,
    status: sol ? 'ok' : 'warning',
    recommendation: `Each of the 2 angle brackets 90×90×65 must reach R_d ≥ ${kn(worst.T / 2)} in tension (ETA, uplift direction)${screws ? ` – or add ${screws}` : ''}.`,
    detail: `${loads} Net tension T_d = ${kn(worst.T)} per joint, shared by 2 angle brackets.`,
  };
}

function braceJointCheck(input: ConnectionInput, brace: BraceAction): StaticsCheck {
  const { mat, kmodShort, timber, mode, strengthClass } = input;
  const rhok = RHOK[strengthClass];
  const b = timber.brace;
  const base = {
    id: `conn-brace-${brace.key}`,
    kind: 'connection' as const,
    element: `Knee brace joints ${brace.axis}`,
    elementDe: 'Kopfbandanschlüsse',
    section: b,
    loadUls: brace.Nd,
    ...blank,
  };
  if (mode === 'traditional') {
    // Stub tenon: the shoulders (2/3 of the brace section) bear on the post / purlin at 45° to its grain
    const fc0d = (kmodShort * mat.fc0k) / mat.gammaM;
    const fc90d = (kmodShort * FC90K[strengthClass]) / mat.gammaM;
    const fc45d = fc0d / ((fc0d / fc90d) * 0.5 + 0.5);
    const area = (2 / 3) * b.width * b.height;
    const sigma = (brace.Nd * 1000) / area;
    const util = sigma / fc45d;
    const status = statusOf(util);
    return {
      ...base,
      span: 0,
      stressUtil: util,
      utilisation: util,
      status,
      recommendation: status !== 'ok' ? 'Use larger knee braces, or a full-width shoulder (Versatz) instead of the stub tenon.' : undefined,
      detail: `Strut N_d = ${kn(brace.Nd)} through the tenon shoulders (2/3 of ${b.width}×${b.height} mm = ${Math.round(area / 100)} cm²): σ = ${fmt(sigma, 2)} ≤ f_c,45,d = ${fmt(fc45d, 2)} N/mm² (EN 1995-1-1 eq. 6.16) (${pct(util)}). The peg only holds the joint together.`,
    };
  }
  // Parts list: 2 screws 8 × 240 mm per brace end, through the brace into the post / purlin
  const t1 = b.width;
  const t2 = Math.min(240 - t1, Math.min(timber.post.width, timber.beam.width) - 10);
  const Fv = screwLateral(8, t1, t2, rhok);
  const perScrew = (kmodShort * Fv) / GAMMA_M_CONNECTION / 1000;
  const Rd = perScrew * nEff(2);
  const util = brace.Nd / Rd;
  const status = statusOf(util);
  let need = 2;
  while (need < 8 && perScrew * nEff(need) * OK_LIMIT < brace.Nd) need++;
  return {
    ...base,
    span: 240,
    stressUtil: util,
    utilisation: util,
    status,
    recommendation: status !== 'ok' ? `Use ${need} screws Ø8 × 240 mm per brace end (or Ø10), or larger braces with more room for screws.` : undefined,
    detail: `Brace force N_d = ${kn(brace.Nd)} (tension or compression) on 2 screws Ø8 × 240 mm per end in single shear (t1 = ${t1} mm, t2 = ${Math.round(t2)} mm): F_v,Rd = ${kn(perScrew)} per screw incl. rope effect (EN 1995-1-1 8.2.2), R_d = ${kn(Rd)} (${pct(util)}).`,
  };
}
