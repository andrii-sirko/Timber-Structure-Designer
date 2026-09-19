import type { ProfilePoint, TimberSection, Vec3 } from '@/types';

export const DEG = Math.PI / 180;
export const toDeg = (rad: number): number => rad / DEG;
export const toRad = (deg: number): number => deg * DEG;

export const v3 = (x: number, y: number, z: number): Vec3 => ({ x, y, z });
export const add = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
export const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
export const scale = (a: Vec3, s: number): Vec3 => ({ x: a.x * s, y: a.y * s, z: a.z * s });
export const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;
export const cross = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
export const len = (a: Vec3): number => Math.hypot(a.x, a.y, a.z);
export const normalize = (a: Vec3): Vec3 => {
  const l = len(a);
  return l === 0 ? { x: 0, y: 0, z: 0 } : scale(a, 1 / l);
};

export const X_AXIS: Vec3 = { x: 1, y: 0, z: 0 };
export const Y_AXIS: Vec3 = { x: 0, y: 1, z: 0 };
export const Z_AXIS: Vec3 = { x: 0, y: 0, z: 1 };
export const NEG_X: Vec3 = { x: -1, y: 0, z: 0 };
export const NEG_Z: Vec3 = { x: 0, y: 0, z: -1 };

/** Round to a given step (default 1 mm). */
export const roundTo = (value: number, step = 1): number => Math.round(value / step) * step;

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

/** Rectangular profile with square ends, centred on the member axis. */
export function rectProfile(length: number, height: number): ProfilePoint[] {
  const h = height / 2;
  return [
    { u: 0, v: -h },
    { u: length, v: -h },
    { u: length, v: h },
    { u: 0, v: h },
  ];
}

/**
 * Profile of a member with angled end cuts.
 * `startDeg` / `endDeg` are angles from square; positive values lean the cut so that the
 * +v (top) edge is longer at that end. `axisLength` is the length measured along the axis (centreline).
 */
export function cutProfile(
  axisLength: number,
  height: number,
  startDeg: number,
  endDeg: number,
): ProfilePoint[] {
  const h = height / 2;
  const s = Math.tan(toRad(startDeg)) * h;
  const e = Math.tan(toRad(endDeg)) * h;
  return [
    { u: 0 + s, v: -h },
    { u: axisLength - e, v: -h },
    { u: axisLength + e, v: h },
    { u: 0 - s, v: h },
  ];
}

/** Longest edge of a profile along u. */
export function profileLength(profile: ProfilePoint[]): number {
  let min = Infinity;
  let max = -Infinity;
  for (const p of profile) {
    if (p.u < min) min = p.u;
    if (p.u > max) max = p.u;
  }
  return max - min;
}

/** Volume of a prismatic member in m³ (uses the overall length – conservative for purchasing). */
export function memberVolumeM3(section: TimberSection, length: number): number {
  return (section.width / 1000) * (section.height / 1000) * (length / 1000);
}

/** Shoelace polygon area (absolute) for a profile, in mm². */
export function profileArea(profile: ProfilePoint[]): number {
  let a = 0;
  for (let i = 0; i < profile.length; i++) {
    const p = profile[i];
    const q = profile[(i + 1) % profile.length];
    a += p.u * q.v - q.u * p.v;
  }
  return Math.abs(a) / 2;
}

let idCounter = 0;
/** Deterministic id generator for engine output (stable across recomputation for identical input order). */
export function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}
export function resetIds(): void {
  idCounter = 0;
}

/** Generate a random UUID for user-created entities. */
export function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function formatMm(value: number): string {
  return `${Math.round(value)} mm`;
}

export function formatM(valueMm: number, digits = 2): string {
  return `${(valueMm / 1000).toFixed(digits)} m`;
}

/** Millimetre value rounded to hundredths, without trailing zeros (2432.2737… → 2432.27, 2400 → 2400). */
export const roundMm = (value: number): number => Math.round(value * 100) / 100;

export function sectionLabel(section: TimberSection): string {
  return `${roundMm(section.width)}×${roundMm(section.height)}`;
}
