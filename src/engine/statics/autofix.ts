import type { ProjectState, StaticsCheck, StaticsStatus, StructureParams, TimberSection } from '@/types';
import { buildFraming } from '../framing';
import { computeStatics, STANDARD_DEPTHS } from './index';
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
 */

const POST_SIZES = [100, 120, 140, 160, 180, 200, 220, 240];
const STUD_DEPTHS = [100, 120, 140, 160, 180, 200];
const RAFTER_SPACINGS = [1250, 1000, 800, 625, 500, 400, 300];
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

function evaluate(project: ProjectState): StaticsCheck[] {
  return computeStatics(project, buildFraming(project)).checks;
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
    return closer ? { ...params, maxRafterSpacing: closer } : undefined;
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
  if (check.id.startsWith('header')) {
    const deeper = nextUp(STUD_DEPTHS, timber.stud.height);
    return deeper ? { ...params, timber: { ...timber, stud: { ...timber.stud, height: deeper } } } : undefined;
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
  push('Max rafter spacing', `${before.maxRafterSpacing} mm`, `${after.maxRafterSpacing} mm`);
  push('Max post spacing', `${before.maxPostSpacing} mm`, `${after.maxPostSpacing} mm`);
  push('Posts per row', String(before.postsPerRow ?? 'auto'), String(after.postsPerRow ?? 'auto'));
  return changes;
}

function isStaticsOk(project: ProjectState, params: StructureParams): boolean {
  return computeStatics({ ...project, params }, buildFraming({ ...project, params })).status === 'ok';
}

function replaceSection(params: StructureParams, key: 'rafter' | 'beam' | 'stud', section: TimberSection): StructureParams {
  return { ...params, timber: { ...params.timber, [key]: section } };
}

function replacePost(params: StructureParams, section: TimberSection): StructureParams {
  return { ...params, timber: { ...params.timber, post: section } };
}

function finalResult<T extends StaticsAction>(project: ProjectState, params: StructureParams, action: T): Omit<StaticsActionResult, 'action'> & { action: T } {
  const finalStatics = computeStatics({ ...project, params }, buildFraming({ ...project, params }));
  return {
    params,
    changes: diffParams(project.params, params),
    status: finalStatics.status,
    unresolved: finalStatics.checks.filter((c) => c.status !== 'ok').map((c) => c.element),
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
      .filter((c) => c.status !== 'ok' && !exhausted.has(c.id))
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

  const finalStatics = computeStatics({ ...project, params }, buildFraming({ ...project, params }));
  return {
    params,
    changes: diffParams(project.params, params),
    status: finalStatics.status,
    unresolved: finalStatics.checks.filter((c) => c.status !== 'ok').map((c) => c.element),
    action: 'auto-fix',
  };
}
