import type { BuildSettings, ConnectionMode, PostBaseType, StaticsCheck, StaticsStatus, TimberSpecs } from '@/types';
import type { MaterialProps } from './materials';
import type { CanopyZones } from './windZones';
import { screwWithdrawal } from './connections';
import { H_ANCHOR, H_ANCHOR_MIN_FOOTING, isHAnchor, postBaseTensionRd } from './postBase';
import { strapNailCapacity, strapTensionRd } from '../framing/straps';

/**
 * Roof uplift as a load path: every link from the roof sheet down to the concrete is one check
 * with its own load, resistance and utilisation.
 *  1. sheet fasteners → batten / rafter (local suction of the edge zones, EN 1991-1-4 Table 7.6)
 *  2. rafter → purlin (Sparrenpfettenanker per ETA, or rafter screws in the carpentry mode)
 *  3. purlin → post (angle brackets per ETA, fully threaded screws or a perforated strap)
 *  4. post → H anchor (2 × M12 bolts in double shear)
 *  5. anchor → foundation: uplift against 0.9 × dead weight incl. the concrete, no soil (EQU)
 * Loads: 1.5 · W (suction) against 1.0 · G (links 1–4) or 0.9 · G (link 5).
 */

const GAMMA_Q = 1.5;
const GAMMA_G_STR = 1.0;
const GAMMA_G_EQU = 0.9;
const GAMMA_M_CONNECTION = 1.3;
const OK_LIMIT = 0.85;
const CONCRETE_WEIGHT = 24;
/** Kammnägel per leg of a perforated strap over the purlin */
const STRAP_NAILS_PER_LEG = 6;

const fmt = (v: number, d = 1): string => v.toFixed(d);
const pct = (v: number): string => `${Math.round(v * 100)} %`;
const kn = (v: number): string => `${fmt(v, 2)} kN`;
const statusOf = (util: number): StaticsStatus => (util > 1 ? 'fail' : util > OK_LIMIT ? 'warning' : 'ok');

export interface ChainBearing {
  label: string;
  /** Plan length of rafter bearing on the row (mm) */
  trib: number;
  inner: boolean;
}

export interface ChainPost {
  label: string;
  /** Characteristic suction on the post's purlin length (kN) */
  uplift: number;
  /** Characteristic dead load of roof + purlin on the post (kN) */
  roofDead: number;
  /** Post self weight (kN) */
  postDead: number;
}

export interface UpliftChainInput {
  mat: MaterialProps;
  kmodShort: number;
  mode: ConnectionMode;
  timber: TimberSpecs;
  build: BuildSettings;
  postBase: PostBaseType;
  q: number;
  local: CanopyZones;
  /** Overall canopy suction coefficient (negative) */
  canopyUp: number;
  /** Roof covering dead load (kN/m² surface) and the whole roof dead load (kN/m² plan) */
  coveringLoad: number;
  deadLoad: number;
  rafterSpacing: number;
  /** Rafter depth left at the bearing (mm) */
  rafterSeatHeight: number;
  /** Depth of the member the sheet screws go into: batten or the rafter itself (mm) */
  sheetSupportDepth: number;
  sheetSupportLabel: string;
  bearings: ChainBearing[];
  posts: ChainPost[];
  /** Footing: depth (mm), size (side or Ø, mm); 0 = none */
  footingDepth: number;
  footingSize: number;
}

export function footingVolumeM3(build: Pick<BuildSettings, 'footingShape'>, size: number, depth: number): number {
  const a = size / 1000;
  const area = build.footingShape === 'round' ? (Math.PI * a * a) / 4 : a * a;
  return area * (depth / 1000);
}

export function upliftChainChecks(input: UpliftChainInput): StaticsCheck[] {
  return [sheetLink(input), rafterLink(input), purlinLink(input), postBaseLink(input), foundationLink(input)].filter((c): c is StaticsCheck => !!c);
}

const row = (id: string, element: string, elementDe: string, input: UpliftChainInput, sectionKey: keyof Omit<TimberSpecs, 'strengthClass'>) => ({
  id,
  kind: 'uplift' as const,
  element,
  elementDe,
  section: input.timber[sectionKey],
  loadSls: 0,
  deflectionUtil: 0,
  deflection: 0,
  deflectionLimit: 0,
});

/** 1 – roofing screws into the battens / rafters */
function sheetLink(input: UpliftChainInput): StaticsCheck {
  const { build, q, local, coveringLoad, mat, kmodShort } = input;
  const d = build.roofScrewDiameter;
  const lef = Math.min(build.roofScrewLength - build.sheetProfileHeight - 5, input.sheetSupportDepth);
  const Fk = screwWithdrawal(d, lef, mat.rhok);
  const Rd = (kmodShort * Fk) / GAMMA_M_CONNECTION / 1000;
  const perScrew = (cp: number, n: number) => (GAMMA_Q * -cp * q - GAMMA_G_STR * coveringLoad) / n;
  const Tedge = perScrew(local.edge.up, build.roofScrewsEdge);
  const Tfield = perScrew(local.interior.up, build.roofScrewsField);
  const T = Math.max(Tedge, Tfield, 0);
  const util = Rd > 0 ? T / Rd : T > 0 ? 9.99 : 0;
  const status = statusOf(util);
  return {
    ...row('uplift-sheet', '1 Roof sheet fasteners', 'Dachblech-Befestigung', input, 'rafter'),
    span: build.roofScrewLength,
    loadUls: T,
    stressUtil: util,
    utilisation: util,
    status,
    recommendation:
      Rd <= 0
        ? `The ${fmt(d, 1)} × ${build.roofScrewLength} mm screw keeps only ${Math.round(lef)} mm of thread in the ${input.sheetSupportLabel} (EN 1995-1-1 needs ≥ ${Math.round(6 * d)} mm) – use a longer screw.`
        : status !== 'ok'
          ? `Use more roofing screws in the edge zones (${build.roofScrewsEdge} per m² now) or longer screws.`
          : undefined,
    detail: `Timber-thread roofing screws ${fmt(d, 1)} × ${build.roofScrewLength} mm with EPDM washer into the ${input.sheetSupportLabel}: thread ${Math.round(lef)} mm, R_d = ${kn(Rd)} per screw (EN 1995-1-1 8.7.2). Edge zones c_p,net ${fmt(local.edge.up, 2)}, ${build.roofScrewsEdge} screws/m²: T_d = ${kn(Tedge)}; field ${fmt(local.interior.up, 2)}, ${build.roofScrewsField} screws/m²: T_d = ${kn(Tfield)} (q_p ${fmt(q, 2)} kN/m², sheet 1.0·g ${fmt(coveringLoad, 2)} kN/m²) (${pct(util)}). Pull-through of the sheet per the manufacturer.`,
  };
}

/** 2 – rafter → purlin */
function rafterLink(input: UpliftChainInput): StaticsCheck | undefined {
  const { bearings, rafterSpacing, q, local, deadLoad, build, kmodShort, mat, mode } = input;
  if (bearings.length === 0) return undefined;
  const s = rafterSpacing / 1000;
  // Bearing area: rafter width share × rafter length on the row (inner supports of a continuous rafter × 1.25)
  const tension = (cp: number, b: ChainBearing, width: number) => {
    const area = width * (b.trib / 1000) * (b.inner ? 1.25 : 1);
    return GAMMA_Q * -cp * q * area - GAMMA_G_STR * deadLoad * area;
  };
  // Edge strips: every bearing on an edge row, and the outermost rafter (half a spacing) on the inner rows
  const cases = bearings.flatMap((b) =>
    b.inner
      ? [
          { T: tension(local.edge.up, b, s / 2 + 0.05), label: `${b.label}, outermost rafter in the edge strip`, cp: local.edge.up },
          { T: tension(local.interior.up, b, s), label: `${b.label}, inner rafters`, cp: local.interior.up },
        ]
      : [{ T: tension(local.edge.up, b, s), label: `${b.label}, edge row`, cp: local.edge.up }],
  );
  const worst = cases.reduce((w, c) => (c.T > w.T ? c : w), { T: -Infinity, label: '', cp: local.edge.up });
  const T = Math.max(worst.T, 0);
  let Rd: number;
  let how: string;
  if (mode === 'traditional') {
    const hr = Math.max(input.rafterSeatHeight, 40);
    const embed = Math.min(280 - hr, input.timber.beam.height - 20) - 8;
    Rd = (kmodShort * Math.min(screwWithdrawal(8, hr, mat.rhok), screwWithdrawal(8, embed, mat.rhok))) / GAMMA_M_CONNECTION / 1000;
    how = `1 rafter screw Ø8 × 280 mm (EN 1995-1-1 8.7.2): R_d = ${kn(Rd)}`;
  } else {
    const n = build.rafterAnchorsPerBearing;
    Rd = (n * kmodShort * build.rafterAnchorRk) / GAMMA_M_CONNECTION;
    how = `${n} Sparrenpfettenanker per bearing, R_k = ${fmt(build.rafterAnchorRk, 1)} kN each (ETA): R_d = ${n} × k_mod ${kmodShort} × R_k / 1.3 = ${kn(Rd)}`;
  }
  const util = Rd > 0 ? T / Rd : 9.99;
  const status = statusOf(util);
  return {
    ...row('uplift-rafter', '2 Rafter → purlin', 'Sparren → Pfette', input, 'rafter'),
    span: 0,
    loadUls: T,
    stressUtil: util,
    utilisation: util,
    status,
    recommendation:
      status !== 'ok'
        ? mode === 'traditional'
          ? 'Add a second rafter screw per bearing or a Sparrenpfettenanker.'
          : build.rafterAnchorsPerBearing === 1
            ? 'Use 2 Sparrenpfettenanker per bearing (one each side).'
            : 'Reduce the rafter spacing or use rafter anchors with a higher ETA value.'
        : undefined,
    detail: `Local suction c_p,net ${fmt(worst.cp, 2)} (${worst.label}; rafter spacing ${fmt(s, 2)} m, inner supports × 1.25): T_d = 1.5·W − 1.0·G = ${kn(T)} per bearing. Resistance: ${how} (${pct(util)}).`,
  };
}

/** 3 – purlin → post */
function purlinLink(input: UpliftChainInput): StaticsCheck | undefined {
  const { posts, build, kmodShort, mat, timber } = input;
  if (posts.length === 0) return undefined;
  const worst = posts.reduce((w, p) => (GAMMA_Q * p.uplift - GAMMA_G_STR * p.roofDead > GAMMA_Q * w.uplift - GAMMA_G_STR * w.roofDead ? p : w));
  const T = Math.max(GAMMA_Q * worst.uplift - GAMMA_G_STR * worst.roofDead, 0);
  const hb = timber.beam.height;
  let Rd = 0;
  let how = '';
  let tooShort = false;
  if (build.purlinPostConnector === 'angle-brackets') {
    Rd = (2 * kmodShort * build.angleBracketRk) / GAMMA_M_CONNECTION;
    how = `2 angle brackets 90×90×65, R_k = ${fmt(build.angleBracketRk, 1)} kN each (ETA): R_d = ${kn(Rd)}`;
  } else if (build.purlinPostConnector === 'screws') {
    const lefPost = 300 - hb - 8;
    tooShort = lefPost < 6 * 8;
    const F = tooShort ? 0 : Math.min(screwWithdrawal(8, hb, mat.rhok), screwWithdrawal(8, lefPost, mat.rhok, 0));
    Rd = (kmodShort * 2 ** 0.9 * F) / GAMMA_M_CONNECTION / 1000;
    how = tooShort
      ? `2 fully threaded screws 8 × 300 mm do not reach the post through the ${hb} mm purlin`
      : `2 fully threaded screws 8 × 300 mm from the purlin top, ${lefPost} mm thread in the post end grain (EN 1995-1-1 8.7.2, α = 0°): R_d = ${kn(Rd)}`;
  } else {
    const nailRd = (kmodShort * strapNailCapacity(mat.rhok)) / GAMMA_M_CONNECTION / 1000;
    Rd = Math.min(2 * strapTensionRd(), 2 * STRAP_NAILS_PER_LEG * nailRd);
    how = `Perforated strap (Lochband) 40 × 2 mm over the purlin, ${STRAP_NAILS_PER_LEG} Kammnägel 4.0 × 40 per leg on both post faces: R_d = ${kn(Rd)}`;
  }
  const util = Rd > 0 ? T / Rd : T > 0 ? 9.99 : 0;
  const status = statusOf(util);
  return {
    ...row('uplift-purlin', '3 Purlin → post', 'Pfette → Pfosten', input, 'post'),
    span: 0,
    loadUls: T,
    stressUtil: util,
    utilisation: util,
    status,
    recommendation: status !== 'ok' ? (tooShort ? 'Use longer screws (purlin height + ≥ 100 mm) or angle brackets / a perforated strap.' : 'Choose a stronger purlin–post connector (angle brackets / perforated strap) or add one each side.') : undefined,
    detail: `${worst.label}: suction 1.5·W = ${kn(GAMMA_Q * worst.uplift)} vs. roof + purlin 1.0·G = ${kn(worst.roofDead)} → T_d = ${kn(T)} per joint. Resistance: ${how} (${pct(util)}).`,
  };
}

/** 4 – post → H anchor */
function postBaseLink(input: UpliftChainInput): StaticsCheck | undefined {
  const { posts, postBase, mat, timber, kmodShort } = input;
  if (posts.length === 0) return undefined;
  const net = (p: ChainPost) => GAMMA_Q * p.uplift - GAMMA_G_STR * (p.roofDead + p.postDead);
  const worst = posts.reduce((w, p) => (net(p) > net(w) ? p : w));
  const T = Math.max(net(worst), 0);
  const Rd = postBaseTensionRd(postBase, mat, Math.min(timber.post.width, timber.post.height), kmodShort);
  const hAnchor = isHAnchor(postBase);
  const util = hAnchor ? T / Rd : T > 0 ? 1 : 0;
  const status: StaticsStatus = hAnchor ? statusOf(util) : T > 0 ? 'warning' : 'ok';
  return {
    ...row('uplift-post', '4 Post → post base', 'Pfosten → Pfostenanker', input, 'post'),
    span: 0,
    loadUls: T,
    stressUtil: util,
    utilisation: util,
    status,
    recommendation: !hAnchor && T > 0 ? `Check the adjustable post base and its anchor for ${kn(T)} tension per its ETA – or use cast-in H post bases.` : status !== 'ok' ? 'Use a reinforced H post base with more bolts, or add weight / knee braces.' : undefined,
    detail: `${worst.label}: 1.5·W = ${kn(GAMMA_Q * worst.uplift)} vs. 1.0·G = ${kn(worst.roofDead + worst.postDead)} (roof, purlin, post) → T_d = ${kn(T)}. ${hAnchor ? `Resistance: 2 × M12 bolts in double shear through the post (EN 1995-1-1 8.2.3, load parallel to the grain): R_d = ${kn(Rd)} (${pct(util)}).` : 'Adjustable post base: resistance only from its ETA – not verified here.'}`,
  };
}

/** 5 – anchor → foundation (EQU, no soil) */
function foundationLink(input: UpliftChainInput): StaticsCheck | undefined {
  const { posts, build, footingDepth, footingSize } = input;
  if (posts.length === 0) return undefined;
  const Gf = footingDepth > 0 && footingSize > 0 ? CONCRETE_WEIGHT * footingVolumeM3(build, footingSize, footingDepth) : 0;
  const ratio = (p: ChainPost) => (GAMMA_Q * p.uplift) / Math.max(GAMMA_G_EQU * (p.roofDead + p.postDead + Gf), 1e-9);
  const worst = posts.reduce((w, p) => (ratio(p) > ratio(w) ? p : w));
  const util = ratio(worst);
  // an H anchor is cast 400 mm deep: the foundation must be deep enough to take it
  const tooShallow = isHAnchor(input.postBase) && footingDepth < H_ANCHOR_MIN_FOOTING;
  const status: StaticsStatus = tooShallow ? 'fail' : statusOf(util);
  const shape = build.footingShape === 'round' ? `Ø${Math.round(footingSize)}` : `${Math.round(footingSize)} × ${Math.round(footingSize)}`;
  // Smallest square footing (50 mm steps) at the same depth that holds the post down
  const needed = (() => {
    if (util <= OK_LIMIT || footingDepth <= 0) return undefined;
    for (let a = Math.max(300, Math.ceil(footingSize / 50) * 50); a <= 1500; a += 50) {
      const g = CONCRETE_WEIGHT * footingVolumeM3({ footingShape: 'square' }, a, footingDepth);
      if ((GAMMA_Q * worst.uplift) / (GAMMA_G_EQU * (worst.roofDead + worst.postDead + g)) <= OK_LIMIT) return a;
    }
    return undefined;
  })();
  return {
    ...row('uplift-foundation', '5 Post base → foundation', 'Pfostenanker → Fundament', input, 'post'),
    span: Math.round(footingDepth),
    loadUls: GAMMA_Q * worst.uplift,
    stressUtil: util,
    utilisation: util,
    status,
    recommendation: tooShallow
      ? `The H post anchor is cast ${H_ANCHOR.concreteEmbed} mm into the concrete – found at least ${H_ANCHOR_MIN_FOOTING} mm deep.`
      : status !== 'ok'
        ? needed
          ? `Enlarge the foundations to ${needed} × ${needed} × ${Math.round(footingDepth)} mm.`
          : 'Deepen the foundations or tie the posts into a strip foundation.'
        : undefined,
    detail: `${worst.label}: uplift 1.5·W = ${kn(GAMMA_Q * worst.uplift)} vs. 0.9·G = 0.9 × (roof + purlin ${kn(worst.roofDead)} + post ${kn(worst.postDead)} + concrete ${shape} × ${Math.round(footingDepth)} mm ${kn(Gf)}) = ${kn(GAMMA_G_EQU * (worst.roofDead + worst.postDead + Gf))} (${pct(util)}). Soil weight and skin friction are not counted.`,
  };
}
