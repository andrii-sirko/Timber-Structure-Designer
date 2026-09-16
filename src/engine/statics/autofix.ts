import type { ProjectState, StaticsCheck, StaticsResult, StaticsStatus, StructureParams, TimberSection } from '@/types';
import { buildFramingCanonical, canonicalProject } from '../framing';
import { BRACE_SECTIONS, computeStatics, STANDARD_DEPTHS } from './index';
import { findSmallestValidSection, findSmallestValidSquareSize } from './costOptimizationHelpers';

/**
 * Automatic resolution of statics warnings / failures by stepping the governing
 * parameters up the standard size ladders – the same moves the check
 * recommendations suggest, applied until every check is "ok" or no lever is left.
 *
 * Levers, in order of preference per element:
 *  - Rafter:  deeper rafter section → closer rafter spacing
 *  - Purlin:  deeper purlin section → more posts (postsPerRow + 1 / smaller max spacing)
 *  - Post:    larger square post   → more posts
 *  - Header:  deeper wall studs (the header width equals the wall depth)
 *  - Bracing: enable knee braces → bigger brace section → braces on both sides → more posts
 *             (a direction without purlin rows can only be helped by bigger posts / more posts)
 *  - Uplift:  no lever – anchors are a hardware choice, reported as unresolved
 */

const POST_SIZES = [100, 120, 140, 160, 180, 200, 220, 240];
const STUD_DEPTHS = [100, 120, 140, 160, 180, 200];
const RAFTER_SPACINGS = [1250, 1000, 800, 625, 500, 400, 300];
const RAFTER_LENGTHS = [13000, 12000, 10000, 8000, 7000, 6000, 5000, 4500, 4000, 3500, 3000];
/** Joist span (bearer spacing) and pad / foundation spacing ladder of the timber floor */
const FLOOR_SPACINGS = [2500, 2000, 1750, 1500, 1250, 1000, 800, 600];
const MIN_POST_SPACING = 1000;
const POST_SPACING_STEP = 500;
const MAX_ITERATIONS = 60;

export interface AutoFixChange {
  label: string;
  before: string;
  after: string;
}

export type StaticsAction = 'auto-fix' | 'cost-optimization';

export interface StaticsActionResult {
  params: StructureParams;
  changes: AutoFixChange[];
  /** Overall statics status after applying all changes */
  status: StaticsStatus;
  /** Checks that could not be brought to "ok" because every lever was exhausted */
  unresolved: string[];
  action: StaticsAction;
}

export interface AutoFixResult extends StaticsActionResult {
  action: 'auto-fix';
}

export interface CostOptimizationResult extends StaticsActionResult {
  action: 'cost-optimization';
}

function nextUp(ladder: number[], value: number): number | undefined {
  return ladder.find((v) => v > value);
}

function nextDown(ladder: number[], value: number): number | undefined {
  return [...ladder].reverse().find((v) => v < value);
}

/** Statics of a world project, evaluated in the canonical frame. */
function staticsOf(project: ProjectState): StaticsResult {
  const canonical = canonicalProject(project);
  return computeStatics(canonical, buildFramingCanonical(canonical));
}

function evaluate(project: ProjectState): StaticsCheck[] {
  return staticsOf(project).checks;
}

/** Adds posts to every purlin row; returns the new params or undefined when no more posts fit. */
function addPosts(params: StructureParams): StructureParams | undefined {
  if (params.postsPerRow !== null) {
    if (params.postsPerRow >= 20) return undefined;
    return { ...params, postsPerRow: params.postsPerRow + 1 };
  }
  if (params.maxPostSpacing <= MIN_POST_SPACING) return undefined;
  return { ...params, maxPostSpacing: Math.max(MIN_POST_SPACING, params.maxPostSpacing - POST_SPACING_STEP) };
}

function applyFix(params: StructureParams, check: StaticsCheck): StructureParams | undefined {
  const { timber } = params;
  if (check.id === 'rafter') {
    const deeper = nextUp(STANDARD_DEPTHS, timber.rafter.height);
    if (deeper) return { ...params, timber: { ...timber, rafter: { ...timber.rafter, height: deeper } } };
    const closer = nextDown(RAFTER_SPACINGS, params.maxRafterSpacing);
    if (closer) return { ...params, maxRafterSpacing: closer };
    // last resort: a shorter max rafter length adds an intermediate purlin row
    const shorter = nextDown(RAFTER_LENGTHS, params.maxRafterLength);
    return shorter ? { ...params, maxRafterLength: shorter } : undefined;
  }
  if (check.id.startsWith('purlin')) {
    const deeper = nextUp(STANDARD_DEPTHS, timber.beam.height);
    if (deeper) return { ...params, timber: { ...timber, beam: { ...timber.beam, height: deeper } } };
    return addPosts(params);
  }
  if (check.id.startsWith('post')) {
    const bigger = nextUp(POST_SIZES, Math.min(timber.post.width, timber.post.height));
    if (bigger) return { ...params, timber: { ...timber, post: { width: bigger, height: bigger } } };
    return addPosts(params);
  }
  if (check.id === 'floor-joist' || check.id === 'floor-bearer') {
    const floor = params.floor;
    const key = check.id === 'floor-joist' ? 'joist' : 'bearer';
    const deeper = nextUp(STANDARD_DEPTHS, floor[key].height);
    if (deeper) return { ...params, floor: { ...floor, [key]: { ...floor[key], height: deeper } } };
    if (key === 'joist' && floor.support === 'bearers') {
      const closer = nextDown(FLOOR_SPACINGS, floor.maxBearerSpacing);
      return closer ? { ...params, floor: { ...floor, maxBearerSpacing: closer } } : undefined;
    }
    const closer = nextDown(FLOOR_SPACINGS, floor.maxSupportSpacing);
    return closer ? { ...params, floor: { ...floor, maxSupportSpacing: closer } } : undefined;
  }
  if (check.id.startsWith('header')) {
    const deeper = nextUp(STUD_DEPTHS, timber.stud.height);
    return deeper ? { ...params, timber: { ...timber, stud: { ...timber.stud, height: deeper } } } : undefined;
  }
  if (check.id.startsWith('bracing')) {
    if (check.element.startsWith('Knee braces')) {
      const area = timber.brace.width * timber.brace.height;
      const bigger = BRACE_SECTIONS.find((s) => s.width * s.height > area);
      if (bigger) return { ...params, timber: { ...timber, brace: bigger } };
      if (params.braceDirection !== 'both') return { ...params, braceDirection: 'both' };
      return addPosts(params);
    }
    // sway posts: knee braces act only in the purlin-row direction
    if (!params.braces && check.element.includes(params.roofScheme === 'sloped-purlins' ? '(Z)' : '(X)')) return { ...params, braces: true };
    const bigger = nextUp(POST_SIZES, Math.min(timber.post.width, timber.post.height));
    if (bigger) return { ...params, timber: { ...timber, post: { width: bigger, height: bigger } } };
    return addPosts(params);
  }
  return undefined;
}

const sec = (s: { width: number; height: number }): string => `${s.width}×${s.height} mm`;

function diffParams(before: StructureParams, after: StructureParams): AutoFixChange[] {
  const changes: AutoFixChange[] = [];
  const push = (label: string, a: string, b: string) => {
    if (a !== b) changes.push({ label, before: a, after: b });
  };
  push('Rafters (Sparren)', sec(before.timber.rafter), sec(after.timber.rafter));
  push('Purlins (Pfetten)', sec(before.timber.beam), sec(after.timber.beam));
  push('Posts (Pfosten)', sec(before.timber.post), sec(after.timber.post));
  push('Wall studs (Ständer)', sec(before.timber.stud), sec(after.timber.stud));
  push('Knee braces (Kopfbänder)', sec(before.timber.brace), sec(after.timber.brace));
  push('Knee braces enabled', before.braces ? 'yes' : 'no', after.braces ? 'yes' : 'no');
  push('Brace direction', before.braceDirection, after.braceDirection);
  push('Max rafter spacing', `${before.maxRafterSpacing} mm`, `${after.maxRafterSpacing} mm`);
  push('Max rafter length', `${before.maxRafterLength} mm`, `${after.maxRafterLength} mm`);
  push('Max post spacing', `${before.maxPostSpacing} mm`, `${after.maxPostSpacing} mm`);
  push('Posts per row', String(before.postsPerRow ?? 'auto'), String(after.postsPerRow ?? 'auto'));
  push('Floor joists (Fußbodenbalken)', sec(before.floor.joist), sec(after.floor.joist));
  push('Floor bearers (Unterzüge)', sec(before.floor.bearer), sec(after.floor.bearer));
  push('Max floor bearer spacing', `${before.floor.maxBearerSpacing} mm`, `${after.floor.maxBearerSpacing} mm`);
  push('Max floor support spacing', `${before.floor.maxSupportSpacing} mm`, `${after.floor.maxSupportSpacing} mm`);
  return changes;
}

/** Overall status ignoring the uplift advisory (anchors are hardware, not a section choice). */
function structuralStatus(statics: StaticsResult): StaticsStatus {
  const s = statics.checks.filter((c) => c.kind !== 'uplift').map((c) => c.status);
  return s.includes('fail') ? 'fail' : s.includes('warning') ? 'warning' : 'ok';
}

function isStaticsOk(project: ProjectState, params: StructureParams): boolean {
  return structuralStatus(staticsOf({ ...project, params })) === 'ok';
}

function replaceSection(params: StructureParams, key: 'rafter' | 'beam' | 'stud', section: TimberSection): StructureParams {
  return { ...params, timber: { ...params.timber, [key]: section } };
}

function replacePost(params: StructureParams, section: TimberSection): StructureParams {
  return { ...params, timber: { ...params.timber, post: section } };
}

function finalResult<T extends StaticsAction>(project: ProjectState, params: StructureParams, action: T): Omit<StaticsActionResult, 'action'> & { action: T } {
  const finalStatics = staticsOf({ ...project, params });
  return {
    params,
    changes: diffParams(project.params, params),
    status: structuralStatus(finalStatics),
    unresolved: finalStatics.checks.filter((c) => c.status !== 'ok' && c.kind !== 'uplift').map((c) => c.element),
    action,
  };
}

const COST_OPTIMIZATION_PASSES = 8;

/** Reduce standard section depths while keeping the current structure and layout unchanged. */
export function costOptimizeStatics(project: ProjectState): CostOptimizationResult {
  let params = project.params;

  // Cost optimization is only safe when the starting structure already passes.
  if (!isStaticsOk(project, params)) return finalResult(project, params, 'cost-optimization');

  for (let pass = 0; pass < COST_OPTIMIZATION_PASSES; pass++) {
    let changed = false;

    for (const key of ['rafter', 'beam', 'stud'] as const) {
      const current = params.timber[key];
      const smaller = findSmallestValidSection(current, STANDARD_DEPTHS, (section) => isStaticsOk(project, replaceSection(params, key, section)));
      if (smaller.height !== current.height) {
        params = replaceSection(params, key, smaller);
        changed = true;
      }
    }

    if (params.floor.enabled) {
      for (const key of params.floor.support === 'bearers' ? (['joist', 'bearer'] as const) : (['joist'] as const)) {
        const current = params.floor[key];
        const withSection = (p: StructureParams, section: TimberSection): StructureParams => ({ ...p, floor: { ...p.floor, [key]: section } });
        const smaller = findSmallestValidSection(current, STANDARD_DEPTHS, (section) => isStaticsOk(project, withSection(params, section)));
        if (smaller.height !== current.height) {
          params = withSection(params, smaller);
          changed = true;
        }
      }
    }

    const currentPost = params.timber.post;
    const smallerPost = findSmallestValidSquareSize(currentPost, POST_SIZES, (section) => isStaticsOk(project, replacePost(params, section)));
    if (smallerPost.width < currentPost.width && smallerPost.height < currentPost.height) {
      params = replacePost(params, smallerPost);
      changed = true;
    }

    if (!changed) break;
  }

  return finalResult(project, params, 'cost-optimization');
}

export function autoFixStatics(project: ProjectState): AutoFixResult {
  let params = project.params;
  const exhausted = new Set<string>();

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const checks = evaluate({ ...project, params });
    const pending = checks
      .filter((c) => c.status !== 'ok' && c.kind !== 'uplift' && !exhausted.has(c.id))
      .sort((a, b) => b.utilisation - a.utilisation);
    if (pending.length === 0) break;

    const target = pending[0];
    const next = applyFix(params, target);
    if (!next) {
      exhausted.add(target.id);
      continue;
    }
    params = next;
  }

  return finalResult(project, params, 'auto-fix');
}
