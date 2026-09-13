import type { FramingResult, ProjectState, StaticsCheck, StaticsResult, StaticsStatus, TimberSection } from '@/types';
import { sanitizeParams } from '../framing';
import { sectionLabel } from '../geometry';
import {
  KDEF_BY_SERVICE_CLASS,
  KMOD_BY_SERVICE_CLASS,
  MATERIALS,
  ROOF_COVERING_LOAD,
  snowShapeCoefficient,
  type MaterialProps,
} from './materials';

/**
 * Simplified structural verification following Eurocode 5 (EN 1995-1-1) principles:
 *  - ULS bending & shear with k_mod / γ_M design strengths
 *  - SLS deflection with k_def creep (w_inst ≤ L/300, w_fin ≤ L/200)
 *  - Post buckling with the EC5 k_c reduction
 * Wind, uplift, lateral stability, connections and fire are NOT covered – this is a
 * pre-design tool, not a replacement for a structural engineer's calculation.
 */

const GAMMA_G = 1.35;
const GAMMA_Q = 1.5;
const G_ACCEL = 9.81;
export const STANDARD_DEPTHS = [80, 100, 120, 140, 160, 180, 200, 220, 240, 260, 280, 300, 320, 360];
export const OK_LIMIT = 0.85;

interface BeamInput {
  section: TimberSection;
  /** Effective span between supports (mm) */
  span: number;
  /** Longest cantilever beyond a support (mm) */
  cantilever: number;
  /** Characteristic permanent line load (kN/m = N/mm) */
  qG: number;
  /** Characteristic variable line load (kN/m = N/mm) */
  qQ: number;
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
}

function checkBeam(input: BeamInput, mat: MaterialProps, kmod: number, kdef: number): BeamOutput {
  const { width: b, height: h } = input.section;
  const Wel = (b * h * h) / 6;
  const I = (b * h * h * h) / 12;
  const L = Math.max(input.span, 1);
  const a = input.cantilever;
  const qd = GAMMA_G * input.qG + GAMMA_Q * input.qQ;

  const Mspan = (qd * L * L) / 8;
  const Mcant = (qd * a * a) / 2;
  const Md = Math.max(Mspan, Mcant);
  const sigma = Md / Wel;
  const fmd = (kmod * mat.fmk) / mat.gammaM;
  const stressUtil = sigma / fmd;

  const Vd = Math.max((qd * L) / 2, qd * a);
  const tau = (1.5 * Vd) / (0.67 * b * h);
  const fvd = (kmod * mat.fvk) / mat.gammaM;
  const shearUtil = tau / fvd;

  const k = (5 * L ** 4) / (384 * mat.e0mean * I);
  const wG = input.qG * k;
  const wQ = input.qQ * k;
  const wInst = wG + wQ;
  const wFin = wG * (1 + kdef) + wQ;
  const wLimit = L / 200;
  const deflectionUtil = Math.max(wInst / (L / 300), wFin / wLimit);

  return {
    stressUtil,
    shearUtil,
    wInst,
    wFin,
    wLimit,
    deflectionUtil,
    utilisation: Math.max(stressUtil, shearUtil, deflectionUtil),
    sigma,
    fmd,
    Md,
  };
}

interface PostOutput {
  sigma: number;
  fcd: number;
  kc: number;
  lambda: number;
  utilisation: number;
}

function checkPost(section: TimberSection, height: number, Nd: number, mat: MaterialProps, kmod: number): PostOutput {
  const { width: b, height: h } = section;
  const A = b * h;
  const fcd = (kmod * mat.fc0k) / mat.gammaM;
  const i = Math.min(b, h) / Math.sqrt(12);
  const lambda = Math.max(height, 1) / i;
  const lambdaRel = (lambda / Math.PI) * Math.sqrt(mat.fc0k / mat.e005);
  let kc = 1;
  if (lambdaRel > 0.3) {
    const kk = 0.5 * (1 + mat.betaC * (lambdaRel - 0.3) + lambdaRel * lambdaRel);
    kc = Math.min(1, 1 / (kk + Math.sqrt(Math.max(kk * kk - lambdaRel * lambdaRel, 0))));
  }
  const sigma = (Nd * 1000) / A;
  return { sigma, fcd, kc, lambda, utilisation: sigma / (kc * fcd) };
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

export function computeStatics(project: ProjectState, framing: FramingResult): StaticsResult {
  const params = sanitizeParams(project.params);
  const { timber, loads, overhangs } = params;
  const mat = MATERIALS[timber.strengthClass];
  const kmod = KMOD_BY_SERVICE_CLASS[loads.serviceClass];
  const kdef = KDEF_BY_SERVICE_CLASS[loads.serviceClass];
  const roof = framing.roof;
  const cos = Math.cos(roof.pitchRad);
  const density = (mat.density * G_ACCEL) / 1000; // kN/m³

  // ── Loads per m² of plan ────────────────────────────────────────────────
  const covering = ROOF_COVERING_LOAD[loads.roofCovering];
  const spacingM = Math.max(roof.rafterSpacing, 1) / 1000;
  const rafterSelf = (density * (timber.rafter.width / 1000) * (timber.rafter.height / 1000)) / spacingM; // kN/m² surface
  const deadLoad = (covering.load + rafterSelf) / cos; // kN/m² plan
  const snowLoadRoof = snowShapeCoefficient(roof.pitchDeg) * loads.snowLoad;
  const totalCharacteristic = deadLoad + snowLoadRoof;
  const totalDesign = GAMMA_G * deadLoad + GAMMA_Q * snowLoadRoof;

  const checks: StaticsCheck[] = [];

  // ── Rafters ─────────────────────────────────────────────────────────────
  {
    const pw = timber.post.width;
    const horizontalSpan = Math.max(params.width - pw, 500);
    const span = horizontalSpan / cos;
    const cantilever = Math.max(overhangs.front, overhangs.rear) / cos;
    const qG = deadLoad * spacingM * cos * cos;
    const qQ = snowLoadRoof * spacingM * cos * cos;
    const res = checkBeam({ section: timber.rafter, span, cantilever, qG, qQ }, mat, kmod, kdef);
    const status = statusOf(res.utilisation);
    let recommendation: string | undefined;
    if (status !== 'ok') {
      const better = STANDARD_DEPTHS.find(
        (h) => h > timber.rafter.height && checkBeam({ section: { width: timber.rafter.width, height: h }, span, cantilever, qG, qQ }, mat, kmod, kdef).utilisation <= OK_LIMIT,
      );
      recommendation = better
        ? `Increase rafters to ${timber.rafter.width}×${better} mm, or reduce rafter spacing / add a mid purlin.`
        : 'Add an intermediate purlin with posts to halve the rafter span.';
    }
    checks.push({
      id: 'rafter',
      element: 'Rafter',
      elementDe: 'Sparren',
      section: timber.rafter,
      span: Math.round(span),
      loadUls: GAMMA_G * qG + GAMMA_Q * qQ,
      loadSls: qG + qQ,
      stressUtil: res.stressUtil,
      deflectionUtil: res.deflectionUtil,
      deflection: res.wFin,
      deflectionLimit: res.wLimit,
      utilisation: res.utilisation,
      status,
      recommendation,
      detail: `Simply supported on both purlins, span ${fmt(span / 1000, 2)} m (sloped), spacing ${roof.rafterSpacing} mm, cantilever ${Math.round(cantilever)} mm. σ_m,d = ${fmt(res.sigma)} ≤ f_m,d = ${fmt(res.fmd)} N/mm² (${pct(res.stressUtil)}), shear ${pct(res.shearUtil)}, w_fin = ${fmt(res.wFin)} mm ≤ ${fmt(res.wLimit)} mm (L/200).`,
    });
  }

  // ── Purlins (front carries W/2 + front overhang, rear W/2 + rear overhang) ─
  const purlinSelf = density * (timber.beam.width / 1000) * (timber.beam.height / 1000);
  const purlinRows = [
    { id: 'purlin-front', label: 'Purlin front', labelDe: 'Pfette vorne', trib: params.width / 2 + overhangs.front },
    { id: 'purlin-rear', label: 'Purlin rear', labelDe: 'Pfette hinten', trib: params.width / 2 + overhangs.rear },
  ];
  const purlinSpan = Math.max(framing.grid.postSpacing, 300);
  const purlinCantilever = Math.max(overhangs.left, overhangs.right);
  const purlinLoads = purlinRows.map((row) => {
    const tribM = row.trib / 1000;
    const qG = deadLoad * tribM + purlinSelf;
    const qQ = snowLoadRoof * tribM;
    return { row, qG, qQ };
  });
  for (const { row, qG, qQ } of purlinLoads) {
    const res = checkBeam({ section: timber.beam, span: purlinSpan, cantilever: purlinCantilever, qG, qQ }, mat, kmod, kdef);
    const status = statusOf(res.utilisation);
    let recommendation: string | undefined;
    if (status !== 'ok') {
      const better = STANDARD_DEPTHS.find(
        (h) => h > timber.beam.height && checkBeam({ section: { width: timber.beam.width, height: h }, span: purlinSpan, cantilever: purlinCantilever, qG, qQ }, mat, kmod, kdef).utilisation <= OK_LIMIT,
      );
      recommendation = better
        ? `Increase purlins to ${timber.beam.width}×${better} mm or reduce the max. post spacing.`
        : 'Reduce the maximum post spacing (add posts).';
    }
    checks.push({
      id: row.id,
      element: row.label,
      elementDe: row.labelDe,
      section: timber.beam,
      span: Math.round(purlinSpan),
      loadUls: GAMMA_G * qG + GAMMA_Q * qQ,
      loadSls: qG + qQ,
      stressUtil: res.stressUtil,
      deflectionUtil: res.deflectionUtil,
      deflection: res.wFin,
      deflectionLimit: res.wLimit,
      utilisation: res.utilisation,
      status,
      recommendation,
      detail: `Post spacing ${fmt(purlinSpan / 1000, 2)} m treated as simply supported (conservative), tributary width ${fmt(row.trib / 1000, 2)} m, end cantilever ${purlinCantilever} mm. σ_m,d = ${fmt(res.sigma)} ≤ ${fmt(res.fmd)} N/mm² (${pct(res.stressUtil)}), w_fin = ${fmt(res.wFin)} mm ≤ ${fmt(res.wLimit)} mm.`,
    });
  }

  // ── Posts (front row usually governs: taller + larger tributary) ─────────
  const postRows = [
    { id: 'post-front', label: 'Post front', labelDe: 'Pfosten vorne', height: params.frontHeight - timber.beam.height, load: purlinLoads[0] },
    { id: 'post-rear', label: 'Post rear', labelDe: 'Pfosten hinten', height: params.rearHeight - timber.beam.height, load: purlinLoads[1] },
  ];
  for (const row of postRows) {
    const spanM = (purlinSpan + purlinCantilever) / 1000;
    const Nd = (GAMMA_G * row.load.qG + GAMMA_Q * row.load.qQ) * spanM;
    const Nk = (row.load.qG + row.load.qQ) * spanM;
    const res = checkPost(timber.post, row.height, Nd, mat, kmod);
    const status = statusOf(res.utilisation);
    let recommendation: string | undefined;
    if (status !== 'ok') {
      const better = [120, 140, 160, 180, 200].find(
        (s) => s > Math.min(timber.post.width, timber.post.height) && checkPost({ width: s, height: s }, row.height, Nd, mat, kmod).utilisation <= OK_LIMIT,
      );
      recommendation = better ? `Use ${better}×${better} mm posts or add posts to reduce the tributary length.` : 'Add posts to reduce the load per post.';
    }
    checks.push({
      id: row.id,
      element: row.label,
      elementDe: row.labelDe,
      section: timber.post,
      span: Math.round(row.height),
      loadUls: Nd,
      loadSls: Nk,
      stressUtil: res.utilisation,
      deflectionUtil: 0,
      deflection: 0,
      deflectionLimit: 0,
      utilisation: res.utilisation,
      status,
      recommendation,
      detail: `Axial load N_d = ${fmt(Nd, 1)} kN, buckling length ${Math.round(row.height)} mm (λ = ${fmt(res.lambda, 0)}, k_c = ${fmt(res.kc, 2)}). σ_c,0,d = ${fmt(res.sigma, 2)} ≤ k_c·f_c,0,d = ${fmt(res.kc * res.fcd, 2)} N/mm² (${pct(res.utilisation)}). Lateral stability by knee braces / cladding not verified.`,
    });
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
    const qG = claddingLoad * heightAbove + density * (timber.stud.width / 1000) * (timber.stud.height / 1000) * 2 + 0.2;
    const qQ = 0.5; // nominal incidental load (e.g. snow sliding onto the wall top, occupants leaning)
    const res = checkBeam({ section: member.section, span: clearSpan, cantilever: 0, qG, qQ }, mat, kmod, kdef);
    const status = statusOf(res.utilisation);
    checks.push({
      id: `header-${member.id}`,
      element: `Header ${opening?.label ?? ''} (${member.wallId ?? 'partition'})`.replace('  ', ' '),
      elementDe: 'Sturz',
      section: member.section,
      span: Math.round(clearSpan),
      loadUls: GAMMA_G * qG + GAMMA_Q * qQ,
      loadSls: qG + qQ,
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

  return {
    status: worst(checks.map((c) => c.status)),
    checks,
    loads: { deadLoad, snowLoadRoof, totalCharacteristic, totalDesign, kmod, kdef },
  };
}
