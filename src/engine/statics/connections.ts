import type { BraceConnector, ConnectionMode, StaticsCheck, StaticsStatus, StrengthClass, TimberSpecs } from '@/types';
import type { MaterialProps } from './materials';

/**
 * Fastener rules of EN 1995-1-1 section 8 and the knee brace end check: 2 structural screws
 * 8 × 200 mm or 1 bolt M12 per brace end (Johansen, 8.2.2), or the tenon shoulder in contact
 * compression at 45° to the grain (6.2.2) for carpentry joints. The uplift joints (rafter →
 * purlin → post → anchor) are checked as a chain in upliftChain.ts.
 */

const GAMMA_M_CONNECTION = 1.3;
// Same status limit as the member checks (index.ts)
const OK_LIMIT = 0.85;
/** Tensile strength of the screw wire assumed for the yield moment (N/mm², conservative) */
const SCREW_FU = 400;
/** Characteristic compression strength perpendicular to the grain f_c,90,k (EN 338 / EN 14080) */
const FC90K: Record<StrengthClass, number> = { C16: 2.2, C24: 2.5, C30: 2.7, GL24h: 2.5, GL28c: 2.5 };

const fmt = (v: number, d = 1): string => v.toFixed(d);
const pct = (v: number): string => `${Math.round(v * 100)} %`;
const kn = (v: number): string => `${fmt(v, 1)} kN`;
const statusOf = (util: number): StaticsStatus => (util > 1 ? 'fail' : util > OK_LIMIT ? 'warning' : 'ok');

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

/** Effective number of fasteners in a row (conservative n^0.9). */
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

/**
 * Characteristic lateral capacity (N) of a bolt in single shear between two timber members
 * (EN 1995-1-1 eq. 8.6 with f_h at the load angles, rope effect ignored).
 */
export function boltLateral(d: number, t1: number, t2: number, rhok: number, alpha1Deg: number, alpha2Deg: number, fu = 400): number {
  const fh0 = 0.082 * (1 - 0.01 * d) * rhok;
  const k90 = 1.35 + 0.015 * d;
  const fhAt = (deg: number) => fh0 / (k90 * Math.sin((deg * Math.PI) / 180) ** 2 + Math.cos((deg * Math.PI) / 180) ** 2);
  const fh1 = fhAt(alpha1Deg);
  const fh2 = fhAt(alpha2Deg);
  const beta = fh2 / fh1;
  const My = 0.3 * fu * d ** 2.6;
  const r = t2 / t1;
  const a = fh1 * t1 * d;
  const b = fh2 * t2 * d;
  const c = (a / (1 + beta)) * (Math.sqrt(beta + 2 * beta ** 2 * (1 + r + r * r) + beta ** 3 * r * r) - beta * (1 + r));
  const e1 = ((1.05 * a) / (2 + beta)) * (Math.sqrt(2 * beta * (1 + beta) + (4 * beta * (2 + beta) * My) / (fh1 * d * t1 * t1)) - beta);
  const e2 = ((1.05 * fh1 * t2 * d) / (1 + 2 * beta)) * (Math.sqrt(2 * beta ** 2 * (1 + beta) + (4 * beta * (1 + 2 * beta) * My) / (fh1 * d * t2 * t2)) - beta);
  const f = 1.15 * Math.sqrt((2 * beta) / (1 + beta)) * Math.sqrt(2 * My * fh1 * d);
  return Math.min(a, b, c, e1, e2, f);
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
  braceConnector: BraceConnector;
  timber: TimberSpecs;
  braces: BraceAction[];
}

export function connectionChecks(input: ConnectionInput): StaticsCheck[] {
  return input.braces.map((b) => braceJointCheck(input, b));
}

/** Screws / bolt per brace end for a connector choice */
export const BRACE_FASTENERS: Record<BraceConnector, { count: number; label: string }> = {
  screws: { count: 2, label: '2 structural screws Ø8 × 200 mm' },
  bolt: { count: 1, label: '1 bolt M12 with washers' },
};

function braceJointCheck(input: ConnectionInput, brace: BraceAction): StaticsCheck {
  const { mat, kmodShort, timber, mode, strengthClass, braceConnector } = input;
  const rhok = mat.rhok;
  const b = timber.brace;
  const base = {
    id: `conn-brace-${brace.key}`,
    kind: 'connection' as const,
    element: `Knee brace joints ${brace.axis}`,
    elementDe: 'Kopfbandanschlüsse',
    section: b,
    loadUls: brace.Nd,
    loadSls: 0,
    deflectionUtil: 0,
    deflection: 0,
    deflectionLimit: 0,
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
  const member = Math.min(timber.post.width, timber.beam.width);
  let perFastener: number;
  let length: number;
  if (braceConnector === 'bolt') {
    // Bolt through brace and post: the brace force runs along the brace grain, at 45° to the post grain
    perFastener = (kmodShort * boltLateral(12, b.width, member, rhok, 0, 45)) / GAMMA_M_CONNECTION / 1000;
    length = b.width + member + 30;
  } else {
    const t1 = b.width;
    const t2 = Math.min(200 - t1, member - 10);
    perFastener = (kmodShort * screwLateral(8, t1, t2, rhok)) / GAMMA_M_CONNECTION / 1000;
    length = 200;
  }
  const fasteners = BRACE_FASTENERS[braceConnector];
  const Rd = perFastener * nEff(fasteners.count);
  const util = brace.Nd / Rd;
  const status = statusOf(util);
  return {
    ...base,
    span: length,
    stressUtil: util,
    utilisation: util,
    status,
    recommendation: status !== 'ok' ? (braceConnector === 'bolt' ? 'Use 2 structural screws Ø8 × 200 mm plus the bolt, or larger knee braces.' : 'Use a bolt M12 per brace end in addition, or larger knee braces.') : undefined,
    detail: `Brace force N_d = ${kn(brace.Nd)} (tension or compression) on ${fasteners.label} per end in single shear: F_v,Rd = ${kn(perFastener)} per fastener (EN 1995-1-1 8.2.2), R_d = ${kn(Rd)} (${pct(util)}).`,
  };
}
