import type { FramingResult, FramingWarning, Member, OpeningHost, Panel, ProjectState, StructureParams, Wall, WallId } from '@/types';
import { isOuterWall, WALL_IDS } from '@/types';
import { resetIds } from '../geometry';
import { generateRoof } from './roof';
import { computeRoofLines } from './roofLines';
import { computePostGrid, generateBraces, generatePosts, generatePurlins } from './structure';
import { clampPartition } from './partitions';
import { computePartitionFrame, computeWallFrame, type WallFrame } from './wallFrame';
import { generateWallFraming } from './walls';

export { computeRoofLines } from './roofLines';
export { computePostGrid } from './structure';
export { computeWallFrame, computePartitionFrame, wallBays, PARTITION_TOP_GAP } from './wallFrame';
export { clampPartition, defaultPartition, partitionLimits, MIN_PARTITION_LENGTH } from './partitions';
export type { WallFrame, WallBay } from './wallFrame';
export { clampOpening, openingLimits, headerHeight, OPENING_DEFAULTS, MIN_OPENING_SIZE } from './openings';
export { CLADDING_THICKNESS } from './walls';

/** Guard against geometrically impossible input without mutating the store. */
export function sanitizeParams(params: StructureParams): StructureParams {
  const rear = Math.min(params.rearHeight, params.frontHeight);
  const minHeight = params.timber.beam.height + 300;
  return {
    ...params,
    length: Math.max(params.length, 1000),
    width: Math.max(params.width, 1000),
    frontHeight: Math.max(params.frontHeight, minHeight),
    rearHeight: Math.max(rear, minHeight),
  };
}

/** Frames of the four outer walls plus every partition, keyed by WallId / partition id. */
export type WallFrames = Record<string, WallFrame>;

export function computeAllWallFrames(project: ProjectState): WallFrames {
  const params = sanitizeParams(project.params);
  const roof = computeRoofLines(params);
  const grid = computePostGrid(params, project.postOverrides);
  const frames: WallFrames = {};
  for (const id of WALL_IDS) frames[id] = computeWallFrame(id, params, project.walls[id], roof, grid);
  for (const p of project.partitions) frames[p.id] = computePartitionFrame(clampPartition(p, params), params, roof);
  return frames;
}

/** The outer wall or partition addressed by `key`, as an opening host. */
export function openingHost(project: ProjectState, key: string): OpeningHost | null {
  if (isOuterWall(key)) return project.walls[key];
  const p = project.partitions.find((x) => x.id === key);
  return p ? { closed: true, openings: p.openings } : null;
}

export function buildFraming(project: ProjectState): FramingResult {
  resetIds();
  const params = sanitizeParams(project.params);
  const walls: Record<WallId, Wall> = project.walls;
  const warnings: FramingWarning[] = [];

  const roof = computeRoofLines(params);
  const grid = computePostGrid(params, project.postOverrides);

  const members: Member[] = [];
  const panels: Panel[] = [];

  members.push(...generatePosts(params, walls, roof, grid));
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
    if (partition.axis === 'z') {
      const hit = grid.xPositions.find((x) => Math.abs(x - partition.offset) < pw / 2 + sd / 2 + 50);
      if (hit !== undefined) {
        warnings.push({
          level: 'warning',
          message: `Partition "${partition.label}" runs through the post row at x = ${Math.round(hit)} mm – move it clear of the posts and knee braces.`,
          partitionId: partition.id,
        });
      }
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
    warnings.push({ level: 'error', message: 'Rear height exceeds front height – a monopitch roof must slope towards the rear. Rear height was clamped.' });
  }
  if (roof.pitchDeg < 3) {
    warnings.push({ level: 'warning', message: `Roof pitch ${roof.pitchDeg.toFixed(1)}° is below 3° – minimum for sheet roofing; 5° or more is recommended for drainage.` });
  }
  if (roof.pitchDeg > 30) {
    warnings.push({ level: 'info', message: `Roof pitch ${roof.pitchDeg.toFixed(1)}° is unusually steep for a monopitch outbuilding.` });
  }
  if (roofBuild.geometry.eaveHeight < 1900) {
    warnings.push({ level: 'warning', message: `Rear eave clearance ${roofBuild.geometry.eaveHeight} mm is below 1.9 m head height.` });
  }
  if (params.overhangs.front > 1500 || params.overhangs.rear > 1500) {
    warnings.push({ level: 'warning', message: 'Roof overhang above 1.5 m – cantilevered rafter tails should be verified separately.' });
  }

  return { members, panels, roof: roofBuild.geometry, grid, warnings };
}
