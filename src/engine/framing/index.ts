import type { FramingResult, FramingWarning, Member, OpeningHost, Panel, ProjectState, StructureParams, Wall, WallId } from '@/types';
import { isOuterWall, WALL_IDS } from '@/types';
import { resetIds } from '../geometry';
import { generateRoof } from './roof';
import { computeRoofLines } from './roofLines';
import { computePostGrid, generateBraces, generatePosts, generatePurlins } from './structure';
import { clampPartition } from './partitions';
import { computePartitionFrame, computeWallFrame, wallFrameToWorld, type WallFrame } from './wallFrame';
import { generateWallFraming } from './walls';
import { generateFreePosts } from '../freePosts';
import { canonicalizeProject, canonicalToWorldMap, canonicalWall, framingToWorld, partitionFlipped, relabelFraming, wallFlipped } from '../orientation';

export { computeRoofLines } from './roofLines';
export { computePostGrid, gridPostCount, rowPoint, rowPostTop } from './structure';
export { computeWallFrame, computePartitionFrame, wallBays, PARTITION_TOP_GAP } from './wallFrame';
export { clampPartition, defaultPartition, partitionLimits, MIN_PARTITION_LENGTH } from './partitions';
export type { WallFrame, WallBay } from './wallFrame';
export { clampOpening, openingLimits, headerHeight, OPENING_DEFAULTS, MIN_OPENING_SIZE } from './openings';
export { CLADDING_THICKNESS } from './walls';

/** Guard against geometrically impossible input without mutating the store. */
/** Smallest plan dimension (mm) the post grid can still frame: two posts plus a bay. */
export const MIN_PLAN_DIM = 500;

/** Smallest eave height (mm): the purlin plus a usable post stub. No upper limit – any size is allowed. */
export function minWallHeight(params: StructureParams): number {
  return params.timber.beam.height + 300;
}

export function sanitizeParams(params: StructureParams): StructureParams {
  const rear = Math.min(params.rearHeight, params.frontHeight);
  const minHeight = minWallHeight(params);
  return {
    ...params,
    length: Math.max(params.length, MIN_PLAN_DIM),
    width: Math.max(params.width, MIN_PLAN_DIM),
    frontHeight: Math.max(params.frontHeight, minHeight),
    rearHeight: Math.max(rear, minHeight),
  };
}

/** Frames of the four outer walls plus every partition, keyed by WallId / partition id. */
export type WallFrames = Record<string, WallFrame>;

/** The project with sanitized params, rotated into the canonical (engine) frame. */
export function canonicalProject(project: ProjectState): ProjectState {
  return canonicalizeProject({ ...project, params: sanitizeParams(project.params) });
}

/** Wall frames in the canonical frame, keyed by canonical wall id. */
function computeCanonicalWallFrames(canonical: ProjectState): WallFrames {
  const params = canonical.params;
  const roof = computeRoofLines(params);
  const grid = computePostGrid(params, canonical.postOverrides, roof);
  const frames: WallFrames = {};
  for (const id of WALL_IDS) frames[id] = computeWallFrame(id, params, canonical.walls[id], roof, grid);
  for (const p of canonical.partitions) frames[p.id] = computePartitionFrame(clampPartition(p, params), params, roof);
  return frames;
}

/** Wall frames in WORLD space, keyed by world wall id / partition id (u runs from each wall's world start corner). */
export function computeAllWallFrames(project: ProjectState): WallFrames {
  const params = sanitizeParams(project.params);
  const dir = params.roofDirection;
  const canonical = canonicalProject(project);
  const cFrames = computeCanonicalWallFrames(canonical);
  if (dir === 'rear') return cFrames;
  const m = canonicalToWorldMap(dir, params.length, params.width);
  const frames: WallFrames = {};
  for (const id of WALL_IDS) {
    frames[id] = wallFrameToWorld(cFrames[canonicalWall(dir, id)], m, wallFlipped(dir, id), { id, wallId: id, label: id });
  }
  for (const p of project.partitions) {
    const f = cFrames[p.id];
    frames[p.id] = wallFrameToWorld(f, m, partitionFlipped(dir, p), { id: p.id, partitionId: p.id, label: f.label });
  }
  return frames;
}

/** Framing in WORLD space for a world project (canonical build, rotated and relabelled). */
export function buildFraming(project: ProjectState): FramingResult {
  const params = sanitizeParams(project.params);
  return relabelFraming(framingToWorld(buildFramingCanonical(canonicalProject(project)), params), params.roofDirection);
}

/** The outer wall or partition addressed by `key`, as an opening host. */
export function openingHost(project: ProjectState, key: string): OpeningHost | null {
  if (isOuterWall(key)) return project.walls[key];
  const p = project.partitions.find((x) => x.id === key);
  return p ? { closed: true, openings: p.openings } : null;
}

/**
 * Framing in the CANONICAL frame. `project` must already be canonical (see `canonicalProject`);
 * the roof slopes down towards +Z and wall ids are canonical.
 */
export function buildFramingCanonical(project: ProjectState): FramingResult {
  resetIds();
  const params = sanitizeParams(project.params);
  const walls: Record<WallId, Wall> = project.walls;
  const warnings: FramingWarning[] = [];

  const roof = computeRoofLines(params);
  const grid = computePostGrid(params, project.postOverrides, roof);

  const members: Member[] = [];
  const panels: Panel[] = [];

  members.push(...generatePosts(params, walls, roof, grid));
  members.push(...generateFreePosts(params, roof, grid, project.freePosts));
  members.push(...generatePurlins(params, roof, grid, warnings));
  members.push(...generateBraces(params, roof, grid));

  const roofBuild = generateRoof(params, roof, warnings);
  members.push(...roofBuild.rafters);
  panels.push(roofBuild.panel);

  for (const id of WALL_IDS) {
    const frame = computeWallFrame(id, params, walls[id], roof, grid);
    const build = generateWallFraming(frame, walls[id], walls, params, roof);
    members.push(...build.members);
    if (build.panel) panels.push(build.panel);
    warnings.push(...build.warnings);
  }

  // Interior partition walls
  const pw = params.timber.post.width;
  const sd = params.timber.stud.height;
  for (const raw of project.partitions) {
    const partition = clampPartition(raw, params);
    const frame = computePartitionFrame(partition, params, roof);
    const build = generateWallFraming(frame, { closed: true, openings: partition.openings }, walls, params, roof);
    members.push(...build.members);
    if (build.panel) panels.push(build.panel);
    warnings.push(...build.warnings);
    // A partition running through a post (and its knee braces) – check every post actually placed
    const tol = pw / 2 + sd / 2 + 50;
    const hitPost = members.find(
      (m) =>
        m.category === 'post' &&
        (partition.axis === 'z'
          ? Math.abs(m.start.x - partition.offset) < tol && m.start.z > partition.start - tol && m.start.z < partition.end + tol
          : Math.abs(m.start.z - partition.offset) < tol && m.start.x > partition.start - tol && m.start.x < partition.end + tol),
    );
    if (hitPost) {
      const at = partition.axis === 'z' ? `x = ${Math.round(hitPost.start.x)}` : `z = ${Math.round(hitPost.start.z)}`;
      warnings.push({
        level: 'warning',
        message: `Partition "${partition.label}" runs through the post row at ${at} mm – move it clear of the posts and knee braces.`,
        partitionId: partition.id,
      });
    }
    if (raw.offset !== partition.offset || raw.start !== partition.start || raw.end !== partition.end) {
      warnings.push({ level: 'info', message: `Partition "${partition.label}" was clamped inside the post frame.`, partitionId: partition.id });
    }
  }

  // Global sanity warnings
  if (params.postsPerRow !== null && grid.postSpacing > params.maxPostSpacing + 1) {
    warnings.push({
      level: 'warning',
      message: `Manual post count: spacing ${Math.round(grid.postSpacing)} mm exceeds the recommended maximum of ${params.maxPostSpacing} mm – check the purlin statics (larger purlin section may be required).`,
    });
  }
  if (project.params.rearHeight > project.params.frontHeight) {
    warnings.push({ level: 'error', message: 'Low eave H2 exceeds high eave H1 – swap the heights or change the roof direction. H2 was clamped to H1.' });
  }
  if (roof.pitchDeg < 3) {
    warnings.push({ level: 'warning', message: `Roof pitch ${roof.pitchDeg.toFixed(1)}° is below 3° – minimum for sheet roofing; 5° or more is recommended for drainage.` });
  }
  if (roof.pitchDeg > 30) {
    warnings.push({ level: 'info', message: `Roof pitch ${roof.pitchDeg.toFixed(1)}° is unusually steep for a monopitch outbuilding.` });
  }
  if (roofBuild.geometry.eaveHeight < 1900) {
    warnings.push({ level: 'warning', message: `Low eave clearance ${roofBuild.geometry.eaveHeight} mm is below 1.9 m head height.` });
  }
  const rafterOverhang = params.roofScheme === 'sloped-purlins' ? Math.max(params.overhangs.left, params.overhangs.right) : Math.max(params.overhangs.front, params.overhangs.rear);
  const purlinOverhang = params.roofScheme === 'sloped-purlins' ? Math.max(params.overhangs.front, params.overhangs.rear) : Math.max(params.overhangs.left, params.overhangs.right);
  if (rafterOverhang > 1500) {
    warnings.push({ level: 'warning', message: 'Roof overhang above 1.5 m – cantilevered rafter tails should be verified separately.' });
  }
  if (purlinOverhang > 1500) {
    warnings.push({ level: 'warning', message: 'Purlin overhang above 1.5 m – cantilevered purlin tails should be verified separately.' });
  }

  return { members, panels, roof: roofBuild.geometry, grid, warnings };
}
