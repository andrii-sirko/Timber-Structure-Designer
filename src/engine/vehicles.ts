import type { FramingResult, ProjectState, Vehicle, VehicleFit, VehicleModel, WallId } from '@/types';
import { WALL_IDS } from '@/types';
import { sanitizeParams } from './framing';
import { computeRoofLines } from './framing/roofLines';
import { toRad } from './geometry';

/** Exterior dimensions in mm (approximate manufacturer data, current generations). */
export const VEHICLE_CATALOG: VehicleModel[] = [
  { id: 'vw-up', name: 'VW up! – city car', style: 'city', length: 3600, width: 1641, mirrorWidth: 1910, height: 1504 },
  { id: 'vw-golf', name: 'VW Golf – compact', style: 'compact', length: 4284, width: 1789, mirrorWidth: 2027, height: 1456 },
  { id: 'bmw-3', name: 'BMW 3 Series – sedan', style: 'sedan', length: 4709, width: 1827, mirrorWidth: 2068, height: 1442 },
  { id: 'vw-passat-variant', name: 'VW Passat Variant – estate', style: 'estate', length: 4767, width: 1832, mirrorWidth: 2083, height: 1477 },
  { id: 'tesla-model-y', name: 'Tesla Model Y – SUV', style: 'suv', length: 4751, width: 1921, mirrorWidth: 2129, height: 1624 },
  { id: 'vw-tiguan', name: 'VW Tiguan – SUV', style: 'suv', length: 4509, width: 1839, mirrorWidth: 2100, height: 1675 },
  { id: 'bmw-x5', name: 'BMW X5 – large SUV', style: 'suv', length: 4922, width: 2004, mirrorWidth: 2218, height: 1745 },
  { id: 'vw-multivan', name: 'VW Multivan T6.1 – van', style: 'van', length: 4904, width: 1904, mirrorWidth: 2297, height: 1970 },
  { id: 'ford-ranger', name: 'Ford Ranger – pickup', style: 'pickup', length: 5370, width: 1918, mirrorWidth: 2180, height: 1848 },
  { id: 'fiat-ducato-camper', name: 'Fiat Ducato L2H2 – camper van', style: 'camper', length: 5413, width: 2050, mirrorWidth: 2470, height: 2524 },
  { id: 'motorcycle', name: 'Motorcycle – touring', style: 'motorcycle', length: 2250, width: 900, mirrorWidth: 980, height: 1400 },
  // Bicycle: typical adult city/trekking bike; "mirror width" = handlebar width
  { id: 'bicycle', name: 'Bicycle – city / trekking', style: 'bicycle', length: 1800, width: 450, mirrorWidth: 640, height: 1050 },
  // Waste bins (EN 840 two- and four-wheeled containers; length = depth front-to-back)
  { id: 'bin-120', name: 'Waste bin 120 L', style: 'bin', length: 555, width: 480, mirrorWidth: 480, height: 940 },
  { id: 'bin-240', name: 'Waste bin 240 L', style: 'bin', length: 740, width: 580, mirrorWidth: 580, height: 1075 },
  { id: 'bin-1100', name: 'Waste container 1100 L', style: 'container', length: 1070, width: 1370, mirrorWidth: 1370, height: 1370 },
];

export const VEHICLE_COLORS = ['#b91c1c', '#1d4ed8', '#e5e7eb', '#111827', '#9ca3af', '#166534', '#d97706', '#0e7490'];

export function getVehicleModel(modelId: string): VehicleModel {
  return VEHICLE_CATALOG.find((m) => m.id === modelId) ?? VEHICLE_CATALOG[1];
}

export interface Point2 {
  x: number;
  z: number;
}

/** Corners of the (optionally mirror-inclusive) footprint rectangle in world XZ. */
export function vehicleCorners(vehicle: Vehicle, model: VehicleModel, withMirrors = true): Point2[] {
  const hl = model.length / 2;
  const hw = (withMirrors ? model.mirrorWidth : model.width) / 2;
  const th = toRad(vehicle.rotationDeg);
  const c = Math.cos(th);
  const s = Math.sin(th);
  const local: [number, number][] = [
    [-hl, -hw],
    [hl, -hw],
    [hl, hw],
    [-hl, hw],
  ];
  return local.map(([lx, lz]) => ({ x: vehicle.x + lx * c + lz * s, z: vehicle.z - lx * s + lz * c }));
}

function footprintBounds(corners: Point2[]): { minX: number; maxX: number; minZ: number; maxZ: number } {
  return {
    minX: Math.min(...corners.map((c) => c.x)),
    maxX: Math.max(...corners.map((c) => c.x)),
    minZ: Math.min(...corners.map((c) => c.z)),
    maxZ: Math.max(...corners.map((c) => c.z)),
  };
}

/** True when two vehicles' mirror footprints (axis-aligned bounds + margin) overlap. */
export function vehiclesOverlap(a: Vehicle, b: Vehicle, margin = 300): boolean {
  const ba = footprintBounds(vehicleCorners(a, getVehicleModel(a.modelId)));
  const bb = footprintBounds(vehicleCorners(b, getVehicleModel(b.modelId)));
  return ba.minX - margin < bb.maxX && ba.maxX + margin > bb.minX && ba.minZ - margin < bb.maxZ && ba.maxZ + margin > bb.minZ;
}

/** Pick a free parking spot under the roof for a new vehicle. */
export function findVehicleSpot(project: ProjectState, model: VehicleModel): { x: number; z: number; rotationDeg: number } {
  const { length: L, width: W } = project.params;
  const rotationDeg = L >= W ? 0 : 90;
  const lane = model.mirrorWidth + 500;
  const candidates = [0, 1, -1, 2, -2, 3, -3];
  for (const k of candidates) {
    const spot: Vehicle = {
      id: 'probe',
      modelId: model.id,
      x: rotationDeg === 0 ? L / 2 : L / 2 + k * lane,
      z: rotationDeg === 0 ? W / 2 + k * lane : W / 2,
      rotationDeg,
      color: '',
    };
    const b = footprintBounds(vehicleCorners(spot, model));
    const inside = b.minX >= -project.params.overhangs.left && b.maxX <= L + project.params.overhangs.right && b.minZ >= -project.params.overhangs.front && b.maxZ <= W + project.params.overhangs.rear;
    if (!inside && k !== 0) continue;
    if (!project.vehicles.some((v) => vehiclesOverlap(v, spot))) return { x: spot.x, z: spot.z, rotationDeg };
  }
  return { x: L / 2, z: W / 2, rotationDeg };
}

/**
 * Checks whether a vehicle fits under the roof: coverage by the roof outline, headroom below the
 * lowest structural member above the footprint (rafters, purlins, knee braces) and collisions with
 * posts and closed walls. Mirror width is used for all horizontal checks.
 */
export function checkVehicleFit(vehicle: Vehicle, project: ProjectState, framing: FramingResult): VehicleFit {
  const params = sanitizeParams(project.params);
  const model = getVehicleModel(vehicle.modelId);
  const roof = computeRoofLines(params);
  const { overhangs: o, timber, length: L, width: W } = params;
  const pw = timber.post.width;
  const bw = timber.beam.width;
  const bh = timber.beam.height;

  const corners = vehicleCorners(vehicle, model, true);
  const b = footprintBounds(corners);
  const roofMinX = -o.left;
  const roofMaxX = L + o.right;
  const roofMinZ = -o.front;
  const roofMaxZ = W + o.rear;
  const uncoveredMm = Math.max(0, roofMinX - b.minX, b.maxX - roofMaxX, roofMinZ - b.minZ, b.maxZ - roofMaxZ);
  const covered = uncoveredMm === 0;
  const overlapsRoof = b.maxX > roofMinX && b.minX < roofMaxX && b.maxZ > roofMinZ && b.minZ < roofMaxZ;

  // ── Headroom ────────────────────────────────────────────────────────────
  let obstacle = Infinity;
  let obstacleName = '';
  if (overlapsRoof) {
    const zTail = Math.min(b.maxZ, roofMaxZ);
    obstacle = roof.bottomAt(zTail);
    obstacleName = 'rafters';
    const bands = [
      { z0: roof.frontPurlinZ - bw / 2, z1: roof.frontPurlinZ + bw / 2, under: params.frontHeight - bh, name: 'front purlin' },
      { z0: roof.rearPurlinZ - bw / 2, z1: roof.rearPurlinZ + bw / 2, under: params.rearHeight - bh, name: 'rear purlin' },
    ];
    for (const band of bands) {
      const underBand = b.maxZ > band.z0 && b.minZ < band.z1;
      if (!underBand) continue;
      if (band.under < obstacle) {
        obstacle = band.under;
        obstacleName = band.name;
      }
      if (params.braces) {
        for (const x of framing.grid.xPositions) {
          const x0 = x - pw / 2 - params.braceLeg;
          const x1 = x + pw / 2 + params.braceLeg;
          if (b.maxX > x0 && b.minX < x1 && band.under - params.braceLeg < obstacle) {
            obstacle = band.under - params.braceLeg;
            obstacleName = `knee brace at ${band.name}`;
          }
        }
      }
    }
  }
  const clearance = Number.isFinite(obstacle) ? Math.round(obstacle - model.height) : Infinity;

  // ── Posts & closed walls (point-in-rotated-rectangle test with a half-post margin) ──
  const th = toRad(vehicle.rotationDeg);
  const c = Math.cos(th);
  const s = Math.sin(th);
  const hl = model.length / 2 + pw / 2;
  const hw = model.mirrorWidth / 2 + pw / 2;
  const hits = (px: number, pz: number): boolean => {
    const dx = px - vehicle.x;
    const dz = pz - vehicle.z;
    const lx = dx * c - dz * s;
    const lz = dx * s + dz * c;
    return Math.abs(lx) <= hl && Math.abs(lz) <= hw;
  };
  const postCollision = framing.members.some((m) => m.category === 'post' && hits(m.start.x, m.start.z));

  const wallLines: Record<WallId, [number, number, number, number]> = {
    front: [0, pw / 2, L, pw / 2],
    rear: [0, W - pw / 2, L, W - pw / 2],
    left: [pw / 2, 0, pw / 2, W],
    right: [L - pw / 2, 0, L - pw / 2, W],
  };
  const wallCollisions: string[] = [];
  const crossesLine = (x0: number, z0: number, x1: number, z1: number): boolean => {
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 100));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      if (hits(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t)) return true;
    }
    return false;
  };
  for (const id of WALL_IDS) {
    if (!project.walls[id].closed) continue;
    if (crossesLine(...wallLines[id])) wallCollisions.push(id);
  }
  for (const p of project.partitions) {
    const line: [number, number, number, number] = p.axis === 'x' ? [p.start, p.offset, p.end, p.offset] : [p.offset, p.start, p.offset, p.end];
    if (crossesLine(...line)) wallCollisions.push(p.label);
  }

  // ── Verdict ─────────────────────────────────────────────────────────────
  const messages: string[] = [];
  let status: VehicleFit['status'] = 'ok';
  if (postCollision) {
    status = 'fail';
    messages.push('Collides with a post (mirror width).');
  }
  if (wallCollisions.length > 0) {
    status = 'fail';
    messages.push(`Crosses closed wall: ${wallCollisions.join(', ')}.`);
  }
  if (Number.isFinite(clearance)) {
    if (clearance < 0) {
      status = 'fail';
      messages.push(`Too tall: ${-clearance} mm short under the ${obstacleName}.`);
    } else if (clearance < 150) {
      if (status === 'ok') status = 'warning';
      messages.push(`Tight headroom: only ${clearance} mm under the ${obstacleName}.`);
    } else {
      messages.push(`Headroom ${clearance} mm under the ${obstacleName}.`);
    }
  }
  if (!covered) {
    if (status === 'ok') status = 'warning';
    messages.push(overlapsRoof ? `Sticks out of the roof by ${Math.round(uncoveredMm)} mm.` : 'Not under the roof.');
  }
  if (messages.length === 0) messages.push('Fits.');

  return { vehicleId: vehicle.id, covered, uncoveredMm: Math.round(uncoveredMm), clearance, postCollision, wallCollisions, status, messages };
}

export function checkAllVehicles(project: ProjectState, framing: FramingResult): VehicleFit[] {
  return project.vehicles.map((v) => checkVehicleFit(v, project, framing));
}
