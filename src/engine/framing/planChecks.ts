import type { FramingWarning, Member, ProjectState, RoofGeometry } from '@/types';
import { isStockSection } from '../build';

const round5Up = (mm: number): number => Math.ceil(mm / 5) * 5;
const round5Down = (mm: number): number => Math.floor(mm / 5) * 5;
const m2 = (v: number): string => v.toFixed(1);
const m = (mm: number): string => (mm / 1000).toFixed(2);

/**
 * Planning checks that are not statics: roof slope for the sheeting, sheet length, the BGF
 * threshold for procedure-free buildings, wall anchors in loose paving, the project name against
 * the plan and timber sections the yard does not sell. `project` is canonical.
 */
export function planWarnings(project: ProjectState, members: Member[], roof: RoofGeometry, sheetRunLength: number): FramingWarning[] {
  const out: FramingWarning[] = [];
  const p = project.params;
  const b = p.build;
  const pw = p.timber.post.width;

  // ── Slope: actual pitch from the eave heights and the post spacing ──
  const run = Math.max(p.width - pw, 1);
  const needed = b.minSlope + b.slopeTolerance;
  if (roof.pitchDeg < needed - 1e-6) {
    const rise = Math.tan((needed * Math.PI) / 180) * run;
    const h1 = round5Up(p.rearHeight + rise);
    const h2 = round5Down(p.frontHeight - rise);
    out.push({
      level: 'warning',
      message: `Roof pitch ${roof.pitchDeg.toFixed(2)}° is below the minimum ${b.minSlope.toFixed(1)}° + ${b.slopeTolerance.toFixed(1)}° tolerance for the sheet: raise H1 to ${h1} mm (H2 ${p.rearHeight} mm) or lower H2 to ${h2} mm (H1 ${p.frontHeight} mm).`,
    });
  }

  // ── Roof sheets: one piece per run along the fall line, no cross joint ──
  if (p.loads.roofCovering === 'trapezoidal-sheet' && sheetRunLength > b.maxSheetLength) {
    out.push({
      level: 'warning',
      message: `Roof sheet run ${Math.round(sheetRunLength)} mm is longer than the longest sheet available (${b.maxSheetLength} mm) – a cross joint (Querstoß) would be needed; shorten the roof along the slope or order longer sheets.`,
    });
  }

  // ── Gross floor area (BGF) against the threshold for procedure-free buildings ──
  const o = p.overhangs;
  const L = p.length;
  const W = p.width;
  const Lr = L + o.left + o.right;
  const Wr = W + o.front + o.rear;
  const byPosts = (L * W) / 1e6;
  const byRoof = (Lr * Wr) / 1e6;
  const limit = b.bgfLimit;
  if (byPosts > limit || byRoof > limit) {
    const worst = Math.max(byPosts, byRoof);
    const [a, c] = byRoof >= byPosts ? [Lr, Wr] : [L, W];
    const cutA = round5Up(a - (limit * 1e6) / c);
    const cutC = round5Up(c - (limit * 1e6) / a);
    out.push({
      level: 'warning',
      message: `Gross floor area ${m2(byPosts)} m² by the post outline, ${m2(byRoof)} m² by the roof projection – over the ${m2(limit)} m² threshold for procedure-free carports and outbuildings (BbgBO §61). To get under it shorten the ${m(a)} m side by ${cutA} mm or the ${m(c)} m side by ${cutC} mm (${m2(worst)} m² now). Dimensions are not changed automatically.`,
    });
  }

  // ── Wall anchors in loose paving ──
  const closed = Object.values(project.walls).some((w) => w.closed);
  if (closed && (b.wallBase === 'spacers' || (b.wallBase === 'slab' && project.pavedAreas.length > 0))) {
    out.push({
      level: 'warning',
      message: 'Concrete screws or frame anchors into loose paving stones give no tension capacity – anchor the bottom plates into a concrete strip or the post foundations, or hang the studs from the rail and hold their feet sideways only (wall base "hung").',
    });
  }

  // ── Name against the plan ──
  const named = /(\d+(?:[.,]\d+)?)\s*[×x]\s*(\d+(?:[.,]\d+)?)\s*m\b/.exec(project.name);
  if (named) {
    const a = Number(named[1].replace(',', '.'));
    const c = Number(named[2].replace(',', '.'));
    const dims = [L / 1000, W / 1000].sort((x, y) => y - x);
    const said = [a, c].sort((x, y) => y - x);
    if (Math.abs(dims[0] - said[0]) > 0.8 || Math.abs(dims[1] - said[1]) > 0.8) {
      out.push({ level: 'info', message: `The project name says ${named[0]} but the plan is ${(dims[0]).toFixed(2)} × ${(dims[1]).toFixed(2)} m – rename it so the documents match.` });
    }
  }

  // ── Sections the yard does not sell ──
  const seen = new Set<string>();
  for (const mem of members) {
    const key = `${mem.group}|${mem.section.width}×${mem.section.height}`;
    if (seen.has(key)) continue;
    seen.add(key);
    // glulam (BSH) deeper than 240 mm is made to order, not stock KVH; headers are cut to their computed depth
    if (Math.max(mem.section.width, mem.section.height) > 240 || mem.category === 'header') continue;
    if (!isStockSection(mem.section, b.stockSections)) {
      out.push({ level: 'warning', message: `${mem.group.split(' (')[0]} ${mem.section.width}×${mem.section.height} mm is not a stock section of the timber yard – choose one from the section list.` });
    }
  }
  return out;
}
