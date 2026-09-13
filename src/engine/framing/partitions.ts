import type { Partition, PartitionAxis, StructureParams } from '@/types';
import { clamp, roundTo } from '../geometry';

export const MIN_PARTITION_LENGTH = 600;
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
 * Keeps partitions clear of the purlins (walls along X) and of the corner posts
 * (walls along Z), and inside the post frame.
 */
export function partitionLimits(params: StructureParams, axis: PartitionAxis): PartitionLimits {
  const pw = params.timber.post.width;
  const bw = params.timber.beam.width;
  const sd = params.timber.stud.height;
  const purlinZone = pw / 2 + bw / 2 + 20;
  if (axis === 'x') {
    return {
      offsetMin: purlinZone + sd / 2,
      offsetMax: Math.max(purlinZone + sd / 2, params.width - purlinZone - sd / 2),
      runMin: pw,
      runMax: Math.max(pw, params.length - pw),
    };
  }
  return {
    offsetMin: pw + sd / 2,
    offsetMax: Math.max(pw + sd / 2, params.length - pw - sd / 2),
    runMin: purlinZone,
    runMax: Math.max(purlinZone, params.width - purlinZone),
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
