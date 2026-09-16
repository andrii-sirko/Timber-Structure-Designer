import type { DerivedModel, ProjectState } from '@/types';
import { computeBom } from './bom';
import { buildFramingCanonical, canonicalProject, sanitizeParams } from './framing';
export type { OpeningPreset, OpeningEdge, PresetFit } from './framing';
import { framingToWorld, relabelFraming, relabelSides } from './orientation';
import { computeConnections } from './joinery';
import { computeStatics } from './statics';
import { checkAllVehicles } from './vehicles';
import { summarizePaving } from './paving';

/**
 * Runs the full pipeline: framing → statics → BOM / cut list → connections.
 * Everything is computed in the canonical frame (roof sloping towards +Z); the framing
 * geometry and side labels are rotated into world space at the end.
 */
export function buildModel(project: ProjectState): DerivedModel {
  const canonical = canonicalProject(project);
  const dir = canonical.params.roofDirection;
  const framingC = buildFramingCanonical(canonical);
  const statics = computeStatics(canonical, framingC);
  const { bom, cutList } = computeBom(canonical, framingC);
  const connections = computeConnections(canonical, framingC);
  const vehicles = checkAllVehicles(canonical, framingC);
  const paving = summarizePaving(project);
  const framing = relabelFraming(framingToWorld(framingC, sanitizeParams(project.params)), dir);
  if (dir === 'rear') return { framing, statics, bom, cutList, connections, vehicles, paving };
  const r = (t: string) => relabelSides(t, dir);
  const ro = (t: string | undefined) => (t === undefined ? undefined : r(t));
  return {
    framing,
    statics: {
      ...statics,
      checks: statics.checks.map((c) => ({ ...c, element: r(c.element), elementDe: r(c.elementDe), detail: r(c.detail), recommendation: ro(c.recommendation) })),
    },
    bom: { ...bom, lines: bom.lines.map((l) => ({ ...l, label: r(l.label), labelDe: r(l.labelDe) })) },
    cutList: cutList.map((c) => ({ ...c, name: r(c.name), nameDe: r(c.nameDe), notes: ro(c.notes), walls: c.walls?.map(r) })),
    connections,
    vehicles: vehicles.map((v) => ({ ...v, messages: v.messages.map(r), wallCollisions: v.wallCollisions.map(r) })),
    paving,
  };
}

export { buildFraming, buildFramingCanonical, canonicalProject, computeAllWallFrames, openingHost, clampOpening, openingLimits, OPENING_DEFAULTS, OPENING_PRESETS, findPreset, presetsOfType, presetMatches, presetFits, openingFromPreset, openingMaterials, frameSizeFor, resizeOpening, resizableEdges, edgeHandleCentre, sizeChanged, sanitizeParams, MIN_PLAN_DIM, minWallHeight, clampPartition, defaultPartition, partitionLimits, MIN_PARTITION_LENGTH } from './framing';
export type { WallFrames } from './framing';
export { computeStatics } from './statics';
export { autoFixStatics, costOptimizeStatics } from './statics/autofix';
export type { AutoFixResult, AutoFixChange, CostOptimizationResult, StaticsActionResult } from './statics/autofix';
export { computeBom } from './bom';
export { computeConnections } from './joinery';
export { VEHICLE_CATALOG, VEHICLE_COLORS, getVehicleModel, vehicleCorners, findVehicleSpot, checkVehicleFit } from './vehicles';
export { PAVING_COLORS, PAVING_PATTERNS, PAVING_DEFAULTS, defaultPavedArea, summarizePaving, polygonAreaM2 } from './paving';

export { canonicalizeProject, canonicalDims, canonicalWall, worldWall, worldPointToCanonical, canonicalPointToWorld, isSideDirection, relabelSides } from './orientation';
