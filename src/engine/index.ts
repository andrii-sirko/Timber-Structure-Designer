import type { DerivedModel, ProjectState } from '@/types';
import { computeBom } from './bom';
import { buildFraming } from './framing';
import { computeConnections } from './joinery';
import { computeStatics } from './statics';
import { checkAllVehicles } from './vehicles';

/** Runs the full pipeline: framing → statics → BOM / cut list → connections. */
export function buildModel(project: ProjectState): DerivedModel {
  const framing = buildFraming(project);
  const statics = computeStatics(project, framing);
  const { bom, cutList } = computeBom(project, framing);
  const connections = computeConnections(project, framing);
  const vehicles = checkAllVehicles(project, framing);
  return { framing, statics, bom, cutList, connections, vehicles };
}

export { buildFraming, computeAllWallFrames, openingHost, clampOpening, openingLimits, OPENING_DEFAULTS, sanitizeParams, clampPartition, defaultPartition, partitionLimits } from './framing';
export type { WallFrames } from './framing';
export { computeStatics } from './statics';
export { autoFixStatics, costOptimizeStatics } from './statics/autofix';
export type { AutoFixResult, AutoFixChange, CostOptimizationResult, StaticsActionResult } from './statics/autofix';
export { computeBom } from './bom';
export { computeConnections } from './joinery';
export { VEHICLE_CATALOG, VEHICLE_COLORS, getVehicleModel, vehicleCorners, findVehicleSpot, checkVehicleFit } from './vehicles';
