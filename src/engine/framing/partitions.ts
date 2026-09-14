import type { Partition, PartitionAxis, StructureParams } from '@/types';
import { clamp, roundTo } from '../geometry';
import { canonicalDims, isSideDirection } from '../orientation';

/** Shortest partition (mm): room for the two end studs and one bay between them. */
export const MIN_PARTITION_LENGTH = 200;
const SNAP = 10;

export interface PartitionLimits {
  /** Allowed range of the wall's centre plane along the perpendicular axis */
  offsetMin: number;
  offsetMax: number;
  /** Allowed extent along the running axis */
  runMin: number;
  runMax: number;
}

/**
 * Keeps partitions clear of the purlins (walls parallel to the purlin rows) and of the corner
 * posts (walls parallel to the rafters), and inside the post frame. `axis` and the returned
 * limits are in WORLD terms; the purlin rows run along canonical X, which is world Z when the
 * roof slopes towards a side wall. All zones are symmetric, so no mirroring is needed.
 */
export function partitionLimits(params: StructureParams, axis: PartitionAxis): PartitionLimits {
  const pw = params.timber.post.width;
  const bw = params.timber.beam.width;
  const sd = params.timber.stud.height;
  const purlinZone = pw / 2 + bw / 2 + 20;
  const { length, width } = canonicalDims(params);
  const canonicalAxis = isSideDirection(params.roofDirection) ? (axis === 'x' ? 'z' : 'x') : axis;
  if (canonicalAxis === 'x') {
    return {
      offsetMin: purlinZone + sd / 2,
      offsetMax: Math.max(purlinZone + sd / 2, width - purlinZone - sd / 2),
      runMin: pw,
      runMax: Math.max(pw, length - pw),
    };
  }
  return {
    offsetMin: pw + sd / 2,
    offsetMax: Math.max(pw + sd / 2, length - pw - sd / 2),
    runMin: purlinZone,
    runMax: Math.max(purlinZone, width - purlinZone),
  };
}

/** Returns a copy of the partition clamped into the allowed zone with start < end. */
export function clampPartition(partition: Partition, params: StructureParams): Partition {
  const lim = partitionLimits(params, partition.axis);
  const offset = roundTo(clamp(partition.offset, lim.offsetMin, lim.offsetMax), SNAP);
  const available = lim.runMax - lim.runMin;
  const minLen = Math.min(MIN_PARTITION_LENGTH, available);
  let start = roundTo(clamp(Math.min(partition.start, partition.end), lim.runMin, lim.runMax), SNAP);
  let end = roundTo(clamp(Math.max(partition.start, partition.end), lim.runMin, lim.runMax), SNAP);
  if (end - start < minLen) {
    end = Math.min(lim.runMax, start + minLen);
    start = Math.max(lim.runMin, end - minLen);
  }
  return { ...partition, offset, start, end };
}

/** Default placement for a new partition: across the middle of the structure, full run. */
export function defaultPartition(params: StructureParams, axis: PartitionAxis, id: string, label: string): Partition {
  const lim = partitionLimits(params, axis);
  const mid = axis === 'x' ? params.width / 2 : params.length / 2;
  return clampPartition({ id, label, axis, offset: mid, start: lim.runMin, end: lim.runMax, openings: [] }, params);
}
