import type { Member, ProjectState, StaticsCheck, StaticsStatus, TimberSection, WallId } from '@/types';
import { WALL_IDS } from '@/types';
import { resolveCladding, resolveScreenCladding } from '../framing/cladding';
import { wallExtent, wallParts } from '../framing/wallFrame';
import type { MaterialProps } from './materials';

/**
 * Wall studs and screen battens under wind: simply supported vertical members spanning their own
 * length, loaded by the wind pressure on their share of the wall (c_p × q_p × spacing). The strong
 * axis faces the wind. Bending with k_mod for short-term actions, deflection w_inst ≤ L / limit.
 * Closed boarding takes the net wall coefficient (default 1.3: free-standing wall / corner zone of
 * a closed building); boards with gaps and slat screens the porous-screen coefficient.
 */

const GAMMA_Q = 1.5;
const OK_LIMIT = 0.85;
/** Sections tried for studs / battens: width along the wall × depth in the wind direction */
export const STUD_CANDIDATES: TimberSection[] = [
  { width: 40, height: 60 },
  { width: 60, height: 60 },
  { width: 60, height: 80 },
  { width: 80, height: 80 },
];

const fmt = (v: number, d = 1): string => v.toFixed(d);
const pct = (v: number): string => `${Math.round(v * 100)} %`;
const statusOf = (util: number): StaticsStatus => (util > 1 ? 'fail' : util > OK_LIMIT ? 'warning' : 'ok');

interface MemberResult {
  util: number;
  stressUtil: number;
  deflection: number;
  limit: number;
  sigma: number;
  fmd: number;
}

/** Bending + deflection of a simply supported member b × h (h in the wind direction), L mm, w kN/m characteristic. */
function windBeam(section: TimberSection, L: number, w: number, mat: MaterialProps, kmodShort: number, limitRatio: number): MemberResult {
  const { width: b, height: h } = section;
  const W = (b * h * h) / 6;
  const I = (b * h ** 3) / 12;
  const Md = (GAMMA_Q * w * L * L) / 8; // N·mm (w in N/mm)
  const sigma = Md / W;
  const fmd = (kmodShort * mat.fmk) / mat.gammaM;
  const deflection = (5 * w * L ** 4) / (384 * mat.e0mean * I);
  const limit = L / limitRatio;
  const stressUtil = sigma / fmd;
  return { util: Math.max(stressUtil, deflection / limit), stressUtil, deflection, limit, sigma, fmd };
}

/** Position of a vertical member along its wall (canonical: front / rear along X, sides along Z). */
const alongWall = (id: WallId, m: Member): number => (id === 'front' || id === 'rear' ? m.start.x : m.start.z);

export function studWindChecks(project: ProjectState, members: Member[], q: number, mat: MaterialProps, kmodShort: number): StaticsCheck[] {
  const { params } = project;
  const build = params.build;
  const checks: StaticsCheck[] = [];
  // every wall part on its own: a closed wall, an open wall's slat screen, the screen beside a partly closed wall
  const parts = WALL_IDS.flatMap((id) => wallParts(project.walls[id], id === 'front' || id === 'rear' ? params.length : params.width).map((wall) => ({ id, wall, beside: wall !== project.walls[id] })));
  for (const { id, wall, beside } of parts) {
    const screen = !wall.closed && Boolean(wall.screen);
    if (!wall.closed && !screen) continue;
    const verticals = members.filter((m) => m.wallId === id && (screen ? m.category === 'batten' && m.group.startsWith('Screen batten') : m.category === 'stud') && m.direction.y > 0.9);
    const tall = verticals.filter((m) => m.length >= 1000);
    if (tall.length === 0) continue;
    // supports along the wall: the studs / battens and the posts standing in the wall
    const pw = params.timber.post.width;
    const line = id === 'front' ? pw / 2 : id === 'rear' ? params.width - pw / 2 : id === 'left' ? pw / 2 : params.length - pw / 2;
    const across = (m: Member) => (id === 'front' || id === 'rear' ? m.start.z : m.start.x);
    const posts = members.filter((m) => m.category === 'post' && Math.abs(across(m) - line) < pw);
    const ext = wallExtent(wall, id === 'front' || id === 'rear' ? params.length : params.width);
    const us = [...new Set([...verticals, ...posts].map((m) => Math.round(alongWall(id, m))))]
      .filter((u) => u >= ext.start - pw && u <= ext.end + pw)
      .sort((a, b) => a - b);
    const openings = wall.openings.map((o) => [o.x, o.x + o.width] as const);
    let spacing = 0;
    for (let i = 1; i < us.length; i++) {
      const gap = us[i] - us[i - 1];
      if (openings.some(([a, b]) => a > us[i - 1] && b < us[i])) continue; // the jambs carry the opening
      spacing = Math.max(spacing, gap);
    }
    if (spacing <= 0) continue;
    const L = Math.max(...tall.map((m) => m.length));
    const cladding = screen ? resolveScreenCladding(wall.cladding) : resolveCladding(wall.cladding);
    const porous = screen || cladding.gap > 0;
    const cp = porous ? build.screenCp : build.wallCp;
    const w = (cp * q * spacing) / 1000; // kN/m = N/mm
    const current: TimberSection = screen ? build.screenBatten : { width: params.timber.stud.width, height: params.timber.stud.height };
    const res = windBeam(current, L, w, mat, kmodShort, build.studDeflectionLimit);
    const status = statusOf(res.util);
    const passing = STUD_CANDIDATES.find((c) => windBeam(c, L, w, mat, kmodShort, build.studDeflectionLimit).util <= OK_LIMIT);
    // widest spacing (50 mm steps) at which the current section still passes
    let maxSpacing = 0;
    for (let s = 200; s <= 3000; s += 50) {
      if (windBeam(current, L, (cp * q * s) / 1000, mat, kmodShort, build.studDeflectionLimit).util <= OK_LIMIT) maxSpacing = s;
    }
    const what = screen ? 'Screen battens' : 'Wall studs';
    const whatDe = screen ? 'Traglatten im Wind' : 'Ständer im Wind';
    const sec = (s: TimberSection) => `${s.width}×${s.height} mm (${s.height} in the wind direction)`;
    const recommendation =
      status === 'ok'
        ? undefined
        : [passing ? `Use ${sec(passing)}` : 'Use a larger section than 80×80 mm', maxSpacing >= 200 ? `or reduce the spacing to ≤ ${maxSpacing} mm` : ''].filter(Boolean).join(' ') + '.';
    checks.push({
      id: beside ? `studs-${id}-screen` : `studs-${id}`,
      kind: 'lateral',
      element: `${what} in wind (${id})`,
      elementDe: whatDe,
      section: current,
      span: Math.round(L),
      loadUls: GAMMA_Q * w,
      loadSls: w,
      stressUtil: res.stressUtil,
      deflectionUtil: res.deflection / res.limit,
      deflection: res.deflection,
      deflectionLimit: res.limit,
      utilisation: res.util,
      status,
      recommendation,
      detail: `${what} ${sec(current)}, simply supported over ${fmt(L / 1000, 2)} m, spacing ${Math.round(spacing)} mm: w = c_p ${fmt(cp, 2)}${porous ? ' (porous)' : ' (closed boarding)'} × q_p ${fmt(q, 2)} kN/m² × ${fmt(spacing / 1000, 2)} m = ${fmt(w, 2)} kN/m. Bending: σ_m,d = ${fmt(res.sigma, 1)} ≤ f_m,d = ${fmt(res.fmd, 1)} N/mm² (${pct(res.stressUtil)}), w_inst = ${fmt(res.deflection, 1)} mm ≤ L/${build.studDeflectionLimit} = ${fmt(res.limit, 1)} mm. Smallest passing section of 40×60 / 60×60 / 60×80 / 80×80: ${passing ? `${passing.width}×${passing.height}` : 'none'}; the current section passes up to ${maxSpacing >= 200 ? `${maxSpacing} mm` : 'no'} spacing.`,
    });
  }
  return checks;
}
